import { game, getObjectById } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { oneOf, rndInt, TYPES } from '../core/global.js';
import { common } from '../core/common.js';
import { sprites } from '../core/sprites.js';

const Cornholio = (options = {}) => {
  let data, domCanvas, exports, height;

  function setVisible(visible) {
    if (data.visible === visible) return;

    // BnB pref change can fire this; make sure turret is also live.
    data.visible = !getObjectById(data.oParent).data.dead && visible;
  }

  function setActiveSound(sound, turretFiring = null) {
    // if sound provided, we are speaking.
    // otherwise, rely on provided "turret firing" state.
    setSpeaking(sound ? true : !!turretFiring);
  }

  function setSpeaking(speaking) {
    if (data.speaking === speaking) return;

    data.speaking = speaking;

    if (speaking) {
      domCanvas.img.source.frameX = 1 + rndInt(2);
    } else {
      domCanvas.img.source.frameX = 0;
    }

    if (data.speaking) {
      data.lastSpeaking = oneOf(speakingStates);
    }
  }

  function animate() {
    if (!data.visible) return;
    sprites.draw(exports);
  }

  height = 33.6;

  let speakingStates = ['threatening', 'bow-down'];

  data = common.inheritData(
    {
      type: TYPES.cornholio,
      bottomAligned: true,
      width: 12,
      height,
      visible: null,
      lastSpeaking: null,
      lastSound: null,
      oParent: options.oParent,
      x: options.x || 0,
      y: game.objects.view.data.world.height - height - 2
    },
    options
  );

  const spriteWidth = 90;
  const spriteHeight = 84;
  const frameWidth = spriteWidth / 3;
  const frameHeight = spriteHeight;

  domCanvas = {
    img: {
      src: !game.objects.editor
        ? utils.image.getImageObject('bnb/beavis-cornholio.png')
        : null,
      source: {
        x: 0,
        y: 0,
        is2X: true,
        width: spriteWidth,
        height: spriteHeight,
        frameWidth,
        frameHeight,
        frameX: 0,
        frameY: 0
      },
      target: {
        width: spriteWidth / 2,
        height: frameHeight / 2
      }
    }
  };

  exports = {
    animate,
    data,
    domCanvas,
    hide: () => setVisible(false),
    init: () => {
      common.initDOM(exports);
    },
    show: () => setVisible(true),
    setActiveSound,
    setSpeaking,
    setVisible
  };

  return exports;
};

export { Cornholio };
