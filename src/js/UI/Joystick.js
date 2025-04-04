import { utils } from '../core/utils.js';
import { game } from '../core/Game.js';
import { debug } from '../core/global.js';
import { snowStorm } from '../lib/snowstorm.js';

function Joystick(options) {
  let browser, css, data, dom, exports;

  const DEFAULTS = {
    pointer: {
      x: 0.5,
      y: 1
    }
  };

  css = {
    enabled: 'enabled',
    joystick: 'joystick'
  };

  data = {
    active: false,
    isGamepad: null,
    /**
     * Relative "range-to-speed" distances
     *
     * The joystick has an oval shape, so horizontal movement
     * is amplified relative to vertical movement given the
     * game's (usual) widescreen aspect ratio.
     *
     * This could probably be improved to be relative to
     * real screen dimensions, e.g., small mobile portrait screens.
     */
    gamepadWidth: 100,
    gamepadHeight: 100,
    joystickWidth: 256,
    joystickHeight: 128,
    oPointer: null,
    // note: 0-1 here
    last: {
      x: DEFAULTS.pointer.x,
      y: DEFAULTS.pointer.y
    },
    start: {
      x: null,
      y: null
    },
    lastMove: {
      clientX: 0,
      clientY: 0
    },
    pointer: {
      x: DEFAULTS.pointer.x,
      y: DEFAULTS.pointer.y,
      visible: false
    },
    // linear acceleration / deceleration
    easing: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    // these will be set in init, relative to screen dimensions
    x: 0,
    y: 0
  };

  dom = {
    o: null,
    oPoint: null
  };

  const getEvent = (e) => {
    // TODO: improve normalization of touch events.
    const evt =
      (e.changedTouches && e.changedTouches[e.changedTouches.length - 1]) || e;
    return evt;
  };

  function setPointerVisibility(visible) {
    if (data.pointer.visible === visible) return;
    utils.css.addOrRemove(dom.oPointer, visible, css.enabled);
    data.pointer.visible = visible;
  }

  function jumpTo(x, y) {
    // update internal state
    data.x = x * browser.screenWidth;
    data.y = y * browser.screenHeight;

    // other numbers, 0-1
    data.start.x = x;
    data.start.y = y;

    data.pointer.x = x;
    data.pointer.y = y;

    updatePointer();
  }

  function updatePointer() {
    dom.oPointer.style.transform = `translate3d(${
      browser.screenWidth * data.pointer.x
    }px, ${browser.screenHeight * data.pointer.y}px, 0px)`;
  }

  function start(e) {
    // e: mouse event or similar object from gamepad.
    if (!game.data.started) return;

    if (data.active) return;

    data.active = true;

    data.isGamepad = !!e.isGamepad;

    const evt = getEvent(e);

    // set default if not already
    if (data.last.x === null) {
      data.last.x = DEFAULTS.pointer.x;
      data.last.y = DEFAULTS.pointer.y;
    }

    data.start.x = evt.clientX;
    data.start.y = evt.clientY;

    // ensure pointer is visible
    setPointerVisibility(true);

    // stop touch from causing scroll, too?
    if (e.preventDefault) e.preventDefault();
    if (evt.preventDefault) evt.preventDefault();
  }

  function setDirection(x, y) {
    let w = data.isGamepad ? data.gamepadWidth : data.joystickWidth;
    let h = data.isGamepad ? data.gamepadHeight : data.joystickHeight;

    // restrict to screen dimensions
    let newX =
      data.last.x * browser.screenWidth + (x / w) * browser.screenWidth;
    let newY =
      data.last.y * browser.screenHeight + (y / h) * browser.screenHeight;

    // x/y are relative to screen
    data.x = Math.max(0, Math.min(newX, browser.screenWidth));
    data.y = Math.max(0, Math.min(newY, browser.screenHeight));
  }

  function getRelativeXY(x, y) {
    let w = data.isGamepad ? data.gamepadWidth : data.joystickWidth;
    let h = data.isGamepad ? data.gamepadHeight : data.joystickHeight;

    const halfWidth = w / 2;
    const halfHeight = h / 2;

    // move relative to start point
    let relativeX = x - data.start.x;
    let relativeY = y - data.start.y;

    return {
      relativeX,
      relativeY
    };
  }

  function move(e) {
    if (!game.data.started) return;

    // ignore if joystick isn't being dragged.
    if (!data.active) return;

    // ignore while respawning.
    if (data.respawning) return;

    const evt = getEvent(e);

    // referenced by Snowstorm
    data.lastMove.clientX = evt.clientX;
    data.lastMove.clientY = evt.clientY;

    let { relativeX, relativeY } = getRelativeXY(evt.clientX, evt.clientY);

    // set relative velocities based on square.
    setDirection(relativeX, relativeY);

    // snowstorm? send over "mouse move" equivalent
    if (snowStorm.active) {
      snowStorm.mouseMove(evt);
    }
  }

  function stop() {
    if (!game.data.started) return;

    if (!data.active) return;

    data.last.x = data.x / browser.screenWidth;
    data.last.y = data.y / browser.screenHeight;

    data.active = false;
  }

  function addEvents() {
    // for testing from desktop
    if (debug) {
      utils.events.add(document, 'mousedown', start);
      utils.events.add(document, 'mousemove', move);
      utils.events.add(document, 'mouseup', stop);
    }
  }

  function initDOM() {
    // create joystick and inner point.
    dom.o = (options && options.o) || document.body;

    dom.oPointer = document.getElementById('pointer');
  }

  function setInitialPosition() {
    // we should have screen coords, now.
    data.x = DEFAULTS.pointer.x * browser.screenWidth;
    data.y = DEFAULTS.pointer.y * browser.screenHeight;

    // update inner state
    data.pointer.x = DEFAULTS.pointer.x;
    data.pointer.y = DEFAULTS.pointer.y;

    updatePointer();
  }

  function animate() {
    // only move if joystick is active.
    // i.e., stop any animation on release.
    if (!data.active) return;

    dom.oPointer.style.transform = `translate3d(${data.x}px, ${data.y}px, 0px)`;

    // update inner state
    data.pointer.x = data.x / browser.screenWidth;
    data.pointer.y = data.y / browser.screenHeight;

    if (exports.onSetDirection) {
      exports.onSetDirection(data.pointer.x, data.pointer.y);
    }
  }

  function reset() {
    if (exports.onSetDirection) {
      exports.onSetDirection(data.pointer.x, data.pointer.y);
    }

    // update position of pointer, active or not.
    updatePointer();
  }

  function init() {
    browser = game.objects.view.data.browser;

    initDOM();
    addEvents();

    // get initial coords
    setInitialPosition();
  }

  init();

  exports = {
    animate,
    data,
    jumpTo,
    start,
    move,
    reset,
    setPointerVisibility,
    stop
  };

  return exports;
}

export { Joystick };
