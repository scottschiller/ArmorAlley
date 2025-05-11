import { game, getObjectById } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { gameType } from '../aa.js';
import {
  ENEMY_UNIT_COLOR,
  ENEMY_UNIT_COLOR_RGBA,
  FPS,
  GAME_SPEED_RATIOED,
  getTypes,
  noRadar,
  rad2Deg,
  rnd,
  rndInt,
  rngInt,
  soundManager,
  tutorialMode,
  TYPES,
  worldHeight
} from '../core/global.js';
import {
  playSound,
  stopSound,
  playSoundWithDelay,
  playRepairingWrench,
  playTinkerWrench,
  sounds,
  skipSound
} from '../core/sound.js';
import { common } from '../core/common.js';
import { enemyHelicopterNearby, enemyNearby } from '../core/logic.js';
import { gamePrefs } from '../UI/preferences.js';
import { zones } from '../core/zones.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';
import { Vector } from '../core/Vector.js';

const TURRET_SCAN_RADIUS = 340;

const src = 'turret-sprite.png';

const spriteWidth = 36;
const spriteHeight = 128;
const frameHeight = 32;

const Turret = (options = {}) => {
  let exports;

  let data, domCanvas, objects, height, radarItem;

  height = 15;

  let fireModulusMap = {
    armorgeddon: 1,
    extreme: 2,
    hard: 6,
    easy: 12,
    tutorial: 15
  };

  const fireModulus = fireModulusMap[gameType] || fireModulusMap.easy;

  const claimModulus = 16;

  // "duplicate" turrets are part of a "stack", i.e., there's another turret at the same location.
  // this is used sparingly in Midnight Oasis.
  let lastTurret = game.objects.turret[game.objects.turret.length - 1 || 0];
  let isDuplicate = options.x === lastTurret?.data?.x;

  const energy = 31;

  data = common.inheritData(
    {
      type: TYPES.turret,
      bottomAligned: true,
      dead: false,
      energy,
      energyMax: energy,
      energyTimerScale: 3,
      lastEnergy: energy,
      firing: false,
      fireCount: 0,
      frameCount: 3 * game.objects[TYPES.turret].length, // stagger so sound effects interleave nicely
      fireModulus,
      fireModulus1X: fireModulus,
      gameSpeedProps: ['claimModulus', 'fireModulus', 'repairModulus'],
      hasBeavis: false,
      hasButthead: false,
      isSinging: false,
      scanDistance: TURRET_SCAN_RADIUS,
      scanDistanceScale: 0,
      hasScanNode: true,
      claimModulus,
      claimModulus1X: claimModulus,
      repairModulus: FPS,
      repairModulus1X: FPS,
      restoring: false,
      shellCasingInterval: tutorialMode || gameType === 'easy' ? 1 : 2,
      claimPoints: 0,
      claimPointsMax: 25,
      engineerInteracting: false,
      engineerHitCount: 0,
      targetGroundUnits: !!options.targetGroundUnits,
      width: 10,
      logicalWidth: TURRET_SCAN_RADIUS,
      height,
      halfWidth: 5,
      halfHeight: height / 2,
      angle: 33 * (options.isEnemy ? -1 : 1) * (isDuplicate ? -1 : 1),
      maxAngle: 90,
      // ensure that "duplicate" turrets move a little faster, so they de-sync with their radar counterparts after firing at target(s).
      angleIncrement:
        (1.75 + (isDuplicate ? rnd(0.25) : 0)) *
        (options.isEnemy ? -1 : 1) *
        (isDuplicate ? -1 : 1),
      x: options.x || 0,
      y: game.objects.view.data.world.height - height - 2,
      // logical vs. sprite offset
      yOffset: 3,
      cornholioOffsetX: 12,
      bnbAnnounceText:
        Math.random() >= 0.5
          ? 'THE GREAT CORNHOLIO has been awakened. 👐'
          : 'THE ALMIGHTY BUNGHOLE has been summoned. 👐',
      domFetti: {
        colorType: 'grey',
        elementCount: 20 + rndInt(20),
        startVelocity: 8 + rndInt(8),
        spread: 90
      },
      timers: {}
    },
    options
  );

  // base of turret
  const turretBase = {
    src: utils.image.getImageObject(src),
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
  };

  const turretDead = {
    src: utils.image.getImageObject(src),
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
      height: frameHeight / 2
    }
  };

  // turret gun
  const turretGun = {
    src: utils.image.getImageObject(src),
    excludeEnergy: true,
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
      frameY: 1
    },
    target: {
      width: spriteWidth / 2,
      height: frameHeight / 2,
      yOffset: -3.5,
      // rotate based on turret data
      useDataAngle: true,
      // origin / axis of rotation relative to width/height
      rotateXOffset: 0.5,
      /* rotate origin is almost the bottom, but not exactly. */
      rotateYOffset: 0.95
    }
  };

  domCanvas = {
    img: [turretBase, turretGun],
    radarItem: Turret.radarItemConfig({ data })
  };

  objects = {
    cornholio: null
  };

  exports = {
    animate: () => animate(exports),
    bulletShellSound: () => bulletShellSound(exports),
    collisionItems: null,
    data,
    destroy: () => destroy(exports),
    die: (dieOptions) => die(exports, dieOptions),
    // hackish: see below.
    domCanvas,
    engineerCanInteract: (isEnemy) => engineerCanInteract(exports, isEnemy),
    engineerHit: (engineer) => engineerHit(exports, engineer),
    init: () => initTurret(exports, options),
    objects,
    radarItem,
    refreshCollisionItems: () => refreshCollisionItems(exports),
    resetDieExplosion: () => resetDieExplosion(exports),
    repair: (engineer, complete) => repair(exports, engineer, complete),
    resize: () => {
      // HACK: force redraw of radial gradient
      exports.radialGradient = null;
    },
    targets: null,
    turretBase,
    turretGun,
    turretDead,
    updateHealth: (attacker) => updateHealth(exports, attacker)
  };

  return exports;
};

Turret.radarItemConfig = ({ data }) => ({
  width: 1.5,
  height: 2.25,
  draw: (ctx, obj, pos, width, height) => {
    ctx.fillStyle = data?.dead
      ? data?.isEnemy
        ? ENEMY_UNIT_COLOR_RGBA
        : 'rgba(23, 160, 7, 0.25)'
      : data?.isEnemy
        ? ENEMY_UNIT_COLOR
        : '#17a007';

    const left = pos.left(obj.data.left);
    const scaledWidth = pos.width(width);
    const scaledHeight = pos.height(height);

    // base of turret
    ctx.arc(
      left + scaledWidth / 2,
      pos.bottomAlign(0),
      pos.width(1.15),
      Math.PI,
      0,
      false
    );

    ctx.fill();
    ctx.stroke();

    ctx.beginPath();

    // turret gun barrel
    const barrelWidth = scaledWidth * 0.7;
    const barrelHeight = scaledHeight * 0.8;

    common.domCanvas.rotate(
      ctx,
      data.angle,
      left + barrelWidth / 2,
      pos.bottomAlign(height),
      barrelWidth / 2,
      barrelHeight
    );

    ctx.roundRect(
      left + 1,
      pos.bottomAlign(height + 0.5),
      barrelWidth,
      barrelHeight,
      height
    );

    common.domCanvas.unrotate(ctx);

    ctx.fill();
    ctx.stroke();

    // TODO: effects.drawRadarScanNode() for turret and missile launcher.
    // TODO: cache and redraw on resize?

    if (!effects.canShowScanNode(data, 'radar')) return;

    /**
     * Relative to radar height, and scaled a bit.
     * TODO: review precise alignment w/helicopter etc.
     */
    let radius =
      (TURRET_SCAN_RADIUS / worldHeight) *
      (game.objects.radar.data.height * 1.15);

    ctx.beginPath();

    let alpha = 0.015;

    // TODO: review and use all theme colors consistently.
    ctx.fillStyle = data?.isEnemy
      ? gamePrefs?.radar_theme === 'red'
        ? ENEMY_UNIT_COLOR_RGBA
        : `rgba(255, 255, 255, ${alpha})`
      : `rgba(23, 160, 7, ${alpha})`;

    ctx.strokeStyle = data?.isEnemy
      ? gamePrefs?.radar_theme === 'red'
        ? ENEMY_UNIT_COLOR_RGBA
        : `rgba(255, 255, 255, ${alpha * 2})`
      : `rgba(23, 160, 7, ${alpha * 4})`;

    let startX = left + scaledWidth / 2;

    /**
     * NOTE: slight -ve offset to pull arcs down a bit, not quite
     * touching top of radar and still reasonable on X axis.
     */
    let startY = pos.bottomAlign(-1);

    // radar item is elliptical, not necessarily circular.
    let rotation = 0;

    /**
     * Relative scan node size...
     * Scan radius * radar scale (zoom), relative to screen and world.
     * (Note: browser.screenWidth, not browser.width.)
     */
    let radiusX =
      TURRET_SCAN_RADIUS *
      game.objects.radar.data.scale *
      (game.objects.view.data.browser.screenWidth / 8192);

    effects.refreshScanDistanceScale(data);

    // expand/collapse
    radiusX *= data.scanDistanceScale;
    radius *= data.scanDistanceScale;

    ctx.ellipse(startX, startY, radiusX, radius, rotation, Math.PI, 0);

    ctx.stroke();
  }
});

function okToMove(exports) {
  let { data } = exports;

  // guns scan and fire 100% of the time, OR a random percent bias based on the amount of damage they've sustained. No less than 25% of the time.

  if (data.energy === 0) return false;

  return (
    data.energy === data.energyMax ||
    1 - Math.random() < Math.max(0.25, data.energy / data.energyMax)
  );
}

function fire(exports) {
  let { collisionItems, data, targets } = exports;

  // don't fire at things while in the editor. :P
  if (game.objects.editor) return;

  let deltaX, deltaY, angle, otherTargets, target, moveOK;

  if (!data.targetGroundUnits) {
    target = getObjectById(
      enemyHelicopterNearby(data, data.scanDistance, data.hasScanNode)
    );
  }

  // alternate target(s) within range?
  if (!target && targets) {
    otherTargets = enemyNearby(data, targets, data.scanDistance);

    if (otherTargets.length) {
      // take first target as closest?
      // TODO: sort by closest distance?
      target = otherTargets[0];
    }
  }

  // target has been lost (or died, etc.)
  if (!target && data.firing) {
    setFiring(exports, false);
  }

  if (!target) {
    if (okToMove(exports)) {
      // "scanning" animation.
      data.angle += data.angleIncrement * GAME_SPEED_RATIOED;
      if (Math.abs(data.angle) >= data.maxAngle) {
        data.angleIncrement *= -1;
      }
    }
    return;
  }

  // we have a live one.
  if (!data.firing) {
    setFiring(exports, true);
  }

  // midpoint of turret body
  const startX = data.x + data.halfWidth + 2.75;
  const startY = common.bottomAlignedY() + 12;

  deltaX = target.data.x - startX;
  deltaY = target.data.y - startY;

  // turret angle
  angle = Math.atan2(deltaY, deltaX) * rad2Deg + 90;

  const angleRad = (angle - 90) * 0.0175;

  moveOK = okToMove(exports);

  if (data.frameCount % data.fireModulus === 0 && moveOK) {
    data.fireCount++;

    let fireOffset = data.fireCount % 3;

    if (fireOffset !== 0) {
      // "spray" by offsetting target x/y a bit, two thirds of the time
      deltaX += target.data.vX << (fireOffset + 1);
      deltaY += target.data.vY << (fireOffset + 1);
    }

    let vX = deltaX;
    let vY = Math.min(0, deltaY);

    let hyp = Math.abs(Math.hypot(vX, vY));

    let vec = new Vector(vX, vY);

    // reasonable "distance to barrel velocity"
    vec.setMag(Math.min(32, hyp / 10));

    game.addObject(TYPES.gunfire, {
      parent: data.id,
      parentType: data.type,
      isEnemy: data.isEnemy,
      fixedXY: true,
      // turret gunfire mostly hits airborne things.
      collisionItems,
      // roughly align gunfire with tip of angled barrel
      x: startX + Math.cos(angleRad),
      y: startY + Math.sin(angleRad),
      vX: vec.x,
      vY: vec.y,
      // original game used 5, but we use a higher frame + firing rate.
      damagePoints: gameType === 'easy' ? 2 : 1
    });

    if (sounds.turretGunFire) {
      playSound(sounds.turretGunFire, exports);

      if (
        data.fireCount === 1 ||
        data.fireCount % data.shellCasingInterval === 0
      ) {
        // shell casing?
        data.timers[`bs${data.frameCount}`] = common.frameTimeout.set(
          'bulletShellSound',
          250 + rnd(250)
        );
      }
    }
  }

  // target the enemy
  data.angle = angle;
}

function bulletShellSound(exports) {
  playSound(sounds.bulletShellCasing, exports);
}

function setFiring(exports, isFiring) {
  let { data, objects } = exports;

  if (data.firing === isFiring) return;

  data.firing = isFiring;

  if (isFiring) {
    if (!data.isEnemy && gamePrefs.bnb && sounds.bnb.cornholioAttack) {
      // hackish: check that no other turrets are also firing, preventing overlap of this sound.
      let otherFriendlyTurretFiring = false;

      game.objects[TYPES.turret].forEach((turret) => {
        if (
          turret.data.firing &&
          turret.data.isEnemy === data.isEnemy &&
          turret.data.id !== data.id
        ) {
          otherFriendlyTurretFiring = true;
        }
      });

      if (!otherFriendlyTurretFiring && gamePrefs.bnb) {
        playSound(sounds.bnb.cornholioAttack, exports);
      }
    }
  } else {
    data.fireCount = 0;
  }

  if (!data.isEnemy) {
    getObjectById(objects.cornholio)?.setSpeaking(data.firing);
  }
}

function die(exports, dieOptions = {}) {
  let { data, domCanvas, objects } = exports;

  if (data.dead) return;

  // reset rotation
  data.angle = 0;

  data.energy = 0;
  data.restoring = false;
  data.dead = true;

  getObjectById(objects.cornholio)?.hide();

  // hackish: ensure firing is reset.
  setFiring(exports, false);

  updateDomCanvas(exports, {
    dead: true
  });

  if (!dieOptions.silent) {
    updateDomCanvas(exports, { dead: true });
    domCanvas.dieExplosion = effects.genericExplosion(exports);
  }

  // special case: when turret is initially rendered as dead, don't explode etc.
  if (!dieOptions.silent) {
    if (!data.isOnScreen) {
      if (data.isEnemy !== game.players.local.data.isEnemy) {
        game.objects.notifications.add('You disabled a turret 💥');
      } else {
        game.objects.notifications.add('The enemy disabled a turret 💥');
      }
    }

    if (gamePrefs.bnb) {
      if (!data.isEnemy) {
        playSoundWithDelay(
          sounds.bnb[game.isBeavis ? 'beavisLostUnit' : 'buttheadLostUnit']
        );
      } else {
        const oAttacker = getObjectById(dieOptions.attacker)?.data;

        if (oAttacker) {
          // infantry - specifically, dropped or released from helicopter
          const infantryAttacker =
            oAttacker?.parentType === TYPES.infantry &&
            getObjectById(oAttacker.parent)?.data?.unassisted === false;

          // likewise, from helicopter
          const smartMissileAttacker =
            oAttacker.type === TYPES.smartMissile &&
            oAttacker.parentType === TYPES.helicopter;

          // on-screen, or helicopter-initiated things
          if (
            gamePrefs.bnb &&
            (data.isOnScreen || infantryAttacker || smartMissileAttacker)
          ) {
            playSoundWithDelay(sounds.bnb.bungholeAndSimilar, exports, 750);
          }
        }
      }
    }

    data.timers.resetExplosion = common.frameTimeout.set(
      'resetDieExplosion',
      1500
    );

    effects.inertGunfireExplosion({ exports, count: 4 + rndInt(4) });

    effects.shrapnelExplosion(data, {
      count: 3 + rngInt(3, data.type),
      velocity: 2 + rngInt(2, data.type)
    });

    effects.damageExplosion(exports);

    effects.domFetti(data.id, dieOptions?.attacker);

    effects.smokeRing(data.id, { isGroundUnit: true });

    playSound(sounds.metalHitBreak, exports);
    playSound(sounds.genericExplosion, exports);
  }

  sprites.updateEnergy(data.id);

  common.onDie(data.id, dieOptions);
}

function resetDieExplosion(exports) {
  exports.domCanvas.dieExplosion = null;
}

function restore(exports) {
  let { data } = exports;

  // restore visual, but don't re-activate gun yet
  if (!data.dead && data.energy !== 0) return;

  // don't repeat if already underway
  if (data.restoring) return;

  data.restoring = true;
}

function isEngineerInteracting(exports) {
  let { data } = exports;

  return data.engineerInteracting && data.energy < data.energyMax;
}

function repair(exports, engineer, complete) {
  let { data, objects } = exports;

  let result = false;

  if (data.energy < data.energyMax) {
    if (data.frameCount % (data.repairModulus / 2) === 0 || complete) {
      sprites.updateEnergy(data.id);

      createSparks(exports, 3);

      restore(exports, engineer);

      data.lastEnergy = data.energy;

      data.energy = complete
        ? data.energyMax
        : Math.min(data.energyMax, data.energy + 0.5);

      if (data.dead && data.energy > data.energyMax * 0.25) {
        // restore to life at 25%
        data.dead = false;

        updateDomCanvas(exports, { dead: false });

        playSound(sounds.turretEnabled, exports);

        if (data.isEnemy === game.players.local.data.isEnemy) {
          game.objects.notifications.add('You re-enabled a turret 🎯');
        } else {
          game.objects.notifications.add('The enemy re-enabled a turret 🎯');
        }
      }

      // only when engineer is restoring a dead turret...
      if (
        gamePrefs.bnb &&
        !data.isEnemy &&
        data.engineerInteracting &&
        engineer?.data
      ) {
        if (data.restoring) {
          // only play / queue once
          if (!data.queuedSound) {
            data.queuedSound = true;

            playSound(sounds.bnb.cornholioRepair, exports, {
              onfinish: function () {
                soundManager.destroySound(this.id);
                // allow this to be played again
                data.queuedSound = false;
              }
            });
          }
        }
      }
    }

    result = true;
  } else if (data.lastEnergy !== data.energy) {
    // only stop sound once, when repair finishes
    if (sounds.tinkerWrench && sounds.tinkerWrench.sound) {
      stopSound(sounds.tinkerWrench);
    }

    if (data.restoring) {
      if (data.isEnemy !== game.players.local.data.isEnemy) {
        game.objects.notifications.add(
          'The enemy finished rebuilding a turret 🛠️'
        );
      } else {
        game.objects.notifications.add('You finished rebuilding a turret 🛠️');

        if (gamePrefs.bnb && sounds.bnb.cornholioAnnounce) {
          // skip existing, if any
          if (data.queuedSound?.sound) {
            skipSound(data.queuedSound.sound);
          }

          data.queuedSound = null;

          let cornholio = getObjectById(objects.cornholio);

          cornholio?.show();
          cornholio?.setSpeaking(true);

          if (!data.firing) {
            playSound(sounds.bnb.cornholioAnnounce, exports, {
              onplay: (sound) => {
                cornholio?.setActiveSound(sound);
                game.objects.notifications.add(data.bnbAnnounceText);
              },
              onfinish: () => {
                // stop speaking when "announcement" has finished, and not actively firing.
                cornholio?.setActiveSound(null, data.firing);
                cornholio?.setSpeaking(data.firing);
              }
            });
          } else {
            game.objects.notifications.add(data.bnbAnnounceText);
          }
        }
      }
    }

    data.lastEnergy = data.energy;

    // reset, since work is commplete
    data.restoring = false;

    data.hasBeavis = false;
    data.hasButthead = false;
    data.isSinging = false;
  }

  return result;
}

function updateHealth(exports /*, attacker*/) {
  let { data } = exports;

  // special case: beavis "reacts" to friendly cornholio turret hits.
  if (
    gamePrefs.bnb &&
    !data.lastReactionSound &&
    game.players.local.data.isEnemy === data.isEnemy
  ) {
    data.lastReactionSound = true;
    playSound(sounds.bnb.beavisScreamShort, exports, {
      onfinish: (sound) => {
        // only allow this every so often.
        common.setFixedFrameTimeout(() => {
          data.lastReactionSound = null;
          // call the "main" onfinish, which will hit onAASoundEnd() and destroy things cleanly.
          // hackish: ensure that sound has not already been destroyed, prevent infinite loop.
          // NOTE: I dislike this pattern and wish to do away with it. ;)
          if (!sound.disabled) {
            sound.options.onfinish(sound);
          }
        }, 20000);
      }
    });
  }
}

function setEnemy(exports, isEnemy) {
  let { data } = exports;

  if (data.isEnemy === isEnemy) return;

  data.isEnemy = isEnemy;

  zones.changeOwnership(exports);

  playSoundWithDelay(
    isEnemy ? sounds.enemyClaim : sounds.friendlyClaim,
    exports,
    500
  );
}

function claim(exports, engineer) {
  let { data, objects } = exports;

  if (!engineer?.data) return;

  if (data.frameCount % data.claimModulus !== 0) return;

  createSparks(exports, 2);

  data.claimPoints++;

  if (data.claimPoints < data.claimPointsMax) return;

  let cornholio = getObjectById(objects.cornholio);

  // change sides.
  if (!data.dead) {
    // notify only if engineer is capturing a live turret.
    // otherwise, it'll be neutralized and then rebuilt.
    if (data.isEnemy === game.players.local.data.isEnemy) {
      game.objects.notifications.add('The enemy captured a turret 🚩');
      cornholio?.hide();
    } else {
      game.objects.notifications.add('You captured a turret ⛳');
      if (gamePrefs.bnb && sounds.bnb.cornholioAnnounce) {
        playSound(sounds.bnb.cornholioAnnounce, exports, {
          onplay: (sound) => {
            game.objects.notifications.add(data.bnbAnnounceText);
            cornholio?.setActiveSound(sound);
          },
          onfinish: () => {
            cornholio?.setActiveSound(null);
          }
        });
        cornholio?.show();
      }
    }
  }

  setEnemy(exports, engineer.data.isEnemy);

  data.claimPoints = 0;
}

function engineerHit(exports, engineer) {
  let { data } = exports;

  // target is an engineer; either repairing, or claiming.

  // "we've got one!"
  data.engineerHitCount++;

  if (!data.engineerInteracting) {
    data.engineerInteracting = true;
    // may not be provided, as in tutorial - just restoring immediately etc.
    if (engineer) {
      const isCapture = data.isEnemy !== engineer.data.isEnemy;
      // one of yours?
      if (engineer.data.isEnemy === game.players.local.data.isEnemy) {
        game.objects.notifications.addNoRepeat(
          isCapture
            ? 'You started capturing a turret ⛳'
            : 'You started rebuilding a turret 🛠️'
        );
      } else {
        game.objects.notifications.addNoRepeat(
          isCapture
            ? 'The enemy started capturing a turret 🚩'
            : 'The enemy started rebuilding a turret 🛠️'
        );
      }
    }
  }

  if (gamePrefs.bnb) bnbInteract(engineer);

  if (data.isEnemy !== engineer.data.isEnemy) {
    // gradual take-over.
    claim(exports, engineer);
  } else {
    repair(exports, engineer);
  }

  // play repair sounds?
  playRepairingWrench(() => isEngineerInteracting(exports), exports);

  playTinkerWrench(() => isEngineerInteracting(exports), exports);
}

function bnbInteract(exports, engineer) {
  let { data } = exports;

  if (!data.dead) return;

  // only when friendly engineer is capturing / restoring a dead turret...
  if (engineer.isEnemy || !data.engineerInteracting || !engineer.data) return;

  if (!data.hasBeavis && engineer.data.isBeavis) {
    data.hasBeavis = true;
  }

  // don't do this while the chopper is landed, music might be playing.
  const helicopterOK = !game.players.local.data.onLandingPad;

  if (!data.hasButthead && engineer.data.isButthead) {
    data.hasButthead = true;
    if (helicopterOK && gamePrefs.bnb)
      playSound(sounds.bnb.bhLetsRock, exports);
  }

  if (data.hasBeavis && data.hasButthead && !data.isSinging) {
    data.isSinging = true;
    // omit "take that, you commie butthole!" unless on-screen.
    if (helicopterOK && gamePrefs.bnb)
      playSound(
        data.isOnScreen ? sounds.bnb.singing : sounds.bnb.singingShort,
        game.players.local
      );
  }
}

function engineerCanInteract(exports, isEnemy) {
  let { data } = exports;

  // passing engineers should only stop if they have work to do.
  return data.isEnemy !== isEnemy || data.energy < data.energyMax;
}

function animate(exports) {
  let { data, domCanvas } = exports;

  sprites.draw(exports);

  data.frameCount++;

  effects.drawScanNode(exports);

  if (!data.dead) {
    fire(exports);
  } else {
    domCanvas.dieExplosion?.animate?.();
  }

  if (!data.dead && data.energy > 0) {
    effects.smokeRelativeToDamage(exports);
  }

  if (
    !data.dead &&
    data.energy > 0 &&
    data.frameCount % data.repairModulus === 0
  ) {
    // self-repair
    repair(exports);
  }

  // engineer interaction flag
  if (data.engineerInteracting && !data.engineerHitCount) {
    data.engineerInteracting = false;
  }

  // always reset
  data.engineerHitCount = 0;
}

function refreshCollisionItems(exports) {
  let { collisionItems, data, targets } = exports;

  // set on init, updated with `zones.changeOwnership()` as targets change sides

  collisionItems = getTypes(
    'bunker, superBunker, helicopter, balloon, turret, parachuteInfantry, shrapnel',
    { exports }
  );

  /**
   * additional challenge: make turrets sometimes go after tanks, as well.
   * note: vans are given a pass; they're so weak, they'll be taken out in a convoy by gunfire + explosions.
   * otherwise, a single van may be able to "sneak by" a turret.
   *
   * 02/2023: I had smartMissile in here, but it's insanely tough with these being shot down. Maybe for insane mode.
   */

  /**
   * If "hard" (wargames), then some turrets fire at tanks only starting with battle 5 - "Two-Gun"?
   * It appears that some turrets can be set up *only* to fire at tanks, maybe all ground vehicles - and not helicopters. TBD.
   * On "Super Bunker" in Wargames, the original has a mix of air and ground-unit turrets.
   * This needs review / study vs. the original game.
   * See AA Level Editor 2.0:mac for reference.
   */
  if (data.targetGroundUnits) {
    targets = getTypes('tank', { exports });

    // hackish: write back to exports.
    exports.targets = targets;

    collisionItems = collisionItems.concat(targets);
  }

  if (
    gameType === 'hard' ||
    gameType === 'extreme' ||
    gameType === 'armorgeddon'
  ) {
    // also: these things may not be targeted, but can be hit.
    collisionItems = collisionItems.concat(
      getTypes('engineer, smartMissile', { exports })
    );
  }

  exports.collisionItems = collisionItems;
}

function createSparks(exports, count = 1) {
  let { data } = exports;

  if (!data.engineerInteracting) return;

  effects.inertGunfireExplosion({
    // options
    count,
    vX: 1,
    vY: 1 + rnd(2),
    // object in question
    exports: {
      data: {
        type: data.type,
        x: data.x + 3,
        y: data.y + 8,
        halfWidth: data.halfWidth,
        isOnScreen: data.isOnScreen
      }
    }
  });
}

function updateDomCanvas(exports, state) {
  let { domCanvas, turretBase, turretDead, turretGun } = exports;

  domCanvas.img = state.dead ? turretDead : [turretBase, turretGun];
}

function initTurret(exports, options) {
  let { data, objects, radarItem } = exports;

  refreshCollisionItems(exports);

  common.initDOM(exports);

  let cornholio = game.addObject(TYPES.cornholio, {
    x: data.x - data.cornholioOffsetX,
    y: data.y,
    oParent: data.id
  });

  objects.cornholio = cornholio.data.id;

  if (options.DOA || data.isEnemy) {
    cornholio.hide();
  } else if (gamePrefs.bnb) {
    cornholio.show();
  }

  if (!noRadar) {
    radarItem = game.objects.radar.addItem(exports);
  }

  // "dead on arrival"
  if (options.DOA) {
    die(exports, { silent: true });
  }
}

function destroy(exports) {
  let { radarItem } = exports;

  radarItem?.die();
}

export { TURRET_SCAN_RADIUS, Turret };
