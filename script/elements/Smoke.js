import { rnd, rndInt, plusMinus } from '../core/global.js';
import { common } from '../core/common.js';

const Smoke = options => {

  let css, dom, data, exports;

  options = options || {};

  function die() {

    if (data.dead) return;

    common.removeNodes(dom);

    data.dead = true;

  }

  function animate() {

    let scale = null;

    if (data.frameCount % data.animateModulus === 0) {

      // move?
      if (data.vX !== null && data.vY !== null) {

        data.x += (data.vX * (options.fixedSpeed ? 1 : Math.max(0.9, Math.random())));
        data.y += (data.vY * (options.fixedSpeed ? 1 : Math.max(0.9, Math.random()))) + data.gravity;

        if (options.deceleration) {
          data.vX *= options.deceleration;
          data.vY *= options.deceleration;
          if (options.increaseDeceleration !== undefined) {
            options.deceleration *= options.increaseDeceleration;
          }
        }

        // scale applied if also fading out
        if (data.isFading) {
          scale = 1 - (data.fadeFrame / data.fadeFrames);
        } else {
          scale = data.baseScale;
          if (data.rotation) {
            data.rotation += data.rotationAmount;
          }
        }

        if (scale) {
          scale = `scale3d(${[scale, scale, 1].join(', ')})`;
        }

        common.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`, (data.rotation ? `rotate3d(0, 0, 1, ${data.rotation}deg) ` : '') + (scale ? ` ${scale}` : ''));

      }

      // animate and fade
      if (data.frameCount % data.spriteFrameModulus === 0) {

        // first, animate through sprite. then, fade opacity.
        if (data.spriteFrame < data.spriteFrames - 1) {
          // advance smoke sprite, 0% -> -100% (L-R)
          common.setTransformXY(exports, dom.oTransformSprite, `${-((data.spriteFrame / (data.spriteFrames - 1)) * 100)}%`, '0%');
          data.spriteFrame++;
        } else {
          data.isFading = true;
        }

      }

    }

    // if fading, animate every frame.
    if (data.isFading) {
      data.fadeFrame++;

      if (data.fadeFrame < data.fadeFrames && data.isOnScreen) {
        dom.o._style.setProperty('opacity', 1 - (data.fadeFrame / data.fadeFrames));
      }

      if (data.fadeFrame > data.fadeFrames) {
        // animation finished
        die();
      }
    }

    data.frameCount++;

    return (data.dead && !dom.o);

  }

  function initSmoke() {

    // TODO: use a pool of smoke nodes?
    dom.o = common.makeSprite({
      className: css.className
    });

    dom.oTransformSprite = common.makeTransformSprite();

    dom.o.appendChild(dom.oTransformSprite);

    common.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

    // keep things centered when scaling
    dom.o._style.setProperty('transform-origin', '50% 50%');

  }

  options = options || {};

  css = common.inheritCSS({
    className: 'smoke'
  });

  data = common.inheritData({
    type: 'smoke',
    frameCount: 0,
    animateModulus: 1,
    spriteFrameModulus: (options.spriteFrameModulus || 2),
    spriteFrame: rndInt(4),
    spriteFrames: 10,
    isFading: false,
    fadeFrame: 0,
    fadeFrames: 8,
    direction: 0,
    width: 9,
    height: 10,
    gravity: options.gravity !== undefined ? options.gravity : 0.5,
    rotation: rnd(360),
    rotationAmount: rnd(5) * plusMinus(),
    // by default, allow some randomness
    baseScale: options.baseScale || (0.65 + rnd(0.35)),
    // hackish: use provided, or default values.
    vX: options.vX || (3 * Math.random()) * plusMinus(),
    vY: options.vY || -(3 * Math.random()),
  }, options);

  dom = {
    o: null,
    oTransformSprite: null,
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