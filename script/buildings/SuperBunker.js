import {
  common,
  game,
  inheritData,
  inheritCSS,
  utils,
  makeSprite,
  TYPES,
  updateEnergy,
  nearbyTest,
  FPS,
  collisionCheckMidPoint,
  checkProduction
} from '../aa.js';

import {
  playSound,
  playSoundWithDelay,
  sounds
} from '../core/sound.js';

import { GunFire } from '../munitions/GunFire.js';

const SuperBunker = options => {

  let css, dom, data, height, nearby, radarItem, exports;

  function updateFireModulus() {

    // firing speed increases with # of infantry
    data.fireModulus = 8 - data.energy;

  }

  function capture(isEnemy) {

    if (isEnemy && !data.isEnemy) {

      data.isEnemy = true;

      utils.css.remove(radarItem.dom.o, css.friendly);
      utils.css.add(radarItem.dom.o, css.enemy);

      game.objects.notifications.add('The enemy captured a super bunker 🚩');

      playSoundWithDelay(sounds.enemyClaim, exports, 500);

    } else if (!isEnemy && data.isEnemy) {

      data.isEnemy = false;

      utils.css.remove(radarItem.dom.o, css.enemy);
      utils.css.add(radarItem.dom.o, css.friendly);

      game.objects.notifications.add('You captured a super bunker ⛳');

      playSoundWithDelay(sounds.friendlyClaim, exports, 500);

    }

    // check if enemy convoy production should stop or start
    checkProduction();

  }

  function setFiring(state) {

    if (state && data.energy) {
      data.firing = state;
    } else {
      data.firing = false;
    }

  }

  function updateHealth(attacker) {

    // notify if just disarmed by tank gunfire
    // note: the super bunker has not become friendly to the tank; it's still "dangerous", but unarmed and won't fire at incoming units.
    if (data.energy) return;

    if (!attacker || attacker.data.type !== TYPES.gunfire || !attacker.data?.parentType !== TYPES.tank) return;

    // we have a tank, after all
    if (attacker.data.isEnemy) {
      game.objects.notifications.addNoRepeat('An enemy tank disarmed a super bunker 🚩');
    } else {
      game.objects.notifications.addNoRepeat('A friendly tank disarmed a super bunker ⛳');
    }

  }

  function hit(points, target) {
    // only tank gunfire counts against super bunkers.
    if (target && target.data.type === 'gunfire' && target.data?.parentType === TYPES.tank) {
      data.energy = Math.max(0, data.energy - points);
      updateFireModulus();
      updateEnergy(exports);
    }
  }

  function die() {

    if (data.dead) return;

    // gunfire from both sides should now hit this element.

    data.energy = 0;
    updateFireModulus();

    // this object, in fact, never actually dies because it only becomes neutral/hostile and can still be hit.
    data.dead = false;

    data.hostile = true;

    // ensure the radar shows this, too
    utils.css.remove(radarItem.dom.o, css.friendly);
    utils.css.add(radarItem.dom.o, css.enemy);

    updateEnergy(exports);

    // check if enemy convoy production should stop or start
    checkProduction();

  }

  function fire() {

    let fireOptions;

    if (!data.firing || !data.energy || data.frameCount % data.fireModulus !== 0) return;

    fireOptions = {
      parentType: data.type,
      isEnemy: data.isEnemy,
      collisionItems: nearby.items,
      x: data.x + (data.width + 1),
      y: data.y + data.gunYOffset, // position of bunker gun
      vX: 2,
      vY: 0
    };

    game.objects.gunfire.push(GunFire(fireOptions));

    // other side
    fireOptions.x = (data.x - 1);

    // and reverse direction
    fireOptions.vX *= -1;

    game.objects.gunfire.push(GunFire(fireOptions));

    if (sounds.genericGunFire) {
      playSound(sounds.genericGunFire, exports);
    }

  }

  function animate() {

    data.frameCount++;

    // start, or stop firing?
    nearbyTest(nearby);

    fire();

    // note: super bunkers never die, but leaving this in anyway.
    return (!dom.o);

  }

  function initSuperBunker() {

    dom.o = makeSprite({
      className: css.className
    });

    if (data.isEnemy) {
      utils.css.add(dom.o, css.enemy);
    }

    common.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

    radarItem = game.objects.radar.addItem(exports, dom.o.className);

  }

  options = options || {};

  height = 28;

  css = inheritCSS({
    className: TYPES.superBunker,
    friendly: 'friendly'
  });

  data = inheritData({
    type: TYPES.superBunker,
    bottomAligned: true,
    frameCount: 0,
    energy: (options.energy || 0),
    energyMax: 5, // note: +/- depending on friendly vs. enemy infantry
    energyLineScale: 0.95,
    centerEnergyLine: true,
    isEnemy: (options.isEnemy || false),
    width: 66,
    halfWidth: 33,
    doorWidth: 6,
    height,
    firing: false,
    gunYOffset: 20.5,
    // fire speed relative to # of infantry arming it
    fireModulus: 8 - (options.energy || 0),
    fundsModulus: FPS * 10,
    hostile: false,
    midPoint: null,
    y: game.objects.view.data.world.height - height
  }, options);

  if (data.energy === 0) {
    // initially neutral/hostile only if 0 energy
    data.hostile = true;
  }

  // coordinates of the doorway
  data.midPoint = {
    x: data.x + data.halfWidth - (data.doorWidth / 2),
    y: data.y,
    // hackish: make the collision point the center, not the actual width
    width: 1,
    height: data.height
  };

  dom = {
    o: null
  };

  exports = {
    animate,
    capture,
    data,
    die,
    dom,
    hit,
    updateHealth
  };

  nearby = {

    options: {

      source: exports, // initially undefined
      targets: undefined,
      useLookAhead: true,

      hit(target) {

        const isFriendly = (target.data.isEnemy === data.isEnemy);

        if (!isFriendly && data.energy > 0) {
          // nearby enemy, and defenses activated? let 'em have it.
          setFiring(true);
        }

        // only infantry (and engineer sub-types) are involved, beyond this point
        if (target.data.type !== TYPES.infantry) return;

        // super bunkers can hold up to five men. only interact if not full (and friendly), OR an opposing, non-friendly infantry.
        if (data.energy < data.energyMax || !isFriendly) {

          // infantry at door? contribute to capture, or arm base, depending.

          if (collisionCheckMidPoint(exports, target)) {

            // claim infantry, change "alignment" depending on friendliness.

            if (data.energy === 0) {

              // claimed by infantry, switching sides from neutral/hostile.
              data.hostile = false;

              // ensure that if we were dead, we aren't any more.
              data.dead = false;

              // super bunker can be enemy, hostile or friendly. for now, we only care about enemy / friendly.
              if (target.data.isEnemy) {

                capture(true);

              } else {

                capture(false);

              }

            }

            // add or subtract energy, depending on alignment.
            // explicitly-verbose check, for legibility.

            if (data.isEnemy) {

              // enemy-owned....
              if (target.data.isEnemy) {
                // friendly passer-by.
                if (data.energy) game.objects.notifications.add('The enemy reinforced a super bunker 💪');
                data.energy++;
              } else {
                if (data.energy > 1) game.objects.notifications.add('You weakened a super bunker ⚔️');
                data.energy--;
              }

            } else if (!target.data.isEnemy) {
              // player-owned...
              if (data.energy) game.objects.notifications.add('You reinforced a super bunker 💪');
              data.energy++;
            } else {
              if (data.energy > 1) game.objects.notifications.add('The enemy weakened a super bunker ⚔️');
              data.energy--;
            }

            // limit to +/- range.
            data.energy = Math.min(data.energyMax, data.energy);

            // small detail: firing speed relative to # of infantry
            updateFireModulus();

            if (data.energy === 0) {

              // un-manned, but dangerous to helicopters on both sides.
              data.hostile = true;

              if (target.data.isEnemy) {
                game.objects.notifications.add('Enemy infantry neutralized a super bunker ⚔️');
              } else {
                game.objects.notifications.add('Your infantry neutralized a super bunker ⛳');
              }

              utils.css.remove(radarItem.dom.o, css.friendly);
              utils.css.add(radarItem.dom.o, css.enemy);

            }

            // "claim" the infantry, kill if enemy and man the bunker if friendly.
            target.die({ silent: true });

            playSound(sounds.doorClose, target.data.exports);

            updateEnergy(exports);

          }

        }

      },

      miss() {
        setFiring(false);
      }

    },

    // who gets fired at?
    items: [TYPES.infantry, 'engineers', 'missileLaunchers', 'vans', 'helicopters'],
    targets: []

  };

  initSuperBunker();

  return exports;

};

export { SuperBunker };