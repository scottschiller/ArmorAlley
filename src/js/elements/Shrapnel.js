import { game } from '../core/Game.js';
import { common } from '../core/common.js';
import { collisionTest } from '../core/logic.js';
import {
  FPS,
  GAME_SPEED_RATIOED,
  getTypes,
  plusMinus,
  rnd,
  rndInt,
  rng,
  rngInt,
  rngPlusMinus,
  TYPES,
  worldHeight
} from '../core/global.js';
import { playSound, sounds } from '../core/sound.js';
import { Smoke } from './Smoke.js';
import { sprites } from '../core/sprites.js';
import { utils } from '../core/utils.js';

const Shrapnel = (options = {}) => {
  let dom,
    data,
    collision,
    radarItem,
    scale,
    exports,
    type = TYPES.shrapnel;

  const spriteTypes = 12;

  const maxVX = 16;
  const maxVY = 16;

  function moveTo(x, y) {
    let relativeScale;

    // shrapnel is magnified somewhat when higher on the screen, "vaguely" 3D
    relativeScale = Math.min(1, y / (worldHeight * 0.95));

    // allow slightly larger, and a fair bit smaller
    relativeScale = 1.05 - relativeScale * data.scaleRange;

    data.relativeScale = relativeScale;

    data.domCanvas.img.target.scale = data.relativeScale;

    data.domCanvas.img.target.angle = data.spinAngle;

    sprites.moveTo(exports, x, y);
  }

  function shrapnelNoise() {
    if (!data.hasSound) return;

    const i = `hit${sounds.shrapnel.counter}`;

    sounds.shrapnel.counter +=
      sounds.shrapnel.counter === 0 && Math.random() > 0.5 ? 2 : 1;

    if (sounds.shrapnel.counter >= sounds.shrapnel.counterMax) {
      sounds.shrapnel.counter = 0;
    }

    if (sounds.shrapnel[i]) {
      playSound(sounds.shrapnel[i], exports);
    }
  }

  function die() {
    if (data.dead) return;

    data.energy = 0;

    data.dead = true;

    shrapnelNoise();

    data.isFading = true;

    radarItem?.die({
      silent: true
    });

    common.onDie(exports);
  }

  function hitAndDie(target) {
    let targetType,
      damageTarget = true;

    if (!target) {
      die();
      return;
    }

    // hackish: there was a collision, but "pass-thru" if the target says to ignore shrapnel.
    // e.g., paratroopers dropped from a helicopter while it's exploding mid-air,
    // so the infantry doesn't die and the shrapnel isn't taken out in the process.
    if (target.data.ignoreShrapnel) return;

    // shrapnel hit something; what should it sound like, if anything?
    targetType = target.data.type;

    if (targetType === TYPES.helicopter) {
      playSound(sounds.boloTank, exports);

      // extra special case: BnB + enemy turret / chopper / infantry etc. firing at player.
      if (
        data.isEnemy &&
        target === game.players.local &&
        target.data.isOnScreen
      ) {
        target.reactToDamage(exports);
      }
    } else if (targetType === TYPES.tank || targetType === TYPES.superBunker) {
      // shrapnel -> [tank | superbunker]: no damage.
      damageTarget = false;

      // ricochet if shrapnel is connected to "sky" units (helicopter, balloon etc.)
      // otherwise, die silently. this helps prevent ground units' shrapnel from causing mayhem with neighbouring tanks etc.
      if (data.ricochetTypes.includes(data.parentType)) {
        ricochet(targetType);
        // bail early, don't die
        return;
      }
    } else if (sounds.types.metalHit.includes(targetType)) {
      playSound(sounds.metalHit, exports);
    } else if (sounds.types.genericSplat.includes(targetType)) {
      playSound(sounds.genericSplat, exports);
    }

    if (damageTarget) {
      common.hit(target, data.damagePoints, exports);
    }

    // "embed", so this object moves relative to the target it hit
    // TODO: refactor this method so it uses canvas + coords
    sprites.attachToTarget(exports, target);

    die();
  }

  function ricochet(targetType) {
    // bounce upward if ultimately heading down
    if (data.vY + data.gravity <= 0) return;

    // expired; you only get so many. ;)
    if (data.ricochetCount >= data.ricochetCountMax) return;

    data.ricochetCount++;

    // at least...
    data.vY = Math.max(data.vY, data.maxVY / 6);

    // but no more than...
    data.vY = Math.min(data.vY, data.maxVY / 3);

    // ensure we end negative, and lose (or gain) a bit of velocity
    data.vY = Math.abs(data.vY) * -data.rndRicochetAmount;

    // sanity check: don't get stuck "inside" tank or super bunker sprites.
    // ensure that the shrapnel stays at or above the height of both.
    data.y = Math.min(
      worldHeight - (common.ricochetBoundaries[targetType] || 16),
      data.y
    );

    // randomize vX strength, and randomly reverse direction.
    data.vX += rng(1, data.type);
    data.vX *= rngPlusMinus(1, data.type);

    // and, throttle
    if (data.vX > 0) {
      data.vX = Math.min(data.vX, data.maxVX);
    } else {
      data.vX = Math.max(data.vX, data.maxVX * -1);
    }

    // everything becomes slightly "heavier" on bounce. ;)
    data.gravityBase += 0.01;

    // reset "gravity" effect, too.
    data.gravity = 1 + data.gravityBase + data.gravityRate;

    // data.y may have been "corrected" - move again, just to be safe.
    moveTo(
      data.x + data.vX * GAME_SPEED_RATIOED,
      data.y +
        Math.min(
          data.maxVY,
          data.vY * GAME_SPEED_RATIOED + data.gravity * GAME_SPEED_RATIOED
        )
    );

    playSound(sounds.ricochet, exports);
  }

  function maybeFade() {
    if (!data.isFading) return;

    // if fading, animate every frame.
    if (data.isFading) {
      data.fadeFrame += GAME_SPEED_RATIOED;

      if (data.fadeFrame < data.fadeFrames) {
        data.domCanvas.img.target.opacity =
          1 - data.fadeFrame / data.fadeFrames;
      }

      if (data.fadeFrame > data.fadeFrames) {
        // animation finished
        sprites.removeNodes(dom);
      }
    }
  }

  function animate() {
    if (data.dead) {
      // keep moving with scroll, while visible
      sprites.moveWithScrollOffset(exports);

      maybeFade();

      return !dom.o;
    }

    data.rotate3DAngle += data.rotate3DAngleIncrement * GAME_SPEED_RATIOED;
    data.spinAngle += data.spinAngleIncrement * GAME_SPEED_RATIOED;

    moveTo(
      data.x + data.vX * GAME_SPEED_RATIOED,
      data.y +
        Math.min(
          data.maxVY,
          data.vY * GAME_SPEED_RATIOED + data.gravity * GAME_SPEED_RATIOED
        )
    );

    // random: smoke while moving?
    if (data.isOnScreen && Math.random() >= 0.99) {
      makeSmoke();
    }

    // did we hit the ground?
    if (data.y - data.height >= worldHeight) {
      moveTo(data.x, worldHeight - (data.height / 2) * data.relativeScale);
      die();
    } else {
      data.gravity *=
        1 + (data.gravityBase + data.gravityRate) * GAME_SPEED_RATIOED;

      // collision check
      collisionTest(collision, exports);
    }

    return data.dead && !dom.o;
  }

  function makeSmoke() {
    game.addObject(TYPES.smoke, {
      x: data.x + 6 + rnd(6) * 0.33 * plusMinus(),
      y: data.y + 6 + rnd(6) * 0.33 * plusMinus(),
      vX: rnd(6) * plusMinus(),
      vY: rnd(-5),
      spriteFrame: rndInt(5)
    });
  }

  function initShrapnel() {
    // domCanvas
    dom.o = {};

    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

    radarItem = game.objects.radar.addItem(exports);

    // special case for end game (base) explosion: don't create identical "clouds" of smoke *at* base.
    if (data.isOnScreen && !options.noInitialSmoke) {
      makeSmoke();
    }

    shrapnelNoise();
  }

  function rndAngle() {
    return plusMinus(rnd(35));
  }

  // default
  scale = options.scale || 0.8 + rng(0.15, type);

  data = common.inheritData(
    {
      type,
      parentType: options.type || null,
      spriteType: rngInt(spriteTypes, type),
      direction: 0,
      alwaysDraw: true,
      isFading: false,
      fadeFrame: 0,
      fadeFrames: FPS,
      // sometimes zero / non-moving?
      vX: rng(Math.max(-maxVX, Math.min(maxVX, options.vX || 0)), type),
      vY: rng(Math.max(-maxVY, Math.min(maxVY, options.vY || 0)), type),
      maxVX,
      maxVY,
      gravity: 1,
      // randomize fall rate
      gravityBase: 0.08,
      gravityRate: rng(0.05, type),
      width: 11 * scale,
      height: 10 * scale,
      scale,
      scaleRange: 0.4 + rng(0.25, type),
      rotate3DAngle: rndAngle(),
      rotate3DAngleIncrement: rndAngle(),
      spinAngle: rndAngle(),
      spinAngleIncrement: rndAngle(),
      hostile: true,
      damagePoints: 0.5,
      hasSound: !!options.hasSound,
      rndRicochetAmount: 0.5 + rng(0.75, type),
      ricochetCount: 0,
      ricochetCountMax: 8,
      // let shrapnel that originates "higher up in the sky" from the following types, bounce off tanks and super bunkers
      ricochetTypes: [TYPES.balloon, TYPES.helicopter, TYPES.smartMissile]
    },
    options
  );

  data.domCanvas = {
    img: {
      src: utils.image.getImageObject(`shrapnel-glow_v${data.spriteType}.png`),
      source: {
        x: 0,
        y: 0,
        width: 160,
        height: 132,
        is2X: true,
        // frame size
        frameWidth: 44,
        frameHeight: 40,
        // sprite offset indices
        frameX: 0,
        frameY: 0
      },
      target: {
        width: 44,
        height: 40,
        angle: 0,
        scale: 1
      }
    },
    radarItem: {
      excludeFillStroke: true,
      draw: (ctx, obj) => {
        ctx.fillStyle = '#cc0000';
        ctx.roundRect(
          // radar objects have top + left
          obj.data.left * game.objects.radar.data.scale -
            game.objects.radar.data.radarScrollLeft,
          obj.data.top,
          // width, height, border radius
          1 *
            game.objects.view.data.screenScale *
            game.objects.radar.data.cssRadarScale,
          1 * game.objects.view.data.screenScale,
          1 * game.objects.radar.data.scale
        );
        ctx.fill();
      }
    }
  };

  dom = {
    o: null
  };

  exports = {
    animate,
    data,
    dom,
    die,
    init: initShrapnel
  };

  collision = {
    options: {
      source: exports,
      targets: undefined,
      checkTweens: true,
      /**
       * Hackish: prevent this method from repositioning the shrapnel.
       * It may be a ricochet case, where the shrapnel is moving out of the body of a tank.
       * Repeated hits may occur, but we'll exit because the ricochet is still active etc.
       * TODO: consider returning the adjusted hit coords in future use cases.
       */
      checkTweensRepositionOnHit: false,
      hit(target) {
        hitAndDie(target);
      }
    },
    items:
      !game.objects.editor &&
      getTypes(
        'superBunker, bunker, helicopter, balloon, tank, van, missileLauncher, infantry, parachuteInfantry, engineer, smartMissile, turret',
        { group: 'all' }
      )
  };

  return exports;
};

export { Shrapnel };
