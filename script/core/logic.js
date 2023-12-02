/**
 * collision detection and related game logic / rules
 */

import { gameType } from '../aa.js';
import { utils } from './utils.js';
import { common } from './common.js';
import { game } from './Game.js';
import { COSTS, getTypes, TYPES, worldWidth } from './global.js';
import { zones } from './zones.js';
import { sprites } from './sprites.js';
import { net } from './network.js';
import { gamePrefs } from '../UI/preferences.js';

// certain types can be filtered in prefs, e.g., `notify_infantry = false`
const notificationFilterTypes = {
  [TYPES.missileLauncher]: true,
  [TYPES.tank]: true,
  [TYPES.van]: true,
  [TYPES.infantry]: true,
  [TYPES.engineer]: true,
  [TYPES.smartMissile]: true
};

const NET_TRIGGER_DISTANCE = 360;

function canNotify(targetType, attackerType) {
  /**
   * Has the user chosen to ignore updates for the involved units?
   * Exit if the target has been filtered out.
   */

  // note mapping of (target) type to pref, e.g., `notify_tank`
  // if there is a pref available, and it's off, then bail.
  if (notificationFilterTypes[targetType] && !gamePrefs[`notify_${targetType}`])
    return;

  // e.g., a tank: check and count the user pref if enabled.
  if (
    notificationFilterTypes[attackerType] &&
    !gamePrefs[`notify_${attackerType}`]
  )
    return;

  // finally, allowed.
  return true;
}

function collisionCheck(rect1, rect2, rect1XLookAhead = 0) {
  /**
   * Given two rect objects with shape { x, y, width, height }, determine if there is overlap.
   * Additional hacky param: `rect1XLookAhead`, x-axis offset. Used for cases where tanks etc. need to know when objects are nearby.
   * Extra param because live objects are passed directly and can't be modified (eg., options.source.data.x += ...).
   * Cloning via mixin() works, but this creates a lot of extra objects and garbage collection thrashing.
   */

  // https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
  return (
    // rect 2 is to the right.
    rect1.x + rect1XLookAhead < rect2.x + rect2.width &&
    // overlap on x axis.
    rect1.x + rect1.width + rect1XLookAhead > rect2.x &&
    // rect 1 is above rect 2.
    rect1.y < rect2.y + rect2.height &&
    // overlap on y axis.
    rect1.y + rect1.height > rect2.y
  );
}

function collisionCheckWithOffsets(rect1, rect2, r1XOffset = 0, r1YOffset = 0) {
  // Modified version of collisionCheck, with X and Y offset params.
  // This may be premature optimization, but collision calls are very common - the intent is to reduce object creation.
  return (
    // rect 2 is to the right.
    rect1.x + r1XOffset < rect2.x + rect2.width &&
    // overlap on x axis.
    rect1.x + rect1.width + r1XOffset > rect2.x &&
    // rect 1 is above rect 2.
    rect1.y + r1YOffset < rect2.y + rect2.height &&
    // overlap on y axis.
    rect1.y + r1YOffset + rect1.height > rect2.y
  );
}

function collisionCheckTweens(source, target, repositionOnHit = true) {
  /**
   * Given two objects with location and velocity coordinates,
   * step through the movement and check collision "in between" frames.
   *
   * Technically, we're stepping back from the new, current location -
   * so, backtrack, and then step forward.
   */

  const sData = source.data,
    tData = target.data;

  if (!source || !target) {
    console.warn('collisionCheckTweens(): WTF no source or target?');
  }

  // special exemption: ignore expired, non-hostile objects - e.g., expired gunfire.
  if ((sData.expired && !sData.hostile) || (tData.expired && !tData.hostile))
    return;

  let xOffset, yOffset;

  // somewhat-large assumption: all objects have and use vX / vY per frame. 😅
  // start with the inverse offset, "rolling back", and working our way forward.
  xOffset = -sData.vX;
  yOffset = -sData.vY;

  // how many in-between values to check
  // [start] [ step ] [ step ] [end]
  let minTweenSteps = 2;

  // Rather than every pixel, take the greater velocity and cut it in half.
  const tweenSteps = Math.max(
    minTweenSteps,
    parseInt(Math.max(Math.abs(sData.vX), Math.abs(sData.vY)), 10) / 2
  );

  // amount to move, for each "in-between" position.
  // note that for e.g., two steps, we divide by 3 because we don't check the start or end positions.
  const tweenDivider = tweenSteps + 1;
  const stepX = sData.vX / tweenDivider;
  const stepY = sData.vY / tweenDivider;

  // starting at the previous position: step, then check.
  for (let i = 0; i < tweenSteps; i++) {
    xOffset += stepX;
    yOffset += stepY;
    if (collisionCheckWithOffsets(sData, tData, xOffset, yOffset)) {
      // we have a hit; reposition the source to the point of collision, and exit.
      if (repositionOnHit) {
        sData.x += xOffset;
        sData.y += yOffset;
      }
      return true;
    }
  }

  return false;
}

function collisionCheckObject(options) {
  /**
   * options = {
   *   source: object - eg., gunfire[0]
   *   targets: array - eg., zones.objectsByZone[zoneNumber]['enemy'][tank objects]
   * }
   */

  if (!options?.targets) {
    return false;
  }

  const sData = options.source.data;

  // don't check if the object is dead or inert. If expired, only allow the object if it's also "hostile" (can still hit things)
  if (sData.dead || sData.isInert || (sData.expired && !sData.hostile)) {
    return false;
  }

  let xLookAhead, foundHit;

  // is this a "lookahead" (nearby) case? buffer the x value, if so. Armed vehicles use this.

  if (options.useLookAhead) {
    // friendly things move further right, enemies move further left.

    // hackish: define "one-third width" only once.
    if (sData.xLookAhead === undefined && sData.widthOneThird === undefined) {
      sData.widthOneThird = sData.width * 0.33;
    }

    // note: default if `useLookAhead`, but no specific value provided.
    xLookAhead = sData.xLookAhead || sData.widthOneThird || 16;
    if (sData.isEnemy) xLookAhead *= -1;
  } else {
    xLookAhead = 0;
  }

  let target, id, tData;

  for (id in options.targets) {
    target = options.targets[id];

    tData = target?.data;

    // non-standard formatting, lengthy logic check here...
    if (
      // don't compare the object against itself
      target &&
      tData.id !== sData.id &&
      // hackish: ignore "excluded" objects (e.g., a helicopter hiding "inside" a super-bunker)
      !tData.excludeFromCollision &&
      // ignore dead options.targets (unless a turret, which can be reclaimed / repaired by engineers)
      (!tData.dead ||
        (tData.type === TYPES.turret &&
          sData.type === TYPES.infantry &&
          sData.role)) &&
      // more non-standard formatting....
      // most common case: enemy vs. non-enemy. Otherwise, don't check friendly units by default UNLESS looking only for friendly.
      ((tData.isEnemy !== sData.isEnemy && !options.friendlyOnly) ||
        (options.friendlyOnly && tData.isEnemy === sData.isEnemy) ||
        // specific friendly cases: helicopter vs. super-bunker, or infantry vs. bunker, end-bunker, super-bunker or helicopter
        (sData.type === TYPES.helicopter && tData.type === TYPES.superBunker) ||
        (sData.type === TYPES.infantry && tData.type === TYPES.bunker) ||
        (tData.type === TYPES.infantry &&
          ((sData.type === TYPES.endBunker && !tData.role) ||
            (sData.type === TYPES.superBunker && !tData.role) ||
            sData.type === TYPES.helicopter)) ||
        // OR engineer vs. turret
        (sData.type === TYPES.infantry &&
          sData.role &&
          tData.type === TYPES.turret) ||
        // OR we're dealing with a hostile or neutral object
        sData.hostile ||
        tData.hostile ||
        sData.isNeutral ||
        tData.isNeutral)
    ) {
      // note special Super Bunker "negative look-ahead" case - detects helicopter on both sides.
      if (
        collisionCheck(sData, tData, xLookAhead) ||
        (options.checkTweens &&
          collisionCheckTweens(
            options.source,
            target,
            options.checkTweensRepositionOnHit
          )) ||
        (tData.type === TYPES.helicopter &&
          sData.type === TYPES.superBunker &&
          collisionCheck(sData, tData, -xLookAhead))
      ) {
        foundHit = true;

        if (options.hit) {
          // provide target, "no specific points", source.
          options.hit(target, null, options.source);

          // update energy?
          sprites.updateEnergy(target);
        }
      }
    }
  }

  return foundHit;
}

function collisionTest(collision, exports) {
  if (exports.data.frontZone === null || exports.data.rearZone === null) return;

  // TODO: review, confirm and remove - no longer needed
  // hack: first-time run fix, as exports is initially undefined
  if (!collision.options.source) {
    collision.options.source = exports;
  }

  collisionCheckZone(collision, exports.data.frontZone);

  // also check the neighbouring / overlapping zone, as applicable
  if (exports.data.multiZone) {
    collisionCheckZone(collision, exports.data.rearZone);
  }

  // restore to original state
  collision.targets = null;
}

function collisionCheckZone(collision, zone) {
  const zoneObjects = zones.objectsByZone[zone];

  // loop through relevant game object arrays
  for (let i = 0, j = collision.items.length; i < j; i++) {
    // collision.items: [ { type: 'tank', group: 'all' }, ... ]
    // assign current targets, filtered by group + type
    collision.options.targets =
      zoneObjects[collision.items[i].group][collision.items[i].type];

    // ... and check them IF there are items; there may be none e.g., no eligible balloons in the zone.
    if (collision.options.targets) {
      collisionCheckObject(collision.options);
    }
  }
}

function collisionCheckMidPoint(obj1, obj2, rect1XLookAhead = 0) {
  // infantry-at-midpoint (bunker or helicopter) case
  return collisionCheck(obj1.data, obj2.data.midPoint, rect1XLookAhead);
}

function trackObject(source, target) {
  // given a source object (the helicopter) and a target, return the relevant vX / vY delta to get progressively closer to the target.

  let deltaX, deltaY;

  const sData = source.data,
    tData = target.data;

  deltaX = tData.x + tData.halfWidth - (sData.x + sData.halfWidth);

  // by default, offset target to one side of a balloon.

  if (tData.type === TYPES.tank) {
    // hack: bomb from high up.
    deltaY = 40 + tData.halfHeight - (sData.y + sData.halfHeight);
  } else {
    deltaY = tData.y + tData.halfHeight - (sData.y + sData.halfHeight);
  }

  return {
    deltaX,
    deltaY
  };
}

function getNearestObject(source, options = {}) {
  // given a source object (the helicopter), find the nearest enemy in front of the source - dependent on X axis + facing direction.

  let i,
    j,
    k,
    l,
    itemArray,
    items,
    localObjects,
    tData,
    isInFront,
    useInFront,
    distanceX,
    distanceY;

  const sData = source.data;

  const isNearGround = sData.y >= 340 && !options?.ignoreNearGround;

  useInFront = !!options.useInFront;

  // should a smart missile be able to target another smart missile? ... why not.
  items =
    options.items ||
    getTypes(
      'tank, van, missileLauncher, helicopter, bunker, balloon, smartMissile, turret, superBunker',
      { exports: source }
    );

  localObjects = [];

  for (i = 0, j = items.length; i < j; i++) {
    // TODO: optimize using ranges.
    itemArray = game.objects[items[i].type];

    for (k = 0, l = itemArray.length; k < l; k++) {
      // potential target must be an enemy, not hostile, dead or cloaked.
      tData = itemArray[k].data;
      if (
        (tData.isEnemy === sData.isEnemy && !tData.hostile) ||
        tData.dead ||
        tData.cloaked
      )
        continue;
      /**
       * Special case: ignore balloons that are attached to a bunker.
       * This is to avoid UX/UI confusion between targeting a bunker vs. balloon.
       * Only detached balloons are hostile.
       */
      if (tData.type === TYPES.balloon && !tData.hostile) continue;

      // if a van, target only if it has a radar item OR is on-screen.
      if (
        tData.type === TYPES.van &&
        !tData.isOnScreen &&
        !itemArray[k].radarItem
      )
        continue;

      // is the target in front of the source?
      isInFront = sData.isEnemy ? tData.x < sData.x : tData.x >= sData.x;

      // additionally: is the helicopter pointed at the thing, and is it "in front" of the helicopter?
      if (
        !useInFront ||
        (useInFront &&
          ((!sData.flipped && isInFront) || (sData.flipped && !isInFront)))
      ) {
        // how far to the target?
        distanceX = Math.abs(Math.abs(tData.x) - Math.abs(sData.x));
        distanceY = Math.abs(Math.abs(tData.y) - Math.abs(sData.y));

        // too far away for a missile to reach?
        if (distanceX > 3072) continue;

        // near-ground bias: restrict to bottom-aligned and very low units if close to the bottom.
        if (isNearGround && distanceY > 40) continue;

        localObjects.push({
          obj: itemArray[k],
          // Given X and Y, determine the hypotenuse - the third side of our "distance triangle." Hat tip: Pythagoras.
          totalDistance: Math.sqrt(
            Math.pow(distanceX, 2) + Math.pow(distanceY, 2)
          )
        });
      }
    }
  }

  if (!localObjects.length) return !options?.getAll ? null : localObjects;

  // sort by distance
  localObjects.sort(utils.array.compare('totalDistance'));

  // enemy helicopter: reverse the array.
  if (sData.type === TYPES.helicopter && sData.isEnemy) {
    localObjects.reverse();
  }

  /**
   * If localObjects[0] is a super bunker, and the only target, bail.
   * If [0] is a super bunker and [1] is bottom-aligned, also bail -
   * in this case, the super bunker would block the intended target.
   */
  if (
    localObjects.length &&
    sData.type === TYPES.helicopter &&
    localObjects[0].obj.data.type === TYPES.superBunker &&
    (localObjects.length === 1 || localObjects[1]?.obj?.data?.bottomAligned)
  )
    return;

  // optional/hackish: return array.
  if (options?.getAll) return localObjects.map((object) => object.obj);

  // default: return the best single candidate.
  return localObjects[0].obj;
}

function objectInView(data, options = {}) {
  // unrelated to other nearby functions: test if an object is on-screen (or slightly off-screen),
  // alive, either enemy or friendly (depending on option), not cloaked, and within range.

  let i, j, iData, items, result;

  // defaults
  options.triggerDistance = net.active
    ? NET_TRIGGER_DISTANCE
    : options.triggerDistance || game.objects.view.data.browser.twoThirdsWidth;
  options.friendlyOnly = !!options.friendlyOnly;

  items = game.objects[options.items || TYPES.helicopter];

  for (i = 0, j = items.length; i < j; i++) {
    iData = items[i].data;
    if (
      !iData.dead &&
      !iData.cloaked &&
      (options.friendlyOnly
        ? data.isEnemy === iData.isEnemy
        : data.isEnemy !== iData.isEnemy || iData.isNeutral) &&
      Math.abs(iData.x - data.x) < options.triggerDistance
    ) {
      result = items[i];
      break;
    }
  }

  return result;
}

function isPointInCircle(pointX, pointY, circleX, circleY, circleRadius) {
  // https://www.geeksforgeeks.org/find-if-a-point-lies-inside-or-on-circle/
  return (
    (pointX - circleX) * (pointX - circleX) +
      (pointY - circleY) * (pointY - circleY) <=
    circleRadius * circleRadius
  );
}

function checkNearbyItems(nearby, zone) {
  let i, j, foundHit;

  // [zone = 24][group = 'enemy'][type = 'tank']
  const zoneObjects = zones.objectsByZone[zone];

  if (!zoneObjects) return;

  // loop through relevant game object arrays
  // TODO: revisit for object creation / garbage collection improvements
  for (i = 0, j = nearby.items.length; i < j; i++) {
    // nearby.items: [ { type: 'tank', group: 'all' }, ... ]
    // assign current targets, filtered by group + type
    nearby.options.targets =
      zoneObjects[nearby.items[i].group][nearby.items[i].type];

    if (nearby.options.targets) {
      // ...check them
      if (collisionCheckObject(nearby.options)) {
        foundHit = true;
        // exit on the first, unless we want all to register
        if (!nearby.options.hitAll) break;
      }
    }
  }

  // reset
  nearby.options.targets = null;

  return foundHit;
}

function nearbyTest(nearby, source) {
  if (!source) return;

  // if this isn't set, something is wrong.
  if (source.data.frontZone === null) return;

  // "pre-test" logic
  nearby.options.before?.();

  let front, rear;

  front = checkNearbyItems(nearby, source.data.frontZone);

  // nothing, yet; check the overlapping zone, if set.
  if ((!front || nearby.options.hitAll) && source.data.multiZone) {
    rear = checkNearbyItems(nearby, source.data.rearZone);
  }

  // callback for no-hit case, too
  if (!front && !rear && nearby.options.miss) {
    nearby.options.miss(source);
  }

  // "post-test" logic
  nearby.options.after?.();
}

function enemyNearby(data, targets, triggerDistance) {
  // TODO: optimize this using zones.

  let i, j, k, l, targetData, results;

  results = [];

  // "targets" is an array of class types, e.g., tank, missileLauncher etc.

  if (net.active) triggerDistance = NET_TRIGGER_DISTANCE;

  for (i = 0, j = targets.length; i < j; i++) {
    for (k = 0, l = game.objects[targets[i].type].length; k < l; k++) {
      targetData = game.objects[targets[i].type][k].data;

      // non-friendly, not dead, and nearby?
      if (targetData.isEnemy !== data.isEnemy && !targetData.dead) {
        if (Math.abs(targetData.x - data.x) < triggerDistance) {
          results.push(game.objects[targets[i].type][k]);
          // 12/2021: take first result, and exit.
          return results;
        }
      }
    }
  }

  return results;
}

function enemyHelicopterNearby(data, triggerDistance, useCircleMath) {
  if (game.data.battleOver) return;

  let i, j, result;

  const helicopter = game.objects[TYPES.helicopter];
  let hData;

  // by default
  triggerDistance =
    net.active && !useCircleMath
      ? NET_TRIGGER_DISTANCE
      : triggerDistance || game.objects.view.data.browser.twoThirdsWidth;

  for (i = 0, j = helicopter.length; i < j; i++) {
    /**
     * Not cloaked, not dead, an enemy, and has respawned and lifted off landing pad?
     * The latter is an edge case: turrets may be close enough to a base, to fire at the chopper while respawning.
     * If the chopper launches a smart missile or drops an infantry while landed, then it can be considered fair game as well.
     */
    hData = helicopter[i].data;
    if (
      !hData.cloaked &&
      !hData.dead &&
      data.isEnemy !== hData.isEnemy &&
      (hData.hasLiftOff ||
        hData.smartMissiles < hData.maxSmartMissiles ||
        !hData.parachutes)
    ) {
      // how far away is the target?
      if (useCircleMath) {
        if (
          isPointInCircle(
            hData.x + hData.halfWidth,
            hData.y + hData.height,
            data.x,
            data.y,
            triggerDistance
          )
        ) {
          result = helicopter[i];
          break;
        }
      } else if (Math.abs(hData.x - data.x) < triggerDistance) {
        result = helicopter[i];
        break;
      }
    }
  }

  return result;
}

function recycleTest(obj) {
  // did a unit reach the other side? destroy the unit, and reward the player with credits.
  let isEnemy, costObj, refund, type;
  const oData = obj.data;

  isEnemy = oData.isEnemy;

  if (!obj || oData.dead || oData.isRecycling) return;

  if (isEnemy) {
    // recycle point: slightly left of player's base
    if (oData.x > -48) return;
  } else {
    // recycle point: end of world
    if (oData.x < worldWidth) return;
  }

  oData.isRecycling = true;

  // animate down, back into the depths from whence it came
  utils.css.remove(obj.dom.o, 'ordering');
  utils.css.add(obj.dom.o, 'recycling');

  // ensure 'building' is set, as well. "pre-existing" game units will not have this.
  common.setFrameTimeout(() => {
    utils.css.add(obj.dom.o, 'building');
  }, 16);

  common.setFrameTimeout(() => {
    // if object was killed at the last second, no refund! ;)
    if (oData.dead) return;

    // die silently, and go away.
    obj.die({ silent: true });

    // tank, infantry etc., or special-case: engineer.
    type = oData.role ? oData.roles[oData.role] : oData.type;

    // special case: infantry may have been dropped by player, or when helicopter exploded.
    // exclude those from being "refunded" at all, given player was involved in their move.
    // minor: players could collect and drop infantry near enemy base, and collect refunds.
    if (type === TYPES.infantry && !oData.unassisted) return;

    costObj = COSTS[TYPES[type]];

    // reward player for their good work. 200% return on "per-item" cost.
    // e.g., tank cost = 4 credits, return = 8. for 5 infantry, 10.
    refund = (costObj.funds / (costObj.count || 1)) * 2;

    game.objects[TYPES.endBunker][isEnemy ? 1 : 0].data.funds += refund;

    if (game.players.local.data.isEnemy === isEnemy) {
      // notify player that a unit has been recycled?
      game.objects.notifications.add(
        `+${refund} 💰: recycled ${type} <span class="no-emoji-substitution">♻️</span>`
      );
      game.objects.funds.setFunds(
        game.objects[TYPES.endBunker][oData.isEnemy ? 1 : 0].data.funds
      );
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
      if (
        // "on the other side"
        game.objects[objectType][i].data.isEnemy !==
          game.players.local.data.isEnemy ||
        game.objects[objectType][i].data.hostile
      ) {
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

function countFriendly(objectType, includeDead = false) {
  return countSides(objectType, includeDead).friendly;
}

function playerOwnsBunkers() {
  // has the player captured (or destroyed) all bunkers? this may affect enemy convoy production.
  let owned,
    total,
    includeDead = true;

  owned =
    countFriendly(TYPES.bunker, includeDead) +
    countFriendly(TYPES.superBunker, includeDead);
  total =
    game.objects[TYPES.bunker].length + game.objects[TYPES.superBunker].length;

  return owned >= total;
}

function checkProduction() {
  let bunkersOwned, announcement;

  const gData = game.data;

  // playing extreme mode? this benefit would practically be cheating! ;)
  if (gameType === 'extreme') return;

  // network game? only show if playing co-op, humans vs. one or two CPUs.
  if (
    net.active &&
    gamePrefs.net_game_style !== 'coop_2v1' &&
    gamePrefs.net_game_style !== 'coop_2v2'
  )
    return;

  bunkersOwned = playerOwnsBunkers();

  if (!gData.productionHalted && bunkersOwned) {
    // player is doing well; reward them for their efforts.
    announcement =
      'You own all bunkers. <span class="inline-emoji">🎉</span>\nEnemy production is halted. <span class="inline-emoji">🚫</span>';
    gData.productionHalted = true;
  } else if (gData.productionHalted && !bunkersOwned) {
    // CPU has regained control of a bunker.
    announcement =
      'You no longer own all bunkers. <span class="inline-emoji">😰</span>\nEnemy production is resuming. <span class="inline-emoji">🛠️</span>';
    gData.productionHalted = false;
  }

  if (announcement) {
    game.objects.view.setAnnouncement(announcement);
    game.objects.notifications.add(announcement);
  }
}

export {
  canNotify,
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
  checkProduction
};
