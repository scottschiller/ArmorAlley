import { keyboardMonitor, prefsManager } from '../aa.js';
import { debug, isFirefox, isSafari, isMobile, isiPhone, oneOf, rndInt, TYPES, tutorialMode, winloc, worldWidth, parseTypes } from './global.js';
import { utils } from './utils.js';
import { zones } from './zones.js';
import { common } from './common.js';
import { gamePrefs, prefs } from '../UI/preferences.js';
import { orientationChange } from '../UI/mobile.js';
import { playSound, sounds } from './sound.js';
import { Stats } from '../UI/Stats.js';
import { Joystick} from '../UI/Joystick.js';
import { View } from '../UI/View.js';
import { Inventory } from '../UI/Inventory.js';
import { Radar } from '../UI/Radar.js';
import { Tutorial } from '../UI/Tutorial.js';
import { Notifications } from '../UI/Notifications.js';
import { Queue } from './Queue.js';
import { GameLoop } from './GameLoop.js';
import { Funds } from '../UI/Funds.js';
import { Tank } from '../units/Tank.js';
import { Balloon } from '../elements/Balloon.js';
import { Bunker } from '../buildings/Bunker.js';
import { Chain } from '../elements/Chain.js';
import { MissileLauncher } from '../units/MissileLauncher.js';
import { EndBunker } from '../buildings/EndBunker.js';
import { SuperBunker } from '../buildings/SuperBunker.js';
import { Turret } from '../buildings/Turret.js';
import { Base } from '../buildings/Base.js';
import { Cloud } from '../elements/Cloud.js';
import { Helicopter } from '../units/Helicopter.js';
import { Infantry } from '../units/Infantry.js';
import { Engineer } from '../units/Engineer.js';
import { Van } from '../units/Van.js';
import { LandingPad } from '../buildings/LandingPad.js';
import { Cornholio } from '../units/Cornholio.js';
import { Bomb } from '../munitions/Bomb.js';
import { GunFire } from '../munitions/GunFire.js';
import { ParachuteInfantry } from '../units/ParachuteInfantry.js';
import { SmartMissile } from '../munitions/SmartMissile.js';
import { Shrapnel } from '../elements/Shrapnel.js';
import { sprites } from './sprites.js';
import { addWorldObjects } from '../levels/default.js';
import { gameMenu } from '../UI/game-menu.js';

const DEFAULT_GAME_TYPE = 'tutorial';

// very commonly-accessed attributes to be exported
let gameType;
let screenScale = 1;
let started;

const game = (() => {

  let data, dom, layoutCache = {}, objects, objectsById, objectConstructors, exports;

  function addItem(className, x, extraTransforms) {

    let data, _dom, width, height, inCache, exports;

    function initDOM() {

      _dom.o = sprites.create({
        className: `${className} terrain-item`
      });

    }
    
    function initItem() {

      initDOM();

      if (layoutCache[className]) {

        inCache = true;
        width = layoutCache[className].width;
        height = layoutCache[className].height;
  
      } else {
  
        // append to get layout (based on CSS)
        dom.battlefield.appendChild(_dom.o);
  
      }

    }

    // prefixed to avoid name conflict with parent game namespace
    // TODO: break this out into an Item class.
    _dom = {
      o: null
    };

    initItem();
    
    data = {
      type: className,
      isTerrainItem: true,
      x,
      y: 0,
      // dirty: force layout, read from CSS, and cache below
      width: width || _dom?.o?.offsetWidth,
      height: height || _dom?.o?.offsetHeight,
      isOnScreen: null,
      extraTransforms
    };

    if (!inCache) {

      // store
      layoutCache[className] = {
        width: data.width,
        height: data.height
      };

      // remove the node, now that we have its layout.
      // this will be re-appended when on-screen.
      _dom.o.remove();

    }

    // basic structure for a terrain item
    exports = {
      data,
      dom: _dom,
    };

    // these will be tracked only for on-screen / off-screen purposes.
    game.objects[TYPES.terrainItem].push(exports);

    return exports;

  }

  function addObject(type, options = {}) {

    // given type of TYPES.van, create object and append to respective array.

    let object, objectArray;

    const upper = /[A-Z]/g;

    if (upper.test(type)) {
      console.warn(`addObject(): legacy CamelCase type ${type} -> ${type.replace(upper, "-$&").toLowerCase()}`);
      // RIP this syntax. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
      type = type.replace(upper, "-$&").toLowerCase();
    }
    
    // TYPES.van -> game.objects['van'], etc.
    objectArray = objects[type];

    // create and push an instance object onto its relevant array by type (e.g., TYPES.van -> game.objects['vans'])
    if (objectConstructors[type]) {
      object = objectConstructors[type](options);
    } else {
      console.warn(`No constructor of type ${type}`);
    }

    // add the object to game arrays, before firing init method (DOM I/O etc.)
    // hackish: `noInit` applies for inventory ordering purposes, should be refactored.

    if (!options.noInit) {

      objectArray.push(object);
  
      if (!objectsById[object.data.id]) {
        objectsById[object.data.id] = object;
      } else {
        // this shouldn't happen.
        console.warn('objectsById: already assigned?', object.data.id);
      }

      object?.init?.();

      // and caculate the zone, which will further map things.
      zones.refreshZone(object);

    }

    return object;

  }

  function createObjects() {

    objects.stats = Stats();

    objects.gameLoop = GameLoop();

    objects.notifications = Notifications();

    objects.funds = Funds();

    objects.queue = Queue();

    objects.view = View();

    // hackish: now, assign the thing being exported from this module to everywhere else via `aa.js`
    screenScale = objects.view.data.screenScale;

    objects.radar = Radar();

    objects.inventory = Inventory();

  }

  function populateTerrain() {

    // tutorial?

    if (tutorialMode) {

      objects.tutorial = Tutorial();

      utils.css.add(document.getElementById('help'), 'active');

    } else {

      utils.css.add(document.getElementById('help'), 'inactive');

      document.getElementById('tutorial').remove();

    }

    zones.initDebug();

    addWorldObjects();

  }

  function togglePause() {

    if (data.paused) {
      resume();
    } else {
      pause();
    }

  }

  function pause(options) {

    const silent = options?.noMute !== true;
    const keepColor = options?.keepColor || false;

    if (data.paused) return;

    // good time to process the queue - prune the DOM, etc.
    if (objects.queue) {
      objects.queue.process();
    }

    objects.gameLoop.stop();

    objects.joystick?.end();

    if (silent && gamePrefs.sound && window.soundManager) {
      window.soundManager.mute();
    }

    // shuffle "resume prompts" messages by hiding all except one; hopefully, they're considered humorous. ;)
    let prompts = document.querySelectorAll('#game-paused .resume-prompt');
    let rnd = rndInt(prompts.length);

    for (let i = 0; i < prompts.length; i++) {
      prompts[i].style.display = (i === rnd ? 'inline-block' : 'none');
    }

    // "keep color" applies when the game starts and the menu is showing.
    let css = keepColor ? [] : ['game-paused'];
    
    // don't show paused status / tips in certain cases

    if (prefsManager.isActive()) {
      css.push('prefs-modal-open');
    }

    if (!data.started) {
      css.push('game-menu-open');
    }

    utils.css.add(document.body, ...css);

    data.paused = true;

  }

  function resume() {

    // exit if preferences menu is open; it will handle resume on close.
    if (prefsManager.isActive()) return;

    if (!data.paused) return;

    objects.gameLoop.start();

    if (gamePrefs.sound && window.soundManager) {
      window.soundManager.unmute();
    }

    utils.css.remove(document.body, 'game-paused', 'prefs-modal-open', 'game-menu-open');

    data.paused = false;

  }

  // when the player has chosen a game type from the menu - tutorial, or easy/hard/extreme.
  function init() {

    document.getElementById('help').style.display = 'block';

    data.started = true;

    keyboardMonitor.init();

    // allow joystick if in debug mode (i.e., testing on desktop)
    if (isMobile || debug) {

      objects.joystick = Joystick();

      objects.joystick.onSetDirection = (directionX, directionY) => {
        // percentage to pixels (circle coordinates)
        objects.view.data.mouse.x = ((directionX / 100) * objects.view.data.browser.width);
        objects.view.data.mouse.y = ((directionY / 100) * objects.view.data.browser.height);
      };

    } else {

      document.getElementById('pointer').remove();

    }

    data.convoyDelay = gameType === 'extreme' ? 20 : (gameType === 'hard' ? 30 : 60);

    zones.init();

    populateTerrain();

    function startEngine() {

      // wait until available
      if (!sounds.helicopter.engine) return;

      playSound(sounds.helicopter.engine);

      if (gamePrefs.bnb) {
        playSound(oneOf([sounds.bnb.letsKickALittleAss, sounds.bnb.heresACoolGame]));
      }

      utils.events.remove(document, 'click', startEngine);

    }

    if (gamePrefs.sound) {
      // wait for click or keypress, "user interaction"
      utils.events.add(document, 'click', startEngine);
    }

    (() => {

      // basic enemy ordering pattern
      const enemyOrders = parseTypes('missileLauncher, tank, van, infantry, infantry, infantry, infantry, infantry, engineer, engineer');
      const enemyDelays = [4, 4, 3, 0.4, 0.4, 0.4, 0.4, 1, 0.45];
      let i = 0;

      if (gameType === 'extreme') {

        // one more tank to round out the bunch, and (possibly) further complicate things :D
        enemyOrders.push(TYPES.tank);

        // matching delay, too
        enemyDelays.push(4);

      }

      // after ordering, wait a certain amount before the next convoy
      enemyDelays.push(data.convoyDelay);

      function orderNextItem() {

        let options;

        if (!data.battleOver && !data.paused) {

          options = {
            isEnemy: true,
            x: worldWidth + 64
          };

          if (!data.productionHalted) {
            addObject(enemyOrders[i], options);
          }

          common.setFrameTimeout(orderNextItem, enemyDelays[i] * 1000);

          i++;

          if (i >= enemyOrders.length) {
            i = 0;
          }

        }

      }

      // and begin
      if (!tutorialMode) {
        common.setFrameTimeout(orderNextItem, 5000);
      }

    })();

  }

  // the home screen: choose a game type.

  function initArmorAlley() {

    // A few specific CSS tweaks - regrettably - are required.
    if (isFirefox) utils.css.add(document.body, 'is_firefox');
    if (isSafari) { 
      utils.css.add(document.body, 'is_safari');
      // progressive web-type app, "installed on home screen" (iOS Safari)
      if (navigator.standalone) utils.css.add(document.body, 'is_standalone');
    }
  
    if (isMobile) {
  
      utils.css.add(document.body, 'is-mobile');
  
      // prevent context menu on links.
      // this is dirty, but it works (supposedly) for Android.
      window.oncontextmenu = e => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
  
      // if iPads etc. get The Notch, this will need updating. as of 01/2018, this is fine.
      if (isiPhone) {
        /**
         * iPhone X notch detection shenanigans. AA should avoid the notch,
         * but doesn't need to pad the right end of the screen - thus, we detect
         * this case and apply CSS for orientation so we know which side the notch is on.
         *
         * Tips o' the hat:
         * PPK - hasNotch() detection. Doesn't seem to work on iOS 11.0.2 as of 01/2018.
         * https://www.quirksmode.org/blog/archives/2017/10/safeareainset_v.html
         * Mark Nolton on SO - orientation change.
         * https://stackoverflow.com/a/47226825
         */
        window.addEventListener('orientationchange', orientationChange);
        // and get the current layout.
        orientationChange();
      }
  
    }

    // TODO: DOM init method or similar, ideally
    
    dom.world = document.getElementById('world');
    dom.battlefield = document.getElementById('battlefield');

    // NOTE: default game type is set here
    gameType = utils.storage.get(prefs.gameType) || winloc.match(/easy|hard|extreme|tutorial/i) || DEFAULT_GAME_TYPE;
  
    if (gameType instanceof Array) {
      gameType = gameType[0];
    }
  
    // safety check
    if (gameType && !gameType.match(/easy|hard|extreme|tutorial/i)) {
      gameType = null;
    }

    createObjects();

    // game loop can be kicked off right away, for sound playback purposes.
    objects.gameLoop.init();

    // start menu?
    gameMenu.init();

  }

  function setGameType(type = null) {
    gameType = type;
  }

  data = {
    battleOver: false,
    convoyDelay: 60,
    paused: false,
    productionHalted: false,
    dieCount: 0,
    // uh-huh huh huh huh huh. uh-huh huh. heh heh. m-heh.
    isBeavis: false,
    isButthead: false,
    engineerSwitch: false
  };

  dom = {
    battlefield: null,
    world: null
  };

  objects = {
    gameLoop: null,
    view: null,
    chain: [],
    balloon: [],
    bomb: [],
    bunker: [],
    cornholio: [],
    domFetti: [],
    ephemeralExplosion: [],
    'end-bunker': [],
    endBunker: [],
    engineer: [],
    flyingAce: [],
    gunfire: [],
    infantry: [],
    'parachute-infantry': [],
    'missile-launcher': [],
    'super-bunker': [],
    tank: [],
    van: [],
    helicopter: [],
    'smart-missile': [],
    base: [],
    cloud: [],
    'landing-pad': [],
    turret: [],
    shrapnel: [],
    smoke: [],
    'terrain-item': [],
    radar: null,
    inventory: null,
    tutorial: null,
    queue: null,
    funds: null,
    notifications: null,
    stats: null
  };

  objectsById = {};

  objectConstructors = {
    balloon: Balloon,
    base: Base,
    bomb: Bomb,
    bunker: Bunker,
    chain: Chain,
    cloud: Cloud,
    cornholio: Cornholio,
    'end-bunker': EndBunker,
    engineer: Engineer,
    // flyingAce: FlyingAce,
    gunfire: GunFire,
    helicopter: Helicopter,
    infantry: Infantry,
    'landing-pad': LandingPad,
    'missile-launcher': MissileLauncher,
    'parachute-infantry': ParachuteInfantry,
    shrapnel: Shrapnel,
    'smart-missile': SmartMissile,
    'super-bunker': SuperBunker,
    turret: Turret,
    tank: Tank,
    van: Van
  };

  exports = {
    addItem,
    addObject,
    data,
    dom,
    init,
    initArmorAlley,
    objects,
    objectsById,
    pause,
    resume,
    setGameType,
    started,
    togglePause
  };

  return exports;

})();

export { game, gameType, screenScale };