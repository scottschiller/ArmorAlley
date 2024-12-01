import { game } from '../core/Game.js';
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

const dimensions = {
  width: 15,
  height: 4
};

const AimedMissile = (options = {}) => {
  /**
   * "Dumb" missile, armed with napalm.
   */

  let dom, data, radarItem, objects, collision, launchSound, exports;

  function moveTrailers() {
    if (!data.isOnScreen) return;
    common.domCanvas.drawTrailers(
      exports,
      data.xHistory,
      data.yHistory,
      0,
      data.height / 2 - 0.5
    );
  }

  function getNapalmParams() {
    return {
      x: data.x,
      y: worldHeight - 12,
      vXDirection: data.vXDirection,
      parent: data.parent,
      parentType: data.parentTYpe
    };
  }

  function die(dieOptions = {}) {
    if (data.deadTimer || data.dead) return;

    let attacker = dieOptions?.attacker;

    if (attacker && !data.attacker) {
      data.attacker = attacker;
    }

    // slightly hackish: may be passed, or assigned
    attacker = attacker || data.attacker;

    data.energy = 0;

    data.dead = true;

    let dieSound;

    // close enough to the ground to generate a napalm trail?
    if (data.y >= worldHeight - 15) {
      // stop drawing the missile sprite altogether
      data.domCanvas.img = null;

      const napalmParams = getNapalmParams();

      const napalmCount = 5;

      if (sounds.missileNapalm) {
        playSound(sounds.missileNapalm, game.players.local);
      }

      for (let i = 0; i < napalmCount; i++) {
        common.setFrameTimeout(
          () => {
            game.addObject(TYPES.missileNapalm, {
              ...napalmParams,
              // spread in direction...
              x: napalmParams.x + 22 * data.vXDirection * i
            });
          },
          // over the course of a second
          (i / napalmCount / 2) * 1000
        );
      }
    } else {
      spark();
    }

    effects.inertGunfireExplosion({ exports });

    // special-case: shot down by gunfire, vs. generic "boom"
    if (attacker?.data?.type === TYPES.gunfire && sounds.metalClang) {
      playSound(sounds.metalClang, game.players.local);
    } else if (sounds.genericBoom) {
      playSound(sounds.genericBoom, game.players.local);
    }

    data.deadTimer = common.setFrameTimeout(() => {
      sprites.removeNodesAndUnlink(exports);
    }, 1000);

    radarItem?.die();

    // optional callback
    data.onDie?.();

    common.onDie(exports, dieOptions);
  }

  function spark() {
    data.domCanvas.img = effects.spark();
  }

  function sparkAndDie(target) {
    // if we don't have a target, something is very wrong.
    if (!target) return;

    // special case: take a slight hit and "slice through" ground-based infantry and engineers
    const { bottomAligned, type } = target.data;

    // engineers are an infantry sub-type
    if (type == TYPES.infantry && bottomAligned && data.energy > 0) {
      // take a hit
      data.energy -= data.infantryEnergyCost;

      // give a hit
      common.hit(target, target.data.energy, exports);

      // keep on truckin', unless the missile has been killed off.
      if (data.energy > 0) return;
    } else {
      // regular hit
      common.hit(
        target,
        data.armed ? data.damagePoints * data.energy : 1,
        exports
      );

      if (!target.data.dead && data.armed) {
        // a missile hit something, but the target didn't die.

        const isWeakened = data.energy < data.energyMax;
        const weakened = isWeakened ? ' weakened' : '';
        const whose =
          data.isEnemy !== game.players.local.data.isEnemy
            ? isWeakened
              ? `A${weakened} enemy`
              : 'An enemy'
            : data?.parent?.data?.id === game.players.local.data.id
              ? `Your${weakened}`
              : `A friendly${weakened}`;
        const missileType = game.objects.stats.formatForDisplay(
          data.type,
          exports
        );
        const verb =
          target.data.type === TYPES.superBunker ? 'crashed into' : 'damaged';
        const targetType = game.objects.stats.formatForDisplay(type, target);
        const health =
          target.data.energy && target.data.energy !== target.data.energyMax
            ? ` (${Math.floor(
                (target.data.energy / target.data.energyMax) * 100
              )}%)`
            : '';
        const aOrAn = target.data.type === TYPES.infantry ? 'an' : 'a';

        const text = `${whose} ${missileType} ${verb} ${aOrAn} ${targetType}${health}`;

        if (canNotify(target.data.type, data.type)) {
          game.objects.notifications.add(text);
        }
      }
    }

    spark();

    // "embed", so this object moves relative to the target it hit
    sprites.attachToTarget(exports, target);

    // bonus "hit" sounds for certain targets
    if (target.data.type === TYPES.tank || target.data.type === TYPES.turret) {
      playSound(sounds.metalHit, game.players.local);
    } else if (target.data.type === TYPES.bunker) {
      playSound(sounds.concreteHit, game.players.local);
    }

    die({ attacker: target });
  }

  function animate() {
    let deltaX, deltaY, newX, newY, newTarget, targetData, targetHalfWidth;

    data.domCanvas.animation?.animate();

    // notify caller if now dead and can be removed.
    if (data.dead) {
      sprites.moveWithScrollOffset(exports);
      return data.dead && !dom.o;
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

    // push x/y to trailer history arrays, maintain size
    data.xHistory.push(data.x + (data.vXDirection < 0 ? data.width : 0));
    data.yHistory.push(data.y);

    if (data.xHistory.length > data.trailerCount + 1) {
      data.xHistory.shift();
      data.yHistory.shift();
    }

    moveTrailers();

    data.frameCount++;

    // hit bottom?
    if (data.y > game.objects.view.data.battleField.height - 3) {
      data.y = game.objects.view.data.battleField.height - 3;
      die();
    }

    // missiles are animated by their parent - e.g., helicopters,
    // and not the main game loop. so, on-screen status is checked manually here.
    sprites.updateIsOnScreen(exports);

    collisionTest(collision, exports);
  }

  function initDOM() {
    dom.o = {};

    // initial placement
    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);
  }

  function initAimedMissile() {
    initDOM();

    data.yMax = game.objects.view.data.battleField.height - data.height - 1;

    const playbackRate = getPlaybackRate();

    radarItem = game.objects.radar.addItem(exports);

    if (sounds.missileLaunch) {
      launchSound = playSound(sounds.missileLaunch, game.players.local, {
        onplay: (sound) => (launchSound = sound),
        playbackRate
      });

      // human helicopter, firing aimed missile
      if (
        gamePrefs.bnb &&
        options.parent === game.players.local &&
        sounds.bnb.beavisYeahGo
      ) {
        // hackish: only play if this is the first active missile by the local player.
        const activeMissiles = game.objects['aimed-missile'].filter(
          (m) => m?.data?.parent === options.parent
        );
        if (activeMissiles.length === 1) {
          playSound(sounds.bnb.beavisYeahGo, game.players.local);
        }
      }
    }
  }

  function getPlaybackRate() {
    return data.playbackRate * (gamePrefs.game_speed_pitch ? GAME_SPEED : 1);
  }

  let type = TYPES.aimedMissile;

  const { width, height } = dimensions;

  // velocity x + y "basis"
  const v = 8;

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
      onDie: options.onDie || null,
      playbackRate: 0.9 + Math.random() * 0.2,
      target: null,
      vX: options.vX || 0,
      vXDirection: options.vXDirection !== undefined ? options.vXDirection : 1,
      vY: options.vY !== undefined ? options.vY : 0.1,
      vXMax: net.active ? v : v + rng(v / 2, type) + (options.vXMax || 0),
      vYMax: net.active ? v : v + rng(v / 2, type) + (options.vYMax || 0),
      trailerCount: 16,
      xHistory: [],
      yHistory: [],
      yMax: null,
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

  data.domCanvas = {
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

  dom = {
    o: null
  };

  objects = {
    target: options.target,
    lastTarget: options.target
  };

  exports = {
    animate,
    data,
    dom,
    die,
    init: initAimedMissile,
    radarItem,
    objects
  };

  collision = {
    options: {
      source: exports,
      targets: undefined,
      checkTweens: true,
      hit(target) {
        sparkAndDie(target);
      }
    },
    items: getTypes(
      'aimedMissile, superBunker, helicopter, tank, van, missileLauncher, infantry, parachuteInfantry, engineer, bunker, balloon, smartMissile, turret',
      { exports }
    )
  };

  return exports;
};

export { AimedMissile };
