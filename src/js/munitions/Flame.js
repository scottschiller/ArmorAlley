import { common } from '../core/common.js';
import { collisionTest } from '../core/logic.js';
import { TYPES, getTypes } from '../core/global.js';
import { sprites } from '../core/sprites.js';
import { utils } from '../core/utils.js';
import { playSound, sounds } from '../core/sound.js';
import { game, getObjectById } from '../core/Game.js';

const spriteWidth = 64;
const spriteHeight = 36;

const Flame = (options = {}) => {
  let data, domCanvas, collision, exports;

  data = common.inheritData(
    {
      type: 'flame',
      parent: options.parent || null,
      parentType: options.parentType || null,
      isEnemy: options.isEnemy,
      frameCount: 0,
      expireFrameCount: options.expireFrameCount || 2,
      hostile: true, // flame burns both sides, infantry/engineers/paratroopers
      width: 32,
      height: 18,
      damagePoints: options.damagePoints || 1,
      target: null
    },
    options
  );

  domCanvas = {
    img: {
      src: utils.image.getImageObject(
        data.isEnemy ? 'tank_flame-flipped.png' : 'tank_flame.png'
      ),
      source: {
        x: 0,
        y: 0,
        width: spriteWidth,
        height: spriteHeight
      },
      target: {
        x: data.x + (data.isEnemy ? -(spriteWidth / 2) - 3 : 3),
        y: data.y - 2,
        width: spriteWidth / 2,
        height: spriteHeight / 2
      }
    }
  };

  // offset left 100% if parent tank is an enemy, so we line up with the tank
  if (options.isEnemy) {
    data.x -= data.width;
  }

  exports = {
    animate: () => animate(exports),
    data,
    domCanvas,
    die: (force) => die(exports, force),
    init: () => initFlame(exports)
  };

  collision = {
    options: {
      source: data.id,
      targets: undefined,
      hit(targetID) {
        if (data.damagePoints) {
          // hit once, then remain until the object animation has completed.
          common.hit(targetID, data.damagePoints, data.id);
          /**
           * Nullify this object unless infantry / engineers, so we don't
           * hit e.g., a super-bunker repeatedly.
           */
          if (getObjectById(targetID)?.data?.type !== TYPES.infantry) {
            data.damagePoints = 0;
          }
        }
      }
    },
    /**
     * If unspecified, use default list of items which flames can hit.
     *
     * Per the original game, "flame burns both sides" - though friendly fire
     * is unlikely to happen where infantry/engineers would not already be at
     * risk, i.e., from an enemy tank flamethrower or armed super bunker.
     */
    items:
      options.collisionItems ||
      getTypes(
        'infantry:all, engineer:all, parachuteInfantry:all, helicopter, endBunker, superBunker, turret',
        { exports }
      )
  };

  exports.collision = collision;

  return exports;
};

function die(exports, force) {
  let { data } = exports;

  // aieee!

  if (data.dead && !force) return;

  data.dead = true;

  sprites.removeNodesAndUnlink(exports);

  common.onDie(data.id);
}

function animate(exports) {
  let { collision, data } = exports;

  sprites.draw(exports);

  if (data.dead) return true;

  if (!data.expired && data.frameCount > data.expireFrameCount) {
    die(exports);
  }

  data.frameCount++;

  if (!data.isInert) {
    collisionTest(collision, exports);
  }

  // notify caller if now dead and can be removed.
  return data.dead && data.canDestroy;
}

function initFlame() {
  if (sounds.tankFlame) {
    playSound(sounds.tankFlame, game.players.local);
  }
}

export { Flame };
