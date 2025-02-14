/**
 * Game reporting bits, for webhooks etc.
 */

import { levelName } from '../levels/default.js';
import { AlignmentEnum, AsciiTable3 } from '../lib/ascii-table3/ascii-table3.js';
import { gamepad } from '../UI/gamepad.js';
import { gamePrefs } from '../UI/preferences.js';
import { game } from './Game.js';
import { DEFAULT_FUNDS, FPS, gameTypeEmoji, TYPES } from './global.js';
import { countFriendly } from './logic.js';
import { getScore } from './scores.js';

function getGameDuration() {
  let gld = game.objects.gameLoop.data;

  // elapsed time in game
  let frames = gld.frameCount - gld.gameStartFrameCount;
  let sec = frames / FPS;

  let hours = Math.floor(sec / 3600);
  let minutes = Math.floor((sec - hours * 3600) / 60);
  let seconds = Math.floor(sec - hours * 3600 - minutes * 60);

  let time = [minutes, seconds].map((v) => {
    // leading zero
    if (v < 10) return `0${v}`;
    // for consistency, stringify.
    return v.toString();
  });

  // prepend hours, as applicable
  if (hours) {
    time.unshift(hours.toString());
  }

  // hh:mm:ss
  return time.join(':');
}

function getMTVIE(enemySide) {
  let key = enemySide ? 'enemy' : 'player';
  // TODO: sort out what happens when you are playing as the enemy in the network case. :X
  let yourData = game.objects.stats.data.player;
  let theirData = game.objects.stats.data.enemy;
  let results = ['missile-launcher', 'tank', 'van', 'infantry', 'engineer'].map(
    (item) => {
      // created / destroyed
      return `${item.charAt(0).toUpperCase()}:(${yourData.created[item]}/${yourData.destroyed[item]}, ${theirData.created[item]}/${theirData.destroyed[item]})`;
    }
  );
  return results.join(' ');
}

function formatForWebhook(style) {
  let styleMap = {
    default: 'unicode-round',
    discord: 'unicode-round',
    slack: 'compact'
  };

  let tableStyle = styleMap[style] || styleMap.default;

  let yourData = game.objects.stats.data.player;
  let theirData = game.objects.stats.data.enemy;

  let units = ['missile-launcher', 'tank', 'van', 'infantry', 'engineer'];

  let yourUnits = units.map(
    (item) => `${yourData.created[item]} ${-yourData.destroyed[item]}`
  );

  let theirUnits = units.map(
    (item) => `${theirData.created[item]} ${-theirData.destroyed[item]}`
  );

  // helicopter purchases and losses
  yourUnits.unshift(
    `${game.players.local.data.livesPurchased} ${-game.players.local.data.livesLost}`
  );

  theirUnits.unshift(
    `${getEnemyChoppersPurchased()} ${-getEnemyChoppersLost()}`
  );

  let tableData = {
    heading: ['Team', 'H', 'ML', 'Tank', 'Van', 'Inf', 'Eng'],
    rows: [yourUnits, theirUnits]
  };

  const table = new AsciiTable3('Units ordered + lost')
    .setHeading(...tableData.heading)
    .setAlignLeft(1)
    .addRowMatrix(tableData.rows);

  table.setStyle(tableStyle);

  function sp(val) {
    // guard against integers, etc.
    return val.toString().split(' ');
  }

  let vTableHeaders = ['Unit', 'L+', 'L-', 'R+', 'R-'];

  const vTable = new AsciiTable3('Orders + Losses')
    .setHeading(...vTableHeaders)
    .setHeadingAlign(AlignmentEnum.CENTER)
    .setAlignLeft(1);

  ['Heli', 'ML', 'Tank', 'Van', 'Inf', 'Eng'].forEach((title, i) => {
    vTable.addRow(title, ...sp(yourUnits[i]), ...sp(theirUnits[i]));
  });

  vTable.setStyle(tableStyle);

  // team label
  yourUnits.unshift('Left');
  theirUnits.unshift('Right');

  let destroyedBunkers =
    game.objects.stats.data.enemy.destroyed.bunker +
    game.objects.stats.data.player.destroyed.bunker;

  let structureStats = `⛳ Bunkers: ${countFriendly(TYPES.bunker)}/${game.objects[TYPES.bunker].length - destroyedBunkers}`;

  if (destroyedBunkers) {
    structureStats += ` (${destroyedBunkers} destroyed)`;
  }

  if (game.objects[TYPES.superBunker].length) {
    structureStats += `\n⛳ Super Bunkers: ${countFriendly(TYPES.superBunker)}/${game.objects[TYPES.superBunker].length}`;
  }

  if (game.objects[TYPES.turret].length) {
    let deadTurrets = game.objects[TYPES.turret].filter(
      (t) => t.data.dead
    ).length;
    structureStats +=
      `\n📡 Turrets: ${countFriendly(TYPES.turret)}/${game.objects[TYPES.turret].length}` +
      (deadTurrets ? ` (${deadTurrets} dead)` : ``);
  }

  let endBunker =
    game.objects[TYPES.endBunker][game.players.local.data.isEnemy ? 1 : 0].data;

  let { fundsLost, fundsCaptured, fundsSpent, fundsEarned } = endBunker;

  let fundsStats = `💰 Funds: +${fundsEarned}, ${-fundsSpent} 🚚 of ${DEFAULT_FUNDS + fundsEarned - fundsLost + fundsCaptured} 🏦`;

  if (fundsLost) {
    fundsStats += `, ${-fundsLost} 💸`;
  }

  if (fundsCaptured) {
    fundsStats += `, +${fundsCaptured} 🏴‍☠️`;
  }

  let backticks = '```';

  let difficultyMap = {
    tutorial: 1,
    easy: 1,
    hard: 2,
    extreme: 3,
    armorgeddon: 4
  };

  let gameTypeMap = {
    tutorial: 'tutorial',
    easy: 'Boot Camp',
    hard: 'Wargames',
    extreme: 'Conflict',
    armorgeddon: 'Armorgeddon'
  };

  let won = game.data.youWon;

  let decor;

  if (!won) {
    decor = ' ☠️ ';
  } else {
    decor = ' ' + '🎖️'.repeat(difficultyMap[gamePrefs.game_type] || 1) + ' ';
  }

  let header =
    `🚁 ${won ? '🎉' : '🪦'} Battle ${won ? 'won' : 'lost'}: ${levelName}, ${gameTypeMap[gamePrefs.game_type]} ${gameTypeEmoji[gamePrefs.game_type]}${decor}`.trim();

  let debugInfo = [];

  if (gamepad.data.active) {
    let gpData = gamepad.scanGamepads();
    if (gpData?.length) {
      let gpReport = [];
      gpData.forEach((gp) => {
        if (!gp.supported || !gp.inUse) return;
        gpReport.push(`${gp.prettyLabel}, ${gp.isStandard ? 'standard' : 'remapped'}`);
      });
      if (gpReport.length) {
        debugInfo.push(`🎮 ${gpReport.join('\n')}`);
      }
    }
  }

  if (gamePrefs.bnb) {
    debugInfo.push(`🎸🤘🕹️ Now playing: ${game.data.isBeavis ? 'Beavis' : 'Butt-Head'}`);
  }

  debugInfo.push(`📺 Avg FPS: ${game.objects.gameLoop.data.fpsAverage} / ${gamePrefs.game_fps}` + (gamePrefs.game_speed != 1 ? `, ${gamePrefs.game_speed}x speed` : ''));

  let report = [
    backticks,
    header + '\n \n',
    `⏱️ Duration: ${getGameDuration()}\n`,
    `📈 Score: ${getScore(game.players.local)}\n`,
    `${fundsStats}\n`,
    `${structureStats}\n`,
    debugInfo.join('\n') + '\n',
    `${vTable.toString()}\n`,
    backticks
  ].join('');

  // hack: drop any double-newlines introduced from above
  report = report.replace(/\n\n/gi, '\n');

  console.log(report);

  return report;
}

function getEnemyChoppersPurchased() {
  let isEnemy = game.players.local.data.isEnemy;
  let purchased = 0;
  game.objects.helicopter.forEach((chopper) => {
    // don't count own team
    if (chopper.data.isEnemy === isEnemy) return;
    purchased += chopper.data.livesPurchased;
  });
  return purchased;
}

function getEnemyChoppersLost() {
  let isEnemy = game.players.local.data.isEnemy;
  let lost = 0;
  game.objects.helicopter.forEach((chopper) => {
    // don't count own team
    if (chopper.data.isEnemy === isEnemy) return;
    lost += chopper.data.livesLost;
  });
  return lost;
}

function postToService(service) {
  fetch('/events/hook/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      service,
      msg: formatForWebhook(service)
    })
  });
}

export { getGameDuration, getMTVIE, getEnemyChoppersLost, postToService };