/**
 * 🎮 Gamepad API spec
 * https://www.w3.org/TR/gamepad/
 *
 * The gamepad API exposes arrays of digital buttons, and analog axes.
 * A form of mapping applies, where button[0] may be a D-pad or start button
 * and axes[0] is typically assigned to an analog joystick.
 *
 * Browsers determine whether a controller has a "standard" mapping or not.
 * The user agent is expected to determine the mapping of the controller.
 * In the standard case, layout and mapping should be reliable and consistent.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Gamepad
 *
 * Common gamepads e.g., Sony PlayStation 4 "dualshock" should have standard
 * mappings, and should work reliably across browsers. However, results vary.
 *
 * If a standard mapping is not indicated, "here be dragons."
 * 
 * The intent of this work is to abstract and normalize the common use cases
 * between controller updates and the ability to handle special controllers.
 * 
 * Gamepads have an ID string which varies by browser, and may include product
 * and vendor IDs that can be parsed out. This is reminiscent of UA sniffing.
 *
 * Firefox and Chrome appear to provide vendor and product IDs, differently-
 * formatted. Safari may not provide IDs at all, or perhaps omit IDs when
 * standard mapping applies.
 *
 * QUIRKS: iOS Safari
 * ---
 * On iOS, gamepads need to be connected via USB cable to work with Safari.
 * Gamepads paired via bluetooth do not get `gamepadconnected` on iOS 18.
 * In testing, joystick buttons did not work on an iPhone 14 with iOS 17.0.
 *
 * QUIRKS: 8Bitdo NES30Pro
 * ---
 * In testing, an older 8Bitdo NES30Pro (bluetooth) controller does not get a
 * "standard" mapping in Firefox or Chrome. In addition, Firefox's mapping of
 * this controller also differs slightly from that of Chrome.
 *
 * The NES30Pro has a D-pad, but its values are mapped to a few axes vs. four
 * buttons. One axis shows nine different values, reflecting the positions of
 * the d-pad. On a standard mapping, the four buttons' binary values can
 * represent 9 directions.
 *
 * ↖ ↑ ↗
 * ← · →
 * ↙ ↓ ↘
 *
 * Safari reports a standard mapping for the NES30Pro, but still has the D-pad
 * as a single-axis with multiple values at axes[9].
 *
 * In Firefox, the D-pad "9-value" number is mapped to axes[0] instead of [9],
 * and the analog joysticks are on axes[1-4] vs. [0-3].
 */

import { gpConfig, gpMap } from './gamepad-config.js';
import { addControllers } from './gamepad-known-controllers.js';
import { gamepadFeature, useGamepad } from './gamepad.js';

const GamepadManager = (options = {}) => {
  // singular, global "gamepad index" (AA uses only one controller at a time.)
  let gpi;

  const lastState = {};
  const lastGamepadState = {};
  const gamepadState = {};

  let changed;

  // id -> { product, vendor } map
  let parseIdCache = {};

  // middle / "inactive" position in a 9-axis d-pad
  const OFFSET_CENTER = 4;

  // DRY
  const left = true,
    up = true,
    right = true,
    down = true;

  let dpadStates = (function () {
    // axes-to-directions
    return [
      { left, up },
      { up },
      { right, up },
      { left },
      {},
      { right },
      { down, left },
      { down },
      { down, right }
    ];
  })();

  function handleDPad(btnUp, btnDown, btnLeft, btnRight) {
    let state = {};

    // default: middle row, neutral
    let offset = OFFSET_CENTER;

    if (btnUp.pressed) {
      // top row: 0-2
      offset = 1;
      state[up] = up;
    } else if (btnDown.pressed) {
      // bottom row: 6-8
      offset = 7;
      state[down] = down;
    }

    if (btnLeft.pressed) {
      offset--;
      state[left] = left;
    } else if (btnRight.pressed) {
      offset++;
      state[right] = right;
    }

    state.offset = offset;

    return state;
  }

  function handleAxisDPad(axis, axisValues) {
    /**
     * Special case (8Bitdo NES30 Pro): d-pad state via single axis vs. buttons.
     *
     * ↖ ↑ ↗
     * ← · →
     * ↙ ↓ ↘
     */
    let state = {};

    let axisState = lastState[`gp${gpi}/${axis}`];
    if (axisState === undefined) return;

    let axisValue = axisState.value;

    // 0-8 for quick "active state" mapping
    let offset = axisValues.indexOf(parseFloat(axisValue));

    // e.g., { left, up }
    if (offset !== -1) {
      state = {
        offset,
        ...dpadStates[offset]
      };
    } else {
      // fallback: no match / unknown
      state = {
        offset: -1
      };
    }

    return state;
  }

  function checkForChange(id, value) {
    let state;
    if (lastState[id].lastValue !== value) {
      if (!changed) changed = [];
      changed.push({ id, value });
    }
  }

  function setNewState(id, state) {
    // initial state
    const { value } = state;
    if (!lastState[id]) {
      lastState[id] = {
        id,
        lastValue: value,
        value
      };
    }
    checkForChange(id, value);
  }

  function applyChange(obj) {
    const { id, value } = obj;
    lastState[id].value = value;
  }

  function updateLastValue(obj) {
    const { id, value } = obj;
    lastState[id].lastValue = lastState[id].value;
  }

  function refreshState() {
    // apply gamepad values to mapping
    let gp = navigator.getGamepads()[gpi];

    if (!gp) {
      // this should not happen. try refreshing `gpi` in this case?
      console.warn('refreshState(): no gamepad?');
      return;
    }

    let parsedID = parseId(gp.id);
    let vpid = `${parsedID.vendor}/${parsedID.product}`;
    let gpc = gpConfig[vpid];
    let map = gpMap[vpid];

    // this should not happen.
    if (!map) {
      console.warn('WTF no map?');
      return;
    }

    if (!gamepadState.buttons) {
      gamepadState.buttons = {};
    }

    if (!lastGamepadState.buttons) {
      lastGamepadState.buttons = {};
    }

    // iterate over map, applying lastState
    Object.entries(map).forEach(([key, value]) => {
      // 'r1': (value of btn7)
      lastGamepadState.buttons[value] = gamepadState.buttons[value];
      gamepadState.buttons[value] = lastState[`gp${gpi}/${key}`]?.value;
    });

    // ABXY "diamonds" (or similar groups of buttons)
    if (!gamepadState.abxy) {
      gamepadState.abxy = [];
      lastGamepadState.abxy = [];
      // initial state
      gpc.abxy?.forEach?.((abxy, i) => {
        lastGamepadState.abxy[i] = Object.assign({}, gamepadState.abxy[i]);
        gamepadState.abxy[i] = {
          left: null,
          top: null,
          right: null,
          bottom: null
        };
      });
    }

    // iterate over each diamond / group
    gpc.abxy?.forEach?.((o, i) => {
      lastGamepadState.abxy[i] = Object.assign({}, gamepadState.abxy[i]);
      let cs = gamepadState.abxy[i];
      let ls = lastState;
      cs.left = ls[`gp${gpi}/${o.left}`].value;
      cs.top = ls[`gp${gpi}/${o.top}`].value;
      cs.right = ls[`gp${gpi}/${o.right}`].value;
      cs.bottom = ls[`gp${gpi}/${o.bottom}`].value;
    });

    // d-pads (most controllers have just one?)
    if (!gamepadState.dpads) {
      gamepadState.dpads = [];
      lastGamepadState.dpads = [];
      // initial state
      gpc.dpads?.forEach?.((dpad, i) => {
        lastGamepadState.dpads[i] = Object.assign({}, gamepadState.dpads[i]);
        gamepadState.dpads[i] = {
          up: null,
          down: null,
          left: null,
          right: null
        };
      });
    }

    gpc.dpads?.forEach?.((o, i) => {
      let cs = gamepadState.dpads[i];
      let ls = lastState;

      lastGamepadState.dpads[i] = Object.assign({}, cs);

      if (o.axis) {
        // special-case, single-axis d-pad
        gamepadState.dpads[i] = handleAxisDPad(o.axis, o.values);
      } else {
        // standard 4-button d-pad

        /**
         * "offset": convenient indicator of active position.
         * ↖ ↑ ↗
         * ← · →
         * ↙ ↓ ↘
         */

        // default: middle row, neutral
        let offset = OFFSET_CENTER;

        cs.up = ls[`gp${gpi}/${o[0]}`].value;
        if (cs.up) {
          // top row
          offset = 1;
        }
        cs.down = ls[`gp${gpi}/${o[1]}`].value;
        if (cs.down) {
          // bottom row
          offset = 7;
        }
        cs.left = ls[`gp${gpi}/${o[2]}`].value;
        if (cs.left) {
          offset--;
        }
        cs.right = ls[`gp${gpi}/${o[3]}`].value;
        if (cs.right) {
          offset++;
        }
        cs.offset = offset;
      }
    });

    // joysticks
    if (!gamepadState.joysticks) {
      gamepadState.joysticks = [];
      lastGamepadState.joysticks = [];
      // initial state
      gpc.joysticks?.forEach?.((joystick, i) => {
        gamepadState.joysticks[i] = {
          x: 0,
          y: 0,
          button: 0
        };
        // same for "last" values.
        lastGamepadState.joysticks[i] = {
          x: 0,
          y: 0,
          button: 0
        };
      });
    }

    gpc.joysticks?.forEach?.((o, i) => {
      // DRY
      let lgs = lastGamepadState;
      let ls = lastState;
      let js = gamepadState.joysticks[i];

      // update "last state"
      lgs.joysticks[i].x = parseFloat(js.x);
      lgs.joysticks[i].y = parseFloat(js.y);
      lgs.joysticks[i].button = js.button;

      // new live values
      let x = parseFloat(ls[`gp${gpi}/${o.axes[0]}`].value);
      let y = parseFloat(ls[`gp${gpi}/${o.axes[1]}`].value);

      let jp = data.gamepad.config.joystickOptions?.precision;

      if (jp) {
        x = parseFloat(x.toFixed(jp));
        y = parseFloat(y.toFixed(jp));
      }

      let absX = Math.abs(x);
      let absY = Math.abs(y);

      // account for drift, if set - ignore values <= threshold.
      if (js.driftOffset) {
        if (absX <= js.driftOffset[0]) x = 0;
        if (absY <= js.driftOffset[1]) y = 0;
      }

      // minimum
      if (data.gamepad.config.joystickOptions?.zeroPoint) {
        if (x !== 0 && absX < data.gamepad.config.joystickOptions.zeroPoint)
          x = 0;
        if (y !== 0 && absY < data.gamepad.config.joystickOptions.zeroPoint)
          y = 0;
      }

      // update
      js.x = x;
      js.y = y;

      js.button = ls[`gp${gpi}/${o.button}`].value;
    });
  }

  function applyChanges() {
    changed?.forEach?.(applyChange);

    refreshState();

    options?.onChange?.();

    changed?.forEach?.(updateLastValue);

    changed = null;
  }

  function update() {
    // bail if not active
    if (!gamepadFeature || !useGamepad || !data.enabled) return;

    gpi = undefined;

    for (const pad of navigator.getGamepads()) {
      if (!pad?.connected) continue;

      // hackish: assign global while iterating through gamepads.
      // this is sub-par, but a compromise to maintain one "active" gamepad.
      gpi = pad.index;

      for (const [i, button] of pad.buttons.entries()) {
        setNewState(`gp${pad.index}/btn${i}`, {
          value: button.value,
          pressed: button.pressed
        });
      }

      for (const [i, axis] of pad.axes.entries()) {
        setNewState(`gp${pad.index}/axes${i}`, {
          value: axis.toFixed(4)
        });
      }
    }

    if (gpi !== undefined) {
      applyChanges();
    }
  }

  function normalizeId(id) {
    // gamepad ID strings sometimes have extra spacing.
    // TODO: review and maybe drop.
    // .replace(/\s+/g, ' ');
    return id;
  }

  function parseId(id) {
    /**
     * Gamepad shenanigans: Firefox and Chrome may provide vendor & product IDs.
     * Safari appears to omit them, and marks controllers as "standard"
     * (known layout / mapping.)
     *
     * Chrome includes vendor + product details in parentheses, with other bits.
     * NES30 Pro example: "8Bitdo NES30 Pro (Vendor: 2dc8 Product: 9001)"
     * PS4 DualShock example:
     * "Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)"
     *
     * Firefox does not use parentheses, but rather xxxx-xxxx-NAME in ID.
     * Firefox's vendor + product may be 3 characters, missing a leading zero
     * unlike Chrome. This was tested with a Sony PS4 DualShock.
     */

    if (parseIdCache[id]) return parseIdCache[id];

    let vendor, product;

    if (!id.match(/[()]/) && id.indexOf('-') !== -1) {
      // Firefox "xxxx-xxxx-CONTROLLER NAME" pattern
      let bits = id.split('-');
      vendor = bits[0];
      // ensure vendor + product are 4 characters
      if (vendor.length === 3) {
        vendor = `0${vendor}`;
      }
      product = bits[1];
      if (product.length === 3) {
        product = `0${product}`;
      }
    } else {
      // match text within (parens)
      let str = id.match(/\(([^)]+)\)/)?.[1] || '';

      // tighten space for split
      str = str.replace(/\:\s/g, ' ');

      // replace all remaining spaces
      str = str.replace(/\s/g, ':');

      // for string matching
      str = str.toLowerCase();

      let bits = str.split(':');

      // vendor:xxxx
      vendor = bits[bits.indexOf('vendor') + 1];

      // product:xxx
      product = bits[bits.indexOf('product') + 1];
    }

    // fallback: Safari does not provide vendor nor product IDs,
    // in testing 8Bitdo + PS4 controllers.
    if (!vendor || !product) {
      vendor = product = 'standard';
    }

    let result = { vendor, product };

    parseIdCache[id] = result;

    return result;
  }

  function addGamePad(e) {
    const gp = navigator.getGamepads()[e.gamepad.index];

    // if "known", connect this ID to the given configuration.
    let id = normalizeId(gp.id);

    let parsedID = parseId(gp.id);

    // Gamepad API: mapping should be "standard", if recognized.
    let isStandard = gp.mapping.match(/standard/i);

    if (!gpConfig[id]) {
      let vp;
      if (isStandard) {
        console.log('Gamepad indicates standard mapping');
      }
      vp = gpConfig[`${parsedID.vendor}/${parsedID.product}`];
      if (vp) {
        console.log('Found local mapping for controller', vp);
        gpConfig[id] = vp;
      } else {
        console.log('No local mapping for controller');
        if (isStandard) {
          console.log('No local mapping found - try standard mapping?');
        }
      }
    }

    data.gamepad.config = gpConfig[id];
  }

  function removeGamePad(e) {
    const gp = e.gamepad; // navigator.getGamepads()[e.gamepad.index];
    // TODO: clean up state?
  }

  function gamepadHandler(e, connected) {
    const gp = e.gamepad;
    console.log(
      `🎮 Gamepad "${gp.id}" (#${gp.index}) ${connected ? 'connected' : 'disconnected'} - ${gp.buttons.length} buttons, ${gp.axes.length} axes.`
    );

    if (connected) {
      addGamePad(e);
    } else {
      removeGamePad(e);
    }

    updateGamepadCount();

    // callback
    options?.onAddOrRemove?.(data.lastKnownGamepadCount);
  }

  function updateGamepadCount() {
    // navigator.getGamepads() can return an array with [null, [Gamepad]]-type entries; filter out null-ish ones.
    data.lastKnownGamepadCount =
      navigator.getGamepads()?.filter?.((gp) => !!gp)?.length || 0;
  }

  function rumble(magnitude = 1, duration = 40) {
    if (!gamepadFeature) return;

    const pad = navigator.getGamepads()[gpi];

    if (!pad) return;

    // https://caniuse.com/?search=vibrationActuator

    // Firefox?
    if (pad.hapticActuators) {
      let ha = pad.hapticActuators;
      // actuators array may exist, but be empty despite "dual-rumble" e.g., on PS4 Dualshock.
      if (ha.length) {
        console.log('pad.hapticActuators', ha, magnitude, duration);
        ha[0].pulse(magnitude, duration);
      } else {
        console.log('No haptic actuators found.');
      }
    }

    // Chrome, Edge, Safari
    if (pad.vibrationActuator) {
      let va = pad.vibrationActuator;

      /**
       * If effects[] (as in Chrome), take the first; otherwise, use the type.
       * This may be redundant and perhaps `type` should always be used.
       */
      let effect = va.effects?.[0] || va.type;

      if (
        va.type &&
        // Safari implements `canPlayEffectType()` - use if defined.
        (!va.canPlayEffectType || va.canPlayEffectType?.(effect))
      ) {
        console.log('gamepad effect', effect, magnitude, duration);
        va.playEffect(effect, {
          startDelay: 0,
          duration,
          weakMagnitude: 0,
          strongMagnitude: magnitude
        });
      } else {
        console.log('no vibration actuator effects found.');
      }
    }
  }

  function addEvents() {
    window.addEventListener(
      'gamepadconnected',
      (e) => {
        gamepadHandler(e, true);
      },
      false
    );

    window.addEventListener(
      'gamepaddisconnected',
      (e) => {
        gamepadHandler(e, false);
      },
      false
    );
  }

  function init() {
    if (!gamepadFeature) return;

    // init standard PS4-style and nes30pro mappings
    addControllers();

    addEvents();
  }

  let data = {
    enabled: false,
    gamepad: {
      config: null
    },
    lastKnownGamepadCount: 0
  };

  init();

  return {
    animate: update,
    enable: () => (data.enabled = true),
    disable: () => (data.enabled = false),
    lastState,
    lastGamepadState,
    gamepadState,
    rumble
  };
};

export { GamepadManager };
