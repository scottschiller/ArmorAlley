/**
 * ARMOR ALLEY: "Boot loader" - production bundle vs. development source.
 * Try ?dev=1 if you want to see the unminified, raw source JS + CSS.
 * See src/README.md for more.
 * https://github.com/scottschiller/ArmorAlley/src/
 */
let v;

if (window.aaVersion) {
  v = `.${window.aaVersion}`;
}

const wl = window.location;
const isProdSite = !!wl.host.match(/armor-alley\.net/i);
const isLocalhost = !!wl.host.match(/localhost/i);

const sp = new URLSearchParams(wl.search);
const forceProd = sp.get('prod');
const dev = !forceProd && (sp.get('dev') || !isProdSite);
const isFloppy = wl.href.match(/floppy/i) || sp.get('floppy');

// e.g., '.V20231216'
const version = (dev || isLocalhost) && !forceProd ? '' : v || '';

function hello() {
  console.log(
    '🚁 ARMOR ALLEY: ' +
      (dev
        ? isFloppy
          ? '💾 floppy disk build.'
          : 'using development JS.'
        : `using production JS build, ${
            version.length ? version.substring(1) : '[none]'
          }. Try ?dev=1 for the full source with comments.`)
  );
}

let fetched = {};

function fetchGZ(url, callback) {
  // 💾 “Special use case”: fetch + exec gzip-encoded asset(s).
  const decompress = async (url) => {
    const ds = new DecompressionStream('gzip');
    const response = await fetch(url);
    const blob_in = await response.blob();
    const stream_in = blob_in.stream().pipeThrough(ds);
    const blob_out = await new Response(stream_in).blob();
    return await blob_out.text();
  };
  decompress(url).then((result) => callback?.(result));
}

function addScript(src, onload, type = 'module', async = false) {
  if (fetched[src]) {
    onload?.();
    return;
  }

  let s = document.createElement('script');

  function ready() {
    console.log(`Loaded JS: ${src}`);
    fetched[src] = true;
    onload?.();
    if (!s) return;
    s.onload = null;
    s = null;
  }

  // make "boot" stuff high-priority
  if (!async && src.match(/boot/i)) s.fetchpriority = 'high';
  if (type) s.type = type;
  if (async) s.async = true;

  s.onload = ready;

  if (isFloppy) {
    // JS onload()-style callback shenanigans
    let cbName = `aaFetchCallback_${src.replace(/[/\/]/g, '_')}`;

    window[cbName] = () => {
      // internal callback
      ready();
      delete window[cbName];
    };

    fetchGZ(src, (result) => {
      // sneaky: append callback to the end of module script
      s.text = result + `\n;window['${cbName}']?.();`;
    });
  } else {
    s.src = src;
  }

  document?.head?.appendChild(s);
}

function addCSS(href, onload) {
  if (!href) return;

  let link = document.createElement('link');
  link.rel = 'stylesheet';
  link.media = 'screen';

  link.onload = () => {
    console.log(`Loaded CSS: ${href}`);
    fetched[href] = true;
    onload?.();
    link.onload = null;
    link = null;
  };

  if (isFloppy) {
    fetchGZ(href, (result) => {
      let style = document.createElement('style');

      // mimic source, for dynamic removal
      style.setAttribute('data-href', href);

      style.appendChild(document.createTextNode(result));
      document.head?.appendChild(style);
      link.onload();
    });
  } else {
    link.href = href;
    document.head?.appendChild(link);
  }
}

function addHTML(href, onload) {
  // note: no caching mechanism, here; avoid storing response.
  if (!href) return;
  href = minifyAndVersion(href);

  // gzip
  if (isFloppy) return fetchGZ(href, (result) => onload?.(result));

  let req = new XMLHttpRequest();
  function onready() {
    console.log(`Loaded HTML: ${href}`);
    const text = this.responseText;
    onload?.(text);
    req.removeEventListener('load', onready);
    req = null;
  }
  req.addEventListener('load', onready);
  req.open('GET', href);
  req.send();
}

function minifyAndVersion(url) {
  // .js, .css etc.
  const fileExt = url.substr(url.lastIndexOf('.') + 1);

  if (isFloppy) return `dist/${fileExt}/${url}.gz`;

  // minified, production assets load from dist/ with a .V[0-9]+ versioning pattern.
  if (isProdSite || forceProd) return `dist/${fileExt}/${url}${version}`;

  // dev / local
  return `src/${fileExt}/${url}`;
}

function getAudioRoot() {
  return isProdSite || forceProd ? 'dist/audio' : 'assets/audio';
}

function getImageRoot() {
  return isProdSite || forceProd ? 'dist/image' : 'assets/image';
}

function getVideoRoot() {
  return isProdSite || forceProd ? 'dist/video' : 'assets/video';
}

function localFetch(src, fetchMethod, onload) {
  if (!src) return;

  // always make an array.
  if (!(src instanceof Array)) {
    src = [src];
  }

  let loaded = 0;
  let needed = src.length;

  function didLoad() {
    loaded++;
    if (loaded >= needed) onload?.();
  }

  src.forEach((url) => {
    url = minifyAndVersion(url);
    if (fetched[url]) {
      didLoad();
    } else {
      fetchMethod(url, didLoad);
    }
  });
}

function loadJS(src, onload) {
  if (!src) return;
  localFetch(src, addScript, onload);
}

function loadCSS(src, onload) {
  if (!src) return;
  localFetch(src, addCSS, onload);
}

function loadHTML(src, onload) {
  if (!src) return;
  // note: single request, no batch or cache or queueing.
  addHTML(src, onload);
}

function unloadCSS(src) {
  // always make an array.
  if (!(src instanceof Array)) {
    src = [src];
  }

  src.forEach((url) => {
    // remove from live DOM, and "loaded" cache.
    // this will ensure the load -> add to DOM happens next time, ideally from browser cache.
    url = minifyAndVersion(url);
    fetched[url] = undefined;
    console.log(`Unloading CSS: ${url}`);
    let node, attr;
    if (isFloppy) {
      node = 'style';
      attr = 'data-href';
    } else {
      node = 'link';
      attr = 'href';
    }
    document.head.querySelector(`${node}[${attr}="${url}"]`)?.remove?.();
  });
}

function loadGA() {
  // google analytics, only for armor-alley.net.
  if (!wl.host.match(/armor-alley\.net/i)) return;
  if (sp.get('noga')) return;
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', 'G-XGW2TDDC6V');
  window.gtag = gtag;
  let type = '',
    onload = null,
    async = true;
  addScript(
    'https://www.googletagmanager.com/gtag/js?id=G-XGW2TDDC6V',
    onload,
    type,
    async
  );
}

const aaLoader = {
  getAudioRoot,
  getImageRoot,
  getVideoRoot,
  hello,
  isFloppy,
  loadGA,
  loadJS,
  loadCSS,
  loadHTML,
  version,
  unloadCSS
};

export { aaLoader };
