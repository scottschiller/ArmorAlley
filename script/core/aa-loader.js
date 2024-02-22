/**
 * ARMOR ALLEY: "Boot loader" - production bundle vs. development source.
 * Try ?dev=1 if you want to see the unminified, raw source JS + CSS.
 * See README_DEVEL.md for more.
 * https://github.com/scottschiller/ArmorAlley/
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

// e.g., '.V20231216'
let version = (dev || isLocalhost) && !forceProd ? '' : v || '';

function hello() {
  console.log(
    '🚁 ARMOR ALLEY: using ' +
      (dev
        ? 'development JS.'
        : `production JS build, ${
            version.length ? version.substr(1) : '[none]'
          }. Try ?dev=1 for the full source with comments.`)
  );
}

let fetched = {};

function addScript(src, onload, type = 'module', async = false) {
  if (fetched[src]) {
    onload?.();
    return;
  }

  let s = document.createElement('script');
  // make "boot" stuff high-priority
  if (!async && src.match(/boot/i)) s.fetchpriority = 'high';
  if (type) s.type = type;
  if (async) s.async = true;

  s.onload = () => {
    console.log(`Loaded JS: ${src}`);
    fetched[src] = true;
    onload?.();
    s.onload = null;
    s = null;
  };

  s.src = `${src}`;
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

  link.href = href;
  document.head?.appendChild(link);
}

function addHTML(href, onload) {
  // note: no caching mechanism, here; avoid storing response.
  if (!href) return;
  href = minifyAndVersion(href);
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
  // TODO: DRY
  if (isProdSite || forceProd)
    url = url
      .replace('.css', `_min.css${version}`)
      .replace('.html', `.html${version}`)
      .replace('.js', `_min.js${version}`);
  return url;
}

function fetch(src, fetchMethod, onload) {
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
  fetch(src, addScript, onload);
}

function loadCSS(src, onload) {
  if (!src) return;
  fetch(src, addCSS, onload);
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
    document.head.querySelector(`link[href="${url}"]`)?.remove?.();
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
  hello,
  loadGA,
  loadJS,
  loadCSS,
  loadHTML,
  unloadCSS
};

export { aaLoader };
