import { atkinson } from '../UI/atkinson.js';
import { aaLoader } from './aa-loader.js';
import { IMAGE_ROOT, SPRITESHEET_URL, imageSpriteConfig } from './global.js';

// temporary / prototype stuff
let useAtkinson = window.location.href.match(/atkinson/i);

const LS_VERSION_KEY = 'AA';
const LS_VERSION = '2023';

const emptyURL = 'NULL';

const blankImage = new Image();
blankImage.src =
  'data:image/gif;base64,R0lGODlhAQABAPAAAAAAAP///yH5BAUKAAAALAAAAAABAAEAQAICRAEAOw==';

let bufferCanvas;
let bufferCanvasCtx;

let flipCanvas;
let flipCanvasCtx;

let blurCanvas;
let blurCanvasCtx;

// sneaky tricks: source image -> canvas upscaling, 2X scaling and so on
const upscaleByName = {
  'barb-wire.png': 2,
  'base-sprite-burning.png': 2,
  'bomb.png': 2,
  'bunker-burning-sprite.png': 2,
  'bunker-dead.png': 2,
  'cactus.png': 2,
  'cactus2.png': 2,
  'checkmark-grass.png': 2,
  'end-bunker.png': 2,
  'end-bunker-enemy.png': 2,
  'bunker_mac.png': 2,
  'cloud-1.png': 2,
  'cloud-2.png': 2,
  'cloud-3.png': 2,
  'engineer-enemy-sprite-horizontal.png': 2,
  'engineer-sprite-horizontal.png': 2,
  'flower.png': 2,
  'flower-bush.png': 2,
  'flowers.png': 2,
  'grass.png': 2,
  'grave-cross.png': 2,
  'gravestone.png': 2,
  'gravestone2.png': 2,
  'infantry-enemy-sprite-horizontal.png': 2,
  'infantry-sprite-horizontal.png': 2,
  'missile-launcher.png': 2,
  'missile-launcher-enemy.png': 2,
  'palm-tree.png': 2,
  'parachute-infantry.png': 2,
  'parachute-infantry-enemy.png': 2,
  'right-arrow-sign-mac.png': 2,
  'rock.png': 2,
  'rock2.png': 2,
  'sand-dune.png': 2,
  'sand-dunes.png': 2,
  'smart-missile.png': 2,
  'super-bunker_mac.png': 2,
  'tank_flame.png': 2,
  'tree.png': 2,
  'turret-sprite.png': 2
};

function addSeries(prefix, len) {
  for (let i = 0; i <= len; i++) {
    upscaleByName[`${prefix}${i}.png`] = 2;
  }
}

addSeries('base_', 4);
addSeries('base-enemy_', 4);
addSeries('base-burning_', 3);
addSeries('balloon_', 8);
addSeries('explosion-large_', 4);
addSeries('explosion-large-2_', 4);
addSeries('generic-explosion_', 4);
addSeries('generic-explosion-2_', 4);
addSeries('helicopter_', 3);
addSeries('helicopter-enemy_', 3);
addSeries('helicopter-rotating_', 3);
addSeries('helicopter-rotated_', 3);
addSeries('helicopter-enemy-rotated_', 3);
addSeries('helicopter-rotating-enemy_', 3);
addSeries('landing-pad_', 3);
addSeries('shrapnel_v', 11);
addSeries('smoke_v', 11);
addSeries('tank_', 2);
addSeries('tank-enemy_', 2);
addSeries('van_', 2);
addSeries('van-enemy_', 2);

// image pre-fetch / render / cache helper bits
let explosionConfig = {
  count: 5,
  config: {
    blur: 3,
    color: 'rgba(255, 0, 0, 0.33)'
  }
};

// apply "glow" effects to certain groups of sprites at image load / extract time.
let preProcessConfig = [
  {
    // file name pattern, blur amount, color
    file: 'generic-explosion_',
    ...explosionConfig
  },
  {
    file: 'generic-explosion-2_',
    ...explosionConfig
  },
  {
    file: 'shrapnel_v',
    count: 12,
    config: {
      blur: 10,
      color: 'rgba(255, 0, 0, 0.75)'
    }
  },
  {
    file: 'smoke_v',
    count: 12,
    config: {
      blurMax: 10,
      blur: (fileName, data) => {
        // dynamic blur / glow amount, reduced as images rotate through range. e.g., frame 0 -> 11
        let i = getFrame(fileName, data.file);
        return (
          data.config.blurMax - (data.config.blurMax - 1) * (i / data.count)
        );
      },
      color: 'rgba(255, 255, 255, 0.4)'
    }
  }
];

// this will be populated with blur config, for groups of sprites - e.g., shrapnel_v0 through shrapnel_v12.png.
let preProcessData = {};

preProcessConfig.forEach((item) => {
  // potentially dangerous: assuming PNG, here.
  for (let i = 0; i < item.count; i++) {
    preProcessData[`${item.file}${i}.png`] = item;
  }
});

function getFrame(url, str) {
  // hackish: parse the number out of the image URL - e.g., smoke_v10.png
  let offset = url.indexOf(str);
  return url.substring(offset + str.length, url.lastIndexOf('.'));
}

function applyShadowBlur(originalSrc, img, blurData, callback) {
  // assume image is already loaded. :X

  if (!blurCanvas) {
    blurCanvas = document.createElement('canvas');
  }

  blurCanvas.width = img.width;
  blurCanvas.height = img.height;

  // note: no smoothing, this is a 1:1-scale copy.
  // however, enable to allow "glow" to be drawn smoothly.
  if (!blurCanvasCtx) {
    blurCanvasCtx = blurCanvas.getContext('2d', {
      alpha: true,
      imageSmoothingEnabled: true
    });
  }

  /**
   * Shenanigans: config property can be a function, or a number.
   * A function allows for dynamic calculation, e.g., glow effect based on the frame number.
   */
  blurCanvasCtx.shadowBlur =
    blurData.config.blur instanceof Function
      ? blurData.config.blur(originalSrc, blurData)
      : blurData.config.blur;

  blurCanvasCtx.shadowColor = blurData.config.color;

  blurCanvasCtx.drawImage(
    img,
    // source
    0,
    0,
    img.width,
    img.height,
    // target
    0,
    0,
    img.width,
    img.height
  );

  // reset blur
  blurCanvasCtx.shadowBlur = 0;
  blurCanvasCtx.shadowColor = '';

  // more modern vs. toDataURL() - and faster?
  blurCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);

    let blurredImg = new Image();

    blurredImg.onload = () => {
      blurredImg.onload = null;
      callback?.(blurredImg);
      // blob no longer needed, revoke momentarily
      window.requestAnimationFrame(() => URL.revokeObjectURL(url));
    };

    blurredImg.src = url;
  });
}

function preProcess(originalSrc, img, callback) {
  /**
   * Dynamic canvas-applied blur / glow effects.
   * img / sprite -> canvas treatments can be applied here before going to cache.
   */

  let fileName = originalSrc.substring(originalSrc.lastIndexOf('/') + 1);

  // does the given file need an effect applied?
  if (!preProcessData[fileName]) {
    callback(img);
    return;
  }

  applyShadowBlur(originalSrc, img, preProcessData[fileName], (blurImg) =>
    callback(blurImg)
  );
}

function flipInCanvas(imgToFlip, callback) {
  if (!flipCanvas) {
    flipCanvas = document.createElement('canvas');
  }

  flipCanvas.width = imgToFlip.width;
  flipCanvas.height = imgToFlip.height;

  // note: no smoothing, this is a 1:1-scale copy.
  if (!flipCanvasCtx) {
    flipCanvasCtx = flipCanvas.getContext('2d', { alpha: true });
  }

  // horizontal flip
  flipCanvasCtx.scale(-1, 1);
  flipCanvasCtx.drawImage(imgToFlip, -imgToFlip.width, 0);

  let flippedImg = new Image();

  flippedImg.onload = () => {
    flippedImg.onload = null;
    callback?.(flippedImg);
  };

  // create a new image, don't mutate our source which may be from cache
  // e.g., spritesheet -> extracted source -> new flipped image
  flippedImg.src = flipCanvas.toDataURL('image/png');
}

const utils = {
  array: {
    compareByLastItem: (a, b) => {
      const propA = a.length - 1;
      const propB = b.length - 1;
      if (a[propA] < b[propB]) return -1;
      if (a[propA] > b[propB]) return 1;
      return 0;
    },

    compare: (property) => {
      let result;

      return (a, b) => {
        if (a[property] < b[property]) {
          result = -1;
        } else if (a[property] > b[property]) {
          result = 1;
        } else {
          result = 0;
        }
        return result;
      };
    },

    shuffle: (array) => {
      // Fisher-Yates shuffle algo

      // guard / avoid redundant work
      if (!array || array.excludeShuffle) return array;

      let i, j, temp;

      for (i = array.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        temp = array[i];
        array[i] = array[j];
        array[j] = temp;
      }

      // special case: shuffle 2-item arrays only once to avoid errant repetition.
      if (array.length === 2) array.excludeShuffle = true;

      return array;
    }
  },

  css: {
    has: (o, cStr) => {
      // modern
      if (o?.classList) {
        return o.classList.contains(cStr);
      }
      // legacy
      return o.className !== undefined
        ? new RegExp(`(^|\\s)${cStr}(\\s|$)`).test(o.className)
        : false;
    },

    add: (o, ...toAdd) => o?.classList?.add(...toAdd),

    remove: (o, ...toRemove) => o?.classList?.remove(...toRemove),

    addOrRemove: (o, conditionToAdd, ...classNames) => {
      utils.css[conditionToAdd ? 'add' : 'remove'](o, ...classNames);
    },

    swap: (o, cssOut, cssIn) => {
      if (!o?.classList) return;
      if (cssOut) {
        o.classList.remove(cssOut);
      }
      if (cssIn) {
        o.classList.add(cssIn);
      }
    }
  },

  events: {
    add: (o, evtName, evtHandler) =>
      o?.addEventListener(evtName, evtHandler, false),

    remove: (o, evtName, evtHandler) =>
      o?.removeEventListener(evtName, evtHandler, false),

    preventDefault: (e) => e?.preventDefault()
  },

  image: {
    getImageFromSpriteSheet: (imgRef, callback) => {
      // extract and cache a named image (based on URL) from the "default" spritesheet
      let ssURL = SPRITESHEET_URL;
      // fetch, as needed
      if (imageObjects[ssURL]) {
        imageResourceReady(imageObjects[ssURL], imgRef, callback);
      } else {
        utils.image.load(ssURL, (ssImg) =>
          imageResourceReady(ssImg, imgRef, callback)
        );
      }
    },
    getImageObject: (url = emptyURL, onload) => {
      /**
       * NOTE: This method has become somewhat complex.
       * It returns an `<img>` which is initially empty, then ready via `onload()`.
       *
       * Internally, this method queues image requests and canvas processing tasks
       * to avoid redundant work. Callbacks are queued on "pending" tasks and then
       * executed once the image is ready and cached.
       *
       * Once cached, callbacks should be almost instantaneous.
       */

      // simple case, already in cache: callback and return, no queue etc.
      if (imageObjects[url]) {
        // yield, because outer function may not have returned object yet.
        // also, this feels like an antipattern and should be refactored.
        if (onload) {
          window.requestAnimationFrame(() => onload(imageObjects[url]));
        }
        return imageObjects[url];
      }

      let img;
      let src;

      function doCallback() {
        if (!imageObjects[url]) {
          imageObjects[url] = img;
          img.onload = null;
          img.onerror = null;
        }

        // yield, because outer function may not have returned the `<img>` object yet.
        // note: antipattern comment as per above.
        window.requestAnimationFrame(() => {
          pendingImageCallbacks[url]?.forEach?.((func) =>
            func?.(imageObjects[url])
          );
          // no longer pending.
          delete pendingImageObjects[url];
          delete pendingImageCallbacks[url];
        });
      }

      // avoid redundant work: catch and mark "pending" requests for resources already being processed.
      if (!pendingImageCallbacks[url]) {
        img = new Image();
        src = url === emptyURL ? blankImage.src : `${IMAGE_ROOT}/${url}`;

        // mark pending work
        pendingImageObjects[url] = img;

        // start with the first/own callback in the queue.
        pendingImageCallbacks[url] = [onload];
      } else {
        // push a new callback onto the queue, and bail.
        pendingImageCallbacks[url].push(onload);

        // the to-be-loaded image.
        return pendingImageObjects[url];
      }

      /**
       * Hackish special case: "virtual" flipped image URL pattern -
       * e.g., `some-sprite-flipped.png`. File does not actually exist.
       * Generate and return a flipped version of the original asset.
       */

      const flipPattern = '-flipped';

      function flip(nonFlippedImg) {
        return flipInCanvas(nonFlippedImg, (newImg) => {
          preloadedImageURLs[url] = true;
          // re-assign the final, flipped blob asset.
          img.src = newImg.src;
          onload?.(newImg);
        });
      }

      if (src.indexOf(flipPattern) !== -1) {
        // e.g., `sprite-flipped.png` -> `sprite.png`
        const nonFlippedSrc = src.replace(flipPattern, '');

        // eligible for spritesheet?
        const shortSrc = nonFlippedSrc.substring(
          nonFlippedSrc.indexOf(IMAGE_ROOT) + IMAGE_ROOT.length
        );

        if (imageSpriteConfig?.[shortSrc] && !aaLoader.missingDist) {
          // extract from sprite, and flip.
          utils.image.getImageFromSpriteSheet(shortSrc, (nonFlippedImg) =>
            flip(nonFlippedImg)
          );
        } else {
          // flipping a non-spritesheet asset
          // fetch the original asset, then flip and cache
          utils.image.load(nonFlippedSrc, (nonFlippedImg) =>
            imageResourceReady(nonFlippedImg, nonFlippedSrc, (scaledImg) =>
              flip(scaledImg)
            )
          );
        }
      } else {
        // non-flipped asset

        // eligible for spritesheet?
        const shortSrc = src.substring(
          src.indexOf(IMAGE_ROOT) + IMAGE_ROOT.length
        );

        if (imageSpriteConfig?.[shortSrc] && !aaLoader.missingDist) {
          // spritesheet asset case
          utils.image.getImageFromSpriteSheet(shortSrc, (newImg) => {
            preProcess(src, newImg, (processedImg) => {
              preloadedImageURLs[url] = src;
              // update local cache with the new blob-based extracted source.
              img.src = processedImg.src;
              doCallback();
            });
          });
        } else {
          // load image directly from disk
          img.onload = () => {
            imageResourceReady(img, src, (scaledImg) => {
              preProcess(src, scaledImg, (processedImg) => {
                preloadedImageURLs[url] = src;
                // update local cache with the new blob-based extracted source.
                img.src = processedImg.src;
                doCallback();
              });
            });
          };
          img.onerror = () => {
            // TODO: allow retry of image load in a moment?
            console.warn('Image failed to load', img.src);
            preloadedImageURLs[url] = blankImage.src;
            doCallback();
            // reassign empty image
            img.src = blankImage.src;
          };
          img.src = src;
        }
      }

      // return new object immediately
      return img;
    },

    load: (url, callback) => {
      if (preloadedImageURLs[url] && callback instanceof Function)
        return callback(imageObjects[url]);

      let img = new Image();

      img.onload = () => {
        preloadedImageURLs[url] = true;
        imageObjects[url] = img;
        img.onload = null;
        if (callback instanceof Function) callback(img);
      };

      // note: prefixed path.
      img.src = url.match(/data:|dist\/|image\//i)
        ? url
        : `${IMAGE_ROOT}/${url}`;
    },

    preload: (urls, callback) => {
      let loaded = 0;

      function didLoad() {
        loaded++;
        if (loaded >= urls.length && callback instanceof Function) callback?.();
      }

      urls.forEach((url) => {
        utils.image.load(url, didLoad);
      });
    }
  },

  storage: (() => {
    let data = {},
      localStorage,
      unavailable;

    // try ... catch because even referencing localStorage can cause a security exception.
    // this handles cases like incognito windows, privacy stuff, and "cookies disabled" in Firefox.

    try {
      localStorage = window.localStorage || null;
    } catch (e) {
      console.info(
        'localStorage not available, likely "cookies blocked." Game options will not be saved.'
      );
      localStorage = null;
    }

    function get(name) {
      // return current state, if unable to save.
      if (!localStorage) return data[name];

      try {
        data[name] = localStorage.getItem(name);
      } catch (ignore) {
        // oh well
      }

      return data[name];
    }

    function set(name, value) {
      data[name] = value;

      if (!localStorage) return undefined;

      try {
        localStorage.setItem(name, value);
      } catch (err) {
        // oh well
        return false;
      }

      return true;
    }

    function remove(name) {
      data[name] = null;

      if (localStorage) {
        try {
          localStorage.removeItem(name);
        } catch (ignore) {
          // oh well
        }
      }
    }

    // sanity check: try to read a value.
    try {
      let version = get(LS_VERSION_KEY) || '(none)';

      if (version != LS_VERSION) {
        console.log(
          `localStorage version ${version} != ${LS_VERSION}; clearing LS and resetting.`
        );
        localStorage.clear();
        set(LS_VERSION_KEY, LS_VERSION);
      }
    } catch (e) {
      console.log('localStorage read test failed. Disabling.');
      localStorage = null;
      unavailable = true;
    }

    return {
      get,
      remove,
      set,
      unavailable
    };
  })(),

  log: ({
    info = {},
    delay = 1000 + parseInt(Math.random() * 5000, 10),
    rawValues = false
  }) => {
    /**
     * Game events and stats: basic usage, is the game working well etc.
     * Also, TBD: Optional Webhooks for posting games to Slack and Discord.
     */

    // drop false-y values from { key: value }
    if (!rawValues) {
      info = filter(info);
    }

    let params = new URLSearchParams(info).toString();
    let options = { method: 'GET' };

    function doLog() {
      fetch(`/events/?${params}`, options);
    }

    if (delay) {
      window.setTimeout(doLog, delay);
    } else {
      doLog();
    }
  },

  preRenderSprites: (options = { all: false, callback: null }) => {
    // Pre-render and cache certain animation sequences, reduce flicker on game start.
    if (!imageSpriteConfig) return;

    // avoid redundant work.
    if (preRendered.all) return;
    if (preRendered.subset) return;

    // TODO: preload snow versions of sprites, as applicable.
    const urls = Object.keys(imageSpriteConfig);

    if (!urls?.length) return;

    if (options.all) {
      preRendered.all = true;
    } else {
      preRendered.subset = true;
    }

    // for initial pre-render, get "friendly" base which is on-screen 99% of games at start time.
    const subset = /base_|helicopter|tank-enemy|landing|explosion/i;

    // when fetching "all", grab everything *except* the subset which should have been done first.
    const preloadURLs = options.all
      ? urls.filter((url) => !url.match(subset))
      : urls.filter((url) => url.match(subset));

    if (!preloadURLs?.length) return;

    // hackish: put landing pad first, most likely to flicker on game start.
    if (!options.all) {
      preloadURLs.sort((a, b) => {
        return a.indexOf('landing') !== -1 ? -1 : 0;
      });
    }

    let i = 0;

    function preloadNext() {
      const url = preloadURLs[i].substring(1);
      utils.image.getImageObject(url, loaded);
      i++;
    }

    function loaded() {
      // note: getImageObject() has requestAnimationFrame() in callbacks.
      if (i < preloadURLs.length) {
        preloadNext();
      } else if (options.callback instanceof Function) {
        options.callback();
      }
    }

    // start pre-fetch
    preloadNext();
  }
};

function imageResourceReady(ssImg, imgRef, callback) {
  // NOTE: `imageSpriteConfig` is an external reference, generated
  // and included only in the production bundle by the build process.

  if (aaLoader.missingDist) {
    // hack for dev / local: fix path -> spritesheet lookup
    imgRef = imgRef.replace(aaLoader.getImageRoot(), '');
  }

  const ssConfig = imageSpriteConfig[imgRef];

  if (!ssConfig) return;

  // extract and cache.
  let extractedImg = new Image();

  if (!bufferCanvas) {
    bufferCanvas = document.createElement('canvas');
    bufferCanvasCtx = bufferCanvas.getContext('2d', {
      useDevicePixelRatio: false,
      alpha: true
    });
  }

  let x = ssConfig[0];
  let y = ssConfig[1];
  let w = ssConfig[2];
  let h = ssConfig[3];

  // in dev when loading original sprite assets from disk, x/y are always 0,0.
  if (aaLoader.missingDist) {
    x = y = 0;
  }

  const imageName = imgRef.substring(imgRef.lastIndexOf('/') + 1);
  const scale = upscaleByName[imageName] || 1;

  const targetWidth = w * scale;
  const targetHeight = h * scale;

  bufferCanvas.width = targetWidth;
  bufferCanvas.height = targetHeight;

  // note: no smoothing, this is a 1:1-scale copy.
  bufferCanvasCtx.imageSmoothingEnabled = false;

  bufferCanvasCtx.drawImage(ssImg, x, y, w, h, 0, 0, targetWidth, targetHeight);

  // TODO: implement properly. :P
  if (useAtkinson) {
    atkinson(
      imageName,
      bufferCanvas,
      bufferCanvasCtx,
      targetWidth,
      targetHeight
    );
  }

  // more modern vs. toDataURL() - and faster?
  bufferCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);

    extractedImg.onload = () => {
      extractedImg.onload = null;
      callback?.(extractedImg);
      // blob no longer needed, revoke momentarily
      window.requestAnimationFrame(() => URL.revokeObjectURL(url));
    };

    extractedImg.src = url;
  });

  // mark in cache
  imageObjects[imgRef] = extractedImg;
}

function filter(obj) {
  // for { key: value }, drop false-y values
  return Object.keys(obj).reduce((acc, key) => {
    if (obj[key]) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
}

let preRendered = {
  subset: false,
  all: false
};

// caches
const preloadedImageURLs = {};
const imageObjects = {};
const pendingImageCallbacks = {};
const pendingImageObjects = {};

export { utils };
