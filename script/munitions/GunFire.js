import {
  common,
  game,
  inheritData,
  inheritCSS,
  TYPES,
  utils,
  setFrameTimeout,
  removeNodes,
  makeSprite,
  rndInt,
  plusMinus,
  applyRandomRotation,
  rnd,
  collisionTest
} from '../aa.js';

import {
  playSound,
  sounds
} from '../core/sound.js';

const GunFire = options => {

    let css, data, dom, collision, exports, frameTimeout, radarItem;

    options = options || {};

    function randomDistance() {
      return `${rndInt(10) * plusMinus()}px`;
    }

    function spark() {

      utils.css.add(dom.o, css.spark);

      // randomize a little

      if (Math.random() > 0.5) {
        dom.o.style.marginLeft = randomDistance();
      }

      if (Math.random() > 0.5) {
        dom.o.style.marginTop = randomDistance();
      }

      if (data.isOnScreen) {
        applyRandomRotation(dom.o);
      }

    }

    function die() {

      // aieee!

      if (!dom.o) return;

      removeNodes(dom);

      data.dead = true;

      if (radarItem) {
        radarItem.die({
          silent: true
        });
      }

    }

    function sparkAndDie(target) {

      let now;
      let canSpark = true;
      let canDie = true;

      if (target) {

        // special case: tanks hit turrets for a lot of damage.
        if (data.parentType === TYPES.tank && target.data.type === TYPES.turret) {
          data.damagePoints = 8;
        }

        // special case: tanks are impervious to infantry gunfire, end-bunkers and super-bunkers are impervious to helicopter gunfire.
        if (
          !(data.parentType === TYPES.infantry && target.data.type === TYPES.tank)
          && !(data.parentType === TYPES.helicopter && (target.data.type === TYPES.endBunker || target.data.type === TYPES.superBunker))
        ) {
          common.hit(target, data.damagePoints, exports);
        }

        // play a sound for certain targets and source -> target combinations

        if (target.data.type === TYPES.helicopter) {

          playSound(sounds.boloTank, exports);

        } else if (

          target.data.type === TYPES.tank
          || target.data.type === TYPES.helicopter
          || target.data.type === TYPES.van
          || target.data.type === TYPES.bunker
          || target.data.type === TYPES.endBunker
          || target.data.type === TYPES.superBunker
          // helicopter -> turret
          || (data.parentType === TYPES.helicopter && target.data.type === TYPES.turret)

        ) {

          // impervious to gunfire?
          if (
            // infantry -> tank = ricochet.
            data.parentType === TYPES.infantry && target.data.type === TYPES.tank

            // nothing can hit end or super bunkers, except tanks.
            || ((target.data.type === TYPES.endBunker || target.data.type === TYPES.superBunker) && data.parentType !== TYPES.tank)
          ) {

            // up to five infantry may be firing at the tank.
            // prevent the sounds from piling up.
            now = performance.now();

            if (now - common.lastInfantryRicochet > data.ricochetSoundThrottle) {
              playSound(sounds.ricochet, exports);
              common.lastInfantryRicochet = now;
            }
            
            canSpark = false;
            canDie = false;

            // bounce! reverse, and maybe flip on vertical.
            data.vX *= -rnd(1);
            data.vY *= rnd(1) * plusMinus();

            // hackish: move immediately away, reduce likelihood of getting "stuck" in a bounce.
            data.x += data.vX;
            data.y += data.vY;
          } else {
            // otherwise, it "sounds" like a hit.
            if (target.data.type === TYPES.bunker) {
              playSound(sounds.concreteHit, exports);
            } else {
              playSound(sounds.metalHit, exports);
            }
          }

        } else if (

          (target.data.type === TYPES.balloon || target.data.type === TYPES.turret)
          && sounds.balloonHit

        ) {

          playSound(sounds.balloonHit, exports);

        }

      }

      if (canSpark) spark();

      if (canDie) {
        utils.css.add(dom.o, css.dead);

        // and cleanup shortly.
        frameTimeout = setFrameTimeout(() => {
          die();
          frameTimeout = null;
        }, 250);
      }

    }

    function animate() {

      // pending die()
      if (frameTimeout) return false;

      if (data.dead) return true;

      if (!data.isInert && !data.expired && data.frameCount > data.expireFrameCount) {
        utils.css.add(dom.o, css.expired);
        if (radarItem) utils.css.add(radarItem.dom.o, css.expired);
        data.expired = true;
      }

      if (data.isInert || data.expired) {
        data.gravity *= data.gravityRate;
      }

      common.moveTo(exports, data.x + data.vX, data.y + data.vY + (data.isInert || data.expired ? data.gravity : 0));

      data.frameCount++;

      // inert "gunfire" animates until it hits the ground.
      if (!data.isInert && data.frameCount >= data.dieFrameCount) {
        die();
      }

      // bottom?
      if (data.y > game.objects.view.data.battleField.height) {
        if (!data.isInert) {
          playSound(sounds.bulletGroundHit, exports);
        }
        die();
      }

      if (!data.isInert) {
        collisionTest(collision, exports);
      }

      // notify caller if now dead and can be removed.
      return (data.dead && !dom.o);

    }

    function initGunFire() {

      dom.o = makeSprite({
        className: css.className
      });

      // randomize a little: ±1 pixel.
      data.x += plusMinus();
      data.y += plusMinus();

      common.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

      if (!data.isInert) {

        radarItem = game.objects.radar.addItem(exports, dom.o.className);

        if (data.isEnemy) {
          utils.css.add(radarItem.dom.o, css.enemy);
        }

      }

    }

    css = inheritCSS({
      className: 'gunfire',
      expired: 'expired',
      spark: 'spark'
    });

    data = inheritData({
      type: 'gunfire',
      parentType: options.parentType || null,
      isInert: !!options.isInert,
      isEnemy: options.isEnemy,
      expired: false,
      frameCount: 0,
      expireFrameCount: options.expireFrameCount || 25,
      dieFrameCount: options.dieFrameCount || 75, // live up to N frames, then die?
      width: 2,
      height: 1,
      gravity: (options.isInert ? 0.25 : 1),
      gravityRate: (options.isInert ? 1.09 : 1.1) + (Math.random() * 0.025),
      damagePoints: options.damagePoints || 1,
      ricochetSoundThrottle: (options?.parentType === TYPES.infantry ? 250 : 100),
      vyMax: 32
    }, options);

    dom = {
      o: null
    };

    collision = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        hit(target) {
          // special case: let tank gunfire pass thru if 0 energy, or friendly.
          if (!(data.parentType === TYPES.tank && target.data.type === TYPES.endBunker && (target.data.energy === 0 || target.data.isEnemy === data.isEnemy))) {
            sparkAndDie(target);
          }
        }
      },
      // if unspecified, use default list of items which bullets can hit.
      items: options.collisionItems || ['tanks', 'vans', 'bunkers', 'missileLaunchers', 'infantry', 'parachuteInfantry', 'engineers', 'helicopters', 'balloons', 'smartMissiles', 'endBunkers', 'superBunkers', 'turrets']
    };

    exports = {
      animate,
      data,
      dom,
      die
    };

    initGunFire();

    return exports;

  };

  export { GunFire }