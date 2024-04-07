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
  // next item in the queue, as applicable
  if (isFloppy && fetchQueue.length) {
    let fetchCall = fetchQueue.shift();
    fetchCall();
  }
}

function fetch(method, url, callback) {
  needed++;

  function nextFetch() {
    method(url, () => {
      callback?.();
      complete();
    });
  }

  if (isFloppy) {
    // queue empty? Go go go!
    if (!fetchQueue.length) {
      nextFetch();
    } else {
      fetchQueue.push(nextFetch);
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
