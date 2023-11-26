import { game, gameType } from '../core/Game.js';
import { utils } from '../core/utils.js';
import {
  COSTS,
  FPS,
  parseTypes,
  PRETTY_TYPES,
  TYPES,
  worldWidth
} from '../core/global.js';
import { playSound, playSoundWithDelay, sounds } from '../core/sound.js';
import { common } from '../core/common.js';
import { collisionCheck } from '../core/logic.js';
import { sprites } from '../core/sprites.js';
import { net } from '../core/network.js';

const Inventory = () => {
  let css, data, dom, objects, orderNotificationOptions, exports;

  const STD_LOOK_AHEAD = 8;

  // extra spacing between infantry and engineers
  const SIZE_DELAY_FRAMES = 10;

  // minimum delay time for e.g., a single tank to "build."
  const ORDER_COMPLETE_DELAY_FRAMES = FPS * 2;

  function setWaiting(isWaiting) {
    data.waiting = isWaiting;
    data.waitingFrames = 0;
  }

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
        setWaiting(true);
      }

      if (data.waiting && objects.lastObject) {
        // is there physical room for the next one?
        const nextOrder = objects.order;

        /**
         * Nearby check: if the new order would overlap, don't add it just yet -
         * and make sure the last object is still alive. :X
         *
         * Prior to the dead check, this was one cause of ordering getting stuck.
         * `waitingFramesMax` is a release valve, in case something goes south.
         */
        if (
          !data.nextTimer &&
          !objects.lastObject.data.dead &&
          collisionCheck(
            nextOrder.data,
            objects.lastObject.data,
            STD_LOOK_AHEAD * nextOrder.data.isEnemy ? -1 : 1
          ) &&
          data.waitingFrames++ < data.waitingFramesMax
        ) {
          // wait...
          return;
        } else {
          if (!data.nextTimer) {
            // delay, then next order.
            data.waitingFrames = 0;
            data.nextTimer = common.setFrameTimeout(() => {
              data.nextTimer = null;
              setWaiting(false);
            }, data.nextOrderDelay);
          }
        }
      }
    } else if (data.building && !data.queue.length) {
      // delay a bit before the "all-clear" after an order has finished.
      if (data.orderCompleteDelayFrames) {
        data.orderCompleteDelayFrames--;
        return;
      }

      utils.css.remove(dom.gameStatusBar, css.building);

      data.building = false;

      // CPU vs non-CPU
      if (!objects.order.options.isCPU) {
        if (sounds.inventory.end) {
          playSound(sounds.inventory.end);
        }

        // clear the queue that just finished.
        updateInventoryQueue();

        // clear the copy of the queue used for notifications.
        data.queueCopy = [];

        game.objects.notifications.add('Order complete 🚚✨');
      }
    }
  }

  function isOrderingTV(queue = data.queueCopy) {
    if (queue?.length !== 2) return;

    return (
      queue[0].data.type === TYPES.tank && queue[1].data.type === TYPES.van
    );
  }

  function order(type, options = {}, player) {
    // this should be called only by the human player, not the CPU

    if (game.data.battleOver) return;

    let orderObject, orderSize, cost, pendingNotification;

    // default off-screen setting
    options.x = -72;

    if (player.data.isCPU) {
      options.isCPU = true;
    }

    // TODO: review CPU check - may not be needed.
    if (player.data.isEnemy && !player.data.isCPU) {
      options.isEnemy = true;
      options.x = worldWidth + 64;
    }

    // Hack: make a temporary object, so we can get the relevant data for the actual order.
    orderObject = game.addObject(type, {
      ...options,
      noInit: true
    });

    // let's build something - provided you're good for the $$$, that is.
    orderSize = COSTS[type].count;

    // do we have enough funds for this?
    cost = COSTS[orderObject.data.type]?.funds;

    let remote;

    // network co-op case: if the remote player is on the same team and ordering, add to the local queue.
    if (
      net.active &&
      !player.data.isLocal &&
      player.data.isEnemy === game.players.local.data.isEnemy
    ) {
      remote = true;
      // This has been "paid for" by the remote player.
      // Thusly, make the local cost here zero until we have a joint banking feature. :D
      cost = 0;
    }

    const bunkerOffset = player.data.isEnemy ? 1 : 0;

    if (game.objects[TYPES.endBunker][bunkerOffset].data.funds >= cost) {
      game.objects[TYPES.endBunker][bunkerOffset].data.funds -= cost;

      game.objects.view.updateFundsUI();

      // hackish: this will be executed below.
      pendingNotification = () => {
        game.objects.notifications.add(
          `📦 %s ${isOrderingTV() ? '📺' : '🛠️'}${remote ? ' 📡' : ''}`,
          orderNotificationOptions
        );
      };

      // player may now be able to order things.
      game.players.local.updateStatusUI({ funds: true });
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
          const result = input
            .replace('%s1', data.canShowNSF ? '' : 'Insufficient funds: ')
            .replace(
              '%s2',
              (data.canShowNSF ? '🚫 ' : '') +
                text.charAt(0).toUpperCase() +
                (data.canShowNSF ? '' : text.slice(1))
            )
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

    // Network co-op: We have a remote friendly player...
    if (
      net.active &&
      player.data.isLocal &&
      player.data.isEnemy === game.players.remote[0].data.isEnemy
    ) {
      if (net.isHost) {
        // ... and we are the host: Notify the remote of what we're ordering.
        net.sendMessage({
          type: 'NOTIFICATION',
          html: `${PRETTY_TYPES[type]}`,
          notificationType: 'remoteOrder'
        });
      } else {
        /**
         * Network co-op case: Remote friendly player, NOT the host: just send order details.
         * The host will receive and process the order as though it had been made locally.
         * This will result in adding objects (e.g., tanks) to the battlefield, which will
         * be sent back to the guest via ADD_OBJECT.
         *
         * TODO: for multi-player, identify host as e.g., `game.players.host` vs remote[0].
         */
        net.sendMessage({
          type: 'REMOTE_ORDER',
          orderType: type,
          options,
          id: player.data.id
        });

        game.objects.notifications.add(`📦 ${PRETTY_TYPES[type]} 🛠️`);

        return;
      }
    }

    // and now, remove `noInit` for the real build.
    options.noInit = false;

    // create and push onto the queue.
    const newOrder = {
      data: orderObject.data,
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

    // set the delay for when the build completes.
    data.orderCompleteDelayFrames = ORDER_COMPLETE_DELAY_FRAMES;

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
    queueEvents = updateInventoryQueue(newOrder);

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

  function applyRiseTransition(newObject) {
    if (!newObject?.dom?.o) return;

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

  function animate() {
    let newObject;

    if (!data.building) return;

    if (data.waiting) return processNextOrder();

    if (objects.order.size) {
      if (
        objects.lastObject &&
        !objects.lastObject.data.dead &&
        collisionCheck(
          objects.order.data,
          objects.lastObject.data,
          STD_LOOK_AHEAD * objects.order.options.isEnemy ? -1 : 1
        ) &&
        data.waitingFrames++ < data.waitingFramesMax
      ) {
        // wait for space to create next infantry / engineer
        return;
      }

      // hackish: additional delay / spacing between infantry and engineers
      if (data.sizeDelayFrames) {
        data.sizeDelayFrames--;
        return;
      }

      data.waitingFrames = 0;

      const sendToRemote = !!net.active;

      // hackish: modify options, if we're ordering the real thing.
      if (!objects.order.options.noInit) {
        objects.order.options.prefixID = !!sendToRemote;
      }

      // start building.
      newObject = game.addObject(objects.order.type, objects.order.options);

      // ignore if this is the stub object case
      if (!objects.order.options.noInit) {
        // mirror this on the other side, if a network game.
        if (sendToRemote) {
          net.sendMessage({
            type: 'ADD_OBJECT',
            objectType: newObject.data.type,
            params: {
              ...objects.order.options,
              id: newObject.data.id
            }
          });
        }

        applyRiseTransition(newObject);
      }

      // only fire "order start" once, whether a single tank or the first of five infantry.
      if (
        objects.order.size === objects.order.originalSize &&
        objects.order.onOrderStart
      ) {
        objects.order.onOrderStart();
      }

      if (!objects.order.options.isCPU) {
        objects.lastObject = newObject;
      }

      objects.order.size--;

      // re-apply the delay for the next item.
      data.sizeDelayFrames = SIZE_DELAY_FRAMES;
    } else {
      // "Construction complete."

      if (!objects.order.options.isCPU) {
        // artificial delay only if the original queue size is 1, e.g., a single tank.
        // this hack applies only because there is no collision check otherwise to say, "wait until there's room."
        if (data.queueCopy.length === 1 && data.orderCompleteDelayFrames) {
          data.orderCompleteDelayFrames--;
          return;
        }

        data.waiting = false;
        data.waitingFrames = 0;

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
      for (i = 0, j = data.queueCopy.length; i < j; i++) {
        // same item as before? handle difference between infantry and engineers
        actualType = data.queueCopy[i].data.role
          ? data.queueCopy[i].data.roles[data.queueCopy[i].data.role]
          : data.queueCopy[i].data.type;

        if (i > 0 && actualType === types[types.length - 1]) {
          counts[counts.length - 1] = (counts[counts.length - 1] || 0) + 1;
        } else {
          // new type, first of its kind
          types.push(actualType);
          counts.push(1);
        }
      }

      if (types.length === 1) {
        // full type, removing dash from "missile-launcher"
        output.push(
          types[0].charAt(0).toUpperCase() +
            types[0].slice(1).replace('-', ' ') +
            (counts[0] > 1 ? `<sup>${counts[0]}</sup>` : '')
        );
      } else {
        for (i = 0, j = types.length; i < j; i++) {
          output.push(
            types[i].charAt(0).toUpperCase() +
              (counts[i] > 1 ? `<sup>${counts[i]}</sup>` : '')
          );
        }
      }

      return input.replace('%s', output.join(' '));
    },
    onComplete() {
      // clear the copy of the queue used for notifications.
      // any new notifications will start with a fresh queue.
      data.queueCopy = [];
    }
  };

  function startEnemyOrdering() {
    // basic enemy ordering pattern
    const enemyOrders = parseTypes(
      'missileLauncher, tank, van, infantry, infantry, infantry, infantry, infantry, engineer, engineer'
    );
    const enemyDelays = [4, 4, 3, 0.4, 0.4, 0.4, 0.4, 1, 0.45];
    let orderOffset = 0;

    if (gameType === 'extreme') {
      // one more tank to round out the bunch, and (possibly) further complicate things :D
      enemyOrders.push(TYPES.tank);

      // matching delay, too
      enemyDelays.push(4);
    }

    // the more CPUs, the faster the convoys! :D
    const convoyDelay =
      (gameType === 'extreme' ? 20 : gameType === 'hard' ? 30 : 60) /
      game.players.cpu.length;

    // after ordering, wait a certain amount before the next convoy
    enemyDelays.push(convoyDelay);

    function orderNextItem() {
      let options;

      if (!game.data.battleOver && !game.data.paused && !game.objects.editor) {
        options = {
          isEnemy: true,
          x: worldWidth + 64
        };

        if (!game.data.productionHalted) {
          const newObject = game.addObject(enemyOrders[orderOffset], options);

          applyRiseTransition(newObject);

          // ensure this order shows up on the remote
          if (net.active) {
            net.sendMessage({
              type: 'ADD_OBJECT',
              objectType: newObject.data.type,
              params: {
                ...options,
                id: newObject.data.id
              }
            });
          }
        }

        common.setFrameTimeout(orderNextItem, enemyDelays[orderOffset] * 1000);

        orderOffset++;

        if (orderOffset >= enemyOrders.length) {
          orderOffset = 0;
        }
      }
    }

    common.setFrameTimeout(orderNextItem, data.enemyOrderDelay);
  }

  function updateInventoryQueue(item) {
    // TODO: this queue and X-of-Y built logic could use a refactoring.
    let dataBuilt,
      dataCount,
      dataCountOriginal,
      dataType,
      element,
      type,
      typeFromElement,
      isDuplicate,
      o,
      oCounter,
      oLastChild,
      queue,
      count;

    queue = document.getElementById('queue');

    dataBuilt = 'data-built';
    dataCount = 'data-count';
    dataCountOriginal = 'data-count-original';
    dataType = 'data-type';

    count = 0;

    function updateBuilt() {
      let built = parseInt(element?.getAttribute(dataBuilt), 10) || 1;
      built++;
      element?.setAttribute(dataBuilt, built);
    }

    function updateCount() {
      let built, originalCount;
      originalCount = element?.getAttribute(dataCountOriginal) || 0;
      built = parseInt(element?.getAttribute(dataBuilt), 10) || 1;
      const adjustedCount = Math.min(built, originalCount);
      oCounter.innerHTML = `<span class="fraction-wrapper"><sup>${adjustedCount}</sup><em class="fraction">&frasl;</em><sub>${originalCount}</sub></span>`;
      // hackish: two tanks ordered, just started ordering #2, then one or more added while display is still active; ensure UI looks right.
      utils.css.remove(element, 'complete');
      utils.css.add(element, css.building);
    }

    // FIFO-based queue: `item` is provided when something is being queued.
    // otherwise, the first item has finished and can be removed from the queue.
    if (item) {
      // tank, infantry, or special-case: engineer.
      type = item.data.role ? item.data.roles[item.data.role] : item.data.type;

      if (queue.childNodes.length) {
        oLastChild = queue.childNodes[queue.childNodes.length - 1];
      }

      // are we appending a duplicate, e.g., two tanks in a row?
      if (oLastChild) {
        typeFromElement = oLastChild.getAttribute(dataType);

        // direct className match, or, engineer special case
        if (typeFromElement === type) isDuplicate = true;

        element = oLastChild;
      }

      if (!isDuplicate) {
        o = document.createElement('div');
        o.className = 'queue-item';

        // special engineer case vs. others.
        o.setAttribute(dataType, type);

        // tank -> T etc.
        o.innerHTML = type.charAt(0).toUpperCase();

        oCounter = document.createElement('div');
        oCounter.className = 'counter';

        o.appendChild(oCounter);

        queue.appendChild(o);

        element = o;
      }

      oCounter = element.getElementsByClassName('counter')[0];

      // active tracking counter: how many to build (decremented as builds happen)
      count = (parseInt(element.getAttribute(dataCount), 10) || 0) + 1;

      element.setAttribute(dataCount, count);

      // how many have been built - always starting with 1
      element.setAttribute(
        dataBuilt,
        parseInt(element.getAttribute(dataBuilt), 10) || 1
      );

      // how many have been ordered, always incrementing only
      element.setAttribute(
        dataCountOriginal,
        (parseInt(element.getAttribute(dataCountOriginal), 10) || 0) + 1
      );

      // offset text, if needed
      if (count >= 10) {
        utils.css.add(element, 'over-ten');
      }

      if (
        utils.css.has(element, css.building) ||
        utils.css.has(element, css.complete)
      ) {
        updateCount();
      } else {
        oCounter.innerHTML = count;
      }

      common.setFrameTimeout(() => {
        // transition in
        utils.css.add(o, 'queued');
        // show or hide
        utils.css.addOrRemove(element, count > 1, css.hasCounter);
      }, 128);

      // return callbacks for when building starts and finishes.
      return {
        onOrderStart() {
          utils.css.add(o, css.building);
          count = parseInt(element.getAttribute(dataCount), 10) || 1;

          // first unit being built?
          if (!isDuplicate) {
            updateCount();
            return;
          }

          // decrement and update, x/y
          count--;
          element.setAttribute(dataCount, count);
          updateCount();
        },
        onOrderComplete() {
          // mark as complete once all have been built.
          updateBuilt();

          if (!element) return;

          // not "complete" until count is 0
          count = (parseInt(element.getAttribute(dataCount), 10) || 1) - 1;
          if (count) return;

          // show the raw digit
          oCounter.innerHTML = element.getAttribute(dataCountOriginal);

          utils.css.remove(element, css.building);
          utils.css.add(element, css.complete);

          // hackish: ensure it was queued also, in case this was completed too quickly.
          utils.css.add(element, css.queued);

          // prevent element leaks
          oCounter = null;
          element = null;
          o = null;
        }
      };
    } else {
      // clear entire queue.
      common.setFrameTimeout(() => {
        queue.childNodes.forEach((node) => utils.css.add(node, 'collapsing'));
        // addCSSToAll(queue.childNodes, 'collapsing');
        // finally, remove the nodes.
        // hopefully, no race condition here. :P
        common.setFrameTimeout(() => {
          // prevent element leaks
          oCounter = null;
          element = null;
          o = null;
          // TODO: improve.
          queue.innerHTML = '';
        }, 500);
      }, 500);
    }
  }

  css = {
    building: 'building',
    complete: 'complete',
    hasCounter: 'has-counter',
    queued: 'queued',
    ordering: 'ordering'
  };

  data = {
    frameCount: 0,
    enemyOrderDelay: 5000,
    building: false,
    queue: [],
    queueCopy: [],
    canShowNSF: false,
    nextOrderDelay: 250,
    nextTimer: null,
    sizeDelayFrames: 0,
    orderCompleteDelayFrames: 0,
    waiting: false,
    waitingFrames: 0,
    waitingFramesMax: 120
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
    order,
    startEnemyOrdering
  };

  initStatusBar();

  return exports;
};

export { Inventory };
