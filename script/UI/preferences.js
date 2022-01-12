import { utils } from '../core/utils.js';
import { game } from '../core/Game.js';
import { common } from '../core/common.js';
import { isSafari, tutorialMode } from '../core/global.js';
import { screenScale } from '../aa.js';

const prefs = {
  // legacy: game type, etc.
  gameType: 'gameType',
  noScaling: 'noScaling',
  noSound: 'noSound',
}

// for non-boolean form values; set by form, referenced by game
const PREFS = {
  SHOW_HEALTH_NEVER: 'never',
  SHOW_HEALTH_SOMETIMES: 'sometimes',
  SHOW_HEALTH_ALWAYS: 'always',
  NOTIFICATIONS_LOCATION_LEFT: 'left',
  NOTIFICATIONS_LOCATION_RIGHT: 'right'
};

// game defaults
const defaultPrefs = {
  sound: true,
  snow: false,
  show_inventory: true,
  show_weapons_status: true,
  show_keyboard_labels: true,
  show_game_tips: true,
  show_health_status: PREFS.SHOW_HEALTH_SOMETIMES, // never | sometimes | always
  notifications_location: PREFS.NOTIFICATIONS_LOCATION_RIGHT, // left | right
  enemy_missile_match_type: true,
  engineers_repair_bunkers: true,
  engineers_rob_the_bank: true,
  tank_gunfire_miss_bunkers: true,
  ground_unit_traffic_control: true
};

// initially, the game inherits the defaults
let gamePrefs = {
  ...defaultPrefs
};

function PrefsManager() {

  let data, dom, events;

  function init() {

    dom.o = document.getElementById('game-prefs-modal');
    dom.oForm = document.getElementById('game-prefs-form');
    dom.optionsLink = document.getElementById('game-options-link');
    dom.oStatsBar = document.getElementById('stats-bar');
    dom.oGameTips = document.getElementById('game-tips');
    dom.oToasts = document.getElementById('notification-toasts');

    // just in case
    if (!dom.o || !dom.oForm || !dom.optionsLink) return;

    // delightfully old-skool.
    dom.oForm.onsubmit = events.onFormSubmit;
    dom.optionsLink.onclick = events.optionsLinkOnClick;

    // hackish: adjust dialog body to "natural" height, prevent scrollbars.
    // display temporarily, read layout, adjust and then hide.
    dom.o.style.opacity = 0;
    dom.o.style.display = 'block';

    let body = dom.o.querySelector('.body');
    body.style.height = 'auto';

    let height = body.offsetHeight;

    // now assign the natural content height
    body.style.height = height + 'px';

    // one more thing: audio is force-disabled in Safari.
    // handle exceptions here.
    if (!window?.soundManager?.ok()) {
      document.getElementById('cb_sound').setAttribute('disabled', true);
      document.getElementById('cb_sound_description').innerHTML = [
        'HTML5 Audio() disabled, sorry.',
        (isSafari ? ' <a href="https://bugs.webkit.org/show_bug.cgi?id=116145">Webkit #116145</a>.' : ''),
        ' <a href="?html5audio=1">Try it</a> at your own risk.'
      ].join('');
    }

    // Remove the menu entirely from the DOM, set it up to append only when active.
    dom.o.remove();

    // reset opacity
    dom.o.style.opacity = null;

    getPrefsFromStorage();

  }

  function show() {

    if (data.active || !dom.o) return;

    data.active = true;

    events.updateScreenScale();

    document.body.appendChild(dom.o);

    game.pause();
  }

  function hide() {

    if (!data.active || !dom.o) return;

    dom.o.remove();
    data.active = false;

    game.resume();

  }

  function isActive() {

    return data.active;

  }

  function getEmptyCheckboxData() {

    // checkbox inputs that aren't checked, won't be submitted.
    // iterate through those here, and provide the name with value=0 for each.
    // there is likely a cleaner way to do this.
    if (!dom.oForm) return {};

    let result = {};
    let checkboxes = dom.oForm.querySelectorAll('input[type="checkbox"]:not(:checked)');

    checkboxes.forEach((checkbox) => {
      result[checkbox.name] = 0;
    });
    
    return result;

  }

  function getPrefsFromForm() {

    if (!dom.oForm) return;

    const formData = new FormData(dom.oForm);

    if (!formData) return;

    let data = {};

    formData.forEach((value, key) => {
      // NOTE: form uses numbers, but game state tracks booleans.
      // form values will be 0, 1, or a non-numeric string.
      // try for int, e.g., "0" -> 0 - otherwise, keep original string.
      let number = parseInt(value, 10);
      data[key] = isNaN(number) ? value : number;
    });

    // mixin of e.g., sound=0 where checkboxes are unchecked, and remainder of form data
    let prefs = {
      ...getEmptyCheckboxData(),
      ...data
    };

    return prefs;
    
  }

  function convertPrefsForGame(prefs) {

    // all form values are integer-based, but the game references booleans and string values.
    // given prefs with 0|1 or integer, translate to boolean or string values.
    if (!prefs) return {};

    let result = {};
    let value;

    for (let key in prefs) {
      // NOTE: form uses numbers, but game state tracks booleans.
      // key -> value: 0/1 to boolean; otherwise, keep as string.
      value = prefs[key];
      result[key] = isNaN(value) ? value : !!value;
    }

    return result;

  }

  function updatePrefs() {

    // fetch from the live form
    let formPrefs = getPrefsFromForm();

    // convert 0/1 to booleans
    let newGamePrefs = convertPrefsForGame(formPrefs);

    applyNewPrefs(newGamePrefs);

  }

  function applyNewPrefs(newGamePrefs) {

    let prefChanges = [];

    // queue data for onChange() calls,as applicable
    // e.g., game needs to handle enabling or disabling snow or health bars
    for (let key in newGamePrefs) {
      if (events.onPrefChange[key] && gamePrefs[key] !== newGamePrefs[key]) {
        prefChanges.push({ key, value: newGamePrefs[key] });
      }
    }

    // update the live game prefs
    gamePrefs = {
      ...gamePrefs,
      ...newGamePrefs
    };

    // and now, fire all the pref change events.
    prefChanges.forEach((item) => {
      events.onPrefChange[item.key](item.value);
    });

  }

  function updateForm() {

    // given current `gamePrefs`, ensure the form has the right things selected / checked.
    Object.keys(gamePrefs).forEach((key) => {

      let value = boolToInt(gamePrefs[key]);

      // find the matching input based on name, and update it.
      let input = dom.oForm.querySelector(`input[name="${key}"]`);

      // just in case...
      if (!input) return;

      // NOTE: intentional non-strict comparison here, string vs. int.
      if (input.value == value) {
        input.setAttribute('checked', true);
      } else {
        input.removeAttribute('checked');
      }

    });

  }

  function boolToInt(value) {

    // gamePrefs uses true / false, but the form needs 1 / 0.
    if (typeof value === 'boolean') return value ? 1 : 0;

    return value;

  }

  function stringToBool(value) {
    // LocalStorage stores strings, but JS state uses booleans and numbers.

    // number?
    if (!isNaN(value)) return parseInt(value, 10);

    // string to boolean?
    if (value === 'true') return true;
    if (value === 'false') return false;

    // string
    return value;
  }

  function writePrefsToStorage() {

    Object.keys(gamePrefs).forEach((key) => utils.storage.set(key, gamePrefs[key]));
    
  }

  function getPrefsFromStorage() {

    let prefsFromStorage = {};

    // TODO: validate the values pulled from storage. 😅
    Object.keys(defaultPrefs).forEach((key) => {
      let value = utils.storage.get(key);
      if (value !== undefined) {
        prefsFromStorage[key] = stringToBool(value);
      }
    });

    applyNewPrefs(prefsFromStorage);

    updateForm();

  }

  data = {
    active: false
  };

  dom = {
    o: null,
    oForm: null,
    optionsLink: null,
    oStatsBar: null,
    oGameTips: null,
    oToasts: null
  };

  events = {

    onFormSubmit: (e) => {

      updatePrefs();
      writePrefsToStorage();
      hide();
      e.preventDefault();
      return false;

    },

    optionsLinkOnClick: (e) => {

      show();
      e.preventDefault();
      return false;

    },

    onPrefChange: {

      sound: (isActive) => window.soundManager[isActive ? 'mute' : 'unmute'](),

      snow: (isActive) => {
        window?.snowStorm?.toggleSnow();
        // update battlefield sprites
        utils.css.addOrRemove(game.objects.view.dom.battleField, isActive, 'snow');
      },

      show_inventory: (show) => utils.css.addOrRemove(dom.oStatsBar, !show, 'hide-inventory'),

      show_weapons_status: (show) => utils.css.addOrRemove(dom.oStatsBar, !show, 'hide-weapons-status'),

      show_keyboard_labels: (show) => utils.css.addOrRemove(dom.oStatsBar, !show, 'hide-keyboard-labels'),

      show_game_tips: (show) => {

        // prevent removal if in tutorial mode, which requires tips
        if (!show && tutorialMode) return;

        utils.css.addOrRemove(dom.oGameTips, show, 'active');
      
      },

      show_health_status: (newValue) => {

        // hackish: iterate over most objects, and force a redraw of health bars
        let targets = ['tanks', 'vans', 'bunkers', 'missileLaunchers', 'infantry', 'parachuteInfantry', 'engineers', 'helicopters', 'balloons', 'smartMissiles', 'endBunkers', 'superBunkers', 'turrets'];
        let forceUpdate = true;

        targets.forEach((type) => {

          game.objects[type].forEach((obj) => {

            // exit if unset or zero
            if (!obj?.data?.lastEnergy) return;

            // update immediately if pref is now "always" show, OR, "sometimes/never" and we have an energy DOM node present.
            if (newValue === PREFS.SHOW_HEALTH_ALWAYS || obj?.dom?.oEnergy) {
              common.updateEnergy(obj, forceUpdate);
            }

          });

        });

      },

      notifications_location: (newValue) => utils.css.addOrRemove(dom.oToasts, newValue === PREFS.NOTIFICATIONS_LOCATION_LEFT, 'left-aligned')

    },

    updateScreenScale: () => {

      if (!data.active || !dom.o) return;

      // CSS shenanigans: `zoom: 2` applied, so we offset that here where supported.
      let scale = screenScale * (game.objects.view.data.usingZoom || isSafari ? 0.5 : 1);

      dom.o.style.transform = `translate3d(-50%, -50%, 0px) scale3d(${scale},${scale},1)`;

    }

  };

  return {
    init,
    isActive,
    updateScreenScale: events.updateScreenScale
  };

}

export {
  gamePrefs,
  prefs,
  PREFS,
  PrefsManager
};