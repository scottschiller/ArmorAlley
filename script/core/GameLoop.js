import { game } from './Game.js';
import { gameEvents } from './GameEvents.js';
import { gamePrefs } from '../UI/preferences.js';
import { debugCollision, unlimitedFrameRate, FRAME_MIN_TIME, debug, TYPES, FRAMERATE, USE_LOCK_STEP, FPS } from '../core/global.js';
import { common } from '../core/common.js';
import { playQueuedSounds } from './sound.js';
import { isGameOver } from '../core/logic.js';
import { sprites } from './sprites.js';
import { net } from './network.js';

const GameLoop = () => {

  const searchParams = new URLSearchParams(window.location.search);
  const debugGameLoop = searchParams.get('debugGameLoop');

  let data;
  let dom;
  let exports;

  // high-use local variables
  let item, i, j, gameObjects = game.objects;

  const spliceArgs = [null, 1];

  function animate() {

    // loop through all objects, animate.
    if (game.data.started) {
      data.frameCount++;
    }

    if (net.active) {

      // process incoming network messages
      net.processRXQueue(data.frameCount);

    }

    // get mouse input for local player - delayed as applicable, in network case
    game.objects.view.bufferMouseInput(game.players.local);

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

    // time since last 30FPS frame
    data.elapsed = ts - data.lastExec;

    /**
     * first things first: always request the next frame right away.
     * if expensive work is done here, at least the browser can plan accordingly
     * if this frame misses its VSync (vertical synchronization) window.
     * https://developer.mozilla.org/en-US/docs/Games/Anatomy#Building_a_main_loop_in_JavaScript
     * https://www.html5rocks.com/en/tutorials/speed/rendering/
     */
     window.requestAnimationFrame(animateRAF);

    /**
     * frame-rate limiting: exit if it isn't approximately time to render the next frame.
     * this still counts as a frame render - we just got here early. Good!
     * hat tip: https://riptutorial.com/html5-canvas/example/18718/set-frame-rate-using-requestanimationframe
     */
    if (!unlimitedFrameRate && data.elapsed < FRAME_MIN_TIME) {
      
      // the below applies only to the network case.
      if (!net.active) return;

      // accommodate for a number of frames' difference.
      const frameLagBetweenPeers = Math.ceil(net.halfTrip / FRAMERATE);

      // Frame / clock sync: Only "fast forward" if we're far behind the remote
      if (game.players.local && data.frameCount < data.remoteFrameCount - frameLagBetweenPeers) {

        let behind = data.remoteFrameCount - data.frameCount;

        if (behind > 8) {

          // if "far" behind, the window was minimized, tab backgrounded / rAF() loop was frozen, etc.

          // attempt to fast-forward through all the missing frames at once.
          console.log(`🏃💨 FAST FORWARD: ${behind} frames behind. Engaging warp speed.`);

          // loop through all this, then final frame / update below.
          behind--;

          // try hiding everything, so renders are as fast as possible.
          game.dom.world.style.display = 'none';

          // also, prevent an explosion of sounds.
          let soundWasEnabled = gamePrefs.sound;

          if (gamePrefs.sound) gamePrefs.sound = false;

          for (var i = 0; i < behind; i++) {
            animate();
          }

          game.dom.world.style.display = 'block';

          if (soundWasEnabled) gamePrefs.sound = true;

        } else {

          // catch-up: skip ahead one frame.
          if (debugGameLoop) console.log(`🐌 gameLoop: behind on frames, ${data.frameCount} vs. ${data.remoteFrameCount}`);
          animate();
          
        }
        
      }

      return;

    }

    if (net.active) net.updateUI();

    if (USE_LOCK_STEP && net.active && game.data.started) {

      // Lock-step network play: don't do anything until we've received data from the remote.
      // Here be dragons. Probably. 🐉
      if (data.frameCount && !net.newPacketCount) {

        if (debugGameLoop) console.log('gameLoop.animate(): waiting on packet...', data.frameCount, data.remoteFrameCount);

        // don't flood the remote with packets, but poke them a bit. :D
        if (!data.packetWaitCounter || data.packetWaitCounter % (FPS / 2) === 0) {

          if (debugGameLoop) console.log('gameLoop.animate(): sending ping', data.packetWaitCounter);

          net.sendMessage({ type: 'PING' });

        }

        data.packetWaitCounter++;

        return;

      } else {

        // allow clients to update
        data.packetWaitCounter = 0;

        net.newPacketCount = 0;

      }

    }

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

    // snow - if by prefs, or "automatically" activated
    if ((gamePrefs.snow || window.snowStorm?.active) && window.snowStorm?.snow) {
      window.snowStorm.snow();
    }

    data.frames++;

    // skip a frame, if behind.
    if (net.active && game.players.local && data.frameCount < data.remoteFrameCount) {
      console.log(`🐌 gameLoop.animate(): behind on frames, ${data.frameCount} vs. ${data.remoteFrameCount}`);
      animate();
    }

    // every interval, update framerate.
    if (!unlimitedFrameRate && ts - data.fpsTimer >= data.fpsTimerInterval) {

      if (dom.fpsCount && data.frames !== data.lastFrames) {
        dom.fpsCount.innerText = data.frames;
        data.lastFrames = data.frames;
      }

      if (net.active) {
        // network: how many frames ahead (or behind) we are vs. the remote, dictated by ping time / latency.
        // worth noting - the remote tries to match us, but latency means they may appear to be behind.
        dom.networkInfo.innerText = `Δ ${data.frameCount - data.remoteFrameCount} | ${net.halfTrip.toFixed(1)} ms | `;
      }

      data.frames = 0;

      // update / restart 1-second timer
      data.fpsTimer = ts;

    }

    // if we haven't yet, ensure we've sent at least one packet to keep lock-step going.
    if (net.active) {
      if (!net.sentPacketCount && USE_LOCK_STEP) {
        // console.log(`No outgoing packets for frame ${data.frameCount}, sending ping`);
        // net.sendMessage({ type: 'PING' });
      } else {
        net.sentPacketCount = 0;
      }
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

    dom.networkInfo = document.getElementById('network-info');

    start();

    gameEvents.start();

  }

  dom = {
    fpsCount: null,
    networkInfo: null
  };

  data = {
    battleOverFrameCount: 0,
    gameStopped: false,
    frameCount: 0,
    remoteFrameCount: 0,
    lastExec: 0,
    packetWaitCounter: 0,
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

    // debug stuff
    if (debugCollision) {
      common.animateDebugRects();
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