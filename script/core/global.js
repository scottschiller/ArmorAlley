// oft-referenced constants, and a few simple methods.

const searchParams = new URLSearchParams(window.location.search);

const DEFAULT_FUNDS = searchParams.get('FUNDS') ? 999 : 32;

const winloc = window.location.href.toString();

const ua = navigator.userAgent;

const FPS = 30;
const FRAMERATE = 1000 / FPS;

// skip frame(s) as needed, prevent the game from running too fast.
const FRAME_MIN_TIME = (1000 / 60) * (60 / FPS) - (1000 / 60) * 0.5;

const unlimitedFrameRate = searchParams.get('frameRate=*');

/**
 * Evil tricks needed because Safari 6 (and Webkit nightly)
 * scale text after rasterization - thus, there's an option
 * to use document[element].style.zoom vs. transform: scale3d()
 * which renders text cleanly. Both have minor quirks.
 * force-enable transform under Safari 6 w/ #forceTransform=1
 */

const isWebkit = ua.match(/webkit/i);
const isChrome = !!(isWebkit && (ua.match(/chrome/i) || []).length);
const isFirefox = ua.match(/firefox/i);
const isSafari = (isWebkit && !isChrome && ua.match(/safari/i));

// iOS devices if they report as such, e.g., iPad when "request mobile website" is selected (vs. desktop) - OR, if "touch support" exists(?)
const isMobile = ua.match(/mobile|iphone|ipad/i) || navigator?.maxTouchPoints > 0;
const isiPhone = ua.match(/iphone/i);

// bare-bones "request mobile website" iOS detection
const isMobileIOS = ua.match(/iphone|ipad/i);

// whether off-screen elements are forcefully removed from the DOM.
// may be expensive up front, and/or cause style recalcs while
// scrolling the world. the fastest nodes are the ones that aren't there.
const useDOMPruning = !searchParams.get('noDomPruning');

const trackEnemy = searchParams.get('trackEnemy') || searchParams.get('enemyCPU');

const debug = searchParams.get('debug');

// TODO: get rid of this.
const debugType = searchParams.get('debugType');

const DEFAULT_VOLUME = 25;

const rad2Deg = 180 / Math.PI;

// used for various measurements in the game
const worldWidth = 8192;
const worldHeight = 380;

const forceZoom = !!(searchParams.get('forceZoom'));
const forceTransform = !!(searchParams.get('forceTransform'));

let tutorialMode = !!(searchParams.get('tutorial'));

function setTutorialMode(state) {
  tutorialMode = state;
}

// classic missile style
const defaultMissileMode = null;

// can also be enabled by pressing "C".
const rubberChickenMode = 'rubber-chicken-mode';

// can also be enabled by pressing "B".
const bananaMode = 'banana-mode';

// methods which prefer brevity, vs. being tacked onto `common` or `utils`

let seed = Math.floor(Math.random() * 0xFFFFFFFF);

// rng: random number *generator*.
// hat tip: https://github.com/mitxela/webrtc-pong/blob/master/pong.htm#L176
function rng(number = 1) {
  var t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return number * (((t ^ t >>> 14) >>> 0) / 4294967296);
}

function rnd(number) {
  return Math.random() * number;
}

function rngInt(number) {
  return parseInt(rng(number), 10);
}

function rndInt(number) {
  return parseInt(rnd(number), 10);
}

function plusMinus(number = 1) {
  return Math.random() >= 0.5 ? number : -number;
}

function oneOf(array) {
  if (!array?.length) return;
  return array[rndInt(array.length)];
}

/**
 * Type table, supporting both camelCase and dash-type lookups
 * e.g., { parachuteInfantry : 'parachute-infantry' }
 * and { 'parachute-infantry': 'parachute-infantry' }
 * Dash-case is used mostly for DOM / CSS, camelCase for JS
 */
const TYPES = (() => {

  // assign 1:1 key / value strings in a DRY fashion
  const types = 'base, bomb, balloon, bunker, chain, cloud, cornholio, engineer, gunfire, helicopter, infantry, end-bunker, landing-pad, missile-launcher, parachute-infantry, smart-missile, smoke, shrapnel, super-bunker, tank, turret, terrain-item, van';
  const result = {};

  types.split(', ').forEach((type) => {

    // { bunker: 'bunker' }
    result[type] = type;

    // dash-case to camelCase
    if (type.indexOf('-') !== -1) {

      // missile-launcher -> ['missile', 'launcher']
      const a = type.split('-');

      // launcher -> Launcher
      a[1] = a[1].charAt(0).toUpperCase() + a[1].slice(1);

      // { missileLauncher: 'missile-launcher' }
      result[a.join('')] = type;

    }

  });

  return result;

})();

function getTypes(typeString, options = { group: 'enemy', exports: null }) {

  /**
   * Used for collision and nearby checks, e.g., ground units that tanks look out for
   * typeString: String to array, e.g., 'tank, van, infantry' mapped to TYPES
   * options object: group = all, friendly, or enemy - reducing # of objects to check.
   */

  if (!typeString?.split) return [];

  let { exports, group } = options;

  // if exports but no group, assume enemy.
  if (!group) {
    group = 'enemy';
  }

  // if NOT looking for all, determine the appropriate group.
  if (group !== 'all') {
    group = determineGroup(group, exports);
  }

  // normalize delimiters, get array.
  return parseTypeString(typeString).map((item) => {

    // "tank:friendly", per-type override
    if (item.indexOf(':') !== -1) {
      const typeAndGroup = item.split(':');
      return {
        type: TYPES[typeAndGroup[0]],
        group: determineGroup(typeAndGroup[1], exports)
      };
    }

    // just "tank", use function signature group
    return { type: TYPES[item], group };

  });

}

function determineGroup(group = 'all', exports) {

  // if the default, no additional work required.
  if (group === 'all') return group;

  if (!exports) {
    console.warn(`determineGroup(${group}): missing exports required to determine target`, arguments);
    return;
  }

  if (exports.data.isEnemy || exports.data.hostile) {
    // "bad guy" - whatever they're looking for, maps to the opposite array in-game.
    // e.g., enemy tank seeking an enemy = lookups in "friendly" game object array.
    group = enemyGroupMap[group];
  }

  return group;

}

function parseTypeString(typeString) {

  // helper method
  if (!typeString?.replace) return [];

  // 'tank, van, infantry' -> ['tank', 'van', 'infantry']
  return typeString.replace(/[\s|,]+/g, ' ').split(' ');

}

// normalize delimiters -> array; no "group" handling, here.
const parseTypes = (typeString) => parseTypeString(typeString).map((item) => TYPES[item]);

const enemyGroupMap = {
  /**
   * The game stores enemy objects in enemy arrays, and friendly -> friendly.
   * Ergo, when enemies are looking for friendly, they get the enemy array
   * and vice-versa. This is due to legacy names, and could be improved.
   */
  friendly: 'enemy',
  enemy: 'friendly'
};

const COSTS = {
  [TYPES.missileLauncher]: {
    funds: 3,
    count: 1,
    css: 'can-not-order-missile-launcher'
  },
  [TYPES.tank]: {
    funds: 4,
    count: 1,
    css: 'can-not-order-tank'
  },
  [TYPES.van]: {
    funds: 2,
    count: 1,
    css: 'can-not-order-van',
  },
  [TYPES.infantry]: {
    funds: 5,
    count: 5,
    css: 'can-not-order-infantry',
  },
  [TYPES.engineer]: {
    funds: 5,
    count: 2,
    css: 'can-not-order-engineer'
  }
};

export {
  DEFAULT_FUNDS,
  TYPES,
  COSTS,
  winloc,
  FRAME_MIN_TIME,
  FPS,
  FRAMERATE,
  unlimitedFrameRate,
  getTypes,
  parseTypes,
  isWebkit,
  isChrome,
  isFirefox,
  isSafari,
  isMobile,
  isiPhone,
  isMobileIOS,
  useDOMPruning,
  trackEnemy,
  debug,
  debugType,
  DEFAULT_VOLUME,
  rad2Deg,
  worldWidth,
  worldHeight,
  forceZoom,
  forceTransform,
  tutorialMode,
  defaultMissileMode,
  rubberChickenMode,
  bananaMode,
  oneOf,
  rnd,
  rng,
  rndInt,
  rngInt,
  plusMinus,
  setTutorialMode
};