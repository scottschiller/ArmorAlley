import { game } from '../core/Game.js';
import { common } from '../core/common.js';
import { collisionTest } from '../core/logic.js';
import {
  rndInt,
  plusMinus,
  TYPES,
  getTypes,
  rnd,
  GAME_SPEED_RATIOED,
  ENEMY_GUNFIRE_COLOR,
  FRIENDLY_GUNFIRE_COLOR
} from '../core/global.js';
import { playSound, sounds } from '../core/sound.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';
import { net } from '../core/network.js';
import { gamePrefs } from '../UI/preferences.js';

const GunFire = (options = {}) => {
  let data, dom, collision, exports, frameTimeout, radarItem;

  function spark() {
    data.domCanvas.img = effects.spark();
    data.excludeBlink = true;
  }

  function die(force) {
    // aieee!

    if (data.dead && !force) return;

    data.dead = true;

    sprites.removeNodesAndUnlink(exports);

    radarItem?.die({
      silent: true
    });

    common.onDie(exports);
  }

  function sparkAndDie(target) {
    // hackish: bail if spark -> die already scheduled.
    if (frameTimeout) return;

    let now;
    let canSpark = true;
    let canDie = true;

    const tType = target?.data?.type;
    const pType = data.parentType;

    if (target) {
      // special case: tanks hit turrets for a lot of damage.
      if (tType === TYPES.turret) {
        if (pType === TYPES.tank) {
          data.damagePoints = 8;
          effects.inertGunfireExplosion({ exports, count: 1 + rndInt(2) });
        } else if (pType === TYPES.helicopter) {
          /**
           * In the original game, helicopter gunfire is 2 and turrets have 31 hit points.
           * To keep things challenging, make helicopter gunfire less effective on turrets.
           */
          data.damagePoints /= 2;
        } else if (pType === TYPES.infantry) {
          // infantry also take more time on turrets, in the original.
          // this rate takes ~2x as long vs. original, but feels reasonable.
          data.damagePoints /= 2;
        }
      }

      // special case: tanks are impervious to infantry gunfire, end-bunkers and super-bunkers are impervious to helicopter gunfire.
      if (
        !(pType === TYPES.infantry && tType === TYPES.tank) &&
        !(
          pType === TYPES.helicopter &&
          (tType === TYPES.endBunker || tType === TYPES.superBunker)
        )
      ) {
        common.hit(target, data.damagePoints, exports);
      }

      // additional bits of shrapnel, for a helicopter shooting a few specific units
      if (
        pType === TYPES.helicopter &&
        (tType === TYPES.tank ||
          tType === TYPES.missileLauncher ||
          tType === TYPES.helicopter ||
          tType === TYPES.turret ||
          tType === TYPES.bunker)
      ) {
        effects.inertGunfireExplosion({
          exports,
          count: 1 + rndInt(1),
          vX: data.vX * rnd(1)
        });
      }

      // play a sound for certain targets and source -> target combinations

      if (tType === TYPES.helicopter) {
        playSound(sounds.boloTank, exports);

        data.domFetti.startVelocity = Math.abs(data.vX) + Math.abs(data.vY);

        effects.domFetti(exports, target);
      } else if (
        tType === TYPES.tank ||
        tType === TYPES.helicopter ||
        tType === TYPES.van ||
        tType === TYPES.bunker ||
        tType === TYPES.endBunker ||
        tType === TYPES.superBunker ||
        // helicopter -> turret
        (pType === TYPES.helicopter && tType === TYPES.turret)
      ) {
        // impervious to gunfire?
        if (
          // infantry -> tank = ricochet.
          (pType === TYPES.infantry && tType === TYPES.tank) ||
          // nothing can hit end or super bunkers, except tanks.
          ((tType === TYPES.endBunker || tType === TYPES.superBunker) &&
            pType !== TYPES.tank)
        ) {
          // up to five infantry may be firing at the tank.
          // prevent the sounds from piling up.
          now = performance.now();

          if (now - common.lastInfantryRicochet > data.ricochetSoundThrottle) {
            playSound(sounds.ricochet, exports);
            common.lastInfantryRicochet = now;
          }

          canSpark = false;
          canDie = false;

          // bounce! reverse, and maybe flip on vertical.
          // hackish: if gunfire *originated* "above", consider this a vertical bounce.
          if (options.y < 358) {
            data.vY *= -1;
          } else if (net.active) {
            data.vX *= -1;
          } else {
            data.vX *= -rnd(1);
            data.vY *= rnd(1) * plusMinus();
          }

          // hackish: move immediately away, reduce likelihood of getting "stuck" in a bounce.
          data.x += data.vX;
          data.y += data.vY;
        } else {
          // otherwise, it "sounds" like a hit.
          if (tType === TYPES.bunker) {
            playSound(sounds.concreteHit, exports);
          } else {
            playSound(sounds.metalHit, exports);
          }
        }
      } else if (tType === TYPES.balloon && sounds.balloonHit) {
        playSound(sounds.balloonHit, exports);
      } else if (tType === TYPES.turret) {
        playSound(sounds.metalHit, exports);
        effects.inertGunfireExplosion({ exports, count: 1 + rndInt(1) });
      } else if (tType === TYPES.gunfire) {
        // gunfire hit gunfire!
        playSound(sounds.ricochet, exports);
        playSound(sounds.metalHit, exports);
      }
    }

    if (canSpark) spark();

    if (canDie) {
      // "embed", so this object moves relative to the target it hit
      sprites.attachToTarget(exports, target);

      // immediately mark as dead, prevent any more collisions.
      data.dead = true;

      // and cleanup shortly.
      frameTimeout = common.setFrameTimeout(
        () => {
          // use the force, indeed.
          const force = true;
          die(force);
          frameTimeout = null;
        },
        canSpark ? 750 : 250
      );

      if (tType !== TYPES.infantry) {
        // hackish: override for special case
        data.domFetti = {
          colorType: 'grey',
          elementCount: 1 + rndInt(1),
          startVelocity: Math.abs(data.vX) + Math.abs(data.vY),
          angle: 0
        };

        effects.domFetti(exports, target);
      }
    }
  }

  function animate() {
    // pending die()
    if (frameTimeout) {
      // keep moving with scroll, while visible
      sprites.moveWithScrollOffset(exports);
      return false;
    }

    if (data.dead) return true;

    // disappear if created on-screen, but has become off-screen.
    if (data.isInert && !data.isOnScreen) {
      die();
      return;
    }

    if (
      !data.isInert &&
      !data.expired &&
      data.frameCount > data.expireFrameCount
    ) {
      data.expired = true;
      data.domCanvas.backgroundColor = data.inertColor;
    }

    if (data.isInert || data.expired) {
      data.gravity *= 1 + (data.gravityRate - 1) * GAME_SPEED_RATIOED;
    }

    sprites.moveTo(
      exports,
      data.x + data.vX * GAME_SPEED_RATIOED,
      data.y +
        data.vY * GAME_SPEED_RATIOED +
        (data.isInert || data.expired ? data.gravity : 0)
    );

    data.frameCount++;

    // inert "gunfire" animates until it hits the ground.
    if (!data.isInert && data.frameCount >= data.dieFrameCount) {
      die();
    }

    // bottom?
    if (data.y > game.objects.view.data.battleField.height) {
      if (!data.isInert) {
        playSound(sounds.bulletGroundHit, exports);
      }
      die();
    }

    if (!data.isInert) {
      collisionTest(collision, exports);
    }

    // notify caller if now dead and can be removed.
    return data.dead && !dom.o;
  }

  function initGunFire() {
    // randomize a little: ±1 pixel.
    if (!net.active && !options?.fixedXY) {
      data.x += plusMinus();
      data.y += plusMinus();
    }

    dom.o = {};

    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

    if (!data.isInert) {
      radarItem = game.objects.radar.addItem(exports);
    }
  }

  data = common.inheritData(
    {
      type: 'gunfire',
      parent: options.parent || null,
      parentType: options.parentType || null,
      isInert: !!options.isInert,
      isEnemy: options.isEnemy,
      expired: false,
      inertColor: options.inertColor || '#666',
      frameCount: 0,
      expireFrameCount: parseInt(
        ((options.expireFrameCount || 25) * 1) / GAME_SPEED_RATIOED,
        10
      ),
      dieFrameCount: parseInt(
        ((options.dieFrameCount || 75) * 1) / GAME_SPEED_RATIOED,
        10
      ), // live up to N frames, then die?
      width: options.isInert ? 1.5 : 2,
      height: options.isInert ? 1.5 : 1,
      gravity: 0.25,
      gravityRate: (options.isInert ? 1.09 : 1.1) + Math.random() * 0.025,
      damagePoints: options.damagePoints || 1,
      ricochetSoundThrottle: options?.parentType === TYPES.infantry ? 250 : 100,
      target: null,
      vyMax: 32,
      domFetti: {
        elementCount: 1 + rndInt(1),
        startVelocity: 2 + rndInt(10),
        spread: 360,
        decay: 0.935
      }
    },
    options
  );

  data.domCanvas = {
    backgroundColor: options.isInert ? data.inertColor : FRIENDLY_GUNFIRE_COLOR,
    borderRadius: 1,
    radarItem: {
      excludeStroke: true,
      width: 4,
      height: 2,
      draw: (ctx, obj, pos, width, height) => {
        ctx.fillStyle = obj.oParent?.data?.isInert
          ? data.inertColor
          : data.isEnemy
            ? ENEMY_GUNFIRE_COLOR
            : FRIENDLY_GUNFIRE_COLOR;
        ctx.roundRect(
          pos.left(obj.data.left) -
            width * game.objects.radar.data.cssRadarScale,
          obj.data.top - height,
          width,
          height,
          data.domCanvas.borderRadius * game.objects.radar.data.cssRadarScale
        );
      }
    }
  };

  // hackish
  data.domFetti.startVelocity = data.vX;

  dom = {
    o: {}
  };

  exports = {
    animate,
    data,
    dom,
    die,
    init: initGunFire
  };

  collision = {
    options: {
      source: exports,
      targets: undefined,
      checkTweens: !data.isInert,
      hit(target) {
        /**
         * Special case: let tank gunfire pass thru neutral / hostile super bunkers, since
         * tanks use flame to clear out super bunkers. Gunfire here is meant for others,
         *  e.g., a turret or tank overlapping or behind a super bunker being targeted.
         */
        if (
          gamePrefs.tank_gunfire_miss_bunkers &&
          target.data.type === TYPES.superBunker &&
          target.data.hostile &&
          data.parentType === TYPES.tank
        )
          return;

        // special case: ignore inert gunfire. let tank gunfire pass thru if 0 energy, or friendly.
        if (
          !data.isInert &&
          !(
            data.parentType === TYPES.tank &&
            target.data.type === TYPES.endBunker &&
            (target.data.energy === 0 || target.data.isEnemy === data.isEnemy)
          )
        ) {
          sparkAndDie(target);
        }
        // extra special case: BnB + enemy turret / chopper / infantry etc. firing at player.
        if (
          data.isEnemy &&
          target === game.players.local &&
          target.data.isOnScreen
        ) {
          target.reactToDamage(data.parent);
        }
      }
    },
    // if unspecified, use default list of items which bullets can hit.
    items:
      options.collisionItems ||
      getTypes(
        'tank, van, bunker, missileLauncher, infantry, parachuteInfantry, engineer, helicopter, balloon, smartMissile, endBunker, superBunker, turret, gunfire',
        { exports }
      )
  };

  return exports;
};

export { GunFire };
