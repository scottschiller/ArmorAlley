import { game } from '../core/Game.js';
import { common } from '../core/common.js';
import { isMobile, oneOf, rnd, worldWidth } from '../core/global.js';
import { sprites } from '../core/sprites.js';

const Star = (options = {}) => {
  let css, dom, data, exports;

  function getScrollLeft() {
    return (
      game.objects.view.data.battleField.scrollLeft -
      (isMobile && game.objects.view.data.browser.isPortrait
        ? game.objects.view.data.browser.width
        : 0)
    );
  }

  function animate() {
    data.hasAnimated = true;

    // hackish, mobile + portrait: take one screen's worth off - so at the beginning of the battlefield, we have a screen of stars.
    // the scroll logic could use a refactor.
    const scrollLeft = getScrollLeft();

    // note: "tracked" value is not the same as rendered x value.
    if (data.lastScrollLeft !== scrollLeft) {
      data.scrollDelta = scrollLeft - data.lastScrollLeft;
      data.direction = scrollLeft >= data.lastScrollLeft ? 1 : -1;
      data.lastScrollLeft = scrollLeft;

      // only adjust the new position for parallax effect if we're on-screen
      if (data.isOnScreen) {
        // fake the new "X" position
        data.x += data.scrollDelta * data.parallax;

        // very subtle sine-based "orbit" path, reduced when in portrait mode.
        var circleY =
          (game.objects.view.data.browser.isPortrait ? -5 : -16) *
          Math.sin(
            ((scrollLeft - data.x) / game.objects.view.data.browser.width) *
              Math.PI
          );

        const chopperOffset =
          (game.players.local.data.y / game.players.local.data.yMax) * 4;

        const scale = 1 + (data.y / game.players.local.data.yMax) * 0.1;

        data.extraTransforms = `scale3d(${scale}, ${scale}, 1)`;

        sprites.setTransformXY(
          exports,
          exports.dom.o,
          `${exports.data.x}px`,
          `${exports.data.y + circleY - chopperOffset}px`,
          exports.data.extraTransforms
        );
      }
    }

    // stars should never die.
    return data.dead && !dom.o;
  }

  function isOnScreenChange(onScreen) {
    if (!onScreen) {
      // if going off-screen, then move to "the next screen" -
      // defined as the current viewport width, in the current direction.
      const buffer = rnd(
        game.objects.view.data.browser.width *
          (game.objects.view.data.browser.isPortrait ? 1 : 0.1)
      );

      data.originalX =
        parseInt(game.objects.view.data.battleField.scrollLeft, 10) +
        (data.direction === 1
          ? game.objects.view.data.browser.width + buffer
          : -buffer);

      data.x = data.originalX;
    } else {
      data.originalX = data.x;
    }
  }

  function initStar() {
    dom.o = sprites.create({
      className: css.className
    });

    // rather than assign opacity (maybe $$$, more compositing work?), set colors with baked-in "brightness" values.
    dom.o.style.backgroundColor = `rgb(${data.color
      .map((value) => value * data.opacity)
      .join(',')})`;

    data.originalX = data.x;

    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);
  }

  function reset(isEnemyView) {
    // start at one end or the other
    data.x =
      (isMobile ? game.objects.view.data.battleField.scrollLeft : 0) +
      (isEnemyView ? worldWidth - game.objects.view.data.browser.width : 0) +
      rnd(game.objects.view.data.browser.width);
    data.originalX = data.x;
    // minimize the jump on next frame
    data.lastScrollLeft = game.objects.view.data.battleField.scrollLeft - 1;
  }

  css = common.inheritCSS({
    className: 'star'
  });

  data = common.inheritData(
    {
      type: 'star',
      // hackish: slightly larger coordinates for on/off-screen logic.
      width: 4,
      height: 4,
      color: oneOf([
        [255, 0, 0], // red
        [255, 165, 0], // orange
        [255, 255, 0], // yellow
        [0, 255, 0], // green
        [255, 255, 255], // white
        [0, 0, 255] // blue
      ]),
      direction: 1,
      parallax: 0.65 + rnd(0.3),
      opacity: 0.15 + rnd(0.65),
      originalX: null,
      // minimize original shift
      lastScrollLeft: getScrollLeft() + 1
    },
    options
  );

  dom = {
    o: null
  };

  exports = {
    animate,
    data,
    dom,
    isOnScreenChange,
    reset
  };

  initStar();

  return exports;
};

export { Star };
