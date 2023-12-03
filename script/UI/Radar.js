import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { gamePrefs } from './preferences.js';
import {
  demo,
  isiPhone,
  isMobile,
  oneOf,
  searchParams,
  TYPES,
  winloc,
  worldWidth
} from '../core/global.js';
import {
  playSound,
  skipSound,
  stopSound,
  sounds,
  playSoundWithDelay
} from '../core/sound.js';
import { soundsToPlayBNB } from '../core/sound-bnb.js';
import { RadarItem } from './RadarItem.js';
import { sprites } from '../core/sprites.js';
import { TURRET_SCAN_RADIUS } from '../buildings/Turret.js';
import { MISSILE_LAUNCHER_SCAN_RADIUS } from '../units/MissileLauncher.js';

const DEFAULT_UPSCALING = 3;

// how much to widen icons by, separate from upscaling
const DEFAULT_CSS_SCALING = 1;

// how much to widen icons in landscape, relative to upscaling
const CSS_SCALING_LANDSCAPE_TABLET = 0.5;
const CSS_SCALING_LANDSCAPE_PHONE = 2 / 3;

const scanNodeTypes = {
  [TYPES.turret]: TURRET_SCAN_RADIUS,
  [TYPES.missileLauncher]: MISSILE_LAUNCHER_SCAN_RADIUS
};

const Radar = () => {
  let data;
  let css;
  let dom;
  let exports;
  let layoutCache;
  let objects;

  const spliceArgs = [null, 1];
  const leftBoundary = -0.0055;
  const rightBoundary = 1 - 0.005;

  const noJamming = winloc.match(/noJam/i);

  const staticTypes = {
    [TYPES.turret]: true,
    [TYPES.base]: true,
    [TYPES.bunker]: true,
    [TYPES.endBunker]: true,
    [TYPES.superBunker]: true
  };

  const leftOffsetsByType = {
    [TYPES.landingPad]: 26
  };

  function setStale(isStale) {
    data.isStale = isStale;
  }

  function setIncomingMissile(incoming, newestMissile) {
    if (data.incomingMissile === incoming) return;

    utils.css.addOrRemove(
      game.objects.view.dom.worldWrapper,
      incoming,
      css.incomingSmartMissile
    );

    data.incomingMissile = incoming;

    if (incoming) {
      /*
      // don't warn player in extreme mode, when radar is jammed.
      if (data.isJammed && gameType === 'extreme') {
        return;
      }
      */

      playSound(sounds.missileWarning);

      if (data.missileWarningCount < 3) {
        game.objects.notifications.add('🚀 Incoming smart missile! 😬');
        data.missileWarningCount++;
      }

      common.setFrameTimeout(() => {
        if (!data.incomingMissile) return;
        playSound(
          sounds.bnb[
            newestMissile.data.isRubberChicken
              ? 'incomingSmartMissilePlusCock'
              : 'incomingSmartMissile'
          ]
        );
      }, 1000);
    } else if (sounds.missileWarning?.sound) {
      stopSound(sounds.missileWarning);
    }
  }

  function getLayout(itemObject) {
    let type = itemObject.data.parentType;

    // cache hit, based on "type"
    if (layoutCache[type]) return layoutCache[type];

    // data to merge with itemObject
    let result = {
      layout: {
        width: 0,
        height: 0
      },
      bottomAlignedY: 0
    };

    // if we hit this, something is wrong.
    if (!itemObject?.dom?.o) {
      console.warn(
        'getLayout: something is wrong, returning empty result.',
        itemObject
      );
      return result;
    }

    // TODO: review.
    // if radar is jammed, items will be display: none and layout can't be read. bail.
    if (data.isJammed) return itemObject;

    // read from DOM ($$$) and cache
    // note: offsetWidth + offsetHeight return integers, and without padding.
    let rect = itemObject.dom.o.getBoundingClientRect();

    // NOTE screenScale, important for positioning
    result.layout.width = rect.width * (1 / data.cssRadarScale);
    result.layout.height = rect.height;

    if (itemObject.oParent.data.bottomAligned) {
      // if set, use bottom: 0 and call it a day.
      result.bottomAligned = true;
    }

    // cache
    layoutCache[type] = result;

    return result;
  }

  function addItem(item, className, canRespawn) {
    let itemObject;

    // for GPU acceleration: note if this is an "animated" type.
    if (data.animatedTypes.includes(item.data.type)) {
      className += ` ${css.radarItemAnimated}`;
    }

    if (item.data.bottomAligned) {
      className += ' bottom-aligned';
    }

    itemObject = RadarItem({
      o: sprites.withStyle(document.createElement('div')),
      parentType: item.data.type,
      className,
      oParent: item,
      canRespawn: canRespawn || false,
      isStatic: false,
      // width + height, determined after append
      layout: null,
      // assigned if bottom-aligned (static)
      bottomAligned: !!item.data.bottomAligned
    });

    // special case
    if (item.isObscured) {
      utils.css.add(itemObject.dom.o, css.obscured);
    }

    // special case: hide immediately if game pref says "nein"
    if (
      item.data.type === TYPES.landingPad &&
      !gamePrefs.landing_pads_on_radar
    ) {
      const show = false;
      itemObject?.onHiddenChange(show);
    } else if (item.data.type === TYPES.cloud && !gamePrefs.clouds_on_radar) {
      const show = false;
      itemObject?.onHiddenChange(show);
    }

    game.objects.queue.addNextFrame(() => {
      dom.radar.appendChild(itemObject.dom.o);

      // attempt to read from layout cache, or live DOM if needed for item height / positioning
      itemObject = common.mixin(itemObject, getLayout(itemObject));

      objects.items.push(itemObject);
    });

    // Slightly hackish: tack radarItem on to exports.
    // setTargetTracking() looks at this reference.
    item.radarItem = itemObject;

    game.objects.stats.create(item);

    return itemObject;
  }

  function enemyVansOnScreen() {
    return game.objects[TYPES.van].filter(
      (van) => van.data.isEnemy && van.data.isOnScreen
    ).length;
  }

  function startJamming() {
    // [ obligatory Bob Marley reference goes here ]

    if (game.objects.editor) return;

    if (noJamming) return;

    data.isJammed = true;

    updateOverlay();

    // $$$ - watch performance.
    utils.css.add(document.body, css.radarJammed);

    if (!gamePrefs.sound) return;

    if (sounds.radarStatic) {
      playSound(sounds.radarStatic);
    }

    if (sounds.radarJamming) {
      playSound(sounds.radarJamming);
    }

    // we may be dead; ignore if so.
    if (game.players.local.data.dead) return;

    const dieCount = parseInt(game.data.dieCount, 10);

    function onPlayCheck(sound) {
      // make sure this happens only if still jammed, AND, there aren't several sounds queued up.
      if (
        !data.isJammed ||
        game.data.dieCount > dieCount ||
        soundsToPlayBNB.length > 2 ||
        !enemyVansOnScreen()
      ) {
        skipSound(sound);
      }
    }

    function onFinishCheck() {
      // note: scoped to SMSound instance
      if (this.skipped || game.data.isBeavis || Math.random() <= 0.5) return;
      playSoundWithDelay(
        oneOf([sounds.bnb.tryAndPayAttention, sounds.bnb.beavisOhYeah]),
        null,
        { onplay: onPlayCheck }
      );
    }

    // half the time, commentary.
    if (Math.random() >= 0.5) {
      playSoundWithDelay(
        sounds.bnb[
          game.data.isBeavis ? 'radarJammedBeavis' : 'radarJammedButthead'
        ],
        null,
        { onplay: onPlayCheck, onfinish: onFinishCheck },
        2000
      );
    }

    if (data.jamCount < 3) {
      game.objects.notifications.addNoRepeat(
        '🚚 An enemy van is jamming your radar 📡 🚫'
      );
    }

    // extreme mode: don't warn player about incoming missiles when radar is jammed, either.
    // i.e., you lose visibility.
    // if (gameType === 'extreme') setIncomingMissile(false);
  }

  function updateOverlay() {
    const id = 'radar-jammed-overlay';
    let o = document.getElementById(id);

    if (!data.isJammed) {
      if (o) {
        // $$$
        utils.css.remove(o, 'active');
        // reduce layer cost?
        if (!gamePrefs.radar_enhanced_fx) {
          common.setFrameTimeout(() => {
            o.remove();
            o = null;
          }, 1024);
        }
      }
      return;
    }

    if (!o) {
      o = document.createElement('div');
      o.id = id;
      o.innerHTML = '<div class="noise"></div>';
      document.body.appendChild(o);
    }

    common.setFrameTimeout(() => {
      if (!o) return;
      let noiseCSS = ['active'];
      // useful for when screencasting / recording / streaming - this effect can kill framerate.
      if (window.location.href.match(/staticRadar/i)) noiseCSS.push('static');
      utils.css.add(o, ...noiseCSS);
      o = null;
    }, 128);
  }

  function stopJamming() {
    data.isJammed = false;

    updateOverlay(data.isJammed);

    // $$$
    utils.css.remove(document.body, css.radarJammed);

    if (sounds.radarJamming) {
      stopSound(sounds.radarJamming);
    }

    if (data.jamCount < 3) {
      game.objects.notifications.addNoRepeat('Radar has been restored 📡');
      data.jamCount++;
    }
  }

  function clearTarget() {
    data.radarTarget = null;
    dom.targetMarker.style.opacity = 0;
  }

  function updateTargetMarker(targetItem, allowTransition) {
    // layout will be unavailable while jammed.
    if (data.isJammed) return;

    // sanity check: ensure this object still exists.
    if (!targetItem?.oParent?.dom?.o) return;

    let width = targetItem.layout.width;

    let marginLeft;

    // $$$ + hackish: fetch and cache marginLeft, if need be.
    if (targetItem.layout.marginLeft === undefined) {
      // measure the item on the radar, then scale its margin back to match the marker (which is not scaled.)
      marginLeft = parseFloat(
        window
          .getComputedStyle(targetItem.dom.o)
          .getPropertyValue('margin-left')
      );
      targetItem.layout.marginLeft = marginLeft;
    } else {
      marginLeft = targetItem.layout.marginLeft;
    }

    if (allowTransition) {
      utils.css.add(dom.targetMarker, 'transition-active');
    }

    dom.targetMarker.style.width = `${width * data.cssRadarScale}px`;
    dom.targetMarker.style.marginLeft = `${parseFloat(marginLeft)}px`;

    alignTargetMarkerWithScroll();
  }

  function alignTargetMarkerWithScroll() {
    if (!data.radarTarget) return;

    if (data.scale === 1) {
      // no-scaling case
      dom.targetMarker.style.transform = `translate3d(${data.radarTarget.data.left}px, 0px, 0px)`;
      return;
    }

    // player may be scrolling at or past the beginning of the world.
    if (data.radarScrollLeft <= 0) return;

    dom.targetMarker.style.transform = `translate3d(${
      data.radarTarget.data.left * data.scale + -data.radarScrollLeft
    }px, 0px, 0px)`;
  }

  function markTarget(targetItem) {
    // hackish: disable if pref is off.
    if (!gamePrefs.modern_smart_missiles) {
      targetItem = null;
    }

    if (!data.radarTarget && targetItem) {
      dom.targetMarker.style.opacity = 1;
      const allowTransition = true;
      updateTargetMarker(targetItem, allowTransition);
    } else if (data.radarTarget && !targetItem) {
      dom.targetMarker.style.opacity = 0;
    }

    data.radarTarget = targetItem;

    // immediately align
    alignTargetMarkerWithScroll();
  }

  function _removeRadarItem(offset) {
    sprites.removeNodes(objects.items[offset].dom);
    // faster splice - doesn't create new array object (IIRC.)
    spliceArgs[0] = offset;
    Array.prototype.splice.apply(objects.items, spliceArgs);
  }

  function removeRadarItem(item) {
    // find and remove from DOM + array
    const offset = objects?.items?.indexOf(item);

    if (offset !== undefined) {
      if (offset === -1) return;
      _removeRadarItem(offset);
      return;
    }
  }

  function reset() {
    // remove all
    const dieOptions = { silent: true };

    objects?.items?.forEach((item) => {
      item.die(dieOptions);
    });
  }

  function resize() {
    setOrientationScale();

    // radar height has changed.
    data.height = dom.radar.offsetHeight;

    // trash the cache, and rebuild.
    layoutCache = {};

    let i, j;

    // iterate through radar items and update, accordingly.
    for (i = 0, j = objects.items.length; i < j; i++) {
      objects.items[i] = common.mixin(
        objects.items[i],
        getLayout(objects.items[i])
      );
    }
  }

  function animate() {
    let i, j, left, top, hasEnemyMissile, newestMissile, isInterval;

    scrollWithView();

    hasEnemyMissile = false;

    // update some items every frame, most items can be throttled.
    isInterval = data.frameCount++ >= data.animateInterval;

    if (isInterval) {
      data.frameCount = 0;
    }

    /**
     * Even if jammed, missile count needs checking.
     * Otherwise, "incoming missile" UI / state could get stuck
     * when a missile is destroyed while the radar is jammed.
     */
    if (game.objects[TYPES.smartMissile].length !== data.lastMissileCount) {
      // change state?

      for (i = 0, j = game.objects[TYPES.smartMissile].length; i < j; i++) {
        // is this missile not dead, not expired/hostile, and an enemy?

        if (
          !game.objects[TYPES.smartMissile][i].data.dead &&
          !game.objects[TYPES.smartMissile][i].data.hostile &&
          game.objects[TYPES.smartMissile][i].data.isEnemy !==
            game.players.local.data.isEnemy
        ) {
          hasEnemyMissile = true;

          newestMissile = game.objects[TYPES.smartMissile][i];

          break;
        }
      }

      data.lastMissileCount = game.objects[TYPES.smartMissile].length;

      setIncomingMissile(hasEnemyMissile, newestMissile);
    }

    // bail early, no radar UI in demo mode.
    if (demo) return;

    // don't animate when radar is jammed.
    // avoid lots of redundant style recalculations.
    if (data.isJammed && !data.isStale) return;

    // move all radar items

    const adjustedScreenWidth = game.objects.view.data.browser.screenWidth - 5;

    for (i = 0, j = objects.items.length; i < j; i++) {
      // just in case: ensure the object still has a DOM node.
      if (!objects.items[i]?.dom?.o) continue;

      // is this a "static" item which is positioned only once and never moves?
      // additionally: "this is a throttled update", OR, this is a type that gets updated every frame.
      // exception: bases and bunkers may be "dirty" due to resize, `isStale` will be set. force a refresh in that case.

      if (
        data.isStale ||
        (!objects.items[i].isStatic &&
          (isInterval ||
            data.animateEveryFrameTypes.includes(
              objects.items[i].oParent.data.type
            )))
      ) {
        if (
          !game.objects.editor &&
          !objects.items[i].isStatic &&
          staticTypes[objects.items[i].oParent.data.type]
        ) {
          objects.items[i].isStatic = true;
        }

        // constrain helicopters only, so they don't fly out-of-bounds
        if (objects.items[i].oParent.data.type === TYPES.helicopter) {
          left =
            Math.max(
              leftBoundary,
              Math.min(
                rightBoundary,
                objects.items[i].oParent.data.x / worldWidth
              )
            ) *
            (adjustedScreenWidth + 4);
        } else {
          // X coordinate: full world layout -> radar scale, with a slight offset (so bunker at 0 isn't absolute left-aligned)
          left =
            ((objects.items[i].oParent.data.x +
              (objects.items[i].oParent.data.radarLeftOffset || 0) +
              (leftOffsetsByType[objects.items[i].oParent.data.type] || 0)) /
              worldWidth) *
            (adjustedScreenWidth + 4);
        }

        // get layout, if needed (i.e., new object created while radar is jammed, i.e., engineer, and its layout hasn't been read + cached from the DOM)
        if (!objects.items[i].layout) {
          objects.items[i] = common.mixin(
            objects.items[i],
            getLayout(objects.items[i])
          );
        }

        // bottom-aligned, OR, somewhere between top and bottom of radar display, accounting for own height
        top = objects.items[i].bottomAligned
          ? 0
          : (objects.items[i].oParent.data.y /
              game.objects.view.data.battleField.height) *
              data.height -
            (objects.items[i]?.layout?.height || 0);

        objects.items[i].data.left = left * data.scale;
        objects.items[i].data.top = top;

        sprites.setTransformXY(
          objects.items[i],
          objects.items[i].dom.o,
          // apply radar scale here
          `${objects.items[i].data.left}px`,
          `${objects.items[i].data.top}px`
        );

        objects.items[i].data.left = left;

        if (objects.items[i] === data.radarTarget) {
          updateTargetMarker(objects.items[i]);
        }

        // resize, if method is present: currently, scan nodes and clouds.
        if (data.isStale && objects.items[i].oParent?.resize) {
          objects.items[i].oParent.resize();
        }

        // hack: resize scan nodes manually for level previews
        if (!game.data.started) {
          if (scanNodeTypes[objects.items[i].oParent.data.type]) {
            objects.items[i].updateScanNode(
              scanNodeTypes[objects.items[i].oParent.data.type]
            );
          }
        }
      }
    }

    if (data.isStale) {
      // force-refresh
      updateTargetMarker(data.radarTarget);

      // only do this once.
      data.isStale = false;
    }
  }

  function scrollWithView() {
    if (data.scale === 1) return;

    // TODO: don't update if battlefield scroll offset hasn't changed.
    const maxScrollLeft = worldWidth - game.objects.view.data.browser.halfWidth;

    const overflowWidth =
      game.objects.view.data.browser.screenWidth * (data.scale - 1);

    data.radarScrollLeft =
      overflowWidth *
      (game.objects.view.data.battleField.scrollLeft / maxScrollLeft);

    dom.radar.style.transform = `translate3d(-${data.radarScrollLeft}px, 0px, 0)`;

    alignTargetMarkerWithScroll();
  }

  function enableOrDisableScaling(enable) {
    setScale(enable ? DEFAULT_UPSCALING : 1);
  }

  function toggleScaling() {
    if (!gamePrefs.radar_scaling) return;
    setScale(
      gamePrefs.radar_scaling && data.scale === 1 ? DEFAULT_UPSCALING : 1
    );
  }

  function setOrientationScale() {
    // when enabled, apply larger scaling to landscape view.

    let mobileUpscale;

    if (game.objects.view.data.browser.isLandscape) {
      if (isiPhone) {
        // TODO: handle Android phones, too. :X
        mobileUpscale = CSS_SCALING_LANDSCAPE_PHONE;
      } else if (isMobile) {
        mobileUpscale = CSS_SCALING_LANDSCAPE_TABLET;
      }
    }

    data.cssRadarScale =
      gamePrefs.radar_scaling && mobileUpscale
        ? data.scale * mobileUpscale
        : DEFAULT_CSS_SCALING;

    dom.root?.style?.setProperty('--radar-scale', data.cssRadarScale);
  }

  function setScale(scale = 1, notify = true) {
    data.scale = scale;
    // dom.root?.style?.setProperty('--radar-scale', data.cssRadarScale);

    // radar node needs updating too, unfortunately, to scale.
    dom.radar.style.width = `${scale * 100}%`;

    setOrientationScale();

    if (scale === 1) {
      // reset if a scale was previously applied
      dom.radar.style.transform = 'translate3d(0px, 0px, 0)';
    }

    // update the layout on the active target, too.
    if (data.radarTarget) {
      data.radarTarget = common.mixin(
        data.radarTarget,
        getLayout(data.radarTarget)
      );
    }

    // mark as stale?
    data.isStale = true;

    // and, resize?
    animate();

    if (notify) {
      game.objects.notifications.add('Radar %s 🔎', {
        type: 'radarScaling',
        onRender(input) {
          return input.replace(
            '%s',
            `${scale === 1 ? '@1x' : '@' + DEFAULT_UPSCALING + 'x'}`
          );
        }
      });
    }
  }

  function maybeApplyScaling() {
    if (!gamePrefs.radar_scaling) return;

    // scaling shenanigans: if enabled, pick the appropriate default.
    data.scale = DEFAULT_UPSCALING;

    if (data.scale !== 1) {
      const notify = false;
      setScale(data.scale, notify);
    }
  }

  function initRadar() {
    dom.radar = document.getElementById('radar');
    dom.radarContainer = document.getElementById('radar-container');
    data.height = dom.radar.offsetHeight;

    dom.root = document.querySelector(':root');
    dom.targetMarker = document.createElement('div');
    dom.targetMarker.style.opacity = 0;
    dom.targetMarker.className = `target-marker target-ui`;
    dom.targetMarker.addEventListener('transitionend', () => {
      utils.css.remove(dom.targetMarker, 'transition-active');
    });
    dom.radarContainer.appendChild(dom.targetMarker);
  }

  // width / height of rendered elements, based on class name
  layoutCache = {};

  css = {
    obscured: 'obscured',
    incomingSmartMissile: 'incoming-smart-missile',
    radarJammed: 'radar_jammed',
    radarItemAnimated: 'radar-item--animated'
  };

  objects = {
    items: []
  };

  data = {
    frameCount: 0,
    radarScrollLeft: 0,
    radarTarget: null,
    radarTargetWidth: 0,
    animatedTypes: [
      TYPES.bomb,
      TYPES.balloon,
      TYPES.helicopter,
      TYPES.tank,
      TYPES.gunfire,
      TYPES.infantry,
      TYPES.parachuteInfantry,
      TYPES.engineer,
      TYPES.missileLauncher,
      TYPES.shrapnel,
      TYPES.van
    ],
    // try animating every frame, for now; it's all on the GPU, anyway.
    animateInterval: 1,
    animateEveryFrameTypes: [
      TYPES.helicopter,
      TYPES.shrapnel,
      TYPES.bomb,
      TYPES.gunfire,
      TYPES.smartMissile
    ],
    height: 0,
    isJammed: false,
    isStale: false,
    jamCount: 0,
    missileWarningCount: 0,
    lastMissileCount: 0,
    incomingMissile: false,
    scale: searchParams.get('radarScale') || 1,
    cssRadarScale: 1
  };

  dom = {
    radar: null,
    radarContainer: null,
    radarItem: null,
    root: null,
    targetMarker: null
  };

  initRadar();

  exports = {
    addItem,
    animate,
    clearTarget,
    data,
    dom,
    enableOrDisableScaling,
    markTarget,
    maybeApplyScaling,
    objects,
    removeItem: removeRadarItem,
    reset: reset,
    resize: resize,
    setScale,
    setStale,
    startJamming,
    stopJamming,
    toggleScaling
  };

  return exports;
};

export { scanNodeTypes, Radar };
