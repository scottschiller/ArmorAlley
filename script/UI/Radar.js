import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { screenScale } from '../aa.js';
import { gamePrefs } from './preferences.js';
import { isFirefox, isSafari, TYPES, winloc, worldWidth } from '../core/global.js';
import { playSound, stopSound, sounds } from '../core/sound.js';
import { RadarItem } from './RadarItem.js';

const Radar = () => {

  let data;
  let css;
  let dom;
  let exports;
  let layoutCache;
  let objects;
  const spliceArgs = [null, 1];

  const noJamming = winloc.match(/noJam/i);

  function setStale(isStale) {
    data.isStale = isStale;
  }

  function setIncomingMissile(incoming) {

    if (data.incomingMissile === incoming) return;

    utils.css[incoming ? 'add' : 'remove'](game.objects.view.dom.worldWrapper, css.incomingSmartMissile);
    data.incomingMissile = incoming;

    if (incoming) {
      /*
      // don't warn player in extreme mode, when radar is jammed.
      if (data.isJammed && gameType === 'extreme') {
        return;
      }
      */

      playSound(sounds.missileWarning);
    } else if (sounds.missileWarning?.sound) {
      stopSound(sounds.missileWarning);
    }

  }

  function getLayout(itemObject) {

    let rect, result, type;

    type = itemObject.data.parentType;

    // cache hit, based on "type"
    if (layoutCache[type]) {
      return layoutCache[type];
    }

    // data to merge with itemObject
    result = {
      layout: {
        width: 0,
        height: 0,
      },
      bottomAlignedY: 0
    };

    // if we hit this, something is wrong.
    if (!itemObject?.dom?.o) {
      console.warn('getLayout: something is wrong, returning empty result.', itemObject);
      return result;
    }

    // if radar is jammed, items will be display: none and layout can't be read. bail.
    if (data.isJammed) return itemObject;

    // read from DOM ($$$) and cache
    // note: offsetWidth + offsetHeight return integers, and without padding.

    // this is $$$ - do away with it.
    rect = itemObject.dom.o.getBoundingClientRect();

    // NOTE screenScale, important for positioning
    result.layout.width = rect.width;
    result.layout.height = rect.height;

    // if using transforms, screenScale needs to be taken into account (and offset)
    // because these items get scaled with the whole view being transformed.
    // TODO: don't rely on isFirefox
    if (isFirefox || isSafari) {
      result.layout.width /= screenScale;
      result.layout.height /= screenScale;
    }

    // hackish: adjust as needed, accounting for borders etc.
    if (type === 'bunker') {
      result.layout.height -= 2;
    } else if (type === 'helicopter') {
      // technically, helicopter height is 0 due to borders making triangle shape.
      result.layout.height = 3;
    } else if (type === 'balloon') {
      result.layout.height -= 2;
    } else if (type === 'smart-missile') {
      result.layout.height -= 2;
    }

    if (itemObject.oParent.data.bottomAligned) {
      // radar height, minus own height
      result.bottomAlignedY = data.height - result.layout.height;
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

    itemObject = RadarItem({
      o: common.withStyle(document.createElement('div')),
      parentType: item.data.type,
      className,
      oParent: item,
      canRespawn: (canRespawn || false),
      isStatic: false,
      // width + height, determined after append
      layout: null,
      // assigned if bottom-aligned (static)
      bottomAlignedY: 0
    });

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

  function startJamming() {

    // [ obligatory Bob Marley reference goes here ]

    if (noJamming) return;

    data.isJammed = true;
    utils.css.add(game.objects.view.dom.worldWrapper, css.jammed);

    if (!gamePrefs.sound) return;

    if (sounds.radarStatic) {
      playSound(sounds.radarStatic);
    }

    if (sounds.radarJamming) {
      playSound(sounds.radarJamming);
    }

    // extreme mode: don't warn player about incoming missiles when radar is jammed, either.
    // i.e., you lose visibility.
    // if (gameType === 'extreme') setIncomingMissile(false);

  }

  function stopJamming() {

    data.isJammed = false;
    utils.css.remove(game.objects.view.dom.worldWrapper, css.jammed);

    if (sounds.radarJamming) {
      stopSound(sounds.radarJamming);
    }

  }

  function _removeRadarItem(offset) {

    common.removeNodes(objects.items[offset].dom);
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

  function animate() {

    let i, j, left, top, hasEnemyMissile, isInterval;

    hasEnemyMissile = false;

    // update some items every frame, most items can be throttled.
    isInterval = (data.frameCount++ >= data.animateInterval);

    if (isInterval) {
      data.frameCount = 0;
    }

    /*
    // even if jammed, missile count needs checking.
    // otherwise, "incoming misile" UI / state could get stuck
    // when a missile is destroyed while the radar is jammed.
    */
    if (game.objects.smartMissiles.length !== data.lastMissileCount) {

      // change state?

      for (i = 0, j = game.objects.smartMissiles.length; i < j; i++) {

        // is this missile not dead, not expired/hostile, and an enemy?

        if (
          !game.objects.smartMissiles[i].data.dead
          && !game.objects.smartMissiles[i].data.hostile
          && game.objects.smartMissiles[i].data.isEnemy !== game.objects.helicopters[0].data.isEnemy
        ) {

          hasEnemyMissile = true;

          break;

        }

      }

      data.lastMissileCount = game.objects.smartMissiles.length;

      setIncomingMissile(hasEnemyMissile);

    }

    // don't animate when radar is jammed.
    // avoid lots of redundant style recalculations.
    if (data.isJammed && !data.isStale) return;

    // move all radar items

    for (i = 0, j = objects.items.length; i < j; i++) {

      // just in case: ensure the object still has a DOM node.
      if (!objects.items[i]?.dom?.o) continue;

      // is this a "static" item which is positioned only once and never moves?
      // additionally: "this is a throttled update", OR, this is a type that gets updated every frame.
      // exception: bases and bunkers may be "dirty" due to resize, `isStale` will be set. force a refresh in that case.

      if (data.isStale || (!objects.items[i].isStatic && (isInterval || data.animateEveryFrameTypes.includes(objects.items[i].oParent.data.type)))) {
        
        if (!objects.items[i].isStatic
          && (
            objects.items[i].oParent.data.type === TYPES.turret
            || objects.items[i].oParent.data.type === TYPES.base
            || objects.items[i].oParent.data.type === TYPES.bunker
            || objects.items[i].oParent.data.type === TYPES.endBunker
            || objects.items[i].oParent.data.type === TYPES.superBunker
          )
        ) {
          objects.items[i].isStatic = true;
        }

        // X coordinate: full world layout -> radar scale, with a slight offset (so bunker at 0 isn't absolute left-aligned)
        left = ((objects.items[i].oParent.data.x / worldWidth) * (game.objects.view.data.browser.width - 5)) + 4;

        // get layout, if needed (i.e., new object created while radar is jammed, i.e., engineer, and its layout hasn't been read + cached from the DOM)
        if (!objects.items[i].layout) {
          objects.items[i] = common.mixin(objects.items[i], getLayout(objects.items[i]));
        }

        // bottom-aligned, OR, somewhere between top and bottom of radar display, accounting for own height
        top = objects.items[i].bottomAlignedY || (objects.items[i].oParent.data.y / game.objects.view.data.battleField.height) * data.height - (objects.items[i]?.layout?.height || 0);

        // depending on parent type, may receive an additional transform property (e.g., balloons get rotated as well.)
        common.setTransformXY(null /* exports */, objects.items[i].dom.o, `${left}px`, `${top}px`, data.extraTransforms[objects.items[i].oParent.data.type]);

      }

    }

    // reset, only do this once.
    data.isStale = false;

  }

  function initRadar() {

    dom.radar = document.getElementById('radar');
    data.height = dom.radar.offsetHeight;

  }

  // width / height of rendered elements, based on class name
  layoutCache = {};

  css = {
    incomingSmartMissile: 'incoming-smart-missile',
    jammed: 'jammed',
    radarItemAnimated: 'radar-item--animated'
  };

  objects = {
    items: []
  };

  data = {
    frameCount: 0,
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
    lastMissileCount: 0,
    incomingMissile: false,
    // additional transform properties applied during radar item animation
    extraTransforms: {
      balloon: 'rotate3d(0, 0, 1, -45deg)'
    }
  };

  dom = {
    radar: null,
    radarItem: null
  };

  initRadar();

  exports = {
    addItem,
    animate,
    data,
    dom,
    removeItem: removeRadarItem,
    setStale,
    startJamming,
    stopJamming
  };

  return exports;

};

export { Radar };