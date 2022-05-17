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

  /**
   * by type, behaviours for notifications when units are destroyed including
   * icon type (death vs. explosion) and language / notification options
   */
   const notifyTypes = {
    // special case: missile launchers can destroy things, or be destroyed by an infantry or tank.
    // they typically die with silent: true, when self-destructing in order to launch a missile.
    'missile-launcher': true,
    tank: {
      verb: 'blasted',
      verb_engineer: 'steamrolled',
      verb_infantry: 'steamrolled'
    },
    van: true,
    infantry: {
      showSkull: true,
      isAn: true,
    },
    'parachute-infantry': {
      showSkull: true
    },
    engineer: {
      showSkull: true,
      isAn: true,
    },
    balloon: true,
    bunker: true,
    helicopter: {
      showSkull: true,
      verb: 'crashed into',
      'verb_smart-missile': 'hit'
    },
    bomb: {
      exclude: true,
      verb: 'bombed',
      verb_infantry: 'nuked',
      verb_engineer: 'annihilated'
    },
    gunfire: {
      exclude: true,
      verb: 'shot',
      verb_balloon: 'popped',
      verb_bunker: 'blew out',
      verb_helicopter: 'toasted',
      verb_infantry: 'killed',
      verb_engineer: 'killed',
      'verb_smart-missile': 'shot down',
      verb_tank: 'took out'
    },
    shrapnel: {
      exclude: true,
      verb: 'killed',
      verb_balloon: 'popped'
    },
    'smart-missile': {
      // special case: smart missiles are the "attacker" only when hostile.
      hostilePrefix: 'a hostile ',
      // exclude: true,
      verb: 'smoked',
      verb_bunker: 'destroyed',
      verb_infantry: 'killed',
      verb_engineer: 'killed',
      'verb_smart-missile': 'took out'
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