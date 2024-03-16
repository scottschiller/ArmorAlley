import { game } from '../core/Game.js';
import { gameType } from '../aa.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { collisionTest } from '../core/logic.js';
import {
  rad2Deg,
  plusMinus,
  rnd,
  rndInt,
  worldHeight,
  TYPES,
  getTypes,
  GAME_SPEED_RATIOED
} from '../core/global.js';
import { playSound, sounds } from '../core/sound.js';
import { Smoke } from '../elements/Smoke.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';
import { aaLoader } from '../core/aa-loader.js';

const Bomb = (options = {}) => {
  let data, dom, collision, radarItem, exports;

  function moveTo(x, y) {
    let deltaX, deltaY, rad;

    deltaX = 0;
    deltaY = 0;

    if (x !== undefined) {
      deltaX = x - data.x;
    }

    if (y !== undefined) {
      deltaY = y - data.y;
    }

    rad = Math.atan2(deltaY, deltaX);

    if (deltaX || deltaY) {
      data.angle = rad * rad2Deg;
    }

    sprites.moveTo(exports, x, y);
  }

  function dieExplosion() {
    data.domCanvas.dieExplosion = effects.bombExplosion(exports);
  }

  function spark() {
    data.domCanvas.img = effects.spark();
  }

  function die(dieOptions = {}) {
    // aieee!

    if (data.dead || data.groundCollisionTest) return;

    if (dieOptions.attacker) {
      data.attacker = dieOptions.attacker;
    }

    // possible hit, blowing something up.
    // special case: don't play "generic boom" if we hit a balloon
    if (
      !dieOptions.omitSound &&
      !dieOptions.hidden &&
      sounds.bombExplosion &&
      dieOptions?.type !== TYPES.balloon
    ) {
      playSound(sounds.bombExplosion, exports);
    }

    const isClassicExplosion =
      !dieOptions?.type ||
      (dieOptions.type !== TYPES.bunker &&
        dieOptions.type !== TYPES.superBunker);

    if (dieOptions.spark) {
      spark();
      // TODO: attach to target?
    } else if (isClassicExplosion) {
      // restore original scale.
      data.scale = 1;
    } else {
      if (data?.attacker?.data?.type !== TYPES.helicopter) {
        // hackish: offset rotation so explosion points upward.
        data.angle -= 90;
        // limit rotation, as well.
        data.angle *= 0.5;
      }
      data.scale = 0.65;
    }

    if (dieOptions.hidden) {
      data.visible = false;
    } else {
      if (!dieOptions.spark) {
        if (isClassicExplosion) {
          dieExplosion();
        } else {
          // "dirt" exposion
          const dirtConfig = (() => {
            const spriteWidth = 1024;
            const spriteHeight = 112;
            return {
              // overlay: true,
              scale: 0.75,
              xOffset: 0,
              yOffset: -30,
              useDataAngle: true,
              sprite: {
                // TODO: refactor this pattern out.
                url: `battlefield/standalone/deviantart-Dirt-Explosion-774442026.${aaLoader.version ? 'webp' : 'png'}`,
                width: spriteWidth,
                height: spriteHeight,
                frameWidth: spriteWidth / 10,
                frameHeight: spriteHeight,
                animationDuration: 2 / 3,
                horizontal: true,
                hideAtEnd: true
              }
            };
          })();

          data.shadowBlur = 4;
          data.shadowColor = 'rgba(255, 255, 255, 0.5)';

          data.domCanvas.dieExplosion = common.domCanvas.canvasAnimation(
            exports,
            dirtConfig
          );
        }
      }
    }

    if (dieOptions.bottomAlign) {
      data.y = 380;

      if (isClassicExplosion) {
        // hack: ensure that angle is 0 for the classic explosion sprite.
        data.angle = 0;
        dieExplosion();
      }

      // bombs explode, and dimensions change when they hit the ground.
      if (data.domCanvas.dieExplosion) {
        // pull back by half the difference, remaining "centered" around original bomb coordinates.
        // note that sprite is 2x, so frameWidth is cut in half.
        data.x -=
          (data.domCanvas.dieExplosion.sprite.frameWidth / 2 - data.width) / 2;

        // resize accordingly
        data.width = data.domCanvas.dieExplosion.sprite.frameWidth / 2;
        data.halfWidth = data.width / 2;

        // TODO: review data.y vs. data.height in terms of collision logic, if collisions are off.
        data.height = data.domCanvas.dieExplosion.sprite.frameHeight;
        data.halfHeight = data.height / 2;
      }

      // stop moving
      data.vY = 0;
      data.gravity = 0;

      // this will move the domCanvas stuff, too.
      sprites.moveTo(exports, data.x, data.y);

      // hackish: do one more collision check, since coords have changed, before this element is dead.
      // this will cause another call, which can be ignored.
      if (!data.groundCollisionTest) {
        data.groundCollisionTest = true;
        collisionTest(collision, exports);
      }
    } else {
      // align to whatever we hit

      // hacks: if scaling down, subtract full width.
      // "this is in need of techical review." ;)
      if (data.scale) {
        data.x -= data.width;
      }

      if (dieOptions.type && common.ricochetBoundaries[dieOptions.type]) {
        let halfHeight = dieOptions.attacker?.data?.halfHeight || 3;

        // ensure that the bomb stays at or above the height of its target - e.g., bunker or tank.
        data.y =
          Math.min(
            worldHeight - common.ricochetBoundaries[dieOptions.type],
            data.y
          ) -
          (dieOptions.spark
            ? -(3 + rnd(halfHeight))
            : data.height * (data.scale || 1));

        // go there immediately
        moveTo(data.x, data.y);
      } else {
        if (dieOptions.target?.data?.type === TYPES.turret) {
          // special case: align to turret, and randomize a bit.
          const halfWidth = dieOptions.target.data.halfWidth || 3;
          data.x =
            dieOptions.target.data.x + halfWidth + plusMinus(rnd(halfWidth));
          data.y =
            dieOptions.target.data.y + rnd(dieOptions.target.data.height);
          dieOptions.extraY = 0;
        }

        // extraY: move bomb spark a few pixels down so it's in the body of the target. applies mostly to tanks.
        moveTo(data.x, data.y + (dieOptions.extraY || 0));
      }

      // "embed", so this object moves relative to the target it hit
      sprites.attachToTarget(exports, dieOptions.target);
    }

    data.deadTimer = common.setFrameTimeout(() => {
      data.domCanvas.dieExplosion = null;
      sprites.removeNodesAndUnlink(exports);
      data.deadTimer = null;
    }, 1500);

    // TODO: move into something common?
    if (data.isOnScreen) {
      for (let i = 0; i < 3; i++) {
        game.addObject(TYPES.smoke, {
          x: data.x + rndInt(data.width / 2) * 0.33 * plusMinus(),
          y: data.y,
          vX: plusMinus(rnd(3.5)),
          vY: rnd(-2.5),
          spriteFrame: rndInt(5)
        });
      }
    }

    effects.domFetti(exports, dieOptions.target);

    effects.inertGunfireExplosion({
      exports,
      count: 2 + rndInt(2)
    });

    data.dead = true;

    if (radarItem) {
      radarItem.die({
        silent: true
      });
    }

    common.onDie(exports, dieOptions);
  }

  function bombHitTarget(target) {
    let spark, bottomAlign, damagePoints, hidden;

    // assume default
    damagePoints = data.damagePoints;

    // some special cases, here

    if (target.data.type === TYPES.smartMissile) {
      die({
        attacker: target,
        type: target.data.type,
        omitSound: true,
        spark: true,
        target
      });
    } else if (target.data.type === TYPES.infantry) {
      /**
       * bomb -> infantry special case: don't let bomb die; keep on truckin'.
       * continue to ground, where larger explosion may take out a group of infantry.
       * only do damage once we're on the ground. this means infantry will play the
       * hit / "smack" sound, but don't die + scream until the bomb hits the ground.
       */
      if (!data.hasHitGround) {
        damagePoints = 0;
      }
    } else {
      // certain targets should get a spark vs. a large explosion
      spark = target.data.type?.match(
        /tank|parachute-infantry|turret|smart-missile|gunfire/i
      );

      // hide bomb sprite entirely on collision with these items...
      hidden = data.hidden || target.data.type.match(/balloon/i);

      bottomAlign =
        (!spark &&
          !hidden &&
          target.data.type !== TYPES.helicopter &&
          target.data.type !== TYPES.superBunker &&
          target.data.type !== TYPES.balloon &&
          target.data.type !== TYPES.gunfire &&
          target.data.type !== TYPES.bunker) ||
        target.data.type === TYPES.infantry;

      data.bottomAlign = bottomAlign;

      die({
        attacker: target,
        type: target.data.type,
        spark,
        hidden,
        bottomAlign,
        // and a few extra pixels down, for tanks (visual correction vs. boxy collision math)
        extraY: target.data.type?.match(/tank/i) ? 3 + rndInt(3) : 0,
        target
      });
    }

    // if specified, take exact damage.
    if (options.damagePoints) {
      damagePoints = options.damagePoints;
    } else if (target.data.type) {
      // special cases for bomb -> target interactions

      if (target.data.type === TYPES.helicopter) {
        // one bomb kills a helicopter.
        damagePoints = target.data.energyMax;
      } else if (target.data.type === TYPES.turret) {
        // bombs do more damage on turrets if a direct hit; less, if from a nearby explosion.
        damagePoints = data.hasHitGround ? 3 : 10;
      } else if (data.hasHitGround) {
        // no specific target match: take 33% cut on bomb damage
        damagePoints = data.damagePointsOnGround;
      }

      // bonus "hit" sounds for certain targets
      if (!data.isMuted) {
        if (
          target.data.type === TYPES.tank ||
          target.data.type === TYPES.turret
        ) {
          playSound(sounds.metalHit, exports);
        } else if (target.data.type === TYPES.bunker) {
          playSound(sounds.concreteHit, exports);
          data.isMuted = true;
        } else if (
          target.data.type === TYPES.bomb ||
          target.data.type === TYPES.gunfire
        ) {
          playSound(sounds.ricochet, exports);
        } else if (
          target.data.type === TYPES.van ||
          target.data.type === TYPES.missileLauncher
        ) {
          playSound(sounds.metalHit, exports);
          playSound(sounds.metalClang, exports);
          data.isMuted = true;
        }
      }
    }

    common.hit(target, damagePoints, exports);
  }

  function animate() {
    data.domCanvas?.dieExplosion?.animate();

    if (data.dead) {
      sprites.moveWithScrollOffset(exports);
      return !data.deadTimer && !dom.o;
    }

    data.gravity *= 1 + 0.1 * GAME_SPEED_RATIOED;

    moveTo(
      data.x + data.vX * GAME_SPEED_RATIOED,
      data.y +
        Math.min(
          data.vY * GAME_SPEED_RATIOED + data.gravity * GAME_SPEED_RATIOED,
          data.vYMax
        )
    );

    // hit bottom?
    if (data.y - data.height > game.objects.view.data.battleField.height) {
      data.hasHitGround = true;
      die({
        hidden: data.hidden,
        bottomAlign: true
      });
    }

    collisionTest(collision, exports);

    // bombs are animated by their parent - e.g., helicopters,
    // and not the main game loop. so, on-screen status is checked manually here.
    sprites.updateIsOnScreen(exports);

    // notify caller if dead, and node has been removed.
    return data.dead && !data.deadTimer && !dom.o;
  }

  function initDOM() {
    dom.o = {};
    data.domCanvas.img = spriteConfig;

    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);
  }

  function initBomb() {
    initDOM();

    if (data.hidden) return;

    // TODO: don't create radar items for bombs from enemy helicopter when cloaked
    radarItem = game.objects.radar.addItem(exports);
  }

  data = common.inheritData(
    {
      type: 'bomb',
      parent: options.parent || null,
      parentType: options.parentType || null,
      deadTimer: null,
      excludeBlink: true,
      extraTransforms: null,
      hasHitGround: false,
      hidden: !!options.hidden,
      isMuted: false,
      groundCollisionTest: false,
      width: 14,
      height: 6,
      halfWidth: 7,
      halfHeight: 3,
      explosionWidth: 51,
      explosionHeight: 22,
      gravity: 1,
      energy: 3,
      damagePoints: 3,
      damagePointsOnGround: 2,
      target: null,
      vX: options.vX || 0,
      vYMax: 128,
      bottomAlign: false,
      angle: 0,
      scale: null,
      domFetti: {
        colorType: 'bomb',
        elementCount: 3 + rndInt(3),
        startVelocity: 5 + rndInt(5)
      }
    },
    options
  );

  data.domCanvas = {
    radarItem: {
      width: 1.25,
      height: 2.5,
      draw: (ctx, obj, pos, width, height) => {
        if (data.isEnemy) {
          ctx.fillStyle = '#cc0000';
        }
        const scaledWidth = pos.width(width);
        const scaledHeight = pos.heightNoStroke(height);
        const left = pos.left(obj.data.left) - scaledWidth / 2;
        const top = obj.data.top;

        common.domCanvas.rotate(
          ctx,
          data.angle + 90,
          left,
          top,
          scaledWidth,
          scaledHeight
        );

        ctx.roundRect(left, top, scaledWidth, scaledHeight, [
          scaledHeight,
          scaledHeight,
          0,
          0
        ]);

        common.domCanvas.unrotate(ctx);
      }
    }
  };

  dom = {
    o: null
  };

  exports = {
    animate,
    data,
    die,
    dom,
    init: initBomb
  };

  collision = {
    options: {
      source: exports,
      targets: undefined,
      checkTweens: true,
      hit(target) {
        // special case: bomb being hit, eventually shot down by gunfire
        if (target.data.type === TYPES.gunfire && data.energy) {
          data.energy = Math.max(0, data.energy - target.data.damagePoints);
          playSound(sounds.metalHit, exports);
          if (!data.hidden) {
            effects.inertGunfireExplosion({ exports, count: 1 + rndInt(2) });
          }
          return;
        }
        bombHitTarget(target);
      }
    },
    items: getTypes(
      'superBunker, bunker, tank, helicopter, balloon, van, missileLauncher, infantry, parachuteInfantry, engineer, turret, smartMissile',
      { exports }
    ).concat(gameType === 'extreme' ? getTypes('gunfire', { exports }) : [])
  };

  const spriteConfig = (() => {
    const spriteWidth = 28;
    const spriteHeight = 12;
    return {
      src: utils.image.getImageObject('bomb.png'),
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
        width: spriteWidth / 2,
        height: spriteHeight / 2,
        useDataAngle: true
      }
    };
  })();

  return exports;
};

export { Bomb };
