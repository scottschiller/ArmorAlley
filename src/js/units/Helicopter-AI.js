/**
 * Helicopter "AI"
 * Rudimentary, dumb smarts using vectors and basic steering behaviours.
 * As with prior versions in the 2010s: To call this "AI" would be an insult to the AI community. ;)
 * Rule-based logic: Detect, target and destroy enemy targets, hide in clouds, return to base as needed and so forth.
 */

import { searchParams, TYPES } from '../core/global.js';
import { collisionCheckX, objectInView } from '../core/logic.js';
import { utils } from '../core/utils.js';
import { getAverages, Vector } from '../core/Vector.js';
import {
  avoidBuildings,
  avoidNearbyMunition,
  avoidVerticalObstacle
} from './Helicopter-avoid.js';
import { brakeX, distance, findEnemy } from './Helicopter-utils.js';
import { applyForces } from './Helicopter-forces.js';
import { checkVerticalRange, seekLandingPad } from './Helicopter-steering.js';
import { resetSineWave, wander } from './Helicopter-wander.js';
import { levelFlags } from '../levels/default.js';

const debugCanvas = searchParams.get('debugCollision');

// low fuel means low fuel. or ammo. or bombs.
let lowFuelLimit = 30;
let lowEnergyLimit = 2;

const HelicopterAI = (options = {}) => {
  const { data } = options.exports;

  data.sineWaveTimer = null;
  data.sineFrameOffset = 0;
  data.sineWaveMin = 128;

  data.averages = getAverages();

  let target;
  let tData;

  let ahead;
  let lastTarget;

  data.vectors = {
    acceleration: new Vector(0, 0),
    seek: null,
    arrive: null,
    avoid: null
  };

  data.forces = {
    /*
      avoid: { 'balloon': [], 'gunfire': [], 'default': [] }
      seek: {}
      arrive: {}
    */
  };

  // similar to forces
  data.actions = {};

  function resetForces() {
    data.forces = {};
  }

  function resetActions() {
    data.actions = {};
  }

  function throttleVelocity() {
    data.vX = Math.max(-data.vXMax, Math.min(data.vXMax, data.vX));
    data.vY = Math.max(-data.vYMax, Math.min(data.vYMax, data.vY));
  }

  function ai() {
    // ignore if dead
    if (data.dead) return;

    // wait until fully-respawned, including initial undefined / not-yet-initialized case.
    if (data.respawning || data.respawning === undefined) return;

    // ignore if on empty.
    if (data.fuel <= 0) return;

    // reset counts
    data.votes.ammo = 0;
    data.votes.bomb = 0;

    // TODO: ridiculous - refactor.
    data.ammoTargets = [];
    data.bombTargets = [];

    data.avoidingTurret = false;
    data.dodgedBullet = false;
    data.foundSteerTarget = false;
    data.wantsLandingPad = false;

    target = null;
    tData = null;

    data.vectors.acceleration = new Vector();

    data.didWander = false;

    landingPadCheck();
    checkLastAndNewTarget();
    avoidBuildings(data);
    checkVerticalRange(data);
    avoidVerticalObstacle(tData, data);
    avoidNearbyMunition(data);
    maybeFireOrBomb(data, options);

    // reset
    data.ammoTargets = [];
    data.bombTargets = [];

    // motion
    wander(data);
    applyForces(data);
    throttleVelocity();
    resetForces();
    resetActions();
  }

  function landingPadCheck() {
    // low fuel means low fuel. or ammo. or bombs.
    if (
      (data.fuel < lowFuelLimit ||
        data.energy < lowEnergyLimit ||
        (!data.ammo && !data.bombs)) &&
      data.energy > 0 &&
      !data.landed &&
      !data.repairing
    ) {
      seekLandingPad(data, options);
      return;
    }

    if (
      data.onLandingPad &&
      (data.repairing || !data.repairComplete) &&
      (data.vX !== 0 || data.vY !== 0)
    ) {
      data.vX = 0;
      data.vY = 0;
    }
  }

  function checkLastAndNewTarget() {
    if (lastTarget) {
      // did current or recent target become invalidated, or (TODO) unreachable?
      let ltData = lastTarget?.data;

      if (ltData.dead) {
        // was it a tank? reset tank-seeking mode until next interval.
        if (ltData.type === TYPES.tank) {
          data.targeting.tanks = false;
        }

        lastTarget = null;
      } else if (ltData.cloaked) {
        // did the player go behind a cloud?
        lastTarget = null;
      }
    }

    let newTarget;

    if (!data.wantsLandingPad) {
      if (data.targeting.tanks && (data.bombs || data.ammo)) {
        newTarget = objectInView(data, { items: TYPES.tank });
      }

      if (!newTarget && data.targeting.clouds) {
        newTarget = objectInView(data, { items: TYPES.cloud });
      }

      if (!newTarget && data.targeting.helicopters) {
        newTarget = objectInView(data, { items: TYPES.helicopter });
      }

      if (newTarget) {
        lastTarget = target;
        target = newTarget;
        tData = target.data;
      } else {
        // fallback: try for chopper or balloon at any time
        // NOTE: exclude balloons if chopper is armed with "aimed" missiles.
        newTarget =
          data.ammo &&
          (levelFlags.bullets
            ? findEnemy(data, [TYPES.helicopter, TYPES.balloon])
            : findEnemy(data, [TYPES.helicopter]));
        if (newTarget.length) {
          target = newTarget[0];
          tData = target.data;
        }
      }
    }

    if (tData && tData.type !== TYPES.cloud) {
      maybeFireAtTarget(target);
      maybeBombTarget(target);
    }
  }

  function maybeBombTarget(target) {
    /**
     * WITHIN BOMBING RANGE
     */
    const targetData = target?.data;
    if (!targetData) return;

    if (
      collisionCheckX(targetData, data) &&
      data.y < targetData.y &&
      Math.abs(data.vX) <= Math.abs(targetData.vX)
    ) {
      // align on X-axis, and player / balloon / tank is below...
      // drop ze bombs!
      brakeX(data, 0.98);
      data.votes.bomb++;
      data.bombTargets.push(targetData);
    }
  }

  function maybeFireAtTarget(target) {
    /**
     * WITHIN FIRING RANGE
     */
    const targetData = target?.data;
    if (!targetData) return;

    let isHelicopter = targetData.type === TYPES.helicopter;
    if (
      distance(targetData.x, data.x) < 320 &&
      // NOTE: tighter Y restrictions when using guided missiles vs. bullets.
      // TODO: refactor and tidy up.
      distance(targetData.y, data.y) <
        (!isHelicopter
          ? data.halfHeight
          : levelFlags.bullets
            ? data.height * 1.5
            : data.height) &&
      // if helicopter + guided missiles, ensure CPU is above human chopper OR near top of screen as missiles "fall" downward.
      (!isHelicopter ||
        levelFlags.bullets ||
        targetData.y > data.y ||
        data.y < 48) &&
      // try to limit velocity, OR, eliminate use of angle on gunfire.
      (isHelicopter || (Math.abs(data.vY) <= 3 && Math.abs(data.vX < 5)))
    ) {
      data.votes.ammo++;
      data.ammoTargets.push(targetData);
      options.exports.checkFacingTarget(target);
    }
  }

  function maybeFireOrBomb(data, options) {
    if (!data.bombing && data.votes.bomb) {
      options.exports.callAction('setBombing', true);
    } else if (data.bombing && !data.votes.bomb) {
      options.exports.callAction('setBombing', false);
    }

    if (!data.firing && data.votes.ammo) {
      options.exports.callAction('setFiring', true);
    } else if (data.firing && !data.votes.ammo) {
      options.exports.callAction('setFiring', false);
      data.ammoTarget = null;
    }

    if (data.firing && data.ammo) {
      // TODO: ensure fire rate is set based on current (active/closest) target
      data.ammoTargets.sort(utils.array.compare('x'));
      data.ammoTarget = data.ammoTargets[0];
      options.exports.setCPUFiringRate(data.ammoTargets[0]?.type);
    }

    if (data.bombing && data.bombs) {
      // TODO: ensure bomb rate is set based on active target
      data.bombTargets.sort(utils.array.compare('x'));
      options.exports.setCPUBombingRate(data.bombTargets[0]?.type);
    }
  }

  return {
    animate: ai,
    maybeFireAtTarget,
    resetSineWave
  };
};

export { HelicopterAI };
