import { game, getObjectById } from '../core/Game.js';
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
  rng,
  isMobile,
  rngInt
} from '../core/global.js';
import { playSound, stopSound, sounds } from '../core/sound.js';
import { playSequence, resetBNBSoundQueue } from '../core/sound-bnb.js';
import { gamePrefs } from '../UI/preferences.js';
import { common } from '../core/common.js';
import { enemyHelicopterNearby } from '../core/logic.js';
import { screenBoom } from '../UI/DomFetti.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';
import { net } from '../core/network.js';
import { campaignBattles, levelName } from '../levels/default.js';
import { utils } from '../core/utils.js';

const hugeBoomDelay = 2500;
const lettermanDelay = 1500;
const counterMax = 30;

const width = 104;
const height = 26;

const Base = (options = {}) => {
  let data, domCanvas, exports;

  let counter = 0;

  const fireModulus = tutorialMode ? FPS * 5 : FPS * 2;

  data = common.inheritData(
    {
      type: 'base',
      bottomAligned: true,
      counter,
      canShowLetter: false,
      dead: false,
      didWin: false,
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
      domFetti: {
        colorType: options.isEnemy ? 'grey' : 'green',
        elementCount: 100 + rndInt(100),
        startVelocity: 15 + rndInt(30),
        spread: 180,
        decay: 0.95
      },
      timers: {}
    },
    options
  );

  domCanvas = {
    radarItem: Base.radarItemConfig()
  };

  exports = {
    animate: () => animate(exports),
    data,
    domCanvas,
    die: () => die(exports),
    fire: () => fire(exports),
    init: () => initBase(exports),
    isOnScreenChange: (isOnScreen) => isOnScreenChange(exports, isOnScreen),
    updateSprite: () => applySpriteURL(exports)
  };

  return exports;
};

function fire(exports) {
  let { data } = exports;

  let targetHelicopter;

  targetHelicopter = getObjectById(
    enemyHelicopterNearby(
      data,
      // standard base visibility?
      320
    )
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
    parent: data.id,
    parentType: data.type,
    isEnemy: data.isEnemy,
    isBanana: gamePrefs.alt_smart_missiles && data.missileMode === bananaMode,
    isRubberChicken:
      gamePrefs.alt_smart_missiles && data.missileMode === rubberChickenMode,
    // position roughly around "launcher" point of base
    x: data.x + data.width * (data.isEnemy ? 1 / 4 : 3 / 4),
    y: data.y,
    target: targetHelicopter.data.id,
    onDie: () => onSmartMissileDie(exports)
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

function onSmartMissileDie(exports) {
  // extreme mode, human player at enemy base: spawn another immediately on die().
  if (gameType !== 'extreme' && gameType !== 'armorgeddon') return;

  let { data } = exports;

  // check again, within a screen's distance.
  const targetHelicopter = getObjectById(
    enemyHelicopterNearby(
      data,
      // standard base visibility range?
      320
    )
  );

  if (!targetHelicopter) return;

  data.timers.fire = common.frameTimeout.set(
    'fire',
    250 + rngInt(250, data.type)
  );
}

function delayedNukeAndLetter(exports) {
  let { data } = exports;

  common.setFrameTimeout(() => nukeTheBase(exports), hugeBoomDelay);

  if (data.canShowLetter && data.didWin) {
    common.setFrameTimeout(() => {
      // as applicable, show a letter from "the old tanker."
      game.objects.envelope.show();
    }, lettermanDelay);
  }
}

function smallBoom(exports) {
  let { data } = exports;

  if (rnd(1) >= 0.66) {
    effects.domFetti(data.id);
  }

  effects.shrapnelExplosion(data, {
    count: 8 + rndInt(8),
    velocity: 5 + rndInt(12),
    // don't create identical "clouds" of smoke *at* base.
    noInitialSmoke: true
  });

  effects.smokeRing(data.id, {
    offsetX: data.width * 0.33 + rnd(data.width * 0.33),
    offsetY: rnd(data.height / 4),
    count: 5 + rndInt(5),
    velocityMax: 6 + rndInt(6),
    isGroundUnit: true,
    increaseDeceleration: Math.random() >= 0.5 ? 1 : undefined
  });

  if (Math.random() >= 0.75) {
    effects.inertGunfireExplosion({ exports, vX: 8, vY: 8 });
  }
}

function boom(exports) {
  let { data } = exports;

  smallBoom(exports);

  // make a noise?
  if (sounds.genericExplosion) {
    playSound(sounds.genericExplosion, exports);
  }

  if (!data.counter) {
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

  data.counter++;

  if (data.counter >= counterMax) {
    data.canShowLetter =
      (tutorialMode || campaignBattles.includes(levelName)) && !net.active;

    if (!data.didWin) {
      // final explosion sequence

      if (gamePrefs.bnb) {
        playSequence(sounds.bnb?.gameOverLose);
      }

      delayedNukeAndLetter(exports);
    } else {
      // hackish: reset the sound queue, a bunch of things may have piled up.
      // at this point, irrelevant because the battle is over.
      if (!gamePrefs.bnb) {
        delayedNukeAndLetter(exports);
        return;
      }

      resetBNBSoundQueue();

      playSound(sounds.bnb?.desertSceneGameOver, exports, {
        onplay: () => {
          game.objects.view.setAnnouncement(
            'Hey - you wanna see\nsomething really cool?<br />Huh huh huh, huh huh huh...',
            -1
          );

          // hack: hide the TV on desktop, and mobile in landscape.
          if (!isMobile || game.objects.view.data.browser.isLandscape) {
            utils.css.add(document.getElementById('tv-display'), 'disabled');
          }

          common.setVideo('bnb_desert_scene_really_cool');

          const boomString = '🤣💨🧨🔥';

          window.setTimeout(() => {
            game.objects.view.setAnnouncement(boomString, -1);
          }, 6750);

          // attempt to start the base nuke explosion at the "right" time in the video. ;)
          window.setTimeout(() => {
            nukeTheBase(exports);
            game.objects.view.setAnnouncement(
              boomString +
                '<br /><span class="no-emoji-substitution" style="display:inline">☢️</span>💥🤯',
              -1
            );
            window.setTimeout(() => {
              game.objects.view.setAnnouncement('🔥Firrrre!🔥<br />😝🤘', -1);
            }, 6500);
          }, 7500);
        },
        onfinish: () => {
          // queue post-win commentary
          playSequence(sounds.bnb?.gameOverWin);
          if (data.canShowLetter && data.didWin) {
            game.objects.envelope.show();
          }
        }
      });
    }
  } else {
    // big boom
    common.setFrameTimeout(() => boom(exports), 100 + rndInt(100));
  }
}

function nukeTheBase(exports) {
  let { data, domCanvas } = exports;

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
        count: rndInt(96),
        velocity: 8 + rnd(12),
        // don't create identical "clouds" of smoke *at* base.
        noInitialSmoke: true
      });
    }

    for (i = 0; i < 3; i++) {
      common.setFrameTimeout(() => {
        // first one is always big.
        const isBigBoom = !iteration || rnd(0.75);

        effects.smokeRing(data.id, {
          velocityMax: 64,
          count: isBigBoom ? 12 : 3,
          offsetX: data.width * 0.25 + rnd(data.halfWidth),
          offsetY: data.height,
          isGroundUnit: true
        });
        iteration++;
      }, 10 * i);
    }

    effects.inertGunfireExplosion({
      exports,
      count: 48 + rndInt(48),
      vX: 2,
      vY: 2
    });

    const burningConfig = (() => {
      const spriteWidth = 204;
      const spriteHeight = 32;
      const frameCount = 4;
      return {
        sprite: {
          url: 'base-burning_#.png',
          width: spriteWidth,
          height: spriteHeight * frameCount,
          frameWidth: spriteWidth,
          frameHeight: spriteHeight,
          animationDuration: 1.75,
          loop: true
        }
      };
    })();

    // replace the base sprite
    domCanvas.animation = common.domCanvas.canvasAnimation(
      exports,
      burningConfig
    );

    /**
     * Commercial, licensed asset - $1.99 USD.
     * https://infectedtribe.itch.io/pixel-explosion
     * 112 x 112 x 21 frames, 100 ms per frame. spritesheet dimensions: 2352 x 112
     * https://graphicriver.net/item/pixel-explosion-set/15457666
     */
    const nukeConfig = (() => {
      const spriteWidth = 2352;
      const spriteHeight = 112;
      return {
        overlay: true,
        scale: 2,
        sprite: {
          url: 'battlefield/standalone/infectedtribe_itch_io-pixel_explosion.png',
          width: spriteWidth,
          height: spriteHeight,
          frameWidth: spriteWidth / 21,
          frameHeight: spriteHeight,
          animationDuration: 0.75,
          horizontal: true
        }
      };
    })();

    // add the nuke overlay
    if (!game.objects.editor) {
      domCanvas.nukeAnimation = common.domCanvas.canvasAnimation(
        exports,
        nukeConfig
      );
    }

    data.shadowBlur = 32 * (gamePrefs.gfx_hi_dpi ? 2 : 1);
  }, 25);
}

function die(exports) {
  let { data } = exports;

  if (data.dead) return;

  data.dead = true;

  const localPlayer = game.players.local;

  data.didWin = localPlayer.data.isEnemy !== data.isEnemy;

  if (gamePrefs.bnb && sounds.bnb) {
    common.setFrameTimeout(
      () =>
        playSound(
          data.didWin ? sounds.bnb.singing : sounds.bnb.beavisNoNoNoNooo,
          null,
          { volume: 85 }
        ),
      128
    );
  }

  // slow down nicely, then move on toward the opposing base.
  game.objects.view.decelerateScroll();

  common.setFrameTimeout(() => battleOver(exports), 1000);
}

function battleOver(exports) {
  let { data } = exports;

  const override = true;
  let leftOffset;

  // if you lost, destroy your helicopter right away.
  if (game.players.local.data.isEnemy === data.isEnemy) {
    game.players.local.die();
  }

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
    (Math.abs(scrollLeft - leftOffset) / worldWidth) *
      (gamePrefs.gratuitous_battle_over ? 12 : 5)
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
  common.setFrameTimeout(() => boom(exports), scrollDuration * 1000 * 0.9);
}

function animate(exports) {
  let { data, domCanvas } = exports;

  sprites.draw(exports);

  domCanvas.animation?.animate();
  domCanvas.nukeAnimation?.animate();

  if (data.dead) return;

  if (data.frameCount % data.fireModulus === 0) {
    fire(exports);
    data.frameCount = 0;
  }

  data.frameCount++;
}

function getRandomMissileMode(exports) {
  if (!gamePrefs.alt_smart_missiles) return defaultMissileMode;

  let { data } = exports;

  // 20% chance of default, 40% chance of chickens or bananas
  const rnd = rng(1, data.type);

  if (rnd <= 0.2) return defaultMissileMode;
  if (rnd > 0.2 && rnd < 0.6) return rubberChickenMode;

  return bananaMode;
}

function isOnScreenChange(exports, isOnScreen) {
  if (!isOnScreen) return;

  let { data } = exports;

  // allow base to switch up its defenses, if alternates are enabled
  if (!gamePrefs.alt_smart_missiles) return;

  data.missileMode = getRandomMissileMode(exports);
}

function getSpriteURL(data) {
  // image = base + enemy + theme
  const fileName =
    gamePrefs.weather === 'snow'
      ? data.isEnemy
        ? 'snow/base-enemy-snow_#'
        : 'snow/base-snow_#'
      : data.isEnemy
        ? 'base-enemy_#'
        : 'base_#';
  return `${fileName}.png`;
}

function applySpriteURL(exports) {
  let { domCanvas } = exports;

  if (!domCanvas.animation) return;

  // maybe handle snow update
  refreshSprite(exports);
}

function refreshSprite(exports) {
  let { data, domCanvas } = exports;

  // only update snow / non-snow, live cases
  if (data.dead) return;

  // animation parameters differ between snow and non-snow
  const animConfig = (() => {
    const spriteWidth = 204;

    // hacks for non-spritesheet (snow) assets
    const isSnowing = gamePrefs.weather === 'snow';
    const spriteHeight = 50 * (isSnowing ? 0.5 : 1);

    const frameCount = 5;

    return {
      sprite: {
        url: getSpriteURL(data),
        width: spriteWidth,
        height: spriteHeight * frameCount,
        frameWidth: spriteWidth,
        frameHeight: spriteHeight,
        animationDuration: 2,
        frameCount,
        loop: true,
        alternate: true
      },
      // only upscale if snowing, using non-spritesheet asset
      scale: isSnowing ? 2 : 1
    };
  })();

  domCanvas.animation = common.domCanvas.canvasAnimation(exports, animConfig);
}

function initBase(exports) {
  common.initDOM(exports);
  refreshSprite(exports);
  exports.radarItem = game.objects.radar.addItem(exports);
}

Base.radarItemConfig = () => {
  return {
    width: 3,
    height: 4,
    draw: (ctx, obj, pos, width, height) => {
      ctx.ellipse(
        pos.left(obj.data.left),
        pos.bottomAlign(0),
        pos.width(width),
        height,
        0,
        0,
        Math.PI,
        true
      );
    }
  };
};

export { Base };
