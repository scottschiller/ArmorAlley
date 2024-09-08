import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { gamePrefs } from './preferences.js';
import {
  FPS,
  GAME_SPEED,
  isiPhone,
  isMobile,
  oneOf,
  plusMinus,
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
import { pos } from './DomCanvas.js';
import { levelFlags } from '../levels/default.js';

const DEFAULT_UPSCALING_PORTRAIT = 3;
// if on a desktop, scale somewhere in-between.
const DEFAULT_UPSCALING_LANDSCAPE = isiPhone ? 2 : isMobile ? 3 : 2.25;

// how much to widen icons by, separate from upscaling
const DEFAULT_CSS_SCALING = 1;

// how much to widen icons in landscape, relative to upscaling
const CSS_SCALING_LANDSCAPE_TABLET = 0.5;
const CSS_SCALING_PORTRAIT_TABLET = 0.5;

const CSS_SCALING_LANDSCAPE_PHONE = 1.25;
const CSS_SCALING_PORTRAIT_PHONE = 0.35;

// old-skool JS animation bits, stolen from View. TODO: DRY this up.

const easing = {
  // hat tip: https://gizma.com/easing
  quart: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
  quad: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
};

let transitionScaleActive;
let transitionScaleFrame;
let transitionScaleFrames = [];
let transitionScaleDuration;
const tsDuration = 1;

const scanNodeTypes = {
  [TYPES.turret]: TURRET_SCAN_RADIUS,
  [TYPES.missileLauncher]: MISSILE_LAUNCHER_SCAN_RADIUS
};

const ignoreLayoutTypes = {
  [TYPES.balloon]: true,
  [TYPES.helicopter]: true
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
        const mType = newestMissile.data.isRubberChicken
          ? 'rubber chicken! 🐔'
          : newestMissile.data.isBanana
            ? 'banana! 🍌'
            : 'smart missile! ';
        game.objects.notifications.add(`🚀 Incoming ${mType}😬`);
        data.missileWarningCount++;
      }

      if (gamePrefs.bnb) {
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
      }
    } else if (sounds.missileWarning?.sound) {
      stopSound(sounds.missileWarning);
    }
  }

  function getLayout(itemObject) {
    // 01/2024: at present, just for missile launchers and turrets' scan nodes.
    let type = itemObject.data.parentType;

    // cache hit, based on "type"
    if (layoutCache[type]) return layoutCache[type];

    // data to merge with itemObject
    let result = {
      layout: {
        width: 0,
        height: 0
      },
      // TODO: review
      bottomAlignedY: 0
    };

    // domCanvas case: layout is N/A
    if (itemObject.data.domCanvas && !itemObject.dom.o?.nodeName) return result;

    // if we hit this, something is wrong.
    if (!itemObject?.dom?.o) {
      console.warn(
        'getLayout: something is wrong, returning empty result.',
        itemObject
      );
      return result;
    }

    // read from DOM ($$$) and cache
    // note: offsetWidth + offsetHeight return integers, and without padding.
    let rect = itemObject.dom.o?.getBoundingClientRect?.();

    if (!rect) {
      console.warn('getLayout: no getBoundingClientRect?', itemObject);
      return rect;
    }

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
    /*
    // TODO: optional? don't create "expensive" / redundant objects during game end sequence
    if (game.data.battleOver && item.data.type.match(/gunfire|shrapnel/i)) return;
    */

    let itemObject;

    if (item.data.bottomAligned) {
      className += ' bottom-aligned';
    }

    itemObject = RadarItem({
      // special case: null-ish for domCanvas, provided there no scan node.
      o:
        item.data.domCanvas && !scanNodeTypes[item.data.type]
          ? {}
          : sprites.withStyle(document.createElement('div')),
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
      if (itemObject.dom?.o?.nodeName) {
        dom.radar.appendChild(itemObject.dom.o);

        // attempt to read from layout cache, or live DOM if needed for item height / positioning
        itemObject = common.mixin(itemObject, getLayout(itemObject));
      }

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

    // ignore vans if jammed permanently per level flags
    if (data.isJammed && levelFlags.jamming) return;

    data.isJammed = true;

    updateOverlay();

    if (!gamePrefs.sound) return;

    if (sounds.radarStatic) {
      playSound(sounds.radarStatic);
    }

    if (sounds.radarJamming) {
      playSound(sounds.radarJamming);
    }

    // we may be dead; ignore if so.
    if (game.players.local?.data?.dead) return;

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
      if (
        !gamePrefs.bnb ||
        this.skipped ||
        game.data.isBeavis ||
        Math.random() <= 0.5
      )
        return;
      playSoundWithDelay(
        oneOf([sounds.bnb.tryAndPayAttention, sounds.bnb.beavisOhYeah]),
        null,
        { onplay: onPlayCheck }
      );
    }

    // half the time, commentary.
    if (gamePrefs.bnb && Math.random() >= 0.5) {
      playSoundWithDelay(
        sounds.bnb[
          game.data.isBeavis ? 'radarJammedBeavis' : 'radarJammedButthead'
        ],
        null,
        { onplay: onPlayCheck, onfinish: onFinishCheck },
        2000
      );
    }

    if (data.jamCount < 3 && !levelFlags.jamming) {
      game.objects.notifications.addNoRepeat(
        '🚚 An enemy van is jamming your radar 📡 🚫'
      );
    }

    // extreme mode: don't warn player about incoming missiles when radar is jammed, either.
    // i.e., you lose visibility.
    // if (gameType === 'extreme') setIncomingMissile(false);
  }

  function updateOverlay() {
    // for scan nodes
    utils.css.addOrRemove(dom.radar, data.isJammed, css.jammed);
    utils.css.addOrRemove(dom.overlay, data.isJammed, css.jammed);
    // targeting
    utils.css.addOrRemove(dom.targetMarker, data.isJammed, css.jammed);
  }

  function stopJamming() {
    // bail if permanently jammed
    if (levelFlags.jamming) return;

    data.isJammed = false;

    updateOverlay();

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
    data.lastRadarTargetWidth = null;
  }

  function updateTargetMarker(targetItem, allowTransition) {
    // ignore while jammed, since this "relies" on working radar.
    if (data.isJammed) return;

    // sanity check: ensure this object still exists.
    if (!targetItem?.oParent?.dom?.o) return;

    // layout may have been nuked; recalculate, if so.
    // TODO: fix missile launcher + turret layout stuff
    if (
      !targetItem.layout?.width ||
      targetItem.oParent.data.type === TYPES.missileLauncher
    ) {
      // HACK
      if (targetItem.oParent.data.domCanvas) {
        targetItem.layout = {
          width: pos.width(targetItem.oParent.data.domCanvas.radarItem.width),
          height: pos.heightNoStroke(
            targetItem.oParent.data.domCanvas.radarItem.height
          )
        };
      }
    }

    let width = targetItem.layout.width;

    // new target, hasn't been assigned yet
    if (allowTransition && data.radarTarget !== targetItem) {
      utils.css.add(dom.targetMarker, 'transition-active');
    }

    // only apply changes
    if (data.lastRadarTargetWidth !== width) {
      dom.targetMarker.style.width = `${width}px`;
      data.lastRadarTargetWidth = width;
    }

    alignTargetMarkerWithScroll();
  }

  function alignTargetMarkerWithScroll() {
    // there may be nothing to do.
    if (!data.radarTarget) return;

    // hack: guard against invalid layout, for now.
    if (!data.radarTarget?.layout) {
      data.radarTarget = common.mixin(
        data.radarTarget,
        getLayout(data.radarTarget)
      );
    }

    if (data.scale === 1) {
      // no-scaling case
      dom.targetMarker.style.transform = `translate3d(${data.radarTarget.data.left}px, 0px, 0px)`;
    } else {
      // otherwise, scale and include the scroll offset
      dom.targetMarker.style.transform = `translate3d(${
        data.radarTarget.data.left * data.scale - data.radarScrollLeft
      }px, 0px, 0px)`;
    }
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

    if (data.radarTarget) {
      // fetch layout immediately, if needed.
      if (!data.radarTarget.layout) {
        data.radarTarget = common.mixin(
          data.radarTarget,
          getLayout(data.radarTarget)
        );
      }
    }

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

    objects.items = [];

    // hack: remove all DOM nodes.
    document
      .querySelectorAll('#radar .radar-item')
      .forEach((node) => node.remove());

    data.renderCount = 0;
  }

  function onOrientationChange() {
    setOrientationScale();
    resize();
  }

  function resize() {
    // radar height has changed.
    data.height = dom.radar.offsetHeight;

    // for battle previews, before game start.
    data.renderCount = 0;

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

    // hackish: force target marker update.
    if (data.radarTarget) {
      data.radarTarget = common.mixin(
        data.radarTarget,
        getLayout(data.radarTarget)
      );
    }

    // scale radar items' width relative to available screen width, >= 500px.
    // >= 500px width, that is.
    let itemScale =
      window.innerWidth <= 500
        ? 1
        : 1 + (window.innerWidth - 500) / window.innerWidth;
    itemScale = Math.min(2, itemScale);

    // hackish: less upscaling on iPhone in landscape
    if (isiPhone && game.objects.view.data.browser.isLandscape) {
      itemScale *= 1.5;
    } else {
      itemScale *= 2;
    }

    data.itemScale = itemScale;

    data.renderCount = 0;

    game.objects.radarScroller?.resize();
  }

  function animate() {
    let i, j, left, top, hasEnemyMissile, newestMissile;

    // minimize re-rendering of static level preview.
    if (!game.data.started) {
      data.renderCount++;
      // off-by-one? :X Allow up to three renders.
      if (data.renderCount > 2) return;
    }

    let nextScale;

    // old-skool JS animation loop
    if (transitionScaleActive) {
      if (!transitionScaleFrame) {
        // first frame hack: and specify the scale-to-be - which will be picked up by scan nodes.
        // this is done because scan nodes have their own transitions.
        data.interimScale =
          transitionScaleFrames[transitionScaleFrames.length - 1].scale;
      }

      data.scale = transitionScaleFrames[transitionScaleFrame].scale;

      const nextScale =
        transitionScaleFrames[transitionScaleFrame].cssRadarScale;

      // $$$
      if (data.cssRadarScale !== nextScale) {
        data.cssRadarScale =
          transitionScaleFrames[transitionScaleFrame].cssRadarScale;
        dom.root?.style?.setProperty('--radar-scale', data.cssRadarScale);
      }

      transitionScaleFrame++;

      // ensure all items animate
      data.isStale = true;

      if (transitionScaleFrame >= transitionScaleFrames.length) {
        // finished: apply final width, and clean up.
        dom.radar.style.width = `${data.interimScale * 100}%`;

        // ensure final values are exactly as expected.
        data.scale = transitionScaleFrames.final.scale;

        // $$$ - one last time.
        if (data.cssRadarScale !== transitionScaleFrames.final.cssRadarScale) {
          data.cssRadarScale = transitionScaleFrames.final.cssRadarScale;
          dom.root?.style?.setProperty('--radar-scale', data.cssRadarScale);
        }

        transitionScaleActive = false;
        transitionScaleFrame = 0;
        data.interimScale = null;
        data.isStale = true;
      }

      // update the radar scroller, too.
      game.objects.radarScroller?.resize();
    }

    scrollWithView();

    hasEnemyMissile = false;

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

    // move all radar items

    for (i = 0, j = objects.items.length; i < j; i++) {
      // is this a "static" item which is positioned only once and never moves?
      // additionally: "this is a throttled update", OR, this is a type that gets updated every frame.
      // exception: bases and bunkers may be "dirty" due to resize, `isStale` will be set. force a refresh in that case.

      if (
        data.isStale ||
        !objects.items[i].isStatic ||
        objects.items[i].data.domCanvas ||
        data.animateEveryFrameTypes[objects.items[i].oParent.data.type]
      ) {
        if (
          !game.objects.editor &&
          !objects.items[i].isStatic &&
          staticTypes[objects.items[i].oParent.data.type]
        ) {
          objects.items[i].isStatic = true;
        }

        // animate method?
        objects.items[i]?.animate?.();

        // constrain helicopters only, so they don't fly out-of-bounds
        if (objects.items[i].oParent.data.type === TYPES.helicopter) {
          left =
            Math.max(
              leftBoundary,
              Math.min(
                rightBoundary,
                objects.items[i].oParent.data.x / worldWidth
              )
            ) * game.objects.view.data.browser.screenWidth;
        } else {
          // X coordinate: full world layout -> radar scale, with a slight offset (so bunker at 0 isn't absolute left-aligned)
          left =
            ((objects.items[i].oParent.data.x +
              (objects.items[i].oParent.data.radarLeftOffset || 0)) /
              worldWidth) *
            game.objects.view.data.browser.screenWidth;
        }

        // get layout, if needed (i.e., new object created while radar is jammed, i.e., engineer, and its layout hasn't been read + cached from the DOM)
        if (
          !objects.items[i].layout?.width &&
          !objects.items[i].data.domCanvas
        ) {
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

        if (ignoreLayoutTypes[objects.items[i].data.parentType]) {
          // HACK: once helicopter (or balloon) has been targeted, it will have a layout object.
          // this messes up the radar positioning, so subtract it here.
          top += objects.items[i]?.layout?.height || 0;
        }

        objects.items[i].data.left = left;
        objects.items[i].data.top = top;

        sprites.setTransformXY(
          objects.items[i],
          objects.items[i].dom.o,
          // apply radar scale here
          `${objects.items[i].data.left * data.scale}px`,
          `${objects.items[i].data.top}px`
        );

        if (objects.items[i] === data.radarTarget) {
          updateTargetMarker(objects.items[i]);
        }

        // resize, if method is present: currently, scan nodes and clouds.
        if (data.isStale && objects.items[i].oParent?.resize) {
          objects.items[i].oParent.resize(nextScale);
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

    dom.radar.style.transform = `translate3d(${
      data.radarScrollLeft * -1
    }px, 0px, 0)`;

    alignTargetMarkerWithScroll();
  }

  function getDefaultScaling(allowOnDesktop) {
    if (!isMobile && !allowOnDesktop) return 1;
    if (game.objects.view.data.browser.isPortrait) {
      return DEFAULT_UPSCALING_PORTRAIT;
    }
    return DEFAULT_UPSCALING_LANDSCAPE;
  }

  function enableOrDisableScaling(enable) {
    setScale(enable ? getDefaultScaling() : 1);
  }

  function transitionScale(newScale, easingMethod = easing.quart) {
    transitionScaleActive = true;
    transitionScaleFrame = 0;
    const transitionScaleDelta = data.scale - newScale;
    transitionScaleDuration = FPS * tsDuration * (1 / GAME_SPEED);

    // only scale up if the scale is not the default.
    // this covers the case when returning from scaled up, to non-scaled.
    const mobileUpscale = newScale !== 1 ? getOrientationScale() : newScale;

    const newCSSRadarScale = newScale * mobileUpscale;

    const cssDelta =
      gamePrefs.radar_scaling && mobileUpscale
        ? data.cssRadarScale - newCSSRadarScale
        : DEFAULT_CSS_SCALING;

    for (let i = 0; i <= transitionScaleDuration; i++) {
      // 1/x, up to 1
      transitionScaleFrames[i] = {
        scale:
          data.scale -
          easingMethod(i / transitionScaleDuration) * transitionScaleDelta,
        cssRadarScale: mobileUpscale
          ? data.cssRadarScale -
            easingMethod(i / transitionScaleDuration) * cssDelta
          : DEFAULT_CSS_SCALING
      };
    }

    transitionScaleFrames.final = {
      scale: newScale,
      cssRadarScale: newCSSRadarScale
    };
  }

  function toggleScaling(fromEvent) {
    if (!gamePrefs.radar_scaling) return;
    setScale(
      gamePrefs.radar_scaling && data.scale === 1
        ? getDefaultScaling(fromEvent)
        : 1
    );
  }

  function getOrientationScale() {
    // safe default
    let mobileUpscale = 1;

    if (game.objects.view.data.browser.isLandscape) {
      if (isiPhone) {
        // TODO: handle Android phones, too. :X
        mobileUpscale = CSS_SCALING_LANDSCAPE_PHONE;
      } else if (isMobile) {
        mobileUpscale = CSS_SCALING_LANDSCAPE_TABLET;
      }
    } else {
      if (isiPhone) {
        // TODO: handle Android phones, too. :X
        mobileUpscale = CSS_SCALING_PORTRAIT_PHONE;
      } else if (isMobile) {
        mobileUpscale = CSS_SCALING_PORTRAIT_TABLET;
      }
    }

    return mobileUpscale;
  }

  function setOrientationScale() {
    // when enabled, apply device-specific scaling to landscape vs. portrait.
    if (!gamePrefs.radar_scaling) return;

    if (data.scale === 1) return;

    setScale(getDefaultScaling());

    let mobileUpscale = getOrientationScale();

    data.cssRadarScale =
      gamePrefs.radar_scaling && mobileUpscale
        ? data.scale * mobileUpscale
        : DEFAULT_CSS_SCALING;

    dom.root?.style?.setProperty('--radar-scale', data.cssRadarScale);
  }

  function setScale(scale = 1, notify = true) {
    if (data.scale === scale) return;

    transitionScale(scale);

    // radar node needs updating too, unfortunately, to scale.
    // only set larger for now, given animation.
    if (scale > data.scale) {
      dom.radar.style.width = `${scale * 100}%`;
    }

    if (notify) {
      game.objects.notifications.add('Radar %s 🔎', {
        type: 'radarScaling',
        onRender(input) {
          return input.replace('%s', `${scale + 'x'}`);
        }
      });
    }
  }

  function maybeApplyScaling() {
    if (!gamePrefs.radar_scaling) return;
    const radarScale = searchParams.get('radarScale');
    if (!isMobile && !radarScale) return;
    setScale(getDefaultScaling());
  }

  function initRadar() {
    dom.radar = document.getElementById('radar');
    dom.radarContainer = document.getElementById('radar-container');
    data.height = dom.radar.offsetHeight;
    dom.overlay = document.getElementById('world-noise-overlay');
    dom.root = document.querySelector(':root');
    dom.targetMarker = document.createElement('div');
    dom.targetMarker.style.opacity = 0;
    dom.targetMarker.className = `target-marker target-ui`;
    dom.targetMarker.addEventListener('transitionend', () => {
      utils.css.remove(dom.targetMarker, 'transition-active');
    });
    dom.radarContainer.appendChild(dom.targetMarker);
    resize();
  }

  // width / height of rendered elements, based on class name
  layoutCache = {};

  css = {
    incomingSmartMissile: 'incoming-smart-missile',
    jammed: 'radar-jammed'
  };

  objects = {
    items: []
  };

  data = {
    ctx: {
      battlefield: null,
      fx: null,
      radar: null
    },
    radarScrollLeft: 0,
    radarTarget: null,
    lastRadarTargetWidth: 0,
    animateEveryFrameTypes: {
      [TYPES.helicopter]: true,
      [TYPES.shrapnel]: true,
      [TYPES.bomb]: true,
      [TYPES.gunfire]: true,
      [TYPES.smartMissile]: true
    },
    height: 0,
    isJammed: false,
    isStale: false,
    jamCount: 0,
    jamOffsetX: 0,
    jamOffsetY: 0,
    jamOffsetXIncrement: 0,
    jamOffsetYIncrement: 0,
    jamOpacity: 0,
    missileWarningCount: 0,
    lastMissileCount: 0,
    incomingMissile: false,
    scale: 1,
    interimScale: null,
    cssRadarScale: 1,
    itemScale: 1,
    renderCount: 0
  };

  dom = {
    overlay: null,
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
    onOrientationChange,
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
