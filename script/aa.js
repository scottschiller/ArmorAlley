'use strict';
/* global soundManager */
/*

                                         ████▙   ▀████▌████▙  ▀█████   █████▀ ▄██████▄ ▀████▌████▙         ████▙   ▀█████▀    ▀█████▀     ▀████▐███▋▀█████▀ ▀█████▀ TM
                        ▄██▀            ▕█████▏   ████▌ ████▌  ▐████▌  ████▌ ████▎▐███▊ ████▌ ████▌        █████▏   █████      █████       ████ ▝██▋ ▝████   ▐███▘
                      ▄█▀               ▐▐████▎   ████▌ ████▙   █████ ▌████▌▐███▊  ████▏████▌ ████▙       ▐▐████▎   █████      █████       ████   ▝▋  ▝███▙ ▗███▘
      ▄████▄▄▄▄▄▄▄▄▄ █▀▄▄▄▄▄▄▄▄▄▄▄      █▌████▋   ████▌▗████▘   ▌█████▌████▌████▊  ████▌████▌▗████▘       █▌████▋   █████      █████       ████ ▗█▌    ▝███▙▝█▘
                  ▄█████▄▄▄▄  ▀▀▀      ▐█▌▐████   ████▌████▘    ▌█████▌████▌████▊  ████▌████▌████▘       ▐█▌▐████   █████      █████       ████▐██▌     ▐████▌
  ▄          ▄████████████████▄        ██ ▄████▎  ████▌▝███▙    █▐████ ████▌████▊  ████▌████▌▝███▙       ██ ▄████▎  █████      █████       ████ ▝█▌     ▐████▌
  ██        ▀████████████████████▄    ▐█▌██████▌  ████▌ ████▌  ▕█ ███▌ ████▌▐███▊  ████ ████▌ ████▌     ▐█▌██████▌  █████    ▗▋█████    ▗▋ ████   ▗▋    ▐████▌
  ▀███     ▄██████████████████████    ███  ▐████  ████▌ ████▌▗▋▐█ ▐██  ████▌ ████▎▐███▊ ████▌ ████▌▗▋   ███  ▐████  █████  ▗██▌█████  ▗██▌ ████ ▗██▌    ▐████▌
   ████▄▄███████████████████████▀    ▄███▄ ▄████▌▄█████▄▀████▀▄██▄ █▌ ▄█████▄ ▀██████▀ ▄█████▄▀████▀   ▄███▄ ▄████▌▄█████▐████▌█████▌████▌▄████▐███▌   ▄██████▄
  ████████▀▀▀▀▀▀▀▀████▀█▀▀▀▀█▀
   ██▀              ██▘▘ ██▘▘


  ---------------------------------------------
  A R M O R  A L L E Y  ::  R E M A S T E R E D
  --------- 10th Anniversary Edition ----------

  A browser-based interpretation of the Macintosh + MS-DOS releases of Armor Alley.

  Original game Copyright (C) 1989 - 1991 Information Access Technologies.
  https://en.wikipedia.org/wiki/Armor_alley

  Images, text and other portions of the original game used with permission under an ISC license.
  Original sound effects could not be re-licensed; modern replacements used from freesound.org.

  https://www.schillmania.com/armor-alley/
  https://www.schillmania.com/content/entries/2013/armor-alley-web-prototype/
  https://github.com/scottschiller/ArmorAlley/

  General disclaimer: This is a fun personal side project. The code could be tightened up a bit.

  This release:     V2.0.20230501
  Previous release: V1.6.20220201
  Original release: V1.0.20131031

  For revision history, see README.md and CHANGELOG.txt.

*/

const prefsManager = PrefsManager();

const keyboardMonitor = KeyboardMonitor();

let stats;

// used by the "exit [game type]" link
window.aa = {

  exit() {

    // delete stored preference
    utils.storage.remove(prefs.gameType);

  }

};

// OGG is available, so MP3 is not required.
soundManager.audioFormats.mp3.required = false;

soundManager.setup({
  debugMode: false,
  // Audio in Firefox starts breaking up at some number of active sounds, if this is enabled. :/
  usePlaybackRate: true,
  defaultOptions: {
    volume: DEFAULT_VOLUME,
    multiShotEvents: true
  },
});

if (winloc.match(/mute/i)) {
  soundManager.disable();
}

window.addEventListener('DOMContentLoaded', game.initArmorAlley);

// --- THE END ---

import { winloc, DEFAULT_VOLUME } from './core/global.js';

import { utils } from './core/utils.js';
import { game } from './core/Game.js';
import { KeyboardMonitor } from './UI/KeyboardMonitor.js';
import { prefs, PrefsManager } from './UI/preferences.js';

// a few hot globals
export { gameType, screenScale } from './core/Game.js';

export { keyboardMonitor, prefsManager, stats };