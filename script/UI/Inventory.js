import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { TYPES } from '../core/global.js';
import { playSound, playSoundWithDelay, sounds } from '../core/sound.js';
import { common } from '../core/common.js';
import { collisionCheck, isGameOver } from '../core/logic.js';
import { sprites } from '../core/sprites.js';

const Inventory = () => {

  let css, data, dom, objects, orderNotificationOptions, exports;

  const STD_LOOK_AHEAD = 8;

  function processNextOrder() {

    // called each time an item is queued for building,
    // and each time an item finishes building (to see if there's more in the queue.)

    if (!data.building && data.queue.length) {

      // start building!
      data.building = true;

    }

    if (data.queue.length || data.waiting) {

      // first or subsequent queue items being built.

      // reset frame / build counter
      data.frameCount = 0;

      // take the first item out of the queue for building.
      if (!objects.order) {
        // don't wait for the the first
        objects.order = data.queue.shift();
      } else if (!data.waiting) {
        objects.order = data.queue.shift();
        // wait if there are more in the queue
        data.waiting = true;
      }

      if (data.waiting && objects.lastObject) {

        // is there physical room for the next one?
        const nextOrder = objects.order;

        // collision check: if this thing would overlap, don't add it just yet
          if (collisionCheck(nextOrder.data, objects.lastObject.data, STD_LOOK_AHEAD)) {
          return;
        } else {
          data.waiting = false;
        }
  
      }
  

    } else if (data.building && !data.queue.length) {

      utils.css.remove(dom.gameStatusBar, css.building);

      data.building = false;

      if (!objects.order.options.isEnemy) {

        if (sounds.inventory.end) {
          playSound(sounds.inventory.end);
        }

        // clear the queue that just finished.
        game.objects[TYPES.helicopter][0].updateInventoryQueue();

        // clear the copy of the queue used for notifications.
        data.queueCopy = [];

        game.objects.notifications.add('Order complete 🛠️');
        
      }

    }

  }

  function isOrderingTV(queue = data.queueCopy) {

    if (queue?.length !== 2) return;

    return (queue[0].data.type === TYPES.tank && queue[1].data.type === TYPES.van);

  }

  function order(type, options = {}) {

    // this should be called only by the human player, not the CPU

    let orderObject, orderSize, cost, pendingNotification;

    if (isGameOver()) return;

    orderSize = 1;

    // default off-screen setting
    options.x = -72;

    // let's build something - provided you're good for the $$$, that is.

    // infantry or engineer? handle those specially.

    if (type === TYPES.infantry) {

      orderSize = 5;

    } else if (type === TYPES.engineer) {

      orderSize = 2;

    }

    // Hack: make a temporary object, so we can get the relevant data for the actual order.
    if (!options.isEnemy) options.noInit = true;

    orderObject = game.addObject(type, options);

    // do we have enough funds for this?
    cost = orderObject.data.inventory.cost;

    if (game.objects[TYPES.endBunker][0].data.funds >= cost) {

      game.objects[TYPES.endBunker][0].data.funds -= cost;

      game.objects.view.updateFundsUI();

      // hackish: this will be executed below.
      pendingNotification = () => {
        game.objects.notifications.add(`Order: %s ${isOrderingTV() ? '📺' : '🛠️'}`, orderNotificationOptions);
      }

      // player may now be able to order things.
      game.objects[TYPES.helicopter][0].updateStatusUI({ funds: true });

    } else {

      // Insufficient funds. "We require more vespene gas."
      if (sounds.inventory.denied) {
        playSound(sounds.inventory.denied);
      }

      game.objects.notifications.add('%s1%s2: %c1/%c2 💰 🤏 🤷', {
        type: 'NSF',
        onRender(input) {
          // hack: special-case missile launcher
          const text = type.replace('missileLauncher', 'missile launcher');
          // long vs. short-hand copy, flag set once NSF is hit and the order completes
          const result = input.replace('%s1', data.canShowNSF ? '' : 'Insufficient funds: ')
            .replace('%s2', (data.canShowNSF ? '🚫 ' : '') + text.charAt(0).toUpperCase() + (data.canShowNSF ? '' : text.slice(1)))
            .replace('%c1', game.objects[TYPES.endBunker][0].data.funds)
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
      type,
      options,
      size: orderSize,
      originalSize: orderSize,
      onOrderStart: null,
      onOrderComplete: null,
      waiting: false
    };

    let queueEvents;

    data.queue.push(newOrder);

    // preserve original list for display of notifications.
    // live `data.queue` is modified via `shift()` as it's processed.
    data.queueCopy.push(newOrder);

    if (sounds.bnb.tv && isOrderingTV()) {
      playSoundWithDelay(sounds.bnb.tv);
    }

    // update the UI
    utils.css.add(dom.gameStatusBar, css.building);

    // and make a noise
    if (sounds.inventory.begin) {
      playSound(sounds.inventory.begin);
    }

    // callback to update queue UI when the build actually begins
    queueEvents = game.objects[TYPES.helicopter][0].updateInventoryQueue(newOrder);

    newOrder.onOrderStart = queueEvents.onOrderStart;
    newOrder.onOrderComplete = queueEvents.onOrderComplete;

    // display, if provided (relies on queue array to update order counts)
    if (pendingNotification) {
      pendingNotification();
    }

    // only start processing if queue length is 1 - i.e., first item just added.

    if (!data.building) {
      processNextOrder();
    }

  }

  function animate() {

    let newObject;

    if (!data.building || data.frameCount++ % objects.order.data.inventory.frameCount !== 0) return;

    if (data.waiting) return processNextOrder();

    if (objects.order.size) {

      // start building.
      newObject = game.addObject(objects.order.type, objects.order.options);

      // ignore if this is the stub object case
      if (!objects.order.options.noInit) {

        // force-append this thing, if it's on-screen right now
        sprites.updateIsOnScreen(newObject);

        utils.css.add(newObject.dom.o, css.building);

        // and start the "rise" animation
        window.requestAnimationFrame(() => {

          utils.css.add(newObject.dom.o, css.ordering);

          common.setFrameTimeout(() => {
            if (!newObject.dom?.o) return;
            utils.css.remove(newObject.dom.o, css.ordering);
            utils.css.remove(newObject.dom.o, css.building);
          }, 2200);

        });

      }


      // only fire "order start" once, whether a single tank or the first of five infantry.
      if (objects.order.size === objects.order.originalSize && objects.order.onOrderStart) {
        objects.order.onOrderStart();
      }

      if (!objects.order.options.isEnemy) {
        objects.lastObject = newObject;
      }

      objects.order.size--;

    } else if (objects.order.completeDelay) {

      // wait some amount of time after build completion? (fix spacing when infantry / engineers ordered, followed by a tank.)
      objects.order.completeDelay--;

    } else {

      // "Construction complete."

      if (!objects.order.options.isEnemy) {

        data.waiting = false;

        // drop the item that just finished building.
        objects.order?.onOrderComplete();

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
    building: false,
    queue: [],
    queueCopy: [],
    canShowNSF: false,
    waiting: false
  };

  objects = {
    order: null,
    lastObject: null
  };

  dom = {
    gameStatusBar: null
  };

  exports = {
    animate,
    data,
    dom,
    order
  };

  initStatusBar();

  return exports;

};

export { Inventory };