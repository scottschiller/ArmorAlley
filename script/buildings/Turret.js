import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { gameType } from '../aa.js';
import {
  FPS,
  GAME_SPEED_RATIOED,
  getTypes,
  rad2Deg,
  rnd,
  rndInt,
  rngInt,
  soundManager,
  tutorialMode,
  TYPES
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

const TURRET_SCAN_RADIUS = 334;

const Turret = (options = {}) => {
  let css,
    data,
    dom,
    objects,
    height,
    radarItem,
    collisionItems,
    targets,
    exports;

  function okToMove() {
    // guns scan and fire 100% of the time, OR a random percent bias based on the amount of damage they've sustained. No less than 25% of the time.

    if (data.energy === 0) return false;

    return (
      data.energy === data.energyMax ||
      1 - Math.random() < Math.max(0.25, data.energy / data.energyMax)
    );
  }

  function fire() {
    // don't fire at things while in the editor. :P
    if (game.objects.editor) return;

    let deltaX,
      deltaY,
      deltaXGretzky,
      deltaYGretzky,
      angle,
      otherTargets,
      target,
      moveOK;

    target = enemyHelicopterNearby(data, data.scanDistance, data.hasScanNode);

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
      setFiring(false);
    }

    if (!target) {
      if (okToMove()) {
        // "scanning" animation.
        data.angle += data.angleIncrement * GAME_SPEED_RATIOED;
        if (data.angle >= 90 || data.angle < -90) {
          data.angleIncrement *= -1;
        }
      }
      return;
    }

    // we have a live one.
    if (!data.firing) {
      setFiring(true);
    }

    // midpoint of turret body
    const startX = data.x + data.halfWidth + 2.75;
    const startY = common.bottomAlignedY() + 12;

    deltaX = target.data.x - startX;
    deltaY = target.data.y - startY;

    // Gretzky: "Skate where the puck is going to be".
    deltaXGretzky = target.data.vX;
    deltaYGretzky = target.data.vY;

    // turret angle
    angle = Math.atan2(deltaY, deltaX) * rad2Deg + 90;

    const angleRad = (angle - 90) * 0.0175;

    moveOK = okToMove();

    if (data.frameCount % data.fireModulus === 0 && moveOK) {
      data.fireCount++;

      game.addObject(TYPES.gunfire, {
        parent: exports,
        parentType: data.type,
        isEnemy: data.isEnemy,
        fixedXY: true,
        // turret gunfire mostly hits airborne things.
        collisionItems,
        // roughly align gunfire with tip of angled barrel
        x: startX + Math.cos(angleRad) * (data.halfWidth + 8.5),
        y: startY + Math.sin(angleRad) * 16,
        vX: deltaX * 0.05 + deltaXGretzky,
        vY: Math.min(0, deltaY * 0.05 + deltaYGretzky)
      });

      if (sounds.turretGunFire) {
        playSound(sounds.turretGunFire, exports);

        if (
          data.fireCount === 1 ||
          data.fireCount % data.shellCasingInterval === 0
        ) {
          // shell casing?
          common.setFrameTimeout(() => {
            playSound(sounds.bulletShellCasing, exports);
          }, 250 + rnd(250));
        }
      }
    }

    // target the enemy
    data.angle = angle;
  }

  function setFiring(isFiring) {
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

        if (!otherFriendlyTurretFiring) {
          playSound(sounds.bnb.cornholioAttack, exports);
        }
      }
    } else {
      data.fireCount = 0;
    }

    if (!data.isEnemy) {
      objects.cornholio?.setSpeaking(data.firing);
    }
  }

  function resize() {
    return common.resizeScanNode(exports, radarItem);
  }

  function die(dieOptions = {}) {
    if (data.dead) return;

    // reset rotation
    data.angle = 0;

    data.energy = 0;
    data.restoring = false;
    data.dead = true;

    objects.cornholio?.hide();

    // hackish: ensure firing is reset.
    setFiring(false);

    updateDomCanvas({
      dead: true
    });

    if (!dieOptions.silent) {
      updateDomCanvas({ dead: true });
      data.domCanvas.dieExplosion = effects.genericExplosion(exports);
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
          const attacker = dieOptions.attacker?.data;

          if (attacker) {
            // infantry - specifically, dropped or released from helicopter
            const infantryAttacker =
              attacker?.parentType === TYPES.infantry &&
              attacker.parent.data.unassisted === false;

            // likewise, from helicopter
            const smartMissileAttacker =
              attacker.type === TYPES.smartMissile &&
              attacker.parentType === TYPES.helicopter;

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

      common.setFrameTimeout(() => {
        data.domCanvas.dieExplosion = null;
      }, 1500);

      effects.inertGunfireExplosion({ exports, count: 4 + rndInt(4) });

      effects.shrapnelExplosion(data, {
        count: 3 + rngInt(3, data.type),
        velocity: 2 + rngInt(2, data.type)
      });

      effects.damageExplosion(exports);

      effects.domFetti(exports, dieOptions?.attacker);

      effects.smokeRing(exports, { isGroundUnit: true });

      playSound(sounds.metalHitBreak, exports);
      playSound(sounds.genericExplosion, exports);
    }

    utils.css.add(dom.o, css.destroyed);
    utils.css.add(radarItem.dom.o, css.destroyed);
    utils.css.add(radarItem.dom.oScanNode, css.destroyed);

    resize();

    sprites.updateEnergy(exports);

    common.onDie(exports, dieOptions);
  }

  function restore() {
    // restore visual, but don't re-activate gun yet
    if (!data.dead && data.energy !== 0) return;

    // don't repeat if already underway
    if (data.restoring) return;

    data.restoring = true;
  }

  function isEngineerInteracting() {
    return data.engineerInteracting && data.energy < data.energyMax;
  }

  function repair(engineer, complete) {
    let result = false;

    if (data.energy < data.energyMax) {
      if (data.frameCount % (data.repairModulus / 2) === 0 || complete) {
        sprites.updateEnergy(exports);

        createSparks(3);

        restore(engineer);

        data.lastEnergy = data.energy;

        data.energy = complete
          ? data.energyMax
          : Math.min(data.energyMax, data.energy + 0.5);

        if (data.dead && data.energy > data.energyMax * 0.25) {
          // restore to life at 25%
          data.dead = false;
          utils.css.remove(dom.o, css.destroyed);
          utils.css.remove(radarItem.dom.o, css.destroyed);
          utils.css.remove(radarItem.dom.oScanNode, css.destroyed);

          updateDomCanvas({ dead: false });

          playSound(sounds.turretEnabled, exports);

          resize();
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

            objects.cornholio?.show();
            objects.cornholio?.setSpeaking(true);

            if (!data.firing) {
              playSound(sounds.bnb.cornholioAnnounce, exports, {
                onplay: (sound) => {
                  objects.cornholio?.setActiveSound(sound);
                  game.objects.notifications.add(data.bnbAnnounceText);
                },
                onfinish: () => {
                  // stop speaking when "announcement" has finished, and not actively firing.
                  objects.cornholio?.setActiveSound(null, data.firing);
                  objects.cornholio?.setSpeaking(data.firing);
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

  function updateHealth(/*attacker*/) {
    // special case: beavis "reacts" to friendly cornholio turret hits.
    if (
      gamePrefs.bnb &&
      !data.lastReactionSound &&
      game.players.local.data.isEnemy === data.isEnemy
    ) {
      data.lastReactionSound = true;
      playSound(sounds.bnb.beavisScreamShort, exports, {
        onfinish: (sound) => {
          data.lastReactionSound = null;
          // call the "main" onfinish, which will hit onAASoundEnd() and destroy things cleanly.
          // hackish: ensure that sound has not already been destroyed, prevent infinite loop.
          // NOTE: I dislike this pattern and wish to do away with it. ;)
          if (!sound.disabled) {
            sound.options.onfinish(sound);
          }
        }
      });
    }
  }

  function setEnemy(isEnemy) {
    if (data.isEnemy === isEnemy) return;

    data.isEnemy = isEnemy;

    zones.changeOwnership(exports);

    utils.css.addOrRemove(dom.o, isEnemy, css.enemy);
    utils.css.addOrRemove(radarItem?.dom?.o, isEnemy, css.enemy);

    playSoundWithDelay(
      isEnemy ? sounds.enemyClaim : sounds.friendlyClaim,
      exports,
      500
    );
  }

  function claim(engineer) {
    if (!engineer?.data) return;

    const { isEnemy } = engineer?.data;

    if (data.frameCount % data.claimModulus !== 0) return;

    createSparks(2);

    data.claimPoints++;

    if (data.claimPoints < data.claimPointsMax) return;

    // change sides.
    if (!data.dead) {
      // notify only if engineer is capturing a live turret.
      // otherwise, it'll be neutralized and then rebuilt.
      if (data.isEnemy === game.players.local.data.isEnemy) {
        game.objects.notifications.add('The enemy captured a turret 🚩');
        objects.cornholio?.hide();
      } else {
        game.objects.notifications.add('You captured a turret ⛳');
        if (gamePrefs.bnb && sounds.bnb.cornholioAnnounce) {
          playSound(sounds.bnb.cornholioAnnounce, exports, {
            onplay: (sound) => {
              game.objects.notifications.add(data.bnbAnnounceText);
              objects.cornholio?.setActiveSound(sound);
            },
            onfinish: () => {
              objects.cornholio?.setActiveSound(null);
            }
          });
          objects.cornholio?.show();
        }
      }
    }

    setEnemy(isEnemy);

    data.claimPoints = 0;
  }

  function engineerHit(engineer) {
    // target is an engineer; either repairing, or claiming.

    // "we've got one!"
    data.engineerHitCount++;

    if (!data.engineerInteracting) {
      data.engineerInteracting = true;
      utils.css.add(radarItem?.dom?.oScanNode, css.engineerInteracting);

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
      claim(engineer);
    } else {
      repair(engineer);
    }

    // play repair sounds?
    playRepairingWrench(isEngineerInteracting, exports);

    playTinkerWrench(isEngineerInteracting, exports);
  }

  function bnbInteract(engineer) {
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
      if (helicopterOK) playSound(sounds.bnb.bhLetsRock, exports);
    }

    if (data.hasBeavis && data.hasButthead && !data.isSinging) {
      data.isSinging = true;
      // omit "take that, you commie butthole!" unless on-screen.
      if (helicopterOK)
        playSound(
          data.isOnScreen ? sounds.bnb.singing : sounds.bnb.singingShort,
          game.players.local
        );
    }
  }

  function engineerCanInteract(isEnemy) {
    // passing engineers should only stop if they have work to do.
    return data.isEnemy !== isEnemy || data.energy < data.energyMax;
  }

  function animate() {
    sprites.moveWithScrollOffset(exports);

    data.frameCount++;

    if (!data.dead) {
      fire();
    } else {
      data.domCanvas.dieExplosion?.animate?.();
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
      repair();
    }

    // engineer interaction flag
    if (data.engineerInteracting && !data.engineerHitCount) {
      data.engineerInteracting = false;
      utils.css.add(radarItem?.dom?.oScanNode, css.engineerInteracting);
    }

    // always reset
    data.engineerHitCount = 0;
  }

  function refreshCollisionItems() {
    // set on init, updated with `zones.changeOwnership()` as targets change sides

    collisionItems = getTypes(
      'bunker, helicopter, balloon, parachuteInfantry, shrapnel',
      { exports }
    );

    if (gameType === 'hard' || gameType === 'extreme') {
      // additional challenge: make turret gunfire dangerous to some ground units, too.
      collisionItems = collisionItems.concat(
        getTypes('tank, van, infantry, missileLauncher, bunker, superBunker', {
          exports
        })
      );
    }

    if (gameType === 'extreme') {
      /**
       * additional challenge: make turret go after ground vehicles, as well. also, just to be extra-mean: smart missiles.
       * note: vans are given a pass; they're so weak, they'll be taken out in a convoy by gunfire + explosions.
       * otherwise, a single van may be able to "sneak by" a turret.
       *
       * 02/2023: I had smartMissile in here, but it's insanely tough with these being shot down. Maybe for insane mode.
       */
      targets = getTypes('tank, missileLauncher', { exports });

      // also: these things may not be targeted, but can be hit.
      collisionItems = collisionItems.concat(
        getTypes('engineer, smartMissile', { exports })
      );
    }
  }

  function createSparks(count = 1) {
    if (!data.engineerInteracting) return;

    effects.inertGunfireExplosion({
      // options
      count,
      vX: 1,
      vY: 1,
      css: 'welding-spark',
      // object in question
      exports: {
        data: {
          type: data.type,
          x: data.x + 3,
          y: data.y + 10,
          halfWidth: data.halfWidth,
          isOnScreen: data.isOnScreen
        }
      }
    });
  }

  function updateDomCanvas(state) {
    data.domCanvas.img = state.dead ? turretDead : [turretBase, turretGun];
  }

  function initDOM() {
    const isEnemy = data.isEnemy ? css.enemy : false;

    dom.o = sprites.create({
      className: game.objects.editor ? css.className : 'placeholder',
      id: data.id,
      isEnemy
    });

    dom.oScanNode = document.createElement('div');
    dom.oScanNode.className = css.scanNode;
    dom.o.appendChild(dom.oScanNode);

    sprites.setTransformXY(
      exports,
      dom.o,
      `${data.x}px`,
      `${data.y - data.yOffset}px`
    );
  }

  function initTurret() {
    refreshCollisionItems();

    initDOM();

    objects.cornholio = game.addObject(TYPES.cornholio, {
      x: data.x - data.cornholioOffsetX,
      y: data.y,
      oParent: exports
    });

    if (options.DOA || data.isEnemy) {
      objects.cornholio.hide();
    } else if (gamePrefs.bnb) {
      objects.cornholio.show();
    }

    radarItem = game.objects.radar.addItem(
      exports,
      game.objects.editor
        ? dom.o.className
        : data.isEnemy
        ? 'scan-node enemy'
        : 'scan-node'
    );

    // turrets also get a scan node.
    radarItem.initScanNode();

    // "dead on arrival"
    if (options.DOA) {
      die({ silent: true });
    } else {
      resize();
    }
  }

  function destroy() {
    radarItem?.die();
    sprites.removeNodes(dom);
  }

  height = 15;

  css = common.inheritCSS({
    className: TYPES.turret,
    destroyed: 'destroyed',
    scanNode: 'scan-node'
  });

  const fireModulus = tutorialMode
    ? 12
    : gameType === 'extreme'
    ? 2
    : gameType === 'hard'
    ? 6
    : 12; // a little easier in tutorial mode vs. hard vs. easy modes

  const claimModulus = 16;

  data = common.inheritData(
    {
      type: TYPES.turret,
      bottomAligned: true,
      dead: false,
      energy: 50,
      energyMax: 50,
      lastEnergy: 50,
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
      width: 10,
      logicalWidth: TURRET_SCAN_RADIUS,
      height,
      halfWidth: 5,
      halfHeight: height / 2,
      angle: 0,
      angleIncrement: 1.75,
      maxAngle: 90,
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
      }
    },
    options
  );

  dom = {
    o: null,
    oSubSprite: null
  };

  objects = {
    cornholio: null
  };

  exports = {
    animate,
    data,
    destroy,
    die,
    dom,
    engineerCanInteract,
    engineerHit,
    init: initTurret,
    objects,
    radarItem,
    refreshCollisionItems,
    resize,
    repair,
    updateHealth
  };

  const src = 'turret-sprite.png';

  const spriteWidth = 36;
  const spriteHeight = 128;
  const frameHeight = 32;

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

  // turret gun
  const turretGun = {
    src: utils.image.getImageObject(src),
    excludeEnergy: true,
    excludeDot: true,
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
      frameY: 0
    },
    target: {
      width: spriteWidth / 2,
      height: frameHeight / 2
    }
  };

  data.domCanvas = {
    img: [turretBase, turretGun],
    radarItem: Turret.radarItemConfig(exports)
  };

  return exports;
};

Turret.radarItemConfig = (exports) => ({
  width: 1.5,
  height: 2.25,
  draw: (ctx, obj, pos, width, height) => {
    ctx.fillStyle = exports?.data?.dead
      ? exports?.data?.isEnemy
        ? 'rgba(204, 204, 204, 0.25)'
        : 'rgba(23, 160, 7, 0.25)'
      : exports?.data?.isEnemy
      ? '#ccc'
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
    const barrelWidth = scaledWidth * 0.75;
    const barrelHeight = scaledHeight * 0.75;

    common.domCanvas.rotate(
      ctx,
      exports.data.angle,
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
  }
});

export { TURRET_SCAN_RADIUS, Turret };
