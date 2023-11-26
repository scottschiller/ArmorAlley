import { game } from '../core/Game.js';
import {
  GAME_SPEED,
  isMobile,
  isiPhone,
  oneOf,
  rnd,
  searchParams
} from '../core/global.js';

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
    // if not specified, minimum or window width.
    return (
      parseInt(searchParams.get('stars'), 10) ||
      Math.max(512, parseInt(window.innerWidth / 2, 10))
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

    // wipe the slate clean, per se.
    ctx.clearRect(0, 0, data.width, data.height);

    let x, y;

    let scrollDelta =
      data.lastScrollLeft - game.objects.view.data.battleField.scrollLeft;

    const absDelta = Math.abs(scrollDelta) * (1 / GAME_SPEED);

    // hackish: if we've scrolled a huge distance, e.g,. helicopter died mid-way out and now back at base, just reset all stars.
    // this mostly applies to small portrait screens, e.g., iPhone.
    if (
      absDelta > game.objects.view.data.browser.width &&
      !game.objects.view.isAnimateScrollActive()
    ) {
      resetStars();
      return;
    }

    /**
     * "Engage." --Picard
     * Also Picard: "Make it so."
     */
    data.warpEffect = game.objects.view.isAnimateScrollActive()
      ? absDelta / 4
      : absDelta / 5;

    // bonus: gratuitous live streaking - per se.
    if (game.data.battleOver) data.warpEffect *= 5;

    // slight curvature to the world - scale it further down for narrow portrait screens, e.g., iPhone.
    const globeOffset = data.height / (data.width >= 420 ? 16 : 72);

    const halfGlobeOffset = globeOffset / 2;

    let width;

    for (let i = 0; i < data.starCount; i++) {
      ctx.beginPath();

      ctx.fillStyle = data.stars[i].data.rgb;

      x = data.stars[i].data.x;

      y = data.stars[i].data.y + halfGlobeOffset;

      var circleY =
        Math.sin(((data.width - x) / data.width) * Math.PI) * -globeOffset;

      y += circleY;

      x += scrollDelta * data.stars[i].data.parallax;

      width = data.stars[i].data.diameter + data.warpEffect;

      // wrap-around logic
      if (scrollDelta < 0 && x + data.warpEffect < 0) {
        randomizeStar(i);
        x = data.width;
      } else if (scrollDelta > 0 && x > data.width) {
        randomizeStar(i);
        x = 0 - width;
      }

      data.stars[i].data.x = x;

      ctx.moveTo(x, y);

      // params: x, y, width, height, radii
      ctx.roundRect(
        x,
        y,
        data.stars[i].data.diameter + data.warpEffect,
        data.stars[i].data.diameter,
        [data.stars[i].data.radius]
      );

      ctx.fill();
    }

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
    data.stars = [];
    for (let i = 0, j = data.starCount; i < j; i++) {
      randomizeStar(i);
    }
  }

  function randomizeStar(offset) {
    const color = oneOf(colors);
    const opacity = 0.15 + rnd(0.85);
    // scale down differently on desktop, vs. iPhone, vs. mobile - "the pixels look big."
    // this may be due to some other scaling shenanigans.
    const radius = (0.75 + rnd(0.75)) * isiPhone ? 0.5 : isMobile ? 0.85 : 0.75;
    data.stars[offset] = {
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
