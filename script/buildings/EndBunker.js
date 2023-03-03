import { game } from '../core/Game.js';
import { DEFAULT_FUNDS, TYPES, tutorialMode, debug, worldWidth, FPS, getTypes } from '../core/global.js';
import { gamePrefs } from '../UI/preferences.js';
import { collisionCheckMidPoint, nearbyTest } from '../core/logic.js';
import { playSound, sounds } from '../core/sound.js';
import { common } from '../core/common.js';
import { GunFire } from '../munitions/GunFire.js';
import { sprites } from '../core/sprites.js';

const EndBunker = (options = {}) => {

  let css, dom, data, height, objects, nearby, exports;

  function setFiring(state) {

    if (state && data.energy) {
      data.firing = state;
    } else {
      data.firing = false;
    }

  }

  function hit(points, target) {

    // only tank gunfire counts against end bunkers.
    if (target && target.data.type === 'gunfire' && target.data?.parentType === TYPES.tank) {
      data.energy = Math.max(0, data.energy - points);
      sprites.updateEnergy(exports);
    }

  }

  function fire() {

    let fireOptions;

    if (!data.firing || !data.energy || data.frameCount % data.fireModulus !== 0) return;

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
    fireOptions.x = (data.x - 1);

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
    maxFunds = allFunds ? game.objects[TYPES.endBunker][data.isEnemy ? 1 : 0].data.funds : 20;

    capturedFunds = Math.min(data.funds, maxFunds);

    // engineer + BnB case, vs. 
    actor = gamePrefs.bnb && target.data.role ? (target.data.isBeavis ? 'Beavis' : 'Butt-Head') : 'Your engineer';

    if (!tutorialMode) {
      if (data.isEnemy) {
        if (!capturedFunds) {
          game.objects.notifications.add(`🏦 🏴‍☠️ 🤷 ${actor} captured 0 enemy funds. 😒 Good effort, though.`);
        } else {
          if (allFunds) {
            game.objects.notifications.add(`🏦 🏴‍☠️ 💰 ${actor} captured all ${capturedFunds}${capturedFunds > 1 ? ' enemy funds! 🤑' : ' enemy fund. 😒'}`);
          } else {
            game.objects.notifications.add(`🏦 🏴‍☠️ 💸 ${capturedFunds} enemy ${capturedFunds > 1 ? ' funds' : ' fund'} captured! 💰`);
          }
          playSound(sounds.bnb.money);
        }
      } else {
        if (allFunds) {
          game.objects.notifications.add('🏦 🏴‍☠️ 💸 The enemy\'s engineer captured all of your funds. 😱');
        } else {
          game.objects.notifications.add(`🏦 🏴‍☠️ 💸 The enemy captured ${capturedFunds} of your funds. 😨`);
        }
      }
    }

    // who gets the loot?
    if (data.isEnemy) {
      // local player
      game.objects[TYPES.endBunker][0].data.funds += capturedFunds;
      game.objects.view.updateFundsUI();
    } else {
      // CPU
      game.objects[TYPES.endBunker][1].data.funds += capturedFunds;
    }

    data.funds -= capturedFunds;

    if (target) {
      target.die({ silent: true });
      playSound(sounds.doorClose, exports);
    }

    // force update of the local helicopter
    // TODO: yeah, this is a bit hackish.
    game.objects.helicopter[0].updateStatusUI({ funds: true});

  }

  function animate() {

    let offset, earnedFunds;

    sprites.moveWithScrollOffset(exports);

    data.frameCount++;

    nearbyTest(nearby, exports);

    fire();

    // note: end bunkers never die
    if (data.frameCount % data.fundsModulus !== 0) return;

    if (!objects.helicopter) {
      objects.helicopter = game.objects.helicopter[(data.isEnemy ? 1 : 0)];
    }

    // edge case: tutorial mode, and no enemy chopper present yet
    if (!objects.helicopter) {
      return false;
    }

    // figure out what region the chopper is in, and award funds accordingly. closer to enemy space = more reward.
    offset = objects.helicopter.data.x / game.objects.view.data.battleField.width;

    if (data.isEnemy) {
      offset = 1 - (objects.helicopter.data.x / objects.helicopter.data.x);
    }

    if (offset < 0.33) {
      earnedFunds = 1;
    } else if (offset >= 0.33 && offset < 0.66) {
      earnedFunds = 2;
    } else {
      earnedFunds = 3;
    }

    data.funds += earnedFunds;

    if (data.isEnemy) {
      if (debug) console.log(`the enemy now has ${data.funds} funds.`);
    } else {

      game.objects.notifications.add(`+${earnedFunds === 1 ? '💰' : `${earnedFunds} 💰`}`);
      game.objects.view.updateFundsUI();
    }

    objects.helicopter.updateStatusUI({ funds: true });

    // note: end bunkers never die, but leaving this in anyway.
    return (data.dead && !dom.o);

  }

  function updateHealth(attacker) {

    // notify if just neutralized by tank gunfire
    if (data.energy) return;

    if (!attacker || attacker.data.type !== TYPES.gunfire || attacker.data?.parentType !== TYPES.tank) return;

    // we have a tank, after all
    if (attacker.data.isEnemy) {
      game.objects.notifications.addNoRepeat('The enemy neutralized your end bunker 🚩');
    } else {
      game.objects.notifications.addNoRepeat('You neutralized the enemy\'s end bunker ⛳');
    }

  }

  function initEndBunker() {

    dom.o = sprites.create({
      className: css.className,
      isEnemy: (data.isEnemy ? css.enemy : false)
    });

    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

    game.objects.radar.addItem(exports, dom.o.className);

  }

  height = 19;

  css = common.inheritCSS({
    className: TYPES.endBunker
  });

  data = common.inheritData({
    type: TYPES.endBunker,
    bottomAligned: true,
    frameCount: 0,
    energy: 0,
    energyMax: 10,
    x: (options.x || (options.isEnemy ? worldWidth - 48 : 8)),
    y: game.objects.view.data.world.height - height - 2,
    width: 39,
    halfWidth: 19,
    height,
    halfHeight: height / 2,
    funds: (!options.isEnemy ? DEFAULT_FUNDS : 0),
    firing: false,
    gunYOffset: 10,
    fireModulus: 4,
    fundsModulus: FPS * 10,
    midPoint: null
  }, options);

  data.midPoint = {
    x: data.x + data.halfWidth + 5,
    y: data.y,
    width: 5,
    height: data.height
  };

  dom = {
    o: null
  };

  objects = {
    helicopter: null
  };

  exports = {
    animate,
    data,
    dom,
    hit,
    init: initEndBunker,
    updateHealth
  };

  nearby = {
    options: {
      source: exports,
      targets: undefined,
      useLookAhead: true,
      // TODO: rename to something generic?
      hit(target) {
        const isFriendly = (target.data.isEnemy === data.isEnemy);

        if (!isFriendly && data.energy) {
          // nearby enemy, and defenses activated? let 'em have it.
          setFiring(true);
        }

        // nearby infantry or engineer?
        if (target.data.type === TYPES.infantry) {
          if (!isFriendly) {
            // funds to steal, "at the door", AND, infantry - OR, an engineer who can rob the bank
            if (data.funds && collisionCheckMidPoint(target, exports) && (!target.data.role || gamePrefs.engineers_rob_the_bank)) {
              captureFunds(target);
            }
          } else if (!target.data.role && !data.energy && isFriendly && collisionCheckMidPoint(target, exports)) {
            // infantry-only (role is not 1): end bunker presently isn't "staffed" / manned by infantry, guns are inoperable.
            // claim infantry, enable guns.
            data.energy = data.energyMax;
            sprites.updateEnergy(exports);
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
    items: getTypes('infantry, engineers, helicopters', { exports }),
    targets: []
  };

  return exports;

};

export { EndBunker };