import { game } from '../core/Game.js';
import { gamePrefs, PREFS } from '../UI/preferences.js';
import { debug, debugType, FRAMERATE, rnd, rndInt, plusMinus, rad2Deg, TYPES, useDOMPruning, winloc } from '../core/global.js';
import { frameTimeoutManager } from '../core/GameLoop.js';
import { GunFire } from '../munitions/GunFire.js'
import { Shrapnel } from '../elements/Shrapnel.js';
import { Smoke } from '../elements/Smoke.js';

// by default, transform: translate3d(), more GPU compositing seen vs.2d-base transform: translate().
const useTranslate3d = !winloc.match(/noTranslate3d/i);

// unique IDs for quick object equality checks
let guid = 0;

const common = {

  withStyle: (node) => {

    // experimental: decorate a DOM node with shortcuts, perhaps reducing style "access"
    if (node && !node._style) {

      // this may be no different vs. direct access(?)
      // node._style = node.style;

      // this may be faster, at least in Chrome.
      node._style = {
        getPropertyValue: node.style.getPropertyValue.bind(node.style),
        setProperty: node.style.setProperty.bind(node.style)
      }

    }

    return node;
    
  },

  getWithStyle: (id) => {

    var node = document.getElementById(id);

    return common.withStyle(node);

  },

  setFrameTimeout: (callback, delayMsec) => {

    /**
     * a frame-counting-based setTimeout() implementation.
     * millisecond value (parameter) is converted to a frame count.
     */
  
    let data, exports;
  
    data = {
      frameCount: 0,
      frameInterval: parseInt(delayMsec / FRAMERATE, 10), // e.g., msec = 1000 -> frameInterval = 60
      callbackFired: false,
      didReset: false,
    };
  
    function animate() {
  
      // if reset() was called, exit early
      if (data.didReset) return true; 
  
      data.frameCount++;
  
      if (!data.callbackFired && data.frameCount >= data.frameInterval) {
        callback();
        data.callbackFired = true;
        return true;
      }
  
      return false;
  
    }
  
    function reset() {
      // similar to clearTimeout()
      data.didReset = true;
    }
  
    exports = {
      animate,
      data,
      reset
    };
  
    frameTimeoutManager.addInstance(exports);
  
    return exports;
  
  },

  inheritData(data, options) {

    // mixin defaults, and apply common options
  
    options = options || {};
  
    // for quick object comparison
    if (data.id === undefined) {
      data.id = (options.id || guid++);
    }
  
    // assume not in view at first, used for DOM pruning / performance
    if (data.isOnScreen === undefined) {
      data.isOnScreen = null;
    }
  
    if (data.isEnemy === undefined) {
      data.isEnemy = (options.isEnemy || false);
    }
  
    if (data.bottomY === undefined) {
      data.bottomY = (options.bottomY || 0);
    }
  
    if (data.dead === undefined) {
      data.dead = false;
    }
  
    if (data.x === undefined) {
      data.x = (options.x || 0);
    }
  
    if (data.y === undefined) {
      data.y = (options.y || 0);
    }
  
    if (data.vX === undefined) {
      data.vX = (options.vX || 0);
    }
  
    if (data.vY === undefined) {
      data.vY = (options.vY || 0);
    }
  
    if (options.fireModulus !== undefined) {
      data.fireModulus = options.fireModulus;
    }
  
    return data;
  
  },

  inheritCSS(options) {

    // var defaults;
  
    options = options || {};
  
    if (options.animating === undefined) {
      options.animating = common.defaultCSS.animating;
    }
  
    if (options.dead === undefined) {
      options.dead = common.defaultCSS.dead;
    }
  
    if (options.enemy === undefined) {
      options.enemy = common.defaultCSS.enemy;
    }
  
    if (options.exploding === undefined) {
      options.exploding = common.defaultCSS.exploding;
    }
  
    return options;
  
  },

  defaultCSS: {
    animating: 'animating',
    dead: 'dead',
    enemy: 'enemy',
    exploding: 'exploding',
  },

  makeSprite(options) {

    const o = common.withStyle(document.createElement('div'));
  
    // note: `isEnemy` value may not be 'enemy', but 'facing-left' (e.g., for balloons.)
    o.className = `sprite ${options.className}${options.isEnemy ? ' ' + options.isEnemy : ''}`;
  
    if (!options.className.match(/transform-sprite|sub-sprite|terrain/i)) {
      o._style.setProperty('top', '0px');
      o._style.setProperty('left', '0px');
    }
  
    if (debugType) {
      o.innerHTML = options.className.replace(/sub-sprite/i, '');
      o._style.setProperty('font-size', '3px');
    }
  
    return o;
  
  },
  
  makeTransformSprite(extraClass) {
  
    return common.makeSprite({
      className: `transform-sprite${extraClass ? ` ${extraClass}` : ''}`
    });
  
  },
  
  makeSubSprite(extraClass) {
  
    return common.makeSprite({
      className: `sub-sprite${extraClass ? ` ${extraClass}` : ''}`
    });
  
  },
  
  updateXY(exports, x, y) {

    exports.data.x = x;
    exports.data.y = y;

  },

  moveTo(exports, x = exports.data.x, y = exports.data.y) {

    common.updateXY(exports, x, y);

    common.moveWithScrollOffset(exports);
   
  },

  moveWithScrollOffset(exports) {

    // ignore if not on-screen.
    if (!exports?.data?.isOnScreen) return;

    common.setTransformXY(exports, exports.dom.o, `${exports.data.x}px`, `${exports.data.y}px`, exports.data.extraTransforms);

  },

  attachToTarget(exports, target) {

    // "stick" a target, moving a munition (bomb, gunfire, spark) relative to the target it has hit

    if (!exports?.data || !target) return;

    // track and move with the target, too
    exports.data.target = target;

    // note the target's coords at moment of impact; this will be checked by setTransformXY()
    exports.data.targetStartX = target?.data?.x;
    exports.data.targetStartY = target?.data?.y;

  },

  setTransformXY(exports, o, x, y, extraTransforms = '') {

    /**
     * given an object (and its on-screen/off-screen status), apply transform to its live DOM node.
     * battlefield scroll and "target" offset can also be included.
     */

    // ignore if off-screen
    if (exports && !exports.data.isOnScreen) return;

    if (!o) return;

    // take object defaults, if not specified otherwise
    if (!extraTransforms && exports?.data?.extraTransforms) {
      extraTransforms = exports.data.extraTransforms;
    }

    // format additional transform arguments, e.g., rotate3d(0, 0, 1, 45deg)
    if (extraTransforms) extraTransforms = ` ${extraTransforms}`;

    // somewhat hackish: include scroll and "target" offset for most pixel-based values
    if (exports?.data?.type && !exports.data.excludeLeftScroll && x.indexOf('px') !== -1) {

      // drop px
      x = parseFloat(x);

      x -= game.objects.view.data.battleField.scrollLeft;

      // animating e.g., a bomb that's hit a tank: move the spark sprite
      // relative to the tank, as the tank may still be alive and moving
      if (exports?.data?.target) {

        // has the target moved?
        let deltaX = exports.data.target.data.x - exports.data.targetStartX;
        let deltaY = exports.data.target.data.y - exports.data.targetStartY;

        x += deltaX;
        y = `${parseFloat(y) + deltaY}px`;

      }

      // back to pixels
      x = `${x}px`;

    }

    if (useTranslate3d) {
      o._style.setProperty('transform', `translate3d(${x}, ${y}, 0px)${extraTransforms}`);
    } else {
      o._style.setProperty('transform', `translate(${x}, ${y})${extraTransforms}`);
    }

    if (debug) {
      // show that this element was moved
      o._style.setProperty('outline', `1px solid #${rndInt(9)}${rndInt(9)}${rndInt(9)}`);
      game.objects.gameLoop.incrementTransformCount();
    }

  },

  removeNode(node) {

    // DOM pruning safety check: object dom references may include object -> parent node for items that died
    // while they were off-screen (e.g., infantry) and removed from the DOM, if pruning is enabled.
    // normally, all nodes would be removed as part of object clean-up. however, we don't want to remove
    // the battlefield under any circumstances. ;)
    if (useDOMPruning && node === game.objects.view.dom.battleField) return;

    if (!node) return;

    node.remove();
    node._style = null;
    node = null;

  },

  removeNodeArray(nodeArray) {

    let i, j;

    for (i = 0, j = nodeArray.length; i < j; i++) {
      // TESTING: Does manually-removing transform before node removal help with GC? (apparently not.)
      // Chrome issue: https://code.google.com/p/chromium/issues/detail?id=304689
      nodeArray[i].remove();
      nodeArray[i]._style = null;
      nodeArray[i] = null;
    }

    j = null;
    nodeArray = null;

  },

  removeNodes(dom) {

    // remove all nodes in a structure
    let item;

    for (item in dom) {
      // node reference, or array of nodes?
      if (dom[item] instanceof Array) {
        common.removeNodeArray(dom[item]);
      } else {
        common.removeNode(dom[item]);
      }
      dom[item] = null;
    }

  },

  isOnScreen(target) {

    // is the target within the range of screen coordinates?
    return (
      target
      && target.data
      && (target.data.x + target.data.width) >= game.objects.view.data.battleField.scrollLeft
      && target.data.x < game.objects.view.data.battleField.scrollLeftWithBrowserWidth
    );
  
  },

  updateIsOnScreen(o, forceUpdate) {

    if (!o || !o.data || !useDOMPruning) return;
  
    if (forceUpdate || common.isOnScreen(o)) {

      // exit if not already updated
      if (o.data.isOnScreen) return;

      o.data.isOnScreen = true;

      // object may be in the process of being destroyed
      if (!o?.dom?.o) return;

      // restore position, including battlefield scroll offset
      common.moveWithScrollOffset(o);

      if (o.dom._oRemovedParent) {

        // previously removed: re-append to DOM
        o.dom._oRemovedParent.appendChild(o.dom.o);
        o.dom._oRemovedParent = null;

      } else {

        // first-time append, first time on-screen
        game.dom.battlefield.appendChild(o.dom.o);

      }

      // callback, if defined
      if (o.isOnScreenChange) {
        o.isOnScreenChange(o.data.isOnScreen);
      }

    } else if (o.data.isOnScreen || o.data.isOnScreen === null) {

      o.data.isOnScreen = false;

      // only do work if detaching node from live DOM
      if (o.dom?.o?.parentNode) {

        // detach, retaining parent node, for later re-append
        o.dom._oRemovedParent = o.dom.o.parentNode;
        o.dom.o.remove();

        let transform = o.dom.o._style.getPropertyValue('transform');

        // manually remove x/y transform, will be restored when on-screen.
        if (transform) {
          // 'none' might be considered a type of transform per Chrome Dev Tools,
          // and thus incur an "inline transform" cost vs. an empty string.
          // notwithstanding, transform has a "value" and can be detected when restoring elements on-screen.
          o.dom.o._style.setProperty('transform', 'none');
        }

      }

      // callback, if defined
      if (o.isOnScreenChange) {
        o.isOnScreenChange(o.data.isOnScreen);
      }

    }

  },

  mixin(oMain, oAdd) {

    // edge case: if nothing to add, return "as-is"
    // if otherwise unspecified, `oAdd` is the default options object
    if (oAdd === undefined) return oMain;

    // the modern way
    return Object.assign(oMain, oAdd);

  },

  hit(target, hitPoints, attacker) {

    let newEnergy, energyChanged;

    if (target.data.dead) return;

    hitPoints = hitPoints || 1;

    /**
     * special case: super-bunkers can only be damaged by tank gunfire.
     * other things can hit super-bunkers, but we don't want damage done in this case.
     */

    if (target.data.type === TYPES.superBunker) {
      // non-tank gunfire will ricochet off of super bunkers.
      if (!attacker || !attacker.data || !attacker.data.parentType || attacker.data.parentType !== TYPES.tank) {
        return;
      }
    } else if (target.data.type === TYPES.tank) {
      // tanks shouldn't be damaged by shrapnel - but, let the shrapnel die.
      if (attacker && attacker.data && attacker.data.parentType && attacker.data.parentType === TYPES.shrapnel) {
        hitPoints = 0;
      }
    }

    newEnergy = Math.max(0, target.data.energy - hitPoints);

    energyChanged = target.data.energy !== newEnergy;

    target.data.energy = newEnergy;

    // special cases for updating state
    if (energyChanged && target.updateHealth) {
      target.updateHealth(attacker);
    }

    common.updateEnergy(target);

    if (!target.data.energy) {

      if (target.die) {
        target.die({ attacker });
      }

    }

  },

  // height offsets for certain common ground units
  // TODO: reference constants or similar
  ricochetBoundaries: {
    'tank': 18,
    'bunker': 25,
    'super-bunker': 28
  },

  lastInfantryRicochet: 0,

  getLandingPadOffsetX(helicopter) {
    const landingPad = game.objects.landingPads[helicopter.data.isEnemy ? game.objects.landingPads.length - 1 : 0];
    return landingPad.data.x + (landingPad.data.width / 2) - helicopter.data.halfWidth;
  },

  bottomAlignedY(y) {

    // correct bottom-aligned Y value
    return 370 - 2 - (y || 0);
  
  },

  getDoorCoords(obj) {

    // for special collision check case with bunkers
  
    const door = {
      width: 5,
      height: obj.data.height, // HACK: should be ~9px, figure out why true height does not work.
      halfWidth: 2.5
    };
  
    return ({
      width: door.width,
      height: door.height,
      // slight offset on X, don't subtract door half-width
      x: parseInt(obj.data.x + obj.data.halfWidth + door.halfWidth + 2, 10),
      y: parseInt((obj.data.y + obj.data.height) - door.height, 10)
    });
  
  },

  initNearby(nearby, exports) {

    // map options.source -> exports
    nearby.options.source = exports;
  
  },

  applyRandomRotation(node) {

    if (!node) return;

    /**
     * Here be dragons: this should only be applied once, given concatenation,
     * and might cause bugs and/or performance problems if it isn't. :D
     */
    node._style.setProperty('transform', `${node._style.getPropertyValue('transform')} rotate3d(0, 0, 1, ${rnd(360)}deg)`);

  },
  
  updateEnergy(object, forceUpdate) {
  
    if (gamePrefs.show_health_status === PREFS.SHOW_HEALTH_NEVER) {
      // if present, remove right away
      if (object?.dom?.oEnergy) {
        object.dom.oEnergy.remove();
        object.dom.oEnergy = null;
      }
      return;
    }
    
    let node, didCreate, energy, energyLineScale, newWidth, DEFAULT_ENERGY_SCALE;
  
    DEFAULT_ENERGY_SCALE = 1;
  
    // only do work if valid
    if (!object?.dom?.o) return;
  
    // only do work if visible, OR "always" shown and needing updates
    if (!object.data.isOnScreen && gamePrefs.show_health_status !== PREFS.SHOW_HEALTH_ALWAYS) return;
  
    // prevent certain things from rendering this, e.g., smart missiles.
    if (object.data.noEnergyStatus) return;
  
    // dynamically create, and maybe queue removal of `.energy` node
    if (!object.dom.oEnergy) {
      node = common.withStyle(document.createElement('div'));
      node.className = 'energy-status energy';
      object.dom.oEnergy = object.dom.o.appendChild(node);
      didCreate = true;
    }
  
    node = object.dom.oEnergy;
  
    // some objects may have a custom width, e.g., 0.33.
    energyLineScale = object.data.energyLineScale || DEFAULT_ENERGY_SCALE;
  
    energy = (object.data.energy / object.data.energyMax) * 100;
  
    if (isNaN(energy)) return;
  
    // don't show node unless just created, or forced
    if (object.data.lastEnergy === energy && !didCreate && !forceUpdate) return;
  
    object.data.lastEnergy = energy;
  
    // show when damaged, but not when dead.
    node._style.setProperty('opacity', (energy < 100 ? 1 : 0));
  
    if (energy > 66) {
      node._style.setProperty('background-color', '#33cc33');
    } else if (energy > 33) {
      node._style.setProperty('background-color', '#cccc33');
    } else {
      node._style.setProperty('background-color', '#cc3333');
    }
  
    newWidth = energy * energyLineScale;
  
    // width may be relative, e.g., 0.33 for helicopter so it doesn't overlap
    node._style.setProperty('width', `${newWidth}%`);
    
    // only center if full-width, or explicitly specified
    if (energyLineScale === DEFAULT_ENERGY_SCALE || object.data.centerEnergyLine) {
      node._style.setProperty('left', ((100 - newWidth) / 2) + '%');
    }
  
    // if "always" show, no further work to do
    if (gamePrefs.show_health_status === PREFS.SHOW_HEALTH_ALWAYS) return;
  
    // hide in a moment, clearing any existing timers.
    if (object.data.energyTimerFade) {
      object.data.energyTimerFade.reset();
    }
  
    if (object.data.energyTimerRemove) {
      object.data.energyTimerRemove.reset();
    }
  
    // fade out, and eventually remove
    object.data.energyTimerFade = common.setFrameTimeout(() => {
  
      // in case prefs changed during a timer, prevent removal now
      if (gamePrefs.show_health_status === PREFS.SHOW_HEALTH_ALWAYS) return;
  
      if (node?._style) node._style.setProperty('opacity', 0);
  
      // fade should be completed within 250 msec
      object.data.energyTimerRemove = common.setFrameTimeout(() => {
        if (node) {
          node.remove();
          node._style = null;
        }
        object.dom.oEnergy = null;
        node = null;
      }, 250);
  
    }, 2000);
  
  },

  smokeRing(item, smokeOptions) {

    // don't create if not visible
    if (!item.data.isOnScreen) return;

    smokeOptions = smokeOptions || {};
    
    let angle, smokeArgs, angleIncrement, count, i, radians, velocityMax, vX, vY, vectorX, vectorY;

    angle = 0;

    // some sort of min / max
    velocityMax = smokeOptions.velocityMax || (3 + rnd(4));

    // # of smoke elements
    count = parseInt((smokeOptions.count ? smokeOptions.count / 2 : 5) + rndInt(smokeOptions.count || 11), 10);

    angleIncrement = 180 / count;

    // random: 50% to 100% of range
    vX = vY = (velocityMax / 2) + rnd(velocityMax / 2);

    for (i = 0; i < count; i++) {

      angle += (angleIncrement + plusMinus(rnd(angleIncrement * 0.25)));

      // calculate vectors for each element
      radians = angle * Math.PI / 90;

      vectorX = vX * Math.cos(radians);
      vectorY = vY * Math.sin(radians);

      // ground-based object, e.g., base? explode "up", and don't mirror the upper half.
      if (vectorY > 0 && smokeOptions.isGroundUnit) {
        vectorY *= -0.33;
        vectorX *= 0.33;
      }

      smokeArgs = {
        // fixedSpeed: true, // don't randomize vX / vY each time
        x: item.data.x + ((smokeOptions.offsetX || 0) || (item.data.halfWidth || 0)),
        y: item.data.y + ((smokeOptions.offsetY || 0) || (item.data.halfHeight || 0)),
        // account for some of parent object's motion, e.g., helicopter was moving when it blew up
        vX: (vectorX + ((smokeOptions.parentVX || 0) / 3)) * (1 + rnd(0.25)),
        vY: (vectorY + ((smokeOptions.parentVY || 0) / 3)) * (1 + rnd(0.25)),
        // spriteFrame: (Math.random() > 0.5 ? 0 : rndInt(5)),
        spriteFrameModulus: smokeOptions.spriteFrameModulus || 3,
        gravity: 0.25,
        deceleration: 0.98,
        increaseDeceleration: 0.9985
      };

      game.objects.smoke.push(Smoke(smokeArgs));

      // past a certain amount, create inner "rings"
      if (count >= 20 || velocityMax > 15) {

        // second inner ring
        if (i % 2 === 0) {
          game.objects.smoke.push(Smoke(
            common.mixin(smokeArgs, { vX: vectorX * 0.75, vY: vectorY * 0.75})
          ));
        }

        // third inner ring
        if (i % 3 === 0) {
          game.objects.smoke.push(Smoke(
            common.mixin(smokeArgs, { vX: vectorX * 0.66, vY: vectorY * 0.66})
          ));
        }

        // fourth inner ring
        if (i % 4 === 0) {
          game.objects.smoke.push(Smoke(
            common.mixin(smokeArgs, { vX: vectorX * 0.50, vY: vectorY * 0.50})
          ));
        }

      }

    }

  },

  smokeRelativeToDamage(exports, chance) {
    
    if (!exports || !exports.data || !exports.dom) return;

    const data = exports.data;

    if (!data.isOnScreen) return;

    // first off: certain chance of no smoke, regardless of status
    if (Math.random() >= (chance || 0.66)) return;
    
    // a proper roll of the dice: smoke at random. higher damage = greater chance of smoke
    if (Math.random() < 1 - ((data.energyMax -data.energy) / data.energyMax)) return;

    game.objects.smoke.push(Smoke({
      x: data.x + data.halfWidth + (parseInt(rnd(data.halfWidth) * 0.33 * plusMinus(), 10)),
      y: data.y + data.halfHeight + (parseInt(rnd(data.halfHeight) * 0.25 * (data.vY <= 0 ? -1 : 1), 10)),
      // if undefined or zero, allow smoke to go left or right
      // special handling for helicopters and turrets. this should be moved into config options.
      vX: (data.type === TYPES.helicopter ? rnd(1.5) * plusMinus() : -(data.vX || 0) + rnd(1.5) * (data.vX === undefined || data.vX === 0 ? plusMinus() : 1)),
      vY: (data.type === TYPES.helicopter || data.type === TYPES.turret ? rnd(-3) : -(data.vY || 0.25) + rnd(-2))
    }));

  },

  inertGunfireExplosion(options) {

    /* { count: int, exports: exports } */

    if (!options || !options.exports || !options.exports.data) return;

    const data = options.exports.data;

    if (!data.isOnScreen) return;

    // create some inert (harmless) gunfire, as decorative shrapnel.
    for (let i = 0, j = options.count || (3 + rndInt(1)); i < j; i++) {

      game.objects.gunfire.push(GunFire({
        parentType: data.type,
        isEnemy: data.isEnemy,
        isInert: true,
        // empty array may prevent collision, but `isInert` is provided explicitly for this purpose
        collisionItems: [],
        x: data.x + data.halfWidth,
        y: data.y + data.halfHeight,
        // if there are more "particles", allow them to move further.
        vX: rnd(2) * plusMinus() * (j > 4 ? rnd(j / 2) : 1),
        vY: -rnd(2)  * (j > 4 ? rnd(j / 2) : 1)
      }));

    }

  },

  shrapnelExplosion: (options, shrapnelOptions) => {

    let localOptions, halfWidth;
  
    let vectorX, vectorY, i, angle, shrapnelCount, angleIncrement, explosionVelocity1, explosionVelocity2, explosionVelocityMax;
  
    shrapnelOptions = shrapnelOptions || {};
  
    localOptions = common.mixin({}, options);
  
    halfWidth = localOptions.width / 2;
  
    // randomize X?
    if (shrapnelOptions.centerX) {
      localOptions.x += halfWidth;
    } else {
      localOptions.x += rnd(localOptions.width);
    }
  
    // silly, but copy right over.
    if (shrapnelOptions.noInitialSmoke) {
      localOptions.noInitialSmoke = shrapnelOptions.noInitialSmoke;
    }
  
    angle = 0;
  
    explosionVelocityMax = shrapnelOptions.velocity || 4.5;
  
    shrapnelCount = shrapnelOptions.count || 8;
  
    angleIncrement = 180 / (shrapnelCount - 1);
  
    for (i = 0; i < shrapnelCount; i++) {
  
      explosionVelocity1 = rnd(explosionVelocityMax);
      explosionVelocity2 = rnd(explosionVelocityMax);
  
      vectorX = -explosionVelocity1 * Math.cos(angle * rad2Deg);
      vectorY = -explosionVelocity2 * Math.sin(angle * rad2Deg);
  
      localOptions.vX = (localOptions.vX * 0.5) + vectorX;
      localOptions.vY += vectorY;
  
      // bottom-aligned object? explode "up".
      if (localOptions.vY > 0 && options.bottomAligned) {
        localOptions.vY *= -1;
      }
  
      // have first and last make noise
      localOptions.hasSound = (i === 0 || (shrapnelCount > 4 && i === shrapnelCount - 1));
  
      game.objects.shrapnel.push(Shrapnel(localOptions));
  
      angle += angleIncrement;
  
    }
  
  }

};

export { common };