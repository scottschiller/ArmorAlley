import { game } from '../core/Game.js';
import { common } from '../core/common.js';

const DomCanvas = () => {
  // given a DOM/CSS-like data structure, draw it on canvas.
  let dom, exports;

  dom = {
    o: null,
    ctx: null
  };

  function getCanvas() {
    if (!dom.o) {
      dom.o = document.getElementById('canvas');
      dom.ctx = dom.o.getContext('2d', { alpha: false });
    }

    if (!dom.o) {
      console.warn('DomCanvas: no dom.o?');
      return;
    }

    return true;
  }

  function clear() {
    if (!getCanvas()) return;
    if (!game.objects.starController) return;
    // hackish
    dom.ctx.clearRect(
      0,
      0,
      game.objects.starController.data.width,
      game.objects.starController.data.height
    );
  }

  function draw(exports) {
    if (!getCanvas()) return;

    // original object data
    const { data } = exports;

    // canvas-specific bits
    const oData = exports.data.domCanvas;

    if (!oData) {
      console.warn('DomCanvas: no data?', oData);
      return;
    }

    let strokeStyle;

    // opacity?
    if (
      oData.opacity &&
      oData.opacity !== 1 &&
      !oData.backgroundColor.match(/rgba/i)
    ) {
      const rgb = common.hexToRgb(oData.backgroundColor);
      if (!rgb?.length) {
        console.warn(
          'DomCanvas.draw(): bad opacity / backgroundColor mix?',
          oData
        );
        return;
      }
      // rgba()
      strokeStyle = `rgba(${rgb.join(',')},${oData.opacity})`;
    } else {
      strokeStyle = oData.backgroundColor;
    }

    const ss = game.objects.view.data.screenScale;

    if (oData.borderRadius) {
      // roundRect time.
      dom.ctx.strokeStyle = strokeStyle;
      dom.ctx.beginPath();
      dom.ctx.roundRect(
        (data.x - game.objects.view.data.battleField.scrollLeft) * ss,
        (data.y - 32) * ss,
        data.width * ss,
        data.height * ss,
        oData.borderRadius
      );
      dom.ctx.stroke();
    }

    /**
     * obj = {
     *  top,
     *  left,
     *  bottom,
     *  right,
     *  width,
     *  height,
     *  backgroundColor,
     *  opacity,
     *  borderWidth,
     *  borderColor,
     *  borderStyle,
     *  borderRadius,
     *  padding
     * }
     */
  }

  exports = {
    clear,
    draw
  };

  return exports;
};

export { DomCanvas };
