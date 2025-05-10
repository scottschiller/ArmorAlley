import { common } from './common.js';
import { gamePrefs, PREFS } from '../UI/preferences.js';
import {
  ENERGY_TIMER_DELAY,
  ENERGY_TIMER_FADE_RATIO,
  FPS,
  GAME_SPEED_RATIOED
} from '../core/global.js';
import { game, getObjectById } from './Game.js';
import { zones } from './zones.js';

const sprites = {
  create: (options = {}) => {
    // NOTE: now only used by level editor.
    const o = document.createElement('div');

    // note: `isEnemy` value may not be 'enemy', but 'facing-left' (e.g., for balloons.)
    o.className = `sprite ${options.className}${
      options.isEnemy ? ' ' + options.isEnemy : ''
    }${game.objects.editor ? ' editor-placeholder' : ''}`;

    // editor case
    if (game.objects.editor && options.id) {
      o.dataset.id = options.id; // data-id = ...
    }

    // first-time append, first time on-screen - if a valid node.
    if (o?.nodeType) {
      game.dom.battlefield.appendChild(o);
    }

    return o;
  },

  moveTo: (exports, x = exports.data.x, y = exports.data.y) => {
    exports.data.x = x;
    exports.data.y = y;

    let { domCanvas } = exports;

    // TODO: figure out how to refresh this efficiently.
    if (domCanvas?.img) {
      if (domCanvas?.img.forEach) {
        domCanvas?.img.forEach((imgObj) => {
          if (imgObj.target) {
            imgObj.target.x = exports.data.x;
            imgObj.target.y = exports.data.y;
          }
        });
      }
      if (domCanvas?.img?.target) {
        domCanvas.img.target.x = exports.data.x;
        domCanvas.img.target.y = exports.data.y;
      }
    }

    /**
     * Hackish: don't refresh dead things, they'll be re-added to `game.objectsById`.
     * Only turrets can be restored, and they don't move.
     */
    if (!exports.data.isTerrainItem && !exports.data.dead) {
      zones.refreshZone(exports);
    }
  },

  attachToTarget: (exports, target) => {
    // "stick" a target, moving a munition (bomb, gunfire, spark) relative to the target it has hit

    if (!exports?.data || !target?.data) return;

    // track and move with the target, too
    exports.data.target = target.data.id;

    exports.data.targetOffsetX = exports.data.x - target.data.x;
    exports.data.targetOffsetY = exports.data.y - target.data.y;
  },

  draw: (exports) => {
    /**
     * Most all objects call this for rendering purposes.
     */

    if (exports?.domCanvas && !exports.domCanvas.animation) {
      /**
       * Editor hack: avoid redundant draw calls on init.
       * TODO: identify and fix root cause.
       */
      if (game.objects.editor) {
        if (
          exports.data._lastDrawFrame === game.objects.gameLoop.data.frameCount
        ) {
          return;
        }
        exports.data._lastDrawFrame = game.objects.gameLoop.data.frameCount;
      }
      common.domCanvas.draw(exports);
    }

    /**
     * If in the editor and there is an associated DOM node, move it as well.
     * This can probably be optimized, and limited to battlefield items.
     * It's possible the dom + node structure has just been deleted, also.
     * TOOD: ensure placeholder node is removed from the DOM.
     */
    if (game.objects.editor && exports.dom?.o?.nodeType) {
      sprites.setTransformXY(
        exports,
        exports.dom.o,
        exports.data.x,
        // TODO: sort out terrain item placeholder alignment.
        exports.data.y -
          (exports.data.isTerrainItem ? exports.data.height - 4 : 0)
      );
    }
  },

  setTransformXY: (exports, o, x, y) => {
    if (!o?.nodeType) return;

    // ignore if off-screen and a real DOM node, and editor is not active.
    if (
      !exports?.data?.isOnScreen &&
      exports?.dom?.o?.nodeType &&
      !game.objects.editor
    ) {
      return;
    }

    // include scroll offset for DOM nodes - likely editor placeholders.
    if (exports?.data?.type && !exports.data.excludeLeftScroll) {
      x -= game.objects.view.data.battleField.scrollLeft;
    }

    o.style.transform = `translate3d(${x}px, ${y}px, 0px)`;
  },

  nullify: (obj) => {
    for (const item in obj) {
      obj[item] = null;
    }
  },

  removeNode: (node) => {
    if (!node) return;

    node.remove?.();
    node = null;
  },

  removeNodeArray: (nodeArray) => {
    let i, j;

    for (i = 0, j = nodeArray.length; i < j; i++) {
      // TESTING: Does manually-removing transform before node removal help with GC? (apparently not.)
      // Chrome issue: https://code.google.com/p/chromium/issues/detail?id=304689
      nodeArray[i].remove();
      nodeArray[i] = null;
    }

    j = null;
    nodeArray = null;
  },

  removeNodes: (dom) => {
    // remove all nodes in a structure
    let item;

    for (item in dom) {
      // node reference, or array of nodes?
      if (dom[item] instanceof Array) {
        sprites.removeNodeArray(dom[item]);
      } else {
        sprites.removeNode(dom[item]);
      }
      dom[item] = null;
    }
  },

  removeNodesAndUnlink: (exports) => {
    if (!exports) {
      console.warn('removeNodesAndUnlink: WTF no exports?');
      return;
    }
    if (!exports.data) {
      return;
    }

    // prevent redundant calls
    if (exports.data.canDestroy) return;

    if (exports.dom) {
      sprites.removeNodes(exports.dom);
      sprites.nullify(exports.dom);
    }

    // mark object for destruction
    exports.data.canDestroy = true;

    // also "unlink" from game objects array
    common.unlinkObject(exports);
  },

  isOnScreen: (target) => {
    if (!target?.data) return;

    /**
     * Account for items like turrets which may have larger "scan nodes,"
     * and are considered wider for display vs. logical, e.g., collision.
     */
    if (target.data.logicalWidth) {
      return (
        target.data.x + target.data.width + target.data.logicalWidth >=
          game.objects.view.data.battleField.scrollLeft &&
        target.data.x - target.data.width - target.data.logicalWidth <
          game.objects.view.data.battleField.scrollLeftWithBrowserWidth
      );
    }

    // is the target within the range of screen coordinates?
    return (
      target.data.x + target.data.width >=
        game.objects.view.data.battleField.scrollLeft &&
      target.data.x <
        game.objects.view.data.battleField.scrollLeftWithBrowserWidth
    );
  },

  updateIsOnScreen: (o, forceUpdate) => {
    if (!o?.data) return;

    if (forceUpdate || sprites.isOnScreen(o)) {
      // exit if not already updated
      if (o.data.isOnScreen) return;

      o.data.isOnScreen = true;

      // object may be in the process of being destroyed
      if (!o?.dom?.o) return;

      // callback, if defined
      o.isOnScreenChange?.(o.data.isOnScreen);
    } else if (o.data.isOnScreen !== false) {
      o.data.isOnScreen = false;
      // callback, if defined
      if (o.isOnScreenChange) {
        o.isOnScreenChange(o.data.isOnScreen);
      }
    }
  },

  maybeFade: (exports) => {
    let { data, domCanvas } = exports;

    if (!data.isFading) return;

    // if fading, animate every frame.
    data.fadeFrame += GAME_SPEED_RATIOED;

    // don't start fade until +ve.
    if (data.fadeFrame < 0) return;

    if (data.fadeFrame < data.fadeFrames) {
      domCanvas.img.target.opacity = 1 - data.fadeFrame / data.fadeFrames;
    }

    if (data.fadeFrame > data.fadeFrames && !data.canDestroy) {
      // animation finished
      sprites.removeNodesAndUnlink(exports);
    }
  },

  movePendingDie: (exports) => {
    let { data } = exports;

    /**
     * Move with "attached" target offset, if there is one -
     * e.g., shrapnel "stuck" to helicopter.
     */
    let target = getObjectById(data.target);

    if (target?.data) {
      sprites.moveTo(
        exports,
        target.data.x + data.targetOffsetX,
        target.data.y + data.targetOffsetY
      );
    }

    sprites.draw(exports);

    sprites.maybeFade(exports);
  },

  updateEnergy: (objectID) => {
    let object = getObjectById(objectID);

    // don't render if destroyed
    if (!object) return;

    // only do work if visible, OR "always" shown and needing updates
    if (
      !object.data.isOnScreen &&
      gamePrefs.show_health_status !== PREFS.SHOW_HEALTH_ALWAYS
    )
      return;

    // prevent certain things from rendering this, e.g., smart missiles.
    if (object.data.noEnergyStatus) return;

    // if a cloaked (in a cloud) chopper and not on your side, don't show - the flash of color would be a giveaway.
    if (
      object.data.cloaked &&
      object.data.isEnemy !== game.players.local.data.isEnemy
    )
      return;

    // some objects may have longer timings, e.g., turrets.
    let timerDelayScale = object.data.energyTimerScale || 1;

    // don't constantly show if at 100%
    if (
      gamePrefs.show_health_status === PREFS.SHOW_HEALTH_SOMETIMES &&
      object.data.energy < object.data.energyMax
    ) {
      if (!object.data.energyCanvasTimer) {
        object.data.energyCanvasTimer =
          FPS * ENERGY_TIMER_DELAY * timerDelayScale;
      } else {
        // "reset" timer to just after the fade-in point, as needed.
        object.data.energyCanvasTimer = Math.max(
          object.data.energyCanvasTimer,
          FPS *
            ENERGY_TIMER_DELAY *
            timerDelayScale *
            (1 - ENERGY_TIMER_FADE_RATIO)
        );
      }
    }
  }
};

export { sprites };
