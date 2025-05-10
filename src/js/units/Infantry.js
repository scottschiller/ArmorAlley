import { game, getObjectById } from '../core/Game.js';
import { common } from '../core/common.js';
import { gamePrefs } from '../UI/preferences.js';
import { collisionTest, nearbyTest, recycleTest } from '../core/logic.js';
import {
  GAME_SPEED_RATIOED,
  getTypes,
  plusMinus,
  rnd,
  rngInt,
  TYPES
} from '../core/global.js';
import { playSound, sounds } from '../core/sound.js';
import { zones } from '../core/zones.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';
import { net } from '../core/network.js';

const DEFAULT_HEIGHT = 11;
const BNB_HEIGHT = 30.66;

let width = 10;
let height = DEFAULT_HEIGHT;

const energy = 5;

const beavisWalking = {
  sprite: {
    url: 'bnb/beavis-walking.png',
    // engineer sprite is packed slightly tighter.
    width: 430,
    height: 92,
    frameWidth: 43,
    frameHeight: 92,
    animationDuration: 0.8,
    horizontal: true,
    loop: true
  }
};

const beavisHeadbanging = {
  sprite: {
    url: 'bnb/beavis-headbang.png',
    width: 228,
    height: 96,
    frameWidth: 57,
    frameHeight: 96,
    animationDuration: 1.5,
    horizontal: true,
    loop: true
  }
};

const buttheadWalking = {
  sprite: {
    url: 'bnb/butthead-walking.png',
    width: 430,
    height: 92,
    frameWidth: 43,
    frameHeight: 92,
    animationDuration: 0.8,
    horizontal: true,
    loop: true
  }
};

const buttheadHeadbanging = {
  sprite: {
    url: 'bnb/butthead-headbang.png',
    width: 220,
    height: 96,
    frameWidth: 55,
    frameHeight: 96,
    animationDuration: 1,
    horizontal: true,
    loop: true
  }
};

const Infantry = (options = {}) => {
  let data, domCanvas, defaultLookAhead, exports;

  // engineers stop closer to turrets vs. infantry.
  defaultLookAhead = options.role ? 4 : 8;

  data = common.inheritData(
    {
      type: TYPES.infantry,
      frameCount: Math.random() > 0.5 ? 5 : 0,
      bottomAligned: true,
      defaultLookAhead,
      energy,
      energyMax: energy,
      role: options.role || 0,
      roles: [TYPES.infantry, TYPES.engineer],
      isBeavis: !options.isEnemy && !!options.isBeavis,
      isButthead: !options.isEnemy && !!options.isButthead,
      stopped: false,
      noFire: false,
      direction: 0,
      width,
      halfWidth: width / 2,
      height,
      halfHeight: height / 2,
      fireModulus: 10,
      fireModulus1X: 10,
      fireModulusOffset: rngInt(9, TYPES.infantry),
      gameSpeedProps: ['fireModulus'],
      vX: options.isEnemy ? -1 : 1,
      // infantry "pacing" as they walk: 30 pixels in 30 frames.
      vXFrames: [
        0.5, 0.5, 0.5, 0.75, 0.75, 0.75, 1, 1, 1, 1.25, 1.25, 1.25, 1.5, 1.5,
        1.5, 1.5, 1.5, 1.5, 1.25, 1.25, 1.25, 1, 1, 1, 0.75, 0.75, 0.75, 0.5,
        0.5, 0.5
      ],
      vXFrameOffset: 0,
      vxFrameTick: 0,
      xLookAhead:
        options.xLookAhead !== undefined
          ? options.xLookAhead
          : defaultLookAhead,
      xLookAheadBunker: options.xLookAheadBunker || null,
      xLookAheadTurret: options.xLookAheadTurret || null,
      unassisted: options.unassisted !== undefined ? options.unassisted : true,
      stepOffset: options.stepOffset,
      flipX: false,
      x: options.x || 0,
      // one more pixel, making a "headshot" look more accurate
      y: game.objects.view.data.world.height - height - 1,
      // slight offset for sprite vs. logical position
      yOffset: 1
    },
    options
  );

  domCanvas = {
    radarItem: Infantry.radarItemConfig(),
    animation: null
  };

  exports = {
    animate: () => animate(exports),
    data,
    domCanvas,
    die: (dieOptions) => die(exports, dieOptions),
    init: (options) => initInfantry(exports, options),
    moveTo: (x, y) => moveTo(exports, x, y),
    options,
    refreshHeight: () => refreshHeight(exports),
    refreshSprite: () => {
      // standard infantry / engineer
      exports.animConfig.sprite.url = getInfantryEngURL(data);
      if (data.role) {
        // possible BnB case
        getSpriteURL(exports);
      } else {
        domCanvas?.animation?.updateSprite(getInfantryEngURL(data));
      }
    },
    resume: () => resume(exports),
    stop: (noFire) => stop(exports, noFire)
  };

  exports.animConfig = {
    sprite: {
      url: getInfantryEngURL(data),
      // engineer sprite is packed slightly tighter.
      width: data.role ? 100 : 110,
      height: 22,
      frameWidth: data.role ? 20 : 22,
      frameHeight: 22,
      animationDuration: 0.9,
      horizontal: true,
      loop: true,
      reverseDirection: !data.isEnemy && !data.role
    }
  };

  exports.defaultItems = getTypes(
    'tank, van, missileLauncher, infantry, engineer, helicopter, turret',
    { exports }
  );

  exports.nearby = {
    options: {
      source: data.id,
      targets: undefined,
      useLookAhead: true,
      hit(targetID) {
        let target = getObjectById(targetID);
        const tData = target.data;
        // engineer + turret case? reclaim or repair.
        if (data.role && tData.type === TYPES.turret) {
          // is there work to do?
          // ignore if too far away, accounting for special look-ahead offset.
          let deltaX = target.data.x - data.x - (data.xLookAheadTurret || 0);
          if (deltaX > 0) {
            // nothing to see here.
            resume(exports);
          }
          if (target.engineerCanInteract(data.isEnemy)) {
            stop(exports, true);
            target.engineerHit(exports);
          } else {
            // nothing to see here.
            resume(exports);
          }
        } else if (
          gamePrefs.engineers_repair_bunkers &&
          data.role &&
          tData.type === TYPES.bunker &&
          data.isEnemy === tData.isEnemy &&
          target.engineerHit
        ) {
          // engineer + friendly bunker: repair, as needed
          target.engineerHit(exports);
        } else if (tData.isEnemy !== data.isEnemy) {
          // stop moving, start firing if not a friendly unit

          // BUT, ignore if it's an infantry/engineer -> enemy bunker case.
          // we don't want either types firing at bunkers.
          if (tData.type === TYPES.bunker) {
            // ensure we're moving, in case we were stopped
            resume(exports);
            return;
          }

          // fire at a non-friendly unit, IF it's actually in front of us.
          // nearby also includes a certain lookAhead amount behind.
          if (
            (data.isEnemy && tData.x < data.x) ||
            (!data.isEnemy && data.x < tData.x)
          ) {
            stop(exports);
          } else {
            // infantry has already passed the nearby unit.
            resume(exports);
          }
        } else {
          // failsafe: infantry may have stopped to fire at an engineer repairing a bunker.
          // ensure the infantry stop firing, by resuming "walking."
          resume(exports);
        }
      },
      miss() {
        // resume moving, stop firing.
        resume(exports);
      }
    },
    // who gets fired at (or interacted with)?
    // infantry can also claim enemy bunkers, or repair the balloons on friendly ones.
    items:
      options.nearbyItems ||
      exports.defaultItems.concat(getTypes('bunker:all', { exports })),
    targets: []
  };

  exports.collision = {
    options: {
      source: data.id,
      targets: undefined,
      hit(targetID) {
        let target = getObjectById(targetID);
        /**
         * bunkers and other objects infantry can interact with have an infantryHit() method.
         * if no infantryHit(), just die.
         * this is sort of an edge case, to prevent parachuting infantry landing in the middle of a tank.
         * this would normally cause both objects to stop and fire, but unable to hit one another due to the overlap.
         */
        if (!data.role && target.infantryHit) {
          // infantry hit bunker or other object
          target.infantryHit(exports);
        } else if (data.role && target.engineerHit) {
          // engineer hit bunker or other object
          target.engineerHit(exports);
        } else if (
          target.data.type !== TYPES.bunker &&
          target.data.type !== TYPES.endBunker
        ) {
          // probably a tank.
          data.attacker = targetID;
          die(exports, { attacker: targetID });
        }
      }
    },
    items: getTypes('bunker:all, tank:enemy', { exports })
  };

  return exports;
};

function fire(exports) {
  let { data, defaultItems, domCanvas, nearby } = exports;

  if (data.noFire) return;

  // walking is synced with animation, but bullets fire less often
  // always do positioning work, and maybe fire

  // hackish: ensure that animation is set.
  // this may be stuck if an engineer stops to repair a turret, but then is trying to fire at something else? :X
  if (!domCanvas.animation) {
    resume(exports);
  }

  // only infantry: move back and forth a bit, and flip animation, while firing - like original game
  const offset = data.vX * data.vXFrames[data.vXFrameOffset] * 4;

  // apply offset to the canvas-based animation
  domCanvas.animation.img.target.xOffset = offset;

  data.vxFrameTick += GAME_SPEED_RATIOED;

  if (data.vxFrameTick >= 1) {
    data.vxFrameTick = 0;
    data.vXFrameOffset += 3;
  }

  if (data.vXFrameOffset >= data.vXFrames.length) {
    // reverse direction!
    data.vXFrameOffset = 0;
    // toggle
    setFlip(exports, !data.flipX);
  }

  // only fire every so often
  if ((data.frameCount + data.fireModulusOffset) % data.fireModulus !== 0)
    return;

  game.addObject(TYPES.gunfire, {
    parent: data.id,
    parentType: data.type,
    isEnemy: data.isEnemy,
    // like tanks, allow infantry + engineer gunfire to hit bunkers unless "miss bunkers" is enabled in prefs.
    collisionItems: gamePrefs.tank_gunfire_miss_bunkers
      ? defaultItems
      : nearby.items,
    x: data.x + (data.width + 1) * (data.isEnemy ? 0 : 1),
    y: data.y + data.halfHeight - 2,
    vX: data.vX, // same velocity
    vY: 0
  });

  if (sounds.infantryGunFire) {
    playSound(sounds.infantryGunFire, exports);
  }
}

function moveTo(exports, x = exports.data.x, y = exports.data.y) {
  let { data } = exports;

  data.x = x;
  data.y = y;

  zones.refreshZone(exports);
}

function setFlip(exports, isFlipped) {
  let { data, domCanvas } = exports;

  data.flipX = !!isFlipped;
  // swap flipped / non-flipped sprites, when not BnB + engineers
  if (!data.role || !gamePrefs.bnb) {
    domCanvas?.animation?.updateSprite(getInfantryEngURL(data));
  }
}

function stop(exports, noFire) {
  let { data, domCanvas } = exports;

  if (data.stopped) return;

  data.stopped = true;
  data.noFire = !!noFire;

  if (data.role) {
    getSpriteURL(exports);
  } else {
    domCanvas?.animation?.updateSprite(getInfantryEngURL(data));
  }

  // engineers always stop, e.g., to repair and/or capture turrets.
  // infantry keep animation, but will appear to walk back and forth while firing.
  if (!data.noFire) {
    // infantry: reset "walking" offset, so initial movement is reduced
    data.vXFrameOffset = 0;
  }
}

function resume(exports) {
  let { data, domCanvas } = exports;

  if (!data.stopped) return;
  setFlip(exports, false);
  data.stopped = false;
  data.noFire = false;

  if (data.role) {
    getSpriteURL(exports);
  } else {
    domCanvas?.animation?.updateSprite(getInfantryEngURL(data));
  }
}

function setRole(exports, role, force) {
  let { data } = exports;

  if (data.role !== role || force) {
    // role
    data.role = role;
  }
}

function die(exports, dieOptions = {}) {
  let { data, radarItem } = exports;

  if (data.dead) return;

  if (!dieOptions?.silent) {
    playSound(sounds.genericSplat, exports);

    if (gamePrefs.bnb) {
      if (data.isEnemy) {
        playSound(sounds.bnb.dvdPrincipalScream, exports);
      } else if (data.role) {
        // engineer case
        if (data.isBeavis) {
          playSound(sounds.bnb.beavisScreamShort, exports);
        } else {
          playSound(sounds.bnb.buttheadScreamShort, exports);
        }
      } else {
        // friendly infantry
        playSound(sounds.bnb.screamShort, exports);
      }
    } else {
      playSound(sounds.scream, exports);
    }

    effects.inertGunfireExplosion({
      exports,
      inertColor: '#ccbbaa',
      vX: plusMinus(rnd(3)),
      vY: rnd(5)
    });

    const isInfantry = data.roles[data.role] === TYPES.infantry;
    const isEngineer = data.roles[data.role] === TYPES.engineer;

    const attacker = dieOptions?.attacker?.data;

    // generic notification
    if (
      !net.connected &&
      !data.isOnScreen &&
      // special case: certain attackers are handled separately.
      attacker?.type !== TYPES.tank &&
      attacker?.type !== TYPES.flame &&
      attacker?.type !== TYPES.smartMissile &&
      attacker?.type !== TYPES.helicopter &&
      attacker?.parentType !== TYPES.tank &&
      attacker?.parentType !== TYPES.infantry &&
      attacker?.parentType !== TYPES.superBunker &&
      attacker?.parentType !== TYPES.helicopter
    ) {
      // infantry / engineer lost
      const contexts = {
        [TYPES.shrapnel]: 'Shrapnel ',
        [TYPES.gunfire]: 'Gunfire ',
        [TYPES.bomb]: 'A bomb '
      };
      const context = contexts[attacker?.type] || '';
      const isOpponent = game.players.local.data.isEnemy !== data.isEnemy;
      const emoji = '<span class="no-emoji-substitution">☠️</span>';
      const str = context
        ? `${context} killed %s ${emoji}`
        : isOpponent
          ? `You killed %s ${emoji}`
          : `You lost %s ${emoji}`;
      const maybeEnemy = isOpponent ? 'an enemy ' : 'an ';
      if (isInfantry && gamePrefs[`notify_${TYPES.infantry}`]) {
        game.objects.notifications.add(
          str.replace('%s', `${maybeEnemy}infantry`)
        );
      } else if (isEngineer && gamePrefs[`notify_${TYPES.engineer}`]) {
        game.objects.notifications.add(
          str.replace('%s', `${maybeEnemy}engineer`)
        );
      }
    }

    common.addGravestone(exports);
  }

  sprites.removeNodesAndUnlink(exports);

  data.energy = 0;

  // stop moving while exploding
  data.vX = 0;

  data.dead = true;

  radarItem?.die(dieOptions);

  if (dieOptions.attacker) {
    data.attacker = dieOptions.attacker;
  }

  common.onDie(data.id, dieOptions);
}

function animate(exports) {
  let { collision, data, domCanvas, nearby } = exports;

  if (data.dead) return data.canDestroy;

  // infantry are "always" walking, even when "stopped" (in which case they're firing.)
  // engineers fully stop to claim and/or repair bunkers.
  domCanvas?.animation?.animate?.();

  if (!data.stopped) {
    if (data.roles[data.role] === TYPES.infantry) {
      // infantry walking "pace" varies slightly, similar to original game
      moveTo(
        exports,
        data.x +
          data.vX * GAME_SPEED_RATIOED * data.vXFrames[data.vXFrameOffset],
        data.y
      );

      data.vxFrameTick += GAME_SPEED_RATIOED;
      if (data.vxFrameTick >= 1) {
        data.vxFrameTick = 0;
        data.vXFrameOffset++;
      }
      if (data.vXFrameOffset >= data.vXFrames.length) data.vXFrameOffset = 0;
    } else {
      // engineers always move one pixel at a time; let's say it's because of the backpacks.
      moveTo(exports, data.x + data.vX * GAME_SPEED_RATIOED, data.y);
    }
  } else {
    if (!data.noFire) {
      // firing, or reclaiming/repairing?
      // only fire (i.e., GunFire objects) when stopped
      fire(exports);
    }
  }

  sprites.draw(exports);

  collisionTest(collision, exports);

  // start, or stop firing?
  nearbyTest(nearby, exports);

  recycleTest(exports);

  data.frameCount++;

  return data.dead && data.canDestroy;
}

function initInfantry(exports, options = {}) {
  let { data, nearby } = exports;

  if (options?.noInit) return;

  // infantry, or engineer?
  setRole(exports, data.role, true);

  refreshHeight(exports);

  // note: domCanvas must exist before this call, because it causes modifications. :X
  // we also need to know the role, before doing canvas stuff here.
  getSpriteURL(exports);

  common.initDOM(exports);

  exports.radarItem = game.objects.radar.addItem(exports);

  common.initNearby(nearby, exports);

  moveTo(exports, data.x, data.y);
}

function refreshMeasurements(exports) {
  let { data, options } = exports;

  // hackish: make butthead stops to the left, and beavis stops to the right of (e.g.) a turret.
  if (gamePrefs.bnb && !data.isEnemy) {
    // override regular look-ahead, special case.
    data.xLookAhead = options.isButthead ? -28 : 15;
    // TODO: review - BnB are not spaced out enough, not far apart.
    data.xLookAheadTurret = options.isButthead ? 36 : 24;
  } else {
    data.xLookAhead = data.isEnemy
      ? 12
      : options.xLookAhead || data.defaultLookAhead;
    data.xLookAheadTurret = data.isEnemy ? 0 : 12;
  }

  data.halfHeight = data.height / 2;
  data.y = game.objects.view.data.world.height - data.height - 1;
}

function refreshHeight(exports) {
  let { data, options } = exports;

  // special case: BnB pref change / init logic
  if (options.isEnemy || !gamePrefs.bnb) {
    height = DEFAULT_HEIGHT;
  } else {
    // if role (engineer), then BnB now
    height = options.role ? BNB_HEIGHT : DEFAULT_HEIGHT;
  }

  if (options.role) {
    // if an engineer, ensure the proper sprite / animation is applied.
    getSpriteURL(exports);
  }

  data.height = height;

  refreshMeasurements(exports);
}

function getInfantryEngURL(data) {
  const parts = [];

  // infantry / engineer
  parts.push(data.roles[data.role]);

  if (data.isEnemy) parts.push('enemy');

  // file name pattern
  parts.push('sprite-horizontal');

  if (data.flipX) parts.push('flipped');

  return `${parts.join('-')}.png`;
}

function getSpriteURL(exports) {
  let { animConfig, data, domCanvas } = exports;

  // TODO: refactor, split sprite URL + animation logic.
  if (
    // NOTE: Only friendly side has BnB, for now
    gamePrefs.bnb &&
    !data.isEnemy &&
    data.role &&
    game.players.local.data.isEnemy === data.isEnemy
  ) {
    if (data.isBeavis) {
      domCanvas.animation = common.domCanvas.canvasAnimation(
        exports,
        data.stopped ? beavisHeadbanging : beavisWalking
      );
      return data.stopped
        ? 'bnb/beavis-headbang.png'
        : 'bnb/beavis-walking.png';
    }
    if (data.isButthead) {
      domCanvas.animation = common.domCanvas.canvasAnimation(
        exports,
        data.stopped ? buttheadHeadbanging : buttheadWalking
      );
      return data.stopped
        ? 'bnb/butthead-headbang.png'
        : 'bnb/butthead-walking.png';
    }
  } else {
    if (data.stopped) {
      // hack: reset to proper frame.
      // "freeze" animation, stop at "feet planted" frame for both types.
      if (domCanvas.animation) {
        domCanvas.animation.img.source.frameX = data.isEnemy ? 0 : 2;
        domCanvas.animation.stop();
      }
    } else {
      if (!domCanvas.animation) {
        domCanvas.animation = common.domCanvas.canvasAnimation(
          exports,
          animConfig
        );
      } else {
        domCanvas.animation?.resume();
      }
    }
  }
  return getInfantryEngURL(data);
}

Infantry.radarItemConfig = () => ({
  width: 1.25,
  height: 2.5,
  draw: (ctx, obj, pos, width, height) => {
    ctx.roundRect(
      pos.left(obj.data.left),
      pos.bottomAlign(height, obj),
      pos.width(width),
      pos.height(height),
      [height, height, 0, 0]
    );
  }
});

export { Infantry };
