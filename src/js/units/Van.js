import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { gamePrefs } from '../UI/preferences.js';
import { enemyHelicopterNearby, nearbyTest } from '../core/logic.js';
import {
  GAME_SPEED_RATIOED,
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
import { levelConfig } from '../levels/default.js';
import { getDefeatMessage, getVictoryMessage } from '../levels/battle-over.js';

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

    data.domCanvas.dieExplosion = effects.genericExplosion(exports);
    data.domCanvas.img = null;

    // stop moving while exploding
    data.vX = 0;

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
      radarItem.die(dieOptions);
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
      ? getVictoryMessage()
      : 'The enemy has won the battle.\nBetter luck next time. <span class="inline-emoji no-emoji-substitution">🏳️</span><hr />' +
          getDefeatMessage();
  }

  function animate() {
    // hackish: defer this until all objects are created, and the game has started etc.
    if (!data.xGameOver && pads?.length) {
      data.xGameOver = data.isEnemy
        ? pads[0].data.x + 88
        : pads[pads.length - 1].data.x - 44;
    }

    let enemyHelicopter;

    if (data.dead) {
      data.domCanvas.dieExplosion?.animate?.();
    }

    if (!data.stopped && !game.data.battleOver) {
      sprites.moveTo(exports, data.x + data.vX * GAME_SPEED_RATIOED, data.y);
    } else {
      // if stopped, just take scroll into effect
      sprites.moveWithScrollOffset(exports);
    }

    if (data.dead) return !data.deadTimer;

    effects.smokeRelativeToDamage(exports);

    // just in case: prevent any multiple "game over" actions via animation
    if (game.data.battleOver) return;

    if (data.isEnemy && data.x <= data.xGameOver && !game.objects.editor) {
      stop();

      game.objects.view.setAnnouncement(getGameOverAnnouncement(), -1);

      gameOver(onOurSide());
    } else if (
      !data.isEnemy &&
      data.x >= data.xGameOver &&
      !game.objects.editor
    ) {
      stop();

      game.objects.view.setAnnouncement(getGameOverAnnouncement(), -1);

      gameOver(onOurSide());
    } else {
      // bounce wheels after the first few seconds

      if (data.frameCount > FPS * 2) {
        if (data.frameCount % (data.stateModulus / 2) === 0) {
          data.state++;
          data.imageOffset = data.state;

          if (data.state > data.stateMax) {
            data.state = 0;
            data.imageOffset = 0;
          }

          if (data.domCanvas.img) {
            // data.domCanvas.img.source.frameY = data.state;
            refreshSprite();
          }
        } else if (data.frameCount % (data.stateModulus / 2) === 2) {
          // next frame - reset.
          if (data.domCanvas.img) {
            data.imageOffset = 0;
            refreshSprite();
          }
        }
      }

      if (data.frameCount % data.radarJammerModulus === 0) {
        // look for nearby bad guys
        enemyHelicopter = enemyHelicopterNearby(
          data,
          levelConfig.vanJammingI ||
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

    game.logEvent('GAME_OVER');

    game.objects.stats.displayEndGameStats();
  }

  function initDOM() {
    if (!game.objects.editor) {
      dom.o = {};
    } else {
      dom.o = sprites.create({
        className: css.className,
        id: data.id
      });
    }

    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);
  }

  function initVan() {
    initDOM();

    common.initNearby(friendlyNearby, exports);

    radarItem = game.objects.radar.addItem(exports);

    pads = game.objects[TYPES.landingPad];
  }

  height = 16;

  css = common.inheritCSS({
    className: TYPES.van
  });

  const energy = 12;

  data = common.inheritData(
    {
      type: TYPES.van,
      bottomAligned: true,
      deadTimer: null,
      frameCount: 0,
      radarJammerModulus: FPS / 3,
      radarJammerModulus1X: FPS / 3,
      jamming: false,
      energy,
      energyMax: energy,
      direction: 0,
      approachingBase: 768,
      vX: options.isEnemy ? -1 : 1,
      width: 38,
      halfWidth: 19,
      height,
      halfHeight: height / 2,
      imageOffset: 0,
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
      stepOffset: options.stepOffset,
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
    radarItem,
    refreshSprite
  };

  const spriteWidth = 76;
  const spriteHeight = 96;
  const frameHeight = 32;

  function refreshSprite() {
    data.domCanvas.img.src = utils.image.getImageObject(
      data.isEnemy
        ? `van-enemy_${data.imageOffset}.png`
        : `van_${data.imageOffset}.png`
    );
  }

  data.domCanvas = {
    radarItem: Van.radarItemConfig(exports),
    img: {
      src: null,
      source: {
        x: 0,
        y: 0,
        is2X: true,
        width: spriteWidth,
        height: spriteHeight,
        frameWidth: spriteWidth,
        frameHeight,
        // sprite offset indices
        frameX: 0,
        frameY: 0
      },
      target: {
        width: spriteWidth / 2,
        height: frameHeight / 2
      }
    }
  };

  refreshSprite();

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
  width: 3,
  height: 1.75,
  draw: (ctx, obj, pos, width, height) => {
    ctx.roundRect(
      pos.left(obj.data.left),
      pos.bottomAlign(height, obj),
      pos.width(width),
      pos.height(height),
      // "shape" depending on orientation
      obj.oParent?.data?.isEnemy
        ? [width * 1.65, width, width, width]
        : [width, width * 1.65, width, width]
    );
  }
});

export { Van };
