import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import {
  COSTS,
  FPS,
  PRETTY_TYPES,
  rnd,
  rndInt,
  TYPES,
  worldWidth
} from '../core/global.js';
import { playSound, playSoundWithDelay, sounds } from '../core/sound.js';
import { common } from '../core/common.js';
import { collisionCheck } from '../core/logic.js';
import { sprites } from '../core/sprites.js';
import { net } from '../core/network.js';
import { gamePrefs } from './preferences.js';
import { levelConfig } from '../levels/default.js';
import { parseConvoyData } from '../levels/convoys.js';

const MAX_MEN = 30;

// from the original game: "requisition denied - quota exceeded"
const maxUnitsByType = {
  [TYPES.tank]: 15,
  [TYPES.missileLauncher]: 6,
  [TYPES.van]: 10,
  // all "men" - infantry + engineers, and paratroopers.
  [TYPES.infantry]: MAX_MEN,
  [TYPES.engineer]: MAX_MEN
};

const stepTypes = {
  [TYPES.tank]: true,
  [TYPES.missileLauncher]: true,
  [TYPES.van]: true,
  [TYPES.infantry]: true,
  [TYPES.engineer]: true
};

const charToType = {
  M: TYPES.missileLauncher,
  T: TYPES.tank,
  V: TYPES.van,
  I: TYPES.infantry,
  E: TYPES.engineer
};

const delaysByType = {
  [TYPES.missileLauncher]: 3,
  [TYPES.tank]: 3,
  [TYPES.van]: 2,
  [TYPES.infantry]: 4,
  [TYPES.engineer]: 2
};

const noChopperPurchase = 'Helicopter order N/A:\nYou have unlimited lives. 🚁';

// parsed convoy data for the current battle
let convoys;

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

  function filterUnit(unit, type, isEnemy) {
    return (
      unit.data.type === type &&
      !unit.data.dead &&
      unit.data.isEnemy === isEnemy
    );
  }

  function withinUnitLimits(type, isEnemy) {
    /**
     * Given a unit type and friendly/enemy "team", count the number of active items.
     * Pending orders also count toward the limit.
     */

    // when not in "unlimited lives" mode, you can purchase as many choppers as you like.
    if (type === TYPES.helicopter) return true;

    let count = 0;
    let units = [];

    // here, use the copy of the queue which is preserved until all orders in a "batch" are completed.
    let q = data.queue;

    // special case: infantry = "men", combining with engineers and paratroopers (which will either die or become infantry.)
    if (type === TYPES.infantry || type === TYPES.engineer) {
      units = units.concat(
        game.objects[TYPES.infantry],
        game.objects[TYPES.engineer],
        game.objects[TYPES.parachuteInfantry]
      );

      // each order here represents multiples; five infantry, or two engineers.
      // when known, just add directly to the count.
      let orders = [];

      let queueOrders = q.filter((item) =>
        item.data.type.match(/infantry|engineer/)
      );

      // "multiply" each order by its size - e.g., two engineers, or five infantry.
      queueOrders.forEach((qOrder) => {
        // NOTE: using `originalSize` as order `size` counts change while "building," e.g., 3 of 5 infantry deployed.
        // the live objects should make up for the remainder, so the count should always be accurate.
        count += qOrder.originalSize;
      });

      // account for any existing order underway, could be any type and size may be dynamic.
      if (objects.order) {
        count += objects.order.data.type.match(/infantry|engineer/)
          ? objects.order.size
          : 0;
      }
    } else {
      units = units.concat(
        game.objects[type],
        // matching types in the queue
        q.filter((item) => filterUnit(item, type, isEnemy)),
        // and current order, if defined
        objects.order && objects.order.data.type === type ? [objects.order] : []
      );
    }

    // filter: iterate over units (including orders), counting "not dead" friendly ones.
    count += units.filter((unit) => filterUnit(unit, type, isEnemy)).length;

    /**
     * Logic thus far assumes one unit per order / at a time.
     * For orders which are more than 1 item (e.g., two engineers, five infantry),
     * add that to the existing count to ensure there's room for the group.
     */
    if (COSTS[type].count) {
      count += COSTS[type].count;
    }

    // finally: yay or nay
    return count <= maxUnitsByType[type];
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

    if (game.players.local.data.lives < 0) {
      // prevent ordering if player ran out of lives
      playSound(sounds.inventory.denied);
      return;
    }

    let orderObject, orderSize, cost, pendingNotification;

    // default off-screen setting
    options.x = -72;

    // apply "summon" transition effect.
    options.stepOffset = 0;

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

    // got the funds?
    let canAfford =
      game.objects[TYPES.endBunker][bunkerOffset].data.funds >= cost;

    // at present, CPUs are not subject to inventory limits.
    // also, allow unlimited during network games for simplicity's sake.
    let canOrder =
      player.data.isCPU ||
      net.active ||
      gamePrefs.unlimited_inventory ||
      withinUnitLimits(type, player.data.isEnemy);

    if (canAfford && canOrder) {
      game.objects[TYPES.endBunker][bunkerOffset].data.fundsSpent += cost;
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
    } else if (!canAfford) {
      // Insufficient funds. "We require more vespene gas."
      if (sounds.inventory.denied) {
        playSound(sounds.inventory.denied);
      }

      // special case: helicopter.
      if (type === TYPES.helicopter && common.unlimitedLivesMode()) {
        game.objects.notifications.addNoRepeat(noChopperPurchase);
        return;
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
            .replace(
              '%c1',
              Math.max(
                0,
                game.objects[TYPES.endBunker][
                  game.players.local.data.isEnemy ? 1 : 0
                ].data.funds
              )
            )
            .replace('%c2', cost);
          return result;
        },
        onComplete() {
          // start showing "NSF" short-hand, now that user has seen the long form
          data.canShowNSF = true;
        }
      });

      return;
    } else {
      // can't order - "requisition denied - quota exceeded"

      game.objects.view.setAnnouncement(
        `<span class="inline-emoji">⛔</span> ${PRETTY_TYPES[type]} requisition denied - quota exceeded`,
        3000
      );

      let isMen = type === TYPES.infantry || type === TYPES.engineer;

      game.objects.notifications.addNoRepeat(
        `⛔ ${isMen ? 'Soldier' : PRETTY_TYPES[type]} limit: ${maxUnitsByType[type]}`
      );

      if (sounds.inventory.denied) {
        playSound(sounds.inventory.denied);
      }

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

    // special case: helicopter.
    if (type === TYPES.helicopter) {
      if (!common.unlimitedLivesMode()) {
        if (sounds.inventory.begin) {
          playSound(sounds.inventory.begin);
        }
        game.objects.notifications.add('Helicopter purchased 🚁');
        // TODO: ensure this applies to the right player in future / network games
        player.updateLives(1);
      } else {
        game.objects.notifications.addNoRepeat(noChopperPurchase);
        playSound(sounds.inventory.denied);
      }
      return;
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

    // hit the radar item, too (if one of MTVIE)
    // this is also responsible for the battlefield item.
    if (stepTypes[newObject.data.type]) {
      newObject.radarItem?.summon();
    }

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
            // HACK: if infantry + role = 1, then engineer. Otherwise, type is as-is.
            objectType:
              newObject.data.type === TYPES.infantry && newObject.data.role
                ? TYPES.engineer
                : newObject.data.type,
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

  let enemyQueue = [];

  function getRandomEnemyQueue(funds = 0) {
    // given a battle, filter down a list of possible inventory combos and pick one.

    let options = convoys.filter((convoy) => funds >= convoy.cost);

    // no options!? player might be broke.
    if (!options.length) {
      return [];
    }

    let option = options[rndInt(options.length)];

    let queue = [];

    for (let i = 0; i < option.items.length; i++) {
      queue.push(charToType[option.items[i]]);
    }

    return queue;
  }

  function refreshEnemyQueue() {
    let bank = game.objects[TYPES.endBunker][1].data;

    const enemyOrders = getRandomEnemyQueue(bank.funds * bank.fundsMultiplier);
    const enemyDelays = enemyOrders.map((item) => delaysByType[item]);

    return {
      enemyOrders,
      enemyDelays
    };
  }

  function startEnemyOrdering() {
    let nsf;

    convoys = convoys || parseConvoyData(levelConfig.convoyLevelI);

    let { enemyOrders, enemyDelays } = refreshEnemyQueue();

    let orderOffset = 0;

    // "the more CPUs, the faster the convoys." :X
    // original game needs more studying; possibly every 512 clock cycles / ticks.
    let convoyDelay = 22 / game.players.cpu.length;

    // scale delay depending on "difficulty"?
    convoyDelay /= Math.max(1, levelConfig.convoyLevelI / 5);

    function orderNextItem() {
      if (orderOffset >= enemyOrders.length) {
        /**
         * Special cases:
         * If the CPU ran out of funds, wait a full delay before ordering anything more.
         * If only one unit in order, cut the delay (until next one) in half.
         */
        let adjustedDelay =
          convoyDelay * (!nsf && enemyOrders.length === 1 ? 0.5 : 1);

        // randomize a bit, too.
        if (!net.active) {
          adjustedDelay = Math.floor(adjustedDelay * (1 + rnd(0.25)));
        }

        // delay before next convoy
        common.setFrameTimeout(() => {
          let refresh = refreshEnemyQueue();
          enemyOrders = refresh.enemyOrders;
          enemyDelays = refresh.enemyDelays;
          orderOffset = 0;
          orderNextItem();
        }, adjustedDelay * 1000);

        // reset state
        orderOffset = 0;
        nsf = false;

        return;
      }

      let options;

      if (!game.data.battleOver && !game.data.paused && !game.objects.editor) {
        options = {
          isEnemy: true,
          x: worldWidth + 64,
          // "summon" transition effect
          stepOffset: 0
        };

        let type = enemyOrders[orderOffset];
        let cost = COSTS[type].funds;

        // DRY (/humour, zing)
        let bank = game.objects[TYPES.endBunker][1].data;

        let canAfford = bank.funds * bank.fundsMultiplier >= cost;

        // if total funds drop below the cost of a tank, delay.
        // this helps avoid a bunch of cheap vans going out in series.
        if ((!canAfford || bank.funds < 4) && !nsf) {
          nsf = true;
        }

        if (canAfford && !game.data.productionHalted) {
          // when subtracting, apply the inverse scale and round down.
          bank.funds -= Math.floor(cost * (1 / bank.fundsMultiplier));

          processCPUOrder(type, options);

          // if infantry or engineers, do this a few more times.
          let orderSize = COSTS[type].count;
          if (orderSize > 1) {
            for (let i = 1; i < orderSize; i++) {
              // note: starting at 1, for delay and size math
              common.setFrameTimeout(
                () => processCPUOrder(type, options),
                750 * i
              );
            }
          }
        }

        common.setFrameTimeout(orderNextItem, enemyDelays[orderOffset] * 1000);

        orderOffset++;
      }
    }

    common.setFrameTimeout(orderNextItem, data.enemyOrderDelay);
  }

  function processCPUOrder(type, options) {
    // TODO: CPU quota, "requisition denied" cases.
    const newObject = game.addObject(type, options);

    applyRiseTransition(newObject);

    // ensure this order shows up on the remote
    if (net.active) {
      net.sendMessage({
        type: 'ADD_OBJECT',
        // HACK: if infantry + role = 1, then engineer. Otherwise, type is as-is.
        objectType:
          newObject.data.type === TYPES.infantry && newObject.data.role
            ? TYPES.engineer
            : newObject.data.type,
        params: {
          ...options,
          id: newObject.data.id
        }
      });
    }
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
