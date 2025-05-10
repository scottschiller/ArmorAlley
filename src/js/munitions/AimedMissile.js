import { game, getObjectById } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { canNotify, collisionTest } from '../core/logic.js';
import {
  GAME_SPEED,
  GAME_SPEED_RATIOED,
  getTypes,
  rng,
  TYPES,
  worldHeight
} from '../core/global.js';
import { playSound, sounds } from '../core/sound.js';
import { gamePrefs } from '../UI/preferences.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';
import { net } from '../core/network.js';

let type = TYPES.aimedMissile;

const dimensions = {
  width: 15,
  height: 4
};

const { width, height } = dimensions;

// velocity x + y "basis"
const v = 8;

const AimedMissile = (options = {}) => {
  /**
   * "Dumb" missile, armed with napalm.
   */

  let collision, domCanvas, data, launchSound, radarItem, objects, exports;

  data = common.inheritData(
    {
      type,
      parent: options.parent || null,
      parentType: options.parentType || null,
      energy: 2,
      energyMax: 2,
      infantryEnergyCost: 0.5,
      armed: true,
      didNotify: false,
      excludeBlink: true,
      visible: true,
      frameCount: 0,
      width,
      halfWidth: width / 2,
      height,
      damagePoints: 12.5,
      playbackRate: 0.9 + Math.random() * 0.2,
      target: null,
      timers: {},
      vX: options.vX || 0,
      vXDirection: options.vXDirection !== undefined ? options.vXDirection : 1,
      vY: options.vY !== undefined ? options.vY : 0.1,
      vXMax: net.active ? v : v + rng(v / 2, type) + (options.vXMax || 0),
      vYMax: net.active ? v : v + rng(v / 2, type) + (options.vYMax || 0),
      trailerCount: 16,
      xHistory: [],
      yHistory: [],
      yMax: game.objects.view.data.battleField.height - 3,
      noEnergyStatus: true
    },
    options
  );

  const spriteConfig = {
    src: 'missile.png',
    srcFlipped: 'missile-flipped.png',
    spriteWidth: dimensions.width,
    spriteHeight: dimensions.height,
    width: dimensions.width,
    height: dimensions.height,
    scale: 2
  };

  const { scale, spriteWidth, spriteHeight } = spriteConfig;

  domCanvas = {
    img: {
      src: !game.objects.editor
        ? utils.image.getImageObject(
            options.vXDirection < 0 ? spriteConfig.srcFlipped : spriteConfig.src
          )
        : null,
      source: {
        x: 0,
        y: 0,
        width: spriteWidth,
        height: spriteHeight,
        is2X: true,
        frameWidth: spriteWidth,
        frameHeight: spriteHeight,
        frameX: 0,
        frameY: 0
      },
      target: {
        scale
      }
    },

    radarItem: {
      width: 2.75,
      height: 1,
      draw: (ctx, obj, pos, width, height) => {
        const scaledWidth = pos.width(width);
        const scaledHeight = pos.height(height);

        const left = pos.left(obj.data.left);
        const top = obj.data.top - scaledHeight;

        ctx.roundRect(left, top, scaledWidth, scaledHeight, width);

        common.domCanvas.unrotate(ctx);
      }
    }
  };

  objects = {
    target: options.target,
    lastTarget: options.target
  };

  exports = {
    addMissileNapalm,
    animate: () => animate(exports),
    data,
    domCanvas,
    die: (dieOptions) => die(exports, dieOptions),
    onDie: options.onDie || null,
    init: () => initAimedMissile(exports),
    launchSound,
    radarItem,
    removeNodesAndUnlink: () => removeNodesAndUnlink(exports),
    objects
  };

  collision = {
    options: {
      source: data.id,
      targets: undefined,
      checkTweens: true,
      hit(targetID) {
        sparkAndDie(exports, targetID);
      }
    },
    items: getTypes(
      'aimedMissile, superBunker, helicopter, tank, van, missileLauncher, infantry, parachuteInfantry, engineer, bunker, balloon, smartMissile, turret',
      { exports }
    )
  };

  exports.collision = collision;

  return exports;
};

function moveTrailers(exports) {
  let { data } = exports;

  if (!data.isOnScreen) return;
  common.domCanvas.drawTrailers(
    exports,
    data.xHistory,
    data.yHistory,
    0,
    data.height / 2 - 0.5
  );
}

function getNapalmParams(exports) {
  let { data } = exports;

  return {
    x: data.x,
    y: worldHeight - 12,
    vXDirection: data.vXDirection,
    parent: data.parent,
    parentType: data.parentTYpe
  };
}

function removeNodesAndUnlink(exports) {
  sprites.removeNodesAndUnlink(exports);
}

function die(exports, dieOptions = {}) {
  let { data, domCanvas, radarItem } = exports;

  if (data.deadTimer || data.dead) return;

  let attacker = dieOptions?.attacker;

  if (attacker && !data.attacker) {
    data.attacker = attacker;
  }

  // slightly hackish: may be passed, or assigned
  attacker = attacker || data.attacker;

  data.energy = 0;

  data.dead = true;

  // close enough to the ground to generate a napalm trail?
  if (data.y >= worldHeight - 15) {
    // stop drawing the missile sprite altogether
    domCanvas.img = null;

    const napalmParams = getNapalmParams(exports);

    const napalmCount = 5;

    if (sounds.missileNapalm) {
      playSound(sounds.missileNapalm, game.players.local);
    }

    for (let i = 0; i < napalmCount; i++) {
      data.timers[`napalm${i}`] = common.frameTimeout.set(
        {
          methodName: 'addMissileNapalm',
          params: {
            ...napalmParams,
            x: napalmParams.x + 22 * data.vXDirection * i
          }
        },
        // over the course of a second
        (i / napalmCount / 2) * 1000
      );
    }
  } else {
    spark(exports);
  }

  effects.inertGunfireExplosion({ exports });

  let oAttacker = getObjectById(attacker);

  // special-case: shot down by gunfire, vs. generic "boom"
  if (oAttacker?.data?.type === TYPES.gunfire && sounds.metalClang) {
    playSound(sounds.metalClang, game.players.local);
  } else if (sounds.genericBoom) {
    playSound(sounds.genericBoom, game.players.local);
  }

  data.timers.deadTimer = common.frameTimeout.set('removeNodesAndUnlink', 1000);

  radarItem?.die();

  // optional callback
  exports.onDie?.();

  common.onDie(data.id, dieOptions);
}

function addMissileNapalm(params) {
  game.addObject(TYPES.missileNapalm, params);
}

function spark(exports) {
  let { domCanvas } = exports;

  domCanvas.img = effects.spark();
}

function sparkAndDie(exports, targetID) {
  let { data } = exports;

  let target = getObjectById(targetID);

  // if we don't have a target, something is very wrong.
  if (!target) return;

  let tData = target.data;

  // special case: take a slight hit and "slice through" ground-based infantry and engineers
  const { bottomAligned, type } = tData;

  // engineers are an infantry sub-type
  if (type == TYPES.infantry && bottomAligned && data.energy > 0) {
    // take a hit
    data.energy -= data.infantryEnergyCost;

    // give a hit
    common.hit(target.data.id, target.data.energy, data.id);

    // keep on truckin', unless the missile has been killed off.
    if (data.energy > 0) return;
  } else {
    // regular hit
    common.hit(
      target.data.id,
      data.armed ? data.damagePoints * data.energy : 1,
      data.id
    );

    if (!tData.dead && data.armed) {
      // a missile hit something, but the target didn't die.

      const isWeakened = data.energy < data.energyMax;
      const weakened = isWeakened ? ' weakened' : '';
      const whose =
        data.isEnemy !== game.players.local.data.isEnemy
          ? isWeakened
            ? `A${weakened} enemy`
            : 'An enemy'
          : data.parent === game.players.local.data.id
            ? `Your${weakened}`
            : `A friendly${weakened}`;
      const missileType = game.objects.stats.formatForDisplay(
        data.type,
        exports
      );
      const verb =
        tData.type === TYPES.superBunker ? 'crashed into' : 'damaged';

      const targetType = game.objects.stats.formatForDisplay(type, target);
      const health =
        tData.energy && tData.energy !== tData.energyMax
          ? ` (${Math.floor((tData.energy / tData.energyMax) * 100)}%)`
          : '';

      const aOrAn = tData.type === TYPES.infantry ? 'an' : 'a';

      const text = `${whose} ${missileType} ${verb} ${aOrAn} ${targetType}${health}`;

      if (canNotify(tData.type, data.type)) {
        game.objects.notifications.add(text);
      }
    }
  }

  spark(exports);

  // "embed", so this object moves relative to the target it hit
  sprites.attachToTarget(exports, target);

  // bonus "hit" sounds for certain targets
  if (tData.type === TYPES.tank || tData.type === TYPES.turret) {
    playSound(sounds.metalHit, game.players.local);
  } else if (tData.type === TYPES.bunker) {
    playSound(sounds.concreteHit, game.players.local);
  }

  die(exports, { attacker: target.data.id });
}

function animate(exports) {
  let { collision, data, domCanvas } = exports;

  let newX, newY;

  domCanvas.animation?.animate();

  // notify caller if now dead and can be removed.
  if (data.dead) {
    return data.dead && data.canDestroy;
  }

  data.vX += data.vXDirection * 0.175 * GAME_SPEED_RATIOED;

  // limit vertical velocity
  data.vY = Math.min(8, data.vY + data.vY * 0.04 * GAME_SPEED_RATIOED);

  // and throttle
  data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
  data.vY = Math.max(0, Math.min(data.vYMax, data.vY));

  newX = data.x + data.vX * GAME_SPEED_RATIOED;
  newY = data.y + data.vY * GAME_SPEED_RATIOED;

  // x, y
  sprites.moveTo(exports, newX, newY);

  sprites.draw(exports);

  // push x/y to trailer history arrays, maintain size
  data.xHistory.push(data.x + (data.vXDirection < 0 ? data.width : 0));
  data.yHistory.push(data.y);

  if (data.xHistory.length > data.trailerCount + 1) {
    data.xHistory.shift();
    data.yHistory.shift();
  }

  moveTrailers(exports);

  data.frameCount++;

  // hit bottom?
  if (data.y > data.yMax) {
    data.y = data.yMax;
    die(exports);
  }

  collisionTest(collision, exports);
}

function initAimedMissile(exports) {
  let { data } = exports;

  common.initDOM(exports);

  data.yMax = game.objects.view.data.battleField.height - data.height - 1;

  const playbackRate = getPlaybackRate(exports);

  exports.radarItem = game.objects.radar.addItem(exports);

  if (sounds.missileLaunch) {
    exports.launchSound = playSound(sounds.missileLaunch, game.players.local, {
      onplay: (sound) => (exports.launchSound = sound),
      playbackRate
    });

    // human helicopter, firing aimed missile
    if (
      gamePrefs.bnb &&
      data.parent === game.players.local.data.id &&
      sounds.bnb.beavisYeahGo
    ) {
      // hackish: only play if this is the first active missile by the local player.
      const activeMissiles = game.objects['aimed-missile'].filter(
        (m) => m?.data?.parent === data.parent
      );
      if (activeMissiles.length === 1) {
        playSound(sounds.bnb.beavisYeahGo, game.players.local);
      }
    }
  }
}

function getPlaybackRate(exports) {
  let { data } = exports;

  return data.playbackRate * (gamePrefs.game_speed_pitch ? GAME_SPEED : 1);
}

export { AimedMissile };
