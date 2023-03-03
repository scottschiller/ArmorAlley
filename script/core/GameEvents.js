import { COSTS, oneOf, TYPES } from './global.js';
import { game } from './Game.js';
import { common } from '../core/common.js';
import { isGameOver } from '../core/logic.js';
import { addSequence, playSound, playSoundWithDelay, sounds } from '../core/sound.js';
import { playSequence } from './sound-bnb.js';
import { gamePrefs, prefs } from '../UI/preferences.js';

const EVENTS = {
  helicopterCollision: 'helicopter_collision',
  enemyDied: 'enemy_died',
  youDied: 'you_died',
  youKilledSomething: 'you_killed_something',
  youLost: 'you_lost',
  youWon: 'you_won',
  vanApproaching: 'van_approaching'
};

function playDelayedSound(sound, options, delay) {
  // sound without target = full volume, assumed on-screen
  const target = null;
  return playSoundWithDelay(sound, target, options, delay);
}

function GameEvents() {

  let data, exports;

  const events = {};
  let eventNames = [];

  // given an event, call its given method.
  function fireEvent(name, method = 'fire', ...args) {

    // console.warn(`No ${name} event registered (yet?)`);
    if (!events[name]) return;

    if (events[name][method]) {
      // by default, provide state to each method.
      events[name][method](events[name].getState(), ...args);
    } else {
      throw new Error(`WTF no method ${method} for event ${name}?`);
    }

  }

  // short-hand for the inner 'fire' method
  function fire(name, ...args) {
    return fireEvent(name, 'fire', ...args);
  }

  function addEvent(name, options) {

    const state = {
      completed: false,
      name
    };

    events[name] = {

      getState: () => state,

      init: () => {

        if (options.onInit) options.onInit(state);

      },

      reset: () => {

        state.completed = false;
        if (options.onReset) options.onReset(state);

      },

      complete: () => {

        state.completed = true;
        if (options.onComplete) options.onComplete(state);

      },

      animate: () => {

        if (state.completed) return;

        // once this goes truthy, this item is considered "complete."
        let didComplete;

        if (options.onAnimate) didComplete = options.onAnimate(state);

        if (!state.completed && didComplete) {
          fireEvent(state.name, 'complete');
        }

      },

      fire: (state, property, value) => {

        if (property) state[property] = value;

        if (options.onFire) options.onFire(state);

      },

      ...options

    };

    eventNames = Object.keys(events);

    fireEvent(name, 'init');

  }

  function init() {

    addEvent(EVENTS.vanApproaching, {

      // a van is nearing a base. notify, with throttling.

      animate: () => {},

      onInit: (state) => {

        state.lastNotifyYours = 0;
        state.lastNotifyTheirs = 0;
        state.notifyThrottle = 30000;

      },

      onFire: (state) => {

        const now = Date.now();

        if (state.isEnemy && (now - state.lastNotifyYours) >= state.notifyThrottle) {

          state.lastNotifyYours = now;
          game.objects.notifications.add('🚚 An enemy van is approaching your base 😨🤏💥');

        } else if (!state.isEnemy && (now - state.lastNotifyTheirs) >= state.notifyThrottle) {

          state.lastNotifyTheirs = Date.now();
          game.objects.notifications.add('🚚 Your van is approaching the enemy base 🤏💥');

        }

      }

    });

    addEvent(EVENTS.youKilledSomething, {

      // compliment the player if they effectively hit an equivalent of “GOURANGA!”
      // e.g., 25 credits' worth of inventory within a given time period.
      // https://youtu.be/FEWbI9G8r10

      animate: () => {},

      onInit: (state) => {

        // hackish: the type of the thing most recently taken out
        state.type = null;

        // kill X credits in Y interval = GOURANGA!
        state.killCreditsGouranga = 20;
        state.interval = 10000;

        fireEvent(state.name, 'reset');

      },

      reset: (state) => {

        state.killCredits = 0;
        state.ts = 0;

        if (state.timer) {
          state.timer.reset();
          state.timer = null;
        }
        
      },

      onFire: (state) => {

        const item = COSTS[state.type];

        // bunkers, etc., don't have a cost.
        if (!item?.funds) return;

        state.killCredits += ((item.funds / item.count) || 1);

        const now = Date.now();

        // start timer on first kill
        if (!state.ts) state.ts = now;

        const hasGouranga = state.killCredits >= state.killCreditsGouranga;
        const hasTime = (now - state.ts) < state.interval;

        // window has closed; reset state, and repeat.
        if (!hasTime) {
          fireEvent(state.name, 'reset');
          fireEvent(state.name, 'fire');
        }

        if (hasGouranga && hasTime) {

          // GOURANGA!
          if (state.timer) state.timer.reset();

          if (prefs.bnb) return;

          // only queue this once.
          if (!state.timer) {
            game.objects.notifications.add('💥 GOURANGA! 💥', { noRepeat: true });
          }


        }

      }

    });

  }

  // called at an interval
  function animate() {

    eventNames.forEach((name) => events[name].animate());
    common.setFrameTimeout(animate, 500);

  }

  function start() {

    init();
    animate();

  }

  data = {
    events,
    time: {
      start: new Date()
    }
  };

  exports = {
    data,
    fire,
    fireEvent,
    start
  };

  return exports;

}

const gameEvents = GameEvents();

export { EVENTS, gameEvents };