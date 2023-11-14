import {
  worldWidth,
  worldHeight,
  rng,
  TYPES,
  rngInt,
  GAME_SPEED,
  rngPlusMinus
} from '../core/global.js';
import { common } from '../core/common.js';
import { zones } from '../core/zones.js';
import { sprites } from '../core/sprites.js';
import { net } from '../core/network.js';
import { game } from '../core/Game.js';

const cloudTypes = [
  {
    className: 'cloud1',
    width: 102,
    height: 29
  },
  {
    className: 'cloud2',
    width: 116,
    height: 28
  },
  {
    className: 'cloud3',
    width: 125,
    height: 34
  }
];

const MAX_VX = 3;
const MAX_VY = 0.5;
const MIN_SPEED = 0.5;
const NEAR_END_DISTANCE = 128;

const Cloud = (options = {}) => {
  let type = TYPES.cloud;

  const cloudData = cloudTypes[rngInt(cloudTypes.length, type)];

  const { className, width, height } = cloudData;

  let css, dom, data, exports, radarItem;

  function animate() {
    data.frameCount++;

    if (data.frameCount % data.windModulus === 0) {
      // TODO: improve, limit on axes

      // apply "regular" wind if we aren't drifting with a helicopter.
      if (!data.driftCount) {
        const xOffset = net.active ? 0 : 0.125;
        data.windOffsetX +=
          data.x < 0 || rng(1, type) > MIN_SPEED ? xOffset : -xOffset;
      }

      data.windOffsetX = Math.max(-MAX_VX, Math.min(MAX_VX, data.windOffsetX));

      const yOffset = net.active ? 0.05 : 0.05;
      data.windOffsetY +=
        data.y < 72 || rng(1, type) > MAX_VY ? yOffset : -yOffset;
      data.windOffsetY = Math.max(-MAX_VY, Math.min(MAX_VY, data.windOffsetY));
    }

    // minimize chance of de-sync in network case... ?
    const drift = net.active ? 0.05 : 0.01;

    // don't drift off the ends of the battlefield...
    if (data.x + data.width > worldWidth) {
      data.windOffsetX = Math.max(data.windOffsetX - drift, -MAX_VX);
    } else if (data.x < 0) {
      data.windOffsetX = Math.min(data.windOffsetX + drift, MAX_VX);
    }

    // ...nor the bottom, or top.
    if (data.windOffsetY > 0 && worldHeight - data.y - 32 < 64) {
      data.windOffsetY -= 0.01;
    } else if (data.windOffsetY < 0 && data.y < 64) {
      data.windOffsetY += 0.01;
    }

    data.x += data.windOffsetX * GAME_SPEED;
    data.y += data.windOffsetY * GAME_SPEED;

    // reset drift "flag"
    data.driftCount = 0;

    zones.refreshZone(exports);

    sprites.moveWithScrollOffset(exports);
  }

  function startDrift() {
    /**
     * Called by helicopter(s) when they enter a cloud.
     * To keep things interesting, set a new random max drift speed -
     * no slower than present wind speed, or MIN_SPEED.
     */

    const minSpeed = MIN_SPEED;

    // de-sync risk in network games.
    // TODO: revisit.
    if (net.active) return;

    data.driftXMax = Math.max(
      minSpeed,
      Math.max(Math.abs(data.windOffsetX), rng(MAX_VX, type))
    );
  }

  function drift(isEnemy) {
    /**
     * "Set adrift on memory bliss of you" -PM Dawn ☁️
     * Given a helicopter, have the wind pick up and move toward the opposing base.
     * This is a key strategy for defeating groups of turrets, e.g., Midnight Oasis in Extreme mode.
     */

    // de-sync risk in network games.
    // TODO: revisit.
    if (net.active) return;

    // hackish: flag that drift is happening, so regular drift doesn't apply.
    // edge case: 2+ helicopters in a single cloud.
    data.driftCount++;

    // avoid any changes when near ends of battlefield.
    if (data.x > NEAR_END_DISTANCE && data.x < worldWidth - NEAR_END_DISTANCE) {
      data.windOffsetX += isEnemy ? -0.01 : 0.01;
      data.windOffsetX = Math.max(
        -data.driftXMax,
        Math.min(data.driftXMax, data.windOffsetX)
      );
    }
  }

  function resize() {
    radarItem?.resizeWidth(exports);
  }

  function initDOM() {
    dom.o = sprites.create({
      className: css.className,
      id: data.id
    });
  }

  function initCloud() {
    initDOM();

    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

    radarItem = game.objects.radar.addItem(exports, dom.o.className);

    // and, adjust scale.
    resize();
  }

  css = common.inheritCSS({ className });

  data = common.inheritData(
    {
      type,
      isNeutral: true,
      frameCount: 0,
      windModulus: 16,
      windOffsetX: rngPlusMinus(rng(MAX_VX), type),
      windOffsetY: rngPlusMinus(rng(MAX_VY), type),
      driftXMax: MAX_VX,
      verticalDirection: 0.33,
      verticalDirectionDefault: 0.33,
      y:
        options.y || 96 + parseInt((worldHeight - 96 - 128) * rng(1, type), 10),
      width,
      halfWidth: width / 2,
      height,
      halfHeight: height / 2,
      noEnergyStatus: true
    },
    options
  );

  dom = {
    o: null
  };

  exports = {
    animate,
    data,
    drift,
    dom,
    init: initCloud,
    resize,
    startDrift
  };

  return exports;
};

export { Cloud };
