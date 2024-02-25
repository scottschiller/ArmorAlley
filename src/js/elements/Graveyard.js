import { gamePrefs } from '../UI/preferences.js';
import { game } from '../core/Game.js';
import { common } from '../core/common.js';
import { TYPES, oneOf, rng, rngInt, rngPlusMinus } from '../core/global.js';
import { net } from '../core/network.js';
import { utils } from '../core/utils.js';

let gravestoneQueue = [];
let gravestoneTimer;

const mediumDecor = ['flowers', 'grass'];

const smallMediumDecor = [
  'barb-wire',
  'cactus',
  'checkmark-grass',
  'flower',
  'flower-bush',
  'palm-tree'
].concat(mediumDecor);

const largeDecor = mediumDecor.concat(['sand-dune', 'sand-dunes']);

const gravestoneStyles = ['gravestone', 'gravestone2', 'grave-cross'];
const maxGravestoneRange = 64;
const maxQueueSize = 5;

function queueGravestoneWork() {
  // fire immediately, if queue is large enough.
  if (gravestoneQueue.length >= maxQueueSize) {
    processGravestoneQueue();
  }

  gravestoneTimer?.reset();

  gravestoneTimer = common.setFrameTimeout(processGravestoneQueue, 750);
}

// hackish: rng() version of oneOf()
function pickFrom(array) {
  if (!net.active) return oneOf(array);
  return array[rngInt(array.length, TYPES.terrainItem)];
}

function processGravestoneQueue() {
  gravestoneTimer = null;

  let clusters = [];
  let clusterOffset = 0;

  // split X coordinates into "clusters", where applicable.

  if (gravestoneQueue.length >= 3) {
    // array of x coords, and "type" (based on thing that died)
    const items = gravestoneQueue
      .map((item) => ({
        type: item.data.type,
        x: item.data.x,
        gravestoneType: item.data.gravestoneType
      }))
      .sort(utils.array.compare('x'));

    // pre-populate the first cluster
    clusters[0] = [items[0].x];

    // NOTE: loop starting at 1 intentionally.
    for (let i = 1, j = items.length; i < j; i++) {
      if (items[i].x - clusters[clusterOffset][0].x < maxGravestoneRange) {
        // within range; push onto current cluster.
        clusters[clusterOffset].push(items[i]);
      } else {
        // make a new cluster.
        clusters.push([items[i]]);
        clusterOffset++;
      }
    }

    // decorate clusters
    clusters.forEach((cluster) => {
      cluster.forEach((obj, i) => {
        if ((i + 1) % 2 === 0) {
          const item = game.addItem(
            obj.type,
            obj.x +
              rngPlusMinus(rngInt(12, TYPES.terrainItem), TYPES.terrainItem),
            {
              gravestoneType: obj.gravestoneType,
              visible: false
            }
          );
          common.setFrameTimeout(item.summon, 33 + 33 * (i + 1));
        }
      });
      if (cluster.length > 2) {
        // bigger decor items for larger clusters
        const i = 1 + rngInt(cluster.length - 1, TYPES.terrainItem);
        const item = game.addItem(
          pickFrom(largeDecor),
          (cluster[i + 1] + cluster[i]) / 2,
          {
            gravestoneType: cluster[i].gravestoneType,
            visible: false
          }
        );
        common.setFrameTimeout(item.summon, 33 + 33 * (i + 1));
      }
    });
  }

  gravestoneQueue.forEach((obj, i) => {
    const item = game.addItem(obj.data.type, obj.data.x, {
      // e.g., `gs_helicopter`
      gravestoneType: obj.data.gravestoneType,
      visible: false,
      // gravestones face the side from which they died, per se.
      flipX: !!obj.data?.isEnemy
    });
    common.setFrameTimeout(item.summon, 33 + 66 * (i + 1));
  });

  // reset
  gravestoneQueue = [];
}

function addGravestone(exports) {
  const dType = exports.data.type;

  const isInfantry =
    gamePrefs.gravestones_infantry &&
    (dType === TYPES.infantry || dType === TYPES.parachuteInfantry);
  const isHelicopter =
    gamePrefs.gravestones_helicopters && dType === TYPES.helicopter;
  const isVehicle =
    gamePrefs.gravestones_vehicles && dType.match(/tank|van|launcher/i);

  if (!isInfantry && !isHelicopter && !isVehicle) return;

  // these match the preference names - e.g., show gravestones for infantry.
  const gravestoneType = isInfantry
    ? 'gravestones_infantry'
    : isHelicopter
    ? 'gravestones_helicopters'
    : 'gravestones_vehicles';

  // for non-infantry types, add a few extra before the gravestone pops up.
  if (dType !== TYPES.infantry && rng(1, TYPES.terrainItem) >= 0.5) {
    gravestoneQueue.push({
      data: {
        type: pickFrom(smallMediumDecor),
        x: exports.data.x + rngPlusMinus(12, TYPES.terrainItem),
        gravestoneType
      }
    });
  }

  // now add the thing we came here for.
  gravestoneQueue.push({
    data: {
      type: pickFrom(gravestoneStyles),
      x: exports.data.x,
      gravestoneType
    }
  });

  queueGravestoneWork();
}

export { addGravestone };
