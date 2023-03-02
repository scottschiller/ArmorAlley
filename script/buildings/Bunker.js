import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { rndInt, rnd, TYPES } from '../core/global.js';
import { collisionCheckMidPoint, checkProduction } from '../core/logic.js';
import { playSound, playSoundWithDelay, sounds } from '../core/sound.js';
import { Balloon } from '../elements/Balloon.js';
import { Chain } from '../elements/Chain.js';
import { zones } from '../core/zones.js';

const Bunker = (options = {}) => {

  let css, data, dom, objects, radarItem, exports;

  function createBalloon(useRandomY) {

    if (!objects.balloon) {

      objects.balloon = Balloon({
        bunker: exports,
        leftMargin: 8,
        isEnemy: data.isEnemy,
        x: data.x,
        y: (useRandomY ? undefined : common.bottomAlignedY(-data.height))
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

      // first time capture (of original bunker state) vs. taking back from the enemy
      if (!data.isRecapture) {
        game.objects.notifications.add('You captured a bunker ⛳');
        data.isRecapture = true;
      } else {
        game.objects.notifications.add('You recaptured a bunker ⛳');
      }

      playSoundWithDelay(sounds.friendlyClaim, exports, 500);

    }

    data.isEnemy = isEnemy;

    zones.changeOwnership(exports);

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

    common.updateEnergy(exports);

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

  function die() {

    if (data.dead) return;

    utils.css.add(dom.o, css.exploding);

    common.inertGunfireExplosion({ exports, count: 8 + rndInt(8) });

    common.smokeRing(exports, {
      count: 24,
      velocityMax: 16,
      offsetY: data.height - 2,
      isGroundUnit: true
    });

    detachBalloon();

    common.shrapnelExplosion(data, { velocity: rnd(-10) });

    common.setFrameTimeout(() => {

      utils.css.swap(dom.o, css.exploding, css.burning);

      common.setFrameTimeout(() => {
        utils.css.swap(dom.o, css.burning, css.dead);
      }, 10000);

    }, 1200);

    data.energy = 0;

    data.dead = true;

    if (sounds.explosionLarge) {
      playSound(sounds.crashAndGlass, exports);
      playSound(sounds.explosionLarge, exports);
    }

    // check if enemy convoy production should stop or start
    checkProduction();

    radarItem.die();

  }

  function animate() {

    common.moveWithScrollOffset(exports);

  }

  function engineerHit(target) {

    // a friendly engineer unit has made contact with a bunker. repair damage when at the door, if any.
    if (target.data.isEnemy === data.isEnemy && collisionCheckMidPoint(exports, target)) {
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

  function initDOM() {

    dom.o = common.makeSprite({
      className: css.className,
      isEnemy: (data.isEnemy ? css.enemy : false)
    });

    dom.o.appendChild(common.makeSubSprite());
    dom.o.appendChild(common.makeSubSprite(css.arrow));

    data.oClassName = dom.o.className;

    // note hackish Y-offset, sprite position vs. collision detection
    common.setTransformXY(exports, exports.dom.o, `${data.x}px`, `${data.y - 3}px`);

  }

  function initBunker() {

    initDOM();

    // first time, create at random Y location.
    createBalloon(true);

    data.midPoint = common.getDoorCoords(exports);

    radarItem = game.objects.radar.addItem(exports, data.oClassName);

  }

  css = common.inheritCSS({
    className: TYPES.bunker,
    arrow: 'arrow',
    burning: 'burning'
  });

  data = common.inheritData({
    type: TYPES.bunker,
    y: (game.objects.view.data.world.height - 25) - 2, // override to fix helicopter / bunker vertical crash case
    energy: 50,
    energyMax: 50,
    energyLineScale: 0.95,
    centerEnergyLine: true,
    isRecapture: false,
    width: 51,
    halfWidth: 25,
    height: 25,
    halfHeight: 12.5,
    midPoint: null
  }, options);

  dom = {
    o: null
  };

  objects = {
    balloon: null,
    chain: null,
    helicopter: null
  };

  exports = {
    animate,
    capture,
    objects,
    data,
    die,
    dom,
    engineerHit,
    infantryHit,
    initDOM,
    nullifyChain,
    nullifyBalloon,
    init: initBunker,
    repair
  };

  initBunker();

  return exports;

};

export { Bunker };