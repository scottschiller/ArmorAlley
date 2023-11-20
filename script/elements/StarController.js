import { game } from '../core/Game.js';
import { isMobile, oneOf, rnd, searchParams } from '../core/global.js';

const StarController = () => {
  // "Star Control" (star controller.) Ideally, version ][ of course. ;)
  let data, dom, exports;

  const colors = [
    [255, 0, 0], // red
    [255, 165, 0], // orange
    [255, 255, 0], // yellow
    [0, 255, 0], // green
    [0, 0, 255], // blue
    [255, 255, 255], // white
    [255, 255, 255],
    [255, 255, 255],
    [255, 255, 255],
    [255, 255, 255]
  ];

  data = {
    lastScrollLeft: 0,
    starCount: 0,
    stars: [],
    width: 0,
    height: 0
  };

  dom = {
    o: null,
    ctx: null
  };

  function getStarCount() {
    // "at least," and more if windows are really big.
    return (
      parseInt(searchParams.get('stars'), 10) ||
      Math.min(512, parseInt(window.innerWidth / 3))
    );
  }

  function syncWithLeftScroll() {
    data.lastScrollLeft = parseFloat(
      game.objects.view.data.battleField.scrollLeft
    );
  }

  function animate() {
    if (!dom?.ctx) return;
    if (!data.stars.length) return;

    const { ctx } = dom;

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#fff';

    const startAngle = 0;
    const endAngle = Math.PI * 2;

    // wipe the slate clean, per se.
    ctx.clearRect(0, 0, data.width, data.height);

    let x, y;

    let scrollDelta =
      data.lastScrollLeft - game.objects.view.data.battleField.scrollLeft;

    // slight curvature to the world - scale it further down for narrow portrait screens, e.g., iPhone.
    const globeOffset = data.height / (data.width >= 420 ? 32 : 72);

    const chopperOffsetScale = data.height / 96;

    const chopperOffset =
      (game.players.local.data.y / game.players.local.data.yMax) *
      chopperOffsetScale;

    for (let i = 0; i < data.starCount; i++) {
      ctx.beginPath();

      ctx.fillStyle = data.stars[i].data.rgb;

      x = data.stars[i].data.x;

      y = data.stars[i].data.y;

      var circleY =
        Math.sin(((data.width - x) / data.width) * Math.PI) * -globeOffset;

      y += circleY - chopperOffset;

      x += scrollDelta * data.stars[i].data.parallax;

      // wrap-around logic
      if (x < 0) {
        x = data.width - data.stars[i].data.diameter;
      } else if (x + data.stars[i].data.diameter > data.width) {
        x = 0;
      }

      data.stars[i].data.x = x;

      ctx.moveTo(x, y);

      /**
       * arc(x, y, radius, startAngle, endAngle, counterclockwise)
       * Draws an arc which is centered at `x, y` position with:
       * radius `r` starting at `startAngle` and ending at `endAngle`
       * going in the direction indicated by `counterclockwise`
       * (defaulting to clockwise.)
       */
      ctx.arc(x, y, data.stars[i].data.radius, startAngle, endAngle, true);

      ctx.fill();
    }

    // update
    syncWithLeftScroll();
  }

  function refreshStarCoords(newWidth = data.width, newHeight = data.height) {
    // mobile: no gradual resize, just orientationChange().
    // effectively restart in that case, new star counts etc.
    if (isMobile) {
      initStars();
      return;
    }

    if (!data.stars.length) return;

    // desktop: scale relative to new screen.
    const xRatio = newWidth / data.width;
    const yRatio = newHeight / data.height;
    for (let i = 0; i < data.starCount; i++) {
      data.stars[i].data.x *= xRatio;
      data.stars[i].data.y *= yRatio;
    }
  }

  function resetStars() {
    // catch up with current scroll offset
    syncWithLeftScroll();
  }

  function resize() {
    // if there are stars, scale them relative to the new coords.
    // Note: $$$
    if (!dom.o) return;

    let newWidth = dom.o.offsetWidth;
    let newHeight = dom.o.offsetHeight;

    refreshStarCoords(newWidth, newHeight);

    data.width = newWidth;
    data.height = newHeight;
    dom.o.width = data.width;
    dom.o.height = data.height;

    // scale, or randomize depending on the device.
    refreshStarCoords();

    // force immediate redraw.
    animate();
  }

  function initDOM() {
    dom.o = document.getElementById('stars');
    dom.ctx = dom.o.getContext('2d');
  }

  function initStars() {
    data.starCount = getStarCount();

    syncWithLeftScroll();

    let color;
    let opacity;
    let radius;

    data.stars = [];

    for (let i = 0, j = data.starCount; i < j; i++) {
      color = oneOf(colors);
      opacity = 0.15 + rnd(0.85);
      radius = 0.75 + rnd(0.75);
      data.stars[i] = {
        data: {
          x: rnd(data.width),
          y: rnd(data.height),
          radius,
          diameter: radius * 2,
          rgb: `rgba(${color.join(',')},${opacity})`,
          direction: 1,
          // parallax is roughly correlated to distance / size
          parallax: radius / 4 + rnd(radius / 4)
        }
      };
    }
  }

  function init() {
    initDOM();
    resize();
    initStars();
  }

  exports = {
    animate,
    data,
    init,
    resize,
    reset: resetStars
  };

  return exports;
};

export { StarController };
