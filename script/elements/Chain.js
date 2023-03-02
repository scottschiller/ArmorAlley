import { game } from '../core/Game.js';
import { common } from '../core/common.js';
import { zones } from '../core/zones.js';
import { sprites } from '../core/sprites.js';

const Chain = (options = {}) => {

  let css, data, dom, objects, exports, defaultHeight;

  function applyHeight() {
    dom.o._style.setProperty('height', (`${data.height}px`));
    data.appliedHeight = parseInt(data.height, 10);
  }

  function die() {

    if (data.dead) return;

    sprites.removeNodesAndUnlink(exports);

    data.energy = 0;

    data.dead = true;

    // detach balloon, if applicable
    if (objects.balloon) {
      objects.balloon.detach();
      objects.balloon = null;
    }

    // remove bunker reference, too
    if (objects.bunker) {
      objects.bunker.nullifyChain();
      objects.bunker = null;
    }

  }

  function animate() {

    let x, y, height;

    height = data.height;

    // move if attached, fall if not

    if (objects.bunker && !objects.bunker.data.dead) {

      // bunker

      data.isEnemy = objects.bunker.data.isEnemy;

      if (objects.balloon) {

        // bunker -> chain -> balloon

        // slight offset, so chain runs right underneath balloon
        y = objects.balloon.data.y + objects.balloon.data.height - 3;

        // make the chain fall faster if the balloon is toast.
        if (objects.balloon.data.dead) {

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
              applyHeight();
            }

          }

        } else {

          // balloon is active, may have respawned.
          // reset falling state.
          if (data.fallingVelocity) {
            data.fallingVelocity = data.fallingVelocityInitialRate;
          }

          // live height in DOM might have been zeroed if balloon was dead. restore if so.
          if (!data.appliedHeight) {
            height = defaultHeight;
            data.height = defaultHeight;
            applyHeight();
          }

        }

        // always track height, only assign if chain becomes detached.
        height = (game.objects.view.data.world.height - y - objects.bunker.data.height) + 4;

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

      if (objects.balloon && !objects.balloon.data.dead) {

        // chain -> balloon
        x = objects.balloon.data.x + objects.balloon.data.halfWidth + 5;

        y = objects.balloon.data.y + objects.balloon.data.height;

      } else {

        // free-falling, detached chain
        y = data.y;

        y += data.fallingVelocity;

        // cheap gravity acceleration
        data.fallingVelocity += data.fallingVelocityIncrement;

        if (y >= game.objects.view.data.world.height + 2) {
          die();
        }

      }

    }
    
    sprites.moveTo(exports, x, y);

    if (height !== undefined && data.height !== height) {
      // don't update DOM - $$$ paint even when GPU compositing,
      // because this invalidates the texture going to the GPU (AFAICT)
      // on every animation frame. just translate and keep fixed height.
      data.height = height;
    }  

    return (data.dead && !dom.o);

  }

  function initDOM() {

    dom.o = sprites.create({
      className: css.className
    });

    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);
    
  }

  function initChain() {

    initDOM();

    applyHeight();

  }

  css = common.inheritCSS({
    className: 'chain'
  });

  defaultHeight = game.objects.view.data.world.height + 5;

  data = common.inheritData({
    type: 'chain',
    energy: 1,
    hostile: false, // applies when detached from base or balloon
    width: 1,
    /**
     * slightly complex: element height is basically fixed, moved via transforms,
     * set at init, zeroed when chain drops and reset if balloon respawns.
     */
    height: defaultHeight,
    // tracks what's actually on the DOM
    appliedHeight: 0,
    damagePoints: 6,
    fallingVelocity: 0.5,
    fallingVelocityInitialRate: 0.5,
    fallingVelocityIncrement: 0.125,
  }, options);

  dom = {
    o: null
  };

  objects = {
    bunker: options.bunker || null,
    balloon: options.balloon || null
  };

  exports = {
    animate,
    data,
    dom,
    die,
    init: initChain,
  };

  return exports;

};

export { Chain };