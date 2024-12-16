import { levelName, levelNumber } from '../levels/default.js';
import { itemStats } from '../levels/item-stats.js';
import { game, gameType } from './Game.js';
import { FPS, GAME_SPEED_RATIOED, TYPES } from './global.js';

// left + right teams' scores, respectively.
const scores = [0, 0];

let gameStatus;
let state = 0;

let gameTypeMap = {
  easy: 'Boot Camp',
  hard: 'Wargames',
  extreme: 'Conflict',
  armorgeddon: 'Armorgeddon'
};

let states = {
  score: () => {
    return `Score: ${getScore(game.players.local)}`;
  },
  bonus: () => {
    return `Bonus: ${scoreBonus(game.players.local)}`;
  },
  battle: () => {
    // difficulty + battle
    return `${gameTypeMap[gameType]}: ${levelName}`;
  }
};

let keys = Object.keys(states);

// how often to refresh UI
let scoreModulus = 5.5;

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

  maybeRefresh();
}

function scoreDestroy(o) {
  // e.g., a tank has been destroyed.

  // ignore anything destroyed during end sequence.
  if (game.data.battleOver) return;

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

  maybeRefresh();
}

function getScore(player) {
  // given a player (helicopter) object, return the score for the team.
  return scores[player.data.isEnemy ? 1 : 0];
}

function scoreGameOver(player) {
  // at the end of the battle, combine score and bonus.
  scores[player.data.isEnemy ? 1 : 0] += scoreBonus(player);
  dropBonusState();
}

function dropBonusState() {
  // hackish: don't show bonus once battle has ended.
  delete states.bonus;
  // update list of keys, and "roll back" one accordingly.
  keys = Object.keys(states);
  if (state > 0) {
    state--;
  }
}

function animate() {
  if (!game.data.started) return;
  // 2x for 60 FPS
  let interval = Math.floor(
    scoreModulus * FPS * (FPS / 30) * GAME_SPEED_RATIOED
  );

  if (game.objects.gameLoop.data.frameCount % interval === 0) {
    nextState();
  }
}

function nextState() {
  state++;
  if (state >= keys.length) {
    state = 0;
  }
  updateScoreUI();
}

function maybeRefresh() {
  // for case when score or bonus changes while being displayed in UI
  if (!game.data.started) return;
  if (state === 0 || state === 1) {
    updateScoreUI();
  }
}

function updateScoreUI() {
  if (!gameStatus) {
    gameStatus = document.getElementById('game-status');
  }
  gameStatus.innerText = states[keys[state]]();
}

// minimal "API" for game loop
const score = {
  animate
};

export { score, scoreCreate, scoreDestroy, scoreGameOver };
