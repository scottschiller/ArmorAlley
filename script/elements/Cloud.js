import {
  rndInt,
  worldWidth,
  worldHeight,
  rng,
  TYPES,
  rngInt,
  GAME_SPEED
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

const MAX_SPEED = 3;
const NEAR_END_DISTANCE = 128;

const Cloud = (options = {}) => {
  let type = TYPES.cloud;

  const cloudData = cloudTypes[rngInt(cloudTypes.length, type)];

  const { className, width, height } = cloudData;

  let css, dom, data, exports;

  function animate() {
    data.frameCount++;

    if (data.frameCount % data.windModulus === 0) {
      // TODO: improve, limit on axes

      // apply "regular" wind if we aren't drifting with a helicopter.
      if (!data.driftCount) {
        data.windOffsetX += data.x < 0 || rng(1, type) > 0.5 ? 0.125 : -0.125;
      }

      data.windOffsetX = Math.max(
        -MAX_SPEED,
        Math.min(MAX_SPEED, data.windOffsetX)
      );

      data.windOffsetY += data.y < 72 || rng(1, type) > 0.5 ? 0.05 : -0.05;
      data.windOffsetY = Math.max(-0.5, Math.min(0.5, data.windOffsetY));
    }

    // don't drift off the ends of the battlefield...
    if (data.x + data.width > worldWidth) {
      data.windOffsetX = Math.max(data.windOffsetX - 0.01, -MAX_SPEED);
    } else if (data.x < 0) {
      data.windOffsetX = Math.min(data.windOffsetX + 0.01, MAX_SPEED);
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
     * no slower than present wind speed, or 0.5.
     *
     * TODO: test this in network games; feels like a de-sync risk.
     */
    if (net.active) return;

    const minSpeed = 0.5;
    data.driftXMax = Math.max(
      minSpeed,
      Math.max(Math.abs(data.windOffsetX), rng(MAX_SPEED, data.type))
    );
  }

  function drift(isEnemy) {
    /**
     * "Set adrift on memory bliss of you" -PM Dawn ☁️
     * Given a helicopter, have the wind pick up and move toward the opposing base.
     * This is a key strategy for defeating groups of turrets, e.g., Midnight Oasis in Extreme mode.
     */

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

  function initDOM() {
    dom.o = sprites.create({
      className: css.className,
      id: data.id
    });
  }

  function initCloud() {
    initDOM();

    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

    game.objects.radar.addItem(exports, dom.o.className);
  }

  css = common.inheritCSS({ className });

  data = common.inheritData(
    {
      type,
      isNeutral: true,
      frameCount: 0,
      windModulus: 16,
      windOffsetX: 0,
      windOffsetY: 0,
      driftXMax: MAX_SPEED,
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
    startDrift
  };

  return exports;
};

export { Cloud };
