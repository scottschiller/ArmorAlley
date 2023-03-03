import { prefsManager } from '../aa.js';
import { common } from '../core/common.js';
import { game, gameType } from '../core/Game.js';
import { isMobile, isSafari, setTutorialMode } from '../core/global.js';
import { playQueuedSounds, playSound, sounds } from '../core/sound.js';
import { utils } from '../core/utils.js';
import { prefs } from './preferences.js';

// game menu / home screen

let description;
let defaultDescription;
let lastHTML;

// TODO: clean up this mess. :P
let menu;
let form;
let optionsButton;

let didBNBIntro;
let gameMenuActive;
let prefetchedPrefs;

function init() {

  const { dom } = game;

  description = document.getElementById('game-description');
  defaultDescription = description.innerHTML;
  lastHTML = defaultDescription;

  menu = document.getElementById('game-menu');
  form = document.getElementById('game-menu-form');
  optionsButton = document.getElementById('game-options-button');

  utils.css.add(dom.world, 'blurred');

  utils.css.add(menu, 'visible');

  utils.events.add(form, 'input', formInput);
  utils.events.add(form, 'submit', formSubmit);

  utils.events.add(optionsButton, 'click', () => prefsManager.show());
  utils.events.add(menu, 'mouseover', menuUpdate);
  utils.events.add(menu, 'mouseout', menuUpdate);

  // one-off: "VS" checkbox
  const vs = document.getElementById('checkbox-vs');

  // hackish: force the prefs manager to read from LS right now - it hasn't yet.
  const storedPrefs = prefsManager.readPrefsFromStorage();

  // reflect the current setting in the UI
  vs.checked = storedPrefs.bnb;

  // update VS pref
  utils.events.add(vs, 'change', () => {

    const bnb = !!vs.checked;

    prefsManager.ignoreURLParams();
    prefsManager.applyNewPrefs({ bnb });
    prefsManager.writePrefsToStorage();

    // hackish: ensure the in-game menu updates.
    prefsManager.readAndApplyPrefsFromStorage();

    // ensure the local prefetched version is up to date
    prefetchedPrefs.bnb = bnb;

    if (!bnb) {
      // reset, if needed
      didBNBIntro = false;
    } else {
      // we're in a click event, go now?
      introBNBSound();
    }

  });

  prefsManager.init();

  // game menu / intro screen

  utils.events.add(document, 'mousemove', introBNBSound);
  utils.events.add(document, 'mousedown', introBNBSound);
  utils.events.add(window, 'keydown', introBNBSound);
  if (isMobile) {
    utils.events.add(document, 'touchstart', introBNBSound);
  }

  // if stored, apply the user-set game type now
  if (gameType) {
    document.getElementById(`radio-${gameType}`).setAttribute('checked', true);
    // kick off UI updates
    lastHTML = null;
    formInput();
  }

}

function introBNBSound(e) {

  // bail if not ready yet - and ignore clicks on #game-options-link which play other sound.
  if (!sounds.bnb.gameMenu || didBNBIntro || (e?.target?.id === 'game-options-link')) return;

  // likewise, if preferences modal is up and user is clicking around.
  if (prefsManager.isActive()) return;

  // ensure window isn't blurred, game isn't paused
  if (game.data.paused) return;

  // make sure we are allowed to play this.
  // hackish: read here because prefs init may not have fired yet.
  if (!prefetchedPrefs) {
    prefetchedPrefs = prefsManager.readPrefsFromStorage();
  }

  if (!prefetchedPrefs.bnb) return;

  didBNBIntro = true;

  if (!gameMenuActive) {
    gameMenuActive = true;
    playSound(sounds.bnb.gameMenu, null, { onfinish: () => gameMenuActive = false });
  }

  // the game is likely paused; ensure that this sound gets played.
  playQueuedSounds();

  utils.events.remove(window, 'keydown', introBNBSound);
  utils.events.remove(document, 'mousemove', introBNBSound);
  utils.events.remove(document, 'mousedown', introBNBSound);
  if (isMobile) {
    utils.events.remove(document, 'touchstart', introBNBSound);
  }

}

function resetMenu() {
  if (lastHTML !== defaultDescription) {
    description.innerHTML = defaultDescription;
    lastHTML = defaultDescription;
  }
}

function menuUpdate(e) {

  let { target } = e, title;

  // normalize to <a>
  if (target && (target.nodeName === 'INPUT' || utils.css.has(target, 'emoji'))) {
    target = target.parentNode;
  }

  if (target && (target.className.match(/cta/i) || target.nodeName === 'BUTTON')) {
    title = target.title;
    if (title) {
      target.setAttribute('data-title', title);
      target.title = '';
    } else {
      title = target.getAttribute('data-title');
    }
    if (lastHTML !== title) {
      description.innerHTML = title;
      lastHTML = title;
    }
  } else {
    resetMenu();
  }

}

function showExitType() {

  // copy emoji to "exit" link
  const exitEmoji = document.getElementById('exit-emoji');

  let emojiReference = document.getElementById('game-menu').getElementsByClassName(`emoji-${gameType}`);
  emojiReference = emojiReference && emojiReference[0];

  if (exitEmoji && emojiReference) {
    exitEmoji.innerHTML = emojiReference.innerHTML;
  }

  // and show "exit"
  const exit = document.getElementById('exit');

  if (exit) {
    exit.className = 'visible';
  }

}

function readFormData() {

  // form fields -> nice object
  return Object.fromEntries(new FormData(form).entries());

}

function formInput() {

  const data = readFormData();
  // update the default description

  if (!data.gameType) return;

  let label = document.getElementById(`${data.gameType}-label`);
  let labelEmoji = label.getElementsByClassName('emoji')[0];

  let startEmoji = document.getElementById('start-emoji');

  defaultDescription = label.getAttribute('data-title');
  startEmoji.innerText = labelEmoji.innerText;

  // thou shall not leak
  label = labelEmoji = startEmoji = null;

}

function formSubmit(e) {

  const data = readFormData();

  utils.events.preventDefault(e);

  if (!data.game_type) return;

  // write this back to global
  game.setGameType(data.game_type);

  // remember for next time
  utils.storage.set(prefs.gameType, gameType);

  // cleanup
  utils.events.remove(form, 'input', formInput);
  utils.events.remove(form, 'submit', formSubmit);
  utils.events.remove(menu, 'mouseover', menuUpdate);
  utils.events.remove(menu, 'mouseout', menuUpdate);

  menu = null;
  form = null;
  optionsButton = null;
  description = null;

  setTutorialMode(gameType === 'tutorial');

  // go go go!
  game.init();
  
  hideTitleScreen();

  showExitType();

  return false;
  
}

function hideTitleScreen(delay = 128) {

  game.data.started = true;

  common.setVideo('vr-goggles-menu');
  
  common.setFrameTimeout(() => {

    let overlay = document.getElementById('world-overlay');
    const world = document.getElementById('world');

    const blurred = 'blurred';
    const noBlur = 'no-blur';

    utils.css.add(world, noBlur);

    utils.css.add(overlay, 'fade-out');

    game.objects.notifications.welcome();

    // remove from the DOM eventually
    common.setFrameTimeout(() => {

      /**
       * hackish: removing this element seems to break active
       * touchstart -> touchmove() events on iOS Safari,
       * which breaks the joystick feature. un-style, instead.
       */
      if (!(isMobile && isSafari)) {
        overlay?.remove();
      } else if (overlay) {
        overlay.style.display = 'none';
        overlay.style.background = 'transparent';
        overlay.style.transition = '';
        overlay.style.transform = '';
        overlay.style.zIndex = 0;
      }

      overlay = null;

      // remove blur / no-blur entirely.
      utils.css.remove(world, blurred);
      utils.css.remove(world, noBlur);

      // and transition, too.
      game.objects.view.dom.worldWrapper.style.transition = '';

      // and reset FPS timings, as this may affect peformance.
      game.objects.gameLoop.resetFPS();

      game.objects.view.dom.logo.remove();
      game.objects.view.dom.logo = null;

    }, 2250);

  }, delay);
  
}

const gameMenu = {
  init,
  menuUpdate
};

export { gameMenu };