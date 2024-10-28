import { game } from '../core/Game.js';
import { gamePrefs } from '../UI/preferences.js';
import {
  debugCollision,
  FRAMERATE,
  TYPES,
  isMobile,
  isSafari,
  FPS,
  GAME_SPEED,
  updateGameSpeed,
  GAME_SPEED_RATIOED,
  soundManager,
  tutorialMode
} from '../core/global.js';
import { frameTimeoutManager } from '../core/GameLoop.js';
import { zones } from './zones.js';
import { sprites } from './sprites.js';
import { net } from './network.js';
import { utils } from './utils.js';
import { playSound, sounds } from './sound.js';
import { prefsManager } from '../aa.js';
import { DomCanvas } from '../UI/DomCanvas.js';
import { addGravestone } from '../elements/Graveyard.js';
import { aaLoader } from './aa-loader.js';

// unique IDs for quick object equality checks
let guid;

// per-type counters, more deterministic
let guidByType = {};

function resetGUID() {
  guid = 0;

  // TYPES include camelCase entries e.g., missileLauncher, those will be ignored here.
  for (let type in TYPES) {
    if (!type.match(/[A-Z]/)) {
      guidByType[type] = 0;
    }
  }
}

resetGUID();

// for network: certain items need to be not prefixed.
// basically, all "static" / shared terrain items generated at game start - and helicopters.
const staticIDTypes = {
  [TYPES.helicopter]: true,
  [TYPES.bunker]: true,
  [TYPES.cornholio]: true,
  [TYPES.chain]: true,
  [TYPES.balloon]: true,
  [TYPES.base]: true,
  [TYPES.endBunker]: true,
  [TYPES.superBunker]: true,
  [TYPES.turret]: true,
  [TYPES.terrainItem]: true
};

// noisy, and hopefully, deterministic events that can be ignored.
const excludeFromNetworkTypes = {
  [TYPES.gunfire]: true,
  [TYPES.shrapnel]: true,
  [TYPES.superBunker]: true
};

const PREFIX_HOST = 'host_';
const PREFIX_GUEST = 'guest_';

const defaultCSS = {
  animating: 'animating',
  dead: 'dead',
  enemy: 'enemy'
};

const defaultCSSKeys = Object.keys(defaultCSS);

const bnbVideoRoot = `${aaLoader.getVideoRoot()}/bnb`;

const debugRects = [];

const int = (number, base = 10) => parseInt(number, base);

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: int(result[1], 16),
    g: int(result[2], 16),
    b: int(result[3], 16)
  };
}

function makeDebugRect(obj, viaNetwork) {
  if (!obj?.data) return;

  const { data } = obj;
  const { x, y } = data;
  const color = data.isEnemy ? '#990000' : '#009900';

  function update() {
    common.domCanvas.drawDebugRect(x, y, data.width, data.height, color);
  }

  update();

  // Old DOM stuff
  /*
  // text inside element
  const span = document.createElement('span');
  const style = {};

  if (viaNetwork) {
    style.right = '1px';
    style.bottom = '1px';
  } else {
    style.left = '1px';
    style.top = '1px';
  }

  Object.assign(span.style, style);

  span.innerHTML =
    data.id +
    (data.parent ? data.parent?.data.id : '') +
    (viaNetwork ? ' 📡' : '');
  o.appendChild(span);

  game.dom.battlefield.appendChild(o);
  */

  debugRects.push(update);

  if (!viaNetwork) {
    // push the same remotely
    const basicData = {
      id: data.id,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      isEnemy: data.isEnemy
    };

    if (data.parent?.data.id) {
      basicData.parent = {
        data: {
          id: data.parent.data.id
        }
      };
    }

    const viaNetwork = true;
    net.sendMessage({
      type: 'MAKE_DEBUG_RECT',
      params: [basicData, viaNetwork]
    });
  }
}

function getRenameString(oldName, newName, fromNetworkEvent) {
  const strings = [
    '%1 is now %2.',
    '%1 has handed the reins over to %2.',
    '%1 has given control to %2.',
    'The artist formerly known as %1 is now known as %2.',
    'Forget everything you knew about %1, they are now %2.'
  ];

  let str = strings[parseInt(Math.random() * strings.length, 10)];

  // hackish: ignore default "guest" and "host" if game has started, use nicer context-appropriate wording.

  const isGuest = oldName === 'guest';
  const isHost = oldName === 'host';

  if (isGuest || isHost) {
    // naming depends on the player's friendliness.
    if (fromNetworkEvent && game.data.started) {
      oldName =
        game.players.remoteHuman.data.isEnemy ===
        game.players.local.data.isEnemy
          ? 'your friend'
          : 'your opponent';
    } else {
      if (isGuest) oldName = 'the guest';
      if (isHost) oldName = 'the host';
    }
  }

  str = str.replace('%1', oldName).replace('%2', newName);

  return str.charAt(0).toUpperCase() + str.slice(1);
}

const slashCommands = {
  '/name': (newName, fromNetworkEvent) => {
    // hackish: "from network event" means the remote changed names.
    const playerName = fromNetworkEvent
      ? gamePrefs.net_remote_player_name
      : gamePrefs.net_player_name;

    // name must change, and must be unique.
    if (
      newName === gamePrefs.net_remote_player_name ||
      newName === gamePrefs.net_player_name
    )
      return;

    const msg = getRenameString(playerName, newName, fromNetworkEvent);

    if (game.data.started) {
      game.objects.notifications.add(msg);
    }

    if (!fromNetworkEvent) {
      // update locally, "echo" and send

      // local echo version
      const echoMsg = common.getRenameString(
        gamePrefs.net_player_name,
        newName
      );

      // this can happen during a live game
      if (game.data.started) {
        game.objects.notifications.add(msg);
      } else {
        prefsManager.onChat(echoMsg);
      }

      gamePrefs.net_player_name = newName;
      net.sendMessage({ type: 'REMOTE_PLAYER_NAME', newName });
    }
  }
};

let loadedVideos = {};
let loadedAudio = {};
let wzTimer;
let videoActive;

const common = {
  domCanvas: DomCanvas(),
  hexToRgb,
  setGameSpeed: (gameSpeed) => {
    // note: this updates GAME_SPEED
    const newGameSpeed = updateGameSpeed(gameSpeed);

    // slightly redundant: update the live pref, to match the global
    gamePrefs.game_speed = newGameSpeed;

    common.applyGameSpeedToAll();

    if (game.data.started) {
      game.objects.notifications.add('Game speed: %s', {
        type: 'gameSpeed',
        onRender(input) {
          return input.replace('%s', `${Math.floor(newGameSpeed * 100)}%`);
        }
      });
    }

    if (game.data.started || prefsManager.isActive()) {
      playSound(sounds?.inventory?.begin);
    }
  },

  applyCSSGameSpeed: () => {
    const root = document.querySelector(':root');

    if (!root?.style) return;

    root.style.setProperty('--game-speed', GAME_SPEED);
  },

  applyGameSpeedToAll: () => {
    // TODO: use a static list, known items of interest?
    for (const item in game.objects) {
      game.objects[item]?.forEach?.((obj) => {
        if (obj?.data?.gameSpeedProps) {
          common.applyGameSpeed(obj);
        }
      });
    }

    // special case: helicopters have their own method for numerous actions.
    game.objects.helicopter?.forEach((chopper) => chopper.updateFiringRates());

    common.applyCSSGameSpeed();
  },

  applyGameSpeed: (obj) => {
    // update "game speed" on a particular object, or *all* eligible objects.

    if (!obj?.data) return;

    const { gameSpeedProps } = obj.data;

    if (!gameSpeedProps?.forEach) return;

    // recalculate the new value, based on the original "1X" one - e.g., data['fireModulus'] => ['fireModulus1X'] * ...
    gameSpeedProps.forEach((prop) => {
      obj.data[prop] = parseInt(
        (obj.data[`${prop}1X`] || 1) * (1 / GAME_SPEED_RATIOED),
        10
      );
    });
  },

  // given a list of keys, collect and return a new object of key/value pairs.
  pick: (o, ...props) =>
    Object.assign({}, ...props.map((prop) => ({ [prop]: o[prop] }))),

  getRenameString,

  parseSlashCommand: (msg, fromNetwork = true) => {
    /**
     * given a text message, parse and return a function that will execute it.
     * e.g., "/name scott"
     */

    if (!msg?.length) return;

    if (msg.charAt(0) !== '/') return;

    const bits = msg.trim().split(' ');
    const cmd = bits[0].toLowerCase();

    // TODO: complain if slash command unknown?
    if (!slashCommands[cmd]) return;

    // TODO: multiple param support?
    const param = bits
      .splice(1)
      .filter((item) => item.length)
      .join(' ');

    if (!param.length) return;

    // note: returning a function.
    return () => slashCommands[cmd](param, fromNetwork);
  },

  animateDebugRects: () => {
    if (!debugRects.length) return;
    for (let i = 0, j = debugRects.length; i < j; i++) {
      debugRects[i]();
    }
  },

  makeDebugRect,

  unlinkObject: (obj) => {
    // drop "links" from zones, and objects by ID.
    if (!obj?.data?.id) return;

    if (obj.data.frontZone !== null || obj.data.rearZone !== null) {
      zones.leaveAllZones(obj);
    }

    game.objectsById[obj.data.id] = null;
    delete game.objectsById[obj.data.id];

    // off to the boneyard, ye scalleywag. ☠️
    if (net.active) {
      game.boneyard[obj.data.id] = {
        ts: performance.now(),
        attacker: obj?.data?.attacker?.id || 'unknown'
      };
    }
  },

  setFrameTimeout: (callback, delayMsec, useGameSpeed = true) => {
    /**
     * a frame-counting-based setTimeout() implementation.
     * millisecond value (parameter) is converted to a frame count.
     */

    let data, exports;

    data = {
      frameCount: 0,
      frameInterval: parseInt(
        (delayMsec / FRAMERATE) * (useGameSpeed ? 1 / GAME_SPEED : 1),
        10
      ), // e.g., msec = 1000 -> frameInterval = 60
      callbackFired: false,
      useGameSpeed,
      didReset: false
    };

    function animate() {
      // if reset() was called, exit early
      if (data.didReset) return true;

      data.frameCount++;

      if (!data.callbackFired && data.frameCount >= data.frameInterval) {
        callback();
        data.callbackFired = true;
        return true;
      }

      return false;
    }

    function reset() {
      // similar to clearTimeout()
      data.didReset = true;
    }

    function restart() {
      // effectively, "rewind timer"
      data.frameCount = 0;
      data.didReset = false;
    }

    exports = {
      animate,
      data,
      reset,
      restart
    };

    frameTimeoutManager.addInstance(exports);

    return exports;
  },

  setFixedFrameTimeout: (callback, delayMsec, useGameSpeed = false) =>
    common.setFrameTimeout(callback, delayMsec, useGameSpeed),

  inheritData(data, options = {}) {
    // mix in defaults and common options

    let id = options.id || `obj_${guidByType[data.type]++}_${data.type}`;

    /**
     * Note: if prefixID, then prepend `host_` or `guest_`, if not already prefixed.
     * Things that are already prefixed are going to be remote objects.
     * This avoids collisions with other objects that might take the same number otherwise... hopefully. :P
     * Ground items e.g., base, bunker etc., use "static" IDs that do not need prefixing by design,
     * since they are created on both sides and their IDs need to match.
     */

    // TODO: maybe use `fromNetworkEvent` instead of matching host|guest
    // NOTE: no prefix if `options.id` was specified.
    if (
      net.active &&
      !options.id &&
      !options.staticID &&
      !staticIDTypes[data.type] &&
      !options.fromNetworkEvent
    ) {
      id = `${net.isHost ? PREFIX_HOST : PREFIX_GUEST}${id}`;
    }

    // sanity check
    if (id.indexOf(PREFIX_HOST) !== -1 && id.indexOf(PREFIX_GUEST) !== -1) {
      // missile launcher missiles may include this because the ID is prefixed.
      // fix by dropping the first one.
      console.warn('bad ID, has both HOST and GUEST?', id);
      // id = id.split('_').slice(2).join('_');
      // debugger;
    }

    const defaults = {
      id,
      guid: options.id || `obj_${guid++}_${data.type}`,
      fromNetworkEvent: options.fromNetworkEvent,
      isOnScreen: null,
      isEnemy: !!options.isEnemy,
      bottomY: options.bottomY || 0,
      dead: false,
      x: options.x || 0,
      y: options.y || 0,
      vX: options.vX || 0,
      vY: options.vY || 0,
      fireModulus: options.fireModulus,
      frontZone: null,
      rearZone: null
    };

    let key;

    // add, if undefined
    for (key in defaults) {
      if (data[key] === undefined) data[key] = defaults[key];
    }

    return data;
  },

  inheritCSS(options = {}) {
    defaultCSSKeys.forEach((key) => {
      if (options[key] === undefined) {
        options[key] = defaultCSS[key];
      }
    });

    return options;
  },

  mixin(oMain, oAdd) {
    // edge case: if nothing to add, return "as-is"
    // if otherwise unspecified, `oAdd` is the default options object
    if (oAdd === undefined) return oMain;

    // the modern way
    return Object.assign(oMain, oAdd);
  },

  friendlyNearbyHit(target, source, hitOptions) {
    // logic for missile launcher and tank overlap / spacing.

    const { stop, resume } = hitOptions;

    const sData = source.data;
    const tData = target.data;

    /**
     * TODO: data.halfWidth instead of 0, but be able to resume and separate vehicles when there are no enemies nearby.
     * For now: stop when we pull up immediately behind the next tank / vehicle, vs. being "nearby."
     * Safeguard: wait only a certain amount of time before ignoring a nearby / overlapping unit, and continuing.
     */

    /**
     * Special case: two tanks roll up to the same enemy, and start firing.
     * Without handling, the rear friendly tank would hang back to avoid overlap.
     * In the original game, they would perfectly overlap when stopping to fire at the same position.
     * Therefore: if both of us are tanks, and the target is firing and we are not, keep on truckin'.
     */
    if (sData.type === TYPES.tank && tData.type === TYPES.tank) {
      // ignore if we're firing at a target, because we should also be stopped.
      if (sData.lastNearbyTarget) return;

      // otherwise - if the target is firing and we aren't yet, keep on truckin' so we can join in.
      if (tData.lastNearbyTarget) {
        resume();
        return;
      }
    }

    // if we are not a tank, but the target is, always wait for tanks to pass in front.
    if (sData.type !== TYPES.tank && tData.type === TYPES.tank) {
      stop();
      return;
    }

    // If we are "ahead" of the overlapping unit, we may be at the front of a possible traffic pile-up - so, keep on truckin'.
    if (
      (!sData.isEnemy && sData.x > tData.x) ||
      (sData.isEnemy && sData.x < tData.x)
    ) {
      resume();
      return;
    }

    // if we have an absolute match with another vehicle (and the same type), take the lower ID.
    // this is intended to help prevent vehicles from getting "wedged" waiting for one another.
    if (sData.x === tData.x && tData.type === sData.type) {
      const sourceID = sData.guid.split('_')[1];
      const targetID = tData.guid.split('_')[1];
      if (sourceID < targetID) {
        resume();
        return;
      }
    }

    // at this point, just stop.
    stop();
  },

  hit(target, hitPoints = 1, attacker) {
    let newEnergy, energyChanged;

    /**
     * special case: super-bunkers can only be damaged by tank gunfire.
     * other things can hit super-bunkers, but we don't want damage done in this case.
     */

    const tData = target.data;

    // non-tank gunfire will ricochet off of super bunkers.
    if (
      tData.type === TYPES.superBunker &&
      !(attacker?.data?.parentType === TYPES.tank)
    )
      return;

    if (tData.type === TYPES.tank) {
      // tanks shouldn't be damaged by shrapnel - but, let the shrapnel die.
      if (attacker?.data?.parentType === TYPES.shrapnel) {
        hitPoints = 0;
      }
    }

    // hackish: prevent winning units from being hit.
    if (game.data.battleOver && game.data.didEnemyWin === target.data.isEnemy)
      hitPoints = 0;

    newEnergy = Math.max(0, tData.energy - hitPoints);

    energyChanged = tData.energy !== newEnergy;

    tData.energy = newEnergy;

    // special cases for updating state
    if (energyChanged) {
      target?.updateHealth?.(attacker);
      // callback-style method, e.g., helicopter was shot
      target?.onHit?.(attacker);
    }

    sprites.updateEnergy(target);

    if (!tData.energy && target.die) {
      // mutate the object: assign its attacker.
      tData.attacker = attacker;

      if (debugCollision) {
        makeDebugRect(target);
        makeDebugRect(attacker);
      }

      target.die({ attacker });
    }
  },

  onDie(target, dieOptions = {}) {
    /**
     * A generic catch-all for battlefield item `die()` events.
     * This is mostly for supporting network games.
     */

    // NOTE: attacker may not always be defined.
    const attacker = dieOptions.attacker || target?.data?.attacker;

    // callback-style methods

    if (attacker?.data?.parent?.onKill) {
      // e.g., helicopter shot target with gunfire
      attacker.data.parent.onKill(target);
    }

    if (attacker?.onKill) {
      // e.g., helicopter crashed directly into target
      attacker.onKill(target);
    }

    if (!net.active) return;

    if (debugCollision) {
      if (attacker && attacker.data.type === TYPES.helicopter)
        makeDebugRect(attacker);
      if (target && target.data.type === TYPES.helicopter)
        makeDebugRect(target);
    }

    // ignore certain things - they're noisy or safer to leave locally, should be deterministic, and will generate additional traffic.
    if (excludeFromNetworkTypes[target.data.type]) return;

    // special case: ignore bombs that have died, *if* they have hit the ground.
    // this avoids having a bomb that's slightly behind on the remote, exploding in mid-air.
    // otherwise, it's good to have a bomb that hit (e.g.) a balloon also explode in the air and not appear to fall through.
    if (target.data.type === TYPES.bomb && target.data.hasHitGround) return;

    // if killed via network, don't send a die() back to the remote.
    if (target.data.killedViaNetwork) {
      target.data.killedViaNetwork = undefined;
      return;
    }

    const params = {
      attacker,
      x: target.data.x,
      y: target.data.y
    };

    // notify the remote: take something out.
    // by the time this lands, the remote object may have already died, been removed and be in the "boneyard" - that's fine.
    net.sendDelayedMessage({
      type: 'GAME_EVENT',
      id: target.data.id,
      method: 'die',
      params
    });
  },

  // height offsets for certain common ground units
  // TODO: reference constants or similar
  ricochetBoundaries: {
    'tank': 18,
    'bunker': 25,
    'super-bunker': 28
  },

  lastInfantryRicochet: 0,

  getLandingPadOffsetX(helicopter) {
    const pads = game.objects[TYPES.landingPad];
    const landingPad = pads[helicopter.data.isEnemy ? pads.length - 1 : 0];
    return (
      landingPad.data.x + landingPad.data.width / 2 - helicopter.data.halfWidth
    );
  },

  bottomAlignedY(y) {
    // correct bottom-aligned Y value
    return 370 - 2 - (y || 0);
  },

  getDoorCoords(obj) {
    // for special collision check case with bunkers

    const door = {
      width: 5,
      height: obj.data.height, // HACK: should be ~9px, figure out why true height does not work.
      halfWidth: 2.5
    };

    return {
      width: door.width,
      height: door.height,
      // slight offset on X, don't subtract door half-width
      x: parseInt(obj.data.x + obj.data.halfWidth + door.halfWidth + 2, 10),
      y: parseInt(obj.data.y + obj.data.height - door.height, 10)
    };
  },

  initNearby(nearby, exports) {
    // map options.source -> exports
    nearby.options.source = exports;
  },

  fetch(url, callback) {
    let xhr = new XMLHttpRequest();
    xhr.onload = () => {
      xhr.onload = null;
      xhr = null;
      callback?.();
    };
    xhr.open('GET', url, true);
    xhr.send();
  },

  preloadAudio(soundRef, callback) {
    const fileName = soundRef?.src;
    if (!fileName) return;

    function doCallback() {
      if (!callback) return;
      window.requestAnimationFrame(callback);
    }

    if (loadedAudio[fileName] || soundManager.disabled || !gamePrefs.sound) {
      doCallback();
      return;
    }

    function complete() {
      if (timer) window.clearTimeout(timer);
      loadedAudio[fileName] = true;
      doCallback();
    }

    common.fetch(fileName, complete);

    let timer = window.setTimeout(complete, 5000);
  },

  preloadVideo(fileName) {
    if (loadedVideos[fileName]) return;

    let video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const canplay = 'canplaythrough';

    function preloadOK() {
      if (!video) return;
      loadedVideos[fileName] = true;
      video.removeEventListener(canplay, preloadOK);
      video.remove();
      video = null;
    }

    video.innerHTML = [
      `<source src="${bnbVideoRoot}/${fileName}.webm" type="video/webm" />`,
      `<source src="${bnbVideoRoot}/${fileName}.mp4" type="video/mp4" />`
    ].join('');

    video.addEventListener(canplay, preloadOK);

    video.play();

    window.setTimeout(preloadOK, 5000);
  },

  setVideo(fileName = '', playbackRate, offsetMsec = 0, muted = true) {
    const o = document.getElementById('tv');

    const disabled = !gamePrefs.bnb || !gamePrefs.bnb_tv;

    videoActive = !!fileName;

    if (disabled) {
      if (!o) return;
      // ensure node is cleared / removed, if active
      fileName = '';
    }

    const container = document.getElementById('tv-display');

    const timeOffset = parseFloat(offsetMsec / 1000, 2);

    const startTime = timeOffset ? `#t=${timeOffset}` : '';

    wzTimer?.reset();

    if (!fileName || o) {
      // empty / reset
      if (o) o.innerHTML = '';
      utils.css.remove(container, 'active');
      let fs = document.getElementById('fs');
      if (fs) {
        fs.style.transitionDuration = '0.5s';
        fs.style.opacity = 0;
        wzTimer = common.setFrameTimeout(() => {
          wzTimer = null;
          fs.remove();
        }, 550);
      }
      if (!fileName) return;
    }

    // certain content is widescreen
    utils.css.addOrRemove(
      container,
      fileName.match(/camper|desert|wz/i),
      'widescreen'
    );

    const hasAudio = fileName.match(/wz/i);
    const isWZ = fileName.match(/wz/i);

    const sources = [
      `<source src="${bnbVideoRoot}/${fileName}.webm${startTime}" type="video/webm" />`,
      `<source src="${bnbVideoRoot}/${fileName}.mp4${startTime}" type="video/mp4" />`
    ];

    // MP4 first, due to historical bias...
    if (isSafari) sources.reverse();

    o.innerHTML = [
      `<video id="tv-video"${muted ? ' muted' : ''}${
        !hasAudio ? ' autoplay' : ''
      } playsinline>`,
      ...sources,
      '</video>'
    ].join('');

    // special-case: 'WZ' "music video."
    let fs;
    let videos;

    function onReadyStart() {
      if (!videoActive) return;
      videos.forEach((video) => video.play());
      if (isWZ) {
        common.setFrameTimeout(() => {
          if (!fs || !videoActive) return;
          fs.style.opacity = 0.5;
          common.setFrameTimeout(() => {
            if (!fs || !videoActive) return;
            fs.style.transitionDuration = '1s';
            fs.style.opacity = 1;
          }, 12000);
        }, 17000);
      } else {
        fs.style.transitionDuration = '0.25s';
        fs.style.opacity = 1;
      }
    }

    function touchStartVideo() {
      document.removeEventListener('touchstart', touchStartVideo);
      onReadyStart();
    }

    function ready() {
      if (isMobile && !videos[0].muted) {
        // video with sound needs user action to work.
        document.addEventListener('touchstart', touchStartVideo);
      } else {
        onReadyStart();
      }
    }

    const useFS = fileName.match(/wz|desert/i);

    if (useFS) {
      fs = document.createElement('div');
      fs.id = 'fs';
      Object.assign(fs.style, {
        position: 'absolute',
        top: '34px',
        left: '0px',
        height: `100%`,
        width: '100%',
        overflow: 'hidden',
        opacity: 0,
        transition: 'opacity 5s'
      });

      fs.innerHTML = [
        `<video id="tv-video-larger" muted playsinline style="position:absolute;bottom:0px;left:50%;width:auto;height:100%;transform:translate(-50%,0px)">`,
        ...sources,
        '</video>'
      ].join('');

      const body = document.body;
      body.insertBefore(fs, body.childNodes[0]);

      videos = [
        document.getElementById('tv-video'),
        document.getElementById('tv-video-larger')
      ];

      if (!loadedVideos[fileName]) {
        videos[0].addEventListener('canplaythrough', () => {
          loadedVideos[fileName] = true;
          ready();
        });
      } else {
        ready();
      }
    }

    utils.css.add(container, 'active');

    const video = o.childNodes[0];

    if (playbackRate) {
      video.playbackRate = playbackRate;
    }

    video.onended = () => common.setVideo('');
  },

  basicEscape(str) {
    return (
      str
        ?.replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // convenience
        .replace('\n', '<br>')
    );
  },

  addGravestone(exports) {
    addGravestone(exports);
  },

  resetGUID,

  resizeScanNode(exports, radarItem) {
    if (!exports) return;

    const { dom, data } = exports;

    // don't resize to 0x0; handled by CSS.
    if (data.dead) return;

    const radarScanNode = radarItem?.dom?.oScanNode;

    const scanNode = dom.oScanNode;

    const distance = data.dead ? 0 : data.scanDistance;

    radarItem?.updateScanNode(distance);

    common.updateScanNode(exports, distance);

    // allow transition if launcher was just ordered, rising up from below.
    if (!data.orderComplete) return;

    common.setFrameTimeout(() => {
      if (scanNode) {
        scanNode.style.transition = '';
      }
      if (radarScanNode) {
        radarScanNode.style.transition = '';
      }
    }, FPS * 10);
  },

  updateScanNode(exports, radius = 0) {
    if (!exports) return;

    const { data, dom } = exports;

    if (!data || !dom) return;

    // special case: some radar items also get a "scan range" node.
    const { oScanNode } = dom;

    if (!oScanNode) return;

    exports.data.logicalWidth = radius;

    oScanNode.style.width = `${radius * 2}px`;
    oScanNode.style.height = `${radius}px`;

    // border radius shenanigans
    oScanNode.style.borderRadius = `${radius}px ${radius}px 0 0`;
  },

  unlimitedLivesMode() {
    // regardless of pref, treat tutorial as "unlimited."
    if (gamePrefs.unlimited_lives || tutorialMode) return true;

    // no network games, for now.
    if (net.active) return true;

    const pData = game.players?.local?.data;
    if (!pData) return true;

    // CPUs get unlimited treatment.
    if (pData.isCPU) return true;

    // finally, allow limited lives.
    return false;
  },

  playerCanLoseLives(data) {
    if (!data) return;
    // even if unlimited mode, exclude remote + CPUs.
    return !common.unlimitedLivesMode() && data.isLocal && !data.isCPU;
  }
};

export { common };
