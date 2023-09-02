import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { TYPES, worldWidth } from '../core/global.js';

function RadarItem(options) {

  let css, data, dom, oParent, exports;

  function onHiddenChange(isVisible) {

    if (data.parentType !== TYPES.landingPad) return;

    if (!dom?.o) return;
    dom.o.style.visibility = isVisible ? 'visible' : 'hidden';

  }

  function dieComplete() {

    game.objects.radar.removeItem(exports);
    dom.o = null;
    options.o = null;

  }

  function die(dieOptions) {

    if (data.dead) return;

    if (!dieOptions?.silent) {
      utils.css.add(dom.o, css.dying);
    }

    game.objects.stats.destroy(exports, dieOptions);

    data.dead = true;

    if (!options.canRespawn) {

      // permanent removal
      if (dieOptions?.silent) {

        // bye bye! (next scheduled frame)
        common.setFrameTimeout(dieComplete, 1);

      } else {

        common.setFrameTimeout(dieComplete, 2000);

      }

    } else {

      // balloon, etc.
      common.setFrameTimeout(() => {
        // only do this if the parent (balloon) is still dead.
        // it may have respawned almost immediately by passing infantry.
        if (!oParent?.data?.dead) return;
        utils.css.add(dom.o, css.dead);
      }, 1000);

    }

  }

  function reset() {

    if (!data.dead) return;

    utils.css.remove(dom.o, css.dying);
    utils.css.remove(dom.o, css.dead);
    data.dead = false;

    // reset is the same as creating a new object.
    game.objects.stats.create(exports);

  }

  function initRadarItem() {

    // string -> array as params
    const classNames = options.className.split(' ');
    utils.css.add(dom.o, css.radarItem, ...classNames);

  }

  function initScanNode() {

    if (!dom?.o) return;

    // special case: turret radar items also get a "scan range" node.
    let scanNode = document.createElement('div');
    scanNode.className = css.turretScanNode;

    dom.o.appendChild(scanNode);
    dom.oScanNode = scanNode;
    scanNode = null;

  }

  function updateScanNode(diameter = 0) {

    // special case: some radar items also get a "scan range" node.
    let { oScanNode } = dom;

    if (!oScanNode) return;

    // size "scan radius" according to browser width, because vertical resizing does not affect spacing of radar layout.
    oScanNode.style.width = oScanNode.style.height = `${((diameter / worldWidth) * game.objects.view.data.browser.width * 2)}px`;

  }

  css = {
    radarItem: 'radar-item',
    dying: 'dying',
    dead: 'dead',
    turretScanNode: 'turret-scan-node'
  };

  data = {
    type: 'radar-item',
    excludeLeftScroll: true, // don't include battlefield scroll in transform(x)
    isOnScreen: true, // radar items are always within view
    parentType: options.parentType,
    className: options.className,
    dead: false
  };

  dom = {
    o: options.o
  };

  oParent = options.oParent;

  initRadarItem();

  exports = {
    data,
    dom,
    die,
    initScanNode,
    onHiddenChange,
    oParent,
    reset,
    updateScanNode
  };

  return exports;

}

export { RadarItem };