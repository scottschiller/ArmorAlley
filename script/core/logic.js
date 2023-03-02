/**
 * collision detection and related game logic / rules
 */

import { gameType } from '../aa.js';
import { utils } from './utils.js';
import { common } from './common.js';
import { game } from './Game.js';
import { COSTS, getTypes, TYPES, worldWidth } from './global.js';
import { sprites } from './sprites.js';

function collisionCheck(rect1, rect2, rect1XLookAhead) {

  /**
   * Given two rect objects with shape { x, y, width, height }, determine if there is overlap.
   * Additional hacky param: `rect1XLookAhead`, x-axis offset. Used for cases where tanks etc. need to know when objects are nearby.
   * Extra param because live objects are passed directly and can't be modified (eg., options.source.data.x += ...).
   * Cloning via mixin() works, but this creates a lot of extra objects and garbage collection thrashing.
   */

  // https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
  return (
    // rect 2 is to the right.
    rect1.x + rect1XLookAhead < rect2.x + rect2.width
    // overlap on x axis.
    && rect1.x + rect1.width + rect1XLookAhead > rect2.x
    // rect 1 is above rect 2.
    && rect1.y < rect2.y + rect2.height
    // overlap on y axis.
    && rect1.y + rect1.height > rect2.y
  );

}

function collisionCheckArray(options) {

  /**
   * options = {
   *   source: object (eg., game.objects.gunfire[0]);
   *   targets: array (eg., game.objects.tanks)
   * }
   */

  if (!options || !options.targets) {
    return false;
  }

  // don't check if the object is dead or inert. If expired, only allow the object if it's also "hostile" (can still hit things)
  if (options.source.data.dead || options.source.data.isInert || (options.source.data.expired && !options.source.data.hostile)) {
    return false;
  }

  let xLookAhead, foundHit;

  // is this a "lookahead" (nearby) case? buffer the x value, if so. Armed vehicles use this.

  if (options.useLookAhead) {

    // friendly things move further right, enemies move further left.

    // hackish: define "one-third width" only once.
    if (options.source.data.xLookAhead === undefined && options.source.data.widthOneThird === undefined) {
        options.source.data.widthOneThird = options.source.data.width * 0.33;
    }

    xLookAhead = Math.min(16, options.source.data.xLookAhead || options.source.data.widthOneThird);
    if (options.source.data.isEnemy) xLookAhead *= -1;

  } else {

    xLookAhead = 0;

  }

  for (let i = 0, j = options.targets.length; i < j; i++) {

    // non-standard formatting, lengthy logic check here...
    if (

      // don't compare the object against itself
      options.targets[i] && options.targets[i].data.id !== options.source.data.id

      // ignore dead options.targets (unless a turret, which can be reclaimed / repaired by engineers)
      && (
        !options.targets[i].data.dead
        || (options.targets[i].data.type === TYPES.turret && options.source.data.type === TYPES.infantry && options.source.data.role)
      )

      // more non-standard formatting....
      && (

        // don't check against friendly units by default, UNLESS looking only for friendly.
        ((options.friendlyOnly && options.targets[i].data.isEnemy === options.source.data.isEnemy) || (!options.friendlyOnly && options.targets[i].data.isEnemy !== options.source.data.isEnemy))

        // specific friendly cases: infantry vs. bunker, end-bunker, super-bunker or helicopter
        || (options.source.data.type === TYPES.infantry && options.targets[i].data.type === TYPES.bunker)

        || (options.targets[i].data.type === TYPES.infantry && (
          (options.source.data.type === TYPES.endBunker && !options.targets[i].data.role)
          || (options.source.data.type === TYPES.superBunker && !options.targets[i].data.role)
          || (options.source.data.type === TYPES.helicopter)
        ))

        // OR engineer vs. turret
        || (options.source.data.type === TYPES.infantry && options.source.data.role && options.targets[i].data.type === TYPES.turret)

        // OR we're dealing with a hostile or neutral object
        || (options.source.data.hostile || options.targets[i].data.hostile)
        || (options.source.data.isNeutral || options.targets[i].data.isNeutral)

      )

    ) {

      // note special Super Bunker "negative look-ahead" case - detects helicopter on both sides.
      if (
        collisionCheck(options.source.data, options.targets[i].data, xLookAhead)
        || (options.targets[i].data.type === TYPES.helicopter && collisionCheck(options.source.data, options.targets[i].data, -xLookAhead))
      ) {

        foundHit = true;

        if (options.hit) {
          
          // provide target, "no specific points", source.
          options.hit(options.targets[i], null, options.source);

          // update energy?
          sprites.updateEnergy(target);
        }

      }

    }

  }

  return foundHit;

}

function collisionTest(collision, exports) {

  // don't do collision detection during game-over sequence.
  if (game.data.battleOver) {
    // restore to original state
    collision.targets = null;
    return;
  }

  let i, j;

  // hack: first-time run fix, as exports is initially undefined
  if (!collision.options.source) {
    collision.options.source = exports;
  }

  // loop through relevant game object arrays
  for (i = 0, j = collision.items.length; i < j; i++) {

    // assign current targets...
    collision.options.targets = game.objects[collision.items[i]];

    // ... and check them
    collisionCheckArray(collision.options);

  }

  // restore to original state
  collision.targets = null;

}

function collisionCheckMidPoint(obj1, obj2) {

  // infantry-at-midpoint (bunker or helicopter) case
  return collisionCheck(obj1.data.midPoint, obj2.data, 0);

}

function trackObject(source, target) {

  // given a source object (the helicopter) and a target, return the relevant vX / vY delta to get progressively closer to the target.

  let deltaX, deltaY;

  deltaX = (target.data.x + target.data.halfWidth) - (source.data.x + source.data.halfWidth);

  // by default, offset target to one side of a balloon.

  if (target.data.type === TYPES.tank) {

    // hack: bomb from high up.
    deltaY = (40 + target.data.halfHeight) - (source.data.y + source.data.halfHeight);

  } else {

    deltaY = (target.data.y + target.data.halfHeight) - (source.data.y + source.data.halfHeight);

  }

  return {
    deltaX,
    deltaY
  };

}

function getNearestObject(source, options = {}) {

  // given a source object (the helicopter), find the nearest enemy in front of the source - dependent on X axis + facing direction.

  let i, j, k, l, itemArray, items, localObjects, targetData, isInFront, useInFront, distanceX, distanceY;

  const isNearGround = source.data.y >= 340 && !options?.ignoreNearGround;

  useInFront = !!options.useInFront;

  // should a smart missile be able to target another smart missile? ... why not.
  items = (options.items || ['tanks', 'vans', 'missileLaunchers', 'helicopters', 'bunkers', 'balloons', 'smartMissiles', 'turrets']);

  localObjects = [];

  for (i = 0, j = items.length; i < j; i++) {

    itemArray = game.objects[items[i]];

    for (k = 0, l = itemArray.length; k < l; k++) {

      // potential target: not dead, and an enemy
      if (itemArray[k].data.dead || itemArray[k].data.isEnemy === source.data.isEnemy) continue;
      
      // is the target in front of the source?
      isInFront = (itemArray[k].data.x >= source.data.x);

      // additionally: is the helicopter pointed at the thing, and is it "in front" of the helicopter?
      if (!useInFront || (useInFront && ((!source.data.rotated && isInFront) || (source.data.rotated && !isInFront)))) {

        targetData = itemArray[k].data;

        // how far to the target?
        distanceX = Math.abs(Math.abs(targetData.x) - Math.abs(source.data.x));
        distanceY = Math.abs(Math.abs(targetData.y) - Math.abs(source.data.y));

        // too far away for a missile to reach?
        if (distanceX > 3072) continue;

        // near-ground bias: restrict to bottom-aligned and very low units if close to the bottom.
        if (isNearGround && distanceY > 40) continue;

        localObjects.push({
          obj: itemArray[k],
          // Given X and Y, determine the hypotenuse - the third side of our "distance triangle." Hat tip: Pythagoras.
          totalDistance: Math.sqrt(Math.pow(distanceX, 2) + Math.pow(distanceY, 2))
        });

      }

    }

  }

  if (!localObjects.length) return !options?.getAll ? null : localObjects;

  // sort by distance
  localObjects.sort(utils.array.compare('totalDistance'));

  // enemy helicopter: reverse the array.
  if (source.data.type === TYPES.helicopter && source.data.isEnemy) {
    localObjects.reverse();
  }

  // optional/hackish: return array.
  if (options?.getAll) return localObjects.map(object => object.obj);

  // default: return the best single candidate.
  return localObjects[0].obj;

}

function objectInView(data, options = {}) {

  // unrelated to other nearby functions: test if an object is on-screen (or slightly off-screen),
  // alive, either enemy or friendly (depending on option), not cloaked, and within range.

  let i, j, items, result;

  // defaults
  options.triggerDistance = options.triggerDistance || game.objects.view.data.browser.twoThirdsWidth;
  options.friendlyOnly = !!options.friendlyOnly;

  items = game.objects[(options.items || 'helicopters')];

  for (i = 0, j = items.length; i < j; i++) {
    if (
      !items[i].data.dead
      && !items[i].data.cloaked
      && (options.friendlyOnly ? data.isEnemy === items[i].data.isEnemy : (data.isEnemy !== items[i].data.isEnemy || items[i].data.isNeutral))
      && Math.abs(items[i].data.x - data.x) < options.triggerDistance
    ) {
      result = items[i];
      break;
    }
  }

  return result;

}

function nearbyTest(nearby) {

  let i, j, foundHit;

  // loop through relevant game object arrays
  // TODO: revisit for object creation / garbage collection improvements
  for (i = 0, j = nearby.items.length; i < j; i++) {

    // assign current targets...
    nearby.options.targets = game.objects[nearby.items[i]];

    // ... and check them
    if (collisionCheckArray(nearby.options)) {
      foundHit = true;
      break;
    }

  }

  // reset
  nearby.options.targets = null;

  // callback for no-hit case, too
  if (!foundHit && nearby.options.miss) {
    nearby.options.miss(nearby.options.source);
  }

}

function enemyNearby(data, targets, triggerDistance) {

  let i, j, k, l, targetData, results;

  results = [];

  // "targets" is an array of class types, e.g., tank, missileLauncher etc.

  for (i = 0, j = targets.length; i < j; i++) {

    for (k = 0, l = game.objects[targets[i]].length; k < l; k++) {

      targetData = game.objects[targets[i]][k].data;

      // non-friendly, not dead, and nearby?
      if (targetData.isEnemy !== data.isEnemy && !targetData.dead) {
        if (Math.abs(targetData.x - data.x) < triggerDistance) {
          results.push(game.objects[targets[i]][k]);
          // 12/2021: take first result, and exit.
          return results;
        }
      }

    }

  }

  return results;

}

function enemyHelicopterNearby(data, triggerDistance) {

  let i, j, result;

  // by default
  triggerDistance = triggerDistance || game.objects.view.data.browser.twoThirdsWidth;

  for (i = 0, j = game.objects.helicopters.length; i < j; i++) {

    // not cloaked, not dead, and an enemy?
    if (!game.objects.helicopters[i].data.cloaked && !game.objects.helicopters[i].data.dead && data.isEnemy !== game.objects.helicopters[i].data.isEnemy) {

      // how far away is the target?
      if (Math.abs(game.objects.helicopters[i].data.x - data.x) < triggerDistance) {
        result = game.objects.helicopters[i];
        break;
      }

    }

  }

  return result;

}

function recycleTest(obj) {

  // did a unit reach the other side? destroy the unit, and reward the player with credits.
  let isEnemy, costObj, refund, type;

  isEnemy = obj.data.isEnemy;

  if (!obj || obj.data.dead || obj.data.isRecycling) return;

  if (isEnemy) {
    // recycle point: slightly left of player's base
    if (obj.data.x > -48) return;
  } else {
    // recycle point: end of world
    if (obj.data.x < worldWidth) return;
  }

  obj.data.isRecycling = true;

  // animate down, back into the depths from whence it came
  utils.css.remove(obj.dom.o, 'ordering');
  utils.css.add(obj.dom.o, 'recycling');

  // ensure 'building' is set, as well. "pre-existing" game units will not have this.
  common.setFrameTimeout(() => {
    utils.css.add(obj.dom.o, 'building');
  }, 16);

  common.setFrameTimeout(() => {
    // die silently, and go away.
    obj.die({ silent: true});

    // tank, infantry etc., or special-case: engineer.
    type = obj.data.role ? obj.data.roles[obj.data.role] : obj.data.type;

    // special case: infantry may have been dropped by player, or when helicopter exploded.
    // exclude those from being "refunded" at all, given player was involved in their move.
    // minor: players could collect and drop infantry near enemy base, and collect refunds.
    if (type === TYPES.infantry && !obj.data.unassisted) return;

    costObj = COSTS[TYPES[type]];

    // reward player for their good work. 200% return on "per-item" cost.
    // e.g., tank cost = 4 credits, return = 8. for 5 infantry, 10.
    refund = (costObj.funds / (costObj.count || 1) * 2);

    game.objects.endBunkers[isEnemy ? 1 : 0].data.funds += refund;
    
    if (!isEnemy) {
      // notify player that a unit has been recycled?
      game.objects.notifications.add(`+${refund} 💰: recycled ${type} ♻️`);
      game.objects.funds.setFunds(game.objects.endBunkers[0].data.funds);
      game.objects.view.updateFundsUI();
    }

  }, 2000);

}

function countSides(objectType, includeDead) {

  let i, j, result;

  result = {
    friendly: 0,
    enemy: 0
  };

  if (!game.objects[objectType]) return result;

  for (i = 0, j = game.objects[objectType].length; i < j; i++) {
    if (!game.objects[objectType][i].data.dead) {
      if (game.objects[objectType][i].data.isEnemy || game.objects[objectType][i].data.hostile) {
        result.enemy++;
      } else {
        result.friendly++;
      }
    } else if (includeDead) {
      // things that are dead are considered harmless - therefore, friendly.
      result.friendly++;
    }
  }

  return result;

}

function countFriendly(objectType, includeDead) {

  includeDead = (includeDead || false);

  return countSides(objectType, includeDead).friendly;

}

function playerOwnsBunkers() {

  // has the player captured (or destroyed) all bunkers? this may affect enemy convoy production.
  let owned, total, includeDead = true;

  owned = countFriendly('bunkers', includeDead) + countFriendly('superBunkers', includeDead);
  total = game.objects.bunkers.length + game.objects.superBunkers.length;

  return (owned >= total);

}

function checkProduction() {

  let bunkersOwned, announcement;

  // playing extreme mode? this benefit would practically be cheating! ;)
  if (gameType === 'extreme') return;

  bunkersOwned = playerOwnsBunkers();

  if (!game.data.productionHalted && bunkersOwned) {

    // player is doing well; reward them for their efforts.
    announcement = '🎉 You control all bunkers. Enemy production is halted. 🚫';
    game.data.productionHalted = true;

  } else if (game.data.productionHalted && !bunkersOwned) {

    // CPU has regained control of a bunker.
    announcement = '😰 You no longer control all bunkers. Enemy production is resuming. 🛠️';
    game.data.productionHalted = false;

  }

  if (announcement) {
    game.objects.view.setAnnouncement(announcement);
    game.objects.notifications.add(announcement);
  }

}

function isGameOver() {
  return game.data.battleOver;
}

export {
  getNearestObject,
  trackObject,
  collisionCheck,
  collisionCheckMidPoint,
  collisionTest,
  objectInView,
  nearbyTest,
  enemyNearby,
  enemyHelicopterNearby,
  recycleTest,
  countSides,
  countFriendly,
  playerOwnsBunkers,
  checkProduction,
  isGameOver
}