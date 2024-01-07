import { game } from '../core/Game.js';
import { common } from '../core/common.js';
import { TYPES } from '../core/global.js';

const canvasConfig = [
  // dom ID vs. object name / reference - e.g., `dom.o.fx` / `dom.ctx.fx`
  { id: 'battlefield-canvas', name: 'battlefield', ctxArgs: { alpha: false } },
  // for gunfire, shrapnel, smoke - show the pixels.
  // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled
  { id: 'fx-canvas', name: 'fx', ctxOptions: { imageSmoothingEnabled: false } },
  {
    id: 'radar-canvas',
    name: 'radar',
    ctxOptions: { imageSmoothingEnabled: false }
  }
];

// certain objects render in certain places.
// TODO: sometimes, smoke should be behind the helicopter (and/or clouds), i.e., render on battlefield canvas.
const ctxByType = {
  'default': 'fx',
  [TYPES.gunfire]: 'fx',
  [TYPES.shrapnel]: 'fx',
  [TYPES.smoke]: 'fx',
  'radar-item': 'radar'
};

const pos = {
  // positioning / coordinate helper methods
  // e.g., a bunker or tank on the radar
  left: (left) =>
    left * game.objects.radar.data.scale -
    game.objects.radar.data.radarScrollLeft,
  bottomAlign: (height) =>
    32 * game.objects.view.data.screenScale -
    height * game.objects.radar.data.itemScale,
  top: (top) => top * game.objects.view.data.screenScale,
  width: (width) => width * game.objects.radar.data.itemScale,
  // offset for outline / stroke
  height: (height) => (height + 0.5) * game.objects.radar.data.itemScale,
  heightNoStroke: (height) => height * game.objects.radar.data.itemScale
};

const DomCanvas = () => {
  // given a DOM/CSS-like data structure, draw it on canvas.
  let dom, exports;

  dom = {
    // see canvasConfig
    o: {
      battlefield: null,
      fx: null,
      radar: null
    },
    ctx: {
      battlefield: null,
      fx: null,
      radar: null
    }
  };

  function initCanvas() {
    canvasConfig.forEach((config) => {
      // DOM node by id
      dom.o[config.name] = document.getElementById(config.id);

      // context by name
      dom.ctx[config.name] = dom.o[config.name].getContext(
        '2d',
        config.ctxArgs || {}
      );

      // just in case?
      dom.ctx[config.name].scale(1, 1);

      if (config.ctxOptions) {
        Object.keys(config.ctxOptions).forEach((key) => {
          dom.ctx[config.name][key] = config.ctxOptions[key];
        });
      }
    });
  }

  function clear() {
    // guard
    if (!dom.ctx.battlefield) return;

    // TODO: is accessing width / height $$$?
    dom.ctx.battlefield.clearRect(
      0,
      0,
      dom.o.battlefield.width,
      dom.o.battlefield.height
    );
    dom.ctx.fx.clearRect(0, 0, dom.o.fx.width, dom.o.fx.height);
    dom.ctx.radar.clearRect(0, 0, dom.o.radar.width, dom.o.radar.height);
  }

  // center, scale, and rotate.
  // https://stackoverflow.com/a/43155027
  function drawImageCenter(
    ctx,
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
    ctx.setTransform(scale, 0, 0, scale, destX + width / 2, destY + width / 2);

    // deg2rad
    ctx.rotate((rotation || 0) * 0.0175);

    // copy one frame from the sprite
    ctx.drawImage(
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function rotate(ctx, angle, x, y, w, h) {
    // rotate from center of object
    const centerX = x + w / 2;
    const centerY = y + h / 2;

    // move to the center
    ctx.translate(centerX, centerY);

    ctx.rotate((angle * Math.PI) / 180);

    // back to "relative" origin
    ctx.translate(-centerX, -centerY);
  }

  function unrotate(ctx) {
    // reset the origin transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function draw(exports) {
    // original object data
    const { data } = exports;

    // canvas-specific bits
    const oData = data.domCanvas;

    if (!oData) {
      console.warn('DomCanvas: no data?', oData);
      return;
    }

    // determine target canvas by type - specified by object, type, or default.
    const ctx =
      dom.ctx[data.domCanvas.ctxName] ||
      dom.ctx[ctxByType[data.type] || ctxByType.default];

    // shared logic for <canvas> elements
    if (data.dead && !data.alwaysDraw) {
      // if no blink, don't draw at all
      if (data.excludeBlink) return;

      // only draw every X
      data.blinkCounter = data.blinkCounter || 0;
      data.blinkCounter++;
      if (data.blinkCounter % 3 === 0) {
        data.visible = !data.visible;
      }

      // don't draw if not visible
      if (!data.visible) return;
    }

    // does the object know how to draw itself?
    if (oData.draw) {
      // "standard style"
      ctx.beginPath();
      ctx.strokeStyle = '#000';
      // handle battlefield items, and radar items which link back to their parent.
      ctx.fillStyle =
        data.isEnemy || exports.oParent?.data?.isEnemy ? '#ccc' : '#17a007';
      oData.draw(ctx, exports, pos, oData.width, oData.height);
      if (!oData.excludeFillStroke) {
        ctx.fill();
        if (!oData.excludeStroke) {
          ctx.stroke();
        }
      }
      return;
    }

    let fillStyle;

    const ss = game.objects.view.data.screenScale;

    if (oData.img) {
      const { img } = oData;
      const { source, target } = img;

      // opacity?
      if (target.opacity >= 0) {
        ctx.save();
        ctx.globalAlpha = target.opacity;
      }

      // single image, vs. sprite?
      if (img.source.frameX === undefined && img.source.frameY === undefined) {
        // single image
        ctx.drawImage(
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
          ctx,
          img.src,
          source.frameWidth * (source.frameX || 0),
          source.frameHeight * (source.frameY || 0),
          0,
          0,
          source.frameWidth,
          source.frameHeight,
          target.scale * (ss * 0.5),
          target.rotation || 0,
          (data.x - game.objects.view.data.battleField.scrollLeft) * ss +
            (target.xOffset || 0),
          (data.y - 32) * ss + (target.yOffset || 0)
        );
      } else {
        // sprite case; note 32 offset for radar before scaling
        // TODO: scaling and centering of rendered cropped sprite, e.g., smoke object with data.scale = 1.5 etc.

        const dx =
          (data.x - game.objects.view.data.battleField.scrollLeft) * ss +
          (target.xOffset || 0);

        const dy = (data.y - 32) * ss + (target.yOffset || 0);

        const dWidth =
          source.frameWidth *
          ss *
          (source.is2X ? 0.5 : 1) *
          (target.scale || 1);

        const dHeight =
          source.frameHeight *
          ss *
          (source.is2X ? 0.5 : 1) *
          (target.scale || 1);

        if (data.rotation) {
          rotate(ctx, data.rotation, dx, dy, dWidth, dHeight);
        }

        // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
        ctx.drawImage(
          img.src,
          source.frameWidth * (source.frameX || 0),
          source.frameHeight * (source.frameY || 0),
          source.frameWidth,
          source.frameHeight,
          dx,
          dy,
          dWidth,
          dHeight
        );

        if (data.rotation) {
          unrotate(ctx);
        }
      }

      if (target.opacity >= 0) {
        ctx.restore();
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
      fillStyle = `rgba(${rgb.join(',')},${oData.opacity})`;
    } else {
      fillStyle = oData.backgroundColor;
    }

    if (oData.borderRadius) {
      // roundRect time.
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.roundRect(
        (data.x - game.objects.view.data.battleField.scrollLeft) * ss,
        (data.y - 32) * ss,
        data.width * ss,
        data.height * ss,
        oData.borderRadius
      );
      ctx.fill();
    }
  }

  function resize() {
    if (!dom.o) return;

    // $$$
    for (const canvas in dom.o) {
      if (!dom.o[canvas]) continue;
      dom.o[canvas].width = dom.o[canvas].offsetWidth;
      dom.o[canvas].height = dom.o[canvas].offsetHeight;
    }
  }

  function init() {
    initCanvas();
    resize();
  }

  exports = {
    clear,
    draw,
    init,
    resize,
    rotate,
    unrotate
  };

  return exports;
};

export { pos, DomCanvas };
