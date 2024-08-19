import { gamePrefs } from '../UI/preferences.js';
import { game } from '../core/Game.js';
import {
  FPS,
  GAME_SPEED_RATIOED,
  isMobile,
  isiPhone,
  oneOf,
  rnd,
  rndInt,
  searchParams
} from '../core/global.js';

const StarController = () => {
  // "Star Control" (star controller.) Ideally, version ][ of course. ;)
  let data, dom, exports;

  const white = [255, 255, 255];

  const colors = [
    [255, 0, 0], // red
    [255, 165, 0], // orange
    [255, 255, 0], // yellow
    [0, 255, 0], // green
    [0, 0, 255] // blue
  ].concat(Array(5).fill(white));

  // game prefs vs. number of stars
  const scaleMap = {
    less: 0.25,
    standard: 0.85,
    more: 3
  };

  data = {
    frameCount: 0,
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
    // if not specified, use minimum or window width.
    // scale relative to preference.
    const count =
      parseInt(searchParams.get('stars'), 10) ||
      Math.max(512, parseInt(window.innerWidth / 2, 10));
    return count * (scaleMap[gamePrefs.stars_density] || 1);
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

    let x, y;

    let scrollDelta =
      data.lastScrollLeft - game.objects.view.data.battleField.scrollLeft;

    const absDelta = Math.abs(scrollDelta) * (1 / GAME_SPEED_RATIOED);

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

    const isAnimateScrollActive = game.objects.view.isAnimateScrollActive();

    data.warpEffect = !gamePrefs.stars_warp_fx
      ? 0
      : isAnimateScrollActive
        ? absDelta / 4
        : absDelta / 5;

    // bonus: gratuitous live streaking - per se.
    if (game.data.battleOver) data.warpEffect *= 5;

    // slight curvature to the world - scale it further down for narrow portrait screens, e.g., iPhone.
    const globeOffset = data.height / (data.width >= 420 ? 16 : 72);

    const halfGlobeOffset = globeOffset / 2;

    let width;
    let height;
    let scale;

    const isWarp = gamePrefs.stars_warp_fx && isAnimateScrollActive;

    // twinkle includes scaling, but not desirable during a warp.
    const canScale = gamePrefs.stars_twinkle_fx && !isWarp;

    for (let i = 0; i < data.starCount; i++) {
      // twinkle, twinkle? (ignore during a scroll / warp event.)
      if (
        gamePrefs.stars_twinkle_fx &&
        (FPS !== 60 || game.objects.gameLoop.data.frameCount % 2 === 0)
      ) {
        if (data.stars[i].data.twinkleFrameCount) {
          // don't draw this one - decrement, and exit.
          data.stars[i].data.twinkleFrameCount--;
          // continue;
        } else if (
          data.stars[i].data.twinkleModulus &&
          data.frameCount % data.stars[i].data.twinkleModulus === 0
        ) {
          // start "twinkling."
          data.stars[i].data.twinkleFrameCount = rndInt(8) * (FPS / 30);
          // randomize the modulus, again.
          data.stars[i].data.twinkleModulus = getTwinkleModulus();
          continue;
        }
      }

      ctx.beginPath();

      ctx.fillStyle = data.stars[i].data.rgba;

      x = data.stars[i].data.x;

      y = data.stars[i].data.y + halfGlobeOffset;

      var circleY =
        Math.sin(((data.width - x) / data.width) * Math.PI) * -globeOffset;

      y += circleY;

      x += scrollDelta * data.stars[i].data.parallax;

      width = data.stars[i].data.diameter + data.warpEffect;

      // wrap-around logic
      if (scrollDelta < 0 && x + width < 0) {
        randomizeStar(i);
        // move more randomly if warping.
        if (isWarp) {
          // random place on screen.
          x = data.width + width + Math.abs(rnd(data.stars[i].data.parallax));
        } else {
          // move off-screen, and push out relative to the distance being moved.
          x =
            data.width +
            width +
            Math.abs(scrollDelta * data.stars[i].data.parallax);
        }
      } else if (scrollDelta > 0 && x > data.width) {
        randomizeStar(i);
        if (isWarp) {
          // random place on screen.
          x = rnd(width);
        } else {
          x = 0 - width - Math.abs(scrollDelta * data.stars[i].data.parallax);
        }
      }

      data.stars[i].data.x = x;

      ctx.moveTo(x, y);

      scale = canScale ? data.stars[i].data.twinkleFrameCount || 1 : 1;

      // params: x, y, width, height, radii

      // new display width, different from logical width above...
      width = data.stars[i].data.diameter;

      // if scaling (as part of twinkle), ignore warp effect.
      if (scale > 1) {
        width *= scale;
      } else {
        width += data.warpEffect;
      }

      height = data.stars[i].data.diameter * scale;

      ctx.roundRect(x - width / 2, y - height / 2, width, height, [
        data.stars[i].data.radius * scale
      ]);

      ctx.fill();
    }

    syncWithLeftScroll();

    data.frameCount++;
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
    dom.o = document.getElementById('battlefield-canvas');
    dom.ctx = dom.o.getContext('2d', { alpha: false });
  }

  function initStars() {
    data.starCount = getStarCount();
    syncWithLeftScroll();
    data.stars = [];
    for (let i = 0, j = data.starCount; i < j; i++) {
      randomizeStar(i);
    }
  }

  function getRGBA(opacity) {
    const rgb = gamePrefs.stars_color ? oneOf(colors) : white;
    return `rgba(${rgb.join(',')},${opacity})`;
  }

  function updateStarColorPref() {
    for (let i = 0, j = data.stars.length; i < j; i++) {
      data.stars[i].data.rgba = getRGBA(data.stars[i].data.opacity);
    }
  }

  function getTwinkleModulus() {
    return FPS * 5 + rndInt(FPS * 25);
  }

  function randomizeStar(offset) {
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
        rgba: getRGBA(opacity),
        opacity,
        // initial random delay
        twinkleModulus: rnd(1) >= 0.98 ? rndInt(FPS * 30) : 0,
        twinkleFrameCount: 0,
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
    reset: resetStars,
    updateStarColorPref,
    updateStarDensityPref: init
  };

  return exports;
};

export { StarController };
