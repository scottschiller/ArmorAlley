import { common } from '../core/common.js';
import { collisionTest } from '../core/logic.js';
import { FPS, GAME_SPEED, TYPES, getTypes } from '../core/global.js';
import { sprites } from '../core/sprites.js';
import { utils } from '../core/utils.js';
import { game, getObjectById } from '../core/Game.js';

const width = 22;
const height = 20;

// number of frames to iterate through
const animationFrameCount = 3;

const MissileNapalm = (options = {}) => {
  let collision, data, domCanvas, exports;

  data = common.inheritData(
    {
      type: 'missile-napalm',
      parent: options.parent || null,
      parentType: options.parentType || null,
      isEnemy: options.isEnemy,
      hostile: true, // for collision: dangerous to all infantry and engineers.
      frameCount: 0,
      expireFrameCount: Math.floor((FPS * 1) / GAME_SPEED),
      width,
      height,
      damagePoints: options.damagePoints || 2,
      vX: width * (options.vXDirection === undefined ? 1 : options.vXDirection)
    },
    options
  );

  domCanvas = {
    img: {
      // NOTE: start on smallest spark / flame sprite
      src: utils.image.getImageObject(`shrapnel_v3.png`),
      // NOTE: allow one extra frame in animation
      animationModulus:
        Math.floor(FPS / (animationFrameCount + 0.5) / 2) *
        Math.floor(1 / GAME_SPEED), // 1 / 10 = 1-second animation
      frameCount: 0,
      // frame count to actual image offset
      frameMap: [3, 2, 1, 0],
      animationFrame: 0,
      animationFrameDirection: 1,
      animationFrameCount,
      expireFrameCount: Math.floor(FPS),
      source: {
        x: 0,
        y: 0,
        width,
        height,
        is2X: true,
        // frame size
        frameWidth: width * 2,
        frameHeight: height * 2,
        // sprite offset indices
        frameX: 0,
        frameY: 0
      },
      target: {
        width,
        height,
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
          obj.data.top - 2,
          // width, height, border radius
          2 *
            game.objects.view.data.screenScale *
            game.objects.radar.data.cssRadarScale,
          2 * game.objects.view.data.screenScale,
          2 * game.objects.radar.data.scale
        );
        ctx.fill();
      }
    }
  };

  exports = {
    animate: () => animate(exports),
    data,
    domCanvas,
    die: (force) => die(exports, force),
    init: () => initMissileNapalm(exports)
  };

  collision = {
    options: {
      source: data.id,
      targets: undefined,
      useLookAhead: true,
      /**
       * Hackish: each flame jumps forward, so use lookahead
       * to catch the "tweens" until the last frame.
       */
      //
      xLookAhead: width,
      checkTweens: true,
      hit(targetID) {
        let target = getObjectById(targetID);
        if (data.damagePoints) {
          /**
           * Special case: missile napalm doesn't burn friendly helicopters
           * in the original, but can hurt the opposing team's choppers.
           *
           * Collision logic brings us here because flame is hostile and
           * dangerous to both, hence this special check.
           */
          if (
            target.data.type === TYPES.helicopter &&
            getObjectById(data.parent)?.data?.isEnemy === target.data.isEnemy
          ) {
            return;
          }
          common.hit(target.data.id, data.damagePoints, data.id);
        }
      }
    },
    /**
     * If unspecified, use default list of items which napalm can hit.
     * Note: "flame burns both sides."
     */
    items:
      options.collisionItems ||
      getTypes(
        'infantry:all, engineer:all, parachuteInfantry:all, helicopter',
        { exports }
      )
  };

  exports.collision = collision;

  return exports;
};

function die(exports, force) {
  let { data, radarItem } = exports;

  // aieee!

  if (data.dead && !force) return;

  data.dead = true;

  radarItem?.die({
    silent: true
  });

  sprites.removeNodesAndUnlink(exports);

  common.onDie(data.id);
}

function animate(exports) {
  let { collision, data, domCanvas } = exports;

  sprites.draw(exports);

  if (data.dead) return true;

  // avoid rolling over too many frames
  if (data.frameCount % domCanvas.img.animationModulus === 0) {
    domCanvas.img.animationFrame += domCanvas.img.animationFrameDirection;

    if (domCanvas.img.animationFrame >= animationFrameCount) {
      domCanvas.img.animationFrameDirection *= -1;
    }

    if (domCanvas.img.animationFrame >= 0) {
      domCanvas.img.src = utils.image.getImageObject(
        `shrapnel_v${domCanvas.img.frameMap[domCanvas.img.animationFrame]}.png`
      );
    } else {
      // -1 = end of animation
      collision.options.useLookAhead = false;
    }

    // flames have "velocity" in the original game
    data.x += data.vX;
  }

  if (!data.expired && data.frameCount > data.expireFrameCount) {
    die(exports);
  }

  data.frameCount++;

  if (!data.isInert) {
    collisionTest(collision, exports);
  }

  // notify caller if now dead and can be removed.
  return data.dead && data.canDestroy;
}

function initMissileNapalm(exports) {
  exports.radarItem = game.objects.radar.addItem(exports);
}

export { MissileNapalm };
