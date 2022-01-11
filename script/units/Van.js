import {
  game,
  utils,
  gamePrefs,
} from '../aa.js';

import { common } from '../core/common.js';
import { enemyHelicopterNearby, isGameOver, nearbyTest } from '../core/logic.js';

import {
  TYPES,
  winloc,
  FPS,
  tutorialMode
} from '../core/global.js';

import {
  playSound,
  sounds
} from '../core/sound.js';

const Van = options => {

  let css, dom, data, friendlyNearby, height, radarItem, exports;

  // for testing end sequence
  const theyWin = winloc.match(/theyWin/i);
  const youWin = winloc.match(/youWin/i);

  function stop() {

    data.stopped = true;

  }

  function resume() {

    data.stopped = false;

  }

  function die() {

    if (data.dead) return;

    utils.css.add(dom.o, css.exploding);

    // stop moving while exploding
    data.vX = 0;

    // revert to CSS rules, prevent first frame of explosion from sticking
    dom.o.style.backgroundPosition = '0px -384px';

    common.shrapnelExplosion(data, { centerX: true, velocity: 6 });

    common.inertGunfireExplosion({ exports });

    data.deadTimer = common.setFrameTimeout(() => {
      common.removeNodes(dom);
      data.deadTimer = null;
    }, 1000);

    data.energy = 0;

    data.jamming = false;

    data.dead = true;

    if (radarItem) {
      radarItem.die();
    } else {
      game.objects.stats.destroy(exports);
    }

    if (sounds.genericExplosion) {
      playSound(sounds.genericExplosion, exports);
    }

  }

  function animate() {

    let enemyHelicopter;

    if (data.dead) return !data.deadTimer;

    if (!data.stopped) {
      common.moveTo(exports, data.x + data.vX, data.y);
    }

    common.smokeRelativeToDamage(exports, 0.25);

    // just in case: prevent any multiple "game over" actions via animation
    if (isGameOver()) return;

    if (theyWin || (data.isEnemy && data.x <= data.xGameOver)) {

      stop();

      // Game over, man, game over! (Enemy wins.)

      // hack: clear any existing.
      game.objects.view.setAnnouncement();

      game.objects.view.setAnnouncement('The enemy has won the battle.', -1);

      gameOver(false);

    } else if (youWin || (!data.isEnemy && data.x >= data.xGameOver)) {

      stop();

      // player wins

      // hack: clear any existing.
      game.objects.view.setAnnouncement();

      game.objects.view.setAnnouncement('You have won the battle.', -1);

      gameOver(true);

    } else {

      // bounce wheels after the first few seconds

      if (data.frameCount > FPS * 2) {

        if (data.frameCount % data.stateModulus === 0) {

          data.state++;

          if (data.state > data.stateMax) {
            data.state = 0;
          }

          if (data.isOnScreen) {
            dom.o.style.backgroundPosition = `0px ${data.height * data.state * -1}px`;
          }

        } else if (data.frameCount % data.stateModulus === 2) {

          // next frame - reset.
          if (data.isOnScreen) {
            dom.o.style.backgroundPosition = '0px 0px';
          }

        }

      }

      if (data.frameCount % data.radarJammerModulus === 0) {

        // look for nearby bad guys
        enemyHelicopter = enemyHelicopterNearby(data, game.objects.view.data.browser.twoThirdsWidth);

        if (!data.jamming && enemyHelicopter) {

          data.jamming = true;

        } else if (data.jamming && !enemyHelicopter) {

          data.jamming = false;

        }

      }

    }

    if (gamePrefs.ground_unit_traffic_control) {
      nearbyTest(friendlyNearby);
    }

    data.frameCount++;

    return (data.dead && !data.deadTimer);

  }

  function gameOver(youWon) {

    // somebody's base is about to get blown up.
  
    let yourBase, enemyBase;
  
    // just in case
    if (isGameOver()) return;
  
    yourBase = game.objects.bases[0];
    enemyBase = game.objects.bases[1];
  
    if (!youWon) {
  
      // sorry, better luck next time.
      yourBase.die();
  
    } else {
  
      enemyBase.die();
  
    }
  
    game.data.battleOver = true;
  
    utils.css.add(document.body, 'game-over');
  
    game.objects.stats.displayEndGameStats();
  
  }

  function initVan() {

    dom.o = common.makeSprite({
      className: css.className
    });

    if (data.isEnemy) {
      utils.css.add(dom.o, css.enemy);
    }

    common.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

    common.initNearby(friendlyNearby, exports);

    // enemy vans are so sneaky, they don't even appear on the radar.
    if (tutorialMode || !options.isEnemy) {
      radarItem = game.objects.radar.addItem(exports, dom.o.className);
    } else {
      game.objects.stats.create(exports);
    }

  }

  options = options || {};

  height = 16;

  css = common.inheritCSS({
    className: TYPES.van
  });

  data = common.inheritData({
    type: TYPES.van,
    bottomAligned: true,
    deadTimer: null,
    frameCount: 0,
    radarJammerModulus: 50,
    jamming: false,
    energy: 2,
    energyMax: 2,
    direction: 0,
    vX: (options.isEnemy ? -1 : 1),
    width: 38,
    halfWidth: 19,
    height,
    halfHeight: height / 2,
    state: 0,
    stateMax: 2,
    stateModulus: 30,
    stopped: false,
    inventory: {
      frameCount: 60,
      cost: 2
    },
    // if the van reaches the enemy base (near the landing pad), it's game over.
    xGameOver: (options.isEnemy ? game.objects.landingPads[0].data.x + 88 : game.objects.landingPads[game.objects.landingPads.length - 1].data.x - 44),
    x: options.x || 0,
    y: game.objects.view.data.world.height - height - 2
  }, options);

  dom = {
    o: null
  };

  friendlyNearby = {
    options: {
      source: exports,
      targets: undefined,
      useLookAhead: true,
      // stop moving if we roll up behind a friendly vehicle
      friendlyOnly: true,
      hit: stop,
      miss: resume
    },
    // who are we looking for nearby?
    items: ['tanks', 'missileLaunchers', 'vans'],
    targets: []
  };

  exports = {
    animate,
    data,
    dom,
    die
  };

  if (!options.noInit) {
    initVan();
  }

  return exports;

};

export { Van };