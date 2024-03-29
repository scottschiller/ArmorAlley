import { game } from '../core/Game.js';
import {
  DEFAULT_FUNDS,
  TYPES,
  tutorialMode,
  worldWidth,
  FPS,
  getTypes,
  GAME_SPEED_RATIOED,
  ENEMY_COLOR
} from '../core/global.js';
import { gamePrefs } from '../UI/preferences.js';
import { collisionCheckMidPoint, nearbyTest } from '../core/logic.js';
import { playSound, sounds } from '../core/sound.js';
import { common } from '../core/common.js';
import { sprites } from '../core/sprites.js';
import { utils } from '../core/utils.js';

const slashPattern = new Image();
// slashPattern.src ='image/UI/checkerboard-white-mask-50percent.png'
slashPattern.src =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABAAQMAAACQp+OdAAAABlBMVEX///8AAABVwtN+AAAAAnRSTlN/AN40qAEAAAAVSURBVHgBYwiFAoZVUEC8yKjIqAgAdHP/Abts7zEAAAAASUVORK5CYII=';

let pattern;

const EndBunker = (options = {}) => {
  let css, dom, data, exports, height, nearby, objects, radarItem;

  function setFiring(state) {
    if (state && data.energy) {
      data.firing = state;
    } else {
      data.firing = false;
    }
  }

  function hit(points, target) {
    // only tank gunfire counts against end bunkers.
    if (
      target &&
      target.data.type === 'gunfire' &&
      target.data?.parentType === TYPES.tank
    ) {
      data.energy = Math.max(0, data.energy - points);
      sprites.updateEnergy(exports);
      onEnergyUpdate();
    }
  }

  function fire() {
    let fireOptions;

    if (
      !data.firing ||
      !data.energy ||
      data.frameCount % (data.fireModulus * (1 / GAME_SPEED_RATIOED)) !== 0
    )
      return;

    fireOptions = {
      parent: exports,
      parentType: data.type,
      isEnemy: data.isEnemy,
      collisionItems: nearby.items,
      x: data.x + (data.width + 1),
      y: data.y + data.gunYOffset, // half of height
      vX: 2,
      vY: 0
    };

    game.addObject(TYPES.gunfire, fireOptions);

    // other side
    fireOptions.x = data.x - 1;

    // and reverse direction
    fireOptions.vX = -2;

    game.addObject(TYPES.gunfire, fireOptions);

    if (sounds.genericGunFire) {
      playSound(sounds.genericGunFire, exports);
    }
  }

  function captureFunds(target) {
    let maxFunds, capturedFunds, allFunds, actor;

    // infantry only get to steal so much at a time.
    // because they're special, engineers get to rob the bank! 💰
    allFunds = !!target.data.role;
    maxFunds = allFunds
      ? game.objects[TYPES.endBunker][data.isEnemy ? 1 : 0].data.funds
      : 20;

    capturedFunds = Math.min(data.funds, maxFunds);

    // engineer + BnB case, vs.
    actor =
      gamePrefs.bnb && target.data.role
        ? target.data.isBeavis
          ? 'Beavis'
          : 'Butt-Head'
        : 'Your engineer';

    const isYourCapture = data.isEnemy !== game.players.local.data.isEnemy;

    if (!tutorialMode) {
      playSound(sounds.cashMoney);
      if (isYourCapture) {
        if (!capturedFunds) {
          game.objects.notifications.add(
            `🏦 🏴‍☠️ 🤷 ${actor} captured 0 enemy funds. 😒 Good effort, though.`
          );
        } else {
          if (allFunds) {
            game.objects.notifications.add(
              `🏦 🏴‍☠️ 💰 ${actor} captured all ${capturedFunds}${
                capturedFunds > 1 ? ' enemy funds! 🤑' : ' enemy fund. 😒'
              }`
            );
          } else {
            game.objects.notifications.add(
              `🏦 🏴‍☠️ 💸 ${capturedFunds} enemy ${
                capturedFunds > 1 ? ' funds' : ' fund'
              } captured! 💰`
            );
          }
          if (gamePrefs.bnb) {
            playSound(sounds.bnb.stolenFunds);
          }
        }
      } else {
        if (allFunds) {
          game.objects.notifications.add(
            '🏦 🏴‍☠️ 💸 An enemy engineer captured all your funds. 😱'
          );
        } else {
          game.objects.notifications.add(
            `🏦 🏴‍☠️ 💸 The enemy captured ${capturedFunds} of your funds. 😨`
          );
        }
      }
    }

    // who gets the loot?
    game.objects[TYPES.endBunker][data.isEnemy ? 0 : 1].data.funds +=
      capturedFunds;

    game.objects.view.updateFundsUI();

    data.funds -= capturedFunds;

    if (target) {
      target.die({ silent: true });
      playSound(sounds.doorClose, exports);
    }

    // force update of the local helicopter
    // TODO: yeah, this is a bit hackish.
    game.players.local.updateStatusUI({ funds: true });
  }

  function registerHelicopter(helicopter) {
    if (!objects.helicopters.includes(helicopter)) {
      objects.helicopters.push(helicopter);
    }
  }

  function distributeFunds() {
    if (game.objects.editor) return;

    let offset, earnedFunds;

    // note: end bunkers never die
    if (data.frameCount % (data.fundsModulus * FPS) !== 0) return;

    // edge case: tutorial mode, and no enemy chopper present yet
    if (!objects.helicopters.length) return;

    objects.helicopters.forEach((helicopter) => {
      // figure out what region the chopper is in, and award funds accordingly. closer to enemy space = more reward.
      if (data.isEnemy) {
        offset = 1 - helicopter.data.x / helicopter.data.x;
      } else {
        offset = helicopter.data.x / game.objects.view.data.battleField.width;
      }

      if (offset < 0.33) {
        earnedFunds = 1;
      } else if (offset >= 0.33 && offset < 0.66) {
        earnedFunds = 2;
      } else {
        earnedFunds = 3;
      }

      /**
       * TODO: co-op "joint banking" option.
       * Until then, only local players contribute funds.
       * Otherwise, you'd earn double on each human player's side.
       */
      if (helicopter.data.isLocal) {
        data.funds += earnedFunds;
      }

      if (helicopter.data.isLocal) {
        game.objects.notifications.add(
          `+${earnedFunds === 1 ? '💰' : `${earnedFunds} 💰`}`
        );
        game.objects.view.updateFundsUI();

        helicopter.updateStatusUI({ funds: true });
      }
    });
  }

  function animate() {
    sprites.moveWithScrollOffset(exports);

    data.frameCount++;

    nearbyTest(nearby, exports);

    fire();

    distributeFunds();

    // note: end bunkers never die, but leaving this in anyway.
    return data.dead && !dom.o;
  }

  function updateHealth(attacker) {
    // notify if just neutralized by tank gunfire
    onEnergyUpdate();
    if (data.energy) return;

    if (attacker?.data?.parentType !== TYPES.tank) return;

    // we have a tank, after all
    if (attacker.data.isEnemy !== game.players.local.data.isEnemy) {
      game.objects.notifications.addNoRepeat(
        'The enemy neutralized your end bunker 🚩'
      );
    } else {
      game.objects.notifications.addNoRepeat(
        "You neutralized the enemy's end bunker ⛳"
      );
    }
  }

  function onEnergyUpdate() {
    utils.css.addOrRemove(radarItem?.dom?.o, !data.energy, css.neutral);
  }

  function onNeutralHiddenChange(isVisible) {
    utils.css.addOrRemove(
      radarItem?.dom?.o,
      !data.energy && isVisible,
      css.neutral
    );
  }

  function getSpriteURL() {
    // image = base + enemy + theme
    const file = data.isEnemy ? 'end-bunker-enemy' : 'end-bunker';
    return gamePrefs.weather === 'snow'
      ? `snow/${file}_snow.png`
      : `${file}.png`;
  }

  function applySpriteURL() {
    if (!data.domCanvas.img) return;
    data.domCanvas.img.src = utils.image.getImageObject(getSpriteURL());
  }

  function initEndBunker() {
    if (game.objects.editor) {
      dom.o = sprites.create({
        className: css.className
      });
    } else {
      dom.o = {};
    }

    const src = getSpriteURL();

    const spriteWidth = 82;
    const spriteHeight = 38;

    const spriteConfig = {
      src: utils.image.getImageObject(src),
      source: {
        x: 0,
        y: 0,
        width: spriteWidth,
        height: spriteHeight
      },
      target: {
        width: spriteWidth / 2,
        height: spriteHeight / 2,
        // TODO: figure out cause of offset, and fix.
        yOffset: 2.5
      }
    };

    data.domCanvas.img = spriteConfig;

    // this will set x + y for domCanvas
    sprites.moveTo(exports, data.x, data.y);

    radarItem = game.objects.radar.addItem(exports);

    onEnergyUpdate();
  }

  height = 19;

  css = common.inheritCSS({
    className: TYPES.endBunker,
    neutral: 'neutral'
  });

  data = common.inheritData(
    {
      type: TYPES.endBunker,
      bottomAligned: true,
      frameCount: 0,
      energy: 0,
      energyMax: 10,
      x: options.x || (options.isEnemy ? worldWidth - 48 : 8),
      y: game.objects.view.data.world.height - height - 2,
      width: 39,
      halfWidth: 19,
      height,
      halfHeight: height / 2,
      doorWidth: 5,
      funds: DEFAULT_FUNDS,
      firing: false,
      gunYOffset: 10,
      fireModulus: 4,
      fundsModulus: 10,
      midPoint: null
    },
    options
  );

  data.midPoint = {
    x:
      data.x + data.halfWidth + (data.doorWidth / 2) * (!data.isEnemy ? 1 : -1),
    y: data.y,
    width: 5,
    height: data.height
  };

  dom = {
    o: null
  };

  objects = {
    helicopters: []
  };

  exports = {
    animate,
    data,
    dom,
    hit,
    init: initEndBunker,
    onNeutralHiddenChange,
    registerHelicopter,
    updateHealth,
    updateSprite: applySpriteURL
  };

  nearby = {
    options: {
      source: exports,
      targets: undefined,
      useLookAhead: true,
      // TODO: rename to something generic?
      hit(target) {
        const isFriendly = target.data.isEnemy === data.isEnemy;

        if (!isFriendly && data.energy) {
          // nearby enemy, and defenses activated? let 'em have it.
          setFiring(true);
        }

        // nearby infantry or engineer?
        if (target.data.type === TYPES.infantry) {
          if (!isFriendly) {
            // funds to steal, "at the door", AND, infantry - OR, an engineer who can rob the bank
            if (
              data.funds &&
              collisionCheckMidPoint(target, exports) &&
              (!target.data.role || gamePrefs.engineers_rob_the_bank)
            ) {
              captureFunds(target);
            }
          } else if (
            !target.data.role &&
            !data.energy &&
            isFriendly &&
            collisionCheckMidPoint(target, exports)
          ) {
            // infantry-only (role is not 1): end bunker presently isn't "staffed" / manned by infantry, guns are inoperable.
            // claim infantry, enable guns.
            data.energy = data.energyMax;
            sprites.updateEnergy(exports);
            onEnergyUpdate();
            // die silently.
            target.die({ silent: true });
            playSound(sounds.doorClose, exports);
          }
        }
      },
      miss() {
        setFiring(false);
      }
    },
    // who gets fired at?
    items: getTypes('infantry:all, engineers, helicopters', { exports }),
    targets: []
  };

  data.domCanvas = {
    radarItem: EndBunker.radarItemConfig()
  };

  return exports;
};

EndBunker.radarItemConfig = () => ({
  width: 8,
  height: 8,
  draw: (ctx, obj, pos, width, height) => {
    if (!obj.oParent?.data?.energy) {
      if (!pattern) {
        pattern = ctx.createPattern(slashPattern, 'repeat');
      }
      ctx.fillStyle = pattern;
    } else {
      ctx.fillStyle =
        !gamePrefs.super_bunker_arrows || obj.oParent?.data?.isEnemy
          ? ENEMY_COLOR
          : '#17a007';
    }
    ctx.roundRect(
      pos.left(obj.data.left),
      pos.bottomAlign(height / 4),
      width,
      height,
      width
    );
  }
});

export { EndBunker };
