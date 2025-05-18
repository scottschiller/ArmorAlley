import { game, getObjectById } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { gameType } from '../aa.js';
import {
  rndInt,
  worldWidth,
  TYPES,
  rngInt,
  rngPlusMinus,
  rng,
  worldHeight,
  GAME_SPEED_RATIOED,
  isSafari,
  rngBool,
  FPS,
  isMobile,
  isMaybeiPad
} from '../core/global.js';
import { playSound, sounds } from '../core/sound.js';
import { zones } from '../core/zones.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';
import { net } from '../core/network.js';
import { gamePrefs } from '../UI/preferences.js';

const FRAME_Y_MIDDLE = 4;
const FACING = 4;
const windOffsetXMax = 3;

const Balloon = (options = {}) => {
  let data, domCanvas, objects, exports;

  objects = {
    bunker: options?.bunker?.data?.id || null,
    chain: null
  };

  const width = 38;
  const height = 16;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // plus/minus, sprite vs. direction
  const facingMax = 4;

  // for centering over the bunker: half bunker width (if provided), minus half balloon width (local)
  const leftOffset = (options.bunker?.data?.halfWidth || 0) - halfWidth;

  const energy = 6;

  data = common.inheritData(
    {
      type: TYPES.balloon,
      canRespawn: false,
      frameCount: 0,
      windModulus: FPS * 3,
      windOffsetX: 0,
      windOffsetY: 0,
      energy,
      energyMax: energy,
      direction: 0,
      detached: !getObjectById(objects.bunker),
      hostile: !getObjectById(objects.bunker), // dangerous when detached
      holdingWind: false,
      verticalDirection: -1,
      verticalDirectionDefault: -1,
      facing: options.isEnemy ? -4 : 4,
      lastFacingX: null,
      facingRatio: facingMax / (windOffsetXMax * 0.75),
      facingMax,
      // larger <- or -> to smaller o (circle) shape
      facingWidths: [38, 33, 28, 22, 15, 22, 28, 33, 38],
      width,
      height,
      halfWidth,
      halfHeight,
      // centering balloon over bunker (half-bunker minus half-balloon widths)
      leftOffset,
      // centering balloon on radar (which expects x to line up with bunker x)
      radarLeftOffset: -leftOffset,
      x: options.x + leftOffset,
      minX: 0,
      maxX: worldWidth,
      minY: 48,
      // don't allow balloons to fly into ground units, generally speaking
      maxY: game.objects.view.data.world.height - height - 32,
      domFetti: {
        colorType: 'yellow',
        elementCount: 20 + rndInt(40),
        startVelocity: 10 + rndInt(15),
        spread: 360
      },
      cpuCanTarget: rngBool(options.type),
      timers: {}
    },
    options
  );

  // random Y start position, unless specified
  data.y = data.y || rngInt(data.maxY, data.type);

  domCanvas = {
    ownershipAnimation: null,
    // hack: note delayed assignment below once exports is defined
    radarItem: null, // Balloon.radarItemConfig(exports),
    img: getCanvasBalloon(data),
    radarItemImg: getCanvasBalloon(data)
  };

  exports = {
    animate: () => animate(exports),
    attachChain: (chain) => attachChain(exports, chain),
    data,
    detachFromBunker: () => detachFromBunker(exports),
    die: (dieOptions) => die(exports, dieOptions),
    dieComplete: () => dieComplete(exports),
    // hack - see below.
    domCanvas,
    init: () => initBalloon(exports),
    isOnScreenChange: () => isOnScreenChange(exports),
    objects,
    reset: () => reset(exports),
    setEnemy: (isEnemy) => setEnemy(exports, isEnemy),
    updateSprite: () => updateSprite(exports)
  };

  domCanvas.radarItem = Balloon.radarItemConfig({ exports });

  return exports;
};

// note: external methods

function updateSprite(exports) {
  let { data, domCanvas } = exports;

  if (!domCanvas?.img) return;
  domCanvas.img.src = utils.image.getImageObject(
    getSpriteURL(data),
    (newImg) => {
      // update the radar balloon, also.
      domCanvas.radarItemImg.src = newImg;
    }
  );
}

function getSpriteURL(data) {
  const offset = FRAME_Y_MIDDLE + data.facing;
  return gamePrefs.weather === 'snow'
    ? 'snow/balloon_mac_snow.png'
    : `balloon_${offset}.png`;
}

function getCanvasBalloon(data, onload = () => {}) {
  const spriteWidth = 76;
  const spriteHeight = 288;
  const frameWidth = spriteWidth;
  const frameHeight = spriteHeight / 9;

  return {
    src: utils.image.getImageObject(getSpriteURL(data), onload),
    source: {
      x: 0,
      y: 0,
      is2X: true,
      width: spriteWidth,
      height: spriteHeight,
      frameWidth,
      frameHeight,
      frameX: 0,
      // left vs. right-facing offsets, snow version only
      frameY: gamePrefs.weather !== 'snow' ? 0 : data.isEnemy ? 0 : 8
    },
    target: {
      width: frameWidth / 2,
      height: frameHeight / 2,
      // for repositioning of sprite vs. collision hitbox
      xOffset: 0
    }
  };
}

function checkRespawn(exports) {
  let { data, objects } = exports;

  // odd edge case - data not always defined if destroyed at the right time?
  if (
    data?.canRespawn &&
    data?.dead &&
    !getObjectById(objects.bunker)?.data?.dead
  ) {
    reset(exports);
  }
}

function setEnemy(exports, isEnemy) {
  let { data, domCanvas } = exports;

  if (data.isEnemy === isEnemy) return;

  data.isEnemy = isEnemy;

  zones.changeOwnership(exports);

  // get a fresh copy, pull coords as balloon has likely been mutated.
  const img = getCanvasBalloon(data);
  const { width, height, frameWidth, frameHeight } = img.source;

  const isSnowing = gamePrefs.weather === 'snow';

  // update internal "facing" state
  data.facing = isEnemy ? -FACING : FACING;

  const animConfig = {
    sprite: {
      url: isSnowing ? 'snow/balloon_mac_snow.png' : `balloon_#.png`,
      width,
      height,
      frameWidth,
      frameHeight,
      animationDuration: 1,
      // snow version is a single sprite
      animationFrameCount: isSnowing ? 0 : 9,
      reverseDirection: isEnemy
    },
    onEnd: () => {
      domCanvas.ownershipAnimation = null;
    }
  };

  domCanvas.ownershipAnimation = common.domCanvas.canvasAnimation(
    exports,
    animConfig
  );

  // hackish: apply the same to the radar item, too.
  domCanvas.radarItemImg = domCanvas.img;
}

function attachChain(exports, chain = null) {
  let { data, objects } = exports;

  // a "circular" loop that's actually a chain. ;)
  objects.chain = chain;
  getObjectById(objects.chain)?.attachBalloon(data.id);
}

function detachFromBunker(exports) {
  let { data, objects } = exports;

  if (data.detached) return;

  data.detached = true;

  // and become hostile.

  if (!data.hostile) {
    data.hostile = true;
    zones.changeOwnership(exports);
  }

  // disconnect bunker <-> balloon references
  let bunker = getObjectById(objects.bunker);
  if (bunker) {
    // the balloon will now "own" the chain.
    bunker.nullifyBalloon();
    objects.bunker = null;
    bunker = null;
  } else {
    // if no bunker to detach, there should be no chain, either.
    attachChain(exports, null);
  }

  // assign immediate wind, based on ownership.
  // just enough to be full left or right-facing.
  data.windOffsetX =
    windOffsetXMax * (data.isEnemy ? -1 : 1) * (1 / data.facingRatio + 0.01);

  checkDirection(exports);
}

function die(exports, dieOptions = {}) {
  let { data, domCanvas, radarItem } = exports;

  if (data.dead) return;

  let oAttacker = getObjectById(dieOptions.attacker);

  // pop!
  if (sounds.balloonExplosion) {
    playSound(sounds.balloonExplosion, exports);
    if (gamePrefs.bnb && data.isOnScreen) {
      playSound(sounds.bnb.beavisPoop, exports);
    }
  }

  domCanvas.dieExplosion = effects.genericExplosion(exports);
  domCanvas.img = null;

  effects.inertGunfireExplosion({ exports });

  effects.domFetti(data.id, dieOptions.attacker);

  effects.smokeRing(data.id, {
    parentVX: data.vX,
    parentVY: data.vY,
    offsetX: 3,
    offsetY: 0.01
  });

  effects.shrapnelExplosion(data, {
    count:
      3 +
      (gameType === 'hard' ||
      gameType === 'extreme' ||
      gameType === 'armorgeddon'
        ? rngInt(3, TYPES.shrapnel)
        : 0),
    velocity: rngInt(4, TYPES.shrapnel),
    parentVX: oAttacker?.data?.vX
  });

  // sanity check: balloon may be almost immediately restored
  // if shot while a group of infantry are passing by the bunker,
  // so only "finish" dying if still dead.

  // radar die -> hide has its own timeout, it will check
  // the parent (i.e., this) balloon's `data.dead` before hiding.
  radarItem.die();

  data.timers.deadTimer = common.frameTimeout.set('dieComplete', 1000);

  zones.leaveAllZones(exports);

  data.dead = true;

  common.onDie(data.id, dieOptions);
}

function dieComplete(exports) {
  let { data, domCanvas } = exports;

  domCanvas.dieExplosion = null;
  // sanity check: don't hide if already respawned
  if (!data.dead) return;
}

function isOnScreenChange(exports) {
  let { data, objects } = exports;

  // ignore if still tethered
  if (!data.detached) return;

  // chains don't get `isOnScreenChange()`, typically connected to bunkers or balloons
  getObjectById(objects.chain)?.isJerking(data.isOnScreen);
}

function holdWind(exports) {
  let { data } = exports;

  // don't allow a change in wind / direction for 5-10 seconds.
  data.holdingWind = true;
  data.windModulus = FPS * 5 + rngInt(FPS * 5, data.type);
}

function checkDirection(exports) {
  let { data } = exports;

  if (
    !data.holdingWind &&
    ((data.windOffsetX > 0 && data.direction !== 1) ||
      (data.windOffsetX < 0 && data.direction !== -1))
  ) {
    // changing winds.
    data.direction *= -1;
    holdWind(exports);
  }
  updateFacing(exports);
}

function updateFacing(exports) {
  let { data, domCanvas } = exports;

  // "facing" based on wind
  let facing;

  // limit to - / + range
  data.facing = Math.min(
    data.facingMax,
    Math.max(-data.facingMax, Math.floor(data.windOffsetX * data.facingRatio))
  );

  if (data.facing !== data.lastFacingX) {
    data.lastFacingX = data.facing;
    const newWidth = data.facingWidths[data.facing + data.facingMax];
    const delta = newWidth - data.width;
    data.width = newWidth;
    data.halfWidth = data.width / 2;
    // reposition balloon, since width changed
    data.x -= delta / 2;
    /**
     * HACKISH: offset sprite to match collision box, because sprite is drawn at full-width.
     * This repositions the sprite so that e.g., the non-moving narrow balloon is drawn with the hitbox centered.
     */
    if (domCanvas.img) {
      domCanvas.img.target.xOffset = -(data.facingWidths[0] - data.width) / 2;
      /**
       * Update sprite position, moving up/down from center.
       * Each balloon frame is 16px tall, when scaled down.
       */
      if (gamePrefs.weather === 'snow') {
        domCanvas.img.source.frameY = FRAME_Y_MIDDLE + data.facing;
      }
      updateSprite(exports);
    }
  }
}

function animate(exports) {
  let { data, domCanvas, objects } = exports;

  if (data.dead) {
    checkRespawn(exports);

    domCanvas?.dieExplosion?.animate();

    // explosion underway: move, accounting for scroll
    if (data.timers.deadTimer) {
      return;
    }

    // allow balloon to be "GCed" only when free-floating, separated from bunker
    let bunker = getObjectById(objects.bunker);

    return (
      data.dead && !data.timers.deadTimer && (!bunker || bunker?.data?.dead)
    );
  }

  // not dead...

  if (domCanvas?.ownershipAnimation) {
    domCanvas.ownershipAnimation.animate();
  }

  effects.smokeRelativeToDamage(exports);

  if (!data.detached) {
    // move relative to bunker

    if (
      (data.y >= data.maxY && data.verticalDirection > 0) ||
      (data.y <= data.minY && data.verticalDirection < 0)
    ) {
      data.verticalDirection *= -1;
    }

    data.y += data.verticalDirection * GAME_SPEED_RATIOED;
  } else {
    // free-floating balloon

    data.frameCount++;

    // for network games, never change the wind.
    if (!net.active && data.frameCount % data.windModulus === 0) {
      data.holdingWind = false;
      data.windOffsetX += rngPlusMinus(1, data.type);
      data.windOffsetX = Math.max(
        -windOffsetXMax,
        Math.min(windOffsetXMax, data.windOffsetX)
      );

      data.windOffsetY += rngPlusMinus(1, data.type);
      data.windOffsetY = Math.max(-0.5, Math.min(0.5, data.windOffsetY));

      // and randomize
      // dropped for now to avoid de-sync in replay
      // data.windModulus = 32 + rngInt(32, data.type);
    }

    // if at end of world, change the wind and prevent randomization until within world limits
    // this allows balloons to drift a little over, but they will return.
    if (data.x + data.windOffsetX >= data.maxX) {
      data.frameCount = 0;
      data.windOffsetX -= 0.05;
    } else if (data.x + data.windOffsetX <= data.minX) {
      data.frameCount = 0;
      data.windOffsetX += 0.05;
    }

    // limit to screen, too
    if (data.y + data.windOffsetY >= data.maxY) {
      data.frameCount = 0;
      data.windOffsetY -= 0.1;
    } else if (data.y + data.windOffsetY <= data.minY) {
      data.frameCount = 0;
      if (data.windOffsetY <= 0.5) data.windOffsetY += 0.1;
    }

    checkDirection(exports);

    data.x += data.windOffsetX * GAME_SPEED_RATIOED;
    data.y += data.windOffsetY * GAME_SPEED_RATIOED;

    zones.refreshZone(exports);
  }

  sprites.draw(exports);
}

function reset(exports) {
  let { data, domCanvas, radarItem } = exports;

  // respawn can actually happen now
  data.energy = data.energyMax;

  // restore default vertical
  data.verticalDirection = data.verticalDirectionDefault;

  // look ma, no longer dead!
  data.dead = false;

  // reset position, too
  data.y = common.bottomAlignedY(-data.height);

  radarItem.reset();

  data.canRespawn = false;

  if (data.timers.deadTimer) {
    data.timers.deadTimer = null;
    delete data.timers.deadTimer;
  }

  zones.refreshZone(exports);

  // update UI, right away?
  animate(exports);

  // stop any animation...
  domCanvas.ownershipAnimation = null;

  // and reset
  domCanvas.img = getCanvasBalloon(data);

  sprites.updateEnergy(data.id);

  // presumably, triggered by an infantry.
  if (sounds.chainRepair) {
    playSound(sounds.chainRepair, exports);
  }
}

function initBalloon(exports) {
  let { data, objects } = exports;

  common.initDOM(exports);

  if (!objects.bunker) {
    // ensure we're free of chain + bunker
    attachChain(exports, null);
    detachFromBunker(exports);
  }

  if (net.active) {
    // network case: set random wind only once, reduce the chance of de-sync during game.
    data.windOffsetX = rngPlusMinus(rng(windOffsetXMax, data.type), data.type);
    data.windOffsetY = rngPlusMinus(rng(0.33, data.type), data.type);
  }

  exports.radarItem = game.objects.radar.addItem(exports, { canRespawn: true });
}

Balloon.radarItemConfig = ({ exports }) => ({
  width: 4,
  height: 2,
  excludeFillStroke: true,
  draw: (ctx, obj, pos, width, height) => {
    // don't draw while dead - but may be respawned.
    // when first dead, timer is set - allow blinking.
    // once dead AND the timer has finished, don't draw.
    if (exports.data.dead && !exports.data.timers.deadTimer) return;
    const left = pos.left(obj.data.left);
    const scaledWidth = pos.width(width);
    const scaledHeight = pos.height(height);
    let chain = getObjectById(exports?.objects?.chain);
    if (chain && !chain.data.dead) {
      const chainX = left + scaledWidth / 2;
      const chainY = obj.data.top + scaledHeight / 2;
      const chainHeight =
        ((getObjectById(exports?.objects.bunker)
          ? worldHeight
          : chain.data.height) /
          worldHeight) *
        game.objects.radar.data.height;
      ctx.beginPath();
      ctx.strokeStyle = '#666';
      ctx.setLineDash([1, 2]);
      ctx.moveTo(chainX, chainY);
      ctx.lineTo(chainX, chainY + chainHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const { data } = exports;

    function render() {
      // in preview mode, no live battlefield image.
      const radarItemImg =
        exports.domCanvas?.img || exports.domCanvas?.radarItemImg;

      let targetX = left;
      let targetY = obj.data.top - scaledHeight / 2;

      let renderedWidth =
        ((radarItemImg.target.width || radarItemImg.source.width / 2) / 2) *
        (data.facing === 0 ? 0.9 : 0.78);

      // TODO: WTF with Safari vs. everyone else on canvas height? :X
      let renderedHeight =
        (radarItemImg.target.height || radarItemImg.source.height / 2) *
        (isSafari ? 0.5 : 4);

      // TODO: check if mobile Chrome on Android needs this, too.
      if (isSafari && isMobile && !isMaybeiPad) {
        renderedWidth *= 0.5;
        renderedHeight *= 0.5;
      }

      ctx.drawImage(
        radarItemImg.src,
        radarItemImg.source.x,
        radarItemImg.source.y,
        radarItemImg.source.width,
        radarItemImg.source.height,
        targetX,
        targetY,
        renderedWidth,
        renderedHeight
      );
    }

    // this covers the initial game menu / level preview case...
    if (!exports.domCanvas.radarItemImg) {
      exports.domCanvas.radarItemImg = getCanvasBalloon(data, (newImg) => {
        // ensure the image is set before rendering
        exports.domCanvas.radarItemImg.src = newImg;
        render();
      });
    } else {
      // only render once fully loaded
      render();
    }
  }
});

export { Balloon, FACING };
