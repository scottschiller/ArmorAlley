import { keyboardMonitor } from '../aa.js';
import { game } from '../core/Game.js';
import { TYPES, worldWidth } from '../core/global.js';
import { utils } from '../core/utils.js';

const Editor = () => {

  let css, data, dom, downKeys, events, exports, keyMap, keysToMethods;

  // ESC = exit to default mode
  // other keys (or click?) = add mode, e.g., planting trees
  const modes = {
    ADD: 'add',
    SELECT: 'select',
    DEFAULT: 'select'
  };

  function stopEvent(e) {
    e?.preventDefault();
    return false;
  }

  function initDOM() {

    const oRadarScrubber = document.createElement('div');
    oRadarScrubber.id = 'radar-scrubber';

    dom.oRadarScrubber = document.getElementById('battlefield').appendChild(oRadarScrubber);

  }

  function initEditor() {

    keyMap = keyboardMonitor.keyMap;

    initDOM();

    utils.css.add(document.body, css.editMode);

    setCursor('grab');

    events.resize();

    keyboardMonitor.init();

  }

  css = {
    active: 'active',
    airborne: 'airborne',
    editMode: 'edit-mode',
    selected: 'selected',
    submerged: 'submerged'
  };

  data = {
    currentTool: null,
    levelDataSource: null,
    levelData: null,
    mode: modes.DEFAULT,
    mouseDown: false,
    mouseDownTarget: null,
    mouseDownX: 0,
    mouseDownY: 0,
    mouseOffsetX: 0,
    mouseX: 0,
    mouseY: 0,
    scrubberX: 0,
    scrubberWidth: 32,
    scrubberActive: false,
    selectedItems: []
  };

  dom = {
    oRadarScrubber: null
  };

  downKeys = {};

  keysToMethods = {
    // default / selection mode
    'escape': () => setMode(),
    'delete': () => deleteSelectedItems(),
    'backspace': () => deleteSelectedItems()
  }

  function setMode(mode) {

    if (data.mode === mode) return;

    // update so the cursor changes, maybe.
    data.mode = modes[mode] || modes.DEFAULT;

    if (data.mode !== modes.SELECT) {
      // clear selection if leaving select mode.
      clearSelectedItems();
    }

    // update CSS?

  }

  function getGameObject(item) {

    // given an item with an ID, return the game object.

    if (!item) return;

    const { id } = item?.dataset;

    if (!id) {
      console.warn('getGameObject: no item?.id?', item, id);
      return;
    }

    if (!game.objectsById[id]) {
      console.warn('WTF no game.objectsById[id]?', id, game.objectsById);
    }

    return game.objectsById[id];

  }

  function getXYFromTransform(item) {
    // hackish: split translate3d(x,y,z) into an array of [x,y]
    const xy = item.style.transform.toString().match((/\((.+)\)/i))[1].split(',');
    return xy.map((item) => parseFloat(item));
  }

  function refreshItemCoords(item) {

    if (!item) return;

    // the viewport may have moved since this was selected; keep its data up-to-date.
    const currentXY = getXYFromTransform(item); 

    item.dataset.x = currentXY[0];

    // hackish: no repositioning tricks on floating items.
    if (item.className.match(/cloud/i)) {
      utils.css.add(item, css.airborne);
      item.dataset.y = currentXY[1];
    }

  }

  function checkSubObject(objects, objectName) {

    return objects[objectName]?.dom?.o;

  }

  function selectItem(item) {

    if (!item) return;

    // ensure mode, first
    setMode(modes.SELECT);

    const gameObj = getGameObject(item);

    // if no registered object by ID for this, then ignore.
    if (!gameObj) return;

    if (data.selectedItems.includes(item)) return;

    utils.css.add(item, css.selected);

    refreshItemCoords(item);

    data.selectedItems.push(item);

    // also, check for balloon <-> chain <-> bunker connections.
    if (gameObj.objects) {
      ['balloon', 'bunker', 'chain'].forEach((type) => {
        const obj = checkSubObject(gameObj.objects, type);
        if (obj) selectItem(obj);
      });
    }

  }

  function toggleSelectItem(item) {

    if (data.selectedItems.includes(item)) {
      deSelectItem(item);
      // now, recycle the empties.
      data.selectedItems = data.selectedItems.filter((item => item !== null));
    } else {
      selectItem(item);
    }

  }

  function deSelectItem(item) {

    if (!item) return;

    const offset = data.selectedItems.indexOf(item);

    if (offset === -1) return;

    utils.css.remove(item, css.selected);

    // don't mutate the array, just null out for now.
    data.selectedItems[offset] = null;

    const gameObj = getGameObject(item);

    if (gameObj.objects) {
      ['balloon', 'bunker', 'chain'].forEach((type) => {
        const obj = checkSubObject(gameObj.objects, type);
        if (obj) deSelectItem(obj);
      });
    }

  }

  function clearSelectedItems() {

    data.selectedItems.forEach((item) => deSelectItem(item));
    data.selectedItems = [];

  }

  function isSelected(item) {

    return (data.selectedItems.indexOf(item) !== -1);
    
  }

  function deleteSelectedItems() {

    // delete / backspace keys
    data.selectedItems.forEach((item) => deleteItem(item));

  }

  function deleteItem(item) {

    // remove this item from selection
    deSelectItem(item);

    // remove something from the battlefield.
    const gameObject = getGameObject(item);

    if (gameObject) {

      if (gameObject.die) {

        // special case: kill the related ones, too.
        if (gameObject.objects) {
          ['balloon', 'bunker', 'chain'].forEach((type) => {
            const obj = checkSubObject(gameObject.objects, type);
            if (obj) getGameObject(obj)?.die();
          });
        }

        gameObject.die();

        // special super-bunker case: forcefully remove.
        // this should be cleaned up on the next `gameLoop.animate()`.
        if (gameObject.data.type === TYPES.superBunker) {
          gameObject.dom.o.remove();
          gameObject.dom.o = null;
        }
        
      } else {
        gameObject?.dom?.o?.remove();
        // null game.objectsById[] reference?
      }

    } else {

      // take out the raw node.
      item?.remove();

    }
   
  }

  function moveItemRelativeToMouse(item, e = { clientX: data.mouseX, clientY: data.mouseY }) {

    if (!item) return;

    const scale = 1 / game.objects.view.data.screenScale;

    // move logical offset a relative amount
    const newX = parseFloat(item.dataset.x) + ((e.clientX - data.mouseDownX) * scale);

    // write the new value back to the DOM
    item.dataset.newX = newX;

    // new offset, relative to viewport
    const left = newX + game.objects.view.data.battleField.scrollLeft;

    let top;

    if (item.dataset.y) {
      top = parseFloat(item.dataset.y) + ((e.clientY - data.mouseDownY) * scale);
      item.dataset.newY = top;
    }

    // game object? "moveTo()" will do the work. otherwise, move manually.

    const gameObj = getGameObject(item);

    if (!gameObj) {
      console.warn('WTF, no game object for ID?', item);
      return;
    }

    gameObj.data.x = left;

    if (item.dataset.y) {
      gameObj.data.y = top;
    }

  }

  function moveRelativeToMouse(e) {

    data.selectedItems.forEach((item) => moveItemRelativeToMouse(item, e));

  }

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

  function normalizeSprite(node) {

    // a nested `.transform-sprite` node may be present; return the parent, if so.
    if (utils.css.has(node, 'transform-sprite')) return node.parentNode;
    return node;

  }

  function setCursor(cursor) {

    game.objects.view.dom.battleField.style.cursor = cursor;

  }

  events = {

    keydown(e) {

      console.log('keydown', e);

      const key = e.key?.toLowerCase();

      downKeys[key.keyCode] = true;
      downKeys[key] = true;

      if (keysToMethods[key]) {
        keysToMethods[key](e);
        return;
      }

      if (e.keyCode === keyMap.esc) {
        setMode(modes.DEFAULT);
      }

      // return true = allow game to handle key

    },

    keyup(e) {

      downKeys[e.keyCode] = false;

      const key = e.key?.toLowerCase();
      downKeys[key] = false;

      // return true = allow game to handle key

    },

    mousedown(e) {

      data.mouseDown = true;
      data.mouseDownTarget = e.target;
      data.mouseDownX = e.clientX;
      data.mouseDownY = e.clientY;

      setCursor('grabbing');

      const { clientX } = e;

      const target = normalizeSprite(data.mouseDownTarget);

      const isSprite = utils.css.has(target, 'sprite');

      if (data.mouseDownTarget === dom.oRadarScrubber || !isSprite) {

        data.scrubberActive = true;

        utils.css.add(dom.oRadarScrubber, css.active);

        // move relative to "grab point"
        data.mouseOffsetX = clientX - (data.scrubberX * game.objects.view.data.screenScale);

        return stopEvent(e);

      }

      // selection mode, and clicking on an item?
      
      if (data.mode === modes.SELECT) {
        
        if (isSprite) {

          // it's a game sprite.
          // if shift key is NOT down, also clear selection.

          if (!downKeys.shift) {

            // if not selected, clear all and select this one?
            if (!isSelected(target)) {
              clearSelectedItems();
            }

            selectItem(target);

          } else {

            toggleSelectItem(target);

          }

          return stopEvent(e);
        
        } else {

          // there was a click somewhere else.
          if (!downKeys.shift) clearSelectedItems();

        }
        
      }

      // makeItemAtMouse(e);

      if (e.target.tagName === 'DIV') return stopEvent(e);

    },

    mousemove(e) {

      data.mouseX = e.clientX;
      data.mouseY = e.clientY;

      if (!data.mouseDown) return;

      if (data.scrubberActive) {

        // if scrubber is being dragged, move battlefield same direction.
        if (data.mouseDownTarget === dom.oRadarScrubber) {
          setLeftScroll(e.clientX);
        } else {
          // move opposite of mouse direction.
          setLeftScroll(data.mouseDownX + (data.mouseDownX - e.clientX));
        }

      } else {

        // default mouse move mode

        if (data.mode === modes.SELECT) {

          // watch for clicks on items.
          // if mouse is down, we may be dragging.

          moveRelativeToMouse(e);

        }

      }

    },

    mouseup() {

      if (data.scrubberActive) {
        utils.css.remove(dom.oRadarScrubber, css.active);
        data.scrubberActive = false;
      }

      // this ensures that everything is up to date, whether one item moved or the whole window was scrolled.
      data.selectedItems.forEach((item) => refreshItemCoords(item));

      data.mouseDown = false;

      setCursor('grab');

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