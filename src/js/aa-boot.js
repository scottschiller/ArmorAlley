/**
 * AA Boot script
 * This fetches the core JS + CSS, and starts the game.
 */

import { aaLoader } from './core/aa-loader.js';

aaLoader.hello();

let loaded = 0;
let needed = 0;

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
  }
}

function fetch(method, url, callback = complete) {
  needed++;
  method(url, callback);
}

// common CSS
fetch(aaLoader.loadCSS, 'aa.css');
fetch(aaLoader.loadCSS, 'aa-game-menu.css');

fetch(aaLoader.loadJS, 'aa.js');
