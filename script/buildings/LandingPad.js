import { getTypes, rndInt, worldHeight } from '../core/global.js';
import { collisionTest } from '../core/logic.js';
import { common } from '../core/common.js';
import { sprites } from '../core/sprites.js';
import { game } from '../core/Game.js';

const LandingPad = (options = {}) => {
  let css, dom, data, collision, exports;

  function animate() {
    sprites.moveWithScrollOffset(exports);

    collisionTest(collision, exports);
  }

  function isOnScreenChange(isOnScreen) {
    if (!isOnScreen) return;

    setWelcomeMessage();
  }

  function setWelcomeMessage() {
    let eat, drink;

    eat = data.edible[rndInt(data.edible.length)];
    drink = data.drinkable[rndInt(data.drinkable.length)];

    data.welcomeMessage = `-* 🚁 Welcome to ${
      data.name || 'THE MIDWAY'
    }${" ⛽🛠️ *-<br />Today's feature: %s1 %s2 &middot; Enjoy your stay."
      .replace('%s1', drink)
      .replace('%s2', eat)}`;
  }

  function initLandingPad() {
    dom.o = sprites.create({
      id: data.id,
      className: css.className,
      isEnemy: data.isEnemy ? css.enemy : false
    });

    dom.o.appendChild(sprites.makeTransformSprite());

    sprites.setTransformXY(exports, dom.o, `${data.x}px`, `${data.y}px`);

    game.objects.radar.addItem(exports, dom.o.className);

    setWelcomeMessage();
  }

  css = common.inheritCSS({
    className: 'landing-pad'
  });

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

  dom = {
    o: null
  };

  exports = {
    animate,
    data,
    dom,
    init: initLandingPad,
    isOnScreenChange
  };

  data.domCanvas = {
    radarItem: LandingPad.radarItemConfig(exports)
  };

  collision = {
    options: {
      source: exports,
      targets: undefined,
      hit(target) {
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
            target.onLandingPad(exports);
          }
        } else {
          // "friendly landing pad MISS"
          target.onLandingPad(false);
        }
      }
    },
    items: getTypes('helicopter:all', { exports })
  };

  return exports;
};

LandingPad.radarItemConfig = (exports) => ({
  width: 5.5,
  height: 0.75,
  excludeFillStroke: true,
  draw: (ctx, obj, pos, width, height) => {
    if (exports.data.isObscured) return;
    ctx.fillStyle = '#aaa';
    const scaledWidth = pos.width(width);
    const scaledHeight = pos.height(height);
    const cornerWidth = 3;
    const cornerHeight = 2.25;
    const cornerHeightOffset = pos.bottomAlign(height) - cornerHeight;

    // alternate light colors
    exports.data.lightFrameCount++;
    if (exports.data.lightFrameCount % exports.data.lightFrameInterval === 0) {
      exports.data.lightFrameColors.reverse();
    }

    ctx.fillRect(
      pos.left(obj.data.left),
      pos.bottomAlign(height),
      scaledWidth,
      scaledHeight
    );

    // left-side light
    ctx.fillStyle = exports.data.lightFrameColors?.[0] || '#aaa';
    ctx.fillRect(
      pos.left(obj.data.left),
      cornerHeightOffset,
      cornerWidth,
      cornerHeight
    );

    // right-side light
    ctx.fillStyle = exports.data.lightFrameColors?.[1] || '#aaa';
    ctx.fillRect(
      pos.left(obj.data.left) + scaledWidth - cornerWidth,
      cornerHeightOffset,
      cornerWidth,
      cornerHeight
    );
  }
});

export { LandingPad };
