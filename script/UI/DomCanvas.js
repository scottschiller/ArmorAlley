import { game } from '../core/Game.js';
import { common } from '../core/common.js';
import { FPS, GAME_SPEED, TYPES, oneOf, searchParams } from '../core/global.js';
import { utils } from '../core/utils.js';
import { PREFS, gamePrefs } from './preferences.js';

const debugCanvas = searchParams.get('debugCanvas');

const canvasConfig = [
  // dom ID vs. object name / reference - e.g., `dom.o.fx` / `dom.ctx.fx`
  {
    id: 'radar-canvas',
    name: 'radar',
    ctxOptions: { imageSmoothingEnabled: true, useDevicePixelRatio: true }
  },
  {
    id: 'battlefield-canvas',
    name: 'battlefield',
    ctxArgs: { alpha: false },
    ctxOptions: { imageSmoothingEnabled: true, useDevicePixelRatio: false }
  },
  // for gunfire, shrapnel, smoke - show the pixels.
  // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled
  {
    id: 'battlefield-canvas',
    name: 'fx-bg',
    ctxOptions: { imageSmoothingEnabled: true, useDevicePixelRatio: false }
  },
  {
    id: 'fx-canvas',
    name: 'fx',
    ctxOptions: { imageSmoothingEnabled: true, useDevicePixelRatio: false }
  }
];

const ctxOptionsById = {};
canvasConfig.forEach((item) => (ctxOptionsById[item.id] = item.ctxOptions));

// certain objects render in certain places.
// TODO: sometimes, smoke should be behind the helicopter (and/or clouds), i.e., render on battlefield canvas.
const ctxByType = {
  'default': 'fx',
  [TYPES.gunfire]: 'fx',
  [TYPES.shrapnel]: 'fx',
  [TYPES.smoke]: 'fx',
  [TYPES.cloud]: 'fx',
  'radar-item': 'radar',
  // special generic case
  'on-radar': 'radar',
  [TYPES.superBunker]: 'battlefield',
  [TYPES.endBunker]: 'battlefield',
  // hack: for now, all units on foreground fx canvas.
  [TYPES.missileLauncher]: 'fx',
  [TYPES.tank]: 'fx',
  [TYPES.van]: 'fx',
  [TYPES.infantry]: 'fx',
  [TYPES.engineer]: 'fx'
};

const pos = {
  // positioning / coordinate helper methods
  // e.g., a bunker or tank on the radar
  left: (left) =>
    left * game.objects.radar.data.scale -
    game.objects.radar.data.radarScrollLeft,
  bottomAlign: (height, obj) =>
    32 * game.objects.view.data.screenScale -
    height *
      (obj?.data?.stepOffset !== undefined ? obj?.data?.stepOffset : 1) *
      game.objects.radar.data.itemScale,
  top: (top) => top * game.objects.view.data.screenScale,
  width: (width) => width * game.objects.radar.data.itemScale,
  // offset for outline / stroke
  height: (height) => (height + 0.5) * game.objects.radar.data.itemScale,
  heightNoStroke: (height) => height * game.objects.radar.data.itemScale
};

const DomCanvas = () => {
  // given a DOM/CSS-like data structure, draw it on canvas.
  let data, dom, exports;

  data = {
    // width + height cached by name
    ctxLayout: {},
    canvasLayout: {}
  };

  dom = {
    // see canvasConfig
    o: {
      'battlefield': null,
      'fx': null,
      'fx-bg': null,
      'radar': null
    },
    ctx: {
      'battlefield': null,
      'fx': null,
      'fx-bg': null,
      'radar': null
    }
  };

  function applyCtxOptions() {
    canvasConfig.forEach((config) => {
      if (config.ctxOptions) {
        Object.keys(config.ctxOptions).forEach((key) => {
          dom.ctx[config.name][key] = config.ctxOptions[key];
        });
      }
    });
  }

  function initCanvas() {
    canvasConfig.forEach((config) => {
      // DOM node by id
      dom.o[config.name] = document.getElementById(config.id);

      // context by name
      dom.ctx[config.name] = dom.o[config.name].getContext(
        '2d',
        config.ctxArgs || {}
      );
    });
    applyCtxOptions();
  }

  function clear() {
    for (const name in dom.ctx) {
      // may not have layout yet...
      if (!data.ctxLayout[name]) continue;
      dom.ctx[name].clearRect(
        0,
        0,
        data.ctxLayout[name].width,
        data.ctxLayout[name].height
      );
    }
  }

  function canvasAnimation(exports, options = {}) {
    if (!exports?.data) return;

    if (!options?.sprite) {
      console.warn('canvasAnimation: no options.sprite?', exports, options);
      return;
    }

    const { sprite } = options;

    let img = utils.image.getImageObject(sprite.url);

    const {
      width,
      height,
      frameWidth,
      frameHeight,
      horizontal,
      loop,
      alternate,
      hideAtEnd
    } = sprite;

    let { reverseDirection } = sprite;

    const animationDuration = options.sprite.animationDuration || 1;

    // mutate the provided object
    const { data } = exports;

    let frameCount = 0;

    let animationFrame = 0;

    let spriteOffset = 0;

    // take direct count, OR assume vertical sprite, unless specified otherwise.
    let animationFrameCount =
      options?.animationFrameCount ||
      (horizontal ? width / frameWidth : height / frameHeight);

    // sneaky: if "hide at end", add one extra (empty) frame.
    if (hideAtEnd) animationFrameCount++;

    let stopped;

    const newImg = {
      src: img,
      source: {
        x: 0,
        y: 0,
        is2X: true,
        // full sprite dimensions
        width,
        height,
        // per-frame dimensions
        frameWidth,
        frameHeight,
        // sprite offset indices
        frameX: 0,
        frameY: 0
      },
      target: {
        width: width / 2,
        height: frameHeight / 2,
        // scale up to match size of the thing blowing up, as applicable.
        scale: options.scale || 1,
        // approximate centering of explosion sprite vs. original
        xOffset: options.xOffset || 0,
        yOffset: options.yOffset || 0
      }
    };

    // adding to existing sprite(s) as an array, e.g., an explosion on top of a turret before it dies
    if (options.overlay && data.domCanvas.img) {
      if (Array.isArray(data.domCanvas.img)) {
        data.domCanvas.img.push(newImg);
      } else {
        data.domCanvas.img = [data.domCanvas.img, newImg];
      }
    } else {
      data.domCanvas.img = newImg;
    }

    // assign a reference to the new source (e.g., on a turret), whether replaced or added.
    const thisImg = newImg;

    function animate() {
      // animation routine
      if (stopped) return;

      // FPS + game speed -> animation speed ratio.
      // TODO: reduce object churn - update only when FPS and/or game speed change.
      const animationModulus = Math.floor(
        FPS * (1 / GAME_SPEED) * (1 / 10) * animationDuration
      );

      if (frameCount > 0 && frameCount % animationModulus === 0) {
        // next frame: default spritesheet shenanigans.
        if (horizontal) {
          thisImg.source.frameX = reverseDirection
            ? animationFrameCount - 1 - spriteOffset
            : spriteOffset;
        } else {
          thisImg.source.frameY = reverseDirection
            ? animationFrameCount - 1 - spriteOffset
            : spriteOffset;
        }
        spriteOffset++;
        animationFrame++;
        if (animationFrame >= animationFrameCount) {
          // done!
          animationFrame = 0;
          frameCount = 0;
          spriteOffset = 0;
          if (!loop) {
            stopped = true;
            options?.onEnd?.();
          } else {
            // alternate direction on loop?
            if (alternate) reverseDirection = !reverseDirection;
          }
        } else {
          frameCount++;
        }
      } else {
        frameCount++;
      }
    }

    return {
      animate,
      stop: () => (stopped = true),
      resume: () => (stopped = false),
      restart: () => {
        frameCount = 0;
        stopped = false;
      },
      // NB: updating both img references.
      updateSprite: (newURL) =>
        (thisImg.src = img = utils.image.getImageObject(newURL))
    };
  }

  function canvasExplosion(exports, options = {}) {
    if (!exports?.data) return;

    const sprites = [
      {
        url: 'explosion-shrapnel-2-glow.png',
        width: 79,
        height: 384,
        frameWidth: 79,
        frameHeight: 32
      },
      {
        url: 'generic-explosion-2-glow.png',
        width: 55,
        height: 90,
        frameWidth: 55,
        frameHeight: 18
      },
      {
        url: 'generic-explosion-glow.png',
        width: 55,
        height: 90,
        frameWidth: 55,
        frameHeight: 18
      }
    ];

    const sprite = oneOf(sprites);

    const { data } = exports;

    return canvasAnimation(exports, {
      sprite,
      // scale up to match size of the thing blowing up, as applicable.
      scale: 2,
      // approximate centering of explosion sprite vs. original
      xOffset: Math.abs(sprite.width - data.width) * -0.5,
      yOffset: exports.data.bottomAligned
        ? 0
        : Math.abs(sprite.frameHeight - data.height) * -0.5,
      hideAtEnd: true,
      // allow for overrides, of course.
      ...options
    });
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
      Math.floor(-width / 2),
      Math.floor(-height / 2),
      Math.floor(width),
      Math.floor(height)
    );

    // reset the origin transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // restore scale, too.
    if (ctx.ctxScale) {
      ctx.scale(ctx.ctxScale, ctx.ctxScale);
    }
  }

  function rotate(
    ctx,
    angle,
    x,
    y,
    w,
    h,
    rotateXOffset = 0.5,
    rotateYOffset = 0.5
  ) {
    // rotate from center of object
    const centerX = x + w * rotateXOffset;
    const centerY = y + h * rotateYOffset;

    // move to the center
    ctx.translate(centerX, centerY);

    ctx.rotate((angle * Math.PI) / 180);

    // back to "relative" origin
    ctx.translate(-centerX, -centerY);
  }

  function unrotate(ctx) {
    // reset the origin transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // and restore scale, too.
    if (ctx.ctxScale) {
      ctx.scale(ctx.ctxScale, ctx.ctxScale);
    }
  }

  function drawImage(ctx, exports, imgObject) {
    const { data } = exports;
    const { domCanvas } = data;
    const ss = game.objects.view.data.screenScale;

    const img = imgObject || domCanvas.img;

    // only display if loaded
    if (img && !img.src) {
      if (!game.objects.editor) {
        console.warn(
          'domCanvas: img.src not yet assigned?',
          img,
          data.type,
          data.id
        );
      }
      return;
    }

    const { source, target } = img;

    // opacity?
    if (target.opacity >= 0) {
      ctx.save();
      ctx.globalAlpha = target.opacity;
    }

    // single image, vs. sprite?
    if (img.source.frameX === undefined && img.source.frameY === undefined) {
      // screwy scaling here, but 2x source -> target @ 50%, plus screen scaling
      const renderedWidth = (source.width / 2) * ss;
      const renderedHeight = (source.height / 2) * ss;

      const targetX =
        ((target.x || 0) -
          game.objects.view.data.battleField.scrollLeft +
          (target.xOffset || 0)) *
        ss;

      // radar and other offsets, plus 4-pixel shift, AND "step" offset (summon / dismiss transition, if active.)
      let targetY;

      if (data.isTerrainItem) {
        targetY =
          ((target.y || 0) - 32) * ss +
          (target.yOffset || 0) * ss +
          ss * 4 -
          renderedHeight *
            (data.stepOffset !== undefined ? data.stepOffset : 1);
      } else if (data.bottomAligned && !data.isTerrainItem) {
        // TODO: figure out why terrain items are mis-aligned if treated as bottom-aligned.
        // MTVIE?
        // worldHeight is 380, but bottom of battlefield is 368.
        targetY =
          ((data.type === TYPES.superBunker ? 380 : 368) +
            (target.yOffset || 0)) *
            ss -
          renderedHeight *
            2 *
            (data.stepOffset !== undefined ? data.stepOffset : 1);
      } else {
        // regular airborne items like clouds, etc.
        targetY = ((target.y || 0) - 32) * ss + (target.yOffset || 0);
      }

      // debugging: static images
      if (debugCanvas) {
        ctx.beginPath();
        ctx.rect(targetX, targetY, renderedWidth, renderedHeight);
        ctx.strokeStyle = '#fff';
        ctx.stroke();
      }

      // single image
      ctx.drawImage(
        img.src,
        source.x,
        source.y,
        source.width,
        source.height,
        Math.floor(targetX),
        Math.floor(targetY),
        Math.floor(renderedWidth),
        Math.floor(renderedHeight)
      );

      // TODO: only draw this during energy updates / when applicable per prefs.
      if (
        !img.excludeEnergy &&
        (gamePrefs.show_health_status === PREFS.SHOW_HEALTH_ALWAYS ||
          exports.data.energyCanvasTimer)
      ) {
        drawEnergy(
          exports,
          ctx,
          targetX,
          targetY - 1,
          renderedWidth,
          renderedHeight
        );
      }
      // single image, rotated?
    } else if (
      img.target.rotation &&
      source.frameX === undefined &&
      source.frameY === undefined
    ) {
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
        (target.scale || 1) * (ss * 0.5),
        target.rotation || 0,
        (data.x -
          game.objects.view.data.battleField.scrollLeft +
          (target.xOffset || 0)) *
          ss,
        (data.y - 32) * ss + (target.yOffset || 0)
      );
    } else {
      // sprite case; note 32 offset for radar before scaling
      // TODO: scaling and centering of rendered cropped sprite, e.g., smoke object with data.scale = 1.5 etc.
      const dWidth =
        source.frameWidth * ss * (source.is2X ? 0.5 : 1) * (target.scale || 1);

      const dHeight =
        source.frameHeight * ss * (source.is2X ? 0.5 : 1) * (target.scale || 1);

      const dx =
        (data.x -
          game.objects.view.data.battleField.scrollLeft +
          (target.xOffset || 0)) *
        ss;

      // this should be wrong, but works for airborne sprites - TODO: debug / fix as needed.
      let dy = (data.y - 32) * ss + (target.yOffset || 0) * ss;

      if (data.bottomAligned) {
        // TODO: WTF
        dy = 351 * ss - dHeight + (target.yOffset || 0) * ss;
      }

      // for bottom-aligned / terrain items that use sprites - offset vertical based on "step."
      if (data.stepOffset !== undefined) {
        dy += dHeight * (1 - data.stepOffset);
      }

      const angle =
        target.angle || (target.useDataAngle && (data.rotation || data.angle));

      if (angle) {
        rotate(
          ctx,
          angle,
          dx,
          dy,
          dWidth,
          dHeight,
          target.rotateXOffset,
          target.rotateYOffset
        );
      }

      // debugging sprite canvas drawing...
      if (debugCanvas) {
        ctx.beginPath();
        ctx.rect(dx, dy, dWidth, dHeight);
        ctx.strokeStyle = '#33cc33';
        ctx.stroke();
      }

      const tracking =
        !data.dead && (data.smartMissileTracking || data.isNextMissileTarget);

      // smart missile: next, or current target?
      if (tracking) {
        // radius approximately matching CSS glow...
        ctx.shadowBlur = 8 * ss;

        // current (active) vs. next detected target
        ctx.shadowColor = data.smartMissileTracking ? '#ff3333' : '#999';
      } else if (data.shadowBlur) {
        // Note: $$$
        ctx.shadowBlur = data.shadowBlur * ss;
        ctx.shadowColor = data.shadowColor || '#fff';
      }

      // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      ctx.drawImage(
        img.src,
        source.frameWidth * (source.frameX || 0),
        source.frameHeight * (source.frameY || 0),
        source.frameWidth,
        source.frameHeight,
        Math.floor(dx),
        Math.floor(dy),
        Math.floor(dWidth),
        Math.floor(dHeight)
      );

      if (angle) {
        unrotate(ctx);
      }

      // reset blur
      if (tracking) {
        ctx.shadowBlur = 0;

        // red dot
        if (!img.excludeDot) {
          ctx.beginPath();
          ctx.arc(
            dx + (data.isEnemy ? data.width * ss : 0) - 4,
            dy + 6,
            data.smartMissileTracking ? 4 : 3,
            0,
            Math.PI * 2
          );

          ctx.fillStyle = '#ff3333';
          ctx.fill();
        }
      } else if (ctx.shadowBlur) {
        ctx.shadowBlur = 0;
      }

      // TODO: only draw this during energy updates / when applicable per prefs.
      if (
        !img.excludeEnergy &&
        (gamePrefs.show_health_status === PREFS.SHOW_HEALTH_ALWAYS ||
          exports.data.energyCanvasTimer)
      ) {
        drawEnergy(exports, ctx, dx, dy, dWidth, dHeight);
      }

      // if "always" show, no further work to do
      if (gamePrefs.show_health_status === PREFS.SHOW_HEALTH_ALWAYS) return;
    }

    if (target.opacity >= 0) {
      ctx.restore();
    }
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

    const ss = game.objects.view.data.screenScale;

    // determine target canvas by type - specified by object, type, or default.
    const ctx =
      dom.ctx[data.domCanvas.ctxName] ||
      dom.ctx[ctxByType[data.type] || ctxByType.default];

    // shared logic for <canvas> elements
    // does not apply to bottom-aligned units, i.e., MTVIE, or balloons.
    if (
      data.dead &&
      !data.bottomAligned &&
      !data.alwaysDraw &&
      data.type !== TYPES.balloon
    ) {
      // if no blink, don't draw at all
      if (data.excludeBlink) return;

      // special case for helicopters: only blink while initially exploding, not reset or respawning.
      if (
        data.parentType === TYPES.helicopter &&
        !exports.oParent?.data?.exploding
      )
        return;

      // only draw every X
      data.blinkCounter = data.blinkCounter || 0;
      data.blinkCounter++;

      // TODO: DRY / move to static value
      if (data.blinkCounter % (FPS === 60 ? 6 : 3) === 0) {
        data.visible = !data.visible;
      }

      if (!data.visible) return;
    }

    // don't draw if explictly not visible (not undefined / false-y)
    // HACK: ignore helicopters, otherwise the player's radar item disappears after dying. TODO: debug and fix.
    if (data.oParent?.data?.type !== TYPES.helicopter && data.visible === false)
      return;

    // does the object know how to draw itself?
    if (oData.draw) {
      // "standard style"
      ctx.beginPath();
      ctx.strokeStyle = '#000';
      // handle battlefield items, and radar items which link back to their parent.
      ctx.fillStyle =
        data.isEnemy || exports.oParent?.data?.isEnemy ? '#ccc' : '#17a007';
      // TODO: review oData vs. data, radar item vs. battlefield (e.g., chain object) logic.
      oData.draw(
        ctx,
        exports,
        pos,
        oData.width || data.width,
        oData.height || data.height
      );
      if (!oData.excludeFillStroke) {
        ctx.fill();
        if (!oData.excludeStroke) {
          ctx.stroke();
        }
      }
      return;
    }

    let fillStyle;

    if (oData.img) {
      if (oData.img.forEach) {
        oData.img.forEach((imgObject) => drawImage(ctx, exports, imgObject));
      } else {
        drawImage(ctx, exports);
      }
    }

    // opacity?
    if (oData.opacity && oData.opacity !== 1 && oData.backgroundColor) {
      const rgb = oData.backgroundColor.match(/rgba/i)
        ? common.hexToRgb(oData.backgroundColor)
        : oData.backgroundColor;
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

  function drawEnergy(exports, ctx, left, top, width, height) {
    if (exports.data.energy === undefined) return;

    if (gamePrefs.show_health_status === PREFS.SHOW_HEALTH_NEVER) return;

    // exclude helicopters until if/when they are rendered on canvas.
    if (exports.data.type === TYPES.helicopter) return;

    // only draw if on-screen
    if (!exports.data.isOnScreen) return;

    if (exports.data.energy <= 0 || exports.data.dead) return;

    if (exports.data.energyCanvasTimer > 0) {
      exports.data.energyCanvasTimer--;
    }

    // timer up, OR don't "always" show
    if (
      exports.data.energyCanvasTimer <= 0 &&
      gamePrefs.show_health_status !== PREFS.SHOW_HEALTH_ALWAYS
    )
      return;

    const energy = exports.data.energy / exports.data.energyMax;

    if (energy > 0.66) {
      ctx.fillStyle = '#33cc33';
    } else if (energy > 0.33) {
      ctx.fillStyle = '#cccc33';
    } else {
      ctx.fillStyle = '#cc3333';
    }

    const energyLineScale = exports.data.energyLineScale || 1;

    const scaledWidth = width * energyLineScale;
    const renderedWidth = scaledWidth * energy;

    // right-align vs. center vs. left-align
    const leftOffset = exports.data.centerEnergyLine
      ? (scaledWidth - renderedWidth) / 2
      : exports.data.isEnemy
      ? width - renderedWidth
      : 0;

    const lineHeight = 2.5;
    const borderRadius = lineHeight;

    ctx.beginPath();
    ctx.roundRect(
      left + leftOffset,
      top + (height - lineHeight),
      renderedWidth,
      lineHeight,
      borderRadius
    );
    ctx.fill();
  }

  function drawTrailers(
    exports,
    xHistory = [],
    yHistory = [],
    xOffset = 0,
    yOffset = 0
  ) {
    const ctx = dom.ctx['fx-bg'];
    const ss = game.objects.view.data.screenScale;

    for (let i = 0, j = xHistory.length; i < j; i++) {
      ctx.beginPath();
      ctx.roundRect(
        (xHistory[i] +
          xOffset -
          game.objects.view.data.battleField.scrollLeft) *
          ss,
        (yHistory[i] - 32 + yOffset) * ss,
        1.25 * ss,
        1.25 * ss,
        2 * ss
      );
      // #666 -> 102, 102, 102
      ctx.fillStyle = `rgba(102, 102, 102, ${(i + 1) / j})`;
      ctx.fill();
    }
  }

  function resize() {
    if (!dom.o) return;

    // $$$
    for (const name in dom.o) {
      // may not have been initialized yet
      if (!dom.o[name]) continue;

      const canvasID = dom.o[name].id;

      // hi-DPI / retina option
      const ctxScale = ctxOptionsById[canvasID].useDevicePixelRatio
        ? window.devicePixelRatio || 1
        : 1;

      if (ctxScale > 1) {
        // reset to natural width, for measurement and scaling
        dom.o[name].style.width = '';
        dom.o[name].style.height = '';
      }

      // measure the "natural" width
      const width = dom.o[name].offsetWidth;
      const height = dom.o[name].offsetHeight;

      data.canvasLayout[name] = {
        width,
        height
      };

      data.ctxLayout[name] = {
        width: width * ctxScale,
        height: height * ctxScale
      };

      // assign the "natural" width
      dom.o[name].width = data.ctxLayout[name].width;
      dom.o[name].height = data.ctxLayout[name].height;

      if (ctxScale > 1) {
        // resize the canvas to 1x size, but render at (e.g.,) 2x pixel density.
        dom.o[name].style.width = `${data.canvasLayout[name].width}px`;
        dom.o[name].style.height = `${data.canvasLayout[name].height}px`;

        // reset and restore transform origin + scale.
        dom.ctx[name].setTransform(1, 0, 0, 1, 0, 0);

        // hackish: tack on a reference
        dom.ctx[name].ctxScale = ctxScale;

        dom.ctx[name].scale(ctxScale, ctxScale);
      }

      applyCtxOptions();
    }
  }

  function init() {
    initCanvas();
    resize();
  }

  exports = {
    canvasAnimation,
    canvasExplosion,
    clear,
    draw,
    drawTrailers,
    init,
    resize,
    rotate,
    unrotate
  };

  return exports;
};

export { pos, DomCanvas };
