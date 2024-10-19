import { common } from './common.js';
import { gamePrefs, PREFS } from '../UI/preferences.js';
import {
  debug,
  debugType,
  ENERGY_TIMER_DELAY,
  ENERGY_TIMER_FADE_RATIO,
  FPS,
  isChrome,
  rnd,
  TYPES,
  useDOMPruning,
  winloc
} from '../core/global.js';
import { game } from './Game.js';
import { zones } from './zones.js';

// by default, transform: translate3d(), more GPU compositing seen vs.2d-base transform: translate().
const useTranslate3d = !winloc.match(/noTranslate3d/i);

const sprites = {
  withStyle: (node) => {
    // experimental: decorate a DOM node with shortcuts, perhaps reducing style "access"
    if (node && !node._style) {
      // this may be no different vs. direct access(?)
      // node._style = node.style;

      // this may be faster, at least in Chrome.
      node._style = {
        getPropertyValue: node.style.getPropertyValue.bind(node.style),
        setProperty: node.style.setProperty.bind(node.style)
      };
    }

    return node;
  },

  getWithStyle: (id) => sprites.withStyle(document.getElementById(id)),

  create: (options = {}) => {
    const o = sprites.withStyle(document.createElement('div'));

    // note: `isEnemy` value may not be 'enemy', but 'facing-left' (e.g., for balloons.)
    o.className = `sprite ${options.className}${
      options.isEnemy ? ' ' + options.isEnemy : ''
    }${game.objects.editor ? ' editor-placeholder' : ''}`;

    // editor case
    if (game.objects.editor && options.id) {
      o.dataset.id = options.id; // data-id = ...
    }

    if (!options?.className?.match(/terrain/i)) {
      o._style.setProperty('top', '0px');
      o._style.setProperty('left', '0px');
    }

    if (debugType) {
      o._style.setProperty('font-size', '3px');
    }

    return o;
  },

  moveTo: (exports, x = exports.data.x, y = exports.data.y) => {
    exports.data.x = x;
    exports.data.y = y;

    // TODO: figure out how to refresh this efficiently.
    if (exports.data.domCanvas?.img) {
      if (exports.data.domCanvas?.img.forEach) {
        exports.data.domCanvas?.img.forEach((imgObj) => {
          if (imgObj.target) {
            imgObj.target.x = exports.data.x;
            imgObj.target.y = exports.data.y;
          }
        });
      }
      if (exports.data.domCanvas?.img?.target) {
        exports.data.domCanvas.img.target.x = exports.data.x;
        exports.data.domCanvas.img.target.y = exports.data.y;
      }
    }

    /**
     * Hackish: don't refresh dead things, they'll be re-added to `game.objectsById`.
     * Only turrets can be restored, and they don't move.
     */
    if (!exports.data.isTerrainItem && !exports.data.dead) {
      zones.refreshZone(exports);
    }

    sprites.moveWithScrollOffset(exports);
  },

  moveWithScrollOffset: (exports) => {
    if (!exports?.dom?.o) return;

    // ignore if off-screen and a real DOM node, and editor is not active.
    if (
      !exports?.data?.isOnScreen &&
      exports?.dom?.o?.nodeType &&
      !game.objects.editor
    ) {
      if (debug) {
        // mark as "skipped" transform
        game.objects.gameLoop.incrementTransformCount(true);
      }
      return;
    }

    sprites.setTransformXY(
      exports,
      exports.dom.o,
      `${exports.data.x}px`,
      `${exports.data.y}px`
    );
  },

  attachToTarget: (exports, target) => {
    // "stick" a target, moving a munition (bomb, gunfire, spark) relative to the target it has hit

    if (!exports?.data || !target) return;

    // track and move with the target, too
    exports.data.target = target;

    // note the target's coords at moment of impact; this will be checked by setTransformXY()
    exports.data.targetStartX = target?.data?.x;
    exports.data.targetStartY = target?.data?.y;
  },

  setTransformXY: (exports, o, x, y) => {
    /**
     * given an object (and its on-screen/off-screen status), apply transform to its live DOM node.
     * battlefield scroll and "target" offset can also be included.
     */

    // hackish: if this lives on the canvas, handle that here.
    // we don't care about on/off-screen at this juncture, because logic may still need to run.
    // furthermore: don't draw if there is an animation defined, it will take care of itself.
    if (exports?.data?.domCanvas && !exports.data.domCanvas.animation) {
      common.domCanvas.draw(exports);
    }

    if (!o) return;

    // ignore if off-screen and a real DOM node, and editor is not active.
    if (
      !exports?.data?.isOnScreen &&
      exports?.dom?.o?.nodeType &&
      !game.objects.editor
    ) {
      if (debug) {
        // mark as "skipped" transform
        game.objects.gameLoop.incrementTransformCount(true);
      }
      return;
    }

    // somewhat hackish: include scroll and "target" offset for most pixel-based values
    if (
      exports?.data?.type &&
      !exports.data.excludeLeftScroll &&
      x.indexOf('px') !== -1
    ) {
      // drop px
      x = parseFloat(x);

      x -= game.objects.view.data.battleField.scrollLeft;

      // animating e.g., a bomb that's hit a tank: move the spark sprite
      // relative to the tank, as the tank may still be alive and moving
      if (exports?.data?.target) {
        // has the target moved?
        let deltaX = exports.data.target.data.x - exports.data.targetStartX;
        let deltaY = exports.data.target.data.y - exports.data.targetStartY;

        x += deltaX;
        y = `${parseFloat(y) + deltaY}px`;
      }

      // back to pixels
      x = `${x}px`;
    }

    // TODO: review
    // a pooled node may have just been released; ignore if no `_style`.
    if (!o._style) {
      if (!exports?.data?.domCanvas) {
        console.warn('setTransformXY(): WTF no o._style?', o);
      }
      return;
    }

    if (useTranslate3d) {
      o._style.setProperty('transform', `translate3d(${x}, ${y}, 0px)`);
    } else {
      o._style.setProperty('transform', `translate(${x}, ${y})`);
    }

    if (debug) {
      // show that this element was moved
      // o._style.setProperty('outline', `1px solid #${rndInt(9)}${rndInt(9)}${rndInt(9)}`);
      game.objects.gameLoop.incrementTransformCount();
    }
  },

  nullify: (obj) => {
    for (const item in obj) {
      obj[item] = null;
    }
  },

  removeNode: (node) => {
    // DOM pruning safety check: object dom references may include object -> parent node for items that died
    // while they were off-screen (e.g., infantry) and removed from the DOM, if pruning is enabled.
    // normally, all nodes would be removed as part of object clean-up. however, we don't want to remove
    // the battlefield under any circumstances. ;)
    if (useDOMPruning && node === game.objects.view.dom.battleField) return;

    if (!node) return;

    node.remove?.();
    node._style = null;
    node = null;
  },

  removeNodeArray: (nodeArray) => {
    let i, j;

    for (i = 0, j = nodeArray.length; i < j; i++) {
      // TESTING: Does manually-removing transform before node removal help with GC? (apparently not.)
      // Chrome issue: https://code.google.com/p/chromium/issues/detail?id=304689
      nodeArray[i].remove();
      nodeArray[i]._style = null;
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
    if (!exports?.dom) {
      console.warn('removeNodesAndUnlink: WTF no exports?', exports);
      return;
    }

    sprites.removeNodes(exports.dom);
    sprites.nullify(exports.dom);

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
    if (!o?.data || !useDOMPruning) return;

    if (forceUpdate || sprites.isOnScreen(o)) {
      // exit if not already updated
      if (o.data.isOnScreen) return;

      o.data.isOnScreen = true;

      // object may be in the process of being destroyed
      if (!o?.dom?.o) return;

      // restore position, including battlefield scroll offset
      sprites.moveWithScrollOffset(o);

      if (o.dom._oRemovedParent) {
        zones.debugZone(o);

        // previously removed: re-append to DOM
        o.dom._oRemovedParent.appendChild(o.dom.o);
        o.dom._oRemovedParent = null;
      } else {
        if (o.dom.o.parentNode) {
          // likely a "preserved" node left in the DOM intentionally
          // (e.g., local helicopter) and does not need to be re-appended.
          if (!o.data.preserveOffscreenDOM) {
            console.warn(
              'updateIsOnScreen(): WTF, on-screen node already appended?',
              o.data.type,
              o
            );
          }
        } else {
          zones.debugZone(o);

          // first-time append, first time on-screen - if a valid node.
          if (o.dom.o?.nodeType) {
            game.dom.battlefield.appendChild(o.dom.o);
            if (isChrome) {
              // hackish: annoying render / paint fix for first-append items, specific to Chrome.
              // here be dragons, etc.
              o.dom.o.style.outline = `1px solid transparent`;
            }
          }
        }
      }

      // callback, if defined
      o.isOnScreenChange?.(o.data.isOnScreen);
    } else if (o.data.isOnScreen !== false) {
      o.data.isOnScreen = false;

      // only do work if detaching node from live DOM
      // special case: preseve local helicopter in DOM - for respawn, CSS animation purposes.
      if (!o.data.preserveOffscreenDOM && o.dom?.o?.parentNode) {
        // detach, retaining parent node, for later re-append
        o.dom._oRemovedParent = o.dom.o.parentNode;
        o.dom.o.remove();

        let transform = o.dom.o._style.getPropertyValue('transform');

        // manually remove x/y transform, will be restored when on-screen.
        if (transform) {
          // 'none' might be considered a type of transform per Chrome Dev Tools,
          // and thus incur an "inline transform" cost vs. an empty string.
          // notwithstanding, transform has a "value" and can be detected when restoring elements on-screen.
          o.dom.o._style.setProperty('transform', 'none');
        }
      }

      // callback, if defined
      if (o.isOnScreenChange) {
        o.isOnScreenChange(o.data.isOnScreen);
      }
    }
  },

  applyRandomRotation: (node) => {
    if (!node) return;

    /**
     * Here be dragons: this should only be applied once, given concatenation,
     * and might cause bugs and/or performance problems if it isn't. :D
     */
    node._style.setProperty(
      'transform',
      `${node._style.getPropertyValue('transform')} rotate3d(0, 0, 1, ${rnd(
        360
      )}deg)`
    );
  },

  updateEnergy: (object) => {
    // only do work if visible, OR "always" shown and needing updates
    if (
      !object.data.isOnScreen &&
      gamePrefs.show_health_status !== PREFS.SHOW_HEALTH_ALWAYS
    )
      return;

    // prevent certain things from rendering this, e.g., smart missiles.
    if (object.data.noEnergyStatus) return;

    // don't constantly show if at 100%
    if (
      gamePrefs.show_health_status === PREFS.SHOW_HEALTH_SOMETIMES &&
      object.data.energy < object.data.energyMax
    ) {
      if (!object.data.energyCanvasTimer) {
        object.data.energyCanvasTimer = FPS * ENERGY_TIMER_DELAY;
      } else {
        // "recharge" timer so it is just after fade-in.
        if (object.data.energyCanvasTimer < FPS) {
          object.data.energyCanvasTimer =
            FPS * ENERGY_TIMER_DELAY * (1 - ENERGY_TIMER_FADE_RATIO);
        }
      }
    }
  }
};

export { sprites };
