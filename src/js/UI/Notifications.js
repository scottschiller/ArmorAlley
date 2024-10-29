import { game, gameType } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { gameEvents, EVENTS } from '../core/GameEvents.js';
import { gamePrefs } from './preferences.js';
import { net } from '../core/network.js';
import { levelFlags, levelName } from '../levels/default.js';
import { effects } from '../core/effects.js';

const Notifications = () => {
  let css, data, dom, exports;

  function addNoRepeat(text, options = {}) {
    options = {
      ...options,
      noRepeat: true
    };

    return add(text, options);
  }

  function add(text, options = {}) {
    /* options = { noDuplicate, noRepeat, onRender, onComplete, type } */

    if (game.data.battleOver) return;

    let i, j, item, isDuplicate, replacementItem, renderedText;

    if (!text?.replace) return;

    text = text.replace(/\s&nbsp;\s/gi, ' ').replace(/\n/gi, '<br />');

    if (!data.items) data.items = [];

    // account for duplicate / repeated items
    for (i = 0, j = data.items.length; i < j; i++) {
      item = data.items[i];

      // hackish: update item / node of same text, or matching type
      if (
        item &&
        item.node &&
        (item.text === text || (item.type && item.type === options.type))
      ) {
        // ignore if no duplicates at all, OR newest (last) item is about to be repeated, and shouldn't be
        if (options.noDuplicate || (i === j - 1 && options.noRepeat)) {
          isDuplicate = true;
          break;
        }

        item.count++;

        if (options.onRender) {
          renderedText = options.onRender(text);
          item.delay = calcDelay(renderedText);
        }

        // provided text, or, custom render function
        // if options.onRender(), that function gets called to do the work.
        // otherwise, plain text - and if options.noRepeat, don't show multiplier.
        item.node.innerHTML = `<span>${
          options.onRender
            ? renderedText
            : item.text + (options.noRepeat ? '' : ` × ${item.count}`)
        }</span>`;

        // clear, start new timer
        if (item.timer) {
          item.timer.reset();
          item.timer = common.setFixedFrameTimeout(
            displayItemComplete,
            item.delay
          );
        }

        replacementItem = item;

        break;
      }
    }

    // ignore
    if (isDuplicate) return;

    if (replacementItem) return replacementItem;

    item = {
      text,
      count: 1,
      node: null,
      delay: calcDelay(text),
      onComplete: options.onComplete,
      onRender: options.onRender,
      timer: null
    };

    data.items.push(item);

    showItem(item);
  }

  function calcDelay(text) {
    // number of words / letters? let's say 240 WPM, 4 words per second as an optimum.
    let delay, minDelay, delayPerWord, maxDelay;

    minDelay = 2000;
    delayPerWord = 600;
    maxDelay = 6000;

    // just in case
    if (!text || !text.length || text.indexOf(' ') === -1) return minDelay;

    // hackish: if "NSF", return special delay
    if (text.match(/nsf/i)) return maxDelay / 2;

    // e.g., `this is a test` = 4 * delayPerWord - stripping HTML, also.
    delay = Math.max(
      minDelay,
      Math.min(
        text.replace('/<(.|\n)*?>/', '').split(' ').length * delayPerWord,
        maxDelay
      )
    );

    return delay;
  }

  function showItem(item) {
    let oToast;

    // show, and queue the next check.
    oToast = document.createElement('div');
    oToast.className = css.notificationToast;

    oToast.innerHTML = `<span>${
      item.onRender ? item.onRender(item.text) : item.text
    }</span>`;

    dom.oToasts.insertBefore(oToast, dom.oToasts.firstChild);

    // delay required for transition to work
    common.setFixedFrameTimeout(() => {
      utils.css.add(oToast, css.toastActive);
      updateListOpacity();
    }, 96);

    // assign for later node removal
    item.node = oToast;

    // these can pile up. display immediately but process one at a time, FIFO.
    if (!data.isDisplaying) {
      data.isDisplaying = true;
      item.timer = common.setFixedFrameTimeout(displayItemComplete, item.delay);
    }
  }

  function updateListOpacity() {
    // show top toasts at 100% opacity, then start fading down the list.
    const toasts = dom.oToasts.querySelectorAll(
      `.${css.notificationToast}:not(.${css.toastExpiring}):not(.${css.toastExpired})`
    );
    let priority = 2;
    let fadeBy = 0.05;
    let opacity = 1;
    let minOpacity = 0.1;
    let itemOpacity;
    for (var i = 0, j = toasts.length; i < j; i++) {
      if (j < priority) {
        itemOpacity = 1;
      } else {
        opacity = Math.max(minOpacity, opacity - fadeBy);
        itemOpacity = opacity;
      }
      toasts[i].style.opacity = itemOpacity;
    }
  }

  function displayItemComplete() {
    let item;

    if (!data.items.length) {
      data.isDisplaying = false;
      return;
    }

    item = data.items.shift();

    utils.css.add(item.node, css.toastExpiring);

    // hackish: reset opacity manually, because it's been affected by updateListOpacity().
    item.node.style.opacity = 0;

    if (item.onComplete) {
      item.onComplete();
    }

    // slide / fade out of view, and then disappear.
    common.setFixedFrameTimeout(() => {
      utils.css.add(item.node, css.toastExpired);
      common.setFixedFrameTimeout(() => {
        item?.node?.remove();
        updateListOpacity();
      }, 550);
    }, 550);

    if (!data.items.length) {
      // all done.
      data.isDisplaying = false;
    } else {
      // we're onto the next one. queue its removal, and start running faster as the queue grows in size.
      common.setFixedFrameTimeout(
        displayItemComplete,
        data.items[0].delay *
          (data.items.length > 5 ? 5 / data.items.length : 1)
      );
    }
  }

  function initDOM() {
    dom.oToasts = document.getElementById('notification-toasts');
  }

  function welcome() {
    // pvp|pvp_cpu|coop_2v1|coop_2v2
    const styleLabels = {
      pvp: 'Player vs. player',
      pvp_cpu: 'Player vs. player, 1 CPU ea.',
      coop_2v1: 'Co-operative, 2 humans vs. 1 CPU',
      coop_2v2: 'Co-operative, 2 humans vs. 2 CPUs'
    };

    const emoji = {
      easy: '😁',
      hard: '😰',
      extreme: '😱'
    };

    const gameTypes = {
      tutorial: 'This is the tutorial. <span class="inline-emoji">📖</span>',
      other: `You are playing '${levelName}.' <span class="inline-emoji">${emoji[gameType]}</span>`
    };

    let playingMessage;

    const netGameStyle = gamePrefs.net_game_style;

    if (net.connected && styleLabels[netGameStyle]) {
      playingMessage = `You are playing ${styleLabels[netGameStyle]}, level “${levelName}.” <span class="inline-emoji">${emoji[gameType]}</span>`;
    } else {
      playingMessage = gameTypes[gameType] || gameTypes.other;
    }

    const welcome =
      'Welcome to ARMOR ALLEY. <span class="inline-emoji">🚁</span><br />';

    const msg = `${welcome}${playingMessage}`;

    add(msg);

    // notify user of their game speed, if non-default.
    const gs = gamePrefs.game_speed;
    if (gs && gs != 1 && gs !== 'null') {
      const emoji = gs < 1 ? '🐢' : '🐇';
      add(`Game speed: ${Math.round(gs * 100)}% ${emoji}`);
    }

    game.objects.view.setAnnouncement(msg);

    if (!levelFlags.bullets) {
      add('🚁 You are now equipped with aimed missiles. 🚀');
    }

    // notify when the player has napalm, when it's the exception.
    if ((gameType === 'easy' || gameType === 'hard') && levelFlags.napalm) {
      add('💣 Your bombs now have napalm. 🔥');
    }

    // level flags
    if (levelFlags.jamming) {
      add('⚠️ JAMMING MODE: Radar performance is impacted.');
      game.objects.radar.startInterference();
    } else if (levelFlags.stealth) {
      add('⚠️ STEALTH MODE: Enemy 🚁 hidden on radar. 🥷');
    }

    // special case
    if (levelName === 'Rainstorm') {
      common.setFixedFrameTimeout(() => {
        effects.updateStormStyle('rain');
        add('☂️ Weather update: rainstorm 🌧️<br />(Disable in options.)');
      }, 5000);
    }

    common.setFixedFrameTimeout(
      () => gameEvents.fireEvent(EVENTS.switchPlayers, 'announcePlayer'),
      2000
    );
  }

  css = {
    notificationToast: 'notification-toast',
    toastActive: 'toast-active',
    toastExpiring: 'toast-expiring',
    toastExpired: 'toast-expired'
  };

  data = {
    items: [],
    isDisplaying: false
  };

  dom = {
    oToasts: null
  };

  initDOM();

  exports = {
    add,
    addNoRepeat,
    welcome
  };

  return exports;
};

export { Notifications };
