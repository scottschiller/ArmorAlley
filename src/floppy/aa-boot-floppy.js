/**
 * 💾 AA: FLOPPY DISK BOOT LOADER
 * This file becomes index.html for the floppy disk version of the game.
 * This loader fetches and swaps in a gzip-compressed version of the regular index.html.
 */
window.aaVersion = '';
window.aaFloppy = true;

const isProd = true;
const url = 'index.html.gz';

function fetchGZ(url, callback) {
  // 💾 “Special use case”: fetch + exec gzip-encoded asset(s).
  console.log(`💾 ${url.replace('dist/css', '')} 🗜️`);

  url = `${url}?ts=${Date.now()}`;

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

fetchGZ(url, (resp) => {
  // parse the original index.html, and insert its contents into the page.
  const dom = new DOMParser().parseFromString(resp, 'text/html');

  // basically, an entire page swap!
  // <head> seems to respect dynamic updates only; so be it.
  Array.from(dom.head.children).forEach((node) => {
    // prevent some 404s - favicon + manifest.json
    if (node?.rel?.match(/manifest|shortcut|icon/i)) return;

    // all good: regular append.
    document.head.appendChild(node);

    // inline script node: just run it as-is; here be dragons, etc.
    if (node.nodeName === 'SCRIPT' && !node.src) {
      eval(node.text);
    }
  });

  // meanwhile, <body> can be swapped out entirely.
  document.body.replaceWith(dom.body);
});
