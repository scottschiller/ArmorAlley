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

// JS + CSS nodes
let toAppend = [];

console.log(
  '🚁 ARMOR ALLEY: using ' +
    (dev
      ? 'development JS.'
      : `production JS build, ${
          version.length ? version.substr(1) : '[none]'
        }. Try ?dev=1 for the full source with comments.`)
);

let fetched = {};

function loadScript(src, type = 'module', async = false, onload) {
  if (fetched[src]) {
    onload?.();
    return;
  }
  let s = document.createElement('script');
  if (type) s.type = type;
  if (async) s.async = true;
  s.onerror = (e) => {
    // ignore if not local
    if (new URL(s.src).hostname !== wl.hostname) return;
    console.warn(
      `loadScript(): ${src}${version} failed.${
        version ? ' Will retry, dropping version string.' : ''
      }`,
      e
    );
    s.onerror = null;
    s.remove();
    s = null;
    if (version) {
      version = '';
      loadScript(src, type, async, onload);
      // try the same for CSS.
      loadCSS();
    }
  };
  s.onload = () => {
    console.log(`Loaded JS: ${src}${version}`);
    fetched[src] = true;
    onload?.();
    s.onload = null;
    s = null;
  };
  s.src = `${src}${version}`;
  if (toAppend) {
    // document still loading
    toAppend.push(s);
  } else {
    // retry case
    document?.head?.appendChild(s);
  }
}

function loadCSS(src, onload) {
  if (!src) return;
  // minified version?
  if (isProdSite || forceProd) src = src.replace('.css', '_min.css');

  if (fetched[src]) {
    onload?.();
    return;
  }
  let link = document.createElement('link');
  link.rel = 'stylesheet';
  link.media = 'screen';
  link.onload = () => {
    console.log(`Loaded CSS: ${src}${version}`);
    fetched[src] = true;
    onload?.();
    link.onload = null;
    link = null;
  };
  link.href = `${src}${version}`;
  document.head?.appendChild(link);
}

function doAppend() {
  if (!toAppend || !document.head) return;
  try {
    toAppend.forEach((s) => document.head.appendChild(s));
    document.onreadystatechange = null;
    toAppend = null;
  } catch (e) {
    console.warn('script append failed? :/');
  }
}

function ga() {
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
    async = true;
  loadScript(
    'https://www.googletagmanager.com/gtag/js?id=G-XGW2TDDC6V',
    type,
    async
  );
}

if (dev) {
  // load the unminified sources.
  loadScript('script/aa.js');
} else {
  loadScript('script/aa_main.js');
}

// common CSS
loadCSS('css/aa.css');

ga();

// go go go!
doAppend();

// just in case: fallback method
document.onreadystatechange = doAppend;

const aaLoader = {
  loadScript,
  loadCSS
};

export { aaLoader };
