import { game } from '../core/Game.js';
import { EVENTS, gameEvents } from '../core/GameEvents.js';
import { utils } from '../core/utils.js';
import { gameType, keyboardMonitor, screenScale } from '../aa.js';

import {
  bananaMode,
  defaultMissileMode,
  rubberChickenMode,
  debug,
  FPS,
  isiPhone,
  isMobile,
  rnd,
  rndInt,
  plusMinus,
  tutorialMode,
  TYPES,
  winloc,
  worldWidth,
  worldHeight,
  worldOverflow,
  oneOf,
  getTypes,
  rngInt,
  rng,
  rngPlusMinus,
  clientFeatures,
  GAME_SPEED_RATIOED,
  GAME_SPEED,
  DEFAULT_LIVES,
  HELICOPTER_BOUNDARY_LEFT,
  HELICOPTER_BOUNDARY_RIGHT
} from '../core/global.js';

import {
  playSound,
  stopSound,
  sounds,
  playImpactWrench,
  playRepairingWrench,
  skipSound,
  playSoundWithDelay
} from '../core/sound.js';

import {
  collisionCheck,
  collisionCheckMidPoint,
  collisionTest,
  getNearestObject,
  objectInView,
  trackObject
} from '../core/logic.js';

import { common } from '../core/common.js';
import { gamePrefs } from '../UI/preferences.js';
import { getLandscapeLayout } from '../UI/mobile.js';
import { domFettiBoom } from '../UI/DomFetti.js';
import { zones } from '../core/zones.js';
import { effects } from '../core/effects.js';
import { net } from '../core/network.js';
import { sprites } from '../core/sprites.js';


const Helicopter = (options = {}) => {
  let css,
    data,
    dom,
    events,
    exports,
    objects,
    collision,
    radarItem,
    lastTarget,
    nextMissileTarget,
    statsBar;

  const aiRNG = (number) => rng(number, data.type, aiSeedOffset);

  function cloak(cloud) {
    if (!data.cloaked) {
      doCloak();
      cloud?.startDrift();
    }

    // hackish: mark and/or update the current frame when this happened.
    data.cloaked = game.objects.gameLoop.data.frameCount;

    data.opacity = 0.33;
    data.domCanvas.img.target.opacity = data.opacity;

    // Tough times with turrets? “The answer, my friend, is blowing in the wind.” 🌬️🚁
    cloud?.drift(data.isEnemy);
  }

  function doCloak() {
    // mark the frame this began
    data.cloakedFrameStart = game.objects.gameLoop.data.frameCount;

    if (!data.isLocal || !sounds.helicopter.engine) return;

    if (sounds.helicopter.engine.sound)
      sounds.helicopter.engine.sound.setVolume(
        (sounds.helicopter.engineVolume * gamePrefs.volume) / 2.5
      );

    if (!gamePrefs.bnb) return;

    // additional commentary, once fully-cloaked
    common.setFrameTimeout(function () {
      if (!data.cloaked) return;

      const cloakSound =
        sounds.bnb[
          game.data.isBeavis ? 'beavisICantSeeAnything' : 'beavisComeOn'
        ];

      playSound(cloakSound, null, {
        onplay: (sound) => {
          if (!data.cloaked) skipSound(sound);
        },
        onfinish: (sound) => {
          if (sound.skipped || !data.cloaked) return;
          // allow "peek-a-boo!"
          data.cloakedCommentary = true;
        }
      });
    }, 2000);
  }

  function updateCloakState() {
    // a helicopter could be targeted by a smart missile, and become cloaked long enough to confuse tracking.
    data.wentIntoHiding =
      data.cloaked &&
      data.cloakedFrameStart > 0 &&
      game.objects.gameLoop.data.frameCount - data.cloakedFrameStart >=
        FPS * data.wentIntoHidingSeconds;
  }

  function uncloak() {
    // uncloak if 1+ frame has passed, and we aren't in a cloud.
    if (!data.cloaked || data.cloaked === game.objects.gameLoop.data.frameCount)
      return;

    if (gamePrefs.bnb && data.isLocal && data.cloakedCommentary && !data.dead) {
      playSoundWithDelay(sounds.bnb.beavisPeekaboo, 250);
    }

    if (data.isLocal && sounds.helicopter.engine) {
      if (sounds.helicopter.engine.sound)
        sounds.helicopter.engine.sound.setVolume(
          sounds.helicopter.engineVolume * gamePrefs.volume
        );
    }

    data.cloaked = false;
    data.opacity = 1;
    data.domCanvas.img.target.opacity = data.opacity;
    data.cloakedFrameStart = 0;
    data.wentIntoHiding = false;
    data.cloakedCommentary = false;
  }

  function centerView() {
    // don't let errant calls center the view on remote / CPU choppers.
    if (!data.isLocal) return;

    // "get to the choppa!" (center the view on it, that is.)
    game.objects.view.setLeftScrollToPlayer(exports);

    sprites.moveWithScrollOffset(exports);
  }

  function updateFuelUI() {
    if (!data.isLocal) return;

    sprites.setTransformXY(
      undefined,
      dom.fuelLine,
      `${100 - (100 - data.fuel)}%`,
      '0px'
    );

    if (data.repairing || tutorialMode) return;

    // hackish: show announcements across 1% of fuel burn process.

    let text;

    if (data.fuel < 33 && data.fuel > 32) {
      text = 'Low fuel <span class="inline-emoji">⛽ 🤏 😬</span>';

      game.objects.view.setAnnouncement(text);
      game.objects.notifications.addNoRepeat(text);

      if (gamePrefs.bnb) {
        playSound(
          game.data.isBeavis ? sounds.bnb.hurryUpButthead : sounds.bnb.uhOh,
          exports
        );
      }
    } else if (data.fuel < 12.5 && data.fuel > 11.5) {
      text = 'Fuel critical <span class="inline-emoji">⛽ 🤏 😱</span>';

      game.objects.view.setAnnouncement(text);
      game.objects.notifications.addNoRepeat(text);

      if (gamePrefs.bnb) {
        playSound(
          game.data.isBeavis
            ? sounds.bnb.beavisLostUnit
            : sounds.bnb.buttheadLostUnit,
          exports
        );
      }
    } else if (data.fuel <= 0) {
      text = 'No fuel <span class="inline-emoji">💀</span>';

      game.objects.view.setAnnouncement(text);
      game.objects.notifications.addNoRepeat(text);

      if (gamePrefs.bnb) {
        playSound(
          game.data.isBeavis
            ? sounds.bnb.beavisEjectedHelicopter
            : sounds.bnb.buttheadEjectedHelicopter,
          exports
        );
      }
    }
  }

  function burnFuel() {
    // don't burn fuel in these cases
    if (data.dead || data.repairing) return;

    const burnRate = data.landed ? data.fuelRateLanded : data.fuelRateFlying;

    data.fuel = Math.max(
      0,
      data.fuel - ((0.1 * 1) / burnRate) * GAME_SPEED_RATIOED
    );

    updateFuelUI();
  }

  function repairInProgress() {
    return data.repairing && !data.repairComplete;
  }

  function iGotYouBabe() {
    if (!gamePrefs.bnb || !gamePrefs.muzak || !gamePrefs.sound) return;

    const { iGotYouBabe } = sounds.bnb;

    // determine our start point
    const offsets = [
      0,
      27850, // flute-ish melody: "duh duh, duh duh"
      39899 // guitar riff, "yes! rock!" 🎸🤘
    ];

    const from = offsets[iGotYouBabe.playCount] || 0;

    const options = { from };

    playSound(sounds.bnb.iGotYouBabe, null, options);

    if (++iGotYouBabe.playCount >= offsets.length) {
      iGotYouBabe.playCount = 0;
    }

    /**
     * https://www.youtube.com/watch?v=jyncsw3yq-k
     * ffmpeg -i cher.mp4 -ss 25 -t 73.5 -filter:v "crop=1420:1080:250:0,scale=352:-1" -c:v libx264 -an igotyoubabe.mp4
     * ffmpeg -i cher.mp4 -ss 25 -t 73.5 -filter:v "crop=1420:1080:250:0,scale=352:-1" -c:v libvpx-vp9 -an igotyoubabe.webm
     */
    common.setVideo('igotyoubabe', 1, from);

    game.objects.notifications.add('🎵 Now playing: “I Got You Babe” 🎸🤘', {
      noDuplicate: true
    });
  }

  function startRepairing(landingPad) {
    if (data.repairing) return;

    data.repairing = true;

    // reset "counter" for missiles, etc.
    data.repairFrames = 0;

    if (!data.isLocal) return;

    setSpinner(true);

    const welcomeMessage = landingPad.data.welcomeMessage;

    playSound(sounds.repairing);

    const somethingIsEmpty = !data.smartMissiles || !data.bombs || !data.ammo;

    if (
      data.smartMissiles < data.maxSmartMissiles ||
      data.fuel < 33 ||
      somethingIsEmpty
    ) {
      if (landingPad.data.isKennyLoggins) {
        // welcome to *** THE DANGER ZONE! ***
        if (!net.active && gamePrefs.muzak) {
          playSound(sounds.dangerZone, null);
        }
      } else if (gamePrefs.muzak) {
        if (gamePrefs.bnb) {
          if (landingPad.data.isMidway || somethingIsEmpty) {
            if (game.data.isBeavis) {
              if (Math.random() >= 0.25) {
                data.muchaMuchacha = true;
                if (gamePrefs.sound) {
                  game.objects.notifications.add(
                    '🎵 Now playing: “Mucha Muchacha” 🇲🇽🪅🍆',
                    { noDuplicate: true }
                  );
                  playSound(sounds.bnb.muchaMuchacha, null);
                  common.setVideo('camper', 1.05);
                  // TODO: re-implement in Canvas. ;)
                  // utils.css.add(dom.o, css.muchaMuchacha);
                }
              } else {
                game.objects.notifications.add(
                  '🎵 Now playing: “Ratfinks, Suicide Tanks And Cannibal Girls” 🎸🤘💥',
                  { noDuplicate: true }
                );
                const muted = false;
                common.setVideo('beavis-wz', 1, 1, muted);
              }
            } else {
              iGotYouBabe();
            }
          } else {
            playSound(sounds.bnb.theme, null);
          }
        } else if (gamePrefs.muzak) {
          // hit the chorus, if we'll be "a while."

          playSound(sounds.ipanemaMuzak, null, { position: 13700 });
          game.objects.notifications.add(
            '🎵 Now playing: “The Girl From Ipanema” 🎸🤘',
            { noDuplicate: true }
          );
        }
      }

      game.objects.notifications.add(welcomeMessage, {
        type: 'landingPad',
        noDuplicate: true
      });
    } else if (gamePrefs.muzak) {
      if (landingPad.data.isKennyLoggins && !net.active) {
        // welcome to *** THE DANGER ZONE! ***
        playSound(sounds.dangerZone, null);
      } else if (gamePrefs.bnb) {
        playSound(sounds.bnb.theme, null);
      } else {
        // start from the beginning, if a shorter visit.
        playSound(sounds.ipanemaMuzak, null, { position: 0 });
      }
    }

    // start blinking certain things

    if (data.smartMissiles < data.maxSmartMissiles) {
      utils.css.add(dom.statusBar.missileCountLI, css.repairing);
    }

    if (data.ammo < data.maxAmmo) {
      utils.css.add(dom.statusBar.ammoCountLI, css.repairing);
    }

    if (data.bombs < data.maxBombs) {
      utils.css.add(dom.statusBar.bombCountLI, css.repairing);
    }

    common.setFrameTimeout(
      () => {
        playRepairingWrench(repairInProgress, exports);
      },
      500 + rndInt(1500)
    );

    common.setFrameTimeout(
      () => {
        playImpactWrench(repairInProgress, exports);
      },
      500 + rndInt(1500)
    );
  }

  function stopRepairing() {
    // GAME_SPEED: ensure we don't have any remaining fractional values
    data.ammo = Math.floor(data.ammo);
    data.bombs = Math.floor(data.bombs);
    data.smartMissiles = Math.floor(data.smartMissiles);

    // ensure counters aren't blinking
    if (data.isLocal) {
      utils.css.remove(dom.statusBar.ammoCountLI, css.repairing);
      utils.css.remove(dom.statusBar.bombCountLI, css.repairing);
      utils.css.remove(dom.statusBar.missileCountLI, css.repairing);

      setSpinner(false);

      if (sounds.repairing) {
        stopSound(sounds.repairing);
      }

      if (sounds.ipanemaMuzak) {
        stopSound(sounds.ipanemaMuzak);
      }

      if (sounds.dangerZone) {
        stopSound(sounds.dangerZone);
      }

      if (sounds.bnb?.theme) {
        stopSound(sounds.bnb.theme);
      }

      if (sounds.bnb?.muchaMuchacha) {
        data.muchaMuchacha = false;
        // hackish: ensure we reset any horizontal travel.
        stopSound(sounds.bnb.muchaMuchacha);
      }

      if (sounds.bnb?.iGotYouBabe) {
        stopSound(sounds.bnb.iGotYouBabe);
      }

      common.setVideo();

      if (data.repairComplete) {
        document.getElementById('repair-complete').style.display = 'none';
      }
    }

    data.repairing = false;
    data.repairComplete = false;
  }

  // Status item
  function modify(o, count) {
    if (count > 0) {
      utils.css.remove(o, css.unavailable);
    } else {
      utils.css.add(o, css.unavailable);
    }
  }

  function applyStatusUI(updated) {
    const { force } = updated;

    if (force || updated.parachutes) {
      dom.statusBar.infantryCount.innerText = data.parachutes;
    }

    if (force || updated.ammo) {
      dom.statusBar.ammoCount.innerText = Math.floor(data.ammo);
      if (updated.ammoComplete) {
        utils.css.remove(dom.statusBar.ammoCountLI, css.repairing);
      }
    }

    if (force || updated.bombs) {
      dom.statusBar.bombCount.innerText = Math.floor(data.bombs);
      if (updated.bombsComplete) {
        utils.css.remove(dom.statusBar.bombCountLI, css.repairing);
      }
    }

    if (force || updated.smartMissiles) {
      maybeUpdateTargetDot();
      dom.statusBar.missileCount.innerText = Math.floor(data.smartMissiles);
      if (updated.smartMissilesComplete) {
        utils.css.remove(dom.statusBar.missileCountLI, css.repairing);
      }
    }

    let mobileControls;
    let mobileControlItems;

    if (isMobile) {
      mobileControls = document.getElementById('mobile-controls');
      mobileControlItems = mobileControls.querySelectorAll(
        '.mobile-controls-weapons li'
      );
    }

    if (force || updated.parachutes) {
      modify(dom.statusBar.infantryCountLI, data.parachutes);
      if (isMobile) modify(mobileControlItems[0], data.parachutes);
    }

    if (force || updated.smartMissiles) {
      modify(dom.statusBar.missileCountLI, data.smartMissiles);
      if (isMobile) modify(mobileControlItems[2], data.smartMissiles);
    }

    if (force || updated.ammo) {
      modify(dom.statusBar.ammoCountLI, data.ammo);
      if (isMobile) modify(mobileControlItems[1], data.ammo);
    }

    if (force || updated.bombs) {
      modify(dom.statusBar.bombCountLI, data.bombs);
      if (isMobile) modify(mobileControlItems[3], data.bombs);
    }

    // hackish, fix endBunkers reference
    if (force || updated.funds) {
      // update the funds UI
      game.objects.funds.setFunds(
        game.objects[TYPES.endBunker][data.isEnemy ? 1 : 0].data.funds
      );
    }
  }

  function updateLives(plusOrMinusOneLife = 0) {
    // optional param: ±1 - presently used when purchasing additional choppers
    if (common.unlimitedLivesMode()) return;
    data.lives += plusOrMinusOneLife;
    document.getElementById('lives-count').innerText = Math.max(0, data.lives);
  }

  function updateStatusUI(updated) {
    // ignore enemy repair / updates, but apply player's changes
    if (
      data.isLocal &&
      (updated.funds ||
        updated.force ||
        updated.ammo ||
        updated.bombs ||
        updated.smartMissiles ||
        updated.parachutes)
    ) {
      game.objects.queue.addNextFrame(() => {
        applyStatusUI(updated);
      });
    }

    // fully-repaired?
    if (
      data.repairing &&
      !data.repairComplete &&
      data.fuel === data.maxFuel &&
      data.ammo === data.maxAmmo &&
      data.energy === data.energyMax &&
      data.bombs === data.maxBombs &&
      data.smartMissiles === data.maxSmartMissiles
    ) {
      data.repairComplete = true;

      if (!data.isLocal) return;

      setSpinner(false);
      document.getElementById('repair-complete').style.display = 'block';

      if (sounds.repairing) {
        stopSound(sounds.repairing);
      }

      if (sounds.ipanemaMuzak) {
        stopSound(sounds.ipanemaMuzak);
      }

      if (sounds.dangerZone) {
        stopSound(sounds.dangerZone);
      }

      if (sounds.bnb?.theme) {
        stopSound(sounds.bnb.theme);
      }

      if (sounds.bnb?.beavisThankYouDriveThrough) {
        playSound(sounds.bnb.beavisThankYouDriveThrough);
      }

      if (sounds.inventory.end) {
        playSound(sounds.inventory.end);
      }
    }
  }

  function repair() {
    const updated = {};

    data.repairFrames++;

    data.fuel = Math.min(data.maxFuel, data.fuel + 0.4 * GAME_SPEED_RATIOED);

    if (
      data.ammo < data.maxAmmo &&
      data.repairFrames % data.ammoRepairModulus === 0
    ) {
      data.ammo = Math.min(data.maxAmmo, data.ammo + 1 * GAME_SPEED_RATIOED);
      updated.ammo = true;
      if (data.ammo >= data.maxAmmo) {
        // stop blinking
        updated.ammoComplete = true;
      }
    }

    // TODO: DRY / optimize
    if (data.repairFrames % data.energyRepairModulus === 0) {
      // fix damage (no UI for this)
      data.energy = Math.min(data.energyMax, data.energy + 1);
    }

    // TODO: DRY / optimize
    if (
      data.bombs < data.maxBombs &&
      data.repairFrames % data.bombRepairModulus === 0
    ) {
      data.bombs = Math.min(data.maxBombs, data.bombs + 1);
      updated.bombs = true;
      if (data.bombs >= data.maxBombs) {
        updated.bombsComplete = true;
      }
    }

    if (
      data.smartMissiles < data.maxSmartMissiles &&
      // TODO: DRY / optimize
      data.repairFrames % data.smartMissileRepairModulus === 0
    ) {
      data.smartMissiles = Math.min(
        data.maxSmartMissiles,
        data.smartMissiles + 1
      );
      updated.smartMissiles = true;
      if (data.smartMissiles >= data.maxSmartMissiles) {
        updated.smartMissilesComplete = true;
      }
      maybeUpdateTargetDot();
    }

    sprites.updateEnergy(exports);

    updateFuelUI();
    updateStatusUI(updated);

    if (!data.isLocal) return;

    if (gamePrefs.bnb && data.muchaMuchacha && data.repairFrames % 5 === 0) {
      if (rnd(1) < 0.25) return;

      const { sound } = sounds.bnb.muchaMuchacha;

      if (!sound) return;

      // hack: get position and whatnot
      // TODO: fix this
      sound._onTimer();

      // no motion, at first; "ramp up" the action at some point, and stop when finished.
      const offset = sound.position / sound.duration;

      const progress =
        !sound.playState || offset < 0.25 || offset > 0.9
          ? 0
          : Math.min(1, sound.position / (sound.duration * 0.66));

      data.tiltOffset = plusMinus(rnd(10 * progress));

      if (progress && Math.abs(data.tiltOffset) >= 2) {
        effects.inertGunfireExplosion({
          exports,
          count: 1 + rndInt(1),
          vY: 3 + rndInt(2)
        });
      }

      // hackish: horizontal travel.
      // TODO: move to sprite offsetX / xOffset.
      /*
      dom.o.style.left =
        (progress === 0 || Math.random() < 0.66 ? 0 : plusMinus(rnd(1))) + 'px';
        */

      // hackish: force update.
      sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);
    }
  }

  function checkFacingTarget(target) {
    // ensure the enemy chopper is facing the target before firing.
    if (!target) return;

    // ignore direction and prevent excessive flipping when bombing tanks, or if hidden within a cloud
    if (data.bombing || data.cloaked) return;

    const tData = target.data;

    // TODO: revisit and DRY
    if (data.isEnemy) {
      if (tData.x + tData.width < data.x && data.flipped) {
        flip();
      } else if (tData.x + tData.width > data.x && !data.flipped) {
        flip();
      }
    } else {
      if (tData.x + tData.width < data.x && !data.flipped) {
        flip();
      } else if (tData.x + tData.width > data.x && data.flipped) {
        flip();
      }
    }
  }

  function setFiring(state) {
    if (
      state !== undefined &&
      (!data.onLandingPad || isMobile || (!state && data.isCPU))
    ) {
      data.firing = state;

      if (!data.isCPU) {
        // start or stop immediately, too.
        data.fireFrameCount = parseInt(data.fireModulus, 10);
      }
    } else {
      data.firing = false;
    }
  }

  function setBombing(state) {
    // TODO: review forcing of false when `.onLandingPad` vs. next block, DRY etc.

    // no matter what, bail if on a landing pad.
    if (data.onLandingPad) {
      data.bombing = false;
      return;
    }

    if (state !== undefined && (!data.onLandingPad || (!state && data.isCPU))) {
      data.bombing = !!state;

      if (!data.isCPU) {
        // start or stop immediately, too.
        data.bombFrameCount = parseInt(data.bombModulus, 10);
      }
    }
  }

  function setMissileLaunching(state, missileModeFromNetwork) {
    // special override from remote, so we can fire the same type
    if (missileModeFromNetwork) {
      data.missileMode = missileModeFromNetwork;
    }

    data.missileLaunching = state;

    if (!data.isCPU) {
      // note the "time", for immediate "denied" sound feedback.
      data.missileLaunchingFrameCount = parseInt(
        data.missileLaunchingModulus,
        10
      );
    }
  }

  function setParachuting(state) {
    data.parachuting = state;

    if (!data.isCPU) {
      // start or stop immediately, too.
      data.parachuteFrameCount = parseInt(data.parachuteModulus, 10);
    }
  }

  function setRespawning(state) {
    const force = true;

    data.respawning = state;

    const respawnY = data.yMax - data.yMaxOffset;

    if (state) {
      // hackish: hard reset battlefield scroll
      data.scrollLeft = data.isEnemy
        ? common.getLandingPadOffsetX(exports) -
          game.objects.view.data.browser.halfWidth
        : 0;

      moveTo(common.getLandingPadOffsetX(exports), respawnY);

      if (data.isLocal) {
        // "get to the choppa!" (center the view on it, that is.)
        game.objects.view.setLeftScrollToPlayer(exports);

        sprites.moveWithScrollOffset(exports);

        // good time to do some DOM pruning, etc.
        if (game.objects.queue) {
          game.objects.queue.process();
        }
      } else {
        // hackish: force enemy helicopter to be on-screen when respawning
        sprites.updateIsOnScreen(exports, force);
      }

      // hackish: force-refresh, so helicopter can be hit while respawning.
      zones.refreshZone(exports);

      // look ma, no longer dead!
      data.dead = false;
      data.pilot = true;
      data.deployedParachute = false;
      data.excludeFromCollision = false;

      radarItem?.reset();
      radarItem?.summon();

      if (data.isLocal) {
        // reset everything.
        updateStatusUI({ force: true });
        updateLives();
      }

      sprites.updateEnergy(exports);

      // ensure we're visible.
      data.visible = true;
    }

    if (state) {
      // notify local human, only.
      if (common.playerCanLoseLives(data) && data.lives === 0) {
        const warning =
          '<span class="inline-emoji" style="animation: blink 0.5s infinite">⚠️</span>';
        game.objects.view.setAnnouncement(
          `${warning} Last helicopter ${warning}`
        );
        game.objects.notifications.addNoRepeat('WARNING: Last helicopter! 🚁');
      }

      // "complete" respawn, re-enable mouse etc.
      common.setFrameTimeout(respawnComplete, 1500);
    }
  }

  function respawnComplete() {
    callAction('setRespawning', false);

    if (data.isCPU) {
      data.vY = -1;
    }
  }

  function flip(force) {
    // flip the helicopter so it's pointing R-L instead of the default R/L (toggle behaviour)

    // if not dead or landed, that is.
    if (
      !force &&
      (data.respawning ||
        data.landed ||
        data.onLandingPad ||
        data.dead ||
        data.y <= 0)
    )
      return;

    data.flipped = !data.flipped;

    // TODO: yuck. refactor.
    spriteConfig.rotating.animationConfig.reverseDirection =
      (data.isEnemy && data.flipped) || (!data.isEnemy && !data.flipped);

    swapSprite(spriteConfig.rotating);

    // immediately re-scan for new missile targets.
    if (data.isLocal) {
      scanRadar();
    }

    if (data.isLocal && !data.autoFlip && sounds.helicopter.flip) {
      playSound(sounds.helicopter.flip);
    }

    /**
     * Mobile clients auto-flip the local player, but should send
     * these events to the remote (e.g., a desktop) for consistency.
     */
    if (net.active && data.isLocal) {
      net.sendMessage({ type: 'GAME_EVENT', id: data.id, method: 'flip' });
    }
  }

  function toggleAutoFlip() {
    // revert to normal setting
    if (data.flipped) flip();

    // toggle auto-flip
    data.autoFlip = !data.autoFlip;

    if (data.isLocal) {
      game.objects.notifications.add(
        data.autoFlip
          ? 'Auto-flip enabled'
          : clientFeatures.touch
            ? 'Auto-flip disabled.\nTap with another finger to flip manually.'
            : 'Auto-flip disabled'
      );

      // TODO: better "confirmation" sound
      if (sounds.inventory.begin) {
        playSound(sounds.inventory.begin);
      }

      // update the pref, and store.
      gamePrefs.auto_flip = data.autoFlip;
      utils.storage.set('auto_flip', data.autoFlip ? 1 : 0);
    }

    // network: replicate this on the other end.
    if (net.active && data.isLocal) {
      net.sendMessage({
        type: 'GAME_EVENT',
        id: data.id,
        method: 'toggleAutoFlip'
      });
    }
  }

  function applyTilt() {
    if (data.energy <= data.shakeThreshold) {
      data.shakeOffset =
        rnd(1) *
        (data.shakeOffsetMax *
          ((data.shakeThreshold - data.energy) / data.shakeThreshold) *
          plusMinus());
    } else {
      data.shakeOffset = 0;
    }

    // L -> R / R -> L + forward / backward

    // auto-flip (rotate) feature
    if (!data.landed && data.autoFlip) {
      if (!data.isEnemy) {
        if ((data.vX > 0 && data.flipped) || (data.vX < 0 && !data.flipped)) {
          flip();
        }
      } else if (
        (data.vX > 0 && !data.flipped) ||
        (data.vX < 0 && data.flipped)
      ) {
        flip();
      }
    }

    data.tiltOffset =
      data.dead || data.respawning || data.landed || data.onLandingPad
        ? 0
        : (data.vX / data.vXMax) * 10 + data.shakeOffset;

    // transform-specific, to be provided to sprites.setTransformXY() as an additional transform
    data.angle = data.tiltOffset;
  }

  function onLandingPad(state) {
    if (data.dead) {
      // ensure repair is canceled, if underway
      if (data.repairing) stopRepairing();

      return;
    }

    // our work may already be done.
    if (data.onLandingPad === state && data.landed === state) return;

    data.onLandingPad = state;
    data.landed = state;

    // edge case: helicopter is "live", but not active yet.
    if (data.respawning) return;

    if (state) {
      data.vX = 0;
      data.vY = 0;

      moveTo(data.x, data.y);

      // edge case: stop firing, etc.
      callAction('setFiring', false);
      callAction('setBombing', false);

      startRepairing(state);
    } else {
      stopRepairing();

      // only allow repair, etc., once hasLiftOff has been set.
      data.hasLiftOff = true;
    }
  }

  function refreshCoords() {
    const view = game.objects.view;
    let landscapeDetail;

    // roughly accurate for iPhone X, 01/2018.
    const notchWidth = 50;

    // determine max X and Y coords

    // "whole world", plus a bit; this allows the chopper to go a bit beyond the end bunker.
    data.xMax = view.data.battleField.width + worldOverflow;

    // including border
    data.yMax = view.data.world.height - data.height - data.yMaxOffset;

    // if mobile, set xMin and mobileControlsWidth (referenced in animate()) to prevent chopper flying over/under mobile controls.
    if (isMobile) {
      // account for mobile controls, if in landscape mode.
      landscapeDetail = getLandscapeLayout();

      if (landscapeDetail) {
        // slight offsets, allow helicopter to be very close to controls.
        // some affordance for The Notch, on iPhone (just assume for now, because FFS.)
        data.xMaxOffset =
          isiPhone && landscapeDetail === 'right' ? notchWidth : 0;
        data.xMin = isiPhone && landscapeDetail === 'left' ? notchWidth : 0;
      } else {
        // portrait mode: just forget it altogether and let helicopter go atop controls.
        // compensate for half of helicopter width being subtracted, too.
        data.xMaxOffset = -data.width * 0.5;
        data.xMin = -data.width * 0.5;
      }
    }

    // limit the helicopter to the top of the stats bar UI.
    const statsBar = document.getElementById('stats-bar');
    const rect = statsBar.getBoundingClientRect();
    data.yMin = rect.top * (1 / screenScale);
  }

  function moveToForReal(x, y) {
    const yMax = data.yMax - (data.repairing ? 3 : 0);

    // Hack: limit enemy helicopter to visible screen
    if (data.isCPU) {
      x = Math.min(worldWidth + worldOverflow, Math.max(0, x));
    }

    if (x !== undefined) {
      x = Math.min(data.xMax, x);
      if (x && data.x !== x) {
        data.x = x;
        data.midPoint.x = data.x + data.halfWidth;
      }
    }

    if (y !== undefined) {
      y = Math.max(data.yMin, Math.min(yMax, y));
      if (data.y !== y) {
        data.y = y;
        // TODO: redundant?
        data.midPoint.y = data.y;
      }
    }

    // reset angle if we're landed.
    if (y >= yMax) {
      data.tiltOffset = 0;
    }

    applyTilt();

    zones.refreshZone(exports);

    sprites.setTransformXY(exports, dom.o, `${x}px`, `${y}px`);
  }

  function moveTo(x, y) {
    if (data.isRemote && data.dead) return;

    // Note: this updates data.x + data.y.
    moveToForReal(x, y);

    // Note: CPU may also be local, which is why we don't exit early above.
    if (data.isCPU && !data.isRemote) {
      // immediately send our data abroad...
      game.objects.view.sendPlayerCoordinates(exports);
    }
  }

  function moveTrailers() {
    // don't show if dead, or being "summoned" (respawning) via stepOffset
    if (!data.isOnScreen || data.dead || data.stepOffset < 1) return;

    common.domCanvas.drawTrailers(
      exports,
      data.xHistory,
      data.yHistory,
      0,
      data.halfHeightAdjusted
    );
  }

  function reset() {
    let i, j, k, l, items, xLookAhead, foundObject, types, landingPad, noEntry;

    const pads = game.objects[TYPES.landingPad];

    landingPad = pads[data.isEnemy ? pads.length - 1 : 0];

    /**
     * determine if there is an enemy on, or about to be on the landing pad.
     * if so, repeat this operation in a moment to avoid the copter dying immediately.
     * this can happen when you have a convoy of tanks near the enemy base -
     * the enemy chopper can respawn each time a tank is over it. :(
     */

    types = getTypes('missileLauncher, tank, van, infantry', { exports });
    xLookAhead = 0;

    // is there a "foreign" object on, or over the base that would kill the chopper?
    for (i = 0, j = types.length; i < j; i++) {
      // enemy chopper is vulnerable if local player is at their base, and vice-versa.
      items = game.objects[types[i].type];
      for (k = 0, l = items.length; k < l; k++) {
        if (
          items[k].data.isEnemy !== data.isEnemy &&
          collisionCheck(items[k].data, landingPad.data, xLookAhead)
        ) {
          foundObject = items[k];
          break;
        }
      }
    }

    // something is covering the landing pad - retry shortly.
    if (foundObject) {
      if (data.isLocal) {
        noEntry =
          '<span class="inline-emoji" style="animation: blink 0.5s infinite">⛔</span>';
        game.objects.view.setAnnouncement(
          `${noEntry} Landing pad obstructed.\nWaiting for clearance. ${noEntry}`
        );
      }

      common.setFrameTimeout(reset, 500);

      return;
    } else {
      // finally, bring 'er up.
      resetAndRespawn();
    }
  }

  function resetAndRespawn() {
    // bail if game over (local human, only.)
    if (data.lives < 0 && common.playerCanLoseLives(data)) return;

    data.fuel = data.maxFuel;
    data.energy = data.energyMax;
    data.parachutes = 1;
    data.smartMissiles = data.maxSmartMissiles;
    data.ammo = data.maxAmmo;
    data.bombs = data.maxBombs;

    // various landed / repaired state
    data.landed = true;
    data.onLandingPad = true;
    data.repairComplete = false;
    data.hasLiftOff = false;

    data.vX = 0;
    data.vY = 0;
    data.lastVX = 0;

    data.attacker = undefined;

    if (!data.isCPU) {
      if (!tutorialMode) {
        game.objects.view.clearAnnouncement();
      }

      if (sounds.helicopter.engine?.sound)
        sounds.helicopter.engine.sound.setVolume(
          sounds.helicopter.engineVolume * gamePrefs.volume
        );
    } else {
      lastTarget = null;
      if (data.flipped) {
        flip();
      }
    }

    // reset any queued firing actions
    data.bombing = false;
    data.firing = false;
    data.missileLaunching = false;
    data.parachuting = false;
    data.shakeOffset = 0;

    data.exploding = false;

    // reposition on appropriate landing pad
    data.x = common.getLandingPadOffsetX(exports);
    data.y = worldHeight - data.height;

    // ensure tilt angle is reset to 0
    applyTilt();

    // move to landing pad
    moveTo(data.x, data.y);

    // data.dead and other bits will be set with respawn action
    callAction('setRespawning', true);
  }

  function respawn() {
    // exit if game is over.
    if (game.data.battleOver) return;

    // helicopter died. move view, and reset.
    reset();
  }

  function die(dieOptions = {}) {
    if (data.dead) return;

    // reset animations
    data.frameCount = 0;

    data.exploding = true;

    // drop this state in a moment.
    common.setFixedFrameTimeout(() => (data.exploding = false), 2000);

    const { attacker } = dieOptions;
    const aData = attacker?.data;

    if (data.isLocal) {
      dropMissileTargets();
      reactToDamage(attacker);
      // slow down and stop the battlefield scroll, if any.
      game.objects.view.decelerateScroll();
    }

    if (
      attacker &&
      (aData.type === TYPES.helicopter ||
        aData.type === TYPES.smartMissile ||
        (aData.type === TYPES.gunfire && aData.parentType === TYPES.turret))
    ) {
      // hit by other helicopter, missile, or turret gunfire? special (big) smoke ring.
      effects.smokeRing(exports, {
        count: 20,
        velocityMax: 20,
        offsetY: data.height - 2,
        isGroundUnit: data.landed || data.onLandingPad || data.bottomAligned,
        parentVX: data.vX,
        parentVY: data.vY
      });

      // special check: friendly turret shot down enemy helicopter
      if (
        gamePrefs.bnb &&
        data.isEnemy !== game.players.local.data.isEnemy &&
        aData?.parentType === TYPES.turret &&
        sounds?.bnb?.cornholioAttack
      ) {
        common.setFrameTimeout(() => {
          if (data.dead) return;
          playSound(sounds.bnb.cornholioAttack, attacker, {
            onplay: () =>
              game.objects.notifications.add(
                `The enemy was shot down by ${
                  Math.random() >= 0.5
                    ? 'THE GREAT CORNHOLIO.'
                    : 'THE ALMIGHTY BUNGHOLE.'
                }`,
                { noRepeat: true }
              )
          });
        }, 1000);
      }
    }

    // extra-special case: player + enemy helicopters collided.
    if (attacker) {
      if (aData.type === TYPES.helicopter) {
        if (!aData.isEnemy) gameEvents.fire(EVENTS.helicopterCollision);
      } else if (data.isEnemy && aData) {
        // celebrate the win if you, or certain actors take out an enemy chopper while on-screen.
        if (
          data.isOnScreen &&
          (aData.parentType === TYPES.helicopter ||
            aData.type === TYPES.smartMissile ||
            aData.type === TYPES.balloon)
        ) {
          gameEvents.fire(EVENTS.enemyDied);
        }
      } else {
        // local player, generic: "you died"
        gameEvents.fire(EVENTS.youDied, 'attacker', attacker);
      }
    } else {
      // local player, generic: "you died" - no attacker
      gameEvents.fire(EVENTS.youDied);
    }

    effects.shrapnelExplosion(data, {
      count: 20 + (net.active ? 0 : rngInt(20, TYPES.shrapnel)),
      velocity: 4 + rngInt(4, TYPES.shrapnel),
      vX: data.vX,
      vY: -Math.abs(data.vY),
      // special case: if a smart missile, use its velocity as the basis for the shrapnel.
      parentVX:
        attacker && aData?.type === TYPES.smartMissile
          ? aData.vX || data.vX
          : data.vX,
      parentVY: -Math.abs(data.vY),
      // first burst always looks too similar, here.
      noInitialSmoke: true
    });

    effects.smokeRing(exports, { parentVX: data.vX, parentVY: data.vY });

    effects.inertGunfireExplosion({ exports, count: 8 + rndInt(8) });

    // roll the dice: drop a paratrooper (pilot ejects safely)
    // skipping this for network games, risk of de-sync - needs troubleshooting.
    if (
      !net.active &&
      ((data.isCPU &&
        (gameType === 'hard' || gameType === 'extreme'
          ? aiRNG() > 0.5
          : aiRNG() > 0.25)) ||
        (data.isLocal && rng(data.type) > 0.66))
    ) {
      data.deployedParachute = true;
      deployParachuteInfantry({
        parent: exports,
        isEnemy: data.isEnemy,
        x: data.x + data.halfWidth,
        y: data.y + data.height - 11,
        ignoreShrapnel: true
      });
    }

    common.setFrameTimeout(() => {
      // undo flip
      if (data.flipped) {
        flip(true);
      }
    }, 1500);

    data.energy = 0;

    // ensure any health bar is updated and hidden ASAP
    sprites.updateEnergy(exports);

    effects.domFetti(exports, attacker);

    // randomize for next time
    data.domFetti.elementCount = 256 + rndInt(512);
    data.domFetti.startVelocity = 15 + rndInt(32);

    // move sprite once explosion stuff has completed
    common.setFrameTimeout(() => {
      // ignore if the game has ended.
      if (game.data.battleOver) return;

      // reposition on appropriate landing pad
      data.x = common.getLandingPadOffsetX(exports);
      data.y = worldHeight - data.height;

      // move to landing pad before respawn
      moveTo(data.x, data.y);

      // important: make sure the remote gets this before respawn, too.
      if (net.active && data.isLocal) {
        game.objects.view.sendPlayerCoordinates(exports);
      }
    }, 2000);

    data.dead = true;

    data.dieCount++;

    radarItem.die();

    data.visible = false;

    if (sounds.explosionLarge) {
      playSound(sounds.explosionLarge, exports);
      if (sounds.genericExplosion) playSound(sounds.genericExplosion, exports);
    }

    if (data.isLocal && sounds.helicopter.engine) {
      if (sounds.helicopter.engine.sound)
        sounds.helicopter.engine.sound.setVolume(0);
    }

    // don't respawn the enemy (CPU) chopper during tutorial mode.
    if ((!tutorialMode || !data.isEnemy) && !game.data.battleOver) {
      if (data.isLocal) {
        // animate back to home base.

        // start animation after a delay...
        common.setFrameTimeout(() => {
          // hackish: hard reset battlefield scroll
          data.scrollLeft = data.isEnemy
            ? common.getLandingPadOffsetX(exports) -
              game.objects.view.data.browser.halfWidth
            : 0;

          game.objects.view.animateLeftScrollTo(
            common.getLandingPadOffsetX(exports) +
              data.width * (1 / screenScale) -
              game.objects.view.data.browser.halfWidth
          );
        }, 1000);
      }

      // by the time the above is almost finished, start proper respawn.
      common.setFrameTimeout(respawn, data.isCPU ? 8000 : 3000);
    }

    // ensure we aren't going anywhere.
    data.vX = 0;
    data.vY = 0;

    data.scrollLeft = 0;

    common.onDie(exports, dieOptions);

    if (!data.deployedParachute) {
      common.addGravestone(exports);
    }

    // Local, human player only
    if (common.playerCanLoseLives(data)) {
      data.lives--;
      if (data.lives < 0) {
        // game over.
        game.objects.view.setAnnouncement(
          'Game over! <span class="inline-emoji">☠️🏳️</span><br />Better luck next time.',
          -1
        );
        game.objects.notifications.add(
          'Game over. <span class="no-emoji-substitution">☠️</span> 🏳️'
        );
      }
    }
  }

  function getBombParams() {
    return {
      parent: exports,
      parentType: data.type,
      isEnemy: data.isEnemy,
      x: data.x + data.halfWidth,
      y: data.y + data.height - 6,
      vX: data.vX * 0.625,
      vY: data.vY
    };
  }

  function getGunfireParams() {
    let tiltOffset =
      data.tiltOffset !== 0
        ? data.tiltOffset * data.tiltYOffset * (data.flipped ? -1 : 1)
        : 0;

    let vX;

    // inherent speed of a bullet
    const bulletVX = 7;

    // limit how much bullets can be "thrown"
    const bulletVXMax = data.vXMax + bulletVX / 1.5;

    // ensure bullets fire and move away from the chopper.
    const flipped = !!data.flipped;

    if ((!data.isEnemy && flipped) || (data.isEnemy && !flipped)) {
      // -ve: ensure bullets go left
      vX = Math.max(-bulletVXMax, Math.min(-bulletVX, data.vX - bulletVX));
    } else {
      // +ve: ensure bullets go right
      vX = Math.min(bulletVXMax, Math.max(bulletVX, bulletVX + data.vX));
    }

    return {
      parent: exports,
      parentType: data.type,
      isEnemy: data.isEnemy,
      x:
        data.x +
        ((!data.isEnemy && data.flipped) || (data.isEnemy && !data.flipped)
          ? 0
          : data.width - 8),
      y:
        data.y +
        data.halfHeight +
        (data.tilt !== null ? tiltOffset + 2 : 0) +
        (data.isEnemy ? 2 : 0),
      vX,
      vY:
        data.vY +
        (data.isCPU ? 0 : tiltOffset * (!data.isCPU && data.isEnemy ? -1 : 1)) // CPU doesn't know how to account for tilt
    };
  }

  function getSmartMissileParams(missileTarget) {
    // remote helicopters have missile mode set via network.
    const missileModeSource =
      (data.isRemote ? data.missileMode : game.objects.view.data.missileMode) ||
      defaultMissileMode;

    return {
      parent: exports,
      parentType: data.type,
      isEnemy: data.isEnemy,
      x: data.x + (data.flipped ? 0 : data.width) - 8,
      y: data.y + data.halfHeight, // + (data.tilt !== null ? tiltOffset + 2 : 0),
      target: missileTarget,
      // special variants of the smart missile. ;)
      isBanana: missileModeSource === bananaMode,
      isRubberChicken: missileModeSource === rubberChickenMode,
      isSmartMissile: missileModeSource === defaultMissileMode,
      onDie: maybeDisableTargetDot
    };
  }

  function maybeDisableTargetDot() {
    // this applies only to the local player.
    if (!data.isLocal) return;

    if (data.smartMissiles) return;

    const activeMissiles = game.objects[TYPES.smartMissile].filter(
      (m) => !m.data.dead && m.data.parent === game.players.local
    );

    // bail if there are still missiles in the air.
    if (activeMissiles.length) return;

    utils.css.add(targetDot, css.disabled);

    game.objects.radar.clearTarget();
  }

  function maybeUpdateTargetDot() {
    // this applies only to the local player.
    if (!data.isLocal) return;

    // does the local player have any active missiles?
    const activeMissiles = game.objects[TYPES.smartMissile].filter(
      (m) => !m.data.dead && m.data.parent === game.players.local
    );

    if (!data.smartMissiles && !activeMissiles.length) return;

    utils.css.remove(targetDot, css.disabled);
  }

  function dropMissileTargets() {
    dropNextTarget();
    if (nextMissileTarget) {
      markTarget(nextMissileTarget);
    }
    if (lastMissileTarget) {
      markTarget(lastMissileTarget);
    }
    game.objects.radar.clearTarget();
  }

  function dropNextTarget() {
    if (!nextMissileTarget) return;
    utils.css.remove(nextMissileTarget?.dom?.o, css.nextMissileTarget);
    nextMissileTarget.data.isNextMissileTarget = false;
    nextMissileTarget = null;
  }

  function markTarget(target, active) {
    if (!data.isLocal) return;

    if (!target) return;

    // hackish: force-disable if pref is off.
    if (!gamePrefs.modern_smart_missiles) {
      active = false;
    }

    dropNextTarget();

    // TODO: refactor or drop when 100% on canvas.

    target.data.isNextMissileTarget = !!active;

    // new target
    // NOTE: excluding turrets and missile launchers which have placeholder DOM / scan nodes, but sprites + red dot rendered on canvas.
    if (
      active &&
      target.data.type !== TYPES.turret &&
      target.data.type !== TYPES.missileLauncher &&
      target?.dom?.o.appendChild
    ) {
      target.dom.o.appendChild(targetDot);
      utils.css.add(target.dom.o, css.nextMissileTarget);
      nextMissileTarget = target;
      utils.css.remove(targetDot, css.disabled);
      game.objects.radar.markTarget(target.radarItem);
    }

    if (!active) {
      nextMissileTarget = null;
      if (targetDot) {
        utils.css.add(targetDot, css.disabled);
        if (target?.dom?.o) {
          utils.css.remove(target.dom.o, css.nextMissileTarget);
        }
        game.objects.radar.clearTarget();
      }
    }
  }

  function scanRadar() {
    // don't update if there are no missiles.
    // this helps to preserve the last target if the last missile was just fired.
    if (!data.smartMissiles) {
      dropNextTarget();
      return;
    }

    const newTarget = getNearestObject(exports, { useInFront: true });

    if (newTarget && newTarget !== lastMissileTarget) {
      markTarget(lastMissileTarget, false);

      markTarget(newTarget, true);

      lastMissileTarget = newTarget;
    } else if (!newTarget && lastMissileTarget) {
      markTarget(lastMissileTarget, false);

      lastMissileTarget = null;
    }
  }

  function updateMissileUI(reloading) {
    // Yuck. TODO: DRY.
    if (dom.statusBar?.missileCountLI) {
      utils.css.addOrRemove(
        dom.statusBar.missileCountLI,
        reloading,
        css.reloading
      );
    }

    utils.css.addOrRemove(
      document.querySelectorAll(
        '#mobile-controls .mobile-controls-weapons li'
      )[2],
      reloading,
      css.reloading
    );
  }

  function fire() {
    let missileTarget;
    const updated = {};

    if (
      !data.firing &&
      !data.bombing &&
      !data.missileLaunching &&
      !data.parachuting
    )
      return;

    if (data.firing && data.fireFrameCount % data.fireModulus === 0) {
      if (data.ammo > 0) {
        let params = getGunfireParams();
        // account somewhat for helicopter angle, including tilt from flying and random "shake" from damage

        game.addObject(TYPES.gunfire, params);

        playSound(
          data.isEnemy ? sounds.machineGunFireEnemy : sounds.machineGunFire,
          exports
        );

        // TODO: CPU

        data.ammo = Math.max(0, data.ammo - 1);

        if (data.isLocal) {
          updated.ammo = true;
        }
      } else if (data.isLocal && sounds.inventory.denied) {
        // player is out of ammo.
        playSound(sounds.inventory.denied);
      }

      // SHIFT key still down?
      if (data.isLocal && !keyboardMonitor.isDown('shift')) {
        if (data.firing) callAction('setFiring', false);
      }
    }

    data.fireFrameCount++;

    if (data.bombing && data.bombFrameCount % data.bombModulus === 0) {
      if (data.bombs > 0) {
        let params = getBombParams();

        game.addObject(TYPES.bomb, params);

        if (sounds.bombHatch) {
          playSound(sounds.bombHatch, exports);
        }

        data.bombs = Math.max(0, data.bombs - 1);

        if (data.isLocal) {
          updated.bombs = true;
        }
      } else if (data.isLocal && sounds.inventory.denied) {
        // player is out of ammo.
        playSound(sounds.inventory.denied);
      }

      // "bombing" key still down?
      if (
        data.isLocal &&
        !keyboardMonitor.isDown('ctrl') &&
        !keyboardMonitor.isDown('z')
      ) {
        data.bombing = false;
      }
    }

    data.bombFrameCount++;

    if (data.missileLaunching) {
      if (data.smartMissiles > 0) {
        // local chopper may use target from UI
        if (
          data.isLocal &&
          lastMissileTarget?.dom?.o &&
          !lastMissileTarget?.data?.dead
        ) {
          missileTarget = lastMissileTarget;
        } else {
          missileTarget = getNearestObject(exports, { useInFront: true });

          // sync the UI if local, too.
          if (data.isLocal) {
            maybeUpdateTargetDot();
          }
        }

        if (
          !data.missileReloading &&
          missileTarget &&
          !missileTarget.data.cloaked
        ) {
          const params = getSmartMissileParams(missileTarget);

          game.addObject(TYPES.smartMissile, params);

          data.smartMissiles = Math.max(0, data.smartMissiles - 1);

          updated.smartMissiles = true;

          data.missileReloading = true;

          updateMissileUI(data.missileReloading);

          // set a timeout for "reloading", so the next (second) missile doesn't fire immediately.
          data.missileReloadingTimer = common.setFrameTimeout(() => {
            data.missileReloading = false;
            updateMissileUI(data.missileReloading);
          }, data.missileReloadingDelay);
        }
      }

      if (
        !data.missileReloading &&
        data.isLocal &&
        (!data.smartMissiles || !missileTarget)
      ) {
        // out of ammo / no available targets - and, it's been an interval OR the missile key / trigger was just pressed...
        if (
          sounds.inventory.denied &&
          data.missileLaunchingFrameCount % data.missileLaunchingModulus === 0
        ) {
          playSound(sounds.inventory.denied);
        }

        if (data.smartMissiles && !missileTarget) {
          game.objects.notifications.add(
            '🚀 Missile: No nearby target? 📡 🚫',
            { noRepeat: true }
          );
        }
      }
    }

    data.missileLaunchingFrameCount++;

    if (data.parachuting) {
      if (data.parachutes > 0 && !data.parachutingThrottle) {
        data.parachutingThrottle = true;

        // set a timeout for "reloading", so the next parachute doesn't drop immediately.
        data.parachutingTimer = common.setFrameTimeout(
          () => {
            data.parachutingThrottle = false;
          },
          (data.landed
            ? data.parachutingDelayLanded
            : data.parachutingDelayFlying) *
            (30 / FPS)
        );

        // helicopter landed? Just create an infantry.
        if (data.landed) {
          game.addObject(TYPES.infantry, {
            isEnemy: data.isEnemy,
            // don't create at half-width, will be immediately recaptured (picked up) by helicopter.
            x: data.x + data.width * (data.isEnemy ? 0.25 : 0.75),
            y: data.y + data.height - 11,
            // exclude from recycle "refund" / reward case
            unassisted: false
          });
        } else {
          deployParachuteInfantry({
            parent: exports,
            isEnemy: data.isEnemy,
            x: data.x + data.halfWidth,
            y: data.y + data.height - 11
          });
        }

        data.parachutes = Math.max(0, data.parachutes - 1);

        updated.parachutes = true;

        playSound(sounds.popSound2, exports);
      } else if (
        data.isLocal &&
        !data.parachutingThrottle &&
        data.parachuteFrameCount % data.parachuteModulus === 0 &&
        sounds.inventory.denied
      ) {
        if (gamePrefs.bnb && (game.data.isBeavis || game.data.isButthead)) {
          if (!data.bnbNoParachutes) {
            data.bnbNoParachutes = true;
            const { isBeavis } = game.data;
            const playbackRate = isBeavis ? 1 : 0.85 + Math.random() * 0.3;
            playSound(
              isBeavis ? sounds.bnb.beavisGrunt : sounds.bnb.buttheadBelch,
              null,
              {
                playbackRate,
                onfinish: () => (data.bnbNoParachutes = false)
              }
            );
          }
        } else {
          // no more infantry to deploy.
          playSound(sounds.inventory.denied);
        }
      }
    }

    data.parachuteFrameCount++;

    if (
      updated.ammo ||
      updated.bombs ||
      updated.smartMissiles ||
      updated.parachutes
    ) {
      updateStatusUI(updated);
    }
  }

  function eject() {
    if (data.landed) {
      game.objects.notifications.addNoRepeat('You cannot eject while landed.');
      playSound(sounds.inventory.denied);
      return;
    }

    // bail!
    if (!data.dead && data.pilot) {
      // always deploy the pilot...
      deployParachuteInfantry({
        isEnemy: data.isEnemy,
        parent: exports,
        // a little variety
        x:
          data.x + data.halfWidth + rngPlusMinus(data.halfWidth / 2, data.type),
        y: data.y + data.height - 11
      });

      // ...plus, any paratroopers
      const parachutes = parseInt(data.parachutes, 10) + 1 || 1;

      // note that chopper could be dead, or parachutes could be deployed by the time this fires.
      for (let i = 0; i < parachutes; i++) {
        common.setFrameTimeout(
          deployRandomParachuteInfantry,
          FPS * (i + 1) * 2
        );
      }

      data.deployedParachute = true;

      data.pilot = false;

      if (!data.isLocal) return;

      if (!tutorialMode) {
        game.objects.view.setAnnouncement(
          'No pilot <span class="inline-emoji">😱</span>'
        );
      }

      if (tutorialMode || !data.ejectCount) {
        game.objects.notifications.add(
          'You found the “eject” button. <span class="inline-emoji">😱 💀</span>'
        );
      }

      data.ejectCount++;

      if (gamePrefs.bnb) {
        playSound(
          game.data.isBeavis
            ? sounds.bnb.beavisEjectedHelicopter
            : sounds.bnb.buttheadEjectedHelicopter,
          exports
        );
      }

      if (net.active) {
        // tell the remote.
        net.sendMessage({ type: 'GAME_EVENT', id: data.id, method: 'eject' });
      }
    }
  }

  function deployRandomParachuteInfantry() {
    // only deploy if not already dead.
    // e.g., helicopter could be ejected, then explode before all infantry have released.
    if (data.dead) return;

    // guard against parachutes being released before ejection, too.
    if (!data.parachutes) return;

    deployParachuteInfantry({
      isEnemy: data.isEnemy,
      parent: exports,
      // a little variety
      x: data.x + data.halfWidth + rngPlusMinus(data.halfWidth / 2, data.type),
      y: data.y + data.height - 11
    });

    data.parachutes = Math.max(0, data.parachutes - 1);
  }

  function deployParachuteInfantry(options) {
    /**
     * mid-air deployment: check and possibly become the chaff / decoy target for "vulnerable"
     * smart missiles that have just launched, and have not yet locked onto their intended target.
     * in the original game, the enemy helicopter would use this trick to distract your missiles.
     */

    game.addObject(TYPES.parachuteInfantry, options);
  }

  function ai() {
    /**
     * Rudimentary, dumb smarts. To call this "AI" would be an insult to the AI community. ;)
     * Rule-based logic: Detect, target and destroy enemy targets, hide in clouds, return to base as needed and so forth.
     */

    let deltaX,
      deltaY,
      ltData,
      target,
      tData,
      result,
      altTarget,
      desiredVX,
      desiredVY,
      deltaVX,
      deltaVY,
      maxY;

    // wait until fully-respawned, including initial undefined / not-yet-initialized case.
    if (data.respawning || data.respawning === undefined) return;

    // ignore if on empty.
    if (data.fuel <= 0) return;

    maxY = 320;

    // low fuel means low fuel. or ammo. or bombs.

    if (
      (data.fuel < 30 || data.energy < 2 || (!data.ammo && !data.bombs)) &&
      data.energy > 0 &&
      !data.landed &&
      !data.repairing
    ) {
      if (data.firing) callAction('setFiring', false);
      if (data.bombing) callAction('setBombing', false);

      /**
       * fly toward closest landing pad.
       * use own base if within 25% of respective end of battlefield.
       * otherwise, use "neutral" mid-level base.
       * if you're there and the enemy decides to land,
       * you're going to find yourself in trouble. ;)
       */

      const pads = game.objects[TYPES.landingPad];

      if (data.isEnemy) {
        target = pads[pads.length - (data.x > 6144 ? 1 : 2)];
      } else {
        target = pads[data.x < 2048 ? 0 : 1];
      }

      tData = target.data;

      checkFacingTarget(target);

      // aim for center of landing pad
      deltaX = tData.x + tData.halfWidth - (data.x + data.halfWidth);
      deltaY = -4;

      data.vX = deltaX * GAME_SPEED_RATIOED;
      data.vY = deltaY * GAME_SPEED_RATIOED;

      data.vX = Math.max(-data.vXMax, Math.min(data.vXMax, data.vX));
      data.vY = Math.max(-data.vYMax, Math.min(data.vYMax, data.vY));

      data.lastVX = data.vX;
      data.lastVY = data.vY;

      // are we enveloped within the width of the landing pad?
      if (data.x >= tData.x && data.x + data.width <= tData.x + tData.width) {
        data.vX = 0;
        // ensure we're at least heading downward, no matter what.
        data.vY = Math.max(0.5, 4 * GAME_SPEED_RATIOED);
      }

      centerView();

      return;
    }

    if (data.onLandingPad) {
      if (!data.repairing || data.repairComplete) {
        // repair didn't start, or has completed. go go go!
        data.vY = -1 * GAME_SPEED_RATIOED;
        data.vX = data.vXMax * GAME_SPEED_RATIOED * data.isEnemy ? -1 : 1;

        // reset target, too
        lastTarget = null;
      } else {
        // still repairing. don't move.

        data.vX = 0;
        data.vY = 0;

        return;
      }
    }

    if (lastTarget) {
      // toast?

      ltData = lastTarget?.data;

      if (ltData.dead) {
        // was it a tank? reset tank-seeking mode until next interval.
        if (ltData.type === TYPES.tank) {
          data.targeting.tanks = false;
        }

        lastTarget = null;
      } else if (
        (ltData.type === TYPES.balloon || ltData.type === TYPES.tank) &&
        ltData.y > maxY
      ) {
        // flying too low?
        lastTarget = null;
      } else if (ltData.cloaked) {
        // did the player go behind a cloud?
        lastTarget = null;
      }
    }

    if (!lastTarget) {
      if (data.targeting.clouds) {
        lastTarget = objectInView(data, { items: TYPES.cloud });
        ltData = lastTarget?.data;

        // hack: only go after clouds in the player's half of the field.
        if (lastTarget) {
          if (data.isEnemy && ltData.x > 4096) {
            lastTarget = null;
          } else if (!data.isEnemy && ltData.x < 4096) {
            lastTarget = null;
          }
        }
      }

      if (!lastTarget && data.targeting.balloons && data.ammo) {
        lastTarget = objectInView(data, { items: TYPES.balloon });
      }

      if (!lastTarget && data.targeting.tanks && data.bombs) {
        lastTarget = objectInView(data, { items: TYPES.tank });
      }

      if (!lastTarget && data.targeting.helicopters && data.ammo) {
        lastTarget = objectInView(data, { items: TYPES.helicopter });
      }

      ltData = lastTarget?.data;

      // is the new target too low?
      // TODO: exclude if targeting player helicopter in extreme mode?
      if (
        lastTarget &&
        (ltData.type === TYPES.balloon || ltData.type === TYPES.helicopter) &&
        ltData.y > maxY
      ) {
        lastTarget = null;
      }

      if (lastTarget && ltData.cloaked) {
        lastTarget = null;
      }
    } else if (ltData.type === 'cloud') {
      // we already have a target - can we get a more interesting one?
      if (data.targeting.balloons && data.ammo) {
        altTarget = objectInView(data, {
          items: TYPES.balloon,
          triggerDistance: game.objects.view.data.browser.halfWidth
        });
      }

      if (!altTarget && data.targeting.tanks && data.bombs) {
        altTarget = objectInView(data, {
          items: TYPES.tank,
          triggerDistance: game.objects.view.data.browser.width
        });
      }

      if (!altTarget && data.targeting.helicopters && data.ammo) {
        altTarget = objectInView(data, {
          items: TYPES.helicopter,
          triggerDistance: game.objects.view.data.browser.width
        });
      }

      // better - go for that.
      if (altTarget && !altTarget.data.dead) {
        lastTarget = altTarget;
      }
    }

    // all the cases where a target can be considered toast.

    if (lastTarget?.data?.dead) {
      lastTarget = null;
    }

    if (lastTarget?.data?.type === TYPES.tank && data.bombs <= 0) {
      lastTarget = null;
    }

    if (
      ltData &&
      (ltData.type === TYPES.balloon || ltData.type === TYPES.helicopter) &&
      (ltData.y > maxY || data.ammo <= 0)
    ) {
      lastTarget = null;
    }

    if (lastTarget?.data?.cloaked) {
      lastTarget = null;
    }

    ltData = lastTarget?.data;

    /**
     * sanity check: if after all this, there is no target / nothing to do,
     * clouds aren't being targeted and there's a nearby cloud, go for that.
     */

    if (!lastTarget && !data.targeting.clouds) {
      lastTarget = objectInView(data, { items: TYPES.cloud });
      ltData = lastTarget?.data;

      // hack: only go after clouds in the player's half of the field, plus one screen width
      const targetX =
        4096 + (net.active ? 512 : game.objects.view.data.browser.width);

      if (
        lastTarget &&
        (data.isEnemy ? ltData.x > targetX : ltData.x < targetX)
      ) {
        lastTarget = null;
        ltData = null;
      }
    }

    // now go after the target.

    target = lastTarget;
    tData = target?.data;

    data.lastVX = parseFloat(data.vX);

    if (target && !tData.dead) {
      // go go go!

      result = trackObject(exports, target);

      if (tData.type !== TYPES.balloon) {
        if (tData.type === TYPES.landingPad) {
          result.deltaY = 0;
        }

        /*
        // hack: if target is not a balloon and is bottom-aligned (i.e., a tank), stay at current position.
        if (tData.bottomAligned) {
          result.deltaY = 0;
        }
        */
      } else {
        if (data.bombing) callAction('setBombing', false);
      }

      // enforce distance limits?
      if (tData.type === TYPES.balloon || tData.type === TYPES.helicopter) {
        if (Math.abs(result.deltaX) < 200) {
          result.deltaX = 0;
        }
      }

      desiredVX = result.deltaX;
      desiredVY = result.deltaY;

      deltaVX = Math.abs(data.vX - result.deltaX);

      if (Math.abs(deltaVX) > 1) {
        if (data.vX < desiredVX) {
          data.vX += 1 * GAME_SPEED_RATIOED;
        } else {
          data.vX -= 1 * GAME_SPEED_RATIOED;
        }
      } else {
        data.vX = 0;
      }

      deltaVY = Math.abs(data.vY - result.deltaY);

      if (Math.abs(deltaVY) > 1) {
        if (data.vY < desiredVY) {
          data.vY += 1 * GAME_SPEED_RATIOED;
        } else {
          data.vY -= 1 * GAME_SPEED_RATIOED;
        }
      } else {
        data.vY = 0;
      }

      // throttle

      data.vX = Math.max(-data.vXMax, Math.min(data.vXMax, data.vX));
      data.vY = Math.max(-data.vYMax, Math.min(data.vYMax, data.vY));

      // within firing range?
      if (tData.type === TYPES.balloon || tData.type === TYPES.helicopter) {
        if (tData.type === TYPES.balloon) {
          if (Math.abs(result.deltaX) < 100 && Math.abs(result.deltaY) < 48) {
            if (!data.firing) callAction('setFiring', true);
          } else {
            if (data.firing) callAction('setFiring', false);
          }
        } else if (Math.abs(result.deltaX) < 100) {
          // shoot at the player

          if (Math.abs(result.deltaY) < 48) {
            if (!data.firing) callAction('setFiring', true);
            if (data.bombing) callAction('setBombing', false);
          } else {
            if (data.firing) callAction('setFiring', false);

            // bomb the player?
            // TODO: verify that deltaY is not negative.
            if (Math.abs(result.deltaX) < 50 && result.deltaY > 48) {
              if (!data.bombing) callAction('setBombing', true);
            } else {
              if (data.bombing) callAction('setBombing', false);
            }
          }
        }
      } else if (tData.type === TYPES.tank) {
        // targeting a tank? randomize bombing depending on game difficulty.
        // default to 10% chance if no specific gameType match.
        if (
          Math.abs(result.deltaX) < tData.halfWidth &&
          Math.abs(data.vX) < 3 &&
          aiRNG() > (data.bombingThreshold[gameType] || 0.9)
        ) {
          if (!data.bombing) callAction('setBombing', true);
        } else {
          if (data.bombing) callAction('setBombing', false);
        }
      } else {
        // safety case: don't fire or bomb.
        if (data.firing) callAction('setFiring', false);
        if (data.bombing) callAction('setBombing', false);
      }
    } else {
      // default: go "toward the other guys"
      if (data.isEnemy) {
        data.vX -= 0.25 * GAME_SPEED_RATIOED;
      } else {
        data.vX += 0.25 * GAME_SPEED_RATIOED;
      }

      // and up
      data.vY -= 0.1;

      // and throttle
      data.vX = Math.max(-data.vXMax, Math.min(data.vXMax, data.vX));
      data.vY = Math.max(-data.vYMax, Math.min(data.vYMax, data.vY));
    }

    /**
     * bonus: cloud-based "stealth bombing" mode
     * if in a cloud and cloaked, not actively targeting tanks/helicopters
     * but targets are passing underneath, bomb away.
     */

    if (
      data.targeting.clouds &&
      !data.targeting.tanks &&
      data.cloaked &&
      data.bombs
    ) {
      // for once, literally, "in the cloud."

      // is a tank very close by?

      altTarget = objectInView(data, {
        items: TYPES.tank,
        triggerDistance: game.objects.view.data.browser.fractionWidth
      });

      if (altTarget) {
        result = trackObject(exports, altTarget);

        if (Math.abs(result.deltaX) < 50 && Math.abs(data.vX) < 4) {
          // RELEASE ZE BOMBS

          if (!data.bombing) callAction('setBombing', true);
        } else {
          if (data.bombing) callAction('setBombing', false);
        }
      } else {
        if (data.bombing) callAction('setBombing', false);
      }
    }

    // sanity check
    if (
      !lastTarget ||
      lastTarget.data.dead ||
      lastTarget.data.type === TYPES.cloud ||
      lastTarget.data.type === TYPES.landingPad
    ) {
      // no need to be firing...
      if (data.firing) callAction('setFiring', false);
    }

    if (
      data.vY > 0 &&
      data.y > maxY &&
      (!lastTarget || lastTarget.data.type !== TYPES.landingPad)
    ) {
      // hack: flying too low. limit.
      data.y = maxY;
      data.vY -= 0.25;
    }

    // ensure helicopter is pointing the right way, whether chasing a target or flying
    if (target) {
      checkFacingTarget(target);
    } else {
      // TODO: DRY
      if (data.isEnemy) {
        if (data.vX < 0 && data.flipped) {
          flip();
        } else if (data.vX > 0 && !data.flipped) {
          flip();
        }
      } else {
        if (data.vX < 0 && !data.flipped) {
          flip();
        } else if (data.vX > 0 && data.flipped) {
          flip();
        }
      }
    }

    centerView();
  }

  function animate() {
    if (game.objects.editor) return;

    /**
     * If local and dead or respawning, send a packet over to keep things going.
     * This is done because coordinates aren't sent while dead, and packets include frame counts.
     * In the case of lock step, this could mean the remote client could freeze while waiting.
     */
    if (net.active && data.isLocal && (data.dead || data.respawning)) {
      net.sendMessage({ type: 'PING' });
    }

    data.domCanvas.animation?.animate();

    if (data.respawning) {
      sprites.moveWithScrollOffset(exports);
      return;
    }

    if (game.data.battleOver) return;

    // move according to delta between helicopter x/y and mouse, up to a max.

    let i, j, view, mouse, jamming, newX, spliceArgs, maxY, yOffset;

    spliceArgs = [i, 1];

    jamming = 0;

    view = game.objects.view;

    // trailer history
    // push x/y to trailer history arrays, maintain size

    if (data.isOnScreen) {
      // if 60FPS, only update every other frame
      if (FPS === 30 || game.objects.gameLoop.data.frameCount % 2 === 0) {
        data.xHistory.push(
          data.x + (data.isEnemy || data.flipped ? data.width : 0)
        );
        data.yHistory.push(data.y);

        if (data.xHistory.length > data.trailerCount + 1) {
          data.xHistory.shift();
          data.yHistory.shift();
        }
      }

      moveTrailers();
    }

    if (data.pilot && data.fuel > 0) {
      /**
       * Mouse data can come from a few sources.
       */
      mouse = data.mouse;

      if (!data.isCPU) {
        // only allow X-axis if not on ground...
        if (mouse.x) {
          // accelerate scroll vX, so chopper nearly matches mouse when scrolling
          data.lastVX = parseFloat(data.vX);

          data.vX =
            (data.scrollLeft + mouse.x - data.x - data.halfWidth) * 0.1;

          // and limit
          data.vX = Math.max(-data.vXMax, Math.min(data.vXMax, data.vX));
        }

        if (mouse.y) {
          data.vY =
            (mouse.y - data.y - view.data.world.y - data.halfHeight) * 0.1;

          // and limit
          data.vY = Math.max(-data.vYMax, Math.min(data.vYMax, data.vY));
        }
      }
    }

    // prevent X-axis motion if landed, including on landing pad
    // Y-axis is motion still allowed, so helicopter can move upward and leave this state
    if (data.landed || data.onLandingPad) {
      data.vX = 0;
    }

    // has the helicopter landed?
    // TODO: note and fix(?) slight offset, helicopter falls short of perfect alignment with bottom.
    yOffset = 3;
    maxY = worldHeight - data.height + yOffset;

    // allow helicopter to land on the absolute bottom, IF it is not on a landing pad (which sits a bit above.)
    if (data.y >= maxY && data.vY > 0 && !data.landed) {
      // slightly annoying: allow one additional pixel when landing.
      data.y = maxY + 1;

      // only "reset" for human player
      if (!data.isCPU) {
        data.vX = 0;
        data.vY = 0;
      }

      moveTo(data.x, data.y);

      data.landed = true;
    } else if (
      data.dead ||
      (data.vY < 0 && (data.landed || data.onLandingPad))
    ) {
      // once landed, only leave once we're moving upward.

      data.landed = false;
      onLandingPad(false);
    } else if (data.onLandingPad) {
      // ensure the helicopter stays aligned with the landing pad.
      data.y = maxY - yOffset;
    }

    if (data.landed && !data.isCPU) {
      // don't throw bullets with vY, if landed
      data.vY = 0;
    }

    // no fuel?
    if (data.fuel <= 0 || !data.pilot) {
      // gravity until dead.
      if (data.vY < 0.5) {
        data.vY += 0.5 * GAME_SPEED_RATIOED;
      } else {
        data.vY *= 1 + 0.1 * GAME_SPEED_RATIOED;
      }

      if (data.landed) {
        die();
      }
    }

    // safety valve: don't move if ignoreMouseEvents
    if (data.ignoreMouseEvents) {
      data.vX = 0;
      data.vY = 0;
    }

    // take the difference between the game speed and real-time, if less than real-time.
    const RELATIVE_GAME_SPEED = GAME_SPEED_RATIOED; // (GAME_SPEED < 1 ? (1 - (GAME_SPEED / 2)) : GAME_SPEED);

    if (!data.dead) {
      newX = data.x + data.vX * RELATIVE_GAME_SPEED;

      // is this near the edge of the screen? limit to near screen width if helicopter is ahead of the scrolling screen.

      if (data.isLocal) {
        newX = Math.max(
          game.players.local.data.scrollLeft +
            view.data.browser.width * HELICOPTER_BOUNDARY_LEFT +
            data.halfWidth +
            data.xMin,
          Math.min(
            view.data.browser.width * HELICOPTER_BOUNDARY_RIGHT +
              game.players.local.data.scrollLeft -
              data.xMaxOffset -
              data.width * 1.5,
            newX
          )
        );
      }

      moveTo(newX, data.y + data.vY * RELATIVE_GAME_SPEED);

      collisionTest(collision, exports);

      // repairing?
      if (data.repairing) {
        repair();
      }

      effects.smokeRelativeToDamage(exports);
    }

    // animate child objects, too
    // TODO: move out to game.objects

    for (i = objects.bombs.length - 1; i >= 0; i--) {
      if (objects.bombs[i].animate()) {
        // object is dead - take it out.
        spliceArgs[0] = i;
        Array.prototype.splice.apply(objects.bombs, spliceArgs);
      }
    }

    for (i = objects.smartMissiles.length - 1; i >= 0; i--) {
      if (objects.smartMissiles[i].animate()) {
        // object is dead - take it out.
        spliceArgs[0] = i;
        Array.prototype.splice.apply(objects.smartMissiles, spliceArgs);
      }
    }

    // should we be firing, also?

    if (!data.dead) {
      if (data.isLocal && game.objects.gameLoop.data.frameCount % 10 === 0) {
        scanRadar();
      }

      fire();
    }

    if (data.isLocal) {
      const vans = game.objects[TYPES.van];

      // any enemy vans that are jamming our radar?
      for (i = 0, j = vans.length; i < j; i++) {
        if (
          !vans[i].data.dead &&
          vans[i].data.isEnemy !== data.isEnemy &&
          vans[i].data.jamming
        ) {
          jamming++;
        }
      }

      if (jamming && !data.radarJamming) {
        data.radarJamming = jamming;
        game.objects.radar.startJamming();
      } else if (!jamming && data.radarJamming) {
        data.radarJamming = jamming;
        game.objects.radar.stopJamming();
      }
    }

    burnFuel();

    if (data.isCPU && !data.isRemote) {
      ai();

      if (game.objects.gameLoop.data.frameCount % data.targetingModulus === 0) {
        const rng = aiRNG();

        // should we target tanks?
        data.targeting.tanks = rng > 0.65;

        // should we target clouds?
        data.targeting.clouds = rng > 0.5;

        data.targeting.helicopters = rng > 0.25 || tutorialMode;

        if (winloc.match(/clouds/i)) {
          // hack/testing: cloud-only targeting mode
          data.targeting.balloons = false;
          data.targeting.tanks = false;
          data.targeting.helicopters = false;
          data.targeting.clouds = true;
        }

        if (debug) {
          console.log(
            `AI tank targeting mode: ${data.targeting.tanks}, clouds: ${data.targeting.clouds}, helicopters: ${data.targeting.helicopters}`
          );
        }
      }
    }

    updateCloakState();

    // uncloak if not in a cloud?
    uncloak();
  }

  function reactToDamage(attacker) {
    // extra special case: BnB, and helicopter being hit by shrapnel or enemy gunfire.
    if (!gamePrefs.bnb) return;

    // make a racket, depending
    if (!data.lastReactionSound) {
      data.lastReactionSound = true;

      playSound(
        sounds.bnb[
          game.data.isBeavis ? 'beavisScreamShort' : 'buttheadScreamShort'
        ],
        exports,
        {
          onfinish: (sound) => {
            data.lastReactionSound = null;
            // call the "main" onfinish, which will hit onAASoundEnd() and destroy things cleanly.
            // hackish: ensure that sound has not already been destroyed, prevent infinite loop.
            // NOTE: I dislike this pattern and wish to do away with it. ;)
            if (!sound.disabled) {
              sound.options.onfinish(sound);
            }
          }
        }
      );
    }

    // next section: butthead only
    if (!game.data.isButthead) return;

    // just in case
    if (!attacker) return;

    // already queued?
    if (data.commentaryTimer) return;

    data.commentaryTimer = common.setFrameTimeout(
      () => {
        // don't run too often
        const now = Date.now();
        data.commentaryTimer = null;
        if (now - data.commentaryLastExec < data.commentaryThrottle) return;

        // "still fighting"?
        if (!isAttackerValid(attacker)) return;

        function onplay(sound) {
          // attacker may have died between queue and playback start
          if (!isAttackerValid(attacker)) skipSound(sound);
        }

        // finally!
        playSound(sounds.bnb.beavisCmonButthead, null, {
          onplay,
          onfinish: function (sound) {
            if (sound.skipped || !isAttackerValid(attacker)) return;
            // "you missed, butt-head."
            common.setFrameTimeout(
              () => {
                playSound(sounds.bnb.beavisYouMissed, null, {
                  onplay,
                  onfinish: (sound2) => {
                    if (sound2.skipped) return;
                    playSoundWithDelay(
                      sounds.bnb.beavisYouMissedResponse,
                      null,
                      { onplay },
                      1000
                    );
                  }
                });
              },
              5000 + rndInt(2000)
            );
          }
        });

        data.commentaryLastExec = now;
      },
      2000 + rndInt(2000)
    );
  }

  function isAttackerValid(attacker) {
    // "still fighting and in view"
    return !data.dead && !attacker.data.dead && attacker.data.isOnScreen;
  }

  function callMethod(method, params) {
    // no arguments.
    if (params === undefined) return exports[method]();

    // array? spread as arguments.
    if (params.length) return exports[method](...params);

    // single value.
    return exports[method](params);
  }

  const pendingActions = {};

  function callAction(method, value) {
    /**
     * Local keyboard input handler.
     * May act immediately, or send via network and delay somewhat.
     */

    if (!exports[method]) {
      console.warn('callAction: WTF no method by this name?', method, value);
      return;
    }

    // if not a network game, OR a remote object taking calls, just do the thing right away.
    if (!net.active || data.isRemote) return callMethod(method, value);

    // presently, `value` is only boolean.
    // if this changes, this will break and will need refactoring. :P
    // this throttles repeat calls with the same value, while the change is pending e.g., setFiring(true);
    const pendingId = `${method}_${value ? 'true' : 'false'}`;

    // we're already doing this.
    if (pendingActions[pendingId]) return;

    const params = [value];

    // special case: for smart missiles, also pass over the missile type -
    // e.g., `setMissileLaunching(true, 'rubber-chicken-mode')`
    // this ensures consistency on both sides.
    if (method === 'setMissileLaunching') {
      params.push(game.objects.view.data.missileMode);
    }

    // delay; send the thing, then do the thing.
    net.sendMessage({ type: 'GAME_EVENT', id: data.id, method, params });

    // set the timer, and clear when it fires.
    pendingActions[pendingId] = common.setFrameTimeout(() => {
      pendingActions[pendingId] = null;
      delete pendingActions[pendingId];
      callMethod(method, value);
    }, net.halfTrip);
  }

  const firingRates = {
    // "modern" vs. classic firing intervals.
    // also, values that need scaling for 30 / 60 FPS.

    smartMissileRepairModulus: {
      default: 128
    },

    bombRepairModulus: {
      default: 10
    },

    ammoRepairModulus: {
      default: 2
    },

    energyRepairModulus: {
      default: 5
    },

    missileLaunchingModulus: {
      classic: 5,
      modern: 5
    },

    bombModulus: {
      classic: 6,
      modern: 4
    },

    fireModulus: {
      classic: 3,
      modern: 2
    },

    parachuteModulus: {
      classic: 8,
      modern: 4
    },

    parachutingDelayFlying: {
      classic: 200,
      modern: 120
    },

    parachutingDelayLanded: {
      classic: 300,
      modern: 210
    }
  };

  function setFiringRate(type) {
    // apply according to prefs.
    const pref = gamePrefs.weapons_interval_classic ? 'classic' : 'modern';

    return parseInt(
      (firingRates[type].default || firingRates[type][pref]) *
        (1 / GAME_SPEED_RATIOED),
      10
    );
  }

  function updateFiringRates() {
    // get and assign each new value, e.g. data['fireModulus'] = ...
    Object.keys(firingRates).forEach((key) => {
      data[key] = setFiringRate(key);
    });

    // hackish: also, some FPS numbers.
    data.blinkCounterHide = 8 * (FPS / 30);
    data.blinkCounterReset = 16 * (FPS / 30);
  }

  function setSpinner(spinning) {
    if (spinning) {
      utils.css.add(dom.oSpinner, css.animating, css.active);
      data.spinnerTimer?.reset();
      data.spinnerTimer = null;
      return;
    }

    // remove
    utils.css.remove(dom.oSpinner, css.active);

    // once faded, drop animation.
    if (!data.spinnerTimer) {
      data.spinnerTimer = common.setFixedFrameTimeout(() => {
        utils.css.remove(dom.oSpinner, css.animating);
        data.spinnerTimer = null;
      }, 600);
    }
  }

  function initHelicopter() {
    updateFiringRates();

    if (data.isCPU || data.isRemote) {
      // offset fire modulus by half, to offset sound
      data.frameCount = Math.floor(data.fireModulus / 2);
    }

    dom.o = {};

    dom.fuelLine = sprites.getWithStyle('fuel-line');

    dom.oSpinner = document.getElementById('spinner');

    // before we move, or anything else - determine xMax + yMax.
    refreshCoords();

    // set some scroll stuff, initial positioning.
    data.scrollLeft = common.getLandingPadOffsetX(exports);

    // if not specified (e.g., 0), assign landing pad position.
    if (!data.x) {
      data.x = common.getLandingPadOffsetX(exports);
    }

    centerView();

    // sign up with the local "bank."
    game.objects[TYPES.endBunker][data.isEnemy ? 1 : 0].registerHelicopter(
      exports
    );

    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

    // for human player: append immediately, so initial game start / respawn animation works nicely
    sprites.updateIsOnScreen(exports);

    if (data.isLocal) {
      targetDot = document.createElement('div');
      targetDot.className = 'target-dot target-ui';
    }

    if (net.active) {
      if (!data.isCPU) {
        // regular local case
        callAction('setRespawning', true);
      } else {
        // randomize start times a bit
        common.setFrameTimeout(
          () => {
            callAction('setRespawning', true);
          },
          1000 + aiRNG(2000)
        );
      }
    } else {
      // non-network, local player(s)
      setRespawning(true);
    }

    // attach events?

    if (options.attachEvents && !isMobile) {
      const world = document.getElementById('world');
      // TODO: static DOM reference.
      utils.events.add(world, 'mousedown', events.mousedown);
      utils.events.add(window, 'scroll', (e) => {
        // don't allow scrolling at all?
        e.preventDefault();
        return false;
      });
    }

    if (data.isLocal) {
      updateStatusUI({ force: true });
      updateLives();
    }

    // note final true param, for respawn purposes
    radarItem = game.objects.radar.addItem(
      exports,
      `${css.className}${data.isLocal ? ' local-player' : ''}`,
      true
    );

    // ugh - hack.
    data.radarItem = radarItem;

    radarItem.summon();
  }

  css = common.inheritCSS({
    className: TYPES.helicopter,
    animating: 'animating',
    active: 'active',
    disabled: 'disabled',
    nextMissileTarget: 'next-missile-target',
    repairing: 'repairing',
    unavailable: 'weapon-unavailable',
    reloading: 'weapon-reloading'
  });

  // computer player
  let isCPU = !!options.isCPU;

  data = common.inheritData(
    {
      type: TYPES.helicopter,
      isCPU,
      isLocal: !!options.isLocal,
      isRemote: !!options.isRemote,
      attachEvents: !!options.attachEvents,
      angle: 0,
      excludeBlink: true, // TODO: review
      lastReactionSound: null,
      commentaryTimer: null,
      commentaryLastExec: 0,
      commentaryThrottle: 30000,
      excludeFromCollision: false,
      pickupSound: null,
      tiltOffset: 0,
      shakeOffset: 0,
      shakeOffsetMax: 6,
      shakeThreshold: 7,
      bombing: false,
      exploding: false,
      firing: false,
      fireFrameCount: 0,
      respawning: undefined,
      respawningDelay: 1600,
      missileLaunching: false,
      missileLaunchingFrameCount: 0,
      missileLaunchingModulus: 5,
      missileReloading: false,
      missileReloadingTimer: null,
      missileReloadingDelay: 500,
      parachuting: false,
      parachutingThrottle: false,
      parachutingTimer: null,
      parachutingDelayFlying: setFiringRate('parachutingDelayFlying'),
      parachutingDelayLanded: setFiringRate('parachutingDelayLanded'),
      preserveOffscreenDOM: !!options.isLocal,
      ignoreMouseEvents: !!game.objects.editor,
      fuel: 100,
      maxFuel: 100,
      fireModulus: setFiringRate('fireModulus'),
      bombModulus: setFiringRate('bombModulus'),
      bombFrameCount: 0,
      bombRepairModulus: 10,
      fuelRateLanded: tutorialMode ? 18 : 9,
      fuelRateFlying: tutorialMode ? 9 : 4.5,
      parachuteFrameCount: 0,
      parachuteModulus: setFiringRate('parachuteModulus'),
      repairModulus: 2,
      radarJamming: 0,
      repairComplete: false,
      landed: true,
      onLandingPad: true,
      hasLiftOff: false,
      cloaked: false,
      cloakedFrameStart: 0,
      wentIntoHiding: false,
      wentIntoHidingSeconds: 1.5,
      flipped: false,
      flipTimer: null,
      // if player is remote (via network,) then flip events are sent via network.
      autoFlip: options.isRemote ? false : isCPU || gamePrefs.auto_flip,
      repairing: false,
      repairFrames: 0,
      dieCount: 0,
      ejectCount: 0,
      energy: 10,
      energyMax: 10,
      energyRepairModulus: 5,
      energyLineScale: 0.25,
      direction: 0,
      pilot: true,
      xMin: 0,
      xMax: null,
      xMaxOffset: 0,
      yMin: 0,
      yMax: null,
      yMaxOffset: 3,
      vX: 0,
      // TODO: sort out CPU 2X difference. :X
      vXMax: isCPU ? 6 : 12,
      vYMax: isCPU ? 5 : 10,
      lastVX: 0,
      vY: 0,
      vyMin: 0,
      width: 48,
      height: options.isEnemy ? 18 : 15,
      halfWidth: 24,
      halfHeight: 7,
      halfHeightAdjusted: 3.5,
      tilt: null,
      lastTiltCSS: null,
      tiltYOffset: 0.25,
      ammo: tutorialMode ? 128 : 64,
      maxAmmo: tutorialMode ? 128 : 64,
      ammoRepairModulus: 2,
      bombs: tutorialMode ? 30 : 10,
      maxBombs: tutorialMode ? 30 : 10,
      parachutes: 1,
      maxParachutes: 5,
      bnbNoParachutes: false,
      smartMissiles: 2,
      maxSmartMissiles: 2,
      smartMissileRepairModulus: 128,
      midPoint: null,
      trailerCount: 16,
      xHistory: [],
      yHistory: [],
      // for AI
      targeting: {
        balloons: true,
        clouds: true,
        helicopters: true,
        tanks: true
      },
      targetingModulus: FPS * 30,
      // chance per gameType
      bombingThreshold: {
        easy: 0.9,
        hard: 0.85,
        extreme: 0.75
      },
      x: options.x || 0,
      y: options.y || game.objects.view.data.world.height - 20,
      muchaMuchacha: false,
      cloakedCommentary: false,
      domFetti: {
        colorType: options.isEnemy ? 'grey' : 'green',
        elementCount: 256 + rndInt(512),
        startVelocity: 15 + rndInt(32),
        spread: 360,
        decay: 0.95
      },
      // things originally stored on the view
      mouse: {
        x: 0,
        y: 0,
        vX: 0,
        vY: 0
      },
      scrollLeft: 0,
      // a buffer for local input delay.
      mouseHistory: new Array(32),
      missileMode: null,
      spinnerTimer: null,
      blinkCounter: 0,
      // TODO: DRY / optimize
      blinkCounterHide: 8 * (FPS / 30),
      blinkCounterReset: 16 * (FPS / 30),
      lives: DEFAULT_LIVES
    },
    options
  );

  data.midPoint = {
    x: data.x + data.halfWidth + 10,
    y: data.y,
    width: 5,
    height: data.height
  };

  // each helicopter gets a unique random number generator seed.
  const aiSeedOffset = data.id.split('_')[1] || 0;

  // randomize "AI" timing a bit
  data.targetingModulus += Math.floor(aiRNG(15));

  if (data.isLocal) {
    statsBar = document.getElementById('stats-bar');
  }

  // TODO: clean this up
  let lastMissileTarget;
  let targetDot;

  dom = {
    o: null,
    fuelLine: null,
    oSpinner: null,
    statsBar,
    // hackish
    statusBar: (() => {
      if (!statsBar) return;
      return {
        infantryCount: document.getElementById('infantry-count'),
        infantryCountLI: statsBar?.querySelectorAll('li.infantry-count')[0],
        ammoCount: document?.getElementById('ammo-count'),
        ammoCountLI: statsBar?.querySelectorAll('li.ammo')[0],
        bombCount: document.getElementById('bomb-count'),
        bombCountLI: statsBar.querySelectorAll('li.bombs')[0],
        missileCount: document.getElementById('missile-count'),
        missileCountLI: statsBar.querySelectorAll('li.missiles')[0]
      };
    })()
  };

  events = {
    resize() {
      refreshCoords();
    },

    mousedown(e) {
      let args;

      if (e.button !== 0 || isMobile || data.isCPU || !data.fuel) return;

      if (!game.data.battleOver) {
        if (!data.autoFlip) {
          flip();
        }
      } else {
        // battle over; determine confetti vs. shrapnel.

        // if clicking a button, don't do anything.
        if (e.target.tagName.match(/a|button/i)) return;

        const ss = game.objects.view.data.screenScale;

        if (game.data.theyWon) {
          // dirty, dirty tricks: overwrite helicopter coordinates.
          data.x =
            e.clientX * (1 / ss) +
            game.objects.view.data.battleField.scrollLeft;
          data.y = e.clientY * (1 / ss);

          const count = 16 + rndInt(16);

          effects.shrapnelExplosion(data, {
            count,
            velocity: 4 + rngInt(4 + count / 4, TYPES.shrapnel),
            // first burst always looks too similar, here.
            noInitialSmoke: true
          });

          effects.smokeRing(exports);

          effects.inertGunfireExplosion({ exports, count: 4 + rndInt(4) });
        } else {
          args = {
            x:
              e.clientX * (1 / ss) +
              game.objects.view.data.battleField.scrollLeft,
            y: e.clientY * (1 / ss),
            vX: 1 + rndInt(8),
            vY: -rndInt(10),
            width: 1,
            height: 1,
            halfWidth: 1,
            halfHeight: 1,
            isOnScreen: true
          };

          playSound(sounds.balloonExplosion, exports);

          const elementCount = 32 + rndInt(384);

          const options = {
            data: {
              domFetti: {
                colorType: oneOf(['default', 'green', 'yellow', 'grey']),
                elementCount,
                spread: 360,
                startVelocity: 20 + rndInt(elementCount / 12),
                decay: 0.95
              }
            }
          };

          game.objects.domFetti.push(
            domFettiBoom(options, null, args.x, args.y)
          );

          effects.smokeRing(
            { data: args },
            {
              velocityMax: 5,
              count: 8 + rndInt(8)
            }
          );
        }
      }
    }
  };

  objects = {
    bombs: [],
    smartMissiles: []
  };

  exports = {
    animate,
    callAction,
    centerView,
    data,
    dom,
    die,
    eject,
    fire,
    init: initHelicopter,
    objects,
    onLandingPad,
    reactToDamage,
    startRepairing,
    reset,
    refreshCoords,
    flip,
    setBombing,
    setFiring,
    setMissileLaunching,
    setParachuting,
    setRespawning,
    toggleAutoFlip,
    updateFiringRates,
    updateLives,
    updateStatusUI
  };

  // enemy chopper is a bit bigger.
  const defaultWidth = data.isEnemy ? 110 : 100;
  const defaultHeight = data.isEnemy ? 36 : 32;

  const rotatingWidth = 100;
  const rotatingHeight = data.isEnemy ? 42 : 40;

  const spriteConfig = {
    default: {
      getImage: () => {
        return `helicopter${data.isEnemy ? '-enemy' : ''}_#${data.flipped ? '-flipped' : ''}.png`;
      },
      width: defaultWidth,
      height: defaultHeight,
      frameWidth: defaultWidth,
      frameHeight: defaultHeight,
      animationConfig: {
        animationDuration: 1.35,
        loop: true,
        isSequence: true,
        animationFrameCount: 4
      }
    },
    rotating: {
      getImage: () => {
        if (data.isEnemy) return 'helicopter-rotating-enemy_#.png';
        return 'helicopter-rotating_#.png';
      },
      width: rotatingWidth,
      height: rotatingHeight,
      frameWidth: rotatingWidth,
      frameHeight: rotatingHeight,
      // vertical sprite
      animationConfig: {
        animationDuration: 0.7,
        isSequence: true,
        animationFrameCount: 3,
        onEnd: () => {
          // back to default sprite.
          swapSprite(spriteConfig.default, {
            skipFrame: true
          });
        }
      }
    }
  };

  data.domCanvas = {
    radarItem: Helicopter.radarItemConfig(exports),
    img: {
      src: null,
      animationModulus: Math.floor(FPS * (1 / GAME_SPEED) * (1 / 21)), // 1 / 10 = 1-second animation
      frameCount: 0,
      animationFrame: 0,
      animationFrameCount: 0,
      isSequence: true,
      source: {
        x: 0,
        y: 0,
        is2X: true,
        width: 0,
        height: 0,
        frameWidth: 0,
        frameHeight: 0,
        frameX: 0,
        frameY: 0
      },
      target: {
        width: 0,
        height: 0
      }
    }
  };

  function swapSprite(newSprite = spriteConfig.default, options = {}) {
    const props = ['width', 'height', 'frameWidth', 'frameHeight'];
    props.forEach((prop) => {
      data.domCanvas.img.source[prop] = newSprite[prop];
    });
    // assign target width + height based on source frame width + height
    data.domCanvas.img.target.width = newSprite.frameWidth;
    data.domCanvas.img.target.height = newSprite.frameHeight;
    // animation?
    if (newSprite.animationConfig) {
      const { width, height, frameWidth, frameHeight } = newSprite;
      data.domCanvas.animation = common.domCanvas.canvasAnimation(exports, {
        skipFrame: !!options.skipFrame,
        sprite: {
          width,
          height,
          frameWidth,
          frameHeight,
          url: newSprite.getImage(),
          ...newSprite.animationConfig
        },
        // TODO: move this into sprite or something
        useDataAngle: true,
        // TODO: this is also bad and needs moving.
        onEnd: newSprite.animationConfig.onEnd
      });
    }
  }

  swapSprite();

  collision = {
    options: {
      source: exports,
      targets: undefined,
      hit(target) {
        const tData = target.data;
        if (tData.type === TYPES.chain) {
          // special case: chains do damage, but don't kill.
          common.hit(exports, tData.damagePoints, target);
          // and make noise.
          if (sounds.chainSnapping) {
            playSound(sounds.chainSnapping, target);
          }
          if (data.isLocal) {
            reactToDamage(target);
          }
          // should the target die, too? ... probably so.
          common.hit(target, 999, exports);
        } else if (tData.type === TYPES.infantry) {
          // helicopter landed, not repairing, and friendly, landed infantry (or engineer)?
          if (
            data.landed &&
            !data.onLandingPad &&
            data.parachutes < data.maxParachutes &&
            tData.isEnemy === data.isEnemy
          ) {
            // check if it's at the helicopter "door".
            if (collisionCheckMidPoint(target, exports)) {
              // pick up infantry (silently)
              target.die({ silent: true });
              playSound(sounds.popSound, exports);
              if (gamePrefs.bnb) {
                const pickupSound =
                  sounds.bnb[
                    game.data.isBeavis
                      ? 'beavisInfantryPickup'
                      : 'buttheadInfantryPickup'
                  ];
                // only play if not already active, and delay before clearing.
                if (!data.pickupSound)
                  data.pickupSound = playSound(pickupSound, exports, {
                    onfinish: () =>
                      common.setFrameTimeout(
                        () => (data.pickupSound = null),
                        500
                      )
                  });
              }
              data.parachutes = Math.min(
                data.maxParachutes,
                data.parachutes + 1
              );
              updateStatusUI({ parachutes: true });
            }
          }
        } else if (tData.type === TYPES.cloud) {
          cloak(target);
        } else if (
          tData.type === TYPES.superBunker &&
          tData.isEnemy === data.isEnemy &&
          !tData.hostile
        ) {
          // "protect" the helicopter if completely enveloped within the bounds of a friendly super-bunker.
          // this check is added because sometimes the collision logic is imperfect, and fast-moving bombs or missiles might hit the "inner" chopper object. Oops. :D
          data.excludeFromCollision =
            data.y >= tData.y &&
            data.x >= tData.x &&
            data.x + data.width <= tData.x + tData.width;
        } else {
          // hit something else. boom!
          // special case: ensure we crash on the "roof" of a super-bunker.
          if (tData.type === TYPES.superBunker) {
            data.y = Math.min(
              worldHeight -
                (common.ricochetBoundaries[tData.type] || 0) -
                data.height,
              data.y
            );
            // stop falling, too
            data.vY = 0;
            // and go to adjusted position
            moveTo(data.x, data.y);
          }
          die({ attacker: target });
          // should the target die, too? ... probably so.
          common.hit(target, 999, exports);
        }
      }
    },
    items: getTypes(
      'helicopter, superBunker:all, bunker, balloon, tank, van, missileLauncher, chain, infantry:friendly, engineer:friendly, cloud:all',
      { exports }
    )
  };

  // hackish: assign to globals before init
  if (data.isLocal) {
    game.players.local = exports;
  } else if (data.isRemote) {
    game.players.remote.push(exports);

    if (!data.isCPU) {
      // just in case...
      if (game.players.remoteHuman)
        console.warn('WTF game.players.remoteHuman already defined???');

      game.players.remoteHuman = exports;
    }
  }
  if (data.isCPU) {
    // note: not mutually exlusive, can be local (for testing purposes) or remote
    game.players.cpu.push(exports);
  }

  // ensure the UI shows the appropriate unit colours
  if (data.isLocal && data.isEnemy) {
    utils.css.add(document.getElementById('player-status-bar'), 'enemy');
    utils.css.add(document.getElementById('mobile-controls'), 'enemy');
  }

  return exports;
};

Helicopter.radarItemConfig = (exports) => ({
  width: 2.5 * (isiPhone ? 1.33 : 1),
  height: 2.5 * (isiPhone ? 1.33 : 1),
  draw: (ctx, obj, pos, width, height) => {
    if (exports?.data?.cloaked) return;

    const isLocal = exports.data.id === game.players.local.data.id;

    const radarData = exports.data.radarItem?.data;

    if (isLocal && radarData && exports.data.blinkCounter >= 0) {
      // local chopper blinks continuously
      exports.data.blinkCounter++;
      if (exports.data.blinkCounter === exports.data.blinkCounterHide) {
        radarData.visible = !radarData.visible;
      } else if (exports.data.blinkCounter >= exports.data.blinkCounterReset) {
        radarData.visible = !radarData.visible;
        exports.data.blinkCounter = 0;
      }
    }

    // don't draw if not visible.
    if (isLocal && !radarData.visible && !exports.data.respawning) return;

    const scaledWidth = pos.width(width);
    const scaledHeight = pos.heightNoStroke(height);

    // triangle depends on friendly / enemy + flip
    let direction = exports.data.flipped ? 1 : -1;

    if (exports.data.isEnemy) {
      // reverse for the enemy chopper.
      direction *= -1;
    }

    // TODO: review precise helicopter + landing pad alignment
    let left =
      Math.max(
        0 + scaledWidth,
        obj.data.left * game.objects.radar.data.scale -
          game.objects.radar.data.radarScrollLeft
      ) +
      scaledWidth / 2;

    // y offset, plus offset for "summon" transition
    const top =
      obj.data.top +
      (obj?.data?.stepOffset !== undefined
        ? scaledHeight * (1 - obj?.data?.stepOffset)
        : 0);

    // "center" triangle - not precisely...
    left += direction === -1 ? scaledWidth / 2 : -scaledWidth;

    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left + scaledWidth * direction, top + scaledHeight);
    ctx.lineTo(left + scaledWidth * direction, top - scaledHeight);
  }
});

export { Helicopter };
