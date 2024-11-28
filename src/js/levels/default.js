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
  if (offset < 0) {
    return unpackLevelParams(demoParams[0]);
  }
  // calculateIQ(paramArray[offset]);
  return unpackLevelParams(paramArray[offset]);
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

function calculateIQ(o) {
  // CPU "IQ" for a given set of level parameters

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

// TODO: override when playing a custom level that might have flags specified, e.g., &fb=1&fn=0&fs=0&fj=0
const defaultFlags = [1, 0, 0, 0, 0, 0];

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

function getLevelConfig(levelName) {
  let offset;

  offset = campaignBattles.indexOf(levelName);

  let d = 0;
  if (gameType === 'hard') d = 1;
  if (gameType === 'extreme') d = 2;
  if (gameType === 'armorgeddon') d = 3;

  if (offset !== -1) {
    return getLevelParams(originalParams, d === 0 ? offset : d * 4 + offset);
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

// a few local shortcuts
const n = 'n',
  l = 'l',
  r = 'r';

originalLevels = {

  'demo 1': [
    {
      t: 'balloon',
      n: [1792, 2048, 2304]
    },
    {
      t: 'base',
      l: [96],
      r: [4084]
    },
    {
      t: 'bunker',
      l: [512, 1024, 1536],
      r: [2240, 2816, 3072]
    },
    {
      t: 'end-bunker',
      l: [12],
      r: [4084]
    },
    {
      t: 'landing-pad',
      l: [160],
      r: [4000]
    },
    {
      t: 'super-bunker',
      r: [2048]
    },
    {
      t: 'turret',
      l: [768, 1280],
      r: [2560, 3328]
    }
  ],

  'demo 2': [
    {
      t: 'balloon',
      n: [1792, 2048, 2304]
    },
    {
      t: 'base',
      l: [96],
      r: [4000]
    },
    {
      t: 'bunker',
      r: [994, 1054, 2112, 2176, 3042, 3102],
      l: [1984, 1856]
    },
    {
      t: 'end-bunker',
      l: [12],
      r: [4084]
    },
    {
      t: 'landing-pad',
      l: [160],
      r: [3936],
      n: [2048]
    },
    {
      t: 'super-bunker',
      r: [1024, 3072]
    },
    {
      t: 'turret',
      r: [984, 1084, 2304, 2560, 3032, 3132],
      l: [1536, 1792]
    }
  ],

  'demo 3': [
    {
      t: 'balloon',
      n: [1792, 2048, 2304]
    },
    {
      t: 'base',
      l: [96],
      r: [4000]
    },
    {
      t: 'bunker',
      l: [1536, 1792],
      r: [2560, 2816]
    },
    {
      t: 'end-bunker',
      l: [12],
      r: [4084]
    },
    {
      t: 'landing-pad',
      l: [160],
      r: [3936]
    },
    {
      t: 'super-bunker',
      l: [1024],
      r: [2304, 2384, 3072]
    },
    {
      t: 'turret',
      l: [256, 512, 768, 1104, 1136, 2048, 2016],
      r: [2048, 2080, 2992, 2960, 3328, 3584, 3840]
    }
  ],

  'demo 4': [
    {
      t: 'balloon',
      n: [1792, 2048, 2304]
    },
    {
      t: 'base',
      l: [96],
      r: [4000]
    },
    {
      t: 'bunker',
      l: [512, 640, 1280, 1408, 1760, 1792],
      r: [2304, 2336, 2688, 2816, 3456, 3584]
    },
    {
      t: 'end-bunker',
      l: [12],
      r: [4084]
    },
    {
      t: 'landing-pad',
      l: [160],
      r: [3936]
    },
    {
      t: 'turret',
      l: [576, 1024, 1040, 1344, 1536, 1552],
      r: [2544, 2560, 2752, 3312, 3328, 3520]
    }
  ],






  'Super Bunker': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'barb-wire',
      s: [700]
    },
    {
      t: 'bunker',
      r: [1024, 3968, 4224, 7168]
    },
    {
      t: 'cactus',
      s: [2074, 2995, 7066]
    },
    {
      t: 'checkmark-grass',
      s: [5982]
    },
    {
      t: 'cloud',
      s: [2048, 2633, 3218, 3803, 4388, 4973, 5558, 6144]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grass',
      s: [2205]
    },
    {
      t: 'gravestone',
      s: [4783]
    },
    {
      t: 'infantry',
      r: [1616, 1856, 4176, 4416, 5200, 5360, 6656, 6656]
    },
    {
      t: 'landing-pad',
      l: [320],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      r: [1936, 3296, 4096, 5520, 6976]
    },
    {
      t: 'palm-tree',
      s: [
        1760, 3862, 3892, 3961, 4356, 4531, 4551, 3453, 3398, 3327, 3405, 3073,
        4820, 4825, 4855, 4900, 4927, 5074, 5232, 5303
      ]
    },
    {
      t: 'super-bunker',
      r: [1792, 4096, 6400]
    },
    {
      t: 'tank',
      r: [1536, 1776, 4096, 4336, 4496, 4576, 5120]
    },
    {
      t: 'tree',
      s: [
        4074, 4650, 4657, 3681, 3391, 3379, 3336, 3268, 3227, 3237, 3116, 4695,
        4733, 4776, 4871, 4958, 5023, 5224, 5260, 5974, 6782
      ]
    },
    {
      t: 'turret',
      r: [1648, 1888, 6256, 6496],
      gr: [1680, 1952, 4046, 4142, 6288, 6560]
    },
    {
      t: 'van',
      r: [1986, 5730]
    }
  ],

  'Scrapyard': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      r: [1024, 1536, 2048, 3072, 4032, 4160, 5120, 6144, 7168]
    },
    {
      t: 'cactus',
      s: [1945, 2457, 5793, 6415, 7023]
    },
    {
      t: 'cactus2',
      s: [1678, 2530, 6334, 6612, 6699]
    },
    {
      t: 'cloud',
      s: [
        2048, 2048, 2048, 2633, 2633, 2633, 3218, 3218, 3218, 3803, 3803, 3803,
        4388, 4388, 4388, 4973, 4973, 4973, 5558, 5558, 5558, 6144, 6144, 6144
      ]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grave-cross',
      s: [3829, 3909, 3958, 4289, 4508]
    },
    {
      t: 'gravestone',
      s: [3858, 4022, 4175, 4294, 4321]
    },
    {
      t: 'infantry',
      r: [848, 1088, 2560, 6224, 6464]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      r: [1024, 1536, 2048, 2560, 2880, 4096]
    },
    {
      t: 'sand-dune',
      s: [2087, 2810, 4747, 5297, 5582, 7504, 7518]
    },
    {
      t: 'sand-dunes',
      s: [
        1063, 1615, 1643, 1686, 2108, 2913, 3796, 3960, 5379, 5672, 6508, 7526
      ]
    },
    {
      t: 'super-bunker',
      r: [6400, 1792]
    },
    {
      t: 'tank',
      r: [768, 1008, 1168, 1248, 6144, 6384]
    },
    {
      t: 'tree',
      s: [3518]
    },
    {
      t: 'turret',
      r: [1888, 3200, 5792, 6496],
      r: [1952, 3232, 3264, 5824, 5856, 6560]
    },
    {
      t: 'van',
      r: [958, 1123, 6594]
    }
  ],

  'Blind Spot': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'barb-wire',
      s: [3697, 6518]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      r: [3520, 4352, 5312, 5632, 5696, 6528, 6656]
    },
    {
      t: 'checkmark-grass',
      s: [3788]
    },
    {
      t: 'cloud',
      s: [2048, 2633, 3218, 3803, 4388, 4973, 5558, 6144]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'flower',
      s: [3604]
    },
    {
      t: 'flower-bush',
      s: [1031, 1828, 3921]
    },
    {
      t: 'grave-cross',
      s: [1235, 6191, 6462, 6574]
    },
    {
      t: 'gravestone',
      s: [4976]
    },
    {
      t: 'infantry',
      r: [1104, 1264, 2560, 6224, 6464, 6656, 7248, 7488]
    },
    {
      t: 'landing-pad',
      l: [320],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      r: [1024, 1424, 2880, 6544]
    },
    {
      t: 'palm-tree',
      s: [
        734, 976, 2452, 3016, 3106, 3504, 4072, 4106, 4842, 5506, 5697, 6182,
        6413, 6872, 7308, 7599
      ]
    },
    {
      t: 'rock',
      s: [6933]
    },
    {
      t: 'super-bunker',
      r: [1792, 6400]
    },
    {
      t: 'tank',
      r: [1024, 6144, 6384, 7171, 7408, 7568, 7648]
    },
    {
      t: 'tree',
      s: [
        1606, 1590, 2060, 2733, 3301, 3689, 4073, 4729, 4846, 5029, 5075, 5443,
        6111
      ]
    },
    {
      t: 'turret',
      r: [1888, 3584, 5376, 6496, 7168],
      gr: [1976, 3616, 5408, 6560, 7200]
    },
    {
      t: 'van',
      r: [1634, 6594]
    }
  ],

  'Wasteland': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      r: [640, 1152, 3200, 3968, 4224, 5248, 6656, 6784]
    },
    {
      t: 'cactus',
      s: [4308, 7227, 1294]
    },
    {
      t: 'cactus2',
      s: [3371, 5068, 6338, 6862, 7416, 7427, 883]
    },
    {
      t: 'checkmark-grass',
      s: [4219]
    },
    {
      t: 'cloud',
      s: [
        2048, 2048, 2633, 2633, 3218, 3218, 3803, 3803, 4388, 4388, 4973, 4973,
        5558, 5558, 6144, 6144
      ]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grave-cross',
      s: [3662, 4178, 4643, 4836, 5172, 5763, 6803, 7270, 7663, 871, 1254]
    },
    {
      t: 'gravestone',
      s: [
        2542, 1676, 3345, 4191, 4611, 5011, 5150, 5250, 5335, 5530, 5620, 5819,
        6085, 6915, 7115, 7524
      ]
    },
    {
      t: 'infantry',
      r: [1360, 1600, 1616, 1776, 2560, 2800, 3040, 3663, 3904]
    },
    {
      t: 'landing-pad',
      l: [320],
      n: [4092],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      r: [1680, 1936, 2880, 3984]
    },
    {
      t: 'sand-dune',
      s: [3629, 4178, 4715]
    },
    {
      t: 'sand-dunes',
      s: [2618, 3814, 6126]
    },
    {
      t: 'super-bunker',
      r: [1792, 6400]
    },
    {
      t: 'tank',
      r: [1280, 1520, 1536, 2720, 2960, 3120, 3200, 3584, 3824]
    },
    {
      t: 'turret',
      r: [960, 1888, 6496],
      gr: [992, 1952, 6560, 7296]
    },
    {
      t: 'van',
      r: [1730, 2146, 4034]
    }
  ],

  'Midnight Oasis': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      r: [2688, 3328, 4000, 5120, 5504]
    },
    {
      t: 'cloud',
      s: [2048, 2633, 3218, 3803, 4388, 4973, 5558, 6144]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'flower',
      s: [2984]
    },
    {
      t: 'flower-bush',
      s: [4082, 4128, 6608]
    },
    {
      t: 'flowers',
      s: [4095]
    },
    {
      t: 'grass',
      s: [4103]
    },
    {
      t: 'grave-cross',
      s: [5219]
    },
    {
      t: 'infantry',
      r: [784, 848, 1024, 1088, 1616, 1776, 2560, 2800, 3040, 3904, 4096]
    },
    {
      t: 'landing-pad',
      l: [320],
      // o = obscured: hidden from radar by shrubbery and whatnot
      o: [4096],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      r: [1168, 1936, 3984, 4416]
    },
    {
      t: 'palm-tree',
      s: [6702, 7695]
    },
    {
      t: 'rock',
      s: [996, 4182, 4161]
    },
    {
      t: 'rock2',
      s: [4153]
    },
    {
      t: 'sand-dunes',
      s: [7635]
    },
    {
      t: 'super-bunker',
      r: [1792, 4608, 6400]
    },
    {
      t: 'tank',
      r: [
        704, 768, 944, 1008, 1104, 1184, 1536, 2720, 2960, 3120, 3200, 3584,
        3664
      ]
    },
    {
      t: 'tree',
      s: [4206, 5144]
    },
    {
      t: 'turret',
      // note: intentional duplicates, here: there are two turrets at the same coordinates here.
      r: [1888, 4224, 4704, 4704, 5248, 5632, 6496],
      gr: [
        1920, 1952, 4256, 4288, 4736, 4736, 4768, 4768, 5280, 5312, 5664, 5696,
        6528, 6560
      ]
    },
    {
      t: 'van',
      r: [1218, 2146, 4034]
    }
  ],

  'Balloon Fun': [
    {
      t: 'balloon',
      n: [
        3084, 3136, 3189, 3241, 3294, 3346, 3399, 3451, 3504, 3556, 3609, 3661,
        3714, 3766, 3819, 3871, 3924, 3976, 4029, 4081, 4134, 4186, 4239, 4291,
        4344, 4396, 4449, 4501, 4554, 4606, 4659, 4711, 4764, 4816, 4869, 4921,
        4974, 5026, 5079
      ]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'cactus2',
      s: [6288]
    },
    {
      t: 'checkmark-grass',
      s: [5758]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grass',
      s: [1523, 4890]
    },
    {
      t: 'grave-cross',
      s: [6412, 7138]
    },
    {
      t: 'gravestone',
      s: [7134]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [
        1223, 3118, 3197, 3486, 3682, 3833, 3863, 3885, 3931, 4057, 4311, 4374,
        4472, 4489, 4510, 4520, 4853, 4917, 5216, 6797
      ]
    },
    {
      t: 'sand-dune',
      s: [3920]
    },
    {
      t: 'sand-dunes',
      s: [2621, 4615, 4918]
    },
    {
      t: 'super-bunker',
      l: [3968],
      r: [4224]
    },
    {
      t: 'tree',
      s: [
        2919, 2959, 3573, 3914, 4196, 4210, 4279, 4320, 4382, 4618, 4648, 4778,
        4816, 4934, 5054, 5110, 5116, 5151
      ]
    },
    {
      t: 'turret',
      l: [1024, 1088, 1152, 2048, 2112, 2176],
      r: [6144, 6080, 6016, 7104, 7168, 7040]
    },
    {
      t: 'balloon',
      d: [
        ...(() => {
          /* 36 - not 99 - more balloons needed; distribute evenly across middle 3/4 of battlefield. */
          let luftBalloons = new Array(39);
          for (let i = 0, j = luftBalloons.length; i < j; i++) {
            luftBalloons[i] = [
              'balloon',
              n,
              3084 + parseInt((2048 * i) / j, 10)
            ];
          }
          return luftBalloons;
        })()
      ]
    }
  ],

  'Cavern Cobra': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [1024, 1280, 2560, 2816, 3520, 3584],
      r: [4608, 4672, 5376, 5632, 6912, 7168]
    },
    {
      t: 'cactus2',
      s: [6291]
    },
    {
      t: 'checkmark-grass',
      s: [5771]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grass',
      s: [1535, 4875]
    },
    {
      t: 'grave-cross',
      s: [6415]
    },
    {
      t: 'gravestone',
      s: [7155]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [
        1238, 3121, 3192, 3507, 3708, 3833, 3868, 3889, 3950, 4061, 4305, 4369,
        4454, 4470, 4490, 4497, 4845, 4902, 5189, 6814
      ]
    },
    {
      t: 'sand-dune',
      s: [3940]
    },
    {
      t: 'sand-dunes',
      s: [2631, 4607, 4901]
    },
    {
      t: 'tree',
      s: [
        2931, 2972, 3591, 3931, 4185, 4201, 4269, 4312, 4375, 4604, 4769, 4810,
        4917, 5018, 5077, 5083, 5125
      ]
    },
    {
      t: 'turret',
      l: [1152, 2080, 2688, 3104],
      r: [5120, 5504, 6656, 7040],
      gl: [2048, 3072],
      gr: [5088, 6624]
    }
  ],

  'Desert Sortie': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [1024, 2048, 3072],
      r: [4480, 5632, 6144]
    },
    {
      t: 'cactus',
      s: [1716, 1778, 2092, 5991]
    },
    {
      t: 'cactus2',
      s: [1815, 6030, 6307, 6319, 6437]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grave-cross',
      s: [3758, 3783, 3815, 4263, 4347, 4389, 4403, 4445, 4461]
    },
    {
      t: 'gravestone',
      s: [3754, 4206, 4343, 4385, 4440, 7155]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'sand-dune',
      s: [709, 1604, 1867, 2070, 2750, 3198, 3927, 4364, 4838, 5920, 6872, 7322]
    },
    {
      t: 'sand-dunes',
      s: [498, 2584, 4590, 4793, 4921, 6708, 7038]
    },
    {
      t: 'super-bunker',
      n: [4096]
    },
    {
      t: 'tree',
      s: [4212]
    },
    {
      t: 'turret',
      l: [1536, 2560],
      r: [5120, 6656]
    }
  ],

  'First Blood': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'barb-wire',
      s: [5207]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [640, 1152, 1280],
      r: [3968, 4032, 4224, 6144, 6208, 7040]
    },
    {
      t: 'checkmark-grass',
      s: [1207, 4200]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'flower',
      s: [2371, 7549]
    },
    {
      t: 'flowers',
      s: [1427]
    },
    {
      t: 'grave-cross',
      s: [2685, 4971, 5282, 7034, 7149]
    },
    {
      t: 'gravestone',
      s: [2681, 7031, 7145]
    },
    {
      t: 'infantry',
      r: [4816, 5056, 6864, 7104]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      r: [7184]
    },
    {
      t: 'palm-tree',
      s: [
        719, 1633, 1868, 2088, 2099, 2795, 3219, 3872, 3919, 4377, 4497, 4855,
        5942, 6245, 6884, 7347
      ]
    },
    {
      t: 'rock',
      s: [1283]
    },
    {
      t: 'rock2',
      s: [1783]
    },
    {
      t: 'super-bunker',
      r: [1744, 6352]
    },
    {
      t: 'tank',
      r: [4736, 4976, 5136, 5216, 6784, 7024]
    },
    {
      t: 'tree',
      s: [
        498, 2636, 2983, 4270, 4614, 4816, 5108, 5141, 6022, 6340, 6738, 6800,
        7359
      ]
    },
    {
      t: 'turret',
      l: [512],
      r: [1840, 4096, 6448],
      gl: [512],
      gr: [1904, 4128, 6512]
    },
    {
      t: 'van',
      r: [7234, 7680, 7744]
    }
  ],

  'Network Mania': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      r: [1024, 3968, 4224, 7168]
    },
    {
      t: 'cactus2',
      s: [6289]
    },
    {
      t: 'checkmark-grass',
      s: [5770]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grass',
      s: [1542, 4893]
    },
    {
      t: 'gravestone',
      s: [7151]
    },
    {
      t: 'infantry',
      r: [1616, 1856, 4176, 4416, 5200, 5360, 6656, 6656]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      r: [1936, 3296, 4096, 5520, 6976]
    },
    {
      t: 'palm-tree',
      s: [
        1244, 3091, 3177, 3479, 3689, 3813, 3850, 3880, 3928, 4054, 4315, 4467,
        4483, 4502, 4515, 4865, 4922, 5225, 6822
      ]
    },
    {
      t: 'sand-dune',
      s: [3912]
    },
    {
      t: 'sand-dunes',
      s: [2588, 4607, 4922]
    },
    {
      t: 'super-bunker',
      r: [1792, 4096, 6400]
    },
    {
      t: 'tank',
      r: [1536, 1776, 4096, 4336, 4496, 4576, 5120]
    },
    {
      t: 'tree',
      s: [
        2892, 2934, 3567, 3908, 4185, 4199, 4268, 4322, 4605, 4637, 4774, 4819,
        4936, 5063, 5125, 5132, 5173
      ]
    },
    {
      t: 'turret',
      r: [1648, 1888, 6256, 6496],
      gr: [1680, 1952, 4046, 4142, 6288, 6560]
    },
    {
      t: 'van',
      r: [1986, 5730]
    }
  ],

  'Rescue Raiders': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [3072, 3584],
      r: [5120, 5632]
    },
    {
      t: 'cactus',
      s: [1026, 2655, 6997, 7136]
    },
    {
      t: 'cactus2',
      s: [1932, 1946, 2719, 4971, 5288, 7569]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grave-cross',
      s: [
        506, 699, 1115, 1892, 2087, 2097, 2619, 2784, 2994, 3228, 3888, 3936,
        4248, 4294, 4294, 4314, 4413, 4527, 4623, 4829, 4864, 5120, 5918, 6014,
        6267, 6370, 6740, 6807, 6884, 7031, 7315, 7334
      ]
    },
    {
      t: 'gravestone',
      s: [
        501, 2616, 2991, 4290, 4618, 4825, 5116, 6011, 6366, 6735, 6803, 7027,
        7330
      ]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'sand-dune',
      s: [3083, 3242]
    },
    {
      t: 'sand-dunes',
      s: [3559, 4150, 5685]
    },
    {
      t: 'super-bunker',
      l: [2048],
      n: [4608, 4768],
      r: [6144]
    },
    {
      t: 'turret',
      l: [512, 1024, 1536, 2208, 4032, 4096],
      r: [4096, 4160, 5920, 5984, 6656, 7168, 7680],
      gl: [2272],
      gr: [5920]
    }
  ],

  'Midpoint': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [2720, 5472]
    },
    {
      t: 'cactus2',
      s: [6296]
    },
    {
      t: 'checkmark-grass',
      s: [5779]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grass',
      s: [2028, 4885]
    },
    {
      t: 'grave-cross',
      s: [6425, 7141]
    },
    {
      t: 'gravestone',
      s: [7137]
    },
    {
      t: 'landing-pad',
      n: [320, 4066],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [
        1726, 3116, 3205, 3516, 3725, 3818, 3856, 3882, 3929, 4037, 4292, 4346,
        4432, 4451, 4471, 4478, 4831, 4919, 5196, 6807
      ]
    },
    {
      t: 'sand-dune',
      s: [3918]
    },
    {
      t: 'sand-dunes',
      s: [2636, 4594, 4917]
    },
    {
      t: 'super-bunker',
      r: [2560, 5632]
    },
    {
      t: 'tree',
      s: [
        2937, 2977, 3611, 3912, 4169, 4187, 4249, 4300, 4355, 4590, 4626, 4756,
        4795, 4932, 5032, 5084, 5091, 5128
      ]
    },
    {
      t: 'turret',
      l: [512, 576, 4160, 4192],
      r: [4000, 4032, 7616, 7680],
      gr: [3072, 3136, 5056, 5120]
    }
  ],

  'Slithy Toves': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [1024, 2048, 3072],
      r: [3840, 4352, 5120, 6144, 7168]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'flower',
      s: [1955, 3554]
    },
    {
      t: 'flower-bush',
      s: [3595, 6602]
    },
    {
      t: 'flowers',
      s: [3564]
    },
    {
      t: 'grass',
      s: [3551]
    },
    {
      t: 'grave-cross',
      s: [4443, 5213]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [907, 6706, 7657]
    },
    {
      t: 'rock',
      s: [973, 3644, 3664]
    },
    {
      t: 'rock2',
      s: [3636]
    },
    {
      t: 'sand-dunes',
      s: [7599]
    },
    {
      t: 'tree',
      s: [3687, 4377, 5144]
    },
    {
      t: 'turret',
      l: [1536, 2560],
      r: [5632, 6656]
    }
  ],

  "Tanker's Demise": [
    {
      t: 'balloon',
      l: [3584, 3584, 3584, 4096, 4096, 4096, 4608, 4608, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [3584, 3712],
      r: [4544, 4608]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'flower',
      s: [2981, 4086]
    },
    {
      t: 'flower-bush',
      s: [4130, 6603]
    },
    {
      t: 'flowers',
      s: [4096]
    },
    {
      t: 'grass',
      s: [4079, 4106]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [914, 6706, 7734]
    },
    {
      t: 'rock',
      s: [995, 4164, 4185]
    },
    {
      t: 'rock2',
      s: [4156]
    },
    {
      t: 'sand-dunes',
      s: [7673]
    },
    {
      t: 'super-bunker',
      l: [512, 588, 2536, 4000],
      r: [4200, 5608, 7034, 7114]
    },
    {
      t: 'tree',
      s: [4205]
    },
    {
      t: 'turret',
      l: [582, 582, 2056, 2532, 2588, 4136],
      r: [4116, 4148, 5604, 5660, 6144, 7098, 7098],
      gl: [2088, 2112, 4136, 4168],
      gr: [4146, 6176, 6208]
    }
  ],

  'WindStalker': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'barb-wire',
      s: [575, 3398, 4195, 4906]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      r: [1992, 2118, 4224, 4352, 6090, 6212],
      l: [3828, 3968]
    },
    {
      t: 'cactus',
      s: [638, 6281, 7047]
    },
    {
      t: 'cactus2',
      s: [2783, 2865, 4583, 4866, 5354, 5683, 5924]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'flower',
      s: [2978, 6329]
    },
    {
      t: 'flower-bush',
      s: [6806, 7012]
    },
    {
      t: 'grave-cross',
      s: [824, 2103, 4242, 4297, 6888]
    },
    {
      t: 'gravestone',
      s: [820, 2098]
    },
    {
      t: 'landing-pad',
      n: [320, 4096],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [1183, 1318, 1645, 2721, 4943, 6253, 7595]
    },
    {
      t: 'rock2',
      s: [3117, 7549]
    },
    {
      t: 'sand-dune',
      s: [3786, 4765, 7562]
    },
    {
      t: 'super-bunker',
      r: [2048, 6144]
    },
    {
      t: 'tree',
      s: [1293, 2844, 4824, 5336, 6737, 7602]
    },
    {
      t: 'turret',
      r: [1968, 2168, 4608, 5120, 6064, 6264],
      l: [3072, 3584]
    }
  ],

  'Sandstorm': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'cactus',
      s: [1752, 2347, 2974, 4128, 5582, 5891, 6360, 6928, 7114]
    },
    {
      t: 'cactus2',
      s: [1262, 1424, 2057, 3722, 4338, 5805]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grave-cross',
      s: [1533, 1890, 1904, 2654, 2720, 4826, 5140, 6594, 6717, 7164]
    },
    {
      t: 'gravestone',
      s: [1530, 2650, 6590, 6713]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'sand-dune',
      s: [
        712, 1589, 1836, 2051, 2752, 3182, 3753, 4199, 4702, 4991, 5459, 6438,
        6892
      ]
    },
    {
      t: 'sand-dunes',
      s: [491, 2578, 4439, 4656, 4943, 6269, 6604]
    }
  ],

  'Rainstorm': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [4735]
    },
    {
      t: 'tree',
      s: [1299, 3941, 6991, 7109]
    }
  ]
  'Tutorial': tutorialLevel,
  'Cake Walk': cakeWalkLevel,
  'One-Gun': oneGunLevel,
  'Sucker Punch': suckerPunchLevel,
  'Airborne': airborneLevel,
  'Two-Gun': twoGunLevel,
};

export {
  applyFlags,
  addWorldObjects,
  campaignBattles,
  levelFlags,
  levelConfig,
  levelName,
  levelNumber,
  previewLevel,
  setCustomLevel,
  setLevel,
  updateFlags
};
