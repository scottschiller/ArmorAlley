import { game } from '../core/Game.js';
import { GAME_SPEED, TYPES, isiPhone } from '../core/global.js';

// "DOMFetti" experiment - 09/2018
// Refactored 12/2023 to render to <canvas>

// if false, target 30fps by updating style properties every other frame.
const RENDER_AT_60FPS = false;

// e.g., 66% of #ccc
const BACK_SIDE_COLOR = 2 / 3;

var context = document
  .getElementById('fx-canvas')
  .getContext('2d', { alpha: true });

let activeBooms = 0;

const useUnlimited = window.location.href.match(/unlimited/i);

let maxActiveCount = useUnlimited ? Math.Infinity : 2048;
let activeCount = 0;

const TOTAL_TICKS = 250;
let totalTicks; // TBD by GAME_SPEED

const int = (number, base = 10) => parseInt(number, base);

let fp;

const munitionTypes = {
  [TYPES.bomb]: true,
  [TYPES.gunfire]: true,
  [TYPES.smartMissile]: true
};

const COLORS = {
  default: ['#a864fd', '#29cdff', '#78ff44', '#ff718d', '#fdff6a'],
  green: [
    '#003300',
    '#006600',
    '#339933',
    '#66cc66',
    '#99ff99',
    '#99cc99',
    '#666666',
    '#cccccc',
    '#ccffcc'
  ],
  yellow: ['#684f32', '#896842', '#b38754', '#c79862', '#f1b673', '#ffc076'],
  grey: [
    '#222222',
    '#444444',
    '#666666',
    '#888888',
    '#aaaaaa',
    '#cccccc',
    '#ffffff'
  ],
  bomb: [
    '#330000',
    '#660000',
    '#663333',
    '#996666',
    '#666666',
    '#999999',
    '#cccccc'
  ]
};

/**
 * 3D cube JS tutorial, upon which this was based
 * https://www.youtube.com/watch?v=OVQxTNd2U3w
 */

// we only care about two sides.
const FACES = [
  [0, 4, 5, 1],
  [3, 2, 6, 7]
];

function point3d(x, y, z) {
  return { x, y, z };
}

function makeShape(x, y, z, size, offsetX, offsetY, frontColor, backColor) {
  size *= 0.5;

  const s1 = size / 8;
  const s2 = 0; // depth
  const s3 = size / 2;

  return {
    x,
    y,
    z,
    offsetX,
    offsetY,
    angleX: 0,
    angleY: 0,
    angleZ: 0,
    faceColors: [frontColor, backColor],
    vertices: [
      point3d(x - s1, y - s2, z - s3),
      point3d(x + s1, y - s2, z - s3),
      point3d(x + s1, y + s2, z - s3),
      point3d(x - s1, y + s2, z - s3),
      point3d(x - s1, y - s2, z + s3),
      point3d(x + s1, y - s2, z + s3),
      point3d(x + s1, y + s2, z + s3),
      point3d(x - s1, y + s2, z + s3)
    ]
  };
}

let shapeMan = (function () {
  // avoid recreating tons of small objects...
  let adjustedX,
    adjustedY,
    face,
    i,
    index,
    p1,
    p2,
    p3,
    v1,
    v2,
    n,
    p,
    v,
    x,
    y,
    z;

  return {
    rotateX: (shape, radian) => {
      var cosine = Math.cos(radian);
      var sine = Math.sin(radian);
      for (i = shape.vertices.length - 1; i > -1; --i) {
        v = shape.vertices[i];

        y = (v.y - shape.y) * cosine - (v.z - shape.z) * sine;
        z = (v.y - shape.y) * sine + (v.z - shape.z) * cosine;

        v.y = y + shape.y;
        v.z = z + shape.z;
      }
    },

    rotateY: (shape, radian) => {
      var cosine = Math.cos(radian);
      var sine = Math.sin(radian);
      for (i = shape.vertices.length - 1; i > -1; --i) {
        v = shape.vertices[i];

        x = (v.z - shape.z) * sine + (v.x - shape.x) * cosine;
        z = (v.z - shape.z) * cosine - (v.x - shape.x) * sine;

        v.x = x + shape.x;
        v.z = z + shape.z;
      }
    },

    rotateZ: (shape, radian) => {
      /**
       * Hat tip:
       * https://tobiasmarciszko.github.io/rotating-js-cube/
       */
      var cosine = Math.cos(radian);
      var sine = Math.sin(radian);
      for (i = shape.vertices.length - 1; i > -1; --i) {
        v = shape.vertices[i];
        x = v.x - shape.x;
        y = v.y - shape.y;
        v.x = x * cosine - y * sine + shape.x;
        v.y = y * cosine + x * sine + shape.y;
      }
    },

    draw: (shape, physics) => {
      p = physics;

      // deg2rad
      shapeMan.rotateX(shape, p.tiltAngleX * 0.0175);
      shapeMan.rotateY(shape, p.tiltAngleY * 0.0175);
      shapeMan.rotateZ(shape, p.rotateAngle * 0.0175);

      // origin, plus scaled battlefield scroll offsets and wobble
      adjustedX =
        p.x +
        shape.offsetX +
        (p.scrollLeft - game.objects.view.data.battleField.scrollLeft) *
          game.objects.view.data.screenScale +
        p.wobbleX;

      adjustedY = p.y + shape.offsetY + p.wobbleY;

      var vertices = shape.vertices;

      for (index = FACES.length - 1; index > -1; --index) {
        face = FACES[index];

        p1 = shape.vertices[face[0]];
        p2 = shape.vertices[face[1]];
        p3 = shape.vertices[face[2]];

        v1 = point3d(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
        v2 = point3d(p3.x - p1.x, p3.y - p1.y, p3.z - p1.z);

        n = point3d(
          v1.y * v2.z - v1.z * v2.y,
          v1.z * v2.x - v1.x * v2.z,
          v1.x * v2.y - v1.y * v2.x
        );

        // only show if facing...
        if (-p1.x * n.x + -p1.y * n.y + -p1.z * n.z <= 0) {
          context.beginPath();
          context.moveTo(
            vertices[face[0]].x + adjustedX,
            vertices[face[0]].y + adjustedY
          );
          context.lineTo(
            vertices[face[1]].x + adjustedX,
            vertices[face[1]].y + adjustedY
          );
          context.lineTo(
            vertices[face[2]].x + adjustedX,
            vertices[face[2]].y + adjustedY
          );
          context.lineTo(
            vertices[face[3]].x + adjustedX,
            vertices[face[3]].y + adjustedY
          );
          context.closePath();
          context.fillStyle = shape.faceColors[index];
          context.fill();
        }
      }
    }
  };
})();

function calcFractionalColors(colors = COLORS.default) {
  return colors.map((color) => {
    const rgb = hexToRgb(color);
    const fraction = BACK_SIDE_COLOR;
    return rgbToHex(
      int(rgb.r * fraction),
      int(rgb.g * fraction),
      int(rgb.b * fraction)
    );
  });
}

const fractionalColors = calcFractionalColors();

function configureColors(colors = COLORS.default) {
  // called by gunfire, etc., to set e.g., helicopter colors for "explosions"
  return {
    colors,
    backColors: calcFractionalColors(colors)
  };
}

// larger elements for first fraction of animation
const scaleMagnifier = 0.15;

// https://stackoverflow.com/questions/14482226/how-can-i-get-the-color-halfway-between-two-colors
function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: int(result[1], 16),
    g: int(result[2], 16),
    b: int(result[3], 16)
  };
}

function rnd(range = 1) {
  return Math.random() * range;
}

function randomPhysics(
  angle,
  spread,
  startVelocity,
  scrollLeft,
  originX,
  originY,
  vY
) {
  const radAngle = angle * (Math.PI / 180);
  const radSpread = spread * (Math.PI / 180);

  const xIncrement = rnd(2) + rnd(10);
  const yIncrement = rnd(2) + rnd(12.5);
  const zIncrement = rnd(2) + rnd(10);

  const { screenScale } = game.objects.view.data;

  const baseScale = 0.75 + rnd(0.25);

  return {
    x: 0,
    y: 0,
    vY,
    originX,
    originY,
    scrollLeft,
    velocity: (startVelocity * 0.5 + rnd(startVelocity)) * (screenScale * 0.33),
    angle2D: -radAngle + 0.5 * radSpread - rnd(radSpread),
    angle3D: -(Math.PI / 4) + rnd() * (Math.PI / 2),
    tiltAngleX: rnd(360) * 0.0175,
    tiltAngleY: rnd(360) * 0.0175,
    rotateAngle: rnd(360) * 0.0175,
    isFlippedOnX: false,
    isFlippedOnY: false,
    xIncrement,
    yIncrement,
    zIncrement,
    yVelocity: 1 + Math.random() * 0.01,
    transformOrigin1: `${int(rnd(100))}% ${int(rnd(100))}%`,
    transformOrigin2: `${int(rnd(100))}%, ${int(rnd(100))}%`,
    coinToss: rnd() >= 0.5,
    wobbleMultiplier1: 10 + rnd(10),
    wobbleMultiplier2: 10 + rnd(10),
    wobble: rnd(10),
    wobbleX: 0,
    wobbleY: 0,
    baseScale,
    scale: baseScale
  };
}

function updateFetti(fetti, progress, decay, frameCount) {
  if (!fetti?.physics) return;

  const styleThisFrame = RENDER_AT_60FPS || frameCount % 2 === 0;

  // DRY
  fp = fetti.physics;

  const yDelta = Math.sin(fp.angle2D) * fp.velocity;

  fp.x += Math.cos(fp.angle2D) * fp.velocity * GAME_SPEED;
  fp.y += yDelta;
  fp.z += Math.sin(fp.angle3D) * fp.velocity * GAME_SPEED;

  fp.wobble += rnd(0.1) * (fp.coinToss ? 1 : -1) * GAME_SPEED;

  fp.velocity *= 1 - (1 - decay);

  // always apply "gravity."
  fp.y += fp.yVelocity * GAME_SPEED;

  // only accelerate if headed downward?
  if (fp.y >= 1 && fp.yVelocity > 1) {
    fp.y *= fp.yVelocity;
  }

  fp.tiltAngleX += fp.xIncrement * (1 - progress) * GAME_SPEED;
  fp.tiltAngleY += fp.yIncrement * (1 - progress) * GAME_SPEED;
  fp.rotateAngle += fp.zIncrement * GAME_SPEED;

  fp.wobbleX = fp.wobbleMultiplier1 * Math.cos(fp.wobble);
  fp.wobbleY = fp.wobbleMultiplier2 * Math.sin(fp.wobble);

  // scale relative to viewport (game) scale
  const baseScale = fp.baseScale * game.objects.view.data.screenScale * 0.5;

  let scale = baseScale - progress * baseScale;

  // extra big at first
  if (progress < scaleMagnifier) {
    scale += baseScale * 2.75 * (scaleMagnifier - progress);
  }

  fp.scale = scale;

  if (fp.tiltAngleX >= 360) {
    fp.tiltAngleX -= 360;
  } else if (fp.tiltAngleX <= -360) {
    fp.tiltAngleX += 360;
  }

  if (fp.tiltAngleY >= 360) {
    fp.tiltAngleY -= 360;
  } else if (fp.tiltAngleY <= -360) {
    fp.tiltAngleY += 360;
  }

  if (fp.rotateAngle >= 360) fp.rotateAngle -= 360;

  if (styleThisFrame) {
    shapeMan.draw(
      makeShape(
        0,
        0,
        1,
        // note: upscaling for iPhone in particular.
        10 *
          game.objects.view.data.screenScale *
          fp.scale *
          (isiPhone && game.objects.view.data.browser.isPortrait
            ? 1.5
            : isiPhone
            ? 2
            : 1),
        fp.originX,
        fp.originY,
        fetti.colors.frontColor,
        fetti.colors.backColor
      ),
      fp
    );
  }
}

function animateFetti(fettis, decay, callback) {
  // basic lifecycle / active count management

  let tick = 0;

  function animate() {
    let result = update();
    if (RENDER_AT_60FPS) return result;

    /**
     * if running at 30FPS, big hack: do this again,
     * running the math twice but updating CSS only once.
     */
    return update();
  }

  function update() {
    fettis.forEach((fetti) =>
      updateFetti(fetti, tick / totalTicks, decay, tick)
    );

    tick++;

    if (tick < totalTicks) return;

    activeCount -= fettis.length;
    fettis = [];

    // ensure we only do this once. update() may be called twice on finish.
    if (tick === totalTicks && callback) {
      callback();
    }

    return true;
  }

  return { animate };
}

function confetti(
  {
    originX = 0,
    originY = 0,
    angle = 90,
    decay = 0.92,
    spread = 35,
    startVelocity = 45,
    elementCount = 50,
    scrollLeft = 0,
    colors = COLORS.default,
    backColors = fractionalColors,
    vY = 1 + rnd()
  } = {},
  callback
) {
  // hackish: set based on current
  totalTicks = TOTAL_TICKS * (1 / GAME_SPEED);
  if (activeCount + elementCount > maxActiveCount) {
    // "throttling": you only get a few.
    elementCount = Math.max(0, Math.min(5, maxActiveCount - elementCount));
  } else {
    activeCount += elementCount;
  }

  function createElements(elementCount, frontColors, backColors) {
    return Array.from({ length: elementCount }).map(() => {
      const rndColor = int(rnd() * frontColors.length);
      const frontColor = frontColors[rndColor];
      const backColor = backColors[rndColor];
      const physics = randomPhysics(
        angle,
        spread,
        startVelocity,
        scrollLeft,
        originX,
        originY,
        vY
      );
      return {
        colors: {
          frontColor,
          backColor
        },
        physics
      };
    });
  }

  const fettis = createElements(elementCount, colors, backColors).map((o) => ({
    colors: o.colors,
    physics: o.physics
  }));

  // { animate }
  return animateFetti(fettis, decay, callback);
}

function domFettiBoom(source, target, x, y) {
  if (!source?.data) return;

  const { screenScale } = game.objects.view.data;

  const bottomAligned = !!source?.data?.bottomAligned;

  // hack: subtract radar height, because the canvas does not include this offset.
  y -= 32;

  let elementCount = 25 + rnd(25);

  let colorConfig;

  let colorType;

  let sourceType = source?.data?.domFetti?.colorType;
  let targetType = target?.data?.domFetti?.colorType;

  /**
   * Hackish: if source is a munition - gunfire, bomb or smart missile - have it inherit the target's colour.
   * i.e., gunfire fragments become yellow on bunkers, green on human helicopter, grey on CPU.
   * This covers the source / target (attacker) case where gunfire calls this method, but it hit e.g., the helicopter.
   */
  if (munitionTypes[source?.data?.type]) {
    colorType = targetType || sourceType;
  } else {
    colorType = sourceType || targetType;
  }

  // special case: certain smart missiles cause more colourful target explosions.
  if (source?.data?.type) {
    if (
      source.data.type === TYPES.smartMissile &&
      (source.data.isRubberChicken || source.data.isBanana)
    ) {
      colorType = source.data.domFetti?.colorType;
    } else if (source.data.type === TYPES.helicopter && source.data.dead) {
      // a helicopter just died.
      colorType = 'default';
    }
  }

  if (COLORS[colorType]) {
    colorConfig = configureColors(COLORS[colorType]);
  }

  const extraParams = {
    angle: undefined,
    decay: bottomAligned ? 0.935 : 0.8 + rnd(0.15),
    // sprite X is 0 - 8192px, based on battlefield and scroll.
    // confetti is shown as a full-screen overlay, not scaled; so, account for scroll and scale so things line up.
    originX: (x - game.objects.view.data.battleField.scrollLeft) * screenScale,
    originY: y * screenScale,
    scrollLeft: game.objects.view.data.battleField.scrollLeft || 0,
    startVelocity: 15 + rnd(15),
    spread: 25 + elementCount + rnd(100),
    elementCount: int(elementCount),
    // include any per-object overrides
    ...source.data.domFetti,
    // and calculated colors
    ...colorConfig
  };

  const boom = confetti(extraParams, () => boomComplete());

  activeBooms++;

  return boom;
}

function boomComplete() {
  activeBooms = Math.max(0, activeBooms - 1);
}

function screenBoom() {
  const { scrollLeft } = game.objects.view.data.battleField;
  const { browser } = game.objects.view.data;
  const height = 180;
  const { fractionWidth } = browser;

  // middle, left, right
  const sequence = [
    {
      x: scrollLeft + (fractionWidth * 2 * 3) / 4,
      y: height
    },
    {
      x: scrollLeft + (fractionWidth * 3) / 4,
      y: height
    },
    {
      x: scrollLeft + (fractionWidth * 3 * 3) / 4,
      y: height
    }
  ];

  // exports-style object structure
  const options = {
    data: {
      domFetti: {
        elementCount: 150,
        spread: 360,
        decay: 0.95,
        startVelocity: 30
      }
    }
  };

  sequence.forEach((item) => {
    game.objects.domFetti.push(domFettiBoom(options, null, item.x, item.y));
  });
}

export { configureColors, domFettiBoom, screenBoom };
