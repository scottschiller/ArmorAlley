import { game, getObjectById } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import {
  bananaMode,
  ENEMY_UNIT_COLOR_RGBA,
  FPS,
  GAME_SPEED_RATIOED,
  getTypes,
  rndInt,
  rubberChickenMode,
  TYPES,
  worldHeight
} from '../core/global.js';
import { gamePrefs } from '../UI/preferences.js';
import {
  enemyHelicopterNearby,
  nearbyTest,
  objectInView,
  recycleTest
} from '../core/logic.js';
import { playSound, sounds } from '../core/sound.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';
import { net } from '../core/network.js';

const MISSILE_LAUNCHER_SCAN_RADIUS = 320;
const MISSILE_LAUNCHER_SCAN_BUFFER = 16;

const spriteWidth = 108;
const spriteHeight = 144;
const frameWidth = spriteWidth;
const frameHeight = spriteHeight / 4;
const width = 54;
const height = 18;
const energy = 8;

const MissileLauncher = (options = {}) => {
  let exports;

  let data, domCanvas, friendlyNearby;

  data = common.inheritData(
    {
      type: 'missile-launcher',
      bottomAligned: true,
      energy,
      energyMax: energy,
      direction: 0,
      vX: options.isEnemy ? -1 : 1,
      frameCount: 0,
      frameTimeout: null,
      fireModulus: FPS, // check every second or so
      fireModulus1X: FPS,
      width,
      logicalWidth: MISSILE_LAUNCHER_SCAN_RADIUS,
      halfWidth: width / 2,
      height,
      halfHeight: height / 2,
      scanDistance: MISSILE_LAUNCHER_SCAN_RADIUS,
      scanDistanceScale: 0,
      state: 0,
      stateMax: 3,
      stateModulus: 38,
      stateModulus1X: 38,
      gameSpeedProps: ['fireModulus', 'stateModulus'],
      x: options.x || 0,
      y: game.objects.view.data.world.height - height - 2,
      stepOffset: options.stepOffset,
      domFetti: {
        colorType: options.isEnemy ? 'grey' : 'green',
        elementCount: 7 + rndInt(7),
        startVelocity: 10 + rndInt(10)
      },
      hasScanNode: true,
      timers: {}
    },
    options
  );

  domCanvas = {
    radarItem: MissileLauncher.radarItemConfig({ data }),
    img: {
      src: null,
      source: {
        x: 0,
        y: 0,
        is2X: true,
        width: spriteWidth,
        height: spriteHeight,
        frameWidth,
        frameHeight,
        frameX: 0,
        frameY: 0
      },
      target: {
        width: frameWidth / 2,
        height: frameHeight / 2
      }
    }
  };

  exports = {
    animate: () => animate(exports),
    data,
    domCanvas,
    die: (dieOptions) => die(exports, dieOptions),
    dieComplete: () => dieComplete(exports),
    friendlyNearby,
    init: () => initMissileLauncher(options, exports),
    isOnScreenChange: (isOnScreen) => {
      // delete cached canvas if going off-screen
      if (isOnScreen) return;
      exports.radialGradient = null;
    },
    refreshSprite: () => refreshSprite(exports),
    resize: () => {
      // HACK: force redraw of radial gradient
      exports.radialGradient = null;
    },
    resume: () => resume(exports),
    stop: () => stop(exports)
  };

  exports.friendlyNearby = {
    options: {
      source: data.id,
      targets: undefined,
      useLookAhead: true,
      // stop moving if we roll up behind a friendly vehicle
      friendlyOnly: true,
      hit: (targetID) =>
        common.friendlyNearbyHit(targetID, data.id, {
          resume: exports.resume,
          stop: exports.stop
        }),
      miss: resume
    },
    // who are we looking for nearby?
    items: getTypes('tank, van, missileLauncher', {
      group: 'friendly',
      exports
    }),
    targets: []
  };

  refreshSprite(exports);

  return exports;
};

function refreshSprite(exports) {
  let { domCanvas, data } = exports;
  if (!domCanvas?.img) return;
  domCanvas.img.src = utils.image.getImageObject(
    data.isEnemy ? 'missile-launcher-enemy.png' : 'missile-launcher.png'
  );
}

function stop(exports) {
  exports.data.stopped = true;
}

function resume(exports) {
  exports.data.stopped = false;
}

function die(exports, dieOptions = {}) {
  let { data, domCanvas, radarItem } = exports;
  if (data.dead) return;

  if (!dieOptions?.silent) {
    if (sounds.genericExplosion) {
      playSound(sounds.genericExplosion, exports);
    }

    domCanvas.dieExplosion = effects.genericExplosion(exports);
    domCanvas.img = null;

    effects.inertGunfireExplosion({ exports });

    effects.domFetti(data.id, dieOptions.attacker);

    // only cause damage if there was an attacker.
    // otherwise, regular self-destruct case will also stop the missile. ;)
    if (dieOptions.attacker) {
      effects.damageExplosion(exports);
    }

    // account for scan node transition time
    data.timers.dieComplete = common.frameTimeout.set('dieComplete', 1100);

    if (!dieOptions.firingMissile) {
      common.addGravestone(exports);
      const attackerType = dieOptions.attacker?.data?.type;
      if (
        !net.connected &&
        game.players.local.data.isEnemy === data.isEnemy &&
        gamePrefs['notify_missile-launcher'] &&
        !data.isOnScreen &&
        attackerType !== TYPES.smartMissile
      ) {
        game.objects.notifications.add('You lost a missile launcher 💥');
      }
    }
  } else {
    dieComplete();
  }

  // stop moving while exploding
  data.vX = 0;

  data.energy = 0;

  data.dead = true;

  radarItem.die(dieOptions);

  common.onDie(data.id, dieOptions);
}

function dieComplete(exports) {
  sprites.removeNodesAndUnlink(exports);
}

function fire(exports) {
  let { data } = exports;
  let i, j, similarMissileCount, targetHelicopter;

  if (data.frameCount % data.fireModulus !== 0) return;

  // is an enemy helicopter nearby?
  targetHelicopter = getObjectById(
    enemyHelicopterNearby(
      data,
      data.scanDistance +
        MISSILE_LAUNCHER_SCAN_BUFFER +
        data.halfWidth * (data.isEnemy ? -1 : 1),
      data.hasScanNode
    )
  );

  if (!targetHelicopter) return;

  // we have a possible target. any missiles already chasing it?
  similarMissileCount = 0;

  for (i = 0, j = game.objects[TYPES.smartMissile].length; i < j; i++) {
    if (
      game.objects[TYPES.smartMissile][i].objects.target ===
      targetHelicopter.data.id
    ) {
      similarMissileCount++;
    }
  }

  if (similarMissileCount) return;

  /**
   * player's missile launchers: fire and target enemy chopper only when "unattended."
   * e.g., don't fire if a friendly turret or helicopter is nearby; they can handle it.
   * CPU makes missile launchers routinely, whereas they're strategic for human player.
   * in the enemy case, fire at player regardless of who's nearby. makes game tougher.
   */

  if (!data.isEnemy) {
    // friendly turret
    if (
      objectInView(data, {
        triggerDistance: data.scanDistance,
        items: TYPES.turret,
        friendlyOnly: true
      })
    ) {
      return;
    }

    // friendly helicopter, and armed with at least one missile
    if (
      objectInView(data, {
        triggerDistance: data.scanDistance,
        items: TYPES.helicopter,
        friendlyOnly: true
      }) &&
      game.players.local.data.smartMissiles > 0
    ) {
      return;
    }
  }

  // self-destruct, FIRE ZE MISSILE
  die(exports, { firingMissile: true });

  const params = {
    id: `${data.id}_missile`,
    staticID: true,
    parent: data.id,
    parentType: data.type,
    isEnemy: data.isEnemy,
    isBanana:
      gamePrefs.alt_smart_missiles &&
      game.objects.view.data.missileMode === bananaMode,
    isRubberChicken:
      gamePrefs.alt_smart_missiles &&
      game.objects.view.data.missileMode === rubberChickenMode,
    x: data.x + data.width / 2,
    y: data.y,
    target: targetHelicopter.data.id
  };

  const missile = game.addObject(TYPES.smartMissile, params);

  /**
   * For consistency, ensure a missile exists on both sides.
   *
   * It's possible, given lag(?), that one missile launcher may have been blown up
   * on the other side by something else before it had a chance to launch.
   *
   * This is bad as it could mean your helicopter mysteriously gets hit, when
   * the active missile on the other side hits it.
   */
  if (net.active) {
    net.sendMessage({
      type: 'ADD_OBJECT',
      objectType: missile.data.type,
      params
    });
  }
}

function animate(exports) {
  let { data, domCanvas } = exports;
  data.frameCount++;

  const fpsMultiplier = 1 / GAME_SPEED_RATIOED;

  if (!data.stopped) {
    sprites.moveTo(exports, data.x + data.vX * GAME_SPEED_RATIOED, data.y);
  }

  sprites.draw(exports);

  effects.drawScanNode(exports);

  domCanvas?.dieExplosion?.animate();

  if (data.dead) return data.canDestroy;

  effects.smokeRelativeToDamage(exports);

  if (!data.timers.orderActive && !data.stopped) {
    // regular timer or back wheel bump
    if (data.frameCount % data.stateModulus === 0) {
      data.state++;

      if (data.state > data.stateMax) {
        data.state = 0;
      }

      // reset frameCount (timer)
      data.frameCount = 0;

      // first wheel, delay, then a few frames until we animate the next two.
      if (data.state === 1 || data.state === 3) {
        data.stateModulus = 36 * fpsMultiplier;
      } else {
        data.stateModulus = 4 * fpsMultiplier;
      }

      if (domCanvas.img) {
        domCanvas.img.source.frameY = data.state;
      }
    } else if (
      data.frameCount % data.stateModulus === 2 * fpsMultiplier &&
      data.isOnScreen
    ) {
      // next frame - reset.
      if (domCanvas.img) {
        domCanvas.img.source.frameY = 0;
      }
    }
  }

  recycleTest(exports);

  // (maybe) fire?
  fire(exports);

  if (gamePrefs.ground_unit_traffic_control) {
    nearbyTest(exports.friendlyNearby, exports);
  }

  return data.dead && data.canDestroy;
}

function initMissileLauncher(options, exports) {
  if (options.noInit) return;

  let { data } = exports;

  common.initDOM(exports);

  common.initNearby(exports.friendlyNearby, exports);

  data.timers.orderActive = common.frameTimeout.set(null, 2000);

  exports.radarItem = game.objects.radar.addItem(exports);
}

MissileLauncher.radarItemConfig = ({ data }) => ({
  width: 4,
  height: 2.5,
  excludeFillStroke: true,
  draw: (ctx, obj, pos, width, height) => {
    const left = pos.left(obj.data.left);
    const top = pos.bottomAlign(height, obj);
    const topHalf = pos.bottomAlign(height / 2, obj);
    const scaledWidth = pos.width(width);
    const scaledHeight = pos.height(height);

    ctx.beginPath();

    ctx.rect(left, topHalf, scaledWidth, scaledHeight / 2);
    ctx.fill();
    ctx.stroke();

    // don't draw a missile if we don't have one - i.e., just launched. ;)
    if (game.objectsById[obj?.oParent]?.data?.dead) return;

    ctx.beginPath();

    // missile (angled)
    common.domCanvas.rotate(
      ctx,
      game.objectsById[obj.oParent].data.isEnemy ? 20 : -20,
      left,
      top,
      scaledWidth / 2,
      scaledHeight / 2
    );

    const missileWidth = pos.width(2.75);
    const missileHeight = pos.height(0.5);

    ctx.roundRect(
      left + (game.objectsById[obj.oParent].data.isEnemy ? scaledWidth / 4 : 0),
      top + (game.objectsById[obj.oParent].data.isEnemy ? 0 : height),
      missileWidth,
      missileHeight,
      missileWidth
    );

    common.domCanvas.unrotate(ctx);

    ctx.fill();
    ctx.stroke();

    // TODO: effects.drawRadarScanNode() for turret and missile launcher.
    // TODO: cache and redraw on resize?

    if (!effects.canShowScanNode(data, 'radar')) return;

    /**
     * Relative to radar height, and scaled a bit.
     * TODO: review precise alignment w/helicopter etc.
     * ALso, animate in.
     */
    let radius =
      (MISSILE_LAUNCHER_SCAN_RADIUS / worldHeight) *
      (game.objects.radar.data.height * 1.15) *
      (data?.stepOffset !== undefined ? data.stepOffset : 1);

    ctx.beginPath();

    let alpha = 0.02;

    // TODO: review and use all theme colors consistently.
    ctx.fillStyle = data?.isEnemy
      ? gamePrefs?.radar_theme === 'red'
        ? ENEMY_UNIT_COLOR_RGBA
        : `rgba(255, 255, 255, ${alpha})`
      : `rgba(23, 160, 7, ${alpha * 2})`;

    ctx.strokeStyle = data?.isEnemy
      ? gamePrefs?.radar_theme === 'red'
        ? ENEMY_UNIT_COLOR_RGBA
        : `rgba(255, 255, 255, ${alpha * 2})`
      : `rgba(23, 160, 7, ${alpha * 4})`;

    let startX = left + scaledWidth / 2;

    /**
     * NOTE: slight -ve offset to pull arcs down a bit, not quite
     * touching top of radar and still reasonable on X axis.
     */
    let startY = pos.bottomAlign(-1);

    // radar item is elliptical, not necessarily circular.
    let rotation = 0;

    /**
     * Relative scan node size...
     * Scan radius * radar scale (zoom), relative to screen and world.
     * (Note: browser.screenWidth, not browser.width.)
     */
    let radiusX =
      MISSILE_LAUNCHER_SCAN_RADIUS *
      game.objects.radar.data.scale *
      (game.objects.view.data.browser.screenWidth / 8192) *
      (data?.stepOffset !== undefined ? data.stepOffset : 1);

    effects.refreshScanDistanceScale(data);

    // expand/collapse
    radiusX *= data.scanDistanceScale;
    radius *= data.scanDistanceScale;

    ctx.ellipse(startX, startY, radiusX, radius, rotation, Math.PI, 0);

    ctx.stroke();
    ctx.fill();
  }
});

export { MISSILE_LAUNCHER_SCAN_RADIUS, MissileLauncher };
