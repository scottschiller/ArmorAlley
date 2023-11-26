import { gameType, keyboardMonitor, prefsManager } from '../aa.js';
import {
  clientFeatures,
  FPS,
  FRAMERATE,
  GAME_SPEED,
  oneOf,
  searchParams,
  TYPES,
  updateClientFeatures
} from '../core/global.js';
import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import {
  COSTS,
  forceZoom,
  forceTransform,
  isChrome,
  isSafari,
  debug,
  isMobile,
  isFirefox,
  worldWidth,
  worldOverflow,
  winloc,
  defaultMissileMode,
  rubberChickenMode,
  bananaMode
} from '../core/global.js';
import { sprites } from '../core/sprites.js';
import { gameMenu } from './game-menu.js';
import { net } from '../core/network.js';
import { gamePrefs } from './preferences.js';
import { handleOrientationChange } from './mobile.js';

const noDelayedInput = winloc.match(/noDelayedInput/i);
const ignoreTouch = 'data-ignore-touch';

const DBL_TOUCH_MIN_TIME = 16;
const DBL_TOUCH_MAX_TIME = 333;
const DBL_TOUCH_MAX_DELTA = 16;

function isFastEnough(t1, t2) {
  return (
    t1 &&
    t2 &&
    Math.abs(t1.screenX - t2.screenX) <= DBL_TOUCH_MAX_DELTA &&
    Math.abs(t1.screenY - t2.screenY) < DBL_TOUCH_MAX_DELTA
  );
}

function dropOff(x) {
  // x from 0 to 1 returns from 1 to 0, with in-out easing.
  // https://stackoverflow.com/questions/30007853/simple-easing-function-in-javascript/30007935#30007935
  // Wolfram alpha graph: http://www.wolframalpha.com/input/?i=plot%20%28cos%28pi*x%29%20%2B%201%29%20%2F%202%20for%20x%20in%20%280%2C1%29
  return (Math.cos(Math.PI * x) + 1) / 2;
}

const easing = {
  // hat tip: https://gizma.com/easing
  quart: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
  quad: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
};

// TOOD: clean this up. :P
let animateScrollActive;
let animateScrollFrame = 0;
let animateScrollDelta = 0;
const animateScrollFrames = [];
let animateScrollDuration;

let decelerateScrollActive;
let decelerateScrollFrame = 0;
const decelerateScrollFrames = [];
let decelerateScrollDuration;

const View = () => {
  let css, data, dom, events, exports;

  const disableScaling = winloc.match(/noscal/i);
  let noPause = winloc.match(/noPause/i);

  function animateLeftScrollTo(
    scrollX,
    override,
    duration = 3,
    easingMethod = 'quart'
  ) {
    if (animateScrollActive && !override) return;
    animateScrollActive = true;
    animateScrollFrame = 0;
    animateScrollDelta = data.battleField.scrollLeft - scrollX;
    animateScrollDuration = FPS * duration * (1 / GAME_SPEED);

    for (let i = 0; i <= animateScrollDuration; i++) {
      // 1/x, up to 1
      animateScrollFrames[i] =
        data.battleField.scrollLeft -
        easing[easingMethod](i / animateScrollDuration) * animateScrollDelta;
    }

    // Reset local stuff
    // TODO: review, ensure that all of these(?) are needed
    game.players.local.data.scrollLeftVX = 0;
    game.players.local.data.scrollLeft = 0;
    data.battleField.scrollLeftVX = 0;
  }

  function decelerateScroll() {
    if (decelerateScrollActive) return;
    if (game.data.battleOver) return;
    decelerateScrollDuration = FPS * (1 / GAME_SPEED);
    for (let i = 0; i <= decelerateScrollDuration; i++) {
      // 1/x, up to 1
      decelerateScrollFrames[i] = dropOff(i / decelerateScrollDuration);
    }
    decelerateScrollActive = true;
    decelerateScrollFrame = 0;
  }

  function setLeftScrollToPlayer(helicopter) {
    // just to be safe - only local.
    if (!helicopter.data.isLocal) {
      console.warn(
        'setLeftScrollToPlayer(): IGNORING non-local helicopter',
        helicopter
      );
      return;
    }

    const allowOverride = true;
    let x;

    x =
      helicopter.data.x +
      helicopter.data.width * (1 / data.screenScale) -
      data.browser.halfWidth;

    setLeftScroll(x, allowOverride);
  }

  function setLeftScroll(x, allowOverride) {
    // slightly hackish: apply scroll offsets to both game view, and local player.
    if (allowOverride) {
      data.battleField.scrollLeftVX = 0;
      data.battleField.scrollLeft = x;

      if (game.players.local) {
        game.players.local.data.scrollLeftVX = 0;
        game.players.local.data.scrollLeft = x;
      }
    } else {
      // editor case...
      if (game.objects.editor) {
        data.battleField.scrollLeft = x;
        data.battleField.scrollLeftVX = 0;
      } else {
        // scroll the battlefield by relative amount.
        game.players.local.data.scrollLeftVX = 0;
        game.players.local.data.scrollLeft = Math.max(
          -worldOverflow,
          Math.min(
            data.battleField.width - data.browser.halfWidth,
            game.players.local.data.scrollLeft + x
          )
        );

        data.battleField.scrollLeft = Math.max(
          -worldOverflow,
          Math.min(
            data.battleField.width - data.browser.halfWidth,
            data.battleField.scrollLeft + x
          )
        );
        data.battleField.scrollLeftVX = x;
      }
    }

    data.battleField.scrollLeftWithBrowserWidth =
      data.battleField.scrollLeft + data.browser.width;
  }

  function refreshCoords() {
    let width, height;

    /**
     * Various calculations depend on the current screen scale,
     * which is based on screen height. If updated, it will be applied.
     */

    const hasNewScale = updateScreenScale();

    if (isMobile) {
      /**
       * tl;dr, safer(?) to measure a w/h 100% <div> on iOS Safari.
       * It seems there's some inconsistency in measuring window w/h
       * following an `orientationchange` event on iOS Safari.
       *
       * Introducing a delay helped, but that's undesirable.
       * This may be connected to the browser UI, address bar etc.
       * Most likely, I'm just doing something wrong. :X
       */
      const { aa } = dom;
      if (!aa) {
        console.warn('refreshCoords(): WTF no AA?');
        return;
      }
      width = aa.offsetWidth;
      height = aa.offsetHeight;
    } else {
      width = window.innerWidth;
      height = window.innerHeight;
    }

    data.browser.width = width / data.screenScale;
    data.browser.height = height / data.screenScale;

    data.browser.eighthWidth = data.browser.width / 8;
    data.browser.fractionWidth = data.browser.width / 3;
    data.browser.halfWidth = data.browser.width / 2;
    data.browser.twoThirdsWidth = data.browser.width * (2 / 3);

    data.world.width = dom.worldWrapper.offsetWidth;
    data.world.height = dom.worldWrapper.offsetHeight;

    data.world.x = 0;
    data.world.y = dom.worldWrapper.offsetTop / data.screenScale;

    data.browser.screenWidth = width;
    data.browser.screenHeight = height;

    // avoid redundant work during gameplay.
    if (game.started && !hasNewScale) return;

    applyScreenScale();

    if (dom.logo) {
      // $$$
      // TODO: DRY + review, optimize

      const wrapperWidth =
        document.getElementById('game-menu-wrapper').offsetWidth;

      const minWidth = 1400;

      // no smaller than this
      const minScale = 0.25;

      let newScale = 1;

      // portrait?
      if (data.browser.isPortrait && wrapperWidth < 640) {
        // "tiny screen case"
        newScale = 0.475;
      } else {
        newScale =
          wrapperWidth >= minWidth
            ? 1
            : Math.max(minScale, wrapperWidth / minWidth);
      }

      // this applies to `#game-menu`.
      dom.root?.style?.setProperty('--menu-scale', 6 * newScale);
    }

    if (!data.battleField.width) {
      // dimensions assumed to be static, can be grabbed once
      // hard-code `battleField` width, instead of measuring.
      data.battleField.width = worldWidth; // dom.battleField.offsetWidth;
      data.battleField.height = dom.battleField.offsetHeight;
      data.topBar.height = dom.topBar.offsetHeight;
    }

    data.battleField.scrollLeftWithBrowserWidth =
      data.battleField.scrollLeft + data.browser.width;

    // helicopters need to know stuff, too.
    game.players.helicopter?.forEach?.((helicopter) =>
      helicopter.refreshCoords()
    );

    // hackish: and, radar. force an update so static items like bunkers get repositioned to scale.
    if (game.objects.radar) game.objects.radar.setStale(true);

    if (isMobile && game.objects.joystick) {
      // attempt to reset and reposition.
      game.objects.joystick.reset();
      game.players.local.centerView();
    }

    game.objects.starController?.resize();
  }

  function setTipsActive(active) {
    if (data.gameTips.active !== active) {
      data.gameTips.active = active;
      utils.css.addOrRemove(dom.gameTips, active, css.gameTips.active);
      if (!data.gameTips.tipsOffset) {
        showNextTip();
      }
    }
  }

  function shuffleTips() {
    let i, j, elements, strings;

    strings = [];

    elements = dom.gameTipsList.getElementsByTagName('li');

    // read all the strings from the live DOM.
    for (i = 0, j = elements.length; i < j; i++) {
      strings[i] = elements[i].innerText;
    }

    data.gameTips.tips = utils.array.shuffle(strings);

    // dirty, dirty tricks: #game-tips-list is a `<ul>` in static HTML, but we're not rendering that way.
    const newListNode = document.createElement('div');
    const newListId = dom.gameTipsList.id;

    // ul -> div
    dom.gameTipsList.parentNode.replaceChild(newListNode, dom.gameTipsList);

    // re-assign id, and re-"get"
    newListNode.id = newListId;
    dom.gameTipsList = sprites.getWithStyle(newListNode.id);

    // replace the source material with placeholders for rendering, and an invisible element which drives the CSS animation loop.
    // CSS `onanimationend()` is used to show the next tip.
    dom.gameTipsList.innerHTML = [
      '<div class="animation-node">&nbsp;</div>',
      '<div class="tip"></div>',
      '<div class="tip"></div>'
    ].join('');

    refreshTipDOM();
  }

  function refreshTipDOM() {
    dom.gameTipNodes = dom.gameTipsList.getElementsByClassName('tip');
    dom.animationNode =
      dom.gameTipsList.getElementsByClassName('animation-node')[0];
  }

  function showNextTip() {
    const tips = dom.gameTipNodes;

    // tip 1: initially empty, then the "previous" tip for all subsequent iterations.
    tips[0].innerHTML = !data.gameTips.tipsOffset
      ? '&nbsp'
      : data.gameTips.tips[Math.max(0, data.gameTips.tipsOffset - 1)];

    // last tip will be undefined (one beyond .length), render empty if so.
    tips[1].innerHTML = data.gameTips.tips[data.gameTips.tipsOffset] || '&nbsp';

    // clone + replace to restart CSS R->L animation
    dom.gameTipsList.replaceChild(tips[0].cloneNode(true), tips[0]);
    dom.gameTipsList.replaceChild(tips[1].cloneNode(true), tips[1]);

    // and the animation node, too
    dom.gameTipsList.replaceChild(
      dom.animationNode.cloneNode(true),
      dom.animationNode
    );

    // re-fetch everything we just replaced
    refreshTipDOM();

    // wrap around as needed
    if (data.gameTips.tipsOffset >= data.gameTips.tips.length) {
      data.gameTips.tipsOffset = -1;
    }

    // animation event: a tip has scrolled by.
    dom.animationNode.onanimationend = () => {
      // move first tip node (which just scrolled off to the left) to the end (to the right.)
      // it will then scroll R->L into view as the new tip.
      dom.gameTipsList.appendChild(dom.gameTipNodes[0]);
      refreshTipDOM();

      data.gameTips.tipsOffset++;
      showNextTip();
    };
  }

  function setAnnouncement(text = '', delay = 5000) {
    if (game.data.battleOver) return;

    if (!text) return;

    if (
      text === data.gameTips.lastAnnouncement &&
      data.gameTips.hasAnnouncement
    ) {
      // we've been given the same text as previously; delay, by resetting the timer counter.
      data.gameTips.announcementTimer?.restart();
      return;
    }

    // line break on mobile, portrait; otherwise, space.
    const replacement =
      '<span class="landscape-space-portrait-line-break"></span>';

    text = text.replace(/\n/, replacement);

    // drop smart quotes, they render funny with Da Valencia.
    text = text.replace(/[“”]/g, '"');

    data.gameTips.hasAnnouncement = true;

    dom.gameAnnouncements.innerHTML = text;
    data.gameTips.lastAnnouncement = text;

    if (data.gameTips.announcementTimer) {
      data.gameTips.announcementTimer.reset();
      data.gameTips.announcementTimer = null;
    } else {
      common.setFrameTimeout(() => {
        utils.css.add(dom.gameTips, css.gameTips.hasAnnouncement);
      }, 50);
    }

    if (text) {
      // clear after an amount of time, if not -1
      if (delay !== -1) {
        data.gameTips.announcementTimer = common.setFrameTimeout(
          clearAnnouncement,
          delay
        );
      }
    }
  }

  function clearAnnouncement() {
    if (!data.gameTips.hasAnnouncement || !data.gameTips.announcementTimer)
      return;

    data.gameTips.hasAnnouncement = false;
    data.gameTips.announcementTimer = null;
    data.gameTips.lastAnnouncement = null;

    utils.css.remove(dom.gameTips, css.gameTips.hasAnnouncement);
  }

  function assignMouseInput(player, x, y) {
    // assign to the appropriate helicopter, where it will be picked up.
    player.data.mouse.x = x;
    player.data.mouse.y = y;
  }

  function bufferMouseInput(player) {
    // game must be started.
    if (!game.data.started) return;

    // we must have a local player.
    if (!game.players?.local) return;

    // no input delay - assign latest value immediately.
    if (!net.active) {
      assignMouseInput(game.players.local, data.mouse.x, data.mouse.y);
      return;
    }

    if (!player?.data) {
      console.warn('bufferMouseInput(): WTF no player.data?', player);
      return;
    }

    // ignore while player is dead.
    if (player.data.dead || player.data.respawning) return;

    // tack the latest onto the end of the buffer.
    player.data.mouseHistory.push({
      x: player.data.mouse.delayedInputX,
      y: player.data.mouse.delayedInputY
    });

    // drop the first.
    player.data.mouseHistory.shift();

    // assign half-trip "delayed" value to local mouse object.
    const frameDelay = Math.ceil(net.halfTrip / FRAMERATE);

    // if not overridden, apply the frame delay and "pull back" within the input buffer.
    // prevent delay from escaping array boundaries, too.
    const offset = Math.max(
      0,
      player.data.mouseHistory.length - 1 - (noDelayedInput ? 0 : frameDelay)
    );

    // start from the end, delay / latency pushes us backward.
    const obj = player.data.mouseHistory[offset];

    if (obj) {
      assignMouseInput(player, obj.x, obj.y);
    }

    // get the helicopter data over to the other side.
    sendPlayerCoordinates(player);
  }

  function sendPlayerCoordinates(player) {
    // TODO: separate for human vs. CPUs?

    if (!net.active) return;

    /**
     * Send pending "delayed" local input, immediately over network.
     * Will be applied locally based on `net.halfTrip` timing.
     */

    // this may fire early.
    if (!player) return;

    // this shouldn't happen, but guard: "remote" players receive, not send coordinates.
    if (player.data.isRemote) {
      console.warn('sendPlayerCoordinates(): WTF remote player?', player);
      return;
    }

    // don't send coordinates while dead or respawning, possible false collision.
    if (player.data.dead || player.data.respawning) return;

    // special case: remote CPU chopper.
    if (player.data.isCPU) {
      // hackish: exclude scroll bizness for remote CPU.
      net.sendMessage({
        type: 'RAW_COORDS',
        id: player.data.id,
        x: player.data.x,
        y: player.data.y,
        // for remote CPU helicopters
        vX: player.data.vX,
        vY: player.data.vY
      });

      return;
    }

    // only send if both are non-zero values.
    if (
      !player.data.mouse.delayedInputX &&
      !player.data.mouse.delayedInputY &&
      gamePrefs.lock_step
    ) {
      // in lieu of coords data, used as a lock-step heartbeat of sorts, send a ping.
      net.sendMessage({ type: 'PING' });
      return;
    }

    // send latest x/y to remote
    net.sendMessage({
      type: 'RAW_COORDS',
      id: player.data.id,
      x: player.data.mouse.delayedInputX,
      y: player.data.mouse.delayedInputY,
      // needed by remote helicopter.animate()
      scrollLeft: player.data.scrollLeft,
      scrollLeftVX: player.data.scrollLeftVX
    });
  }

  function animate() {
    let scrollAmount, mouseDelta;

    if (!game.players.local) return;

    if (animateScrollActive) {
      // we're "warping" back to the landing pad for a respawn.
      const override = true;
      setLeftScroll(animateScrollFrames[animateScrollFrame], override);

      animateScrollFrame++;

      if (animateScrollFrame >= animateScrollFrames.length) {
        animateScrollActive = false;
        animateScrollFrame = 0;

        data.scrollLeft = data.isEnemy
          ? common.getLandingPadOffsetX(exports) -
            game.objects.view.data.browser.halfWidth
          : 0;
        data.scrollLeftVX = 0;
      }
    }

    // don't scroll if helicopter is respawning, or not moving.
    if (
      !game.players.local.data.respawning &&
      game.players.local.data.vX !== 0
    ) {
      // TODO: review. This is likely always true for a remote CPU player, playing "locally" via &remoteCPU=1.
      if (game.players.local.data.mouse.x === undefined) return;

      // is the mouse to the right, or left?
      mouseDelta = game.players.local.data.mouse.x - data.browser.halfWidth;

      // how much...
      scrollAmount = mouseDelta / data.browser.halfWidth;

      // and scale

      // special case: slow down battlefield scroll after helicopter dies, then go back to base.
      if (decelerateScrollActive) {
        setLeftScroll(
          scrollAmount *
            data.maxScroll *
            GAME_SPEED *
            decelerateScrollFrames[decelerateScrollFrame]
        );

        decelerateScrollFrame++;
        if (decelerateScrollFrame >= decelerateScrollFrames.length) {
          decelerateScrollFrame = 0;
          decelerateScrollActive = false;
        }
      } else if (!game.players.local.data.dead && !game.data.battleOver) {
        // regular in-game scrolling, live chopper
        setLeftScroll(scrollAmount * data.maxScroll * GAME_SPEED);
      }
    }
  }

  function updateFundsUI() {
    // based on funds, update "affordability" bits of UI.
    const playerFunds = game.objects[TYPES.endBunker][0].data.funds;

    const nodes = [document.getElementById('player-status-bar')];

    if (isMobile) {
      nodes.push(document.getElementById('mobile-controls'));
    }

    const toAdd = [];
    const toRemove = [];

    for (const item in COSTS) {
      // mark as "can not afford".
      if (playerFunds < COSTS[item].funds) {
        toAdd.push(COSTS[item].css);
      } else {
        toRemove.push(COSTS[item].css);
      }
    }

    nodes.forEach((o) => {
      if (toAdd.length) utils.css.add(o, ...toAdd);
      if (toRemove.length) utils.css.remove(o, ...toRemove);
    });
  }

  function getTouchEvent(touchEvent) {
    return data.touchEvents[touchEvent && touchEvent.identifier] || null;
  }

  function registerTouchEvent(touchEvent, options) {
    if (!touchEvent || touchEvent.identifier === undefined) return;

    // keep track of a touch event, and its type.
    const id = touchEvent.identifier;

    data.touchEvents[id] = {
      /* type, target */
    };

    // Object.assign()-like copying of properties.
    for (const option in options) {
      data.touchEvents[id][option] = options[option];
    }

    const target = options && options.target;

    // special case for UI on buttons.
    if (target && target.nodeName === 'A') {
      utils.css.add(target, css.buttonActive);

      // hackish: mobile inventory controls
      if (target.id === 'mobile-show-inventory') {
        toggleMobileInventory();
      } else if (target.id === 'mobile-show-options') {
        utils.css.remove(target, css.buttonActive);
        prefsManager.toggleDisplay();
      }

      // data-keyMap values of interest
      const keyMapLabel = target.getAttribute('data-keyMap');
      const inventoryTypes = [
        'tank',
        'missileLauncher',
        'van',
        'infantry',
        'engineer'
      ];

      if (inventoryTypes.includes(keyMapLabel)) {
        // keep inventory showing for a few seconds
        setMobileInventoryTimer();
      }
    }
  }

  function setMobileInventoryTimer() {
    clearMobileInventoryTimer();

    data.mobileInventoryTimer = common.setFrameTimeout(
      hideMobileInventory,
      gameType === 'tutorial' ? 6000 : 3000
    );
  }

  function hideMobileInventory() {
    data.mobileInventoryActive = false;

    updateMobileInventory();

    clearMobileInventoryTimer();
  }

  function clearMobileInventoryTimer() {
    if (!data.mobileInventoryTimer) return;

    data.mobileInventoryTimer.reset();
    data.mobileInventoryTimer = null;
  }

  function updateMobileInventory() {
    utils.css.addOrRemove(
      dom.mobileControls,
      data.mobileInventoryActive,
      css.inventoryActive
    );

    // weapons are on when inventory is off, etc.
    utils.css.addOrRemove(
      dom.mobileControls,
      !data.mobileInventoryActive,
      css.weaponsActive
    );
  }

  function toggleMobileInventory() {
    data.mobileInventoryActive = !data.mobileInventoryActive;

    updateMobileInventory();

    // if showing, plan to hide it
    if (data.mobileInventoryActive) {
      setMobileInventoryTimer();
    } else {
      clearMobileInventoryTimer();
    }
  }

  function clearTouchEvent(touchEvent) {
    if (!touchEvent || !touchEvent.identifier) return;

    const target = data.touchEvents[touchEvent.identifier]?.target;

    // special case for UI on buttons.
    if (target?.nodeName === 'A') {
      utils.css.remove(target, css.buttonActive);
    }

    data.touchEvents[touchEvent.identifier] = null;
  }

  function hasIgnoreTouch(node) {
    if (!node?.getAttribute) return;

    if (node.getAttribute(ignoreTouch)) return true;

    let hasIgnore;
    do {
      node = node.parentNode;
      hasIgnore = node?.getAttribute?.('data-ignore-touch');
    } while (node.parentNode && !hasIgnore);

    return hasIgnore;
  }

  function handleTouchStart(targetTouch, e) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Touch/target
    const target = targetTouch && targetTouch.target;

    // ignore if prefs menu up
    if (prefsManager.isActive()) return true;

    // explicit "ignore touch" case
    if (target.getAttribute('data-ignore-touch')) return true;

    // sub-par: check all parent nodes in the tree, too.
    // NOTE: this presently applies only when the game is over.
    if (game.data.battleOver && target.parentNode) {
      const hasIgnore = hasIgnoreTouch(target);
      if (hasIgnore) return true;
    }

    // if not "ignore", then prevent default.
    e.preventDefault();

    // touch should always have a target, but just in case...
    if (target && target.nodeName === 'A') {
      // it's a link; treat as a button. ignore subsequent move events.
      registerTouchEvent(targetTouch, {
        type: 'press',
        target
      });
    } else {
      // ignore if the joystick is already active.
      if (game.objects.joystick && !game.objects.joystick.data.active) {
        registerTouchEvent(targetTouch, {
          type: 'joystick'
        });

        game.objects.joystick.start(targetTouch);

        // and exit.
        return false;
      }
    }

    // some sort of button - inventory, or helicopter controls.
    let keyMapValue;
    let keyCode;

    keyMapValue = target.getAttribute('data-keyMap');

    // if no keyMap, just let it continue.
    if (!keyMapValue) return true;

    // if a comma-delimited list (e.g., smart missile types), split into an array and pick one.
    if (keyMapValue.indexOf(',') !== -1) {
      keyMapValue = oneOf(keyMapValue.split(','));
    }

    // hackish: store the active value for when the event ends.
    target.setAttribute('data-activeKeyMap', keyMapValue);

    keyCode = keyboardMonitor.keyMap[keyMapValue];

    if (!keyCode) return false;

    keyboardMonitor.keydown({ keyCode, fromAATouch: true });

    return true;
  }

  function handleTouchEnd(touchEvent, e) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Touch/target
    const target = touchEvent?.target;

    // pass-thru if prefs screen is up
    if (prefsManager.isActive()) return true;

    if (target?.getAttribute('data-ignore-touch')) {
      // easy | hard | extreme link? require two taps, i.e., focus and then click.
      if (utils.css.has(target, 'cta')) {
        if (document.activeElement !== target) {
          // hackish: manually set focus for next time.
          target.focus();
          gameMenu.menuUpdate(touchEvent);
          e.preventDefault();
          return false;
        }
      }
      return true;
    }

    // sub-par: check all parent nodes in the tree, too.
    // NOTE: this presently applies only when the game is over.
    if (game.data.battleOver && target.parentNode) {
      const hasIgnore = hasIgnoreTouch(target);
      if (hasIgnore) return true;
    }

    // always ignore?
    e.preventDefault();

    if (!gameType) {
      // game menu should be showing; maybe reset the description text.
      gameMenu.menuUpdate(touchEvent);
    }

    // was this a "move" (joystick) event? end if so.
    const registeredEvent = getTouchEvent(touchEvent);

    if (registeredEvent?.type === 'joystick') {
      game.objects.joystick.end(touchEvent);
    }

    if (
      !data.ignoreMouseMove &&
      navigator.standalone &&
      registeredEvent?.type === 'press'
    ) {
      /**
       * Extra-special case: touching on gun or bomb controls, etc.,
       * can fire a `mousemove()` on touch end on iOS 17 in a home screen app.
       * If we get to this point, ignore traditional mouse events as a workaround.
       */
      data.ignoreMouseMove = true;
    }

    clearTouchEvent(touchEvent, target);

    if (!target) return false;

    let activeKeyMap;
    let keyCode;

    // release applicable key.
    activeKeyMap = target.getAttribute('data-activeKeyMap');
    keyCode = keyboardMonitor.keyMap[activeKeyMap];

    if (keyCode) {
      keyboardMonitor.keyup({ keyCode });
      return true;
    }

    return false;
  }

  function updateScreenScale() {
    if (disableScaling) return;

    let innerHeight;

    if (isMobile) {
      if (!dom.aa) {
        console.warn('updateScreenScale(): WTF no dom.aa?');
        return;
      }
      innerHeight = dom.aa.offsetHeight;
      dom.aa.offsetHeight;
    } else {
      innerHeight = window.innerHeight;
    }

    let localWorldHeight = 410;

    let newScale;

    // for testing game without any scaling applied
    if (disableScaling) {
      newScale = 1;
    } else {
      newScale = innerHeight / localWorldHeight;
    }

    if (data.screenScale === newScale) return false;

    data.screenScale = newScale;
    return true;
  }

  function applyScreenScale() {
    if (disableScaling) return;

    /**
     * 09/2021: Most browsers perform and look better using scale3d() vs style.zoom.
     * Chrome seems to be the exception, where zoom renders accurately, sharp and performant.
     * Safari 15 still scales and has "fuzzy" text via scale3d(), but style.zoom is slower.
     *
     * 04/2020: It seems `style.zoom` is the way to go for performance, overall.
     * Browsers seem to understand that this means "just magnify everything" in an efficient way.
     *
     * 10/2013: Safari 6.0.5 scales text after rasterizing via transform: scale3d(), thus it looks crap.
     * Using document[element].zoom is OK, however.
     *
     * TESTING
     * Force transform-based scaling with #forceTransform=1
     * Force zoom-based scaling with #forceZoom=1
     */

    // Pardon the non-standard formatting in exchange for legibility.
    if (
      !forceZoom &&
      // URL param: prefer transform-based scaling
      (forceTransform ||
        // Firefox clips some of the world when using style.zoom.
        isFirefox ||
        // Chrome can do zoom, but mentions Safari in its userAgent.
        // Safari does not do well with zoom.
        (!isChrome && isSafari) ||
        // Assume that on mobile, transform (GPU) is the way to go
        isMobile)
    ) {
      if (debug) console.log('using transform-based scaling');

      data.usingZoom = false;

      dom.worldWrapper._style.setProperty(
        'width',
        `${Math.floor(data.browser.screenWidth * (1 / data.screenScale))}px`
      );

      // TODO: consider translate() instead of marginTop here. Seems to throw off mouse Y coordinate, though,
      // and will need more refactoring to make that work the same.
      dom.worldWrapper._style.setProperty(
        'transform',
        `scale3d(${data.screenScale}, ${data.screenScale}, 1)`
      );

      dom.root?.style?.setProperty('--game-scale-transform', data.screenScale);

      dom.worldWrapper._style.setProperty('transform-origin', '0px 0px');
    } else {
      if (debug) console.log('using style.zoom-based scaling');

      data.usingZoom = true;

      // Safari 6 + Webkit nightlies (as of 10/2013) scale text after rasterizing, so it looks bad. This method is hackish, but text scales nicely.
      // Additional note: this won't work in Firefox.
      dom.aa.style.zoom = `${data.screenScale * 100}%`;

      dom.root?.style?.setProperty('--game-scale-zoom', data.screenScale);
    }

    game.objects.funds.updateScale();
  }

  function renderMissileText(character, mode) {
    if (mode === data.missileMode) return character;
    return `<span style="opacity:0.5">${character}</span>`;
  }

  function setMissileMode(mode) {
    if (data.missileMode === mode) return;

    // swap in new class, removing old one
    utils.css.swap(document.getElementById('world'), data.missileMode, mode);

    data.missileMode = mode;

    // determine which letter to highlight.
    // TODO: this is ugly, non-DRY and yuck because it duplicates the markup in `index.html`.
    const html = [
      renderMissileText('X', defaultMissileMode) +
        '<span class="alternate-missiles">',
      renderMissileText('C', rubberChickenMode),
      renderMissileText('B', bananaMode) + '</span>'
    ].join('<span class="divider">|</span>');

    document.querySelector('#stats-bar .missiles .letter-block').innerHTML =
      html;
  }

  function handleChatInput(e) {
    // chat feature requires networking.
    if (!net.active) return;

    if (!data.chatVisible) {
      showChatInput();
    } else {
      // special case: visible, but ESC pressed - bail.
      if (e.keyCode === 27) {
        hideChatInput();
        return;
      }

      events.sendChatMessage();
    }
  }

  function showChatInput() {
    dom.messageBox.style.display = 'block';
    dom.messageInput.focus();
    data.chatVisible = true;
  }

  function hideChatInput() {
    dom.messageInput.blur();
    dom.messageBox.style.display = 'none';
    data.chatVisible = false;
  }

  function addEvents() {
    /**
     * Mouse, touch, window event handlers.
     *
     * NOTE: Touch events should not trigger "legacy" mouse events, provided
     * that preventDefault() is called within the touch event handler.
     *
     * Additionally: Touch events are not exclusive to mobile or tablets.
     * e.g., Dell XPS 13 (laptop) also has a touch-capable screen.
     *
     * tl;dr, attempting detection is unwise; listen for and handle all.
     */
    utils.events.add(document, 'mousemove', events.mousemove);
    utils.events.add(document, 'mousedown', events.touchstart);
    utils.events.add(document, 'mouseup', events.mouseup);
    utils.events.add(document, 'contextmenu', events.contextmenu);

    utils.events.add(document, 'touchstart', events.touchstart);
    utils.events.add(document, 'touchmove', events.touchmove);
    utils.events.add(document, 'touchend', events.touchend);
    utils.events.add(document, 'touchcancel', events.touchend);

    utils.events.add(window, 'resize', events.resize);
    utils.events.add(window, 'focus', events.focus);
    utils.events.add(window, 'blur', events.blur);

    utils.events.add(document, 'dblclick', () => {
      // only do if game isn't paused, prefs modal isn't up etc.
      if (game.data.started && game.data.paused) return;
      game?.players?.local?.toggleAutoFlip();
    });

    utils.events.add(screen?.orientation, 'change', (e) => {
      // mark that we got one of these events
      data.browser.hasOrientationChange = true;
      events.orientationChange(e);

      // iPhone-specific: handling "the notch"
      handleOrientationChange();
    });

    utils.events.add(dom.messageForm, 'submit', events.sendChatMessage);
  }

  function initDOM() {
    dom.worldWrapper = sprites.getWithStyle('world-wrapper');
    dom.aa = document.getElementById('aa');
    dom.battleField = sprites.getWithStyle('battlefield');
    dom.gameMenu = document.getElementById('game-menu-wrapper');
    dom.logo = document.getElementById('logo');
    dom.topBar = sprites.getWithStyle('top-bar');
    dom.gameTips = sprites.getWithStyle('game-tips');
    dom.gameTipsList = sprites.getWithStyle('game-tips-list');
    dom.gameAnnouncements = sprites.getWithStyle('game-announcements');
    dom.mobileControls = document.getElementById('mobile-controls');
    dom.messageBox = document.getElementById('message-box');
    dom.messageForm = document.getElementById('message-form');
    dom.messageInput = document.getElementById('message-form-input');
    dom.root = document.querySelector(':root');

    // TODO: improve and clean up.
    // maybe remove nodes if not on mobile.
    if (isMobile) {
      updateMobileInventory();
    } else {
      dom.mobileControls.remove();
      dom.mobileControls = null;
    }

    if (searchParams.get('noLogo')) {
      // special case for recording homepage video (demo)
      dom.logo.style.visibility = 'hidden';
    }
  }

  function initView() {
    initDOM();

    addEvents();

    refreshCoords();

    shuffleTips();

    setTipsActive(true);

    // enable the whole UI, basically.
    dom.aa.style.visibility = 'visible';

    // bring the menu up.
    utils.css.add(dom.gameMenu, css.active);
  }

  css = {
    active: 'active',
    gameTips: {
      active: 'active',
      hasAnnouncement: 'has-announcement'
    },
    buttonActive: 'active',
    inventoryActive: 'inventory_active',
    weaponsActive: 'weapons_active'
  };

  data = {
    noPause,
    ignoreMouseEvents: false,
    ignoreMouseMove: false,
    browser: {
      screenWidth: 0,
      screenHeight: 0,
      width: 0,
      eighthWidth: 0,
      fractionWidth: 0,
      halfWidth: 0,
      twoThirdsWidth: 0,
      height: 0,
      hasOrientationChange: false,
      isPortrait: !!window.screen?.orientation?.type?.match(/portrait/i),
      isLandscape: !!window.screen?.orientation?.type?.match(/landscape/i)
    },
    chatVisible: false,
    mouse: {
      clientX: 0,
      clientY: 0,
      delayedInputX: 0,
      delayedInputY: 0,
      x: 0,
      y: 0
    },
    touch: {
      x: 0,
      y: 0
    },
    touchHistory: [],
    touchEvents: {},
    world: {
      width: 0,
      height: 0,
      x: 0,
      y: 0
    },
    battleField: {
      width: 0,
      scrollLeftWithBrowserWidth: 0,
      height: 0,
      scrollLeft: 0,
      scrollLeftVX: 0,
      parallaxRate: 0.1
    },
    topBar: {
      height: 0
    },
    gameTips: {
      announcementTimer: null,
      active: false,
      hasAnnouncement: false,
      lastText: null,
      tips: [],
      tipsOffset: 0
    },
    marqueeModulus: 1,
    marqueeIncrement: 1,
    maxScroll: 6,
    missileMode: null,
    screenScale: 1,
    usingZoom: null,
    mobileInventoryActive: false,
    mobileInventoryTimer: null
  };

  dom = {
    aa: null,
    animationNode: null,
    battleField: null,
    gameAnnouncements: null,
    gameMenu: null,
    gameTips: null,
    gameTipsList: null,
    gameTipNodes: null,
    logo: null,
    mobileControls: null,
    root: null,
    stars: null,
    topBar: null
  };

  events = {
    blur() {
      if (
        data.noPause ||
        net.active ||
        net.remoteID ||
        (net.connected && net.isHost)
      )
        return;

      game.pause();

      // hackish: reset any lingering touch state.
      data.touchEvents = [];
    },

    focus() {
      game.resume();
    },

    mousemove(e) {
      if (
        data.ignoreMouseEvents ||
        data.ignoreMouseMove ||
        game.players?.local?.data?.dead ||
        game.players?.local?.data?.isCPU
      )
        return;

      if (!net.active) {
        data.mouse.x = e.clientX / data.screenScale;
        data.mouse.y = e.clientY / data.screenScale;

        if (game.objects.editor) {
          game.objects.editor.events.mousemove(e);
        }
      } else {
        // record here; this gets processed within the game loop and put into a buffer.
        data.mouse.delayedInputX = e.clientX / data.screenScale;
        data.mouse.delayedInputY = e.clientY / data.screenScale;

        if (game.players.local) {
          game.players.local.data.mouse.delayedInputX =
            data.mouse.delayedInputX;
          game.players.local.data.mouse.delayedInputY =
            data.mouse.delayedInputY;
        }
      }
    },

    sendChatMessage() {
      const input = dom.messageInput;
      const text = input.value.trim();

      if (text.length) {
        // slash command?
        // NOTE: explicit pass of false, so we send a chat message with this local command call.
        const fromNetwork = false;
        const slashCommand = common.parseSlashCommand(text, fromNetwork);

        if (slashCommand) {
          slashCommand();
        } else {
          net.sendMessage({ type: 'CHAT', text });

          // you only send love letters to your partner, of course.
          const emoji = net.coop ? '💌' : '📮';
          game.objects.notifications.add(
            `${emoji} ${common.basicEscape(text)}`
          );
        }

        input.value = '';
      }

      hideChatInput();

      return false;
    },

    mouseup(e) {
      // editor case
      if (game.objects.editor) return game.objects.editor.events.mouseup(e);
    },

    contextmenu(e) {
      // try to prevent inadvertent context menu actions, e.g., ctrl + left-click.
      // try to cancel / ignore, unless this is on a link.
      if (e.target.nodeName !== 'A' && !e.button) {
        e.preventDefault();
        return false;
      }
    },

    touchstart(e) {
      // editor case
      if (game.objects.editor) return game.objects.editor.events.mousedown(e);

      // if the paused screen is showing, resume the game.
      if (game.data.paused) return game.resume();

      // pass-thru if game menu is showing
      if (!game.data.started) return true;

      if (e?.changedTouches && !clientFeatures.touch) {
        /**
         * "Detecting" touch support appears to be fraught with danger; here be dragons, etc.
         * Thusly, infer from a real event: this is likely a touch event, and not from a mouse.
         */
        updateClientFeatures({ touch: true });
      }

      // double and triple-tap "emulation": mobile "helicopter flip" function
      if (e?.changedTouches?.[0]) {
        const touch = e.changedTouches[0];
        const now = Date.now();

        let h = data.touchHistory;
        let lastTouch = h?.length && h[h.length - 1];

        let isValidDouble, isValidTriple;

        if (lastTouch) {
          const last = lastTouch.touch;
          let delta = now - lastTouch.ts;

          // current target
          let t = touch;

          // we're only interested in double-tap on "open space", at present.
          const ids = /mobile-controls|battlefield/i;

          // restrict touch to IDs, time, and distance.
          if (delta >= DBL_TOUCH_MIN_TIME && delta <= DBL_TOUCH_MAX_TIME) {
            if (
              ids.test(t?.target?.id) &&
              ids.test(last?.target?.id) &&
              isFastEnough(t, last)
            ) {
              // valid double-tap
              isValidDouble = true;

              // now, check triple-tap case
              let lastTouch2 = h?.length >= 2 && h[h.length - 2];
              if (lastTouch2) {
                delta = lastTouch.ts - lastTouch2.ts;
                // allow slightly longer MAX_TIME for third tap
                if (delta < DBL_TOUCH_MAX_TIME * 1.5) {
                  t = lastTouch2.touch;
                  if (isFastEnough(t, last)) {
                    isValidTriple = true;
                  }
                }
              }
            }

            // toggle feature on triple-tap; otherwise, if auto-flip is *off*, then flip manually.
            if (isValidTriple) {
              game?.players?.local?.toggleAutoFlip();
            } else if (isValidDouble && !gamePrefs.auto_flip) {
              game?.players?.local?.flip();
            }
          }
        }

        // always track
        data.touchHistory.push({
          ts: now,
          touch
        });

        // and, constrain history to three items.
        if (data.touchHistory.length > 3) {
          data.touchHistory.shift();
        }
      }

      let i, j;
      const targetTouches = e.targetTouches;

      if (targetTouches) {
        for (i = 0, j = targetTouches.length; i < j; i++) {
          handleTouchStart(targetTouches[i], e);
        }
      } else if (e.target?.getAttribute('data-ignore-touch')) {
        // explicit "ignore touch" case
        return true;
      }

      // always prevent default tap-and-hold, selection and whatnot.
      e.preventDefault();
    },

    touchmove(e) {
      // primitive handling: take the first event.
      const touch = e.changedTouches?.[0];

      // just in case.
      if (!touch) return true;

      // if this event was registered at touchstart() as not a "move", ignore.
      const registeredEvent = getTouchEvent(touch);

      if (registeredEvent?.type !== 'joystick') return false;

      if (!data.ignoreMouseEvents) {
        // relative to coordinates of origin
        game.objects.joystick.move(touch);
        e.preventDefault();
      }

      return false;
    },

    touchend(e) {
      // pass-thru if game menu is showing
      if (!game.data.started) return true;

      let i, j;
      const changed = e.changedTouches;

      if (changed) {
        for (i = 0, j = changed.length; i < j; i++) {
          handleTouchEnd(changed[i], e);
        }
      }
    },

    resize() {
      refreshCoords();

      game.objects.editor?.events?.resize();

      game.objects.gameLoop.resetFPS();
    },

    orientationChange(e) {
      if (!isMobile) return;

      const { type } = e.target;

      // check each independently - don't assume one based on the other.
      const isPortrait = !!type?.match(/portrait/i);
      const isLandscape = !!type?.match(/landscape/i);

      // bail if no change.
      if (
        data.browser.isPortrait === isPortrait &&
        data.browser.isLandscape === isLandscape
      )
        return;

      data.browser.isPortrait = isPortrait;
      data.browser.isLandscape = isLandscape;

      refreshCoords();

      if (isMobile && !game.data.started) {
        // 11/2023: iOS Safari seems to need one more frame to get
        // radar scale right on the home screen - here be dragons.
        window.requestAnimationFrame(refreshCoords);
      }
    }
  };

  initView();

  exports = {
    animate,
    animateLeftScrollTo,
    applyScreenScale,
    bufferMouseInput,
    clearAnnouncement,
    data,
    decelerateScroll,
    dom,
    events,
    handleChatInput,
    isAnimateScrollActive: () => animateScrollActive,
    sendPlayerCoordinates,
    setAnnouncement,
    setLeftScroll,
    setLeftScrollToPlayer,
    setMissileMode,
    updateFundsUI,
    updateScreenScale
  };

  return exports;
};

export { View };
