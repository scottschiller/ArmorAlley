import { game } from '../core/Game.js';
import { EVENTS, gameEvents } from '../core/GameEvents.js';
import { utils } from '../core/utils.js';
import { gameType, keyboardMonitor, screenScale } from '../aa.js';

import {
  trackEnemy,
  bananaMode,
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
  worldHeight
  getTypes
} from '../core/global.js';

import {
  playSound,
  stopSound,
  getSound,
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
  isGameOver,
  objectInView,
  trackObject
} from '../core/logic.js';

import { common } from '../core/common.js';
import { gamePrefs } from '../UI/preferences.js';
import { getLandscapeLayout } from '../UI/mobile.js';
import { domFettiBoom } from '../UI/DomFetti.js';
import { zones } from '../core/zones.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';

const Helicopter = (options = {}) => {

  let css, data, dom, events, objects, collision, radarItem, exports, lastTarget, statsBar;

  function cloak() {

    if (!data.cloaked) {

      utils.css.add(dom.o, css.cloaked);
      utils.css.add(radarItem.dom.o, css.cloaked);

      if (!data.isEnemy && sounds.helicopter.engine) {

        // additional commentary, once fully-cloaked
        common.setFrameTimeout(function() {

          if (!data.cloaked) return;

          const cloakSound = sounds.bnb[(game.data.isBeavis ?'beavisICantSeeAnything' : 'beavisComeOn')];

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

        if (sounds.helicopter.engine.sound) sounds.helicopter.engine.sound.setVolume(sounds.helicopter.engineVolume / 2.5);

      }

    }

    // hackish: mark and/or update the current frame when this happened.
    data.cloaked = game.objects.gameLoop.data.frameCount;

  }

  function uncloak() {

    // hackish: uncloak if a frame or more has passed and we aren't in a cloud.
    if (data.cloaked && data.cloaked !== game.objects.gameLoop.data.frameCount) {

      utils.css.remove(dom.o, css.cloaked);
      utils.css.remove(radarItem.dom.o, css.cloaked);

      if (!data.isEnemy && data.cloakedCommentary && !data.dead) {
        playSoundWithDelay(sounds.bnb.beavisPeekaboo, 250);
      }

      if (!data.isEnemy && sounds.helicopter.engine) {
        if (sounds.helicopter.engine.sound) sounds.helicopter.engine.sound.setVolume(sounds.helicopter.engineVolume);
      }

      data.cloaked = false;
      data.cloakedCommentary = false;

    }

  }

  function centerView() {

    // hack: center on enemy helicopter at all times.
    if (!trackEnemy) return;

    sprites.setTransformXY(undefined, game.objects.view.dom.battleField, `${(data.x - game.objects.view.data.browser.halfWidth) * -1}px`, '0px');

  }

  function updateFuelUI() {

    if (data.isEnemy) return;

    sprites.setTransformXY(undefined, dom.fuelLine, `${-100 + data.fuel}%`, '0px');

    if (data.repairing || tutorialMode) return;

    // hackish: show announcements across 1% of fuel burn process.

    let text;

    if (data.fuel < 33 && data.fuel > 32) {

      text = 'Low fuel ⛽ 🤏 ⚠️';

      game.objects.view.setAnnouncement(text);
      game.objects.notifications.addNoRepeat(text);

    } else if (data.fuel < 12.5 && data.fuel > 11.5) {

      text = 'Fuel critical ⛽ 🤏 😱';

      game.objects.view.setAnnouncement(text);
      game.objects.notifications.addNoRepeat(text);

    } else if (data.fuel <= 0) {

      text = 'No fuel ☠️';

      game.objects.view.setAnnouncement(text);
      game.objects.notifications.addNoRepeat(text);

    }

  }

  function burnFuel() {

    let frameCount, modulus;

    // don't burn fuel in these cases
    if (data.dead || data.repairing) return;

    frameCount = game.objects.gameLoop.data.frameCount;

    modulus = (data.landed ? data.fuelModulus : data.fuelModulusFlying);

    if (frameCount % modulus === 0 && data.fuel > 0) {

      // burn!
      data.fuel = Math.max(0, data.fuel - 0.1);

      // update UI
      updateFuelUI();

    }

  }

  function repairInProgress() {
    return (data.repairing && !data.repairComplete);
  }

  function iGotYouBabe() {

    if (!gamePrefs.sound) return;

    const { iGotYouBabe } = sounds.bnb;

    // determine our start point
    const offsets = [
      0,
      27850, // flute-ish melody: "duh duh, duh duh"
      39899, // guitar riff, "yes! rock!" 🎸🤘
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

    game.objects.notifications.add('🎵 Now playing: “I Got You Babe” 🎸🤘', { noDuplicate: true });

  }

  function startRepairing(landingPad) {

    if (data.repairing) return;

    data.repairing = true;

    // reset "counter" for missiles, etc.
    data.repairFrames = 0;

    if (!data.isEnemy) {

      document.getElementById('spinner').style.display = 'block';

      const welcomeMessage = landingPad.data.welcomeMessage;

      playSound(sounds.repairing);

      if (data.smartMissiles < data.maxSmartMissiles || data.fuel < 33) {

        if (landingPad.data.isKennyLoggins) {

          // welcome to *** THE DANGER ZONE! ***
          playSound(sounds.dangerZone, null);

        } else {

          if (gamePrefs.bnb) {

            if (landingPad.data.isMidway) {
              if (game.data.isBeavis) {
                data.muchaMuchacha = true;
                if (gamePrefs.sound) {
                  game.objects.notifications.add('🎵 Now playing: “Mucha Muchacha” 🇲🇽🪅🍆', { noDuplicate: true });
                  playSound(sounds.bnb.muchaMuchacha, null);
                  common.setVideo('camper', 1.05);
                  utils.css.add(dom.o, css.muchaMuchacha);
                }
              } else {
                iGotYouBabe();
              }
            } else {
              playSound(sounds.bnb.theme, null);
            }

          } else {

            // hit the chorus, if we'll be "a while."

            playSound(sounds.ipanemaMuzak, null, { position: 13700 });
            game.objects.notifications.add('🎵 Now playing: “The Girl From Ipanema” 🎸🤘', { noDuplicate: true });

          }

        }

        game.objects.notifications.add(welcomeMessage, { type: 'landingPad', noDuplicate: true, doubleHeight: true });

      } else if (landingPad.data.isKennyLoggins) {

        // welcome to *** THE DANGER ZONE! ***
        playSound(sounds.dangerZone, null);

      } else if (gamePrefs.bnb) {

        playSound(sounds.bnb.theme, null);

      } else {

        // start from the beginning, if a shorter visit.
        playSound(sounds.ipanemaMuzak, null, { position: 0 });

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

      common.setFrameTimeout(() => {
        playRepairingWrench(repairInProgress, exports);
      }, 500 + rndInt(1500));

      common.setFrameTimeout(() => {
        playImpactWrench(repairInProgress, exports);
      }, 500 + rndInt(1500));

    }

  }

  function stopRepairing() {

    if (!data.repairing || data.isEnemy) {
      // force-reset "complete" flag at this point, regardless
      data.repairing = false;
      data.repairComplete = false;
      return;
    }

    // ensure counters aren't blinking
    utils.css.remove(dom.statusBar.ammoCountLI, css.repairing);
    utils.css.remove(dom.statusBar.bombCountLI, css.repairing);
    utils.css.remove(dom.statusBar.missileCountLI, css.repairing);

    document.getElementById('spinner').style.display = 'none';

    if (sounds.repairing) {
      stopSound(sounds.repairing);
    }

    if (sounds.ipanemaMuzak) {
      stopSound(sounds.ipanemaMuzak);
    }

    if (sounds.dangerZone) {
      stopSound(sounds.dangerZone);
    }

    if (sounds.bnb.theme) {
      stopSound(sounds.bnb.theme);
    }

    if (sounds.bnb.muchaMuchacha) {
      data.muchaMuchacha = false;
      // hackish: ensure we reset any horizontal travel.
      dom.o.style.left = '0px';
      stopSound(sounds.bnb.muchaMuchacha)
      utils.css.remove(dom.o, css.muchaMuchacha);
    }

    if (sounds.bnb.iGotYouBabe) {
      stopSound(sounds.bnb.iGotYouBabe);
    }

    common.setVideo();

    if (data.repairComplete) {
      document.getElementById('repair-complete').style.display = 'none';
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
    const force = updated.force;

    if (force || updated.parachutes) {
      dom.statusBar.infantryCount.innerText = data.parachutes;
    }
    
    if (force || updated.ammo) {
      dom.statusBar.ammoCount.innerText = data.ammo;
      if (updated.ammoComplete) {
        utils.css.remove(dom.statusBar.ammoCountLI, css.repairing);
      }
    }

    if (force || updated.bombs) {
      dom.statusBar.bombCount.innerText = data.bombs;
      if (updated.bombsComplete) {
        utils.css.remove(dom.statusBar.bombCountLI, css.repairing);
      }
    }

    if (force || updated.smartMissiles) {
      dom.statusBar.missileCount.innerText = data.smartMissiles;
      if (updated.smartMissilesComplete) {
        utils.css.remove(dom.statusBar.missileCountLI, css.repairing);
      }
    }

    let mobileControls;
    let mobileControlItems;

    if (isMobile) {
      mobileControls = document.getElementById('mobile-controls');
      mobileControlItems = mobileControls.querySelectorAll('.mobile-controls-weapons li');
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
      game.objects.funds.setFunds(game.objects[TYPES.endBunker][0].data.funds);
    }

  }

  function updateStatusUI(updated) {

    // ignore enemy repair / updates, but apply player's changes
    if (
      !data.isEnemy
      && (
        updated.funds
        || updated.force
        || updated.ammo
        || updated.bombs
        || updated.smartMissiles
        || updated.parachutes
      )
    ) {
      game.objects.queue.addNextFrame(() => {
        applyStatusUI(updated);
      });
    }

    // fully-repaired?
    if (
      data.repairing
      && !data.repairComplete
      && data.fuel === data.maxFuel
      && data.ammo === data.maxAmmo
      && data.energy === data.energyMax
      && data.bombs === data.maxBombs
      && data.smartMissiles === data.maxSmartMissiles
    ) {

      data.repairComplete = true;

      if (!data.isEnemy) {

        document.getElementById('spinner').style.display = 'none';
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

        if (sounds.bnb.theme) {
          stopSound(sounds.bnb.theme);
        }

        if (sounds.bnb.beavisThankYouDriveThrough) {
          playSound(sounds.bnb.beavisThankYouDriveThrough);
        }

        if (sounds.inventory.end) {
          playSound(sounds.inventory.end);
        }

      }

    }

  }

  function addCSSToAll(nodes, className) {
    for (let i=0, j=nodes.length; i<j; i++) {
      utils.css.add(nodes[i], className);
    }
  }

  function updateInventoryQueue(item) {
    // TODO: this queue and X-of-Y built logic could use a refactoring.
    let dataBuilt, dataCount, dataCountOriginal, dataType, element, type, typeFromElement, isDuplicate, o, oCounter, oLastChild, queue, count;

    queue = document.getElementById('queue');

    dataBuilt = 'data-built';
    dataCount = 'data-count';
    dataCountOriginal = 'data-count-original';
    dataType = 'data-type';

    count = 0;

    function updateBuilt() {
      let built = parseInt(element.getAttribute(dataBuilt), 10) || 1;
      built++;
      element.setAttribute(dataBuilt, built);
    }

    function updateCount() {
      let built, originalCount;
      originalCount = element.getAttribute(dataCountOriginal);
      built = parseInt(element.getAttribute(dataBuilt), 10) || 1;
      const adjustedCount = Math.min(built, originalCount);
      oCounter.innerHTML = `<span class="fraction-wrapper"><sup>${adjustedCount}</sup><em class="fraction">&frasl;</em><sub>${originalCount}</sub></span>`;
    }

    // FIFO-based queue: `item` is provided when something is being queued.
    // otherwise, the first item has finished and can be removed from the queue.
    if (item) {

      // tank, infantry, or special-case: engineer.
      type = item.data.role ? item.data.roles[item.data.role] : item.data.type;

      oLastChild = queue.childNodes[queue.childNodes.length-1];

      // are we appending a duplicate, e.g., two tanks in a row?
      if (oLastChild) {
        typeFromElement = oLastChild.getAttribute(dataType);

        // direct className match, or, engineer special case
        if (typeFromElement === type) isDuplicate = true;

        element = oLastChild;
      }

      if (!isDuplicate) {
        o = document.createElement('div');
        o.className = 'queue-item';

        // special engineer case vs. others.
        o.setAttribute(dataType, type);

        // tank -> T etc.
        o.innerHTML = type.charAt(0).toUpperCase();

        oCounter = document.createElement('div');
        oCounter.className = 'counter';

        o.appendChild(oCounter);

        queue.appendChild(o);

        element = o;
      }

      oCounter = element.getElementsByClassName('counter')[0];

      // active tracking counter: how many to build (decremented as builds happen)
      count = (parseInt(element.getAttribute(dataCount), 10) || 0) + 1;

      element.setAttribute(dataCount, count);

      // how many have been built - always starting with 1
      element.setAttribute(dataBuilt, parseInt(element.getAttribute(dataBuilt), 10) || 1);

      // how many have been ordered, always incrementing only
      element.setAttribute(dataCountOriginal, (parseInt(element.getAttribute(dataCountOriginal), 10) || 0) + 1);

      // offset text, if needed
      if (count >= 10) {
        utils.css.add(element, 'over-ten');
      }

      // TODO: fix logic for when to display number vs. fraction, based on `isBuilding`
      // and counting logic - e.g., building tanks, 2/3, and you order another tank. should be 2/4.
      if (utils.css.has(element, 'building')) {
        // show the fraction
        updateCount();
      } else {
        // show the number to build
        oCounter.innerHTML = count;
      }
      
      common.setFrameTimeout(() => {
        // transition in
        utils.css.add(o, 'queued');
        // show or hide
        if (count > 1) {
          utils.css.add(element, 'has-counter');
        } else {
          utils.css.remove(element, 'has-counter');
        }
      }, 128);

      // return callbacks for when building starts and finishes.
      return {
        onOrderStart() {
          utils.css.add(o, 'building');
          count = (parseInt(element.getAttribute(dataCount), 10) || 1);

          // first unit being built?
          if (!isDuplicate) {
            updateCount();
            return;
          }

          // decrement and update, x/y
          count--;
          element.setAttribute(dataCount, count);
          updateCount();
        },
        onOrderComplete() {
          // mark as complete once all have been built.
          updateBuilt();

          // not "complete" until count is 0
          count = (parseInt(element.getAttribute(dataCount), 10) || 1) - 1;
          if (count) return;

          // show the raw digit
          oCounter.innerHTML = element.getAttribute(dataCountOriginal);

          utils.css.remove(element, 'building');
          utils.css.add(element, 'complete');

          // prevent element leaks
          oCounter = null;
          element = null;
          o = null;
        }
      };

    } else {

      // clear entire queue.
      common.setFrameTimeout(() => {
        addCSSToAll(queue.childNodes, 'collapsing');
        // finally, remove the nodes.
        // hopefully, no race condition here. :P
        common.setFrameTimeout(() => {
          // prevent element leaks
          oCounter = null;
          element = null;
          o = null;
          // TODO: improve.
          queue.innerHTML = '';
        }, 500);
      }, 500);

    }
  
  }

  function repair() {

    const updated = {};

    data.repairFrames++;

    data.fuel = Math.min(data.maxFuel, data.fuel + 0.4);

    if (data.ammo < data.maxAmmo && data.repairFrames % 2 === 0) {
      data.ammo++;
      updated.ammo = true;
      if (data.ammo >= data.maxAmmo) {
        // stop blinking
        updated.ammoComplete = true;
      }
    }

    if (data.repairFrames % 5 === 0) {
      // fix damage (no UI for this)
      data.energy = Math.min(data.energyMax, data.energy + 1);
    }

    if (data.bombs < data.maxBombs && data.repairFrames % 10 === 0) {
      data.bombs++;
      updated.bombs = true;
      if (data.bombs >= data.maxBombs) {
        updated.bombsComplete = true;
      }
    }

    if (data.smartMissiles < data.maxSmartMissiles && data.repairFrames % 200 === 0) {
      data.smartMissiles++;
      updated.smartMissiles = true;
      if (data.smartMissiles >= data.maxSmartMissiles) {
        updated.smartMissilesComplete = true;
      }
    }

    updateFuelUI();
    updateStatusUI(updated);
    sprites.updateEnergy(exports);

    if (data.muchaMuchacha && data.repairFrames % 5 === 0) {
      if (rnd(1) < 0.25) return;

      const { sound } = sounds.bnb.muchaMuchacha;

      if (!sound) return;
      
      // hack: get position and whatnot
      // TODO: fix this
      sound._onTimer();

      // no motion, at first; "ramp up" the action at some point, and stop when finished.
      const offset = sound.position / sound.duration;

      const progress = !sound.playState || offset < 0.25 || offset > 0.9 ? 0 : Math.min(1, sound.position / (sound.duration * 0.66)); 

      data.tiltOffset = plusMinus(rnd(10 * progress));

      if (progress && Math.abs(data.tiltOffset) >= 2) {
        effects.inertGunfireExplosion({ exports, count: 1 + rndInt(1), vY: 3 + rndInt(2) });
      }

      // hackish: horizontal travel.
      dom.o.style.left = (progress === 0 || Math.random() < 0.66 ? 0 : plusMinus(rnd(1))) + 'px';

      // hackish: force update.
      sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`, `rotate3d(0, 0, 1, ${data.tiltOffset}deg)`);
    }

  }

  function checkFacingTarget(target) {

    // ensure the enemy chopper is facing the target before firing.
    if (!target) return;

    // ignore direction and prevent excessive flipping when bombing tanks, or if hidden within a cloud
    if (data.bombing || data.cloaked) return;

    if ((target.data.x + target.data.width) < data.x && data.rotated) {
      rotate();
    } else if ((target.data.x + target.data.width) > data.x && !data.rotated) {
      rotate();
    }

  }

  function setFiring(state) {

    if (state !== undefined && ((!data.onLandingPad || isMobile) || (!state && data.isEnemy))) {
      data.firing = state;
    }

  }

  function setBombing(state) {

    if (state !== undefined && (!data.onLandingPad || (!state && data.isEnemy))) {
      data.bombing = state;
      if (!data.isEnemy) {
        // start or stop immediately, too.
        // TODO: setting this breaks enemy helicopter bombing.
        data.bombFrameCount = parseInt(data.bombModulus / 2, 10);
      }
    }

  }

  function setMissileLaunching(state) {
    data.missileLaunching = state;
  }

  function setParachuting(state) {
    data.parachuting = state;
  }

  function setRespawning(state) {

    const force = true;

    data.respawning = state;

    // initial respawning CSS
    if (state) {

      if (data.isEnemy) {

        // hackish: force enemy helicopter to be on-screen when respawning
        // this helps ensure it animates up from the landing pad properly

        sprites.updateIsOnScreen(exports, force);

      } else {

        // local player? move the view back to zero.

        // hackish: hard reset battlefield scroll
        game.objects.view.data.battleField.scrollLeft = 0;

        game.objects.view.data.battleField.scrollLeftWithBrowserWidth = game.objects.view.data.browser.width;

        // "get to the choppa!" (center the view on it, that is.)
        game.objects.view.setLeftScrollToPlayer(exports);

        sprites.moveWithScrollOffset(exports);

        // good time to do some DOM pruning, etc.
        if (game.objects.queue) {
          game.objects.queue.process();
        }

      }

      // hackish: force-refresh, so helicopter can be hit while respawning.
      zones.refreshZone(exports);
      
      utils.css.add(dom.o, css.respawning);

    } else {

      utils.css.remove(dom.o, css.respawning);

    }

    // hackish: include a pixel offset when the game is starting, so helicopter rises correctly from landing pad.
    const respawningActiveCSS = !data.dieCount ? [css.respawningActive, css.respawningFirstTime] : [css.respawningActive];

    // transition, helicopter rises from landing pad
    common.setFrameTimeout(() => {
      if (state) {
        utils.css.add(dom.o, ...respawningActiveCSS);
      } else {
        utils.css.remove(dom.o, ...respawningActiveCSS);
      }
    }, 128);

    // player: restore trailers that may have been removed on die()
    if (!data.isEnemy) {
      initTrailers();
    }

    if (state) {
      // "complete" respawn, re-enable mouse etc.
      // hackish: only do transitionend for human player.
      if (!data.isEnemy) {
        dom.o.addEventListener('transitionend', respawnComplete);
      } else {
        common.setFrameTimeout(respawnComplete, 1500);
      }
    }

  }

  function respawnComplete() {

    if (!data.isEnemy) {
      dom.o.removeEventListener('transitionend', respawnComplete);
    }

    setRespawning(false);

    if (data.isEnemy) {
      data.vY = -1;
    }
  }

  function rotate(force) {

    // flip the helicopter so it's pointing R-L instead of the default R/L (toggle behaviour)

    // if not dead or landed, that is.
    if (!force && (data.respawning || data.landed || data.onLandingPad || data.dead || data.y <= 0)) return;

    if (data.rotated) {
      // going back to L->R
      utils.css.remove(dom.o, css.facingLeft);
      utils.css.remove(dom.o, css.rotatedLeft);
    } else {
      utils.css.remove(dom.o, css.facingRight);
      utils.css.remove(dom.o, css.rotatedRight);
    }

    data.rotated = !data.rotated;

    utils.css.add(dom.o, data.rotated ? css.rotatedLeft : css.rotatedRight);

    if (!data.rotateTimer) {
      data.rotateTimer = common.setFrameTimeout(() => {
        utils.css.remove(dom.o, (data.rotated ? css.rotatedLeft : css.rotatedRight));
        utils.css.add(dom.o, (data.rotated ? css.facingLeft : css.facingRight));
        data.rotateTimer = null;
      }, 333);
    }

    if (!data.isEnemy && !data.autoRotate && sounds.helicopter.rotate) {
      playSound(sounds.helicopter.rotate);
    }

  }

  function applyTilt() {

    if (data.energy <= data.shakeThreshold) {
      data.shakeOffset = rnd(1) * (data.shakeOffsetMax * ((data.shakeThreshold - data.energy) / data.shakeThreshold) * plusMinus());
    } else {
      data.shakeOffset = 0;
    }

    // L -> R / R -> L + forward / backward

    // auto-rotate feature
    if ((data.autoRotate || (!data.isEnemy && isMobile))) {
      if ((data.vX > 0 && data.lastVX < 0 && data.rotated) || (data.vX < 0 && data.lastVX > 0 && !data.rotated)) {
        rotate();
      }
    }

    data.tiltOffset = (data.dead || data.respawning || data.landed || data.onLandingPad ? 0 : ((data.vX / data.vXMax) * 12.5) + data.shakeOffset);

    // transform-specific, to be provided to common.setTransformXY() as an additional transform
    data.angle = `rotate3d(0, 0, 1, ${data.tiltOffset}deg)`;

  }

  function onLandingPad(state) {

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
      setFiring(false);
      setBombing(false);

      startRepairing(state);

    } else {

      stopRepairing();

      // only allow repair, etc., once hasLiftOff has been set.
      data.hasLiftOff = true;

    }

  }

  function refreshCoords(fromOrientationEvent) {

    const view = game.objects.view;
    let controlsWidth;
    let landscapeDetail;

    // roughly accurate for iPhone X, 01/2018.
    const notchWidth = 50;

    // determine max X and Y coords
    data.xMax = view.data.battleField.width - data.width;
    data.yMax = view.data.world.height - data.height - 2; // including border

    // if mobile, set xMin and mobileControlsWidth (referenced in animate()) to prevent chopper flying over/under mobile controls.
    if (isMobile) {

      // account for mobile controls, if in landscape mode.
      landscapeDetail = getLandscapeLayout();

      if (landscapeDetail) {

        controlsWidth = parseInt(document.querySelectorAll('#mobile-controls ul')[0].offsetWidth, 10);

        // slight offsets, allow helicopter to be very close to controls.
        // some affordance for The Notch, on iPhone (just assume for now, because FFS.)
        data.xMaxOffset = (controlsWidth * 0.75) + (isiPhone && landscapeDetail === 'right' ? notchWidth : 0);
        data.xMin = (controlsWidth * 0.75) + (isiPhone && landscapeDetail === 'left' ? notchWidth : 0);

      } else {

        // portrait mode: just forget it altogether and let helicopter go atop controls.
        // compensate for half of helicopter width being subtracted, too.
        data.xMaxOffset = (-data.width * 0.5);
        data.xMin = (-data.width * 0.5);

      }

      if (fromOrientationEvent) {
        // pause and see if that's what the user wanted, though.
        game.pause();
      }

    }

    // haaaack
    if (!data.yMin) {
      data.yMin = document.getElementById('game-status-bar').offsetHeight;
    }

  }

  function moveTo(x, y) {

    const yMax = (data.yMax - (data.repairing ? 3 : 0));

    // Hack: limit enemy helicopter to visible screen
    if (data.isEnemy) {
      x = Math.min(worldWidth, Math.max(0, x));
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

    sprites.setTransformXY(exports, dom.o, `${x}px`, `${y}px`, data.angle);

  }

  function moveTrailers() {

    let i, j;

    if (!data.isOnScreen) return;
    if (!dom?.trailers?.length) return;

    for (i = 0, j = data.trailerCount; i < j; i++) {

      // if previous X value exists, apply it
      if (data.xHistory[i]) {
        sprites.setTransformXY(exports, dom.trailers[i], `${data.xHistory[i]}px`, `${data.yHistory[i] + data.halfHeightAdjusted}px`);
        dom.trailers[i]._style.setProperty('opacity', data.dead ? 0 : Math.max(0.25, (i+1) / j));
      }
    }

  }

  function hideTrailers(resetHistory) {

    let i, j;

    if (!dom?.trailers?.length) return;

    // exit if removel pending
    if (data.removeTrailerTimer) return;

    for (i = 0, j = data.trailerCount; i < j; i++) {
      dom.trailers[i]._style.setProperty('transition', 'opacity 0.5s ease-in-out');
      dom.trailers[i]._style.setProperty('opacity', 0);
    }

    if (resetHistory) {
      data.xHistory = [];
      data.yHistory = [];
    }

    data.removeTrailerTimer = common.setFrameTimeout(removeTrailers, 666);

  }

  function removeTrailers() {

    sprites.removeNodeArray(dom.trailers);
    dom.trailers = [];
    data.removeTrailerTimer = null;
    
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
        if (items[k].data.isEnemy !== data.isEnemy && collisionCheck(items[k].data, landingPad.data, xLookAhead)) {
          foundObject = items[k];
          break;
        }
      }
    }

    // something is covering the landing pad - retry shortly.
    if (foundObject) {

      if (!data.isEnemy) {
        noEntry = '<b style="animation: blink 0.5s infinite">⛔</b>';
        game.objects.view.setAnnouncement(`${noEntry} Landing pad obstructed. Waiting for clearance. ${noEntry}`);
      }

      common.setFrameTimeout(reset, 500);

      return;

    } else {

      resetAndRespawn();

    }

  }

  function resetAndRespawn() {

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

    data.vY = 0;
    data.lastVX = 0;

    if (!data.isEnemy) {

      data.vX = 0;
      data.lastVX = 0;

      if (!tutorialMode) {
        game.objects.view.setAnnouncement();
      }

      if (sounds.helicopter.engine?.sound) sounds.helicopter.engine.sound.setVolume(sounds.helicopter.engineVolume);

    } else {

      lastTarget = null;

      data.vX = -8;

      if (data.rotated) {
        rotate();
      }

    }

    // reset any queued firing actions
    data.bombing = false;
    data.firing = false;
    data.missileLaunching = false;
    data.parachuting = false;
    data.shakeOffset = 0;

    utils.css.remove(dom.o, css.exploding);
    utils.css.remove(dom.o, css.dead);

    // reposition on appropriate landing pad
    data.x = common.getLandingPadOffsetX(exports);
    data.y = worldHeight - data.height;

    // ensure tilt angle is reset to 0
    applyTilt();

    // move to landing pad
    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`, data.angle);

    // look ma, no longer dead!
    data.dead = false;
    data.pilot = true;

    radarItem.reset();

    // reset everything.
    updateStatusUI({ force: true });

    sprites.updateEnergy(exports);

    setRespawning(true);

  }

  function respawn() {

    // exit if game is over.
    if (isGameOver()) return;

    // helicopter died. move view, and reset.
    reset();

  }

  function startSound(sound) {

    let soundObject;

    if (!gamePrefs.sound || !sound) return;

    soundObject = getSound(sound);

    if (!soundObject) return;

    if (!data.isEnemy) {

      soundObject.sound.play({
        // TODO: volume is now driven by distance. confirm and clean up.
        // volume: soundObject.options.volume * (soundObject.soundOptions[data.cloaked ? 'offScreen' : 'onScreen'].volume / 100),
        playbackRate: 0.75 + (Math.random() * 0.25)
      });

    } else if (!soundObject.playState) {

      // play with volume based on visibility.
      playSound(sound, exports);

    }

  }

  function die(dieOptions) {

    if (data.dead) return;

    // reset animations
    data.frameCount = 0;

    utils.css.add(dom.o, css.exploding);

    const attacker = dieOptions?.attacker;

    if (!data.isEnemy) {
      reactToDamage(attacker);
    }
    
    if (attacker
      && (
        (attacker.data.type === TYPES.helicopter || attacker.data.type === TYPES.smartMissile)
        || (attacker.data.type === TYPES.gunfire && attacker.data.parentType === TYPES.turret)
      )
    ) {

      // hit by other helicopter, missile, or turret gunfire? special (big) smoke ring.
      effects.smokeRing(exports, {
        count: 20,
        velocityMax: 20,
        offsetY: data.height - 2,
        isGroundUnit: (data.landed || data.onLandingPad || data.bottomAligned),
        parentVX: data.vX,
        parentVY: data.vY
      });

      // special check: friendly turret shot down enemy helicopter
      if (data.isEnemy && attacker.data?.parentType === TYPES.turret && sounds?.bnb?.cornholioAttack) {
        common.setFrameTimeout(() => {
          if (data.dead) return;
          playSound(sounds.bnb.cornholioAttack, attacker, { onplay: () => game.objects.notifications.add(`The enemy was shot down by ${Math.random() >= 0.5 ? 'THE GREAT CORNHOLIO.' : 'THE ALMIGHTY BUNGHOLE.'}`, { noRepeat: true }) });
        }, 1000);
      }

    }

    // extra-special case: player + CPU helicopters collided.
    if (attacker) {

      if (attacker.data.type === TYPES.helicopter) {

        if (!attacker?.data.isEnemy) gameEvents.fire(EVENTS.helicopterCollision);

      } else if (data.isEnemy && attacker.data) {

        // celebrate the win if you, or certain actors take out the enemy chopper while on-screen.
        if (data.isOnScreen && (attacker.data.parentType === TYPES.helicopter || attacker.data.type === TYPES.smartMissile || attacker.data.type === TYPES.balloon)) {
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
      count: 20,
      velocity: 6,
      vX: data.vX,
      vY: data.vY,
      // first burst always looks too similar, here.
      noInitialSmoke: true
    });

    effects.smokeRing(exports, { parentVX: data.vX, parentVY: data.vY });

    effects.inertGunfireExplosion({ exports, count: 8 + rndInt(8) });

    // roll the dice: drop a parachute infantry (pilot ejects safely)
    if ((data.isEnemy && (gameType === 'hard' || gameType === 'extreme' ? Math.random() > 0.5 : Math.random() > 0.25)) || Math.random() > 0.66) {
      deployParachuteInfantry({
        isEnemy: data.isEnemy,
        x: data.x + data.halfWidth,
        y: (data.y + data.height) - 11,
        ignoreShrapnel: true
      });
    }

    common.setFrameTimeout(() => {
      utils.css.add(dom.o, css.dead);
      // undo rotate
      if (data.rotated) {
        rotate(true);
      }
    }, 1500);

    data.energy = 0;

    // ensure any health bar is updated and hidden ASAP
    sprites.updateEnergy(exports);

    hideTrailers(true /* reset x + y history */);

    data.dead = true;

    effects.domFetti(exports, attacker);

    data.dieCount++;

    radarItem.die();

    if (sounds.explosionLarge) {
      playSound(sounds.explosionLarge, exports);
      if (sounds.genericExplosion) playSound(sounds.genericExplosion, exports);
    }

    if (!data.isEnemy && sounds.helicopter.engine) {
      if (sounds.helicopter.engine.sound) sounds.helicopter.engine.sound.setVolume(0);
    }

    // don't respawn the enemy chopper during tutorial mode.
    if (!data.isEnemy || !tutorialMode) {
      common.setFrameTimeout(respawn, (data.isEnemy ? 8000 : 3000));
    }

  }

  function fire() {

    let tiltOffset;
    let frameCount;
    let missileTarget;
    const updated = {};

    frameCount = game.objects.gameLoop.data.frameCount;

    if (!data.firing && !data.bombing && !data.missileLaunching && !data.parachuting) return;

    if (data.firing && frameCount % data.fireModulus === 0) {

      if (data.ammo > 0) {

        // account somewhat for helicopter angle, including tilt from flying and random "shake" from damage
        tiltOffset = (data.tiltOffset !== 0 ? data.tiltOffset * data.tiltYOffset * (data.rotated ? -1 : 1) : 0);

        game.addObject(TYPES.gunfire, {
          parent: exports,
          parentType: data.type,
          isEnemy: data.isEnemy,
          x: data.x + ((!data.isEnemy && data.rotated) || (data.isEnemy && !data.rotated) ? 0 : data.width - 8),
          y: data.y + data.halfHeight + (data.tilt !== null ? tiltOffset + 2 : 0),
          vX: data.vX + (8 * (data.rotated ? -1 : 1) * (data.isEnemy ? -1 : 1)),
          vY: data.vY + (data.isEnemy ? 0 : tiltOffset) // CPU doesn't know how to account for tilt
        });

        startSound(data.isEnemy ? sounds.machineGunFireEnemy : sounds.machineGunFire);


        // TODO: CPU

        data.ammo = Math.max(0, data.ammo - 1);

        if (!data.isEnemy) {

          updated.ammo = true;

        }

      } else if (!data.isEnemy && sounds.inventory.denied) {

        // player is out of ammo.
        playSound(sounds.inventory.denied);

      }

      // SHIFT key still down?
      if (!data.isEnemy && !keyboardMonitor.isDown('shift')) {
        data.firing = false;
      }

    }

    if (data.bombing && data.bombFrameCount % data.bombModulus === 0) {

      if (data.bombs > 0) {

        game.addObject(TYPES.bomb, {
          parent: exports,
          parentType: data.type,
          isEnemy: data.isEnemy,
          x: data.x + data.halfWidth,
          y: (data.y + data.height) - 6,
          vX: data.vX,
          vY: data.vY
        });

        if (sounds.bombHatch) {
          playSound(sounds.bombHatch, exports);
        }

        data.bombs = Math.max(0, data.bombs - 1);

        if (!data.isEnemy) {
          updated.bombs = true;
        }

      } else if (!data.isEnemy && sounds.inventory.denied) {
        // player is out of ammo.
        playSound(sounds.inventory.denied);
      }

      // CTRL key still down?
      if (!data.isEnemy && !keyboardMonitor.isDown('ctrl')) {
        data.bombing = false;
      }

    }

    data.bombFrameCount++;

    if (data.missileLaunching && frameCount % data.missileModulus === 0) {

      if (data.smartMissiles > 0) {

        missileTarget = getNearestObject(exports, { useInFront: true });

        if (missileTarget && !missileTarget.data.cloaked) {

          game.addObject(TYPES.smartMissile, {
            parent: exports,
            parentType: data.type,
            isEnemy: data.isEnemy,
            x: data.x + (data.rotated ? 0 : data.width) - 8,
            y: data.y + data.halfHeight, // + (data.tilt !== null ? tiltOffset + 2 : 0),
            target: missileTarget,
            // special variants of the smart missile. ;)
            isRubberChicken: game.objects.view.data.missileMode === rubberChickenMode && !data.isEnemy,
            isBanana: game.objects.view.data.missileMode === bananaMode && !data.isEnemy
          });

          data.smartMissiles = Math.max(0, data.smartMissiles - 1);

          updated.smartMissiles = true;

        }

      }

      if (!data.isEnemy && (!data.smartMissiles || !missileTarget)) {

        // out of ammo / no available targets
        if (sounds.inventory.denied) {
          playSound(sounds.inventory.denied);
        }

        if (data.smartMissiles && !missileTarget) {
          game.objects.notifications.add('🚀 Missile: No nearby target? 📡 🚫', { noRepeat: true });
        }

      }

    }

    if (data.parachuting && frameCount % data.parachuteModulus === 0) {

      if (data.parachutes > 0) {

        // helicopter landed? Just create an infantry.
        if (data.landed) {

          game.addObject(TYPES.infantry, {
            isEnemy: data.isEnemy,
            // don't create at half-width, will be immediately recaptured (picked up) by helicopter.
            x: data.x + (data.width * 0.75),
            y: (data.y + data.height) - 11,
            // exclude from recycle "refund" / reward case
            unassisted: false
          });

        } else {

          deployParachuteInfantry({
            isEnemy: data.isEnemy,
            x: data.x + data.halfWidth,
            y: (data.y + data.height) - 11
          });

        }

        data.parachutes = Math.max(0, data.parachutes - 1);

        updated.parachutes = true;

        playSound(sounds.popSound2, exports);

      } else if (!data.isEnemy && sounds.inventory.denied) {
        if (game.data.isBeavis || game.data.isButthead) {
          if (!data.bnbNoParachutes) {
            data.bnbNoParachutes = true;
            const { isBeavis } = game.data;
            const playbackRate = isBeavis ? 1 : 0.85 + (Math.random() * 0.3);
            playSound(isBeavis ? sounds.bnb.beavisGrunt : sounds.bnb.buttheadBelch, null, {
              playbackRate,
              onfinish: () => data.bnbNoParachutes = false
            });
          }
        } else {
          // no more infantry to deploy.
          playSound(sounds.inventory.denied);
        }
      }

    }

    if (updated.ammo || updated.bombs || updated.smartMissiles || updated.parachutes) {
      updateStatusUI(updated);
    }
  }

  function eject() {

    // bail!
    if (!data.dead && data.pilot) {

      deployParachuteInfantry({
        x: data.x + data.halfWidth,
        y: (data.y + data.height) - 11
      });

      if (!tutorialMode) {
        game.objects.view.setAnnouncement('No pilot');
        game.objects.notifications.add('You found your helicopter’s “eject” button. 😱 ☠️');
      }

      data.pilot = false;

      playSound(game.data.isBeavis ? sounds.bnb.beavisEjectedHelicopter : sounds.bnb.buttheadEjectedHelicopter, exports);

    }

  }

  function deployParachuteInfantry(options) {

    /**
     * mid-air deployment: check and possibly become the chaff / decoy target for "vulnerable"
     * smart missiles that have just launched, and have not yet locked onto their intended target.
     * in the original game, the enemy helicopter would use this trick to distract your missiles.
     */

    const pi = game.addObject(TYPES.parachuteInfantry, options);
    
    // now, maybe confuse any nearby smart missiles.
    checkSmartMissileDecoy(pi);

  }

  function checkSmartMissileDecoy(parachuteInfantry) {

    // given the current helicopter, find missiles targeting it and possibly distract them.
    game.objects[TYPES.smartMissile].forEach((missile) => missile.maybeTargetDecoy(parachuteInfantry));

  }

  function ai() {

    /**
     * Rudimentary, dumb smarts. To call this "AI" would be an insult to the AI community. ;)
     * Rule-based logic: Detect, target and destroy enemy targets, hide in clouds, return to base as needed and so forth.
     */

    let deltaX, deltaY, target, result, altTarget, desiredVX, desiredVY, deltaVX, deltaVY, maxY;

    // wait until fully-respawned.
    if (data.respawning) return;

    // ignore if on empty.
    if (data.fuel <= 0) return;

    maxY = 320;

    // low fuel means low fuel. or ammo. or bombs.

    if ((data.fuel < 30 || data.energy < 2 || (!data.ammo && !data.bombs)) && data.energy > 0 && !data.landed && !data.repairing) {

      setFiring(false);
      setBombing(false);

      /**
       * fly toward closest landing pad.
       * rightmost 25% of the battlefield? use own base.
       * otherwise, use "neutral" mid-level base.
       * if you're there and the enemy decides to land,
       * you're going to find yourself in trouble. ;)
       */

      const pads = game.objects[TYPES.landingPad];

      target = pads[pads.length - (data.x > 6144 ? 1 : 2)];

      checkFacingTarget(target);

      // aim for landing pad

      deltaX = target.data.x - data.x;
      deltaY = -4;

      data.vX = deltaX;
      data.vY = deltaY;

      data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
      data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));

      data.lastVX = data.vX;
      data.lastVY = data.vY;

      // are we over the landing pad?

      if (data.x >= target.data.x && data.x + data.width <= target.data.x + target.data.width) {

        data.vX = 0;
        data.vY = 4;

      }

      // only for #trackEnemy case
      centerView();

      return;

    }

    if (data.onLandingPad) {

      if (data.repairComplete) {

        // repair has completed. go go go!
        data.vY = -4;
        data.vX = -data.vXMax;

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

      if (lastTarget.data.dead) {

        // was it a tank? reset tank-seeking mode until next interval.
        if (lastTarget.data.type === TYPES.tank) {
          data.targeting.tanks = false;
        }

        lastTarget = null;

      } else if ((lastTarget.data.type === TYPES.balloon || lastTarget.data.type === TYPES.tank) && lastTarget.data.y > maxY) {

        // flying too low?
        lastTarget = null;

      } else if (lastTarget.data.cloaked) {

        // did the player go behind a cloud?
        lastTarget = null;

      }

    }

    if (!lastTarget) {

      if (data.targeting.clouds) {

        lastTarget = objectInView(data, { items: TYPES.cloud });

        // hack: only go after clouds in the player's half of the field.
        if (lastTarget && lastTarget.data.x > 4096) {
          lastTarget = null;
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

      // is the new target too low?
      // TODO: exclude if targeting player helicopter in extreme mode?
      if (lastTarget && (lastTarget.data.type === TYPES.balloon || lastTarget.data.type === TYPES.helicopter) && lastTarget.data.y > maxY) {
        lastTarget = null;
      }

      if (lastTarget && lastTarget.data.cloaked) {
        lastTarget = null;
      }

    } else if (lastTarget.data.type === 'cloud') {

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

    if (lastTarget?.data && (lastTarget.data.type === TYPES.balloon || lastTarget.data.type === TYPES.helicopter) && (lastTarget.data.y > maxY || data.ammo <= 0)) {
      lastTarget = null;
    }

    if (lastTarget?.data?.cloaked) {
      lastTarget = null;
    }

    /**
     * sanity check: if after all this, there is no target / nothing to do,
     * clouds aren't being targeted and there's a nearby cloud, go for that.
     */

    if (!lastTarget && !data.targeting.clouds) {

      lastTarget = objectInView(data, { items: TYPES.cloud });

      // hack: only go after clouds in the player's half of the field, plus one screen width
      if (lastTarget && lastTarget.data.x > 4096 + game.objects.view.data.browser.width) {
        lastTarget = null;
      }

    }

    // now go after the target.

    target = lastTarget;

    data.lastVX = parseFloat(data.vX);

    if (target && !target.data.dead) {

      // go go go!

      result = trackObject(exports, target);

      if (target.data.type !== TYPES.balloon) {

        if (target.data.type === TYPES.landingPad) {
          result.deltaY = 0;
        }

        /*
        // hack: if target is not a balloon and is bottom-aligned (i.e., a tank), stay at current position.
        if (target.data.bottomAligned) {
          result.deltaY = 0;
        }
        */

      } else {

        setBombing(false);

      }

      // enforce distance limits?
      if (target.data.type === TYPES.balloon || target.data.type === TYPES.helicopter) {

        if (Math.abs(result.deltaX) < 200) {
          result.deltaX = 0;
        }

      }

      desiredVX = result.deltaX;
      desiredVY = result.deltaY;

      deltaVX = Math.abs(data.vX - result.deltaX);

      if (Math.abs(deltaVX) > 1) {
        if (data.vX < desiredVX) {
          data.vX += 1;
        } else {
          data.vX -= 1;
        }
      } else {
        data.vX = 0;
      }

      deltaVY = Math.abs(data.vY - result.deltaY);

      if (Math.abs(deltaVY) > 1) {
        if (data.vY < desiredVY) {
          data.vY += 1;
        } else {
          data.vY -= 1;
        }
      } else {
        data.vY = 0;
      }

      // throttle

      data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
      data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));

      // within firing range?
      if (target.data.type === TYPES.balloon || target.data.type === TYPES.helicopter) {

        if (target.data.type === TYPES.balloon) {

          if (Math.abs(result.deltaX) < 100 && Math.abs(result.deltaY) < 48) {
            setFiring(true);
          } else {
            setFiring(false);
          }

        } else if (Math.abs(result.deltaX) < 100) {

          // shoot at the player

          if (Math.abs(result.deltaY) < 48) {

            setFiring(true);
            setBombing(false);

          } else {

            setFiring(false);

            // bomb the player?
            // TODO: verify that deltaY is not negative.
            if (Math.abs(result.deltaX) < 50 && result.deltaY > 48) {

              setBombing(true);

            } else {

              setBombing(false);

            }

          }

        }

      } else if (target.data.type === TYPES.tank) {

        // targeting a tank? randomize bombing depending on game difficulty.
        // default to 10% chance if no specific gameType match.
        if (Math.abs(result.deltaX) < target.data.halfWidth && Math.abs(data.vX) < 3 && Math.random() > (data.bombingThreshold[gameType] || 0.9)) {
          setBombing(true);
        } else {
          setBombing(false);
        }

      } else {

        // safety case: don't fire or bomb.
        setFiring(false);
        setBombing(false);

      }

    } else {

      // default: go left
      data.vX -= 0.25;

      // and up
      data.vY -= 0.1;

      // and throttle
      data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
      data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));

    }

    /**
     * bonus: cloud-based "stealth bombing" mode
     * if in a cloud and cloaked, not actively targeting tanks/helicopters
     * but targets are passing underneath, bomb away.
     */

    if (data.targeting.clouds && !data.targeting.tanks && data.cloaked && data.bombs) {

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

          setBombing(true);

        } else {

          setBombing(false);

        }

      } else {

        setBombing(false);

      }

    }

    // sanity check
    if (!lastTarget || lastTarget.data.dead || lastTarget.data.type === TYPES.cloud || lastTarget.data.type === TYPES.landingPad) {
      // no need to be firing...
      setFiring(false);
    }

    if (data.vY > 0 && data.y > maxY && (!lastTarget || lastTarget.data.type !== TYPES.landingPad)) {
      // hack: flying too low. limit.
      data.y = maxY;
      data.vY -= 0.25;
    }

    // ensure helicopter is pointing the right way, whether chasing a target or flying
    if (target) {
      checkFacingTarget(target);
    } else {
      if (data.vX < 0 && data.rotated) {
        rotate();
      } else if (data.vX > 0 && !data.rotated) {
        rotate();
      }
    }

    centerView();

  }

  function isOnScreenChange(isOnScreen) {
    if (isOnScreen) {
      // make sure trailers are present, if not already
      initTrailers();
    } else if (data.isEnemy) {
      // helicopter might leave trailers when it dies while on-screen.
      hideTrailers();
    }
  }

  function animate() {

    if (data.respawning) {
      sprites.moveWithScrollOffset(exports);
      return;
    }

    // move according to delta between helicopter x/y and mouse, up to a max.

    let i, j, view, mouse, jamming, newX, spliceArgs, maxY, yOffset;

    spliceArgs = [i, 1];

    jamming = 0;

    view = game.objects.view;

    if (!data.isEnemy && (data.pilot && data.fuel > 0)) {

      mouse = view.data.mouse;

      // only allow X-axis if not on ground...
      if (mouse.x) {
        // accelerate scroll vX, so chopper nearly matches mouse when scrolling
        data.lastVX = parseFloat(data.vX);
        // eslint-disable-next-line no-mixed-operators
        data.vX = (view.data.battleField.scrollLeft + (view.data.battleField.scrollLeftVX * 9.5) + mouse.x - data.x - data.halfWidth) * 0.1;
        // and limit
        data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
      }

      if (mouse.y) {
        data.vY = (mouse.y - data.y - view.data.world.y - data.halfHeight) * 0.1;
        // and limit
        data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));
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
      if (!data.isEnemy) {
        data.vX = 0;
        data.vY = 0;
      }

      moveTo(data.x, data.y);

      data.landed = true;

    } else if (data.vY < 0 && (data.landed || data.onLandingPad)) {

      // once landed, only leave once we're moving upward.

      data.landed = false;
      onLandingPad(false);

    } else if (data.onLandingPad) {

      // ensure the helicopter stays aligned with the landing pad.
      data.y = maxY - yOffset;

    }

    if (data.landed && !data.isEnemy) {
      // don't throw bullets with vY, if landed
      data.vY = 0;
    }

    // hack: fade logo.
    if (!data.logoHidden && !data.isEnemy && (tutorialMode || game.data.canHideLogo)) {

      data.logoHidden = true;

      window.requestAnimationFrame(() => {

        let overlay = document.getElementById('world-overlay');
        const world = document.getElementById('world');

        const blurred = 'blurred';
        const noBlur = 'no-blur';

        utils.css.add(overlay, 'fade-out');

        utils.css.add(world, noBlur);

        game.objects.notifications.welcome();

        // remove from the DOM eventually
        common.setFrameTimeout(() => {

          overlay?.remove();
          overlay = null;

          // remove blur / no-blur entirely.
          utils.css.remove(world, blurred);
          utils.css.remove(world, noBlur);

          // and transition, too.
          game.objects.view.dom.worldWrapper.style.transition = '';

          // and reset FPS timings, as this may affect peformance.
          game.objects.gameLoop.resetFPS();

        }, 2000);

      });

    }

    // no fuel?
    if (data.fuel <= 0 || !data.pilot) {

      // gravity until dead.
      if (data.vY < 0.5) {
        data.vY += 0.5;
      } else {
        data.vY *= 1.1;
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

    if (!data.dead) {

      newX = data.x + data.vX;

      // is this near the edge of the screen? limit to near screen width if helicopter is ahead of the scrolling screen.

      if (!data.isEnemy) {
        newX = Math.max(view.data.battleField.scrollLeft + data.halfWidth + data.xMin, Math.min(((view.data.browser.width + view.data.battleField.scrollLeft) - data.xMaxOffset) - (data.width * 1.5), newX));
      }

      moveTo(newX, data.y + data.vY);

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
      fire();
    }

    if (!data.dead && !data.isEnemy) {

      const vans = game.objects[TYPES.van];

      // any enemy vans that are jamming our radar?
      for (i = 0, j = vans.length; i < j; i++) {

        if (!vans[i].data.dead && vans[i].data.isEnemy !== data.isEnemy && vans[i].data.jamming) {

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

    // trailer history
    // push x/y to trailer history arrays, maintain size

    if (data.isOnScreen && game.objects.gameLoop.data.frameCount % data.trailerModulus === 0) {

      data.xHistory.push(data.x);
      data.yHistory.push(data.y);

      if (data.xHistory.length > data.trailerCount + 1) {
        data.xHistory.shift();
        data.yHistory.shift();
      }
    
      moveTrailers();

    }

    burnFuel();

    // TODO: isCPU

    if (data.isEnemy) {

      ai();

      if (game.objects.gameLoop.data.frameCount % data.targetingModulus === 0) {

        // should we target tanks?
        data.targeting.tanks = (Math.random() > 0.65);

        // should we target clouds?
        data.targeting.clouds = (Math.random() > 0.5);

        data.targeting.helicopters = (Math.random() > 0.25 || tutorialMode);

        if (winloc.match(/clouds/i)) {
          // hack/testing: cloud-only targeting mode
          data.targeting.balloons = false;
          data.targeting.tanks = false;
          data.targeting.helicopters = false;
          data.targeting.clouds = true;
        }

        if (debug) {
          console.log(`AI tank targeting mode: ${data.targeting.tanks}, clouds: ${data.targeting.clouds}, helicopters: ${data.targeting.helicopters}`);
        }

      }

    }

    // uncloak if not in a cloud?
    uncloak();

  }

  function reactToDamage(attacker) {

    // extra special case: BnB, and helicopter being hit by shrapnel or enemy gunfire.

    // make a racket, depending
    if (!data.lastReactionSound) {

      data.lastReactionSound = true;

      playSound(sounds.bnb[game.data.isBeavis ? 'beavisScreamShort' : 'buttheadScreamShort'], exports, {
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

    // next section: butthead only
    if (!game.data.isButthead) return;

    // just in case
    if (!attacker) return;

    // already queued?
    if (data.commentaryTimer) return;
    
    data.commentaryTimer = common.setFrameTimeout(() => {

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
        onfinish: function(sound) {
          if (sound.skipped || !isAttackerValid(attacker)) return;
          // "you missed, butt-head."
          common.setFrameTimeout(() => {
            playSound(sounds.bnb.beavisYouMissed, null, {
              onplay,
              onfinish: (sound2) => {
                if (sound2.skipped) return;
                playSoundWithDelay(sounds.bnb.beavisYouMissedResponse, null, { onplay }, 1000);
              }
            });
          }, 5000 + rndInt(2000));
        }
      });

      data.commentaryLastExec = now;

    }, 2000 + rndInt(2000));

  }

  function isAttackerValid(attacker) {

    // "still fighting and in view"
    return !data.dead && !attacker.data.dead && attacker.data.isOnScreen;

  }

  function initTrailers() {

    let i, trailerConfig, fragment;

    // if a removal is pending (i.e., helicopter just went off-screen), wait and try again.
    if (data.removeTrailerTimer) {
      common.setFrameTimeout(initTrailers, 666);
      return;
    }

    // already present
    if (dom.trailers.length) return;

    fragment = document.createDocumentFragment();

    trailerConfig = {
      className: css.trailer
    };

    for (i = 0; i < data.trailerCount; i++) {
      dom.trailers.push(sprites.create(trailerConfig));
      fragment.appendChild(dom.trailers[i]);
    }

    game.dom.battlefield.appendChild(fragment);

  }

  function initHelicopter() {

    if (data.isEnemy) {
      // offset fire modulus by half, to offset sound
      data.frameCount = Math.floor(data.fireModulus / 2);
    }

    dom.o = sprites.create({
      className: css.className + (data.isEnemy ? ` ${css.enemy}` : '')
    });

    dom.o.appendChild(sprites.makeTransformSprite());

    dom.fuelLine = sprites.getWithStyle('fuel-line');

    // if not specified (e.g., 0), assign landing pad position.
    if (!data.x) {
      data.x = common.getLandingPadOffsetX(exports);
    }

    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`, data.angle);

    // for human player: append immediately, so initial game start / respawn animation works nicely
    sprites.updateIsOnScreen(exports);

    setRespawning(true);

    // attach events?

    if (options.attachEvents && !isMobile) {
      const world = document.getElementById('world');
      // TODO: static DOM reference.
      utils.events.add(world, 'mousedown', events.mousedown);
      utils.events.add(world, 'dblclick', events.dblclick);
      utils.events.add(window, 'scroll', e => {
        // don't allow scrolling at all?
        e.preventDefault();
        return false;
      });
    }

    refreshCoords();

    // if not enemy, force-update status bar UI
    if (!data.isEnemy) {
      updateStatusUI({ force: true });
    }

    // note final true param, for respawn purposes
    radarItem = game.objects.radar.addItem(exports, dom.o.className, true);

  }

  css = common.inheritCSS({
    className: TYPES.helicopter,
    facingLeft: 'facing-left',
    facingRight: 'facing-right',
    rotatedLeft: 'rotated-left',
    rotatedRight: 'rotated-right',
    cloaked: 'cloaked',
    muchaMuchacha: 'mucha-muchacha',
    movingLeft: 'moving-left',
    movingRight: 'moving-right',
    tilt: 'tilt',
    repairing: 'repairing',
    respawning: 'respawning',
    respawningFirstTime: 'first-time',
    respawningActive: 'respawning-active',
    inventory: {
      frameCount: 0,
      cost: 20
    },
    unavailable: 'weapon-unavailable',
    trailer: 'helicopter-trailer'
  });

  data = common.inheritData({
    type: TYPES.helicopter,
    angle: 0,
    lastReactionSound: null,
    commentaryTimer: null,
    commentaryLastExec: 0,
    commentaryThrottle: 30000,
    pickupSound: null,
    tiltOffset: 0,
    shakeOffset: 0,
    shakeOffsetMax: 6,
    shakeThreshold: 7,
    bombing: false,
    firing: false,
    respawning: false,
    respawningDelay: 1600,
    missileLaunching: false,
    parachuting: false,
    ignoreMouseEvents: false,
    fuel: 100,
    maxFuel: 100,
    fireModulus: 2,
    bombModulus: 4,
    bombFrameCount: 0,
    fuelModulus: (tutorialMode ? 24 : 8),
    fuelModulusFlying: (tutorialMode ? 9 : 3),
    missileModulus: 12,
    parachuteModulus: 4,
    repairModulus: 2,
    trailerModulus: 2,
    radarJamming: 0,
    repairComplete: false,
    landed: true,
    onLandingPad: true,
    hasLiftOff: false,
    cloaked: false,
    rotated: false,
    rotateTimer: null,
    autoRotate: (options.isEnemy || isMobile),
    repairing: false,
    repairFrames: 0,
    dieCount: 0,
    energy: 10,
    energyMax: 10,
    energyLineScale: 0.25,
    direction: 0,
    pilot: true,
    xMin: 0,
    xMax: null,
    xMaxOffset: 0,
    yMin: 0,
    yMax: null,
    vX: 0,
    vXMax: (options.isEnemy ? 8 : 12),
    vYMax: (options.isEnemy ? 8 : 10),
    lastVX: 0,
    vY: 0,
    vyMin: 0,
    width: 48,
    height: 15,
    halfWidth: 24,
    halfHeight: 7,
    halfHeightAdjusted: 5,
    tilt: null,
    lastTiltCSS: null,
    tiltYOffset: 0.25,
    ammo: (tutorialMode && !options.isEnemy) ? 128 : 64,
    maxAmmo: (tutorialMode && !options.isEnemy) ? 128 : 64,
    bombs: (tutorialMode && !options.isEnemy) ? 30 : 10,
    maxBombs: (tutorialMode && !options.isEnemy) ? 30 : 10,
    parachutes: 1,
    maxParachutes: 5,
    bnbNoParachutes: false,
    smartMissiles: 2,
    maxSmartMissiles: 2,
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
      'easy': 0.9,
      'hard': 0.85,
      'extreme': 0.75,
    },
    y: game.objects.view.data.world.height - 20,
    logoHidden: false
    muchaMuchacha: false,
  }, options);

  data.midPoint = {
    x: data.x + data.halfWidth + 10,
    y: data.y,
    width: 5,
    height: data.height
  };

  statsBar = document.getElementById('stats-bar');

  dom = {
    o: null,
    fuelLine: null,
    statsBar,
    // hackish
    statusBar: {
      infantryCount: document.getElementById('infantry-count'),
      infantryCountLI: statsBar.querySelectorAll('li.infantry-count')[0],
      ammoCount: document.getElementById('ammo-count'),
      ammoCountLI: statsBar.querySelectorAll('li.ammo')[0],
      bombCount: document.getElementById('bomb-count'),
      bombCountLI: statsBar.querySelectorAll('li.bombs')[0],
      missileCount: document.getElementById('missile-count'),
      missileCountLI: statsBar.querySelectorAll('li.missiles')[0],
    },
    trailers: []
  };

  events = {

    resize() {
      refreshCoords();
    },

    mousedown(e) {
      let args;

      if (e.button !== 0 || isMobile || data.isEnemy || !data.fuel) return;

      if (!isGameOver()) {

        if (!data.autoRotate) {
          rotate();
        }

      } else {
        
        args = {
          x: e.clientX * (1 / screenScale) + game.objects.view.data.battleField.scrollLeft,
          y: e.clientY * (1 / screenScale),
          vX: rndInt(10),
          vY: -rndInt(12),
          width: 1,
          height: 1,
          halfWidth: 1,
          halfHeight: 1,
          isOnScreen: true
        };

        // TODO: special case - clean this up
        common.shrapnelExplosion(args, {
          count: rndInt(8) + rndInt(8),
          // don't create identical "clouds" of smoke *at* base.
          noInitialSmoke: true
        });

        playSound(sounds.genericExplosion, exports);

        effects.smokeRing({ data: args }, {
          velocityMax: 8,
          count: 4 + rndInt(4)
        });

      }
    },

    dblclick(e) {
      if (e.button !== 0 || data.ignoreMouseEvents || data.isEnemy || !data.fuel) return;

      // revert to normal setting
      if (data.rotated) rotate();

      // toggle auto-rotate
      data.autoRotate = !data.autoRotate;
    }
  };

  objects = {
    bombs: [],
    smartMissiles: []
  };

  exports = {
    animate,
    data,
    dom,
    die,
    eject,
    fire,
    init: initHelicopter,
    isOnScreenChange,
    objects,
    onLandingPad,
    reactToDamage,
    startRepairing,
    reset,
    refreshCoords,
    rotate,
    setBombing,
    setFiring,
    setMissileLaunching,
    setParachuting,
    setRespawning,
    updateStatusUI,
    updateInventoryQueue
  };

  collision = {
    options: {
      source: exports, // initially undefined
      targets: undefined,
      hit(target) {
        if (target.data.type === 'chain') {
          // special case: chains do damage, but don't kill.
          common.hit(exports, target.data.damagePoints);
          // and make noise.
          if (sounds.chainSnapping) {
            playSound(sounds.chainSnapping, target);
          }
          if (!data.isEnemy) {
            reactToDamage(target);
          }
          // should the target die, too? ... probably so.
          common.hit(target, 999, exports);
        } else if (target.data.type === TYPES.infantry) {
          // helicopter landed, not repairing, and friendly, landed infantry (or engineer)?
          if (data.landed && !data.onLandingPad && data.parachutes < data.maxParachutes && target.data.isEnemy === data.isEnemy) {
            // check if it's at the helicopter "door".
            if (collisionCheckMidPoint(target, exports)) {
              // pick up infantry (silently)
              target.die({ silent: true });
              playSound(sounds.popSound, exports);
              const pickupSound = sounds.bnb[game.data.isBeavis ? 'beavisInfantryPickup' : 'buttheadInfantryPickup'];
              // only play if not already active, and delay before clearing.
              if (!data.pickupSound) data.pickupSound = playSound(pickupSound, exports, { onfinish: () => common.setFrameTimeout(() => data.pickupSound = null, 500) });
              data.parachutes = Math.min(data.maxParachutes, data.parachutes + 1);
              updateStatusUI({ parachutes: true });
            }
          }
        } else if (target.data.type === 'cloud') {
          cloak();
        } else {
          // hit something else. boom!
          // special case: ensure we crash on the "roof" of a super-bunker.
          if (target.data.type === TYPES.superBunker) {
            data.y = Math.min(worldHeight - (common.ricochetBoundaries[target.data.type] || 0) - data.height, data.y);
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
    items: getTypes('helicopter, superBunker, bunker, balloon, tank, van, missileLauncher, chain, infantry:friendly, engineer:friendly, cloud:all', { exports })
  };

  return exports;

};

export { Helicopter }