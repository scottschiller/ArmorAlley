import { getTypes, rndInt, worldHeight } from '../core/global.js';
import { collisionTest } from '../core/logic.js';
import { common } from '../core/common.js';
import { sprites } from '../core/sprites.js';
import { game, getObjectById } from '../core/Game.js';

const LandingPad = (options = {}) => {
  let exports;

  let domCanvas, data, collision;

  data = common.inheritData(
    {
      type: 'landing-pad',
      name: options.name,
      isKennyLoggins: options.isKennyLoggins,
      isMidway: options.isMidway,
      isNeutral: true,
      isObscured: options.obscured,
      energy: 2,
      width: 81,
      halfWidth: 40.5,
      height: 4,
      y: worldHeight - 3,
      edible: [
        '🍔',
        '🍑',
        '🍒',
        '🍆',
        '🥑',
        '🍄',
        '🍖',
        '🍟',
        '🌭',
        '🌮',
        '🌯',
        '🍲',
        '🍿',
        '🍣',
        '🐟',
        '🥡'
      ],
      drinkable: [
        '🍺',
        '🍻',
        '🍹',
        '<span class="no-emoji-substitution">☕</span>',
        '🍾',
        '🍷',
        '🍸',
        '🥂',
        '🥃'
      ],
      lightFrameCount: 0,
      lightFrameInterval: 15,
      lightFrameColors: ['#ffa206', '#a30402']
    },
    options
  );

  domCanvas = {
    radarItem: LandingPad.radarItemConfig({ data })
  };

  exports = {
    animate: () => animate(exports),
    data,
    domCanvas,
    init: () => initLandingPad(exports),
    isOnScreenChange: (...args) => isOnScreenChange(exports, ...args)
  };

  collision = {
    options: {
      source: data.id,
      targets: undefined,
      hit(targetID) {
        let target = getObjectById(targetID);
        if (!target.onLandingPad) return;
        /**
         * slightly hackish: landing pad shape doesn't take full height of bounding box.
         * once a "hit", measure so that helicopter aligns with bottom of world.
         *
         * additionally: only consider a "hit" IF the helicopter is moving down, e.g., data.vY > 0.
         * otherwise, ignore this event and allow helicopter to leave.
         */
        if (target.data.vY >= 0 && !target.data.dead) {
          // "friendly landing pad HIT"
          if (target.data.y + target.data.height >= worldHeight) {
            // provide the "active" landing pad
            target.onLandingPad(true, data.id);
          }
        } else {
          // "friendly landing pad MISS"
          target.onLandingPad(false);
        }
      }
    },
    items: getTypes('helicopter:all', { exports })
  };

  exports.collision = collision;

  return exports;
};

function animate(exports) {
  let { domCanvas, collision } = exports;

  sprites.draw(exports);

  domCanvas?.animation?.animate();

  collisionTest(collision, exports);
}

function isOnScreenChange(exports, isOnScreen) {
  if (!isOnScreen) return;

  setWelcomeMessage(exports);
}

function setWelcomeMessage(exports) {
  let { data } = exports;

  let eat, drink;

  eat = data.edible[rndInt(data.edible.length)];
  drink = data.drinkable[rndInt(data.drinkable.length)];

  data.welcomeMessage = `-* 🚁 Welcome to ${
    data.name || 'THE MIDWAY'
  }${" ⛽🛠️ *-<br />Today's feature: %s1 %s2 &middot; Enjoy your stay."
    .replace('%s1', drink)
    .replace('%s2', eat)}`;
}

function initLandingPad(exports) {
  let { domCanvas } = exports;

  const animConfig = (() => {
    const spriteWidth = 162;
    const spriteHeight = 14;
    return {
      sprite: {
        url: 'landing-pad_#.png',
        width: spriteWidth,
        height: spriteHeight,
        frameWidth: spriteWidth,
        frameHeight: spriteHeight,
        animationDuration: 2,
        animationFrameCount: 4,
        loop: true
      }
    };
  })();

  domCanvas.animation = common.domCanvas.canvasAnimation(exports, animConfig);

  common.initDOM(exports);

  game.objects.radar.addItem(exports);

  setWelcomeMessage(exports);
}

LandingPad.radarItemConfig = ({ data }) => ({
  width: 5.5,
  height: 0.75,
  excludeFillStroke: true,
  draw: (ctx, obj, pos, width, height) => {
    if (data.isObscured) return;
    ctx.fillStyle = '#aaa';
    const scaledWidth = pos.width(width);
    const scaledHeight = pos.height(height);
    const cornerWidth = 3;
    const cornerHeight = 2.25;
    const cornerHeightOffset = pos.bottomAlign(height) - cornerHeight;

    // alternate light colors
    data.lightFrameCount++;
    if (data.lightFrameCount % data.lightFrameInterval === 0) {
      data.lightFrameColors.reverse();
    }

    ctx.fillRect(
      pos.left(obj.data.left),
      pos.bottomAlign(height),
      scaledWidth,
      scaledHeight
    );

    // left-side light
    ctx.fillStyle = data.lightFrameColors?.[0] || '#aaa';
    ctx.fillRect(
      pos.left(obj.data.left),
      cornerHeightOffset,
      cornerWidth,
      cornerHeight
    );

    // right-side light
    ctx.fillStyle = data.lightFrameColors?.[1] || '#aaa';
    ctx.fillRect(
      pos.left(obj.data.left) + scaledWidth - cornerWidth,
      cornerHeightOffset,
      cornerWidth,
      cornerHeight
    );
  }
});

export { LandingPad };
