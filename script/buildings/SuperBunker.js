import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { TYPES, FPS, getTypes } from '../core/global.js';
import { playSound, playSoundWithDelay, sounds } from '../core/sound.js';
import { common } from '../core/common.js';
import {
  checkProduction,
  collisionCheck,
  collisionCheckMidPoint,
  nearbyTest
} from '../core/logic.js';
import { zones } from '../core/zones.js';
import { sprites } from '../core/sprites.js';
import { gamePrefs } from '../UI/preferences.js';

const crossedSwords = '<span class="no-emoji-substitution">⚔️</span>';

const SuperBunker = (options = {}) => {
  let css, dom, data, width, height, lastFriendly, nearby, radarItem, exports;

  const FIRE_MODULUS = 7;

  function updateFireModulus() {
    // firing speed increases with # of infantry
    data.fireModulus = Math.max(1, FIRE_MODULUS - data.energy);
  }

  function capture(isEnemy) {
    let isFriendlyCapture = isEnemy === game.players.local.data.isEnemy;

    data.isEnemy = isEnemy;

    setHostile(false);
    setFriendly(isFriendlyCapture);

    if (isFriendlyCapture) {
      game.objects.notifications.add(
        'You captured and armed a super bunker ⛳'
      );

      playSoundWithDelay(sounds.friendlyClaim, exports, 500);
    } else {
      game.objects.notifications.add(
        'The enemy captured and armed a super bunker 🚩'
      );

      playSoundWithDelay(sounds.enemyClaim, exports, 500);
    }

    // check if enemy convoy production should stop or start
    checkProduction();
  }

  function setHostile(isHostile) {
    data.hostile = isHostile;
    utils.css.addOrRemove(dom.o, isHostile, css.hostile);
    utils.css.addOrRemove(
      radarItem.dom.o,
      gamePrefs.super_bunker_arrows && isHostile,
      css.hostile
    );

    zones.changeOwnership(exports);
  }

  function setFriendly(isFriendly) {
    if (lastFriendly === isFriendly) return;
    lastFriendly = isFriendly;

    setHostile(false);

    utils.css.addOrRemove(dom.o, isFriendly, css.friendly);
    utils.css.addOrRemove(dom.o, !isFriendly, css.enemy);

    utils.css.addOrRemove(radarItem.dom.o, isFriendly, css.friendly);
    utils.css.addOrRemove(radarItem.dom.o, !isFriendly, css.enemy);

    zones.changeOwnership(exports);
  }

  function setFiring(state) {
    // firing only works, of course, when there is also energy.
    data.firing = !!(state && data.energy);
  }

  function updateHealth(attacker) {
    // notify if just disarmed by tank gunfire
    // note: the super bunker has not become friendly to the tank; it's still "dangerous", but unarmed and won't fire at incoming units.
    if (data.energy) return;

    const isFriendly =
      attacker.data.isEnemy === game.players.local.data.isEnemy;

    // we have a tank, after all
    if (isFriendly) {
      game.objects.notifications.addNoRepeat('You disarmed a super bunker ⛳');
    } else {
      game.objects.notifications.addNoRepeat(
        'The enemy disarmed a super bunker 🚩'
      );
    }

    // disarmed super bunkers are dangerous to both sides.
    setFriendly(false);
    setHostile(true);
  }

  function hit(points, target) {
    // only tank flamethrowers - or, gunfire - counts against super bunkers.
    if (
      target &&
      (target.data.type === TYPES.flame ||
        target.data.type === TYPES.gunfire) &&
      target.data.parentType === TYPES.tank
    ) {
      data.energy = Math.max(0, data.energy - points);
      updateFireModulus();
      sprites.updateEnergy(exports);
    }
  }

  function die() {
    if (data.dead) return;
    // gunfire from both sides should now hit this element.

    data.energy = 0;

    updateFireModulus();

    // this object, in fact, never actually dies because it only becomes neutral/hostile and can still be hit.
    data.dead = false;

    // un-manned, but dangerous to helicopters on both sides.
    setFriendly(false);
    setHostile(true);

    sprites.updateEnergy(exports);

    // check if enemy convoy production should stop or start
    checkProduction();

    common.onDie(exports);
  }

  function fire() {
    let fireOptions;

    if (
      !data.firing ||
      !data.energy ||
      data.frameCount % data.fireModulus !== 0
    )
      return;

    fireOptions = {
      parent: exports,
      parentType: data.type,
      isEnemy: data.isEnemy,
      collisionItems: nearby.items,
      x: data.x + data.width - 2,
      y: data.y + data.gunYOffset, // position of bunker gun
      fixedXY: true,
      vX: 2,
      vY: 0
    };

    game.addObject(TYPES.gunfire, fireOptions);

    // other side
    fireOptions.x = data.x;

    // and reverse direction
    fireOptions.vX *= -1;

    game.addObject(TYPES.gunfire, fireOptions);

    if (sounds.genericGunFire) {
      playSound(sounds.genericGunFire, exports);
    }
  }

  function animate() {
    sprites.moveWithScrollOffset(exports);

    data.frameCount++;

    nearbyTest(nearby, exports);

    fire();

    // note: super bunkers never die, but leaving this in anyway.
    return !dom.o;
  }

  function refreshNearbyItems() {
    // set on init, updated with `zones.changeOwnership()` as targets change sides
    nearby.items = getTypes(
      'infantry:all, engineer, missileLauncher, van, helicopter',
      { group: 'enemy', exports }
    );
  }

  function onArrowHiddenChange(isVisible) {
    if (!dom?.oArrow) return;
    dom.oArrow.style.visibility = isVisible ? 'visible' : 'hidden';
    utils.css.addOrRemove(
      radarItem?.dom?.o,
      data.hostile && isVisible,
      css.hostile
    );
  }

  function initDOM() {
    dom.o = sprites.create({
      className: css.className,
      id: data.id,
      isEnemy: data.isEnemy ? css.enemy : false
    });

    dom.oArrow = dom.o.appendChild(sprites.makeSubSprite(css.arrow));

    onArrowHiddenChange(gamePrefs.super_bunker_arrows);

    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);
  }

  function initSuperBunker() {
    refreshNearbyItems();

    initDOM();

    radarItem = game.objects.radar.addItem(exports, dom.o.className);
  }

  function destroy() {
    radarItem?.die();
    sprites.removeNodes(dom);
  }

  width = 66;
  height = 28;

  css = common.inheritCSS({
    className: TYPES.superBunker,
    arrow: 'arrow',
    friendly: 'friendly',
    hostile: 'hostile'
  });

  data = common.inheritData(
    {
      type: TYPES.superBunker,
      bottomAligned: true,
      frameCount: 0,
      energy: options.energy || 5,
      energyMax: 5, // note: +/- depending on friendly vs. enemy infantry
      energyLineScale: 0.95,
      centerEnergyLine: true,
      isEnemy: !!options.isEnemy,
      width,
      halfWidth: width / 2,
      doorWidth: 6,
      height,
      firing: false,
      gunYOffset: 20.75,
      // fire speed relative to # of infantry arming it
      fireModulus: FIRE_MODULUS,
      fireModulus1X: FIRE_MODULUS,
      gameSpeedProps: ['fireModulus'],
      hostile: false,
      midPoint: null,
      xLookAhead: width / 3,
      y: game.objects.view.data.world.height - height
    },
    options
  );

  updateFireModulus();

  if (data.energy === 0) {
    // initially neutral/hostile only if 0 energy
    setHostile(true);
  }

  // coordinates of the doorway
  data.midPoint = {
    x: data.x + data.halfWidth,
    y: data.y,
    // hackish: make the collision point the center, not the actual width
    width: 1,
    height: data.height
  };

  dom = {
    o: null,
    oArrow: null
  };

  exports = {
    animate,
    capture,
    data,
    destroy,
    die,
    dom,
    hit,
    init: initSuperBunker,
    onArrowHiddenChange,
    updateHealth,
    refreshNearbyItems
  };

  nearby = {
    options: {
      source: exports,
      targets: undefined,
      fireTargetCount: 0,
      useLookAhead: true,
      hitAll: true,
      before() {
        // reset before test
        nearby.options.fireTargetCount = 0;
      },
      after() {
        // hits may have been counted
        setFiring(nearby.options.fireTargetCount > 0);
      },
      hit(target) {
        let isFriendly = target.data.isEnemy === data.isEnemy;

        const isTargetFriendlyToPlayer =
          target.data.isEnemy === game.players.local.data.isEnemy;

        // enemy might be inside the bunker bounding box, e.g., parachuted in from above. Consider a miss, if so.
        if (
          !isFriendly &&
          data.energy > 0 &&
          !collisionCheck(target.data, exports.data)
        ) {
          // nearby enemy, and defenses activated? let 'em have it.
          nearby.options.fireTargetCount++;
        }

        // only infantry (excluding engineers by role=1) are involved, beyond this point
        if (target.data.type !== TYPES.infantry || target.data.role) return;

        // super bunkers can hold up to five men. only interact if not full (and friendly), OR an opposing, non-friendly infantry.
        if (isFriendly && data.energy === data.energyMax) return;

        // infantry at door? contribute to capture, or arm base, depending.
        if (!collisionCheckMidPoint(target, exports)) return;

        // claim infantry, change "alignment" depending on friendliness.
        if (data.energy === 0) {
          // claimed by infantry, switching sides from neutral/hostile.
          setHostile(false);

          // ensure that if we were dead, we aren't any more.
          data.dead = false;

          // super bunker can be enemy, hostile or friendly. for now, we only care about enemy / friendly.
          capture(target.data.isEnemy);

          // update, now that capture has happened.
          isFriendly = target.data.isEnemy === data.isEnemy;
        }

        // add or subtract energy, depending on alignment.

        // passing infantry on same team?
        if (isFriendly) {
          // friendly passer-by, relative to the super bunker.
          data.energy++;

          setFriendly(isTargetFriendlyToPlayer);

          // switch over the first time energy goes up
          if (data.energy > 0) {
            // "one of ours?"
            if (isTargetFriendlyToPlayer) {
              game.objects.notifications.add(
                'You reinforced a super bunker 🛡️'
              );
            } else {
              game.objects.notifications.add(
                'The enemy reinforced a super bunker 🛡️'
              );
            }
          }
        } else {
          // enemy infantry hit.

          // "one of ours?"
          if (isTargetFriendlyToPlayer) {
            if (data.energy > 1)
              game.objects.notifications.add(`You weakened a super bunker ${crossedSwords}`);
          } else {
            if (data.energy > 1)
              game.objects.notifications.add(
                `The enemy weakened a super bunker ${crossedSwords}`
              );
          }

          data.energy--;
        }

        // limit to +/- range.
        data.energy = Math.min(data.energyMax, data.energy);

        // firing speed relative to # of infantry.
        updateFireModulus();

        if (data.energy === 0) {
          // un-manned, but dangerous to helicopters on both sides.
          setFriendly(false);
          setHostile(true);

          if (isTargetFriendlyToPlayer) {
            game.objects.notifications.add(
              'Your infantry neutralized a super bunker ⛳'
            );
          } else {
            game.objects.notifications.add(
              `Enemy infantry neutralized a super bunker ${crossedSwords}`
            );
          }
        }

        // "claim" the infantry, kill if enemy and man the bunker if friendly.
        target.die({ silent: true });

        playSound(sounds.doorClose, exports);

        sprites.updateEnergy(exports);
      },

      miss() {
        setFiring(false);
      }
    },

    // who gets fired at?
    items: null,
    targets: []
  };

  return exports;
};

export { SuperBunker };
