import { configGamePad } from './gamepad-config.js';

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
  addKnownController('standard', {
    /**
     * Reference / standard controller layout
     * PS4 = "Sony PS4 DualShock" (Vendor: 054c, product: 09cc)
     * This is commonly recognized as a "standard" gamepad layout / mapping
     * https://w3c.github.io/gamepad/standard_gamepad.svg
     * https://beej.us/blog/data/javascript-gamepad/
     */

    // standalone, not part of a D-pad or group
    buttons: {
      // left shoulder / trigger
      l1: 'btn4',
      l2: 'btn6', // PS4: spring-loaded trigger with range: 0-1

      // right shoulder / trigger
      r1: 'btn5',
      r2: 'btn7', // PS4: spring-loaded trigger with range: 0-1

      options: 'btn9', // PS4 label: "OPTIONS"
      share: 'btn8', // PS4 label: "SHARE"

      logo: 'btn16' // PS4: Playstation logo (brings up Control Center in macOS)
    },

    /**
     * "ABXY" ("diamond") button layout
     *  △
     * □ ○
     *  ×
     */
    abxy: [
      {
        top: 'btn3', // PS4: "Triangle" (standard: "Y")
        left: 'btn2', // PS4: "Square" (standard: "X")
        right: 'btn1', // PS4: "O" (standard: "B")
        bottom: 'btn0' // PS4: "X" (standard: "A")
      }
    ],

    // button order, per D-pad: up, down, left, right
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
      driftBufferPercent: 100
    },

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
     *  X
     * Y A
     *  B
     */
    abxy: [
      {
        top: 'btn3', // X
        left: 'btn4', // Y
        right: 'btn0', // A
        bottom: 'btn1' // B
      }
    ],

    joystickOptions: {
      precision: 2,
      zeroPoint: 0.03
    },

    // analog + button
    joysticks: [
      { axes: ['axes0', 'axes1'], button: 'btn13' },
      { axes: ['axes2', 'axes5'], button: 'btn14' }
    ],

    dpads: [
      /**
       * Special case: 8Bitdo NES30 Pro (Bluetooth) D-pad uses a single axis
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

  // fallback / standard controller case
  configGamePad({
    label: 'Standard / generic',
    vendor: 'standard',
    product: 'standard',
    ...knownControllers.standard
  });

  configGamePad({
    label: '8Bitdo NES30 Pro',
    vendor: '2dc8',
    product: '9001', // when connecting via USB
    ...knownControllers.nes30Pro
  });

  configGamePad({
    label: 'Bluetooth Wireless Controller (8Bitdo NES30 Pro)',
    vendor: '2dc8',
    product: '3820', // when connecting via Bluetooth
    ...knownControllers.nes30Pro
  });

  configGamePad({
    /**
     * Safari sees the NES30 Pro as a standard controller, with unique mapping.
     * In testing, Safari does not provide a product or vendor ID.
     * The label here matches the Safari ID, a fallback for vendor/product.
     */
    label: '8Bitdo NES30 Pro Extended Gamepad',
    ...knownControllers.standard,
    // TODO: exclude / delete "share" button?
    // redefine order for NES30Pro
    ...knownControllers.nes30Pro.abxy
  });

  configGamePad({
    /**
     * Sony PS4 DualShock under Safari, macOS
     * (lacks product + vendor ID, but has `dual-rumble` vibration actuator)
     */
    label: 'Wireless Controller Extended Gamepad',
    ...knownControllers.standard
  });

  configGamePad({
    label: 'DUALSHOCK 4 Wireless Controller (Sony PlayStation)',
    vendor: '054c',
    product: '09cc',
    ...knownControllers.standard
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
    ...knownControllers.standard
  });
}

export { addControllers };
