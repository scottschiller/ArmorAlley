import { gameType } from '../aa.js';
import { game, getObjectById } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { canNotify, collisionTest, getNearestObject } from '../core/logic.js';
import {
  FPS,
  GAME_SPEED,
  GAME_SPEED_RATIOED,
  getTypes,
  rad2Deg,
  rnd,
  rndInt,
  rng,
  TYPES
} from '../core/global.js';
import {
  playSound,
  playSoundWithDelay,
  skipSound,
  stopSound,
  sounds,
  getVolumeFromDistance,
  getPanFromLocation
} from '../core/sound.js';
import { gamePrefs } from '../UI/preferences.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';
import { net } from '../core/network.js';
import { levelConfig } from '../levels/default.js';

const dimensions = {
  rubberChicken: {
    width: 24,
    height: 12
  },
  banana: {
    width: 12,
    height: 15
  },
  smartMissile: {
    width: 14,
    height: 4
  }
};

// 0-50% increase
const difficulties = {
  default: 0,
  easy: 0.125,
  hard: 0.25,
  extreme: 0.375,
  armorgeddon: 0.5
};

/**
 * Given game difficulty + battle which defines CPU helicopter "speed",
 * scale between 100% - 150% for increasingly-challenging missiles.
 */
const clipSpeedI = {
  min: 8,
  max: 14
};

// velocities from original: iMisXV + iMisYV
const iMisV = {
  x: [0, 16, 24, 24, 32, 24, 24, 16, 0, -16, -24, -24, -32, -24, -24, -16],
  y: [-9, -7, -4, -1, 0, 1, 4, 7, 9, 7, 4, 1, 0, 1, -4, -7]
};

// what constitutes "nearby" for missile velocity purposes
const yThreshold = 24;

// X and Y
const vMax = 12;

function iSgn(i) {
  return i ? (i > 0 ? 1 : -1) : 0;
}

const spriteConfig = {
  banana: {
    src: 'banana.png',
    spriteWidth: 32,
    spriteHeight: 38,
    width: 8,
    height: 9.5,
    scale: 0.8
  },
  rubberChicken: {
    // note: different params for animation.
    sprite: {
      url: 'rubber-chicken-96.png',
      spriteWidth: 96,
      spriteHeight: 48,
      frameWidth: 96,
      frameHeight: 24,
      width: 24,
      height: 6,
      loop: true,
      animationDuration: 0.5
    },
    // TODO: frame count shouldn't be required; fix canvasAnimation() math.
    animationFrameCount: 2,
    useDataAngle: true,
    scale: 0.5
  },
  smartMissile: {
    src: 'smart-missile.png',
    spriteWidth: 30,
    spriteHeight: 8,
    width: 15,
    height: 4,
    scale: 1
  }
};

const SmartMissile = (options = {}) => {
  /**
   * I am so smart!
   * I am so smart!
   * S-MRT,
   * I mean, S-MAR-T...
   *  -- Homer Simpson
   */

  let data, radarItem, objects, collision, dieSound, launchSound, exports;

  /**
   * "Clip speed" as a range from 0-100%, e.g., 0/6 -> 6/6
   * as CPU speed + smarts increase through battles.
   */
  let clipSpeedScale =
    (levelConfig.clipSpeedI - (clipSpeedI.max - clipSpeedI.min)) /
    clipSpeedI.min;

  let difficultyOffset = difficulties[gameType] || difficulties.default;

  const difficultyFactor = Math.max(1, 1 + difficultyOffset * clipSpeedScale);

  let iCurShape = 0;

  // if game preferences allow AND no default specified, then pick at random.
  if (
    gamePrefs.alt_smart_missiles &&
    !options.isRubberChicken &&
    !options.isBanana &&
    !options.isSmartMissile
  ) {
    options = common.mixin(options, getRandomMissileMode());
  }

  let type = TYPES.smartMissile;

  let missileData =
    dimensions[
      options.isRubberChicken
        ? 'rubberChicken'
        : options.isBanana
          ? 'banana'
          : 'smartMissile'
    ];

  const { width, height } = missileData;

  data = common.inheritData(
    {
      type,
      parent: options.parent || null,
      parentType: options.parentType || null,
      difficultyFactor,
      energy: 1,
      energyMax: 1,
      excludeEnergy: true,
      infantryEnergyCost: 0.5,
      armed: false,
      didNotify: false,
      blink: true,
      blinkCounter: 0,
      visible: true,
      expired: false,
      // when expiring/falling, this object is dangerous to both friendly and enemy units.
      hostile: false,
      isFading: false,
      // fade begins at >= 0.
      fadeFrame: FPS * -0.15,
      fadeFrames: FPS * 0.15,
      nearExpiry: false,
      nearExpiryThreshold: 0.78125,
      lifeCyclePhase: 0,
      frameCount: 0,
      foundDecoy: false,
      decoyItemTypes: getTypes('parachuteInfantry', {
        exports: { data: { isEnemy: options.isEnemy } }
      }),
      decoyFrameCount: 15,
      ramiusFrameCount: (FPS * 2) / 3,
      expireFrameCount: parseInt(
        (options.expireFrameCount || 256) * (1 / GAME_SPEED_RATIOED),
        10
      ),
      // lifetime limit: 640 frames ought to be enough for anybody.
      dieFrameCount: parseInt(
        (options.dieFrameCount || 640) * (1 / GAME_SPEED_RATIOED),
        10
      ),
      iCurShape,
      width,
      halfWidth: width / 2,
      height,
      halfHeight: height / 2,
      gravity: 1,
      damagePoints: 25,
      isBanana: !!options.isBanana,
      isRubberChicken: !!options.isRubberChicken,
      isSmartMissile: !!options.isSmartMissile,
      playbackRate: 0.9 + Math.random() * 0.2,
      target: null,
      vX: net.active ? 1 : 1 + Math.random(),
      vY: net.active ? 1 : 1 + Math.random(),
      vXMax: vMax,
      vYMax: vMax,
      // toward end of life, ramp this up to provide the 2X "bust" similar to the original
      speedBurstFactor: 1,
      thrust: 0.5,
      trailerCount: 16,
      xHistory: [],
      yHistory: [],
      yMax: null,
      angle: options.isEnemy ? 180 : 0,
      lastAngle: options.isEnemy ? 180 : 0,
      angleIncrement: 45,
      noEnergyStatus: true,
      domFetti: {
        // may be overridden
        colorType:
          options.isRubberChicken || options.isBanana ? 'default' : undefined,
        elementCount: 10 + rndInt(10),
        startVelocity: 10 + rndInt(10),
        spread: 360
      }
    },
    options
  );

  const spriteObj =
    spriteConfig[
      data.isBanana
        ? 'banana'
        : data.isRubberChicken
          ? 'rubberChicken'
          : 'smartMissile'
    ];

  const { scale, spriteWidth, spriteHeight } = spriteObj;

  let domCanvas = {
    img: {
      src: !game.objects.editor
        ? utils.image.getImageObject(spriteObj.src || spriteObj.sprite.url)
        : null,
      source: {
        x: 0,
        y: 0,
        width: spriteWidth,
        height: spriteHeight,
        is2X: true,
        frameWidth: spriteWidth,
        frameHeight: spriteHeight,
        frameX: 0,
        frameY: 0
      },
      target: {
        useDataAngle: true,
        scale
      }
    },

    radarItem: {
      width: 2.75,
      height: 1,
      draw: (ctx, obj, pos, width, height) => {
        const scaledWidth = pos.width(width);
        const scaledHeight = pos.height(height);

        const left = pos.left(obj.data.left);
        const top = obj.data.top - scaledHeight;

        common.domCanvas.rotate(
          ctx,
          data.angle,
          left,
          top,
          scaledWidth,
          scaledHeight
        );

        ctx.roundRect(left, top, scaledWidth, scaledHeight, width);

        common.domCanvas.unrotate(ctx);
      }
    }
  };

  objects = {
    target: options.target,
    lastTarget: options.target
  };

  exports = {
    animate: () => animate(exports),
    data,
    dieSound,
    domCanvas,
    die: (dieOptions) => die(exports, dieOptions),
    init: () => initSmartMissile(exports),
    launchSound,
    maybeTargetDecoy: (decoyTarget) => maybeTargetDecoy(exports, decoyTarget),
    objects,
    onDie: options.onDie || null,
    options,
    radarItem
  };

  collision = {
    options: {
      source: data.id,
      targets: undefined,
      checkTweens: true,
      hit(targetID) {
        sparkAndDie(exports, targetID);
      }
    },
    items: getCollisionItems(exports)
  };

  if (data.isRubberChicken) {
    // replace the base sprite
    exports.domCanvas.animation = common.domCanvas.canvasAnimation(
      exports,
      spriteObj
    );
  }

  exports.collision = collision;

  return exports;
};

function getCollisionItems(exports, group) {
  // if unspecified, getTypes() uses a default group.
  return getTypes(
    'superBunker, helicopter, tank, van, missileLauncher, infantry, parachuteInfantry, engineer, bunker, balloon, smartMissile, turret',
    { exports, group }
  );
}

function moveTo(exports, x, y, angle) {
  let { data, objects } = exports;

  // prevent from "crashing" into terrain, only if not expiring and target is still alive
  if (
    !data.expired &&
    !getObjectById(objects.target)?.data?.dead &&
    y >= data.yMax
  ) {
    y = data.yMax;
  }

  // determine angle
  if (data.isBanana) {
    data.angle += data.angleIncrement * GAME_SPEED_RATIOED;

    if (data.angle >= 360) {
      data.angle -= 360;
    }

    // if dropping, "slow your roll"
    if (data.expired) {
      data.angleIncrement *= 0.97;
    }
  } else {
    let angleChange = angle - data.lastAngle;
    // handle "wrap-around" from 360 -> 0 ("flip" is closer to, but not exactly 360.)
    if (angleChange > 180) {
      angleChange -= 360;
    } else if (angleChange < -180) {
      angleChange += 360;
    }
    data.angle += angleChange;
    data.lastAngle = angle;
  }

  sprites.moveTo(exports, x, y);

  // push x/y to history arrays, maintain size

  // if 60FPS, only update every other frame
  if (FPS === 30 || data.frameCount % 2 === 0) {
    data.xHistory.push(data.x);
    data.yHistory.push(data.y);

    if (data.xHistory.length > data.trailerCount + 1) {
      data.xHistory.shift();
      data.yHistory.shift();
    }
  }
}

function moveTrailers(exports) {
  let { data } = exports;

  if (!data.isOnScreen) return;
  let isSpecial = data.isBanana || data.isRubberChicken;
  let rad = (data.angle * Math.PI) / 180;
  common.domCanvas.drawTrailers(
    exports,
    data.xHistory,
    data.yHistory,
    data.halfWidth +
      (isSpecial ? 0 : data.halfWidth + data.halfWidth * 0.5 * Math.cos(rad),
      isSpecial
        ? data.halfHeight
        : data.halfHeight + data.halfHeight * -Math.sin(rad))
  );
}

function spark(exports) {
  let { data } = exports;

  // TODO: random rotation?
  exports.domCanvas.img = effects.spark();
  data.excludeBlink = true;
  data.isFading = true;
}

function maybeTargetDecoy(exports, decoyTarget) {
  let { data, launchSound, objects } = exports;

  // guard, and ensure this is a "vs" situation.
  if (!decoyTarget?.data || data.isEnemy === decoyTarget.data.isEnemy) return;

  // missile must be live, not already distracted, and "fresh"; potential decoy must be live.
  if (
    data.expired ||
    data.foundDecoy ||
    decoyTarget.data.dead ||
    data.frameCount >= data.decoyFrameCount
  )
    return;

  // crucially: is it within range?
  const nearby = getNearestObject(exports, {
    items: data.decoyItemTypes,
    ignoreNearGround: true,
    getAll: true
  });

  let decoyID = decoyTarget.data.id;

  // too far away
  if (!nearby?.includes(decoyID)) return;

  data.foundDecoy = true;

  // drop tracking on current target, if one exists
  setTargetTracking(exports, false);

  // we've got a live one!
  objects.target = decoyID;
  objects.lastTarget = decoyID;

  if (launchSound) {
    launchSound.stop();
    launchSound.play(
      {
        playbackRate: getPlaybackRate(exports),
        onplay: (sound) => (launchSound = sound)
      },
      game.players.local
    );
  }

  // and start tracking.
  setTargetTracking(exports, true);
}

function setTargetTracking(exports, tracking) {
  let { objects } = exports;

  if (!objects.target) return;

  let target = getObjectById(objects.target);

  // guard, just in case.
  if (!target) return;

  target.data.smartMissileTracking = !!tracking;
}

function die(exports, dieOptions = {}) {
  let { data, dieSound, launchSound, objects, radarItem } = exports;

  if (data.dead) return;

  let attacker = dieOptions?.attacker;

  if (attacker && !data.attacker) {
    data.attacker = attacker;
  }

  // slightly hackish: may be passed, or assigned
  attacker = attacker || data.attacker;

  let oAttacker = getObjectById(attacker);

  data.energy = 0;

  data.dead = true;

  spark(exports);

  effects.inertGunfireExplosion({ exports });

  // rough velocity throttling
  let velocity = Math.max(
    data.vYMax * -1,
    Math.min(data.vYMax, (Math.abs(data.vX) + Math.abs(data.vY)) / 2)
  );

  if (data.armed) {
    effects.shrapnelExplosion(data, {
      count: 4,
      velocity,
      parentVX: data.vX,
      parentVY: data.vY
    });

    if (oAttacker?.data?.type !== TYPES.infantry) {
      effects.domFetti(data.id, attacker);
    }

    // special-case: shot down by gunfire, vs. generic "boom"
    if (oAttacker?.data?.type === TYPES.gunfire && sounds.metalClang) {
      playSound(sounds.metalClang, game.players.local);
    } else if (sounds.genericBoom) {
      playSound(sounds.genericBoom, game.players.local);
    }
  } else if (sounds.metalClang) {
    playSound(sounds.metalClang, game.players.local);
  }

  // stop tracking the target.
  setTargetTracking(exports);

  radarItem?.die();

  if (data.isRubberChicken && !data.isBanana && sounds.rubberChicken.die) {
    // don't "die" again if the chicken has already moaned, i.e., from expiring.
    if (!data.expired) {
      if (launchSound) {
        skipSound(launchSound);
        exports.launchSound = null;
      }

      // play only if "armed", as an audible hint that it was capable of doing damage.
      if (data.armed) {
        playSound(sounds.rubberChicken.die, game.players.local, {
          onplay: (sound) => (dieSound = sound),
          playbackRate: getPlaybackRate(exports)
        });
      }
    }

    if (launchSound) {
      if (!data.expired && dieSound) {
        // hackish: apply launch sound volume to die sound
        dieSound.setVolume(launchSound.volume);
      }

      skipSound(launchSound);
      exports.launchSound = null;
    }
  }

  let tData = getObjectById(objects.target)?.data;

  // special case: added sound for first hit of a bunker (or turret), but not the (nuclear) explosion sequence.
  if (
    gamePrefs.bnb &&
    sounds.bnb.beavisYes &&
    data.armed &&
    !data.expired &&
    !data.isEnemy &&
    data.parentType === TYPES.helicopter &&
    tData &&
    ((tData.type !== TYPES.bunker && tData.type !== TYPES.turret) ||
      !tData.dead)
  ) {
    if (oAttacker?.data?.type === TYPES.superBunker) {
      // "this sucks"
      playSoundWithDelay(sounds.bnb.beavisLostUnit);
    } else {
      playSound(sounds.bnb.beavisYes, game.players.local, {
        onfinish: () => {
          if (Math.random() >= 0.5) {
            playSoundWithDelay(sounds.bnb.buttheadWhoaCool);
          }
        }
      });
    }
  }

  if (data.isBanana && launchSound) {
    skipSound(launchSound);
    exports.launchSound = null;
  }

  // if targeting the player, ensure the expiry warning sound is stopped.
  if (objects?.target === game.players.local.data.id) {
    stopSound(sounds.missileWarningExpiry);
  }

  // optional callback
  if (exports.onDie) exports.onDie();

  common.onDie(data.id, dieOptions);
}

function sparkAndDie(exports, targetID) {
  let { data } = exports;

  let target = getObjectById(targetID);

  // if we don't have a target, something is very wrong.
  if (!target) return;

  // special case: take a slight hit and "slice through" ground-based infantry and engineers
  const { bottomAligned, type } = target.data;

  // engineers are an infantry sub-type
  if (type == TYPES.infantry && bottomAligned && data.energy > 0) {
    // take a hit
    data.energy -= data.infantryEnergyCost;

    // give a hit
    common.hit(target.data.id, target.data.energy, data.id);

    // keep on truckin', unless the missile has been killed off.
    if (data.energy > 0) return;
  } else {
    // regular hit
    common.hit(
      target.data.id,
      data.armed ? data.damagePoints * data.energy : 1,
      data.id
    );

    if (!target.data.dead && data.armed) {
      // a missile hit something, but the target didn't die.

      const isWeakened = data.energy < data.energyMax;
      const weakened = isWeakened ? ' weakened' : '';
      const whose =
        data.isEnemy !== game.players.local.data.isEnemy
          ? isWeakened
            ? `A${weakened} enemy`
            : 'An enemy'
          : data.parent === game.players.local.data.id
            ? `Your${weakened}`
            : `A friendly${weakened}`;
      const missileType = game.objects.stats.formatForDisplay(
        data.type,
        exports
      );
      const verb =
        target.data.type === TYPES.superBunker ? 'crashed into' : 'damaged';
      const targetType = game.objects.stats.formatForDisplay(type, target);
      const health =
        target.data.energy && target.data.energy !== target.data.energyMax
          ? ` (${Math.floor(
              (target.data.energy / target.data.energyMax) * 100
            )}%)`
          : '';
      const aOrAn = target.data.type === TYPES.infantry ? 'an' : 'a';

      const text = `${whose} ${missileType} ${verb} ${aOrAn} ${targetType}${health}`;

      if (canNotify(target.data.type, data.type)) {
        game.objects.notifications.add(text);
      }
    }
  }

  spark(exports);

  // "embed", so this object moves relative to the target it hit
  sprites.attachToTarget(exports, target);

  // bonus "hit" sounds for certain targets
  if (target.data.type === TYPES.tank || target.data.type === TYPES.turret) {
    playSound(sounds.metalHit, game.players.local);
  } else if (target.data.type === TYPES.bunker) {
    playSound(sounds.concreteHit, game.players.local);
  }

  if (data.isBanana || !data.armed) {
    effects.smokeRing(data.id, {
      count: data.armed ? 16 : 8,
      velocityMax: data.armed ? 24 : 12,
      offsetX: target.data.width / 2,
      offsetY: data.height - 2,
      isGroundUnit: target.data.bottomAligned,
      parentVX: data.vX,
      parentVY: data.vY
    });
  }

  // notify if the missile hit something (wasn't shot down), and was unarmed.
  // a missile could hit e.g., three infantry at once - so, prevent dupes.

  const aType = data?.attacker?.data?.type;

  if (
    !data.didNotify &&
    !data.armed &&
    aType !== TYPES.gunfire &&
    aType !== TYPES.bomb &&
    aType !== TYPES.smartMissile
  ) {
    const whose =
      data.isEnemy !== game.players.local.data.isEnemy
        ? 'An enemy'
        : data.parentType === TYPES.helicopter
          ? 'Your'
          : 'A friendly';
    const missileType = game.objects.stats.formatForDisplay(data.type, exports);

    if (gamePrefs[`notify_${data.type}`]) {
      game.objects.notifications.add(
        `${whose} ${missileType} died before arming itself.`
      );
    }

    data.didNotify = true;
  }

  die(exports, { attacker: target.data.id });
}

function animate(exports) {
  let { collision, data, launchSound, objects } = exports;

  let deltaX, deltaY, newX, newY, newTarget, rad, targetData, targetHalfWidth;

  exports.domCanvas.animation?.animate();

  // notify caller if now dead and can be removed.
  if (data.dead) {
    sprites.movePendingDie(exports);
    return data.dead && data.canDestroy;
  }

  /**
   * if original target has died OR has become friendly, try to find a new target.
   * e.g., enemy bunker that was originally targeted, is captured and became friendly -
   * or, two missiles fired at enemy helicopter, but the first one hits and kills it.
   *
   * in the original game, missiles would die when the original target died -
   * but, missiles are rare (you get two per chopper) and take time to re-arm,
   * and they're "smart" - so in my version, missiles get retargeting capability
   * for at least one animation frame after the original target is lost.
   *
   * if retargeting finds nothing at the moment the original is lost, the missile will die.
   */
  const tData = getObjectById(objects.target)?.data;

  if (
    !data.expired &&
    gamePrefs.modern_smart_missiles &&
    (!objects.target ||
      !tData ||
      tData?.dead ||
      tData?.wentIntoHiding ||
      (tData?.isEnemy === data.isEnemy && !tData?.hostile))
  ) {
    const whose =
      data.isEnemy !== game.players.local.data.isEnemy
        ? 'An enemy'
        : data.parent === game.players.local.data.id
          ? `Your`
          : `A friendly`;

    const missileType = game.objects.stats.formatForDisplay(data.type, exports);

    // stop tracking the old one, as applicable.
    if (
      !tData ||
      tData?.dead ||
      tData?.wentIntoHiding ||
      tData?.isEnemy === data.isEnemy
    ) {
      // notify if a helicopter evaded a smart missile by hiding in a cloud.
      if (
        tData?.wentIntoHiding &&
        tData?.type === TYPES.helicopter &&
        gamePrefs[`notify_${data.type}`]
      ) {
        const text = `${whose} ${missileType} lost track of its target.`;
        game.objects.notifications.addNoRepeat(text);
      }

      setTargetTracking(exports);

      objects.target = null;
    }

    let newTargetID = getNearestObject(exports);

    newTarget = getObjectById(newTargetID);

    const newTD = newTarget?.data;

    if (newTarget && !newTD.cloaked && !newTD.wentIntoHiding && !newTD.dead) {
      const targetType = game.objects.stats.formatForDisplay(
        newTD.type,
        newTarget
      );

      const text = `${whose} ${missileType} detected a nearby ${targetType}`;

      /**
       * Notify only if the target type is "new" - e.g,. two missiles fired at two tanks.
       * The first missile and tank will take each other out, and the second missile will
       * re-target the second tank. Notifying here feels redundant.
       */
      if (
        newTD.type !== getObjectById(objects.lastTarget)?.data?.type &&
        !newTarget.data.isOnScreen &&
        gamePrefs[`notify_${data.type}`]
      ) {
        game.objects.notifications.addNoRepeat(text);
      }

      // we've got a live one!
      objects.target = newTargetID;
      objects.lastTarget = newTargetID;

      if (launchSound) {
        launchSound.stop();
        launchSound.play(
          {
            volume: launchSound.volume,
            playbackRate: getPlaybackRate(exports),
            onplay: (sound) => (exports.launchSound = sound)
          },
          game.players.local
        );
      }

      // and start tracking.
      setTargetTracking(exports, true);
    }
  }

  let target = getObjectById(objects.target);

  // volume vs. distance
  if (
    (data.isBanana || data.isRubberChicken) &&
    launchSound &&
    !data.expired &&
    target &&
    !target.data.dead
  ) {
    // launchSound.setVolume((launchSound.soundOptions.onScreen.volume || 100) * getVolumeFromDistance(objects.target, game.players.local));
    // hackish: bananas are 50%, default chicken volume is 20%.
    launchSound.setVolume(
      (data.isBanana ? 50 : 20) *
        getVolumeFromDistance(exports, 0.5) *
        Math.max(0.01, gamePrefs.volume)
    );
    launchSound.setPan(getPanFromLocation(exports));
  }

  // "out of gas" -> dangerous to both sides -> fall to ground
  if (
    !data.expired &&
    (data.frameCount > data.expireFrameCount ||
      !target ||
      target.data.dead ||
      game.data.battleOver)
  ) {
    data.blink = true;
    data.expired = true;
    data.hostile = true;

    // expired missiles, now hostile, are dangerous to both sides.
    collision.items = getCollisionItems(exports, 'all');

    if (data.isRubberChicken && !data.isBanana && sounds.rubberChicken.expire) {
      playSound(sounds.rubberChicken.expire, game.players.local, {
        playbackRate: getPlaybackRate(exports),
        volume: launchSound?.volume
      });
    }

    if (data.isBanana && sounds.banana.expire) {
      playSound(sounds.banana.expire, game.players.local, {
        playbackRate: getPlaybackRate(exports),
        volume: launchSound?.volume
      });
    }

    // if still tracking something, un-mark it.
    setTargetTracking(exports);
  }

  targetData = target?.data || getObjectById(objects.lastTarget)?.data;

  if (targetData) {
    targetHalfWidth = targetData.halfWidth || targetData.width / 2;

    // delta of x/y between this and target
    deltaX = targetData.x + targetHalfWidth - data.x;

    // Always aim for "y", plus half height - minus own height.
    deltaY =
      targetData.y +
      (targetData.type === TYPES.balloon
        ? data.vY
        : targetData.halfHeight || targetData.height / 2) -
      data.y -
      data.height;
  } else {
    // no target, no delta.
    targetHalfWidth = 0;
    deltaX = 0;
    deltaY = 0;
  }

  let { difficultyFactor } = data;

  if (data.expired) {
    // fall...
    data.gravity *= Math.max(1.05, 1.085 * GAME_SPEED_RATIOED);

    // ... and decelerate on X-axis.
    data.vX *= 0.95;
  } else {
    // based on original missile shape (sprite) + velocity
    let iRY, iDY, iADY, iDestShape, iDeltaShape;

    iADY = iDY = deltaY;

    if (iADY < 0) {
      iADY = -iADY;
    }

    if (!iADY) {
      iRY = 0;
    } else if (iADY < 4) {
      iRY = 1;
    } else if (iADY < 12) {
      iRY = 2;
    } else {
      iRY = 3;
    }

    if (targetData.x < data.x) {
      if (iDY < 0) {
        iDestShape = 12 + iRY;
      } else {
        iDestShape = 12 - iRY;
      }
    } else if (targetData.x > data.x) {
      if (iDY < 0) {
        iDestShape = 4 - iRY;
      } else {
        iDestShape = 4 + iRY;
      }
    } else {
      if (iDY < 0) {
        iDestShape = 0;
      } else {
        iDestShape = 8;
      }
    }

    iDeltaShape = iDestShape - data.iCurShape;

    if (iDeltaShape < 0) {
      if (iDeltaShape < -8) {
        data.iCurShape = (data.iCurShape + 1) & 0xf;
      } else {
        data.iCurShape = (data.iCurShape - 1) & 0xf;
      }
    } else if (iDeltaShape > 8) {
      data.iCurShape = (data.iCurShape - 1) & 0xf;
    } else {
      data.iCurShape = (data.iCurShape + 1) & 0xf;
    }

    if (data.iCurShape === iDestShape) {
      // original uses >> 1, (i.e., * 2)
      // adjust "responsiveness" slightly based on level + difficulty.
      data.vX +=
        iSgn(iMisV.x[data.iCurShape] - data.vX) *
        difficultyFactor *
        data.speedBurstFactor *
        0.67;

      let nextVY = iMisV.y[data.iCurShape] * 1.5 * data.speedBurstFactor;

      if (targetData.bottomAligned) {
        // workaround: if "almost" aligned with a target, cut the Y velocity way down.
        let absY = Math.abs(deltaY);
        if (absY < yThreshold) {
          nextVY = iMisV.y[data.iCurShape] * (absY / yThreshold);
          data.vY = nextVY;
        } else {
          // drop faster for ground targets
          data.vY = nextVY;
        }
      } else {
        // smoother Y-axis changes for airborne targets
        data.vY += (nextVY - data.vY) / 5;
      }
    }
  }

  // and throttle
  data.vX = Math.max(-data.vXMax, Math.min(data.vXMax, data.vX));
  data.vY = Math.max(-data.vYMax, Math.min(data.vYMax, data.vY));

  const progress = Math.min(1, data.frameCount / data.expireFrameCount);

  if (data.isRubberChicken) {
    // occasional background sound
    const p = Math.floor(progress * 10);
    if (data.lifeCyclePhase < p && p % 4 === 0) {
      data.lifeCyclePhase++;
      playSound(sounds.rubberChicken.bg, exports);
      if (rnd(1) >= 0.5) {
        common.setFrameTimeout(
          () => playSound(sounds.rubberChicken.bg, exports),
          350 + rndInt(350)
        );
      }
    }
  }

  if (
    // smoke if visible, OR "smoke on radar" is enabled.
    (data.isOnScreen || gamePrefs.radar_enhanced_fx) &&
    // smoke logic from original (which used `ulGameClock` vs. frameCount.)
    (!(game.iQuickRandom() & 0x3f) ||
      (progress >= data.nearExpiryThreshold && !(data.frameCount & 3)))
  ) {
    game.addObject(TYPES.smoke, {
      x: data.x,
      y: data.y - (data.isBanana || data.isRubberChicken ? 3 : 5),
      spriteFrame: 3
    });
  }

  if (!data.nearExpiry && progress >= data.nearExpiryThreshold) {
    data.nearExpiry = true;

    // if targeting the player, start expiry warning sound
    if (objects?.target === game.players.local) {
      playSound(sounds.missileWarningExpiry, exports);
      stopSound(sounds.missileWarning);
    }
  }

  if (data.nearExpiry) {
    // ramp up speed while "running out of gas" (and smoking)
    data.speedBurstFactor =
      1 +
      (progress - data.nearExpiryThreshold) / (1 - data.nearExpiryThreshold);
    // increase max velocity, including difficulty factor.
    data.vXMax = vMax * difficultyFactor * data.speedBurstFactor;
    data.vYMax = vMax * difficultyFactor * data.speedBurstFactor;
  }

  // determine angle of missile (pointing at target, not necessarily always heading that way)
  rad = Math.atan2(deltaY, deltaX);

  // 0-360
  if (rad < 0) {
    rad += 2 * Math.PI;
  }

  moveTrailers(exports);

  newX = data.x + data.vX * GAME_SPEED_RATIOED;
  newY =
    data.y +
    (!data.expired
      ? data.vY * GAME_SPEED_RATIOED
      : Math.min(data.vY + data.gravity, data.vYMax)) *
      GAME_SPEED_RATIOED;

  moveTo(exports, newX, newY, rad * rad2Deg);

  sprites.draw(exports);

  data.frameCount++;

  if (
    !data.armed &&
    (!gamePrefs.modern_smart_missiles ||
      data.frameCount >= data.ramiusFrameCount)
  ) {
    // become dangerous at this point.
    // obligatory: https://www.youtube.com/watch?v=CgTc3cYaLdo&t=112s
    data.armed = true;
    data.blink = false;
    data.visible = true;
  }

  if (data.frameCount >= data.dieFrameCount) {
    // TODO: review and remove; this scenario is unlikely.
    die(exports);
  }

  // hit bottom?
  if (data.y > game.objects.view.data.battleField.height - 3) {
    data.y = game.objects.view.data.battleField.height - 3;
    die(exports);

    // if targeting the player, stop expiry sound
    if (objects?.target === game.players.local) {
      stopSound(sounds.missileWarningExpiry);
    }
  }

  collisionTest(collision, exports);
}

function initSmartMissile(exports) {
  let { data, objects } = exports;

  data.yMax = game.objects.view.data.battleField.height - data.height - 1;

  // mark the target.
  setTargetTracking(exports, true);

  const playbackRate = getPlaybackRate(exports);

  exports.radarItem = game.objects.radar.addItem(exports);

  if (
    objects?.target?.data?.type === TYPES.helicopter &&
    objects.target.data.isCPU &&
    !objects.target.data.isRemote
  ) {
    // if targeting a chopper (and it's a local CPU), give it a chance to take evasive action.
    objects.target.data?.ai?.maybeDecoySmartMissile(exports);
  }

  if (data.isBanana && sounds.banana.launch) {
    // hackish: need to know on-screen right now.
    sprites.updateIsOnScreen(exports);

    // on-screen, OR, targeting the player chopper
    if (
      gamePrefs.bnb &&
      sounds.bnb.boioioing &&
      (data.isOnScreen ||
        (data.isEnemy && objects?.target?.data?.type === TYPES.helicopter))
    ) {
      playSound(sounds.bnb.boioioing, game.players.local, {
        onplay: (sound) => {
          // cancel if no longer active
          if (data.dead) {
            skipSound(sound);
          }
        }
      });
    }

    playSound(sounds.banana.launch, game.players.local, {
      onplay: (sound) => (exports.launchSound = sound),
      playbackRate
    });
  } else if (data.isRubberChicken && sounds.rubberChicken.launch) {
    playSound(sounds.rubberChicken.launch, game.players.local, {
      onplay: (sound) => (exports.launchSound = sound),
      playbackRate
    });

    // human player, firing smart missile OR on-screen enemy - make noise if it's "far enough" away
    if (
      gamePrefs.bnb &&
      Math.abs(objects?.target?.data?.x - data.x) >= 666 &&
      !data.isEnemy &&
      (data.parentType === TYPES.helicopter || data.isOnScreen) &&
      Math.random() >= 0.5
    ) {
      playSoundWithDelay(sounds.bnb.cock, game.players.local);
    }
  } else if (sounds.missileLaunch) {
    exports.launchSound = playSound(sounds.missileLaunch, game.players.local, {
      onplay: (sound) => (exports.launchSound = sound),
      playbackRate
    });

    // human helicopter, firing smart missile
    if (
      gamePrefs.bnb &&
      data.parent === game.players.local.data.id &&
      sounds.bnb.beavisYeahGo
    ) {
      // hackish: only play if this is the first active missile.
      if (!game.players.local.objects.smartMissiles.length) {
        playSound(sounds.bnb.beavisYeahGo, game.players.local);
      }
    }
  }
}

function getRandomMissileMode() {
  // 20% chance of default, 40% chance of chickens or bananas
  const rnd = rng(1, TYPES.smartMissile);

  return {
    isRubberChicken: rnd >= 0.2 && rnd < 0.6,
    isBanana: rnd >= 0.6
  };
}

function getPlaybackRate(exports) {
  return (
    exports.data.playbackRate * (gamePrefs.game_speed_pitch ? GAME_SPEED : 1)
  );
}

export { SmartMissile };
