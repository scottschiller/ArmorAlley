// helicopter AI extension: avoidance methods

import { searchParams, TYPES } from '../core/global.js';
import { collisionCheckX } from '../core/logic.js';
import {
  averageForce,
  MAX_AVOID_AHEAD,
  MAX_VELOCITY,
  seek,
  Vector
} from '../core/Vector.js';
import {
  brakeX,
  brakeXY,
  findEnemy,
  getCompositeObject,
  lineIntersectsObject,
  TOO_LOW
} from './Helicopter-utils.js';
import { addForce } from './Helicopter-forces.js';
import { steerTowardTarget } from './Helicopter-steering.js';

const debugCanvas = searchParams.get('debugCollision');
const whiskerColor = '#888';

function improvedAvoid(data, nearbyObstacle, avoidScale = 0.125) {
  let target = new Vector(nearbyObstacle.data.x, nearbyObstacle.data.y);
  let pos = new Vector(data.x, data.y);
  let velocity = new Vector(data.vX, data.vY);

  // avoid = seek in reverse
  let seekForce = seek(target, pos, velocity, data.vXMax, data.vXMax);
  let avoidance = seekForce.clone();

  avoidance.normalize();

  if (avoidScale) {
    avoidance.setMag(avoidScale);
  }

  // and reverse.
  avoidance.mult(-1);

  // special case, "wall" navigation: avoid "composite" objects (bunker / chain / balloon) by ensuring upward movement.
  if (nearbyObstacle.data.type === 'composite' && avoidance.y > 0) {
    // head upward, and amp up avoidance a bit.
    avoidance.y *= -1.1;
  }

  if (data.y > TOO_LOW && (data.vY > 0 || avoidance.y > 0)) {
    // TOO LOW case: avoidance might be trying to move further downward to ignore a ground unit, i.e., bunker. Ignore and move upward.
    avoidance.y = Math.abs(avoidance.y) * -0.125;
  }

  // finally, average.
  averageForce(avoidance, data.averages, 'avoid');

  return avoidance;
}

function collisionAvoidance(data, pos, velocity, obstacles) {
  /**
   * Using "whiskers" that project from the helicopter at angles
   * and magnitudes based on velocity, detect and avoid nearby obstacles.
   * Use `debugCanvas=1` to see these drawn visually during gameplay.
   */

  // start from center of chopper
  let halfOffset = new Vector(data.halfWidth, data.halfHeight);

  let position = pos.clone();
  position.add(halfOffset);

  // min/max ranges, to keep things reasonably sane
  const magVel = Math.max(
    data.width * 0.75,
    Math.min(data.width, (MAX_AVOID_AHEAD * velocity.mag()) / MAX_VELOCITY)
  );

  let tv = velocity.clone();
  tv.setMag(magVel);

  let ahead = position.clone();
  ahead.add(tv);

  if (debugCanvas) {
    common.domCanvas.drawForceVector(position, tv, whiskerColor, 1);
    common.domCanvas.drawPoint(ahead, whiskerColor);
  }

  // figure out angle, then subtract an amount
  // opposite and adjacent are known
  let angle = velocity.getAngle();

  let whiskerAngleOffset = 40 * (Math.PI / 180);

  angle -= whiskerAngleOffset;

  // left whiskers
  let leftWhiskerX = Math.cos(angle) * MAX_AVOID_AHEAD;
  let leftWhiskerY = Math.sin(angle) * MAX_AVOID_AHEAD;

  let leftWhisker = position.clone();

  let tvLeft = velocity.clone();
  tvLeft.add(new Vector(leftWhiskerX, leftWhiskerY));
  tvLeft.setMag(magVel);

  leftWhisker.add(tvLeft);

  angle = velocity.getAngle();

  angle += whiskerAngleOffset;

  // left whiskers
  let rightWhiskerX = Math.cos(angle) * MAX_AVOID_AHEAD;
  let rightWhiskerY = Math.sin(angle) * MAX_AVOID_AHEAD;

  let rightWhisker = position.clone();

  let tvRight = velocity.clone();
  tvRight.add(new Vector(rightWhiskerX, rightWhiskerY));
  tvRight.setMag(magVel);

  rightWhisker.add(tvRight);

  let tvAbove = new Vector(0, -MAX_VELOCITY);
  tvAbove.setMag((magVel * 2) / 3);

  let above = position.clone();
  above.add(tvAbove);

  let tvBelow = new Vector(0, MAX_VELOCITY);
  tvBelow.setMag((magVel * 2) / 3);

  let below = position.clone();
  below.add(tvBelow);

  if (debugCanvas) {
    common.domCanvas.drawForceVector(position, tvLeft, whiskerColor, 1);
    common.domCanvas.drawPoint(leftWhisker, whiskerColor);

    common.domCanvas.drawForceVector(position, tvRight, whiskerColor, 1);
    common.domCanvas.drawPoint(rightWhisker, whiskerColor);

    common.domCanvas.drawForceVector(options.exports, tvAbove, whiskerColor, 1);
    common.domCanvas.drawPoint(above, whiskerColor);

    common.domCanvas.drawForceVector(options.exports, tvBelow, whiskerColor, 1);
    common.domCanvas.drawPoint(below, whiskerColor);
  }

  let avoidCount = 0;
  let newAvoidance;
  let totalAvoidance = new Vector(0, 0);

  let vehicleLines = [ahead, leftWhisker, rightWhisker, above, below];

  for (let i = 0; i < obstacles.length; i++) {
    let obstacle = obstacles[i];
    let collision;

    // aligned, or too close on X? if so, check that Y delta is "risky."
    collision =
      (Math.abs(obstacle.data.x - data.x) < 72 ||
        collisionCheckX(obstacle.data, data)) &&
      Math.abs(data.y - obstacle.data.y) < data.height * 2;

    if (collision) {
      avoidCount++;

      // slow down, braking effect?
      brakeXY(data, 0.95);

      newAvoidance = improvedAvoid(data, obstacle);

      totalAvoidance.add(newAvoidance);
    } else {
      // if not aligned on X, check rays.
      for (let j = 0; j < vehicleLines.length; j++) {
        collision = lineIntersectsObject(
          position,
          velocity,
          vehicleLines[j],
          obstacle.data
        );

        // add all obstacle avoidance vectors, then divide to get the average.
        if (collision) {
          avoidCount++;

          newAvoidance = improvedAvoid(data, {
            data: { x: vehicleLines[j].x, y: vehicleLines[j].y }
          });
        }

        totalAvoidance.add(newAvoidance);
      }
    }
  }

  if (avoidCount) {
    // average the avoidance forces, based on the number of obstacles found.
    totalAvoidance.div(avoidCount);
  } else {
    // nullify
    totalAvoidance.mult(0);
  }

  return totalAvoidance;
}

function avoidBuildings(data) {
  /**
   * AVOID BUILDINGS (unless trying to land)
   */

  let parsedBuildings = [];

  let buildings = findEnemy(
    data,
    [
      TYPES.helicopter,
      TYPES.balloon,
      TYPES.bunker,
      TYPES.superBunker,
      TYPES.chain
    ],
    256
  );

  buildings?.forEach?.((b) => {
    // IF the closest thing is a free-floating balloon, seek it out - IF we have ammo and it's targetable...
    if (
      b?.data?.type === 'balloon' &&
      b.data.cpuCanTarget &&
      !b.objects?.chain &&
      data.ammo &&
      !data.foundSteerTarget &&
      !data.wantsLandingPad
    ) {
      // only steer toward one thing per frame.
      data.foundSteerTarget = true;

      steerTowardTarget(data, b.data, 64);
      // hackish / circuitous: call helicopter AI method
      data.ai.maybeFireAtTarget(b);
    }

    // can this item be excluded? i.e., helicopter is moving away from it (and not a balloon or the human chopper)
    if (b.data.type !== TYPES.balloon && b.data.type !== TYPES.helicopter) {
      if (data.vX > 0 && b.data.x < data.x) {
        // obstacle to the left, chopper moving right
        return;
      }
      if (data.vX < 0 && b.data.x > data.x) {
        // obstacle to the right, chopper moving left
        return;
      }
    }

    if (debugCanvas && b) {
      // console.log('found building', b.data.guid, b.data.y, data.y);
      common.domCanvas.drawDebugRect(
        b.data.x,
        b.data.y,
        b.data.width, // + rect1XLookAhead,
        b.data.height,
        '#66ffff',
        'rgba(255, 255, 255, 0.33)'
      );
    }

    // hackish: if a bunker <-> chain <-> balloon, treat the whole thing as one big obstacle shape.
    // BUT, don't wrap bunkers or balloons up in here; let them stay in the list as unique objects to be avoided.

    if (b.data.type === 'chain') {
      let compositeObj = getCompositeObject(b);
      b = {
        data: compositeObj
      };
      if (debugCanvas) {
        common.domCanvas.drawDebugRect(
          compositeObj.x,
          compositeObj.y,
          compositeObj.width, // + rect1XLookAhead,
          compositeObj.height,
          '#ff6666'
        );
      }
    }

    // exclude balloons, unless they lack a chain.
    if ((b && b.data.type !== TYPES.balloon) || !b.objects?.chain) {
      parsedBuildings.push(b);
    }
  });

  let avoidance = collisionAvoidance(
    data,
    new Vector(data.x, data.y),
    new Vector(data.vX, data.vY),
    parsedBuildings
  );

  if (avoidance.mag() > 0) {
    brakeXY(data, 0.98);
    addForce(data, avoidance, 'avoid');
  }
}

function avoidVerticalObstacle(tData, data) {
  /**
   * AVOID HUMAN CHOPPER (or other obstacle)
   */

  if (!tData) return;

  // X-axis align, and player (or some other obstacle) is flying above CPU - an advantage (or slightly below, not an advantage.)
  if (
    tData.type === TYPES.helicopter &&
    collisionCheckX(tData, data) &&
    Math.abs(tData.y - data.y) < data.height * 2
  ) {
    // something is near the chopper - dodge up or down, in particular.
    let avoidMag = 0.125;
    let avoidForce = improvedAvoid(data, { data: tData }, avoidMag);
    addForce(data, avoidForce, 'avoid', tData.type);
  } else {
    // only chase if not already going after a balloon?
    // TODO: refactor CPU "can target" logic for other applicable objects
    if (
      !data.foundSteerTarget &&
      !data.wantsLandingPad &&
      (tData.type !== TYPES.balloon || tData.cpuCanTarget)
    ) {
      data.foundSteerTarget = true;
      steerTowardTarget(data, tData, tData.type === TYPES.cloud ? -1 : 64);
    }
  }
}

function avoidNearbyMunition(data) {
  /**
   * NEARBY OBSTACLES: GUNFIRE, MISSILES, BOMBS ETC.
   */

  let nearbyObstacle;
  let validObstacle;
  let gunfireObstacles = findEnemy(data, TYPES.gunfire, 192);

  nearbyObstacle = gunfireObstacles[0];

  let isTurretGunfire;

  // don't dodge gunfire that's moving away / past chopper.
  if (nearbyObstacle) {
    isTurretGunfire =
      nearbyObstacle.data.type === TYPES.gunfire &&
      nearbyObstacle.data.parentType === TYPES.turret;

    if (nearbyObstacle.data.vX > 0 && nearbyObstacle.data.x > data.x) {
      // gunfire passing to the right - ignore.
      if (!isTurretGunfire) {
        brakeX(data, 0.95);
      }
      nearbyObstacle = null;
    } else if (nearbyObstacle.data.vX < 0 && nearbyObstacle.data.x < data.x) {
      // gunfire passing to the left - ignore.
      if (!isTurretGunfire) {
        brakeX(data, 0.95);
      }
      nearbyObstacle = null;
    }
  }

  // only allow one regular gunfire check per frame.
  if (validObstacle) {
    if (!data.dodgedBullet) {
      data.dodgedBullet = true;
    } else {
      validObstacle = false;
    }
  }

  if (nearbyObstacle) {
    // reasonably close on Y-axis?
    validObstacle = Math.abs(data.y - nearbyObstacle.data.y) < data.height * 2;
    if (isTurretGunfire) {
      data.avoidingTurret = true;
    }
  }

  if (!validObstacle) {
    // smart missiles
    gunfireObstacles = findEnemy(data, TYPES.smartMissile);
    nearbyObstacle = gunfireObstacles[0];
    validObstacle = nearbyObstacle || false;
  }

  if (!validObstacle) {
    // bombs
    gunfireObstacles = findEnemy(data, TYPES.bomb, 64);
    nearbyObstacle = gunfireObstacles[0];
    validObstacle = nearbyObstacle || false;
  }

  if (!validObstacle) return;

  // incoming munition or object
  let avoidScale = isTurretGunfire ? 2 : 0;
  let avoidMunition = improvedAvoid(data, nearbyObstacle, avoidScale);

  // hackish: reduce X avoidance of gunfire significantly.
  if (isTurretGunfire) {
    // don't avoid turrets on X at all.
    avoidMunition.x = 0;
  } else {
    // cut down X-axis movement for regular case.
    avoidMunition.x *= 0.5;
  }

  // avoid getting stuck at the top; dive below if near the top of the screen.
  if (data.y < 64 && data.vY < 0) {
    avoidMunition.y = Math.abs(avoidMunition.y);
  }

  addForce(data, avoidMunition, 'avoid', 'munition');
}

export { avoidNearbyMunition, avoidVerticalObstacle, avoidBuildings };
