/**
 * 🎮 Rough implementation based on Gamepad API spec, with some disclaimers.
 * Gamepad support can vary, per-browser. Here be dragons, etc.
 * https://www.w3.org/TR/gamepad/
 */

import { keyboardMonitor, prefsManager } from '../aa.js';
import { common } from '../core/common.js';
import { game } from '../core/Game.js';
import { FPS } from '../core/global.js';
import { utils } from '../core/utils.js';
import { GamepadManager } from './GamepadManager.js';

// for dev / testing
let gamepadFeature = !!window.location.href.match(/gamepad/i);

// TODO: implement in prefs
let useGamepad = !!gamepadFeature;

// multiply joystick values, more responsiveness
const JOYSTICK_SENSITIVITY = 2;

// middle / "inactive" position in a 9-axis d-pad
const OFFSET_CENTER = 4;

let css = {
  menuActive: 'active',
  buttonActive: 'active'
};

let data = {
  enabled: false,
  gamepadX: 0,
  gamepadY: 0,
  dPadOffset: OFFSET_CENTER,
  state: {
    // hackish: external-facing status
    isFiring: false
  }
};

let dom = {
  controls: null,
  inventory: null
};

// D-pad offset (most controllers have only one)
const DPAD = 0;

// joystick offset: helicopter control
const FLY = 0;

// joystick offset: inventory UI
const MENU = 1;

/**
 * In-game actions, joystick -> keyboard code
 */
const actions = {
  missile: {
    keyCode: () => keyboardMonitor.keyMap.smartMissile
  },
  ammo: {
    keyCode: () => keyboardMonitor.keyMap.shift,
    relatedState: 'isFiring'
  },
  paratrooper: {
    keyCode: () => keyboardMonitor.keyMap.space
  },
  bomb: {
    keyCode: () => keyboardMonitor.keyMap.ctrl
  },
  preferences: {
    keyCode: () => keyboardMonitor.keyMap.esc
  }
};

// shoulder buttons -> helicopter weapons
const shoulderMap = {
  r1: actions.missile,
  r2: actions.ammo,
  l1: actions.paratrooper,
  l2: actions.bomb
};

// ABXY buttons -> helicopter weapons
const abxyMap = {
  bottom: actions.bomb,
  left: actions.ammo,
  up: actions.paratrooper,
  right: actions.missile
};

function updateAA() {
  // AA-specific implementation of gamepad
  if (!gamepadFeature || !useGamepad) return;

  // PS4 / standard: 'options' - NES30Pro, 'select'
  if (
    (gamepadState.buttons.options || gamepadState.buttons.select) &&
    !lastGamepadState.buttons.options
  ) {
    prefsManager.show();
  }

  // Joystick: Helicopter controls

  // previous
  let lastX = lastGamepadState.joysticks[FLY].x;
  let lastY = lastGamepadState.joysticks[FLY].y;

  // current
  let curX = gamepadState.joysticks[FLY].x;
  let curY = gamepadState.joysticks[FLY].y;

  let width = game.objects.joystick.data.screenWidth / 2;
  let height = game.objects.joystick.data.screenHeight / 2;

  let startX = game.objects.view.data.browser.isLandscape ? width : height;
  let startY = game.objects.view.data.browser.isLandscape ? height : width;

  if ((lastX != 0 || lastY != 0) && curX == 0 && curY == 0) {
    // only stop once
    game.objects.joystick?.end?.();
  } else if (curX != 0 || curY != 0) {
    if (lastX == 0 && lastY == 0) {
      // "start" moving
      game.objects.joystick?.start?.({
        clientX: startX,
        clientY: startY,
        hidden: true
      });
    } else {
      // move relative to joystick
      data.gamepadX += curX * JOYSTICK_SENSITIVITY;
      data.gamepadY += curY * JOYSTICK_SENSITIVITY;

      data.gamepadX = Math.min(50, Math.max(-50, data.gamepadX));
      data.gamepadY = Math.min(50, Math.max(-50, data.gamepadY));

      game.objects.joystick.move({
        clientX: startX + data.gamepadX,
        clientY: startY + data.gamepadY
      });
    }
  }

  checkDPad(gamepadState.dpads?.[DPAD]);

  /**
   * Joystick and/or ABXY button(s): Flip helicopter, or inventory order
   */

  let inventoryAction;

  let js = gamepadState.joysticks;
  let ljs = lastGamepadState.joysticks;

  // joystick button
  let menuJSButtonActive =
    js[MENU].button && js[MENU].button !== ljs[MENU].button;

  // joystick button
  let flyJSButtonActive = js[FLY].button && js[FLY].button !== ljs[FLY].button;

  if (flyJSButtonActive) {
    // flip if D-pad is not engaged - otherwise, D-pad + flight joystick button = select
    if (data.dPadOffset === OFFSET_CENTER) {
      game.players.local.flip();
    } else {
      inventoryAction = true;
    }
  } else if (data.dPadOffset !== OFFSET_CENTER && menuJSButtonActive) {
    // menu joystick button has been pressed, while D-pad is engaged.
    inventoryAction = true;
  }

  // ABXY "diamond" button group(s)
  let abxy = gamepadState.abxy[0];
  let lastABXY = lastGamepadState.abxy[0];

  if (abxy) {
    // if any ABXY button is pressed, consider this an action (if the D-pad is also engaged.)
    if (abxy.activeCount > lastABXY.activeCount) {
      inventoryAction = true;
    }
  }

  if (inventoryAction && data.dPadOffset !== OFFSET_CENTER) {
    // user has selected something from the inventory UI.
    inventoryClick(data.dPadOffset);
  }

  // is an inventory order still active, D-pad + button being held?
  let inventoryButtonActive =
    inventoryAction ||
    (data.dPadOffset !== OFFSET_CENTER &&
      (abxy.activeCount || js[MENU].button || js[FLY].button));

  // was it this previously active?
  let inventoryButtonWasActive =
    lastABXY.activeCount || ljs[MENU].button || ljs[FLY].button;

  if (inventoryButtonWasActive && !inventoryButtonActive) {
    let target = dom.inventory[data.dPadOffset]?.querySelector?.('a');
    utils.css.remove(target, css.buttonActive);
  }

  // check for shoulder button changes; these are independent of the D-pad.
  checkButtonGroup(gamepadState.buttons, lastGamepadState.buttons, shoulderMap);

  // finally - if the D-pad is not active, check ABXY for regular use cases e.g., firing weapons.
  if (data.dPadOffset !== OFFSET_CENTER) return;

  checkButtonGroup(abxy, lastABXY, abxyMap);
}

function checkDPadViaJoystick(js) {
  // map joystick position to a 9-axis D-pad

  // if not found, bail safely
  if (!js) return OFFSET_CENTER;

  let { x, y } = js;

  let row, col, itemsPerRow, div;

  // 3x3
  itemsPerRow = 3;

  // one cell width or height
  div = 1 / itemsPerRow;

  // column (L->R)
  if (x <= -div) {
    col = 0;
  } else if (x >= -div && x <= div) {
    col = 1;
  } else {
    col = 2;
  }

  // row (T->B)
  if (y <= -div) {
    row = 0;
  } else if (y >= -div && y <= div) {
    row = 1;
  } else {
    row = 2;
  }

  return row * itemsPerRow + col;
}

function checkDPad(dpad) {
  if (!dpad) return;

  let { offset } = dpad;

  if (offset === OFFSET_CENTER) {
    // D-pad inactive - try joystick, which may be assigned
    offset = checkDPadViaJoystick(gamepadState.joysticks[MENU]);
  }

  // bail if unchanged
  if (offset === data.dPadOffset) return;

  // update selection
  let items = dom.inventory;

  if (items[data.dPadOffset]) {
    // deselect
    items[data.dPadOffset].style.borderColor = '';
    // ensure the button is no longer activated
    utils.css.remove(
      items[data.dPadOffset].querySelector('a'),
      css.buttonActive
    );
  }

  if (items[offset]) {
    // inactive / active
    items[offset].style.borderColor = offset === OFFSET_CENTER ? '' : '#33ff33';
  }

  // mark the menu as being active, or not.
  utils.css.addOrRemove(dom.controls, offset !== OFFSET_CENTER, css.menuActive);

  // update
  data.dPadOffset = offset;
}

function checkButtonGroup(csGroup, lsGroup, groupMap) {
  // current state group, last state group, map
  for (let btn in groupMap) {
    // ignore if unchaged
    if (csGroup[btn] === lsGroup[btn]) continue;

    keyboardMonitor[csGroup[btn] ? 'keydown' : 'keyup']({
      keyCode: groupMap[btn].keyCode(),
      fromAATouch: true
    });

    // update local state, e.g., `isFiring`, accordingly
    if (groupMap[btn].relatedState) {
      data.state[groupMap[btn].relatedState] = !!csGroup[btn];
    }
  }
}

function inventoryClick(offset) {
  let target = dom.inventory[offset]?.querySelector?.('a');

  if (!target) return;

  // some sort of button - inventory, or helicopter controls.
  let keyMapValue;
  let keyCode;

  keyMapValue = target.getAttribute('data-keyMap');

  if (!keyMapValue) return;

  // if a comma-delimited list (e.g., smart missile types), split into an array and pick one.
  if (keyMapValue.indexOf(',') !== -1) {
    keyMapValue = oneOf(keyMapValue.split(','));
  }

  keyCode = keyboardMonitor.keyMap[keyMapValue];

  if (!keyCode) return;

  keyboardMonitor.keydown({ keyCode, fromAATouch: true });

  // update UI
  utils.css.add(target, css.buttonActive);

  // release key, momentarily
  common.setFrameTimeout(() => {
    keyboardMonitor.keyup({ keyCode });
  }, 1 / FPS);
}

function updateCSS(lastKnownGamepadCount) {
  utils.css.addOrRemove(
    document.body,
    useGamepad && lastKnownGamepadCount,
    'has-gamepad'
  );

  if (!lastKnownGamepadCount) {
    // TODO: reset state only if no controllers connected at all?
    Object.keys(data.state).forEach((k) => (data.state[k] = false));
  }
}

function enable() {
  data.enabled = true;
  gamepadManager.enable();
}

function disable() {
  data.enabled = false;
  gamepadManager.disable();
}

function init() {
  // TODO: tie into game prefs etc.
  if (!gamepadFeature || !useGamepad) return;

  enable();

  dom.controls = document.getElementById('mobile-controls');
  dom.inventory = Array.from(dom.controls.querySelectorAll('.inventory-item'));
}

const gamepadManager = GamepadManager({
  onChange: updateAA, // update / animate()-style callback
  onAddOrRemove: updateCSS
});

// DRY
const { lastGamepadState, gamepadState } = gamepadManager;

// "API" (for now)
const gamepad = {
  animate: gamepadManager.animate,
  data,
  init,
  state: gamepadState,
  rumble: gamepadManager.rumble
};

export { gamepad, gamepadFeature, useGamepad };
