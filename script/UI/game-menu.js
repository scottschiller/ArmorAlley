import { prefsManager } from '../aa.js';
import { common } from '../core/common.js';
import { game, gameType } from '../core/Game.js';
import { isMobile, isSafari } from '../core/global.js';
import { net } from '../core/network.js';
import { playQueuedSounds, playSound, sounds } from '../core/sound.js';
import { utils } from '../core/utils.js';
import { setLevel } from '../levels/default.js';
import { gamePrefs } from './preferences.js';

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

let originalSubTitle;

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

  utils.events.add(form, 'click', formClick);

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

    const subTitle = !game.data.started && document.getElementById('game-subtitle');

    if (subTitle && !originalSubTitle) {
      originalSubTitle = subTitle.innerHTML;
    }

    if (!bnb) {
      // reset, if needed
      didBNBIntro = false;
      if (subTitle) {
        subTitle.innerHTML = originalSubTitle || '';
      }
    } else {
      // we're in a click event, go now?
      introBNBSound();
      if (subTitle) {
        subTitle.innerHTML = subTitle.getAttribute('title-bnb');
      }
    }

  });

  prefsManager.init();

  // game menu / intro screen

  utils.events.add(document, 'mousedown', introBNBSound);
  utils.events.add(window, 'keydown', introBNBSound);
  if (isMobile) {
    utils.events.add(document, 'touchstart', introBNBSound);
  }

  // if we have a gameStyle, just get right to it.
  const searchParams = new URLSearchParams(window.location.search);

  let gameStyle = searchParams.get('game_style');

  if (gameStyle === 'network') {
    configureNetworkGame();
  }

}

function introBNBSound(e) {

  if (!gamePrefs.bnb) return;

  // bail if not ready yet - and ignore clicks on #game-options-link which play other sound.
  if (!sounds.bnb.gameMenu || didBNBIntro || (e?.target?.id === 'game-options-link')) return;

  // ensure window isn't blurred, game isn't paused
  if (game.data.paused) return;

  didBNBIntro = true;

  if (!gameMenuActive) {
    gameMenuActive = true;
    playSound(sounds.bnb.gameMenu, null, { onfinish: () => gameMenuActive = false });
  }

  // the game is likely paused; ensure that this sound gets played.
  playQueuedSounds();

  utils.events.remove(window, 'keydown', introBNBSound);
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

  // might be an emoji or icon nested inside a <button>.
  if (target?.nodeName === 'SPAN') {
    target = target.parentNode;
  }

  // normalize to <a>
  if (target && (target.nodeName === 'INPUT' || utils.css.has(target, 'emoji'))) {
    target = target.parentNode;
  }

  const dataTitle = target?.getAttribute('data-title');

  if (dataTitle || target?.title) {
    title = target.title;
    if (title) {
      target.setAttribute('data-title', title);
      target.title = '';
    } else {
      title = dataTitle;
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

function formClick(e) {

  const { target } = e;

  // drop-down?
  if (target.nodeName.toLowerCase() === 'option') {
    // assume it's the game level
    const level = target.value;
    setLevel(level);
    return;
  }

  const action = target.getAttribute('data-action');

  if (action === 'tutorial') {

    game.setGameType(action);

    formCleanup();

    // go go go!
    startGame();

    return false;
    
  }

  if (action === 'start-game') {

    // set level and game type, if not already

    // get the current game type from the form.
    const gameType = document.querySelectorAll('input[name="game_type"]:checked')[0].value;

    const gameLevel = document.querySelectorAll('select[name="level"]')[0].value;

    setLevel(gameLevel);

    game.setGameType(gameType);

    formCleanup();

    // go go go!
    startGame();

    return;
    
  }

  const { name } = target;

  if (name === 'game_type') {
    game.setGameType(target.value);
    return;
  }

  if (target.href && utils.css.has(target, 'cta')) {

    e.preventDefault();

    const { href } = target;
    const hash = href.substr(href.lastIndexOf('#') + 1);

    // #[easy|hard|extreme|tutorial]

    if (hash === 'new-game') return;

    if (hash === 'tutorial') {

      game.setGameType(hash);

      formCleanup();

      // go go go!
      startGame();

    }

    return false;

  }

  if (target.id === 'start-network-game') {
    configureNetworkGame();
  }
  
}

function formCleanup() {

  utils.events.remove(form, 'click', formClick);
  form = null;

}

function configureNetworkGame() {

  const options = {
    network: true,
    onStart: startGame
  };

  prefsManager.show(options);
  
}

function startGame() {

  formCleanup();

  if (net.connected) {

    game.setGameType(gamePrefs.net_game_type);

    showExitType();

    // start the transition, then ping test, and finally, start game loop.
    hideTitleScreen(() => {

      // don't pause for a network game.
      game.objects.view.data.noPause = true;

      game.objects.gameLoop.resetFPS();

      // hackish: reset
      game.objects.gameLoop.data.frameCount = 0;

      game.start();

      game.init();

    });

  } else {

    // go go go!
    game.init();

    window.requestAnimationFrame(() => {
      showExitType();
      hideTitleScreen();
    }, 128);

  }
  
}

function hideTitleScreen(callback) {

  common.setVideo('vr-goggles-menu');
  
  let overlay = document.getElementById('world-overlay');
  const world = document.getElementById('world');

  const blurred = 'blurred';
  const noBlur = 'no-blur';

  function hideTitleScreenFinished(e) {

    if (e.target === overlay && e.propertyName === 'opacity') {

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

      game.data.started = true;
      overlay?.removeEventListener('transitionend', hideTitleScreenFinished);

      callback?.();

    }
  
  }

  utils.css.add(world, noBlur);

  utils.css.add(overlay, 'fade-out');

  overlay.addEventListener('transitionend', hideTitleScreenFinished);

  game.objects.notifications.welcome();
  
}

const gameMenu = {
  init,
  menuUpdate,
  startGame
};

export { gameMenu };