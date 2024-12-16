import { levelNumber } from '../levels/default.js';
import { itemStats } from '../levels/item-stats.js';
import { game, gameType } from './Game.js';
import { TYPES } from './global.js';

// left + right teams' scores, respectively.
const scores = [0, 0];

// objects which involve scoring - create + die + bonus points
let scoreTypes = [
  TYPES.helicopter,
  TYPES.missileLauncher,
  TYPES.tank,
  TYPES.van,
  TYPES.infantry,
  TYPES.engineer,
  TYPES.bunker,
  TYPES.superBunker,
  TYPES.turret,
  TYPES.parachuteInfantry,
  TYPES.endBunker
];

const difficultyOffsets = {
  easy: 0, // boot camp
  hard: 1, // wargames
  extreme: 2, // conflict
  armorgeddon: 3
};

function multiplyI(i = 0) {
  return i << difficultyOffsets[gameType];
}

function scoreBonus(helicopter) {
  // given a helicopter (player), add bonus scores from friendly objects
  let bonus = 0;
  scoreTypes.forEach((type) => {
    game.objects[type].forEach((obj) => {
      if (obj.data.isEnemy !== helicopter.data.isEnemy || obj.data.hostile)
        return;
      bonus += itemStats[obj.data.type].iBonusScore || 0;
    });
  });

  // further in campaign = higher reward
  bonus += levelNumber << 6;

  // difficulty multiplier
  bonus = multiplyI(bonus);

  return bonus;
}

function scoreCreate(o) {
  // e.g., a tank has been created.
  // ignore if ineligible (i.e., gunfire.)
  let item = itemStats[o.data.type];
  if (!item?.iCreateScore) return;

  // difficulty multiplier
  let points = multiplyI(item.iCreateScore);

  // which team?
  scores[o.data.isEnemy ? 1 : 0] += points;
}

function scoreDestroy(o) {
  // e.g., a tank has been destroyed.
  if (o.data.hostile) return;

  let item = itemStats[o.data.type];
  if (!item) return;

  // ignore if no points to award
  if (item.iDieScore === 0 && item.iKillScore === 0) return;

  let thisTeam = o.data.isEnemy ? 1 : 0;
  let thatTeam = o.data.isEnemy ? 0 : 1;

  // "this" team loses points, "that" team gains - scaled by difficulty.
  scores[thisTeam] += multiplyI(item.iDieScore);
  scores[thatTeam] += multiplyI(item.iKillScore);
}

export { scoreBonus, scoreCreate, scoreDestroy };
