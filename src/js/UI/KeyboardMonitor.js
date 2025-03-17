import { prefsManager } from '../aa.js';
import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import {
  TYPES,
  defaultMissileMode,
  rubberChickenMode,
  bananaMode,
  GAME_SPEED,
  GAME_SPEED_INCREMENT,
  clientFeatures,
  updateClientFeatures
} from '../core/global.js';
import { gamePrefs } from './preferences.js';
import { net } from '../core/network.js';
import { common } from '../core/common.js';

// recycled from survivor.js
function KeyboardMonitor() {
  let data;
  let keys;
  let events;

  // meaningful labels for key values
  // NOTE: ASCII values are for upper-case characters, as applicable
  const keyMap = {
    banana: 66,
    rubberChicken: 67,
    shift: 16,
    ctrl: 17,
    space: 32,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    eject: '`',
    minus: '-',
    minus_1: '_',
    plus: '=',
    plus_1: '+',
    helicopter: 72,
    missileLauncher: 77,
    s: 83,
    tank: 84,
    van: 86,
    smartMissile: 88,
    infantry: 73,
    engineer: 69,
    pause_p: 80,
    flipAutomatically: 70,
    esc: 27,
    enter: 13,
    backtick: '`',
    delete_1: 8,
    delete_2: 46,
    z: 90
  };

  const allowedInPause = {
    [keyMap.pause_p]: true,
    [keyMap.esc]: true
  };

  const allowedInChatInput = {
    [keyMap.enter]: true,
    [keyMap.esc]: true
  };

  const altMissiles = {
    [keyMap.banana]: true,
    [keyMap.rubberChicken]: true
  };

  function updateDownKeyCount() {
    data.downKeyCount = Object.keys(data.downKeys).length;
  }

  /**
   * Decouple key events and game loop, as keys can change between
   * frames; more likely at 30 fps. This may contribute to de-sync.
   */

  let inputQueue = [];

  function applyInput() {
    if (!inputQueue.length) return;
    inputQueue.forEach((item) => item());
    inputQueue = [];
  }

  function queueInput(player, method, params) {
    // call out to the helicopter, e.g., ('setMissileLaunching', true)
    inputQueue.push(() => player.callAction(method, params));
  }

  function handleKeyDown(e, codeOrChar) {
    if (!e.metaKey && keys[codeOrChar]?.down) {
      if (!data.downKeys[codeOrChar]) {
        data.downKeys[codeOrChar] = true;
        updateDownKeyCount();
        keys[codeOrChar].down(e);
      }
      if (keys[codeOrChar].allowEvent === undefined) {
        return stopEvent(e);
      }
    }
    // if not a "simulated" event, mark the client as having support.
    // TODO: maybe hook this event separately.
    if (!e.fromAATouch && !clientFeatures.keyboard) {
      updateClientFeatures({ keyboard: true });
      utils.css.add(
        document.getElementById('player-status-bar'),
        'has_keyboard'
      );
    }
    return true;
  }

  function handleKeyUp(e, codeOrChar) {
    if (!e.metaKey && data.downKeys[codeOrChar] && keys[codeOrChar]) {
      delete data.downKeys[codeOrChar];
      updateDownKeyCount();
      if (keys[codeOrChar].up) {
        keys[codeOrChar].up(e);
      }
      if (keys[codeOrChar].allowEvent === undefined) {
        return stopEvent(e);
      }
    }

    return true;
  }

  function preFlightCheck(codeOrChar) {
    if (game.data.paused && !allowedInPause[codeOrChar]) return;

    if (game.objects.view.data.chatVisible && !allowedInChatInput[codeOrChar])
      return;

    if (altMissiles[codeOrChar] && !gamePrefs.alt_smart_missiles) return;

    return true;
  }

  events = {
    keydown(e) {
      // let editor handle keys, unless method returns truthy
      if (game.objects.editor && !game.objects.editor.events.keydown(e)) return;

      [e.keyCode, e.key].forEach((item) => {
        if (preFlightCheck(item)) handleKeyDown(e, item);
      });
    },

    keyup(e) {
      // let editor handle keys, unless method returns truthy
      if (game.objects.editor && !game.objects.editor.events.keyup(e)) return;

      [e.keyCode, e.key].forEach((item) => {
        if (preFlightCheck(item)) handleKeyUp(e, item);
      });
    }
  };

  keys = {
    // NOTE: Each function gets an (e) event argument.

    [keyMap.backtick]: {
      down() {
        queueInput(game.players.local, 'eject');
      }
    },

    // delete
    [keyMap.delete_1]: {
      down() {
        queueInput(game.players.local, 'eject');
      }
    },

    // same as above (TODO: DRY)
    [keyMap.delete_2]: {
      down() {
        queueInput(game.players.local, 'eject');
      }
    },

    [keyMap.enter]: {
      down(e) {
        if (game.data.started) {
          game.objects.view.handleChatInput(e);
        }
      }
    },

    [keyMap.shift]: {
      allowEvent: true,

      down() {
        queueInput(game.players.local, 'setFiring', true);
      },

      up() {
        queueInput(game.players.local, 'setFiring', false);
      }
    },

    [keyMap.s]: {
      down() {
        game.objects.radar?.toggleScaling(true);
      }
    },

    [keyMap.z]: {
      allowEvent: true,

      down() {
        queueInput(game.players.local, 'setBombing', true);
      },

      up() {
        queueInput(game.players.local, 'setBombing', false);
      }
    },

    [keyMap.space]: {
      down() {
        queueInput(game.players.local, 'setParachuting', true);
      },

      up() {
        queueInput(game.players.local, 'setParachuting', false);
      }
    },

    [keyMap.helicopter]: {
      down() {
        game.objects.inventory.order(
          TYPES.helicopter,
          undefined,
          game.players.local
        );
      }
    },

    [keyMap.missileLauncher]: {
      down() {
        game.objects.inventory.order(
          TYPES.missileLauncher,
          undefined,
          game.players.local
        );
      }
    },

    [keyMap.tank]: {
      down() {
        game.objects.inventory.order(TYPES.tank, undefined, game.players.local);
      }
    },

    [keyMap.van]: {
      down() {
        game.objects.inventory.order(TYPES.van, undefined, game.players.local);
      }
    },

    [keyMap.banana]: {
      down() {
        // heat-seeking banana
        game.objects.view.setMissileMode(bananaMode);

        queueInput(game.players.local, 'setMissileLaunching', true);
      },

      up() {
        queueInput(game.players.local, 'setMissileLaunching', false);
      }
    },

    [keyMap.rubberChicken]: {
      down() {
        // heat-seeking rubber chicken
        game.objects.view.setMissileMode(rubberChickenMode);

        queueInput(game.players.local, 'setMissileLaunching', true);
      },

      up() {
        queueInput(game.players.local, 'setMissileLaunching', false);
      }
    },

    [keyMap.smartMissile]: {
      down() {
        // standard heat-seeking missile
        game.objects.view.setMissileMode(defaultMissileMode);

        queueInput(game.players.local, 'setMissileLaunching', true);
      },

      up() {
        queueInput(game.players.local, 'setMissileLaunching', false);
      }
    },

    [keyMap.engineer]: {
      down() {
        game.objects.inventory.order(
          TYPES.engineer,
          undefined,
          game.players.local
        );
      }
    },

    [keyMap.infantry]: {
      down() {
        game.objects.inventory.order(
          TYPES.infantry,
          undefined,
          game.players.local
        );
      }
    },

    [keyMap.esc]: {
      down(e) {
        if (game.objects.view.data.chatVisible) {
          game.objects.view.handleChatInput(e);
        } else {
          prefsManager.toggleDisplay();
        }
      }
    },

    [keyMap.pause_p]: {
      down() {
        game.togglePause();
      }
    },

    [keyMap.flipAutomatically]: {
      down() {
        game?.players?.local.toggleAutoFlip();
      }
    },

    [keyMap.minus]: {
      down() {
        if (net.active) return;
        common.setGameSpeed(GAME_SPEED - GAME_SPEED_INCREMENT);
        // hackish
        utils.storage.set('game_speed', GAME_SPEED);
      }
    },

    [keyMap.plus]: {
      down() {
        if (net.active) return;
        common.setGameSpeed(GAME_SPEED + GAME_SPEED_INCREMENT);
        utils.storage.set('game_speed', GAME_SPEED);
      }
    }
  };

  keys[keyMap.minus_1] = keys[keyMap.minus];
  keys[keyMap.plus_1] = keys[keyMap.plus];

  /**
   * The original game used Z for bombs.
   * As a kid, for whatever reason, I would always remap Z to Ctrl.
   * Pinky finger preference for bombing, perhaps. :P
   */
  keys[keyMap.ctrl] = keys[keyMap.z];

  function isDown(labelOrCode) {
    // check for a pressed key based on '37' or 'left', etc.
    return keyMap[labelOrCode] !== undefined
      ? data.downKeys[keyMap[labelOrCode]]
      : data.downKeys[labelOrCode];
  }

  function releaseAll() {
    // reset all pressed key states.
    for (let item in data.downKeys) {
      if (data.downKeys[item]) {
        // simulate the keyup event
        events.keyup({
          keyCode: item
        });
      }
    }
    updateDownKeyCount();
  }

  function attachEvents() {
    utils.events.add(document, 'keydown', events.keydown);
    utils.events.add(document, 'keyup', events.keyup);
  }

  function stopEvent(e) {
    const evt = e || window.event;

    if (evt.preventDefault !== undefined) {
      evt.preventDefault();
    } else {
      evt.cancelBubble = true;
    }

    return false;
  }

  function initKeyboardMonitor() {
    if (data.didInit) return;

    data.didInit = true;

    attachEvents();
  }

  data = {
    didInit: false,
    downKeys: {},
    downKeyCount: 0
  };

  return {
    applyInput,
    data,
    init: initKeyboardMonitor,
    isDown,
    keydown: events.keydown,
    keyMap,
    keyup: events.keyup,
    releaseAll
  };
}

export { KeyboardMonitor };
