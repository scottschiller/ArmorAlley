import { game } from '../core/Game.js';
import { common } from '../core/common.js';
import { oneOf, worldWidth } from '../core/global.js';
import { utils } from '../core/utils.js';

const Editor = () => {

  let css, data, dom, events, exports;

  function initDOM() {

    const oRadarScrubber = document.createElement('div');
    oRadarScrubber.id = 'radar-scrubber';

    dom.oRadarScrubber = document.getElementById('battlefield').appendChild(oRadarScrubber);

  }

  function initEditor() {

    initDOM();

    utils.css.add(document.body, css.editMode);

    events.resize();

  }

  css = {
    active: 'active',
    editMode: 'edit-mode',
    submerged: 'submerged'
  };

  data = {
    mouseDown: false,
    mouseOffsetX: 0,
    scrubberX: 0,
    scrubberWidth: 32,
    scrubberActive: false
  };

  dom = {
    oRadarScrubber: null
  };

  function scaleScrubber() {

    // match the viewport width, relative to the world width.
    const relativeWidth = (game.objects.view.data.browser.width / worldWidth);

    data.scrubberWidth = relativeWidth * game.objects.view.data.browser.width;

    dom.oRadarScrubber.style.width = `${data.scrubberWidth}px`;
    
  }

  function getScrubberX(clientX) {

    const maxOverflow = (game.objects.view.data.browser.fractionWidth / worldWidth);

    // move relative to where the slider was grabbed.
    clientX -= data.mouseOffsetX;

    let xOffset = (clientX / game.objects.view.data.browser.width) * 1 / game.objects.view.data.screenScale;

    xOffset = Math.min(1 - maxOverflow, Math.max(0 - maxOverflow, xOffset));

    game.objects.view.setLeftScroll((xOffset * worldWidth));

    const scrubberX = ((game.objects.view.data.browser.width) * xOffset);

    // position, centered, 0-100%.
    return scrubberX;
    
  }

  function setLeftScroll(clientX) {

    data.scrubberX = getScrubberX(clientX);

    dom.oRadarScrubber.style.transform = `translate(${data.scrubberX}px, 0px)`;

  }

  function makeItemAtMouse(e) {

    const items = [
      'rock',
      'rock2',
      'gravestone',
      'gravestone2',
      'grave-cross',
      'tumbleweed',
      'checkmark-grass',
      'barb-wire',
      'flowers',
      'flower',
      'flower-bush',
      'cactus2',
      'cactus',
      'palm-tree',
      'tree',
      'sand-dune',
      'sand-dunes'
    ];

    const x = Math.floor(game.objects.view.data.battleField.scrollLeft + (e.clientX * (1 / game.objects.view.data.screenScale)));

    // "painting"
    if (e.type === 'mousemove' && x % 8 !== 0) return;

    const itemType = `${oneOf(items)} ${css.submerged}`;

    const item = game.addItem(itemType, x);

    common.setFrameTimeout(() => utils.css.remove(item.dom.o, css.submerged), 88);

  }

  events = {

    mousedown(e) {

      data.mouseDown = true;

      if (e.target === dom.oRadarScrubber) {

        data.scrubberActive = true;
        utils.css.add(dom.oRadarScrubber, css.active);
        // move relative to "grab point"
        data.mouseOffsetX = e.clientX - (data.scrubberX * game.objects.view.data.screenScale);
        e.preventDefault();

        return;

      }

      makeItemAtMouse(e);

      if (e.target.tagName === 'DIV') {
        e.preventDefault();
        return;
      }

    },

    mousemove(e) {

      if (data.scrubberActive) {

        setLeftScroll(e.clientX);

      } else {

        if (data.mouseDown) {
          makeItemAtMouse(e);
        }
        
      }

    },

    mouseup(e) {

      if (data.scrubberActive) {
        utils.css.remove(dom.oRadarScrubber, css.active);
        data.scrubberActive = false;
      }

      data.mouseDown = false;

    },

    resize() {
      
      scaleScrubber();

      // move to where the view is now at.
      // TODO: ensure this value stays in sync with the scroll width calculations.
      data.scrubberX = (game.objects.view.data.battleField.scrollLeft / worldWidth) * game.objects.view.data.browser.width;
      dom.oRadarScrubber.style.transform = `translate(${data.scrubberX}px, 0px)`;
      

    }

  };

  exports = {
    data,
    dom,
    events,
    init: initEditor
  };

  return exports;

};

export { Editor };