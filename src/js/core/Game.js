import { keyboardMonitor, prefsManager } from '../aa.js';
import {
  debug,
  isFirefox,
  isSafari,
  isMobile,
  isiPhone,
  oneOf,
  rndInt,
  setTutorialMode,
  soundManager,
  tutorialMode,
  TYPES,
  winloc,
  clientFeatures,
  updateClientFeatures,
  isMac,
  isChrome
} from './global.js';
import { utils } from './utils.js';
import { zones } from './zones.js';
import { gamePrefs } from '../UI/preferences.js';
import { handleOrientationChange } from '../UI/mobile.js';
import { playSound, preloadCommonSounds, sounds } from './sound.js';
import { Stats } from '../UI/Stats.js';
import { Joystick } from '../UI/Joystick.js';
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
import { Flame } from '../munitions/Flame.js';
import { GunFire } from '../munitions/GunFire.js';
import { ParachuteInfantry } from '../units/ParachuteInfantry.js';
import { SmartMissile } from '../munitions/SmartMissile.js';
import { Shrapnel } from '../elements/Shrapnel.js';
import { addWorldObjects, levelFlags, levelName } from '../levels/default.js';
import { gameMenu } from '../UI/game-menu.js';
import { net } from './network.js';
import { Editor } from '../UI/Editor.js';
import { common } from './common.js';
import { StarController } from '../elements/StarController.js';
import { Envelope } from '../UI/Envelope.js';
import { RadarScroller } from '../UI/RadarScroller.js';
import { aaLoader } from '../core/aa-loader.js';
import { addItem as addTerrainItem } from '../elements/Terrain.js';
import { Smoke } from '../elements/Smoke.js';
import { AimedMissile } from '../munitions/AimedMissile.js';
import { MissileNapalm } from '../munitions/MissileNapalm.js';
import { getScore, scoreCreate } from './scores.js';
import { gamepad } from '../UI/gamepad.js';
const DEFAULT_GAME_TYPE = 'tutorial';

// very commonly-accessed attributes to be exported
let gameType;
let screenScale = 1;
let started;
let didInit;

// as per the original
let lRandSeed, lRandOffset, randSeedUI;

function incrementRandSeed(incrementAmount = 1) {
  lRandSeed += incrementAmount;
  randSeedUI = (lRandSeed << 16) >> 16;
}

function setOriginalSeeds() {
  lRandSeed = lRandOffset = randSeedUI = 0x11224433;

  // original used an unsigned short (16-bit) int, here.
  randSeedUI = (lRandSeed << 16) >> 16;
}

setOriginalSeeds();

const game = (() => {
  let data,
    dom,
    boneyard,
    objects,
    objectsById,
    objectConstructors,
    players,
    exports;

  function addItem(className, x, options = {}) {
    return addTerrainItem(className, x, options);
  }

  function addObject(type, options = {}) {
    // given type of TYPES.van, create object and append to respective array.

    let object;

    // create and push an instance object onto its relevant array by type (e.g., TYPES.van -> game.objects['vans'])
    if (objectConstructors[type]) {
      object = objectConstructors[type](options);
    } else {
      console.warn(`No constructor of type ${type}`);
    }

    // post-init, do the speed thingy.
    common.applyGameSpeed(object);

    // add the object to game arrays, before firing init method (DOM I/O etc.)
    // hackish: `noInit` applies for inventory ordering purposes, should be refactored.

    if (!options.noInit) {
      if (!objectsById[object.data.id]) {
        objectsById[object.data.id] = object;
      } else {
        // this shouldn't happen.
        console.warn(
          'objectsById: already assigned. Ignoring duplicate, returning original.',
          object.data.id
        );
        return objectsById[object.data.id];
      }

      // special case: override, e.g., smoke object that wants to be in objects.backgroundSmoke vs. objects.smoke
      if (object.data.gameObjectGroup && objects[object.data.gameObjectGroup]) {
        objects[object.data.gameObjectGroup].push(object);
      } else {
        // TYPES.van -> game.objects['van'], etc.
        objects[type].push(object);
      }

      /**
       * Narrow cases for exclusion: paratrooper -> infantry is "free" in terms of points,
       * paratrooper silently dies and an infantry object is created which should not impact score.
       */
      if (!options.excludeFromScoreCreate) {
        scoreCreate(object);
      }

      // hackish: for editor mode, set vX and vY to 0 so things don't move across the battlefield.
      if (game.objects.editor) {
        if (object.data.vX !== undefined) {
          object.data.vX = 0;
        }
        if (object.data.vY !== undefined) {
          object.data.vY = 0;
        }
      }

      if (!options.skipInit) {
        object?.init?.();
      }

      // and caculate the zone, which will further map things.
      zones.refreshZone(object);
    }

    return object;
  }

  function findObjectById(id, ...consoleInfoArgs) {
    /**
     * Helper method for remote object network calls.
     * If an ID is not found in `objectsById`, it may be in the "boneyard."
     * This can happen when an object dies locally, then a network request comes in for it.
     */

    if (!id) return;

    const obj = objectsById[id];

    if (obj) return obj;

    let by = game.boneyard[id];

    if (net.debugNetwork && by) {
      const byDetails = ` found in boneyard ☠️ (died ${parseInt(
        performance.now() - by.ts,
        10
      )} msec ago${by.attacker ? ', attacker: ' + by.attacker : ''})`;
      console.info(`${consoleInfoArgs?.[0]} | ${id}${byDetails}`);
    }

    /**
     * If prefixed, try swapping guest / host prefixes.
     * This was initially done to avoid collisions, but clients' object
     * IDs should match 1:1 and this can probably be refactored out.
     */
    if (id.startsWith('guest_')) {
      id = id.replace(/guest_/i, 'host_');
    } else if (id.startsWith('host_')) {
      id = id.replace(/host_/i, 'guest_');
    }

    if (objectsById[id]) return objectsById[id];

    by = game.boneyard[id];

    if (net.debugNetwork) {
      if (by) {
        const byDetails = ` found in boneyard ☠️ (died ${parseInt(
          performance.now() - by.ts,
          10
        )} msec ago${by.attacker ? ', attacker: ' + by.attacker : ''})`;
        console.info(`${consoleInfoArgs?.[0]} | ${id}${byDetails}`);
      } else {
        console.warn(
          `${consoleInfoArgs?.[0]} | ${id}: Could not find regular or guest/host obj`,
          id
        );
      }
    }
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

    objects.starController = StarController();

    objects.envelope = Envelope();
  }

  function getObjects() {
    // build up a "save state"
    const qualifiers = {
      // only include detached / free-floating + hostile
      balloon: (o) => !!o?.data?.hostile,
      bunker: (o) => !o.data.dead && !o.data.burninating
    };

    const items = {};

    function addGameItem(type, item) {
      if (!items[type]) {
        items[type] = [];
      }
      items[type].push(item);
    }

    // string -> array
    const saveItems =
      'balloon base bunker cloud end-bunker engineer infantry landing-pad missile-launcher smart-missile super-bunker tank terrain-item turret van'.split(
        ' '
      );

    const objects = common.pick(game.objects, ...saveItems);

    for (const item in objects) {
      game.objects[item]?.forEach((obj) => {
        if (!obj.data) return;
        let { type } = obj.data;
        // I forgot about this special case.
        if (type === TYPES.infantry && obj.data.role) {
          type = TYPES.engineer;
        }
        if (qualifiers[type]) {
          if (qualifiers[type](obj)) {
            addGameItem(type, obj);
          }
        } else {
          addGameItem(type, obj);
        }
      });
    }

    // finally, distill to addObject() / addItem() calls.
    // [ 'type', 'l|r|n', int ]

    const gameData = [];

    for (const type in items) {
      items[type].forEach((item) => {
        // engineers, again - special case
        const iData = item.data;
        let { type } = iData;
        if (type === TYPES.infantry && iData.role) type = TYPES.engineer;

        // 2 or 3 args, depending
        const args = [
          type,
          iData.isHostile || (type === TYPES.turret && iData.dead)
            ? 'n'
            : iData.isEnemy
              ? 'r'
              : iData.isNeutral
                ? 'n'
                : 'l',
          Math.floor(iData.x)
        ];

        // drop l/r on terrain items, and clouds
        if (iData.isTerrainItem || type === TYPES.cloud) args.splice(1, 1);

        gameData.push(args);
      });
    }

    // sort the array based on the x value.
    gameData.sort(utils.array.compareByLastItem());

    return gameData;
  }

  function populateTerrain() {
    // tutorial?

    if (tutorialMode) {
      if (!game.objects.editor) {
        objects.tutorial = Tutorial();
      }
      utils.css.add(document.getElementById('help'), 'active');
    } else {
      utils.css.add(document.getElementById('help'), 'inactive');
      document.getElementById('tutorial-placeholder')?.remove();
    }

    zones.initDebug();

    // player + enemy helicopters

    let playAsEnemy = !!window.location.href.match(/playAsEnemy/i);

    let enemyCPU = !!window.location.href.match(/enemyCPU|remoteCPU/i);

    if (!tutorialMode && playAsEnemy) {
      addObject(TYPES.helicopter, {
        skipInit: true,
        isEnemy: true,
        attachEvents: true,
        isLocal: true
      });

      addObject(TYPES.helicopter, {
        skipInit: true,
        isEnemy: false,
        isCPU: true
      });
    } else {
      if (net.active) {
        console.log('NETWORK GAME');

        // which one you are, depends on who's hosting.

        // pvp|pvp_cpu|coop_2v1|coop_2v2
        if (gamePrefs.net_game_style.match(/coop/i)) {
          if (net.isHost) {
            console.log(
              'you are hosting: you are helicopters[0], you and your friend are playing cooperatively against an enemy or two.'
            );

            // human player 1 (local)
            addObject(TYPES.helicopter, {
              skipInit: true,
              attachEvents: true,
              isLocal: true
            });

            // human player 2 (remote)
            addObject(TYPES.helicopter, {
              skipInit: true,
              isRemote: true
            });

            // CPU player 1 (AI running locally)
            addObject(TYPES.helicopter, {
              skipInit: true,
              isEnemy: true,
              isCPU: true
            });

            if (gamePrefs.net_game_style === 'coop_2v2') {
              console.log('2v2: adding second enemy');

              // CPU player 2 (AI running remotely)
              addObject(TYPES.helicopter, {
                skipInit: true,
                isEnemy: true,
                isCPU: true,
                isRemote: true
              });
            }
          } else {
            console.log(
              'you are a guest: you are helicopters[1], you and your friend are playing cooperatively against an enemy or two.'
            );

            // human player 1 (remote)
            addObject(TYPES.helicopter, {
              skipInit: true,
              isRemote: true
            });

            // human player 2 (local)
            addObject(TYPES.helicopter, {
              skipInit: true,
              attachEvents: true,
              isLocal: true
            });

            // CPU player 1 (AI running remotely)
            addObject(TYPES.helicopter, {
              skipInit: true,
              isEnemy: true,
              isCPU: true,
              isRemote: true
            });

            if (gamePrefs.net_game_style === 'coop_2v2') {
              console.log('2v2: adding second enemy');

              // CPU player 2 (AI running locally)
              addObject(TYPES.helicopter, {
                skipInit: true,
                isEnemy: true,
                isCPU: true
                // isRemote: true
              });
            }
          }
        } else {
          // Player vs. player
          // pvp|pvp_cpu|coop_2v1|coop_2v2

          console.log('player vs player');

          // pvp|pvp_cpu|coop_2v1|coop_2v2

          if (net.isHost) {
            console.log(
              'you are hosting: you are helicopters[0], and take the friendly base'
            );

            addObject(TYPES.helicopter, {
              skipInit: true,
              attachEvents: true,
              isLocal: true
            });

            addObject(TYPES.helicopter, {
              skipInit: true,
              isEnemy: true,
              isRemote: true,
              isCPU: enemyCPU
            });

            if (gamePrefs.net_game_style === 'pvp_cpu') {
              // helper CPUs, one for each player

              console.log('pvp_cpu: adding helper helicopters');

              addObject(TYPES.helicopter, {
                skipInit: true,
                isRemote: false,
                isCPU: true
              });

              addObject(TYPES.helicopter, {
                skipInit: true,
                isEnemy: true,
                isRemote: true,
                isCPU: true
              });
            }
          } else {
            console.log(
              'you are a guest: you are helicopters[1], and take the enemy base'
            );

            addObject(TYPES.helicopter, {
              skipInit: true,
              isRemote: true
            });

            // hackish: allow CPU override for testing
            addObject(TYPES.helicopter, {
              skipInit: true,
              isLocal: true,
              isEnemy: true,
              attachEvents: !enemyCPU,
              isCPU: enemyCPU
            });

            if (gamePrefs.net_game_style === 'pvp_cpu') {
              // helper CPUs, one for each player

              console.log('pvp_cpu: adding helper helicopters');

              addObject(TYPES.helicopter, {
                skipInit: true,
                isRemote: true,
                isCPU: true
              });

              addObject(TYPES.helicopter, {
                skipInit: true,
                isEnemy: true,
                isRemote: false,
                isCPU: true
              });
            }
          }
        }
      } else {
        // regular game

        addObject(TYPES.helicopter, {
          skipInit: true,
          attachEvents: true,
          isLocal: true
        });

        if (!tutorialMode) {
          addObject(TYPES.helicopter, {
            skipInit: true,
            isEnemy: true,
            isCPU: true
          });
        }
      }
    }

    addWorldObjects();

    objects.radarScroller = RadarScroller();

    // finally, start the helicopter engines. ;)
    game.objects.helicopter.forEach((helicopter) => helicopter.init());
  }

  function togglePause() {
    if (!data.started) return;

    if (data.paused) {
      resume();
    } else {
      pause();
    }
  }

  function pause(options) {
    // ignore if we're in a network game.
    if (net.active) return;

    // ignore if the game hasn't started yet., e.g. main menu or network screen up.
    if (!data.started) return;

    const silent = options?.noMute !== true;
    const keepColor = options?.keepColor || false;

    if (data.paused) return;

    // good time to process the queue - prune the DOM, etc.
    if (objects.queue) {
      objects.queue.process();
    }

    objects.gameLoop.stop();

    objects.joystick?.end();

    if (silent && gamePrefs.sound && soundManager) {
      soundManager.mute();
    }

    // shuffle "resume prompts" messages by hiding all except one; hopefully, they're considered humorous. ;)
    let prompts = document.querySelectorAll('#game-paused .resume-prompt');
    let rnd = rndInt(prompts.length);

    for (let i = 0; i < prompts.length; i++) {
      prompts[i].style.display = i === rnd ? 'inline-block' : 'none';
    }

    // "keep color" applies when the game starts and the menu is showing.
    let css = keepColor ? [] : ['game-paused'];

    // don't show paused status / tips in certain cases

    if (!data.started) {
      css.push('game-menu-open');
    }

    utils.css.add(document.body, ...css);

    data.paused = true;

    // gamepad normally updates via loop.
    maybePollGamepad();
  }

  function resume() {
    // exit if preferences menu is open; it will handle resume on close.
    if (prefsManager.isActive()) return;

    if (!data.paused) return;

    objects.gameLoop.start();

    if (gamePrefs.sound && soundManager) {
      soundManager.unmute();
    }

    utils.css.remove(
      document.body,
      'game-paused',
      'prefs-modal-open',
      'game-menu-open'
    );

    if (isMobile) {
      // hackish: screen coordinates, etc., should have settled by this point following an orientation change.
      game.objects.starController?.reset();
    }

    data.paused = false;
  }

  function maybePollGamepad() {
    /**
     * If a single-player game is underway, the game loop will stop while
     * the prefs modal is up. In this case, update the gamepad manually
     * and keep doing so while the modal is active, since the gamepad can
     * be used for navigation.
     *
     * This should be the only case where gamepad polling is required.
     */
    if (!gamePrefs.gamepad) return;
    if (game.data.started && game.data.paused && prefsManager.isActive()) {
      gamepad.animate();
      window.requestAnimationFrame(maybePollGamepad);
    }
  }

  function logEvent(type) {
    if (!type) return;
    if (!logEvents[type]) {
      console.warn('logEvent(): No type found?', type);
      return;
    }
    logEvents[type]();
  }

  function startEditor() {
    // stop scrolling
    utils.css.remove(document.getElementById('game-tips'), 'active');

    game.objects.editor = Editor();

    // get some stuff on the battlefield

    zones.init();

    populateTerrain();

    game.objects.editor.init();

    utils.log({
      info: {
        event: '_EDITOR_START_',
        level_name: levelName
      }
    });
  }

  // when the player has chosen a game type from the menu - tutorial, or easy/hard/extreme.
  function init() {
    document.getElementById('help').style.display = 'block';

    data.started = true;

    // game editor?
    if (window.location.href.match(/editor/i)) {
      return startEditor();
    }

    game.logEvent('GAME_START');

    objects.envelope.setLevel(levelName);

    // unlimited vs. limited-lives mode - N/A for tutorial and network.
    utils.css.addOrRemove(
      document.body,
      !tutorialMode && !net.active && !gamePrefs.unlimited_lives,
      'limited-lives-mode'
    );

    utils.css.add(document.body, 'game-started');

    keyboardMonitor.init();

    gamepad.onGameStart();

    // "joystick" applies for gamepad, mobile, or debug mode (i.e., testing on desktop)
    if (gamePrefs.gamepad || isMobile || debug) {
      if (!objects.joystick) {
        objects.joystick = Joystick();
      }

      objects.joystick.onSetDirection = (directionX, directionY) => {
        // TODO: have this call game.objects.view.mousemove(); ?
        // OR, just call network methods directly.
        // percentage to pixels (circle coordinates)
        const vData = objects.view.data;
        const x = (directionX / 100) * vData.browser.width;
        const y = (directionY / 100) * vData.browser.height;
        if (net.active) {
          vData.mouse.delayedInputX = x;
          vData.mouse.delayedInputY = y;
          if (game.players.local) {
            game.players.local.data.mouse.delayedInputX = x;
            game.players.local.data.mouse.delayedInputY = y;
          }
        } else {
          vData.mouse.x = x;
          vData.mouse.y = y;
        }
      };
    } else {
      document.getElementById('pointer')?.remove();
    }

    zones.init();

    // scale radar animation, after a slight delay.
    common.setFixedFrameTimeout(game.objects.radar.maybeApplyScaling, 3000);

    // hackish: ensure radar interference CSS is applied, as needed.
    if (levelFlags.jamming) {
      prefsManager.onUpdatePrefs([
        {
          name: 'radar_interference_blank',
          value: gamePrefs.radar_interference_blank
        }
      ]);
    }

    populateTerrain();

    // if a network game, let the host handle enemy ordering; objects will be replicated remotely.
    if (
      game.players.cpu.length &&
      !tutorialMode &&
      (!net.active || (net.active && net.isHost))
    ) {
      game.objects.inventory.startEnemyOrdering();
    }

    let engineStarted;

    function startEngine() {
      // wait until available
      if (!sounds.helicopter.engine) return;
      if (!engineStarted) {
        const exports = null;
        playSound(sounds.helicopter.engine, exports, {
          onplay: () => (engineStarted = true)
        });

        if (gamePrefs.bnb) {
          playSound(
            oneOf([sounds.bnb.letsKickALittleAss, sounds.bnb.heresACoolGame])
          );
        }
      }
    }

    startEngine();

    // hackish: force-resize, since we just got CSS loaded
    game.objects.funds.updateScale();

    game.objects.starController?.init();

    preloadCommonSounds();
  }

  function iQuickRandom() {
    return (lRandSeed =
      ((lRandSeed << 16) | (lRandSeed >> 16)) +
      0x14125423 +
      (lRandOffset += 0x4235531 + (data?.frameCount || 0)));
  }

  // the home screen: choose a game type.

  function initArmorAlley() {
    if (didInit) {
      console.warn('initArmorAlley(): WTF, already did init?');
      return;
    }

    const bodyCSS = [];

    didInit = true;

    // A few specific CSS tweaks - regrettably - are required.
    if (isFirefox) bodyCSS.push('is_firefox');

    if (isSafari) {
      bodyCSS.push('is_safari');
      // progressive web-type app, "installed on home screen" (iOS Safari)
      if (navigator.standalone) bodyCSS.push('is_standalone');
    }

    // Very limited CSS stuff, here, to hide keyboard controls.
    if (isiPhone) bodyCSS.push('is_iphone');

    if (isMac) bodyCSS.push('is_mac');

    if (isChrome) bodyCSS.push('is_chrome');

    if (isMobile) {
      bodyCSS.push('is-mobile');

      // prevent context menu on links.
      // this is dirty, but it works (supposedly) for Android.
      window.oncontextmenu = (e) => {
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
        // get the current layout.
        handleOrientationChange();
      }
    }

    function markClientTouch(e) {
      if (e?.changedTouches && !clientFeatures.touch) {
        /**
         * "Detecting" touch support appears to be fraught with danger; here be dragons, etc.
         * Thusly, infer from a real event: this is likely a touch event, and not from a mouse.
         */
        updateClientFeatures({ touch: true });
        utils.css.add(document.body, 'has_touch');
      }
      utils.events.remove(document, 'touchstart', markClientTouch);
    }

    // touch event support may inform certain game features, UX / UI
    utils.events.add(document, 'touchstart', markClientTouch);

    bodyCSS.push('loaded');

    // update the body, finally, once.
    utils.css.add(document.body, ...bodyCSS);

    // TODO: DOM init method or similar, ideally

    dom.world = document.getElementById('world');
    dom.battlefield = document.getElementById('battlefield');

    createObjects();

    common.domCanvas.init();

    // game loop can be kicked off right away, for sound playback purposes.
    objects.gameLoop.init();

    // start menu?
    gameMenu.init();
  }

  function setGameType(type = null) {
    gameType = type || DEFAULT_GAME_TYPE;
    gamePrefs.game_type = gameType;
    gamePrefs.net_game_type = gameType !== 'tutorial' ? gameType : 'easy';
    prefsManager.writePrefsToStorage();
    setTutorialMode(gameType === 'tutorial');
  }

  function start() {
    // NOTE: default game type is set here

    if (net.active && net.connected) {
      // do nothing, already set.
    } else {
      gameType =
        utils.storage.get(prefs.gameType) ||
        winloc.match(/easy|hard|extreme|armorgeddon|tutorial/i) ||
        DEFAULT_GAME_TYPE;

      if (gameType instanceof Array) {
        gameType = gameType[0];
      }

      // safety check
      if (
        gameType &&
        !gameType.match(/easy|hard|extreme|armorgeddon|tutorial/i)
      ) {
        gameType = null;
      }
    }
  }

  data = {
    battleOver: false,
    youWon: false,
    theyWon: false,
    didEnemyWin: null,
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

  players = {
    local: null,
    remote: [],
    remoteHuman: null,
    cpu: []
  };

  objects = {
    'editor': null,
    'envelope': null,
    'gameLoop': null,
    'gamepad': null,
    'view': null,
    'starController': null,
    'backgroundSmoke': [],
    'base': [],
    'chain': [],
    'balloon': [],
    'bunker': [],
    'super-bunker': [],
    'cornholio': [],
    'end-bunker': [],
    'missile-launcher': [],
    'tank': [],
    'van': [],
    'turret': [],
    'bomb': [],
    'terrain-item': [],
    'gunfire': [],
    'aimed-missile': [],
    'helicopter': [],
    'engineer': [],
    'infantry': [],
    'parachute-infantry': [],
    'flame': [],
    'smoke': [],
    'smart-missile': [],
    'landing-pad': [],
    'shrapnel': [],
    'domFetti': [],
    'missile-napalm': [],
    'cloud': [],
    'radar': null,
    'radarScroller': null,
    'inventory': null,
    'tutorial': null,
    'queue': null,
    'funds': null,
    'notifications': null,
    'stats': null
  };

  objectsById = {};

  // a place for all the deceased. 😇☠️😂
  boneyard = {};

  objectConstructors = {
    'aimed-missile': AimedMissile,
    'missile-napalm': MissileNapalm,
    'balloon': Balloon,
    'base': Base,
    'bomb': Bomb,
    'bunker': Bunker,
    'chain': Chain,
    'cloud': Cloud,
    'cornholio': Cornholio,
    'end-bunker': EndBunker,
    'engineer': Engineer,
    // flyingAce: FlyingAce,
    'flame': Flame,
    'gunfire': GunFire,
    'helicopter': Helicopter,
    'infantry': Infantry,
    'landing-pad': LandingPad,
    'missile-launcher': MissileLauncher,
    'parachute-infantry': ParachuteInfantry,
    'shrapnel': Shrapnel,
    'smart-missile': SmartMissile,
    'smoke': Smoke,
    'super-bunker': SuperBunker,
    'turret': Turret,
    'tank': Tank,
    'van': Van
  };

  exports = {
    addItem,
    addObject,
    boneyard,
    data,
    dom,
    findObjectById,
    getObjects,
    incrementRandSeed,
    getRandSeedUI: () => randSeedUI,
    init: () => {
      const css = ['aa-game-ui.css', 'aa-mobile.css'];
      aaLoader.loadCSS(css, init);
    },
    initArmorAlley,
    iQuickRandom,
    logEvent,
    objectConstructors,
    objects,
    objectsById,
    players,
    pause,
    resume,
    setGameType,
    start,
    started,
    startEditor,
    togglePause
  };

  return exports;
})();

const logEvents = {
  GAME_OVER: () => {
    let wl = game.data.youWon ? '_BATTLE_WON_' : '_BATTLE_LOST_';

    let endBunker =
      game.objects[TYPES.endBunker][game.players.local.data.isEnemy ? 1 : 0]
        .data;

    utils.log({
      info: {
        // _NET_BATTLE_WON_ / _NET_BATTLE_LOST_
        event: net.active ? `_NET${wl}` : wl,
        game_duration:
          game.objects.gameLoop.data.frameCount -
          game.objects.gameLoop.data.gameStartFrameCount,
        score_with_bonus: getScore(game.players.local),
        game_type: net.active ? gamePrefs.net_game_type : gamePrefs.game_type,
        level_name: levelName,
        net_game_style: net.active && gamePrefs.net_game_style,
        net_host: net.active && net.isHost,
        net_guest: net.active && !net.isHost,
        is_tutorial: tutorialMode,
        is_mobile: isMobile,
        using_gamepad: gamepad.data.active,
        is_bnb: gamePrefs.bnb,
        game_fps: gamePrefs.game_fps,
        game_fps_auto:
          gamePrefs.game_fps_auto !== gamePrefs.game_fps
            ? gamePrefs.game_fps_auto
            : 0,
        latency: net.active && net.halfTrip,
        funds_earned: endBunker.fundsEarned,
        funds_captured: endBunker.fundsCaptured,
        funds_spent: endBunker.fundsSpent,
        funds_lost: endBunker.fundsLost,
        choppers_lost: game.players.local.data.livesLost,
        choppers_purchased: game.players.local.data.livesPurchased,
        /**
         * NOTE: game is over when lives goes to -1, so last chopper is 0.
         * But zero and false-y values are filtered out, so we add 1.
         */
        choppers_left:
          !common.unlimitedLivesMode() && game.players.local.data.lives + 1
      }
    });
  },

  GAME_START: () => {
    // GAME_START
    utils.log({
      info: {
        event: net.active ? '_NET_GAME_START_' : '_GAME_START_',
        game_type: net.active ? gamePrefs.net_game_type : gamePrefs.game_type,
        level_name: levelName,
        net_game_style: net.active && gamePrefs.net_game_style,
        net_host: net.active && net.isHost,
        net_guest: net.active && !net.isHost,
        is_tutorial: tutorialMode,
        is_mobile: isMobile,
        using_gamepad: gamepad.data.active,
        is_bnb: gamePrefs.bnb,
        game_fps: gamePrefs.game_fps,
        game_fps_auto:
          gamePrefs.game_fps_auto !== gamePrefs.game_fps
            ? gamePrefs.game_fps_auto
            : 0,
        latency: net.active && net.halfTrip
      }
    });

    // mark the game start, so duration is known
    game.objects.gameLoop.data.gameStartFrameCount = parseInt(
      game.objects.gameLoop.data.frameCount,
      10
    );
  }
};

export { game, gameType, screenScale };
