import { game, getObjectById } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { gamePrefs } from '../UI/preferences.js';
import { nearbyTest, recycleTest } from '../core/logic.js';
import {
  TYPES,
  FPS,
  rndInt,
  oneOf,
  getTypes,
  rngInt,
  GAME_SPEED_RATIOED,
  GAME_SPEED
} from '../core/global.js';
import {
  addSequence,
  playSound,
  playSoundWithDelay,
  skipSound,
  sounds
} from '../core/sound.js';
import { zones } from '../core/zones.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';
import { net } from '../core/network.js';
import { levelConfig } from '../levels/default.js';

const spriteWidth = 116;
const spriteHeight = 114;

const frameWidth = spriteWidth;
const frameHeight = spriteHeight / 3;

const width = 58;
const height = 18;
const fireModulus = 12;

// original game says 25, but 8 helicopter bullets can take out a tank - and 3 bombs...
const energy = 15;

const Tank = (options = {}) => {
  let exports;

  let data, domCanvas, radarItem, nearby, friendlyNearby;

  data = common.inheritData(
    {
      type: TYPES.tank,
      bottomAligned: true,
      energy,
      energyMax: energy,
      energyLineScale: 0.8,
      flame: null,
      frameCount: 0,
      repairModulus: FPS,
      repairModulus1X: FPS,
      fireModulus,
      fireModulus1X: fireModulus,
      gameSpeedProps: ['fireModulus', 'repairModulus'],
      vX: options.isEnemy ? -1 : 1,
      vXDefault: options.isEnemy ? -1 : 1,
      width,
      height,
      halfWidth: 28,
      halfHeight: height / 2,
      stopped: false,
      lastNearbyTarget: null,
      x: options.x || 0,
      y: game.objects.view.data.world.height - height,
      // hackish: logical vs. sprite alignment offset
      yOffset: 2,
      stepOffset: options.stepOffset,
      xLookAhead: width / 3,
      domFetti: {
        colorType: options.isEnemy ? 'grey' : 'green',
        elementCount: 20 + rndInt(20),
        startVelocity: 5 + rndInt(10),
        spread: 90
      },
      timers: {}
    },
    options
  );

  domCanvas = {
    radarItem: Tank.radarItemConfig(),
    img: {
      src: null,
      animationModulus: Math.floor(FPS * (1 / GAME_SPEED) * (1 / 22)), // 1 / 10 = 1-second animation
      frameCount: 0,
      animationFrame: 0,
      animationFrameCount: spriteHeight / frameHeight,
      source: {
        x: 0,
        y: 0,
        // note: sprite source is 2x
        is2X: true,
        width: spriteWidth,
        height: spriteHeight,
        frameWidth,
        frameHeight,
        // sprite offset indices
        frameX: 0,
        frameY: 0
      },
      target: {
        width,
        height
      }
    }
  };

  exports = {
    animate: () => animate(exports),
    data,
    domCanvas,
    die: (dieOptions) => die(exports, dieOptions),
    dieComplete: () => dieComplete(exports),
    init: () => initDOM(exports, options),
    radarItem,
    refreshSprite: () => refreshSprite(exports),
    resume: () => resume(exports),
    stop: () => stop(exports),
    updateHealth: () => updateHealth(exports)
  };

  refreshSprite(exports);

  friendlyNearby = {
    options: {
      source: data.id,
      targets: undefined,
      useLookAhead: true,
      // stop moving if we roll up behind a friendly tank
      friendlyOnly: true,
      hit: (targetID) =>
        common.friendlyNearbyHit(targetID, data.id, {
          resume: exports.resume,
          stop: exports.stop
        }),
      // resume, if tank is not also firing
      miss: resume
    },
    // who are we looking for nearby?
    items: getTypes('tank:friendly', { exports }),
    targets: []
  };

  nearby = {
    options: {
      source: data.id,
      targets: undefined,
      useLookAhead: true,
      hit(targetID) {
        // determine whether to fire, or resume (if no friendly tank nearby)
        if (shouldFireAtTarget(exports, targetID)) {
          // TODO: lastNearbyTarget to ID
          data.lastNearbyTarget = targetID;
          stop(exports);
        } else {
          // resume, if not also stopped for a nearby friendly tank
          data.lastNearbyTarget = null;
          resume(exports);
        }
      },
      miss() {
        // resume moving, stop firing.
        data.lastNearbyTarget = null;
        resume(exports);
      }
    },
    // who gets fired at?
    items: getTypes(
      'tank, van, missileLauncher, infantry, engineer, turret, helicopter, endBunker, superBunker',
      { exports }
    ),
    targets: []
  };

  // TODO: review and DRY

  exports.friendlyNearby = friendlyNearby;
  exports.nearby = nearby;

  common.initNearby(exports.nearby, exports);
  common.initNearby(exports.friendlyNearby, exports);

  return exports;
};

function refreshSprite(exports) {
  let { data, domCanvas } = exports;

  const offset = domCanvas.img.animationFrame || 0;
  if (offset >= 3) {
    // hack: don't draw a blank / empty last frame, just keep existing sprite.
    return;
  }
  domCanvas.img.src = utils.image.getImageObject(
    data.isEnemy ? `tank-enemy_${offset}.png` : `tank_${offset}.png`
  );
}

function fire(exports) {
  let { data, nearby } = exports;

  let collisionItems;

  if (data.frameCount % data.fireModulus !== 0) return;

  /**
   * Special case: tanks don't stop to shoot bunkers, but allow gunfire to hit and damage bunkers
   * ONLY IF the tank is targeting a helicopter (i.e., defense) or another tank.
   *
   * Otherwise, let bullets pass through bunkers and kill whatever "lesser" units the tank is firing at.
   *
   * This should be an improvement from the original game, where tanks could get "stuck" shooting into
   * a bunker and eventually destroying it while trying to take out an infantry.
   */

  let nearbyData = getObjectById(data.lastNearbyTarget)?.data;

  if (
    (nearbyData && nearbyData.type === TYPES.helicopter) ||
    nearbyData.type === TYPES.tank
  ) {
    // allow bullets to hit bunkers when firing at a helicopter or tank
    collisionItems = nearby.items.concat(getTypes('bunker', { exports }));
  } else if (gamePrefs.tank_gunfire_miss_bunkers) {
    // bullets "pass through" bunkers when targeting infantry, engineers, missile launchers, and vans.
    collisionItems = nearby.items;
  }

  /**
   * Is this target flamethrower-eligible?
   * Super Bunkers and End Bunkers always get flames - infantry and engineers depend on level config.
   */
  if (
    nearbyData &&
    (nearbyData.type.match(/super-bunker|end-bunker/i) ||
      (levelConfig.bFlameThrower &&
        nearbyData.type.match(/infantry|engineer/i)))
  ) {
    data.flame = game.addObject(TYPES.flame, {
      parent: data.id,
      parentType: data.type,
      isEnemy: data.isEnemy,
      damagePoints: 2, // tanks fire at half-rate, so double damage.
      collisionItems,
      x: data.x + data.width * (data.isEnemy ? 0 : 1),
      y: data.y - 2,
      vX: 0,
      vY: 0
    });

    return;
  }

  game.addObject(TYPES.gunfire, {
    parent: data.id,
    parentType: data.type,
    isEnemy: data.isEnemy,
    damagePoints: 5,
    collisionItems,
    x: data.x + (data.width + 1) * (data.isEnemy ? 0 : 1),
    // data.y + 3 is visually correct, but halfHeight gets the bullets so they hit infantry
    y: data.y + data.halfHeight,
    vX: data.vX * 2,
    vY: 0
  });

  if (sounds.tankGunFire) {
    playSound(sounds.tankGunFire, exports);
  }
}

function moveTo(exports, x, y) {
  let { data } = exports;
  data.x = x;
  data.y = y;

  zones.refreshZone(exports);
}

function updateHealth(exports) {
  sprites.updateEnergy(exports.data.id);
}

function repair(exports) {
  let { data } = exports;
  if (data.frameCount % (data.repairModulus / 15) === 0) {
    if (data.energy < data.energyMax) {
      data.lastEnergy = parseFloat(data.energy);
      data.energy += 1.5 / 15;
      updateHealth(exports);
    }
  }
  /*
      if (tankIP->iHits != maxHitsI) {
    if (!(gameClockUI & 7))
      tankIP->iHits++;
    damageSmoke(tankIP, maxHitsI, tankIP->iHits);
  }
  */
}

function isAttackerValid(exports) {
  let { data } = exports;

  // special die() case: check if attacker is still alive, and on-screen.
  const attacker = data?.attacker?.data;

  // attacker may be not only dead, but nulled out; if so, ignore.
  if (!attacker) return;

  // normalize object to check: gunfire -> tank (for example), vs. helicopter crashing into a tank
  const actor = attacker.parentType
    ? getObjectById(attacker.parent)?.data
    : attacker.data;

  // just in case
  if (!actor) return;

  // enemy (tank/helicopter etc.) directly killed your tank, and is dead or off-screen.
  if (actor.dead || !actor.isOnScreen) return;

  return true;
}

function die(exports, dieOptions = {}) {
  let { data, domCanvas, radarItem } = exports;

  if (data.dead) return;

  data.dead = true;

  let attacker = getObjectById(data?.attacker);

  const attackerType = attacker?.data.type;

  if (!dieOptions.silent) {
    playSound(sounds.genericExplosion, exports);

    domCanvas.dieExplosion = effects.genericExplosion(exports);
    domCanvas.img = null;

    effects.damageExplosion(exports);

    effects.shrapnelExplosion(data, {
      velocity: 4 + rngInt(4, TYPES.shrapnel)
    });

    effects.inertGunfireExplosion({ exports });

    effects.domFetti(data.id, dieOptions.attacker);

    effects.smokeRing(data.id, { isGroundUnit: true });

    data.timers.deadTimer = common.frameTimeout.set('dieComplete', 1500);

    // special case: you destroyed a tank, and didn't crash into one.
    if (gamePrefs.bnb && data.isEnemy && attackerType !== TYPES.helicopter) {
      // helicopter bombed / shot / missiled tank
      if (
        data.isOnScreen &&
        data?.attacker?.data?.parentType === TYPES.helicopter &&
        Math.random() > 0.75
      ) {
        if (game.data.isBeavis) {
          playSound(
            addSequence(
              sounds.bnb.buttheadDirectHitBeavis,
              sounds.bnb.beavisThanks
            ),
            exports
          );
        } else {
          playSound(sounds.bnb.beavisBattleship, exports);
        }
      } else {
        // generic
        playSoundWithDelay(
          oneOf([sounds.bnb.beavisYes, sounds.bnb.buttheadWhoaCool]),
          250
        );
      }
    }

    // other special case: beavis saw an on-screen tank get taken out while butt-head is playing.
    if (gamePrefs.bnb && !data.isEnemy) {
      if (
        game.data.isButthead &&
        sounds.bnb.beavisCmonButthead &&
        isAttackerValid(exports)
      ) {
        // basically, just long enough for three tanks to duke it out.
        // your first one gets shot, then your second takes the enemy one out.
        // if the enemy lives through this common sequence, then have Beavis comment.
        const delay = 1500;

        playSoundWithDelay(
          sounds.bnb.beavisCmonButthead,
          exports,
          {
            onplay: (sound) => {
              if (!isAttackerValid(exports)) skipSound(sound);
            }
          },
          delay
        );
      } else {
        // generic commentary for failure
        playSoundWithDelay(
          sounds.bnb[game.isBeavis ? 'beavisLostUnit' : 'buttheadLostUnit']
        );
      }
    }
    common.addGravestone(exports);
  } else {
    sprites.removeNodesAndUnlink(exports);
  }

  if (
    !net.connected &&
    gamePrefs[`notify_${data.type}`] &&
    !data.isOnScreen &&
    attackerType !== TYPES.smartMissile
  ) {
    if (data.isEnemy === game.players.local.data.isEnemy) {
      // ignore if attacker is the enemy helicopter, i.e., it bombed our tank - that's reported elsewhere.
      if (
        attackerType !== TYPES.helicopter &&
        data?.attacker?.data?.parentType !== TYPES.helicopter &&
        // ignore tanks being recycled, they have their own notifications and aren't a "loss."
        !data.isRecycling
      ) {
        game.objects.notifications.add('You lost a tank 💥');
      }
    } else {
      game.objects.notifications.add('You destroyed a tank 💥');
    }
  }

  // stop moving while exploding
  data.vX = 0;

  data.energy = 0;

  radarItem?.die(dieOptions);

  common.onDie(data.id, dieOptions);
}

function dieComplete(exports) {
  sprites.removeNodesAndUnlink(exports);
}

function shouldFireAtTarget(exports, targetID) {
  let { data } = exports;

  let target = getObjectById(targetID);

  if (!target?.data) return false;

  // TODO: ensure the target is "in front of" the tank.

  // fire at "bad guys" that have energy left. this includes end-bunkers and super-bunkers which haven't yet been neutralized.
  if (target.data.isEnemy !== data.isEnemy && target.data.energy !== 0)
    return true;
}

function stop(exports) {
  exports.data.stopped = true;
}

function resume(exports) {
  let { data } = exports;

  if (data.lastNearbyTarget) return;
  // wait until flame is "out" before resuming
  if (data.flame && !data.flame.data.dead) return;
  data.flame = null;
  data.stopped = false;
}

function animate(exports) {
  let { data, domCanvas } = exports;

  data.frameCount++;

  // exit early if dead
  if (data.dead) {
    domCanvas.dieExplosion?.animate?.();

    // || data.canDestroy?
    return !data.timers.deadTimer;
  }

  if (!data.stopped && domCanvas?.img) {
    // animate tank treads
    if (
      domCanvas.img.frameCount > 0 &&
      domCanvas.img.frameCount % domCanvas.img.animationModulus === 0
    ) {
      // advance frame
      domCanvas.img.animationFrame++;
      refreshSprite(exports);
      if (domCanvas.img.animationFrame >= domCanvas.img.animationFrameCount) {
        // loop / repeat animation
        domCanvas.img.animationFrame = 0;
        refreshSprite(exports);
      } else {
        // keep on truckin'.
        domCanvas.img.frameCount++;
      }
    } else {
      domCanvas.img.frameCount++;
    }
  }

  repair(exports);

  effects.smokeRelativeToDamage(exports);

  if (!data.stopped) {
    moveTo(exports, data.x + data.vX * GAME_SPEED_RATIOED, data.y);
  } else {
    if (shouldFireAtTarget(exports, data.lastNearbyTarget)) {
      // move one pixel every so often, to prevent edge case where tank can get "stuck" - e.g., shooting an enemy that is overlapping a bunker or super bunker.
      // the original game had something like this, too.
      if (data.frameCount % FPS === 0) {
        // run "moving" animation for a few frames
        moveTo(
          exports,
          data.x + (data.isEnemy ? -1 : 1) * GAME_SPEED_RATIOED,
          data.y
        );
      }

      // only fire (i.e., GunFire objects) when stopped
      fire(exports);
    }
  }

  // start, or stop firing?
  nearbyTest(exports.nearby, exports);

  // stop moving, if we approach another friendly tank
  if (gamePrefs.ground_unit_traffic_control) {
    nearbyTest(exports.friendlyNearby, exports);
  }

  recycleTest(exports);

  sprites.draw(exports);

  return data.dead && !data.timers.deadTimer;
}

function initDOM(exports, options) {
  if (options.noInit) return;

  common.initDOM(exports);

  exports.radarItem = game.objects.radar.addItem(exports);
}

Tank.radarItemConfig = () => ({
  width: 4,
  height: 1.25,
  excludeFillStroke: true,
  draw: (ctx, obj, pos, width, height) => {
    const left = pos.left(obj.data.left);
    const top = pos.bottomAlign(height, obj);
    const scaledWidth = pos.width(width);
    const scaledHeight = pos.height(height);

    // tank body
    ctx.roundRect(left, top, scaledWidth, scaledHeight, scaledWidth / 2);

    ctx.fill();
    ctx.stroke();

    ctx.beginPath();

    // "boomstick"
    const barrelWidth = scaledWidth / 2;
    const barrelHeight = pos.height(0.25);

    ctx.roundRect(
      left +
        scaledWidth * (game.objectsById[obj.oParent].data.isEnemy ? -0.2 : 0.6),
      top - 3,
      barrelWidth,
      barrelHeight,
      1
    );

    ctx.fill();
    ctx.stroke();

    ctx.beginPath();

    // tank "cap"
    ctx.ellipse(
      left + scaledWidth / 2,
      top,
      scaledWidth / 4,
      height * 3,
      0,
      0,
      Math.PI,
      true
    );

    ctx.fill();
    ctx.stroke();
  }
});

export { Tank };
