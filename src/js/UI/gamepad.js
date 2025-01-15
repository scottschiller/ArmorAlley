/**
 * 🎮 Rough implementation based on Gamepad API spec, with some disclaimers.
 * Gamepad support can vary, per-browser. Here be dragons, etc.
 * https://www.w3.org/TR/gamepad/
 */

import { keyboardMonitor } from '../aa.js';
import { common } from '../core/common.js';
import { game } from '../core/Game.js';
import { FPS } from '../core/global.js';
import { utils } from '../core/utils.js';
import { GamepadManager } from './GamepadManager.js';

// for dev / testing
let gamepadFeature = !!window.location.href.match(/gamepad/i);

// TODO: implement in prefs
let useGamepad = !!gamepadFeature;

// middle / "inactive" position in a 9-axis d-pad
let OFFSET_CENTER = 4;

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

// joystick offset: helicopter control
const FLY = 1;

// joystick offset: inventory UI
const MENU = 0;

function updateAA() {
  // AA-specific implementation of gamepad
  if (!gamepadFeature || !useGamepad) return;

  /**
   * Joysticks: helicopter and inventory controls
   */

  // previous
  let lastX = lastGamepadState.joysticks[FLY].x;
  let lastY = lastGamepadState.joysticks[FLY].y;

  // current
  let curX = gamepadState.joysticks[FLY].x;
  let curY = gamepadState.joysticks[FLY].y;

  let startX = game.objects.joystick.data.screenWidth / 2;
  let startY = game.objects.joystick.data.screenHeight / 2;

  if ((lastX != 0 || lastY != 0) && curX == 0 && curY == 0) {
    // only stop once?
    // game.objects.joystick?.end?.();
  } else {
    if (curX != 0 || curY != 0) {
      if (lastX == 0 && lastY == 0) {
        // "start" moving
        game.objects.joystick?.start?.({
          clientX: startX,
          clientY: startY,
          hidden: true
        });
      } else {
        // move with velocity?
        data.gamepadX += curX * 2;
        data.gamepadY += curY * 2;

        data.gamepadX = Math.min(50, Math.max(-50, data.gamepadX));
        data.gamepadY = Math.min(50, Math.max(-50, data.gamepadY));

        game.objects.joystick.move({
          clientX: startX + data.gamepadX,
          clientY: startY + data.gamepadY
        });
      }
    }
  }

  /**
   * Shoulder buttons: weapons + paratrooper controls
   */

  const buttonsToControls = {
    r1: {
      // missile
      keyCode: keyboardMonitor.keyMap.smartMissile
    },
    r2: {
      // gun
      keyCode: keyboardMonitor.keyMap.shift,
      relatedState: 'isFiring'
    },
    l1: {
      // paratrooper
      keyCode: keyboardMonitor.keyMap.space
    },
    l2: {
      // bomb
      keyCode: keyboardMonitor.keyMap.ctrl
    }
  };

  // did a button change?
  for (let btn in buttonsToControls) {
    if (gamepadState.buttons[btn] === lastGamepadState.buttons[btn]) continue;
    keyboardMonitor[gamepadState.buttons[btn] ? 'keydown' : 'keyup']({
      keyCode: buttonsToControls[btn].keyCode,
      fromAATouch: true
    });
    // update local state, e.g., `isFiring`, accordingly
    if (buttonsToControls[btn].relatedState) {
      data.state[buttonsToControls[btn].relatedState] =
        !!gamepadState.buttons[btn];
    }
  }

  /**
   * D-pad(s) - we only check for the first one, here.
   */

  if (gamepadState.dpads?.[0]) {
    // check for change
    let { offset } = gamepadState.dpads[0];

    if (offset === OFFSET_CENTER) {
      // D-pad unchanged and inactive - try joystick
      let { x, y } = gamepadState.joysticks[MENU];

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

      offset = row * itemsPerRow + col;
    }

    if (offset !== data.dPadOffset) {
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
        items[offset].style.borderColor =
          offset === OFFSET_CENTER ? '#666' : '#33ff33';
      }

      // mark the menu as being active, or not.
      utils.css.addOrRemove(
        dom.controls,
        offset !== OFFSET_CENTER,
        css.menuActive
      );

      // update
      data.dPadOffset = offset;
    }
  }

  /**
   * Joystick and/or ABXY button(s): Flip helicopter, or inventory order
   */

  let inventoryAction;

  let js = gamepadState.joysticks;
  let ljs = lastGamepadState.joysticks;

  let menuJSButtonActive =
    js[MENU].button && js[MENU].button !== ljs[MENU].button;

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
    if ((abxy.left && !lastABXY.left) || (abxy.bottom && !lastABXY.bottom)) {
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
      (abxy.left || abxy.bottom || js[MENU].button || js[FLY].button));

  // was it this previously active?
  let inventoryButtonWasActive =
    lastABXY.left || lastABXY.bottom || ljs[MENU].button || ljs[FLY].button;

  if (inventoryButtonWasActive && !inventoryButtonActive) {
    let target = dom.inventory[data.dPadOffset]?.querySelector?.('a');
    utils.css.remove(target, css.buttonActive);
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
