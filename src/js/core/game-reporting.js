/**
 * Game reporting bits, for webhooks etc.
 */

import { levelName } from '../levels/default.js';
import {
  AlignmentEnum,
  AsciiTable3
} from '../lib/ascii-table3/ascii-table3.js';
import { gamepad } from '../UI/gamepad.js';
import { gamePrefs } from '../UI/preferences.js';
import { common } from './common.js';
import { game } from './Game.js';
import {
  DEFAULT_FUNDS,
  FPS,
  gameTypeEmoji,
  isMobile,
  TYPES
} from './global.js';
import { countFriendly } from './logic.js';
import { getScore } from './scores.js';
import { utils } from './utils.js';

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

function copy(aObject) {
  // guard
  if (!aObject) return aObject;

  let bObject = Array.isArray(aObject) ? [] : {};

  for (const key in aObject) {
    // Prevent self-references to parent object
    if (Object.is(aObject[key], aObject)) continue;

    // don't copy functions.
    if (aObject[key] instanceof Function) continue;

    // don't copy DOM nodes.
    if (aObject[key]?.nodeType >= 0) continue;

    // don't copy references to other objects.
    if (
      key === 'parent' ||
      key === 'oParent' ||
      key === 'objects' ||
      key === 'target' ||
      key === 'attacker'
    )
      continue;

    bObject[key] =
      typeof aObject[key] === 'object' ? copy(aObject[key]) : aObject[key];
  }

  return bObject;
}

let dataCache;

function freezeStats() {
  // only do this once.
  if (dataCache) return;
  dataCache = {
    players: copy(game.players),
    objects: copy(game.objects),
    extra: {
      friendlyBunkers: countFriendly(TYPES.bunker),
      friendlySuperBunkers: countFriendly(TYPES.superBunker),
      friendlyTurrets: countFriendly(TYPES.turret),
      duration: getGameDuration(),
      score: getScore(game.players.local)
    }
  };
}

function getDataCache() {
  /**
   * "Freeze" a copy of game objects for reporting.
   * This shouldn't be necessary, but the game sort of continues after
   * the end sequence - so it's safest to make a copy of game state.
   */
  if (!dataCache) {
    freezeStats();
  }

  return dataCache;
}

function formatForWebhook(style, options = {}) {
  let dc = getDataCache();

  let styleMap = {
    html: 'ramac',
    notification: 'unicode-round',
    default: 'unicode-round',
    discord: 'unicode-round',
    slack: 'compact'
  };

  let isHTML = style === 'html';

  let tableStyle = styleMap[style] || styleMap.default;

  let yourData = dc.objects.stats.data.player;
  let theirData = dc.objects.stats.data.enemy;

  let units = ['missile-launcher', 'tank', 'van', 'infantry', 'engineer'];

  let yourUnits = units.map(
    (item) => `${yourData.created[item]} ${-yourData.destroyed[item]}`
  );

  let theirUnits = units.map(
    (item) => `${theirData.created[item]} ${-theirData.destroyed[item]}`
  );

  // helicopter purchases and losses
  yourUnits.unshift(
    `${dc.players.local.data.livesPurchased} ${-dc.players.local.data.livesLost}`
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

  function li(s) {
    if (!s?.length) return '';
    if (!isHTML) return s;
    return `<li>${s}</li>`;
  }

  function nowrap(s) {
    if (!s?.length) return '';
    if (!isHTML) return s;
    return `<span style="white-space: nowrap">${s}</span>`;
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
    dc.objects.stats.data.enemy.destroyed.bunker +
    dc.objects.stats.data.player.destroyed.bunker;

  let bunkerString = `⛳ Bunkers: ${dc.extra.friendlyBunkers}/${dc.objects[TYPES.bunker].length - destroyedBunkers}`;
  if (destroyedBunkers) bunkerString += ` (${destroyedBunkers} destroyed)`;

  let structureStats = [bunkerString];

  if (dc.objects[TYPES.superBunker].length) {
    structureStats.push(
      `⛳ Super Bunkers: ${dc.extra.friendlySuperBunkers}/${dc.objects[TYPES.superBunker].length}`
    );
  }

  if (dc.objects[TYPES.turret].length) {
    let deadTurrets = dc.objects[TYPES.turret].filter(
      (t) => t.data.dead
    ).length;
    structureStats.push(
      `📡 Turrets: ${dc.extra.friendlyTurrets}/${dc.objects[TYPES.turret].length}` +
        (deadTurrets ? ` (${deadTurrets} dead)` : ``)
    );
  }

  let endBunker =
    dc.objects[TYPES.endBunker][dc.players.local.data.isEnemy ? 1 : 0].data;

  let { fundsLost, fundsCaptured, fundsSpent, fundsEarned } = endBunker;

  let fundsStats = `💰 Funds: ${fundsSpent} 📦 of ${DEFAULT_FUNDS + fundsEarned - fundsLost + fundsCaptured} 🏦`;

  let lostOrCaptured = [];

  if (fundsLost) {
    lostOrCaptured.push(', ' + nowrap(`${-fundsLost} 💸`));
  }

  if (fundsCaptured) {
    lostOrCaptured.push(', ' + nowrap(`+${fundsCaptured} 🏴‍☠️`));
  }

  fundsStats += lostOrCaptured.join('');

  let markerTypes = {
    backticks: {
      start: '```',
      end: '```'
    },
    code: {
      start: '<code>',
      end: '</code>'
    }
  };

  let markers = !isHTML ? markerTypes.backticks : null;

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

  // "out of lives" vs. "lost battle"
  let isDefeat = !won && !common.unlimitedLivesMode();

  let preamble = !isHTML ? `🚁 ${won ? '🎉' : isDefeat ? '🪦' : '🏳️'} ` : '';

  let battleStatus = !isHTML
    ? isDefeat
      ? 'Defeat (all choppers lost): '
      : `Battle ${won ? 'won' : 'lost'}: `
    : '';

  let difficulty = `${gameTypeMap[gamePrefs.game_type]} ${gameTypeEmoji[gamePrefs.game_type]}`;

  let header = isHTML
    ? `Difficulty: ${difficulty}`
    : `${preamble}${battleStatus}${levelName}, ${difficulty}${decor}`.trim();

  let debugInfo = [];

  if (gamepad.data.active) {
    let gpData = gamepad.scanGamepads();
    if (gpData?.length) {
      let gpReport = [];
      gpData.forEach((gp) => {
        if (!gp.supported || !gp.inUse) return;
        gpReport.push(
          `${gp.prettyLabel}, ${gp.isStandard ? 'standard' : 'remapped'}`
        );
      });
      if (gpReport.length) {
        debugInfo.push(`🎮 ${gpReport.join('\n')}`);
      }
    }
  }

  if (gamePrefs.bnb) {
    debugInfo.push(
      `🎸🤘🕹️ Now playing: ${game.data.isBeavis ? 'Beavis' : 'Butt-Head'}`
    );
  }

  debugInfo.push(
    `📺 Avg FPS: ${dc.objects.gameLoop.data.fpsAverage} / ${gamePrefs.game_fps}` +
      (gamePrefs.game_speed != 1
        ? `, ${gamePrefs.game_speed * 100}% speed`
        : '')
  );

  let copyGameStats =
    '\n<button type="button" data-action="copy-game-stats" data-ignore-touch="true" class="copy-game-stats">Copy to clipboard</button>';

  let betaText = '<span style="white-space:nowrap">[ Game stats beta ]</span>';

  copyGameStats += ' ' + betaText;

  let report;

  let nl = '\n';

  if (isHTML) {
    let debugOutput = debugInfo.map((i) => li(i)).join('');
    report = [
      markers?.start ? markers?.start + nl : '',
      markerTypes.code.start,
      `${vTable.toString()}${nl}`,
      markerTypes.code.end,
      `<ul>`,
      li(header),
      li(`⏱️ Duration: ${dc.extra.duration}`),
      li(`📈 Score: ${dc.extra.score}`),
      li(`${fundsStats}`),
      structureStats.map((s) => li(s)).join(''),
      debugOutput,
      `</ul>`,
      `<div class="copy-game-stats-wrapper">${copyGameStats}</div>`,
      markers?.end
    ]
      .filter((o) => !!o)
      .join('');
  } else {
    report = [
      markers?.start ? markers?.start + nl : '',
      header + `${nl} ${nl}`,
      `⏱️ Duration: ${dc.extra.duration}${nl}`,
      `📈 Score: ${dc.extra.score}${nl}`,
      `${fundsStats}${nl}`,
      structureStats.join(nl) + nl,
      debugInfo.length ? debugInfo.join(nl) + nl : '',
      `${vTable.toString()}${nl}`,
      markers?.end
    ]
      .filter((o) => !!o)
      .join('');
  }

  // hack: drop any double-newlines introduced from above
  report = report.replace(/\n\n/gi, '\n');

  if (isHTML) {
    report = report.replace(/\n/g, '<br />');
  }

  if (options.logToConsole) {
    console.log(report);
  }

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

let copyTimer;

// yuck: event handler for clipboard / stats
function copyToClipboardHandler(e) {
  let text = formatForWebhook('discord');

  // guard against multiple clicks
  if (copyTimer) return;

  utils.copyToClipboard(text, (ok) => {
    // get, and guard/preserve original value.
    let attr = 'data-original-html';
    let originalValue = e.target.getAttribute(attr);

    if (!originalValue) {
      originalValue = e.target.innerHTML;
      e.target.setAttribute(attr, originalValue);
    }

    // hackish: replace with strings matching original length.
    let newHTML = (ok ? '     Copied!     ' : '   Failed. :/   ').replace(
      /\s/g,
      '&nbsp;'
    );

    e.target.innerHTML = newHTML;

    copyTimer = common.setFrameTimeout(() => {
      copyTimer = null;
      e.target.innerHTML = originalValue;
    }, 2000);

    game.objects.notifications.add(
      (ok ? '✅ Stats copied to clipboard.' : '❌ Could not copy.') +
        (!isMobile ? '\nSee JS console, too.' : ''),
      { force: true }
    );
  });

  console.log(text);

  e.preventDefault();
  return false;
}

export {
  copyToClipboardHandler,
  freezeStats,
  formatForWebhook,
  getGameDuration,
  getMTVIE,
  getEnemyChoppersLost,
  postToService
};
