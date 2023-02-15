import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { gameType } from '../aa.js';
import { FPS, rad2Deg, rnd, rndInt, TYPES, tutorialMode } from '../core/global.js';
import { playSound, stopSound, playSoundWithDelay, playRepairingWrench, playTinkerWrench, sounds } from '../core/sound.js';
import { common } from '../core/common.js';
import { enemyHelicopterNearby, enemyNearby } from '../core/logic.js';
import { GunFire } from '../munitions/GunFire.js';

const Turret = (options = {} )=> {

  let css, data, dom, height, radarItem, collisionItems, targets, exports;

  function okToMove() {

    // guns scan and fire 100% of the time, OR a random percent bias based on the amount of damage they've sustained. No less than 25% of the time.

    if (data.energy === 0) {
      return false;
    }

    return (data.energy === data.energyMax || (1 - Math.random() < (Math.max(0.25, data.energy / data.energyMax))));

  }

  function setAngle(angle) {

    // TODO: CSS animation for this?
    // common.updateIsOnScreen(exports); from within animate() ?
    if (data.isOnScreen) {
      dom.oSubSprite._style.setProperty('transform', `rotate3d(0, 0, 1, ${angle}deg)`);
    }

  }

  function resetAngle() {

    dom.oSubSprite._style.setProperty('transform', '');

  }

  function fire() {

    let deltaX, deltaY, deltaXGretzky, deltaYGretzky, angle, otherTargets, target, moveOK;

    target = enemyHelicopterNearby(data, game.objects.view.data.browser.fractionWidth);

    // alternate target(s) within range?
    if (!target && targets) {

      otherTargets = enemyNearby(data, targets, game.objects.view.data.browser.fractionWidth);

      if (otherTargets.length) {

        // take first target as closest?
        // TODO: sort by closest distance?
        target = otherTargets[0];

      }

    }

    // target has been lost (or died, etc.)
    if (!target && data.firing) {
      data.firing = false;
      data.fireCount = 0;
      resetAngle();
      utils.css.remove(dom.o, css.firing);
    }

    if (!target) return;

    // we have a live one.

    if (!data.firing) {
      utils.css.add(dom.o, css.firing);
      data.firing = true;
    }

    deltaX = target.data.x - data.x;
    deltaY = target.data.y - data.y;

    // Gretzky: "Skate where the puck is going to be".
    deltaXGretzky = target.data.vX;
    deltaYGretzky = target.data.vY;

    // turret angle
    angle = (Math.atan2(deltaY, deltaX) * rad2Deg) + 90;
    angle = Math.max(-data.maxAngle, Math.min(data.maxAngle, angle));

    // hack: target directly to left, on ground of turret: correct 90 to -90 degrees.
    if (deltaX < 0 && angle === 90) {
      angle = -90;
    }

    moveOK = okToMove();

    if (data.frameCount % data.fireModulus === 0 && moveOK) {

      data.fireCount++;

      game.objects.gunfire.push(GunFire({
        parentType: data.type,
        isEnemy: data.isEnemy,
        // turret gunfire mostly hits airborne things.
        collisionItems,
        x: data.x + data.width + 2 + (deltaX * 0.05),
        y: common.bottomAlignedY() + 8 + (deltaY * 0.05),
        vX: (deltaX * 0.05) + deltaXGretzky,
        vY: Math.min(0, (deltaY * 0.05) + deltaYGretzky)
      }));

      if (sounds.turretGunFire) {
        playSound(sounds.turretGunFire, exports);

        if (data.fireCount === 1 || data.fireCount % data.shellCasingInterval === 0) {
          // shell casing?
          common.setFrameTimeout(() => {
            playSound(sounds.bulletShellCasing, exports);
          }, 250 + rnd(250));
        }
      }

    }

    // target the enemy
    data.angle = angle;

    if (moveOK) {
      setAngle(angle);
    }

  }

  function die(options) {

    if (data.dead) return;

    // reset rotation
    data.angle = 0;
    setAngle(0);

    // special case: when turret is initially rendered as dead, don't explode etc.
    if (!options?.silent) {

      if (!data.isOnScreen) {
        if (!data.isEnemy) {
          game.objects.notifications.add('The enemy disabled a turret 💥');
        } else {
          game.objects.notifications.add('You disabled a turret 💥');
        }
      }

      utils.css.add(dom.o, css.exploding);

      common.setFrameTimeout(() => {
        utils.css.remove(dom.o, css.exploding);
      }, 1200);

      common.inertGunfireExplosion({ exports, count: 4 + rndInt(4) });

      common.smokeRing(exports, { isGroundUnit: true });

      playSound(sounds.metalHitBreak, exports);
      playSound(sounds.genericExplosion, exports);
    }

    utils.css.add(dom.o, css.destroyed);
    utils.css.add(radarItem.dom.o, css.destroyed);

    data.energy = 0;
    data.restoring = false;
    data.dead = true;

    common.updateEnergy(exports);

  }

  function restore() {

    // restore visual, but don't re-activate gun yet
    if (!data.dead && data.energy !== 0) return;

    // don't repeat if already underway
    if (data.restoring) return;

    data.restoring = true;      

    utils.css.remove(dom.o, css.destroyed);
    utils.css.remove(radarItem.dom.o, css.destroyed);

    if (data.isEnemy) {
      game.objects.notifications.addNoRepeat('The enemy started rebuilding a turret 🛠️');
    } else {
      game.objects.notifications.addNoRepeat('You started rebuilding a turret 🛠️');
    }

    playSound(sounds.turretEnabled, exports);

  }

  function isEngineerInteracting() {

    return (data.engineerInteracting && data.energy < data.energyMax);

  }

  function repair(engineer, complete) {

    let result = false;

    if (data.energy < data.energyMax) {

      if (data.frameCount % data.repairModulus === 0 || complete) {

        restore();

        data.lastEnergy = data.energy;

        data.energy = (complete ? data.energyMax : Math.min(data.energyMax, data.energy + 1));

        if (data.dead && data.energy > (data.energyMax * 0.25)) {
          // restore to life at 25%
          data.dead = false;
          if (data.isEnemy) {
            game.objects.notifications.add('The enemy re-enabled a turret 🛠️');
          } else {
            game.objects.notifications.add('You re-enabled a turret 🛠️');
          }
        }

        common.updateEnergy(exports);

      }

      result = true;

    } else if (data.lastEnergy !== data.energy) {

      // only stop sound once, when repair finishes
      if (sounds.tinkerWrench && sounds.tinkerWrench.sound) {
        stopSound(sounds.tinkerWrench);
      }

      data.lastEnergy = data.energy;

      // reset, since work is commplete
      data.restoring = false;

    }

    return result;

  }

  function setEnemy(isEnemy) {

    if (data.isEnemy === isEnemy) return;

    data.isEnemy = isEnemy;

    utils.css[isEnemy ? 'add' : 'remove'](dom.o, css.enemy);

    playSoundWithDelay((isEnemy ? sounds.enemyClaim : sounds.friendlyClaim), exports, 500);

  }

  function claim(isEnemy) {

    if (data.frameCount % data.claimModulus !== 0) return;

    data.claimPoints++;

    if (data.claimPoints < data.claimPointsMax) return;

    // change sides.
    if (!data.dead) {
      // notify only if engineer is capturing a live turret.
      // otherwise, it'll be neutralized and then rebuilt.
      if (isEnemy) {
        game.objects.notifications.add('The enemy captured a turret 🚩');
      } else {
        game.objects.notifications.add('You captured a turret ⛳');
      }
    }

    setEnemy(isEnemy);
    data.claimPoints = 0;

  }

  function engineerHit(target) {

    // target is an engineer; either repairing, or claiming.

    data.engineerInteracting = true;

    if (data.isEnemy !== target.data.isEnemy) {

      // gradual take-over.
      claim(target.data.isEnemy);

    } else {

      repair(target);

    }

    // play repair sounds?
    playRepairingWrench(isEngineerInteracting, exports);

    playTinkerWrench(isEngineerInteracting, exports);

  }

  function engineerCanInteract(isEnemy) {

    // passing engineers should only stop if they have work to do.
    return (data.isEnemy !== isEnemy || data.energy < data.energyMax);

  }

  function animate() {

    common.moveWithScrollOffset(exports);

    data.frameCount++;

    if (data.frameCount % data.scanModulus === 0) {
      if (!data.dead) fire();
    }

    if (!data.dead && data.energy > 0) {
      common.smokeRelativeToDamage(exports);
    }

    if (!data.dead && data.energy > 0 && data.frameCount % data.repairModulus === 0) {
      // self-repair
      repair();
    }

    // engineer interaction flag
    if (data.engineerInteracting) {
      data.engineerInteracting = false;
    }

  }

  function initDOM() {

    dom.o = common.makeSprite({
      className: css.className,
      isEnemy: (data.isEnemy ? css.enemy : false)
    });

    dom.oSubSprite = common.makeSubSprite();
    dom.o.appendChild(dom.oSubSprite);

    common.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y - data.yOffset}px`);
    
  }

  function initTurret() {

    initDOM();

    radarItem = game.objects.radar.addItem(exports, dom.o.className);

  }

  collisionItems = ['helicopters', 'balloons', 'parachuteInfantry', 'shrapnel'];

  if (gameType === 'hard' || gameType === 'extreme') {
    // additional challenge: make turret gunfire dangerous to some ground units, too.
    collisionItems = collisionItems.concat(['tanks', 'vans', TYPES.infantry, 'missileLaunchers', 'bunkers', 'superBunkers']);
  }

  if (gameType === 'extreme') {
    // additional challenge: make turret go after ground vehicles, as well. also, just to be extra-mean: smart missiles.
    targets = ['tanks', 'vans', 'missileLaunchers', 'smartMissiles'];
    // also: engineers will not be targeted, but can be hit.
    collisionItems = collisionItems.concat(['engineers', 'smartmissiles']);
  }

  options = options || {};

  height = 15;

  css = common.inheritCSS({
    className: TYPES.turret,
    destroyed: 'destroyed',
    firing: 'firing'
  });

  data = common.inheritData({
    type: TYPES.turret,
    bottomAligned: true,
    dead: false,
    energy: 50,
    energyMax: 50,
    lastEnergy: 50,
    firing: false,
    fireCount: 0,
    frameCount: 2 * game.objects.turrets.length, // stagger so sound effects interleave nicely
    fireModulus: (tutorialMode ? 12 : (gameType === 'extreme' ? 2 : (gameType === 'hard' ? 3 : 6))), // a little easier in tutorial mode vs. hard vs. easy modes
    scanModulus: 1,
    claimModulus: 8,
    repairModulus: FPS,
    restoring: false,
    shellCasingInterval: (tutorialMode || gameType === 'easy' ? 1 : 2),
    claimPoints: 0,
    claimPointsMax: 50,
    engineerInteracting: false,
    width: 6,
    height,
    halfWidth: 3,
    halfHeight: height / 2,
    angle: 0,
    maxAngle: 90,
    x: options.x || 0,
    y: game.objects.view.data.world.height - height - 2,
    // logical vs. sprite offset
    yOffset: 3
  }, options);

  dom = {
    o: null,
    oSubSprite: null
  };

  exports = {
    animate,
    data,
    die,
    dom,
    engineerCanInteract,
    engineerHit,
    initDOM,
    restore,
    repair
  };

  initTurret();

  // "dead on arrival"
  if (options.DOA) {
    die({ silent: true });
  }

  return exports;

};

export { Turret };