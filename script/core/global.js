// oft-referenced constants, and a few simple methods.

const DEFAULT_FUNDS = window.location.toString().match(/FUNDS/i) ? 999 : 32;

const TYPES = {
  bomb: 'bomb',
  balloon: 'balloon',
  cloud: 'cloud',
  helicopter: 'helicopter',
  tank: 'tank',
  gunfire: 'gunfire',
  turret: 'turret',
  infantry: 'infantry',
  parachuteInfantry: 'parachute-infantry',
  'parachute-infantry': 'parachuteInfrantry',
  parachuteInfantryCamel: 'parachuteInfantry',
  engineer: 'engineer',
  bunker: 'bunker',
  endBunker: 'end-bunker',
  endBunkerCamel: 'endBunker',
  superBunker: 'super-bunker',
  superBunkerCamel: 'superBunker',
  missileLauncher: 'missile-launcher',
  'missile-launcher': 'missileLauncher',
  missileLauncherCamel: 'missileLauncher',
  smartMissile: 'smart-missile',
  shrapnel: 'shrapnel',
  van: 'van'
};

const COSTS = {
  missileLauncher: {
    funds: 3,
    css: 'can-not-order-missile-launcher'
  },
  tank: {
    funds: 4,
    css: 'can-not-order-tank'
  },
  van: {
    funds: 2,
    css: 'can-not-order-van',
  },
  infantry: {
    funds: 5,
    count: 5,
    css: 'can-not-order-infantry',
  },
  engineer: {
    funds: 5,
    count: 2,
    css: 'can-not-order-engineer'
  }
};

const winloc = window.location.href.toString();

const ua = navigator.userAgent;

const FPS = 30;
const FRAMERATE = 1000 / FPS;

// skip frame(s) as needed, prevent the game from running too fast.
const FRAME_MIN_TIME = FRAMERATE * 0.95;

const unlimitedFrameRate = winloc.match(/frameRate=\*/i);

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
const isMobile = ua.match(/mobile/i); // should get iOS.
const isiPhone = ua.match(/iphone/i);

// whether off-screen elements are forcefully removed from the DOM.
// may be expensive up front, and/or cause style recalcs while
// scrolling the world. the fastest nodes are the ones that aren't there.
const useDOMPruning = !winloc.match(/noDomPruning/i);

const trackEnemy = winloc.match(/trackEnemy/i);

const debug = winloc.match(/debug/i);

// TODO: get rid of this.
const debugType = winloc.match(/debugType/i);

const DEFAULT_VOLUME = 25;

const rad2Deg = 180 / Math.PI;

// used for various measurements in the game
const worldWidth = 8192;
const worldHeight = 380;

const forceZoom = !!(winloc.match(/forceZoom/i));
const forceTransform = !!(winloc.match(/forceTransform/i));
const tutorialMode = !!(winloc.match(/tutorial/i));

// classic missile style
const defaultMissileMode = null;

// can also be enabled by pressing "C".
const rubberChickenMode = 'rubber-chicken-mode';

// can also be enabled by pressing "B".
const bananaMode = 'banana-mode';

// methods which prefer brevity, vs. being tacked onto `common` or `utils`

function rnd(number) {
  return Math.random() * number;
}

function rndInt(number) {
  return parseInt(rnd(number), 10);
}

function plusMinus() {
  return Math.random() >= 0.5 ? 1 : -1;
}

export {
  DEFAULT_FUNDS,
  TYPES,
  COSTS,
  winloc,
  FRAME_MIN_TIME,
  FPS,
  FRAMERATE,
  unlimitedFrameRate,
  isWebkit,
  isChrome,
  isFirefox,
  isSafari,
  isMobile,
  isiPhone,
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
  rnd,
  rndInt,
  plusMinus
};