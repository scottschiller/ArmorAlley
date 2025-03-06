import { game } from './Game.js';
import { gameEvents } from './GameEvents.js';
import { gamePrefs } from '../UI/preferences.js';
import {
  debugCollision,
  debug,
  TYPES,
  FRAMERATE,
  FPS,
  isMobile,
  demo
} from '../core/global.js';
import { common } from '../core/common.js';
import { playQueuedSounds } from './sound.js';
import { sprites } from './sprites.js';
import { net } from './network.js';
import { snowStorm } from '../lib/snowstorm.js';
import { effects } from './effects.js';
import { prefsManager } from '../aa.js';
import { score } from './scores.js';

const GameLoop = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const debugGameLoop = searchParams.get('debugGameLoop');

  let data;
  let dom;
  let exports;

  // high-use local variables
  let item,
    i,
    j,
    gameObjects = game.objects;

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

    // only level previews are rendered once / static
    if (game.data.started) {
      common.domCanvas.clear();
    }

    // hackish: hook to add new shrapnel.
    effects.animate();

    // view will have jumped to player or enemy base.
    // ensure all units' on-screen status is updated first, then animate one more frame so they can be repositioned.

    for (item in gameObjects) {
      if (gameObjects[item]) {
        // array of objects

        if (Array.isArray(gameObjects[item])) {
          for (i = gameObjects[item].length - 1; i >= 0; i--) {
            sprites.updateIsOnScreen(gameObjects[item][i]);

            if (game.objects.editor) {
              sprites.moveWithScrollOffset(gameObjects[item][i]);
              // don't animate certain things.
              if (gameObjects[item][i]?.data?.type.match(/balloon|cloud/i))
                continue;
            }

            if (gameObjects[item][i].animate?.()) {
              // object is dead - take it out.
              common.unlinkObject(gameObjects[item][i]);
              spliceArgs[0] = i;
              Array.prototype.splice.apply(gameObjects[item], spliceArgs);
            }
          }
        } else {
          // single object case - radar, gameLoop etc.

          // only things with a type should be on/off-screen.
          if (gameObjects[item]?.data?.type) {
            sprites.updateIsOnScreen(gameObjects[item]);
          }

          if (gameObjects[item].animate) {
            if (game.objects.editor && gameObjects[item]?.data?.type) {
              sprites.moveWithScrollOffset(gameObjects[item]);
              continue;
            }

            if (gameObjects[item].animate()) {
              // object is dead - take it out.
              common.unlinkObject(gameObjects[item]);
              gameObjects[item] = undefined;
            }
          }
        }
      }
    }

    // move static terrain items, too, given we're scrolling.
    for (i = 0, j = game.objects[TYPES.terrainItem].length; i < j; i++) {
      sprites.moveWithScrollOffset(game.objects[TYPES.terrainItem][i]);
    }

    // update all setTimeout()-style FrameTimeout() instances.
    frameTimeoutManager.animate();

    // points, bonus, level / difficulty UI
    score.animate();

    // debug stuff
    if (debugCollision) {
      common.animateDebugRects();
    }
  }

  function animateRAF(ts) {
    if (!data.timer) return;

    // set timer for 1-second interval only once game started.
    if (!data.fpsTimer && game.data.started) data.fpsTimer = ts;

    /**
     * First things first: always request the next frame right away.
     * If expensive work is done here, at least the browser can plan accordingly
     * if this frame misses its VSync (vertical synchronization) window.
     * https://developer.mozilla.org/en-US/docs/Games/Anatomy#Building_a_main_loop_in_JavaScript
     * https://www.html5rocks.com/en/tutorials/speed/rendering/
     */
    window.requestAnimationFrame(animateRAF);

    // how long has it been?
    data.elapsed = ts - data.lastExec;

    // exit if too early
    if (data.elapsed < FRAMERATE) {
      // the below applies only to the network case.
      if (!net.active) return;

      // accommodate for a number of frames' difference.
      const frameLagBetweenPeers = Math.ceil(net.halfTrip / FRAMERATE);

      // Frame / clock sync: Only "fast forward" if we're far behind the remote
      if (
        game.players.local &&
        data.frameCount < data.remoteFrameCount - frameLagBetweenPeers
      ) {
        let behind = data.remoteFrameCount - data.frameCount;

        if (behind >= FPS) {
          // if "far" behind, the window was minimized, tab backgrounded / rAF() loop was frozen, etc.

          // attempt to fast-forward through all the missing frames at once.
          console.log(
            `🏃💨 FAST FORWARD: ${behind} frames behind. Engaging warp speed.`
          );

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
          if (debugGameLoop)
            console.log(
              `🐌 gameLoop: behind on frames, ${data.frameCount} vs. ${data.remoteFrameCount} - skipping one ahead`
            );
          animate();
        }
      }

      // network "sync" work finished at this point.
      return;
    }

    // we're going to render a frame.

    /**
     * Draw the next frame, accounting for FRAMERATE not necessarily being a multiple of 16.67
     * Hat tip: https://stackoverflow.com/questions/19764018/controlling-fps-with-requestanimationframe/19772220#19772220
     */
    data.lastExec = ts - (data.elapsed % FRAMERATE);

    if (net.active) {
      net.updateUI();
    }

    if (gamePrefs.lock_step && net.active && game.data.started) {
      // Lock-step network play: don't do anything until we've received data from the remote.
      // Here be dragons. Probably. 🐉
      if (data.frameCount && !net.newPacketCount) {
        if (debugGameLoop)
          console.log(
            'gameLoop.animate(): waiting on packet...',
            data.frameCount,
            data.remoteFrameCount
          );

        // don't flood the remote with packets, but poke them a bit. :D
        if (
          !data.packetWaitCounter ||
          data.packetWaitCounter % (FPS / 2) === 0
        ) {
          if (data.packetWaitCounter > 30) {
            // only show the spinner if the wait is obvious.
            setWaiting(true);
          }

          if (debugGameLoop)
            console.log(
              'gameLoop.animate(): sending ping',
              data.packetWaitCounter
            );

          net.sendMessage({ type: 'PING' });
        }

        data.packetWaitCounter++;

        return;
      } else {
        if (data.packetWaitCounter) {
          setWaiting(false);

          // allow clients to update
          data.packetWaitCounter = 0;
        }

        net.newPacketCount = 0;
      }
    }

    // performance debugging: number of style changes (transform) for this frame.
    if (debug) {
      console.log(
        `transform (style/recalc) count: ${data.transformCount} / ${data.excludeTransformCount} (incl./excl)`
      );
      data.transformCount = 0;
      data.excludeTransformCount = 0;
    }

    animate();

    // snow - if by prefs, or "automatically" activated
    if ((gamePrefs.snow || snowStorm?.active) && snowStorm?.snow) {
      snowStorm.snow();
    }

    data.frames++;

    // skip a frame, if behind.
    if (
      net.active &&
      game.players.local &&
      data.frameCount < data.remoteFrameCount
    ) {
      console.log(
        `🐌 gameLoop.animate(): behind on frames, ${data.frameCount} vs. ${data.remoteFrameCount}`
      );
      animate();
    }

    // every interval, update framerate.
    if (game.data.started && ts - data.fpsTimer >= data.fpsTimerInterval) {
      // actual number of frames "in-game" - in case there's a difference.
      let gameFrameCount = data.frameCount - data.gameStartFrameCount;

      data.fpsSamples++;
      data.fpsAverage = (gameFrameCount / data.fpsSamples).toFixed(2);

      if (!isMobile && dom.fpsCount && data.frames !== data.lastFrames) {
        dom.fpsCount.innerText = data.frames;
        data.lastFrames = data.frames;
      }

      if (net.active) {
        // network: how many frames ahead (or behind) we are vs. the remote, dictated by ping time / latency.
        // worth noting - the remote tries to match us, but latency means they may appear to be behind.
        dom.networkInfo.innerText = `Δ ${
          gameFrameCount - data.remoteFrameCount
        } | ${net.halfTrip.toFixed(1)} ms | `;
      } else if (data.canTestFPS && data.fpsSamples >= 5) {
        // "significant" dropped frames?
        if (
          gamePrefs.game_fps_auto &&
          FPS === 60 &&
          data.fpsAverage / FPS < 0.8
        ) {
          game.objects.notifications.add(`🐌 Slow? Switching to 30 FPS.`);
          gamePrefs.game_fps = 30;
          prefsManager.events.onPrefChange['game_fps']?.(gamePrefs.game_fps);
          // force-update FPS pref, too.
          prefsManager.writePrefsToStorage();
        }
        data.canTestFPS = false;
      }

      data.frames = 0;

      // update / restart 1-second timer
      data.fpsTimer = ts;
    }
  }

  function start() {
    if (data.timer) return;

    data.timer = true;
    window.requestAnimationFrame(animateRAF);
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

  function setWaiting(isWaiting) {
    if (data.waiting === isWaiting) return;

    data.waiting = isWaiting;

    dom.lockStepIndicator.style.display = isWaiting ? 'inline-block' : 'none';

    const now = performance.now();

    // occasionally notify
    if (now - data.lastWaitNotified > 10000 && data.packetWaitCounter > 30) {
      data.lastWaitNotified = now;
      game.objects.notifications.add(
        `Lock step: Waiting for ${gamePrefs.net_remote_player_name}...`
      );
    }
  }

  function initGameLoop() {
    dom.fpsCount = document.getElementById('fps-count');

    // ?fps=1 etc.
    let fps = document.getElementById('game-fps');

    if (searchParams.get('fps') && !demo) {
      fps.style.display = 'block';
    } else {
      fps.remove();
      dom.fpsCount = null;
    }

    fps = null;

    dom.lockStepIndicator = document.getElementById('lock-step-indicator');
    dom.networkInfo = document.getElementById('network-info');

    start();

    gameEvents.start();
  }

  dom = {
    fpsCount: null,
    lockStepIndicator: null,
    networkInfo: null
  };

  data = {
    canTestFPS: true,
    elapsed: 0,
    frameCount: 0,
    remoteFrameCount: 0,
    gameStartFrameCount: 0,
    lastExec: 0,
    packetWaitCounter: 0,
    frames: 0,
    lastFrames: 0,
    timer: null,
    fpsTimer: null,
    fpsTimerInterval: 1000,
    fpsAverage: 0,
    fpsSamples: 0,
    transformCount: 0,
    excludeTransformCount: 0,
    sawRotateHint: false,
    waiting: false,
    lastWaitNotified: 0
  };

  exports = {
    data,
    incrementTransformCount,
    init: initGameLoop,
    resetFPS,
    setWaiting,
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

export { GameLoop, frameTimeoutManager };
