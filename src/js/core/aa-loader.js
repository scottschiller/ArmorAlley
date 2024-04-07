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
const isFloppy = !!(wl.href.match(/floppy/i) || sp.get('floppy'));

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

let appended,
  hideTimer,
  progressContainer,
  progressHeight,
  progressBar,
  fileLabel;

if (isFloppy) {
  progressContainer = document.createElement('div');

  progressHeight = '20px';

  Object.assign(progressContainer.style, {
    position: 'absolute',
    bottom: progressHeight,
    left: '50%',
    width: '16rem',
    transform: 'translate3d(-50%, 0%, 0)',
    height: progressHeight,
    borderRadius: '6px',
    border: '1px solid #fff',
    background: 'rgba(0, 0, 0, 0.5)',
    overflow: 'hidden'
  });

  progressBar = document.createElement('div');

  const barStyle = {
    position: 'absolute',
    top: '0px',
    left: '0px',
    width: '0%',
    height: '100%',
    background: '#fff'
  };

  Object.assign(progressBar.style, barStyle);

  progressContainer.appendChild(progressBar);

  fileLabel = document.createElement('div');

  Object.assign(fileLabel.style, {
    ...barStyle,
    fontFamily: 'monospace',
    fontSize: '12px',
    lineHeight: progressHeight,
    background: 'transparent',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: '#fff',
    width: '100%'
  });

  progressContainer.appendChild(fileLabel);
}

function cancelHide() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function renderProgress(url, progress = 0) {
  if (!isFloppy) return;

  if (!appended) {
    document.body.appendChild(progressContainer);
    appended = true;
  }

  // ensure visibility
  progressContainer.style.display = 'block';

  // mix-blend-mode: invert text color as progress bar passes underneath.
  const toRemove = 'dist/';
  let offset = url.indexOf(toRemove);
  if (offset !== -1) {
    offset += toRemove.length;
  } else {
    offset = 0;
  }

  fileLabel.innerHTML = `&nbsp;💾 <span style="mix-blend-mode:exclusion">${url.substring(offset)}: ${progress}%</span>`;

  progressBar.style.width = `${progress}%`;

  cancelHide();
}

async function fetchWithProgress(url, callback) {
  const response = await fetch(url);

  const bytesTotal = Number(response.headers.get('content-length'));

  const reader = response.body.getReader();
  let bytesReceived = 0;

  while (true) {
    const result = await reader.read();

    if (result.done) {
      renderProgress(url, 100);
      if (isFloppy && !hideTimer) {
        hideTimer = setTimeout(() => {
          progressContainer.style.display = 'none';
          hideTimer = null;
        }, 1000);
      }
      break;
    }

    bytesReceived += result.value.length;

    if (isFloppy) {
      console.log(`💾 ${url}: ${bytesReceived} / ${bytesTotal}`);
    }

    const loaded = bytesReceived / bytesTotal;
    renderProgress(url, Math.floor(100 * loaded));
  }

  callback?.();
}

function fetchGZ(url, callback) {
  // 💾 “Special use case”: fetch + exec gzip-encoded asset(s).
  renderProgress(url);

  fetchWithProgress(url, () => {
    const decompress = async (url) => {
      // dirty: fetch "again", but from cache. :X
      // TODO: DRY, avoid additional fetch.
      const response = await fetch(url);

      const blob_in = await response.blob();
      const stream_in = blob_in
        .stream()
        .pipeThrough(new DecompressionStream('gzip'));
      const blob_out = await new Response(stream_in).blob();
      return await blob_out.text();
    };

    decompress(url).then((result) => callback?.(result));
  });
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

  /**
   * Prepend `dist/` as needed.
   * Only text-based resources are gzip-encoded.
   */
  if (isFloppy)
    return `${url.match(/dist\//i) ? '' : 'dist'}/${fileExt}/${url}${url.match(/\.(js|css|html)/i) ? '.gz' : ''}`;

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

function loadGeneric(src, onload) {
  fetchWithProgress(src, onload);
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
  loadCSS,
  loadGA,
  loadGeneric,
  loadHTML,
  loadJS,
  version,
  unloadCSS
};

export { aaLoader };
