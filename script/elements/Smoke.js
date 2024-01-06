import { rnd, rndInt, plusMinus, GAME_SPEED } from '../core/global.js';
import { common } from '../core/common.js';
import { sprites } from '../core/sprites.js';

const smokeSprite = new Image();
// smokeSprite.src = 'image/smoke-sprite.png';
smokeSprite.src =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAADYBAMAAAAUk662AAAAD1BMVEUAAAAAAACWlpZUVFT///+NK79EAAAAAXRSTlMAQObYZgAAATtJREFUeF7F1NGNhTAMBdHQQW4L04JbSP81LVheW8FCWsTH5usIBIycvDfGoWvNMYZDui5hBppDIQ3h4q7VZOdCuxYYtksAbHJKGofLsxRRUTpD82jNSN7simZAbHLaLoSX7joBuzCV3jYHRt0U+YBLp0CIXVoGN5nRxGm7SYDrSMXnlAmzsirVEcmj7imSY84aUYpmKkpNaIaez5BzlwDwmbpiptmsaK6uaq3V++NZl0oAmildivltArpg3SWU09XjdPt6Hnm+BCQXZmim4rsGN7GwJqD09xPxIrr2SBkttIzSXnqUZERpCYPS9zmPI2/WEVIdK+JiTcMVfbnTKZZZEzS9af6GvjEh0EzJpYU1YWz6h1LTTCm0aBJZRb1Gbac/r+efaE6otOhCTd9n+v2ML5pkoSPV/m3frx9YTHR7id+njwAAAABJRU5ErkJggg==';

const Smoke = (options = {}) => {
  let dom, data, exports;

  function die() {
    if (data.dead) return;

    sprites.nullify(dom);

    data.dead = true;
  }

  function animate() {
    let scale = null;

    // move?
    if (data.vX !== null && data.vY !== null) {
      data.x +=
        data.vX *
        (options.fixedSpeed ? 1 : Math.max(0.9, Math.random())) *
        GAME_SPEED;
      data.y +=
        (data.vY * (options.fixedSpeed ? 1 : Math.max(0.9, Math.random())) +
          data.gravity) *
        GAME_SPEED;

      if (options.deceleration) {
        data.vX *= 1 - (1 - options.deceleration) * GAME_SPEED;
        data.vY *= 1 - (1 - options.deceleration) * GAME_SPEED;
        if (options.increaseDeceleration !== undefined) {
          options.deceleration *=
            1 - (1 - options.increaseDeceleration) * GAME_SPEED;
        }
      }

      // scale applied if also fading out
      if (data.isFading) {
        scale = 1 - data.fadeFrame / data.fadeFrames;
      } else {
        scale = data.baseScale;
        if (data.rotation) {
          data.rotation += data.rotationAmount;
        }
      }

      if (scale) {
        scale = `scale3d(${[scale, scale, 1].join(', ')})`;
      }

      if (data.isOnScreen) {
        sprites.setTransformXY(
          exports,
          dom.o,
          `${data.x}px`,
          `${data.y}px`,
          (data.rotation ? `rotate3d(0, 0, 1, ${data.rotation}deg) ` : '') +
            (scale ? ` ${scale}` : '')
        );
      }
    }

    // animate and fade
    if (data.frameCount % data.spriteFrameModulus === 0) {
      // first, animate through sprite. then, fade opacity.
      if (data.spriteFrame < data.spriteFrames) {
        // advance smoke sprite, 0% -> -100% (top-to-bottom)
        if (data.isOnScreen) {
          data.domCanvas.img.source.frameY = data.spriteFrame;
          sprites.setTransformXY(
            exports,
            dom.oTransformSprite,
            `0%`,
            `${-data.spriteFrame * data.spriteOffsetPerFrame}px`
          );
        }
        data.spriteFrame++;
      } else {
        data.isFading = true;
      }
    }

    // if fading, animate every frame.
    if (data.isFading) {
      data.fadeFrame += GAME_SPEED;

      if (data.fadeFrame < data.fadeFrames && data.isOnScreen) {
        data.domCanvas.img.target.opacity =
          1 - data.fadeFrame / data.fadeFrames;
      }

      if (data.fadeFrame > data.fadeFrames) {
        // animation finished
        die();
      }
    }

    data.frameCount++;

    return data.dead && !dom.o;
  }

  function initSmoke() {
    // null-ish object, for domCanvas
    dom.o = {};
  }

  data = common.inheritData(
    {
      type: 'smoke',
      frameCount: 0,
      spriteFrameModulus: parseInt(
        (options.spriteFrameModulus || 2) * (1 / GAME_SPEED),
        10
      ),
      spriteFrame:
        options.spriteFrame !== undefined ? options.spriteFrame : rndInt(6),
      spriteFrames: 12,
      spritePixelHeight: 108, // real sprite is 216, but we render half-size.
      spriteOffsetPerFrame: 108 / 12,
      isFading: false,
      fadeFrame: 0,
      fadeFrames: 8,
      direction: 0,
      width: 9,
      height: 9,
      gravity: options.gravity !== undefined ? options.gravity : 0.5,
      rotation: rnd(360),
      rotationAmount: plusMinus(rnd(5)),
      // by default, allow some randomness
      baseScale: options.baseScale || 0.65 + rnd(0.35),
      // hackish: use provided, or default values.
      vX: options.vX !== undefined ? options.vX : plusMinus(rnd(3)),
      vY: options.vY !== undefined ? options.vY : -rnd(3)
    },
    options
  );

  data.domCanvas = {
    img: {
      src: smokeSprite,
      source: {
        x: 0,
        y: 0,
        width: smokeSprite.width,
        height: smokeSprite.height,
        is2X: true,
        // frame size
        frameWidth: 18,
        frameHeight: 18,
        // sprite offset indices
        frameX: 0,
        frameY: 0
      },
      target: {
        width: 18,
        height: 18
      }
    }
  };

  dom = {
    o: null,
    oTransformSprite: null
  };

  exports = {
    animate,
    data,
    dom,
    die
  };

  initSmoke();

  return exports;
};

export { Smoke };
