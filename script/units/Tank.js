import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { gamePrefs } from '../UI/preferences.js';
import { collisionCheck, nearbyTest, recycleTest } from '../core/logic.js';
import { TYPES, FPS } from '../core/global.js';
import { playSound, sounds } from '../core/sound.js';
import { GunFire } from '../munitions/GunFire.js'

const Tank = options => {

    let css, data, dom, radarItem, nearby, friendlyNearby, exports, tankHeight;

    function fire() {

      let collisionItems;

      if (data.frameCount % data.fireModulus !== 0) return;

      /**
       * Special case: tanks don't stop to shoot bunkers, but allow gunfire to hit and damage bunkers
       * ONLY IF the tank is targeting a helicopter (i.e., defense) or another tank.
       * 
       * Otherwise, let bullets pass through bunkers and kill whatever "lesser" units the tank is firing at.
       * 
       * This should be an improvement from the original game, where tanks could get "stuck" shooting into
       * a bunker and eventually destroying it while trying to take out an infantry.
       */

      if (
        data.lastNearbyTarget && data.lastNearbyTarget.data.type
        && (data.lastNearbyTarget.data.type === TYPES.helicopter || data.lastNearbyTarget.data.type === TYPES.tank)
      ) {

        // allow bullets to hit bunkers when firing at a helicopter or tank
        collisionItems = nearby.items.concat('bunkers');

      } else if (gamePrefs.tank_gunfire_miss_bunkers) {

        // bullets "pass through" bunkers when targeting infantry, engineers, missile launchers, and vans.
        collisionItems = nearby.items;

      }

      game.objects.gunfire.push(GunFire({
        parentType: data.type,
        isEnemy: data.isEnemy,
        damagePoints: 2, // tanks fire at half-rate, so double damage.
        collisionItems,
        x: data.x + ((data.width + 1) * (data.isEnemy ? 0 : 1)),
        // data.y + 3 is visually correct, but halfHeight gets the bullets so they hit infantry
        y: data.y + data.halfHeight,
        vX: data.vX * 2,
        vY: 0
      }));

      if (sounds.tankGunFire) {
        playSound(sounds.tankGunFire, exports);
      }

    }

    function moveTo(x, y) {

      if (common.updateXY(exports, x, y)) {
        common.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y - data.yOffset}px`);
      }

    }

    function updateHealth() {

      common.updateEnergy(exports);

    }

    function repair() {

      if (data.frameCount % data.repairModulus === 0) {
        if (data.energy < data.energyMax) {
          data.energy += 0.1;
          updateHealth();
        }
      }

    }

    function die(options) {

      if (data.dead) return;

      if (!options || !options.silent) {

        utils.css.add(dom.o, css.exploding);

        common.shrapnelExplosion(data, { velocity: 8 });

        common.inertGunfireExplosion({ exports });

        common.smokeRing(exports, { isGroundUnit: true });

        data.deadTimer = common.setFrameTimeout(() => {
          common.removeNodes(dom);
          data.deadTimer = null;
        }, 1500);
  
      } else {

        common.removeNodes(dom);

      }

      // stop moving while exploding
      data.vX = 0;

      data.energy = 0;

      data.dead = true;

      if ((!options || !options.silent) && sounds.genericExplosion) {
        playSound(sounds.genericExplosion, exports);
      }

      radarItem.die();

    }

    function shouldFireAtTarget(target) {

      if (!target?.data) return false;

      // TODO: ensure the target is "in front of" the tank.

      // fire at "bad guys" that have energy left. this includes end-bunkers and super-bunkers which haven't yet been neutralized.
      if (target.data.isEnemy !== data.isEnemy && target.data.energy !== 0) return true;

    }

    function stop() {

      if (data.stopped) return;

      utils.css.add(dom.o, css.stopped);
      data.stopped = true;

    }

    function resume() {

      if (!data.stopped) return;

      if (data.lastNearbyTarget) return;

      utils.css.remove(dom.o, css.stopped);
      data.stopped = false;

    }

    function animate() {

      data.frameCount++;

      // exit early if dead
      if (data.dead) return (!data.deadTimer && !dom.o);

      repair();

      common.smokeRelativeToDamage(exports);

      if (!data.stopped) {

        moveTo(data.x + data.vX, data.y);

      } else if (shouldFireAtTarget(data.lastNearbyTarget)) {

        // move one pixel every so often, to prevent edge case where tank can get "stuck" - e.g., shooting an enemy that is overlapping a bunker or super bunker.
        // the original game had something like this, too.
        if (data.frameCount % FPS === 0) {

          // run "moving" animation for a few frames
          utils.css.remove(dom.o, css.stopped);

          moveTo(data.x + (data.isEnemy ? -1 : 1), data.y);

          // and then stop again if we haven't resumed for real by that time.
          common.setFrameTimeout(() => {
            if (data.stopped) {
              utils.css.add(dom.o, css.stopped);
            }
          }, 150);
        }

        // only fire (i.e., GunFire objects) when stopped
        fire();

      }

      // start, or stop firing?
      nearbyTest(nearby);

      // stop moving, if we approach another friendly tank
      if (gamePrefs.ground_unit_traffic_control) {
        nearbyTest(friendlyNearby);
      }

      recycleTest(exports);

      return (data.dead && !data.deadTimer && !dom.o);

    }

    function initTank() {

      dom.o = common.makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      dom.oTransformSprite = common.makeTransformSprite();
      dom.o.appendChild(dom.oTransformSprite);

      // for testing
      if (options.extraClass) {
        utils.css.add(dom.o, options.extraClass);
      }

      common.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y - data.yOffset}px`);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);
      
      common.initNearby(nearby, exports);
      common.initNearby(friendlyNearby, exports);

    }

    options = options || {};

    tankHeight = 18;

    css = common.inheritCSS({
      className: TYPES.tank,
      stopped: 'stopped'
    });

    data = common.inheritData({
      type: TYPES.tank,
      bottomAligned: true,
      deadTimer: null,
      energy: 8,
      energyMax: 8,
      energyLineScale: 0.8,
      frameCount: 0,
      repairModulus: 5,
      // enemy tanks shoot a little faster
      fireModulus: (options.isEnemy ? 10 : 12),
      vX: (options.isEnemy ? -1 : 1),
      vXDefault: (options.isEnemy ? -1 : 1),
      width: 58,
      height: tankHeight,
      halfWidth: 28,
      halfHeight: tankHeight / 2,
      stopped: false,
      inventory: {
        frameCount: 60,
        cost: 4
      },
      lastNearbyTarget: null,
      x: options.x || 0,
      y: game.objects.view.data.world.height - tankHeight - 1,
      // hackish: logical vs. sprite alignment offset
      yOffset: 2
    }, options);

    dom = {
      o: null,
      oTransformSprite: null
    };

    friendlyNearby = {
      options: {
        source: exports,
        targets: undefined,
        useLookAhead: true,
        // stop moving if we roll up behind a friendly tank
        friendlyOnly: true,
        hit(target) {
          // TODO: data.halfWidth instead of 0, but be able to resume and separate tanks when there are no enemies nearby.
          // for now: stop when we pull up immediately behind the next tank, vs. being "nearby."
          if (collisionCheck(data, target.data, 0)) {
            stop();
          } else {
            resume();
          }
        },
        miss() {
          // resume, if tank is not also firing
          resume();
        }
      },
      // who are we looking for nearby?
      items: ['tanks'],
      targets: []
    };

    nearby = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        useLookAhead: true,
        hit(target) {
          // determine whether to fire, or resume (if no friendly tank nearby)
          if (shouldFireAtTarget(target)) {
            data.lastNearbyTarget = target;
            stop();
          } else {
            // resume, if not also stopped for a nearby friendly tank
            data.lastNearbyTarget = null;
            resume();
          }
        },
        miss() {
          // resume moving, stop firing.
          data.lastNearbyTarget = null;
          resume();
        }
      },
      // who gets fired at?
      items: ['tanks', 'vans', 'missileLaunchers', TYPES.infantry, 'engineers', 'turrets', 'helicopters', 'endBunkers', 'superBunkers'],
      targets: []
    };

    exports = {
      animate,
      data,
      dom,
      die,
      stop,
      resume,
      updateHealth
    };

    if (!options.noInit) {
      initTank();
    }

    return exports;

  };

  export { Tank };