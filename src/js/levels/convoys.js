import { game } from '../core/Game.js';
import { COSTS, TYPES } from '../core/global.js';
import { levelConfig } from './default.js';

/**
 * CPU convoy ordering patterns from original, somewhat reduced.
 * First character = "inventory level", followed by a series of items.
 * Inventory level ranges from 5-10 per level (battle) config.
 */
let convoyData = [
  '0 V',
  '0 M',
  '0 T',
  '0 I',
  '0 I',
  '0 I',
  '0 E',
  '3 TI',
  '3 TT',
  '3 IV',
  '4 V',
  '4 IE',
  '4 MI',
  '4 MM',
  '4 I',
  '5 V',
  '5 MIIM',
  '5 TTMI',
  '5 TEV',
  '5 IMEV',
  '5 MIVV',
  '5 TMV',
  '6 TEVIM',
  '6 TVTV',
  '6 MTVVIM',
  '6 TTMTVI',
  '6 TTMMIE',
  '7 TMIVIM',
  '7 TTVEVEMM',
  '7 MIVVTMMI',
  '8 TTIMMMEV',
  '8 IVIVEMMIV',
  '9 TVVV',
  '9 TMMMMM',
  '9 TTTTEEEM',
  '9 TVEMIVTV',
  '9 TTMTVIVITMEVVTEVIMM',
  // `:` is hex 3A / decimal 48 - when subtracting '0' (38), leaves 10. ;)
  ': MTIMTMIME',
  ': TMIMTMTV',
  ': TEEMIVVTMM',
  ': IIIMMIMMMTTTEET',
  ': TTTMMMIIETM',
  ': TMTMIMTMIEV',
  ': TTMMTTMTMTMIIEVIVVV'
];

let costs = {
  M: COSTS[TYPES.missileLauncher],
  I: COSTS[TYPES.infantry],
  E: COSTS[TYPES.engineer],
  T: COSTS[TYPES.tank],
  V: COSTS[TYPES.van]
};

function parseConvoyData(convoyLevel) {
  let parsed = [];

  convoyData.forEach((convoy) => {
    let l = convoy.charAt(0);

    // "inventory level" offset: 0-9, and `:` (10) as per original formatting.
    let level = l.charCodeAt(0) - '0'.charCodeAt(0);

    // skip convoy bits which don't apply to the current battle.
    if (convoyLevel < level) return;

    // MTVIE pattern
    let items = convoy.substring(2);

    let cost = 0;

    // iterate through inventory items, handle possible substitutions.

    // if missile launchers can't be ordered, swap with infantry.
    if (!levelConfig.buildTruckB) {
      items = items.replace(/M/g, 'I');
    }

    // if engineers can't be ordered OR there are no turrets for this battle, swap with infantry.
    if (
      !levelConfig.buildEngineersB ||
      (game.objects.turret && !game.objects.turret.length)
    ) {
      items = items.replace(/E/g, 'I');
    }

    // character -> type, e.g., MTVIE
    let key;

    for (var i = 0; i < items.length; i++) {
      key = items.charAt(i);
      cost += costs[key]?.funds || 0;
    }

    parsed.push({
      level,
      items,
      cost
    });
  });

  return parsed;
}

export { parseConvoyData };
