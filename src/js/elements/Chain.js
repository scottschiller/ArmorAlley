import { game, getObjectById } from '../core/Game.js';
import { common } from '../core/common.js';
import { utils } from '../core/utils.js';
import { playSound, skipSound, sounds } from '../core/sound.js';
import { gamePrefs } from '../UI/preferences.js';
import { zones } from '../core/zones.js';
import { sprites } from '../core/sprites.js';
import { GAME_SPEED_RATIOED, worldHeight } from '../core/global.js';

let pattern;

const Chain = (options = {}) => {
  let exports;

  let data, objects, defaultHeight;

  defaultHeight = game.objects.view.data.world.height + 5;

  data = common.inheritData(
    {
      type: 'chain',
      energy: 1,
      hostile: !!options.hostile, // applies when detached from base or balloon
      width: 3,
      defaultHeight,
      /**
       * slightly complex: element height is basically fixed, moved via transforms,
       * set at init, zeroed when chain drops and reset if balloon respawns.
       */
      height: defaultHeight,
      adjustedWorldHeight: game.objects.view.data.world.height - 16,
      appliedHeight: 0,
      damagePoints: 18,
      fallingVelocity: 0.5,
      fallingVelocityInitialRate: 0.5,
      fallingVelocityIncrement: 0.125
    },
    options
  );

  let domCanvas = {
    draw: (ctx, obj, pos, width, height) => {
      if (!pattern) {
        pattern = ctx.createPattern(
          utils.image.getImageObject('chain.png'),
          'repeat'
        );
      }
      ctx.fillStyle = pattern;
      // attached to balloon, or bunker?
      const parent =
        game.objectsById[obj.objects?.balloon] ||
        game.objectsById[obj.objects?.bunker];

      /**
       * Chain may eventually be free-falling, e.g,. from a popped balloon,
       * and hence, no bunker or balloon reference to set left position by.
       * Workaround: assign and update x/left position when parent is known.
       */
      if (parent) {
        // balloon or bunker, minus half of own width
        obj.data.lastX =
          parent.data.x + parent.data.halfWidth - width / 2 + 0.5;
      }

      const left = obj.data.lastX;
      const top = pos.top(obj.data.y - 32);

      // if bunker is present, don't draw chain atop bunker.
      const adjustedHeight = game.objectsById[obj.objects.bunker]?.data?.height
        ? worldHeight -
          obj.data.y -
          (game.objectsById[obj.objects.bunker]?.data?.height || 0) +
          3.75
        : height;

      ctx.rect(
        (left - game.objects.view.data.battleField.scrollLeft) *
          game.objects.view.data.screenScale,
        top,
        width * game.objects.view.data.screenScale,
        Math.max(0, adjustedHeight) * game.objects.view.data.screenScale
      );

      ctx.fill();
    }
  };

  objects = {
    bunker: options?.bunker?.data?.id || null,
    balloon: options?.balloon?.data?.id || null
  };

  exports = {
    animate: () => animate(exports),
    applyHeight: () => applyHeight(exports),
    attachBalloon: (balloon) => attachBalloon(exports, balloon),
    data,
    detachFromBunker: () => detachFromBunker(exports),
    domCanvas,
    die: () => die(exports),
    init: () => initChain(exports),
    isJerking: (intent) => isJerking(exports, intent),
    objects,
    setEnemy: (isEnemy) => setEnemy(exports, isEnemy)
  };

  return exports;
};

function applyHeight(exports) {
  exports.data.appliedHeight = exports.data.height;
}

function attachBalloon(exports, balloon = null) {
  exports.objects.balloon = balloon;
}

function detachFromBunker(exports) {
  exports.objects.bunker = null;
}

function jerkCheck(exports, sound) {
  let { data, objects } = exports;

  // can't be jerking your chain if there's no balloon, it's not in view, and/or the chain is dead.
  if (
    !objects.balloon ||
    !getObjectById(objects.balloon)?.data?.isOnScreen ||
    data.dead
  )
    skipSound(sound);
}

function isJerking(exports, intent) {
  // "Check it out, Beavis... I'm jerking my chain." ⛓️✊🤣
  let { data, objects } = exports;

  // only comment if separated from the bunker, alive, and attached to a balloon
  if (objects.bunker || !objects.balloon || data.dead) return;

  // "visual effect" 🤣 - method will return result, i.e., bottom of chain is not off-screen
  const isJerking = updateIsJerking(exports, intent);

  if (!isJerking) return;

  if (!gamePrefs.bnb) return;

  playSound(sounds.bnb.buttheadJerkingMyChain, null, {
    onplay: () => jerkCheck(exports)
  });
}

function updateIsJerking(exports, intent) {
  let { data } = exports;

  if (intent && !gamePrefs.bnb) return;

  // only start "visual effect" if end of chain is in view, and likely to stay in view.
  const isJerkingNow =
    intent && data.y + data.height < data.adjustedWorldHeight;

  // TODO: fix. ;)
  // utils.css.addOrRemove(dom.o, isJerkingNow, css.jerking);

  return isJerkingNow;
}

function die(exports) {
  let { data, objects } = exports;

  if (data.dead) return;

  sprites.removeNodesAndUnlink(exports);

  data.energy = 0;

  data.dead = true;

  // detach balloon, if applicable
  let balloon = getObjectById(objects.balloon);

  if (balloon) {
    balloon.detachFromBunker();
    objects.balloon = null;
    balloon = null;
  }

  // remove bunker reference, too
  if (objects.bunker) {
    let bunker = getObjectById(objects.bunker);
    if (bunker) {
      bunker.nullifyChain();
      objects.bunker = null;
      bunker = null;
    }
  }

  common.onDie(data.id);
}

function setEnemy(exports, isEnemy) {
  let { data } = exports;

  if (data.isEnemy === isEnemy) return;

  data.isEnemy = isEnemy;

  zones.changeOwnership(exports);
}

function animate(exports) {
  let { data, objects } = exports;

  let x, y, height;

  x = data.x;

  height = data.height;

  // move if attached, fall if not

  let balloon = getObjectById(objects.balloon);
  let bunker = getObjectById(objects.bunker);

  if (bunker && !bunker.data.dead) {
    if (balloon) {
      // bunker -> chain -> balloon

      // slight offset, so chain runs right underneath balloon
      y = balloon.data.y + balloon.data.height - 3;

      // make the chain fall faster if the balloon is toast.
      if (balloon.data.dead) {
        // fall until the bottom is reached.
        if (data.y < game.objects.view.data.world.height + 2) {
          data.fallingVelocity += data.fallingVelocityIncrement;
          y = data.y + data.fallingVelocity;
        } else {
          // chain has fallen to bottom - stay there.
          // chain may be reset if balloon is restored.
          y = data.y;

          // reset height until next balloon respawn.
          // prevent bunkers from showing chains when they are
          // brought off-screen -> on-screen and have no balloon.
          if (data.appliedHeight !== 0) {
            height = 0;
            data.height = 0;
            applyHeight(exports);
          }
        }
      } else {
        // balloon is active, may have respawned.
        // reset falling state.
        if (data.fallingVelocity) {
          data.fallingVelocity = data.fallingVelocityInitialRate;
        }

        // live height might have been zeroed if balloon was dead. restore if so.
        if (!data.appliedHeight) {
          height = data.defaultHeight;
          data.height = data.defaultHeight;
          applyHeight(exports);
        }
      }

      // always track height, only assign if chain becomes detached.
      height = game.objects.view.data.world.height - y - bunker.data.height;
    } else {
      // - bunker -> chain, no balloon object at all?
      // this case should probably never happen
      // and might be a bug if it does. ;)

      y = game.objects.view.data.world.height - data.height;
    }
  } else {
    // no bunker: free, as a bird

    if (!data.hostile) {
      data.hostile = true;

      zones.changeOwnership(exports);
    }

    if (balloon && !balloon.data.dead) {
      // chain -> balloon
      x = balloon.data.x + balloon.data.halfWidth - 3;

      y = balloon.data.y + balloon.data.height - 1;
    } else {
      // free-falling, detached chain
      y = data.y;

      y += data.fallingVelocity * GAME_SPEED_RATIOED;

      // cheap gravity acceleration
      data.fallingVelocity +=
        data.fallingVelocityIncrement * GAME_SPEED_RATIOED;

      if (y >= game.objects.view.data.world.height + 2) {
        die(exports);
      }
    }
  }

  sprites.moveTo(exports, x, y);

  if (height !== undefined && data.height !== height) {
    data.height = height;
  }

  sprites.draw(exports);

  return data.dead && data.canDestroy;
}

function initChain(exports) {
  common.initDOM(exports);

  applyHeight(exports);

  // hackish: do this once when in editing mode, just to draw correctly.
  if (game.objects.editor) {
    animate(exports);
  }
}

export { Chain };
