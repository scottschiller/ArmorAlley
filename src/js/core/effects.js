import { FPS, oneOf, rng, worldHeight } from '../core/global.js';
import { game } from '../core/Game.js';
import { domFettiBoom } from '../UI/DomFetti.js';
import { gamePrefs } from '../UI/preferences.js';
import { rnd, rndInt, plusMinus, rad2Deg, TYPES } from '../core/global.js';
import { Smoke } from '../elements/Smoke.js';
import { GunFire } from '../munitions/GunFire.js';
import { common } from './common.js';
import { snowStorm } from '../lib/snowstorm.js';
import { utils } from './utils.js';

let shrapnelToAdd = [];
const MAX_SHRAPNEL_PER_FRAME = 128;

function nextShrapnel() {
  if (!shrapnelToAdd.length) return;

  // no more than X at a time
  const max = Math.min(shrapnelToAdd.length, MAX_SHRAPNEL_PER_FRAME);

  let options;

  for (var i = 0; i < max; i++) {
    options = shrapnelToAdd.shift();
    game.addObject(TYPES.shrapnel, options);
  }
}

function genericExplosion(exports, sprites, options = {}) {
  if (!exports?.data) return;

  const sprite = oneOf(sprites);

  const { data } = exports;

  // potentially dangerous: mutate the object being passed in.
  data.shadowBlur = 8;
  data.shadowColor = '#ff3333';

  return common.domCanvas.canvasAnimation(exports, {
    sprite,
    yOffset: exports.data.bottomAligned
      ? 0
      : Math.abs(sprite.frameHeight - data.height) * -0.5,
    // allow for overrides, of course.
    isSequence: true,
    ...options
  });
}

function canvasExplosion(exports, options = {}) {
  // vertical sprites
  const sprites = [
    {
      url: 'generic-explosion-2_#.png',
      width: 110,
      height: 180,
      frameWidth: 110,
      frameHeight: 36,
      hideAtEnd: true,
      animationFrameCount: 5
    },
    {
      url: 'generic-explosion_#.png',
      width: 110,
      height: 180,
      frameWidth: 110,
      frameHeight: 36,
      hideAtEnd: true,
      animationFrameCount: 5
    }
  ];

  return genericExplosion(exports, sprites, options);
}

const effects = {
  animate: nextShrapnel,
  smokeRing: (item, smokeOptions) => {
    // don't create if not visible
    if (!item.data.isOnScreen) return;

    smokeOptions = smokeOptions || {};

    let angle,
      smokeArgs,
      angleIncrement,
      count,
      i,
      radians,
      velocityMax,
      vX,
      vY,
      vectorX,
      vectorY;

    angle = 0;

    // some sort of min / max
    velocityMax = smokeOptions.velocityMax || 3 + rnd(4);

    // # of smoke elements
    count = parseInt(
      (smokeOptions.count ? smokeOptions.count / 2 : 5) +
        rndInt(smokeOptions.count || 11),
      10
    );

    angleIncrement = 180 / count;

    // random: 50% to 100% of range
    vX = vY = velocityMax / 2 + rnd(velocityMax / 2);

    for (i = 0; i < count; i++) {
      angle += angleIncrement + plusMinus(rnd(angleIncrement * 0.25));

      // calculate vectors for each element
      radians = (angle * Math.PI) / 90;

      vectorX = vX * Math.cos(radians);
      vectorY = vY * Math.sin(radians);

      // ground-based object, e.g., base? explode "up", and don't mirror the upper half.
      if (vectorY > 0 && smokeOptions.isGroundUnit) {
        vectorY *= -0.33;
        vectorX *= 0.33;
      }

      smokeArgs = {
        // fixedSpeed: true, // don't randomize vX / vY each time
        x:
          item.data.x + (smokeOptions.offsetX || 0 || item.data.halfWidth || 0),
        y:
          item.data.y +
          (smokeOptions.offsetY || 0 || item.data.halfHeight || 0),
        // account for some of parent object's motion, e.g., helicopter was moving when it blew up
        vX: (vectorX + (smokeOptions.parentVX || 0) / 3) * (1 + rnd(0.25)),
        vY: (vectorY + (smokeOptions.parentVY || 0) / 3) * (1 + rnd(0.25)),
        // spriteFrame: (Math.random() > 0.5 ? 0 : rndInt(5)),
        spriteFrameModulus: smokeOptions.spriteFrameModulus || 3,
        gravity: 0.25,
        deceleration: 0.98,
        increaseDeceleration: 0.9985
      };

      game.addObject(TYPES.smoke, smokeArgs);

      // past a certain amount, create inner "rings"
      if (count >= 20 || velocityMax > 15) {
        // second inner ring
        if (i % 2 === 0) {
          game.addObject(
            TYPES.smoke,
            common.mixin(smokeArgs, {
              vX: vectorX * 0.75,
              vY: vectorY * 0.75
            })
          );
        }
        // third inner ring
        if (i % 3 === 0) {
          game.addObject(
            TYPES.smoke,
            common.mixin(smokeArgs, {
              vX: vectorX * 0.66,
              vY: vectorY * 0.66
            })
          );
        }

        // fourth inner ring
        if (i % 4 === 0) {
          game.addObject(
            TYPES.smoke,
            common.mixin(smokeArgs, { vX: vectorX * 0.5, vY: vectorY * 0.5 })
          );
        }
      }
    }
  },

  smokeRelativeToDamage: (
    exports,
    chance = 1 - exports?.data?.energy / exports?.data?.energyMax
  ) => {
    if (!exports || !exports.data || !exports.dom) return;

    // 60fps: only run every other frame.
    if (FPS === 60 && game.objects.gameLoop.data.frameCount % 2 !== 0) return;

    const { data } = exports;

    // no damage = no smoke.
    if (exports.data.energy === exports.data.energyMax) return;

    // don't show if not in view, AND no "smoke on radar."
    if (!data.isOnScreen && !gamePrefs.radar_enhanced_fx) return;

    // first off: certain chance of no smoke, regardless of status
    if (Math.random() >= 0.66) return;

    // a proper roll of the dice: smoke at random. higher damage = greater chance of smoke
    if (Math.random() < 1 - (data.energyMax - data.energy) / data.energyMax)
      return;

    const isBunker = data.type === TYPES.bunker;
    const isTurret = data.type === TYPES.turret;

    // reduce certain structures' chance of smoke, as they smoke too much when damaged a lot.
    if ((isBunker || isTurret) && Math.random() <= 0.25) return;

    // bunkers can smoke across the whole thing
    const fractionWidth = isBunker ? data.halfWidth : data.halfWidth * 0.5;

    // TODO: clean this up. yuck.
    game.addObject(TYPES.smoke, {
      x: data.x + data.halfWidth + plusMinus(rnd(fractionWidth)),
      y:
        data.y +
        (data.type !== TYPES.helicopter &&
        data.type !== TYPES.balloon &&
        (!data.bottomAligned || data.type === TYPES.bunker)
          ? data.halfHeight
          : 0) +
        rnd(data.halfHeight) *
          (data.type === TYPES.balloon ? 0 : isBunker ? 0.5 : 0.25) *
          (data.vY <= 0 ? -1 : 1),
      // if undefined or zero, allow smoke to go left or right
      // special handling for helicopters and turrets. this should be moved into config options.
      vX:
        data.type === TYPES.helicopter
          ? rnd(1.5) * plusMinus()
          : isBunker || isTurret
            ? plusMinus(0.5 * chance)
            : -(data.vX || 0) +
              rnd(1.5) *
                (data.vX === undefined || data.vX === 0 ? plusMinus() : 1),
      vY:
        isBunker || isTurret
          ? -rnd(6 * Math.max(0.33, chance))
          : data.type === TYPES.helicopter
            ? -rnd(3 * chance)
            : -(data.vY || 0.25) + rnd(-2),
      // show smoke on battlefield, but not on radar when cloaked.
      parentWasCloaked: data.type === TYPES.helicopter && data.cloaked,
      oParent: exports
    });
  },

  inertGunfireExplosion: (options = {}) => {
    if (!options?.exports?.data) return;

    const { data } = options.exports;

    if (!data.isOnScreen) return;

    const className = options.className || '';
    const vX = options.vX || 1.5 + rnd(1);
    const vY = options.vY || 1.5 + rnd(1);
    let gunfire;

    // create some inert (harmless) gunfire, as decorative shrapnel.
    for (let i = 0, j = options.count || 3 + rndInt(2); i < j; i++) {
      gunfire = GunFire({
        className,
        parentType: data.type,
        isInert: true,
        // empty array may prevent collision, but `isInert` is provided explicitly for this purpose
        collisionItems: [],
        x: data.x + (data.halfWidth || 0),
        y: data.y,
        // if there are more "particles", allow them to move further.
        vX: rnd(vX) * plusMinus() * (j > 4 ? rnd(j / 2) : 1),
        vY: -rnd(Math.abs(vY)) * (j > 4 ? rnd(j / 2) : 1)
      });

      gunfire.init();

      game.objects.gunfire.push(gunfire);
    }
  },

  domFetti: (exports = {}, target = {}) => {
    if (!gamePrefs.domfetti) return;

    // target needs to be on-screen, or "nearby"

    const eData = exports.data;

    if (!eData.isOnScreen && game.players.local) {
      // ignore if too far away
      if (
        Math.abs(game.players.local.data.x - eData.x) >
        game.objects.view.data.browser.twoThirdsWidth
      )
        return;
    }

    let widthOffset, heightOffset;

    // hackish: for bomb explosions

    if (eData.explosionWidth && eData.bottomAlign) {
      widthOffset = eData.explosionWidth / 2;
      heightOffset = eData.explosionHeight;
    } else {
      widthOffset = eData.halfWidth || 0;
      heightOffset = eData.halfHeight || 0;
    }

    const x = eData.x + widthOffset;
    const y = eData.y + heightOffset;

    game.objects.domFetti.push(domFettiBoom(exports, target, x, y));
  },

  shrapnelExplosion: (options = {}, shrapnelOptions = {}) => {
    let localOptions, halfWidth;

    let vX,
      vY,
      vectorX,
      vectorY,
      i,
      angle,
      shrapnelCount,
      angleIncrement,
      explosionVelocity1,
      explosionVelocity2,
      explosionVelocityMax;

    // important: make sure we delete the parent object's unique ID.
    localOptions = { ...options };
    delete localOptions.id;

    halfWidth = localOptions.width / 2;

    // randomize X?
    if (shrapnelOptions.centerX) {
      localOptions.x += halfWidth;
    } else {
      localOptions.x += rng(localOptions.width * 0.75, TYPES.shrapnel);
    }

    // silly, but copy right over.
    if (shrapnelOptions.noInitialSmoke) {
      localOptions.noInitialSmoke = shrapnelOptions.noInitialSmoke;
    }

    const parentVX = (options.parentVX || 0) + (shrapnelOptions.parentVX || 0);
    const parentVY = (options.parentVY || 0) + (shrapnelOptions.parentVY || 0);

    // note: "in addition to" velocity option.
    vX =
      (options.velocity || 0) +
      (shrapnelOptions.velocity || 0) +
      (shrapnelOptions.vX || 0);
    vY =
      (options.velocity || 0) +
      (shrapnelOptions.velocity || 0) +
      (shrapnelOptions.vY || 0);

    angle = 0;

    // TODO: revisit
    explosionVelocityMax = 4.75;

    shrapnelCount = shrapnelOptions.count || 8;

    angleIncrement = 180 / (shrapnelCount - 1);

    for (i = 0; i < shrapnelCount; i++) {
      explosionVelocity1 = rng(explosionVelocityMax + vX, TYPES.shrapnel);
      explosionVelocity2 = rng(explosionVelocityMax + vY, TYPES.shrapnel);

      vectorX = -explosionVelocity1 * Math.cos(angle * rad2Deg);
      vectorY = -explosionVelocity2 * Math.sin(angle * rad2Deg);

      localOptions.vX = localOptions.vX * 0.5 + vectorX;
      localOptions.vY += vectorY;

      // bottom-aligned object? explode "up".
      if (
        localOptions.vY > 0 &&
        (options.bottomAligned || shrapnelOptions.bottomAligned)
      ) {
        localOptions.vY = Math.abs(localOptions.vY) * -1;
      }

      // include parent velocity, too.
      localOptions.vX += parentVX / 8;
      localOptions.vY += parentVY / 10;

      // have first and last make noise
      localOptions.hasSound =
        i === 0 || (shrapnelCount > 4 && i === shrapnelCount - 1);

      shrapnelToAdd.push({ ...localOptions });

      angle += angleIncrement;
    }
  },

  genericExplosion: (exports) => {
    // given an object, create a visible explosion animation - and maybe do damage.
    // center the explosion based on the coordinates of the original.

    const data = {
      // Note: x/y/w/h will be updated below.
      x: exports.data.x,
      y: exports.data.y,
      width: exports.data.width,
      height: exports.data.height,
      bottomAligned: exports.data.bottomAligned,
      alwaysDraw: true,
      isOnScreen: exports.data.isOnScreen,
      domCanvas: {
        explosion: null,
        img: null
      }
    };

    const localExports = {
      data
    };

    const explosion = canvasExplosion(localExports);

    data.domCanvas.explosion = explosion;

    // center based on explosion width
    // note: sprites are 2x, so half the frame width is used for centering.
    data.x -= (explosion.sprite.frameWidth / 2 - data.width) / 2;
    data.width = explosion.sprite.frameWidth;

    data.height = explosion.sprite.frameHeight;
    data.y = data.bottomAligned
      ? 369 - data.height
      : data.y + explosion.sprite.frameHeight / 4;

    function animate() {
      explosion?.animate();
      common.domCanvas.draw(localExports);
    }

    return {
      animate
    };
  },

  bombExplosion: (exports, options = {}) => {
    const sprites = [
      {
        url: 'explosion-large_#.png',
        width: 102,
        height: 220,
        frameWidth: 102,
        frameHeight: 44,
        hideAtEnd: true
      },
      {
        url: 'explosion-large-2_#.png',
        width: 102,
        height: 220,
        frameWidth: 102,
        frameHeight: 44,
        hideAtEnd: true
      }
    ];

    return genericExplosion(exports, sprites, options);
  },

  damageExplosion: (exports) => {
    // given an object, create a bomb explosion there and make it dangerous to the object.
    // this rewards the player for - e.g., blowing up a bunker while a tank is passing by.

    const { data } = exports;

    if (!data) return;

    // special case: bunkers blow up "big" and will destroy any ground unit in one hit.
    const damagePoints = data.type === TYPES.bunker ? 10 : undefined;

    game.addObject(TYPES.bomb, {
      parent: exports,
      parentType: data.type,
      damagePoints,
      hidden: true,
      isEnemy: !data.isEnemy,
      x: data.x + data.halfWidth,
      y: worldHeight - 1,
      vX: 0,
      vY: 1
    });
  },

  spark: () => ({
    src: utils.image.getImageObject(
      oneOf(['explosion-spark.png', 'explosion-spark-2.png'])
    ),
    source: {
      width: 5,
      height: 5,
      spriteWidth: 5,
      spriteHeight: 5,
      frameWidth: 5,
      frameHeight: 5,
      frameX: 0,
      frameY: 0
    }
  }),

  updateStormStyle: (style) => {
    if (!snowStorm) return;

    const defaultChar = '&bull;';

    let char = snowStorm.snowCharacter;

    // by default ...
    snowStorm.snowStick = false;

    if (style === 'rain') {
      char = '/';
      snowStorm.flakesMax = 256;
      snowStorm.flakesMaxActive = 256;
      snowStorm.vMaxX = 1;
      snowStorm.vMinY = 8;
      snowStorm.vMaxY = 20;
    } else if (style === 'hail') {
      char = '*';
      snowStorm.flakesMax = 128;
      snowStorm.flakesMaxActive = 128;
      // snowStorm.vMaxX = 1;
      snowStorm.vMinY = 4;
      snowStorm.vMaxY = 10;
    } else if (style === 'turd') {
      char = '💩';
      snowStorm.flakesMax = 96;
      snowStorm.flakesMaxActive = 96;
      // snowStorm.vMaxX = 0;
      snowStorm.vMinY = 2;
      snowStorm.vMaxY = 5;
    } else if (!style) {
      // none
      snowStorm.flakesMax = 0;
      snowStorm.flakesMaxActive = 0;
    } else {
      // snow case
      char = defaultChar;

      snowStorm.flakesMax = 72;
      snowStorm.flakesMaxActive = 72;
      // snowStorm.vMaxX = 0;
      snowStorm.vMinY = 0.5;
      snowStorm.vMaxY = 2.5;
      snowStorm.snowStick = true;
    }

    // so all newly-created snow looks right...
    snowStorm.snowCharacter = char;

    // ensure we start, if we haven't yet.
    snowStorm.start();

    // simulate event w/last recorded one
    const source = game.isMobile
      ? game.objects?.joystick?.data?.lastMove
      : game.objects?.view?.data?.mouse;

    if (!source) return;

    const { clientX, clientY } = source;

    snowStorm.mouseMove({ clientX, clientY });
  }
};

export { effects };
