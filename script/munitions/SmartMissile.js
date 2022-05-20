import { gameType } from '../aa.js';
import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { collisionTest, getNearestObject } from '../core/logic.js';
import { rad2Deg, rnd, rndInt, TYPES } from '../core/global.js';
import { playSound, stopSound, sounds } from '../core/sound.js';
import { Smoke } from '../elements/Smoke.js';

const SmartMissile = options => {

  /**
   * I am so smart!
   * I am so smart!
   * S-MRT,
   * I mean, S-MAR-T...
   *  -- Homer Simpson
   */

  let css, dom, data, radarItem, objects, collision, launchSound, exports;

  function moveTo(x, y, angle) {

    // prevent from "crashing" into terrain, only if not expiring and target is still alive
    if (!data.expired && !objects.target.data.dead && y >= data.yMax) {
      y = data.yMax;
    }

    // determine angle
    if (data.isBanana) {

      data.angle += data.angleIncrement;

      if (data.angle >= 360) {
        data.angle -= 360;
      }

      // if dropping, "slow your roll"
      if (data.expired) {
        data.angleIncrement *= 0.97;
      }

    } else {

      data.angle = angle;

    }

    data.extraTransforms = `rotate3d(0, 0, 1, ${data.angle}deg)`;

    common.moveTo(exports, x, y);

    // push x/y to history arrays, maintain size

    data.xHistory.push(data.x);
    data.yHistory.push(data.y);

    if (data.xHistory.length > data.trailerCount + 1) {
      data.xHistory.shift();
      data.yHistory.shift();
    }

  }

  function moveTrailers() {

    let i, j, xOffset, yOffset;

    if (!data.isOnScreen) return;

    xOffset = data.width / 2;
    yOffset = (data.height / 2) - 1;

    for (i = 0, j = data.trailerCount; i < j; i++) {

      // if previous X value exists, apply it
      if (data.xHistory[i]) {
        common.setTransformXY(exports, dom.trailers[i], `${data.xHistory[i] + xOffset}px`, `${data.yHistory[i] + yOffset}px`);
        dom.trailers[i]._style.setProperty('opacity', Math.max(0.25, (i+1) / j));
      }

    }

  }

  function hideTrailers() {

    let i, j;

    if (!dom.trailers?.length) return;

    for (i = 0, j = data.trailerCount; i < j; i++) {
      dom.trailers[i]._style.setProperty('opacity', 0);
    }

  }

  function spark() {

    utils.css.add(dom.o, css.spark);
    common.applyRandomRotation(dom.o);

  }

  function makeTimeout(callback) {

    objects?._timeout?.reset();
    objects._timeout = common.setFrameTimeout(callback, 350);

  }

  function addTracking(targetNode, radarNode) {

    if (targetNode) {

      utils.css.add(targetNode, css.tracking);

      makeTimeout(() => {

        // this animation needs to run possibly after the object has died.
        if (targetNode) utils.css.add(targetNode, css.trackingActive);

        // prevent leaks?
        targetNode = null;
        radarNode = null;

      });

    }

    if (radarNode) {
      // radar goes immediately to "active" state, no transition.
      utils.css.add(radarNode, css.trackingActive);
    }

  }

  function removeTrackingFromNode(node) {

    if (!node) return;

    // remove tracking animation
    utils.css.remove(node, css.tracking);
    utils.css.remove(node, css.trackingActive);

    // start fading/zooming out
    utils.css.add(node, css.trackingRemoval);

  }

  function removeTracking(targetNode, radarNode) {

    removeTrackingFromNode(targetNode);
    removeTrackingFromNode(radarNode);

    // one timer for both.
    makeTimeout(() => {

      if (targetNode) {
        utils.css.remove(targetNode, css.trackingRemoval);
      }

      if (radarNode) {
        utils.css.remove(radarNode, css.trackingRemoval);
      }

      // prevent leaks?
      targetNode = null;
      radarNode = null;

    });

  }

  function setTargetTracking(tracking) {

    if (!objects.target) return;

    const targetNode = objects.target.dom.o;
    const radarNode = objects.target.radarItem?.dom?.o;

    if (tracking) {
      addTracking(targetNode, radarNode);
    } else {
      removeTracking(targetNode, radarNode);
    }

  }

  function die() {

    if (data.deadTimer) return;

    let dieSound;

    utils.css.add(dom.o, css.spark);

    common.applyRandomRotation(dom.o);

    if (sounds.genericBoom) {
      playSound(sounds.genericBoom, exports);
    }

    common.inertGunfireExplosion({ exports });

    common.shrapnelExplosion(data, {
      count: 3 + rndInt(3),
      velocity: (Math.abs(data.vX) + Math.abs(data.vY)) / 2
    });

    hideTrailers();

    data.deadTimer = common.setFrameTimeout(() => {
      common.removeNodes(dom);
      // removeNodes on trailers???
    }, 500);

    data.energy = 0;

    // stop tracking the target.
    setTargetTracking();

    radarItem.die();

    if (data.isRubberChicken && !data.isBanana && sounds.rubberChicken.die) {

      // don't "die" again if the chicken has already moaned, i.e., from expiring.
      if (!data.expired) {

        if (launchSound) {
          // "mute" and forget; the sound will finish playing, and will be destroyed / freed up.
          launchSound.mute();
          launchSound = null;
        }

        playSound(sounds.rubberChicken.die, exports, {
          onplay: (sound) => dieSound = sound,
          playbackRate: data.playbackRate
        });

      }

      if (launchSound) {

        launchSound.mute();
        launchSound = null;

        if (!data.expired && dieSound) {
          // hackish: apply launch sound volume to die sound
          dieSound.setVolume(launchSound.volume);
        }

      }

    }

    if (data.isBanana && launchSound) {

      launchSound.mute();
      launchSound = null;

    }

    // if targeting the player, ensure the expiry warning sound is stopped.
    if (objects?.target === game.objects.helicopters[0]) {
      stopSound(sounds.missileWarningExpiry);
    }

    // optional callback
    if (data.onDie) data.onDie();

    data.dead = true;

  }

  function sparkAndDie(target) {

    // TODO: reduce timers
    spark();

    if (target) {

      common.hit(target, (data.armed ? data.damagePoints : 1), exports);

      // "embed", so this object moves relative to the target it hit
      common.attachToTarget(exports, target);

      // bonus "hit" sounds for certain targets
      if (target.data.type === TYPES.tank || target.data.type === TYPES.turret) {
        playSound(sounds.metalHit, exports);
      } else if (target.data.type === TYPES.bunker) {
        playSound(sounds.concreteHit, exports);
      }

      if (data.isBanana) {
        common.smokeRing(exports, {
          count: 16,
          velocityMax: 24,
          offsetX: target.data.width / 2,
          offsetY: data.height - 2,
          isGroundUnit: target.data.bottomAligned,
          parentVX: data.vX,
          parentVY: data.vY
        });
      }

    }

    die();

  }

  function animate() {

    let deltaX, deltaY, newX, newY, newTarget, rad, targetData, targetHalfWidth, targetHeightOffset;

    // notify caller if now dead and can be removed.
    if (data.dead) {
      common.moveWithScrollOffset(exports);
      return (data.dead && !dom.o);
    }

    targetData = objects.target.data;

    targetHalfWidth = targetData.width / 2;
    targetHeightOffset = (targetData.type === TYPES.balloon ? 0 : targetData.height / 2);

    // delta of x/y between this and target
    deltaX = (targetData.x + targetHalfWidth) - data.x;

    // TODO: hack full height for balloon?
    deltaY = (targetData.y + (targetData.bottomAligned ? targetHeightOffset : -targetHeightOffset)) - data.y;

    /**
     * if original target has died OR has become friendly, try to find a new target.
     * e.g., enemy bunker that was originally targeted, is captured and became friendly -
     * or, two missiles fired at enemy helicopter, but the first one hits and kills it.
     * 
     * in the original game, missiles would die when the original target died -
     * but, missiles are rare (you get two per chopper) and take time to re-arm,
     * and they're "smart" - so in my version, missiles get retargeting capability
     * for at least one animation frame after the original target is lost.
     * 
     * if retargeting finds nothing at the moment the original is lost, the missile will die.
     */
    if (!data.expired && (!objects.target || objects.target.data.dead)) {

      // stop tracking the old one, as applicable.
      if (objects.target.data.dead) {
        setTargetTracking();
      }

      newTarget = getNearestObject(exports);

      if (newTarget && !newTarget.data.cloaked && !newTarget.data.dead) {
        // we've got a live one!
        objects.target = newTarget;

        if (launchSound) {
          launchSound.stop();
          launchSound.play({
            playbackRate: data.playbackRate,
            onplay: (sound) => launchSound = sound
          });
        }

        // and start tracking.
        setTargetTracking(true);
      }

    }

    // "out of gas" -> dangerous to both sides -> fall to ground
    if (!data.expired && (data.frameCount > data.expireFrameCount || (!objects.target || objects.target.data.dead))) {

      utils.css.add(dom.o, css.expired);
      utils.css.add(radarItem.dom.o, css.expired);

      data.expired = true;
      data.hostile = true;

      if (data.isRubberChicken && !data.isBanana && sounds.rubberChicken.expire) {
        
        playSound(sounds.rubberChicken.expire, exports, {
          playbackRate: data.playbackRate,
          volume: launchSound?.volume
        });

      }

      if (data.isBanana && sounds.banana.expire) {

        playSound(sounds.banana.expire, exports, {
          playbackRate: data.playbackRate,
          volume: launchSound?.volume
        });

      }

      // if still tracking something, un-mark it.
      setTargetTracking();

    }

    if (data.expired) {

      // fall...
      data.gravity *= 1.085;

      // ... and decelerate on X-axis.
      data.vX *= 0.95;

    } else {

      // x-axis

      // if changing directions, cut in half.
      data.vX += deltaX * 0.0033;

      // y-axis

      if (deltaY <= targetData.height && deltaY >= -targetData.height) {

        // lock on target.

        if (data.vY >= 0 && data.vY >= 0.25) {
          data.vY *= 0.8;
        } else if (data.vY <= 0 && data.vY < -0.25) {
          data.vY *= 0.8;
        }

      } else {

        data.vY += (deltaY >= 0 ? data.thrust : -data.thrust);

      }

    }

    // and throttle
    data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
    data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));

    const progress = data.frameCount / data.expireFrameCount;

    // smoke increases as missle nears expiry
    const smokeThreshold = 1.25 - (Math.min(1, progress));

    if (!data.nearExpiry && progress >= data.nearExpiryThreshold) {
      data.nearExpiry = true;

      // if targeting the player, start expiry warning sound
      if (objects?.target === game.objects.helicopters[0]) {
        playSound(sounds.missileWarningExpiry, exports);
        stopSound(sounds.missileWarning);
      }

      // allow a burst of thrust when near expiry, as in the original game.
      // this can make "almost-done" missiles very dangerous.
      data.vXMax *= gameType === 'extreme' ? 1.25 : 1.1;
      data.vYMax *= gameType === 'extreme' ? 1.25 : 1.1;
    }

    if (
      data.isOnScreen && (
        data.expired
        || progress >= data.nearExpiryThreshold
        || (progress >= 0.05 && Math.random() >= smokeThreshold)
      )
    ) {
      game.objects.smoke.push(Smoke({
        x: data.x + (data.vX < 0 ? data.width - 2: 0),
        y: data.y + 3,
        spriteFrame: 3
      }));
    }

    newX = data.x + data.vX;
    newY = data.y + (!data.expired ? data.vY : (Math.min(data.vY + data.gravity, data.vYMaxExpired)));

    // determine angle of missile (pointing at target, not necessarily always heading that way)
    rad = Math.atan2(deltaY, deltaX);

    moveTo(newX, newY, rad * rad2Deg);

    // push x/y to trailer history arrays, maintain size
    data.xHistory.push(data.x);
    data.yHistory.push(data.y);

    if (data.xHistory.length > data.trailerCount + 1) {
      data.xHistory.shift();
      data.yHistory.shift();
    }

    moveTrailers();

    data.frameCount++;

    if (!data.armed && data.frameCount >= data.ramiusFrameCount) {
      // become dangerous at this point.
      // obligatory: https://www.youtube.com/watch?v=CgTc3cYaLdo&t=112s
      data.armed = true;
    }

    if (data.frameCount >= data.dieFrameCount) {
      die();
      // but don't fall too fast?
      data.vYMax *= 0.5;
    }

    // hit bottom?
    if (data.y > game.objects.view.data.battleField.height - 3) {
      data.y = game.objects.view.data.battleField.height - 3;
      die({ silent: true });

      // if targeting the player, stop expiry sound
      if (objects?.target === game.objects.helicopters[0]) {
        stopSound(sounds.missileWarningExpiry);
      }
    }

    // missiles are animated by their parent - e.g., helicopters,
    // and not the main game loop. so, on-screen status is checked manually here.
    common.updateIsOnScreen(exports);

    collisionTest(collision, exports);

  }

  function isOnScreenChange(isOnScreen) {
    if (!isOnScreen) {
      // missile might leave trailers when it leaves the screen
      hideTrailers();
    }
  }

  function initDOM() {

    let i, trailerConfig, fragment;

    fragment = document.createDocumentFragment();

    dom.o = common.makeSprite({
      className: css.className,
      isEnemy: (data.isEnemy ? css.enemy : false)
    });

    trailerConfig = {
      className: css.trailer
    };

    // initial placement
    common.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`, `rotate3d(0, 0, 1, ${data.angle}deg)`);

    for (i = 0; i < data.trailerCount; i++) {
      dom.trailers.push(common.makeSprite(trailerConfig));
      fragment.appendChild(dom.trailers[i]);
    }

    // TODO: review and see if trailer fragment can be dynamically-appended when on-screen, too
    game.dom.world.appendChild(fragment);

  }

  function initSmartMissle() {

    initDOM();

    data.yMax = (game.objects.view.data.battleField.height - data.height);

    // mark the target.
    setTargetTracking(true);

    // findTarget();

    radarItem = game.objects.radar.addItem(exports, dom.o.className);

    if (data.isBanana && sounds.banana.launch) {

      // special case: enemy missile launchers should always play at full volume - they're close enough.
      playSound(sounds.banana.launch, (data.parentType === 'missile-launcher' && data.isEnemy ? null : exports), {
        onplay: (sound) => launchSound = sound,
        playbackRate: data.playbackRate
      });

    } else if (data.isRubberChicken && sounds.rubberChicken.launch) {

      // special case: enemy missile launchers should always play at full volume - they're close enough.
      playSound(sounds.rubberChicken.launch, (data.parentType === 'missile-launcher' && data.isEnemy ? null : exports), {
        onplay: (sound) => launchSound = sound,
        playbackRate: data.playbackRate
      });

    } else if (sounds.missileLaunch) {

      launchSound = playSound(sounds.missileLaunch, exports, {
        onplay: (sound) => launchSound = sound,
        playbackRate: data.playbackRate
      });

    }

  }

  options = options || {};

  css = common.inheritCSS({
    className: 'smart-missile',
    banana: 'banana',
    rubberChicken: 'rubber-chicken',
    tracking: 'smart-missile-tracking',
    trackingActive: 'smart-missile-tracking-active',
    trackingRemoval: 'smart-missile-tracking-removal',
    trailer: 'smart-missile-trailer',
    expired: 'expired',
    spark: 'spark'
  });

  // special case
  if (options.isRubberChicken) {
    css.className += ` ${css.rubberChicken}`;
  }

  if (options.isBanana) {
    css.className += ` ${css.banana}`;
  }

  data = common.inheritData({
    type: 'smart-missile',
    parentType: options.parentType || null,
    energy: 1,
    energyMax: 1,
    armed: false,
    expired: false,
    hostile: false, // when expiring/falling, this object is dangerous to both friendly and enemy units.
    nearExpiry: false,
    nearExpiryThreshold: 0.88,
    frameCount: 0,
    ramiusFrameCount: 15, // https://www.youtube.com/watch?v=CgTc3cYaLdo&t=112s
    expireFrameCount: options.expireFrameCount || 256,
    dieFrameCount: options.dieFrameCount || 640, // 640 frames ought to be enough for anybody.
    width: (options.isRubberChicken ? 24 : 14),
    height: 15,
    gravity: 1,
    damagePoints: 25,
    isRubberChicken: !!options.isRubberChicken,
    isBanana: !!options.isBanana,
    onDie: options.onDie || null,
    playbackRate: 0.95 + (Math.random() * 0.1),
    target: null,
    vX: 1 + Math.random(),
    vY: 1 + Math.random(),
    vXMax: 12 + rnd(6) + (options.vXMax || 0),
    vYMax: 12 + rnd(6) + (options.vYMax || 0),
    vYMaxExpired: 36,
    thrust: 0.5 + rnd(0.5),
    deadTimer: null,
    trailerCount: 16,
    xHistory: [],
    yHistory: [],
    yMax: null,
    angle: options.isEnemy ? 180 : 0,
    angleIncrement: 45,
    noEnergyStatus: true
  }, options);

  dom = {
    o: null,
    trailers: []
  };

  objects = {
    target: options.target
  };

  collision = {
    options: {
      source: exports, // initially undefined
      targets: undefined,
      hit(target) {
        sparkAndDie(target);
      }
    },
    items: ['superBunkers', 'helicopters', 'tanks', 'vans', 'missileLaunchers', 'infantry', 'parachuteInfantry', 'engineers', 'bunkers', 'balloons', 'smartMissiles', 'turrets']
  };

  exports = {
    animate,
    data,
    dom,
    die,
    initDOM,
    isOnScreenChange,
    objects
  };

  initSmartMissle();

  return exports;

};

export { SmartMissile };