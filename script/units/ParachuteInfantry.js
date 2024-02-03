import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import {
  rndInt,
  worldHeight,
  tutorialMode,
  TYPES,
  rng,
  rngInt,
  GAME_SPEED_RATIOED,
  FPS,
  GAME_SPEED
} from '../core/global.js';
import { skipSound, playSound, sounds } from '../core/sound.js';
import { gamePrefs } from '../UI/preferences.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';

const ParachuteInfantry = (options = {}) => {
  let dom, data, radarItem, exports;

  function openParachute() {
    if (data.parachuteOpen) return;

    // undo manual assignment from free-fall animation
    data.domCanvas.img.source.frameY = 0;

    // update model with open height
    data.height = 19;
    data.halfHeight = data.height / 2;

    // and parachute speed, too.
    data.vY = 0.3 + rng(0.3, data.type);

    // make the noise
    if (sounds.parachuteOpen) {
      playSound(sounds.parachuteOpen, exports);
    }

    data.parachuteOpen = true;
  }

  function die(dieOptions = {}) {
    if (data.dead) return;

    data.domCanvas.img = null;

    if (!dieOptions?.silent) {
      effects.inertGunfireExplosion({ exports });

      if (gamePrefs.bnb) {
        if (data.isEnemy) {
          playSound(sounds.bnb.dvdPrincipalScream, exports);
        } else {
          playSound(sounds.bnb.screamShort, exports);
        }
      } else {
        playSound(sounds.scream, exports);
      }

      common.addGravestone(exports);
    }

    sprites.removeNodesAndUnlink(exports);

    data.energy = 0;

    data.dead = true;

    radarItem?.die(dieOptions);

    common.onDie(exports, dieOptions);
  }

  function hit(hitPoints, target) {
    // special case: helicopter explosion resulting in a parachute infantry - make parachute invincible to shrapnel.
    if (target?.data?.type === 'shrapnel' && data.ignoreShrapnel) {
      return false;
    }

    return common.hit(exports, hitPoints, target);
  }

  function animate() {
    let randomWind, bgY;

    if (data.dead) return !dom.o;

    // falling?

    sprites.moveTo(
      exports,
      data.x + data.vX * GAME_SPEED_RATIOED,
      data.y + data.vY * GAME_SPEED_RATIOED
    );

    if (!data.parachuteOpen) {
      if (data.y >= data.parachuteOpensAtY) {
        openParachute();
      } else if (
        data.frameCount % (data.panicModulus * (1 / GAME_SPEED_RATIOED)) ===
        0
      ) {
        // like Tom Petty, free fallin'.
        // alternate between 0/1
        data.panicFrame = !data.panicFrame;
        data.domCanvas.img.source.frameY = 3 + data.panicFrame;
      }
    } else {
      // "range" of rotation
      data.angle =
        -data.swing + data.swing * 2 * data.stepFrames[data.stepFrame];

      data.stepFrame += data.stepFrameIncrement;

      if (data.stepFrame >= data.stepFrames.length - 1) {
        data.stepFrameIncrement *= -1;
      } else if (data.stepFrame === 0) {
        data.stepFrameIncrement *= -1;
      }

      // (potentially) gone with the wind.
      if (data.frameCount % data.windModulus === 0) {
        // choose a random direction?
        if (rng(1, data.type) > 0.5) {
          // -1, 0, 1
          randomWind = rngInt(3, data.type) - 1;

          data.vX = randomWind * 0.25 * GAME_SPEED_RATIOED;

          if (randomWind === -1) {
            // moving left
            bgY = 1;
          } else if (randomWind === 1) {
            // moving right
            bgY = 2;
          } else {
            // not moving!
            bgY = 0;
          }

          data.domCanvas.img.source.frameY = bgY;
          // choose a new wind modulus, too.
          data.windModulus = 64 + rndInt(64);
        } else {
          // reset wind effect

          data.vX = 0;

          data.domCanvas.img.source.frameY = 0;
        }
      }
    }

    if (data.parachuteOpen && data.y >= data.maxYParachute) {
      data.landed = true;

      // touchdown! die "quietly", and transition into new infantry.
      // in the network case, this will kill the remote.
      die({ silent: true });

      const params = {
        x: data.x,
        isEnemy: data.isEnemy,
        // exclude from recycle "refund" / reward case
        unassisted: false
      };

      game.addObject(TYPES.infantry, params);
    } else if (!data.parachuteOpen) {
      if (data.y > data.maxYPanic / 2 && !data.didScream) {
        if (gamePrefs.bnb) {
          if (data.isEnemy) {
            playSound(sounds.bnb.dvdPrincipalScream, exports);
          } else {
            playSound(sounds.bnb.screamPlusSit, exports, {
              onplay: (sound) => {
                // too late if off-screen, parachute open, dead, or landed (in which case, died silently)
                if (
                  !data.isOnScreen ||
                  data.parachuteOpen ||
                  data.landed ||
                  data.dead
                ) {
                  skipSound(sound);
                }
              }
            });
          }
        } else {
          playSound(sounds.scream, exports);
        }

        data.didScream = true;
      }

      if (data.y >= data.maxY) {
        // hit ground, and no parachute. gravity is a cruel mistress.

        // special case: mark the "occasion."
        data.didHitGround = true;

        // reposition, first
        sprites.moveTo(exports, data.x, data.maxY);

        // balloon-on-skin "splat" sound
        if (sounds.splat) {
          playSound(sounds.splat, exports);
        }

        die();
      }
    }

    data.frameCount++;
  }

  function getSpriteURL() {
    const parts = [];

    // infantry / engineer
    parts.push('parachute-infantry');

    if (data.isEnemy) parts.push('enemy');

    return `${parts.join('-')}.png`;
  }

  function initDOM() {
    dom.o = {};
    sprites.moveTo(exports);
  }

  function checkSmartMissileDecoy() {
    // given the current helicopter, find missiles targeting it and possibly distract them.

    game.objects[TYPES.smartMissile].forEach((missile) =>
      missile.maybeTargetDecoy(exports)
    );
  }

  function initParachuteInfantry() {
    initDOM();

    radarItem = game.objects.radar.addItem(exports);

    checkSmartMissileDecoy();
  }

  function dropOff(x) {
    // x from 0 to 1 returns from 1 to 0, with in-out easing.
    // https://stackoverflow.com/questions/30007853/simple-easing-function-in-javascript/30007935#30007935
    // Wolfram alpha graph: http://www.wolframalpha.com/input/?i=plot%20%28cos%28pi*x%29%20%2B%201%29%20%2F%202%20for%20x%20in%20%280%2C1%29
    return (Math.cos(Math.PI * x) + 1) / 2;
  }

  function makeStepFrames(duration = 1.75, reverse) {
    // NOTE: duration parameter added, here.
    duration = FPS * duration * (1 / GAME_SPEED);
    data.stepFrames = [];

    for (let i = 0; i <= duration; i++) {
      // 1/x, up to 1
      data.stepFrames[i] = dropOff(i / duration);
    }
    if (reverse) {
      data.stepFrames.reverse();
    }
    data.stepFrame = 0;
    data.stepActive = true;
  }

  let type = TYPES.parachuteInfantry;

  data = common.inheritData(
    {
      type,
      frameCount: rngInt(3, type),
      angle: 0,
      swing: 17.5,
      stepFrames: [],
      stepFrame: 0,
      stepFrameIncrement: 1,
      panicModulus: 3,
      windModulus: options.windModulus || 32 + rngInt(32, type),
      panicFrame: rngInt(3, type),
      energy: 2,
      energyMax: 2,
      parachuteOpen: false,
      // "most of the time", a parachute will open. no idea what the original game did. 10% failure rate.
      parachuteOpensAtY:
        options.parachuteOpensAtY ||
        options.y +
          rng(370 - options.y, type) +
          (!tutorialMode && rng(1, type) > 0.9 ? 999 : 0),
      direction: 0,
      width: 10,
      halfWidth: 5,
      height: 11, // 19 when parachute opens
      halfHeight: 5.5,
      frameHeight: 20, // each sprite frame
      ignoreShrapnel: options.ignoreShrapnel || false,
      didScream: false,
      didHitGround: false,
      landed: false,
      vX: 0, // wind
      vY: options.vY || 2 + rng(1, type) + rng(1, type),
      maxY: worldHeight + 3,
      maxYPanic: 300,
      maxYParachute: worldHeight - 13
    },
    options
  );

  // note: duration param.
  makeStepFrames(1);

  // animation "half-way"
  data.stepFrame = Math.floor(data.stepFrames.length / 2);

  // reverse animation
  if (rng(1, data.type) >= 0.5) {
    data.stepFrameIncrement *= -1;
  }

  const spriteWidth = 28;
  const spriteHeight = 200;
  const frameHeight = 40;

  data.domCanvas = {
    img: {
      src: utils.image.getImageObject(getSpriteURL()),
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
        frameY: 3
      },
      target: {
        width: spriteWidth / 2,
        height: frameHeight / 2,
        useDataAngle: true
      }
    },
    radarItem: {
      width: 1.25,
      height: 2.5,
      parachuteOpen: {
        width: 2.5,
        height: 2.25
      },
      draw: (ctx, obj, pos, width, height) => {
        const scaledWidth = pos.width(
          data.parachuteOpen
            ? data.domCanvas.radarItem.parachuteOpen.width
            : width
        );
        const scaledHeight = pos.heightNoStroke(
          data.parachuteOpen
            ? data.domCanvas.radarItem.parachuteOpen.height
            : height
        );
        const left = pos.left(obj.data.left) - scaledWidth / 2;
        const top = obj.data.top - scaledHeight / 2;

        ctx.roundRect(left, top, scaledWidth, scaledHeight, [
          scaledHeight,
          scaledHeight,
          0,
          0
        ]);
      }
    }
  };

  dom = {
    o: null,
    oTransformSprite: null
  };

  exports = {
    animate,
    data,
    dom,
    die,
    hit,
    init: initParachuteInfantry,
    radarItem
  };

  return exports;
};

export { ParachuteInfantry };
