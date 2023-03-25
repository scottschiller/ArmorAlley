import { prefsManager } from '../aa.js';
import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { TYPES, defaultMissileMode, rubberChickenMode, bananaMode } from '../core/global.js';

// recycled from survivor.js
function KeyboardMonitor() {

  let keys;
  let events;

  // hash for keys being pressed
  const downKeys = {};

  // meaningful labels for key values
  const keyMap = {
    banana: 66,
    rubber_chicken: 67,
    shift: 16,
    ctrl: 17,
    space: 32,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    missileLauncher: 77,
    tank: 84,
    van: 86,
    smart_missile: 88,
    infantry: 73,
    engineer: 69,
    pause_p: 80,
    esc: 27
  };

  const allowedInPause = {
    [keyMap.pause_p]: true,
    [keyMap.esc]: true
  };

  events = {

    keydown(e) {

      if (game.data.paused && !allowedInPause[e.keyCode]) return;

      // console.log(e.keyCode);

      if (!e.metaKey && keys[e.keyCode]?.down) {
        if (!downKeys[e.keyCode]) {
          downKeys[e.keyCode] = true;
          keys[e.keyCode].down(e);
        }
        if (keys[e.keyCode].allowEvent === undefined) {
          return stopEvent(e);
        }
      }

      return true;

    },

    keyup(e) {

      if (game.data.paused && !allowedInPause[e.keyCode]) return;

      if (!e.metaKey && downKeys[e.keyCode] && keys[e.keyCode]) {
        downKeys[e.keyCode] = null;
        if (keys[e.keyCode].up) {
          keys[e.keyCode].up(e);
        }
        if (keys[e.keyCode].allowEvent === undefined) {
          return stopEvent(e);
        }
      }

      return true;

    }

  };


  const processInput = (player, method, params) => player.callAction(method, params);

  keys = {

    // NOTE: Each function gets an (e) event argument.

    // return / enter
    13: {

      allowEvent: true, // don't use stopEvent()

      down() {

        processInput(game.players.local, 'eject');

      }

    },

    // shift
    16: {

      allowEvent: true,

      down() {

        processInput(game.players.local, 'setFiring', true);

      },

      up() {

        processInput(game.players.local, 'setFiring', false);
        
      }

    },

    // ctrl
    17: {

      allowEvent: true,

      down() {

        processInput(game.players.local, 'setBombing', true);

      },

      up() {

        processInput(game.players.local, 'setBombing', false);
        
      }

    },

    // space bar
    32: {

      down() {

        processInput(game.players.local, 'setParachuting', true);

      },

      up() {

        processInput(game.players.local, 'setParachuting', false);

      }

    },

    // "m"
    77: {

      down() {

        game.objects.inventory.order(TYPES.missileLauncher, undefined, game.players.local);

      }

    },

    // "t"
    84: {

      down() {

        game.objects.inventory.order(TYPES.tank, undefined, game.players.local);

      }

    },

    // "v"
    86: {

      down() {

        game.objects.inventory.order(TYPES.van, undefined, game.players.local);

      }

    },

    // "b" (banana)
    66: {
      down() {

        // heat-seeking banana
        game.objects.view.setMissileMode(bananaMode);

        processInput(game.players.local, 'setMissileLaunching', true);

      },

      up() {

        processInput(game.players.local, 'setMissileLaunching', false);

      }

    },

    // "c" (rubber chicken)
    67: {

      down() {

        // heat-seeking rubber chicken
        game.objects.view.setMissileMode(rubberChickenMode);

        processInput(game.players.local, 'setMissileLaunching', true);

      },

      up() {

        processInput(game.players.local, 'setMissileLaunching', false);

      }

    },

    // "x"
    88: {

      down() {

        // standard heat-seeking missile
        game.objects.view.setMissileMode(defaultMissileMode);

        processInput(game.players.local, 'setMissileLaunching', true);

      },

      up() {

        processInput(game.players.local, 'setMissileLaunching', false);

      }

    },

    // "e"
    69: {

      down() {

        game.objects.inventory.order(TYPES.engineer, undefined, game.players.local);

      }

    },

    // "i"
    73: {

      down() {

        game.objects.inventory.order(TYPES.infantry, undefined, game.players.local);

      }

    },

    27: {

      down() {

        prefsManager.toggleDisplay();

      }

    },

    80: {

      down() {

        game.togglePause();

      }
  
    },

  };

  function isDown(labelOrCode) {

    // check for a pressed key based on '37' or 'left', etc.
    return (keyMap[labelOrCode] !== undefined ? downKeys[keyMap[labelOrCode]] : downKeys[labelOrCode]);

  }

  function releaseAll() {

    // reset all pressed key states.
    for (let item in downKeys) {
      if (downKeys[item]) {
        // simulate the keyup event
        events.keyup({
          keyCode: item
        });
      }
    }

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

    attachEvents();

  }

  return {

    init: initKeyboardMonitor,
    isDown,
    keydown: events.keydown,
    keyMap,
    keyup: events.keyup,
    releaseAll

  };

}

export { KeyboardMonitor };