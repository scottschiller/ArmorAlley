import { utils } from '../core/utils.js';
import { playSound, skipSound, sounds } from '../core/sound.js';
import { game } from '../core/Game.js';
import { DEFAULT_FUNDS } from '../core/global.js';
import { common } from '../core/common.js';

const Funds = () => {
  // a "Dune 2"-style credits UI that "spins", with matching sound effects.
  let css, data, dom, exports;

  css = {
    collapsed: 'collapsed',
    noTransition: 'no-transition'
  };

  data = {
    active: false,
    value: DEFAULT_FUNDS,
    displayValue: 0,
    lastActiveDisplayValue: 0,
    lastBnBValue: 0,
    bnbTimer: null,
    hideLeadingZeroes: true,
    frameInterval: 3,
    frameCount: 0,
    displayHeight: 10,
    offsetType: 'px',
    digitCount: 3,
    // state for each digit
    offsetTop: [],
    lastOffsetTop: [],
    visible: []
  };

  // initialize state
  for (let n = 0; n < data.digitCount; n++) {
    data.offsetTop[n] = null;
    data.lastOffsetTop[n] = null;
    data.visible[n] = true;
  }

  dom = {
    o: null,
    digits: null
  };

  function show(offset) {
    if (data.visible[offset]) return;

    data.visible[offset] = true;
    utils.css.remove(dom.digits[offset].parentNode, css.collapsed);
  }

  function hide(offset) {
    if (!data.visible[offset]) return;

    data.visible[offset] = false;
    utils.css.add(dom.digits[offset].parentNode, css.collapsed);
  }

  function updateFrameInterval(delta) {
    let i;
    // how fast should the ticks go by?
    // (timed roughly to inventory ordering animations.)

    // if adding funds, always animate "fast"?
    if (data.value > data.lastActiveDisplayValue) {
      if (delta >= 10) {
        i = 2;
      } else {
        i = 3;
      }
    } else if (delta >= 10) {
      i = 2;
    } else if (delta >= 9) {
      i = 3;
    } else if (delta >= 8) {
      i = 4;
    } else if (delta >= 7) {
      i = 5;
    } else if (delta >= 6) {
      i = 6;
    } else if (delta >= 5) {
      i = 8;
    } else if (delta >= 3) {
      i = 10;
    } else {
      i = 21;
    }

    data.frameInterval = i;
  }

  function updateDOM() {
    let i, j;

    // raw string, and array of integers
    let digits = data.displayValue.toString();
    const digitInts = [];

    // pad with leading zeroes, e.g., 9 -> 009
    if (digits.length < data.digitCount) {
      // TODO: move to ES6 .repeat()
      digits =
        new Array(data.digitCount - digits.length + 1).join('0') + digits;
      // digits = '0'.repeat(data.digitCount - digits.length) + digits;
    }

    if (!dom.o) {
      dom.o = document.getElementById('funds-count');
    }

    if (!dom.digits)
      dom.digits = document.querySelectorAll('#funds-count .digit-wrapper');

    // guard, in case these haven't rendered yet.
    if (!dom.digits.length) return;

    // rough concept of rotation speed / velocity on the UI.
    if (!data.active) {
      // update frequency relative to the credits being spent / earned.
      data.delta = Math.abs(data.displayValue - data.value);

      updateFrameInterval(data.delta);

      data.active = true;
    }

    const digitCountMinusOne = data.digitCount - 1;

    // handle digit changes.
    for (i = 0, j = data.digitCount; i < j; i++) {
      data.offsetTop[i] = digits[i] * -1;

      // only update those which have changed.
      if (data.lastOffsetTop[i] === data.offsetTop[i]) continue;

      data.lastOffsetTop[i] = data.offsetTop[i];

      // show or hide 10s / 100s "columns" accordingly.
      if (data.hideLeadingZeroes && (!i || i < digitCountMinusOne)) {
        // first digit: hide if zero.
        digitInts[i] = parseInt(digits[i], 10);

        // when not first nor last digit, show if non-zero - OR, when the digit to the left is non-zero.
        if (digitInts[i] || digitInts[i - 1]) {
          show(i);
        } else if (i < digitCountMinusOne) {
          // never hide the rightmost, ones column.
          hide(i);
        }
      }

      redrawDigit(i);
    }
  }

  function redrawDigit(i) {
    // include the value of the prior column in the current background position offset.
    // e.g., if there are 30 funds, the "ones" column should have an offset accounting for three "sets" of 0-9.
    // without this, decrementing from 30 to 29 would cause the ones column to "jump" across a single set of digits visibly with the transition.
    // this offset means the background repeats, and the next 9 slides in from the top as would be expected.
    const tensOffset = (data.offsetTop[i - 1] || 0) * 10;

    // $$$: get the *real* rendered width / height (of the last digit)
    const rect = dom.digits[dom.digits.length - 1].getBoundingClientRect();

    // scale to the real size - 1x + 10x
    dom.digits[i].style.setProperty(
      'background-size',
      `${rect.width}px ${rect.height * 10}px`
    );

    dom.digits[i].style.setProperty(
      'background-position',
      `0px ${(data.offsetTop[i] + 1 + tensOffset) * data.displayHeight}${
        data.offsetType
      }`
    );
  }

  function updateScale() {
    // read the actual rendered height from the DOM
    // this will then be used to do offsets for animating numbers
    if (!dom.digits.length) return;

    // $$$: get the *real* rendered width / height (of the last digit)
    const rect = dom.digits[dom.digits.length - 1].getBoundingClientRect();

    data.displayHeight = rect.height;

    // redraw background images, temporarily ignoring transitions
    utils.css.add(dom.o, css.noTransition);
    for (let i = 0, j = data.digitCount; i < j; i++) {
      redrawDigit(i);
    }

    window.requestAnimationFrame(() =>
      utils.css.remove(dom.o, css.noTransition)
    );
  }

  function updateSound() {
    // "... Press debit or credit" 🤣 -- Maria Bamford
    // https://www.youtube.com/watch?v=hi8UURLK6FM
    if (!game.data.started) return;
    if (data.displayValue <= data.value) {
      playSound(sounds.inventory.credit);
    } else {
      playSound(sounds.inventory.debit);
    }
  }

  function animate() {
    // are we up-to-date?

    if (data.displayValue === data.value) {
      // update
      data.lastActiveDisplayValue = data.displayValue;
      if (data.active) {
        data.active = false;
        updateBnB();
      }
      return false;
    }

    if (data.active && data.displayValue === data.value) {
      data.active = false;
      // update
      data.lastActiveDisplayValue = data.displayValue;
      return false;
    }

    // wait until it's time.
    data.frameCount++;

    if (data.frameCount < data.frameInterval) return false;

    // otherwise, reset.
    data.frameCount = 0;

    // debit or credit sound, first and foremost.
    updateSound();

    data.displayValue += data.displayValue < data.value ? 1 : -1;

    updateBnB();

    updateDOM();
  }

  function setFunds(newValue) {
    // update delta, too.
    // this means the "spinner" speed can update as the rate of fund spend/gain changes.
    const newDelta = Math.abs(data.lastActiveDisplayValue - newValue);

    data.value = newValue;
    data.delta = newDelta;

    updateFrameInterval(data.delta);
  }

  function updateBnB() {
    // in case we roll by a bunch of 'relevant' numbers, just update the last.
    let sound, expectedValue;

    if (
      data.displayValue >= 60 &&
      data.displayValue < 68 &&
      (data.lastBnBValue < 60 || data.lastBnBValue >= 68)
    ) {
      sound = sounds.bnb.sixty;
    } else if (data.displayValue === 68) {
      sound = sounds.bnb.sixtyEight;
      expectedValue = 68;
    } else if (data.displayValue === 69) {
      sound = sounds.bnb.sixtyNine;
      expectedValue = 69;
    } else if (data.displayValue === 70) {
      sound = sounds.bnb.seventy;
      expectedValue = 70;
    }

    if (sound) {
      if (data.bnbTimer) {
        data.bnbTimer.reset();
        data.bnbTimer = null;
      }

      data.bnbTimer = common.setFrameTimeout(() => {
        playSound(sound, null, {
          onplay: (playedSound) => {
            // ignore if the value is not (e.g.,) 69 when its specific sound is playing.
            if (expectedValue && expectedValue !== data.displayValue)
              skipSound(playedSound);
          }
        });
      }, 1000);
    } else if (
      data.bnbTimer &&
      (data.displayvalue < 60 || data.displayValue > 70)
    ) {
      // if we we're outside the interesting range, cancel any timer.
      data.bnbTimer.reset();
      data.bnbTimer = null;
    }

    data.lastBnBValue = data.displayValue;
  }

  exports = {
    animate,
    data,
    setFunds,
    updateScale
  };

  updateDOM();

  return exports;
};

// TODO: move DEFAULT_FUNDS to a constants module
export { Funds, DEFAULT_FUNDS };
