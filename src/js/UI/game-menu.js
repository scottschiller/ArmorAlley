import { prefsManager } from '../aa.js';
import { aaLoader } from '../core/aa-loader.js';
import { common } from '../core/common.js';
import { game } from '../core/Game.js';
import {
  autoStart,
  clientFeatures,
  demo,
  GAME_SPEED,
  gameTypeEmoji,
  isMobile,
  isSafari,
  minimal,
  searchParams,
  SPRITESHEET_URL,
  TYPES,
  updateClientFeatures
} from '../core/global.js';
import { net } from '../core/network.js';
import {
  audioSpriteURL,
  playQueuedSounds,
  playSound,
  sounds
} from '../core/sound.js';
import { utils } from '../core/utils.js';
import {
  applyFlags,
  previewLevel,
  setCustomLevel,
  setLevel
} from '../levels/default.js';
import { gamepad } from './gamepad.js';
import { gamePrefs } from './preferences.js';

let video;

// game menu / home screen
let description;
let defaultDescription;
let lastHTML;

// TODO: clean up this mess. :P
let menu;
let optionsButton;
let oSelect;
let videoInterval;

let didBNBIntro;
let gameMenuActive;

let originalSubTitle;
let lastBattle;

const battle = searchParams.get('battle');

const gameTypeParam = searchParams.get('gameType');

const noVideo = aaLoader.isFloppy || searchParams.get('noVideo');

let customLevel = searchParams.get('customLevel');

let customGroup;

if (customLevel) {
  try {
    customLevel = JSON.parse(customLevel);

    // iterate through keys, make proper arrays of data and assign to defaultLevels['Custom Level']
    const newData = [];

    const alignmentMap = {
      l: 'left',
      n: 'neutral',
      r: 'right'
    };

    Object.keys(customLevel).forEach((item) => {
      let type, alignment;

      if (item.indexOf(':') !== -1) {
        // e.g., `bunker:r`
        [type, alignment] = item.split(':');
      } else {
        alignment = null;
        type = item;
      }

      // e.g., ['bunker', 'r']
      const entry = [type];

      if (alignment) entry.push(alignmentMap[alignment]);

      // add all the X offsets
      // ['bunker', 'r', [1024, 2048, 4096]]
      customLevel[item].forEach((offset) => {
        newData.push([...entry, offset]);
      });

      newData.sort(utils.array.compareByLastItem());

      setCustomLevel(newData);
    });
  } catch (e) {
    console.warn('Invalid custom level data?', e);
    customLevel = null;
  }
}

function bnbChange(bnb) {
  prefsManager.ignoreURLParams();
  prefsManager.applyNewPrefs({ bnb });
  prefsManager.writePrefsToStorage();

  // hackish: ensure the in-game menu updates.
  prefsManager.readAndApplyPrefsFromStorage();

  const subTitle =
    !game.data.started && document.getElementById('game-subtitle');

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
}

/**
 * "Proximity glow cards" effect
 * Hat tip: https://twitter.com/jh3yy/status/1734369933558010226
 * https://codepen.io/jh3y/pen/QWYPaax
 */

let container;
let cards;

function restyle() {
  container.style.setProperty('--glow-blur', config.blur);
  container.style.setProperty('--glow-spread', config.spread);
  container.style.setProperty(
    '--glow-direction',
    config.vertical ? 'column' : 'row'
  );
  // glow-spread overrides, HTML -> CSS, set per-element
  const prop = 'glow-spread';
  const attr = `data-${prop}`;
  container.querySelectorAll(`[${attr}]`).forEach((node) => {
    node.style.setProperty(`--${prop}`, node.getAttribute(attr));
  });
}

const config = {
  proximity: 50,
  spread: 180,
  blur: 13,
  opacity: 0
};

let layoutCache = {};

const useCache = true;
let glowIDs = 0;

function clearLayoutCache() {
  layoutCache = {};
}

function getLayout(item) {
  if (!useCache) return item.getBoundingClientRect();

  if (!item.id) {
    item.id = `glow_element_${glowIDs++}`;
  }

  if (layoutCache[item.id]) return layoutCache[item.id];

  layoutCache[item.id] = item.getBoundingClientRect();

  return layoutCache[item.id];
}

if (useCache) {
  utils.events.add(window, 'resize', clearLayoutCache);
}

function resetPointer() {
  // pretend-reset everything, so glow is entirely hidden.
  updatePointer({ x: 0, y: 0 });
}

function hidePointer() {
  if (!cards) return;
  for (const card of cards) {
    // apply default opacity
    card.style.setProperty('--glow-active', config.opacity);
  }
}

function startPointer(e) {
  if (!e.touches?.length) return;
  const touch = e.touches[e.touches.length - 1];
  updatePointer({
    x: touch.clientX,
    y: touch.clientY
  });
}

function updatePointer(event) {
  if (!event) return;

  // don't draw while in "background"
  if (prefsManager?.isActive()) return;

  // get the angle based on the center point of the card and pointer position
  for (const card of cards) {
    // Check the card against the proximity and then start updating
    const card_bounds = getLayout(card);
    // Get distance between pointer and outerbounds of card
    if (
      event.x > card_bounds.left - config.proximity &&
      event.x < card_bounds.left + card_bounds.width + config.proximity &&
      event.y > card_bounds.top - config.proximity &&
      event.y < card_bounds.top + card_bounds.height + config.proximity
    ) {
      // if within proximity, set the active opacity
      card.style.setProperty('--glow-active', 1);
    } else {
      card.style.setProperty('--glow-active', config.opacity);
    }
    const card_center = [
      card_bounds.left + card_bounds.width * 0.5,
      card_bounds.top + card_bounds.height * 0.5
    ];
    let angle =
      (Math.atan2(event.y - card_center[1], event.x - card_center[0]) * 180) /
      Math.PI;
    angle = angle < 0 ? angle + 360 : angle;
    card.style.setProperty('--glow-start', angle + 90);
  }
}

function init() {
  description = document.querySelector('#game-description span');
  defaultDescription = description.innerText;
  lastHTML = defaultDescription;

  menu = document.getElementById('game-menu');
  optionsButton = document.getElementById('game-options-button');
  oSelect = document.getElementById('game_level');

  /**
   * HACK: Safari desktop and iOS just refuse to animate the gradient on first load -
   * guessing this is layout and/or tied to the loading of the logo image asset.
   */
  if (isSafari) {
    let lg = document.getElementById('logo-gradient');
    if (!lg) return;
    // wait until image load, then poke the animation again to re-start it.
    lg.style.animationDuration = '99s';
    utils.image.load('UI/armor-alley-wordmark-white.webp', () => {
      lg.style.animationDuration = '';
      lg = null;
    });
  }

  if (battle && autoStart) {
    // "campaign mode" - hide the menu, minimal logo on start.
    utils.css.add(document.body, 'auto-start');
  }

  if (demo) {
    // special mode for making demo videos for the homepage etc.
    utils.css.add(document.body, 'demo');
  }

  if (minimal) {
    // reduced UI for in-game "attract mode" video
    utils.css.add(document.body, 'minimal');
  }

  let versionInfo = document.getElementById('version-info');

  if (versionInfo && window.aaVersion) {
    const v = window.aaVersion.substring(1);
    const versionString = [
      v.substring(0, 4),
      v.substring(4, 6),
      v.substring(6)
    ].join('.');
    versionInfo.title = 'Version / last updated date';
    versionInfo.innerText = `:: Build ${versionString} ::`;
  }

  aaVersion.substring();

  if (autoStart || demo || noVideo) {
    // hackish: don't show the intro video at all.
    document.getElementById('home-video-wrapper').remove();
  } else {
    video = document.getElementById('home-menu-video');
  }

  // hackish: override inline HTML style
  menu.style.visibility = 'unset';

  utils.css.add(menu, 'visible');

  utils.events.add(document, 'click', formClick);
  utils.events.add(optionsButton, 'click', () => showPrefs());
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
    bnbChange(bnb);
  });

  // also apply immediately, if checked.
  if (vs.checked) {
    bnbChange(true);
  }

  // we should have game prefs, now.
  lastBattle = gamePrefs.last_battle;

  // user-saved "last battle", or campaign mode via URL; find and select, if valid.
  const thisBattle = battle || lastBattle;

  // game menu / intro screen

  if (customLevel) {
    // <optgroup label="Network Game Levels">

    // this will be available for the network modal, too.
    customGroup = document.createElement('optgroup');
    customGroup.label = 'Custom Game Level';

    const customOption = document.createElement('option');
    customOption.innerHTML = 'Custom Level';
    customOption.value = 'Custom Level';
    customGroup.appendChild(customOption);

    oSelect.appendChild(customGroup);

    oSelect.selectedIndex = oSelect.options.length - 1;
  } else if (thisBattle) {
    // a battle has been specified.
    // try to apply this to the drop-down.
    const menuBattleOption = document.querySelector(
      `#game_level option[value="${thisBattle}"]`
    );
    if (menuBattleOption) {
      menuBattleOption.selected = true;
    }
    Object.values(oSelect.options).forEach(
      (option) => (option.selected = option.value === thisBattle)
    );
  }

  // stop default behaviours higher-up
  const wrapper = document.getElementById('game-level-wrapper');

  const openKeys = {
    'ArrowDown': true,
    'ArrowUp': true,
    ' ': true
  };

  utils.events.add(oSelect, 'keydown', (e) => {
    // shenanigans only if a key is used that opens the "picker"
    if (openKeys[e.key]) {
      selectLevel();
      e.preventDefault();
      return false;
    }
  });

  utils.events.add(wrapper, 'mousedown', (e) => {
    // ignore right-clicks
    if (e.button) return true;
    selectLevel();
    e.preventDefault();
    return false;
  });

  utils.events.add(wrapper, 'touchstart', (e) => {
    selectLevel();
    e.preventDefault();
    return false;
  });

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

  const gameTypeFromPrefs = gamePrefs.game_type;

  // cascade of priority: URL param, prefs, OR default.
  const defaultGameType = gameTypeParam || gameTypeFromPrefs || 'easy';

  game.setGameType(defaultGameType);

  const levelName = document.getElementById('game_level').value;

  previewLevel(levelName);

  updateGameLevelControl();

  // wait one frame for things to settle, then bring the whole menu up.
  window.requestAnimationFrame(() =>
    utils.css.add(game.objects.view.dom.gameMenu, 'active')
  );

  if (battle && autoStart) {
    // mobile needs user interaction, shows a button.
    if (isMobile) return;
    // desktop can do this immediately.
    common.setFrameTimeout(() => {
      formClick({
        target: {
          action: 'start-game'
        }
      });
    }, 1000);
  } else if (!demo) {
    showHomeVideo();
  }

  game.objects.gamepad = gamepad;

  if (!autoStart) {
    container = document.getElementById('game-menu');
    cards = container.querySelectorAll('.glow-item');

    // child / effect node for each "card" - <span class="glows"></span>
    let glowNode = document.createElement('span');
    glowNode.className = 'glows';

    cards.forEach((card) => card.appendChild(glowNode.cloneNode()));

    utils.events.add(document, 'touchstart', startPointer);
    utils.events.add(document.body, 'touchend', hidePointer);
    utils.events.add(document.body, 'pointermove', updatePointer);

    restyle();

    resetPointer();

    // clear layout cache in a moment, because user may have moved the mouse while the menu was zooming in.
    utils.events.add(
      game.objects.view.dom.gameMenu,
      'transitionend',
      afterTransitionIn
    );

    // start "game menu" mode for gamepad
    game.objects.gamepad?.onGameMenu();
  }

  // preload game CSS and main sprite, too.
  if (aaLoader.isFloppy) {
    aaLoader.loadCSS('aa-prefs-and-modals.css', () => {
      aaLoader.loadCSS('aa-game-ui.css', () => {
        aaLoader.loadGeneric(SPRITESHEET_URL, () => {
          loadSprites();
          if (!gamePrefs.sound) return;
          aaLoader.loadGeneric(audioSpriteURL);
        });
      });
    });
  } else {
    aaLoader.loadCSS('aa-prefs-and-modals.css');
    window.setTimeout(() => {
      aaLoader.loadCSS('aa-game-ui.css');
      loadSprites();
      if (gamePrefs.sound) {
        aaLoader.loadGeneric(audioSpriteURL);
      }
    }, 1000);
  }
}

function loadSprites() {
  utils.image.load(SPRITESHEET_URL, () => {
    // extract certain sprites up front, reduce initial flickering
    utils.preRenderSprites({
      callback: () => {
        // preload in-game might cause jank, affecting framerate test.
        if (game.data.started) return;
        utils.preRenderSprites({
          all: true
        });
      }
    });
  });
}

function afterTransitionIn() {
  clearLayoutCache();
  utils.events.remove(
    game.objects.view.dom.gameMenu,
    'transitionend',
    afterTransitionIn
  );
}

function introBNBSound(e) {
  // if from a key event, take note; this affects the in-game UI on mobile.
  if (e?.type?.match(/(keydown|keypress|keyup)/i) && !clientFeatures.keyboard) {
    updateClientFeatures({ keyboard: true });
    utils.css.add(document.getElementById('player-status-bar'), 'has_keyboard');
  }

  if (!gamePrefs.bnb) return;

  // bail if not ready yet - and ignore clicks on #game-options-link which play other sound.
  if (
    !sounds.bnb.gameMenu ||
    didBNBIntro ||
    e?.target?.id === 'game-options-link'
  )
    return;

  // ensure window isn't blurred, game isn't paused
  if (game.data.paused) return;

  didBNBIntro = true;

  if (!gameMenuActive) {
    gameMenuActive = true;
    playSound(sounds.bnb.gameMenu, null, {
      onfinish: () => (gameMenuActive = false)
    });
  }

  // the game is likely paused; ensure that this sound gets played.
  playQueuedSounds();

  utils.events.remove(window, 'keydown', introBNBSound);
  utils.events.remove(document, 'mousedown', introBNBSound);
  if (isMobile) {
    utils.events.remove(document, 'touchstart', introBNBSound);
  }
}

function updateGameLevelControl(value) {
  // if no value, maintain and decorate current selection w/difficulty emoji
  const gameLevel = document.getElementById('game_level');

  let index = !value
    ? gameLevel.selectedIndex
    : gameLevel.querySelector(`option[value="${value}"]`).index;

  // override: if game type is "tutorial" but index is non-zero, then set "easy" mode.
  if (index && gamePrefs.game_type === 'tutorial') {
    game.setGameType('easy');
  }

  // update drop-down text with emoji
  const option = gameLevel.getElementsByTagName('option')[index];

  option.innerHTML = `${option.value} ${option.value === 'Tutorial' ? gameTypeEmoji.tutorial : gameTypeEmoji[gamePrefs.game_type]}`;

  // update the main drop-down
  document.getElementById('game_level').selectedIndex = index;
}

function resetMenu() {
  if (lastHTML !== defaultDescription) {
    description.innerHTML = defaultDescription;
    lastHTML = defaultDescription;
  }
}

function menuUpdate(e) {
  let { target } = e,
    title;

  // might be an emoji or icon nested inside a <button>.
  if (target?.nodeName === 'SPAN') {
    target = target.parentNode;
  }

  // normalize to <a>
  if (
    target &&
    (target.nodeName === 'INPUT' || utils.css.has(target, 'emoji'))
  ) {
    target = target.parentNode;
  }

  if (target?.nodeName === 'SPAN') {
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
  const exit = document.getElementById('exit');

  if (exit) {
    exit.className = 'visible';
  }
}

function formClick(e) {
  let { target } = e;

  if (!target) return;

  // home-screen video
  // TODO: DRY
  if (video && target.tagName === 'DIV') {
    // reinforce auto-loop
    if (videoInterval) clearInterval(videoInterval);
    if (video.muted) {
      video.muted = false;
      video.volume = 0;
      // fade volume in
      const targetVolume = gamePrefs.volume || 1;
      videoInterval = setInterval(() => {
        video.volume = Math.min(targetVolume, video.volume + 0.03);
        if (video.volume >= targetVolume) {
          clearInterval(videoInterval);
          videoInterval = null;
        }
      }, 20);
    } else {
      if (videoInterval) clearInterval(videoInterval);
      videoInterval = setInterval(() => {
        video.volume = Math.max(0, video.volume - 0.03);
        if (video.volume <= 0) {
          clearInterval(videoInterval);
          videoInterval = null;
          video.muted = true;
        }
      }, 20);
    }
    if (video.paused) {
      video.play();
      video.addEventListener('ended', (e) => {
        e.target.currentTime = 0;
      });
    }
  }

  // note: this can run when the prefs modal is up, too - just looking for actions e.g., start network game.

  const action = target.action || target.getAttribute('data-action');

  // hackish: if an emoji (without "action") is clicked, find its sibling radio input. :X
  if (!action && utils.css.has(target, 'emoji-text')) {
    target = target.parentNode.querySelector('input');
    // there may not be an associated input - and if so, bail.
    if (!target) return;
  }

  if (action === 'start-editor') {
    const selectedIndex = oSelect.selectedIndex;

    setLevel(oSelect.value);

    formCleanup();

    game.objects.radar.reset();

    hideTitleScreen();

    showExitType();

    game.startEditor();

    return;
  }

  if (action === 'start-game') {
    // set level, if not already
    const selectedIndex = oSelect.selectedIndex;

    setLevel(oSelect.value);

    if (oSelect.value === 'Tutorial') {
      // sanity check: ensure game type if tutorial level is selected, but game type is not set.
      game.setGameType('tutorial');
    }

    // if *not* the tutorial, that DOM tree can now be trimmed.
    if (gamePrefs.game_type !== 'tutorial') {
      document.getElementById('tutorial-window')?.remove();
    }

    formCleanup();

    // go go go!
    startGame();

    return;
  }

  if (action === 'start-network-game') {
    configureNetworkGame();
  }

  const { name } = target;

  if (name === 'game_type') {
    game.setGameType(target.value);

    const levelName = document.getElementById('game_level').value;

    previewLevel(levelName);

    return;
  }

  if (name === 'net_game_type') {
    // hackish: grab the currently-selected level
    const levelName = document.querySelector(
      'input[name="net_game_level"]:checked'
    ).value;

    game.setGameType(target.value);

    previewLevel(levelName);

    return;
  }

  if (target.href && utils.css.has(target, 'cta')) {
    e.preventDefault();

    const { href } = target;
    const hash = href.substring(href.lastIndexOf('#') + 1);

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
}

function formCleanup() {
  utils.events.remove(document, 'click', formClick);
  utils.events.remove(document, 'touchstart', startPointer);
  utils.events.remove(document.body, 'pointermove', updatePointer);
  utils.events.remove(document.body, 'touchend', hidePointer);
  utils.events.remove(window, 'resize', clearLayoutCache);
  optionsButton = null;
  oSelect = null;
}

function configureNetworkGame() {
  const options = {
    network: true,
    onStart: startGame
  };

  // prefs might be open, we could be switching to the network version.
  if (prefsManager.isActive()) {
    prefsManager.hide();
  }

  showPrefs(options);
}

function selectLevel(options = {}) {
  // options might include prefs callbacks, etc.
  let params = Object.assign(options, { selectLevel: true });
  showPrefs(params);
}

function showPrefs(options) {
  // turn off glow effects
  hidePointer();
  prefsManager.show(options);
}

function startGame() {
  formCleanup();

  // remove the editor nodes.
  ['editor-window', 'editor-window-help'].forEach((id) =>
    document.getElementById(id)?.remove()
  );

  // update <body> based on level-specific flags, e.g., aimed missiles
  applyFlags();

  game.objects.radar.reset();

  game.objects.notifications.welcome();

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
    if (GAME_SPEED !== 1) {
      common.applyGameSpeedToAll();
    }

    game.init();

    window.requestAnimationFrame(() => {
      showExitType();
      hideTitleScreen();
    });
  }
}

function showHomeVideo() {
  // skip if auto-start applies, e.g., in campaign or demo mode.
  if (autoStart || demo) return;

  let video = document.getElementById('home-menu-video');

  if (!video) return;

  const canPlay = /maybe|probably/gi;

  let hqVideo = searchParams.get('hqVideo');

  let res = window.innerWidth >= 1920 ? '4k' : 'hd';

  const types = {
    // https://cconcolato.github.io/media-mime-support/#video/mp4;%20codecs=%22hvc1%22
    mp4: 'video/mp4; codecs="hev1.1.6.L93.B0"',
    webm: 'video/webm; codecs="vp09.00.50.08"'
  };

  const support = {
    mp4: false,
    webm: false
  };

  // load up video with most-likely-supported format at 1080p or 4K, depending.
  function addSource(res, ext) {
    if (!video) return;
    const url = `${aaLoader.getVideoRoot()}/aa-game-${res}.${ext}`;
    const source = document.createElement('source');
    source.src = url;
    source.type = `video/${ext}`;
    video.appendChild(source);
  }

  function maybeCanPlay(type) {
    const format = types[type];
    return (
      window.MediaSource?.isTypeSupported?.(format) ||
      canPlay.test(video.canPlayType(format))
    );
  }

  // home screen / screencast / screenshot demo recording
  if (hqVideo) {
    res += '-hq';
  }

  // Safari indicates support, but then fails to play my webm-encoded videos.
  if (maybeCanPlay('webm') && !navigator.userAgent.match(/safari/i)) {
    addSource(res, 'webm');
    addSource(res, 'mp4');
  } else if (maybeCanPlay('mp4')) {
    addSource(res, 'mp4');
    addSource(res, 'webm');
  } else {
    // fallback
    addSource(res, 'mp4');
    addSource(res, 'webm');
  }

  video = null;
  hqVideo = null;
}

function hideTitleScreen(callback) {
  common.setVideo('vr-goggles-menu');

  // remove overlay effects
  utils.css.add(game.dom.world, 'active');
  utils.css.remove(game.dom.world, 'welcome');

  function hideTitleScreenFinished(e) {
    // wait for the fade to finish, specifically.
    if (
      e.target === game.objects.view.dom.gameMenu &&
      e.propertyName === 'opacity'
    ) {
      // and transition, too.
      game.objects.view.dom.worldWrapper.style.transition = '';

      // and reset FPS timings, as this may affect peformance.
      game.objects.gameLoop.resetFPS();

      game.objects.view.dom.logo.remove();
      game.objects.view.dom.logo = null;

      game.objects.view.dom.gameMenu.removeEventListener(
        'transitionend',
        hideTitleScreenFinished
      );
      game.objects.view.dom.gameMenu.remove();
      game.objects.view.dom.gameMenu = null;

      if (videoInterval) {
        clearInterval(videoInterval);
        videoInterval = null;
        if (video) {
          video.remove();
          video = null;
        }
      }

      document.getElementById('home-video-wrapper')?.remove();

      game.data.started = true;

      // drop game menu CSS in a minute.
      window.setTimeout(() => aaLoader.unloadCSS('aa-game-menu.css'), 1250);

      callback?.();
    }
  }

  // fade video volume, if it was playing.
  // TODO: DRY
  if (video && !video.muted) {
    if (videoInterval) clearInterval(videoInterval);
    videoInterval = setInterval(() => {
      video.volume = Math.max(0, video.volume - 0.03);
      if (video.volume <= 0) {
        clearInterval(videoInterval);
        videoInterval = null;
      }
    }, 20);
  }

  game.objects.view.dom.gameMenu.addEventListener(
    'transitionend',
    hideTitleScreenFinished
  );

  utils.css.add(game.objects.view.dom.gameMenu, 'fade-out');

  // testing - e.g., ?theywin=5000 for a 5-second game-over sequence
  let theyWin = searchParams.get('theyWin');
  const youWin = searchParams.get('youWin');

  // e.g., ?vanOffset=440 to push further out from base.
  const vanOffset = searchParams.get('vanOffset') || 0;

  let winDelay;
  const defaultDelay = 2000;

  if (theyWin) {
    winDelay = theyWin === 1 ? defaultDelay : theyWin;
  } else if (youWin) {
    winDelay = youWin === 1 ? defaultDelay : youWin;
  }

  if (theyWin || youWin) {
    window.setTimeout(() => {
      const pads = game.objects[TYPES.landingPad];
      const x = theyWin
        ? pads[0].data.x + 88 + vanOffset
        : pads[pads.length - 1].data.x - 44 - vanOffset;

      game.addObject('van', {
        isEnemy: !!theyWin,
        x
      });
    }, winDelay);
  }
}

const gameMenu = {
  formClick,
  init,
  getCustomGroup: () => customGroup,
  updateGameLevelControl,
  menuUpdate,
  selectLevel,
  startGame
};

export { gameMenu };
