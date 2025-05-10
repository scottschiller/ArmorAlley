import { FPS, GAME_SPEED, oneOf, rng, worldHeight } from '../core/global.js';
import { game, getObjectById } from '../core/Game.js';
import { domFettiBoom } from '../UI/DomFetti.js';
import { gamePrefs } from '../UI/preferences.js';
import { rnd, rndInt, plusMinus, rad2Deg, TYPES } from '../core/global.js';
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
  smokeRing: (objectID, smokeOptions) => {
    let item = getObjectById(objectID);

    // don't create if not visible
    if (!item?.data?.isOnScreen) return;

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
    if (!exports || !exports.data) return;

    // 60fps: only run every fourth frame of animation by object, or game if unspecified.
    if (
      FPS === 60 &&
      (exports?.data?.frameCount || game.objects.gameLoop.data.frameCount) %
        4 !==
        0
    )
      return;

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
      oParent: data.id
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
        inertColor: options.inertColor,
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

  domFetti: (sourceID, targetID) => {
    if (!gamePrefs.domfetti) return;

    let source = getObjectById(sourceID);

    let sData = source?.data;

    if (!sData) {
      console.warn('domFetti: no target data?', targetID);
      return;
    }

    // target needs to be on-screen, or "nearby"
    if (!sData.isOnScreen && game.players.local) {
      // ignore if too far away
      if (
        Math.abs(game.players.local.data.x - sData.x) >
        game.objects.view.data.browser.twoThirdsWidth
      )
        return;
    }

    let widthOffset, heightOffset;

    // hackish: for bomb explosions

    if (sData.explosionWidth && sData.bottomAlign) {
      widthOffset = sData.explosionWidth / 2;
      heightOffset = sData.explosionHeight;
    } else {
      widthOffset = sData.halfWidth || 0;
      heightOffset = sData.halfHeight || 0;
    }

    const x = sData.x + widthOffset;
    const y = sData.y + heightOffset;

    game.objects.domFetti.push(domFettiBoom(sourceID, targetID, x, y));
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

    explosionVelocityMax = 5;

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

      // let parent velocities influence this, somewhat.
      localOptions.vX += parentVX / 4;
      localOptions.vY += parentVY / 8;

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
      isOnScreen: exports.data.isOnScreen
    };

    const localExports = {
      data,
      domCanvas: {
        explosion: null,
        img: null
      }
    };

    const explosion = canvasExplosion(localExports);

    localExports.domCanvas.explosion = explosion;

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
      parent: data.id,
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

  refreshScanDistanceScale: (data) => {
    if (!data) return;

    /**
     * Game not started / level preview: scan nodes always @ 1X.
     */
    if (!game.data.started) {
      data.scanDistanceScale = 1;
      return;
    }

    if (data.dead) {
      // collapse, fairly quickly.
      data.scanDistanceScale = Math.max(
        0,
        data.scanDistanceScale - (1.5 / FPS) * GAME_SPEED
      );
    } else {
      // expand while being "summoned" - or if a turret, when restored.
      if (data.stepOffset === undefined) {
        if (data.scanDistanceScale < 1) {
          data.scanDistanceScale = Math.min(
            1,
            (data.scanDistanceScale || 0) + (0.5 / FPS) * GAME_SPEED
          );
        }
      } else {
        data.scanDistanceScale = Math.max(0, Math.min(data.stepOffset || 0, 1));
      }
    }
  },

  canShowScanNode: (data, scanType = 'battlefield') => {
    // don't filter if sides not known / in preview mode.
    if (!game.data.started) return true;

    // guard
    if (!data) return;

    // hackish: which set of prefs to check.
    let friendly = `scan_ui_${scanType}_friendly`;
    let enemy = `scan_ui_${scanType}_enemy`;

    // don't show if disabled by prefs and sides known.
    let isFriendly = data.isEnemy === game.players?.local?.data?.isEnemy;
    if (
      (isFriendly && !gamePrefs[friendly]) ||
      (!isFriendly && !gamePrefs[enemy])
    )
      return;

    // finally, OK.
    return true;
  },

  drawScanNode: (exports) => {
    // as seen on turrets and missile launchers
    if (!exports.data.isOnScreen) return;

    let { data } = exports;

    // don't show if disabled by prefs and sides known.
    if (!effects.canShowScanNode(data, 'battlefield')) return;

    let x = data.x + data.halfWidth;
    let y =
      data.y -
      data.height +
      (exports.data.type === TYPES.missileLauncher ? 3 : 0);

    let startX =
      (x - game.objects.view.data.battleField.scrollLeft) *
      game.objects.view.data.screenScale;

    let startY = y * game.objects.view.data.screenScale;

    // ensure "cache" is not used while scaling.
    if (gamePrefs.radar_enhanced_fx && data.scanDistanceScale < 1) {
      exports.radialGradient = null;
    }

    effects.refreshScanDistanceScale(data);

    let radius =
      data.scanDistance *
      data.scanDistanceScale *
      game.objects.view.data.screenScale;

    // guard
    if (radius <= 0) {
      data.scanDistanceScale = 0;
      return;
    }

    common.domCanvas.dom.ctx.battlefield.beginPath();

    common.domCanvas.dom.ctx.battlefield.arc(
      startX,
      startY,
      radius,
      // clockwise semicircle
      Math.PI,
      0
    );

    // TODO: create one shared object between enemy + non-enemy, destroy on resize.
    // don't cache object(s) while summoning via `stepOffset`

    if (!gamePrefs.radar_enhanced_fx) {
      // simple fill

      common.domCanvas.dom.ctx.battlefield.fillStyle = data.isEnemy
        ? 'rgba(255, 255, 255, 0.015)'
        : 'rgba(0, 255, 0, 0.015)';

      common.domCanvas.dom.ctx.battlefield.fill();
    } else {
      // only use "cache" if full-size / scale; otherwise, draw every frame.

      if (!exports.radialGradient) {
        // gradient fill
        let fill = `rgba(${data.isEnemy ? '255, 255, 255, 0.08' : '0, 255, 0, 0.08'})`;

        let c = document.createElement('canvas');

        c.width = radius * 2;
        c.height = radius;

        // guard: don't render empty canvas (while summoning)
        if (c.width < 1 || c.height < 1) return;

        let ctx = c.getContext('2d', { alpha: true });

        let radialGradient = ctx.createRadialGradient(
          // x1, y1, r1, x2, y2, r2
          // first circle: center / bottom, no circle
          radius,
          radius,
          radius * 0,
          // second circle: center / bottom, full size
          radius,
          radius,
          radius
        );

        radialGradient.addColorStop(0, transparent);
        radialGradient.addColorStop(0.9, transparent);
        radialGradient.addColorStop(0.999, fill);
        radialGradient.addColorStop(1, transparent);

        ctx.fillStyle = radialGradient;
        ctx.fillRect(0, 0, radius * 2, radius);

        exports.radialGradient = c;
      }

      // gradient vs. simple fill
      common.domCanvas.dom.ctx.battlefield.drawImage(
        exports.radialGradient,
        startX - radius,
        startY - radius
      );
    }

    // slightly-reduced stroke opacity for enhanced FX
    common.domCanvas.dom.ctx.battlefield.strokeStyle = `rgba(${data.isEnemy ? '255, 255, 255' : '0, 255, 0'}, ${gamePrefs.radar_enhanced_fx ? 0.1 : 0.2})`;

    common.domCanvas.dom.ctx.battlefield.stroke();
  },

  battlefieldNoise: () => {
    /**
     * Battlefield noise overlay bits
     * Hat tip: https://codepen.io/zadvorsky/pen/PwyoMm
     */

    if (!gamePrefs.radar_enhanced_fx) return;

    if (
      game.data.started &&
      common.domCanvas.dom?.o?.battlefield &&
      game.objects.radar.data.isJammed
    ) {
      // first-time create
      if (!patternCanvas) {
        patternCanvas = document.createElement('canvas');
        patternCanvas.width = patternSize;
        patternCanvas.height = patternSize;
        patternCtx = patternCanvas.getContext('2d', { alpha: true });
        patternData = patternCtx.createImageData(patternSize, patternSize);
      }

      // draw new noise, updating 30 times per second
      if (FPS === 30 || game.objects.gameLoop.data.frameCount % 2 === 0) {
        var value;

        for (var i = 0; i < patternPixelDataLength; i += 4) {
          // note: not full brightness e.g., 255
          value = (Math.random() * 160) | 0;

          patternData.data[i] = value;
          patternData.data[i + 1] = value;
          patternData.data[i + 2] = value;
          // only show a fraction of noise
          patternData.data[i + 3] = Math.random() > 0.25 ? patternAlpha : 0;
        }

        patternCtx.putImageData(patternData, 0, 0);
      }

      common.domCanvas.dom.ctx.battlefield.fillStyle =
        common.domCanvas.dom.ctx.battlefield.createPattern(
          patternCanvas,
          'repeat'
        );

      // only draw on existing content - i.e., not on empty battlefield space
      common.domCanvas.dom.ctx.battlefield.globalCompositeOperation =
        'source-atop';

      common.domCanvas.dom.ctx.battlefield.fillRect(
        0,
        0,
        common.domCanvas.data.canvasLayout.battlefield.width,
        common.domCanvas.data.canvasLayout.battlefield.height
      );

      // restore the default composite mode.
      common.domCanvas.dom.ctx.battlefield.globalCompositeOperation =
        'source-over';
    }
  },

  makeCanvasNoise,

  updateNoiseOverlay: (enabled) => {
    const o = document.getElementById('world-noise-overlay');
    const oNoise = o.querySelector('.noise');

    if (!o?.style || !oNoise?.style) return;

    if (!enabled) {
      if (noiseOverlay) {
        noiseOverlay.canvas = null;
        noiseOverlay = null;
      }
      // reset to default CSS value, empty GIF
      oNoise.style.setProperty('--noise-url', '');
      return;
    }

    noiseOverlay = makeCanvasNoise(createCanvas(256, 256));
    noiseOverlay.animate();

    oNoise.style.setProperty(
      '--noise-url',
      `url(${noiseOverlay.canvas.toDataURL('image/png')})`
    );
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
    },
    target: {
      opacity: 1
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

function makeCanvasNoise(c) {
  let alpha = true;

  /**
   * Hat tip:
   * https://stackoverflow.com/a/22003901
   */
  let w = c.width;
  let h = c.height;

  let bufferCanvas = document.createElement('canvas');

  // buffer 200%, give room for "random movement."
  bufferCanvas.width = w * 2;
  bufferCanvas.height = h * 2;

  let bufferCtx = bufferCanvas.getContext('2d', { alpha });

  let idata = bufferCtx.createImageData(
    bufferCanvas.width,
    bufferCanvas.height
  );

  let buffer32 = new Uint32Array(idata.data.buffer);

  let len = buffer32.length - 1;

  while (len--) {
    buffer32[len] = Math.random() < 0.5 ? 0 : -1 >> 0;
  }

  // write to buffer
  bufferCtx.putImageData(idata, 0, 0);

  let ctx = c.getContext('2d', { alpha });

  function animate() {
    // force integer values
    let x = (w * Math.random()) | 0;
    let y = (h * Math.random()) | 0;

    // draw noise from buffer with random offset
    ctx.drawImage(bufferCanvas, -x, -y);
  }

  return {
    canvas: c,
    animate
  };
}

function createCanvas(width, height) {
  let c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

let noiseOverlay;

// battlefield noise bits
var patternSize = 64,
  patternAlpha = 72; // 0-255

var patternPixelDataLength = patternSize * patternSize * 4,
  patternCanvas,
  patternCtx,
  patternData;

// for scan node gradients
let transparent = 'rgba(0, 0, 0, 0)';

export { effects };
