/**
 * Helicopter "AI"
 * Rudimentary, dumb smarts using vectors and basic steering behaviours.
 * As with prior versions in the 2010s: To call this "AI" would be an insult to the AI community. ;)
 * Rule-based logic: Detect, target and destroy enemy targets, hide in clouds, return to base as needed and so forth.
 */

import { FPS, rngBool, rngInt, tutorialMode, TYPES } from '../core/global.js';
import {
  collisionCheckX,
  isFacingTarget,
  objectInView,
  objectsInView
} from '../core/logic.js';
import { utils } from '../core/utils.js';
import { getAverages, Vector } from '../core/Vector.js';
import {
  avoidBuildings,
  avoidNearbyMunition,
  avoidAboveOrBelow
} from './Helicopter-avoid.js';
import { brakeX, distance, findEnemy } from './Helicopter-utils.js';
import { applyForces } from './Helicopter-forces.js';
import {
  checkVerticalRange,
  seekLandingPad,
  steerTowardTarget
} from './Helicopter-steering.js';
import { resetSineWave, wander } from './Helicopter-wander.js';
import { levelFlags } from '../levels/default.js';
import { net } from '../core/network.js';
import { common } from '../core/common.js';
import { gameType } from '../aa.js';
import { game } from '../core/Game.js';

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

  // "AI-assigned" opposing helicopter targeting
  let missileTarget;
  let missileLaunchTimer;

  // throttle how often the helicopter can decide to chase when hit by e.g., gunfire
  let respondToHitTimer;
  let respondToHitDelay = 1000;

  // at which point the chopper can retaliate
  let missileEnergyThreshold =
    gameType === 'extreme' ? 8 : gameType === 'hard' ? 5 : 2;

  // when to go easy on the player, apropos
  let oneMissileOnly = gameType === 'easy';

  // throttle how often paratroopers can be dropped over target(s)
  let paratrooperDropTimer;
  let paratrooperDropDelay = 30000;

  let parachutingActiveTimer;

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
    data.foundSteerTarget = false;
    data.wantsLandingPad = false;

    target = null;
    tData = null;

    data.vectors.acceleration = new Vector();

    data.didWander = false;

    // go for the landing pad?
    landingPadCheck();

    // new target(s)?
    checkLastAndNewTarget();

    // high priority: avoid obstacles.
    let foundBuilding = avoidBuildings(data);
    let foundAboveOrBelow = avoidAboveOrBelow(tData, data);

    if (!foundBuilding || foundAboveOrBelow) {
      // if "safe," go for target.
      maybeSteerTowardTarget(tData, data);

      // dodge bullets, etc., if also no obstacle.
      avoidNearbyMunition(data);
    }

    // incoming gunfire etc.
    checkThreats();

    // offensive
    maybeFireOrBomb(data, options);

    // motion
    wander(data);

    checkVerticalRange(data);

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
      if (!newTarget && data.targeting.helicopters) {
        newTarget = objectInView(data, { items: TYPES.helicopter });
      }

      if (data.targeting.tanks && (data.bombs || data.ammo)) {
        newTarget = objectInView(data, { items: TYPES.tank });
      }

      if (!newTarget && data.targeting.bunkers) {
        newTarget = objectInView(data, { items: TYPES.bunker });
      }

      if (!newTarget && data.targeting.clouds) {
        newTarget = objectInView(data, { items: TYPES.cloud });
      }

      if (newTarget) {
        lastTarget = target;
        target = newTarget;
        tData = target.data;
      } else if (levelFlags.bullets && data.ammo) {
        // fallback: try for balloons, if we have bullets and not "aimed" missiles.
        newTarget = findEnemy(data, TYPES.balloon);
        if (newTarget.length) {
          target = newTarget[0];
          tData = target.data;
        }
      }
    }

    if (tData) {
      if (data.targeting.bunkers && tData.type === TYPES.bunker) {
        maybeDropParatroopersNearTarget(target);
      } else if (tData.type !== TYPES.cloud) {
        maybeFireAtTarget(target);
        maybeBombTarget(target);
      }
    }

    /**
     * Always be up for bombing opposing choppers, if not already the target.
     * Also, consider launching "dumb" aimed missiles if armed accordingly.
     */

    for (var i = 0, j = game.objects.helicopter.length; i < j; i++) {
      if (
        game.objects.helicopter[i].data.isEnemy !== data.isEnemy &&
        game.objects.helicopter[i] !== target
      ) {
        maybeBombTarget(game.objects.helicopter[i]);
        // additional special case: fire aimed missiles at any time.
        if (!levelFlags.bullets) {
          maybeFireAtTarget(game.objects.helicopter[i]);
        }
      }
    }
  }

  function checkThreats() {
    /**
     * Identify incoming / nearby things to fire at, but not chase.
     * NOTE: only fire at things the chopper is facing - no backwards firing tricks.
     * TODO: cpuCanTarget on smartMissile and parachuteInfantry?
     */
    let nearbyThreats = findEnemy(
      data,
      [TYPES.smartMissile, TYPES.parachuteInfantry],
      192
    );

    let threat = nearbyThreats[0];

    // ensure the target has *some* room, not almost directly above or below.
    if (
      threat &&
      isFacingTarget(threat.data, data) &&
      distance(threat.data.x, data.x) >= data.width
    ) {
      data.votes.ammo++;
      data.ammoTargets.push(threat.data);
    }
  }

  function maybeDecoySmartMissile() {
    /**
     * If airborne and targeted by a newly-minted smart missile,
     * (maybe) drop a decoy paratrooper.
     */

    // nothing to drop?
    if (!options.exports.data.parachutes) return;

    // don't implement in network games until tested and stable.
    if (net.active) return;

    // "reasonably" airborne, time for parachute to open etc.?
    if (options.exports.data.landed || options.exports.data.y > 300) return;

    // 50% chance...
    if (!rngBool(TYPES.helicopter)) return;

    // finally, deploy
    dropParatroopersAtRandom();
  }

  function dropParatroopersAtRandom(
    delay = rngInt(1000, TYPES.helicopter),
    minimalDelay
  ) {
    /**
     * Deploy a random number of paratroopers, using a random delay basis for both start and duration.
     * This means the chopper can be late to act (e.g., decoy a smart missile), AND/OR, it may drop multiple paratroopers.
     */
    if (parachutingActiveTimer) return;

    parachutingActiveTimer = common.setFrameTimeout(() => {
      options.exports.setParachuting(true);

      let stopDelay = minimalDelay ? 1 / FPS : delay / 2;

      // and, stop dropping momentarily.
      common.setFrameTimeout(() => {
        options.exports.setParachuting(false);
        parachutingActiveTimer = null;
      }, stopDelay);
    }, delay);
  }

  function maybeSteerTowardTarget(tData, data) {
    if (!tData) return;
    // TODO: refactor CPU "can target" logic for other applicable objects
    let isStructure =
      tData.type === TYPES.bunker ||
      tData.type === TYPES.superBunker ||
      tData.type === TYPES.endBunker ||
      tData.type === TYPES.turret;
    if (
      !data.foundSteerTarget &&
      !data.wantsLandingPad &&
      // don't go explicitly after balloons.
      tData.type !== TYPES.balloon &&
      !isStructure &&
      // don't try to go after landed helicopters.
      !tData.landed
    ) {
      // go for it!
      data.foundSteerTarget = true;
      // TODO: review offset logic.
      steerTowardTarget(
        data,
        tData,
        tData.type === TYPES.cloud ? -1 : data.halfWidth
      );
    }
  }

  function maybeBombTarget(target) {
    /**
     * WITHIN BOMBING RANGE
     */
    const targetData = target?.data;
    if (!targetData || targetData.dead) return;

    if (collisionCheckX(targetData, data) && data.y < targetData.y) {
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
    let dX = distance(targetData.x, data.x);
    if (
      // ignore if too far away, OR basically right above / underneath.
      dX < 320 &&
      dX > data.width &&
      distance(targetData.y, data.y) < data.height * 1.5
    ) {
      /**
       * If helicopter + guided missiles, ensure CPU is above human chopper
       * OR near top of screen as missiles "fall" downward.
       */

      // special case: don't fire dumb / aimed missiles when target is above, unless near top of screen.
      if (!levelFlags.bullets && targetData.y < data.y && data.y > 48) return;

      // queue action.
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

  function maybeDropParatroopersNearTarget(target) {
    if (!target) return;

    let tData = target.data;

    if (!tData) return;

    // only run once in a while
    if (paratrooperDropTimer) return;

    // bunker case: approximately above enemy target?
    if (target.data.type === TYPES.bunker && !collisionCheckX(tData, data))
      return;

    if (target.data.type === TYPES.turret) {
      // turret case: we must be approaching, not directly over or past the target.

      // firstly, we also don't want to be too far away.
      if (distance(data.x, tData.x) > 64) return;

      if (data.isEnemy && data.x < tData.x + tData.width) return;
      if (!data.isEnemy && data.x + data.width > tData.x) return;
    }

    // be smart / efficient: is there already a nearby unit that may get the bunker?
    let friendsInView = objectsInView(data, {
      items: [TYPES.parachuteInfantry, TYPES.infantry],
      friendlyOnly: true
    });

    let validFriends = friendsInView.filter((f) => {
      /**
       * Paratrooper / infantry must be moving toward the target - not already past it.
       * Account for enemy and "friendly" CPUs, since human players can have friendly CPUs in network games.
       */
      return (
        (f.data.isEnemy && f.data.x > tData.x + tData.halfWidth) ||
        (!f.data.isEnemy && f.data.x + f.data.width < tData.x)
      );
    });

    if (validFriends.length) return;

    paratrooperDropTimer = common.setFrameTimeout(() => {
      paratrooperDropTimer = null;
    }, paratrooperDropDelay);

    // "fast" deploy, does efficiency + accuracy matter?
    let minimalDelay =
      tData.type === TYPES.bunker || tData.type === TYPES.turret;

    // drop within the next few frames
    dropParatroopersAtRandom(rngInt(FPS * 5, TYPES.helicopter), minimalDelay);
  }

  function respondToHit(attacker) {
    /**
     * At this point, we've been hit by something.
     * If from a helicopter, maybe start targeting choppers.
     */

    if (
      !data.targeting.helicopters &&
      // NOTE: parentType for munitions e.g., gunfire from chopper
      attacker.data.parentType === TYPES.helicopter
    ) {
      maybeChaseHelicopters();
    }

    // and, maybe fire a smart missile regardless!
    return maybeRetaliateWithSmartMissile(attacker);
  }

  function maybeChaseHelicopters() {
    if (data.targeting.helicopters) return;

    // if hit or under attack, maybe start pursuit.
    if (respondToHitTimer) return;

    // throttle, so not every (e.g.) bullet hit or dodge triggers a roll of the dice.
    respondToHitTimer = common.setFrameTimeout(() => {
      data.targeting.helicopters = rngBool(data.type);
      respondToHitTimer = null;
    }, respondToHitDelay);
  }

  function maybeRetaliateWithSmartMissile(attacker) {
    /**
     * Potential retaliation: Launch smart missile(s) if damaged sufficiently
     * by opposing helicopter gunfire depending on game difficulty, OR, when
     * armed with "dumb" aimed missiles, and out of those.
     */

    // don't do this in certain modes.
    if (tutorialMode) return;

    // common case: armed with bullets.
    if (levelFlags.bullets) {
      // need to be damaged, depending on difficulty
      if (data.energy > missileEnergyThreshold) return;

      // and shot by helicopter gunfire
      if (!attacker?.data) return;
      if (attacker.data.type !== TYPES.gunfire) return;
      if (attacker.data.parentType !== TYPES.helicopter) return;
    } else {
      // aimed missile battle case: only fire smart missiles if out of aimed missiles.
      // ignore damage check, because one missile hit = dead.
      if (data.ammo) return;
    }

    maybeFireMissileAtHelicopter();
  }

  function maybeFireMissileAtHelicopter() {
    // throttle, ignore if active
    if (missileLaunchTimer) return;

    // need to be armed
    if (!data.smartMissiles) return;

    // look for nearby helicopter
    let mTarget = objectInView(data, { items: TYPES.helicopter });

    if (!mTarget) return;

    // are there other active missiles targeting the attacking chopper?
    // launch more only if in hard / extreme mode.
    if (oneMissileOnly) {
      let similarMissileCount = 0,
        i,
        j;

      for (i = 0, j = game.objects[TYPES.smartMissile].length; i < j; i++) {
        if (game.objects[TYPES.smartMissile][i].objects.target === mTarget) {
          similarMissileCount++;
        }
      }

      if (similarMissileCount) return;
    }

    let delay = rngInt(1000, TYPES.helicopter);

    missileLaunchTimer = common.setFrameTimeout(() => {
      // sanity check, given delay / async...
      if (data.dead || mTarget.data.dead) {
        missileLaunchTimer = null;
        return;
      }

      // "AI" target for helicopter missile launch method
      // (predetermined rather than real-time, because reasons.)
      missileTarget = mTarget;

      // it's possible the CPU is being chased, needs to flip to fire.
      options.exports.checkFacingTarget(mTarget);

      options.exports.setMissileLaunching(true);

      // and, stop momentarily.
      common.setFrameTimeout(() => {
        options.exports.setMissileLaunching(false);
        missileLaunchTimer = null;
      }, 1 / FPS);
    }, delay);
  }

  return {
    animate: ai,
    getMissileTarget: () => missileTarget,
    onHit: respondToHit,
    maybeChaseHelicopters,
    maybeDecoySmartMissile,
    maybeFireAtTarget,
    maybeDropParatroopersNearTarget,
    maybeRetaliateWithSmartMissile,
    resetSineWave
  };
};

export { HelicopterAI };
