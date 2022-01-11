import {
  game,
  utils,
  setFrameTimeout,
  rnd,
  rndInt,
  rad2Deg,
  plusMinus
} from '../aa.js';

import { common } from '../core/common.js';
import { collisionTest } from '../core/logic.js';

import {
  worldHeight,
  TYPES
} from '../core/global.js';

import {
  playSound,
  sounds
} from '../core/sound.js';

import { Smoke } from '../elements/Smoke.js';

const Bomb = options => {

  let css, data, dom, collision, radarItem, exports;

  function moveTo(x, y, rotateAngle, forceUpdate) {

    let deltaX, deltaY, rad;
    
    deltaX = 0;
    deltaY = 0;

    if (x !== undefined) {
      deltaX = x - data.x;
    }

    if (y !== undefined) {
      deltaY = y - data.y;
    }

    if (common.updateXY(exports, x, y) || forceUpdate) {
      rad = Math.atan2(deltaY, deltaX);
      common.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`, `rotate3d(0, 0, 1, ${rotateAngle !== undefined ? rotateAngle : (rad * rad2Deg)}deg`);
    }

  }

  function die(dieOptions) {

    // aieee!

    let className, defaultAngle, forceUpdate;

    if (data.dead) return;

    dieOptions = dieOptions || {};

    defaultAngle = 0;
    forceUpdate = true;

    // possible hit, blowing something up.

    if (!dieOptions.omitSound && sounds.bombExplosion) {
      playSound(sounds.bombExplosion, exports);
    }

    // bombs blow up big on the ground, and "spark" on other things.
    className = (!dieOptions.spark ? css.explosionLarge : css.spark);

    if (dieOptions.bottomAlign) {

      // TODO: set explosionHeight as 22 or something.
      data.y = worldHeight - 17;

      // stop moving
      data.vY = 0;
      data.gravity = 0;

      // reposition immediately
      moveTo(data.x, data.y, defaultAngle, forceUpdate);

    } else {
      
      // align to whatever we hit
      if (dieOptions.type && common.ricochetBoundaries[dieOptions.type]) {

        // ensure that the bomb stays at or above the height of its target - e.g., bunker or tank.
        data.y = Math.min(worldHeight - common.ricochetBoundaries[dieOptions.type], data.y);

        // go there immediately
        moveTo(data.x, data.y, defaultAngle, forceUpdate);

      } else {

        // extraY: move bomb spark a few pixels down so it's in the body of the target. applies mostly to tanks.
        moveTo(data.x, data.y + (dieOptions.extraY || 0), defaultAngle, forceUpdate);

      }

    }

    if (dom.o) {
      utils.css.add(dom.o, className);

      if (dieOptions.spark) {
        common.applyRandomRotation(dom.o);
      }

      data.deadTimer = setFrameTimeout(() => {
        common.removeNodes(dom);
        data.deadTimer = null;
      }, 600);
    }

    // TODO: move into something common?
    if (data.isOnScreen) {
      for (let i=0; i<3; i++) {
        game.objects.smoke.push(Smoke({
          x: data.x + 6 + (rndInt(6) * 0.33 * plusMinus()),
          y: data.y + 12,
          vX: (rnd(4) * plusMinus()),
          vY: rnd(-4),
          spriteFrame: rndInt(5)
        }));
      }
    }

    data.dead = true;

    if (radarItem) {
      radarItem.die({
        silent: true
      });
    }

  }

  function bombHitTarget(target) {

    let isSpark, damagePoints;

    // assume default
    damagePoints = data.damagePoints;

    if (target.data.type && (target.data.type === TYPES.balloon || target.data.type === 'smart-missile')) {

      die({
        type: target.data.type,
        omitSound: true,
        spark: true
      });

    } else {

      // certain targets should get a spark vs. a large explosion
      isSpark = target.data.type?.match(/balloon|helicopter|tank|van|missileLauncher|parachuteInfantry|bunker|turret|smartMissile/i);

      die({
        type: target.data.type,
        spark: isSpark,
        bottomAlign: !isSpark && (!target.data.type || target.data.type === TYPES.balloon || target.data.type === TYPES.infantry),
        // and a few extra pixels down, for tanks (visual correction vs. boxy collision math)
        extraY: (target.data.type?.match(/tank/i) ? 3 + rndInt(3) : 0),
        target
      });

    }

    // special cases for bomb -> target interactions
    if (target.data.type) {

      if (target.data.type === TYPES.helicopter) {

        // one bomb kills a helicopter.
        damagePoints = target.data.energyMax;

      } else if (target.data.type === TYPES.turret) {

        // bombs do more damage on turrets.
        damagePoints = 10;

      }

      // bonus "hit" sounds for certain targets
      if (target.data.type === TYPES.tank || target.data.type === TYPES.turret) {
        playSound(sounds.metalHit, exports);
      } else if (target.data.type === TYPES.bunker) {
        playSound(sounds.concreteHit, exports);
      }

    }

    common.hit(target, damagePoints, exports);

  }

  function animate() {

    if (data.dead) return (!data.deadTimer && !dom.o);

    data.gravity *= 1.1;

    moveTo(data.x + data.vX, data.y + Math.min(data.vY + data.gravity, data.vYMax));

    // hit bottom?
    if (data.y - data.height > game.objects.view.data.battleField.height) {
      die({
        bottomAlign: true
      });
    }

    collisionTest(collision, exports);

    // bombs are animated by their parent - e.g., helicopters,
    // and not the main game loop. so, on-screen status is checked manually here.
    common.updateIsOnScreen(exports);

    // notify caller if dead, and node has been removed.
    return (data.dead && !data.deadTimer && !dom.o);

  }

  function initBomb() {

    dom.o = common.makeSprite({
      className: css.className
    });

    // parent gets transform position, subsprite gets rotation animation
    dom.oSubSprite = common.makeSubSprite();

    dom.o.appendChild(dom.oSubSprite);

    common.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

    // TODO: don't create radar items for bombs from enemy helicopter when cloaked
    radarItem = game.objects.radar.addItem(exports, dom.o.className);

    if (data.isEnemy) {
      utils.css.add(radarItem.dom.o, css.enemy);
    }

  }

  options = options || {};

  css = common.inheritCSS({
    className: 'bomb',
    explosionLarge: 'explosion-large',
    spark: 'spark'
  });

  data = common.inheritData({
    type: 'bomb',
    parentType: options.parentType || null,
    deadTimer: null,
    width: 13,
    height: 12,
    gravity: 1,
    damagePoints: 3,
    vX: (options.vX || 0),
    vYMax: 32
  }, options);

  dom = {
    o: null,
    oSubSprite: null
  };

  collision = {
    options: {
      source: exports, // initially undefined
      targets: undefined,
      hit(target) {
        bombHitTarget(target);
      }
    },
    items: ['superBunkers', 'bunkers', 'tanks', 'helicopters', 'balloons', 'vans', 'missileLaunchers', 'infantry', 'parachuteInfantry', 'engineers', 'turrets', 'smartMissiles']
  };

  exports = {
    animate,
    data,
    die,
    dom
  };

  initBomb();

  return exports;

};

export { Bomb };