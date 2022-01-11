import {
  game,
  updateEnergy,
  utils,
  shrapnelExplosion,
  setFrameTimeout,
  makeSprite,
  rndInt,
  makeSubSprite,
  getDoorCoords,
  getNormalizedUnitName,
  checkProduction,
  rnd,
  collisionCheckMidPoint
} from '../aa.js';

import { TYPES } from '../core/global.js';

import { common } from '../core/common.js';

import {
  playSound,
  playSoundWithDelay,
  sounds
} from '../core/sound.js';

import { Balloon } from '../elements/Balloon.js';
import { Chain } from '../elements/Chain.js';

const Bunker = options => {

  let css, data, dom, objects, radarItem, exports;

  function createBalloon(useRandomY) {

    if (!objects.balloon) {

      objects.balloon = Balloon({
        bunker: exports,
        leftMargin: 8,
        isEnemy: data.isEnemy,
        x: data.x,
        // if 0, balloon will "rise from the depths".
        y: (useRandomY ? 48 + rndInt(game.objects.view.data.world.height - 48) : 0)
      });

      // push onto the larger array
      game.objects.balloons.push(objects.balloon);

    }

    if (!objects.chain) {

      // create a chain, linking the base and the balloon
      objects.chain = Chain({
        x: data.x + (data.halfWidth - 1),
        y: data.y,
        height: data.y - objects.balloon.data.y,
        balloon: objects.balloon,
        bunker: exports
      });

      game.objects.chains.push(objects.chain);

    }

  }

  function capture(isEnemy) {

    if (isEnemy) {

      utils.css.add(dom.o, css.enemy);
      utils.css.add(radarItem.dom.o, css.enemy);

      game.objects.notifications.add('The enemy captured a bunker 🚩');

      playSoundWithDelay(sounds.enemyClaim, exports, 500);

    } else {

      utils.css.remove(dom.o, css.enemy);
      utils.css.remove(radarItem.dom.o, css.enemy);

      game.objects.notifications.add('You captured a bunker ⛳');

      playSoundWithDelay(sounds.friendlyClaim, exports, 500);

    }

    data.isEnemy = isEnemy;

    // and the balloon, too.
    objects?.balloon?.setEnemy(isEnemy);

    playSound(sounds.doorClose, exports);

    // check if enemy convoy production should stop or start
    checkProduction();

  }

  function engineerRepair(engineer) {

    if (data.energy < data.energyMax) {
      // stop, and don't fire
      engineer.stop(true);
      data.energy = Math.min(data.energy + 0.05, data.energyMax);
    } else {
      // repair complete - keep moving
      engineer.resume();
    }

    updateEnergy(exports);

  }

  function repair() {

    // fix the balloon, if it's broken - or, rather, flag it for respawn.
    if (objects.balloon) {

      if (objects.balloon.data.dead) {
        objects.balloon.data.canRespawn = true;
      }

    } else {

      // make a new one
      createBalloon();

    }

  }

  function nullifyChain() {
    objects.chain = null;
  }

  function nullifyBalloon() {
    objects.balloon = null;
  }

  function detachBalloon() {

    // update height of chain in the DOM, assuming it's
    // attached to the balloon now free from the base.
    // once height is assigned, the chain will either
    // hang from the balloon it's attached to, OR, will
    // fall due to gravity (i.e., no base, no balloon.)
    objects?.chain?.applyHeight();

    if (objects.balloon) {
      objects.balloon.detach();
      nullifyBalloon();
    }

  }

  function die(options) {

    let normalizedType;

    if (data.dead) return;

    utils.css.add(dom.o, css.exploding);

    common.inertGunfireExplosion({ exports, count: 8 + rndInt(8) });

    common.smokeRing(exports, {
      count: 24,
      velocityMax: 16,
      offsetY: data.height - 2,
      isGroundUnit: true
    });

    // detach balloon?
    detachBalloon();

    shrapnelExplosion(data, { velocity: rnd(-10) });

    setFrameTimeout(() => {

      utils.css.swap(dom.o, css.exploding, css.burning);

      setFrameTimeout(() => {
        utils.css.swap(dom.o, css.burning, css.dead);
        // nothing else to do here - drop the node reference.
        dom.o = null;
      }, 10000);

    }, 1200);

    data.energy = 0;

    data.dead = true;

    if (sounds.explosionLarge) {
      playSound(sounds.crashAndGlass, exports);
      playSound(sounds.explosionLarge, exports);
    }

    if (options?.attacker?.data) {

      normalizedType = getNormalizedUnitName(options.attacker) || 'unit';

      if (options.attacker.data.isEnemy) {
        game.objects.notifications.add(`An enemy ${normalizedType} destroyed a bunker 💥`);
      } else {
        if ((options.attacker.data.parentType && options.attacker.data.parentType === TYPES.helicopter) || options.attacker.data.type === TYPES.helicopter) {
          game.objects.notifications.add('You destroyed a bunker 💥');
        } else {
          game.objects.notifications.add(`A friendly ${normalizedType} destroyed a bunker 💥`);
        }
      }
    }

    // check if enemy convoy production should stop or start
    checkProduction();

    radarItem.die();

  }

  function engineerHit(target) {

    // a friendly engineer unit has made contact with a bunker. repair damage, if any.
    if (target.data.isEnemy === data.isEnemy) {
      engineerRepair(target);
    }
   
  }

  function infantryHit(target) {

    // an infantry unit has made contact with a bunker.
    if (target.data.isEnemy === data.isEnemy) {

      // a friendly passer-by.
      repair();

    } else if (collisionCheckMidPoint(exports, target)) {

      // non-friendly, kill the infantry - but let them capture the bunker first.
      capture(target.data.isEnemy);
      target.die({ silent: true });

    }

  }

  function initBunker() {

    dom.o = makeSprite({
      className: css.className
    });

    dom.oSubSprite = makeSubSprite();

    dom.oSubSpriteArrow = makeSubSprite(css.arrow);

    dom.o.appendChild(dom.oSubSprite);
    dom.o.appendChild(dom.oSubSpriteArrow);

    if (data.isEnemy) {
      utils.css.add(dom.o, css.enemy);
    }

    // first time, create at random Y location.
    createBalloon(true);

    // note hackish Y-offset, sprite position vs. collision detection
    common.setTransformXY(exports, exports.dom.o, `${data.x}px`, `${data.y - 3}px`);

    data.midPoint = getDoorCoords(exports);

    radarItem = game.objects.radar.addItem(exports, dom.o.className);

  }

  options = options || {};

  css = common.inheritCSS({
    className: TYPES.bunker,
    arrow: 'arrow',
    burning: 'burning'
  });

  data = common.inheritData({
    type: TYPES.bunker,
    y: (game.objects.view.data.world.height - 25) + 1, // override to fix helicopter / bunker vertical crash case
    energy: 50,
    energyMax: 50,
    energyLineScale: 0.95,
    centerEnergyLine: true,
    width: 51,
    halfWidth: 25,
    height: 25,
    halfHeight: 12.5,
    midPoint: null
  }, options);

  dom = {
    o: null,
    oSubSprite: null,
    oSubSpriteArrow: null
  };

  objects = {
    balloon: null,
    chain: null,
    helicopter: null
  };

  exports = {
    capture,
    objects,
    data,
    die,
    dom,
    engineerHit,
    infantryHit,
    nullifyChain,
    nullifyBalloon,
    init: initBunker,
    repair
  };

  initBunker();

  return exports;

};

export { Bunker };