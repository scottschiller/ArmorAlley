// helicopter AI extensions: wander

import { common } from '../core/common.js';
import { GAME_SPEED_RATIOED } from '../core/global.js';
import { Vector } from '../core/Vector.js';
import { addForce } from './Helicopter-forces.js';
import { brakeY } from './Helicopter-utils.js';

// a bit of breathing room
const END_OF_WORLD_BUFFER = 128;

const END_OF_WORLD_LEFT = 0 + END_OF_WORLD_BUFFER;
const END_OF_WORLD_RIGHT = 8192 - END_OF_WORLD_BUFFER;

function wander(data) {
  // default: go "toward the other guys" - and reverse if we reach the end of the world.
  if (data.didWander) return;

  if (data.vectors.arrive) {
    // ignore and delay if e.g., moving to shoot a balloon.
    resetSineWave(data);
    resetSineWaveTimer(data);
    return;
  }

  data.didWander = true;

  // bail if there is a priority operation underway, UNLESS heading for landing pad
  if (data.forces.arrive || (data.forces.seek && !data.wantsLandingPad)) {
    return;
  }

  let accel = new Vector();

  let onlyDodgingAmmo = data.forces.avoid && (Object.keys(data.forces.avoid).length === 1 && data.forces.avoid.munition);

  if (!data.wantsLandingPad) {
    if (data.isEnemy) {
      if (
        (data.vX < 0 && data.x <= END_OF_WORLD_LEFT && data.defaultDirection) ||
        (data.vX > 0 && data.x >= END_OF_WORLD_RIGHT && !data.defaultDirection)
      ) {
        data.defaultDirection = !data.defaultDirection;
      }
      if (!data.forces.avoid || onlyDodgingAmmo) {
        // don't always accelerate toward other end
        accel.x +=
          (data.vYMax / 30) *
          (data.defaultDirection ? -1 : 1) *
          GAME_SPEED_RATIOED;
      }
    } else {
      if (
        (data.vX > 0 &&
          data.x >= END_OF_WORLD_RIGHT &&
          data.defaultDirection) ||
        (data.vX < 0 && data.x <= END_OF_WORLD_LEFT && !data.defaultDirection)
      ) {
        data.defaultDirection = !data.defaultDirection;
      }
      if (!data.forces.avoid || onlyDodgingAmmo) {
        // don't always accelerate toward other end
        accel.x +=
          (data.vXMax / 30) *
          (data.defaultDirection ? 1 : -1) *
          GAME_SPEED_RATIOED;
      }
    }
  }

  // no sine wave if "avoid" - UNLESS, only gunfire / munition being dodged.
  if (
    !data.forces.avoid ||
    onlyDodgingAmmo
  ) {
    accel.y += sineWave(data);
  }

  addForce(data, accel, 'sineWave');
}

function resetSineWave(data) {
  data.sineFrameOffset = 0;
  data.lastSineY = undefined;
}

function sineWave(data) {
  /**
   * SINE WAVE flight pattern
   */

  if (!data.avoidingTurret && data.sineWaveTimer) {
    // TODO: see if this has a positive effect on avoidance.
    if (data.forces.avoid) {
      return 0;
    }

    // slow down if descending
    if (data.vY > 0) {
      brakeY(data, 0.9);
    }

    // more hackish: try to stay near top, but not moving too fast
    return data.y > 72 ? -0.1 : 0.1;
  }

  // greater dodging effect when turret gunfire is active
  let amplitude = 0.25 * (data.avoidingTurret ? 4 : 1);

  let frequency = 180;

  let amt = (data.sineFrameOffset % frequency) / frequency;

  let sineY = amplitude * Math.sin(amt * (Math.PI * 4));

  data.sineFrameOffset++;

  if (data.lastSineY === undefined) {
    data.lastSineY = sineY;
  }

  let vY = sineY - data.lastSineY;

  // only move upward if in lower part of screen; bias movement towards upward.
  if (!data.avoidingTurret && data.y > data.sineWaveMin) {
    // move upward faster
    if (vY < 0) return vY * (data.y / data.sineWaveMin);
    // move downward more slowly
    return vY * (data.sineWaveMin / data.y);
  }

  // move relative to sine wave math.
  return sineY - data.lastSineY;
}

function resetSineWaveTimer(data) {
  // delay "sine wave" activity
  if (data.sineWaveTimer) {
    // back to zero
    data.sineWaveTimer.restart();
  } else {
    // new timer
    data.sineWaveTimer = common.setFrameTimeout(
      () => (data.sineWaveTimer = null),
      2000
    );
  }
}

function clearSineWaveTimer(data) {
  if (data.sineWaveTimer) {
    data.sineWaveTimer.reset();
    data.sineWaveTimer = null;
  }
}

export {
  clearSineWaveTimer,
  resetSineWave,
  resetSineWaveTimer,
  sineWave,
  wander
};
