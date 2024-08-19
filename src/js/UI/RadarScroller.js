import { game } from '../core/Game.js';
import { worldWidth } from '../core/global.js';

const RadarScroller = () => {
  let data;
  let css;
  let dom;
  let exports;

  function animate() {
    if (!dom.o || !worldWidth) return;

    const left = getPosition() * game.objects.view.data.browser.screenWidth;

    dom.o.style.transform = `translate3d(${
      left - data.scrollerLeftOffset
    }px, 0px, 0`;
  }

  function getPosition() {
    return game.objects.view.data.battleField.scrollLeft / worldWidth;
  }

  function resizeScroller() {
    if (!dom.o) return;

    const radarScale = game.objects.radar.data.scale;

    data.scrollerWidth =
      game.objects.view.data.browser.width *
      (radarScale / worldWidth) *
      game.objects.view.data.browser.screenWidth;

    if (game.objects.radar.data.scale > 1) {
      /**
       * Scrollbar can't simply scale width - it has to slide a bit left, too.
       * Take the radar scroll (since it's scaled and now scrolls itself),
       * relative to the whole world width - and scale that based on the
       * scaled browser width (screen vs. battlefield), cut in half. WOOF.
       */
      data.scrollerLeftOffset =
        (Math.abs(game.objects.radar.data.radarScrollLeft) / worldWidth) *
        game.objects.view.data.browser.width *
        0.5;
    } else {
      data.scrollerLeftOffset = 0;
    }

    dom.o.style.width = `${data.scrollerWidth}px`;
  }

  function resize() {
    resizeScroller();
  }

  function init() {
    initDOM();
    resize();
  }

  function stop() {
    dom.o?.remove();
    dom.o = null;
  }

  css = {
    radarScroller: 'radar-scroller'
  };

  data = {
    scrollerWidth: 0,
    scrollerLeftOffset: 0
  };

  dom = {
    o: null
  };

  function initDOM() {
    dom.o = document.createElement('div');
    dom.o.className = css.radarScroller;

    const oParent = document.getElementById('player-status-bar');

    if (!oParent) return;

    oParent.appendChild(dom.o);
  }

  init();

  exports = {
    animate,
    init,
    resize,
    stop
  };

  return exports;
};

export { RadarScroller };
