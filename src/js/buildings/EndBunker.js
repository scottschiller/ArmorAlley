import { game, gameType, getObjectById } from '../core/Game.js';
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
import { levelNumber } from '../levels/default.js';

const slashPattern = new Image();
// slashPattern.src ='image/UI/checkerboard-white-mask-75percent.png'
slashPattern.src =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABAAQMAAACQp+OdAAAABlBMVEX///8AAABVwtN+AAAAAnRSTlO/ABXOf08AAAAVSURBVHgBYwiFAoZVUEC8yKjIqAgAdHP/Abts7zEAAAAASUVORK5CYII=';

let pattern;

// TODO: review use, scope and naming.
let height = 19;

const EndBunker = (options = {}) => {
  let exports;

  let domCanvas, data, objects;

  // CPU "discount" / price advantage on inventory costs
  let cpuBiasByGameType = {
    easy: 1,
    hard: 1.015,
    extreme: 1.03,
    armorgeddon: 1.06
  };

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
      fundsEarned: 0,
      fundsSpent: 0,
      fundsCaptured: 0,
      fundsLost: 0,
      fundsRefunded: 0,
      // give CPU an advantage via "discount" on ordering, so it can send out larger convoys up front on tougher battles.
      // up to 200% scale plus 12%, for Midnight Oasis on Armorgeddon where the enemy can afford the largest convoys up-front.
      fundsMultiplier:
        !options.isEnemy || tutorialMode
          ? 1
          : Math.max(1, ((levelNumber + 1) / 5) * cpuBiasByGameType[gameType]),
      moneyDistL: 0,
      firing: false,
      gunYOffset: 10,
      fireModulus: 3,
      fundsModulus: 5.5, // as in, every 5.5 seconds
      midPoint: null,
      xLookAhead: 24
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

  objects = {
    helicopters: [],
    leftHelicopterCount: 0,
    rightHelicopterCount: 0,
    leftHelicopter: null,
    rightHelicopter: null
  };

  domCanvas = {
    radarItem: EndBunker.radarItemConfig()
  };

  exports = {
    animate: () => animate(exports),
    data,
    domCanvas,
    hit: (points, target) => hit(exports, points, target),
    init: () => initEndBunker(exports),
    objects,
    registerHelicopter: (helicopter) => registerHelicopter(exports, helicopter),
    updateHealth: (attacker) => updateHealth(exports, attacker),
    updateSprite: () => applySpriteURL(exports)
  };

  exports.nearby = {
    options: {
      source: data.id,
      targets: undefined,
      useLookAhead: true,
      hit(targetID) {
        let target = getObjectById(targetID);
        const isFriendly = target.data.isEnemy === data.isEnemy;

        if (!isFriendly && data.energy) {
          // nearby enemy, and defenses activated? let 'em have it.
          setFiring(exports, true);
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
              captureFunds(exports, target);
              data.energy = 0;
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
            let isYours = data.isEnemy === game.players.local.data.isEnemy;
            // if funds were negative due to enemy capture, zero them out.
            if (data.funds < 0) {
              let msg = isYours
                ? 'You have recaptured your end bunker. ⛳'
                : 'The enemy has recaptured their end bunker. ⛳';
              game.objects.notifications.add(msg);
              game.objects.view.setAnnouncement(msg);
            }
            data.funds = Math.max(0, data.funds);
            if (isYours) {
              game.objects.view.updateFundsUI();
              // force update of local funds counter
              game.objects.funds.setFunds(data.funds);
            }
            sprites.updateEnergy(data.id);
            // die silently.
            target.die({ silent: true });
            playSound(sounds.doorClose, exports);
          }
        }
      },
      miss() {
        setFiring(exports, false);
      }
    },
    // who gets fired at (and for friendly infantry, who can enter the door.)
    items: getTypes('infantry:all, engineer, missileLauncher, helicopter', {
      exports
    }),
    targets: []
  };

  return exports;
};

function setFiring(exports, state) {
  let { data } = exports;

  if (state && data.energy) {
    data.firing = state;
  } else {
    data.firing = false;
  }
}

function hit(exports, points, target) {
  let { data } = exports;

  // only tank gunfire counts against end bunkers.
  if (
    target &&
    target.data.type === 'gunfire' &&
    target.data?.parentType === TYPES.tank
  ) {
    data.energy = Math.max(0, data.energy - points);
    sprites.updateEnergy(data.id);
  }
}

function fire(exports) {
  let { data, nearby } = exports;

  let fireOptions;

  if (
    !data.firing ||
    !data.energy ||
    data.frameCount % (data.fireModulus * (1 / GAME_SPEED_RATIOED)) !== 0
  )
    return;

  fireOptions = {
    parent: data.id,
    parentType: data.type,
    isEnemy: data.isEnemy,
    collisionItems: nearby.items,
    x: data.x + (data.width + 1),
    y: data.y + data.gunYOffset, // half of height
    vX: 2,
    vY: 0,
    damagePoints: 5
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

function captureFunds(exports, target) {
  if (game.data.battleOver) return;

  let { data } = exports;

  let capturedFunds, allFunds, actor;

  // infantry only get to steal so much at a time.
  // because they're special, engineers may be able to steal all funds. 💰
  allFunds = target.data.role && gamePrefs.engineers_rob_the_bank;

  let endBunkers = game.objects[TYPES.endBunker];

  // who gets the loot?
  let beneficiary = endBunkers[target.data.isEnemy ? 1 : 0];

  // 100% or 50% of available funds, if > 0.
  capturedFunds = parseInt(
    Math.max(0, allFunds ? data.funds : data.funds >> 1),
    10
  );

  // track how much was stolen from local player, before going negative.
  data.fundsLost += parseInt(data.funds, 10);

  // once captured, now in the hole financially.
  // this can be reset by recapturing the bunker, OR earning 25 funds.
  data.funds = -25;

  // engineer + BnB case, vs.
  if (target.data.role) {
    actor = gamePrefs.bnb
      ? target.data.isBeavis
        ? 'Beavis'
        : 'Butt-Head'
      : 'Your engineer';
  } else {
    actor = 'Your infantry';
  }

  const isYourCapture = data.isEnemy !== game.players.local.data.isEnemy;

  if (!tutorialMode) {
    let msg;
    if (isYourCapture) {
      if (!capturedFunds) {
        game.objects.notifications.add(`🏦 ${actor} found no enemy funds. 🤷`);
      } else {
        if (allFunds) {
          msg = `🏦 💰 ${actor} captured all ${capturedFunds}${
            capturedFunds > 1 ? ' enemy funds! 🤑' : ' enemy fund. 😒'
          }`;
        } else {
          msg = `🏦 💸 ${capturedFunds} enemy ${
            capturedFunds > 1 ? ' funds' : ' fund'
          } captured! 💰`;
        }

        if (gamePrefs.bnb) {
          playSound(sounds.bnb.stolenFunds);
        }
      }
      if (msg) {
        game.objects.view.setAnnouncement(msg);
        game.objects.notifications.add(msg);
      }
    } else {
      msg = `The enemy captured your funds. 💸 😱<br />Recover your end bunker to reset funds.`;
      let msgDelay = 8000;
      game.objects.view.setAnnouncement(msg, msgDelay);
      game.objects.notifications.add(msg);
    }
  }

  // who gets the loot?

  beneficiary.data.funds += capturedFunds;
  beneficiary.data.fundsCaptured += capturedFunds;

  game.objects.view.updateFundsUI();

  if (target) {
    target.die({ silent: true });
    playSound(sounds.doorClose, exports);
    if (capturedFunds) {
      playSound(sounds.cashMoney);
    }
  }

  // force update of the local helicopter
  // TODO: yeah, this is a bit hackish.
  game.players.local.updateStatusUI({ funds: true });
}

function registerHelicopter(exports, helicopter) {
  let { objects } = exports;

  if (!objects.helicopters.includes(helicopter.data.id)) {
    // track all choppers
    objects.helicopters.push(helicopter.data.id);

    // count, and mark the first R/L we get for funds purposes
    if (helicopter.data.isEnemy) {
      objects.rightHelicopterCount++;
      if (!objects.helicopters.right) {
        objects.helicopters.right = helicopter.data.id;
      }
    } else {
      objects.leftHelicopterCount++;
      if (!objects.helicopters.left) {
        objects.helicopters.left = helicopter.data.id;
      }
    }
  }
}

function distributeFunds(exports) {
  if (game.objects.editor || game.data.battleOver) return;

  let { data, objects } = exports;

  // TODO: handle multiple players / shared banking / ??? later.

  // 2x for 60 FPS
  let interval = Math.floor(
    data.fundsModulus * FPS * (FPS / 30) * GAME_SPEED_RATIOED
  );

  let helicopter = getObjectById(
    objects.helicopters[data.isEnemy ? 'right' : 'left']
  );

  // if no helicopter (e.g., tutorial and enemy isn't present yet), bail.
  if (!helicopter) return;

  let chopperX = helicopter.data.x;

  /**
   * Based on original: add helicopter "distance" every frame,
   * then some math at an interval to determine if funds are earned.
   */
  data.moneyDistL += data.isEnemy ? worldWidth - chopperX : chopperX;

  if (data.frameCount % interval !== 0) return;

  let teamChopperCount = data.isEnemy
    ? objects.rightHelicopterCount
    : objects.leftHelicopterCount;

  // based on original: 8192 x 32 ulGameClock ticks
  let unitL = worldWidth * interval;

  // practice mode logic: cut the "distance traveled" requirement "in half, doubling(?) the funds earned rate.
  // unitL = theGame.practiceB && theTP->humanB ? MONEYDIST/2 : MONEYDIST;
  // AA version: unitL = worldWidth * interval * (practiceMode ? 0.5 : 1)

  // no funds earned
  if (data.moneyDistL <= unitL) return;

  let amt =
    unitL <<
    Math.min(
      (Math.max(0, data.funds) / 20 + teamChopperCount) >>
        (gameType === 'easy' || tutorialMode ? 4 : gameType === 'hard' ? 3 : 2),
      4
    );

  data.moneyDistL -= amt;

  /**
   * TODO: co-op "joint banking" option.
   * Until then, only local players contribute funds.
   * Otherwise, you'd earn double on each human player's side.
   */
  if (helicopter.data.isLocal) {
    data.funds++;
    data.fundsEarned++;
    game.objects.view.updateFundsUI();
    helicopter.updateStatusUI({ funds: true });
  } else if (helicopter.data.isCPU) {
    // TODO: does this need any special handling for network games? :X
    data.funds++;
    data.fundsEarned++;
  }
}

function animate(exports) {
  let { data, nearby } = exports;

  sprites.draw(exports);

  data.frameCount++;

  nearbyTest(nearby, exports);

  fire(exports);

  distributeFunds(exports);

  // note: end bunkers never die, but leaving this in anyway.
  return data.dead && data.canDestroy;
}

function updateHealth(exports, attacker) {
  let { data } = exports;

  if (data.energy) return;

  let oAttacker = getObjectById(attacker);

  if (oAttacker?.data?.parentType !== TYPES.tank) return;

  // we have a tank, after all
  if (oAttacker.data.isEnemy !== game.players.local.data.isEnemy) {
    game.objects.notifications.addNoRepeat(
      'The enemy neutralized your end bunker 🚩'
    );
  } else {
    game.objects.notifications.addNoRepeat(
      "You neutralized the enemy's end bunker ⛳"
    );
  }
}

function getSpriteURL(data) {
  // image = base + enemy + theme
  const file = data.isEnemy ? 'end-bunker-enemy' : 'end-bunker';
  return gamePrefs.weather === 'snow' ? `snow/${file}_snow.png` : `${file}.png`;
}

function applySpriteURL(exports) {
  let { data, domCanvas } = exports;

  if (!domCanvas.img) return;
  domCanvas.img.src = utils.image.getImageObject(getSpriteURL(data));
}

function initEndBunker(exports) {
  let { data, domCanvas } = exports;

  const src = getSpriteURL(data);

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

  domCanvas.img = spriteConfig;

  common.initDOM(exports);

  exports.radarItem = game.objects.radar.addItem(exports);
}

EndBunker.radarItemConfig = () => ({
  width: 8,
  height: 8,
  draw: (ctx, obj, pos, width, height) => {
    if (!game.objectsById[obj.oParent]?.data?.energy) {
      if (!pattern) {
        pattern = ctx.createPattern(slashPattern, 'repeat');
      }
      ctx.fillStyle = pattern;
    } else {
      ctx.fillStyle =
        !gamePrefs.super_bunker_arrows ||
        game.objectsById[obj.oParent]?.data?.isEnemy
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
