import {
  makeSprite,
  rndInt,
} from '../aa.js';

import {
  worldWidth,
  worldHeight
} from '../core/global.js';

import { common } from '../core/common.js';

const Cloud = options => {

  let cloudType, cloudWidth, cloudHeight, css, dom, data, exports;

  function animate() {

    data.frameCount++;

    if (data.frameCount % data.windModulus === 0) {

      // TODO: improve, limit on axes

      data.windOffsetX += (data.x < 0 || Math.random() > 0.5 ? 0.25 : -0.25);

      data.windOffsetX = Math.max(-3, Math.min(3, data.windOffsetX));

      data.windOffsetY += (data.y < 72 || Math.random() > 0.5 ? 0.1 : -0.1);

      data.windOffsetY = Math.max(-0.5, Math.min(0.5, data.windOffsetY));

      // and randomize
      data.windModulus = 16 + rndInt(16);

    }

    // prevent clouds drifting out of the world, by shifting the wind
    // (previously: hard bounce / reverse, didn't look right.)
    if (data.x + data.width > worldWidth) {
      data.windOffsetX = Math.max(data.windOffsetX - 0.05, -3);
    } else if (data.x < 0) {
      data.windOffsetX = Math.min(data.windOffsetX + 0.05, 3);
    }

    if ((data.windOffsetY > 0 && worldHeight - data.y - 32 < 64) || (data.windOffsetY < 0 && data.y < 64)) {
      // reverse gears
      data.windOffsetY *= -1;
    }

    common.moveTo(exports, data.x + data.windOffsetX, data.y + data.windOffsetY);

  }

  function initCloud() {

    dom.o = makeSprite({
      className: css.className
    });

    common.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

  }

  options = options || {};

  cloudType = (Math.random() > 0.5 ? 2 : 1);

  cloudWidth = (cloudType === 2 ? 125 : 102);
  cloudHeight = (cloudType === 2 ? 34 : 29);

  css = common.inheritCSS({
    className: `cloud${cloudType}`
  });

  data = common.inheritData({
    type: 'cloud',
    isNeutral: true,
    frameCount: 0,
    windModulus: 16,
    windOffsetX: 0,
    windOffsetY: 0,
    verticalDirection: 0.33,
    verticalDirectionDefault: 0.33,
    y: options.y || (96 + parseInt((worldHeight - 96 - 128) * Math.random(), 10)),
    width: cloudWidth,
    halfWidth: parseInt(cloudWidth / 2, 10),
    height: cloudHeight,
    halfHeight: parseInt(cloudHeight / 2, 10)
  }, options);

  dom = {
    o: null
  };

  exports = {
    animate,
    data,
    dom
  };

  initCloud();

  return exports;

};

export { Cloud };