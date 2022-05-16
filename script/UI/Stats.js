import { TYPES } from '../core/global.js';

function Stats() {

  let data, exports;

  function statsStructure() {
    return {
      bullet: 0,
      balloon: 0,
      bunker: 0,
      'missile-launcher': 0,
      gunfire: 0,
      tank: 0,
      van: 0,
      infantry: 0,
      engineer: 0,
      helicopter: 0,
      'smart-missile': 0,
      bomb: 0,
      shrapnel: 0,
      turret: 0
    };
  }
  
  function normalizeObj(obj) {
    if (obj && !obj.data && obj.oParent) {
      obj = obj.oParent;
    }
    return obj;
  }

  function normalizeType(obj) {
    let type = obj.data.type;
    // special case: infantry -> engineer
    if (obj.data.type === TYPES.infantry && obj.data.role) {
      type = TYPES.engineer;
    }
    return type;
  }

  function create(obj) {
    let dataObj, type;
    obj = normalizeObj(obj);
    type = normalizeType(obj);
    dataObj = data[obj.data.isEnemy ? 'enemy' : 'player'].created;
    if (dataObj[type] !== undefined) {
      dataObj[type]++;
    }
  }

  function destroy(obj, options) {
    // there might be no data, so go up the chain.

    let dataObj, type;

    // most objects have oParent, except vans which are "hidden" from radar.
    obj = normalizeObj(obj.oParent || obj);

    type = normalizeType(obj);

    // notify when something was destroyed, if not a "silent" death
    if (!(options?.silent)) maybeNotify(type, obj);

    // increment the relevant stat
    dataObj = data[obj.data.isEnemy ? 'enemy' : 'player'].destroyed;

    if (dataObj[type] !== undefined) {
      dataObj[type]++;
    }

  }
  }

  function markEnd() {
    data.time.end = new Date();
  }

  function displayEndGameStats() {

    console.log('TODO: fix endgame stats. 😅');
    return;

    /*
    let i, j, k, items, cols, type, offset, dataSource;
    items = document.getElementById('stats-endgame').getElementsByTagName('tr');
    // data sources
    dataSource = [data.player.destroyed, data.enemy.destroyed];
    offset = 1;
    for (i = 0, j = items.length; i < j; i++) {
      type = items[i].getAttribute('data-type');
      if (type) {
        cols = items[i].getElementsByTagName('td');
        for (k = 0; k < 2; k++) {
          if (cols[k + offset]) {
            cols[k + offset].childNodes[0].textContent = dataSource[k][type];
          }
        }
      }
    }
    document.getElementById('stats-endgame').style.display = 'block';
    */

  }

  data = {
    time: {
      start: new Date(),
      end: null
    },
    player: {
      created: statsStructure(),
      destroyed: statsStructure()
    },
    enemy: {
      created: statsStructure(),
      destroyed: statsStructure()
    }
  };

  exports = {
    data,
    create,
    destroy,
    markEnd,
    displayEndGameStats
  };

  return exports;

}

export { Stats };