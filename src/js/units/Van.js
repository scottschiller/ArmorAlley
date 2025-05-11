import { game, getObjectById } from '../core/Game.js';
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

const spriteWidth = 76;
const spriteHeight = 96;
const frameHeight = 32;
const height = 16;
const energy = 12;

const Van = (options = {}) => {
  let exports;

  let domCanvas, data, radarItem;

  data = common.inheritData(
    {
      type: TYPES.van,
      bottomAligned: true,
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
      },
      timers: {}
    },
    options
  );

  domCanvas = {
    radarItem: Van.radarItemConfig(),
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

  exports = {
    animate: () => animate(exports),
    data,
    domCanvas,
    die: (dieOptions) => die(exports, dieOptions),
    dieComplete: () => dieComplete(exports),
    init: () => initVan(exports),
    radarItem,
    refreshSprite: () => refreshSprite(exports)
  };

  exports.friendlyNearby = {
    options: {
      source: data.id,
      targets: undefined,
      useLookAhead: true,
      // stop moving if we roll up behind a friendly vehicle
      friendlyOnly: true,
      hit: () => stop(exports),
      miss: () => resume(exports)
    },
    // who are we looking for nearby?
    items: getTypes('tank, missileLauncher, van', {
      group: 'friendly',
      exports
    }),
    targets: []
  };

  refreshSprite(exports);

  return exports;
};

function refreshSprite(exports) {
  let { data } = exports;
  exports.domCanvas.img.src = utils.image.getImageObject(
    data.isEnemy
      ? `van-enemy_${data.imageOffset}.png`
      : `van_${data.imageOffset}.png`
  );
}

function stop(exports) {
  exports.data.stopped = true;
}

function resume(exports) {
  if (game.data.battleOver) return;
  exports.data.stopped = false;
}

function die(exports, dieOptions = {}) {
  let { data, radarItem } = exports;

  if (data.dead) return;

  data.energy = 0;

  data.jamming = false;

  data.dead = true;

  exports.domCanvas.dieExplosion = effects.genericExplosion(exports);
  exports.domCanvas.img = null;

  // stop moving while exploding
  data.vX = 0;

  effects.shrapnelExplosion(data, {
    centerX: true,
    velocity: 3 + rngInt(3, TYPES.shrapnel)
  });

  effects.domFetti(data.id, dieOptions.attacker);

  effects.inertGunfireExplosion({ exports });

  effects.damageExplosion(exports);

  data.timers.deadTimer = common.frameTimeout.set('dieComplete', 1000);

  if (radarItem) {
    radarItem.die(dieOptions);
  }

  if (sounds.genericExplosion) {
    playSound(sounds.genericExplosion, exports);
  }

  common.onDie(data.id, dieOptions);

  common.addGravestone(exports);

  let attacker = getObjectById(dieOptions.attacker);

  const attackerType = attacker?.data.type;

  if (
    !net.connected &&
    onOurSide(exports) &&
    gamePrefs[`notify_${data.type}`] &&
    !data.isOnScreen &&
    attackerType !== TYPES.smartMissile
  ) {
    // TODO: review and remove? May be covered in most cases.
    game.objects.notifications.add('You lost a van 💥');
  }
}

function dieComplete(exports) {
  sprites.removeNodesAndUnlink(exports);
}

function onOurSide(exports) {
  return game.players.local.data.isEnemy === exports.data.isEnemy;
}

function getGameOverAnnouncement(exports) {
  return onOurSide(exports)
    ? getVictoryMessage()
    : 'The enemy has won the battle.\nBetter luck next time. <span class="inline-emoji no-emoji-substitution">🏳️</span><hr />' +
        getDefeatMessage();
}

function animate(exports) {
  // hackish: defer this until all objects are created, and the game has started etc.
  let { data, domCanvas, pads } = exports;

  if (!data.xGameOver && pads?.length) {
    data.xGameOver = data.isEnemy
      ? pads[0].data.x + 88
      : pads[pads.length - 1].data.x - 44;
  }

  let enemyHelicopter;

  if (data.dead) {
    exports.domCanvas.dieExplosion?.animate?.();
  }

  if (!data.stopped && !game.data.battleOver) {
    sprites.moveTo(exports, data.x + data.vX * GAME_SPEED_RATIOED, data.y);
  }

  if (data.dead) return !data.timers.deadTimer;

  effects.smokeRelativeToDamage(exports);

  // just in case: prevent any multiple "game over" actions via animation
  if (game.data.battleOver) {
    // ensure the van at the enemy base is drawn.
    sprites.draw(exports);
    return;
  }

  if (data.isEnemy && data.x <= data.xGameOver && !game.objects.editor) {
    stop(exports);

    game.objects.view.setAnnouncement(getGameOverAnnouncement(exports), -1);

    gameOver(exports, onOurSide(exports));
  } else if (
    !data.isEnemy &&
    data.x >= data.xGameOver &&
    !game.objects.editor
  ) {
    stop(exports);

    game.objects.view.setAnnouncement(getGameOverAnnouncement(exports), -1);

    gameOver(exports, onOurSide(exports));
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

        if (domCanvas.img) {
          // domCanvas.img.source.frameY = data.state;
          refreshSprite(exports);
        }
      } else if (data.frameCount % (data.stateModulus / 2) === 2) {
        // next frame - reset.
        if (domCanvas.img) {
          data.imageOffset = 0;
          refreshSprite(exports);
        }
      }
    }

    if (data.frameCount % data.radarJammerModulus === 0) {
      // look for nearby bad guys
      enemyHelicopter = getObjectById(
        enemyHelicopterNearby(
          data,
          // safe van jamming default?
          levelConfig.vanJammingI
        )
      );

      if (!data.jamming && enemyHelicopter) {
        data.jamming = true;
      } else if (data.jamming && !enemyHelicopter) {
        data.jamming = false;
      }
    }
  }

  if (gamePrefs.ground_unit_traffic_control) {
    nearbyTest(exports.friendlyNearby, exports);
  }

  sprites.draw(exports);

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

  return data.dead && !data.timers.deadTimer;
}

function gameOver(exports, youWon) {
  // somebody's base is about to get blown up.
  let { data } = exports;

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
  game.objects.joystick?.stop();

  utils.css.add(document.body, 'game-over', youWon ? 'you-won' : 'you-lost');

  game.logEvent('GAME_OVER');
}

function initVan(exports) {
  common.initDOM(exports);

  common.initNearby(exports.friendlyNearby, exports);

  exports.radarItem = game.objects.radar.addItem(exports);

  exports.pads = game.objects[TYPES.landingPad];
}

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
      game.objectsById[obj.oParent]?.data?.isEnemy
        ? [width * 1.65, width, width, width]
        : [width, width * 1.65, width, width]
    );
  }
});

export { Van };
