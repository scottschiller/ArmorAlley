import {
  game,
  gamePrefs,
  utils,
  setFrameTimeout,
  nearbyTest,
  makeSprite,
  initNearby,
  recycleTest,
  enemyHelicopterNearby,
  objectInView,
  missileMode,
  bananaMode,
  rubberChickenMode
} from '../aa.js';

import { common } from '../core/common.js';

import { FPS } from '../core/global.js';

import {
  playSound,
  sounds
} from '../core/sound.js';

import { SmartMissile } from '../munitions/SmartMissile.js';

const MissileLauncher = options => {

  let css, data, dom, friendlyNearby, height, radarItem, exports;

  function stop() {

    data.stopped = true;

  }

  function resume() {

    data.stopped = false;

  }

  function die(options) {

    if (data.dead) return;

    if (!options?.silent) {

      utils.css.add(dom.o, css.exploding);

      if (sounds.genericExplosion) {
        playSound(sounds.genericExplosion, exports);
      }

      common.inertGunfireExplosion({ exports });

      setFrameTimeout(() => {
        common.removeNodes(dom);
      }, 1000);

    } else {

      common.removeNodes(dom);

    }

    // stop moving while exploding
    data.vX = 0;

    data.energy = 0;

    data.dead = true;

    radarItem.die({ silent: (options && options.silent) });

  }

  function fire() {

    let i, j, similarMissileCount, targetHelicopter;

    if (data.frameCount % data.fireModulus !== 0) return;

    // is an enemy helicopter nearby?
    targetHelicopter = enemyHelicopterNearby(data, 256);

    if (!targetHelicopter) return;

    // we have a possible target. any missiles already chasing it?
    similarMissileCount = 0;

    for (i = 0, j = game.objects.smartMissiles.length; i < j; i++) {
      if (game.objects.smartMissiles[i].objects.target === targetHelicopter) {
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
      if (objectInView(data, {
        items: 'turrets',
        friendlyOnly: true
      })) {
        return;
      }

      // friendly helicopter
      if (objectInView(data, {
        items: 'helicopters',
        friendlyOnly: true
      })) {
        return;
      }

    }

    // self-destruct, FIRE ZE MISSILE
    die();

    game.objects.smartMissiles.push(SmartMissile({
      parentType: data.type,
      isEnemy: data.isEnemy,
      isBanana: gamePrefs.enemy_missile_match_type && missileMode === bananaMode,
      isRubberChicken: gamePrefs.enemy_missile_match_type && missileMode === rubberChickenMode,
      x: data.x + (data.width / 2),
      y: data.y,
      target: targetHelicopter
    }));

  }

  function animate() {

    data.frameCount++;

    if (data.dead) return !dom.o;

    if (!data.stopped) {
      common.moveTo(exports, data.x + data.vX, data.y);
    }

    common.smokeRelativeToDamage(exports);

    if (data.orderComplete && !data.stopped) {

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
          data.stateModulus = 36;
        } else {
          data.stateModulus = 4;
        }

        data.frameCount = 0;

        if (data.isOnScreen) {
          dom.o.style.backgroundPosition = `0px ${data.height * data.state * -1}px`;
        }

      } else if (data.frameCount % data.stateModulus === 2 && data.isOnScreen) {

        // next frame - reset.
        dom.o.style.backgroundPosition = '0px 0px';

      }

    }

    recycleTest(exports);

    // (maybe) fire?
    fire();

    if (gamePrefs.ground_unit_traffic_control) {
      nearbyTest(friendlyNearby);
    }

    return (data.dead && !dom.o);

  }

  function initMissileLauncher() {

    dom.o = makeSprite({
      className: css.className
    });

    if (data.isEnemy) {
      utils.css.add(dom.o, css.enemy);
    }

    common.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

    initNearby(friendlyNearby, exports);

    data.frameTimeout = setFrameTimeout(() => {
      data.orderComplete = true;
      data.frameTimeout = null;
    }, 2000);

    radarItem = game.objects.radar.addItem(exports, dom.o.className);

  }

  options = options || {};

  height = 18;

  css = common.inheritCSS({
    className: 'missile-launcher'
  });

  data = common.inheritData({
    type: 'missile-launcher',
    bottomAligned: true,
    energy: 3,
    energyMax: 3,
    direction: 0,
    vX: (options.isEnemy ? -1 : 1),
    frameCount: 0,
    frameTimeout: null,
    fireModulus: FPS, // check every second or so
    width: 54,
    halfWidth: 27,
    height,
    halfHeight: height / 2,
    orderComplete: false,
    state: 0,
    stateMax: 3,
    stateModulus: 38,
    inventory: {
      frameCount: 60,
      cost: 3
    },
    x: options.x || 0,
    y: game.objects.view.data.world.height - height - 2
    
  }, options);

  dom = {
    o: null
  };

  exports = {
    animate,
    data,
    dom,
    die
  };

  friendlyNearby = {
    options: {
      source: exports,
      targets: undefined,
      useLookAhead: true,
      // stop moving if we roll up behind a friendly vehicle
      friendlyOnly: true,
      hit: stop,
      miss: resume
    },
    // who are we looking for nearby?
    items: ['tanks', 'vans', 'missileLaunchers'],
    targets: []
  };

  if (!options.noInit) {
    initMissileLauncher();
  }

  return exports;

};

export { MissileLauncher };