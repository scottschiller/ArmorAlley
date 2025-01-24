import { configGamePad } from './gamepad-config.js';
import { STD } from './GamepadManager.js';

/**
 * 🎮 "Standard" and other controllers, with "known" mappings for Armor Alley.
 * https://w3c.github.io/gamepad/standard_gamepad.svg
 *
 * Browsers are responsible for determining gamepad mapping, standard or not.
 * Browsers may report different results for the same controller.
 *
 * When the controller is not standard (and in some other special cases),
 * custom mapping is likely required and can vary by browser. Here be dragons.
 */
const knownControllers = {};

function addKnownController(label, data) {
  knownControllers[label] = data;
}

function addControllers() {
  addKnownController(STD, {
    /**
     * Reference / standard controller layout
     * PS4 = "Sony DualShock 4" model CUH-ZCT2 (Vendor: 054c, product: 09cc)
     * This is commonly recognized as a "standard" gamepad layout / mapping
     * https://w3c.github.io/gamepad/standard_gamepad.svg
     * https://beej.us/blog/data/javascript-gamepad/
     */

    /**
     * "Standalone" buttons - shoulders, select/start, logo etc.
     * ABXY, joysticks and D-pads defined separately
     */
    buttons: {
      // left shoulder button
      l1: 'btn4',

      // left shoulder spring-loaded trigger, value 0-1 (PS4)
      l2: 'btn6',

      // right shoulder button
      r1: 'btn5',

      // right shoulder spring-loaded trigger, value 0-1 (PS4)
      r2: 'btn7',

      // PS4 label: "OPTIONS"
      options: 'btn9',

      // PS4 label: "SHARE"
      share: 'btn8',

      // PS4: PlayStation logo (opens Control Center in macOS)
      logo: 'btn16'
    },

    /**
     * "ABXY" ("diamond") button layout
     *
     *    PS4      Std
     *  /‾‾‾‾‾\  /‾‾‾‾‾\
     *     △        X
     *   □   ○    Y   A
     *     ×        B
     *  \_____/  \_____/
     *
     */
    abxy: [
      {
        // △ or X
        top: 'btn3',

        // □ or Y
        left: 'btn2',

        // ○ or A
        right: 'btn1',

        // × or B
        bottom: 'btn0'
      }
    ],

    /**
     * Directional pad (D-pad) definitions
     *
     * ↖ ↑ ↗
     * ← · →
     * ↙ ↓ ↘
     *
     * Button order, per D-pad: [up, down, left, right]
     * Standard controllers typically have one D-pad.
     */
    dpads: [['btn12', 'btn13', 'btn14', 'btn15']],

    joystickOptions: {
      /**
       * Number of decimal points, for analog joystick inputs
       * This helps to avoid drift / "jitter" and almost-zero values,
       * e.g., 0.0039 being reported when the joystick is not being touched.
       * Proper calibration is the next logical option.
       */
      precision: 2,

      /**
       * Minimum value for movement, also to avoid drift.
       * Any value ≤ will be considered as zero.
       */
      zeroPoint: 0.03,

      /**
       * Extra wiggle room to account for joystick drift, beyond values
       * read during "drift calibration." 0 = disabled.
       */
      // NOTE: not yet implemented.
      driftBufferPercent: 100
    },

    /**
     * 🕹️ Joystick definitions
     * Each joystick axis has a value between -1 and +1.
     * The order is [x-axis, y-axis], and a single button when pressed.
     * Standard controllers should have two joysticks.
     */
    joysticks: [
      {
        // x-axis, y-axis
        axes: ['axes0', 'axes1'],
        button: 'btn10'
      },
      { axes: ['axes2', 'axes3'], button: 'btn11' }
    ]
  });

  addKnownController('nes30Pro', {
    /**
     * 8Bitdo "NES30 Pro" controller, bluetooth version (firmware 4.10)
     * This is NOT recognized as a "standard" gamepad layout in most browsers,
     * and requires special handling. (Safari recognizes it as standard, but
     * it still has a special D-pad handling case.)
     */

    buttons: {
      // as labeled, NES-style
      select: 'btn10',
      start: 'btn11',

      // shoulder / side buttons
      l1: 'btn6',
      r1: 'btn7',
      l2: 'btn8',
      r2: 'btn9'
    },

    /**
     * "ABXY" ("diamond") button layout
     *  /‾‾‾‾‾\
     *     X
     *   Y   A
     *     B
     *  \_____/
     */
    abxy: [
      {
        // X
        top: 'btn3',

        // Y
        left: 'btn4',

        // A
        right: 'btn0',

        // B
        bottom: 'btn1'
      }
    ],

    joystickOptions: {
      precision: 2,
      zeroPoint: 0.03
    },

    // x/y, button
    joysticks: [
      { axes: ['axes0', 'axes1'], button: 'btn13' },
      { axes: ['axes2', 'axes5'], button: 'btn14' }
    ],

    dpads: [
      /**
       * Special case: 8Bitdo NES30 Pro (Bluetooth) D-pad updates one axis
       * instead of buttons. The axis is set to one of 9 values, representing
       * the individual directions in order. axes3 + axes4 provide integer
       * values for this controller, but are ignored in this case.
       * ↖ ↑ ↗
       * ← · →
       * ↙ ↓ ↘
       */
      {
        axis: 'axes9',
        values: [
          1, -1, -0.7143, 0.7143, 3.2857, -0.4286, 0.4286, 0.1429, -0.1429
        ]
      }
    ],

    overrides: {
      // Firefox reports slightly different axis mapping - tested on macOS.
      firefox: {
        joysticks: [
          { axes: ['axes1', 'axes2'], button: 'btn13' },
          { axes: ['axes3', 'axes4'], button: 'btn14' }
        ],
        dpads: [
          {
            axis: 'axes0',
            values: [
              1, -1, -0.7143, 0.7143, 3.2857, -0.4286, 0.4286, 0.1429, -0.1429
            ]
          }
        ]
      }
    }
  });

  /**
   * Fallback / standard controller case
   * For controllers lacking an exact ID match
   */
  configGamePad({
    label: 'Standard / Generic Controller',
    vendor: STD,
    product: STD,
    ...knownControllers[STD]
  });

  // NES30 Pro, connecting via USB
  configGamePad({
    label: '8Bitdo NES30 Pro',
    vendor: '2dc8',
    product: '9001',
    ...knownControllers.nes30Pro
  });

  // NES30 Pro, connecting via Bluetooth
  configGamePad({
    label: 'Bluetooth Wireless Controller (8Bitdo NES30 Pro)',
    vendor: '2dc8',
    product: '3820',
    ...knownControllers.nes30Pro
  });

  configGamePad({
    /**
     * Safari sees the NES30 Pro as a standard controller, with unique mapping.
     * Unlike Chrome + Firefox, Safari has 4 standard axes vs. 1 for the D-pad.
     * In testing, Safari does not provide a product or vendor ID.
     * The label here matches the Safari ID, a fallback for vendor/product.
     */
    label: '8Bitdo NES30 Pro Extended Gamepad',
    ...knownControllers[STD],
    // TODO: exclude / delete "share" button?
    // NES30 Pro has a unique ABXY mapping.
    ...knownControllers.nes30Pro.abxy
  });

  configGamePad({
    /**
     * Sony PS4 DualShock under Safari, macOS
     * (lacks product + vendor ID, but has `dual-rumble` vibration actuator)
     */
    label: 'Wireless Controller Extended Gamepad',
    ...knownControllers[STD]
  });

  configGamePad({
    /**
     * Sony PS4 DualShock under Safari, macOS, connected via Bluetooth
     * (lacks product + vendor ID, but has `dual-rumble` vibration actuator)
     */
    label: 'DUALSHOCK 4 Wireless Controller Extended Gamepad',
    ...knownControllers[STD]
  });

  configGamePad({
    label: 'DUALSHOCK 4 Wireless Controller (Sony PlayStation)',
    vendor: '054c',
    product: '09cc',
    ...knownControllers[STD]
  });

  configGamePad({
    /**
     * Nintendo Switch (original) Joy-Con, left + right controller pair
     * Tested on Chrome under Windows 10, connected via Bluetooth
     * These are recognized (together, L+R?) as a standard controller.
     * Vibration / rumble feedback should be supported.
     */
    label: 'Joy-Con L+R',
    vendor: '057e',
    product: '200e',
    ...knownControllers[STD]
  });
}

export { addControllers };
