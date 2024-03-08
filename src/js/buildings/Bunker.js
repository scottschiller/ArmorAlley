import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import {
  rndInt,
  rnd,
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

const Bunker = (options = {}) => {
  let css, data, dom, objects, radarItem, exports;

  function createBalloon(useRandomY) {
    if (!objects.balloon) {
      objects.balloon = game.addObject(TYPES.balloon, {
        bunker: exports,
        isEnemy: data.isEnemy,
        x: data.x,
        y: useRandomY ? undefined : common.bottomAlignedY(-data.height)
      });
    }

    if (!objects.chain) {
      // create a chain, linking the base and the balloon
      objects.chain = game.addObject(TYPES.chain, {
        isEnemy: data.isEnemy,
        x: data.x + (data.halfWidth - 1.75),
        y: data.y,
        height: data.y - objects.balloon.data.y,
        balloon: objects.balloon,
        bunker: exports
      });

      // balloon <-> chain
      objects?.balloon?.attachChain(objects.chain);
    }
  }

  function capture(isEnemy) {
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

      playSoundWithDelay(
        sounds.bnb[
          game.data.isBeavis ? 'beavisCapturedBunker' : 'buttheadCapturedBunker'
        ],
        null
      );
    } else {
      game.objects.notifications.add('The enemy captured a bunker 🚩');

      playSoundWithDelay(sounds.enemyClaim, exports);

      if (game.data.isBeavis) {
        playSoundWithDelay(sounds.bnb.beavisLostBunker);
      } else {
        playSoundWithDelay(sounds.bnb.buttheadLostBunker);
      }
    }

    data.isEnemy = isEnemy;

    updateArrowState();

    zones.changeOwnership(exports);

    // and the attached objects, too.
    objects?.chain?.setEnemy(isEnemy);
    objects?.balloon?.setEnemy(isEnemy);

    playSound(sounds.doorClose, exports);

    // check if enemy convoy production should stop or start
    checkProduction();
  }

  function bnbRepair(engineer) {
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

  function engineerRepair(engineer) {
    if (data.energy < data.energyMax) {
      // stop, and don't fire
      engineer.stop(true);
      data.energy = Math.min(
        data.energy + 0.05 * GAME_SPEED_RATIOED,
        data.energyMax
      );
      if (!engineer.data.isEnemy) {
        bnbRepair(engineer);
      }
      if (!data.isRepairing) {
        data.isRpairing = true;
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

    sprites.updateEnergy(exports);
  }

  function repair() {
    // fix the balloon, if it's broken - or, rather, flag it for respawn.
    if (objects.balloon) {
      if (objects.balloon.data.dead) {
        objects.balloon.data.canRespawn = true;
      }
    } else {
      // make a new one
      createBalloon();
    }
  }

  function nullifyChain() {
    objects.chain = null;
  }

  function nullifyBalloon() {
    objects.balloon = null;
  }

  function detachBalloon() {
    // update height of chain in the DOM, assuming it's
    // attached to the balloon now free from the base.
    // once height is assigned, the chain will either
    // hang from the balloon it's attached to, OR, will
    // fall due to gravity (i.e., no base, no balloon.)
    objects?.chain?.applyHeight();

    if (objects.balloon) {
      objects.balloon.attachChain(objects.chain);
      objects.balloon.detachFromBunker();
      objects.chain?.detachFromBunker();
      nullifyBalloon();
    }
  }

  function die(dieOptions = {}) {
    if (data.dead) return;

    effects.damageExplosion(exports);

    effects.domFetti(exports, dieOptions.attacker);

    effects.smokeRing(exports, {
      count: 24,
      velocityMax: 16,
      offsetY: data.height - 2,
      isGroundUnit: true
    });

    detachBalloon();

    const rndXY = 1 + rnd(1);

    effects.shrapnelExplosion(data, {
      count: 24 + rngInt(24, data.type),
      velocity: 3 + rng(3, data.type),
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
      const spriteWidth = 424;
      const spriteHeight = 18;
      return {
        sprite: {
          url: 'bunker-burning-sprite-horizontal.png',
          width: spriteWidth,
          height: spriteHeight,
          frameWidth: spriteWidth / 4,
          frameHeight: spriteHeight,
          animationDuration: 1.5,
          horizontal: true,
          loop: true
        }
      };
    })();

    // replace the base sprite
    data.domCanvas.animation = common.domCanvas.canvasAnimation(
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
    data.domCanvas.nukeAnimation = common.domCanvas.canvasAnimation(
      exports,
      nukeConfig
    );

    data.shadowBlur = 8;
    data.shadowColor = '#fff';

    // burning sprite
    applySpriteURL();

    common.setFrameTimeout(() => {
      // start "burning out"...
      common.setFrameTimeout(() => {
        // and eventually exinguish.
        common.setFrameTimeout(() => {
          data.burninating = false;

          // stop animations
          data.domCanvas.animation = null;
          data.domCanvas.nukeAnimation = null;
          data.shadowBlur = 0;

          // apply dead sprite
          applySpriteURL();

          // re-apply static sprite, dropping animation
          // hackish: apply positioning
          deadConfig.target.x = data.x;
          deadConfig.target.y = data.y;

          // TODO: sort out the offset issue
          deadConfig.target.yOffset = -5;
          data.domCanvas.img = deadConfig;
        }, burninatingTime * burnOutFade);
      }, burninatingTime);
    }, 1200);

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

    common.onDie(exports, dieOptions);

    radarItem.die();
  }

  function animate() {
    data.domCanvas?.animation?.animate();
    data.domCanvas?.nukeAnimation?.animate();

    sprites.moveWithScrollOffset(exports);

    if (!data.dead) {
      effects.smokeRelativeToDamage(exports);
      if (data.arrowFrameActive) {
        arrowConfig.target.angle = data.arrowFrames[data.arrowFrame];
        data.arrowFrame++;
        if (data.arrowFrame >= data.arrowFrames.length) {
          data.arrowFrameActive = false;
        }
      }
    } else if (data.burninating) {
      if (data.smokeFramesLeft) {
        effects.smokeRelativeToDamage(
          exports,
          data.smokeFramesLeft / data.smokeFramesMax
        );
        data.smokeFramesLeft--;
        // cut size in half over time
        data.shadowBlur = 8 * (data.smokeFramesLeft / data.smokeFramesMax);
        // ... and fade blur out
        data.shadowColor = `rgba(255, 255, 255, ${
          data.smokeFramesLeft / data.smokeFramesMax
        })`;
      }
    }
  }

  function engineerHit(target) {
    if (target.data.isEnemy !== data.isEnemy) return;

    // special BnB case
    const tData = target.data;
    let xLookAhead =
      !tData.isEnemy && gamePrefs.bnb
        ? tData.xLookAheadBunker[tData.isBeavis ? 'beavis' : 'butthead']
        : 0;

    // a friendly engineer unit has made contact with a bunker. repair damage when at the door, if any.
    if (collisionCheckMidPoint(target, exports, xLookAhead)) {
      engineerRepair(target);
    }
  }

  function infantryHit(target) {
    // an infantry unit has made contact with a bunker.
    if (target.data.isEnemy === data.isEnemy) {
      // a friendly passer-by.
      repair();
    } else if (collisionCheckMidPoint(target, exports)) {
      // non-friendly, kill the infantry - but let them capture the bunker first.
      capture(target.data.isEnemy);
      target.die({ silent: true });
    }
  }

  function updateArrowState() {
    // TODO: DRY / utility function
    function dropOff(x) {
      // x from 0 to 1 returns from 1 to 0, with in-out easing.
      // https://stackoverflow.com/questions/30007853/simple-easing-function-in-javascript/30007935#30007935
      // Wolfram alpha graph: http://www.wolframalpha.com/input/?i=plot%20%28cos%28pi*x%29%20%2B%201%29%20%2F%202%20for%20x%20in%20%280%2C1%29
      return (Math.cos(Math.PI * x) + 1) / 2;
    }

    function makeArrowFrames(angleDelta) {
      const duration = FPS * 0.5 * (1 / GAME_SPEED);

      data.arrowFrames = [];

      for (let i = 0; i <= duration; i++) {
        // 1/x, up to 1
        data.arrowFrames[i] =
          arrowConfig.target.angle + dropOff(i / duration) * angleDelta;
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

  function initDOM() {
    if (game.objects.editor) {
      dom.o = sprites.create({
        className: css.className,
        id: data.id
      });
    } else {
      dom.o = {};
    }
    data.domCanvas.img = [spriteConfig, arrowConfig];
    sprites.moveTo(exports, data.x, data.y);
  }

  function initBunker() {
    initDOM();

    // first time, create at random Y location.
    createBalloon(true);

    data.midPoint = common.getDoorCoords(exports);

    radarItem = game.objects.radar.addItem(exports);
  }

  function getSpriteURL() {
    if (data.dead) return 'bunker-dead.png';
    const file = 'bunker_mac';
    return gamePrefs.weather === 'snow'
      ? `snow/${file}_snow.png`
      : `${file}.png`;
  }

  function applySpriteURL() {
    if (!spriteConfig) return;
    spriteConfig.src = utils.image.getImageObject(getSpriteURL());
  }

  css = common.inheritCSS({
    className: TYPES.bunker,
    arrow: 'arrow',
    burning: 'burning',
    burningOut: 'burning-out',
    engineerInteracting: 'engineer-interacting',
    facingLeft: 'facing-left',
    facingRight: 'facing-right',
    rubbleContainer: 'rubble-container',
    rubble: 'rubble',
    nuke: 'nuke'
  });

  // how long bunkers take to "burn out"
  const burninatingTime = 10000;
  const burnOutFade = 0.5;

  const smokeFrames =
    ((burninatingTime + burninatingTime * burnOutFade * 0.85) / 1000) * FPS;

  data = common.inheritData(
    {
      type: TYPES.bunker,
      bottomAligned: true,
      y: game.objects.view.data.world.height - 25 - 2, // override to fix helicopter / bunker vertical crash case
      smokeFramesLeft: parseInt(smokeFrames, 10),
      smokeFramesMax: smokeFrames,
      energy: 50,
      energyHalf: 25,
      energyMax: 50,
      energyLineScale: 0.95,
      centerEnergyLine: true,
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
      }
    },
    options
  );

  dom = {
    o: null
  };

  objects = {
    balloon: null,
    chain: null,
    helicopter: null
  };

  exports = {
    animate,
    capture,
    objects,
    data,
    die,
    dom,
    engineerHit,
    infantryHit,
    init: initBunker,
    nullifyChain,
    nullifyBalloon,
    radarItem,
    repair,
    updateSprite: applySpriteURL
  };

  data.domCanvas = {
    radarItem: Bunker.radarItemConfig()
  };

  const spriteConfig = (() => {
    const spriteWidth = 104;
    const spriteHeight = 54; // actually 51, but hacking the height for alignnment here :X
    return {
      src: utils.image.getImageObject(getSpriteURL()),
      source: {
        x: 0,
        y: 0,
        width: spriteWidth,
        height: spriteHeight
      },
      target: {
        width: spriteWidth / 2,
        height: spriteHeight / 2,
        yOffset: -0.25
      }
    };
  })();

  const deadConfig = (() => {
    const spriteWidth = 106;
    const spriteHeight = 21; // actually 18, but hacking the height for alignnment here :X
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

  return exports;
};

Bunker.radarItemConfig = () => ({
  width: 4.25,
  height: 2.5,
  excludeFillStroke: true,
  draw: (ctx, obj, pos, width, height) => {
    ctx.fillStyle = obj?.oParent?.data?.isEnemy ? ENEMY_COLOR : '#17a007';

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
