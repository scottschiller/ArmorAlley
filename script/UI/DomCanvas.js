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
      dom.o = document.getElementById('fx-canvas');
      dom.ctx = dom.o.getContext('2d');
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

  // center, scale, and rotate.
  // https://stackoverflow.com/a/43155027
  function drawImageCenter(
    image,
    x,
    y,
    cx,
    cy,
    width,
    height,
    scale,
    rotation,
    destX,
    destY
  ) {
    // scale, and origin (offset) for rotation
    dom.ctx.setTransform(scale, 0, 0, scale, destX, destY);

    // deg2rad
    dom.ctx.rotate((rotation || 0) * 0.0175);

    // copy one frame from the sprite
    dom.ctx.drawImage(
      image,
      x - cx,
      y - cy,
      width,
      height,
      -width / 2,
      -height / 2,
      width,
      height
    );

    // reset the origin transform
    dom.ctx.setTransform(1, 0, 0, 1, 0, 0);
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

    const ss = game.objects.view.data.screenScale;

    if (oData.img) {
      const { img } = oData;
      const { source, target } = img;

      // opacity?
      if (target.opacity >= 0) {
        dom.ctx.save();
        dom.ctx.globalAlpha = target.opacity;
      }

      // single image, vs. sprite?
      if (img.source.frameX === undefined && img.source.frameY === undefined) {
        // single image
        dom.ctx.drawImage(
          img.src,
          source.x,
          source.y,
          source.width,
          source.height,
          target.x,
          target.y,
          source.width,
          source.height /*, target.scale || 1, target.scale || 1*/
        );
      } else if (img.target.rotation) {
        // (image, x, y, cx, cy, width, height, scale, rotation, destX, destY)
        drawImageCenter(
          img.src,
          source.frameWidth * (source.frameX || 0),
          source.frameHeight * (source.frameY || 0),
          0,
          0,
          source.frameWidth,
          source.frameHeight,
          target.scale * (ss * 0.5),
          target.rotation || 0,
          (exports.data.x - game.objects.view.data.battleField.scrollLeft) *
            ss +
            (target.xOffset || 0),
          (exports.data.y - 32) * ss + (target.yOffset || 0)
        );
      } else {
        // sprite - note 32 offset for radar, scaling etc.
        // TODO: rendering to foreground vs. background canvas layers
        // render background when in a cloud / cloaked; otherwise, at random.
        dom.ctx.drawImage(
          img.src,
          source.frameWidth * (source.frameX || 0),
          source.frameHeight * (source.frameY || 0),
          source.frameWidth,
          source.frameHeight,
          (exports.data.x - game.objects.view.data.battleField.scrollLeft) *
            ss +
            (target.xOffset || 0),
          (exports.data.y - 32) * ss + (target.yOffset || 0),
          source.frameWidth *
            ss *
            (source.is2X ? 0.5 : 1) *
            (target.scale || 1),
          source.frameHeight *
            ss *
            (source.is2X ? 0.5 : 1) *
            (target.scale || 1),
          1,
          1
        );
      }

      if (target.opacity >= 0) {
        dom.ctx.restore();
      }
    }

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
  }

  function resize() {
    getCanvas();

    if (!dom.o) return;

    let newWidth = dom.o.offsetWidth;
    let newHeight = dom.o.offsetHeight;

    dom.o.width = newWidth;
    dom.o.height = newHeight;
  }

  function init() {
    resize();
  }

  exports = {
    clear,
    draw,
    init,
    resize
  };

  return exports;
};

export { DomCanvas };
