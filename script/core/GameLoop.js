import {
  gamePrefs,
  FRAMERATE,
  game,
  updateIsOnScreen,
  battleOver,
  frameTimeoutManager,
  unlimitedFrameRate,
  FRAME_MIN_TIME,
  debug,
} from '../aa.js';

import { playQueuedSounds } from './sound.js';


const GameLoop = () => {

  let data;
  let dom;
  let exports;

  const spliceArgs = [null, 1];

  function animate() {

    // loop through all objects, animate.
    let item, i;
    let gameObjects = game.objects;

    data.frameCount++;

    // there may be sounds from the last frame, ready to go.
    playQueuedSounds();

    // view will have jumped to player or enemy base.
    // ensure all units' on-screen status is updated first, then animate one more frame so they can be repositioned.

    if (data.gameStopped) {
      // end game, all units updated, subsequent frames: only animate shrapnel and smoke.
      gameObjects = game.objects.shrapnel.concat(game.objects.smoke);
    }

    for (item in gameObjects) {

      if (gameObjects[item]) {

        // array of objects

        if (gameObjects[item].length) {

          for (i = gameObjects[item].length - 1; i >= 0; i--) {

            updateIsOnScreen(gameObjects[item][i]);

            if (gameObjects[item][i].animate && gameObjects[item][i].animate()) {
              // object is dead - take it out.
              spliceArgs[0] = i;
              Array.prototype.splice.apply(gameObjects[item], spliceArgs);
            }

          }

        } else {

          // single object case

          updateIsOnScreen(gameObjects[item]);

          if (gameObjects[item].animate && gameObjects[item].animate()) {
            // object is dead - take it out.
            gameObjects[item] = null;
          }

        }

      }

    }

    if (battleOver && !data.gameStopped) {
      if (data.battleOverFrameCount++ > 1) {
        data.gameStopped = true;
      }
    }

    // update all setTimeout()-style FrameTimeout() instances.
    frameTimeoutManager.animate();

  }

  function animateRAF(ts) {

    let elapsed;

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

    elapsed = (ts - data.lastExec) || 0;

    /**
     * frame-rate limiting: exit if it isn't approximately time to render the next frame.
     * this still counts as a frame render - we just got here early. Good!
     * hat tip: https://riptutorial.com/html5-canvas/example/18718/set-frame-rate-using-requestanimationframe
     */
    if (!unlimitedFrameRate && elapsed < FRAME_MIN_TIME) return;

    // performance debugging: number of style changes (transform) for this frame.
    if (debug) {
      console.log(`transform (style/recalc) count: ${data.transformCount} / ${data.excludeTransformCount} (incl./excl)`);
      data.transformCount = 0;
      data.excludeTransformCount = 0;
      if (elapsed > 34 && window.console) {
        const slowString = `slow frame (${Math.floor(elapsed)}ms)`;
        console.log(slowString);
        if (console.timeStamp) console.timeStamp(slowString);
      }
    }

    data.elapsedTime += elapsed;

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

    if (!dom.fpsCount) {
      dom.fpsCount = document.getElementById('fps-count');
    }

    if (!data.timer) {

      if (window.requestAnimationFrame) {

        data.timer = true;
        animateRAF();

      } else {

        data.timer = window.setInterval(animate, FRAMERATE);

      }

    }

  }

  function stop() {

    if (data.timer) {

      data.timer = null;
      data.lastExec = 0;

    }

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

export { GameLoop };