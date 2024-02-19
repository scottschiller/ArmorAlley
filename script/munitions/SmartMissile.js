import { gameType } from '../aa.js';
import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { canNotify, collisionTest, getNearestObject } from '../core/logic.js';
import {
  GAME_SPEED,
  GAME_SPEED_RATIOED,
  getTypes,
  rad2Deg,
  rndInt,
  rng,
  rngInt,
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
import { Smoke } from '../elements/Smoke.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';
import { net } from '../core/network.js';

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

const SmartMissile = (options = {}) => {
  /**
   * I am so smart!
   * I am so smart!
   * S-MRT,
   * I mean, S-MAR-T...
   *  -- Homer Simpson
   */

  let dom, data, radarItem, objects, collision, launchSound, exports;

  function moveTo(x, y, angle) {
    // prevent from "crashing" into terrain, only if not expiring and target is still alive
    if (!data.expired && !objects.target.data.dead && y >= data.yMax) {
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
      data.angle = angle;
    }

    data.extraTransforms = `rotate3d(0, 0, 1, ${data.angle}deg)`;

    sprites.moveTo(exports, x, y);

    // push x/y to history arrays, maintain size

    data.xHistory.push(data.x);
    data.yHistory.push(data.y);

    if (data.xHistory.length > data.trailerCount + 1) {
      data.xHistory.shift();
      data.yHistory.shift();
    }
  }

  function moveTrailers() {
    if (!data.isOnScreen) return;
    common.domCanvas.drawTrailers(
      exports,
      data.xHistory,
      data.yHistory,
      0,
      data.height / 2 - 1
    );
  }

  function spark() {
    // TODO: random rotation?
    data.domCanvas.img = effects.spark();
    data.excludeBlink = true;
  }

  function maybeTargetDecoy(decoyTarget) {
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

    // too far away
    if (!nearby?.includes(decoyTarget)) return;

    data.foundDecoy = true;

    // drop tracking on current target, if one exists
    setTargetTracking(false);

    // we've got a live one!
    objects.target = decoyTarget;
    objects.lastTarget = decoyTarget;

    if (launchSound) {
      launchSound.stop();
      launchSound.play(
        {
          playbackRate: getPlaybackRate(),
          onplay: (sound) => (launchSound = sound)
        },
        game.players.local
      );
    }

    // and start tracking.
    setTargetTracking(true);
  }

  function setTargetTracking(tracking) {
    if (!objects.target) return;
    objects.target.data.smartMissileTracking = !!tracking;
  }

  function die(dieOptions = {}) {
    if (data.deadTimer || data.dead) return;

    let attacker = dieOptions?.attacker;

    if (attacker && !data.attacker) {
      data.attacker = attacker;
    }

    // slightly hackish: may be passed, or assigned
    attacker = attacker || data.attacker;

    data.energy = 0;

    data.dead = true;

    let dieSound;

    spark();

    effects.inertGunfireExplosion({ exports });

    if (data.armed) {
      effects.shrapnelExplosion(data, {
        count: 3 + rngInt(3, TYPES.shrapnel),
        velocity: (Math.abs(data.vX) + Math.abs(data.vY)) / 2,
        parentVX: data.vX * 2,
        parentVY: data.vY
      });

      if (attacker?.data?.type !== TYPES.infantry) {
        effects.domFetti(exports);
      }

      // special-case: shot down by gunfire, vs. generic "boom"
      if (attacker?.data?.type === TYPES.gunfire && sounds.metalClang) {
        playSound(sounds.metalClang, game.players.local);
      } else if (sounds.genericBoom) {
        playSound(sounds.genericBoom, game.players.local);
      }
    } else if (sounds.metalClang) {
      playSound(sounds.metalClang, game.players.local);
    }

    data.deadTimer = common.setFrameTimeout(() => {
      sprites.removeNodesAndUnlink(exports);
    }, 1000);

    // stop tracking the target.
    setTargetTracking();

    radarItem?.die();

    if (data.isRubberChicken && !data.isBanana && sounds.rubberChicken.die) {
      // don't "die" again if the chicken has already moaned, i.e., from expiring.
      if (!data.expired) {
        if (launchSound) {
          skipSound(launchSound);
          launchSound = null;
        }

        // play only if "armed", as an audible hint that it was capable of doing damage.
        if (data.armed) {
          playSound(sounds.rubberChicken.die, game.players.local, {
            onplay: (sound) => (dieSound = sound),
            playbackRate: getPlaybackRate()
          });
        }
      }

      if (launchSound) {
        if (!data.expired && dieSound) {
          // hackish: apply launch sound volume to die sound
          dieSound.setVolume(launchSound.volume);
        }

        skipSound(launchSound);
        launchSound = null;
      }
    }

    // special case: added sound for first hit of a bunker (or turret), but not the (nuclear) explosion sequence.
    if (
      sounds.bnb.beavisYes &&
      data.armed &&
      !data.expired &&
      !data.isEnemy &&
      data.parentType === TYPES.helicopter &&
      ((objects.target.data.type !== TYPES.bunker &&
        objects?.target.data.type !== TYPES.turret) ||
        !objects?.target.data.dead)
    ) {
      if (attacker?.data?.type === TYPES.superBunker) {
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
      launchSound = null;
    }

    // if targeting the player, ensure the expiry warning sound is stopped.
    if (objects?.target === game.players.local) {
      stopSound(sounds.missileWarningExpiry);
    }

    // optional callback
    if (data.onDie) data.onDie();

    common.onDie(exports, dieOptions);
  }

  function sparkAndDie(target) {
    // if we don't have a target, something is very wrong.
    if (!target) return;

    // special case: take a slight hit and "slice through" ground-based infantry and engineers
    const { bottomAligned, type } = target.data;

    // engineers are an infantry sub-type
    if (type == TYPES.infantry && bottomAligned && data.energy > 0) {
      // take a hit
      data.energy -= data.infantryEnergyCost;

      // give a hit
      common.hit(target, target.data.energy, exports);

      // keep on truckin', unless the missile has been killed off.
      if (data.energy > 0) return;
    } else {
      // regular hit
      common.hit(
        target,
        data.armed ? data.damagePoints * data.energy : 1,
        exports
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
            : data?.parent?.data?.id === game.players.local.data.id
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

    spark();

    // "embed", so this object moves relative to the target it hit
    sprites.attachToTarget(exports, target);

    // bonus "hit" sounds for certain targets
    if (target.data.type === TYPES.tank || target.data.type === TYPES.turret) {
      playSound(sounds.metalHit, game.players.local);
    } else if (target.data.type === TYPES.bunker) {
      playSound(sounds.concreteHit, game.players.local);
    }

    if (data.isBanana || !data.armed) {
      effects.smokeRing(exports, {
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
          : data?.parentType === TYPES.helicopter
            ? 'Your'
            : 'A friendly';
      const missileType = game.objects.stats.formatForDisplay(
        data.type,
        exports
      );

      if (gamePrefs[`notify_${data.type}`]) {
        game.objects.notifications.add(
          `${whose} ${missileType} died before arming itself.`
        );
      }

      data.didNotify = true;
    }

    die({ attacker: target });
  }

  function animate() {
    let deltaX, deltaY, newX, newY, newTarget, rad, targetData, targetHalfWidth;

    data.domCanvas.animation?.animate();

    // notify caller if now dead and can be removed.
    if (data.dead) {
      sprites.moveWithScrollOffset(exports);
      return data.dead && !dom.o;
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
    const tData = objects?.target?.data;

    if (
      !data.expired &&
      gamePrefs.modern_smart_missiles &&
      (!objects.target ||
        tData?.dead ||
        tData?.wentIntoHiding ||
        (tData?.isEnemy === data.isEnemy && !tData?.hostile))
    ) {
      const whose =
        data.isEnemy !== game.players.local.data.isEnemy
          ? 'An enemy'
          : data?.parent?.data?.id === game.players.local.data.id
            ? `Your`
            : `A friendly`;
      const missileType = game.objects.stats.formatForDisplay(
        data.type,
        exports
      );

      // stop tracking the old one, as applicable.
      if (
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

        setTargetTracking();

        objects.target = null;
      }

      newTarget = getNearestObject(exports);

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
          newTD.type !== objects.lastTarget?.data?.type &&
          !newTarget.data.isOnScreen &&
          gamePrefs[`notify_${data.type}`]
        ) {
          game.objects.notifications.addNoRepeat(text);
        }

        // we've got a live one!
        objects.target = newTarget;
        objects.lastTarget = newTarget;

        if (launchSound) {
          launchSound.stop();
          launchSound.play(
            {
              volume: launchSound.volume,
              playbackRate: getPlaybackRate(),
              onplay: (sound) => (launchSound = sound)
            },
            game.players.local
          );
        }

        // and start tracking.
        setTargetTracking(true);
      }
    }

    // volume vs. distance
    if (
      (data.isBanana || data.isRubberChicken) &&
      launchSound &&
      !data.expired &&
      objects.target &&
      !objects.target.data.dead
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
        !objects.target ||
        objects.target.data.dead ||
        game.data.battleOver)
    ) {
      data.blink = true;
      data.expired = true;
      data.hostile = true;

      if (
        data.isRubberChicken &&
        !data.isBanana &&
        sounds.rubberChicken.expire
      ) {
        playSound(sounds.rubberChicken.expire, game.players.local, {
          playbackRate: getPlaybackRate(),
          volume: launchSound?.volume
        });
      }

      if (data.isBanana && sounds.banana.expire) {
        playSound(sounds.banana.expire, game.players.local, {
          playbackRate: getPlaybackRate(),
          volume: launchSound?.volume
        });
      }

      // if still tracking something, un-mark it.
      setTargetTracking();
    }

    targetData = objects.target?.data || objects.lastTarget?.data;

    targetHalfWidth = targetData.width / 2;

    // delta of x/y between this and target
    deltaX = targetData.x + targetHalfWidth - data.x;

    // Always aim for "y", plus half height
    deltaY =
      targetData.y +
      (targetData.type === TYPES.balloon
        ? data.vY
        : targetData.halfHeight || targetData.height / 2) -
      data.y;

    if (data.expired) {
      // fall...
      data.gravity *= Math.max(1.05, 1.085 * GAME_SPEED_RATIOED);

      // ... and decelerate on X-axis.
      data.vX *= 0.95;
    } else {
      // x-axis

      // if changing directions, cut in half.
      data.vX += deltaX * 0.0033 * GAME_SPEED_RATIOED;

      // y-axis

      if (deltaY <= targetData.height && deltaY >= -targetData.height) {
        // lock on target.

        if (data.vY >= 0 && data.vY >= 0.25) {
          data.vY *= 0.8;
        } else if (data.vY <= 0 && data.vY < -0.25) {
          data.vY *= 0.8;
        }
      } else {
        data.vY += deltaY >= 0 ? data.thrust : -data.thrust;
      }
    }

    // and throttle
    data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
    data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));

    const progress = data.frameCount / data.expireFrameCount;

    // smoke increases as missile nears expiry
    const smokeThreshold = 1.25 - Math.min(1, progress);

    if (!data.nearExpiry && progress >= data.nearExpiryThreshold) {
      data.nearExpiry = true;

      // if targeting the player, start expiry warning sound
      if (objects?.target === game.players.local) {
        playSound(sounds.missileWarningExpiry, exports);
        stopSound(sounds.missileWarning);
      }

      // allow a burst of thrust when near expiry, as in the original game.
      // this can make "almost-done" missiles very dangerous.
      data.vXMax *= gameType === 'extreme' ? 1.25 : 1.1;
      data.vYMax *= gameType === 'extreme' ? 1.25 : 1.1;
    }

    if (
      data.isOnScreen &&
      (data.expired ||
        progress >= data.nearExpiryThreshold ||
        (progress >= 0.05 && Math.random() >= smokeThreshold))
    ) {
      game.addObject(TYPES.smoke, {
        // "most recent" last coordinate
        x: data.xHistory[data.xHistory.length - 1],
        y:
          data.yHistory[data.xHistory.length - 1] -
          (data.isBanana || data.isRubberChicken ? 3 : 5),
        spriteFrame: 3
      });
    }

    newX = data.x + data.vX * GAME_SPEED_RATIOED;
    newY =
      data.y +
      (!data.expired
        ? data.vY * GAME_SPEED_RATIOED
        : Math.min(data.vY + data.gravity, data.vYMaxExpired)) *
        GAME_SPEED_RATIOED;

    // determine angle of missile (pointing at target, not necessarily always heading that way)
    rad = Math.atan2(deltaY, deltaX);

    moveTo(newX, newY, rad * rad2Deg);

    // push x/y to trailer history arrays, maintain size
    data.xHistory.push(data.x);
    data.yHistory.push(data.y);

    if (data.xHistory.length > data.trailerCount + 1) {
      data.xHistory.shift();
      data.yHistory.shift();
    }

    moveTrailers();

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
      die();
      // but don't fall too fast?
      data.vYMax *= 0.5;
    }

    // hit bottom?
    if (data.y > game.objects.view.data.battleField.height - 3) {
      data.y = game.objects.view.data.battleField.height - 3;
      die();

      // if targeting the player, stop expiry sound
      if (objects?.target === game.players.local) {
        stopSound(sounds.missileWarningExpiry);
      }
    }

    // missiles are animated by their parent - e.g., helicopters,
    // and not the main game loop. so, on-screen status is checked manually here.
    sprites.updateIsOnScreen(exports);

    collisionTest(collision, exports);
  }

  function initDOM() {
    dom.o = {};

    // initial placement
    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);
  }

  function initSmartMissile() {
    initDOM();

    data.yMax = game.objects.view.data.battleField.height - data.height - 1;

    // mark the target.
    setTargetTracking(true);

    const playbackRate = getPlaybackRate();

    radarItem = game.objects.radar.addItem(exports);

    if (data.isBanana && sounds.banana.launch) {
      // hackish: need to know on-screen right now.
      sprites.updateIsOnScreen(exports);

      // on-screen, OR, targeting the player chopper
      if (
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
        onplay: (sound) => (launchSound = sound),
        playbackRate
      });
    } else if (data.isRubberChicken && sounds.rubberChicken.launch) {
      playSound(sounds.rubberChicken.launch, game.players.local, {
        onplay: (sound) => (launchSound = sound),
        playbackRate
      });

      // human player, firing smart missile OR on-screen enemy - make noise if it's "far enough" away
      if (
        Math.abs(objects?.target?.data?.x - data.x) >= 666 &&
        !data.isEnemy &&
        (data.parentType === TYPES.helicopter || data.isOnScreen) &&
        Math.random() >= 0.5
      ) {
        playSoundWithDelay(sounds.bnb.cock, game.players.local);
      }
    } else if (sounds.missileLaunch) {
      launchSound = playSound(sounds.missileLaunch, game.players.local, {
        onplay: (sound) => (launchSound = sound),
        playbackRate
      });

      // human helicopter, firing smart missile
      if (
        !data.isEnemy &&
        data.parentType === TYPES.helicopter &&
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

  function getPlaybackRate() {
    return data.playbackRate * (gamePrefs.game_speed_pitch ? GAME_SPEED : 1);
  }

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

  // velocity x + y "basis"
  const v = 12;

  data = common.inheritData(
    {
      type,
      parent: options.parent || null,
      parentType: options.parentType || null,
      energy: 2,
      energyMax: 2,
      infantryEnergyCost: 0.5,
      armed: false,
      didNotify: false,
      blink: true,
      blinkCounter: 0,
      visible: true,
      expired: false,
      hostile: false, // when expiring/falling, this object is dangerous to both friendly and enemy units.
      nearExpiry: false,
      nearExpiryThreshold: 0.88,
      frameCount: 0,
      foundDecoy: false,
      decoyItemTypes: getTypes('parachuteInfantry', {
        exports: { data: { isEnemy: options.isEnemy } }
      }),
      decoyFrameCount: 15,
      ramiusFrameCount: 20,
      expireFrameCount: parseInt(
        (options.expireFrameCount || 256) * (1 / GAME_SPEED_RATIOED),
        10
      ),
      dieFrameCount: parseInt(
        (options.dieFrameCount || 640) * (1 / GAME_SPEED_RATIOED),
        10
      ), // 640 frames ought to be enough for anybody.
      width,
      halfWidth: width / 2,
      height,
      gravity: 1,
      damagePoints: 12.5,
      isBanana: !!options.isBanana,
      isRubberChicken: !!options.isRubberChicken,
      isSmartMissile: !!options.isSmartMissile,
      onDie: options.onDie || null,
      playbackRate: 0.9 + Math.random() * 0.2,
      target: null,
      vX: net.active ? 1 : 1 + Math.random(),
      vY: net.active ? 1 : 1 + Math.random(),
      vXMax: net.active ? v : v + rng(v / 2, type) + (options.vXMax || 0),
      vYMax: net.active ? v : v + rng(v / 2, type) + (options.vYMax || 0),
      vYMaxExpired: 36,
      thrust: net.active ? 0.5 : 0.5 + rng(0.5, type),
      deadTimer: null,
      trailerCount: 16,
      xHistory: [],
      yHistory: [],
      yMax: null,
      angle: options.isEnemy ? 180 : 0,
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

  const spriteObj =
    spriteConfig[
      data.isBanana
        ? 'banana'
        : data.isRubberChicken
          ? 'rubberChicken'
          : 'smartMissile'
    ];

  const { scale, spriteWidth, spriteHeight } = spriteObj;

  data.domCanvas = {
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

  dom = {
    o: null
  };

  objects = {
    target: options.target,
    lastTarget: options.target
  };

  exports = {
    animate,
    data,
    dom,
    die,
    init: initSmartMissile,
    maybeTargetDecoy,
    radarItem,
    objects
  };

  collision = {
    options: {
      source: exports,
      targets: undefined,
      checkTweens: true,
      hit(target) {
        sparkAndDie(target);
      }
    },
    items: getTypes(
      'superBunker, helicopter, tank, van, missileLauncher, infantry, parachuteInfantry, engineer, bunker, balloon, smartMissile, turret',
      { exports }
    )
  };

  if (data.isRubberChicken) {
    // replace the base sprite
    data.domCanvas.animation = common.domCanvas.canvasAnimation(
      exports,
      spriteObj
    );
  }

  return exports;
};

export { SmartMissile };
