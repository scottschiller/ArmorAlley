import {
  game,
  utils,
  bananaMode,
  rubberChickenMode,
  gameType,
  defaultMissileMode
} from '../aa.js';

import {
  FPS,
  rnd,
  rndInt,
  tutorialMode,
  worldWidth
} from '../core/global.js';

import {
  playSound,
  stopSound,
  sounds
} from '../core/sound.js';

import { gamePrefs } from '../UI/preferences.js';
import { common } from '../core/common.js';
import { enemyHelicopterNearby } from '../core/logic.js';
import { SmartMissile } from '../munitions/SmartMissile.js';

const Base = options => {

  let css, data, dom, exports, height, missileVMax;

  function fire() {

    let targetHelicopter;

    targetHelicopter = enemyHelicopterNearby(data, game.objects.view.data.browser.fractionWidth);

    if (!targetHelicopter) return;

    game.objects.smartMissiles.push(SmartMissile({
      parentType: data.type,
      isEnemy: data.isEnemy,
      isBanana: gamePrefs.enemy_missile_match_type && data.missileMode === bananaMode,
      isRubberChicken: data.missileMode === rubberChickenMode,
      // position roughly around "launcher" point of base
      x: data.x + (data.width * (data.isEnemy ? 1/4 : 3/4)),
      y: data.y,
      // hackish: these add to existing max vX / vY, they don't replace.
      vXMax: missileVMax,
      vYMax: missileVMax,
      target: targetHelicopter,
      onDie() {
        // extreme mode, human player at enemy base: spawn another immediately on die().
        if (gameType !== 'extreme') return;

        // check again, within a screen's distance.
        targetHelicopter = enemyHelicopterNearby(data, game.objects.view.data.browser.width);
        
        // if not within range, reset vX + vY max for next time
        if (!targetHelicopter) {
          missileVMax = 0;
          return;
        }

        // re-load and fire ze missles, now more aggressive!
        missileVMax = Math.min(data.missileVMax, missileVMax + 1);

        common.setFrameTimeout(fire, 250 + rnd(250));
      }
    }));

  }

  function die() {

    let counter = 0;
    const counterMax = 30;
    const overrideMax = true;
    let leftOffset;

    data.dead = true;

    // bring the target base into view, and position slightly for the explosions
    if (data.isEnemy) {
      leftOffset = game.objects.view.data.battleField.width;
      // shift so there is room for shrapnel, etc.
      leftOffset -= (game.objects.view.data.browser.width * 0.9);
    } else {
      leftOffset = -(game.objects.view.data.browser.width * 0.1);
    }

    game.objects.view.setLeftScroll(leftOffset, overrideMax);

    // disable view + helicopter events?
    // TODO: make this a method; cleaner, etc.
    game.objects.view.data.ignoreMouseEvents = true;

    function smallBoom(exports) {

      common.shrapnelExplosion(exports.data, {
        count: 5 + rndInt(5),
        velocity: 5 + rndInt(10),
        // don't create identical "clouds" of smoke *at* base.
        noInitialSmoke: true
      });

      common.smokeRing(exports, {
        offsetX: (exports.data.width * 0.33) + rnd(exports.data.width * 0.33),
        offsetY: rnd(exports.data.height / 4),
        count: 5 + rndInt(5),
        velocityMax: 6 + rndInt(6),
        isGroundUnit: true,
        increaseDeceleration: (Math.random() >= 0.5 ? 1 : undefined)
      });
      
    }

    function boom() {

      const endBunker = game.objects.endBunkers[data.isEnemy ? 1 : 0];

      // smaller explosions on both end bunker, and base (array offset)
      smallBoom(endBunker);
      smallBoom(exports);

      // make a noise?
      if (sounds.genericExplosion) {
        playSound(sounds.genericExplosion, exports);
      }

      counter++;

      if (counter >= counterMax) {

        // HUGE boom, why not.
        common.setFrameTimeout(() => {

          // ensure incoming missile is silenced
          if (sounds.missileWarning) {
            stopSound(sounds.missileWarning);
          }

          if (sounds.genericExplosion) {
            playSound(sounds.genericExplosion, exports);
            playSound(sounds.genericExplosion, exports);
            playSound(sounds.genericExplosion, exports);
          }

          if (sounds.baseExplosion) {
            playSound(sounds.baseExplosion, exports);
          }

          common.setFrameTimeout(() => {

            let i, iteration;
            iteration = 0;

            for (i = 0; i < 7; i++) {
              common.shrapnelExplosion(data, {
                count: rndInt(36) + rndInt(36),
                velocity: 8 + rnd(8),
                // don't create identical "clouds" of smoke *at* base.
                noInitialSmoke: true
              });
            }

            for (i = 0; i < 3; i++) {
              common.setFrameTimeout(() => {
                // first one is always big.
                const isBigBoom = (!iteration || rnd(0.75));

                common.smokeRing(exports, {
                  velocityMax: 64,
                  count: (isBigBoom ? 24 : 16),
                  offsetX: (data.width * 0.33) + rnd(data.width * 0.33),
                  offsetY: data.height,
                  isGroundUnit: true
                });
                iteration++;

              }, 10 * i);
            }

            smallBoom(endBunker);

            // hide the base, too - since it should be gone.
            if (dom && dom.o) {
              dom.o.style.display = 'none';
            }

            // end bunker, too.
            game.objects.endBunkers[data.isEnemy ? 1 : 0].dom.o.style.visibility = 'hidden';

          }, 25);

        }, 2500);

      } else {

        // big boom
        common.setFrameTimeout(boom, 100 + rndInt(100));

      }

    }

    document.getElementById('game-tips-list').innerHTML = '';

    boom();
  }

  function animate() {

    if (data.dead) return;

    if (data.frameCount % data.fireModulus === 0) {
      fire();
      data.frameCount = 0;
    }

    data.frameCount++;

  }

  function getRandomMissileMode() {

    // 20% chance of default, 40% chance of chickens or bananas
    const rnd = Math.random();

    if (rnd <= 0.2) return defaultMissileMode;
    if (rnd > 0.2 && rnd < 0.6) return rubberChickenMode;

    return bananaMode;

  }

  function isOnScreenChange(isOnScreen) {

    if (!isOnScreen) return;

    // allow base to switch up its defenses
    data.missileMode = getRandomMissileMode();

  }

  function initBase() {

    dom.o = common.makeSprite({
      className: css.className
    });

    if (data.isEnemy) {
      utils.css.add(dom.o, css.enemy);
    }

    common.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

    dom.oTransformSprite = common.makeTransformSprite();
    dom.o.appendChild(dom.oTransformSprite);

    game.objects.radar.addItem(exports, dom.o.className);

  }

  options = options || {};

  height = 25;

  css = common.inheritCSS({
    className: 'base'
  });

  data = common.inheritData({
    type: 'base',
    bottomAligned: true,
    dead: false,
    frameCount: 0,
    fireModulus: tutorialMode ? FPS * 5 : FPS * 2,
    missileMode: getRandomMissileMode(),
    // left side, or right side (roughly)
    x: (options.x || (options.isEnemy ? worldWidth - 192 : 64)),
    y: game.objects.view.data.world.height - height - 2,
    width: 125,
    height,
    halfWidth: 62,
    halfHeight: height / 2,
    // bases don't move, but these are for explosions.
    vX: 0,
    vY: 0,
    // allow missiles to become more dangerous "if necessary"
    missileVMax: 8,
  }, options);

  dom = {
    o: null,
    oTransformSprite: null,
  };

  exports = {
    animate,
    data,
    dom,
    die,
    isOnScreenChange
  };

  initBase();

  return exports;

};

export { Base };