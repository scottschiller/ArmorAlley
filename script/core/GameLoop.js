import { game } from './Game.js';
import { gamePrefs } from '../UI/preferences.js';
import { FRAMERATE, unlimitedFrameRate, FRAME_MIN_TIME, debug, TYPES } from '../core/global.js';
import { common } from '../core/common.js';
import { playQueuedSounds } from './sound.js';
import { isGameOver } from '../core/logic.js';
import { sprites } from './sprites.js';

const GameLoop = () => {

  let data;
  let dom;
  let exports;

  // high-use local variables
  let item, i, j, gameObjects = game.objects;

  const spliceArgs = [null, 1];

  function animate() {

    // loop through all objects, animate.
    data.frameCount++;

    // there may be sounds from the last frame, ready to go.
    playQueuedSounds();

    // view will have jumped to player or enemy base.
    // ensure all units' on-screen status is updated first, then animate one more frame so they can be repositioned.

    for (item in gameObjects) {

      if (gameObjects[item]) {

        // array of objects

        if (gameObjects[item].length) {

          for (i = gameObjects[item].length - 1; i >= 0; i--) {

            sprites.updateIsOnScreen(gameObjects[item][i]);

            if (gameObjects[item][i].animate && gameObjects[item][i].animate()) {
              // object is dead - take it out.
              common.unlinkObject(gameObjects[item][i]);
              spliceArgs[0] = i;
              Array.prototype.splice.apply(gameObjects[item], spliceArgs);
            }

          }

        } else {

          // single object case

          sprites.updateIsOnScreen(gameObjects[item]);

          if (gameObjects[item].animate && gameObjects[item].animate()) {
            // object is dead - take it out.
            common.unlinkObject(gameObjects[item]);
            gameObjects[item] = undefined;
          }

        }

      }

    }

    // move static terrain items, too, given we're scrolling.
    for (i = 0, j = game.objects[TYPES.terrainItem].length; i < j; i++) {
      sprites.moveWithScrollOffset(game.objects[TYPES.terrainItem][i]);
    }

    if (isGameOver() && !data.gameStopped) {
      if (data.battleOverFrameCount++ > 1) {
        data.gameStopped = true;
        // end game, all units updated, subsequent frames: only animate shrapnel and smoke.
        gameObjects = {
          gunfire: game.objects.gunfire,
          shrapnel: game.objects.shrapnel,
          smoke: game.objects.smoke,
          domFetti: game.objects.domFetti,
          queue: game.objects.queue
        }
      }
    }

    // update all setTimeout()-style FrameTimeout() instances.
    frameTimeoutManager.animate();

  }

  function animateRAF(ts) {

    if (!data.timer) return;

    if (!data.fpsTimer) data.fpsTimer = ts;

    /**
     * first things first: always request the next frame right away.
     * if expensive work is done here, at least the browser can plan accordingly
     * if this frame misses its VSync (vertical synchronization) window.
     * https://developer.mozilla.org/en-US/docs/Games/Anatomy#Building_a_main_loop_in_JavaScript
     * https://www.html5rocks.com/en/tutorials/speed/rendering/
     */
    window.requestAnimationFrame(animateRAF);

    data.elapsed = (ts - data.lastExec) || 0;

    /**
     * frame-rate limiting: exit if it isn't approximately time to render the next frame.
     * this still counts as a frame render - we just got here early. Good!
     * hat tip: https://riptutorial.com/html5-canvas/example/18718/set-frame-rate-using-requestanimationframe
     */
    if (!unlimitedFrameRate && data.elapsed < FRAME_MIN_TIME) return;

    // performance debugging: number of style changes (transform) for this frame.
    if (debug) {
      console.log(`transform (style/recalc) count: ${data.transformCount} / ${data.excludeTransformCount} (incl./excl)`);
      data.transformCount = 0;
      data.excludeTransformCount = 0;
      if (data.elapsed > 34 && window.console) {
        const slowString = `slow frame (${Math.floor(data.elapsed)}ms)`;
        console.log(slowString);
        if (console.timeStamp) console.timeStamp(slowString);
      }
    }

    data.elapsedTime += data.elapsed;

    data.lastExec = ts;

    animate();

    data.frames++;

    // every interval, update framerate.
    if (!unlimitedFrameRate && ts - data.fpsTimer >= data.fpsTimerInterval) {

      if (dom.fpsCount && data.frames !== data.lastFrames) {
        dom.fpsCount.innerText = data.frames;
        data.lastFrames = data.frames;
      }

      data.frames = 0;
      data.elapsedTime = 0;

      // update / restart 1-second timer
      data.fpsTimer = ts;

    }

    // snow?
    if (gamePrefs.snow && window.snowStorm?.snow) {
      window.snowStorm.snow();
    }

  }

  function start() {

    if (data.timer) return;

    if (!dom.fpsCount) {
      dom.fpsCount = document.getElementById('fps-count');
    }

    data.timer = true;
    animateRAF();

  }

  function stop() {

    if (!data.timer) return;

    data.timer = null;
    data.lastExec = 0;

  }

  function resetFPS() {

    // re-measure FPS timings.
    data.lastExec = 0;
    data.frames = 0;

  }

  function incrementTransformCount(isExclude) {

    if (isExclude) {
      data.excludeTransformCount++;
    } else {
      data.transformCount++;
    }

  }

  function initGameLoop() {

    start();

  }

  dom = {
    fpsCount: null,
  }

  data = {
    battleOverFrameCount: 0,
    gameStopped: false,
    frameCount: 0,
    lastExec: 0,
    elapsed: 0,
    elapsedTime: 0,
    frames: 0,
    lastFrames: 0,
    timer: null,
    fpsTimer: null,
    fpsTimerInterval: 1000,
    transformCount: 0,
    excludeTransformCount: 0
  };

  exports = {
    data,
    incrementTransformCount,
    init: initGameLoop,
    resetFPS,
    stop,
    start
  };

  return exports;

};

/**
 * hooks into main game requestAnimationFrame() loop.
 * calls animate() methods on active FrameTimeout() instances.
 */
 const frameTimeoutManager = (() => {

  let exports;
  const instances = [];
  const spliceArgs = [null, 1];

  function addInstance(frameTimeout) {
    instances.push(frameTimeout);
  }

  function animate() {

    if (!instances?.length) return;

    const completed = [];

    for (var i = 0, j = instances.length; i < j; i++) {
      // do work, and track completion
      if (instances[i].animate()) {
        completed.push(instances[i]);
      }
    }

    if (completed.length) {
      for (i = 0, j = completed.length; i < j; i++) {
        spliceArgs[0] = instances.indexOf(completed[i]);
        Array.prototype.splice.apply(instances, spliceArgs);
      }
    }
    
  }

  exports = {
    addInstance,
    animate
  };

  return exports;

})();

export {
  GameLoop,
  frameTimeoutManager
};