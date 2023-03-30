import { utils } from '../core/utils.js';
import { game } from '../core/Game.js';
import { getTypes, isiPhone, isMobile, isSafari, oneOf, tutorialMode } from '../core/global.js';
import { playQueuedSounds, playSound, sounds } from '../core/sound.js';
import { playSequence, resetBNBSoundQueue } from '../core/sound-bnb.js';
import { sprites } from '../core/sprites.js';
import { effects } from '../core/effects.js';

const prefs = {
  gameType: 'game_type'
};

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
  game_type: '', // [easy|hard|extreme]
  net_game_type: 'easy', // non-network default is tutorial, need to be explicit.
  net_game_style: 'pvp', // [pvp|pvp_cpu|coop_2v1|coop_2v2]
  net_player_name: '',
  net_remote_player_name: '',
  sound: true,
  bnb: false,
  bnb_tv: true,
  weather: '', // [none|rain|hail|snow|turd]
  domfetti: true,
  show_inventory: true,
  show_weapons_status: true,
  show_keyboard_labels: !isiPhone, // iPhone is unlikely to have a keyboard. iPad might. Desktops should, etc.
  show_game_tips: true,
  show_health_status: PREFS.SHOW_HEALTH_SOMETIMES, // never | sometimes | always
  // special case: mobile defaults to show @ left, important especially on small screens in portrait mode.
  notifications_location: (isMobile ? PREFS.NOTIFICATIONS_LOCATION_LEFT : PREFS.NOTIFICATIONS_LOCATION_RIGHT), // left | right
  enemy_missile_match_type: true,
  engineers_repair_bunkers: true,
  engineers_rob_the_bank: true,
  tank_gunfire_miss_bunkers: true,
  ground_unit_traffic_control: true
};

// allow URL-based overrides of prefs
let prefsByURL = {};

function normalizePrefValue(val) {
  // string / number to boolean, etc.
  if (val === 'true' || val == 1) return true;
  if (val === 'false' || val == 0) return false;
  return val;
}

const { hash } = window.location;
const hashParams = hash?.substr(hash.indexOf('#') === 0 ? 1 : 0)
const searchParams = new URLSearchParams(window.location.search || hashParams);

for (const p of searchParams) {
  // p = [name, value]
  if (defaultPrefs[p[0]] !== undefined) {
    prefsByURL[p[0]] = normalizePrefValue(p[1]);
  }
}

// initially, the game inherits the defaults
let gamePrefs = {
  ...defaultPrefs
};

function PrefsManager() {

  let data, dom, events;

  function init() {

    dom.o = document.getElementById('game-prefs-modal');
    dom.oChatUI = document.getElementById('network-options-chat-ui');
    dom.oForm = document.getElementById('game-prefs-form');
    dom.oFormSubmit = document.getElementById('game-prefs-submit');
    dom.oNetStatusLabel = document.getElementById('network-options-status-label');
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
    dom.o.style.setProperty('opacity', 0);
    dom.o.style.setProperty('display', 'block');

    let body = dom.o.querySelector('.body');
    body.style.setProperty('height', 'auto');

    let height = body.offsetHeight;

    // now assign the natural content height
    body.style.setProperty('height', height + 'px');

    // Remove the menu entirely from the DOM, set it up to append only when active.
    dom.o.remove();

    // reset opacity
    dom.o.style.setProperty('opacity', null);

    readAndApplyPrefsFromStorage();

    // hackish / special-case: force-update notification toast location IF it's on the left.
    // page HTML + CSS defaults to the right.
    if (gamePrefs.notifications_location === PREFS.NOTIFICATIONS_LOCATION_LEFT) {
      events.onPrefChange['notifications_location'](gamePrefs.notifications_location);
    }

  }

  function toggleDisplay() {

    if (data.active) {
      hide();
    } else {
      show();
    }

  }

  function show() {

    if (data.active || !dom.o) return;

    data.active = true;

    game.objects.view.data.ignoreMouseEvents = true;

    events.updateScreenScale();

    document.body.appendChild(dom.o);

    const now = Date.now();

    if (now - data.lastMenuOpen > data.lastMenuOpenThrottle) {

      data.lastMenuOpen = now;

      window.setTimeout(() => {

        if (!data.active) return;

        playSequence(oneOf([sounds.bnb.menuOpenV1, sounds.bnb.menuOpenV2, sounds.bnb.menuOpenV3]), null, () => data.active);

        // hackish BnB case: ensure what we may have just queued gets heard.
        playQueuedSounds();

      }, 500);

    } else {

      playSound(sounds.bnb.beavisPoop);

    }

    // hackish BnB case: ensure what we may have just queued gets heard.
    playQueuedSounds();

    game.pause({ noMute: true });

  }

  function hide() {

    if (!data.active || !dom.o) return;

    dom.o.remove();
    data.active = false;

    game.objects.view.data.ignoreMouseEvents = false;

    game.resume();

  }

  const isActive = () => data.active;

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

    // queue data for onChange() calls, as applicable
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

      // find the matching input(s) based on name, and update it.
      let inputs = dom.oForm.querySelectorAll(`input[name="${key}"]`);

      // just in case...
      if (!inputs?.forEach) return;

      inputs.forEach((input) => {
        // NOTE: intentional non-strict comparison here, string vs. int.
        if (input.value == value) {
          input.setAttribute('checked', true);
        } else {
          input.removeAttribute('checked');
        }
      });

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

  function readPrefsFromStorage() {

    let prefsFromStorage = {};

    // TODO: validate the values pulled from storage. 😅
    Object.keys(defaultPrefs).forEach((key) => {
      let value = utils.storage.get(key);
      if (value) {
        prefsFromStorage[key] = stringToBool(value);
      }
    });

    // if set, URL prefs override storage
    if (Object.keys(prefsByURL).length) {
      prefsFromStorage = {
        ...prefsFromStorage,
        ...prefsByURL
      };
      applyNewPrefs(prefsFromStorage);
    }

    return prefsFromStorage;
    
  }

  function readAndApplyPrefsFromStorage() {

    let prefs = readPrefsFromStorage();

    applyNewPrefs(prefs);

    updateForm();

  }

  function ignoreURLParams() {
    // edge case: if e.g., #bnb=0 or ?bnb=0 specified, start ignoring once the user clicks and overrides.
    prefsByURL = {};
  }

  data = {
    active: false,
    network: false,
    lastMenuOpen: 0,
    lastMenuOpenThrottle: 30000,
    readyToStart: false,
    remoteReadyToStart: false
  };

  dom = {
    o: null,
    oChatUI: null,
    oForm: null,
    oFormSubmit: null,
    oNetStatusLabel: null,
    optionsLink: null,
    oStatsBar: null,
    oGameTips: null,
    oToasts: null
  };

  events = {

    onConnect: () => {

      if (!data.active) return;

      events.onChat('Network connected. Testing ping...');

      updateNetworkStatus('Connected');

      dom.oFormSubmit.disabled = false;

    },

    onDisconnect: () => {

      if (!data.active) return;

      events.onChat('Network connection closed.');

      updateNetworkStatus('Disconnected');

      events.onRemoteReady({ ready: false });

      // reset local state. TODO: preserve and re-send on reconnect?
      events.onReadyState(false);

      resetPlayerNames();

    },

    onNetworkError: (text) => {

      if (!data.active) return;

      events.onChat(`Unable to start network: ${text}`);
      updateNetworkStatus('Error');

    },

    onChat: (text, playerName) => {

      const item = document.createElement('p');

      Object.assign(item.style, {
        margin: '0px',
        padding: '0px'
      });

      // host or guest player name, if specified
      if (playerName !== undefined) {
        text = `${playerName}: ${text}`
      }

      item.innerText = text;

      dom.oChatUI?.appendChild(item);

      const scroller = document.getElementById('network-options-chat-scroll');

      const { scrollHeight } = scroller;

      if (scrollHeight) {
        scroller.scrollTop = scrollHeight;
      }

    },

    onUpdatePrefs: (prefs) => {

      if (!dom.o) return;

      if (!data.active) return;

      if (!prefs?.length) return;

      const isBatch = prefs.length > 1;

      prefs.forEach((pref) => {

        // note, value is boolean.
        let { name, value } = pref;

        // update the local model with the boolean.
        gamePrefs[name] = value;

        // stringify for the form.
        const formValue = boolToInt(value);

        // find all input(s) (radio + checkbox) with the given name, then check the value.
        // qSA() doesn't return a full array, rather a note list; hence, the spread.
        [...dom.oForm.querySelectorAll(`input[name="${name}"]`)].forEach((input) => {
          input.checked = input.value == formValue;
        });

        if (!isBatch) {
          events.onChat(`${gamePrefs.net_remote_player_name} changed ${name} to ${formValue}`);
          // if we were "ready" to start, we changed our mind - so, reset accordingly.
          events.onReadyState(false);
        }

      });

      if (isBatch) {
        let name = gamePrefs.net_remote_player_name;
        events.onChat(`Received game preferences from ${name}`);
      }

    },

    onReadyState: (newState) => {

      if (!net.connected) return;

      if (newState === data.readyToStart) return;

      data.readyToStart = newState;
      dom.oFormSubmit.disabled = newState;

      net.sendMessage({ type: 'REMOTE_READY', params: { ready: data.readyToStart }});
      
      checkGameStart({ local: true });

    },

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

      sound: (isActive) => window.soundManager[isActive ? 'unmute' : 'mute'](),

      bnb: (isActive) => {

        // numerous UI updates
        utils.css.addOrRemove(document.body, isActive, 'bnb');

        // sprite coords may need updating
        [...game.objects.infantry, ...game.objects.engineer].forEach((ie) => ie.refreshHeight());

        if (!isActive) resetBNBSoundQueue();

        // before game start, user might open options menu and flip the pref.
        // update the game menu (start screen) UI if so.
        if (!game.data.started && data.active) {
          const vsCheckbox = document.getElementById('checkbox-vs');
          if (!vsCheckbox) return;
          vsCheckbox.checked = isActive;
        }

      },

      weather: (type) => {

        const { snowStorm } = window;

        if (!snowStorm) return;

        if (type && !snowStorm.active) {
          snowStorm.start();
          // hackish: kick off gameLoop, too, which is responsible for animation.
          game.objects.gameLoop.start();
        }

        effects.updateStormStyle(type);

        // update battlefield sprites
        if (game.objects.view) {
          utils.css.addOrRemove(game.objects.view.dom.battleField, type === 'snow', 'snow');
        }
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
        let targets = getTypes('tank, van, bunker, missileLauncher, infantry, parachuteInfantry, engineer, helicopter, balloon, smartMissile, endBunker, superBunker, turret', { group: 'all' });
        let forceUpdate = true;

        targets.forEach((target) => {

          game.objects[target.type].forEach((obj) => {

            // exit if unset or zero
            if (!obj?.data?.lastEnergy) return;

            // update immediately if pref is now "always" show, OR, "sometimes/never" and we have an energy DOM node present.
            if (newValue === PREFS.SHOW_HEALTH_ALWAYS || obj?.dom?.oEnergy) {
              sprites.updateEnergy(obj, forceUpdate);
            }

          });

        });

      },

      notifications_location: (newValue) => utils.css.addOrRemove(dom.oToasts, newValue === PREFS.NOTIFICATIONS_LOCATION_LEFT, 'left-aligned')

    },

    updateScreenScale: () => {

      const screenScale = game?.objects?.view?.data?.screenScale;

      if (!screenScale || !data.active || !dom.o) return;

      // CSS shenanigans: `zoom: 2` applied, so we offset that here where supported.
      let scale = screenScale * (game.objects.view.data.usingZoom || isSafari ? 0.5 : 1);

      // hackish: compromise for lack of `zoom: 2` on mobile - but only specifically iPhone?
      // TODO: review and figure out. iPad seems to render without scaling, just fine.
      if (isiPhone) {
        scale *= 1.85;
      }

      dom.o.style.setProperty('transform', `translate3d(-50%, -50%, 0px) scale3d(${scale},${scale},1)`);

    }

  };

  return {
    applyNewPrefs,
    init,
    ignoreURLParams,
    isActive,
    toggleDisplay,
    readPrefsFromStorage,
    readAndApplyPrefsFromStorage,
    show,
    updateForm,
    updateScreenScale: events.updateScreenScale,
    writePrefsToStorage
  };

}

export {
  gamePrefs,
  prefs,
  PREFS,
  PrefsManager
};