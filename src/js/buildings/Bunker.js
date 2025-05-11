import { game, getObjectById } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import {
  rndInt,
  TYPES,
  FPS,
  rng,
  rngInt,
  GAME_SPEED_RATIOED,
  GAME_SPEED,
  ENEMY_COLOR
} from '../core/global.js';
import { collisionCheckMidPoint, checkProduction } from '../core/logic.js';
import { playSound, playSoundWithDelay, sounds } from '../core/sound.js';
import { gamePrefs } from '../UI/preferences.js';
import { zones } from '../core/zones.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';

// how long bunkers take to "burn out"
const burninatingTime = 10000;
const energy = 69;

const Bunker = (options = {}) => {
  let exports;

  let data, domCanvas, objects, radarItem;

  const smokeFrames = (burninatingTime / 1000) * FPS;

  data = common.inheritData(
    {
      type: TYPES.bunker,
      bottomAligned: true,
      y: game.objects.view.data.world.height - 25 - 2, // override to fix helicopter / bunker vertical crash case
      smokeFramesLeft: parseInt(smokeFrames, 10),
      smokeFramesMax: smokeFrames,
      energy,
      energyHalf: energy / 2,
      energyMax: energy,
      hasBeavis: false,
      hasButthead: false,
      isRecapture: false,
      isSinging: false,
      isRepairing: false,
      width: 52,
      halfWidth: 26,
      height: 25.5,
      halfHeight: 12.75,
      midPoint: null,
      domFetti: {
        colorType: 'yellow',
        elementCount: 256 + rndInt(384),
        startVelocity: 20 + rndInt(25),
        spread: 180,
        decay: 0.95
      },
      timers: {}
    },
    options
  );

  objects = {
    balloon: null,
    chain: null
  };

  domCanvas = {
    radarItem: Bunker.radarItemConfig()
  };

  const spriteConfig = (() => {
    const spriteWidth = 106;
    const spriteHeight = 52;
    return {
      src: utils.image.getImageObject(getSpriteURL(data)),
      source: {
        x: 0,
        y: 0,
        width: spriteWidth,
        height: spriteHeight
      },
      target: {
        width: spriteWidth / 2,
        height: spriteHeight / 2,
        yOffset: -2.5
      }
    };
  })();

  const deadConfig = (() => {
    const spriteWidth = 104;
    const spriteHeight = 18;
    return {
      src: utils.image.getImageObject('bunker-dead.png'),
      source: {
        x: 0,
        y: 0,
        width: spriteWidth,
        height: spriteHeight
      },
      target: {
        width: spriteWidth / 2,
        height: spriteHeight / 2
      }
    };
  })();

  const arrowConfig = (() => {
    const arrowWidth = 6;
    const arrowHeight = 10;
    return {
      src: utils.image.getImageObject('arrow-right.png'),
      excludeEnergy: true,
      source: {
        x: 0,
        y: 0,
        frameWidth: arrowWidth,
        frameHeight: arrowHeight,
        frameX: 0,
        frameY: 0
      },
      target: {
        width: arrowWidth,
        height: arrowHeight,
        xOffset: 38,
        yOffset: -8,
        angle: data.isEnemy ? 180 : 0
      }
    };
  })();

  exports = {
    animate: () => animate(exports),
    arrowConfig,
    capture: (isEnemy) => capture(exports, isEnemy),
    objects,
    data,
    deadConfig,
    die: (dieOptions) => die(exports, dieOptions),
    domCanvas,
    engineerHit: (target) => engineerHit(exports, target),
    extinguish: () => extinguish(exports),
    infantryHit: (target) => infantryHit(exports, target),
    init: () => initBunker(exports),
    nullifyChain: () => nullifyChain(exports),
    nullifyBalloon: () => nullifyBalloon(exports),
    radarItem,
    repair: (engineer) => repair(exports, engineer),
    spriteConfig,
    updateSprite: () => applySpriteURL(exports)
  };

  return exports;
};

function getSpriteURL(data) {
  if (data.dead) return 'bunker-dead.png';
  const file = 'bunker_mac';
  return gamePrefs.weather === 'snow' ? `snow/${file}_snow.png` : `${file}.png`;
}

function applySpriteURL(exports) {
  let { data, spriteConfig } = exports;

  if (!spriteConfig) return;
  spriteConfig.src = utils.image.getImageObject(getSpriteURL(data));
}

function createBalloon(exports) {
  let { data, objects } = exports;

  let { balloon, chain } = objects;

  if (!balloon) {
    let newBalloon = game.addObject(TYPES.balloon, {
      bunker: exports,
      isEnemy: data.isEnemy,
      x: data.x,
      y: common.bottomAlignedY(-data.height)
    });
    exports.objects.balloon = newBalloon.data.id;
  }

  if (!chain) {
    // create a chain, linking the base and the balloon
    let oBalloon = getObjectById(objects.balloon);

    let newChain = game.addObject(TYPES.chain, {
      isEnemy: data.isEnemy,
      x: data.x + (data.halfWidth - 1.75),
      y: data.y,
      height: data.y - oBalloon.data.y,
      balloon: oBalloon,
      bunker: exports
    });

    exports.objects.chain = newChain.data.id;

    // balloon <-> chain
    oBalloon?.attachChain(exports.objects.chain);
  }
}

function capture(exports, isEnemy) {
  let { data, objects } = exports;

  const friendlyCapture = isEnemy === game.players.local.data.isEnemy;

  if (friendlyCapture) {
    // first time capture (of original bunker state) vs. taking back from the enemy
    if (!data.isRecapture) {
      game.objects.notifications.add('You captured a bunker ⛳');
      data.isRecapture = true;
    } else {
      game.objects.notifications.add('You recaptured a bunker ⛳');
    }

    playSoundWithDelay(sounds.friendlyClaim, exports);

    if (gamePrefs.bnb && sounds.bnb) {
      playSoundWithDelay(
        sounds.bnb[
          game.data.isBeavis ? 'beavisCapturedBunker' : 'buttheadCapturedBunker'
        ],
        null
      );
    }
  } else {
    game.objects.notifications.add('The enemy captured a bunker 🚩');

    playSoundWithDelay(sounds.enemyClaim, exports);

    if (gamePrefs.bnb && sounds.bnb) {
      playSoundWithDelay(
        sounds.bnb[
          game.data.isBeavis ? 'beavisLostBunker' : 'buttheadLostBunker'
        ]
      );
    }
  }

  data.isEnemy = isEnemy;

  updateArrowState(exports);

  zones.changeOwnership(exports);

  // and the attached objects, too.
  getObjectById(objects?.chain)?.setEnemy(isEnemy);
  getObjectById(objects?.balloon)?.setEnemy(isEnemy);

  playSound(sounds.doorClose, exports);

  // check if enemy convoy production should stop or start
  checkProduction();
}

function bnbRepair(exports, engineer) {
  if (!gamePrefs.bnb) return;

  let { data } = exports;

  if (!data.hasBeavis && engineer.data.isBeavis) {
    data.hasBeavis = true;
  }

  if (!data.hasButthead && engineer.data.isButthead) {
    data.hasButthead = true;
    if (data.isOnScreen) {
      playSound(sounds.bnb.bhLetsRock, game.players.local);
    }
  }

  // only "sing" the repair if damage >= 50%.
  if (
    data.hasBeavis &&
    data.hasButthead &&
    data.energy < data.energyHalf &&
    !data.isSinging
  ) {
    data.isSinging = true;
    if (data.isOnScreen) {
      playSound(sounds.bnb.singingShort, game.players.local);
    }
  }
}

function engineerRepair(exports, engineer) {
  let { data } = exports;

  if (data.energy < data.energyMax) {
    // stop, and don't fire
    engineer.stop(true);
    data.lastEnergy = data.energy;
    data.energy = Math.min(
      data.energy + 0.05 * GAME_SPEED_RATIOED,
      data.energyMax
    );
    if (gamePrefs.bnb && !engineer.data.isEnemy) {
      bnbRepair(exports, engineer);
    }
    if (!data.isRepairing) {
      data.isRepairing = true;
    }
  } else {
    // repair complete - keep moving
    if (data.isRepairing) {
      data.isRepairing = false;
    }
    engineer.resume();
    if (!engineer.data.isEnemy) {
      data.hasBeavis = false;
      data.hasButthead = false;
      data.isSinging = false;
    }
  }

  sprites.updateEnergy(data.id);
}

function repair(exports) {
  let { objects } = exports;

  // fix the balloon, if it's broken - or, rather, flag it for respawn.
  if (objects.balloon) {
    let balloon = getObjectById(objects.balloon);
    if (balloon?.data?.dead) {
      balloon.data.canRespawn = true;
    }
  } else {
    // make a new one
    createBalloon(exports);
  }
}

function nullifyChain(exports) {
  exports.objects.chain = null;
}

function nullifyBalloon(exports) {
  exports.objects.balloon = null;
}

function detachBalloon(exports) {
  let { objects } = exports;

  /**
   * Update height of chain, assuming it's
   * attached to the balloon now free from the base.
   *
   * Once height is assigned, the chain will either
   * hang from the balloon it's attached to, OR, will
   * fall due to gravity (i.e., no base, no balloon.)
   */
  let chain = getObjectById(objects?.chain);

  chain?.applyHeight();

  if (objects.balloon) {
    let balloon = getObjectById(objects.balloon);
    balloon.attachChain(objects.chain);
    balloon.detachFromBunker();
    chain?.detachFromBunker();
    nullifyBalloon(exports);
  }
}

function die(exports, dieOptions = {}) {
  let { data, domCanvas, radarItem } = exports;

  if (data.dead) return;

  effects.damageExplosion(exports);

  effects.domFetti(data.id, dieOptions.attacker);

  effects.smokeRing(data.id, {
    count: 24,
    velocityMax: 16,
    offsetY: data.height - 2,
    isGroundUnit: true
  });

  detachBalloon(exports);

  const rndXY = 1 + rngInt(1, data.type);

  effects.shrapnelExplosion(data, {
    count: 24 + rngInt(24, data.type),
    velocity: 8 + rng(8, data.type),
    bottomAligned: true
  });

  effects.inertGunfireExplosion({
    exports,
    count: 16 + rndInt(8),
    vX: rndXY,
    vY: rndXY
  });

  /**
   * ******* T R O G D O R ! ! ! *******
   * --------------- 💪🐉 ---------------
   * Burninating the countryside
   * Burninating the peasants
   * Burninating all the peoples
   * And their thatched-roof cottages!
   * Thatched-roof cottages!
   * https://www.hrwiki.org/wiki/Trogdor_(song)
   */
  data.burninating = true;

  // TODO: work into a common / utility shared with SuperBunker bits.

  const burningConfig = (() => {
    const spriteWidth = 104;
    const spriteHeight = 80;
    return {
      sprite: {
        url: 'bunker-burning-sprite.png',
        width: spriteWidth,
        height: spriteHeight,
        frameWidth: spriteWidth,
        frameHeight: spriteHeight / 4,
        animationDuration: 1.5,
        loop: true
      }
    };
  })();

  // replace the base sprite
  domCanvas.animation = common.domCanvas.canvasAnimation(
    exports,
    burningConfig
  );

  /**
   * Commercial, licensed asset - $1.99 USD.
   * https://infectedtribe.itch.io/pixel-explosion
   * 112 x 112 x 21 frames, 100 ms per frame. spritesheet dimensions: 2352 x 112
   * https://graphicriver.net/item/pixel-explosion-set/15457666
   */
  const nukeConfig = (() => {
    const spriteWidth = 2352;
    const spriteHeight = 112;
    return {
      overlay: true,
      scale: 2,
      xOffset: -30,
      yOffset: 0,
      sprite: {
        url: 'battlefield/standalone/infectedtribe_itch_io-pixel_explosion.png',
        width: spriteWidth,
        height: spriteHeight,
        frameWidth: spriteWidth / 21,
        frameHeight: spriteHeight,
        animationDuration: 0.8,
        horizontal: true,
        hideAtEnd: true
      }
    };
  })();

  // add the nuke overlay
  domCanvas.nukeAnimation = common.domCanvas.canvasAnimation(
    exports,
    nukeConfig
  );

  data.shadowBlur = 8 * (gamePrefs.gfx_hi_dpi ? 2 : 1);
  data.shadowColor = '#fff';

  // burning sprite
  applySpriteURL(exports);

  // start "burning out", and eventually extinguish.
  data.timers.extinguish = common.frameTimeout.set(
    'extinguish',
    burninatingTime + 1200
  );

  data.energy = 0;

  data.dead = true;

  if (sounds.explosionLarge) {
    playSound(sounds.crashAndGlass, exports);
    playSound(sounds.explosionLarge, exports);
    playSound(sounds.nuke, exports);
  }

  // don't report explosions during end sequence
  if (!game.data.battleOver) {
    if (data.isOnScreen) {
      if (gamePrefs.bnb) playSound(sounds.bnb.bunkerExplosion, null);
    } else {
      game.objects.notifications.add(
        data.isEnemy === game.players.local.data.isEnemy
          ? 'A friendly bunker was destroyed 💥'
          : 'An enemy bunker was destroyed 💥'
      );
    }
  }

  // check if enemy convoy production should stop or start
  checkProduction();

  common.onDie(data.id, dieOptions);

  radarItem.die();
}

function extinguish(exports) {
  let { data, domCanvas, deadConfig } = exports;

  data.burninating = false;

  // stop animations
  domCanvas.animation = null;
  domCanvas.nukeAnimation = null;
  data.shadowBlur = 0;

  // apply dead sprite
  applySpriteURL(exports);

  // re-apply static sprite, dropping animation
  // hackish: apply positioning
  deadConfig.target.x = data.x;
  deadConfig.target.y = data.y;

  // TODO: sort out the offset issue
  deadConfig.target.yOffset = -8;
  domCanvas.img = deadConfig;
}

function animate(exports) {
  let { arrowConfig, data, domCanvas } = exports;

  sprites.draw(exports);

  domCanvas?.animation?.animate();
  domCanvas?.nukeAnimation?.animate();

  if (!data.dead) {
    effects.smokeRelativeToDamage(exports);
    if (data.arrowFrameActive) {
      arrowConfig.target.angle = data.arrowFrames[data.arrowFrame];
      data.arrowFrame++;
      if (data.arrowFrame >= data.arrowFrames.length) {
        data.arrowFrameActive = false;
      }
    }
  } else if (data.burninating && data.smokeFramesLeft) {
    effects.smokeRelativeToDamage(
      exports,
      data.smokeFramesLeft / data.smokeFramesMax
    );
    // we made smoke on this frame
    data.smokeFramesLeft--;
    // cut size in half over time
    data.shadowBlur =
      8 *
      (data.smokeFramesLeft / data.smokeFramesMax) *
      (gamePrefs.gfx_hi_dpi ? 2 : 1);
    // ... and fade blur out
    data.shadowColor = `rgba(255, 255, 255, ${
      data.smokeFramesLeft / data.smokeFramesMax
    })`;
  }
}

function engineerHit(exports, target) {
  let { data } = exports;

  if (target.data.isEnemy !== data.isEnemy) return;

  // special BnB case
  const tData = target.data;
  let xLookAhead =
    !tData.isEnemy && gamePrefs.bnb
      ? tData.xLookAheadBunker[tData.isBeavis ? 'beavis' : 'butthead']
      : 0;

  // a friendly engineer unit has made contact with a bunker. repair damage when at the door, if any.
  if (collisionCheckMidPoint(target, exports, xLookAhead)) {
    engineerRepair(exports, target);
  }
}

function infantryHit(exports, target) {
  let { data } = exports;

  // an infantry unit has made contact with a bunker.
  if (target.data.isEnemy === data.isEnemy) {
    // a friendly passer-by.
    repair(exports);
  } else if (collisionCheckMidPoint(target, exports)) {
    // non-friendly, kill the infantry - but let them capture the bunker first.
    capture(exports, target.data.isEnemy);
    target.die({ silent: true });
  }
}

function updateArrowState(exports) {
  let { arrowConfig, data } = exports;

  function makeArrowFrames(angleDelta) {
    const duration = FPS * 0.5 * (1 / GAME_SPEED);

    data.arrowFrames = [];

    for (let i = 0; i <= duration; i++) {
      // 1/x, up to 1
      data.arrowFrames[i] =
        arrowConfig.target.angle + common.dropOff(i / duration) * angleDelta;
    }
    // we want 0 to 1.
    data.arrowFrames.reverse();

    data.arrowFrame = 0;
    data.arrowFrameActive = true;
  }

  const angles = {
    left: -180,
    right: 0
  };

  const toAngle = angles[data.isEnemy ? 'left' : 'right'];

  let delta = toAngle - arrowConfig.target.angle;

  // don't loop / turn around the wrong way.
  if (delta <= -180) {
    delta += 360;
  }

  makeArrowFrames(delta);
}

function initDOM(exports) {
  let { arrowConfig, domCanvas, spriteConfig } = exports;

  domCanvas.img = [spriteConfig, arrowConfig];

  common.initDOM(exports);
}

function initBunker(exports) {
  let { data } = exports;

  initDOM(exports);

  createBalloon(exports);

  data.midPoint = common.getDoorCoords(exports);

  exports.radarItem = game.objects.radar.addItem(exports);
}

Bunker.radarItemConfig = () => ({
  width: 4.25,
  height: 2.5,
  excludeFillStroke: true,
  draw: (ctx, obj, pos, width, height) => {
    ctx.fillStyle = game.objectsById[obj?.oParent]?.data?.isEnemy
      ? ENEMY_COLOR
      : '#17a007';

    const left = pos.left(obj.data.left);
    const scaledWidth = pos.width(width);

    ctx.roundRect(
      left,
      pos.bottomAlign(height),
      scaledWidth,
      pos.height(height),
      [3, 3, 0, 0]
    );

    ctx.fill();
    ctx.stroke();

    const doorWidth = 0.5;
    const doorHeight = 1.25;
    const scaledDoorWidth = pos.width(doorWidth);

    // doorway
    ctx.beginPath();
    ctx.roundRect(
      left + scaledWidth / 2 - scaledDoorWidth / 2,
      pos.bottomAlign(doorHeight),
      scaledDoorWidth,
      pos.height(doorHeight),
      [doorHeight, doorHeight, 0, 0]
    );

    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.stroke();
  }
});

export { Bunker };
