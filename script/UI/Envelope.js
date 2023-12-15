import { gameType } from '../aa.js';
import { common } from '../core/common.js';
import { searchParams } from '../core/global.js';
import { utils } from '../core/utils.js';
import { campaignBattles, levelName } from '../levels/default.js';

let gameTypeParam;
let gtParam;

function Envelope() {
  let css, data, dom, exports;

  css = {
    active: 'active',
    open: 'open'
  };

  data = {
    active: false,
    open: false
  };

  dom = {
    o: null,
    oLetter: null,
    oLetterSource: null,
    nextLink: null
  };

  function updateGameType() {
    gameTypeParam = searchParams.get('gameType') || gameType;
    gtParam =
      gameTypeParam && gameTypeParam !== 'tutorial' && gameTypeParam !== 'easy'
        ? `&gameType=${gameTypeParam}`
        : '';
  }

  function setLevel(level = 'Tutorial') {
    updateGameType();
    if (!dom.o) return;

    dom.oLetter.innerHTML =
      '<h1>' +
      (dom.oLetterSource.querySelector(`dt[data-battle="${level}"]`)
        ?.innerHTML || 'missing') +
      '</h1>' +
      (dom.oLetterSource.querySelector(`dd[data-battle="${level}"]`)
        ?.innerHTML || 'missing');

    const currentOffset = campaignBattles.indexOf(level);
    const nextLevel = campaignBattles[currentOffset + 1];

    const { nextLink } = dom;
    if (nextLevel) {
      nextLink.href = `?battle=${nextLevel}${gtParam}&start=1`;
      nextLink.innerHTML = `Next Battle: ${nextLevel} ➠`;
    } else {
      // TODO: Some sort of extra end-game feature?
      // TODO: suggest hard or extreme mode
      nextLink.href = '.';
      nextLink.innerHTML = 'CONGRATULATIONS';
    }
  }

  function updateNextLink(didWin) {
    const { nextLink } = dom;
    if (levelName === 'Tutorial') {
      nextLink.href = '?battle=Cake Walk';
      nextLink.innerHTML = 'BATTLE 1: CAKE WALK';
    } else if (!didWin) {
      nextLink.href = `?battle=${levelName}${gtParam}`;
      nextLink.innerHTML = 'TRY AGAIN';
    }
  }

  function openOrClose(e) {
    // special case: ignore "next" link, don't toggle envelope.
    if (e?.target?.id === 'next-battle') return;
    if (data.open) return close();
    open();
  }

  function open() {
    if (data.open) return;
    data.open = true;
    utils.css.addOrRemove(dom.o, data.open, css.open);
  }

  function close() {
    if (!data.open) return;
    data.open = false;
    utils.css.remove(dom.o, css.open);
  }

  function show(didWin) {
    if (data.active) return;
    window.aaLoader.loadCSS('css/aa-battle-over-letter.css', () => {
      data.active = true;
      updateNextLink(didWin);
      dom.o.style.display = 'block';
      common.setFrameTimeout(() => utils.css.add(dom.o, css.active), 1000);
    });
  }

  function updateMouse(e) {
    const isValid = e.type === 'mousedown'; // && utils.css.has(e.target, 'wax-seal');
    utils.css.addOrRemove(dom.o, isValid, 'mousedown');
  }

  function addEvents() {
    dom.o.onmousedown = updateMouse;
    dom.o.onmouseup = updateMouse;
    dom.o.onclick = openOrClose;
  }

  function initDOM() {
    dom.o = document.getElementById('battle-over-letter');
    dom.oLetter = dom.o?.querySelector('.letter-context-body');
    dom.oLetterSource = document.getElementById('letters-from-the-old-tanker');
    dom.nextLink = document.getElementById('next-battle');
  }

  function init() {
    initDOM();
    addEvents();
  }

  init();

  exports = {
    close,
    open,
    openOrClose,
    setLevel,
    show
  };

  return exports;
}

export { Envelope };
