import { gamePrefs } from '../UI/preferences.js';
import { game, gameType } from '../core/Game.js';
import { common } from '../core/common.js';
import { autoStart, searchParams, TYPES, worldHeight } from '../core/global.js';
import { net } from '../core/network.js';
import { scanNodeTypes } from '../UI/Radar.js';
import { prefsManager, screenScale } from '../aa.js';
import { utils } from '../core/utils.js';
import { FACING } from '../elements/Balloon.js';
import { tutorialLevel } from './tutorial.js';
import { cakeWalkLevel } from './campaign/cake-walk.js';
import { oneGunLevel } from './campaign/one-gun.js';
import { suckerPunchLevel } from './campaign/sucker-punch.js';
import { airborneLevel } from './campaign/airborne.js';
import { twoGunLevel } from './campaign/two-gun.js';
import { superBunkerLevel } from './campaign/super-bunker.js';
import { scrapyardLevel } from './campaign/scrapyard.js';
import { blindSpotLevel } from './campaign/blind-spot.js';
import { wastelandLevel } from './campaign/wasteland.js';
import { midnightOasisLevel } from './campaign/midnight-oasis.js';
import { balloonFunLevel } from './network/balloon-fun.js';
import { cavernCobraLevel } from './network/cavern-cobra.js';
import { desertSortieLevel } from './network/desert-sortie.js';
import { firstBloodLevel } from './network/first-blood.js';
import { networkManiaLevel } from './network/network-mania.js';
import { rescueRaidersLevel } from './network/rescue-raiders.js';
import { midPointLevel } from './network/midpoint.js';
import { slithyToves } from './network/slithy-toves.js';
import { tankersDemiseLevel } from './network/tankers-demise.js';
import { windStalkerLevel } from './network/windstalker.js';
import { sandstormLevel } from './network/sandstorm.js';
import { rainstormLevel } from './network/rainstorm.js';

// Default "world": Tutorial, level 1 or level 9 (roughly)

let originalLevels;

let level = searchParams.get('level');
let levelName;
let levelNumber;

// The original 10 game battles, in order.
const campaignBattles = [
  'Cake Walk',
  'One-Gun',
  'Sucker Punch',
  'Airborne',
  'Two-Gun',
  'Super Bunker',
  'Scrapyard',
  'Blind Spot',
  'Wasteland',
  'Midnight Oasis'
];

const networkBattles = [
  'Balloon Fun',
  'Cavern Cobra',
  'Desert Sortie',
  'First Blood',
  'Network Mania',
  'Rescue Raiders',
  'Midpoint',
  'Slithy Toves',
  "Tanker's Demise",
  'WindStalker',
  'Sandstorm',
  'Rainstorm'
];

/**
 * Battle "flags" from the original game
 * [B]ullets: the helicopters are equipped with bullets, instead of aimed missiles.
 * [N]apalm: the helicopters are equipped with napalm. (Bombs explode larger, instead of just a "spark" when they hit the ground.]
 * [S]tealth: the opposing team's helicopters do not appear on the radar.
 * [J]amming: the radars do not operate.
 *
 * Ratings:
 *
 * IQ - This is a rating of the computer intelligence. (N.B.: "IQ" ratings are not implemented in this remake.)
 * Fairness - The field is biased toward the left player or right player and is indicated by a rating of -9 (left) to +9 (right).
 *
 * "Boot Camp"
 *
 *  # Battle         B N S J  IQ   F
 * ---------------------------------
 *  1 Cake Walk      •        16  -1
 *  2 One-Gun        •        18  -1
 *  3 Sucker Punch   •        22   0
 *  4 Airborne       •        29   0
 *  5 Two-Gun        •        29  +2
 *  6 Super Bunker   •        28  +9
 *  7 Scrapyard      •        42  +9
 *  8 Blind Spot     • •     111  +9
 *  9 Wasteland      • •     115  +9
 * 10 Midnight Oasis • •     133  +9
 *
 * "Wargames"
 *
 *  # Battle         B N S J  IQ   F
 * ---------------------------------
 *  1 Cake Walk      •        29  -1
 *  2 One-Gun        •        28  -1
 *  3 Sucker Punch   •        42   0
 *  4 Airborne       • •     111   0
 *  5 Two-Gun        • •     115  +2
 *  6 Super Bunker   • •     133  +9
 *  7 Scrapyard      • •     133  +9
 *  8 Blind Spot       •     153  +9
 *  9 Wasteland        •     153  +9
 * 10 Midnight Oasis   • •   176  +9
 *
 * "Conflict" (IQ needs confirming vs. original))
 *
 *  # Battle         B N S J  IQ   F
 * ---------------------------------
 *  1 Cake Walk      •       115  -1
 *  2 One-Gun        •       133  -1
 *  3 Sucker Punch   •       133   0
 *  4 Airborne       • •     153   0
 *  5 Two-Gun        • •     153  +2
 *  6 Super Bunker   • •     176  +9
 *  7 Scrapyard      • •     176  +9
 *  8 Blind Spot       •     193  +9
 *  9 Wasteland        •     193  +9
 * 10 Midnight Oasis   • •   218  +9
 *
 * "Armorgeddon"
 *
 *  # Battle         B N S J  IQ   F
 * ---------------------------------
 *  1 Cake Walk        •     153  -1
 *  2 One-Gun          • •   176  -1
 *  3 Sucker Punch     • •   176   0
 *  4 Airborne         • •   193   0
 *  5 Two-Gun          • •   193  +2
 *  6 Super Bunker     • • • 218  +9
 *  7 Scrapyard      • • • • 198  +9
 *  8 Blind Spot     • • • • 198  +9
 *  9 Wasteland        • • • 218  +9
 * 10 Midnight Oasis   • • • 218  +9
 *
 * Network Battles
 *
 * Name              B N S J  IQ   F
 * ---------------------------------
 * Balloon Fun       •       126   0
 * Cavern Cobra      •       127   0
 * Desert Sortie     • •     150   0
 * First Blood       •       131  +2
 * Network Mania     • •     154  +5
 * Rescue Raiders    • •     158   0
 * Midpoint          • • •   176  -2
 * Slithy Toves      • •     178   0
 * Tanker's Demise   • • •   178   0
 * WindStalker       • •   • 179  +2
 * Sandstorm         • • •   177   0
 * Rainstorm         • •   • 177   0
 */

const networkFlags = {
  'Balloon Fun': [1, 0, 0, 0, 126, 0],
  'Cavern Cobra': [1, 0, 0, 0, 127, 0],
  'Desert Sortie': [1, 1, 0, 0, 150, 0],
  'First Blood': [1, 0, 0, 0, 131, 2],
  'Network Mania': [1, 1, 0, 0, 154, 5],
  'Rescue Raiders': [1, 1, 0, 0, 158, 0],
  'Midpoint': [1, 1, 1, 0, 176, -2],
  'Slithy Toves': [1, 1, 0, 0, 158, 0],
  "Tanker's Demise": [1, 1, 1, 0, 178, 0],
  'WindStalker': [1, 1, 0, 1, 179, 2],
  'Sandstorm': [1, 1, 1, 0, 177, 0],
  'Rainstorm': [1, 1, 0, 1, 177, 0]
};

const flagsByLevel = {
  easy: {
    'Cake Walk': [1, 0, 0, 0, 16, -1],
    'One-Gun': [1, 0, 0, 0, 18, -1],
    'Sucker Punch': [1, 0, 0, 0, 22, 0],
    'Airborne': [1, 0, 0, 0, 29, 0],
    'Two-Gun': [1, 0, 0, 0, 29, 2],
    'Super Bunker': [1, 0, 0, 0, 28, 9],
    'Scrapyard': [1, 0, 0, 0, 42, 9],
    'Blind Spot': [1, 1, 0, 0, 111, 9],
    'Wasteland': [1, 1, 0, 0, 115, 9],
    'Midnight Oasis': [1, 1, 0, 0, 133, 9],
    ...networkFlags
  },
  hard: {
    // Wargames + Conflict campaigns
    'Cake Walk': [1, 0, 0, 0, 29, -1],
    'One-Gun': [1, 0, 0, 0, 28, -1],
    'Sucker Punch': [1, 0, 0, 0, 42, 0],
    'Airborne': [1, 1, 0, 0, 111, 0],
    'Two-Gun': [1, 1, 0, 0, 115, 2],
    'Super Bunker': [1, 1, 0, 0, 133, 9],
    'Scrapyard': [1, 1, 0, 0, 133, 9],
    'Blind Spot': [0, 1, 0, 0, 153, 9],
    'Wasteland': [0, 1, 0, 0, 153, 9],
    'Midnight Oasis': [0, 1, 1, 0, 176, 9],
    ...networkFlags
  },
  extreme: {
    // Armorgeddon
    'Cake Walk': [0, 1, 0, 0, 153, -1],
    'One-Gun': [0, 1, 1, 0, 176, -1],
    'Sucker Punch': [0, 1, 1, 0, 176, 0],
    'Airborne': [0, 1, 1, 0, 193, 0],
    'Two-Gun': [0, 1, 1, 0, 193, 2],
    'Super Bunker': [0, 1, 1, 1, 218, 9],
    'Scrapyard': [1, 1, 1, 1, 198, 9],
    'Blind Spot': [1, 1, 1, 1, 198, 9],
    'Wasteland': [0, 1, 1, 1, 218, 9],
    'Midnight Oasis': [0, 1, 1, 1, 218, 9],
    ...networkFlags
  }
};

// TODO: override when playing a custom level that might have flags specified, e.g., &fb=1&fn=0&fs=0&fj=0
const defaultFlags = [1, 0, 0, 0, 0, 0];

/**
 * 22 different forms of difficulty: a sliding scale, depending on game type - based on research of the original.
 *
 * vanJammingI: van radar jamming distance, combined with a random number to determine jamming.
 * clipSpeedI: limit on CPU helicopter vs. MAXVELX? - also used to determine robotRDP->defendB (defend) status, might affect chasing helicopter? - cwGotoHB() (take out end bunker, refit/repair, close chopper combat, close chopper case (follow up to max velocity - 1, `clipvel1()`?), "fly to home", suicide, run/flee - case 6) + gotoH() does not seem to be clipped.
 * fundMinI: enemy minimum funds - hardly referenced, aside from determining enemy IQ score and whether to go after player's end bunker(?)
 * funMaxI: enemy maximum funds - same as min.
 * convoyLevelI: when CPU builds convoys - part of enemy IQ score. "convoyItemI" = which one, index into things to build
 * regenTimeI: how long before a new helicopter. 48 frames = ~5 seconds (or maybe 5.5.)
 * bombSlopperI: appears to be unused.
 * bDumbMissiles: flag, bullets vs. dumb/aimed missiles - factors into IQ score.
 * bNapalm: flag, whether bombs have napalm instead of "incendiary" bombs. IQ score.
 * bFlameThrower: true if tanks can use flame throwers on men. IQ score.
 * buildTruckB: Whether CPUs can build missile launchers. IQ score.
 * buildEngineersB: Whether CPUs can build engineers. IQ score.
 * useMissileB: Whether CPU can fire (smart? TBD) missiles. IQ score.
 * useMenB: Whether CPU can pick up infantry, and also order ones to pick up(?) - IQ score. Not sure if this affects deploying paratroopers.
 * killCopterB: Whether CPU can retaliate when targeted by a smart missile, chase and fight etc. IQ score. Connected to `statusB->attackB`.
 * killVanB: Whether CPU can target vans (only with bombs? TBD.) IQ score.
 * killTankB: Whether CPU can target tanks. IQ score.
 * killMenB: Whether CPU can target men. IQ score.
 * killMissileB: Whether CPU can fire at incoming smart missiles (if 5+ ammo.) IQ score.
 * killEndB: Whether CPU can go after the end bunker, "stealB" is set, and human player has at least `fundMinI` or more than `fundMaxI` funds(?). IQ score. `cwTakeOutEndB()`
 * suicideB: Whether CPU can make a beeline for helicopter / crash? IQ score. Applies to state machine when `attackI` is set to 5.
 * stealthB: True when enemy not on radar. IQ score.
 * jammingB: Whether radar is fully jammed. May occasionally flicker. IQ score.
 * scatterBombB: Whether CPU can drop bombs on things, separately from killTankB/killVanB/killMenB. IQ score. `scatterBombB()`
 */

let paramsMap;

function makeParamsMap() {
  // quick-and-dirty "flags to offsets" enumeration.
  let pMap = {};
  'vanJammingI clipSpeedI fundMinI fundMaxI convoyLevelI regenTimeI bDumbMissiles bNapalm bFlameThrower buildTruckB buildEngineersB useMissileB useMenB killCopterB killVanB killTankB killMenB killMissileB killEndB suicideB stealthB jammingB scatterBombB'
    .split(' ')
    .forEach((name, index) => {
      pMap[name] = index;
    });

  return pMap;
}

const originalParams = [
  //jam sp <$  >$ cnvy tm dm np ft TK EN ms mn kcp kv kt km km ke sc st jm sctbm
  //----------------------------------------------------------------------------
  // easy
  [255, 8, 99, 200, 1, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  [511, 9, 90, 180, 2, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [511, 9, 90, 180, 2, 48, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [511, 10, 80, 160, 3, 48, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
  // medium
  [511, 10, 80, 160, 3, 48, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
  [1023, 11, 70, 140, 4, 48, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [1023, 11, 70, 140, 4, 48, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
  [1023, 12, 60, 120, 5, 48, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1],
  // hard
  [1023, 12, 60, 120, 5, 48, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1],
  [2047, 12, 50, 100, 6, 48, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1],
  // easy over
  [2047, 12, 50, 100, 6, 48, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1],
  [2047, 13, 40, 100, 7, 48, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1],
  // expert
  [2047, 13, 40, 100, 7, 48, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1],
  [2047, 13, 40, 100, 8, 48, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  // medium over
  [2047, 13, 40, 100, 8, 48, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  [4095, 14, 40, 100, 9, 48, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
  [4095, 14, 40, 100, 9, 48, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
  [4095, 14, 40, 100, 10, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  // hard over
  [4095, 14, 40, 100, 10, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [4095, 14, 40, 100, 10, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [4095, 14, 40, 100, 10, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [4095, 14, 40, 100, 10, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  // armorgeddon over
];

const demoParams = [
  [2047, 14, 40, 100, 10, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1]
];

// ridiculous: condense this repeated value to prevent "prettier" wrapping. :P
let h = 100;

const networkParams = [
  [511, 10, 60, h, 5, 20, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1],
  [511, 10, 60, h, 6, 20, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1],
  [1023, 11, 50, h, 7, 20, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1],
  [1023, 11, 50, h, 8, 20, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1],
  [2047, 12, 40, h, 9, 10, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1],
  [2047, 14, 40, h, 10, 10, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1],
  [1279, 14, 80, h, 10, 10, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [2047, 14, 30, h, 10, 10, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1],
  [2047, 14, 30, h, 10, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [2047, 14, 20, h, 10, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
  [511, 14, 60, h, 10, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [511, 14, 60, h, 10, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1]
];

function getLevelParams(paramArray, offset) {
  return unpackLevelParams(offset < 0 ? demoParams[0] : paramArray[offset]);
}

// expand 1,0,0 etc., into object with name/value pairs.
function unpackLevelParams(levelParams) {
  let unpacked = {};

  if (!paramsMap) {
    paramsMap = makeParamsMap();
  }

  Object.keys(paramsMap).forEach((key) => {
    unpacked[key] = levelParams[paramsMap[key]];
  });

  return unpacked;
}

function calculateIQ(type = 'campaign', offset = 0) {
  // CPU "IQ" for a given set of level parameters

  let o =
    type === 'tutorial'
      ? demoParams[0]
      : (type === 'campaign' ? originalParams : networkParams)[offset];

  if (!o) {
    console.warn('calculateIQ(): Could not find level', type, offset);
    return 0;
  }

  let iq = 0;

  // from original
  const MAXVELX = 14;

  // clipSpeedI
  iq += Math.floor((o[1] * 20) / MAXVELX);

  // fundMinI
  iq += Math.floor(((100 - o[2]) * 4) / 100);

  // convoyLevelI
  iq += o[4];

  // buildTruckB, buildEngineersB, useMenB, killTankB, killMenB, suicideB
  iq += (o[9] + o[10] + o[12] + o[15] + o[16] + o[19]) * 4;

  // killVanB
  iq += o[14] * 6;

  // useMissileB + killMissileB + killEndB
  iq += (o[11] + o[17] + o[18]) * 10;

  // bDumbMissiles + bNapalm + stealthB + jammingB + scatterBombB
  iq += (o[6] + o[7] + o[20] + o[21] + o[22]) * 20;

  // killcopterB
  iq += o[13] * 26;

  return iq;
}

// based on original game data
let levelConfig = {};

// based on original game UI
let levelFlags;

let flagOverrides = {
  aimedMissiles: searchParams.get('aimedMissiles'),
  jamming: !searchParams.get('noInterference'),
  stealth: searchParams.get('noStealth')
};

function parseFlags(levelName) {
  const f = flagsByLevel[gamePrefs.game_type]?.[levelName] || defaultFlags;
  return {
    bullets: flagOverrides.aimedMissiles ? 0 : f[0],
    napalm: f[1],
    stealth: flagOverrides.stealth ? 0 : f[2],
    jamming: f[3] && flagOverrides.jamming,
    fairness: f[5]
  };
}

function updateFlags(levelName) {
  levelFlags = parseFlags(levelName);
  // for now, also get config from here.
  // TODO: DRY.
  levelConfig = getLevelConfig(levelName);
}

function getDifficultyMultiplier(isNetwork) {
  let d = 0;
  // compare vs. regular, or network game prefs depending
  let gt = isNetwork ? gamePrefs.net_game_type : gameType;
  if (gt === 'hard') d = 1;
  if (gt === 'extreme') d = 2;
  if (gt === 'armorgeddon') d = 3;
  return d * 4;
}

function getLevelConfig(levelName) {
  let offset;

  offset = campaignBattles.indexOf(levelName);

  if (offset !== -1) {
    return getLevelParams(originalParams, getDifficultyMultiplier() + offset);
  }

  // network battle
  offset = networkBattles.indexOf(levelName);

  if (offset !== -1) {
    // 1:1 mapping, params do not change based on difficulty.
    return getLevelParams(networkParams, offset);
  }

  // tutorial or custom level: use default demo params.
  return getLevelParams(demoParams, 0);
}

function applyFlags() {
  utils.css.addOrRemove(
    document.body,
    !levelFlags.bullets,
    'aimed-missile-mode'
  );
}

function setCustomLevel(levelData) {
  originalLevels['Custom Level'] = levelData;
  setLevel('Custom Level');
}

function updateLevelNumber(levelName) {
  // note: only for set of original battles, not the network ones yet
  levelNumber = campaignBattles.indexOf(levelName);
}

function setLevel(levelLabel) {
  level = levelLabel;
  levelName = levelLabel;
  updateLevelNumber(levelName);
  if (level !== 'Custom Level') {
    gamePrefs.last_battle = level;
    prefsManager.writePrefsToStorage();
  }
}

// new "version 3" levelData parsing has an array of { objects }, not an array of arrays.
const groupMap = {
  l: 'left',
  n: 'neutral',
  r: 'right',
  s: 'static', // terrain items
  d: 'dynamic', // inline function
  o: 'obscured', // some landing pads
  gl: 'groundLeft', // certain turrets target ground units
  gr: 'groundRight'
};

function normalizeLevelData(data) {
  let results = [];

  // new "version 3" parsing has an array of { objects }, not an array of arrays.
  if (!data[0].length) {
    // special case
    const extraParams = {
      obscured: { obscured: true },
      groundLeft: { isEnemy: false, targetGroundUnits: true },
      groundRight: { isEnemy: true, targetGroundUnits: true }
    };

    data.forEach((entry) => {
      Object.keys(entry).forEach((group) => {
        // skip over the type itself
        if (group === 't') return;

        entry[group].forEach((item) => {
          /**
           * Special case: "dynamic" level data - where a function is run that returns results.
           * e.g., groups of turrets range from one to three depending on game difficulty.
           */
          if (item instanceof Function) {
            // flag the original level, so re-renders occur on game difficulty change
            data.hasDynamicData = true;
            item = item();
            // at this point, item is a nested array.
            // hackish: replace item[n][1], typically l|r|n etc., with full string
            item.forEach((n) => {
              if (groupMap[n[1]]) {
                n[1] = groupMap[n[1]];
              }
            });
            results = results.concat(item);
            return;
          }

          if (group === 's') {
            // static items (e.g., terrain): only two args.
            results.push([entry.t, item]);
          } else if (group === 'd') {
            data.hasDynamicData = true;
            const args = item.map((groupItem) => {
              // method, l/n/r, or X offset
              if (groupItem instanceof Function) {
                const result = groupItem();
                // might be l/n/r, or some other value
                return groupMap[result] || result;
              }
              if (groupMap[groupItem]) return groupMap[groupItem];
              return groupItem;
            });
            results.push(args);
          } else {
            const kind = groupMap[group];
            const args = [entry.t, kind, item];
            // e.g., obscured landing pad
            if (extraParams[kind]) {
              args.push(extraParams[kind]);
            }
            results.push(args);
          }
        });
      });
    });

    return results;
  }

  // "V2" level data - e,g., from level editor
  data?.forEach((item) => {
    /**
     * Special case: "dynamic" level data - where a function is run that returns results.
     * e.g., groups of turrets range from one to three depending on game difficulty.
     */

    if (item instanceof Function) {
      data.hasDynamicData = true;

      // append this array to the result.
      results = results.concat(item());
    } else {
      // check all items for "dynamic" level data via functions, too.
      const parsed = item.map((element) => {
        if (element instanceof Function) {
          // flag this level, so changing game type causes a re-render
          data.hasDynamicData = true;
          return element();
        }

        return element;
      });

      results.push(parsed);
    }
  });

  return results;
}

function shouldExcludeUnit(item) {
  if (!item?.length) return;

  // exclude "ground-targeting" turrets in certain cases.
  if (
    item[0] === 'turret' &&
    (item[1] === groupMap.gl || item[1] === groupMap.gr)
  ) {
    // for now, exclude from all levels on Boot Camp.
    if (gameType === 'easy') return true;

    /**
     * From testing original, Wargames and Conflict have these as of level 5.
     * At present, assuming all-or-nothing; it's possible that groups may be
     * reduced for conflict / wargames vs. armorgeddon, e.g., 1 turret vs. 3.
     *
     * Also unconfirmed: There is a single ground turret in level 4,
     * and only Armorgeddon remains as the one difficulty that would show it.
     */
    return levelNumber <= (gameType !== 'armorgeddon' ? 4 : 5);
  }

  /**
   * At this point, only exclude certain units from right side due to levelConfig
   * where the CPU won't be building them.
   */
  if (item[1] === 'right') {
    return (
      (item[0] === TYPES.missileLauncher && !levelConfig.buildTruckB) ||
      (item[0] === TYPES.engineer && !levelConfig.buildEngineersB)
    );
  }
}

function previewLevel(levelName, excludeVehicles) {
  // given level data, filter down and render at scale.

  if (!levelName) return;

  updateLevelNumber(levelName);

  if (!gameType) {
    // HACK: don't render preview until gameType is known, as previews depend on it.
    // (this also shouldn't happen.)
    console.warn('previewLevel(): no gameType');
    return;
  }

  let data = normalizeLevelData(originalLevels[levelName]);

  if (!data) return;

  updateFlags(levelName);

  // special case: don't draw at all if jamming, and in campaign mode.
  if (levelFlags.jamming && autoStart) return;

  // if nothing is > 4096, then it's original game data; double all values.
  let multiplier = 2;

  data.forEach((item) => {
    if (item[item.length - 1] >= 4096) {
      multiplier = 1;
    }
  });

  // get the canvas stuff ready to render.
  common.domCanvas.resize();

  game.objects.radar.reset();

  if (excludeVehicles) {
    // buildings only
    data = data.filter((item) =>
      item?.[0]?.match(
        /base|bunker|super-bunker|chain|balloon|turret|landing-pad/i
      )
    );
  } else {
    // buildings + units
    data = data.filter(
      (item) =>
        item?.[0]?.match(
          /base|bunker|super-bunker|chain|balloon|turret|landing-pad|tank|launcher|van|infantry|engineer/i
        ) && !shouldExcludeUnit(item)
    );
  }

  const initMethods = {
    base: {
      // TODO: review + remove?
      transformSprite: true
    },
    balloon: {
      data: {
        y: 32 * screenScale
      }
    }
  };

  // ensure that GUIDs start from zero, so objects line up if we're playing a network game.
  common.resetGUID();

  let lastTurretX = 0;

  data.forEach((item) => {
    // don't show landing pads that are intentionally hidden by terrain decor
    if (item[0] === TYPES.landingPad && item[3]?.obscured) return;

    // special Super Bunker case: neutral / hostile - rendering can depend on prefs.
    let hostileSB = item[0] === 'super-bunker' && item[1] === 'neutral';
    let canShowHostile = gamePrefs.super_bunker_arrows;

    // special enemy turret case
    let isEnemyGroundTurret = item[1] === groupMap.gr;
    let isGroundTurret = item[1] === groupMap.gl;

    // special ground-targeting turret cases?

    const exports = {
      data: common.inheritData(
        {
          type: item[0],
          bottomAligned: item[0] !== 'balloon',
          isOnScreen: true,
          // Special group-right turret case
          // Special SB case: show hostile as enemy only if "arrows" pref is off.
          isEnemy:
            isEnemyGroundTurret ||
            item[1] === 'right' ||
            (hostileSB && !canShowHostile),
          ...item[0].data
        },
        {
          x: item[2] * multiplier,
          y: initMethods[item[0]]?.data?.y
        }
      )
    };

    // special hostile Super Bunker case
    if (hostileSB && canShowHostile) {
      exports.data.hostile = true;
    }

    // if present, render on canvas.
    if (game.objectConstructors[item[0]]?.radarItemConfig) {
      exports.data.domCanvas = {
        radarItem: game.objectConstructors[item[0]]?.radarItemConfig(exports)
      };
    }

    const css = ['sprite', item[0]];

    // common right units, AND "ground-right" turrets.
    if (item[1] === 'right' || isEnemyGroundTurret) {
      css.push('enemy');
    }

    // angle turrets to indicate which side they're on.
    if (item[0] === TYPES.turret || isGroundTurret || isEnemyGroundTurret) {
      exports.data.angle = exports.data.isEnemy ? -33 : 33;
      // is this a "duplicate" turret, i.e., a doubling-up of the last-placed one?
      // (used typically in Midnight Oasis, and perhaps Tanker's Demise.)
      if (lastTurretX === exports.data.x) {
        exports.data.angle *= -1;
      }
      lastTurretX = exports.data.x;
    }

    if (item[0] === TYPES.landingPad) {
      exports.data.lightFrameColors = ['#ffa206', '#a30402'];
    }

    // neutral = dead turret
    if (item[0] === TYPES.turret && item[1] === 'neutral') {
      // show as grey (vs. green) on radar
      css.push('enemy');

      // and faded, etc.
      css.push('destroyed');
    }

    // if a free-floating balloon, mark as hostile.
    if (item[0] === 'balloon') {
      exports.data.hostile = true;
      // determine its direction, too.
      exports.data.facing = 0;
    }

    // if a bunker, also make a matching balloon.
    if (item[0] === 'bunker') {
      const balloonExports = {
        data: common.inheritData(
          {
            type: 'balloon',
            isOnScreen: true,
            isEnemy: exports.data.isEnemy,
            facing: exports.data.isEnemy ? -FACING : FACING
          },
          {
            x: exports.data.x,
            y: initMethods.balloon.data.y
          }
        )
      };

      // attach a stub chain
      balloonExports.objects = {
        chain: {
          data: {
            // enough to get to bottom of radar
            height: worldHeight
          }
        }
      };

      // render on canvas
      if (game.objectConstructors[TYPES.balloon]?.radarItemConfig) {
        balloonExports.data.domCanvas = {
          radarItem:
            game.objectConstructors[TYPES.balloon]?.radarItemConfig(
              balloonExports
            )
        };
      }

      game.objects.radar.addItem(balloonExports);
    }

    const radarItem = game.objects.radar.addItem(exports, css.join(' '));

    if (scanNodeTypes[item[0]]) {
      // special case: certain radar items also get a "scan range" node.
      radarItem.initScanNode();
    }
  });
}

function addWorldObjects() {
  const { addItem } = game;

  function addObject(type, options) {
    game.addObject(type, {
      ...options,
      staticID: true
    });
  }

  const defaultLevel = 'Cake Walk';

  /**
   * Original game levels
   */

  if (levelName !== 'Custom Level' && !game.objects.editor) {
    if (levelName !== 'Tutorial') {
      // left base area...
      addItem('right-arrow-sign', -16);
      addItem('tree', 505);
      addItem('right-arrow-sign', 550);

      // right base area...
      addItem('left-arrow-sign', 7700);
      addItem('left-arrow-sign', 8192 + 32);
    }
  }

  function addOriginalLevel(data) {
    // if nothing is > 4096, then it's original game data; double all values.
    let multiplier = 2;

    data.forEach((item) => {
      if (item[item.length - 1] >= 4096) {
        multiplier = 1;
      }
    });

    const landingPadNames = {
      left: 'THE LANDING PAD',
      neutral: 'THE MIDWAY',
      right: 'THE DANGER ZONE'
    };

    // if playing cooperative vs. CPU, then include CPU vehicles to start.
    // also, let custom levels include any provided vehicles.
    const excludeVehicles =
      net.active &&
      !gamePrefs.net_game_style.match(/coop/) &&
      levelName != 'Custom Level';

    const cloudCount = data.filter((item) => item[0] === TYPES.cloud).length;

    if (!cloudCount) {
      // happy little clouds!
      // all other default levels should have a bunch.
      for (var i = 0; i < 8; i++) {
        addObject(TYPES.cloud, {
          x: 2048 + 4096 * (i / 7)
        });
      }
    }

    data.forEach((item) => {
      if (shouldExcludeUnit(item)) return;

      // hackish: terrain items (and clouds) only have two params.
      if (item.length === 2) {
        if (item[0] === TYPES.cloud) {
          addObject(item[0], {
            x: item[1] * multiplier
          });
        } else {
          addItem(item[0], item[1]);
        }
        return;
      }

      const args = {
        isEnemy: item[1] === 'right',
        hostile: item[1] === 'neutral',
        x: item[2] * multiplier
      };

      // additional arguments, e.g., `{ obscured: true }`
      if (item[3]) Object.assign(args, item[3]);

      if (item[0] === TYPES.landingPad) {
        args.name = landingPadNames[item[1]];
        if (item[1] === 'neutral') {
          delete args.hostile;
          args.isMidway = true;
        }
      } else if (item[0] === TYPES.turret && item[1] === 'neutral') {
        // neutral turret = dead, DOA
        delete args.hostile;
        args.DOA = true;
      }

      // if a network game, only include CPU vehicles if playing co-op - i.e., vs. a CPU.
      if (
        excludeVehicles &&
        item[0].match(/missile|tank|van|infantry|engineer/i)
      )
        return;

      addObject(item[0], args);
    });
  }

  addOriginalLevel(
    normalizeLevelData(originalLevels[level] || originalLevels[defaultLevel])
  );
}

function selectByDifficulty(optionsArray) {
  /**
   * Given optionsArray of [1, 2, 3, 4], return the whole thing or a subset based on difficulty.
   * e.g., groups of turrets in "Midnight Oasis", in easy / hard / extreme / armorgeddon mode.
   * This will be inconsistent if there are more than four options provided.
   */

  let offsets = {
    easy: 1,
    hard: 2,
    extreme: 3,
    armorgeddon: 4
  };

  return optionsArray.splice(0, offsets[gameType] || offsets.easy);
}

originalLevels = {
  'Tutorial': tutorialLevel,
  'Cake Walk': cakeWalkLevel,
  'One-Gun': oneGunLevel,
  'Sucker Punch': suckerPunchLevel,
  'Airborne': airborneLevel,
  'Two-Gun': twoGunLevel,
  'Super Bunker': superBunkerLevel,
  'Scrapyard': scrapyardLevel,
  'Blind Spot': blindSpotLevel,
  'Wasteland': wastelandLevel,
  'Midnight Oasis': midnightOasisLevel,
  'Balloon Fun': balloonFunLevel,
  'Cavern Cobra': cavernCobraLevel,
  'Desert Sortie': desertSortieLevel,
  'First Blood': firstBloodLevel,
  'Network Mania': networkManiaLevel,
  'Rescue Raiders': rescueRaidersLevel,
  'Midpoint': midPointLevel,
  'Slithy Toves': slithyToves,
  "Tanker's Demise": tankersDemiseLevel,
  'WindStalker': windStalkerLevel,
  'Sandstorm': sandstormLevel,
  'Rainstorm': rainstormLevel
};

export {
  applyFlags,
  addWorldObjects,
  calculateIQ,
  campaignBattles,
  getDifficultyMultiplier,
  levelFlags,
  levelConfig,
  levelName,
  levelNumber,
  networkBattles,
  previewLevel,
  setCustomLevel,
  setLevel,
  updateFlags
};
