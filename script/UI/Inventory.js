import {
  game,
  utils,
  setFrameTimeout,
  battleOver
} from '../aa.js';

import { TYPES } from '../core/global.js';

import {
  playSound,
  sounds
} from '../core/sound.js';

import { common} from '../core/common.js';

import { MissileLauncher } from '../units/MissileLauncher.js';
import { Tank } from '../units/Tank.js';
import { Van } from '../units/Van.js';
import { Infantry } from '../units/Infantry.js';
import { Engineer } from '../units/Engineer.js';

const Inventory = () => {

  let css, data, dom, objects, orderNotificationOptions, exports;

  function createObject(typeData, options) {

    // create and append a new (something) to its appropriate array.

    let orderObject;

    orderObject = typeData[1](options);

    // ignore if this is the stub object case
    if (!options.noInit) {

      typeData[0].push(orderObject);

      // force-append this thing, if it's on-screen right now
      common.updateIsOnScreen(orderObject);

      // set up the initial transition
      utils.css.add(orderObject.dom.o, css.building);

      // and start the "rise" animation
      window.requestAnimationFrame(() => {
        utils.css.add(orderObject.dom.o, css.ordering);

        setFrameTimeout(() => {
          if (!orderObject.dom?.o) return;
          utils.css.remove(orderObject.dom.o, css.ordering);
          utils.css.remove(orderObject.dom.o, css.building);
        }, 2200);

      });

    }

    return orderObject;

  }

  function processNextOrder() {

    // called each time an item is queued for building,
    // and each time an item finishes building (to see if there's more in the queue.)

    if (!data.building && data.queue.length) {

      // start building!
      data.building = true;

    }

    if (data.queue.length) {

      // first or subsequent queue items being built.

      // reset frame / build counter
      data.frameCount = 0;

      // take the first item out of the queue for building.
      objects.order = data.queue.shift();

    } else if (data.building && !data.queue.length) {

      utils.css.remove(dom.gameStatusBar, css.building);

      data.building = false;

      if (!objects.order.options.isEnemy) {

        if (sounds.inventory.end) {
          playSound(sounds.inventory.end);
        }

        // clear the queue that just finished.
        game.objects.helicopters[0].updateInventoryQueue();

        // clear the copy of the queue used for notifications.
        data.queueCopy = [];

        game.objects.notifications.add('Order complete 🛠️');
        
      }

    }

  }

  function order(type, options) {

    let typeData, orderObject, orderSize, cost, pendingNotification;

    if (battleOver) return;

    options = options || {};

    orderSize = 1;

    // default off-screen setting
    options.x = -72;

    // let's build something - provided you're good for the $$$, that is.

    typeData = data.types[type];

    // infantry or engineer? handle those specially.

    if (type === TYPES.infantry) {

      orderSize = 5;

    } else if (type === TYPES.engineer) {

      orderSize = 2;

    }

    // Hack: make a temporary object, so we can get the relevant data for the actual order.
    if (!options.isEnemy) {
      options.noInit = true;
    }

    orderObject = createObject(typeData, options);

    // do we have enough funds for this?
    cost = orderObject.data.inventory.cost;

    if (game.objects.endBunkers[0].data.funds >= cost) {

      game.objects.endBunkers[0].data.funds -= cost;

      game.objects.view.updateFundsUI();

      if (!data.isEnemy) {

        // hackish: this will be executed below.
        pendingNotification = () => {
          game.objects.notifications.add('Order: %s 🛠️', orderNotificationOptions);
        }

        // player may now be able to order things.
        game.objects.helicopters[0].updateStatusUI({ funds: true });
      }

    } else if (!data.isEnemy) {

      // Insufficient funds. "We require more vespene gas."
      if (sounds.inventory.denied) {
        playSound(sounds.inventory.denied);
      }

      game.objects.notifications.add('%s1%s2: %c1/%c2 💰🤏🤷', {
        type: 'NSF',
        onRender(input) {
          // hack: special-case missile launcher
          const text = type.replace('missileLauncher', 'missile launcher');
          // long vs. short-hand copy, flag set once NSF is hit and the order completes
          const result = input.replace('%s1', data.canShowNSF ? '' : 'Insufficient funds: ')
            .replace('%s2', (data.canShowNSF ? '🚫 ' : '') + text.charAt(0).toUpperCase() + (data.canShowNSF ? '' : text.slice(1)))
            .replace('%c1', game.objects.endBunkers[0].data.funds)
            .replace('%c2', cost);
          return result;
        },
        onComplete() {
          // start showing "NSF" short-hand, now that user has seen the long form
          data.canShowNSF = true;
        }
      });

      return;

    }

    // and now, remove `noInit` for the real build.
    options.noInit = false;

    // create and push onto the queue.
    const newOrder = {
      data: orderObject.data,
      // how long to wait after last item before "complete" (for buffering space)
      completeDelay: orderObject.data.inventory.orderCompleteDelay || 0,
      typeData,
      options,
      size: orderSize,
      originalSize: orderSize,
      onOrderStart: null,
      onOrderComplete: null,
    };

    let queueEvents;

    data.queue.push(newOrder);

    // preserve original list for display of notifications.
    // live `data.queue` is modified via `shift()` as it's processed.
    data.queueCopy.push(newOrder);

    if (!newOrder.options.isEnemy) {

      // update the UI
      utils.css.add(dom.gameStatusBar, css.building);

      // and make a noise
      if (sounds.inventory.begin) {
        playSound(sounds.inventory.begin);
      }

      // callback to update queue UI when the build actually begins
      queueEvents = game.objects.helicopters[0].updateInventoryQueue(newOrder);

      newOrder.onOrderStart = queueEvents.onOrderStart;
      newOrder.onOrderComplete = queueEvents.onOrderComplete;

      // display, if provided (relies on queue array to update order counts)
      if (pendingNotification) {
        pendingNotification();
      }

    }

    // only start processing if queue length is 1 - i.e., first item just added.

    if (!data.building) {
      processNextOrder();
    }

    // HACK
    if (options.isEnemy) {
      data.building = false;
    }

  }

  function animate() {

    if (!data.building || data.frameCount++ % objects.order.data.inventory.frameCount !== 0) return;

    if (objects.order.size) {

      // start building.
      createObject(objects.order.typeData, objects.order.options);

      // only fire "order start" once, whether a single tank or the first of five infantry.
      if (objects.order.size === objects.order.originalSize && objects.order.onOrderStart) {
        objects.order.onOrderStart();
      }

      objects.order.size--;

    } else if (objects.order.completeDelay) {

      // wait some amount of time after build completion? (fix spacing when infantry / engineers ordered, followed by a tank.)
      objects.order.completeDelay--;

    } else {

      // "Construction complete."

      // drop the item that just finished building.
      if (!objects.order.options.isEnemy && objects.order.onOrderComplete) {
        objects.order.onOrderComplete();
      }
      
      processNextOrder();

    }

  }

  function initStatusBar() {
    dom.gameStatusBar = document.getElementById('game-status-bar');
  }

  orderNotificationOptions = {
    type: 'order',
    onRender(input) {
      let i, j, actualType, types, counts, output;

      types = [];
      counts = [];
      output = [];

      // build arrays of unique items, and counts
      for (i=0, j=data.queueCopy.length; i<j; i++) {

        // same item as before? handle difference between infantry and engineers
        actualType = (data.queueCopy[i].data.role ? data.queueCopy[i].data.roles[data.queueCopy[i].data.role] : data.queueCopy[i].data.type);

        if (i > 0 && actualType === types[types.length-1]) {
          counts[counts.length-1] = (counts[counts.length-1] || 0) + 1;
        } else {
          // new type, first of its kind
          types.push(actualType);
          counts.push(1);
        }

      }

      if (types.length === 1) {
        // full type, removing dash from "missile-launcher"
        output.push(types[0].charAt(0).toUpperCase() + types[0].slice(1).replace('-', ' ') + (counts[0] > 1 ? `<sup>${counts[0]}</sup>` : ''));
      } else {
        for (i=0, j=types.length; i<j; i++) {
          output.push(types[i].charAt(0).toUpperCase() + (counts[i] > 1 ? `<sup>${counts[i]}</sup>` : ''));
        }
      }

      return input.replace('%s', output.join(' '));
    }, onComplete() {
      // clear the copy of the queue used for notifications.
      // any new notifications will start with a fresh queue.
      data.queueCopy = [];
    }
  }

  css = {
    building: 'building',
    ordering: 'ordering'
  };

  data = {
    frameCount: 0,
    // quick type-to-object/constructor array
    types: {
      tank: [game.objects.tanks, Tank],
      van: [game.objects.vans, Van],
      missileLauncher: [game.objects.missileLaunchers, MissileLauncher],
      infantry: [game.objects.infantry, Infantry],
      engineer: [game.objects.engineers, Engineer]
    },
    building: false,
    queue: [],
    queueCopy: [],
    canShowNSF: false
  };

  objects = {
    order: null
  };

  dom = {
    gameStatusBar: null
  };

  exports = {
    animate,
    data,
    dom,
    createObject,
    order
  };

  initStatusBar();

  return exports;

};

export { Inventory };