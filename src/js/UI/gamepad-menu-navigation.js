/**
 * Gamepad: Focus, navigation and selection logic for
 * home menu and preferences / level / network modals
 */

import { prefsManager } from '../aa.js';
import { game } from '../core/Game.js';
import { isiPhone } from '../core/global.js';
import { utils } from '../core/utils.js';
import { gameMenu } from './game-menu.js';
import {
  DPAD,
  FLY,
  gamepad,
  gamepadState,
  lastGamepadState,
  MENU,
  OFFSET_CENTER
} from './gamepad.js';
import { gamePrefs } from './preferences.js';

let envelopeScroll = 0;
let gameOverNodes = [];

function updateAsNavigation() {
  if (!gamePrefs.gamepad) return;

  const { data } = gamepad;

  // PS4 / standard: 'options' - NES30Pro, 'select'
  if (
    (gamepadState.buttons.options && !lastGamepadState.buttons.options) ||
    (gamepadState.buttons.select && !lastGamepadState.buttons.select)
  ) {
    prefsManager.toggleDisplay();
    return;
  }

  // activate gamepad if a button is pressed.
  if (!data.active) {
    if (gamepadState.activeButtons) {
      gamepad.setActive(true);
    } else {
      // gamepad is inactive, or has been disabled; ignore input.
      return;
    }
  }

  /**
   * When gamepad is activated via button press, prevent actions until release.
   * Otherwise, helicopter would immediately fire guns etc.
   */
  if (data.waitUntilButtonRelease) {
    if (!gamepadState.activeButtons) {
      // resume standard behaviour
      data.waitUntilButtonRelease = false;
    } else {
      // wait
      return;
    }
  }

  let { offset } = gamepadState.dpads[DPAD];

  // special case: reserve joysticks if game over and you won.
  if (!game.objects.envelope.data.active) {
    if (offset === OFFSET_CENTER) {
      // D-pad inactive - try joystick, which may be assigned
      offset = gamepad.checkDPadViaJoystick(gamepadState.joysticks[MENU]);
    }

    // try other joystick, too.
    if (offset === OFFSET_CENTER) {
      // default joystick inactive; try the other one.
      offset = gamepad.checkDPadViaJoystick(gamepadState.joysticks[FLY]);
    }
  }

  // if ABXY "top" button [ △ or (Y) ] is pushed, OK/exit.
  if (gamepadState.abxy[0].top && !lastGamepadState.abxy[0].top) {
    // special case: network dialog close = cancel / reload.
    if (prefsManager.data.network) {
      window.location.reload();
      return;
    }
    // regular submit
    prefsManager.events.onFormSubmit();
    return;
  }

  // button?
  if (gamepadState.activeButtons && !lastGamepadState.activeButtons) {
    handleButton();
    return;
  }

  // bail if unchanged, unless counting as a repeat
  if (offset === data.dPadOffset) {
    let now = performance.now();

    let elapsed = now - data.lastButtonTS;

    // has the button been down long enough to repeat?
    if (elapsed < data.repeatDelay) return;

    let interval = prefsManager.isActive()
      ? data.repeatInterval
      : data.repeatIntervalHome;

    // long enough to repeat - now occasionally repeat
    if (elapsed - data.repeatDelay > interval) {
      // one more tick.
      data.lastButtonTS += interval;
    } else {
      return;
    }
  } else {
    // timestamp the last button press
    data.lastButtonTS = performance.now();
  }

  // track change
  data.dPadOffset = offset;

  /**
   * Navigate based on direction
   * ---
   * 1 = up
   * 3 = left
   * 4 = neutral
   * 5 = right
   * 7 = down
   */

  let focusNodes;

  if (game.data.battleOver) {
    /**
     * You lost.
     */
    if (game.data.theyWon) {
      if (!gameOverNodes.length) {
        gameOverNodes = document.querySelectorAll(
          '#game-announcements a.game-start'
        );
      }

      if (document.activeElement !== gameOverNodes[0]) {
        gamepad.setFocus(gameOverNodes[0]);
      }

      // nothing else to do.
      return;
    }

    /**
     * You won!
     */

    // wait until the letter UI is active.
    if (!game.objects.envelope.data.active) return;

    if (!gameOverNodes.length) {
      let letter = document.getElementById('battle-over-letter');
      if (letter) {
        gameOverNodes = letter.querySelectorAll('#next-battle, .wax-seal');
        // focus the first by default - i.e., wax seal.
        if (document.activeElement !== gameOverNodes[0]) {
          gamepad.setFocus(gameOverNodes[0]);
        }
      }
    }

    /**
     * Scrolling, "letters from the old tanker"
     */
    if (game.objects.envelope.data.open) {
      // simply grab both Y values.
      let joyY = gamepadState.joysticks[MENU].y + gamepadState.joysticks[FLY].y;

      if (joyY !== 0) {
        // move in small increments
        envelopeScroll += joyY / 10;

        // scroll is based on 0-1
        envelopeScroll = Math.max(0, Math.min(1, envelopeScroll));
        game.objects.envelope.setScrollTop(envelopeScroll);
      }
    }

    /**
     * Standard input, button, checkbox etc.
     */
    if (offset === 3 || offset === 1) {
      data.battleOverFocusOffset--;
    } else if (offset === 5 || offset === 7) {
      data.battleOverFocusOffset++;
    }

    if (data.battleOverFocusOffset < 0) {
      data.battleOverFocusOffset = gameOverNodes.length - 1;
    } else if (data.battleOverFocusOffset >= gameOverNodes.length) {
      data.battleOverFocusOffset = 0;
    }

    // only set focus if things changed / moved.
    if (offset !== 4) {
      if (gameOverNodes[data.battleOverFocusOffset]) {
        gamepad.setFocus(gameOverNodes[data.battleOverFocusOffset]);
      }
    }

    return;
  }

  if (!prefsManager.isActive()) {
    /**
     * Game menu, home screen
     */

    // special case: don't skip rows on small screens with 1 item per row.
    // TODO: proper logic for this.
    let avoidJump = isiPhone && game.objects.view.data.browser.isPortrait;

    if (offset === 3) {
      // LEFT
      data.homeFocusOffset--;
    } else if (offset === 5) {
      // RIGHT
      data.homeFocusOffset++;
    } else if (offset === 7 && data.homeFocusOffset < 2) {
      // DOWN: move to second row
      if (avoidJump) {
        data.homeFocusOffset++;
      } else {
        data.homeFocusOffset = 2;
      }
    } else if (offset === 1) {
      // UP: top row
      if (avoidJump) {
        data.homeFocusOffset--;
      } else {
        data.homeFocusOffset = 0;
      }
    }

    focusNodes = document
      .getElementById('game-menu')
      .querySelectorAll('input, button, select, textarea, a[href]');

    data.homeFocusOffset = Math.min(
      focusNodes.length - 1,
      Math.max(0, data.homeFocusOffset)
    );

    let node = focusNodes[data.homeFocusOffset];

    // additional CSS to ensure "selection", if focus is lost.
    if (document.activeElement) {
      utils.css.remove(document.activeElement, gamepad.css.gamepadSelected);
    }

    if (node && gamePrefs.gamepad && gamepad.data.active) {
      gamepad.setFocus(node);
      // show the related description text
      gameMenu.menuUpdate({ target: node });
    }

    return;
  }

  /**
   * Game preferences modal case
   */

  let modal = document.getElementById('game-prefs-modal');

  // hackish: node select + display check / filter
  focusNodes = Array.from(
    modal.querySelectorAll(
      'input:not(:disabled), button:not(:disabled), select:not(:disabled), textarea:not(:disabled)'
    )
  ).filter((node) => node.offsetHeight);

  if (
    document.activeElement.type === 'range' &&
    (offset === 3 || offset === 5)
  ) {
    /**
     * Special case: Left + right on range slider while focused.
     */
    let dir = offset == 3 ? -1 : 1;

    document.activeElement.value =
      parseFloat(document.activeElement.value) +
      parseFloat(document.activeElement.step) * dir;

    // custom event handlers
    if (document.activeElement.id === 'main_volume') {
      prefsManager.events.onVolumeInput();
      prefsManager.events.onVolumeChange();
    } else if (document.activeElement.id === 'input_game_speed') {
      prefsManager.events.onGameSpeedInput();
    }
  } else {
    /**
     * Standard input, button, checkbox etc.
     */
    if (offset === 3 || offset === 1) {
      data.prefsOffset--;
    } else if (offset === 5 || offset === 7) {
      data.prefsOffset++;
    }

    if (data.prefsOffset < 0) {
      data.prefsOffset = focusNodes.length - 1;
    } else if (data.prefsOffset >= focusNodes.length) {
      data.prefsOffset = 0;
    }

    // only set focus if things changed / moved.
    if (offset !== 4) {
      if (focusNodes[data.prefsOffset]) {
        gamepad.setFocus(focusNodes[data.prefsOffset]);
      }
    }
  }
}

function handleButton() {
  // click on currently-focused thing, if any.
  let focusNodes;
  let node;

  const { data } = gamepad;

  if (prefsManager.isActive()) {
    /**
     * Preferences Modal: Level selection, prefs, and network.
     */

    // currently-focused element?
    node = document.activeElement;

    if (node.type === 'checkbox') {
      node.checked = !node.checked;
      node.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (node.type === 'radio') {
      node.checked = true;
      // trigger the event which normally goes with a click.
      node.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } else if (game.data.battleOver) {
    // if you lost, then simply reload.
    if (!game.data.youWon) {
      // prevent duplicate events
      gamepad.disable();
      window.location.reload();
      return;
    }

    // you won!

    if (document.activeElement.href) {
      /**
       * "Next battle" button focused...
       * Disable while reloading to prevent more calls / button actions
       * Note: grab before disabling, because that will blur the element.
       */
      let newURL = document.activeElement.href;
      gamepad.disable();
      window.location.href = newURL;
      return;
    }

    // wax seal, open/close
    if (utils.css.has(document.activeElement, 'wax-seal')) {
      game.objects.envelope.openOrClose();
    }

    return;
  } else {
    /**
     * Game menu
     * Take action on current selection, if one exists.
     */

    focusNodes = document
      .getElementById('game-menu')
      .querySelectorAll('input, button, select, textarea, a[href]');

    node = focusNodes[data.homeFocusOffset];
  }

  const actions = {
    'game-options': () => {
      prefsManager.show({
        onShowComplete: () => {
          // do focus and stuff
          // assign focus to the first thing and reset offset?
          gamepad.setFocus(document.getElementById('game-prefs-submit'));
          data.prefsOffset = 0;
        }
      });
    },
    'select-level': () => {
      gameMenu.selectLevel({
        onShowComplete: () => {
          // do focus and stuff
          data.prefsOffset = 0;
          // try to select the "focus start" element
          let qs = '#prefs-select-level [data-focus-start-here]';
          gamepad.setFocus(document.querySelector(qs));
        }
      });
    },
    'virtual-stupidity': (node) => {
      node.checked = !node.checked;
      prefsManager.events.onPrefChange.bnb(node.checked);
      node.dispatchEvent(new Event('change', { bubbles: true }));
    },
    'select-more-info': (node) => {
      prefsManager.events.moreInfoHandler({ target: node });
    },
    'changelog': () => {
      prefsManager.events.fetchChangelog();
    },
    'get-invite-link': () => {
      prefsManager.events.onInvite();
    },
    'cancel-network': () => {
      window.location.reload();
    }
  };

  // "OK" button?
  if (node.type === 'submit') {
    prefsManager.events.onFormSubmit();
    return;
  }

  // normalize `action/for`
  let action =
    node.getAttribute('data-action') || node.getAttribute('data-for');

  if (action && actions[action]) {
    // preferences modal
    actions[action]?.(node);
  } else {
    // game menu
    gameMenu.formClick({
      target: node
    });
  }
}

export { updateAsNavigation };
