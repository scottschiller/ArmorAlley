import { game } from '../core/Game.js';
import { gamePrefs } from '../UI/preferences.js';
import { FRAMERATE, TYPES } from '../core/global.js';
import { frameTimeoutManager } from '../core/GameLoop.js';
import { zones } from './zones.js';
import { sprites } from './sprites.js';

// unique IDs for quick object equality checks
let guid = 0;

const defaultCSS = {
  animating: 'animating',
  dead: 'dead',
  enemy: 'enemy',
  exploding: 'exploding',
};

const defaultCSSKeys = Object.keys(defaultCSS);

const common = {

  unlinkObject: (obj) => {

    // drop "links" from zones, and objects by ID.
    if (!obj?.data?.id) return;
  
    if (obj.data.frontZone !== null || obj.data.rearZone !== null) {
      zones.leaveAllZones(obj);
    }
  
    game.objectsById[obj.data.id] = null;
    delete game.objectsById[obj.data.id];
  
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
  
    const defaults = {
      id: (options.id || `obj_${guid++}_${data.type}`),
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
    }

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

  }

};

export { common };