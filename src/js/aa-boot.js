/**
 * AA Boot script
 * This fetches the core JS + CSS, and starts the game.
 */

import { aaLoader } from './core/aa-loader.js';

const { isFloppy } = aaLoader;

aaLoader.hello();

let loaded = 0;
let needed = 0;
let fetchQueue = [];
let activeFetchCount = 0;

function complete() {
  loaded++;
  if (loaded >= needed) {
    // start the game
    if (window.initArmorAlley) {
      // go go go!
      window.initArmorAlley();
      window.setTimeout(aaLoader.loadGA, 2500);
    } else {
      console.warn('AA-boot: WTF no window.initArmorAlley()?');
    }
    return;
  }
}

function fetch(method, url, callback) {
  needed++;

  function nextFetch() {
    // next in queue

    let fetchItem;

    // next item in the queue, as applicable
    if (fetchQueue.length) {
      fetchItem = fetchQueue.shift();
      activeFetchCount++;
      fetchItem.method();
    }
  }

  function fetchComplete() {
    activeFetchCount--;
    callback?.();
    complete();
    nextFetch();
  }

  // always push the new thing onto the queue.
  fetchQueue.push({
    url,
    method: () => method(url, fetchComplete)
  });

  if (isFloppy) {
    // was queue empty? Go go go!
    if (fetchQueue.length === 1 && !activeFetchCount) {
      nextFetch();
    }
    // otherwise, wait until the current item is complete.
  } else {
    // process immediately
    nextFetch();
  }
}

// floppy disk version: pre-fetch menu font
if (isFloppy) {
  fetch(
    aaLoader.loadGeneric,
    'dist/font/CheddarGothicStencil/CheddarGothicStencil-subset.woff2'
  );
}

// common CSS
fetch(aaLoader.loadCSS, 'aa.css');
fetch(aaLoader.loadCSS, 'aa-game-menu.css');

fetch(aaLoader.loadJS, 'aa.js');
