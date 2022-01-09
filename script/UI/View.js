import {
  common,
  game,
  utils,
  setFrameTimeout,
  tutorialMode,
  worldWidth,
  isMobile,
  screenScale,
  keyboardMonitor,
  isFirefox,
  winloc,
  updateScreenScale,
  applyScreenScale,
  COSTS
} from '../aa.js';

const View = () => {

  let css, data, dom, events, exports;

  const useParallax = winloc.match(/parallax/i);
  const noPause = winloc.match(/noPause/i);

  function setLeftScrollToPlayer(helicopter) {
    const allowOverride = true;
    let x;

    x = helicopter.data.x + (helicopter.data.width * (1 / screenScale)) - game.objects.view.data.browser.halfWidth;

    setLeftScroll(x, allowOverride);
  }

  function setLeftScroll(x, allowOverride) {

    if (allowOverride) {
      data.battleField.scrollLeftVX = 0;
      data.battleField.scrollLeft = x;
    } else {
      // scroll the battlefield by relative amount.
      data.battleField.scrollLeftVX = x;
      data.battleField.scrollLeft = Math.max(-512, Math.min(data.battleField.width - data.browser.halfWidth, data.battleField.scrollLeft + x));
    }
    
    data.battleField.scrollLeftWithBrowserWidth = data.battleField.scrollLeft + data.browser.width;

    // aim for GPU-based scrolling...
    common.setTransformXY(undefined, dom.battleField, `${-data.battleField.scrollLeft}px`, '0px');
    // ... and parallax.
    if (!tutorialMode || (tutorialMode && (!isFirefox || useParallax))) {
      // firefox text rendering really doesn't look nice when translating the stars.
      // TODO: revisit the firefox thing.
      common.setTransformXY(undefined, dom.stars, `${-data.battleField.scrollLeft * data.battleField.parallaxRate}px`, '0px');
    }

  }

  function refreshCoords() {

    updateScreenScale();

    applyScreenScale();

    data.browser.width = (window.innerWidth || document.body.clientWidth) / screenScale;
    data.browser.height = (window.innerHeight || document.body.clientHeight) / screenScale;

    data.browser.eighthWidth = data.browser.width / 8;
    data.browser.fractionWidth = data.browser.width / 3;
    data.browser.halfWidth = data.browser.width / 2;
    data.browser.twoThirdsWidth = data.browser.width * (2 / 3);

    data.world.width = dom.worldWrapper.offsetWidth;
    data.world.height = dom.worldWrapper.offsetHeight;

    data.world.x = 0;
    data.world.y = dom.worldWrapper.offsetTop / screenScale;

    if (!data.battleField.width) {
      // dimensions assumed to be static, can be grabbed once
      // hard-code `battleField` width, instead of measuring.
      data.battleField.width = worldWidth; // dom.battleField.offsetWidth;
      data.battleField.height = dom.battleField.offsetHeight;
      data.topBar.height = dom.topBar.offsetHeight;
    }

    // isOnScreen() references this a lot.
    data.battleField.scrollLeftWithBrowserWidth = data.battleField.scrollLeft + data.browser.width;

    if (dom.stars) {
      // GPU case: Be wide enough to cover parallax scroll effect. browser width + 10% of world width
      dom.stars.style.width = `${data.browser.width + (data.battleField.width * 0.1)}px`;
    }

    // helicopters need to know stuff, too.
    game.objects.helicopters[0]?.refreshCoords();
    game.objects.helicopters[1]?.refreshCoords();

    // hackish: and, radar. force an update so static items like bunkers get repositioned to scale.
    if (game.objects.radar) game.objects.radar.setStale(true);

  }

  function setTipsActive(active) {
    if (data.gameTips.active !== active) {
      data.gameTips.active = active;
      utils.css[active ? 'add' : 'remove'](dom.gameTips, css.gameTips.active);
      if (!data.gameTips.tipsOffset) {
        showNextTip();
      }
    }
  }

  function shuffleTips() {

    let i, j, elements, strings;

    strings = [];

    elements = dom.gameTipsList.getElementsByTagName('span');

    // read all the strings from the live DOM.
    for (i = 0, j = elements.length; i < j; i++) {
      strings[i] = elements[i].innerText;
    }
    
    data.gameTips.tips = utils.array.shuffle(strings);

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
    dom.animationNode = dom.gameTipsList.getElementsByClassName('animation-node')[0];

  }

  function showNextTip() {

    const tips = dom.gameTipNodes;

    // tip 1: initially empty, then the "previous" tip for all subsequent iterations.
    tips[0].innerHTML = !data.gameTips.tipsOffset ? '&nbsp' : data.gameTips.tips[Math.max(0, data.gameTips.tipsOffset - 1)];

    // last tip will be undefined (one beyond .length), render empty if so.
    tips[1].innerHTML = data.gameTips.tips[data.gameTips.tipsOffset] || '&nbsp';

    // clone + replace to restart CSS R->L animation
    dom.gameTipsList.replaceChild(tips[0].cloneNode(true), tips[0]);
    dom.gameTipsList.replaceChild(tips[1].cloneNode(true), tips[1]);

    // and the animation node, too
    dom.gameTipsList.replaceChild(dom.animationNode.cloneNode(true), dom.animationNode);

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

    }

  }

  function setAnnouncement(text, delay) {

    // prevent `undefined` from being rendered. ;)
    text = text || '';

    if (text !== data.gameTips.lastAnnouncement && ((!data.gameTips.hasAnnouncement && text) || (data.gameTips.hasAnnouncement && !text))) {

      utils.css[text ? 'add' : 'remove'](dom.gameTips, css.gameTips.hasAnnouncement);

      dom.gameAnnouncements.innerHTML = text;

      data.gameTips.lastAnnouncement = text;

      if (data.gameTips.announcementTimer) {
        data.gameTips.announcementTimer.reset();
        data.gameTips.announcementTimer = null;
      }

      if (text) {
        // clear after an amount of time, if not -1
        if ((delay === undefined || delay !== -1)) {
          data.gameTips.announcementTimer = setFrameTimeout(setAnnouncement, delay || 5000);
        }
      }

      data.gameTips.hasAnnouncement = !!text;

    }

  }

  function animate() {

    let scrollAmount, mouseDelta;

    // don't scroll if helicopter is respawning, or not moving.
    if (!game.objects.helicopters[0].data.respawning && game.objects.helicopters[0].data.vX !== 0) {

      // is the mouse to the right, or left?
      mouseDelta = (data.mouse.x - data.browser.halfWidth);

      // how much...
      scrollAmount = mouseDelta / data.browser.halfWidth;

      // and scale
      setLeftScroll(scrollAmount * data.maxScroll);

    }

    data.frameCount++;

  }

  function updateFundsUI() {

    // based on funds, update "affordability" bits of UI.
    const playerFunds = game.objects.endBunkers[0].data.funds;

    const nodes = [
      document.getElementById('player-status-bar')
    ];

    if (isMobile) {
      nodes.push(document.getElementById('mobile-controls'));
    }

    const toAdd = [];
    const toRemove = [];

    for (const item in COSTS) {
      if (Object.prototype.hasOwnProperty.call(COSTS, item)) {
        // mark as "can not afford".
        if (playerFunds < COSTS[item].funds) {
          toAdd.push(COSTS[item].css);
        } else {
          toRemove.push(COSTS[item].css);
        }
      }
    }

    nodes.forEach(o => {

      if (toAdd.length) utils.css.add(o, ...toAdd);
      if (toRemove.length) utils.css.remove(o, ...toRemove);

    });

  }

  function getTouchEvent(touchEvent) {
    return data.touchEvents[touchEvent && touchEvent.identifier] || null;
  }

  function registerTouchEvent(touchEvent, options) {

    if (!touchEvent || !touchEvent.identifier) return;

    // keep track of a touch event, and its type.
    const id = touchEvent.identifier;

    data.touchEvents[id] = {
      /*
        type,
        target
      */
    };

    // Object.assign()-like copying of properties.
    for (const option in options) {
      if (Object.prototype.hasOwnProperty.call(options, option)) {
        data.touchEvents[id][option] = options[option];
      }
    }

    const target = options && options.target;

    // special case for UI on buttons.
    if (target && target.nodeName === 'A') {
      utils.css.add(target, 'active');
    }

  }

  function clearTouchEvent(touchEvent) {

    if (!touchEvent || !touchEvent.identifier) return;

    const target = data.touchEvents[touchEvent.identifier].target;

    // special case for UI on buttons.
    if (target && target.nodeName === 'A') {
      utils.css.remove(target, 'active');
    }

    data.touchEvents[touchEvent.identifier] = null;

  }

  function handleTouchStart(targetTouch) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Touch/target
    const target = targetTouch && targetTouch.target;

    // touch should always have a target, but just in case...
    if (target && target.nodeName === 'A') {
      // it's a link; treat as a button. ignore subsequent move events.
      registerTouchEvent(targetTouch, {
        type: 'press',
        target
      });
    } else {
      // allow touchmove() for this one.
      registerTouchEvent(targetTouch, {
        type: 'joystick'
      });
      game.objects.joystick.start(targetTouch);
      // and exit.
      return false;
    }

    // some sort of button - inventory, or helicopter controls.
    let keyMapLabel;
    let keyCode;

    keyMapLabel = target.getAttribute('data-keyMap');
    keyCode = keyboardMonitor.keyMap[keyMapLabel];

    if (keyCode) {
      keyboardMonitor.keydown({
        keyCode
      });
      return true;
    }
    return false;
  }

  function handleTouchEnd(touchEvent) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Touch/target
    const target = touchEvent?.target;

    // was this a "move" (joystick) event? end if so.
    const registeredEvent = getTouchEvent(touchEvent);
    if (registeredEvent?.type === 'joystick') {
      game.objects.joystick.end(touchEvent);
    }

    clearTouchEvent(touchEvent);
    if (!target) return false;

    let keyMapLabel;
    let keyCode;

    // release applicable key.
    keyMapLabel = target.getAttribute('data-keyMap');
    keyCode = keyboardMonitor.keyMap[keyMapLabel];

    if (keyCode) {
      keyboardMonitor.keyup({
        keyCode
      });
      return true;
    }

    return false;
  }

  function addEvents() {

    utils.events.add(window, 'resize', events.resize);
    utils.events.add(document, 'mousemove', events.mousemove);
    utils.events.add(document, 'mousedown', events.touchstart);
    utils.events.add(document, 'touchstart', events.touchstart);
    utils.events.add(document, 'touchmove', events.touchmove);
    utils.events.add(document, 'touchend', events.touchend);
    utils.events.add(window, 'focus', events.focus);
    utils.events.add(window, 'blur', events.blur);

  }

  function initDOM() {

    dom.worldWrapper = document.getElementById('world-wrapper');
    dom.battleField = document.getElementById('battlefield');
    dom.stars = document.getElementById('stars');
    dom.topBar = document.getElementById('top-bar');
    dom.gameTips = document.getElementById('game-tips');
    dom.gameTipsList = document.getElementById('game-tips-list');
    dom.gameAnnouncements = document.getElementById('game-announcements');

  }

  function initView() {

    initDOM();

    addEvents();

    refreshCoords();

    shuffleTips();

    setTipsActive(true);

  }

  css = {
    gameTips: {
      active: 'active',
      hasAnnouncement: 'has-announcement'
    }
  };

  data = {
    frameCount: 0,
    ignoreMouseEvents: false,
    browser: {
      width: 0,
      eighthWidth: 0,
      fractionWidth: 0,
      halfWidth: 0,
      twoThirdsWidth: 0,
      height: 0
    },
    mouse: {
      x: 0,
      y: 0
    },
    touch: {
      x: 0,
      y: 0,
    },
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
    maxScroll: 6
  };

  dom = {
    battleField: null,
    stars: null,
    topBar: null,
    gameTips: null,
    gameTipsList: null,
    gameTipNodes: null,
    animationNode: null,
    gameAnnouncements: null
  };

  events = {

    blur() {

      if (noPause) return;

      game.pause();

    },

    focus() {

      game.resume();

    },

    mousemove(e) {
      if (!data.ignoreMouseEvents) {
        data.mouse.x = e.clientX / screenScale;
        data.mouse.y = e.clientY / screenScale;
      }
    },

    touchstart(e) {
      // if the paused screen is showing, resume the game.
      if (game.data.paused) {
        game.resume();
      }
      const touch = e.touches?.[0];
      let i, j;
      const targetTouches = e.targetTouches;
      let result;
      let handledResult;
      if (targetTouches) {
        for (i = 0, j = targetTouches.length; i < j; i++) {
          result = handleTouchStart(targetTouches[i], e);
          if (result) {
            handledResult = true;
            e.preventDefault();
          }
        }
      }
      // mouse equivalent - set only if a button wasn't hit.
      if (!handledResult && touch && !data.ignoreMouseEvents) {
        data.touch.x = touch.clientX;
        data.touch.y = touch.clientY;
      }
    },

    touchmove(e) {
      // primitive handling: take the first event.
      const touch = e.changedTouches?.[0];

      // just in case.
      if (!touch) return true;

      // if this event was registered at touchstart() as not a "move", ignore.
      const registeredEvent = getTouchEvent(touch);

      if (registeredEvent?.type !== 'joystick') {
        return false;
      }

      if (!data.ignoreMouseEvents) {
        // relative to coordinates of origin
        game.objects.joystick.move(touch);
        e.preventDefault();
      }

      return false;
    },

    touchend(e) {
      let i, j;
      const changed = e.changedTouches;
      if (changed) {
        for (i = 0, j = changed.length; i < j; i++) {
          handleTouchEnd(changed[i], e);
        }
      }
    },

    resize() {
      // throttle?
      refreshCoords();
      game.objects.gameLoop.resetFPS();
    }

  };

  initView();

  exports = {
    animate,
    data,
    dom,
    events,
    setAnnouncement,
    setLeftScroll,
    setLeftScrollToPlayer,
    updateFundsUI
  };

  return exports;

};

export { View };