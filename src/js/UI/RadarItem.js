import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import {
  FPS,
  GAME_SPEED,
  TYPES,
  worldHeight,
  worldWidth
} from '../core/global.js';

function RadarItem(options) {
  let css, data, dom, oParent, exports;

  // certain items' visibility can be updated by user prefs.
  const onHiddenEnabled = {
    [TYPES.landingPad]: true,
    [TYPES.cloud]: true
  };

  function onHiddenChange(isVisible) {
    if (!onHiddenEnabled[data.parentType]) return;

    data.visible = !!isVisible;
  }

  function dieComplete() {
    game.objects.radar.removeItem(exports);
    dom.o = null;
    options.o = null;
  }

  function die(dieOptions) {
    if (data.dead) return;

    if (dieOptions?.silent) {
      // prevent blink, continue showing while stepping down etc.
      data.alwaysDraw = true;
    } else {
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

    // ensure visibility, reset blink state
    data.visible = true;
    data.blinkCounter = 0;

    // reset is the same as creating a new object.
    game.objects.stats.create(exports);
  }

  // TODO: DRY / utility function
  function dropOff(x) {
    // x from 0 to 1 returns from 1 to 0, with in-out easing.
    // https://stackoverflow.com/questions/30007853/simple-easing-function-in-javascript/30007935#30007935
    // Wolfram alpha graph: http://www.wolframalpha.com/input/?i=plot%20%28cos%28pi*x%29%20%2B%201%29%20%2F%202%20for%20x%20in%20%280%2C1%29
    return (Math.cos(Math.PI * x) + 1) / 2;
  }

  function makeStepFrames(reverse) {
    const duration = FPS * 1.75 * (1 / GAME_SPEED);
    data.stepFrames = [];

    for (let i = 0; i <= duration; i++) {
      // 1/x, up to 1
      data.stepFrames[i] = dropOff(i / duration);
    }
    if (reverse) {
      data.stepFrames.reverse();
    }

    data.stepFrame = 0;

    data.stepOffset = data.stepFrames[data.stepFrame];

    // hackish: assign to parent
    data.oParent.data.stepOffset = data.stepOffset;

    data.stepActive = true;
  }

  function summon() {
    const reverse = true;
    makeStepFrames(reverse);
  }

  function dismiss() {
    makeStepFrames();
    // hack: a few additional frames, ensure this is pulled out of view.
    data.stepFrames = data.stepFrames.concat([0, -0.05, -0.075, -0.1]);
  }

  function recycle() {
    if (data.recycling) return;
    data.recycling = true;
    dismiss();
  }

  function animate() {
    // set top offset, if stepping up or down
    if (!data.stepActive) return;

    data.stepFrame++;

    data.stepOffset = data.stepFrames[data.stepFrame];

    // hackish: assign to parent
    data.oParent.data.stepOffset = data.stepOffset;

    if (data.stepFrame >= data.stepFrames.length - 1) {
      data.stepActive = false;
    }
  }

  function initRadarItem() {
    // string -> array as params
    if (!options.className) return;
    const classNames = options.className.split(' ');
    utils.css.add(dom.o, css.radarItem, ...classNames);
  }

  function initScanNode() {
    if (!dom?.o) return;

    // special case: certain radar items also get a "scan range" node.
    let scanNode = document.createElement('div');
    scanNode.className = css.scanNode;

    dom.o.appendChild(scanNode);
    dom.oScanNode = scanNode;
    scanNode = null;
  }

  function updateScanNode(radius = 0) {
    // special case: some radar items also get a "scan range" node.
    const { oScanNode } = dom;

    if (!oScanNode) return;

    // size "scan radius" according to browser width, because vertical resizing does not affect spacing of radar layout.
    oScanNode.style.width = `${
      (radius / worldWidth) *
      // interimScale set by JS animation transition
      (game.objects.radar.data.interimScale || game.objects.radar.data.scale) *
      game.objects.view.data.browser.screenWidth *
      2
    }px`;

    const height = (radius / worldHeight) * game.objects.radar.data.height;
    // height is always fixed.
    oScanNode.style.height = `${height}px`;

    oScanNode.style.borderRadius = `${height}px ${height}px 0 0`;
  }

  css = {
    radarItem: 'radar-item',
    dying: 'dying',
    dead: 'dead',
    scanNode: 'scan-node'
  };

  data = {
    type: 'radar-item',
    excludeLeftScroll: true, // don't include battlefield scroll in transform(x)
    isOnScreen: true, // radar items are always within view
    oParent: options.oParent,
    parentType: options.parentType,
    className: options.className,
    dead: false,
    visible: true,
    // set by radar animate method
    left: 0,
    top: 0,
    recycling: false,
    stepOffset: undefined,
    stepFrame: 0,
    stepFrames: []
  };

  dom = {
    o: options.o
  };

  if (options.oParent.data?.domCanvas?.radarItem) {
    // inherit
    data.domCanvas = options.oParent.data.domCanvas.radarItem;
  }

  oParent = options.oParent;

  initRadarItem();

  exports = {
    animate,
    data,
    dom,
    die,
    initScanNode,
    onHiddenChange,
    oParent,
    recycle,
    reset,
    summon,
    dismiss,
    updateScanNode
  };

  return exports;
}

export { RadarItem };
