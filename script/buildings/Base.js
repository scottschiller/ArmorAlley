import { game } from '../core/Game.js';
import { gameType } from '../aa.js';
import {
  bananaMode,
  rubberChickenMode,
  defaultMissileMode,
  FPS,
  rnd,
  rndInt,
  tutorialMode,
  worldWidth,
  TYPES,
  rng
} from '../core/global.js';
import { playSound, stopSound, sounds } from '../core/sound.js';
import { playSequence } from '../core/sound-bnb.js';
import { gamePrefs } from '../UI/preferences.js';
import { common } from '../core/common.js';
import { enemyHelicopterNearby } from '../core/logic.js';
import { screenBoom } from '../UI/DomFetti.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';
import { net } from '../core/network.js';
import { campaignBattles, levelName } from '../levels/default.js';
import { utils } from '../core/utils.js';

const Base = (options = {}) => {
  let css, data, dom, exports, height, missileVMax, width;

  let counter = 0;
  const counterMax = 30;

  function fire() {
    let targetHelicopter;

    targetHelicopter = enemyHelicopterNearby(
      data,
      game.objects.view.data.browser.fractionWidth
    );

    if (!targetHelicopter) return;

    /**
     * Network shenanigans:
     * Only create these on the "local" target player's client, and send them to the remote.
     * This means one unique missile that is copied, vs. the base creating random different ones.
     * This also avoids lag / delay and keeps the game fair for the target helicopter.
     */

    const isLocalTarget = targetHelicopter.data.isLocal;

    const params = {
      parent: exports,
      parentType: data.type,
      isEnemy: data.isEnemy,
      isBanana: gamePrefs.alt_smart_missiles && data.missileMode === bananaMode,
      isRubberChicken:
        gamePrefs.alt_smart_missiles && data.missileMode === rubberChickenMode,
      // position roughly around "launcher" point of base
      x: data.x + data.width * (data.isEnemy ? 1 / 4 : 3 / 4),
      y: data.y,
      // hackish: these add to existing max vX / vY, they don't replace.
      vXMax: missileVMax,
      vYMax: missileVMax,
      target: targetHelicopter,
      onDie: onSmartMissileDie
    };

    if (!net.active) {
      // offline game, usual things

      game.addObject(TYPES.smartMissile, params);
    } else if (isLocalTarget) {
      // only create one missile on the "target" helicopter's side, and send it to the remote.

      const obj = game.addObject(TYPES.smartMissile, params);

      // note that this nullifies onDie(), intentionally.
      // local base will run logic, and whether more missiles are fired.
      net.sendMessage({
        type: 'ADD_OBJECT',
        objectType: obj.data.type,
        params: {
          ...params,
          id: obj.data.id,
          onDie: null,
          isBanana: obj.data.isBanana,
          isRubberChicken: obj.data.isRubberChicken,
          isSmartMissile: obj.data.isSmartMissile
        }
      });
    }
  }

  function onSmartMissileDie() {
    // extreme mode, human player at enemy base: spawn another immediately on die().
    if (gameType !== 'extreme') return;

    // check again, within a screen's distance.
    const targetHelicopter = enemyHelicopterNearby(
      data,
      game.objects.view.data.browser.width
    );

    // if not within range, reset vX + vY max for next time
    if (!targetHelicopter) {
      missileVMax = 0;
      return;
    }

    // re-load and fire ze missles, now more aggressive!
    missileVMax = Math.min(data.missileVMax, missileVMax + 1);

    common.setFrameTimeout(fire, 250 + rng(250, data.type));
  }

  function smallBoom(exports) {
    if (rnd(1) >= 0.75) {
      effects.domFetti(exports);
    }

    effects.shrapnelExplosion(exports.data, {
      count: 4 + rndInt(4),
      velocity: 5 + rndInt(10),
      // don't create identical "clouds" of smoke *at* base.
      noInitialSmoke: true
    });

    effects.smokeRing(exports, {
      offsetX: exports.data.width * 0.33 + rnd(exports.data.width * 0.33),
      offsetY: rnd(exports.data.height / 4),
      count: 3 + rndInt(3),
      velocityMax: 6 + rndInt(6),
      isGroundUnit: true,
      increaseDeceleration: Math.random() >= 0.5 ? 1 : undefined
    });

    if (Math.random() >= 0.75) {
      effects.inertGunfireExplosion({ exports, vX: 8, vY: 8 });
    }
  }

  function boom() {
    smallBoom(exports);

    // make a noise?
    if (sounds.genericExplosion) {
      playSound(sounds.genericExplosion, exports);
    }

    const localPlayer = game.players.local;

    if (!counter) {
      // initial big explosion at base
      for (let i = 0; i < 7; i++) {
        effects.shrapnelExplosion(data, {
          count: rndInt(64),
          velocity: 8 + rnd(8)
        });
      }
    } else {
      effects.shrapnelExplosion(data, {
        count: rndInt(16),
        velocity: 4 + rnd(8),
        // don't create identical "clouds" of smoke *at* base.
        noInitialSmoke: true
      });
    }

    counter++;

    if (counter >= counterMax) {
      playSequence(
        localPlayer.data.isEnemy !== data.isEnemy
          ? sounds.bnb.gameOverWin
          : sounds.bnb.gameOverLose
      );

      if (
        (tutorialMode || campaignBattles.includes(levelName)) &&
        !net.active
      ) {
        common.setFrameTimeout(() => {
          // as applicable, show a letter from "the old tanker."
          const didWin = localPlayer.data.isEnemy !== data.isEnemy;
          game.objects.envelope.show(didWin);
        }, 1500);
      }

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

          // domFetti feature
          screenBoom();

          for (i = 0; i < 7; i++) {
            effects.shrapnelExplosion(data, {
              count: rndInt(64),
              velocity: 8 + rnd(8),
              // don't create identical "clouds" of smoke *at* base.
              noInitialSmoke: true
            });
          }

          for (i = 0; i < 3; i++) {
            common.setFrameTimeout(() => {
              // first one is always big.
              const isBigBoom = !iteration || rnd(0.75);

              effects.smokeRing(exports, {
                velocityMax: 64,
                count: isBigBoom ? 8 : 2,
                offsetX: data.width * 0.25 + rnd(data.halfWidth),
                offsetY: data.height,
                isGroundUnit: true
              });
              iteration++;
            }, 10 * i);
          }

          effects.inertGunfireExplosion({
            exports,
            count: 32 + rndInt(32),
            vX: 2,
            vY: 2
          });

          // visually destroy the base.
          // TODO: big nuke like bunker?
          dom.oSubSpriteNuke = dom.o.appendChild(
            sprites.makeSubSprite(css.nuke)
          );
          utils.css.add(dom.o, 'burning');
        }, 25);
      }, 2500);
    } else {
      // big boom
      common.setFrameTimeout(boom, 100 + rndInt(100));
    }
  }

  function die() {
    if (data.dead) return;

    data.dead = true;

    const localPlayer = game.players.local;

    common.setFrameTimeout(
      () =>
        playSound(
          localPlayer.data.isEnemy !== data.isEnemy
            ? sounds.bnb.singing
            : sounds.bnb.beavisNoNoNoNooo,
          null,
          { volume: 85 }
        ),
      128
    );

    // slow down nicely, then move on toward the opposing base.
    game.objects.view.decelerateScroll();

    common.setFrameTimeout(battleOver, 1000);
  }

  function battleOver() {
    const override = true;
    let leftOffset;

    // bring the target base into view, and position slightly for the explosions
    if (data.isEnemy) {
      leftOffset = game.objects.view.data.battleField.width;
      // shift so there is room for shrapnel, etc.
      leftOffset -= game.objects.view.data.browser.width * 0.9;
    } else {
      leftOffset = -(game.objects.view.data.browser.width * 0.1);
    }

    const { scrollLeft } = game.objects.view.data.battleField;

    // take time to scroll relative to the distance needed to be traveled.
    const scrollDuration = Math.max(
      3,
      (Math.abs(scrollLeft - leftOffset) / worldWidth) * 12
    );

    game.objects.view.animateLeftScrollTo(
      leftOffset,
      override,
      scrollDuration,
      'quad'
    );

    // disable view + helicopter events?
    // TODO: make this a method; cleaner, etc.
    game.objects.view.data.ignoreMouseEvents = true;

    if (gamePrefs.gratuitous_battle_over) {
      const onScreenDieDelay = game.objects.view.data.browser.isPortrait
        ? FPS
        : FPS * 4;

      // start destroying all the losing team's stuff
      let delay = 0;
      [
        TYPES.bunker,
        TYPES.turret,
        TYPES.balloon,
        TYPES.tank,
        TYPES.missileLauncher,
        TYPES.van,
        TYPES.infantry,
        TYPES.engineer,
        TYPES.helicopter
      ].forEach((type) => {
        if (game.objects[type]) {
          game.objects[type].forEach((item) => {
            const onLosingSide = item.data.isEnemy === data.isEnemy;
            if (
              item !== game.players.local &&
              // bunkers always get trashed, because it's more fun that way.
              (onLosingSide ||
                item.data.hostile ||
                item.data.type === TYPES.bunker)
            ) {
              const { scrollLeft } = game.objects.view.data.battleField;
              // on-screen or "behind" the player (e.g., scrolling toward enemy base, but enemies are closer to our base behind us) = boom; otherwise, becoming on-screen = boom.
              if (
                item.data.isOnScreen ||
                (data.isEnemy && item.data.x < scrollLeft) ||
                (!data.isEnemy && item.data.x > scrollLeft)
              ) {
                delay += 128;
                common.setFrameTimeout(item.die, delay);
              } else {
                // hack: hijack this event, and blow everything up. ;)
                item.isOnScreenChange = (isOnScreen) => {
                  if (isOnScreen) {
                    common.setFrameTimeout(item.die, onScreenDieDelay);
                  }
                };
              }
            }
          });
        }
      });
    }

    document.getElementById('game-tips-list').innerHTML = '';

    // start base explosions a bit before the battlefield animation finishes
    common.setFrameTimeout(boom, scrollDuration * 1000 * 0.9);
  }

  function animate() {
    sprites.moveWithScrollOffset(exports);

    if (data.dead) return;

    if (data.frameCount % data.fireModulus === 0) {
      fire();
      data.frameCount = 0;
    }

    data.frameCount++;
  }

  function getRandomMissileMode() {
    if (!gamePrefs.alt_smart_missiles) return defaultMissileMode;

    // 20% chance of default, 40% chance of chickens or bananas
    const rnd = Math.random();

    if (rnd <= 0.2) return defaultMissileMode;
    if (rnd > 0.2 && rnd < 0.6) return rubberChickenMode;

    return bananaMode;
  }

  function isOnScreenChange(isOnScreen) {
    if (!isOnScreen) return;

    // allow base to switch up its defenses, if alternates are enabled
    if (!gamePrefs.alt_smart_missiles) return;

    data.missileMode = getRandomMissileMode();
  }

  function initBase() {
    dom.o = sprites.create({
      className: css.className,
      isEnemy: data.isEnemy ? css.enemy : false
    });

    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

    dom.o.appendChild(sprites.makeTransformSprite());

    game.objects.radar.addItem(exports, dom.o.className);
  }

  width = 125;
  height = 26;

  css = common.inheritCSS({
    className: 'base',
    nuke: 'nuke'
  });

  const fireModulus = tutorialMode ? FPS * 5 : FPS * 2;

  data = common.inheritData(
    {
      type: 'base',
      bottomAligned: true,
      dead: false,
      frameCount: 0,
      fireModulus,
      fireModulus1X: fireModulus,
      gameSpeedProps: ['fireModulus'],
      missileMode: defaultMissileMode,
      // left side, or right side (roughly)
      x: options.x || (options.isEnemy ? worldWidth - 192 : 64),
      y: game.objects.view.data.world.height - height - 2,
      width,
      height,
      halfWidth: width / 2,
      halfHeight: height / 2,
      // bases don't move, but these are for explosions.
      vX: 0,
      vY: 0,
      // allow missiles to become more dangerous "if necessary"
      missileVMax: 8
    },
    options
  );

  dom = {
    o: null,
    oSubSpriteNuke: null
  };

  exports = {
    animate,
    data,
    dom,
    die,
    init: initBase,
    isOnScreenChange
  };

  return exports;
};

export { Base };
