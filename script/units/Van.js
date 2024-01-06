import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { gamePrefs } from '../UI/preferences.js';
import { enemyHelicopterNearby, nearbyTest } from '../core/logic.js';
import {
  GAME_SPEED,
  TYPES,
  FPS,
  rndInt,
  getTypes,
  rngInt
} from '../core/global.js';
import { playSound, sounds } from '../core/sound.js';
import { EVENTS, gameEvents } from '../core/GameEvents.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';
import { net } from '../core/network.js';

const Van = (options = {}) => {
  let css, dom, data, friendlyNearby, height, pads, radarItem, exports;

  function stop() {
    data.stopped = true;
  }

  function resume() {
    if (game.data.battleOver) return;
    data.stopped = false;
  }

  function die(dieOptions = {}) {
    if (data.dead) return;

    data.energy = 0;

    data.jamming = false;

    data.dead = true;

    utils.css.add(dom.o, css.exploding);

    // stop moving while exploding
    data.vX = 0;

    // revert to CSS rules, prevent first frame of explosion from sticking
    dom.o._style.setProperty('background-position', '0px -384px');

    effects.shrapnelExplosion(data, {
      centerX: true,
      velocity: 3 + rngInt(3, TYPES.shrapnel)
    });

    effects.domFetti(exports, dieOptions.attacker);

    effects.inertGunfireExplosion({ exports });

    effects.damageExplosion(exports);

    data.deadTimer = common.setFrameTimeout(() => {
      sprites.removeNodesAndUnlink(exports);
      data.deadTimer = null;
    }, 1000);

    if (radarItem) {
      radarItem.die();
    } else {
      game.objects.stats.destroy(exports);
    }

    if (sounds.genericExplosion) {
      playSound(sounds.genericExplosion, exports);
    }

    common.onDie(exports, dieOptions);

    common.addGravestone(exports);

    const attackerType = dieOptions.attacker?.data.type;

    if (
      !net.connected &&
      onOurSide() &&
      gamePrefs[`notify_${data.type}`] &&
      !data.isOnScreen &&
      attackerType !== TYPES.smartMissile
    ) {
      // TODO: review and remove? May be covered in most cases.
      game.objects.notifications.add('You lost a van 💥');
    }
  }

  function onOurSide() {
    return game.players.local.data.isEnemy === data.isEnemy;
  }

  function getGameOverAnnouncement() {
    return onOurSide()
      ? 'Congratulations!\nYou have won the battle. <span class="inline-emoji">🎉</span>'
      : 'The enemy has won the battle.\nBetter luck next time. <span class="inline-emoji no-emoji-substitution">☠️</span>';
  }

  function animate() {
    // hackish: defer this until all objects are created, and the game has started etc.
    if (!data.xGameOver && pads?.length) {
      data.xGameOver = data.isEnemy
        ? pads[0].data.x + 88
        : pads[pads.length - 1].data.x - 44;
    }

    let enemyHelicopter;

    if (!data.stopped && !game.data.battleOver) {
      sprites.moveTo(exports, data.x + data.vX * GAME_SPEED, data.y);
    } else {
      // if stopped, just take scroll into effect
      sprites.moveWithScrollOffset(exports);
    }

    if (data.dead) return !data.deadTimer;

    effects.smokeRelativeToDamage(exports);

    // just in case: prevent any multiple "game over" actions via animation
    if (game.data.battleOver) return;

    if (data.isEnemy && data.x <= data.xGameOver) {
      stop();

      game.objects.view.setAnnouncement(getGameOverAnnouncement(), -1);

      gameOver(onOurSide());
    } else if (!data.isEnemy && data.x >= data.xGameOver) {
      stop();

      game.objects.view.setAnnouncement(getGameOverAnnouncement(), -1);

      gameOver(onOurSide());
    } else {
      // bounce wheels after the first few seconds

      if (data.frameCount > FPS * 2) {
        if (data.frameCount % data.stateModulus === 0) {
          data.state++;

          if (data.state > data.stateMax) {
            data.state = 0;
          }

          if (data.isOnScreen) {
            dom.o._style.setProperty(
              'background-position',
              `0px ${data.height * data.state * -1}px`
            );
          }
        } else if (data.frameCount % data.stateModulus === 2) {
          // next frame - reset.
          if (data.isOnScreen) {
            dom.o._style.setProperty('background-position', '0px 0px');
          }
        }
      }

      if (data.frameCount % data.radarJammerModulus === 0) {
        // look for nearby bad guys
        enemyHelicopter = enemyHelicopterNearby(
          data,
          game.objects.view.data.browser.twoThirdsWidth
        );

        if (!data.jamming && enemyHelicopter) {
          data.jamming = true;
        } else if (data.jamming && !enemyHelicopter) {
          data.jamming = false;
        }
      }
    }

    if (gamePrefs.ground_unit_traffic_control) {
      nearbyTest(friendlyNearby, exports);
    }

    data.frameCount++;

    // is van within 1/X of the battlefield away from a landing / base?
    const distance = data.isEnemy
      ? data.x - pads[0].data.x
      : pads[pads.length - 1].data.x - data.x;

    if (distance < data.approachingBase) {
      gameEvents.fire(
        EVENTS.vanApproaching,
        'isEnemy',
        data.isEnemy !== game.players.local.data.isEnemy
      );
    }

    return data.dead && !data.deadTimer;
  }

  function gameOver(youWon) {
    // somebody's base is about to get blown up.

    let yourBase, otherBase;

    // just in case
    if (game.data.battleOver) return;

    const bases = game.objects[TYPES.base];

    const { isEnemy } = game.players.local.data;

    if (isEnemy) {
      yourBase = bases[1];
      otherBase = bases[0];
    } else {
      yourBase = bases[0];
      otherBase = bases[1];
    }

    if (!youWon) {
      // sorry, better luck next time.
      yourBase.die();
    } else {
      otherBase.die();
    }

    game.data.battleOver = true;
    game.data.didEnemyWin = data.isEnemy;
    game.data.youWon = youWon;
    game.data.theyWon = !youWon;

    // ensure joystick UI is hidden, if present
    game.objects.joystick?.end();

    utils.css.add(document.body, 'game-over');

    game.objects.stats.displayEndGameStats();
  }

  function initDOM() {
    dom.o = sprites.create({
      className: css.className,
      id: data.id,
      isEnemy: data.isEnemy ? css.enemy : false
    });

    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);
  }

  function initVan() {
    initDOM();

    common.initNearby(friendlyNearby, exports);

    /**
     * Enemy vans are so sneaky, they don't even appear on the radar.
     * Only show if you're on the same team, or in tutorial mode.
     */
    if (
      tutorialMode ||
      !!options.isEnemy === game.players.local?.data?.isEnemy
    ) {
      radarItem = game.objects.radar.addItem(exports, dom.o.className);
    } else {
      game.objects.stats.create(exports);
    }

    pads = game.objects[TYPES.landingPad];
  }

  height = 16;

  css = common.inheritCSS({
    className: TYPES.van
  });

  data = common.inheritData(
    {
      type: TYPES.van,
      bottomAligned: true,
      deadTimer: null,
      frameCount: 0,
      radarJammerModulus: FPS,
      radarJammerModulus1X: FPS,
      jamming: false,
      energy: 2,
      energyMax: 2,
      direction: 0,
      approachingBase: 768,
      vX: options.isEnemy ? -1 : 1,
      width: 38,
      halfWidth: 19,
      height,
      halfHeight: height / 2,
      state: 0,
      stateMax: 2,
      stateModulus: FPS,
      stateModulus1X: FPS,
      gameSpeedProps: ['radarJammerModulus', 'stateModulus'],
      stopped: false,
      // if the van reaches the enemy base (near the landing pad), it's game over.
      xGameOver: 0, // set at init
      x: options.x || 0,
      y: game.objects.view.data.world.height - height - 2,
      domFetti: {
        colorType: options.isEnemy ? 'grey' : 'green',
        elementCount: 5 + rndInt(5),
        startVelocity: 8 + rndInt(8)
      }
    },
    options
  );

  dom = {
    o: null
  };

  exports = {
    animate,
    data,
    dom,
    die,
    init: initVan,
    radarItem
  };

  data.domCanvas = {
    radarItem: Van.radarItemConfig(exports)
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
    items: getTypes('tank, missileLauncher, van', {
      group: 'friendly',
      exports
    }),
    targets: []
  };

  return exports;
};

Van.radarItemConfig = () => ({
  width: 3.5,
  height: 2,
  draw: (ctx, obj, pos, width, height) => {
    ctx.roundRect(
      pos.left(obj.data.left),
      pos.bottomAlign(height),
      pos.width(width),
      pos.height(height),
      [height, height, 0, 0]
    );
  }
});

export { Van };
