// helicopter AI extensions: steering

import { game } from '../core/Game.js';
import { searchParams, TYPES, worldHeight } from '../core/global.js';
import { dist, seek, Vector } from '../core/Vector.js';
import { brakeX, brakeXY, brakeY, TOO_LOW } from './Helicopter-utils.js';
import { addForce } from './Helicopter-forces.js';
import { resetSineWaveTimer } from './Helicopter-wander.js';
import { common } from '../core/common.js';

const debugCanvas = searchParams.get('debugCollision');

let arriveOffsetDefault = 16;

function seekTarget(data, targetData, mag = 0.075) {
  // guard: trying to fly to non-landing-pad target, when it is a priority.
  if (data.wantsLandingPad && targetData.type !== TYPES.landingPad) return;

  let seekTarget = new Vector(targetData.x, targetData.y);
  let pos = new Vector(data.x, data.y);
  let velocity = new Vector(data.vX, data.vY);

  let seekForce = seek(seekTarget, pos, velocity, data.vXMax, data.vXMax);

  // TODO: make nicer so it's more of an approach.
  seekForce.setMag(mag);

  if (debugCanvas) {
    common.domCanvas.drawPoint(seekTarget, '#ff33ff', true);
  }

  addForce(data, seekForce, 'seek', targetData.type);
}

function steerTowardTarget(
  data,
  targetData,
  arriveOffset = arriveOffsetDefault,
  ignoreY = false
) {
  let tankBombCase = targetData.type === TYPES.tank && data.bombs;

  // hackish: tank targeting - move helicopter to safe bombing position above tank.
  if (tankBombCase) {
    arriveOffset = -1;
  }

  // special-case arriveOffset: use midpoint of target, minus a quarter(?) chopper width so we land in the center.
  let targetX =
    arriveOffset === -1
      ? targetData.x + targetData.halfWidth - data.halfWidth
      : targetData.x +
        (data.x > targetData.x + targetData.width
          ? targetData.width + arriveOffset
          : -arriveOffset - targetData.width) +
        targetData.vX;

  // if "ignoring" Y, then use present chopper Y value ("no change") and just move on X.
  let targetY = ignoreY ? data.y : targetData.y;

  if (tankBombCase) {
    targetY = Math.min(300, data.y);
  } else if (targetData.type === TYPES.cloud) {
    // tweak for vertical centering within cloud
    targetY += targetData.halfHeight / 2;
  }

  let target = new Vector(targetX, targetY);
  let pos = new Vector(data.x, data.y);
  let velocity = new Vector(data.vX, data.vY);

  if (debugCanvas) {
    common.domCanvas.drawPoint(target, '#ff3333', true);
  }

  let arriveForce;

  arriveForce = seek(target, pos, velocity, data.vXMax, data.vXMax);

  let d = dist(target, pos);

  // smooth approach, slow down when nearby
  if (targetData.type === TYPES.balloon) {
    arriveForce.setMag(
      Math.max(0.1, Math.min(0.5, (d / targetData.height) * 0.5))
    );
    if (d < 64) {
      brakeXY(data, 0.95);
    }
  } else if (targetData.type === TYPES.landingPad) {
    arriveForce.setMag(0.15);
  } else if (targetData.type === TYPES.tank) {
    arriveForce.setMag(0.15);
    if (d < 64) {
      brakeX(data, 0.98);
    }
  } else if (targetData.type === TYPES.cloud) {
    arriveForce.setMag(0.15);
    if (d < targetData.width) {
      brakeXY(data, 0.98);
    }
  } else {
    arriveForce.setMag(0.3);
  }

  addForce(data, arriveForce, 'arrive', targetData.type);
}

function seekLandingPad(data, options) {
  if (data.firing) options.exports.callAction('setFiring', false);
  if (data.bombing) options.exports.callAction('setBombing', false);

  /**
   * fly toward closest landing pad.
   * use own base if within 25% of respective end of battlefield.
   * otherwise, use "neutral" mid-level base.
   * if you're there and the enemy decides to land,
   * you're going to find yourself in trouble. ;)
   */

  data.wantsLandingPad = true;

  const pads = game.objects[TYPES.landingPad];

  let target, targetData, deltaX, deltaY;

  if (data.isEnemy) {
    target = pads[pads.length - (data.x > 6144 ? 1 : 2)];
  } else {
    target = pads[data.x < 2048 ? 0 : 1];
  }

  targetData = target.data;

  options.exports.checkFacingTarget(target);

  let force;

  // centered above / within landing pad width?
  if (
    data.x >= targetData.x &&
    data.x + data.width <= targetData.x + targetData.width
  ) {
    let distanceToLand = Math.abs(targetData.y - data.y);
    let seekMag = Math.min(
      0.5,
      Math.max(0.25, (distanceToLand / worldHeight) * 0.75)
    );

    seekTarget(
      data,
      {
        x: targetData.x + targetData.halfWidth / 3,
        y: targetData.y + targetData.height,
        type: targetData.type
      },
      seekMag
    );

    // kill sine wave activity
    resetSineWaveTimer(data);

    // slow down on X
    brakeX(data, 0.98);

    // ensure downward movement?
    if (data.vY < 3) data.vY += 0.01;
  } else {
    // steer toward the center of the landing pad, and the lower third of the screen.
    seekTarget(data, {
      x: targetData.x,
      y: Math.min(250, data.y),
      type: targetData.type
    });
  }
}

function checkVerticalRange(data) {
  // HACKISH: don't fly too low, nor too high.
  if (data.y > TOO_LOW && data.vY > 0) {
    if (
      data.forces.seek?.['landing-pad'] ||
      data.forces.arrive?.['landing-pad']
    ) {
      // slow down, though.
      brakeY(data, 0.9);
    } else {
      brakeY(data, 0.75);
      data.vY -= 0.1;
    }
  } else if (data.y < 64 && data.vY < 0) {
    // if chasing e.g., a balloon, allow chopper to fly as high as it wants.
    // otherwise, don't fly too close to the sun - per se.
    if (!data.forces.arrive && !data.forces.seek) {
      brakeY(data, 0.9);
      data.vY += 0.1;
    }
  }
}

export { checkVerticalRange, seekTarget, steerTowardTarget, seekLandingPad };
