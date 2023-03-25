import { game } from '../core/Game.js';
import { gamePrefs } from '../UI/preferences.js';
import { debugCollision, FRAMERATE, TYPES } from '../core/global.js';
import { frameTimeoutManager } from '../core/GameLoop.js';
import { zones } from './zones.js';
import { sprites } from './sprites.js';
import { net } from './network.js';

// unique IDs for quick object equality checks
let guid = 0;

// per-type counters, more deterministic
let guidByType = {};

// TYPES include camelCase entries e.g., missileLauncher, those will be ignored here.
for (let type in TYPES) {
  if (!type.match(/[A-Z]/)) {
    guidByType[type] = 0;
  }
}

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
  // [TYPES.gunfire]: true,
  [TYPES.shrapnel]: true,
  [TYPES.bomb]: true
}

const PREFIX_HOST = 'host_';
const PREFIX_GUEST = 'guest_';

const defaultCSS = {
  animating: 'animating',
  dead: 'dead',
  enemy: 'enemy',
  exploding: 'exploding',
};

const defaultCSSKeys = Object.keys(defaultCSS);

const debugRects = [];

function makeDebugRect(obj, viaNetwork) {

  if (!obj?.data) return;

  const { data } = obj;

  let { x, y } = data;

  function update() {
    if (!o?.style) return;
    o.style.transform = `translate3d(${x - game.objects.view.data.battleField.scrollLeft}px, ${y}px, 0px)`;
  }

  const o = document.createElement('div');
  o.className = 'debug-rect';

  Object.assign(o.style, {
    position: 'absolute',
    top: '0px',
    left: '0px',
    width: `${data.width}px`,
    height: `${data.height}px`,
    border: `1px ${viaNetwork ? 'dotted' : 'solid'} ${data.isEnemy ? '#990000' : '#009900'}`,
    color: '#fff',
    'font-size': '4px'
  });

  update();

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

  span.innerHTML = data.id + (data.parent ? data.parent?.data.id : '') + (viaNetwork ? ' 📡' : '');
  o.appendChild(span);

  game.dom.battlefield.appendChild(o);

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
      }
    }

    const viaNetwork = true;
    net.sendMessage({ type: 'MAKE_DEBUG_RECT', params: [ basicData, viaNetwork ] });
  }

  return {
    update,
    o
  }

}

function debugObj(label = 'unknown', obj = {}) {

  const { data } = obj;
  if (!data) return;

  console.log(label, data.id, data.x, data.y, data.width, data.height, data.vX, data.vY, data.parent?.data?.id, data.parent ? console.log(debugObj(label + '-parent', data.parent)) : '(no data.parent)');

}

const common = {

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

  setFrameTimeout: (callback, delayMsec) => {

    /**
     * a frame-counting-based setTimeout() implementation.
     * millisecond value (parameter) is converted to a frame count.
     */
  
    let data, exports;
  
    data = {
      frameCount: 0,
      frameInterval: parseInt(delayMsec / FRAMERATE, 10), // e.g., msec = 1000 -> frameInterval = 60
      callbackFired: false,
      didReset: false,
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
  
    exports = {
      animate,
      data,
      reset
    };
  
    frameTimeoutManager.addInstance(exports);
  
    return exports;
  
  },

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
    if (net.active && !options.id && !options.staticID && !staticIDTypes[data.type] && !options.fromNetworkEvent) {
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
      guid: (options.id || `obj_${guid++}_${data.type}`),
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

  hit(target, hitPoints = 1, attacker) {

    let newEnergy, energyChanged;

    if (target.data.dead) return;

    /**
     * special case: super-bunkers can only be damaged by tank gunfire.
     * other things can hit super-bunkers, but we don't want damage done in this case.
     */

    // non-tank gunfire will ricochet off of super bunkers.
    if (target.data.type === TYPES.superBunker && !(attacker?.data?.parentType === TYPES.tank)) return;

    if (target.data.type === TYPES.tank) {
      // tanks shouldn't be damaged by shrapnel - but, let the shrapnel die.
      if (attacker?.data?.parentType === TYPES.shrapnel) {
        hitPoints = 0;
      }
    }

    newEnergy = Math.max(0, target.data.energy - hitPoints);

    energyChanged = target.data.energy !== newEnergy;

    target.data.energy = newEnergy;

    // special cases for updating state
    if (energyChanged && target.updateHealth) {
      target.updateHealth(attacker);
    }

    sprites.updateEnergy(target);

    if (!target.data.energy && target.die) {

      // mutate the object: assign its attacker.
      target.data.attacker = attacker;

      target.die({ attacker });

    }

  },

  onDie(target, attacker = target?.data?.attacker) {

    /**
     * A generic catch-all for battlefield item `die()` events.
     * This was added specifically for the network game case,
     * but may be refactored in future as needed.
    */

    if (!net.active) return;

    // NOTE: attacker may not always be defined.

    if (target.data.type === TYPES.helicopter && !target.data.isEnemy && target.data.isLocal) {
      console.log('Local player was target, killed by something', target, attacker);
      debugObj('local player target', target);
      debugObj('attacker', attacker);
    }

    if (attacker && attacker.data.type === TYPES.helicopter && !attacker.data.isEnemy && attacker.data.isLocal) {
      console.log('Local player was attacker, killed by something', attacker, target);
      debugObj('local player attacker', attacker);
      debugObj('target', target);
    }

    if (target.data.type === TYPES.helicopter && !target.data.isEnemy && target.data.isRemote) {
      console.log('Remote friendly player was target, killed by something', target, attacker);
      debugObj('remote friendly player target', target);
      debugObj('attacker', attacker);
    }

    if (attacker && attacker.data.type === TYPES.helicopter && !attacker.data.isEnemy && attacker.data.isRemote) {
      console.log('Remote friendly player was attacker, killed by something', attacker, target);
      debugObj('remote friendly player attacker', attacker);
      debugObj('target', target);
    }

    if (debugCollision) {
      if (attacker && attacker.data.type === TYPES.helicopter) makeDebugRect(attacker);
      if (target && target.data.type === TYPES.helicopter) makeDebugRect(target);
    }

    if (!net.active) return;

    // ignore certain things - they're noisy or safer to leave locally, should be deterministic, and will generate additional traffic.
    if (excludeFromNetworkTypes[target.data.type]) return;

    const attackerId = attacker?.data?.id;
    const attackerParentId = attacker?.data?.parent?.data?.id;

    // notify the remote: take something out.
    // by the time this lands, the thing may have already died and be in the "boneyard" - that's fine.
    net.sendDelayedMessage({ type: 'GAME_EVENT', id: target.data.id, method: 'die', params: { attackerId, attackerParentId, fromNetworkEvent: true }});

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
    return landingPad.data.x + (landingPad.data.width / 2) - helicopter.data.halfWidth;
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
  
    return ({
      width: door.width,
      height: door.height,
      // slight offset on X, don't subtract door half-width
      x: parseInt(obj.data.x + obj.data.halfWidth + door.halfWidth + 2, 10),
      y: parseInt((obj.data.y + obj.data.height) - door.height, 10)
    });
  
  },

  initNearby(nearby, exports) {

    // map options.source -> exports
    nearby.options.source = exports;
  
  },

  tweakEmojiSpacing(text) {

    // https://www.freecodecamp.org/news/how-to-use-regex-to-match-emoji-including-discord-emotes/
    // replace emoji + space character with emoji + half-width space, splitting the emoji from the match and including a partial space character: ` `
    return text?.replace(/<a?:.+?:\d{18}>|\p{Extended_Pictographic}\s/gu, (match/*, offset, string*/) => `${match.substr(0, match.length - 1)} `);

  },

  setVideo(fileName = '', playbackRate, offsetMsec = 0) {

    const o = document.getElementById('tv');

    const disabled = (!gamePrefs.bnb || !gamePrefs.bnb_tv);

    if (disabled) {
      if (!o) return;
      // ensure node is cleared / removed, if active
      fileName = '';
    }

    const container = document.getElementById('tv-display');

    const timeOffset = parseFloat(offsetMsec / 1000, 2);

    const startTime = timeOffset ? `#t=${timeOffset}` : '';

    if (!fileName || o) {
      // empty / reset
      if (o) o.innerHTML = '';
      container.className = '';
      if (!fileName) return;
    }

    o.innerHTML = [
     '<video id="tv-video" muted autoplay playsinline>',
      `<source src="image/bnb/${fileName}.webm${startTime}" type="video/webm" />`,
      `<source src="image/bnb/${fileName}.mp4${startTime}" type="video/mp4" />`,
     '</video>',
    ].join('');

    container.className = 'active';

    const video = o.childNodes[0];

    if (playbackRate) {
      video.playbackRate = playbackRate;
    }

    video.onended = () => common.setVideo('');

  }

};

export { common };