/**
 * Item Stats: energy, scoring and inventory numbers
 */

import { TYPES } from '../core/global.js';

const itemStats = {};

const itemStatsStruct = [
  // based on original
  'iHits',
  'iMass',
  'iCost',
  'iCreateScore',
  'iDieScore',
  'iKillScore',
  'iBonusScore',
  'limitI'
];

const rawItemStats = {
  [TYPES.helicopter]: [20, 25, 20, 0, -19, 50, 21, 99],
  [TYPES.smartMissile]: [25, 7, 0, 0, 0, 0, 0, 0],
  [TYPES.gunfire]: [1, 0, 0, 0, 0, 0, 0, 0],
  [TYPES.bomb]: [7, 0, 0, 0, 0, 0, 0, 0],
  [TYPES.shrapnel]: [1, 0, 0, 0, 0, 0, 0, 0],
  [TYPES.bunker]: [69, 50, 0, 0, -25, -25, 4, 0],
  [TYPES.superBunker]: [5, 55, 0, 0, -25, -25, 4, 0], // copied from bunker, originally all zeroes.
  [TYPES.turret]: [31, 75, 0, -3, 0, 50, 3, 0], // iMass = 75 added
  [TYPES.balloon]: [6, 0, 0, 0, 0, 0, 0, 0],
  [TYPES.chain]: [18, 1, 0, 0, 0, 0, 0, 0],
  [TYPES.tank]: [25, 18, 4, -5, -1, 10, 5, 15],
  [TYPES.missileLauncher]: [8, 20, 3, -2, 0, 20, 2, 6],
  [TYPES.van]: [12, 30, 2, -15, -5, 15, 15, 10],
  [TYPES.infantry]: [5, -4, 5, -1, -2, 2, 2, 30],
  [TYPES.parachuteInfantry]: [5, -4, 0, 0, -2, 2, 2, 0],
  [TYPES.endBunker]: [0, 0, 0, 0, 1, -1, 20, 0],
  [TYPES.base]: [0, 99, 0, 0, 0, 0, 0, 0]
};

// expand arrays into key/value pairs, based on original structure.
Object.keys(rawItemStats).forEach((key) => {
  // itemStats[TYPES.helicopter] = { iHits: 20, iMass: 25, ... }
  let values = {};
  // iHits = 20, etc.
  rawItemStats[key].forEach((value, i) => (values[itemStatsStruct[i]] = value));
  itemStats[key] = values;
});

export { itemStats };
