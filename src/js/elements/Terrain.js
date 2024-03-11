import { gamePrefs } from '../UI/preferences.js';
import { game } from '../core/Game.js';
import { FPS, GAME_SPEED, worldHeight } from '../core/global.js';
import { TYPES } from '../core/global.js';
import { sprites } from '../core/sprites.js';
import { utils } from '../core/utils.js';
import { zones } from '../core/zones.js';

const terrainItems = {
  'zone-post': {
    width: 2,
    height: 6
  },

  'zone-flag': {
    width: 3,
    height: 8
  },

  'gravestone': {
    src: 'gravestone.png',
    height: 12,
    width: 20
  },

  'gravestone2': {
    src: 'gravestone2.png',
    height: 12,
    width: 15
  },

  'grave-cross': {
    src: 'grave-cross.png',
    height: 10,
    width: 13
  },

  'left-arrow-sign': {
    // note: "virtual" image, right-arrow flipped via canvas
    src: 'right-arrow-sign-mac-flipped.png',
    srcSnow: 'snow/right-arrow-sign-mac_snow-flipped.png',
    height: 25,
    width: 28
  },

  'right-arrow-sign': {
    src: 'right-arrow-sign-mac.png',
    srcSnow: 'snow/right-arrow-sign-mac_snow.png',
    height: 25,
    width: 28
  },

  'barb-wire': {
    src: 'barb-wire.png',
    height: 11,
    width: 18
  },

  'cactus': {
    src: 'cactus.png',
    height: 17,
    width: 12
  },

  'cactus2': {
    src: 'cactus2.png',
    height: 25,
    width: 18
  },

  'sand-dune': {
    src: 'sand-dune.png',
    height: 8,
    width: 51
  },

  'sand-dunes': {
    src: 'sand-dunes.png',
    height: 11,
    width: 73
  },

  'checkmark-grass': {
    src: 'checkmark-grass.png',
    height: 10,
    width: 15
  },

  'flower': {
    src: 'flower.png',
    height: 8,
    width: 11
  },

  'flowers': {
    src: 'flowers.png',
    height: 11,
    width: 34
  },

  'flower-bush': {
    src: 'flower-bush.png',
    height: 13,
    width: 18
  },

  'tree': {
    src: 'tree.png',
    srcSnow: 'snow/tree_snow.png',
    height: 27,
    width: 26
  },

  'tumbleweed': {
    src: 'tumbleweed.png',
    height: 15,
    width: 18
  },

  'palm-tree': {
    src: 'palm-tree.png',
    height: 22,
    width: 18
  },

  'rock': {
    src: 'rock.png',
    height: 13,
    width: 18
  },

  'rock2': {
    src: 'rock2.png',
    height: 11,
    width: 13
  },

  'grass': {
    src: 'grass.png',
    height: 9,
    width: 40
  }
};

function addItem(className, x, options = {}) {
  let data, _dom, id, /*width, height, inCache, */ exports;

  id = `terrain_item_${game.objects[TYPES.terrainItem].length}`;

  // special case: if in editor, or zone debugging, make a DOM node.
  // TODO: migrate editor to work with terrain items also on canvas.
  const useDomNode =
    game.objects.editor ||
    className === 'zone-post' ||
    className === 'zone-flag';

  // TODO: DRY / utility function
  function dropOff(x) {
    // x from 0 to 1 returns from 1 to 0, with in-out easing.
    // https://stackoverflow.com/questions/30007853/simple-easing-function-in-javascript/30007935#30007935
    // Wolfram alpha graph: http://www.wolframalpha.com/input/?i=plot%20%28cos%28pi*x%29%20%2B%201%29%20%2F%202%20for%20x%20in%20%280%2C1%29
    return (Math.cos(Math.PI * x) + 1) / 2;
  }

  function makeStepFrames(reverse) {
    const duration = FPS * 0.5 * (1 / GAME_SPEED);
    data.stepFrames = [];

    for (let i = 0; i <= duration; i++) {
      // 1/x, up to 1
      data.stepFrames[i] = dropOff(i / duration);
    }
    if (reverse) {
      data.stepFrames.reverse();
    }
    data.stepFrame = 0;
    data.stepOffset = data.stepFrames[0];
    data.stepActive = true;
  }

  function summon() {
    const reverse = true;
    makeStepFrames(reverse);
    data.summoned = true;
    data.dismissed = false;
    // ensure visibility
    data.visible = true;
  }

  function dismiss() {
    makeStepFrames();
    // hack: a few additional frames, ensure this is pulled out of view.
    data.stepFrames = data.stepFrames.concat([0, -0.05, -0.075, -0.1]);
    data.summoned = false;
    data.dismissed = true;
  }

  function animate() {
    // set top offset, if stepping up or down
    if (!data.stepActive) return;

    data.stepFrame++;

    data.stepOffset = data.stepFrames[data.stepFrame];

    if (data.stepFrame >= data.stepFrames.length - 1) {
      data.stepActive = false;
      // if "dismissed", then exclude from drawing.
      if (data.dismissed) {
        data.visible = false;
      }
    }
  }

  function initDOM() {
    // legacy support / editor / zone debugging
    if (useDomNode) {
      _dom.o = sprites.create({
        className: `${className} terrain-item`,
        id
      });
      return;
    }
    _dom.o = {};
  }

  function initItem() {
    initDOM();
  }

  // prefixed to avoid name conflict with parent game namespace
  // TODO: break this out into an Item class.
  _dom = {
    o: null
  };

  initItem();

  const props = terrainItems[className];

  const width = props.width;
  const height = props.height;

  function getSpriteURL() {
    return utils.image.getImageObject(
      props.srcSnow && gamePrefs.weather === 'snow' ? props.srcSnow : props.src
    );
  }

  function updateSprite() {
    if (!data.domCanvas?.img?.src) return;
    data.domCanvas.img.src = getSpriteURL();
  }

  data = Object.assign(
    {
      type: className,
      id,
      isTerrainItem: true,
      bottomAligned: true,
      // TODO: review default values
      stepActive: false,
      stepFrame: undefined,
      stepFrames: null,
      stepOffset: undefined,
      x,
      // note: legacy, will be updated within animate()
      y: worldHeight - height + 4,
      width,
      height,
      isOnScreen: null,
      visible: true,
      domCanvas: {
        img: {
          src: getSpriteURL(),
          source: {
            x: 0,
            y: 0,
            // note: sprite source is 2x
            width: width * 2,
            height: height * 2
          },
          target: {
            x,
            y: worldHeight,
            width,
            height
          }
        }
      }
    },
    options
  );

  // basic structure for a terrain item
  exports = {
    animate,
    data,
    dom: _dom,
    dismiss,
    summon,
    updateSprite
  };

  // these will be tracked only for on-screen / off-screen purposes.
  game.objects[TYPES.terrainItem].push(exports);
  game.objectsById[data.id] = exports;

  // only track zones while editing.
  if (game.objects.editor) {
    zones.refreshZone(exports);
  }

  return exports;
}

export { addItem };
