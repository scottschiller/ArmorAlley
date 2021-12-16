(function armorAlley(window) {

  'use strict';

  /*

       MMM   MMMMMMN   MMMMM  MMMMM  MMMM  MMMMMMMM       MMM   MMMMMM   MMMMMM   MMMM MMM MMMM MMMM
      MMMM   MMMM MMM   MMMM  MMMM MMMMMMMM MMMM MMM      MMMM   MMMM     MMMM     MMM NMM MMMM MMM
      MMMM    MMM MMM   MMMM  MMMM MMM  MMM MMMM MMM     MMMMM   MMMM     MMMM     MMM  MM  MMM MM
      MMMMM   MMM MMMM  MMMMMMMMMM MMM  MMM MMMM MMM     MNMMM   MMMM     MMMM     MMM      MMMMMM
      MMMMM   MMM MMM   MMMMMMMMMM MMM  MMM MMMM MMM     MMMMM   MMMM     MMMM     MMM MM    MMMM
     MM MMM   MMM MM    MMMM  MMMM MMM  MMM MMMM MM     MM MMM   MMMM     MMMM     MMMMMM    MMMM
     MM MMMN  MMMMMMM   MMMM  MMMM MMM  MMM MMMMMMMM    MM MMMM  MMMM     MMMM     MMM MM    MMMM
     M MMMMN  MMM MMMM  MMMM  MMMM MMM  MMM MMMM MMM    MMNMMMM  MMMM   M MMMM   M MMM       MMMM
    MM  MMMM  MMM MMMM  MMMM  MMMM MMM  MMM MMMM MMM    M  MMMM  MMMM  MM MMMM  MM MMM  MM   MMMM
    MM  MMMM DMMM MMMMM MMMM  MMMM  MMMMMM  MMMM MMMM  MMM MMMMM MMMMNMMM MMMMNMMM MMM MMM   MMMM
    MM  MMMM MMMMM MMM  MMMM  MMMM    MM    MMMM  MN   MMM MMMMM MMMMMMM  MMMMMMM MMMM MMM   MMMM

    A browser-based interpretation of the MS-DOS release of Armor Alley.

    Original game Copyright (C) 1989 - 1991 Information Access Technologies.
    http://en.wikipedia.org/wiki/Armor_alley

    Images, text and other portions of the original game used with permission under an ISC license.
    Original sound effects could not be re-licensed; modern replacements used from freesound.org.

    http://www.schillmania.com/armor-alley/
    http://www.schillmania.com/content/entries/2013/armor-alley-web-prototype/
    http://github.com/scottschiller/ArmorAlley/

    General disclaimer: This is a fun personal side project. The code could surely be better. ;)

    Original release: Version 1.0.20131031

    Changelog / Revision History

    + V1.51.20181124

     + Performance tweaks
      • More motion / animation is now on the GPU via `transform`, vs. `style.left` / `style.top`.
      • Main animation loop calls `requestAnimationFrame()` first, before anything else (like VSYNC.)
      • Drop legacy SM2 flash options.
      • Turret scan is now driven by CSS animation vs. JS setting an angle transform every frame.

     + Sound
      • New base explosion, tweaked other explosion sound effects.
      • New "heavy mechanics" bunker chain (repair) sound.

    + V1.5.20180201

     + Big feature updates!
      • Game "mostly" now works on mobile devices. Touch-based events for helicopter control, UI for helicopter weapons and inventory / ordering. Tested on iPhone X. Others should work reasonably-well. Hopefully.
      • Inventory order queueing! 🎉 (Finally.) e.g., 3 tanks in a row. Queueing deducts funds immediately. No added UI or cancel ability (yet.)
      • Battlefield view is now bigger on screen. Stats UI is dead, long live stats.
      • Performance improvements. tl;dr: JavaScript tweaks, putting most all sprites onto the GPU. Replaced most common animated .GIF backgrounds with 3d-transform, GPU-accelerated CSS animation-driven sprites. 😅

     + Sound
      • No sound for any Safari (desktop or mobile) for now, including version 11.0. Multiple sounds kill performance on desktop, and "auto-play" is effectively blocked on mobile. https://bugs.webkit.org/show_bug.cgi?id=116145
      • New + improved helicopter machine gun sounds. 9 different samples, played at random.
      • New sound effects: "bomb hatch" (helicopter bomb release), tank gunfire, bunker chain/balloon repair, helicopter gunfire hit.
      • "Medals clanking" sound for bunker chain/balloon repair. (BY-NC 3.0.) https://freesound.org/people/Gareth_H/sounds/365799/
      • New tank gunfire sound: "Tank Fire Mixed.wav" by Cyberkineticfilms/freesound.org (CC0, "No Rights Reserved". 🙇)
      • Hat tip: "Bolo" "tank self hit" sound effect, Copyright (C) Steuart Cheshire 1993. My favourite Mac game of all time. ❤️

     + UX / UI
      • "Radar jammed" TV static-like overlay with transform sprite.
      • Slightly faster helicopter bombing rate - more responsive.
      • Chain refactor. Use fixed height, animate via transform, fall with gravity when balloon and/or bunker are lost.
      • Balloons are yellow-ish on radar, and now transform-rotated to elliptical shapes. Bunkers / base color and border tweaks, friendly vs. enemy now look different.
      • Inventory and helicopter ammo, etc., become greyed out when unaffordable / unavailable.
      • Target / "tracking" animation on Smart Missile targets.
      • Smart Missiles can now re-target on the next frame after the original target dies. If a new target can not be immediately acquired, the Smart Missile dies as previously.
      • Radar items, clouds and some other sprites move more smoothly simply by dropping `parseInt()`.
      • "C" / rubber chicken use causes UI to switch to rubber chicken mode.
      • Possible bugfix: If paused and enemy order timer fires, re-start timer. This probably fixes enemy inventory building sometimes breaking.
      • Jam radar all the time on hard + extreme game types.

     + Miscellany
      • Note re: Firefox `will-change` memory consumption warning that might show in console.
      • URL feature flags: `noTranslate3d` and `noRadarGPU`. `frameRate=[60|*]` for testing of `requestAnimationFrame()` timing. camelCase others. Let Opera (now webkit-based) have transforms.
      • +`makeTransformSprite()`, a sort of sub-sprite for CSS transform-based animations (GPU-accelerated animated .GIF alternatives.)
      • `z-index: -1` can be harmful for performance / compositing.
      • iPhone X notch handling based on orientation and whatnot.

    + 12/2017

     + Optimized performance / dropped CPU usage significantly by hiding off-screen elements.
     + Fixed silly blank / empty frame in balloon right -> left animation sequence.
     + Dropped numerous legacy -webkit and -moz prefixes in CSS.
     + DOM Pruning option with offscreen logic

    + 10/2017

     + Fixed up top stats layout in Firefox, Safari, Chrome.
     + Emoji to convey meaning of tutorial, easy, hard, extreme modes.
     + ESLint code clean-up.

    + 09/2015

     + "Extreme" game mode
      • Higher enemy convoy production rate.
      • Turrets fire at a faster rate.
      • Twin enemy turrets near mid-field.
      • Turrets fire at ground vehicles and smart missiles. Infantry and engineers are not targeted, but can be hit.
      • Owning all bunkers does not halt enemy production.

     + Miscellaneous
      • Fix for "negative look-ahead" case - enemy Super Bunker now fires at helicopter on both sides.
      • `Math.abs()` checks on distance for missile launchers
      • Fixed Bunker and Super Bunker vertical alignment / collision detection with helicopter
      • Infantry will not be picked up when the helicopter is on a landing pad and repairing.
      • Shrapnel shows on radar.
      • Background color fixed on bullet and missile "spark" graphic.

    + 08/2014

     + Sound events / sound effects
      • Wrench and related sounds on helicopter repair/refuel, balloon repair, turret claiming/rebuilding/repair
      • Violin notes for friendly capture events: bunker, turret etc. (C5). Enemy note is C4.
      • "Pop" / "vacuum" sounds for infantry pick up + deployment, and turret restoration
      • Door close for passing infantry entering bunkers
      • Splat for infantry and engineer kills
      • Crash-and-glass for bunker explosions
      • Heavy/light impact sounds for bullets hitting metal (tanks) and other structures (bunkers)
      • Turrets audibly "break" when destroyed.

     + Game logic / rules
      • Turret gunfire can now hit infantry, regular bunkers and Super Bunkers. However, only tank gunfire can hit Super Bunkers for damage.
      • For "easy" game mode, turrets now fire at half the previous rate.

     + UI / design
      • Arrows on bunkers now animate to the right/left when claimed by friendly/enemy infantry.

     + Miscellaneous
      • Sound arrays (i.e., 5 bullet/metal sounds) shuffle on each rotation, reducing chance of repetitiveness.
      • Upped turret gunfire sound array, possibly reduce cloning of Audio() in heavy fire cases.
      • Infantry build "faster" now, so they are more closely grouped together (in units of five.)
      • Shrapnel now rotates using CSS animations, rotation direction determined randomly.
      • In tutorial mode, disarm user-armed Super Bunker so it doesn't accidentally kill Missile Launchers that later show up.
      • Fixed enemy infantry + engineer die animation to be bottom-aligned.

    + 07/2014

     • Safari 7.1 and 8 (OS X 10.10/Yosemite preview) still have HTML5 audio jank bug, thus prefer Flash. https://bugs.webkit.org/show_bug.cgi?id=116145
     • Opacity fade on edge of game tips.
     • Font legibility tweaks.

    + 04/2014

     • "Hard" game option, comparable to original game's level 9.
     • Gunfire and shrapnel now shows up on radar.
     • Enemy unit production halts when all bunkers are friendly / player-owned.
     • Heat-seeking rubber chickens (launched with C key.)
     • Turret gunfire can hit tanks, vans and missile launchers in "hard" mode. Protip: Don't approach turrets from low angles.

    + 03/2014

     • Added "Super Bunkers" (pillbox bunkers) http://en.wikipedia.org/wiki/Armor_alley#Terrain_elements

  */

  var game, utils, common;

  var winloc = window.location.href.toString();

  var ua = navigator.userAgent;

  var FPS = 30;
  var FRAMERATE = 1000 / FPS;

  // skip frame(s) as needed, prevent the game from running too fast.
  var FRAME_MIN_TIME = FRAMERATE * 0.95;

  var unlimitedFrameRate = winloc.match(/frameRate=\*/i);

  var noJamming = winloc.match(/noJam/i);

  // IE 9 doesn't like some of the bigger transforms, for some reason.
  var noTransform = (winloc.match(/noTransform/i) || (ua.match(/msie 9/i) && !winloc.match(/useTransform/i)));

  // by default, transform: translate3d(), more GPU compositing seen vs.2d-base transform: translate().
  var useTranslate3d = !winloc.match(/noTranslate3d/i);

  /**
   * Evil tricks needed because Safari 6 (and Webkit nightly)
   * scale text after rasterization - thus, there's an option
   * to use document.body.style.zoom vs. transform: scale3d()
   * which renders text cleanly. Both have minor quirks.
   * force-enable transform under Safari 6 w/ #forcescaling=1
   */

  var isWebkit = ua.match(/webkit/i);
  var isChrome = !!(isWebkit && (ua.match(/chrome/i) || []).length);
  var isFirefox = ua.match(/firefox/i);
  var isSafari = (isWebkit && !isChrome && ua.match(/safari/i));
  var isMobile = ua.match(/mobile/i); // should get iOS.
  var isiPhone = ua.match(/iphone/i);

  var useParallax = winloc.match(/parallax/i);

  // whether to prevent transform: translate3d() on radar items.
  // gunfire and shrapnel can cause literal layer explosions,
  // potentially $$$ even with GPU compositing (I think.)
  var noRadarGPU = winloc.match(/noRadarGPU=1/i);

  // whether off-screen elements are forcefully removed from the DOM.
  // may be expensive up front, and/or cause style recalcs while
  // scrolling the world. the fastest nodes are the ones that aren't there.
  var useDOMPruning = !winloc.match(/noDomPruning/i);

  var noPause = winloc.match(/noPause/i);

  var trackEnemy = winloc.match(/trackEnemy/i);

  var debug = winloc.match(/debug/i);

  var showHealth = winloc.match(/health/i);

  // whether to always "upgrade" Smart Missiles...
  var forceRubberChicken = winloc.match(/chicken/i);

  // can also be enabled by pressing "C".
  var rubberChickenMode = 'rubber-chicken-mode';

  var INFINITY = '∞';

  var DEFAULT_FUNDS = winloc.match(/FUNDS/i) ? 999 : 32;

  var deg2Rad = 180 / Math.PI;

  // used for various measurements in the game
  var worldWidth = 8192;
  var worldHeight = 380;

  var battleOver = false;

  var productionHalted = false;

  var canHideLogo = false;

  var logoHidden = false;

  var keyboardMonitor;

  var features;

  // TODO: move into view
  var screenScale = 1;

  var forceScaling = !!(winloc.match(/forcescal/i));

  var disableScaling = !!(!forceScaling && winloc.match(/noscal/i));

  var userDisabledScaling = false;

  var userDisabledSound = false;

  var tutorialMode = !!(winloc.match(/tutorial/i));

  var gameType;

  var convoyParam = winloc.toLowerCase().indexOf('convoydelay');

  // how often the enemy attempts to build convoys
  var convoyDelay = 60;

  // unique IDs for quick object equality checks
  var guid = 0;

  var Tutorial;

  var TutorialStep;

  var setFrameTimeout;

  var frameTimeoutManager;

  var Funds;

  var Notifications;

  var Queue;

  var Tank, Van, Infantry, ParachuteInfantry, Engineer, MissileLauncher, SmartMissile, Helicopter, Bunker, EndBunker, SuperBunker, Balloon, Chain, Base, Cloud, LandingPad, Turret, Smoke, Shrapnel, GunFire, Bomb, Radar, Inventory;

  var shrapnelExplosion;

  var GameLoop;

  var View;

  var prefs;

  var sounds;

  var transformCount = 0;

  var TYPES = {
    balloon: 'balloon',
    helicopter: 'helicopter',
    tank: 'tank',
    turret: 'turret',
    infantry: 'infantry',
    parachuteInfantry: 'parachute-infantry',
    parachuteInfantryCamel: 'parachuteInfantry',
    engineer: 'engineer',
    bunker: 'bunker',
    endBunker: 'end-bunker',
    endBunkerCamel: 'endBunker',
    superBunker: 'super-bunker',
    superBunkerCamel: 'superBunker',
    missileLauncher: 'missile-launcher',
    missileLauncherCamel: 'missileLauncher',
    van: 'van'
  };

  var COSTS = {
    missileLauncher: {
      funds: 3,
      css: 'can-not-order-missile-launcher'
    },
    tank: {
      funds: 4,
      css: 'can-not-order-tank'
    },
    van: {
      funds: 2,
      css: 'can-not-order-van',
    },
    infantry: {
      funds: 5,
      count: 5,
      css: 'can-not-order-infantry',
    },
    engineer: {
      funds: 5,
      count: 2,
      css: 'can-not-order-engineer'
    }
  };

  var stats;

  function statsStructure() {
    return {
      bullet: 0,
      balloon: 0,
      bunker: 0,
      'missile-launcher': 0,
      gunfire: 0,
      tank: 0,
      van: 0,
      infantry: 0,
      engineer: 0,
      helicopter: 0,
      'smart-missile': 0,
      bomb: 0,
      shrapnel: 0,
      turret: 0
    };
  }

  function Stats() {

    var data, exports;

    function normalizeObj(obj) {
      if (obj && !obj.data && obj.oParent) {
        obj = obj.oParent;
      }
      return obj;
    }

    function normalizeType(obj) {
      var type = obj.data.type;
      // special case: infantry -> engineer
      if (obj.data.type === TYPES.infantry && obj.data.role) {
        type = TYPES.engineer;
      }
      return type;
    }

    function create(obj) {
      var dataObj, type;
      obj = normalizeObj(obj);
      type = normalizeType(obj);
      dataObj = data[obj.data.isEnemy ? 'enemy' : 'player'].created;
      if (dataObj[type] !== undefined) {
        dataObj[type]++;
      }
    }

    function destroy(obj) {
      // there might be no data, so go up the chain.
      var dataObj, type;
      obj = normalizeObj(obj);
      type = normalizeType(obj);
      dataObj = data[obj.data.isEnemy ? 'enemy' : 'player'].destroyed;
      if (dataObj[type] !== undefined) {
        dataObj[type]++;
      }
    }

    function markEnd() {
      data.time.end = new Date();
    }

    function displayEndGameStats() {
      var i, j, k, items, cols, type, offset, dataSource;
      items = document.getElementById('stats-endgame').getElementsByTagName('tr');
      // data sources
      dataSource = [data.player.destroyed, data.enemy.destroyed];
      offset = 1;
      for (i = 0, j = items.length; i < j; i++) {
        type = items[i].getAttribute('data-type');
        if (type) {
          cols = items[i].getElementsByTagName('td');
          for (k = 0; k < 2; k++) {
            if (cols[k + offset]) {
              cols[k + offset].childNodes[0].textContent = dataSource[k][type];
            }
          }
        }
      }
      document.getElementById('stats-endgame').style.display = 'block';
    }

    data = {
      time: {
        start: new Date(),
        end: null
      },
      player: {
        created: statsStructure(),
        destroyed: statsStructure()
      },
      enemy: {
        created: statsStructure(),
        destroyed: statsStructure()
      }
    };

    exports = {
      data: data,
      create: create,
      destroy: destroy,
      markEnd: markEnd,
      displayEndGameStats: displayEndGameStats
    };

    return exports;

  }

  function getLandscapeLayout() {

    // notch position guesses, as well as general orientation.
    var notchPosition;

    if ('orientation' in window) {

      // Mobile
      if (window.orientation === 90) {
        notchPosition = 'left';
      } else if (window.orientation === -90) {
        notchPosition = 'right';
      }

    } else if ('orientation' in window.screen) {

      // Webkit
      if (window.screen.orientation.type === 'landscape-primary') {
        notchPosition = 'left';
      } else if (window.screen.orientation.type === 'landscape-secondary') {
        notchPosition = 'right';
      }

    }

    return notchPosition;

  }

  function updateScreenScale() {

    if (disableScaling) return;

    var innerHeight = window.innerHeight;
    var offset = 0;
    var localWorldHeight = 410;

    // TODO: clean this up.
    if (isMobile) {

      var id = 'body-height-element';
      var div = document.getElementById(id);

      var bottom = document.getElementById('bottom');

      // make and append once, as necessary.
      if (!div) {
        div = document.createElement('div');
        div.id = id;
        document.body.appendChild(div);
      }

      // measure.
      offset = parseInt(div.offsetHeight, 10) || 0;

      // take the smaller one, in any case.
      if (innerHeight < offset) {

        // Safari URL / address bar is showing. hack around it.
        // TODO: ignore touch, make user scroll window first?
        console.log('scaling world down slightly because of Safari URL / address bar.');
        // 50 (~pixel height of URL bar) * 2, so world is centered nicely. I think. :D
        localWorldHeight += 100;

        utils.css.add(bottom, 'rotate-hint');

      } else {

        utils.css.remove(bottom, 'rotate-hint');

        // if we were paused, but rotated and now full-screen
        // (i.e., landscape and no address bar), resume automagically.
        if (game.data.paused && getLandscapeLayout()) {
          game.resume();
        }

      }

    }

    if (userDisabledScaling) {

      screenScale = 1;

    } else {

      screenScale = innerHeight / localWorldHeight;

    }

  }

  function applyScreenScale() {

    if (disableScaling) return;

    var wrapper = document.getElementById('world-wrapper');

    /**
     * 09/2021: Most browsers perform and look better using scale3d() vs style.zoom.
     * Chrome seems to be the exception, where zoom renders accurately, sharp and performant.
     * Safari 15 still scales and has "fuzzy" text via scale3d(), but style.zoom is slower.
     * 
     * 04/2020: It seems `style.zoom` is the way to go for performance, overall.
     * Browsers seem to understand that this means "just magnify everything" in an efficient way.
     * 
     * 10/2013: Safari 6.0.5 scales text after rasterizing via transform: scale3d(), thus it looks crap.
     * Using document[element].zoom is OK, however.
     * 
     * TESTING
     * Force transform-based scaling with #forceTransform=1
     * Force zoom-based scaling with #forceZoom=1
     */

    // Pardon the non-standard formatting in exchange for legibility.
    if (!forceZoom && (
      // URL param: prefer transform-based scaling
      forceTransform

      // Firefox clips some of the world when using style.zoom.
      || isFirefox
    
      // Chrome can do zoom, but mentions Safari in its userAgent.
      // Safari does not do well with zoom.
      || (!isChrome && isSafari)

      // Assume that on mobile, transform (GPU) is the way to go
      || isMobile
    )) {

      if (debug) console.log('using transform-based scaling');

      wrapper.style.marginTop = -((406 / 2) * screenScale) + 'px';
      wrapper.style.width = Math.floor((window.innerWidth || document.body.clientWidth) * (1 / screenScale)) + 'px';
      wrapper.style[features.transform.prop + 'Origin'] = '0px 0px';
      // TODO: consider translate() instead of marginTop here. Seems to throw off mouse Y coordinate, though,
      // and will need more refactoring to make that work the same.
      wrapper.style[features.transform.prop] = 'scale3d(' + screenScale + ', ' + screenScale + ', 1)';

    } else {

      if (debug) console.log('using style.zoom-based scaling');

      wrapper.style.marginTop = -(406 / 2) + 'px';

      // Safari 6 + Webkit nightlies (as of 10/2013) scale text after rasterizing, so it looks bad. This method is hackish, but text scales nicely.
      // Additional note: this won't work in Firefox.
      document.getElementById('aa').style.zoom = (screenScale * 100) + '%';

    }


  }

  utils = {

    array: (function() {

      function compare(property) {

        var result;

        return function(a, b) {

          if (a[property] < b[property]) {
            result = -1;
          } else if (a[property] > b[property]) {
            result = 1;
          } else {
            result = 0;
          }
          return result;
        };

      }

      function includes(array, item) {
        if (!array || !array.length) return false;

        if (array.includes) return array.includes(item);

        // legacy
        for (var i = 0, j = array.length; i < j; i++) {
          if (array[i] === item) return true;
        }

        // default
        return false;
      }

      function shuffle(array) {

        // Fisher-Yates shuffle algo

        var i, j, temp;

        for (i = array.length - 1; i > 0; i--) {
          j = Math.floor(rnd(i + 1));
          temp = array[i];
          array[i] = array[j];
          array[j] = temp;
        }

        return array;

      }

      return {
        compare: compare,
        includes: includes,
        shuffle: shuffle
      };

    }()),

    css: (function() {

      function hasClass(o, cStr) {

        // modern
        if (o && o.classList) {
          return o.classList.contains(cStr);
        }
        // legacy
        return (o.className !== undefined ? new RegExp('(^|\\s)' + cStr + '(\\s|$)').test(o.className) : false);

      }

      function addClass(o, cStr) {

        if (o && o.classList) {
          o.classList.add(cStr);
          return;
        }

        if (!o || !cStr || hasClass(o, cStr)) return;
        o.className = (o.className ? o.className + ' ' : '') + cStr;

      }

      function removeClass(o, cStr) {

        if (o && o.classList) {
          o.classList.remove(cStr);
          return;
        }

        if (!o || !cStr || !hasClass(o, cStr)) return;
        o.className = o.className.replace(new RegExp('( ' + cStr + ')|(' + cStr + ')', 'g'), '');

      }

      function swapClass(o, cStr1, cStr2) {

        if (o && o.classList) {
          o.classList.remove(cStr1);
          o.classList.add(cStr2);
          return;
        }

        var tmpClass = {
          className: o.className
        };

        removeClass(tmpClass, cStr1);
        addClass(tmpClass, cStr2);

        o.className = tmpClass.className;

      }

      function toggleClass(o, cStr) {

        (hasClass(o, cStr) ? removeClass : addClass)(o, cStr);

      }

      return {
        has: hasClass,
        add: function(o, className) {
          // accept space-delimited classNames, but each item
          // needs to be added via o.classNames.add() one at a time.
          if (!className) return;
          var classNames = className.split(' ');
          for (var i = 0, j = classNames.length; i < j; i++) {
            addClass(o, classNames[i]);
          }
        },
        remove: removeClass,
        swap: swapClass,
        toggle: toggleClass
      };

    }()),

    events: (function() {

      var add, remove, preventDefault;

      add = (window.addEventListener !== undefined ? function(o, evtName, evtHandler) {
        return o.addEventListener(evtName, evtHandler, false);
      } : function(o, evtName, evtHandler) {
        o.attachEvent('on' + evtName, evtHandler);
      });

      remove = (window.removeEventListener !== undefined ? function(o, evtName, evtHandler) {
        return o.removeEventListener(evtName, evtHandler, false);
      } : function(o, evtName, evtHandler) {
        return o.detachEvent('on' + evtName, evtHandler);
      });

      preventDefault = function(e) {
        if (e.preventDefault) {
          e.preventDefault();
        } else {
          e.returnValue = false;
          e.cancelBubble = true;
        }
      };

      return {
        add: add,
        preventDefault: preventDefault,
        remove: remove
      };

    }()),

    storage: (function() {

      var exports,
        data,
        localStorage;

      data = {};

      // try ... catch because even referencing localStorage can cause a security exception.

      try {
        localStorage = window.localStorage || null;
      } catch (e) {
        console.log('localStorage not present, or denied');
        localStorage = null;
      }

      function get(name) {

        if (!localStorage) return undefined;

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
        get('testLocalStorage');
      } catch (e) {
        console.log('localStorage read test failed. Disabling.');
        localStorage = null;
      }

      exports = {
        get: get,
        set: set,
        remove: remove
      };

      return exports;

    }())


  };

  function removeNode(node) {

    // DOM pruning safety check: object dom references may include object -> parent node for items that died
    // while they were off-screen (e.g., infantry) and removed from the DOM, if pruning is enabled.
    // normally, all nodes would be removed as part of object clean-up. however, we don't want to remove
    // the battlefield under any circumstances. ;)
    if (useDOMPruning && node === game.objects.view.dom.battleField) return;

    // hide immediately
    node.style.display = 'none';

    game.objects.queue.add(function() {
      if (!node) return;
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
      node = null;
    });

  }

  function removeNodeArray(nodeArray) {

    var i, j;

    j = nodeArray.length;

    for (i = 0; i < j; i++) {
      nodeArray[i].style.display = 'none';
    }

    game.objects.queue.add(function() {

      // this is going to invalidate layout, and that's expensive. set display: none first, maybe minimize damage.
      // TODO: Put these in a queue, and do own "GC" of nodes every few seconds or something.

      for (i = 0; i < j; i++) {
        // TESTING: Does manually-removing transform before node removal help with GC? (apparently not.)
        // Chrome issue: https://code.google.com/p/chromium/issues/detail?id=304689
        // nodeArray[i].style[features.transform.prop] = 'none';
        nodeArray[i].parentNode.removeChild(nodeArray[i]);
        nodeArray[i] = null;
      }

      nodeArray = null;

    });

  }

  function removeNodes(dom) {

    // remove all nodes in a structure
    var item;

    for (item in dom) {
      if (dom.hasOwnProperty(item) && dom[item]) {
        // node reference, or array of nodes?
        if (dom[item] instanceof Array) {
          removeNodeArray(dom[item]);
        } else {
          removeNode(dom[item]);
        }
        dom[item] = null;
      }
    }

  }

  function mixin(oMain, oAdd) {

    // edge case: if nothing to add, return "as-is"
    // if otherwise unspecified, `oAdd` is the default options object
    if (oAdd === undefined) return oMain;

    // the modern way
    return Object.assign(oMain, oAdd);

  }

  function stopEvent(e) {

    var evt = e || window.event;

    if (evt.preventDefault !== undefined) {
      evt.preventDefault();
    } else {
      evt.cancelBubble = true;
    }

    return false;

  }

  var testDiv = document.createElement('div');

  features = (function() {

    var _getAnimationFrame = !!window.requestAnimationFrame;

    if (_getAnimationFrame) {
      if (winloc.match(/noraf=1/i)) {
        _getAnimationFrame = null;
        console.log('preferring setInterval for game loop');
      } else {
        console.log('preferring requestAnimationFrame for game loop');
      }
    } else {
      // IE 9? Really?
      _getAnimationFrame = function(callback) {
        var args = Array.prototype.slice.call(arguments).splice(1);
        window.setTimeout(function() {
          callback.apply(this, args);
        }, 1);
      };
    }

    var transform, styles, prop;

    function has(property) {

      // test for feature support
      var result = testDiv.style[property];
      return (result !== undefined ? property : null);

    }

    // note local scope.
    var localFeatures = {

      transform: {
        ie: has('-ms-transform'),
        moz: has('MozTransform'),
        opera: has('OTransform'),
        webkit: has('webkitTransform'),
        w3: has('transform'),
        prop: null // the normalized property value
      },

      rotate: {
        has3D: false,
        prop: null
      },

      getAnimationFrame: _getAnimationFrame

    };

    localFeatures.transform.prop = (
      localFeatures.transform.w3 ||
      localFeatures.transform.moz ||
      localFeatures.transform.webkit ||
      localFeatures.transform.ie ||
      localFeatures.transform.opera
    );

    function attempt(style) {

      try {
        testDiv.style[transform] = style;
      } catch (e) {
        // that *definitely* didn't work.
        return false;
      }
      // if we can read back the style, it should be cool.
      return !!testDiv.style[transform];

    }

    if (localFeatures.transform.prop) {

      // try to derive the rotate/3D support.
      transform = localFeatures.transform.prop;
      styles = {
        css_2d: 'rotate(0deg)',
        css_3d: 'rotate3d(0,0,0,0deg)'
      };

      if (attempt(styles.css_3d)) {
        localFeatures.rotate.has3D = true;
        prop = 'rotate3d';
      } else if (attempt(styles.css_2d)) {
        prop = 'rotate';
      }

      localFeatures.rotate.prop = prop;

    }

    console.log('user agent feature test:', localFeatures);

    console.log('requestAnimationFrame() is' + (localFeatures.getAnimationFrame ? '' : ' not') + ' available');

    if (localFeatures.transform.prop) {
      if (noTransform) {
        console.log('transform support present, disabling via URL parameter');
        localFeatures.transform.prop = null;
      } else {
        console.log('using transforms for parallax, rotation and some positioning.');
      }
    }

    testDiv = null;

    return localFeatures;

  }());

  function applyRandomRotation(node) {
    if (!node || noTransform) return;
    /**
     * Here be dragons: this should only be applied once, given concatenation,
     * and might cause bugs and/or performance problems if it isn't. :D
     */
    node.style.transform += ' rotate(' + rnd(360) + 'deg)';
  }

  function updateEnergy(object) {

    if (!showHealth) return;

    var nodes,
      node,
      energy;

    if (document.querySelectorAll && object.dom && object.dom.o) {
      nodes = object.dom.o.querySelectorAll('.energy');
    }

    if (nodes && nodes.length) {
      node = nodes[0];
    }

    if (node) {
      energy = (object.data.energy / object.data.energyMax) * 100;
      if (!isNaN(energy)) {
        node.style.opacity = (energy < 100 ? 1 : 0);
        if (energy > 66) {
          node.style.backgroundColor = '#33cc33';
        } else if (energy > 33) {
          node.style.backgroundColor = '#cccc33';
        } else {
          node.style.backgroundColor = '#cc3333';
        }
        node.style.width = (energy + '%');
      }
    }

  }


    defaultCSS: {
      animating: 'animating',
      dead: 'dead',
      enemy: 'enemy',
      exploding: 'exploding',
      offScreen: 'offscreen'
    },

    energy = (object.data.energy / object.data.energyMax) * 100;













  function rnd(number) {
    return Math.random() * number;
  }

  function rndInt(number) {
    return parseInt(rnd(number), 10);
  }

  function plusMinus() {
    return Math.random() >= 0.5 ? 1 : -1;
  }

  common = {

    defaultCSS: {
      animating: 'animating',
      dead: 'dead',
      enemy: 'enemy',
      exploding: 'exploding',
    },

    setTransformXY: function(exports, o, x, y, extraTransforms) {

      /**
       * given an object (and its on-screen/off-screen status), apply transform to its live DOM node -
       * and/or, if off-screen, as a string to be applied when the element is on-screen.
       * positioning can be moderately complex, and is calculated with each animate() / moveTo() call.
       */

      var transformString;

      if (!o) return;

      if (features.transform.prop || !noTransform) {

        // additional transform arguments, e.g., rotate(45deg)
        extraTransforms = extraTransforms ? (' ' + extraTransforms) : '';

        // EXPERIMENTAL
        // all elements are affected by scroll, too.
        /*
        if (x && x.indexOf('px') !== -1) {
          if (game.objects.view && game.objects.view.data && game.objects.view.data.battleField) {
            // console.log(game.objects.view.data.battleField.scrollLeft);
            x = (parseInt(x, 10) - game.objects.view.data.battleField.scrollLeft) + 'px';
          }
        }
        */

        // if (game.objects.view && o !== game.objects.view.data.battleField) return;

        if (useTranslate3d) {
          transformString = 'translate3d(' + x + ', ' + y + ', 0px)' + extraTransforms;
        } else {
          transformString = 'translate(' + x + ', ' + y + ')' + extraTransforms;
        }

        /**
         * sometimes, exports is explicitly provided as `undefined`.
         * if any are undefined, "just do it" and apply the transform -
         * provided we haven't applied the same one.
         */
        if ((!exports || !exports.data || exports.data.isOnScreen) && o._lastTransform !== transformString) {
          o.style[features.transform.prop] = transformString;
          if (debug) {
            // show that this element was moved
            o.style.outline = '1px solid #' + rndInt(9) + rndInt(9) + rndInt(9);
            transformCount++;
          }
        } else if (debug) {
          excludeTransformCount++;
        }

        // assign for future re-append to DOM
        o._lastTransform = transformString;

      } else {

        // legacy / fallback
        o.style.left = x;
        o.style.top = y;

      }

    },

    hit: function(target, hitPoints, attacker) {

      var newEnergy, energyChanged;

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

      updateEnergy(target);

      if (!target.data.energy) {

        if (target.die) {
          target.die({ attacker: attacker });
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

    getLandingPadOffsetX: function(helicopter) {
      var landingPad = game.objects.landingPads[helicopter.data.isEnemy ? game.objects.landingPads.length - 1 : 0];
      return landingPad.data.x + (landingPad.data.width / 2) - helicopter.data.halfWidth;
    },

    smokeRing: function(item, smokeOptions) {

      // don't create if not visible
      if (!item.data.isOnScreen) return;

      smokeOptions = smokeOptions || {};
      
      var angle, smokeArgs, angleIncrement, count, i, radians, velocityMax, vX, vY, vectorX, vectorY;

      angle = 0;

      // some sort of min / max
      velocityMax = smokeOptions.velocityMax || (3 + rnd(4));

      // # of smoke elements
      count = parseInt((smokeOptions.count ? smokeOptions.count / 2 : 5) + rndInt(smokeOptions.count || 11), 10);

      angleIncrement = 180 / count;

      // random: 50% to 100% of range
      vX = vY = (velocityMax / 2) + rnd(velocityMax / 2);

      for (i = 0; i < count; i++) {

        angle += angleIncrement;

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
          vX: vectorX + ((smokeOptions.parentVX || 0) / 3),
          vY: vectorY + ((smokeOptions.parentVY || 0) / 3),
          // spriteFrame: (Math.random() > 0.5 ? 0 : rndInt(5)),
          spriteFrameModulus: smokeOptions.spriteFrameModulus || 3,
          gravity: 0.25,
          deceleration: 0.98,
          increaseDeceleration: 0.9985
        };

        game.objects.smoke.push(new Smoke(smokeArgs));

        // past a certain amount, create inner "rings"
        if (count >= 20 || velocityMax > 15) {

          // second inner ring
          if (i % 2 === 0) {
            game.objects.smoke.push(new Smoke(
              mixin(smokeArgs, { vX: vectorX * 0.75, vY: vectorY * 0.75})
            ));
          }

          // third inner ring
          if (i % 3 === 0) {
            game.objects.smoke.push(new Smoke(
              mixin(smokeArgs, { vX: vectorX * 0.66, vY: vectorY * 0.66})
            ));
          }

          // fourth inner ring
          if (i % 4 === 0) {
            game.objects.smoke.push(new Smoke(
              mixin(smokeArgs, { vX: vectorX * 0.50, vY: vectorY * 0.50})
            ));
          }

        }

      }

    },

    smokeRelativeToDamage: function(exports, chance) {
      
      if (!exports || !exports.data || !exports.dom) return;

      var data = exports.data;

      if (!data.isOnScreen) return;

      // first off: certain chance of no smoke, regardless of status
      if (Math.random() >= (chance || 0.66)) return;
      
      // a proper roll of the dice: smoke at random. higher damage = greater chance of smoke
      if (Math.random() < 1 - ((data.energyMax -data.energy) / data.energyMax)) return;

      game.objects.smoke.push(new Smoke({
        x: data.x + data.halfWidth + (parseInt(rnd(data.halfWidth) * 0.33 * plusMinus(), 10)),
        y: data.y + data.halfHeight + (parseInt(rnd(data.halfHeight) * 0.25 * (data.vY <= 0 ? -1 : 1), 10)),
        // if undefined or zero, allow smoke to go left or right
        // special handling for helicopters and turrets. this should be moved into config options.
        vX: (data.type === TYPES.helicopter ? rnd(1.5) * plusMinus() : -(data.vX || 0) + rnd(1.5) * (data.vX === undefined || data.vX === 0 ? plusMinus() : 1)),
        vY: (data.type === TYPES.helicopter || data.type === TYPES.turret ? rnd(-3) : -(data.vY || 0.25) + rnd(-2))
      }));

    },

    inertGunfireExplosion: function(options) {

      /* { count: int, exports: exports } */

      if (!options || !options.exports || !options.exports.data) return;

      var data = options.exports.data;

      if (!data.isOnScreen) return;

      // create some inert (harmless) gunfire, as decorative shrapnel.
      for (var i = 0, j = options.count || (3 + rndInt(1)); i < j; i++) {

        game.objects.gunfire.push(new GunFire({
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

    }

  };

  function bottomAlignedY(y) {

    // correct bottom-aligned Y value
    return 370 - 2 - (y || 0);

  }

  function makeSprite(options) {

    var o = document.createElement('div');

    o.className = 'sprite ' + options.className;

    if (!options.className.match(/transform-sprite|sub-sprite|terrain/i)) {
      o.style.top = '0px';
      o.style.left = '0px';
    }

    if (debugType) {
      o.innerHTML = options.className.replace(/sub-sprite/i, '');
      o.style.fontSize = '3px';
    }

    return o;

  }

  function makeTransformSprite(extraClass) {

    return makeSprite({
      className: 'transform-sprite' + (extraClass ? ' ' + extraClass : '')
    });

  }

  function makeSubSprite(extraClass) {

    return makeSprite({
      className: 'sub-sprite' + (extraClass ? ' ' + extraClass : '')
    });

  }

  var layoutCache = {};

  function addItem(className, x) {

    var node, data, dom, width, height, inCache, exports;

    node = makeSprite({
      className: className + ' terrain-item'
    });

    if (x) {
      common.setTransformXY(undefined, node, x + 'px', '0px');
    }
    
    if (layoutCache[className]) {
      inCache = true;
      width = layoutCache[className].width;
      height = layoutCache[className].height;
    }

    if (!inCache) {
      // append only so we can read layout
      game.dom.world.appendChild(node);
    }

    data = {
      type: className,
      x: x,
      y: 0,
      // dirty / lazy - force layout, read from CSS.
      width: width || node.offsetWidth,
      height: height || node.offsetHeight      
    };

    dom = {
      o: node
    };

    // basic structure for a terrain item
    exports = {
      data: data,
      dom: dom
    };

    if (!inCache) {
      // store
      layoutCache[className] = {
        width: data.width,
        height: data.height
      };

      // and now, remove; these will be re-appended when on-screen only.
      game.dom.world.removeChild(node);
    }

    // these will be tracked only for on-screen / off-screen purposes.
    game.objects.terrainItems.push(exports);

    return node;

  }

  function inheritCSS(options) {

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

  }

  function inheritData(data, options) {

    // mixin defaults, and apply common options

    options = options || {};

    // for quick object comparison
    if (data.id === undefined) {
      data.id = (options.id || guid++);
    }

    // assume not in view at first, used for DOM pruning / performance
    if (data.isOnScreen === undefined) {
      data.isOnScreen = false;
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

    // return mixin(defaultData, data);

  }

  /**
   * collision detection and related logic
   */

  function collisionCheck(point1, point2, point1XLookAhead) {

    /**
     * given x, y, width and height, determine if one object is overlapping another.
     * additional hacky param: X-axis offset for object. Used for cases where tanks etc. need to know when objects are nearby.
     * provided as an override because live objects are passed directly and can't be modified (eg., options.source.data.x += ...).
     * cloning these objects via mixin() works, but then lot of temporary objects are created, leading to increased garbage collection.
     */

    if (!point1 || !point2) {
      return null;
    }

    // given two boxes, check for intersects.
    // presume each object has x, y, width, height - otherwise, all hell will break loose.

    if (point2.x >= point1.x + point1XLookAhead) {

      // point 2 is to the right.

      if (point1.x + point1XLookAhead + point1.width >= point2.x) {

        // point 1 overlaps point 2 on x.
        // width = point2.x - (point1.x + point1XLookAhead + point1.width);

        if (point1.y < point2.y) {

          // point 1 is above point 2.

          if (point1.y + point1.height >= point2.y) {

            // point 1 overlaps point 2 on y.
            // height = point2.y - (point1.y + point1.h);
            return true;

          }

        } else {

          // height = (point2.y + point2.height) - point1.y;
          return (point1.y < point2.y + point2.height);

        }

      }

      // otherwise, point 1 is to the right.

    } else if (point2.x + point2.width >= point1.x + point1XLookAhead) {

      // point 2 overlaps point 1 on x.
      // width = point1.x - (point2.x + point1XLookAhead + point2.width);

      if (point2.y < point1.y) {

        // point 2 is above point 1.
        // height = point1.y - (point2.height + point2.y);
        return (point2.y + point2.height >= point1.y);

      } else {

        // point 2 is below point 1.
        // height = point2.y - (point1.y + point1.height);
        return (point1.y + point1.height >= point2.y);

      }

    } else {

      // no overlap, per checks.
      return false;

    }

  }

  function collisionCheckArray(options) {

    /**
     * options = {
     *   source: object (eg., game.objects.gunfire[0]);
     *   targets: array (eg., game.objects.tanks)
     * }
     */

    if (!options || !options.targets) {
      return false;
    }

    // don't check if the object is dead or inert. If expired, only allow the object if it's also "hostile" (can still hit things)
    if (options.source.data.dead || options.source.data.isInert || (options.source.data.expired && !options.source.data.hostile)) {
      return false;
    }

    var xLookAhead, foundHit;

    // is this a "lookahead" (nearby) case? buffer the x value, if so. Armed vehicles use this.

    if (options.useLookAhead) {

      // friendly things move further right, enemies move further left.

      // hackish: define "one-third width" only once.
      if (options.source.data.xLookAhead === undefined && options.source.data.widthOneThird === undefined) {
          options.source.data.widthOneThird = options.source.data.width * 0.33;
      }

      xLookAhead = Math.min(16, options.source.data.xLookAhead || options.source.data.widthOneThird);
      if (options.source.data.isEnemy) xLookAhead *= -1;

    } else {

      xLookAhead = 0;

    }

    for (var i = 0, j = options.targets.length; i < j; i++) {

      // non-standard formatting, lengthy logic check here...
      if (

        // don't compare the object against itself
        options.targets[i].data.id !== options.source.data.id

        // ignore dead options.targets (unless a turret, which can be reclaimed / repaired by engineers)
        && (
          !options.targets[i].data.dead
          || (options.targets[i].data.type === TYPES.turret && options.source.data.type === TYPES.infantry && options.source.data.role)
        )

        // more non-standard formatting....
        && (

          // don't check against friendly units by default, UNLESS looking only for friendly.
          ((options.friendlyOnly && options.targets[i].data.isEnemy === options.source.data.isEnemy) || (!options.friendlyOnly && options.targets[i].data.isEnemy !== options.source.data.isEnemy))

          // specific friendly cases: infantry vs. bunker, end-bunker, super-bunker or helicopter
          || (options.source.data.type === TYPES.infantry && options.targets[i].data.type === TYPES.bunker)

          || (options.targets[i].data.type === TYPES.infantry && (
            (options.source.data.type === TYPES.endBunker && !options.targets[i].data.role)
            || (options.source.data.type === TYPES.superBunker && !options.targets[i].data.role)
            || (options.source.data.type === TYPES.helicopter)
          ))

          // OR engineer vs. turret
          || (options.source.data.type === TYPES.infantry && options.source.data.role && options.targets[i].data.type === TYPES.turret)

          // OR we're dealing with a hostile or neutral object
          || (options.source.data.hostile || options.targets[i].data.hostile)
          || (options.source.data.isNeutral || options.targets[i].data.isNeutral)

        )

        // ignore if both objects are hostile, i.e., free-floating balloons (or missiles)
        && (
          (!options.source.data.hostile || !options.targets[i].data.hostile)
          || (options.source.data.hostile !== options.targets[i].data.hostile)
        )

      ) {

        // note special Super Bunker "negative look-ahead" case - detects helicopter on both sides.
        if (
          collisionCheck(options.source.data, options.targets[i].data, xLookAhead)
          || (options.targets[i].data.type === TYPES.helicopter && collisionCheck(options.source.data, options.targets[i].data, -xLookAhead))
        ) {

          foundHit = true;

          if (options.hit) {
            options.hit(options.targets[i]);
            // update energy?
            updateEnergy(options.targets[i]);
          }

        }

      }

    }

    return foundHit;

  }

  function collisionTest(collision, exports) {

    // don't do collision detection during game-over sequence.
    if (battleOver) {
      // restore to original state
      collision.targets = null;
      return;
    }

    var i, j;

    // hack: first-time run fix, as exports is initially undefined
    if (!collision.options.source) {
      collision.options.source = exports;
    }

    // loop through relevant game object arrays
    for (i = 0, j = collision.items.length; i < j; i++) {

      // eliminated mixin() here, perhaps reduce object creation / GC?

      // assign current targets...
      collision.options.targets = game.objects[collision.items[i]];

      // ... and check them
      collisionCheckArray(collision.options);

    }

    // restore to original state
    collision.targets = null;

  }

  function collisionCheckMidPoint(obj1, obj2) {

    // infantry-at-midpoint (bunker or helicopter) case
    return collisionCheck(obj1.data.midPoint, obj2.data, 0);

  }

  function trackObject(source, target) {

    // given a source object (the helicopter) and a target, return the relevant vX / vY delta to get progressively closer to the target.

    var deltaX, deltaY, result;

    deltaX = (target.data.x + target.data.halfWidth) - (source.data.x + source.data.halfWidth);

    // by default, offset target to one side of a balloon.

    if (target.data.type === TYPES.tank) {

      // hack: bomb from high up.
      deltaY = (40 + target.data.halfHeight) - (source.data.y + source.data.halfHeight);

    } else {

      deltaY = (target.data.y + target.data.halfHeight) - (source.data.y + source.data.halfHeight);

    }

    result = {
      deltaX: deltaX,
      deltaY: deltaY
    };

    return result;

  }

  function getNearestObject(source, options) {

    // given a source object (the helicopter), find the nearest enemy in front of the source - dependent on X axis + facing direction.

    var i, j, k, l, itemArray, items, localObjects, targetData, preferGround, isInFront, useInFront, totalDistance;

    options = options || {};

    useInFront = !!options.useInFront;

    // should a smart missile be able to target another smart missile? ... why not.
    items = (options.items || ['tanks', 'vans', 'missileLaunchers', 'helicopters', 'bunkers', 'balloons', 'smartMissiles', 'turrets']);

    localObjects = [];

    // if the source object isn't near the ground, be biased toward airborne items.
    if (source.data.type === TYPES.helicopter && source.data.y > worldHeight - 100) {
      preferGround = true;
    }

    for (i = 0, j = items.length; i < j; i++) {

      itemArray = game.objects[items[i]];

      for (k = 0, l = itemArray.length; k < l; k++) {

        // potential target: not dead, and an enemy
        if (!itemArray[k].data.dead && itemArray[k].data.isEnemy !== source.data.isEnemy) {

          // is the target in front of the source?
          isInFront = (itemArray[k].data.x >= source.data.x);

          // [revised] - is the target within an acceptable range?
          // isInFront = (itemArray[k].data.x >= source.data.x || itemArray[k].data.x - source.data.x > -100);

          // additionally: is the helicopter pointed at the thing, and is it "in front" of the helicopter?
          if (!useInFront || (useInFront && ((!source.data.rotated && isInFront) || (source.data.rotated && !isInFront)))) {

            targetData = itemArray[k].data;

            if (
              (preferGround && targetData.bottomAligned && targetData.type !== TYPES.balloon)
              || (!preferGround && (!targetData.bottomAligned || targetData.type === TYPES.balloon))
            ) {

              totalDistance = Math.abs(Math.abs(targetData.x) - Math.abs(source.data.x));

              // "within range"
              if (totalDistance < 3072) {

                localObjects.push({
                  obj: itemArray[k],
                  totalDistance: totalDistance
                });

              }

            }

          }

        }

      }

    }

    if (!localObjects.length) return null;

    // sort by distance
    localObjects.sort(utils.array.compare('totalDistance'));

    // TODO: review and remove ugly hack here - enemy helicopter gets reverse-order logic.
    return localObjects[source.data.type === TYPES.helicopter && source.data.isEnemy ? localObjects.length - 1 : 0].obj;

  }

  function objectInView(data, options) {

    // unrelated to other nearby functions: test if an object is on-screen (or slightly off-screen),
    // alive, either enemy or friendly (depending on option), not cloaked, and within range.

    var i, j, items, result;

    options = options || {};

    // defaults
    options.triggerDistance = options.triggerDistance || game.objects.view.data.browser.twoThirdsWidth;
    options.friendlyOnly = !!options.friendlyOnly;

    items = game.objects[(options.items || 'helicopters')];

    for (i = 0, j = items.length; i < j; i++) {
      if (
        !items[i].data.dead
        && !items[i].data.cloaked
        && (options.friendlyOnly ? data.isEnemy === items[i].data.isEnemy : (data.isEnemy !== items[i].data.isEnemy || items[i].data.isNeutral))
        && Math.abs(items[i].data.x - data.x) < options.triggerDistance
      ) {
        result = items[i];
        break;
      }
    }

    return result;

  }

  function isOnScreen(target) {

    // is the target within the range of screen coordinates?
    return (
      target
      && target.data
      && (target.data.x + target.data.width) >= game.objects.view.data.battleField.scrollLeft
      && target.data.x < game.objects.view.data.battleField.scrollLeftWithBrowserWidth
    );

  }

  function initNearby(nearby, exports) {

    // map options.source -> exports
    nearby.options.source = exports;

  }

  function nearbyTest(nearby) {

    var i, j, foundHit;

    // loop through relevant game object arrays
    // TODO: revisit for object creation / garbage collection improvements
    for (i = 0, j = nearby.items.length; i < j; i++) {

      // assign current targets...
      nearby.options.targets = game.objects[nearby.items[i]];

      // ... and check them
      if (collisionCheckArray(nearby.options)) {
        foundHit = true;
        break;
      }

    }

    // reset
    nearby.options.targets = null;

    // callback for no-hit case, too
    if (!foundHit && nearby.options.miss) {
      nearby.options.miss(nearby.options.source);
    }

  }

  function enemyNearby(data, targets, triggerDistance) {

    var i, j, k, l, targetData, results;

    results = [];

    // "targets" is an array of class types, e.g., tank, missileLauncher etc.

    for (i = 0, j = targets.length; i < j; i++) {

      for (k = 0, l = game.objects[targets[i]].length; k < l; k++) {

        targetData = game.objects[targets[i]][k].data;

        // non-friendly, not dead, and nearby?
        if (targetData.isEnemy !== data.isEnemy && !targetData.dead) {
          if (Math.abs(targetData.x - data.x) < triggerDistance) {
            results.push(game.objects[targets[i]][k]);
          }
        }

      }

    }

    return results;

  }

  function enemyHelicopterNearby(data, triggerDistance) {

    var i, j, result;

    // by default
    triggerDistance = triggerDistance || game.objects.view.data.browser.twoThirdsWidth;

    for (i = 0, j = game.objects.helicopters.length; i < j; i++) {

      // not cloaked, not dead, and an enemy?
      if (!game.objects.helicopters[i].data.cloaked && !game.objects.helicopters[i].data.dead && data.isEnemy !== game.objects.helicopters[i].data.isEnemy) {

        // how far away is the target?
        if (Math.abs(game.objects.helicopters[i].data.x - data.x) < triggerDistance) {
          result = game.objects.helicopters[i];
          break;
        }

      }

    }

    return result;

  }

  function getDoorCoords(obj) {

    // for special collision check case with bunkers

    var door = {
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

  }

  function recycleTest(obj) {

    // did a unit reach the other side? destroy the unit, and reward the player with credits.
    var doRecycle, isEnemy, costObj, refund, type;

    isEnemy = obj.data.isEnemy;

    if (!obj || obj.data.dead || obj.data.isRecycling) return;

    if (isEnemy) {
      // slightly left of player's base
      doRecycle = obj.data.x <= -48;
    } else {
      doRecycle = obj.data.x >= worldWidth;
    }

    if (doRecycle) {

      obj.data.isRecycling = true;

      // animate down, back into the depths from whence it came
      utils.css.remove(obj.dom.o, 'ordering');
      utils.css.add(obj.dom.o, 'recycling');

      // ensure 'building' is set, as well. "pre-existing" game units will not have this.
      setFrameTimeout(function() {
        utils.css.add(obj.dom.o, 'building');
      }, 16);

      setFrameTimeout(function() {
        // die silently, and go away.
        obj.die({ silent: true});

        // tank, infantry etc., or special-case: engineer.
        type = obj.data.role ? obj.data.roles[obj.data.role] : obj.data.type;

        // special case: infantry may have been dropped by player, or when helicopter exploded.
        // exclude those from being "refunded" at all, given player was involved in their move.
        // minor: players could collect and drop infantry near enemy base, and collect refunds.
        if (type === TYPES.infantry && !obj.data.unassisted) return;

        costObj = COSTS[TYPES[type]];

        // reward player for their good work. 200% return on "per-item" cost.
        // e.g., tank cost = 4 credits, return = 8. for 5 infantry, 10.
        refund = (costObj.funds / (costObj.count || 1) * 2);

        game.objects.endBunkers[isEnemy ? 1 : 0].data.funds += refund;
        
        if (!isEnemy) {
          // notify player that a unit has been recycled?
          game.objects.notifications.add('+' + refund + ' 💰: recycled ' + type + ' ♻️');
          game.objects.funds.setFunds(game.objects.endBunkers[0].data.funds);
          game.objects.view.updateFundsUI();
        }

      }, 2000);

    }

  }

  function countSides(objectType, includeDead) {

    var i, j, result;

    result = {
      friendly: 0,
      enemy: 0
    };

    if (!game.objects[objectType]) return result;

    for (i = 0, j = game.objects[objectType].length; i < j; i++) {
      if (!game.objects[objectType][i].data.dead) {
        if (game.objects[objectType][i].data.isEnemy || game.objects[objectType][i].data.hostile) {
          result.enemy++;
        } else {
          result.friendly++;
        }
      } else if (includeDead) {
        // things that are dead are considered harmless - therefore, friendly.
        result.friendly++;
      }
    }

    return result;

  }

  function countFriendly(objectType, includeDead) {

    includeDead = (includeDead || false);

    return countSides(objectType, includeDead).friendly;

  }

  function playerOwnsBunkers() {

    // has the player captured (or destroyed) all bunkers? this may affect enemy convoy production.
    var owned, total;

    owned = countFriendly('bunkers', true) + countFriendly('superBunkers', true);
    total = game.objects.bunkers.length + game.objects.superBunkers.length;

    return (owned >= total);

  }

  function checkProduction() {

    var bunkersOwned, announcement;

    // playing extreme mode? this benefit would practically be cheating! ;)
    if (gameType === 'extreme') return;

    bunkersOwned = playerOwnsBunkers();

    if (!productionHalted && bunkersOwned) {

      // player is doing well; reward them for their efforts.
      announcement = '🎉 You have captured all bunkers. Enemy convoy production has been halted. 🚫';
      productionHalted = true;

    } else if (productionHalted && !bunkersOwned) {

      // CPU has regained control of a bunker.
      announcement = '😰 You no longer control all bunkers. Enemy convoy production is resuming. 🛠️';
      productionHalted = false;

    }

    if (announcement) {
      game.objects.view.setAnnouncement(announcement);
      game.objects.notifications.add(announcement);
    }

  }

  function getSound(soundReference) {

    if (userDisabledSound) return;

    // common sound wrapper, options for positioning and muting etc.
    var soundObject;

    // multiple sound case
    if (soundReference instanceof Array) {

      // tack on a counter for multiple sounds
      if (soundReference.soundOffset === undefined) {
        soundReference.soundOffset = 0;
      }

      // mark this object
      soundObject = soundReference[soundReference.soundOffset];

      // increase, and reset the counter as necessary
      soundReference.soundOffset++;

      if (soundReference.soundOffset >= soundReference.length) {

        // re-shuffle the array, randomize a little
        soundReference = utils.array.shuffle(soundReference);
        soundReference.soundOffset = 0;

      }

    } else {

      soundObject = soundReference;

    }

    /**
     * hackish: create and destroy SMSound instances once they finish playing,
     * unless they have an `onfinish()` provided. this is to avoid hitting a
     * a very reasonable Chrome restriction on the maximum number of active
     * audio decoders, as they're relatively $$$ and browsers may now block.
     * https://bugs.chromium.org/p/chromium/issues/detail?id=1144736#c27
     */
    if (soundObject && !soundObject.sound) {
      // make it happen! if not needed, throw away when finished.
      soundObject.options.id = 's' + soundIDs + '_' + soundObject.options.url;
      soundIDs++;

      if (!soundObject.options.onfinish) {

        soundObject.onAASoundEnd = function() {
          if (!soundObject.sound) return;
          soundManager.destroySound(soundObject.sound.id);
          soundObject.sound = null;
        }

        // SM2 will call this method, as will others locally
        soundObject.options.onfinish = soundObject.onAASoundEnd;
      }

      soundObject.sound = soundManager.createSound(soundObject.options);
    }

    return soundObject;

  }

  var soundIDs = 0;

  var soundsToPlay = [];

  function playQueuedSounds() {
    // empty queue
    for (var i=0, j=soundsToPlay.length; i<j; i++) {
      if (soundsToPlay[i] && soundsToPlay[i].soundObject && soundsToPlay[i].soundObject.sound) {
        soundsToPlay[i].soundObject.sound.play(soundsToPlay[i].localOptions);

        // TODO: Determine why setVolume() call is needed when playing or re-playing actively-playing HTML5 sounds instead of options. Possible SM2 bug.
        // ex: actively-firing turret offscreen, moves on-screen - sound volume does not change.
        soundsToPlay[i].soundObject.sound.setVolume(soundsToPlay[i].localOptions.volume);
      }
    }

    // reset, instead of creating a new array object
    soundsToPlay.length = 0;
  }

  function getVolumeFromDistance(obj1, obj2) {
    // based on two objects' distance from each other, return volume -
    // e.g., things far away are quiet, things close-up are loud
    if (!obj1 || !obj2) return 100;

    var delta = Math.abs(obj1.data.x - obj2.data.x);

    // volume range: 5-30%?
    return (0.05 + (0.25 * ((worldWidth - delta) / worldWidth)));
  }

  function playSound(soundReference, target, soundOptions) {

    var soundObject = getSound(soundReference),
      localOptions,
      onScreen;

    // just in case
    if (!soundObject || !soundObject.sound) return null;

    if (userDisabledSound) return soundObject.sound;

    // TODO: revisit on-screen logic, drop the function call
    onScreen = (!target || isOnScreen(target));
    // onScreen = (target && target.data && target.data.isOnScreen);
    
    // old: determine volume based on on/off-screen status
    // localOptions = soundObject.soundOptions[onScreen ? 'onScreen' : 'offScreen'];

    // new: calculate volume as range based on distance
    if (onScreen) {
      localOptions = soundObject.soundOptions.onScreen;
    } else {
      // determine volume based on distance
      localOptions = {
        volume: (soundObject.soundOptions.onScreen.volume || 100) * getVolumeFromDistance(target, game.objects.helicopters[0])
      };
    }

    if (soundOptions) {
      localOptions = mixin(localOptions, soundOptions);
    }
      
    // 01/2021: push sound calls off to next frame to be played in a batch,
    // trade-off of slight async vs. blocking(?) current frame
    soundsToPlay.push({
      soundObject: soundObject,
      localOptions: localOptions
    });

    return soundObject.sound;

  }

  function playSoundWithDelay() {

    var args, delay;

    args = Array.prototype.slice.call(arguments);

    // modify args, and store last argument if it looks like a number.
    if (!isNaN(args[args.length - 1])) {
      delay = args.pop();
    }

    if (!delay || isNaN(delay)) {
      delay = 500;
    }

    setFrameTimeout(function() {
      playSound.apply(this, args);
    }, delay);

  }

  function playRepairingWrench(isRepairing, exports) {

    var args = arguments;

    if (!isRepairing()) return;

    // slightly hackish: dynamic property on exports.
    if (!exports.repairingWrenchTimer) {

      // flag immediately, so subsequent immediate calls only trigger once
      exports.repairingWrenchTimer = true;

      playSound(sounds.repairingWrench, exports, {
        onfinish: function() {
          exports.repairingWrenchTimer = setFrameTimeout(function() {
            exports.repairingWrenchTimer = null;
            if (isRepairing()) {
              playRepairingWrench.apply(this, args);
            }
          }, 1000 + rndInt(2000));
        }
      });

    }

  }

  function playImpactWrench(isRepairing, exports) {

    var args = arguments;

    if (!isRepairing()) return;

    // slightly hackish: dynamic property on exports.
    if (!exports.impactWrenchTimer) {

      // flag immediately, so subsequent immediate calls only trigger once
      exports.impactWrenchTimer = true;

      playSound(sounds.impactWrench, exports, {
        onfinish: function() {
          exports.impactWrenchTimer = setFrameTimeout(function() {
            exports.impactWrenchTimer = null;
            if (isRepairing()) {
              playImpactWrench.apply(this, args);
            }
          }, 500 + rndInt(2000));
        }
      });

    }

  }

  function playTinkerWrench(isRepairing, exports) {

    var args = arguments;

    playSound(sounds.tinkerWrench, exports, {
      position: rndInt(8000),
      onfinish: function() {
        if (isRepairing()) {
          playTinkerWrench.apply(this, args);
        }
      }
    });

  }

  /**
   * sound effects
   */

  sounds = {
    // associate certain sounds with inventory / object types
    types: {
      metalHit: [TYPES.tank, TYPES.van, TYPES.missileLauncher, TYPES.bunker, TYPES.superBunker, TYPES.turret],
      genericSplat: [TYPES.engineer,TYPES.infantry,TYPES.parachuteInfantry],
    },
    // sound configuration
    helicopter: {
      bomb: null,
      engine: null,
      engineVolume: 25,
      rotate: null
    },
    inventory: {
      begin: null,
      credit: null,
      debit: null,
      end: null,
    },
    shrapnel: {
      counter: 0,
      counterMax: 4,
      hit0: null,
      hit1: null,
      hit2: null,
      hit3: null
    },
    rubberChicken: {
      launch: null,
      expire: null,
      die: null
    },
    machineGunFire: null,
    machineGunFireEnd: null
    // numerous others will be assigned at init time.
  };

  function getURL(file) {

    // SM2 will determine the appropriate format to play, based on client support.
    // URL pattern -> array of .ogg and .mp3 URLs
    return [
      'audio/mp3/' + file + '.mp3',
      'audio/ogg/' + file + '.ogg',
      'audio/wav/' + file + '.wav'
    ];

  }

  function addSound(options) {

    return {
      // sound object is now deferred until play(), which itself is now queued.
      sound: null,
      options: options,
      soundOptions: {
        onScreen: {
          volume: options.volume || DEFAULT_VOLUME
        },
        offScreen: {
          // off-screen sounds are more quiet.
          volume: parseInt((options.volume || DEFAULT_VOLUME) / 4, 10)
        }
      }
    };

  }

  soundManager.onready(function() {

    var i;

    sounds.machineGunFire = [];

    for (i = 0; i < 9; i++) {
      sounds.machineGunFire.push(addSound({
        url: getURL('machinegun-' + (i + 1)),
        volume: 33
      }));
    }

    sounds.machineGunFireEnd = addSound({
      url: getURL('machinegun-end'),
    });

    sounds.bombHatch = [];

    sounds.bombHatch.push(addSound({
      // hat tip to the Death Adder for this one. ;)
      url: getURL('ga-typewriter'),
      volume: 33
    }));

    sounds.impactWrench = [];

    sounds.impactWrench.push(addSound({
      // http://freesound.org/people/andrewgnau2/sounds/71534/
      url: getURL('impact-wrench-1'),
      volume: 10
    }));

    sounds.impactWrench.push(addSound({
      url: getURL('impact-wrench-2'),
      volume: 10
    }));

    sounds.impactWrench.push(addSound({
      url: getURL('impact-wrench-3'),
      volume: 10
    }));

    sounds.chainRepair = [];

    // https://freesound.org/people/jorickhoofd/sounds/160048/
    sounds.chainRepair.push(addSound({
      url: getURL('heavy-mechanics'),
      volume: 25
    }));

    sounds.repairingWrench = [];

    // http://freesound.org/people/TheGertz/sounds/131200/
    sounds.repairingWrench.push(addSound({
      url: getURL('socket-wrench-1'),
      volume: 10
    }));

    // http://freesound.org/people/xxqmanxx/sounds/147018/
    sounds.repairingWrench.push(addSound({
      url: getURL('socket-wrench-2'),
      volume: 10
    }));

    sounds.repairingWrench.push(addSound({
      url: getURL('socket-wrench-3'),
      volume: 10
    }));

    sounds.tinkerWrench = addSound({
      // http://freesound.org/people/klankbeeld/sounds/198299/
      url: getURL('tinker-wrench'),
      multiShot: false,
      volume: 20
    });

    sounds.friendlyClaim = addSound({
      // http://freesound.org/people/Carlos_Vaquero/sounds/153616/
      url: getURL('violin-c5-pizzicato-non-vibrato'),
      volume: 8
    });

    sounds.enemyClaim = addSound({
      // http://freesound.org/people/Carlos_Vaquero/sounds/153611/
      url: getURL('violin-g4-pizzicato-non-vibrato'),
      volume: 8
    });

    sounds.popSound = addSound({
      // used when picking up infantry + engineers, and restoring turrets
      // http://freesound.org/people/SunnySideSound/sounds/67095/
      url: getURL('popsound1'),
      volume: 10
    });

    sounds.popSound2 = addSound({
      // used when deploying parachute infantry
      // http://freesound.org/people/runirasmussen/sounds/178446/
      url: getURL('popsound2'),
      volume: 10
    });

    sounds.crashAndGlass = addSound({
      // http://freesound.org/people/Rock%20Savage/sounds/59263/
      url: getURL('crash-glass')
    });

    sounds.balloonExplosion = addSound({
      url: getURL('balloon-explosion'),
      volume: 20
    });

    sounds.baseExplosion = addSound({
      // two sounds, edited and mixed together
      // https://freesound.org/people/FxKid2/sounds/367622/
      // https://freesound.org/people/Quaker540/sounds/245372/
      url: getURL('hq-explosion-with-debris')
    });

    sounds.genericSplat = [];

    // http://freesound.org/people/FreqMan/sounds/42962/
    for (i = 0; i < 2; i++) {
      sounds.genericSplat.push(addSound({
        url: getURL('splat1'),
        volume: 15
      }));
      sounds.genericSplat.push(addSound({
        url: getURL('splat2'),
        volume: 15
      }));
      sounds.genericSplat.push(addSound({
        url: getURL('splat3'),
        volume: 15
      }));
    }

    sounds.genericSplat = utils.array.shuffle(sounds.genericSplat);

    sounds.scream = [];

    for (i = 0; i < 2; i++) {
      sounds.scream.push(addSound({
        url: getURL('scream1'),
        volume: 9
      }));
      sounds.scream.push(addSound({
        url: getURL('scream2'),
        volume: 9
      }));
      sounds.scream.push(addSound({
        url: getURL('scream3'),
        volume: 9
      }));
      sounds.scream.push(addSound({
        url: getURL('scream4'),
        volume: 9
      }));
      sounds.scream.push(addSound({
        url: getURL('scream5'),
        volume: 9
      }));
    }

    sounds.scream = utils.array.shuffle(sounds.scream);

    sounds.genericBoom = [];

    for (i = 0; i < 4; i++) {
      sounds.genericBoom.push(addSound({
        url: getURL('explosion'),
        volume: 45
      }));
    }

    sounds.genericExplosion = [];

    sounds.genericExplosion.push(addSound({
      url: getURL('generic-explosion'),
      volume: 18
    }));

    sounds.genericExplosion.push(addSound({
      url: getURL('generic-explosion-2'),
      volume: 18
    }));

    sounds.genericExplosion.push(addSound({
      url: getURL('generic-explosion-3'),
      volume: 18
    }));

    sounds.genericGunFire = [];

    for (i = 0; i < 8; i++) {
      sounds.genericGunFire.push(addSound({
        url: getURL('generic-gunfire'),
        // multiShot: isChrome,
        volume: 25
      }));
    }

    sounds.infantryGunFire = [
      addSound({
        url: getURL('infantry-gunfire'),
        volume: 20
      }),
      addSound({
        url: getURL('infantry-gunfire'),
        volume: 20
      })
    ];

    sounds.turretGunFire = [];

    for (i = 0; i < 8; i++) {
      sounds.turretGunFire.push(addSound({
        url: getURL('turret-gunfire'),
        volume: 60
      }));
    }

    // http://freesound.org/people/ceberation/sounds/235513/
    sounds.doorClose = addSound({
      url: getURL('door-closing'),
      volume: 12
    });

    // http://freesound.org/people/Tiger_v15/sounds/211015/
    sounds.metalHitBreak = addSound({
      url: getURL('metal-hit-break'),
      volume: 12
    });

    sounds.boloTank = [];

    // Bolo "hit tank self" sound, Copyright (C) Steuart Cheshire 1993.
    // A subtle tribute to my favourite Mac game of all-time, hands down. <3
    // https://en.wikipedia.org/wiki/Bolo_(1987_video_game)
    // http://bolo.net/
    // https://github.com/stephank/orona/
    // http://web.archive.org/web/20170105114652/https://code.google.com/archive/p/winbolo/
    for (i = 0; i < 8; i++) {
      sounds.boloTank.push(addSound({
        url: getURL('bolo-hit-tank-self'),
        volume: 25
      }));
    }

    sounds.tankGunFire = [];

    // "Tank fire Mixed.wav" by Cyberkineticfilms (CC0 License, “No Rights Reserved”)
    // https://freesound.org/people/Cyberkineticfilms/sounds/127845/
    for (i = 0; i < 8; i++) {
      sounds.tankGunFire.push(addSound({
        url: getURL('tank-gunfire'),
        volume: 15
      }));
    }

    sounds.metalHit = [];

    sounds.metalHitLight = [];

    for (i = 0; i < 4; i++) {

      // http://freesound.org/people/Tiger_v15/sounds/211015/
      sounds.metalHit.push(addSound({
        url: getURL('metal-hit-1'),
        volume: 5
      }));

      sounds.metalHit.push(addSound({
        url: getURL('metal-hit-2'),
        volume: 5
      }));

      sounds.metalHit.push(addSound({
        url: getURL('metal-hit-3'),
        volume: 5
      }));

      sounds.metalHit.push(addSound({
        url: getURL('metal-hit-4'),
        volume: 5
      }));

      sounds.metalHit.push(addSound({
        url: getURL('metal-hit-5'),
        volume: 5
      }));

      // http://freesound.org/people/dheming/sounds/197398/
      sounds.metalHitLight.push(addSound({
        url: getURL('metal-hit-light-1'),
        volume: 8
      }));

      sounds.metalHitLight.push(addSound({
        url: getURL('metal-hit-light-2'),
        volume: 8
      }));

      sounds.metalHitLight.push(addSound({
        url: getURL('metal-hit-light-3'),
        volume: 8
      }));

      sounds.metalHitLight.push(addSound({
        url: getURL('metal-hit-light-4'),
        volume: 8
      }));

      sounds.metalHitLight.push(addSound({
        url: getURL('metal-hit-light-5'),
        volume: 8
      }));

    }

    sounds.explosionLarge = addSound({
      url: getURL('explosion-large'),
      // will result in GC, but perhaps an exception for this special case
      multiShot: true,
      volume: 60
    });

    sounds.chainSnapping = addSound({
      url: getURL('chain-snapping'),
      volume: 15
    });

    sounds.wilhemScream = addSound({
      url: getURL('wilhem-scream'),
      volume: 20
    });

    sounds.helicopter.engine = addSound({
      url: getURL('helicopter-engine'),
      volume: 25,
      loops: 999
    });

    sounds.helicopter.rotate = addSound({
      url: getURL('helicopter-rotate'),
      volume: 10
    });

    sounds.inventory.denied = addSound({
      url: getURL('order-denied')
    });

    sounds.inventory.begin = addSound({
      url: getURL('order-start'),
      volume: 30
    });

    sounds.inventory.debit = addSound({
      url: getURL('funds-debit'),
      volume: 50,
    });

    sounds.inventory.credit = addSound({
      url: getURL('funds-credit'),
      volume: 60,
    });

    sounds.inventory.end = addSound({
      url: getURL('order-complete'),
      volume: 10
    });

    sounds.missileLaunch = addSound({
      url: getURL('missile-launch')
    });

    sounds.parachuteOpen = addSound({
      url: getURL('parachute-open'),
      volume: 25
    });

    sounds.shrapnel.hit0 = addSound({
      url: getURL('shrapnel-hit'),
      volume: 7
    });

    sounds.shrapnel.hit1 = addSound({
      url: getURL('shrapnel-hit-2'),
      volume: 7
    });

    sounds.shrapnel.hit2 = addSound({
      url: getURL('shrapnel-hit-3'),
      volume: 7
    });

    sounds.shrapnel.hit3 = addSound({
      url: getURL('shrapnel-hit-4'),
      volume: 7
    });

    sounds.splat = addSound({
      url: getURL('splat'),
      volume: 25
    });

    sounds.radarStatic = addSound({
      url: getURL('radar-static'),
      volume: 40
    });

    sounds.radarJamming = addSound({
      url: getURL('radar-jamming'),
      volume: 33
    });

    sounds.repairing = addSound({
      url: getURL('repairing'),
      volume: 75,
      loops: 999
    });

    sounds.rubberChicken.launch = [];

    sounds.rubberChicken.launch.push(addSound({
      url: getURL('rubber-chicken-launch-1'),
      volume: 20
    }));

    sounds.rubberChicken.launch.push(addSound({
      url: getURL('rubber-chicken-launch-2'),
      volume: 20
    }));

    sounds.rubberChicken.launch.push(addSound({
      url: getURL('rubber-chicken-launch-3'),
      volume: 20
    }));

    // randomize order a little
    sounds.rubberChicken.launch = utils.array.shuffle(sounds.rubberChicken.launch);

    sounds.rubberChicken.expire = addSound({
      url: getURL('rubber-chicken-expire'),
      volume: 30
    });

    sounds.rubberChicken.die = [];

    sounds.rubberChicken.die.push(addSound({
      url: getURL('rubber-chicken-hit-1'),
      volume: 20
    }));

    sounds.rubberChicken.die.push(addSound({
      url: getURL('rubber-chicken-hit-2'),
      volume: 20
    }));

    sounds.rubberChicken.die.push(addSound({
      url: getURL('rubber-chicken-hit-3'),
      volume: 20
    }));

    sounds.rubberChicken.die.push(addSound({
      url: getURL('rubber-chicken-hit-4'),
      volume: 20
    }));

    // randomize order a little
    sounds.rubberChicken.die = utils.array.shuffle(sounds.rubberChicken.die);


  });

  function Joystick(options) {

    var css, data, dom, exports;

    css = {
      joystick: 'joystick',
      joystickPoint: 'joystick-point',
      active: 'joystick-active'
    };

    data = {
      active: false,
      oJoystickWidth: null,
      oJoystickHeight: null,
      oPointWidth: null,
      oPointHeight: null,
      oPointer: null,
      start: {
        x: null,
        y: null
      },
      move: {
        x: null,
        y: null,
      },
      inertia: {
        vX: 0,
        vY: 0,
      },
      pointer: {
        // percentages
        x: 50,
        y: 50,
      },
      // linear acceleration / deceleration
      easing: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
      tweenFrame: 0,
      tweenFrames: [],
    };

    dom = {
      o: null,
      oJoystick: null,
      oPoint: null,
    };

    var getEvent = function(e) {
      // TODO: improve normalization of touch events.
      var evt = (e.changedTouches && e.changedTouches[e.changedTouches.length - 1]) || e;
      return evt;
    };

    function moveContainerTo(x, y) {
      var targetX = x - (data.oJoystickWidth / 2);
      var targetY = y - (data.oJoystickHeight / 2);
      dom.oJoystick.style.left = targetX + 'px';
      dom.oJoystick.style.top = targetY + 'px';
    }

    function resetPoint() {
      dom.oPoint.style.left = '50%';
      dom.oPoint.style.top = '50%';
    }

    function start(e) {
      data.active = true;

      var evt = getEvent(e);

      data.start.x = evt.clientX;
      data.start.y = evt.clientY;

      // reposition joystick underneath mouse coords
      moveContainerTo(data.start.x, data.start.y);

      // re-center the "nub".
      resetPoint();

      // show joystick UI
      utils.css.add(dom.oJoystick, css.active);

      // stop touch from causing scroll, too?
      e.preventDefault();

    }

    function makeTweenFrames(from, to) {

      var frames = [];

      // distance to move in total
      var deltaX = to.x - from.x;
      var deltaY = to.y - from.y;

      // local copy of start coords, track position
      var x = parseFloat(from.x);
      var y = parseFloat(from.y);

      // create array of x/y coordinates
      for (var i = 0, j = data.easing.length; i < j; i++) {
        // move % of total distance
        x += (deltaX * data.easing[i] * 0.01);
        y += (deltaY * data.easing[i] * 0.01);
        frames[i] = {
          x: x,
          y: y
        };
      }

      return frames;

    }

    function distance(p1, p2) {
      var x1, y1, x2, y2;
      x1 = p1[0];
      y1 = p1[1];
      x2 = p2[0];
      y2 = p2[1];
      // eslint recommends exponentation ** vs. Math.pow(), but ** is Chrome 52+ and not even in IE AFAIK. 😂
      // eslint-disable-next-line no-restricted-properties
      return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }

    // circle math hat-tip: duopixel
    // https://stackoverflow.com/a/8528999

    function limit(x, y) {
      var halfWidth = data.oJoystickWidth / 2;
      var halfHeight = data.oJoystickHeight / 2;
      var radius = halfWidth;
      var center = [halfWidth, halfHeight];
      var dist = distance([x, y], center);

      if (dist <= radius) {
        return {
          x: x,
          y: y
        };
      }

      x -= center[0];
      y -= center[1];

      var radians = Math.atan2(y, x);

      return {
        x: (Math.cos(radians) * radius) + center[0],
        y: (Math.sin(radians) * radius) + center[1]
      };

    }

    function movePoint(x, y) {
      dom.oPoint.style.left = x + '%';
      dom.oPoint.style.top = y + '%';
    }

    function setDirection(x, y) {

      var from = {
        x: (data.pointer.x / 100) * game.objects.view.data.browser.width,
        y: (data.pointer.y / 100) * game.objects.view.data.browser.height
      };

      // x/y are relative to screen
      var to = {
        x: (x / 100) * game.objects.view.data.browser.width,
        y: (y / 100) * game.objects.view.data.browser.height
      };

      data.tweenFrames = makeTweenFrames(from, to);

      // tween can change while animating, i.e. mouse constantly moving.
      // update tween in-place, when this happens.
      if (data.tweenFrame >= data.tweenFrames.length) {
        // console.log('resetting tweenFrame', data.tweenFrame);
        data.tweenFrame = 0;
      } else if (data.tweenFrame > 5) {
        // allow tween to "rewind" slightly, but stay on upward motion curve.
        // this keeps motion relatively fast during repeated touchmove() events.
        data.tweenFrame--;
      }

    }

    function move(e) {
      // ignore if joystick isn't being dragged.
      if (!data.active) return;

      var evt = getEvent(e);

      var halfWidth = data.oJoystickWidth / 2;
      var halfHeight = data.oJoystickHeight / 2;

      // calculate, limit between 0 and width/height.
      var relativeX = Math.max(0, Math.min(halfWidth - (data.start.x - evt.clientX), data.oJoystickWidth));
      var relativeY = Math.max(0, Math.min(halfHeight - (data.start.y - evt.clientY), data.oJoystickHeight));

      var coords = limit(relativeX, relativeY);

      // limit point to circle coordinates.
      movePoint(coords.x, coords.y);

      // set relative velocities based on square.
      setDirection(relativeX, relativeY);

    }

    function end() {
      if (data.active) {
        utils.css.remove(dom.oJoystick, css.active);
        data.tweenFrame = 0;
        data.active = false;
      }
    }

    function refresh() {
      data.oJoystickWidth = dom.oJoystick.offsetWidth;
      data.oJoystickHeight = dom.oJoystick.offsetHeight;
      data.oPointWidth = dom.oPoint.offsetWidth;
      data.oPointHeight = dom.oPoint.offsetHeight;
    }

    function addEvents() {

      // for testing from desktop
      if (debug) {
        utils.events.add(document, 'mousedown', start);
        utils.events.add(document, 'mousemove', move);
        utils.events.add(document, 'mouseup', end);
      }

      utils.events.add(window, 'resize', refresh);

    }

    function initDOM() {
      // create joystick and inner point.
      dom.o = (options && options.o) || document.body;

      dom.oPointer = document.getElementById('pointer');

      var oJoystick = document.createElement('div');
      oJoystick.className = css.joystick;

      var oPoint = document.createElement('div');
      oPoint.className = css.joystickPoint;

      oJoystick.appendChild(oPoint);

      dom.o.appendChild(oJoystick);

      dom.oJoystick = oJoystick;
      dom.oPoint = oPoint;

    }

    function animate() {

      // only move if joystick is active.
      // i.e., stop any animation on release.
      if (!data.active) return;

      var frame = data.tweenFrames && data.tweenFrames[data.tweenFrame];

      if (!frame) return;

      dom.oPointer.style.left = frame.x + 'px';
      dom.oPointer.style.top = frame.y + 'px';

      // update inner state
      data.pointer.x = (frame.x / game.objects.view.data.browser.width) * 100;
      data.pointer.y = (frame.y / game.objects.view.data.browser.height) * 100;

      // next!
      data.tweenFrame++;

      if (exports.onSetDirection) {
        exports.onSetDirection(data.pointer.x, data.pointer.y);
      }

    }

    function init() {
      initDOM();
      addEvents();
      // get initial coords
      refresh();
    }

    init();

    exports = {
      animate: animate,
      start: start,
      move: move,
      end: end
    };

    return exports;

  }

  View = function() {

    var css, data, dom, events, exports;

    function setLeftScrollToPlayer(helicopter) {
      var allowOverride = true, x;

      x = helicopter.data.x + (helicopter.data.width * (1 / screenScale)) - game.objects.view.data.browser.halfWidth;

      setLeftScroll(x, allowOverride);
    }

    function setLeftScroll(x, allowOverride) {

      if (allowOverride) {
        data.battleField.scrollLeftVX = 0;
        data.battleField.scrollLeft = x;
      } else {
        // scroll the battlefield by relative amount.
        data.battleField.scrollLeftVX = x;
        data.battleField.scrollLeft = Math.max(-512, Math.min(data.battleField.width - data.browser.halfWidth, data.battleField.scrollLeft + x));
      }
      
      data.battleField.scrollLeftWithBrowserWidth = data.battleField.scrollLeft + data.browser.width;

      if (features.transform.prop) {
        // aim for GPU-based scrolling...
        common.setTransformXY(undefined, dom.battleField, -data.battleField.scrollLeft + 'px', '0px');
        // ... and parallax.
        if (!tutorialMode || (tutorialMode && (!isFirefox || useParallax))) {
          // firefox text rendering really doesn't look nice when translating the stars.
          // TODO: revisit the firefox thing.
          common.setTransformXY(undefined, dom.stars, (-data.battleField.scrollLeft * data.battleField.parallaxRate) + 'px', '0px');
        }
      } else {
        // move via margin + background position
        dom.battleField.style.marginLeft = -data.battleField.scrollLeft + 'px';
        dom.stars.style.backgroundPosition = (-data.battleField.scrollLeft * data.battleField.parallaxRate) + 'px 0px';
      }

    }

    function refreshCoords() {

      updateScreenScale();

      applyScreenScale();

      data.browser.width = (window.innerWidth || document.body.clientWidth) / screenScale;
      data.browser.height = (window.innerHeight || document.body.clientHeight) / screenScale;

      data.browser.eighthWidth = data.browser.width / 8;
      data.browser.fractionWidth = data.browser.width / 3;
      data.browser.halfWidth = data.browser.width / 2;
      data.browser.twoThirdsWidth = data.browser.width * (2 / 3);

      data.world.width = dom.worldWrapper.offsetWidth;
      data.world.height = dom.worldWrapper.offsetHeight;

      data.world.x = 0;
      data.world.y = dom.worldWrapper.offsetTop / screenScale;

      if (!data.battleField.width) {
        // dimensions assumed to be static, can be grabbed once
        // hard-code `battleField` width, instead of measuring.
        data.battleField.width = worldWidth; // dom.battleField.offsetWidth;
        data.battleField.height = dom.battleField.offsetHeight;
        data.topBar.height = dom.topBar.offsetHeight;
      }

      // isOnScreen() references this a lot.
      data.battleField.scrollLeftWithBrowserWidth = data.battleField.scrollLeft + data.browser.width;

      if (dom.stars && features.transform.prop) {
        // GPU case: Be wide enough to cover parallax scroll effect. browser width + 10% of world width
        dom.stars.style.width = data.browser.width + (data.battleField.width * 0.1) + 'px';
      }

      // helicopters need to know stuff, too.
      if (game.objects.helicopters[0]) game.objects.helicopters[0].refreshCoords();
      if (game.objects.helicopters[1]) game.objects.helicopters[1].refreshCoords();

      // hackish: and, radar. force an update so static items like bunkers get repositioned to scale.
      if (game.objects.radar) game.objects.radar.setStale(true);

    }

    function setTipsActive(active) {
      if (data.gameTips.active !== active) {
        data.gameTips.active = active;
        utils.css[active ? 'add' : 'remove'](dom.gameTips, css.gameTips.active);
        if (!data.gameTips.tipsOffset) {
          showNextTip();
        }
      }
    }

    function shuffleTips() {

      var i, j, elements, strings;

      strings = [];

      elements = dom.gameTips.getElementsByTagName('span');

      // read all the strings from the live DOM.
      for (i = 0, j = elements.length; i < j; i++) {
        strings[i] = elements[i].innerText;
      }
      
      data.gameTips.tips = utils.array.shuffle(strings);

      // replace the source material with placeholders for rendering, and an invisible element which drives the CSS animation loop.
      // CSS `onanimationend()` is used to show the next tip.
      dom.gameTipsList.innerHTML = [
        '<div class="animation-node">&nbsp;</div>',
        '<div class="tip"></div>',
        '<div class="tip"></div>'
      ].join('');

      refreshTipDOM();

    }

    function refreshTipDOM() {

      dom.gameTipNodes = dom.gameTipsList.getElementsByClassName('tip');
      dom.animationNode = dom.gameTipsList.getElementsByClassName('animation-node')[0];

    }

    function showNextTip() {

      var tips = dom.gameTipNodes;

      // tip 1: initially empty, then the "previous" tip for all subsequent iterations.
      tips[0].innerHTML = !data.gameTips.tipsOffset ? '&nbsp' : data.gameTips.tips[Math.max(0, data.gameTips.tipsOffset - 1)];

      // last tip will be undefined (one beyond .length), render empty if so.
      tips[1].innerHTML = data.gameTips.tips[data.gameTips.tipsOffset] || '&nbsp';

      // clone + replace to restart CSS R->L animation
      dom.gameTipsList.replaceChild(tips[0].cloneNode(true), tips[0]);
      dom.gameTipsList.replaceChild(tips[1].cloneNode(true), tips[1]);

      // and the animation node, too
      dom.gameTipsList.replaceChild(dom.animationNode.cloneNode(true), dom.animationNode);

      // re-fetch everything we just replaced
      refreshTipDOM();

      // wrap around as needed
      if (data.gameTips.tipsOffset >= data.gameTips.tips.length) {
        data.gameTips.tipsOffset = -1;
      }

      // animation event: a tip has scrolled by.
      dom.animationNode.onanimationend = function() {

        // move first tip node (which just scrolled off to the left) to the end (to the right.)
        // it will then scroll R->L into view as the new tip.
        dom.gameTipsList.appendChild(dom.gameTipNodes[0]);
        refreshTipDOM();

        data.gameTips.tipsOffset++;
        showNextTip();

      }

    }

    function setAnnouncement(text, delay) {

      // prevent `undefined` from being rendered. ;)
      text = text || '';

      if (text !== data.gameTips.lastAnnouncement && ((!data.gameTips.hasAnnouncement && text) || (data.gameTips.hasAnnouncement && !text))) {

        utils.css[text ? 'add' : 'remove'](dom.gameTips, css.gameTips.hasAnnouncement);

        dom.gameAnnouncements.innerHTML = text;

        data.gameTips.lastAnnouncement = text;

        if (data.gameTips.announcementTimer) {
          data.gameTips.announcementTimer.reset();
          data.gameTips.announcementTimer = null;
        }

        if (text) {
          // clear after an amount of time, if not -1
          if ((delay === undefined || delay !== -1)) {
            data.gameTips.announcementTimer = setFrameTimeout(setAnnouncement, delay || 5000);
          }
        }

        data.gameTips.hasAnnouncement = !!text;

      }

    }

    function animate() {

      var scrollAmount, mouseDelta;

      // don't scroll if the helicopter isn't moving.
      if (game.objects.helicopters[0].data.vX !== 0) {

        // is the mouse to the right, or left?
        mouseDelta = (data.mouse.x - data.browser.halfWidth);

        // how much...
        scrollAmount = mouseDelta / data.browser.halfWidth;

        // and scale
        setLeftScroll(scrollAmount * data.maxScroll);

      }

      data.frameCount++;

    }

    function updateFundsUI() {

      // based on funds, update "affordability" bits of UI.
      var playerFunds = game.objects.endBunkers[0].data.funds;

      var nodes = [
        document.getElementById('player-status-bar')
      ];

      if (isMobile) {
        nodes.push(document.getElementById('mobile-controls'));
      }

      var toAdd = [];
      var toRemove = [];

      for (var item in COSTS) {
        if (Object.prototype.hasOwnProperty.call(COSTS, item)) {
          // mark as "can not afford".
          if (playerFunds < COSTS[item].funds) {
            toAdd.push(COSTS[item].css);
          } else {
            toRemove.push(COSTS[item].css);
          }
        }
      }

      var i, j;

      nodes.forEach(function(o) {

        // add/remove expect space-delimited strings.
        for (i = 0, j = toAdd.length; i < j; i++) {
          utils.css.add(o, toAdd[i]);
        }

        for (i = 0, j = toRemove.length; i < j; i++) {
          utils.css.remove(o, toRemove[i]);
        }

      });

    }

    function getTouchEvent(touchEvent) {
      return data.touchEvents[touchEvent && touchEvent.identifier] || null;
    }

    function registerTouchEvent(touchEvent, options) {

      if (!touchEvent || !touchEvent.identifier) return;

      // keep track of a touch event, and its type.
      var id = touchEvent.identifier;

      data.touchEvents[id] = {
        /*
          type,
          target,
        */
      };

      // Object.assign()-like copying of properties.
      for (var option in options) {
        if (options.hasOwnProperty(option)) {
          data.touchEvents[id][option] = options[option];
        }
      }

      var target = options && options.target;

      // special case for UI on buttons.
      if (target && target.nodeName === 'A') {
        utils.css.add(target, 'active');
      }

    }

    function clearTouchEvent(touchEvent) {

      if (!touchEvent || !touchEvent.identifier) return;

      var target = data.touchEvents[touchEvent.identifier].target;

      // special case for UI on buttons.
      if (target && target.nodeName === 'A') {
        utils.css.remove(target, 'active');
      }

      data.touchEvents[touchEvent.identifier] = null;

    }

    function handleTouchStart(targetTouch) {
      // https://developer.mozilla.org/en-US/docs/Web/API/Touch/target
      var target = targetTouch && targetTouch.target;

      // touch should always have a target, but just in case...
      if (target && target.nodeName === 'A') {
        // it's a link; treat as a button. ignore subsequent move events.
        registerTouchEvent(targetTouch, {
          type: 'press',
          target: target
        });
      } else {
        // allow touchmove() for this one.
        registerTouchEvent(targetTouch, {
          type: 'joystick'
        });
        game.objects.joystick.start(targetTouch);
        // and exit.
        return false;
      }

      // some sort of button - inventory, or helicopter controls.
      var keyMapLabel;
      var keyCode;

      keyMapLabel = target.getAttribute('data-keyMap');
      keyCode = keyboardMonitor.keyMap[keyMapLabel];

      if (keyCode) {
        keyboardMonitor.keydown({
          keyCode: keyCode
        });
        return true;
      }
      return false;
    }

    function handleTouchEnd(touchEvent) {
      // https://developer.mozilla.org/en-US/docs/Web/API/Touch/target
      var target = touchEvent && touchEvent.target;

      // was this a "move" (joystick) event? end if so.
      var registeredEvent = getTouchEvent(touchEvent);
      if (registeredEvent && registeredEvent.type === 'joystick') {
        game.objects.joystick.end(touchEvent);
      }

      clearTouchEvent(touchEvent);
      if (!target) return false;

      var keyMapLabel;
      var keyCode;

      // release applicable key.
      keyMapLabel = target.getAttribute('data-keyMap');
      keyCode = keyboardMonitor.keyMap[keyMapLabel];

      if (keyCode) {
        keyboardMonitor.keyup({
          keyCode: keyCode
        });
        return true;
      }

      return false;
    }

    function addEvents() {

      utils.events.add(window, 'resize', events.resize);
      utils.events.add(document, 'mousemove', events.mousemove);
      utils.events.add(document, 'mousedown', events.touchstart);
      utils.events.add(document, 'touchstart', events.touchstart);
      utils.events.add(document, 'touchmove', events.touchmove);
      utils.events.add(document, 'touchend', events.touchend);
      utils.events.add(window, 'focus', events.focus);
      utils.events.add(window, 'blur', events.blur);

    }

    function initDOM() {

      dom.worldWrapper = document.getElementById('world-wrapper');
      dom.battleField = document.getElementById('battlefield');
      dom.stars = document.getElementById('stars');
      dom.topBar = document.getElementById('top-bar');
      dom.gameTips = document.getElementById('game-tips');
      dom.gameTipsList = document.getElementById('game-tips-list');
      dom.gameAnnouncements = document.getElementById('game-announcements');

    }

    function initView() {

      initDOM();

      addEvents();

      refreshCoords();

      shuffleTips();

      setTipsActive(true);

    }

    css = {
      gameTips: {
        active: 'active',
        hasAnnouncement: 'has-announcement'
      }
    };

    data = {
      frameCount: 0,
      ignoreMouseEvents: false,
      browser: {
        width: 0,
        eighthWidth: 0,
        fractionWidth: 0,
        halfWidth: 0,
        twoThirdsWidth: 0,
        height: 0
      },
      mouse: {
        x: 0,
        y: 0
      },
      touch: {
        x: 0,
        y: 0,
      },
      touchEvents: {},
      world: {
        width: 0,
        height: 0,
        x: 0,
        y: 0
      },
      battleField: {
        width: 0,
        scrollLeftWithBrowserWidth: 0,
        height: 0,
        scrollLeft: 0,
        scrollLeftVX: 0,
        parallaxRate: 0.1
      },
      topBar: {
        height: 0
      },
      gameTips: {
        announcementTimer: null,
        active: false,
        hasAnnouncement: false,
        lastText: null,
        tips: [],
        tipsOffset: 0
      },
      marqueeModulus: 1,
      marqueeIncrement: 1,
      maxScroll: 6
    };

    dom = {
      battleField: null,
      stars: null,
      topBar: null,
      gameTips: null,
      gameTipsList: null,
      gameTipNodes: null,
      animationNode: null,
      gameAnnouncements: null
    };

    events = {

      blur: function() {

        if (noPause) return;

        game.pause();

      },

      focus: function() {

        game.resume();

      },

      mousemove: function(e) {
        if (!data.ignoreMouseEvents) {
          data.mouse.x = ((e || window.event).clientX / screenScale);
          data.mouse.y = ((e || window.event).clientY / screenScale);
        }
      },

      touchstart: function(e) {
        // if the paused screen is showing, resume the game.
        if (game.data.paused) {
          game.resume();
        }
        var touch = e.touches && e.touches[0];
        var i, j;
        var targetTouches = e.targetTouches;
        var result;
        var handledResult;
        if (targetTouches) {
          for (i = 0, j = targetTouches.length; i < j; i++) {
            result = handleTouchStart(targetTouches[i], e);
            if (result) {
              handledResult = true;
              e.preventDefault();
            }
          }
        }
        // mouse equivalent - set only if a button wasn't hit.
        if (!handledResult && touch && !data.ignoreMouseEvents) {
          data.touch.x = touch.clientX;
          data.touch.y = touch.clientY;
        }
      },

      touchmove: function(e) {
        // primitive handling: take the first event.
        var touch = e.changedTouches && e.changedTouches[0];

        // just in case.
        if (!touch) return true;

        // if this event was registered at touchstart() as not a "move", ignore.
        var registeredEvent = getTouchEvent(touch);

        if (registeredEvent && registeredEvent.type !== 'joystick') {
          return false;
        }

        if (!data.ignoreMouseEvents) {
          // relative to coordinates of origin
          game.objects.joystick.move(touch);
          e.preventDefault();
        }

        return false;
      },

      touchend: function(e) {
        var i, j;
        var changed = e.changedTouches;
        if (changed) {
          for (i = 0, j = changed.length; i < j; i++) {
            handleTouchEnd(changed[i], e);
          }
        }
      },

      resize: function() {
        // throttle?
        refreshCoords();
        game.objects.gameLoop.resetFPS();
      }

    };

    initView();

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      events: events,
      setAnnouncement: setAnnouncement,
      setLeftScroll: setLeftScroll,
      setLeftScrollToPlayer: setLeftScrollToPlayer,
      updateFundsUI: updateFundsUI
    };

    return exports;

  };

  Inventory = function() {

    var css, data, dom, objects, exports;

    function createObject(typeData, options) {

      // create and append a new (something) to its appropriate array.

      var orderObject;

      orderObject = new typeData[1](options);

      // ignore if this is the stub object case
      if (!options.noInit) {

        typeData[0].push(orderObject);

        utils.css.add(orderObject.dom.o, css.building);

        window.requestAnimationFrame(function() {
          utils.css.add(orderObject.dom.o, css.ordering);
        });

      }

      return orderObject;

    }

    function processNextOrder() {

      // called each time an item is queued for building,
      // and each time an item finishes building (to see if there's more in the queue.)

      if (!data.building && data.queue.length) {

        // start building!
        data.building = true;

      }

      if (data.queue.length) {

        // first or subsequent queue items being built.

        // reset frame / build counter
        data.frameCount = 0;

        // take the first item out of the queue for building.
        objects.order = data.queue.shift();

      } else if (data.building && !data.queue.length) {

        utils.css.remove(dom.gameStatusBar, css.building);

        data.building = false;

        if (!objects.order.options.isEnemy) {
          if (sounds.inventory.end) {
            playSound(sounds.inventory.end);
          }
          // clear the queue that just finished.
          game.objects.helicopters[0].updateInventoryQueue();
        }

      }

    }

    function order(type, options) {

      var typeData, orderObject, orderSize, cost;

      options = options || {};

      orderSize = 1;

      // default off-screen setting
      options.x = -72;

      // let's build something - provided you're good for the $$$, that is.

      typeData = data.types[type];

      // infantry or engineer? handle those specially.

      if (type === TYPES.infantry) {

        orderSize = 5;

      } else if (type === TYPES.engineer) {

        orderSize = 2;

      }

      // Hack: make a temporary object, so we can get the relevant data for the actual order.
      if (!options.isEnemy) {
        options.noInit = true;
      }

      orderObject = createObject(typeData, options);

      // do we have enough funds for this?
      cost = orderObject.data.inventory.cost;

      if (game.objects.endBunkers[0].data.funds >= cost) {

        game.objects.endBunkers[0].data.funds -= cost;

        game.objects.view.updateFundsUI();

        if (!data.isEnemy) {
          // player may now be able to order things.
          game.objects.helicopters[0].updateStatusUI({ funds: true });
        }

      } else if (!data.isEnemy) {

        // Insufficient funds. "We require more vespene gas."
        if (sounds.inventory.denied) {
          playSound(sounds.inventory.denied);
        }

        return;

      }

      // and now, remove that for the real build.
      options.noInit = false;

      // create and push onto the queue.
      var newOrder = {
        data: orderObject.data,
        // how long to wait after last item before "complete" (for buffering space)
        completeDelay: orderObject.data.inventory.orderCompleteDelay || 0,
        typeData: typeData,
        options: options,
        size: orderSize,
        onOrderStart: null,
        onOrderComplete: null,
      };

      var queueEvents;

      if (!newOrder.options.isEnemy) {

        // update the UI
        utils.css.add(dom.gameStatusBar, css.building);

        // and make a noise
        if (sounds.inventory.begin) {
          playSound(sounds.inventory.begin);
        }

        // callback to update queue UI when the build actually begins
        queueEvents = game.objects.helicopters[0].updateInventoryQueue(newOrder);

        newOrder.onOrderStart = queueEvents.onOrderStart;
        newOrder.onOrderComplete = queueEvents.onOrderComplete;

      }

      data.queue.push(newOrder);

      // only start processing if queue length is 1 - i.e., first item just added.

      if (!data.building) {
        processNextOrder();
      }

      // HACK
      if (options.isEnemy) {
        data.building = false;
      }

    }

    function animate() {

      if (data.building && data.frameCount % objects.order.data.inventory.frameCount === 0) {

        if (objects.order.size) {

          // start building.
          createObject(objects.order.typeData, objects.order.options);

          if (objects.order.onOrderStart) {
            objects.order.onOrderStart();
          }

          objects.order.size--;

        } else if (objects.order.completeDelay) {

          // wait some amount of time after build completion? (fix spacing when infantry / engineers ordered, followed by a tank.)
          objects.order.completeDelay--;

        } else {

          // "Construction complete."

          if (!objects.order.options.isEnemy) {
            // drop the item that just finished building.
            if (objects.order.onOrderComplete) {
              objects.order.onOrderComplete();
            }
          }
          
          processNextOrder();

        }

      }

      data.frameCount++;

    }

    function initStatusBar() {
      dom.gameStatusBar = document.getElementById('game-status-bar');
    }

    css = {
      building: 'building',
      ordering: 'ordering'
    };

    data = {
      frameCount: 0,
      // quick type-to-object/constructor array
      types: {
        tank: [game.objects.tanks, Tank],
        van: [game.objects.vans, Van],
        missileLauncher: [game.objects.missileLaunchers, MissileLauncher],
        infantry: [game.objects.infantry, Infantry],
        engineer: [game.objects.engineers, Engineer]
      },
      building: false,
      queue: [],
    };

    objects = {
      order: null
    };

    dom = {
      gameStatusBar: null
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      createObject: createObject,
      order: order
    };

    initStatusBar();

    return exports;

  };

  function RadarItem(options) {

    var css, data, dom, oParent, exports;

    function dieComplete() {

      game.objects.radar.removeItem(exports);
      dom.o = null;
      options.o = null;

    }

    function die(dieOptions) {

      if (!data.dead) {

        if (!dieOptions || !dieOptions.silent) {
          utils.css.add(dom.o, css.dying);
        }

        stats.destroy(exports);

        data.dead = true;

        if (!options.canRespawn) {

          // permanent removal
          if (dieOptions && dieOptions.silent) {

            // bye bye! (next scheduled frame)
            setFrameTimeout(dieComplete, 1);

          } else {

            setFrameTimeout(dieComplete, 2000);

          }

        } else {

          // balloon, etc.
          setFrameTimeout(function() {
            // only do this if the parent (balloon) is still dead.
            // it may have respawned almost immediately by passing infantry.
            if (oParent && oParent.data && !oParent.data.dead) return;
            utils.css.add(dom.o, css.dead);
          }, 1000);

        }

      }

    }

    function reset() {
      if (data.dead) {
        utils.css.remove(dom.o, css.dying);
        utils.css.remove(dom.o, css.dead);
        data.dead = false;
        // reset is the same as creating a new object.
        stats.create(exports);
      }
    }

    function initRadarItem() {
      utils.css.add(dom.o, css.radarItem + ' ' + options.className);
    }

    css = {
      radarItem: 'radar-item',
      dying: 'dying',
      dead: 'dead'
    };

    data = {
      type: 'radar-item',
      parentType: options.parentType,
      className: options.className,
      dead: false
    };

    dom = {
      o: options.o
    };

    oParent = options.oParent;

    initRadarItem();

    exports = {
      data: data,
      dom: dom,
      die: die,
      oParent: oParent,
      reset: reset
    };

    return exports;

  }

  Radar = function() {

    var data, css, dom, exports, layoutCache, objects, spliceArgs = [null, 1];

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
      } else if (sounds.missileWarning && sounds.missileWarning.sound) {
        stopSound(sounds.missileWarning);
      }

    }

    function getLayout(itemObject) {

      var rect, result, type;

      type = itemObject.data.parentType;

      // cache hit, based on "type"
      if (layoutCache[type]) {
        // console.log('cache hit', className, layoutCache[className]);
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
      if (!itemObject || !itemObject.dom || !itemObject.dom.o) {
        console.warn('getLayout: something is wrong, returning empty result.', itemObject);
        return result;
      }

      // TODO: remove this.
      // window.layoutCache = layoutCache;

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

    function addRadarItem(item, className, canRespawn) {

      var itemObject;

      // for GPU acceleration: note if this is an "animated" type.
      if (data.animatedTypes.includes(item.data.type)) {
        className += ' ' + css.radarItemAnimated;
      }

      itemObject = new RadarItem({
        o: document.createElement('div'),
        parentType: item.data.type,
        className: className,
        oParent: item,
        canRespawn: (canRespawn || false),
        isStatic: false,
        // width + height, determined after append
        layout: null,
        // assigned if bottom-aligned (static)
        bottomAlignedY: 0
      });

      game.objects.queue.addNextFrame(function() {
        dom.radar.appendChild(itemObject.dom.o);

        // attempt to read from layout cache, or live DOM if needed for item height / positioning
        itemObject = mixin(itemObject, getLayout(itemObject));

        objects.items.push(itemObject);

      });

      // Slightly hackish: tack radarItem on to exports.
      // setTargetTracking() looks at this reference.
      item.radarItem = itemObject;

      stats.create(item);

      return itemObject;

    }

    function startJamming() {

      // [ obligatory Bob Marley reference goes here ]

      if (noJamming) return;

      data.isJammed = true;
      utils.css.add(game.objects.view.dom.worldWrapper, css.jammed);

      if (!userDisabledSound) {
        if (sounds.radarStatic) {
          playSound(sounds.radarStatic);
        }

        if (sounds.radarJamming) {
          playSound(sounds.radarJamming);
        }
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
      removeNodes(objects.items[offset].dom);
      // faster splice - doesn't create new array object (IIRC.)
      spliceArgs[0] = offset;
      Array.prototype.splice.apply(objects.items, spliceArgs);
    }

    function removeRadarItem(item) {

      // find and remove from DOM + array

      // Array.indexOf() method (IE9+)
      var offset = objects.items.indexOf && objects.items.indexOf(item);

      if (offset !== undefined) {
        if (offset === -1) return;
        _removeRadarItem(offset);
        return;
      }

      var i, j;

      for (i = objects.items.length - 1, j = 0; i >= j; i--) {
        if (objects.items[i] === item) {
          _removeRadarItem(i);
          break;
        }
      }

    }

    function animate() {

      var i, j, left, top, hasEnemyMissile, isInterval;

      hasEnemyMissile = false;

      // update some items every frame, most items can be throttled.
      isInterval = (data.frameCount++ >= data.animateInterval);

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

      if (features.transform.prop && !noRadarGPU) {

        for (i = 0, j = objects.items.length; i < j; i++) {

          // is this a "static" item which is positioned only once and never moves?
          // additionally: "this is a throttled update", OR, this is a type that gets updated every frame.
          // exception: bases and bunkers may be "dirty" due to resize, `isStale` will be set. force a refresh in that case.

          if (data.isStale || (!objects.items[i].isStatic && (isInterval || data.animateEveryFrameTypes.includes(objects.items[i].oParent.data.type)))) {
            
            if (
              objects.items[i].oParent.data.type === TYPES.turret
              || objects.items[i].oParent.data.type === TYPES.base
              || objects.items[i].oParent.data.type === TYPES.bunker
              || objects.items[i].oParent.data.type === TYPES.endBunker
              || objects.items[i].oParent.data.type === TYPES.superBunker
            ) {
              objects.items[i].isStatic = true;
            }

            // X coordinate: full world layout -> radar scale, with a slight offset (so bunker at 0 isn't absolute left-aligned)
            left = ((objects.items[i].oParent.data.x / worldWidth) * (game.objects.view.data.browser.width - 5)) + 4;

            // get layout, if needed (i.e., new object created while radar is jammed, i.e., engineer, and its layout hasn't been read + cached from the DOM)
            if (!objects.items[i].layout) {
              objects.items[i] = mixin(objects.items[i], getLayout(objects.items[i]));
            }

            // bottom-aligned, OR, somewhere between top and bottom of radar display, accounting for own height
            top = objects.items[i].bottomAlignedY || (objects.items[i].oParent.data.y / game.objects.view.data.battleField.height) * data.height - objects.items[i].layout.height;

            // depending on parent type, may receive an additional transform property (e.g., balloons get rotated as well.)
            // common.setTransformXY(objects.items[i], objects.items[i].dom.o, left + 'px', top + 'px', data.extraTransforms[objects.items[i].oParent.data.type]);
            common.setTransformXY(null /* exports */, objects.items[i].dom.o, left + 'px', top + 'px', data.extraTransforms[objects.items[i].oParent.data.type]);

          }

        }

        // reset, only do this once.
        data.isStale = false;

      } else {

        for (i = 0, j = objects.items.length; i < j; i++) {

          // TODO: optimize

          left = ((objects.items[i].oParent.data.x / worldWidth) * game.objects.view.data.battleField.width);

          if (
            (!objects.items[i].oParent.data.bottomAligned && objects.items[i].oParent.data.y > 0)
            || objects.items[i].oParent.data.type === TYPES.balloon
          ) {
            top = ((objects.items[i].oParent.data.y / game.objects.view.data.battleField.height) * data.height);

          } else {
            top = data.height;
          }

          common.setTransformXY(null /* exports */, objects.items[i].dom.o, left + 'px', top + 'px');

        }

      }

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
        balloon: 'rotate(-45deg)'
      }
    };

    dom = {
      radar: null,
      radarItem: null
    };

    initRadar();

    exports = {
      addItem: addRadarItem,
      animate: animate,
      data: data,
      dom: dom,
      removeItem: removeRadarItem,
      setStale: setStale,
      startJamming: startJamming,
      stopJamming: stopJamming
    };

    return exports;

  };

  function updateIsOnScreen(o, forceUpdate) {
    if (!o || !o.data || !useDOMPruning) return;

    if (isOnScreen(o) || forceUpdate) {

      // exit if not already updated
      if (o.data.isOnScreen) return;

      o.data.isOnScreen = true;

      // node may not exist
      if (!o.dom || !o.dom.o) return;

      if (o.dom.o._lastTransform) {
        // MOAR GPU! re-apply transform that was present at, or updated since, removal
        o.dom.o.style.transform = o.dom.o._lastTransform;
      }

      o.dom.o.style.contentVisibility = 'visible';

      if (o.dom._oRemovedParent) {

        // previously removed: re-append to DOM
        o.dom._oRemovedParent.appendChild(o.dom.o);
        o.dom._oRemovedParent = null;

      } else {

        // first-time append, first time on-screen
        game.dom.world.appendChild(o.dom.o);

      }
     
      // callback, if defined
      if (o.isOnScreenChange) {
        o.isOnScreenChange(o.data.isOnScreen);
      }

    } else if (o.data.isOnScreen) {

      o.data.isOnScreen = false;

      if (o.dom && o.dom.o) {

        // manually remove x/y transform, will be restored when on-screen.
        if (o.dom.o.style.transform) {
          // 'none' might be considered a type of transform per Chrome Dev Tools,
          // and thus incur an "inline transform" cost vs. an empty string.
          // notwithstanding, transform has a "value" and can be detected when restoring elements on-screen.
          o.dom.o._lastTransform = o.dom.o.style.transform;
          o.dom.o.style.transform = 'none';
        }

        if (o.dom.o.parentNode) {
          o.dom._oRemovedParent = o.dom.o.parentNode;
          o.dom._oRemovedParent.removeChild(o.dom.o);
        }

        o.dom.o.style.contentVisibility = 'hidden';

      }

      // callback, if defined
      if (o.isOnScreenChange) {
        o.isOnScreenChange(o.data.isOnScreen);
      }

    }

  }

  GameLoop = function() {

    var data, dom, exports, spliceArgs = [null, 1];

    function animate() {

      // loop through all objects, animate.
      var item, i;
      var gameObjects = game.objects;

      data.frameCount++;

      // there may be sounds from the last frame, ready to go.
      playQueuedSounds();

      // view will have jumped to player or enemy base.
      // ensure all units' on-screen status is updated first, then animate one more frame so they can be repositioned.

      if (data.gameStopped) {
        // end game, all units updated, subsequent frames: only animate shrapnel and smoke.
        gameObjects = game.objects.shrapnel.concat(game.objects.smoke);
      }

      for (item in gameObjects) {

        if (gameObjects[item]) {

          // array of objects

          if (gameObjects[item].length) {

            for (i = gameObjects[item].length - 1; i >= 0; i--) {

              updateIsOnScreen(gameObjects[item][i]);

              if (gameObjects[item][i].animate && gameObjects[item][i].animate()) {
                // object is dead - take it out.
                spliceArgs[0] = i;
                Array.prototype.splice.apply(gameObjects[item], spliceArgs);
              }

            }

          } else {

            // single object case

            updateIsOnScreen(gameObjects[item]);

            if (gameObjects[item].animate && gameObjects[item].animate()) {
              // object is dead - take it out.
              gameObjects[item] = null;
            }

          }

        }

      }

      if (battleOver && !data.gameStopped) {
        if (data.battleOverFrameCount++ > 1) {
          data.gameStopped = true;
        }
      }

      // update all setTimeout()-style FrameTimeout() instances.
      frameTimeoutManager.animate();

    }

    function animateRAF(ts) {

      var elapsed;

      if (!data.timer) return;

      if (!data.fpsTimer) data.fpsTimer = ts;

      /**
       * first things first: always request the next frame right away.
       * if expensive work is done here, at least the browser can plan accordingly
       * if this frame misses its VSync (vertical synchronization) window.
       * https://developer.mozilla.org/en-US/docs/Games/Anatomy#Building_a_main_loop_in_JavaScript
       * https://www.html5rocks.com/en/tutorials/speed/rendering/
       */
      window.requestAnimationFrame(animateRAF);

      elapsed = (ts - data.lastExec) || 0;

      /**
       * frame-rate limiting: exit if it isn't approximately time to render the next frame.
       * this still counts as a frame render - we just got here early. Good!
       * hat tip: https://riptutorial.com/html5-canvas/example/18718/set-frame-rate-using-requestanimationframe
       */
      if (!unlimitedFrameRate && elapsed < FRAME_MIN_TIME) return;

      // performance debugging: number of style changes (transform) for this frame.
      if (debug) {
        console.log('transform (style/recalc) count: ' + transformCount + ' / ' + excludeTransformCount + ' (incl./excl)');
        transformCount = 0;
        excludeTransformCount = 0;
        if (elapsed > 34 && window.console) {
          var slowString = 'slow frame (' + Math.floor(elapsed) + 'ms)';
          console.log(slowString);
          if (console.timeStamp) console.timeStamp(slowString);
        }
      }

      data.elapsedTime += elapsed;

      data.lastExec = ts;

      animate();

      data.frames++;

      // every interval, update framerate.
      if (!unlimitedFrameRate && ts - data.fpsTimer >= data.fpsTimerInterval) {

        if (dom.fpsCount && data.frames !== data.lastFrames) {
          dom.fpsCount.innerText = data.frames;
          data.lastFrames = data.frames;
        }

        data.frames = 0;
        data.elapsedTime = 0;

        // update / restart 1-second timer
        data.fpsTimer = ts;

      }

      }

    }

    function start() {

      if (!dom.fpsCount) {
        dom.fpsCount = document.getElementById('fps-count');
      }

      if (!data.timer) {

        if (window.requestAnimationFrame) {

          data.timer = true;
          animateRAF();

        } else {

          data.timer = window.setInterval(animate, FRAMERATE);

        }

      }

    }

    function stop() {

      if (data.timer) {

        data.timer = null;
        data.lastExec = 0;

      }

    }

    function resetFPS() {

      // re-measure FPS timings.
      data.lastExec = 0;
      data.frames = 0;

    }

    function initGameLoop() {

      start();

    }

    dom = {
      fpsCount: null,
    }

    data = {
      battleOverFrameCount: 0,
      gameStopped: false,
      frameCount: 0,
      lastExec: 0,
      elapsedTime: 0,
      frames: 0,
      lastFrames: 0,
      timer: null,
      fpsTimer: null,
      fpsTimerInterval: 1000,
    };

    exports = {
      data: data,
      init: initGameLoop,
      resetFPS: resetFPS,
      stop: stop,
      start: start
    };

    return exports;

  };

  function gameOver(youWon) {

    // somebody's base is about to get blown up.

    var yourBase, enemyBase;

    // just in case
    if (battleOver) return;

    yourBase = game.objects.bases[0];
    enemyBase = game.objects.bases[1];

    if (!youWon) {

      // sorry, better luck next time.
      yourBase.die();

    } else {

      enemyBase.die();

    }

    battleOver = true;

    utils.css.add(document.body, 'game-over');

    stats.displayEndGameStats();

  }

  Balloon = function(options) {


    function moveTo(x, y) {

    function moveTo(x, bottomY) {
      var needsUpdate;

      if (x !== undefined && data.x !== x) {
        if (data.isOnScreen) {
        }
        data.x = x;
        needsUpdate = true;
      }

        data.y = y;
        needsUpdate = true;

      }

      // snow?
      if (window.snowStorm && window.snowStorm.snow) {
        window.snowStorm.snow();
      }

    }

    function checkRespawn() {

      // odd edge case - data not always defined if destroyed at the right time?
      if (data && data.canRespawn && data.dead && objects.bunker && objects.bunker.data && !objects.bunker.data.dead) {
        reset();
      }

    }

    function setEnemy(isEnemy) {

      data.isEnemy = isEnemy;

      if (isEnemy) {
        utils.css.remove(dom.o, css.friendly);
        utils.css.add(dom.o, css.enemy);
      } else {
        utils.css.remove(dom.o, css.enemy);
        utils.css.add(dom.o, css.friendly);
      }

      // apply CSS animation effect, and stop/remove in one second.
      // this prevents the animation from replaying when switching
      // between on / off-screen.
      utils.css.add(dom.o, css.animating);

      data.frameTimeout = setFrameTimeout(function() {
        if (!dom.o) return;
        utils.css.remove(dom.o, css.animating);
        data.frameTimeout = null;
      }, 1000);

    }

    function detach() {

      if (!data.detached) {

        data.detached = true;

        // and become hostile.
        data.hostile = true;

        // disconnect bunker <-> balloon references
        if (objects.bunker) {
          objects.bunker.nullifyBalloon();
          objects.bunker = null;
        }

      }

    }

    function die() {

      if (data.dead) return;
      // pop!
      utils.css.add(dom.o, css.exploding);

        utils.css.swap(dom.o, css.exploding, css.dead);
      if (sounds.balloonExplosion) {
        playSound(sounds.balloonExplosion, exports);
      }
      if (data.deadTimer) {
        data.deadTimer = null;
        });
      }

      // if shot while a group of infantry are passing by the bunker,
      // so only "finish" dying if still dead.

      // the parent (i.e., this) balloon's `data.dead` before hiding.
      radarItem.die();

      data.deadTimer = setFrameTimeout(function() {
        data.deadTimer = null;

        // sanity check: don't hide if already respawned
        if (!data.dead) return;

          // hide the balloon
          utils.css.swap(dom.o, css.exploding, css.dead);
        }

    }

    function applyAnimatingTransition() {
      // balloons might be off-screen, then return on-screen
      // and will not animate unless explicitly enabled.
      // this adds the animation class temporarily.
      if (!dom || !dom.o) return;

      // enable transition (balloon turning left or right, or dying.)
      utils.css.add(dom.o, css.animating);

      // reset, if previously queued.
      if (data.animationFrameTimeout) {
      data.animationFrameTimeout = setFrameTimeout(function() {
        data.animationFrameTimeout = null;
        // balloon might have been destroyed.
        if (!dom || !dom.o) return;
        utils.css.remove(dom.o, css.animating);
        data.frameTimeout = null;
      }, 550);
    }

    function animate() {

      if (!data.dead) {


        if (!data.detached) {

          if ((data.bottomY >= 100 && data.verticalDirection > 0) || (data.bottomY <= 0 && data.verticalDirection < 0)) {
            data.verticalDirection *= -1;
          }

          moveTo(data.x, data.bottomY + data.verticalDirection);

        } else {

          data.frameCount++;

          if (data.frameCount % data.windModulus === 0) {

            // TODO: improve, limit on axes

            data.windOffsetX += Math.random() > 0.5 ? -0.25 : 0.25;

            data.windOffsetX = Math.max(-3, Math.min(3, data.windOffsetX));

            if (data.windOffsetX > 0 && data.direction !== 1) {

              // heading right
              utils.css.remove(dom.o, css.facingLeft);
              utils.css.add(dom.o, css.facingRight);

              applyAnimatingTransition();

              data.direction = 1;

            } else if (data.windOffsetX < 0 && data.direction !== -1) {

              // heading left
              utils.css.remove(dom.o, css.facingRight);
              utils.css.add(dom.o, css.facingLeft);

              applyAnimatingTransition();

              data.direction = -1;

            }

            data.windOffsetY += Math.random() > 0.5 ? -0.1 : 0.1;

            data.windOffsetY = Math.max(-0.5, Math.min(0.5, data.windOffsetY));

            // and randomize
            data.windModulus = 32 + rndInt(32);

          }

          // if at end of world, change the wind and prevent randomization until within world limits
          // this allows balloons to drift a little over, but they will return.
          if (data.x + data.windOffsetX >= data.maxX) {
            data.frameCount = 0;
            data.windOffsetX -= 0.1;
          } else if (data.x + data.windOffsetX <= data.minX) {
            data.windOffsetX += 0.1;
          }

          // screen, too
          if (data.y + data.windOffsetY >= data.maxY) {
            data.frameCount = 0;
            data.windOffsetY -= 0.1;
            data.windOffsetY += 0.1;
          }

          // hackish: enforce world min/max limits
          moveTo(data.x + data.windOffsetX, data.y + data.windOffsetY);

        }

      } else {

        if (data.y > 0) {

          // dead, but chain has not retracted yet. Make sure it's moving down.
          if (data.verticalDirection > 0) {
            data.verticalDirection *= -1;
          }

          moveTo(data.x, data.y + data.verticalDirection);

        }

        checkRespawn();

      }

    }

    reset = function() {

      // respawn can actually happen now

      data.energy = data.energyMax;

      // restore default vertical
      data.verticalDirection = data.verticalDirectionDefault;

      // look ma, no longer dead!
      data.dead = false;

      // reset position, too
      data.y = bottomAlignedY(-data.height);

      radarItem.reset();

      data.canRespawn = false;

      if (data.deadTimer) {
        data.deadTimer.reset();
        data.deadTimer = null;
      }

      // update UI, right away?
      animate();

      utils.css.remove(dom.o, css.exploding);
      utils.css.remove(dom.o, css.dead);

      updateEnergy(exports);

      // presumably, triggered by an infantry.
      if (sounds.chainRepair) {
        playSound(sounds.chainRepair, exports);
      }

    };

    function initBalloon() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      // TODO: remove?
      dom.o.style.marginLeft = (data.leftMargin + 'px');

      moveTo(data.x, data.y);

      if (!objects.bunker) {
        detach();
      }

      game.dom.world.appendChild(dom.o);

      // TODO: review hacky "can respawn" parameter
      radarItem = game.objects.radar.addItem(exports, dom.o.className, true);

    }

    options = options || {};

    height = 16;

    css = inheritCSS({
      className: TYPES.balloon,
      friendly: 'facing-right',
      enemy: 'facing-left',
      facingLeft: 'facing-left',
      facingRight: 'facing-right'
    });

    data = inheritData({
      type: TYPES.balloon,
      canRespawn: false,
      frameCount: 0,
      windModulus: 16,
      windOffsetX: 0,
      windOffsetY: 0,
      energy: 3,
      energyMax: 3,
      direction: 0,
      detached: false,
      hostile: false, // dangerous when detached
      verticalDirection: 1,
      verticalDirectionDefault: 1,
      leftMargin: options.leftMargin || 0,
      width: 38,
      height: height,
      halfWidth: 19,
      halfHeight: height / 2,
      deadTimer: null,
      minX: 0,
      maxX: worldWidth,
      minY: 48,
      // don't allow balloons to fly into ground units, generally speaking
      maxY: game.objects.view.data.world.height - height - 32
    }, options);

    dom = {
      o: null
    };

    objects = {
      bunker: options.bunker || null
    };

    exports = {
      animate: animate,
      data: data,
      detach: detach,
      die: die,
      dom: dom,
      reset: reset,
      setEnemy: setEnemy
    };

    initBalloon();

    return exports;

  };

  Bunker = function(options) {

    var css, data, dom, objects, radarItem, exports;

    function createBalloon(useRandomY) {

      if (!objects.balloon) {

        objects.balloon = new Balloon({
          bunker: exports,
          leftMargin: 7,
          isEnemy: data.isEnemy,
          x: data.x,
          // if 0, balloon will "rise from the depths".
          bottomY: (useRandomY ? parseInt(Math.random() * 100, 10) : 0)
          y: (useRandomY ? 48 + rndInt(game.objects.view.data.world.height - 48) : 0)
        });

        // push onto the larger array
        game.objects.balloons.push(objects.balloon);

      }

      if (!objects.chain) {

        // create a chain, linking the base and the balloon
        objects.chain = new Chain({
          x: data.x + (data.halfWidth - 1),
          y: data.y,
          height: data.y - objects.balloon.data.y,
          balloon: objects.balloon,
          bunker: exports
        });

        game.objects.chains.push(objects.chain);

      }

    }

    function capture(isEnemy) {

      if (isEnemy) {

        utils.css.add(dom.o, css.enemy);
        utils.css.add(radarItem.dom.o, css.enemy);

        game.objects.notifications.add('The enemy captured a bunker 🚩');

        playSoundWithDelay(sounds.enemyClaim, exports, 500);

      } else {

        utils.css.remove(dom.o, css.enemy);
        utils.css.remove(radarItem.dom.o, css.enemy);

        game.objects.notifications.add('You captured a bunker ⛳');

        playSoundWithDelay(sounds.friendlyClaim, exports, 500);

      }

      data.isEnemy = isEnemy;

      // and the balloon, too.
      if (objects.balloon) {
        objects.balloon.setEnemy(isEnemy);
      }

      playSound(sounds.doorClose, exports);

      // check if enemy convoy production should stop or start
      checkProduction();

    }

    function engineerRepair(engineer) {

      if (data.energy < data.energyMax) {
        // stop, and don't fire
        engineer.stop(true);
        data.energy = Math.min(data.energy + 0.05, data.energyMax);
      } else {
        // repair complete - keep moving
        engineer.resume();
      }

      updateEnergy(exports);

    }

    function repair() {

      // fix the balloon, if it's broken - or, rather, flag it for respawn.
      if (objects.balloon) {

        if (objects.balloon.data.dead) {
          objects.balloon.data.canRespawn = true;
        }

      } else {

        // make a new one
        createBalloon();

      }

    }

    function nullifyChain() {
      objects.chain = null;
    }

    function nullifyBalloon() {
      objects.balloon = null;
    }

    function detachBalloon() {

      // update height of chain in the DOM, assuming it's
      // attached to the balloon now free from the base.
      // once height is assigned, the chain will either
      // hang from the balloon it's attached to, OR, will
      // fall due to gravity (i.e., no base, no balloon.)
      if (objects.chain) {
        objects.chain.applyHeight();
      }

      if (objects.balloon) {
        objects.balloon.detach();
        nullifyBalloon();
      }

    }

    function die() {

      if (data.dead) return;

      utils.css.add(dom.o, css.exploding);

      // detach balloon?
      detachBalloon();

      setFrameTimeout(function() {

        utils.css.swap(dom.o, css.exploding, css.burning);

        setFrameTimeout(function() {
          utils.css.swap(dom.o, css.burning, css.dead);
          // nothing else to do here - drop the node reference.
          dom.o = null;
        }, 10000);

      }, 1200);

      data.energy = 0;

      data.dead = true;

      if (sounds.explosionLarge) {
        playSound(sounds.crashAndGlass, exports);
        playSound(sounds.explosionLarge, exports);
      }

      // check if enemy convoy production should stop or start
      checkProduction();

      radarItem.die();

    }

    function engineerHit(target) {

      // a friendly engineer unit has made contact with a bunker. repair damage, if any.
      if (target.data.isEnemy === data.isEnemy) {
        engineerRepair(target);
      }
     
    }

    function infantryHit(target) {

      // an infantry unit has made contact with a bunker.

      if (target.data.isEnemy === data.isEnemy) {

        // a friendly passer-by.

        repair();

      } else if (collisionCheckMidPoint(exports, target)) {

        // non-friendly, kill the infantry - but let them capture the bunker first.

        capture(target.data.isEnemy);
        target.die();

      }

    }

    function initBunker() {

      dom.o = makeSprite({
        className: css.className
      });

      dom.oSubSprite = makeSubSprite();

      dom.oSubSpriteArrow = makeSubSprite(css.arrow);

      dom.o.appendChild(dom.oSubSprite);
      dom.o.appendChild(dom.oSubSpriteArrow);

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      // first time, create at random Y location.
      createBalloon(true);

      common.setTransformXY(exports.dom.o, data.x + 'px', '0px');

      data.midPoint = getDoorCoords(exports);

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    options = options || {};

    css = inheritCSS({
      className: TYPES.bunker,
      arrow: 'arrow',
      burning: 'burning'
    });

    data = inheritData({
      type: TYPES.bunker,
      y: (worldHeight - 25) + 3, // override to fix helicopter / bunker vertical crash case
      energy: 50,
      energyMax: 50,
      width: 51,
      halfWidth: 25,
      height: 25,
      midPoint: null
    }, options);

    dom = {
      o: null,
      oSubSprite: null,
      oSubSpriteArrow: null
    };

    objects = {
      balloon: null,
      chain: null,
      helicopter: null
    };

    exports = {
      capture: capture,
      objects: objects,
      data: data,
      die: die,
      dom: dom,
      engineerHit: engineerHit,
      infantryHit: infantryHit,
      nullifyChain: nullifyChain,
      nullifyBalloon: nullifyBalloon,
      init: initBunker,
      repair: repair
    };

    initBunker();

    return exports;

  };

  EndBunker = function(options) {

    var css, dom, data, height, objects, nearby, exports;

    function setFiring(state) {

      if (state && data.energy) {
        data.firing = state;
      } else {
        data.firing = false;
      }

    }

    function hit(points, target) {

      // only tank gunfire counts against end bunkers.
      if (target && target.data.type === 'gunfire' && target.data.parentType && target.data.parentType === TYPES.tank) {
        data.energy = Math.max(0, data.energy - points);
        updateEnergy(exports);
      }

    }

    function fire() {

      var fireOptions;

      if (data.firing && data.energy && data.frameCount % data.fireModulus === 0) {

        fireOptions = {
          parentType: data.type,
          isEnemy: data.isEnemy,
          collisionItems: nearby.items,
          x: data.x + (data.width + 1),
          y: game.objects.view.data.world.height - data.gunYOffset, // half of height
          vX: 2,
          vY: 0
        };

        game.objects.gunfire.push(new GunFire(fireOptions));

        // other side
        fireOptions.x = (data.x - 1);

        // and reverse direction
        fireOptions.vX = -2;

        game.objects.gunfire.push(new GunFire(fireOptions));

        if (sounds.genericGunFire) {
          playSound(sounds.genericGunFire, exports);
        }

      }

    }

    function captureFunds(target) {

      var maxFunds, capturedFunds, allFunds;

      // infantry only get to steal so much at a time.
      // because they're special, engineers get to rob the bank! 💰
      allFunds = !!target.data.role;
      maxFunds = allFunds ? game.objects.endBunkers[data.isEnemy ? 1 : 0].data.funds : 20;

      capturedFunds = Math.min(data.funds, maxFunds);

      if (!tutorialMode) {
        if (data.isEnemy) {
          if (!capturedFunds) {
            game.objects.notifications.add('🏦🏴‍☠️🤷 Your engineer captured 0 enemy funds. 😒 Good effort, though.');
          } else {
            if (allFunds) {
              game.objects.notifications.add('🏦🏴‍☠️💰 Your engineer captured all ' + capturedFunds + (capturedFunds > 1 ? ' enemy funds! 🤑' : ' enemy fund. 😒'));
            } else {
              game.objects.notifications.add('🏦🏴‍☠️💸 ' + capturedFunds + ' enemy ' + (capturedFunds > 1 ? ' funds' : ' fund') + ' captured! 💰');
            }
          }
        } else {
          if (allFunds) {
            game.objects.notifications.add('🏦🏴‍☠️💸 The enemy\'s engineer captured all of your funds. 😱');
          } else {
            game.objects.notifications.add('🏦🏴‍☠️💸 The enemy captured ' + capturedFunds + ' of your funds. 😨');
          }
        }
      }

      // who gets the loot?
      if (data.isEnemy) {
        // local player
        game.objects.endBunkers[0].data.funds += capturedFunds;
        game.objects.view.updateFundsUI();
      } else {
        // CPU
        game.objects.endBunkers[1].data.funds += capturedFunds;
      }

      data.funds -= capturedFunds;

      if (target) {
        target.die({ silent: true });
        playSound(sounds.doorClose, exports);
      }

      // force update of the local helicopter
      // TODO: yeah, this is a bit hackish.
      game.objects.helicopters[0].updateStatusUI({ funds: true});

    }

    function animate() {

      var offset, earnedFunds;

      data.frameCount++;

      nearbyTest(nearby);

      fire();

      if (data.frameCount % data.fundsModulus === 0) {

        if (!objects.helicopter) {
          objects.helicopter = game.objects.helicopters[(data.isEnemy ? 1 : 0)];
        }

        // edge case: tutorial mode, and no enemy chopper present yet
        if (!objects.helicopter) {
          return false;
        }

        // figure out what region the chopper is in, and award funds accordingly. closer to enemy space = more reward.
        offset = objects.helicopter.data.x / game.objects.view.data.battleField.width;

        if (data.isEnemy) {
          offset = 1 - (objects.helicopter.data.x / objects.helicopter.data.x);
        }

        if (offset < 0.33) {
          earnedFunds = 1;
        } else if (offset >= 0.33 && offset < 0.66) {
          earnedFunds = 2;
        } else {
          earnedFunds = 3;
        }

        data.funds += earnedFunds;

        if (data.isEnemy) {
          if (debug) console.log('the enemy now has ' + data.funds + ' funds.');
        } else {

          game.objects.notifications.add('+' + (earnedFunds === 1 ? '💰' : earnedFunds + ' 💰'));
          game.objects.view.updateFundsUI();
        }

        objects.helicopter.updateStatusUI({ funds: true });

      }

      // note: end bunkers never die, but leaving this in anyway.
      return (data.dead && !dom.o);

    }

    function updateHealth(attacker) {
      // notify if just neutralized by tank gunfire
      if (data.energy) return;
      if (!attacker || attacker.data.type !== TYPES.gunfire || !attacker.data.parentType || attacker.data.parentType !== TYPES.tank) return;
      // we have a tank, after all
      if (attacker.data.isEnemy) {
        game.objects.notifications.add('The enemy neutralized your end bunker 🚩', { noRepeat: true });
      } else {
        game.objects.notifications.add('You neutralized the enemy\'s end bunker ⛳', { noRepeat: true });
      }
    }

    function initEndBunker() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      common.setTransformXY(exports, dom.o, data.x + 'px', data.y + 'px');

      game.objects.radar.addItem(exports, dom.o.className);

    }

    options = options || {};

    height = 19;

    css = inheritCSS({
      className: TYPES.endBunker
    });

    data = inheritData({
      type: TYPES.endBunker,
      bottomAligned: true,
      frameCount: 0,
      energy: 0,
      energyMax: 10,
      x: (options.x || (options.isEnemy ? worldWidth - 48 : 8)),
      y: game.objects.view.data.world.height - height - 2,
      width: 39,
      halfWidth: 19,
      height: height,
      funds: (!options.isEnemy ? DEFAULT_FUNDS : 0),
      firing: false,
      gunYOffset: 10,
      fireModulus: 4,
      fundsModulus: FPS * 10,
      midPoint: null
    }, options);

    data.midPoint = {
      x: data.x + data.halfWidth + 5,
      y: data.y,
      width: 5,
      height: data.height
    };

    dom = {
      o: null
    };

    objects = {
      helicopter: null
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      hit: hit,
      updateHealth: updateHealth
    };

    nearby = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        useLookAhead: true,
        // TODO: rename to something generic?
        hit: function(target) {
          var isFriendly = (target.data.isEnemy === data.isEnemy);

          if (!isFriendly && data.energy) {
            // nearby enemy, and defenses activated? let 'em have it.
            setFiring(true);
          }

          // nearby infantry or engineer?
          if (target.data.type === TYPES.infantry) {
            // enemy at door, and funds to steal?
            if (!isFriendly) {
              if (data.funds && collisionCheckMidPoint(exports, target)) {
                captureFunds(target);
              }
            } else if (!target.data.role && !data.energy && isFriendly && collisionCheckMidPoint(exports, target)) {
              // infantry-only (role is not 1): end bunker presently isn't "staffed" / manned by infantry, guns are inoperable.
              // claim infantry, enable guns.
              data.energy = data.energyMax;
              updateEnergy(exports);
              // die silently.
              target.die({ silent: true });
              playSound(sounds.doorClose, exports);
            }
          }

        },
        miss: function() {
          setFiring(false);
        }
      },
      // who gets fired at?
      items: [TYPES.infantry, 'engineers', 'helicopters'],
      targets: []
    };

    initEndBunker();

    return exports;

  };

  SuperBunker = function(options) {

    var css, dom, data, height, nearby, radarItem, exports;

    function updateFireModulus() {

      // firing speed increases with # of infantry
      data.fireModulus = 8 - data.energy;

    }

    function capture(isEnemy) {

      if (isEnemy && !data.isEnemy) {

        data.isEnemy = true;

        utils.css.remove(radarItem.dom.o, css.friendly);
        utils.css.add(radarItem.dom.o, css.enemy);

        game.objects.notifications.add('The enemy captured a super bunker 🚩');

        playSoundWithDelay(sounds.enemyClaim, exports, 500);

      } else if (!isEnemy && data.isEnemy) {

        data.isEnemy = false;

        utils.css.remove(radarItem.dom.o, css.enemy);
        utils.css.add(radarItem.dom.o, css.friendly);

        game.objects.notifications.add('You captured a super bunker ⛳');

        playSoundWithDelay(sounds.friendlyClaim, exports, 500);

      }

      // check if enemy convoy production should stop or start
      checkProduction();

    }

    function setFiring(state) {

      if (state && data.energy) {
        data.firing = state;
      } else {
        data.firing = false;
      }

    }

    function updateHealth(attacker) {
      // notify if just disarmed by tank gunfire
      // note: the super bunker has not become friendly to the tank; it's still "dangerous", but unarmed and won't fire at incoming units.
      if (data.energy) return;
      if (!attacker || attacker.data.type !== TYPES.gunfire || !attacker.data.parentType || attacker.data.parentType !== TYPES.tank) return;
      // we have a tank, after all
      if (attacker.data.isEnemy) {
        game.objects.notifications.add('An enemy tank disarmed a super bunker 🚩', { noRepeat: true });
      } else {
        game.objects.notifications.add('A friendly tank disarmed a super bunker ⛳', { noRepeat: true });
      }
    }

    function hit(points, target) {
      // only tank gunfire counts against super bunkers.
      if (target && target.data.type === 'gunfire' && target.data.parentType && target.data.parentType === TYPES.tank) {
        data.energy = Math.max(0, data.energy - points);
        updateFireModulus();
        updateEnergy(exports);
      }
    }

    function die() {

      if (data.dead) return;

      // gunfire from both sides should now hit this element.

      data.energy = 0;
      updateFireModulus();

      // this object, in fact, never actually dies because it only becomes neutral/hostile and can still be hit.
      data.dead = false;

      data.hostile = true;

      // ensure the radar shows this, too
      utils.css.remove(radarItem.dom.o, css.friendly);
      utils.css.add(radarItem.dom.o, css.enemy);

      updateEnergy(exports);

      // check if enemy convoy production should stop or start
      checkProduction();

    }

    function fire() {

      var fireOptions;

      if (data.firing && data.energy !== 0 && data.frameCount % data.fireModulus === 0) {

        fireOptions = {
          parentType: data.type,
          isEnemy: data.isEnemy,
          collisionItems: nearby.items,
          x: data.x + (data.width + 1),
          y: data.y + data.gunYOffset, // half of height
          vX: 2,
          vY: 0
        };

        game.objects.gunfire.push(new GunFire(fireOptions));

        // other side
        fireOptions.x = (data.x - 1);

        // and reverse direction
        fireOptions.vX = -2;

        game.objects.gunfire.push(new GunFire(fireOptions));

        if (sounds.genericGunFire) {
          playSound(sounds.genericGunFire, exports);
        }

      }

    }

    function animate() {

      data.frameCount++;

      // start, or stop firing?
      nearbyTest(nearby);

      fire();

      // note: super bunkers never die, but leaving this in anyway.
      return (!dom.o);

    }

    function initSuperBunker() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    options = options || {};

    height = 28;

    css = inheritCSS({
      className: TYPES.superBunker,
      friendly: 'friendly'
    });

    data = inheritData({
      type: TYPES.superBunker,
      bottomAligned: true,
      frameCount: 0,
      energy: (options.energy || 0),
      energyMax: 5, // note: +/- depending on friendly vs. enemy infantry
      isEnemy: (options.isEnemy || false),
      width: 66,
      halfWidth: 33,
      doorWidth: 6,
      height: height,
      firing: false,
      gunYOffset: 20.5,
      // fire speed relative to # of infantry arming it
      fireModulus: 8 - (options.energy || 0),
      fundsModulus: FPS * 10,
      hostile: false,
      midPoint: null,
      y: game.objects.view.data.world.height - height
    }, options);

    if (data.energy === 0) {
      // initially neutral/hostile only if 0 energy
      data.hostile = true;
    }

    // coordinates of the doorway
    data.midPoint = {
      x: data.x + data.halfWidth - (data.doorWidth / 2),
      y: data.y,
      // hackish: make the collision point the center, not the actual width
      width: 1,
      height: data.height
    };

    dom = {
      o: null
    };

    exports = {
      animate: animate,
      capture: capture,
      data: data,
      die: die,
      dom: dom,
      hit: hit,
      updateHealth: updateHealth
    };

    nearby = {

      options: {

        source: exports, // initially undefined
        targets: undefined,
        useLookAhead: true,

        hit: function(target) {

          var isFriendly = (target.data.isEnemy === data.isEnemy);

          if (!isFriendly && data.energy > 0) {
            // nearby enemy, and defenses activated? let 'em have it.
            setFiring(true);
          }

          // only infantry (and engineer sub-types) are involved, beyond this point
          if (target.data.type !== TYPES.infantry) return;

          // super bunkers can hold up to five men. only interact if not full (and friendly), OR an opposing, non-friendly infantry.
          if (data.energy < data.energyMax || !isFriendly) {

            // infantry at door? contribute to capture, or arm base, depending.

            if (collisionCheckMidPoint(exports, target)) {

              // claim infantry, change "alignment" depending on friendliness.

              if (data.energy === 0) {

                // claimed by infantry, switching sides from neutral/hostile.
                data.hostile = false;

                // ensure that if we were dead, we aren't any more.
                data.dead = false;

                // super bunker can be enemy, hostile or friendly. for now, we only care about enemy / friendly.
                if (target.data.isEnemy) {

                  capture(true);

                } else {

                  capture(false);

                }

              }

              // add or subtract energy, depending on alignment.
              // explicitly-verbose check, for legibility.

              if (data.isEnemy) {

                // enemy-owned....
                if (target.data.isEnemy) {
                  // friendly passer-by.
                  if (data.energy) game.objects.notifications.add('The enemy reinforced a super bunker 💪');
                  data.energy++;
                } else {
                  if (data.energy > 1) game.objects.notifications.add('You weakened a super bunker ⚔️');
                  data.energy--;
                }

              } else if (!target.data.isEnemy) {
                // player-owned...
                if (data.energy) game.objects.notifications.add('You reinforced a super bunker 💪');
                data.energy++;
              } else {
                if (data.energy > 1) game.objects.notifications.add('The enemy weakened a super bunker ⚔️');
                data.energy--;
              }

              // limit to +/- range.
              data.energy = Math.min(data.energyMax, data.energy);

              // small detail: firing speed relative to # of infantry
              updateFireModulus();

              if (data.energy === 0) {

                // un-manned, but dangerous to helicopters on both sides.
                data.hostile = true;

                if (target.data.isEnemy) {
                  game.objects.notifications.add('Enemy infantry neutralized a super bunker ⚔️');
                } else {
                  game.objects.notifications.add('Your infantry neutralized a super bunker ⛳');
                }

                utils.css.remove(radarItem.dom.o, css.friendly);
                utils.css.add(radarItem.dom.o, css.enemy);

              }

              // "claim" the infantry, kill if enemy and man the bunker if friendly.
              target.die({ silent: true });

              playSound(sounds.doorClose, target.data.exports);

              updateEnergy(exports);

            }

          }

        },

        miss: function() {
          setFiring(false);
        }

      },

      // who gets fired at?
      items: [TYPES.infantry, 'engineers', 'missileLaunchers', 'vans', 'helicopters'],
      targets: []

    };

    initSuperBunker();

    return exports;

  };

  Turret = function(options) {

    var css, data, dom, height, radarItem, collisionItems, targets, exports;

    function okToMove() {

      // guns scan and fire 100% of the time, OR a random percent bias based on the amount of damage they've sustained. No less than 25% of the time.

      if (data.energy === 0) {
        return false;
      }

      return (data.energy === data.energyMax || (1 - Math.random() < (Math.max(0.25, data.energy / data.energyMax))));

    }

    function setAngle(angle) {

      // TODO: CSS animation for this?
      // updateIsOnScreen(exports); from within animate() ?
      if (data.isOnScreen && features.transform.prop) {
        dom.oSubSprite.style[features.transform.prop] = 'rotate(' + angle + 'deg)';
      }

    }

    function resetAngle() {

      if (!features.transform.prop) return;
      dom.oSubSprite.style[features.transform.prop] = '';

    }

    function fire() {

      var deltaX, deltaY, deltaXGretzky, deltaYGretzky, angle, otherTargets, target, moveOK;

      target = enemyHelicopterNearby(data, game.objects.view.data.browser.fractionWidth);

      // alternate target(s) within range?
      if (!target && targets) {

        otherTargets = enemyNearby(data, targets, game.objects.view.data.browser.fractionWidth);

        if (otherTargets.length) {

          // take first target as closest?
          // TODO: sort by closest distance?
          target = otherTargets[0];

        }

      }

      // target has been lost (or died, etc.)
      if (!target && data.firing) {
        data.firing = false;
        data.fireCount = 0;
        resetAngle();
        utils.css.remove(dom.o, css.firing);
      }

      if (!target) return;

      // we have a live one.

      if (!data.firing) {
        utils.css.add(dom.o, css.firing);
        data.firing = true;
      }

      deltaX = target.data.x - data.x;
      deltaY = target.data.y - data.y;

      // Gretzky: "Skate where the puck is going to be".
      deltaXGretzky = target.data.vX;
      deltaYGretzky = target.data.vY;

      // turret angle
      angle = (Math.atan2(deltaY, deltaX) * rad2Deg) + 90;
      angle = Math.max(-data.maxAngle, Math.min(data.maxAngle, angle));

      // hack: target directly to left, on ground of turret: correct 90 to -90 degrees.
      if (deltaX < 0 && angle === 90) {
        angle = -90;
      }

      moveOK = okToMove();

      if (data.frameCount % data.fireModulus === 0 && moveOK) {

        data.fireCount++;

        game.objects.gunfire.push(new GunFire({
          parentType: data.type,
          isEnemy: data.isEnemy,
          // turret gunfire mostly hits airborne things.
          collisionItems: collisionItems,
          x: data.x + data.width + 2 + (deltaX * 0.05),
          y: bottomAlignedY() + 8 + (deltaY * 0.05),
          vX: (deltaX * 0.05) + deltaXGretzky,
          vY: Math.min(0, (deltaY * 0.05) + deltaYGretzky)
        }));

        if (sounds.turretGunFire) {
          playSound(sounds.turretGunFire, exports);

          if (data.fireCount === 1 || data.fireCount % data.shellCasingInterval === 0) {
            // shell casing?
            setFrameTimeout(function() {
              playSound(sounds.bulletShellCasing, exports);
            }, 250 + rnd(250));
          }
        }

      }

      // target the enemy
      data.angle = angle;
      if (moveOK) {
        setAngle(angle);
      }

    }

    function die(options) {

      if (data.dead) return;

      // reset rotation
      data.angle = 0;
      setAngle(0);

      // special case: when turret is initially rendered as dead, don't explode etc.
      if (!options || !options.silent) {

        if (!data.isOnScreen) {
          if (!data.isEnemy) {
            game.objects.notifications.add('The enemy neutralized a turret 💥');
          } else {
            game.objects.notifications.add('You neutralized a turret 💥');
          }
        }

        utils.css.add(dom.o, css.exploding);

        setFrameTimeout(function() {
          utils.css.remove(dom.o, css.exploding);
        }, 1200);

        common.inertGunfireExplosion({ count: 4 + rndInt(4), exports: exports });

        common.smokeRing(exports, { isGroundUnit: true });

        playSound(sounds.metalHitBreak, exports);
        playSound(sounds.genericExplosion, exports);
      }

      utils.css.add(dom.o, css.destroyed);
      utils.css.add(radarItem.dom.o, css.destroyed);

      data.energy = 0;

      data.dead = true;

      updateEnergy(exports);

    }

    function restore() {

      // restore visual, but don't re-activate gun yet
      if (data.dead && data.energy === 0) {

        utils.css.remove(dom.o, css.destroyed);
        utils.css.remove(radarItem.dom.o, css.destroyed);

        if (data.isEnemy) {
          game.objects.notifications.add('The enemy started rebuilding a turret 🛠️');
        } else {
          game.objects.notifications.add('You started rebuilding a turret 🛠️');
        }

        playSound(sounds.turretEnabled, exports);

      }

    }

    function isEngineerInteracting() {

      return (data.engineerInteracting && data.energy < data.energyMax);

    }

    function repair(engineer, complete) {

      var result = false;

      if (data.energy < data.energyMax) {

        if (data.frameCount % data.repairModulus === 0 || complete) {

          restore();

          data.lastEnergy = data.energy;

          data.energy = (complete ? data.energyMax : Math.min(data.energyMax, data.energy + 1));

          if (data.dead && data.energy > (data.energyMax * 0.25)) {
            // restore to life at 25%
            data.dead = false;
            if (data.isEnemy) {
              game.objects.notifications.add('The enemy re-enabled a turret');
            } else {
              game.objects.notifications.add('You re-enabled a turret');
            }
          }

          updateEnergy(exports);

        }

        result = true;

      } else if (data.lastEnergy < data.energy) {
        // only stop sound once, when repair finishes
        if (sounds.tinkerWrench && sounds.tinkerWrench.sound) {
          stopSound(sounds.tinkerWrench);
        }
        data.lastEnergy = data.energy;
      }

      return result;

    }

    function setEnemy(isEnemy) {

      if (data.isEnemy === isEnemy) return;

      data.isEnemy = isEnemy;

      utils.css[isEnemy ? 'add' : 'remove'](dom.o, css.enemy);

      playSoundWithDelay((isEnemy ? sounds.enemyClaim : sounds.friendlyClaim), exports, 500);

    }

    function claim(isEnemy) {

      if (data.frameCount % data.claimModulus !== 0) return;

      data.claimPoints++;

      if (data.claimPoints < data.claimPointsMax) return;

      // change sides.
      if (!data.dead) {
        // notify only if engineer is capturing a live turret.
        // otherwise, it'll be neutralized and then rebuilt.
        if (isEnemy) {
          game.objects.notifications.add('The enemy captured a turret 🚩');
        } else {
          game.objects.notifications.add('You captured a turret ⛳');
        }
      }

      setEnemy(isEnemy);
      data.claimPoints = 0;

    }

    function engineerHit(target) {

      // target is an engineer; either repairing, or claiming.

      data.engineerInteracting = true;

      if (data.isEnemy !== target.data.isEnemy) {

        // gradual take-over.
        claim(target.data.isEnemy);

      } else {

        repair(target);

      }

      // play repair sounds?
      playRepairingWrench(isEngineerInteracting, exports);

      // playImpactWrench(isEngineerInteracting, exports);

      playTinkerWrench(isEngineerInteracting, exports);

    }

    function engineerCanInteract(isEnemy) {

      // passing engineers should only stop if they have work to do.
      return (data.isEnemy !== isEnemy || data.energy < data.energyMax);

    }

    function animate() {

      data.frameCount++;

      if (data.frameCount % data.scanModulus === 0) {
        if (!data.dead) fire();
      }

      if (data.energy > 0 && data.energy < data.energyMax && data.frameCount % data.smokeModulus === 0) {

        // smoke relative to damage

        if (Math.random() > 1 - ((data.energyMax - data.energy) / data.energyMax)) {

          game.objects.smoke.push(new Smoke({
            x: data.x + data.halfWidth + (parseInt(Math.random() * data.halfWidth * 0.5 * (Math.random() > 0.5 ? -1 : 1), 10)),
            y: data.y + data.halfHeight + (parseInt(Math.random() * data.halfHeight * 0.5 * (Math.random() > 0.5 ? -1 : 1), 10))
          }));

        }

        // randomize next one a bit
        data.smokeModulus = 2 + parseInt(Math.random() * FPS, 10);

      }

      if (!data.dead && data.energy > 0 && data.frameCount % data.repairModulus === 0) {
        // self-repair
        repair();
      }

      // engineer interaction flag
      if (data.engineerInteracting) {
        data.engineerInteracting = false;
      }

    }

    function initTurret() {

      dom.o = makeSprite({
        className: css.className
      });

      dom.oSubSprite = makeSubSprite();
      dom.o.appendChild(dom.oSubSprite);


      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      common.setTransformXY(exports, dom.o, data.x + 'px', data.y + 'px');

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    collisionItems = ['helicopters', 'balloons', 'parachuteInfantry'];

    if (gameType === 'hard' || gameType === 'extreme') {
      // additional challenge: make turret gunfire dangerous to some ground units, too.
      collisionItems = collisionItems.concat(['tanks', 'vans', TYPES.infantry, 'missileLaunchers', 'bunkers', 'superBunkers']);
    }

    if (gameType === 'extreme') {
      // additional challenge: make turret go after ground vehicles, as well. also, just to be extra-mean: smart missiles.
      targets = ['tanks', 'vans', 'missileLaunchers', 'smartMissiles'];
      // also: engineers will not be targeted, but can be hit.
      collisionItems = collisionItems.concat(['engineers', 'smartmissiles']);
    }

    options = options || {};

    height = 15;

    css = inheritCSS({
      className: TYPES.turret,
      destroyed: 'destroyed',
      firing: 'firing'
    });

    data = inheritData({
      type: TYPES.turret,
      bottomAligned: true,
      dead: false,
      energy: 50,
      energyMax: 50,
      lastEnergy: 50,
      firing: false,
      frameCount: 2 * game.objects.turrets.length, // stagger so sound effects interleave nicely
      fireModulus: (tutorialMode ? 12 : (gameType === 'extreme' ? 2 : (gameType === 'hard' ? 3 : 6))), // a little easier in tutorial mode vs. hard vs. easy modes
      scanModulus: 1,
      claimModulus: 8,
      repairModulus: FPS,
      smokeModulus: 2,
      claimPoints: 0,
      claimPointsMax: 50,
      engineerInteracting: false,
      y: 0,
      width: 6,
      height: height,
      // hacks
      halfWidth: 7,
      halfHeight: 7,
      angle: 0,
      maxAngle: 90,
    }, options);

    dom = {
      o: null,
      oSubSprite: null,
      oTransformSprite: null,
    };

    exports = {
      animate: animate,
      data: data,
      die: die,
      dom: dom,
      engineerCanInteract: engineerCanInteract,
      engineerHit: engineerHit,
      restore: restore,
      repair: repair
    };

    initTurret();

    // "dead on arrival"
    if (options.DOA) {
      die(true);
    }

    return exports;

  };

  Base = function(options) {

    var css, data, dom, exports;

    function fire() {

      var targetHelicopter = enemyHelicopterNearby(data, game.objects.view.data.browser.fractionWidth);

      if (targetHelicopter) {

        game.objects.smartMissiles.push(new SmartMissile({
          parentType: data.type,
          isEnemy: data.isEnemy,
          isRubberChicken: true, // because why not, it's a special case anyway
          x: data.x + (data.width / 2),
          y: bottomAlignedY() - (data.height / 2),
          target: targetHelicopter
        }));

      }

    }

    function die() {

      var counter = 0,
        counterMax = 30,
        leftOffset;

      data.dead = true;

      // move to the target
      // TODO: transition? Get centering right. +/- half of screen width.
      leftOffset = (game.objects.view.data.battleField.width * (data.isEnemy ? 1 : -1));

      game.objects.view.setLeftScroll(leftOffset);

      // disable view + helicopter events?
      // TODO: make this a method; cleaner, etc.
      game.objects.view.data.ignoreMouseEvents = true;
      game.objects.helicopters[0].data.ignoreMouseEvents = true;

      function randomCount() {
        return (15 + parseInt(Math.random() * 15, 10));
      }

      function randomVelocity() {
        return (5 + parseInt(Math.random() * 10, 10));
      }

      function boom() {

        shrapnelExplosion(data, {
          count: randomCount(),
          velocity: randomVelocity(),
          randomX: true
        });

        // make a noise?
        if (sounds.genericExplosion) {
          playSound(sounds.genericExplosion, exports);
        }

        counter++;

        if (counter >= counterMax) {

          // HUGE boom, why not.
          setFrameTimeout(function() {

            if (sounds.genericExplosion) {
              playSound(sounds.genericExplosion, exports);
              playSound(sounds.genericExplosion, exports);
              playSound(sounds.genericExplosion, exports);
            }

            if (sounds.baseExplosion) {
              playSound(sounds.baseExplosion, exports);
            }

            setFrameTimeout(function() {

              var i;

              for (i = 0; i < 7; i++) {

                shrapnelExplosion(data, {
                  count: 64,
                  velocity: 16,
                  randomX: true
                });

              }

              // hide the base, too - since it should be gone.
              if (dom && dom.o) {
                dom.o.style.display = 'none';
              }

            }, 25);

          }, 3500);

        } else {

          // big boom
          setFrameTimeout(boom, 100 + rndInt(100));

        }

      }

      document.getElementById('game-tips-list').innerHTML = '';

      boom();

    }

    function animate() {

      if (!data.dead) {

        if (data.frameCount % data.fireModulus === 0) {
          fire();
          data.frameCount = 0;
        }

        data.frameCount++;

      }

    }

    function initBase() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }


      dom.oTransformSprite = makeTransformSprite();
      dom.o.appendChild(dom.oTransformSprite);

      game.dom.world.appendChild(dom.o);

      game.objects.radar.addItem(exports, dom.o.className);

    }

    options = options || {};

    css = inheritCSS({
      className: 'base'
    });

    data = inheritData({
      type: 'base',
      bottomAligned: true,
      dead: false,
      frameCount: 0,
      fireModulus: tutorialMode ? FPS * 5 : FPS * 2,
      // left side, or right side (roughly)
      x: (options.x || (options.isEnemy ? 8192 - 192 : 64)),
      y: 0,
      bottomY: (options.bottomY || 0),
      width: 125,
      height: 34,
      halfWidth: 62,
      halfHeight: 17,
      // bases don't move, but these are for explosions.
      vX: 0,
      vY: 0
    }, options);

    dom = {
      o: null,
      oTransformSprite: null,
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die
    };

    initBase();

    return exports;

  };

  Chain = function(options) {

    var css, data, dom, objects, exports, defaultHeight;

    function applyHeight() {

      dom.o.style.height = (data.height + 'px');
      data.appliedHeight = parseInt(data.height, 10);

    }

    function moveTo(x, y, height) {

      var needsUpdate = false;

      if (x !== undefined && data.x !== x) {
        data.x = x;
        needsUpdate = true;
      }

      if (y !== undefined && data.y !== y) {
        data.y = y;
        needsUpdate = true;
      }

      if (needsUpdate && data.isOnScreen) {
        common.setTransformXY(dom.o, data.x + 'px', data.y + 'px');
      }

      if (height !== undefined && data.height !== height) {
        // don't update DOM - $$$ paint even when GPU compositing,
        // because this invalidates the texture going to the GPU (AFAICT)
        // on every animation frame. just translate and keep fixed height.
        data.height = height;
      }

    }

    function die() {

      if (data.dead) return;

      removeNodes(dom);

      data.energy = 0;

      data.dead = true;

      // detach balloon, if applicable
      if (objects.balloon) {
        objects.balloon.detach();
        objects.balloon = null;
      }

      // remove bunker reference, too
      if (objects.bunker) {
        objects.bunker.nullifyChain();
        objects.bunker = null;
      }

    }

    function animate() {

      var x, y, height;

      height = data.height;

      // move if attached, fall if not

      if (objects.bunker && !objects.bunker.data.dead) {

        // bunker

        data.isEnemy = objects.bunker.data.isEnemy;

        if (objects.balloon) {

          // bunker -> chain -> balloon

          y = objects.balloon.data.y + objects.balloon.data.height;

          // make the chain fall faster if the balloon is toast.
          if (objects.balloon.data.dead) {

            // fall until the bottom is reached.
            if (data.y < worldHeight + 2) {

              data.fallingVelocity += data.fallingVelocityIncrement;
              y = data.y + data.fallingVelocity;

            } else {

              // chain has fallen to bottom - stay there.
              // chain may be reset if balloon is restored.
              y = data.y;

              // reset height until next balloon respawn.
              // prevent bunkers from showing chains when they are
              // brought off-screen -> on-screen and have no balloon.
              if (data.appliedHeight !== 0) {
                height = 0;
                data.height = 0;
                applyHeight();
              }

            }

          } else {

            // balloon is active, may have respawned.
            // reset falling state.
            if (data.fallingVelocity) {
              data.fallingVelocity = data.fallingVelocityInitialRate;
            }

            // live height in DOM might have been zeroed if balloon was dead. restore if so.
            if (!data.appliedHeight) {
              height = defaultHeight;
              data.height = defaultHeight;
              applyHeight();
            }

          }

          // always track height, only assign if chain becomes detached.
          height = (worldHeight - y - objects.bunker.data.height) + 4;

        } else {

          // - bunker -> chain, no balloon object at all?
          // this case should probably never happen
          // and might be a bug if it does. ;)

          y = worldHeight - data.height;

        }

      } else {

        // no bunker

        data.hostile = true;

        if (objects.balloon && !objects.balloon.data.dead) {

          // chain -> balloon
          x = objects.balloon.data.x + objects.balloon.data.halfWidth + 5;

          y = objects.balloon.data.y + objects.balloon.data.height;

        } else {

          // free-falling, detached chain
          y = data.y;

          y += data.fallingVelocity;

          // cheap gravity acceleration
          data.fallingVelocity += data.fallingVelocityIncrement;

          if (y >= worldHeight + 2) {
            die();
          }

        }

      }

      if (dom.o) {

        moveTo(x, y, height);

      }

      return (data.dead && !data.o);

    }

    function initChain() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      common.setTransformXY(dom.o, data.x + 'px', data.y + 'px');

      applyHeight();

      game.dom.world.appendChild(dom.o);

    }

    options = options || {};

    css = inheritCSS({
      className: 'chain'
    });

    defaultHeight = worldHeight + 5;

    data = inheritData({
      type: 'chain',
      energy: 1,
      hostile: false, // applies when detached from base or balloon
      width: 1,
      /**
       * slightly complex: element height is basically fixed, moved via transforms,
       * set at init, zeroed when chain drops and reset if balloon respawns.
       */
      height: defaultHeight,
      // tracks what's actually on the DOM
      appliedHeight: 0,
      damagePoints: 6,
      fallingVelocity: 0.5,
      fallingVelocityInitialRate: 0.5,
      fallingVelocityIncrement: 0.125,
    }, options);

    dom = {
      o: null
    };

    objects = {
      bunker: options.bunker || null,
      balloon: options.balloon || null
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die,
      applyHeight: applyHeight
    };

    initChain();

    return exports;

  };

  MissileLauncher = function(options) {

    var css, data, dom, friendlyNearby, height, radarItem, exports;

    function stop() {

      data.stopped = true;

    }

    function resume() {

      data.stopped = false;

    }

    function moveTo(x, y) {

      var needsUpdate;

      if (x !== undefined && data.x !== x) {
        data.x = x;
        needsUpdate = true;
      }

      if (y !== undefined && data.y !== y) {
        data.y = y;
        needsUpdate = true;
      }

      if (needsUpdate) {
        common.setTransformXY(exports, dom.o, data.x + 'px', data.y + 'px');
      }

    }

    function die(options) {

      if (data.dead) return;

      if (!options || !options.silent) {

        utils.css.add(dom.o, css.exploding);

        if (sounds.genericExplosion) {
          playSound(sounds.genericExplosion, exports);
        }

        common.inertGunfireExplosion({ exports: exports });

        setFrameTimeout(function() {
          removeNodes(dom);
        }, 1000);

      } else {

        removeNodes(dom);

      }
  
      // stop moving while exploding
      data.vX = 0;

      data.energy = 0;

      data.dead = true;

      radarItem.die({ silent: (options && options.silent) });

    }

    function fire() {

      var i, j, similarMissileCount, targetHelicopter;

      if (data.frameCount % data.fireModulus !== 0) return;

      // is an enemy helicopter nearby?
      targetHelicopter = enemyHelicopterNearby(data, 256);

      if (!targetHelicopter) return;

      // we have a possible target. any missiles already chasing it?
      similarMissileCount = 0;

      for (i = 0, j = game.objects.smartMissiles.length; i < j; i++) {
        if (game.objects.smartMissiles[i].objects.target === targetHelicopter) {
          similarMissileCount++;
        }
      }

      if (similarMissileCount) return;

      /**
       * player's missile launchers: fire and target enemy chopper only when "unattended."
       * e.g., don't fire if a friendly turret or helicopter is nearby; they can handle it.
       * CPU makes missile launchers routinely, whereas they're strategic for human player.
       * in the enemy case, fire at player regardless of who's nearby. makes game tougher.
       */

      if (!data.isEnemy) {

        // friendly turret
        if (objectInView(data, {
          items: 'turrets',
          friendlyOnly: true
        })) {
          return;
        }

        // friendly helicopter
        if (objectInView(data, {
          items: 'helicopters',
          friendlyOnly: true
        })) {
          return;
        }

      }

      // self-destruct, FIRE ZE MISSILE
      die();

      game.objects.smartMissiles.push(new SmartMissile({
        parentType: data.type,
        isEnemy: data.isEnemy,
        isBanana: (missileMode === bananaMode),
        isRubberChicken: (missileMode === rubberChickenMode),
        x: data.x + (data.width / 2),
        y: data.y,
        target: targetHelicopter
      }));

    }

    function animate() {

      data.frameCount++;

      if (data.dead) return !dom.o;

      if (!data.stopped) {
        moveTo(data.x + data.vX, data.y);
      }

      common.smokeRelativeToDamage(exports);

      if (data.orderComplete && !data.stopped) {

        // regular timer or back wheel bump
        if (data.frameCount % data.stateModulus === 0) {

          data.state++;

          if (data.state > data.stateMax) {
            data.state = 0;
          }

          // reset frameCount (timer)
          data.frameCount = 0;

          // first wheel, delay, then a few frames until we animate the next two.
          if (data.state === 1 || data.state === 3) {
            data.stateModulus = 36;
          } else {
            data.stateModulus = 4;
          }

          data.frameCount = 0;

          if (data.isOnScreen) {
            dom.o.style.backgroundPosition = '0px ' + (data.height * data.state * -1) + 'px';
          }

        } else if (data.frameCount % data.stateModulus === 2 && data.isOnScreen) {

          // next frame - reset.
          dom.o.style.backgroundPosition = '0px 0px';

        }

      }

      recycleTest(exports);

      // (maybe) fire?
      fire();

      nearbyTest(friendlyNearby);

      return (data.dead && !dom.o);

    }

    function initMissileLauncher() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      common.setTransformXY(exports, dom.o, data.x + 'px', data.y + 'px');

      initNearby(friendlyNearby, exports);

      data.frameTimeout = setFrameTimeout(function() {
        data.orderComplete = true;
        data.frameTimeout = null;
      }, 2000);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    options = options || {};

    height = 18;

    css = inheritCSS({
      className: 'missile-launcher'
    });

    data = inheritData({
      type: 'missile-launcher',
      bottomAligned: true,
      energy: 3,
      energyMax: 3,
      direction: 0,
      vX: (options.isEnemy ? -1 : 1),
      frameCount: 0,
      frameTimeout: null,
      fireModulus: FPS, // check every second or so
      width: 54,
      halfWidth: 27,
      height: height,
      halfHeight: height / 2,
      orderComplete: false,
      state: 0,
      stateMax: 3,
      stateModulus: 38,
      inventory: {
        frameCount: 60,
        cost: 3
      },
      x: options.x || 0,
      y: game.objects.view.data.world.height - height - 2
      
    }, options);

    dom = {
      o: null
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die
    };

    friendlyNearby = {
      options: {
        source: exports,
        targets: undefined,
        useLookAhead: true,
        // stop moving if we roll up behind a friendly vehicle
        friendlyOnly: true,
        hit: stop,
        miss: resume
      },
      // who are we looking for nearby?
      items: ['tanks', 'vans', 'missileLaunchers'],
      targets: []
    };

    if (!options.noInit) {
      initMissileLauncher();
    }

    return exports;

  };

  GunFire = function(options) {

    var css, data, dom, collision, exports, frameTimeout, radarItem;

    options = options || {};

    function randomDistance() {
      return (rndInt(10) * plusMinus()) + 'px';
    }

    function spark() {

      utils.css.add(dom.o, css.spark);

      // randomize a little

      if (Math.random() > 0.5) {
        dom.o.style.marginLeft = randomDistance();
      }

      if (Math.random() > 0.5) {
        dom.o.style.marginTop = randomDistance();
      }

      applyRandomRotation(dom.o);

    }

    function die() {

      // aieee!

      if (!dom.o) return;

      removeNodes(dom);

      data.dead = true;

      if (radarItem) {
        radarItem.die({
          silent: true
        });
      }

    }

    function sparkAndDie(target) {

      spark();

      // hack: no more animation.
      // data.dead = true;

      utils.css.add(dom.o, css.dead);

      if (target) {

        // special case: tanks hit turrets for a lot of damage.
        if (data.parentType === TYPES.tank && target.data.type === TYPES.turret) {
          data.damagePoints = 8;
        }

        // special case: tanks are impervious to infantry gunfire, end-bunkers and super-bunkers are impervious to helicopter gunfire.
        if (!(data.parentType === TYPES.infantry && target.data.type === TYPES.tank) && !(data.parentType === TYPES.helicopter && (target.data.type === TYPES.endBunker || target.data.type === TYPES.superBunker))) {
          common.hit(target, data.damagePoints, exports);
        }

        // play a sound for certain targets and source -> target combinations

        if (target.data.type === TYPES.helicopter) {

          playSound(sounds.boloTank, exports);

        } else if (

          target.data.type === TYPES.tank
          || target.data.type === TYPES.helicopter
          || target.data.type === TYPES.van
          || target.data.type === TYPES.bunker
          || target.data.type === TYPES.endBunker
          || target.data.type === TYPES.superBunker
          // helicopter -> turret
          || (data.parentType === TYPES.helicopter && target.data.type === TYPES.turret)

        ) {

          playSound(sounds.metalHit, exports);

        } else if (

          target.data.type === TYPES.balloon
          || target.data.type === TYPES.turret

        ) {

          playSound(sounds.metalHitLight, exports);

        }

      }

      // and cleanup shortly.
      frameTimeout = setFrameTimeout(function() {
        die();
        frameTimeout = null;
      }, 250);

    }

    function moveTo(x, y) {

      if (x !== undefined && data.x !== x) {
        data.x = x;
      }

      if (y !== undefined && data.y !== y) {
        data.y = y;
      }

      updateIsOnScreen(exports);

      if (data.isOnScreen) {
        common.setTransformXY(dom.o, x + 'px', y + 'px');
      }

    }

    function animate() {

      // pending die()
      if (frameTimeout) return false;

      if (data.dead) return true;

      if (!data.expired && data.frameCount > data.expireFrameCount) {
        utils.css.add(dom.o, css.expired);
        if (radarItem) utils.css.add(radarItem.dom.o, css.expired);
        data.expired = true;
      }

      if (data.expired) {
        data.gravity *= 1.1;
      }

      moveTo(data.x + data.vX, data.y + data.vY + (data.expired ? data.gravity : 0));

      data.frameCount++;

      if (data.frameCount >= data.dieFrameCount) {
        die();
      }

      // bottom?
      if (data.y > game.objects.view.data.battleField.height) {
        die();
      }

      collisionTest(collision, exports);

      // notify caller if now dead and can be removed.
      return (data.dead && !dom.o);

    }

    function initGunFire() {

      dom.o = makeSprite({
        className: css.className
      });

      common.setTransformXY(dom.o, data.x + 'px', data.y + 'px');

      dom.o = game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

      if (radarItem && data.isEnemy) {
        utils.css.add(radarItem.dom.o, css.enemy);
      }

    }

    css = inheritCSS({
      className: 'gunfire',
      expired: 'expired',
      spark: 'spark'
    });

    data = inheritData({
      type: 'gunfire',
      parentType: options.parentType || null,
      isEnemy: options.isEnemy,
      expired: false,
      frameCount: 0,
      expireFrameCount: options.expireFrameCount || 25,
      dieFrameCount: options.dieFrameCount || 75, // live up to N frames, then die?
      width: 2,
      height: 1,
      gravity: 1,
      damagePoints: options.damagePoints || 1
    }, options);

    dom = {
      o: null
    };

    collision = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        hit: function(target) {
          // special case: let tank gunfire pass thru if 0 energy, or friendly.
          if (!(data.parentType === TYPES.tank && target.data.type === TYPES.endBunker && (target.data.energy === 0 || target.data.isEnemy === data.isEnemy))) {
            sparkAndDie(target);
          }
        }
      },
      // if unspecified, use default list of items which bullets can hit.
      items: options.collisionItems || ['tanks', 'vans', 'bunkers', 'missileLaunchers', 'infantry', 'parachuteInfantry', 'engineers', 'helicopters', 'balloons', 'smartMissiles', 'endBunkers', 'superBunkers', 'turrets']
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die
    };

    initGunFire();

    return exports;

  };

  Bomb = function(options) {

    var css, data, dom, collision, radarItem, exports;

    function moveTo(x, y) {

      updateIsOnScreen(exports);

      if (x !== undefined && data.x !== x) {
        data.x = x;
      }

      if (y !== undefined && data.y !== y) {
        data.y = y;
      }

    }

    function die(dieOptions) {

      // aieee!

      var className;

      if (data.dead) return;

      dieOptions = dieOptions || {};

      // possible hit, blowing something up.

      if (!dieOptions.omitSound && sounds.genericBoom) {
        playSound(sounds.genericBoom, exports);
      }

      // bombs blow up big on the ground, and "spark" on other things.
      className = (!dieOptions.spark ? css.explosionLarge : css.spark);

      if (dieOptions.bottomAlign) {

        // stick this explosion to the bottom.
        className += ' bottom-align';

      } else if (dieOptions.extraY) {

        // move bomb spark a few pixels down so it's in the body of the target. applies mostly to tanks.
        data.y += 3 + parseInt(Math.random() * 3, 10);
        moveTo(data.x + data.vX, data.y + data.vY + data.gravity);

      }

      if (dom.o) {
        utils.css.add(dom.o, className);

        if (dieOptions.spark) {
          applyRandomRotation(dom.o);
        }

        data.deadTimer = setFrameTimeout(function() {
          removeNodes(dom);
          data.deadTimer = null;
        }, 500);
      }

      data.dead = true;

      if (radarItem) {
        radarItem.die({
          silent: true
        });
      }

    }

    function bombHitTarget(target) {

      var isSpark,
        damagePoints;

      // assume default
      damagePoints = data.damagePoints;

      if (target.data.type && target.data.type === TYPES.balloon) {

        die({
          omitSound: true,
          spark: true
        });

      } else {

        // certain targets should get a spark vs. a large explosion
        isSpark = target.data.type && target.data.type.match(/balloon|helicopter|tank|van|missileLauncher|parachuteInfantry|bunker|turret/i);

        die({
          spark: isSpark,
          bottomAlign: !isSpark,
          // and a few extra pixels down, for tanks (visual correction vs. boxy collision math)
          extraY: (target.data.type && target.data.type.match(/tank/i) ? 3 + parseInt(Math.random() * 3, 10) : 0)
        });

      }

      // special cases for bomb -> target interactions
      if (target.data.type) {

        if (target.data.type === TYPES.helicopter) {

          // one bomb kills a helicopter.
          damagePoints = target.data.energyMax;

        } else if (target.data.type === TYPES.turret) {

          // bombs do more damage on turrets.
          damagePoints = 10;

        }

      }

      common.hit(target, damagePoints);

    }

    function animate() {

      if (!data.dead) {

        if (data.firstFrame) {
          // trigger CSS animation on first frame
          utils.css.add(dom.o, css.dropping);
          data.firstFrame = false;
        }

        data.gravity *= 1.1;

        moveTo(data.x + data.vX, data.y + data.vY + data.gravity);

        // collision check?

        // hit bottom?
        if (data.y - data.height > game.objects.view.data.battleField.height) {
          die({
            bottomAlign: true
          });
        }

        collisionTest(collision, exports);

      }

      // notify caller if dead, and node has been removed.
      return (data.dead && !data.deadTimer && !dom.o);

    }

    function initBomb() {

      dom.o = makeSprite({
        className: css.className
      });


      // hack?
      if (features.transform.prop) {
        dom.o.style.left = data.x + 'px';
        dom.o.style.top = data.y + 'px';
        // dom.o.style.left = dom.o.style.top = '0px';
      }

      game.dom.world.appendChild(dom.o);

      // TODO: don't create radar items for bombs from enemy helicopter when cloaked
      radarItem = game.objects.radar.addItem(exports, dom.o.className);

      if (data.isEnemy) {
        utils.css.add(radarItem.dom.o, css.enemy);
      }

    }

    options = options || {};

    css = inheritCSS({
      className: 'bomb',
      dropping: 'dropping',
      explosionLarge: 'explosion-large',
      spark: 'spark'
    });

    data = inheritData({
      type: 'bomb',
      deadTimer: null,
      firstFrame: true,
      width: 13,
      height: 12,
      gravity: 1,
      damagePoints: 3,
      vX: (options.vX || 0)
    }, options);

    dom = {
      o: null
    };

    collision = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        hit: function(target) {
          bombHitTarget(target);
        }
      },
      items: ['balloons', 'tanks', 'vans', 'missileLaunchers', 'infantry', 'parachuteInfantry', 'engineers', 'bunkers', 'superBunkers', 'helicopters', 'turrets']
    };

    exports = {
      animate: animate,
      data: data,
      die: die,
      dom: dom
    };

    initBomb();

    return exports;

  };

  Cloud = function(options) {

    var cloudType, cloudWidth, cloudHeight, css, dom, data, exports;

    function moveTo(x, y) {

      if (x !== undefined && data.x !== x) {
        data.x = x;
      }

      if (y !== undefined && data.y !== y) {
        data.y = y;
      }

      if (data.isOnScreen) {
        common.setTransformXY(dom.o, data.x + 'px', data.y + 'px');
      }

    }

    function animate() {

      data.frameCount++;

      if (data.frameCount % data.windModulus === 0) {

        // TODO: improve, limit on axes

        data.windOffsetX += (data.x < 0 || Math.random() > 0.5 ? 0.25 : -0.25);

        data.windOffsetX = Math.max(-3, Math.min(3, data.windOffsetX));

        data.windOffsetY += (data.y < 72 || Math.random() > 0.5 ? 0.1 : -0.1);

        data.windOffsetY = Math.max(-0.5, Math.min(0.5, data.windOffsetY));

        // and randomize
        data.windModulus = 16 + rndInt(16);

      }

      // prevent clouds drifting out of the world, by shifting the wind
      // (previously: hard bounce / reverse, didn't look right.)
      if (data.x + data.width > worldWidth) {
        data.windOffsetX = Math.max(data.windOffsetX - 0.05, -3);
      } else if (data.x < 0) {
        data.windOffsetX = Math.min(data.windOffsetX + 0.05, 3);
      }

      if ((data.windOffsetY > 0 && worldHeight - data.y - 32 < 64) || (data.windOffsetY < 0 && data.y < 64)) {
        // reverse gears
        data.windOffsetY *= -1;
      }

      moveTo(data.x + data.windOffsetX, data.y + data.windOffsetY);

    }

    function initCloud() {

      dom.o = makeSprite({
        className: css.className
      });

      common.setTransformXY(dom.o, data.x + 'px', data.y + 'px');

      game.dom.world.appendChild(dom.o);

    }

    options = options || {};

    cloudType = (Math.random() > 0.5 ? 2 : 1);

    cloudWidth = (cloudType === 2 ? 125 : 102);
    cloudHeight = (cloudType === 2 ? 34 : 29);

    css = inheritCSS({
      className: 'cloud' + cloudType
    });

    data = inheritData({
      type: 'cloud',
      isNeutral: true,
      frameCount: 0,
      windModulus: 16,
      windOffsetX: 0,
      windOffsetY: 0,
      verticalDirection: 0.33,
      verticalDirectionDefault: 0.33,
      y: options.y || (96 + parseInt((worldHeight - 96 - 128) * Math.random(), 10)),
      width: cloudWidth,
      halfWidth: parseInt(cloudWidth / 2, 10),
      height: cloudHeight,
      halfHeight: parseInt(cloudHeight / 2, 10)
    }, options);

    dom = {
      o: null
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom
    };

    initCloud();

    return exports;

  };

  SmartMissile = function(options) {

    /**
     * I am so smart!
     * I am so smart!
     * S-MRT,
     * I mean, S-MAR-T...
     *  -- Homer Simpson
     */

    var css, dom, data, radarItem, objects, collision, launchSound, exports;

    function moveTo(x, y) {

      var hitBottom = false;

      if (x !== undefined && data.x !== x) {
        data.x = x;
      }

      // prevent from "crashing" into terrain, only if not expiring and target is still alive
      if (!data.expired && !objects.target.data.dead && y >= data.yMax) {
        y = data.yMax;
        hitBottom = true;
      }

      if (y !== undefined && data.y !== y) {
        data.y = y;
      }

      // push x/y to history arrays, maintain size

      data.xHistory.push(data.x);
      data.yHistory.push(data.y);

      if (data.xHistory.length > data.trailerCount + 1) {
        data.xHistory.shift();
      }

      if (data.yHistory.length > data.trailerCount + 1) {
        data.yHistory.shift();
      }

      return hitBottom;

    }

    function moveTrailers() {

      var i, j;

      for (i = 0, j = data.trailerCount; i < j; i++) {

        // if previous X value exists, apply it
        if (data.xHistory[i]) {
          dom.trailers[i].style.left = data.xHistory[i] + (data.width / 2) + 'px';
          dom.trailers[i].style.top = data.yHistory[i] + (data.height / 2) + 'px';
        }

      }

    }

    function hideTrailers() {

      var i, j;

      for (i = 0, j = data.trailerCount; i < j; i++) {

        // if previous X value exists, apply it
        if (data.xHistory[i]) {
          dom.trailers[i].style.display = 'none';
        }

      }

    }

    function spark() {
      utils.css.add(dom.o, css.spark);
      applyRandomRotation(dom.o);
    }

    function makeTimeout(callback) {
      if (objects._timeout) objects._timeout.reset();
      objects._timeout = setFrameTimeout(callback, 350);
    }

    function addTracking(targetNode, radarNode) {
      if (targetNode) {
        utils.css.add(targetNode, css.tracking);
        makeTimeout(function() {
          // this animation needs to run possibly after the object has died.
          if (targetNode) utils.css.add(targetNode, css.trackingActive);
        });
      }

      if (radarNode) {
        // radar goes immediately to "active" state, no transition.
        utils.css.add(radarNode, css.trackingActive);
      }

    }

    function removeTrackingFromNode(node) {
      if (!node) return;

      // remove tracking animation
      utils.css.remove(node, css.tracking);
      utils.css.remove(node, css.trackingActive);

      // start fading/zooming out
      utils.css.add(node, css.trackingRemoval);
    }

    function removeTracking(targetNode, radarNode) {

      removeTrackingFromNode(targetNode);
      removeTrackingFromNode(radarNode);

      // one timer for both.
      makeTimeout(function() {
        if (targetNode) {
          utils.css.remove(targetNode, css.trackingRemoval);
        }
        if (radarNode) {
          utils.css.remove(radarNode, css.trackingRemoval);
        }
      });

    }

    function setTargetTracking(tracking) {
      var targetNode = objects.target.dom.o;
      var radarNode = (objects.target.radarItem && objects.target.radarItem.dom && objects.target.radarItem.dom.o);
      if (tracking) {
        addTracking(targetNode, radarNode);
      } else {
        removeTracking(targetNode, radarNode);
      }
    }

    function die(excludeShrapnel) {

      var dieSound;

      if (!data.deadTimer) {

        utils.css.add(dom.o, css.spark);

        applyRandomRotation(dom.o);

        if (sounds.genericBoom) {
          playSound(sounds.genericBoom, exports);
        }

        if (!excludeShrapnel) {
          shrapnelExplosion(data, {
            count: 3,
            velocity: 2 + Math.random()
          });
        }

        data.deadTimer = setFrameTimeout(function() {
          hideTrailers();
          removeNodes(dom);
        }, 250);

        data.energy = 0;

        // stop tracking the target.
        setTargetTracking();

        radarItem.die();

        if (data.isRubberChicken && sounds.rubberChicken.die) {

          // don't "die" again if the chicken has already moaned, i.e., from expiring.
          if (!data.expired) {

            dieSound = playSound(sounds.rubberChicken.die, exports);

          }

          if (launchSound) {

            launchSound.stop();

            if (!data.expired && dieSound) {
              // hackish: apply launch sound volume to die sound
              dieSound.setVolume(launchSound.volume);
            }

          }

        }

      }

      data.dead = true;

    }

    function sparkAndDie(target) {

      // TODO: reduce timers
      spark();

      // hack: no more animation.
      data.dead = true;

      if (target) {
        common.hit(target, data.damagePoints);
      }

      die();

    }

    function animate() {

      var deltaX, deltaY, newTarget, targetData, angle, hitBottom, targetHalfWidth, targetHeightOffset;

      if (!data.dead) {

        targetData = objects.target.data;

        targetHalfWidth = targetData.width / 2;
        targetHeightOffset = (targetData.type === TYPES.balloon ? 0 : targetData.height / 2);

        // delta of x/y between this and target
        deltaX = (targetData.x + targetHalfWidth) - data.x;

        // TODO: hack full height for balloon?
        deltaY = (targetData.y + (targetData.bottomAligned ? targetHeightOffset : -targetHeightOffset)) - data.y;

        // if original target has died, try to find a new target.
        // e.g., two missiles fired at enemy helicopter, first one hits and kills it.
        // in the original game, missiles would die when the original target died -
        // but, missiles are rare (you get two per chopper) and take time to re-arm,
        // and they're "smart" - so in my version, missiles get retargeting capability
        // for at least one animation frame after the original target is lost.
        // if retargeting finds nothing at the moment the original is lost, the missile will die.
        if (!data.expired && (!objects.target || objects.target.data.dead)) {

          // stop tracking the old one, as applicable.
          if (objects.target.data.dead) {
            setTargetTracking();
          }

          newTarget = getNearestObject(exports, {
            useInFront: true
          });

          if (newTarget && !newTarget.data.cloaked && !newTarget.data.dead) {
            // we've got a live one!
            if (launchSound) {
              launchSound.stop().play();
            }
            objects.target = newTarget;
            // and start tracking.
            setTargetTracking(true);
          }

        }

        if (!data.expired && (data.frameCount > data.expireFrameCount || (!objects.target || objects.target.data.dead))) {

          utils.css.add(dom.o, css.expired);
          utils.css.add(radarItem.dom.o, css.expired);

          data.expired = true;
          data.hostile = true;

          // burst of thrust when the missile expires?
          data.vX *= 1.5;
          data.vY *= 1.5;

          if (data.isRubberChicken && sounds.rubberChicken.expire) {

            playSound(sounds.rubberChicken.expire, exports);

            if (launchSound) {
              // hackish: apply launch sound volume, for consistency
              sounds.rubberChicken.expire.sound.setVolume(launchSound.volume);
            }

          }

          // if still tracking something, un-mark it.
          setTargetTracking();

        }

        if (data.expired) {

          // fall...
          data.gravity *= 1.1;

          // ... and decelerate on X-axis.
          data.vX *= 0.95;

        } else {

          // x-axis

          // data.vX += (deltaX >= 0 ? data.thrust : -data.thrust);

          // if changing directions, cut in half.
          data.vX += deltaX * 0.0065;

          // y-axis

          if (deltaY <= targetData.height && deltaY >= -targetData.height) {

            // lock on target.

            if (data.vY >= 0 && data.vY >= 0.25) {
              data.vY *= 0.8;
            } else if (data.vY <= 0 && data.vY < -0.25) {
              data.vY *= 0.8;
            }

          } else {

            // relative to target at all times
            // data.vY += deltaY * 0.0125;

            data.vY += (deltaY >= 0 ? data.thrust : -data.thrust);

          }

        }

        // and throttle
        data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
        data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));

        if (Math.random() >= 0.95) {

          game.objects.smoke.push(new Smoke({
            x: data.x,
            y: data.y,
            spriteFrame: 3
          }));

        }

        hitBottom = moveTo(data.x + data.vX, data.y + data.vY + (data.expired ? data.gravity : 0));

        if (!hitBottom) {

          // hack deltas for angle

          if (deltaX > 360) {
            deltaX %= 180;
          }

          angle = Math.atan2(deltaY, deltaX) * deg2Rad;

        } else if (data.vX > 0) {

          // bottom-aligned. Heading left, or right?
          angle = 0;

        } else {

          angle = 180;

        }

        if (features.transform.prop) {
          dom.o.style[features.transform.prop] = 'rotate(' + angle + 'deg)';
        }

        moveTrailers();

        data.frameCount++;

        if (data.frameCount >= data.dieFrameCount) {
          die();
          // but don't fall too fast?
          data.vYMax *= 0.5;
        }

        // hit bottom?
        if (data.y > game.objects.view.data.battleField.height - 3) {
          data.y = game.objects.view.data.battleField.height - 3;
          die(true);
        }

        collisionTest(collision, exports);

      }

      // notify caller if now dead and can be removed.
      return (data.dead && !dom.o);

    }

    function initSmartMissle() {

      var i, trailerConfig, fragment;

      fragment = document.createDocumentFragment();

      dom.o = makeSprite({
        className: css.className
      });

      trailerConfig = {
        className: css.trailer
      };

      for (i = 0; i < data.trailerCount; i++) {
        dom.trailers.push(makeSprite(trailerConfig));
        // TODO: clone, optimize etc.
        fragment.appendChild(dom.trailers[i]);
      }

      // (literal) smoke test
      dom.oSubSprite = makeSubSprite();
      dom.o.appendChild(dom.oSubSprite);

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      data.yMax = (game.objects.view.data.battleField.height - data.height);

      game.dom.world.appendChild(fragment);

      game.dom.world.appendChild(dom.o);

      // mark the target.
      setTargetTracking(true);

      // findTarget();

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

      if (data.isRubberChicken && sounds.rubberChicken.launch) {

        // special case: enemy missile launchers should always play at full volume - they're close enough.
        launchSound = playSound(sounds.rubberChicken.launch, (data.parentType === 'missile-launcher' && data.isEnemy ? null : exports));

      } else if (sounds.missileLaunch) {

        playSound(sounds.missileLaunch, exports);

      }

    }

    options = options || {};

    if (forceRubberChicken) {
      options.isRubberChicken = true;
    }

    css = inheritCSS({
      className: 'smart-missile',
      tracking: 'smart-missile-tracking',
      trackingActive: 'smart-missile-tracking-active',
      trackingRemoval: 'smart-missile-tracking-removal',
      trailer: 'smart-missile-trailer',
      expired: 'expired',
      spark: 'spark'
    });

    // special case
    if (options.isRubberChicken) {
      css.className += ' rubber-chicken';
    }

    data = inheritData({
      type: 'smart-missile',
      parentType: options.parentType || null,
      energy: 1,
      energyMax: 1,
      expired: false,
      hostile: false, // when expiring/falling, this object is dangerous to both friendly and enemy units.
      frameCount: 0,
      expireFrameCount: options.expireFrameCount || 256,
      dieFrameCount: options.dieFrameCount || 640, // 640 frames ought to be enough for anybody.
      width: (options.isRubberChicken ? 24 : 14),
      height: 15,
      gravity: 1,
      damagePoints: 25,
      isRubberChicken: options.isRubberChicken || false,
      vX: 1 + Math.random(),
      vY: 1 + Math.random(),
      vXMax: 10 + (Math.random() * 3),
      vYMax: 10 + (Math.random() * 3),
      thrust: 0.5 + (Math.random() * 0.5),
      deadTimer: null,
      trailerCount: 5,
      xHistory: [],
      yHistory: [],
      yMax: null
    }, options);

    dom = {
      o: null,
      trailers: []
    };

    objects = {
      target: options.target
    };

    collision = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        hit: function(target) {
          sparkAndDie(target);
        }
      },
      items: ['tanks', 'vans', 'missileLaunchers', 'infantry', 'parachuteInfantry', 'engineers', 'helicopters', 'bunkers', 'superBunkers', 'balloons', 'smartMissiles', 'turrets']
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die,
      objects: objects
    };

    initSmartMissle();

    return exports;

  };

  Helicopter = function(options) {

    var css, data, dom, events, objects, collision, radarItem, exports, lastTarget, moveToNeedsUpdate, statsBar;

    function cloak() {

      if (!data.cloaked) {

        utils.css.add(dom.o, css.cloaked);
        utils.css.add(radarItem.dom.o, css.cloaked);

        if (!data.isEnemy && sounds.helicopter.engine) {
          sounds.helicopter.engine.sound.setVolume(sounds.helicopter.engineVolume / 2.5);
        }

      }

      // hackish: mark and/or update the current frame when this happened.
      data.cloaked = game.objects.gameLoop.data.frameCount;

    }

    function uncloak() {

      // hackish: uncloak if a frame or more has passed and we aren't in a cloud.
      if (data.cloaked && data.cloaked !== game.objects.gameLoop.data.frameCount) {

        utils.css.remove(dom.o, css.cloaked);
        utils.css.remove(radarItem.dom.o, css.cloaked);

        if (!data.isEnemy && sounds.helicopter.engine) {
          sounds.helicopter.engine.sound.setVolume(sounds.helicopter.engineVolume);
        }

        data.cloaked = false;

      }

    }

    function centerView() {

      // hack: center on enemy helicopter at all times.

      if (trackEnemy) {
        common.setTransformXY(game.objects.view.dom.battleField, (parseInt(data.x - game.objects.view.data.browser.halfWidth, 10) * -1) + 'px', '0px');
      }

    }

    function updateFuelUI() {

      if (!data.isEnemy) {

        common.setTransformXY(dom.fuelLine, -100 + data.fuel + '%', '0px');

        // hackish: show announcements across 1% of fuel burn process.
        if (!data.repairing && !tutorialMode) {

          if (data.fuel < 33 && data.fuel > 32) {

            game.objects.view.setAnnouncement('Low fuel');

          } else if (data.fuel < 12.5 && data.fuel > 11.5) {

            game.objects.view.setAnnouncement('Fuel critical');

          } else if (data.fuel <= 0) {

            game.objects.view.setAnnouncement('No fuel');

          }

        }

      }

    }

    function burnFuel() {

      var frameCount, modulus;

      // don't burn fuel in these cases
      if (data.dead || data.repairing) return;

      frameCount = game.objects.gameLoop.data.frameCount;

      modulus = (data.landed ? data.fuelModulus : data.fuelModulusFlying);

      if (frameCount % modulus === 0 && data.fuel > 0) {

        // burn!
        data.fuel = Math.max(0, data.fuel - 0.1);

        // update UI
        updateFuelUI();

      }

    }

    function repairInProgress() {
      return (data.repairing && !data.repairComplete);
    }

    function startRepairing() {

      if (!data.repairing) {

        data.repairing = true;

        if (!data.isEnemy) {

          document.getElementById('spinner').style.display = 'block';

          playSound(sounds.repairing);

          setFrameTimeout(function() {
            playRepairingWrench(repairInProgress, exports);
          }, 500 + rndInt(1500));

          setFrameTimeout(function() {
            playImpactWrench(repairInProgress, exports);
          }, 500 + rndInt(1500));

        }

      }

    }

    function stopRepairing() {

      if (data.repairing) {

        data.repairing = false;

        if (!data.isEnemy) {

          document.getElementById('spinner').style.display = 'none';

          if (sounds.repairing) {
            sounds.repairing.sound.stop();
          }

        }

        if (data.repairComplete) {

          data.repairComplete = false;

          if (!data.isEnemy) {

            document.getElementById('repair-complete').style.display = 'none';

          }

        }

      }

    }

    // Status item
    function modify(o, count) {
      if (count > 0) {
        utils.css.remove(o, css.unavailable);
      } else {
        utils.css.add(o, css.unavailable);
      }
    }

    function applyStatusUI(updated) {
      var force = updated.force;

      if (force || updated.parachutes) dom.statusBar.infantryCount.innerText = data.parachutes;
      if (force || updated.ammo) dom.statusBar.ammoCount.innerText = data.ammo;
      if (force || updated.bombs) dom.statusBar.bombCount.innerText = data.bombs;
      if (force || updated.smartMissiles) dom.statusBar.missileCount.innerText = data.smartMissiles;

      var mobileControls;
      var mobileControlItems;

      if (isMobile) {
        mobileControls = document.getElementById('mobile-controls');
        mobileControlItems = mobileControls.querySelectorAll('.mobile-controls-right li');
      }

      if (force || updated.parachutes) {
        modify(dom.statusBar.infantryCountLI, data.parachutes);
        if (isMobile) modify(mobileControlItems[0], data.parachutes);
      }

      if (force || updated.smartMissiles) {
        modify(dom.statusBar.missileCountLI, data.smartMissiles);
        if (isMobile) modify(mobileControlItems[1], data.smartMissiles);
      }

      if (force || updated.ammo) {
        modify(dom.statusBar.ammoCountLI, data.ammo);
        if (isMobile) modify(mobileControlItems[2], data.ammo);
      }

      if (force || updated.bombs) {
        modify(dom.statusBar.bombCountLI, data.bombs);
        if (isMobile) modify(mobileControlItems[3], data.bombs);
      }

      // hackish, fix endBunkers reference
      if (force || updated.funds) {
        // update the funds UI
        game.objects.funds.setFunds(game.objects.endBunkers[0].data.funds);
      }

    }

    function updateStatusUI(updated) {

      // ignore enemy repair / updates, but apply player's changes
      if (
        !data.isEnemy
        && (
          updated.funds
          || updated.force
          || updated.ammo
          || updated.bombs
          || updated.smartMissiles
          || updated.parachutes)
        ) applyStatusUI(updated);

      // fully-repaired?
      if (
        data.repairing
        && !data.repairComplete
        && data.fuel === data.maxFuel
        && data.ammo === data.maxAmmo
        && data.energy === data.energyMax
        && data.bombs === data.maxBombs
        && data.smartMissiles === data.maxSmartMissiles
      ) {

        data.repairComplete = true;

        if (!data.isEnemy) {

          document.getElementById('spinner').style.display = 'none';
          document.getElementById('repair-complete').style.display = 'block';

          if (sounds.repairing) {
            sounds.repairing.sound.stop();
          }

          if (sounds.inventory.end) {
            playSound(sounds.inventory.end);
          }

        }

      }

    }

    function addCSSToAll(nodes, className) {
      for (var i=0, j=nodes.length; i<j; i++) {
        utils.css.add(nodes[i], className);
      }
    }

    function updateInventoryQueue(item) {
      var dataCount, dataType, element, type, typeFromElement, isDuplicate, o, oCounter, oSubSprite, oLastChild, queue, i, j, count;

      queue = document.getElementById('queue');

      dataCount = 'data-count';
      dataType = 'data-type';

      count = 0;

      // FIFO-based queue: `item` is provided when something is being queued.
      // otherwise, the first item has finished and can be removed from the queue.
      if (item) {

        // tank, infrantry, or special-case: engineer.
        type = item.data.role ? item.data.roles[item.data.role] : item.data.type;

        oLastChild = queue.childNodes[queue.childNodes.length-1];

        // are we appending a duplicate, e.g., two tanks in a row?
        if (oLastChild) {
          typeFromElement = oLastChild.getAttribute(dataType);
          console.log('typeFromElement', typeFromElement);

          // direct className match, or, engineer special case
          if (typeFromElement === type) {
            isDuplicate = true;
          }
          console.log('isDuplicate', isDuplicate);

          element = oLastChild;

        }

        if (!isDuplicate) {
          o = document.createElement('div');
          // `stopped` = no sprite animation.
          o.className = ['queue-item', 'stopped', type].join(' ');

          /*
          // special case - engineers
          if (item.data.role) {
            o.className += ' ' + item.data.roles[item.data.role];
          }
          */

          // special engineer case vs. others.
          o.setAttribute(dataType, type);

          oSubSprite = document.createElement('div');
          oSubSprite.className = 'transform-sprite';
          o.appendChild(oSubSprite);

          oCounter = document.createElement('div');
          oCounter.className = 'counter';

          o.appendChild(oCounter);

          queue.appendChild(o);

          element = o;

        }

        oCounter = element.getElementsByClassName('counter')[0];
        count = (parseInt(element.getAttribute(dataCount), 10) || 0) + 1;
        element.setAttribute(dataCount, count);
        oCounter.innerHTML = count;

        setFrameTimeout(function() {
          // transition in
          utils.css.add(o, 'queued');
          // show or hide
          if (count > 1) {
            utils.css.add(element, 'has-counter');
          } else {
            utils.css.remove(element, 'has-counter');
          }
        }, 128);

        // return callbacks for when building starts and finishes.
        return {
          onOrderStart: function() {
            utils.css.add(o, 'building');
            if (isDuplicate) {
              // decrement until complete
              count = (parseInt(element.getAttribute(dataCount), 10) || 1) - 1;
              element.setAttribute(dataCount, count);
            }
          },
          onOrderComplete: function() {
            // mark as complete once all have been built.
            console.log('onOrderComplete');
            count = (parseInt(element.getAttribute(dataCount), 10) || 1) - 1;
            if (!count) {
              utils.css.remove(element, 'building');
              utils.css.add(element, 'complete');
            }
          }
        }

      } else {

        // clear entire queue.

        setFrameTimeout(function() {
          addCSSToAll(queue.childNodes, 'collapsing');
          // finally, remove the nodes.
          // hopefully, no race condition here. :P
          setFrameTimeout(function() {
            // TODO: improve.
            queue.innerHTML = '';
          }, 500);
        }, 500);

      }
    
    }

    function repair() {

      var updated = {};

      data.repairFrames++;

      data.fuel = Math.min(data.maxFuel, data.fuel + 0.4);

      if (data.ammo < data.maxAmmo && data.repairFrames % 2 === 0) {
        data.ammo++;
        updated.ammo = true;
      }

      if (data.repairFrames % 5 === 0) {
        // fix damage (no UI for this)
        data.energy = Math.min(data.energyMax, data.energy + 1);
      }

      if (data.bombs < data.maxBombs && data.repairFrames % 10 === 0) {
        data.bombs++;
        updated.bombs = true;
      }

      if (data.smartMissiles < data.maxSmartMissiles && data.repairFrames % 200 === 0) {
        data.smartMissiles++;
        updated.smartMissiles = true;
      }

      updateFuelUI();
      updateStatusUI(updated);
      updateEnergy(exports);

    }

    function checkFacingTarget(target) {
      // ensure the enemy chopper is facing the target before firing.
      if (!target) return;

      // ignore direction and prevent excessive flipping when bombing tanks, or if hidden within a cloud
      if (data.bombing || data.cloaked) return;

      if ((target.data.x + target.data.width) < data.x && data.rotated) {
        rotate();
      } else if ((target.data.x + target.data.width) > data.x && !data.rotated) {
        rotate();
      }
    }

    function setFiring(state) {

      if (state !== undefined && (!data.onLandingPad || (!state && data.isEnemy))) {
        data.firing = state;
      }

    }

    function setBombing(state) {

      if (state !== undefined && (!data.onLandingPad || (!state && data.isEnemy))) {
        data.bombing = state;
      }

    }

    function setMissileLaunching(state, isRubberChicken) {

      if (data.missileLaunching !== state) {
        data.missileLaunching = state;
        data.rubberChickenLaunching = !!isRubberChicken;
      }

    }

    function setParachuting(state) {

      if (data.parachuting !== state) {
        data.parachuting = state;
      }

    }

    function rotate(force) {

      // flip the helicopter so it's pointing R-L instead of the default R/L (toggle behaviour)

      // if not dead or landed, that is.
      if (!force && (data.dead || data.y <= 0 || data.landed)) return;

      if (data.rotated) {
        // going back to L->R
        utils.css.remove(dom.o, css.facingLeft);
        utils.css.remove(dom.o, css.rotatedLeft);
      } else {
        utils.css.remove(dom.o, css.facingRight);
        utils.css.remove(dom.o, css.rotatedRight);
      }

      data.rotated = !data.rotated;

      utils.css.add(dom.o, data.rotated ? css.rotatedLeft : css.rotatedRight);

      if (!data.rotateTimer) {
        data.rotateTimer = setFrameTimeout(function() {
          utils.css.remove(dom.o, (data.rotated ? css.rotatedLeft : css.rotatedRight));
          utils.css.add(dom.o, (data.rotated ? css.facingLeft : css.facingRight));
          data.rotateTimer = null;
        }, 333);
      }

      if (!data.isEnemy && !data.autoRotate && sounds.helicopter.rotate) {
        playSound(sounds.helicopter.rotate);
      }

    }

    function applyTilt() {

      // L -> R / R -> L + forward / backward

      // auto-rotate feature
      if (data.autoRotate && ((data.vX > 0 && data.lastVX < 0) || (data.vX < 0 && data.lastVX > 0))) {
        rotate();
      }

      // transform-specific, to be provided to common.setTransformXY() as an additional transform
      data.angle = 'rotate(' + ((data.vX / data.vXMax) * 12.5) + 'deg)';

    }

    function onLandingPad(state) {

      data.onLandingPad = state;

      if (state) {

        // edge case: stop firing, etc.
        setFiring(false);
        setBombing(false);

        startRepairing();

      } else {

        stopRepairing();

      }

    }

    function refreshCoords(fromOrientationEvent) {

      var view = game.objects.view;
      var controlsWidth;
      var landscapeDetail;

      // roughly accurate for iPhone X, 01/2018.
      var notchWidth = 50;

      // determine max X and Y coords
      data.xMax = view.data.battleField.width - data.width;
      data.yMax = view.data.world.height - data.height - 2; // including border

      // if mobile, set xMin and mobileControlsWidth (referenced in animate()) to prevent chopper flying over/under mobile controls.
      if (isMobile) {

        // account for mobile controls, if in landscape mode.
        landscapeDetail = getLandscapeLayout();

        if (landscapeDetail) {

          controlsWidth = parseInt(document.querySelectorAll('#mobile-controls ul')[0].offsetWidth, 10);

          // slight offsets, allow helicopter to be very close to controls.
          // some affordance for The Notch, on iPhone (just assume for now, because FFS.)
          data.xMaxOffset = (controlsWidth * 0.75) + (isiPhone && landscapeDetail === 'right' ? notchWidth : 0);
          data.xMin = (controlsWidth * 0.75) + (isiPhone && landscapeDetail === 'left' ? notchWidth : 0);

        } else {

          // portrait mode: just forget it altogether and let helicopter go atop controls.
          // compensate for half of helicopter width being subtracted, too.
          data.xMaxOffset = (-data.width * 0.5);
          data.xMin = (-data.width * 0.5);

          if (fromOrientationEvent) {
            // pause and see if that's what the user wanted, though.
            game.pause();
          }

        }

      }

      // haaaack
      if (!data.yMin) {
        data.yMin = document.getElementById('game-status-bar').offsetHeight;
      }

    }

    function moveTo(x, y) {

      var yMax = (data.yMax - (data.repairing ? 3 : 0));

      // defined externally to avoid massive garbage creation
      moveToNeedsUpdate = false;

      // Hack: limit enemy helicopter to visible screen
      if (data.isEnemy) {
        x = Math.min(8192, Math.max(0, x));
      }

      if (x !== undefined) {
        x = Math.min(data.xMax, x);
        if (x && data.x !== x) {
          moveToNeedsUpdate = true;
          data.x = x;
          data.midPoint.x = data.x + data.halfWidth;
        }
      }

      if (y !== undefined) {
        y = Math.max(data.yMin, Math.min(yMax, y));
        if (data.y !== y) {
          moveToNeedsUpdate = true;
          data.y = y;
          // TODO: redundant?
          data.midPoint.y = data.y;
        }
      }

      if (moveToNeedsUpdate) {
        // reset angle if we're landed.
        if (y >= yMax) {
          data.angle = 0;
        }
        common.setTransformXY(dom.o, x + 'px', y + 'px', data.angle);
      }

    }

    function updateHealth() {
      // smouldering, etc.
      // TODO: optimize class swapping
      if (data.energy < 4) {
        utils.css.add(dom.o, css.hit2);
        utils.css.remove(dom.o, css.hit1);
      } else if (data.energy < 7) {
        utils.css.add(dom.o, css.hit1);
        utils.css.remove(dom.o, css.hit2);
      } else {
        // TODO: optimize
        utils.css.remove(dom.o, css.hit1);
        utils.css.remove(dom.o, css.hit2);
      }
    }

    function reset() {

      data.fuel = data.maxFuel;
      data.energy = data.energyMax;
      data.parachutes = 1;
      data.smartMissiles = data.maxSmartMissiles;
      data.ammo = data.maxAmmo;
      data.bombs = data.maxBombs;

      if (!data.isEnemy) {

        data.vX = 0;
        data.vY = 0;
        data.lastVX = 0;

        if (!tutorialMode) {
          game.objects.view.setAnnouncement();
        }

        if (sounds.helicopter.engine) {
          sounds.helicopter.engine.sound.setVolume(sounds.helicopter.engineVolume);
        }

      } else {

        lastTarget = null;

        data.y = 64;
        data.vX = -8;
        data.lastVX = 0;
        data.vY = 0;

        if (data.rotated) {
          rotate();
        }

      }

      // reset any queued firing actions
      data.bombing = false;
      data.firing = false;
      data.missileLaunching = false;
      data.rubberChickenLaunching = false;
      data.parachuting = false;

      updateHealth();

      var landingPad;

      if (data.isEnemy) {

        landingPad = game.objects.landingPads[game.objects.landingPads.length - 1];

        // todo: clean up (linter dislikes "unexpected mix of '=' and '+'")
        // eslint-disable-next-line no-mixed-operators
        data.x = landingPad.data.x + (landingPad.data.width / 2) - data.halfWidth + 10;

      } else {

        landingPad = game.objects.landingPads[0];

        // todo: clean up (linter dislikes "unexpected mix of '=' and '+'")
        // eslint-disable-next-line no-mixed-operators
        data.x = landingPad.data.x + (landingPad.data.width / 2) - data.halfWidth + 10;

      }

      data.y = game.objects.view.data.world.height - 20;

      common.setTransformXY(dom.o, data.x + 'px', data.y + 'px', data.angle);

      utils.css.remove(dom.o, css.exploding);
      utils.css.remove(dom.o, css.dead);

      // look ma, no longer dead!
      data.dead = false;
      data.pilot = true;

      radarItem.reset();

      // reset everything.
      updateStatusUI({ force: true });

      updateEnergy(exports);

    }

    function respawn() {

      // exit if game is over.
      if (battleOver) return;

      // helicopter died. move view, and reset.

      reset();

      // local player? move the view back to zero.

      if (!data.isEnemy) {

        // hackish: hard reset battlefield scroll
        game.objects.view.data.battleField.scrollLeft = 0;

        // and update scroll view
        game.objects.view.setLeftScroll(0);

        // reposition chopper on landing pad
        // (linter dislikes "unexpected mix of '=' and '+'")
        // eslint-disable-next-line no-mixed-operators
        data.x = game.objects.landingPads[0].data.x + (game.objects.landingPads[0].data.width / 2) - data.halfWidth - 10;

        common.setTransformXY(dom.o, data.x + 'px', data.y + 'px', data.angle);

        // chopper should not be moving
        data.vX = 0;
        data.vY = 0;

      }

    }

    function stopSound(sound) {

      var soundObject = sound && getSound(sound);

      if (soundObject && soundObject.sound.playState) {
        soundObject.sound.stop();
      }

    }

    function startSound(sound) {

      var soundObject;

      soundObject = sound && getSound(sound);

      if (!soundObject) return;

      if (!data.isEnemy) {

        // local? play quiet only if cloaked.
        if (!userDisabledSound) {

          // only start if not already playing
          if (soundObject.sound.playState) {
            soundObject.sound.stop();
          }

          // only start if not already playing
          if (!soundObject.sound.playState) {
            soundObject.sound.play(soundObject.soundOptions[data.cloaked ? 'offScreen' : 'onScreen']);
          }

        }

      } else if (!userDisabledSound && soundObject && !soundObject.playState) {

        // play with volume based on visibility.
        playSound(sound, exports);

      }

    }

    function stopFiringSound() {

      var soundObject = sounds.machineGunFire && sounds.machineGunFire[data.machineGunFireSoundOffset];

      // stop the current loop, start one "firing end" sound.
      if (soundObject) {
        stopSound(soundObject);
      }

      // begin the one-shot (heh) ending sound, if ammo is left.
      if (data.ammo) {
        startSound(sounds.machineGunFireEnd);
      }

    }

    function die() {

      if (data.dead) return;

      // reset animations
      data.frameCount = 0;

      utils.css.add(dom.o, css.exploding);

      shrapnelExplosion(data, {
        count: 20,
        velocity: 5
      });

      // roll the dice: drop a parachute infantry (pilot ejects safely)
      if ((data.isEnemy && (gameType === 'hard' || gameType === 'extreme' ? Math.random() > 0.5 : Math.random() > 0.25)) || Math.random() > 0.66) {
        game.objects.parachuteInfantry.push(new ParachuteInfantry({
          isEnemy: data.isEnemy,
          x: data.x + data.halfWidth,
          y: (data.y + data.height) - 11,
          ignoreShrapnel: true
        }));
      }

      setFrameTimeout(function() {
        utils.css.add(dom.o, css.dead);
        // undo rotate
        if (data.rotated) {
          rotate(true);
        }
      }, 1200);

      data.energy = 0;

      data.dead = true;

      // stop firing
      stopFiringSound();

      radarItem.die();

      if (sounds.explosionLarge) {
        playSound(sounds.explosionLarge, exports);
        if (sounds.genericExplosion) playSound(sounds.genericExplosion, exports);
      }

      if (!data.isEnemy && sounds.helicopter.engine) {
        sounds.helicopter.engine.sound.setVolume(0);
      }

      // don't respawn the enemy chopper during tutorial mode.
      if (!data.isEnemy || !tutorialMode) {
        setFrameTimeout(respawn, (data.isEnemy ? 8000 : 3000));
      }

    }

    function fire() {

      var tiltOffset, frameCount, missileTarget, updated = {};

      frameCount = game.objects.gameLoop.data.frameCount;

      if (!data.firing && !data.bombing && !data.missileLaunching && !data.parachuting) return;

      if (data.firing && frameCount % data.fireModulus === 0) {

        if (data.ammo > 0) {

          tiltOffset = (data.tilt !== null ? data.tiltYOffset * data.tilt * (data.rotated ? -1 : 1) : 0);

          /*eslint-disable no-mixed-operators */
          game.objects.gunfire.push(new GunFire({
            parentType: data.type,
            isEnemy: data.isEnemy,
            x: data.x + ((!data.isEnemy && data.rotated) || (data.isEnemy && !data.rotated) ? 0 : data.width - 8),
            y: data.y + data.halfHeight + (data.tilt !== null ? tiltOffset + 2 : 0),
            vX: data.vX + (8 * (data.rotated ? -1 : 1) * (data.isEnemy ? -1 : 1)),
            vY: (data.y > data.yMin ? data.vY + tiltOffset : 0)
          }));
          /*eslint-enable no-mixed-operators */

          // pick a random sound from the array
          data.machineGunFireSoundOffset = parseInt(Math.random() * (sounds.machineGunFire && sounds.machineGunFire.length), 10);

          var soundObject = sounds.machineGunFire && sounds.machineGunFire[data.machineGunFireSoundOffset];

          if (soundObject) {

            startSound(soundObject);

          }

          // TODO: CPU

          data.ammo = Math.max(0, data.ammo - 1);

          if (!data.isEnemy) {

            updated.ammo = true;

          }

        } else if (!data.isEnemy && sounds.inventory.denied) {

          // player is out of ammo.
          playSound(sounds.inventory.denied);

          // make sure firing has stopped.
          stopFiringSound();

        }

        // SHIFT key still down?
        if (!data.isEnemy && !keyboardMonitor.isDown('shift')) {
          data.firing = false;
          // stop firing sound
          stopFiringSound();
        }

      }

      if (data.bombing && frameCount % data.bombModulus === 0) {

        if (data.bombs > 0) {

          objects.bombs.push(new Bomb({
            isEnemy: data.isEnemy,
            x: data.x + data.halfWidth,
            y: (data.y + data.height) - 6,
            vX: data.vX
          }));

          if (sounds.bombHatch) {
            playSound(sounds.bombHatch);
          }

          data.bombs = Math.max(0, data.bombs - 1);

          if (!data.isEnemy) {
            updated.bombs = true;
          }

        } else if (!data.isEnemy && sounds.inventory.denied) {
          // player is out of ammo.
          playSound(sounds.inventory.denied);
        }

        // CTRL key still down?
        if (!data.isEnemy && !keyboardMonitor.isDown('ctrl')) {
          data.bombing = false;
        }

      }

      if (data.missileLaunching && frameCount % data.missileModulus === 0) {

        if (data.smartMissiles > 0) {

          missileTarget = getNearestObject(exports, { useInFront: true });

          if (missileTarget && !missileTarget.data.cloaked) {

            /*eslint-disable no-mixed-operators */
            objects.smartMissiles.push(new SmartMissile({
              parentType: data.type,
              isEnemy: data.isEnemy,
              x: data.x + (data.rotated ? 0 : data.width) - 8,
              y: data.y + data.halfHeight, // + (data.tilt !== null ? tiltOffset + 2 : 0),
              target: missileTarget,
              // a special variant of the smart missile. ;)
              isRubberChicken: data.rubberChickenLaunching
              // vX: data.vX + 8 * (data.rotated ? -1 : 1)
            }));
            /*eslint-enable no-mixed-operators */

            data.smartMissiles = Math.max(0, data.smartMissiles - 1);

            updated.smartMissiles = true;

          }

        }

        if (!data.isEnemy && (!data.smartMissiles || !missileTarget)) {

          // out of ammo / no available targets
          if (sounds.inventory.denied) {
            playSound(sounds.inventory.denied);
          }

        }

      }

      if (data.parachuting && frameCount % data.parachuteModulus === 0) {

        if (data.parachutes > 0) {

          // helicopter landed? Just create an infantry.
          if (data.landed) {

            game.objects.infantry.push(new Infantry({
              isEnemy: data.isEnemy,
              // don't create at half-width, will be immediately recaptured (picked up) by helicopter.
              x: data.x + (data.width * 0.75),
              y: (data.y + data.height) - 11
            }));

          } else {

            game.objects.parachuteInfantry.push(new ParachuteInfantry({
              isEnemy: data.isEnemy,
              x: data.x + data.halfWidth,
              y: (data.y + data.height) - 11
            }));

          }

          data.parachutes = Math.max(0, data.parachutes - 1);

          updated.parachutes = true;

          playSound(sounds.popSound2, exports);

        } else if (!data.isEnemy && sounds.inventory.denied) {
          playSound(sounds.inventory.denied);
        }

      }

      if (updated.ammo || updated.bombs || updated.smartMissiles || updated.parachutes) {
        updateStatusUI(updated);
      }

    }

    function eject() {

      // bail!
      if (!data.dead && data.pilot) {

        game.objects.parachuteInfantry.push(new ParachuteInfantry({
          x: data.x + data.halfWidth,
          y: (data.y + data.height) - 11
        }));

        if (!tutorialMode) {
          game.objects.view.setAnnouncement('No pilot');
        }

        data.pilot = false;

      }

    }

    function ai() {

      /**
       * Rudimentary, dumb smarts. To call this "AI" would be an insult to the AI community. ;)
       * Rule-based logic: Detect, target and destroy enemy targets, hide in clouds, return to base as needed and so forth.
       */

      var deltaX, deltaY, target, result, altTarget, desiredVX, desiredVY, deltaVX, deltaVY, maxY;

      maxY = 320;

      if (data.fuel <= 0) return;

      // low fuel means low fuel. or ammo. or bombs.

      if (data.energy > 0 && !data.landed && !data.repairing && (data.fuel < 30 || data.energy < 2 || (!data.ammo && !data.bombs))) {

        setFiring(false);
        setBombing(false);

        /**
         * fly toward closest landing pad.
         * rightmost 25% of the battlefield? use own base.
         * otherwise, use "neutral" mid-level base.
         * if you're there and the enemy decides to land,
         * you're going to find yourself in trouble. ;)
         */

        target = game.objects.landingPads[game.objects.landingPads.length - (data.x > 6144 ? 1 : 2)];

        checkFacingTarget(target);

        // aim for landing pad

        deltaX = target.data.x - data.x;
        deltaY = -4;

        data.vX = deltaX;
        data.vY = deltaY;

        data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
        data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));

        data.lastVX = data.vX;
        data.lastVY = data.vY;

        // are we over the landing pad?

        if (data.x >= target.data.x && data.x + data.width <= target.data.x + target.data.width) {

          data.vX = 0;
          data.vY = 4;

        }

        // only for #trackEnemy case
        centerView();

        return;

      }

      if (data.landed) {

        if (data.repairComplete) {

          // repair has completed. go go go!
          data.vY = -4;
          data.vX = -data.vxMax;

          // reset target, too
          lastTarget = null;

        } else {

          // still repairing. don't move.

          data.vX = 0;
          data.vY = 0;

          return;

        }

      }

      if (lastTarget) {

        // toast?

        if (lastTarget.data.dead) {

          // was it a tank? reset tank-seeking mode until next interval.
          if (lastTarget.data.type === TYPES.tank) {
            console.log('AI killed tank. Disabling tank targeting mode.');
            data.targeting.tanks = false;
          }

          lastTarget = null;

        } else if ((lastTarget.data.type === TYPES.balloon || lastTarget.data.type === TYPES.tank) && lastTarget.data.y > maxY) {

          // flying too low?
          lastTarget = null;

        } else if (lastTarget.data.cloaked) {

          // did the player go behind a cloud?
          lastTarget = null;

        }

      }

      if (!lastTarget) {

        if (data.targeting.clouds) {

          lastTarget = objectInView(data, { items: 'clouds' });

          // hack: only go after clouds in the player's half of the field.
          if (lastTarget && lastTarget.data.x > 4096) {
            lastTarget = null;
          }

        }

        if (!lastTarget && data.targeting.balloons && data.ammo) {
          lastTarget = objectInView(data, { items: 'balloons' });
        }

        if (!lastTarget && data.targeting.tanks && data.bombs) {
          lastTarget = objectInView(data, { items: 'tanks' });
        }

        if (!lastTarget && data.targeting.helicopters && data.ammo) {
          lastTarget = objectInView(data, { items: 'helicopters' });
        }

        // is the new target too low?
        if (lastTarget && (lastTarget.data.type === TYPES.balloon || lastTarget.data.type === TYPES.helicopter) && lastTarget.data.y > maxY) {
          lastTarget = null;
        }

        if (lastTarget && lastTarget.data.cloaked) {
          lastTarget = null;
        }

      } else if (lastTarget.data.type === 'cloud') {

        // we already have a target - can we get a more interesting one?
        if (data.targeting.balloons && data.ammo) {
          altTarget = objectInView(data, {
            items: 'balloons',
            triggerDistance: game.objects.view.data.browser.halfWidth
          });
        }

        if (!altTarget && data.targeting.tanks && data.bombs) {
          altTarget = objectInView(data, {
            items: ['tanks'],
            triggerDistance: game.objects.view.data.browser.width
          });
        }

        if (!altTarget && data.targeting.helicopters && data.ammo) {
          altTarget = objectInView(data, {
            items: ['helicopters'],
            triggerDistance: game.objects.view.data.browser.width
          });
        }

        // better - go for that.
        if (altTarget && !altTarget.data.dead) {
          lastTarget = altTarget;
        }

      }

      if (lastTarget && lastTarget.data.dead) {
        lastTarget = null;
      }

      if (lastTarget && lastTarget.data.type === TYPES.tank && data.bombs <= 0) {
        lastTarget = null;
      }

      if (lastTarget && (lastTarget.data.type === TYPES.balloon || lastTarget.data.type === TYPES.helicopter) && (lastTarget.data.y > maxY || data.ammo <= 0)) {
        lastTarget = null;
      }

      if (lastTarget && lastTarget.data.cloaked) {
        lastTarget = null;
      }

      /**
       * sanity check: if after all this, there is no target / nothing to do,
       * clouds aren't being targeted and there's a nearby cloud, go for that.
       */

      if (!lastTarget && !data.targeting.clouds) {

        lastTarget = objectInView(data, { items: 'clouds' });

        // hack: only go after clouds in the player's half of the field, plus one screen width
        if (lastTarget && lastTarget.data.x > 4096 + game.objects.view.data.browser.width) {
          lastTarget = null;
        }

      }

      // now go after the target.

      target = lastTarget;

      data.lastVX = parseFloat(data.vX);

      if (target && !target.data.dead) {

        // go go go!

        result = trackObject(exports, target);

        if (target.data.type !== TYPES.balloon) {

          if (target.data.type === 'landing-pad') {
            result.deltaY = 0;
          }

          /*
          // hack: if target is not a balloon and is bottom-aligned (i.e., a tank), stay at current position.
          if (target.data.bottomAligned) {
            result.deltaY = 0;
          }
          */

        } else {

          setBombing(false);

        }

        // enforce distance limits?
        if (target.data.type === TYPES.balloon || target.data.type === TYPES.helicopter) {

          if (Math.abs(result.deltaX) < 200) {
            result.deltaX = 0;
          }

        }

        desiredVX = result.deltaX;
        desiredVY = result.deltaY;

        deltaVX = Math.abs(data.vX - result.deltaX);

        if (Math.abs(deltaVX) > 1) {
          if (data.vX < desiredVX) {
            data.vX += 1;
          } else {
            data.vX -= 1;
          }
        } else {
          data.vX = 0;
        }

        deltaVY = Math.abs(data.vY - result.deltaY);

        if (Math.abs(deltaVY) > 1) {
          if (data.vY < desiredVY) {
            data.vY += 1;
          } else {
            data.vY -= 1;
          }
        } else {
          data.vY = 0;
        }

        // throttle

        data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
        data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));

        // within firing range?
        if (target.data.type === TYPES.balloon || target.data.type === TYPES.helicopter) {

          if (target.data.type === TYPES.balloon) {

            if (Math.abs(result.deltaX) < 100 && Math.abs(result.deltaY) < 48) {
              setFiring(true);
            } else {
              setFiring(false);
            }

          } else if (Math.abs(result.deltaX) < 100) {

            // shoot at the player

            if (Math.abs(result.deltaY) < 48) {

              setFiring(true);
              setBombing(false);

            } else {

              setFiring(false);

              // bomb the player?
              // TODO: verify that deltaY is not negative.
              if (Math.abs(result.deltaX) < 50 && result.deltaY > 48) {

                setBombing(true);

              } else {

                setBombing(false);

              }

            }

          }

        } else if (target.data.type === TYPES.tank) {

          if (Math.abs(result.deltaX) < target.data.halfWidth && Math.abs(data.vX) < 3) {
            // over a tank?
            setBombing(true);
          } else {
            setBombing(false);
          }

        } else {

          // safety case: don't fire or bomb.
          setFiring(false);
          setBombing(false);

        }

      } else {

        // default: go left
        data.vX -= 0.25;
        // and up
        data.vY -= 0.1;

        // edge case: data.vX sometimes becomes NaN - perhaps when CPU dies and resets??
        if (isNaN(data.vX)) {
          console.log('caught CPU edge case: data.vX NaN case. resetting to 0.');
          data.vX = 0;
        }

        // and throttle
        data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
        data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));

      }

      /**
       * bonus: cloud-based "stealth bombing" mode
       * if in a cloud and cloaked, not actively targeting tanks/helicopters
       * but targets are passing underneath, bomb away.
       */

      if (data.targeting.clouds && !data.targeting.tanks && data.cloaked && data.bombs) {

        // for once, literally, "in the cloud."

        // is a tank very close by?

        altTarget = objectInView(data, {
          items: ['tanks'],
          triggerDistance: game.objects.view.data.browser.fractionWidth
        });

        if (altTarget) {

          result = trackObject(exports, altTarget);

          if (Math.abs(result.deltaX) < 50 && Math.abs(data.vX) < 4) {

            // RELEASE ZE BOMBS

            setBombing(true);

          } else {

            setBombing(false);

          }

        } else {

          setBombing(false);

        }

      }

      // sanity check
      if (!lastTarget || lastTarget.data.dead || lastTarget.data.type === 'cloud' || lastTarget.data.type === 'landing-pad') {
        // no need to be firing...
        setFiring(false);
      }

      if (data.vY > 0 && data.y > maxY && (!lastTarget || lastTarget.data.type !== 'landing-pad')) {
        // hack: flying too low. limit.
        data.y = maxY;
        data.vY -= 0.25;
      }

      // ensure helicopter is pointing the right way, whether chasing a target or flying
      if (target) {
        checkFacingTarget(target);
      } else {
        if (data.vX < 0 && data.rotated) {
          rotate();
        } else if (data.vX > 0 && !data.rotated) {
          rotate();
        }
      }

      centerView();

    }

    function animate() {

      // move according to delta between helicopter x/y and mouse, up to a max.

      var i, j, view, mouse, jamming, newX, spliceArgs, yLimit;

      spliceArgs = [i, 1];

      jamming = 0;

      view = game.objects.view;

      if (!data.isEnemy && (data.pilot && data.fuel > 0)) {

        mouse = view.data.mouse;

        // only allow X-axis if not on ground...
        if (mouse.x) {
          // accelerate scroll vX, so chopper nearly matches mouse when scrolling
          data.lastVX = parseFloat(data.vX);
          // eslint-disable-next-line no-mixed-operators
          data.vX = (view.data.battleField.scrollLeft + (view.data.battleField.scrollLeftVX * 9.5) + mouse.x - data.x - data.halfWidth) * 0.1;
          // and limit
          data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
        }

        if (mouse.y) {
          data.vY = (mouse.y - data.y - view.data.world.y - data.halfHeight) * 0.1;
          // and limit
          data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));
        }

      }

      yLimit = 369 - (data.onLandingPad ? 3 : 0);

      // slight offset when on landing pad
      // hack for Safari, which sometimes confuses the bottom coordinate by a pixel or two. odd.
      if (data.y >= yLimit - (isSafari ? 1 : 0)) {

        data.vX = 0;

        if (data.vY > 0) {
          data.vY = 0;
        }

        if (!data.landed) {
          data.landed = true;
        }

      } else {

        data.landed = false;
        onLandingPad(false);

        // hack: fade logo on first take-off.
        if (!data.isEnemy && (tutorialMode || canHideLogo) && !logoHidden) {

          logoHidden = true;

          window.requestAnimationFrame(function() {

            var overlay = document.getElementById('world-overlay');
            var world = document.getElementById('world');
            var blurred = 'blurred';
            var noBlur = 'no-blur';

            utils.css.add(overlay, 'fade-out');

            utils.css.add(world, noBlur);

            // remove from the DOM eventually
            setFrameTimeout(function() {

              overlay.parentNode.removeChild(overlay);
              overlay = null;

              // remove blur / no-blur entirely.
              utils.css.remove(world, blurred);
              utils.css.remove(world, noBlur);

              // and reset FPS timings, as this may affect peformance.
              game.objects.gameLoop.resetFPS();

            }, (isOldIE ? 1 : 2000));

          });

        }

      }

      // no fuel?
      if (data.fuel <= 0 || !data.pilot) {

        // gravity until dead.
        if (data.vY < 0.5) {
          data.vY += 0.5;
        } else {
          data.vY *= 1.1;
        }

        if (data.landed) {
          die();
        }

      }

      // safety valve: don't move if ignoreMouseEvents
      if (data.ignoreMouseEvents) {
        data.vX = 0;
        data.vY = 0;
      }

      if (!data.dead) {

        newX = data.x + data.vX;

        // is this near the edge of the screen? limit to near screen width if helicopter is ahead of the scrolling screen.

        if (!data.isEnemy) {
          newX = Math.max(view.data.battleField.scrollLeft + (data.width / 2) + data.xMin, Math.min(((view.data.browser.width + view.data.battleField.scrollLeft) - data.xMaxOffset) - (data.width * 1.5), newX));
        }

        applyTilt();

        moveTo(newX, data.y + data.vY);

        collisionTest(collision, exports);

        // repairing?
        if (data.repairing) {
          repair();
        }

      }

      // animate child objects, too

      // TODO: for ... in

      for (i = objects.bombs.length - 1; i >= 0; i--) {
        if (objects.bombs[i].animate()) {
          // object is dead - take it out.
          spliceArgs[0] = i;
          Array.prototype.splice.apply(objects.bombs, spliceArgs);
        }
      }

      for (i = objects.smartMissiles.length - 1; i >= 0; i--) {
        if (objects.smartMissiles[i].animate()) {
          // object is dead - take it out.
          spliceArgs[0] = i;
          Array.prototype.splice.apply(objects.smartMissiles, spliceArgs);
        }
      }

      // should we be firing, also?

      if (!data.dead) {
        fire();
      }

      if (!data.dead && !data.isEnemy) {

        // any enemy vans that are jamming our radar?
        for (i = 0, j = game.objects.vans.length; i < j; i++) {

          if (!game.objects.vans[i].data.dead && game.objects.vans[i].data.isEnemy !== data.isEnemy && game.objects.vans[i].data.jamming) {

            jamming++;

          }

        }

        if (jamming && !data.radarJamming) {

          data.radarJamming = jamming;
          game.objects.radar.startJamming();

        } else if (!jamming && data.radarJamming) {

          data.radarJamming = jamming;
          game.objects.radar.stopJamming();

        }

      }

      // trailer history

      if (game.objects.gameLoop.data.frameCount % data.smokeModulus === 0) {

        // smoke relative to damage

        if (!data.dead && Math.random() > 1 - ((10 - data.energy) / 10)) {

          game.objects.smoke.push(new Smoke({
            x: data.x + data.halfWidth + (parseInt(Math.random() * data.halfWidth * 0.5 * (Math.random() > 0.5 ? -1 : 1), 10)),
            y: data.y + data.halfHeight + (parseInt(Math.random() * data.halfHeight * 0.5 * (Math.random() > 0.5 ? -1 : 1), 10))
          }));

        }

      }

      burnFuel();

      // TODO: isCPU

      if (data.isEnemy) {

        ai();

        if (game.objects.gameLoop.data.frameCount % data.targetingModulus === 0) {

          // should we target tanks?
          data.targeting.tanks = (Math.random() > 0.65);

          // should we target clouds?
          data.targeting.clouds = (Math.random() > 0.5);

          data.targeting.helicopters = (Math.random() > 0.25 || tutorialMode);

          if (winloc.match(/clouds/i)) {
            // hack/testing: cloud-only targeting mode
            data.targeting.balloons = false;
            data.targeting.tanks = false;
            data.targeting.helicopters = false;
            data.targeting.clouds = true;
          }

          if (debug) {
            console.log('AI tank targeting mode: ' + data.targeting.tanks + ', clouds: ' + data.targeting.clouds + ', helicopters: ' + data.targeting.helicopters);
          }

        }

      }

      // uncloak if not in a cloud?
      uncloak();

    }

    function initHelicopter() {

      var i, trailerConfig, fragment;

      if (data.isEnemy) {
        // offset fire modulus by half, to offset sound
        data.frameCount = Math.floor(data.fireModulus / 2);
      }

      fragment = document.createDocumentFragment();

      trailerConfig = {
        className: css.trailer
      };

      for (i = 0; i < data.trailerCount; i++) {
        dom.trailers.push(makeSprite(trailerConfig));
        // TODO: clone, optimize etc.
        fragment.appendChild(dom.trailers[i]);
      }

      game.dom.world.appendChild(fragment);

      dom.o = makeSprite({
        className: css.className + (data.isEnemy ? ' ' + css.enemy : '')
      });

      dom.oTransformSprite = makeTransformSprite();
      dom.o.appendChild(dom.oTransformSprite);

      dom.oSubSprite = makeSubSprite();

      dom.o.appendChild(dom.oSubSprite);

      dom.fuelLine = document.getElementById('fuel-line');

      common.setTransformXY(dom.o, data.x + 'px', data.y + 'px', data.angle);

      game.dom.world.appendChild(dom.o);

      // attach events?

      if (options.attachEvents) {

        if (!isMobile) {
          var world = document.getElementById('world');
          // TODO: static DOM reference.
          utils.events.add(world, 'mousedown', events.mousedown);
          utils.events.add(world, 'dblclick', events.dblclick);
          utils.events.add(window, 'scroll', function(e) {
            // don't allow scrolling at all?
            e.preventDefault();
            return false;
          });
        }

      }

      refreshCoords();

      // if not enemy, force-update status bar UI
      if (!data.isEnemy) {
        updateStatusUI({ force: true });
      }

      // note final true param, for respawn purposes
      radarItem = game.objects.radar.addItem(exports, dom.o.className, true);

    }

    options = options || {};

    css = inheritCSS({
      className: TYPES.helicopter,
      facingLeft: 'facing-left',
      facingRight: 'facing-right',
      rotatedLeft: 'rotated-left',
      rotatedRight: 'rotated-right',
      cloaked: 'cloaked',
      movingLeft: 'moving-left',
      movingRight: 'moving-right',
      tilt: 'tilt',
      hit1: 'smouldering-phase-1',
      hit2: 'smouldering-phase-2',
      inventory: {
        frameCount: 0,
        cost: 20
      },
      unavailable: 'weapon-unavailable'
    });

    data = inheritData({
      type: TYPES.helicopter,
      angle: 0,
      bombing: false,
      firing: false,
      missileLaunching: false,
      rubberChickenLaunching: false,
      parachuting: false,
      ignoreMouseEvents: false,
      fuel: 100,
      maxFuel: 100,
      fireModulus: 2,
      bombModulus: 5,
      fuelModulus: (tutorialMode ? 24 : 8),
      fuelModulusFlying: (tutorialMode ? 9 : 3),
      missileModulus: 12,
      parachuteModulus: 4,
      repairModulus: 2,
      smokeModulus: 2,
      radarJamming: 0,
      repairComplete: false,
      landed: true,
      onLandingPad: true,
      cloaked: false,
      rotated: false,
      rotateTimer: null,
      autoRotate: (options.isEnemy || false),
      repairing: false,
      repairFrames: 0,
      energy: 10,
      energyMax: 10,
      direction: 0,
      pilot: true,
      xMin: 0,
      xMax: null,
      xMaxOffset: 0,
      yMin: 0,
      yMax: null,
      vX: 0,
      vXMax: (options.isEnemy ? 8 : 12),
      vYMax: (options.isEnemy ? 8 : 10),
      lastVX: 0,
      vY: 0,
      vyMin: 0,
      width: 48,
      height: 15,
      halfWidth: 24,
      halfHeight: 7,
      tilt: null,
      lastTiltCSS: null,
      tiltYOffset: 2,
      ammo: (tutorialMode && !options.isEnemy) ? 128 : 64,
      maxAmmo: (tutorialMode && !options.isEnemy) ? 128 : 64,
      bombs: (tutorialMode && !options.isEnemy) ? 30 : 10,
      maxBombs: (tutorialMode && !options.isEnemy) ? 30 : 10,
      parachutes: 1,
      maxParachutes: 5,
      smartMissiles: 2,
      maxSmartMissiles: 2,
      machineGunFireSoundOffset: 0,
      midPoint: null,
      // for AI
      targeting: {
        balloons: true,
        clouds: true,
        helicopters: true,
        tanks: true
      },
      targetingModulus: FPS * 30
    }, options);

    data.midPoint = {
      x: data.x + data.halfWidth + 10,
      y: data.y,
      width: 5,
      height: data.height
    };

    statsBar = document.getElementById('stats-bar');

    dom = {
      o: null,
      fuelLine: null,
      subSprite: null,
      oTransformSprite: null,
      statsBar: statsBar,
      // hackish
      statusBar: {
        infantryCount: document.getElementById('infantry-count'),
        infantryCountLI: statsBar.querySelectorAll('li.infantry-count')[0],
        ammoCount: document.getElementById('ammo-count'),
        ammoCountLI: statsBar.querySelectorAll('li.ammo')[0],
        bombCount: document.getElementById('bomb-count'),
        bombCountLI: statsBar.querySelectorAll('li.bombs')[0],
        missileCount: document.getElementById('missile-count'),
        missileCountLI: statsBar.querySelectorAll('li.missiles')[0],
      }
    };

    events = {

      resize: function() {
        refreshCoords();
      },

      mousedown: function(e) {
        if (!isMobile && !data.ignoreMouseEvents && !data.isEnemy && data.fuel > 0) {
          if (e.button === 0) {
            // disable auto-rotate
            // data.autoRotate = false;
            rotate();
          }
        }
      },

      dblclick: function(e) {
        if (!data.ignoreMouseEvents && !data.isEnemy && data.fuel > 0) {
          if (e.button === 0) {
            if (isMobile) {
              // only rotate on mobile.
              rotate();
              // and stop zoom, etc., from happening.
              e.preventDefault();
            }
            // revert to normal setting
            if (data.rotated) {
              rotate();
            }
            // toggle auto-rotate
            data.autoRotate = !data.autoRotate;
          }
        }
      }

    };

    objects = {
      bombs: [],
      gunfire: [],
      smartMissiles: []
    };

    collision = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        hit: function(target) {
          if (target.data.type === 'chain') {
            // special case: chains do damage, but don't kill.
            common.hit(exports, target.data.damagePoints);
            // and make noise.
            if (sounds.chainSnapping) {
              playSound(sounds.chainSnapping, target);
            }
            // should the target die, too? ... probably so.
            common.hit(target, 999);
          } else if (target.data.type === TYPES.infantry) {
            // helicopter landed, not repairing, and friendly, landed infantry (or engineer)?
            if (data.landed && !data.onLandingPad && data.parachutes < data.maxParachutes && target.data.isEnemy === data.isEnemy) {
              // check if it's at the helicopter "door".
              if (collisionCheckMidPoint(exports, target)) {
                // pick up infantry (silently)
                target.die(true);
                playSound(sounds.popSound, exports);
                data.parachutes = Math.min(data.maxParachutes, data.parachutes + 1);
                updateStatusUI({ parachutes: true });
              }
            }
          } else if (target.data.type === 'cloud') {
            cloak();
          } else {
            // hit something else. boom!
            die();
            // should the target die, too? ... probably so.
            common.hit(target, 999);
          }
        }
      },
      items: ['balloons', 'tanks', 'vans', 'missileLaunchers', 'bunkers', 'superBunkers', 'helicopters', 'chains', TYPES.infantry, 'engineers', 'clouds']
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die,
      eject: eject,
      fire: fire,
      objects: objects,
      onLandingPad: onLandingPad,
      startRepairing: startRepairing,
      reset: reset,
      refreshCoords: refreshCoords,
      rotate: rotate,
      setBombing: setBombing,
      setFiring: setFiring,
      setMissileLaunching: setMissileLaunching,
      setParachuting: setParachuting,
      updateHealth: updateHealth,
      updateStatusUI: updateStatusUI,
      updateInventoryQueue: updateInventoryQueue
    };

    initHelicopter();

    return exports;

  };

  Tank = function(options) {

    var css, data, dom, radarItem, objects, nearby, exports;

    function fire() {

      if (data.frameCount % data.fireModulus === 0) {

        objects.gunfire.push(new GunFire({
          parentType: data.type,
          isEnemy: data.isEnemy,
          damagePoints: 2, // tanks fire at half-rate, so double damage.
          collisionItems: nearby.items.concat('bunkers'), // special case: tanks don't stop to shoot bunkers, but their gunfire can damage them.
          x: data.x + ((data.width + 1) * (data.isEnemy ? 0 : 1)),
          y: game.objects.view.data.world.height - data.gunYOffset, // half of tank height
          vX: data.vX * 2,
          vY: 0
        }));

        if (sounds.tankGunFire) {
          playSound(sounds.tankGunFire, exports);
        }

      }

    }

    function moveTo(x, bottomY) {

      if (x !== undefined && data.x !== x) {

        if (data.isOnScreen) {
          common.setTransformXY(dom.o, data.x + 'px', '0px');
        }

        data.x = x;
      }

      if (bottomY !== undefined && data.bottomY !== bottomY) {
        data.bottomY = bottomY;
        data.y = bottomAlignedY(bottomY);
      }

    }

    function updateHealth() {

      // smouldering, etc.
      // TODO: optimize class swapping

      if (data.energy <= 3) {

        utils.css.add(dom.o, css.hit2);
        utils.css.remove(dom.o, css.hit1);

      } else if (data.energy < 6) {

        utils.css.add(dom.o, css.hit1);
        utils.css.remove(dom.o, css.hit2);

      } else {

        // TODO: optimize
        utils.css.remove(dom.o, css.hit1);
        utils.css.remove(dom.o, css.hit2);

      }

      updateEnergy(exports);

    }

    function repair() {

      if (data.frameCount % data.repairModulus === 0) {
        if (data.energy < data.energyMax) {
          data.energy++;
          updateHealth();
        }
      }

    }

    function die() {

      if (data.dead) return;

      utils.css.add(dom.o, css.exploding);

      // stop moving while exploding
      data.vX = 0;

      shrapnelExplosion(data);

      data.deadTimer = setFrameTimeout(function() {
        removeNodes(dom);
        data.deadTimer = null;
      }, 1000);

      data.energy = 0;

      data.dead = true;

      if (sounds.genericExplosion) {
        playSound(sounds.genericExplosion, exports);
      }

      radarItem.die();

    }

    function stop() {

      if (!data.stopped) {
        utils.css.add(dom.o, css.stopped);
        data.stopped = true;
      }

    }

    function resume() {

      if (data.stopped) {
        utils.css.remove(dom.o, css.stopped);
        data.stopped = false;
      }

    }

    function animate() {

      var i, spliceArgs;

      spliceArgs = [i, 1];

      data.frameCount++;

      for (i = objects.gunfire.length - 1; i >= 0; i--) {
        if (objects.gunfire[i].animate()) {
          // object is dead - take it out.
          spliceArgs[0] = i;
          Array.prototype.splice.apply(objects.gunfire, spliceArgs);
        }
      }

      if (!data.dead) {

        repair();

        if (!data.stopped) {

          moveTo(data.x + data.vX, data.bottomY);

        } else {

          // move one pixel every so often, to prevent edge case where tank can get "stuck" - e.g., shooting an enemy that is overlapping a bunker or super bunker.
          // the original game had something like this, too.
          if (data.frameCount % FPS === 0) {

            // run "moving" animation for a few frames
            utils.css.remove(dom.o, css.stopped);

            moveTo(data.x + (data.isEnemy ? -1 : 1), data.bottomY);

            // and then stop again if we haven't resumed for real by that time.
            setFrameTimeout(function() {
              if (data.stopped) {
                utils.css.add(dom.o, css.stopped);
              }
            }, 150);
          }

          // only fire (i.e., GunFire objects) when stopped
          fire();

        }

        // start, or stop firing?
        nearbyTest(nearby);

      }

      return (data.dead && !data.deadTimer && !dom.o && !objects.gunfire.length);

      recycleTest(exports);

    }

    function initTank() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      dom.oTransformSprite = makeTransformSprite();
      dom.o.appendChild(dom.oTransformSprite);

      dom.oSubSprite = makeSubSprite();
      dom.o.appendChild(dom.oSubSprite);

      // for testing
      if (options.extraClass) {
        utils.css.add(dom.o, options.extraClass);
      }

      common.setTransformXY(dom.o, data.x + 'px', '0px');


      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

      initNearby(nearby, exports);

    }

    options = options || {};

    css = inheritCSS({
      className: TYPES.tank,
      hit1: 'smouldering-phase-1',
      hit2: 'smouldering-phase-2',
      stopped: 'stopped'
    });

    data = inheritData({
      type: TYPES.tank,
      bottomAligned: true,
      deadTimer: null,
      energy: 8,
      energyMax: 8,
      frameCount: 0,
      repairModulus: 50,
      // enemy tanks shoot a little faster
      fireModulus: (options.isEnemy ? 10 : 12),
      vX: (options.isEnemy ? -1 : 1),
      width: 58,
      height: 18,
      halfWidth: 28,
      halfHeight: 9,
      gunYOffset: 15,
      stopped: false,
      inventory: {
        frameCount: 60,
        cost: 4
      }
    }, options);

    dom = {
      o: null,
      oSubSprite: null,
      oTransformSprite: null
    };

    objects = {
      gunfire: []
    };

    nearby = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        useLookAhead: true,
        // TODO: rename to something generic?
        hit: function(target) {
          // stop moving, start firing.
          // special case: only fire at EndBunker and SuperBunker if they have energy.
          if (((target.data.type === TYPES.endBunker || target.data.type === TYPES.superBunker) && target.data.energy !== 0) || (target.data.type !== TYPES.endBunker && target.data.type !== TYPES.superBunker)) {
            stop();
          } else {
            resume();
          }
        },
        miss: function() {
          // resume moving, stop firing.
          resume();
        }
      },
      // who gets fired at?
      items: ['tanks', 'vans', 'missileLaunchers', TYPES.infantry, 'engineers', 'turrets', 'helicopters', 'endBunkers', 'superBunkers'],
      targets: []
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die,
      stop: stop,
      resume: resume,
      updateHealth: updateHealth
    };

    if (!options.noInit) {
      initTank();
    }

    return exports;

  };

  Van = function(options) {

    var css, dom, data, radarItem, exports;

    function stop() {

      data.stopped = true;

    }

    function moveTo(x, bottomY) {

      var needsUpdate;

      if (features.transform.prop) {

        if (x !== undefined && data.x !== x) {
          data.x = x;
          needsUpdate = true;
        }

        if (bottomY !== undefined && data.bottomY !== bottomY) {
          data.bottomY = bottomY;
          data.y = bottomAlignedY(bottomY);
          needsUpdate = true;
        }

        if (needsUpdate && data.isOnScreen) {
          common.setTransformXY(dom.o, data.x + 'px', '0px');
        }

      }/* else {

        if (x !== undefined && data.x !== x) {
          data.x = x;
        }

        if (bottomY !== undefined && data.bottomY !== bottomY) {
          data.bottomY = bottomY;
          data.y = bottomAlignedY(bottomY);
        }

      }*/

    }

    function die() {

      if (data.dead) return;

      utils.css.add(dom.o, css.exploding);

      // stop moving while exploding
      data.vX = 0;

      // revert to CSS rules, prevent first frame of explosion from sticking
      dom.o.style.backgroundPosition = '0px -384px';

      shrapnelExplosion(data);

      data.deadTimer = setFrameTimeout(function() {
        removeNodes(dom);
        data.deadTimer = null;
      }, 1000);

      data.energy = 0;

      data.jamming = false;

      data.dead = true;

      if (radarItem) {
        radarItem.die();
      } else {
        stats.destroy(exports);
      }

      if (sounds.genericExplosion) {
        playSound(sounds.genericExplosion, exports);
      }

    }

    function animate() {

      var enemyHelicopter;

      if (!data.dead && !data.stopped) {

        moveTo(data.x + data.vX, data.bottomY);

        if (data.isEnemy && data.x <= data.xGameOver) {

          stop();

          // Game over, man, game over! (Enemy wins.)

          // hack: clear any existing.
          game.objects.view.setAnnouncement();

          game.objects.view.setAnnouncement('The enemy has won the battle.', -1);

          gameOver();

        } else if (!data.isEnemy && data.x >= data.xGameOver) {

          stop();

          // player wins

          // hack: clear any existing.
          game.objects.view.setAnnouncement();

          game.objects.view.setAnnouncement('You have won the battle.', -1);

          gameOver(true);

        } else {

          // bounce wheels after the first few seconds

          if (data.frameCount > FPS * 2) {

            if (data.frameCount % data.stateModulus === 0) {

              data.state++;

              if (data.state > data.stateMax) {
                data.state = 0;
              }

              dom.o.style.backgroundPosition = '0px ' + (data.height * data.state * -1) + 'px';

            } else if (data.frameCount % data.stateModulus === 2) {

              // next frame - reset.
              dom.o.style.backgroundPosition = '0px 0px';

            }

          }

          if (data.frameCount % data.radarJammerModulus === 0) {

            // look for nearby bad guys
            enemyHelicopter = enemyHelicopterNearby(data, game.objects.view.data.browser.twoThirdsWidth);

            if (!data.jamming && enemyHelicopter) {

              data.jamming = true;

            } else if (data.jamming && !enemyHelicopter) {

              data.jamming = false;

            }

          }

        }

        data.frameCount++;

      }

      return (data.dead && !data.deadTimer);

    }

    function initVan() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      common.setTransformXY(dom.o, data.x + 'px', '0px');

      /*
      if (features.transform.prop) {
        // transform origin
        dom.o.style.left = '0px';
      }
      */

      game.dom.world.appendChild(dom.o);

      // enemy vans are so sneaky, they don't even appear on the radar.
      if (tutorialMode || !options.isEnemy) {
        radarItem = game.objects.radar.addItem(exports, dom.o.className);
      } else {
        stats.create(exports);
      }

    }

    options = options || {};

    css = inheritCSS({
      className: TYPES.van
    });

    data = inheritData({
      type: TYPES.van,
      bottomAligned: true,
      deadTimer: null,
      frameCount: 0,
      radarJammerModulus: 50,
      jamming: false,
      energy: 2,
      energyMax: 2,
      direction: 0,
      stopped: false,
      vX: (options.isEnemy ? -1 : 1),
      width: 38,
      height: 16,
      state: 0,
      stateMax: 2,
      stateModulus: 30,
      inventory: {
        frameCount: 60,
        cost: 2
      },
      // if the van reaches the enemy base (near the landing pad), it's game over.
      xGameOver: (options.isEnemy ? game.objects.landingPads[0].data.x + 128 : game.objects.landingPads[game.objects.landingPads.length - 1].data.x - 40)
    }, options);

    dom = {
      o: null
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die
    };

    if (!options.noInit) {
      initVan();
    }

    return exports;

  };

  ParachuteInfantry = function(options) {

    var css, dom, data, radarItem, exports;

    function openParachute() {

      if (data.parachuteOpen) return;

      // undo manual assignment from free-fall animation
      dom.o.style.backgroundPosition = '';

      utils.css.add(dom.o, css.parachuteOpen);

      data.vY = 0.5;

      // make the noise
      if (sounds.parachuteOpen) {
        playSound(sounds.parachuteOpen, exports);
      }

      data.parachuteOpen = true;

    }

    function moveTo(x, y) {

      if (x !== undefined && data.x !== x) {
        data.x = x;
      }

      if (y !== undefined && data.y !== y) {
        data.y = y;
      }

    }

    function dieComplete() {

      removeNodes(dom);

    }

    function die(silent) {

      if (data.dead) return;

      if (!silent) {

        utils.css.add(dom.o, css.exploding);

        data.deadTimer = setFrameTimeout(function() {
          data.deadTimer = null;
          dieComplete();
        }, 1200);

      } else {

        // no explosion, remove right away.
        dieComplete();

      }

      data.energy = 0;

      data.dead = true;

      radarItem.die({
        silent: true
      });

    }

    function hit(hitPoints, target) {

      // special case: helicopter explosion resulting in a parachute infantry - make parachute invincible to shrapnel.
      if (target && target.data && target.data.type === 'shrapnel' && data.ignoreShrapnel) {
        return false;
      }

      return common.hit(exports, hitPoints);

    }

    function animate() {

      var randomWind, windMod, bgY;

      if (!data.dead) {

        // falling?

        moveTo(data.x + data.vX, data.y + data.vY);

        if (!data.parachuteOpen) {

          if (data.y >= data.parachuteOpensAtY) {

            openParachute();

          } else if (data.frameCount % data.panicModulus === 0) {
            // like Tom Petty, free fallin'.

            dom.o.style.backgroundPosition = '0px ' + (-(60 + (data.frameHeight * data.panicFrame))) + 'px';

            // alternate between 0/1
            data.panicFrame = !data.panicFrame;

          }

        } else {

          // (potentially) gone with the wind.

          windMod = data.frameCount % data.windModulus;

          if (windMod === 0) {

            // choose a random direction?
            if (Math.random() > 0.66) {

              // -1, 0, 1
              randomWind = rndInt(3) - 1;

              data.vX = randomWind * 0.25;

              if (randomWind === -1) {

                // moving left
                bgY = -20;

              } else if (randomWind === 1) {

                // moving right
                bgY = -40;

              } else {

                // not moving!
                bgY = 0;

              }

              dom.o.style.backgroundPosition = ('0px ' + bgY + 'px');

              // choose a new wind modulus, too.
              data.windModulus = 64 + rndInt(64);

            } else {

              // reset wind effect

              data.vX = 0;

              dom.o.style.backgroundPosition = '0px 0px';

            }

          }

        }

        if (data.parachuteOpen && data.y >= data.maxY) {

          if (data.parachuteOpen) {

            // touchdown! die "quietly", and transition into new infantry.
            die(true);

            game.objects.infantry.push(new Infantry({
              x: data.x,
              isEnemy: data.isEnemy
            }));

          }

        } else if (!data.parachuteOpen) {

          if (data.parachuteOpensAtY > data.maxY && data.y > 300) {

            // It's not looking good for our friend. Call up our buddy Wilhem.
            // http://archive.org/details/WilhelmScreamSample

            if (!data.didScream) {

              if (sounds.wilhemScream) {
                playSound(sounds.wilhemScream, exports);
              }

              data.didScream = true;

            }

          }

          if ((data.y - data.height) + 4 >= data.maxY) {

            // hit ground, and no parachute. gravity is a cruel mistress.

            // reposition, first
            moveTo(data.x, data.maxY);

            // balloon-on-skin "splat" sound
            if (sounds.splat) {
              playSound(sounds.splat, exports);
            }

            die();

          }

        }

        data.frameCount++;

      }

      return (data.dead && !data.deadTimer && !dom.o);

    }

    function initParachuteInfantry() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }


      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    css = inheritCSS({
      className: 'parachute-infantry',
      parachuteOpen: 'parachute-open'
    });

    data = inheritData({
      type: 'parachute-infantry',
      frameCount: rndInt(3),
      panicModulus: 3,
      windModulus: 32 + rndInt(32),
      panicFrame: rndInt(3),
      energy: 2,
      energyMax: 2,
      parachuteOpen: false,
      // "most of the time", a parachute will open. no idea what the original game did. 10% failure rate.
      parachuteOpensAtY: options.y + (rnd(370 - options.y)) + (!tutorialMode && Math.random() > 0.9 ? 999 : 0),
      direction: 0,
      width: 10,
      height: 11, // 19 when parachute opens
      frameHeight: 20, // each sprite frame
      ignoreShrapnel: options.ignoreShrapnel || false,
      didScream: false,
      vX: 0, // wind?
      vY: 3,
      maxY: 367,
    }, options);

    dom = {
      o: null
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die,
      hit: hit
    };

    initParachuteInfantry();

    return exports;

  };

  Infantry = function(options) {

    var css, dom, data, objects, radarItem, nearby, collision, exports;

    function fire() {

      if (!data.noFire && data.frameCount % data.fireModulus === 0) {

        objects.gunfire.push(new GunFire({
          parentType: data.type,
          isEnemy: data.isEnemy,
          collisionItems: nearby.items.concat('bunkers'), // special case: infantry + engineers don't stop to shoot bunkers, but their gunfire can damage them.
          x: data.x + ((data.width + 1) * (data.isEnemy ? 0 : 1)),
          y: game.objects.view.data.world.height - data.gunYOffset, // half of infantry height
          vX: data.vX, // same velocity
          vY: 0
        }));

        if (sounds.infantryGunFire) {
          playSound(sounds.infantryGunFire, exports);
        }

      }

    }

    function moveTo(x, bottomY) {

      if (x !== undefined && data.x !== x) {
        if (data.isOnScreen) {
          common.setTransformXY(dom.o, exports.data.x + 'px', '0px');
        }
        data.x = x;
      }

      if (bottomY !== undefined && data.bottomY !== bottomY) {
        data.bottomY = bottomY;
        data.y = bottomAlignedY(bottomY);
      }

    }

    function stop(noFire) {

      if (!data.stopped) {
        utils.css.add(dom.o, css.stopped);
        data.stopped = true;
        data.noFire = !!noFire;
      }

    }

    function resume() {

      if (data.stopped) {
        utils.css.remove(dom.o, css.stopped);
        data.stopped = false;
        data.noFire = false;
      }

    }

    function setRole(role, force) {
      // TODO: minimize CSS thrashing, track lastClass etc.
      if (data.role !== role || force) {
        utils.css.remove(dom.o, css[data.roles[0]]);
        utils.css.remove(dom.o, css[data.roles[1]]);
        // role
        data.role = role;
        css.className = css[data.roles[data.role]];
        if (dom.o) {
          utils.css.add(dom.o, css.className);
        }
      }
    }

    function dieComplete() {
      removeNodes(dom);
    }

    function die(silent) {

      if (data.dead) return;

      if (!silent) {

        // HACK: remove "stopped" on exploding, fix a stupid display issue where enemy display gets screwed up if stopped + exploding classes are applied together.
        if (data.stopped) {
          utils.css.remove(dom.o, css.stopped);
        }

        utils.css.add(dom.o, css.exploding);

        playSound(sounds.genericSplat, exports);
        playSound(sounds.scream, exports);

        data.deadTimer = setFrameTimeout(function() {
          dieComplete();
          data.deadTimer = null;
        }, 1200);

      } else {

        dieComplete();

      }

      data.energy = 0;

      // stop moving while exploding
      data.vX = 0;

      data.dead = true;

      radarItem.die();

    }

    function animate() {

      var i, spliceArgs;

      spliceArgs = [i, 1];

      if (!data.dead) {

        if (!data.stopped) {

          moveTo(data.x + data.vX, data.bottomY);

        } else if (!data.noFire) {
          // firing, or reclaiming/repairing?
          // only fire (i.e., GunFire objects) when stopped
          fire();
        }

        collisionTest(collision, exports);

        // start, or stop firing?
        nearbyTest(nearby);

      }
        recycleTest(exports);

      for (i = objects.gunfire.length - 1; i >= 0; i--) {
        if (objects.gunfire[i].animate()) {
          // object is dead - take it out.
          spliceArgs[0] = i;
          Array.prototype.splice.apply(objects.gunfire, spliceArgs);
        }
      }

      data.frameCount++;

      return (data.dead && !data.deadTimer && !dom.o && !objects.gunfire.length);

    }

    function initInfantry() {

      // infantry, or engineer?
      setRole(data.role, true);

      dom.o = makeSprite({
        className: css.className
      });

      dom.oTransformSprite = makeTransformSprite();
      dom.o.appendChild(dom.oTransformSprite);

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      common.setTransformXY(dom.o, data.x + 'px', '0px');

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

      initNearby(nearby, exports);

    }

    options = options || {};

    css = inheritCSS({
      className: null,
      infantry: TYPES.infantry,
      engineer: TYPES.engineer,
      stopped: 'stopped'
    });

    data = inheritData({
      type: TYPES.infantry,
      deadTimer: null,
      frameCount: Math.random() > 0.5 ? 5 : 0,
      bottomAligned: true,
      energy: 2,
      energyMax: 2,
      role: options.role || 0,
      roles: [TYPES.infantry, TYPES.engineer],
      stopped: false,
      noFire: false,
      direction: 0,
      width: 10,
      height: 11,
      gunYOffset: 9,
      fireModulus: 10,
      vX: (options.isEnemy ? -1 : 1),
      xLookAhead: (options.xLookAhead !== undefined ? options.xLookAhead : 16),
      inventory: {
        frameCount: 12,
        cost: 5,
        orderCompleteDelay: 5 // last-item-in-order delay (decrements every frameCount animation loop), so tank doesn't overlap if ordered immediately afterward.
      }
    }, options);

    dom = {
      o: null
    };

    objects = {
      gunfire: []
    };

    nearby = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        useLookAhead: true,
        // TODO: rename to something generic?
        hit: function(target) {
          // engineer + turret case? reclaim or repair.
          if (data.role && target.data.type === TYPES.turret) {
            // is there work to do?
            if (target.engineerCanInteract(data.isEnemy)) {
              stop(true);
              target.engineerHit(exports);
            } else {
              // nothing to see here.
              resume();
            }
          } else if (target.data.isEnemy !== data.isEnemy) {
            // stop moving, start firing if not a friendly unit.
            stop();
          }
        },
        miss: function() {
          // resume moving, stop firing.
          resume();
        }
      },
      // who gets fired at?
      items: ['tanks', 'vans', 'missileLaunchers', TYPES.infantry, 'engineers', 'helicopters', 'turrets'],
      targets: []
    };

    collision = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        hit: function(target) {
          /**
           * bunkers and other objects infantry can interact with have an infantryHit() method.
           * if no infantryHit(), just die.
           * this is sort of an edge case, to prevent parachuting infantry landing in the middle of a tank.
           * this would normally cause both objects to stop and fire, but unable to hit one another due to the overlap.
           */
          if (!data.role && target.infantryHit) {
            // infantry hit bunker or other object
            target.infantryHit(exports);
          } else if (target.data.type !== TYPES.bunker && target.data.type !== TYPES.endBunker) {
            // probably a tank.
            die();
          }
        }
      },
      items: ['bunkers', 'tanks']
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die
    };

    if (!options.noInit) {
      initInfantry();
    }

    return exports;

  };

  Engineer = function(options) {

    var object;

    options = options || {};

    // flag as an engineer
    options.role = 1;

    // hack: -ve lookahead offset allowing engineers to be basically atop turrets
    options.xLookAhead = (options.isEnemy ? 4 : -8);

    object = new Infantry(options);

    // selective override: shorter delay on engineers
    object.data.inventory.orderCompleteDelay = 5;

    return object;

  };

  LandingPad = function(options) {

    var css, dom, data, collision, exports;

    function animate() {

      if (data.frameCount % data.repairModulus === 0) {

        collisionTest(collision, exports);
        data.frameCount = 0;

      }

      data.frameCount++;

    }

    function initLandingPad() {

      dom.o = makeSprite({
        className: css.className
      });

      dom.oTransformSprite = makeTransformSprite();
      dom.o.appendChild(dom.oTransformSprite);

      game.dom.world.appendChild(dom.o);

    }

    options = options || {};

    css = inheritCSS({
      className: 'landing-pad'
    });

    data = inheritData({
      type: 'landing-pad',
      isNeutral: true,
      frameCount: 0,
      energy: 2,
      width: 81,
      height: 4,
      repairModulus: 5,
      y: worldHeight - 4
    }, options);

    dom = {
      o: null,
      oTransformSprite: null,
    };

    collision = {
      options: {
        source: exports,
        targets: undefined,
        hit: function(target) {
          if (target.onLandingPad) {
            target.onLandingPad(true);
          }
        }
      },
      items: ['helicopters']
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom
    };

    initLandingPad();

    return exports;

  };

  shrapnelExplosion = function(options, shrapnelOptions) {

    var localOptions, halfWidth;

    var vectorX, vectorY, i, angle, shrapnelCount, angleIncrement, explosionVelocity1, explosionVelocity2, explosionVelocityMax;

    shrapnelOptions = shrapnelOptions || {};

    localOptions = mixin({}, options);

    halfWidth = localOptions.width / 2;

    // randomize X?
    if (shrapnelOptions.randomX) {
      localOptions.x += parseInt(Math.random() * localOptions.width, 10);
    } else {
      // center?
      localOptions.x += halfWidth;
    }

    angle = 0;

    explosionVelocityMax = shrapnelOptions.velocity || 4;

    shrapnelCount = shrapnelOptions.count || 8;

    angleIncrement = 180 / (shrapnelCount - 1);

    for (i = 0; i < shrapnelCount; i++) {

      explosionVelocity1 = rnd(explosionVelocityMax);
      explosionVelocity2 = rnd(explosionVelocityMax);

      vectorX = -explosionVelocity1 * Math.cos(angle * deg2Rad);
      vectorY = -explosionVelocity2 * Math.sin(angle * deg2Rad);

      localOptions.vX = (localOptions.vX * 0.5) + vectorX;
      localOptions.vY += vectorY;

      // bottom-aligned object? explode "up".
      if (localOptions.vY > 0 && options.bottomAligned) {
        localOptions.vY *= -1;
      }

      // have first and last make noise
      localOptions.hasSound = (i === 0 || (shrapnelCount > 4 && i === shrapnelCount - 1));

      game.objects.shrapnel.push(new Shrapnel(localOptions));

      angle += angleIncrement;

    }

  };

  Shrapnel = function(options) {

    var css, dom, data, collision, radarItem, exports;

    function moveTo(x, y) {

      var needsUpdate;

      if (x !== undefined && data.x !== x) {
        data.x = x;
        needsUpdate = true;
      }

      if (y !== undefined && data.y !== y) {
        needsUpdate = true;
        data.y = y;
      }

      if (needsUpdate && data.isOnScreen) {
        common.setTransformXY(dom.o, data.x + 'px', data.y + 'px');
      }

    }

    function shrapnelNoise() {

      var i;

      if (data.hasSound) {

        i = 'hit' + sounds.shrapnel.counter;

        sounds.shrapnel.counter += (sounds.shrapnel.counter === 0 && Math.random() > 0.5 ? 2 : 1);

        if (sounds.shrapnel.counter >= sounds.shrapnel.counterMax) {
          sounds.shrapnel.counter = 0;
        }

        if (sounds.shrapnel[i]) {
          playSound(sounds.shrapnel[i], exports);
        }

      }

    }

    function die() {

      if (data.dead) return;

      shrapnelNoise();

      utils.css.add(dom.o, css.stopped);

      data.deadTimer = setFrameTimeout(function() {
        removeNodes(dom);
        data.deadTimer = null;
      }, 750);

      data.energy = 0;

      data.dead = true;

      if (radarItem) {
        radarItem.die({
          silent: true
        });
      }

    }

    function hitAndDie(target) {

      var targetType;

      if (target) {
        common.hit(target, data.damagePoints);

        // shrapnel hit something; what should it sound like, if anything?
        targetType = target.data.type;

        if (targetType === TYPES.helicopter) {
          playSound(sounds.boloTank, exports);
        } else if (utils.array.includes(sounds.types.metalHit, targetType)) {
          playSound(sounds.metalHit, exports);
        } else if (utils.array.includes(sounds.types.genericSplat, targetType)) {
          playSound(sounds.genericSplat, exports);
        }
      }

      die();

    }

    function animate() {

      if (!data.dead) {

        moveTo(data.x + data.vX, data.y + (Math.min(data.maxVY, data.vY + data.gravity)));

        data.gravity *= 1.1;

        if (data.y - data.height >= worldHeight) {
          moveTo(data.x + data.vX, worldHeight);
          die();
        }

        // collision check
        collisionTest(collision, exports);

        data.frameCount++;

      }

      return (data.dead && !data.deadTimer && !dom.o);

    }

    function initShrapnel() {

      dom.o = makeSprite({
        className: css.className + (Math.random() > 0.5 ? ' ' + css.reverse : '')
      });

      dom.oTransformSprite = makeTransformSprite();
      dom.o.appendChild(dom.oTransformSprite);

      common.setTransformXY(dom.o, data.x + 'px', data.y + 'px');

      // apply the type of shrapnel
      dom.oTransformSprite.style.backgroundPosition = (data.spriteType * -data.width) + 'px 0px';

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

      if (data.isEnemy) {
        utils.css.add(radarItem.dom.o, css.enemy);
      }

      shrapnelNoise();

    }

    options = options || {};

    css = inheritCSS({
      className: 'shrapnel',
      reverse: 'reverse',
      stopped: 'stopped'
    });

    data = inheritData({
      type: 'shrapnel',
      frameCount: 0,
      animationModulus: 2,
      spriteType: rndInt(4),
      direction: 0,
      // sometimes zero / non-moving?
      vX: options.vX || 0,
      vY: options.vY || 0,
      maxVY: 48,
      gravity: 1,
      width: 12,
      height: 12,
      hostile: true,
      damagePoints: 0.5,
      hasSound: !!options.hasSound
    }, options);

    dom = {
      o: null,
      oTransformSprite: null,
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die
    };

    collision = {
      options: {
        source: exports,
        targets: undefined,
        hit: function(target) {
          hitAndDie(target);
        }
      },
      items: ['vans', 'missileLaunchers', 'infantry', 'parachuteInfantry', 'engineers', 'helicopters', 'smartMissiles', 'bunkers', 'superBunkers', 'balloons', 'turrets']
    };

    initShrapnel();

    return exports;

  };

  Smoke = function(options) {

    var css, dom, data, exports;

    function die() {

      if (data.dead) return;

      removeNodes(dom);

      data.dead = true;

    }

    function animate() {

      if (data.frameCount % data.animateModulus === 0) {

        data.spriteFrame++;

        // advance smoke sprite, 0% -> -100% (L-R)
        common.setTransformXY(exports.dom.oTransformSprite, -((data.spriteFrame / (data.spriteFrames - 1)) * 100) + '%', '0%');

        if (data.spriteFrame > data.spriteFrames) {

          // animation finished
          die();

        }

      }

      data.frameCount++;

      return (data.dead && !dom.o);

    }

    function initSmoke() {

      // TODO: use a pool of smoke nodes.
      dom.o = makeSprite({
        className: css.className
      });

      dom.oTransformSprite = makeTransformSprite();
      dom.o.appendChild(dom.oTransformSprite);

      common.setTransformXY(exports.dom.o, data.x + 'px', data.y + 'px');

      game.dom.world.appendChild(dom.o);

    }

    options = options || {};

    css = inheritCSS({
      className: 'smoke'
    });

    data = inheritData({
      type: 'smoke',
      frameCount: 0,
      animateModulus: 2,
      spriteFrame: rndInt(4),
      spriteFrames: 10,
      direction: 0,
      width: 9,
      height: 10
    }, options);

    dom = {
      o: null,
      oTransformSprite: null,
    };

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die
    };

    initSmoke();

    return exports;

  };

  TutorialStep = function(options) {

    var data, exports;

    data = {
      activated: false,
      completed: false
    };

    function animate() {

      if (!data.activated) {

        if (options.activate) {
          options.activate();
        }

        data.activated = true;

      } else if (!data.completed) {

        if (options.animate()) {
          if (options.complete) {
            options.complete();
          }
          data.completed = true;
        }

      }

    }

    exports = {
      animate: animate
    };

    return exports;

  };

  Tutorial = function() {

    var config, css, data, dom, exports;

    function addStep(options) {

      config.steps.push(new TutorialStep(options));

    }

    function initDOM() {

      dom.o = document.getElementById('tutorial');
      dom.oList = document.getElementById('tutorial-list').getElementsByTagName('li');
      data.steps = dom.oList.length;
      utils.css.add(document.getElementById('world'), 'tutorial-mode');

    }

    function selectItem(i) {

      dom.lastItem = dom.oList[i];

      data.step = i;

      game.objects.view.setAnnouncement();

      game.objects.view.setAnnouncement(dom.lastItem.innerHTML, -1, true);

      // animate immediately, twice; first to activate, second to check for completion. useful if this step has already been passed, etc.
      if (data.step > 0 && config.steps[data.step]) {
        config.steps[data.step].animate();
        config.steps[data.step].animate();
      }

    }

    function nextItem() {

      selectItem(data.step + 1);

    }

    function animate() {

      // "runtime" for tutorial
      if (data.frameCount % data.animateModulus === 0 && data.step !== null && config.steps[data.step]) {

        config.steps[data.step].animate();

      }

      data.frameCount++;

    }

    function initTutorial() {

      var temp;

      initDOM();

      utils.css.add(dom.o, css.active);

      addStep({

        // introduction

        animate: function() {

          // the player's helicopter.
          var chopper = game.objects.helicopters[0],
            chopperData = chopper.data;

          // condition for completion
          return (
            chopperData.ammo < chopperData.maxAmmo
            && chopperData.bombs < chopperData.maxBombs
            && !chopper.objects.bombs.length
            && !chopper.objects.gunfire.length
          );

        },

        complete: function() {

          nextItem();

        }

      });

      addStep({

        // helicopter refuel/repair

        animate: function() {

          var chopper;

          chopper = game.objects.helicopters[0];

          // player either landed and refueled, or died. ;)
          return (chopper.data.repairComplete);

        },

        complete: function() {

          nextItem();

        }

      });

      addStep({

        // look, ma! bad guys!

        activate: function() {

          game.addObject(TYPES.tank, {
            x: 1536,
            isEnemy: true
          });

          game.addObject(TYPES.tank, {
            x: 1536 + 70,
            isEnemy: true
          });

          game.addObject(TYPES.tank, {
            x: 1536 + 140,
            isEnemy: true
          });

          game.addObject(TYPES.van, {
            x: 1536 + 210,
            isEnemy: true
          });

        },

        animate: function() {

          var counts = [countSides('tanks'), countSides('vans')];

          return (!counts[0].enemy && !counts[1].enemy);

        },

        complete: function() {

          nextItem();

        }

      });

      addStep({

        // pick up a full load of infantry

        animate: function() {

          return (game.objects.helicopters[0].data.parachutes >= game.objects.helicopters[0].data.maxParachutes);

        },

        complete: function() {

          nextItem();

        }

      });

      addStep({

        // claim a nearby enemy bunker

        activate: function() {

          var targetBunker,
            i, j;

          for (i = 0, j = game.objects.bunkers.length; i < j; i++) {

            if (!game.objects.bunkers[i].data.dead) {
              targetBunker = game.objects.bunkers[i];
              break;
            }

          }

          if (targetBunker) {

            // ensure the first bunker is an enemy one.
            targetBunker.capture(true);

            // ... and has a balloon
            targetBunker.repair();

            // keep track of original bunker states
            temp = countSides('bunkers');

          } else {

            // edge case: bunker has already been blown up, etc. bail.
            temp = countSides('bunkers');

            // next animate() call will pick this up and move to next step.
            temp.enemy++;

          }

        },

        animate: function() {

          var bunkers;

          bunkers = countSides('bunkers');

          // a bunker was blown up, or claimed.
          return (bunkers.enemy < temp.enemy);

        },

        complete: function() {

          nextItem();

        }

      });

      addStep({

        // claim a nearby enemy Super Bunker

        activate: function() {

          var targetSuperBunker;

          targetSuperBunker = game.objects.superBunkers[0];

          if (targetSuperBunker) {

            // make it an enemy unit, if not already.
            targetSuperBunker.capture(true);

            // and arm it with infantry, such that 3 infantry will claim it.
            targetSuperBunker.data.energy = 2;

            // keep track of original bunker states
            temp = countSides('superBunkers');

          } else {

            // edge case: bunker has already been blown up, etc. bail.
            temp = countSides('superBunkers');

            // next animate() call will pick this up and move to next step.
            temp.enemy++;

          }

        },

        animate: function() {

          var superBunkers;

          superBunkers = countSides('superBunkers');

          // a Super Bunker was claimed.
          return (superBunkers.enemy < temp.enemy);

        },

        complete: function() {

          nextItem();

        }

      });

      addStep({

        // order a Missile launcher, Tank, Van

        animate: function() {

          var item, counts, isComplete;

          // innocent until proven guilty.
          isComplete = true;

          counts = {

            missileLaunchers: countFriendly('missileLaunchers'),
            tanks: countFriendly('tanks'),
            vans: countFriendly('vans')

          };

          for (item in counts) {

            if (counts.hasOwnProperty(item)) {

              if (!counts[item]) {

                isComplete = false;

              }

            }

          }

          return isComplete;

        },

        complete: function() {

          nextItem();

        }

      });

      addStep({

        // destroy the enemy chopper!

        activate: function() {

          // make sure enemy helicopter is present

          if (game.objects.helicopters.length < 2) {

            // two screenfuls away, OR end of battlefield - whichever is less
            game.addObject(TYPES.helicopter, {
              x: Math.min(game.objects.helicopters[0].data.x + (game.objects.view.data.browser.width * 2), game.objects.view.data.battleField.width - 64),
              y: 72,
              isEnemy: true,
              // give the player a serious advantage, here.
              fireModulus: FPS / 3,
              vX: 0
            });

          }

        },

        animate: function() {

          return game.objects.helicopters[1].data.dead;

        },

        complete: function() {

          nextItem();

        }

      });

      addStep({

        // defeat an incoming smart missile

        activate: function() {

          var missileX;

          // dis-arm superBunker so it doesn't kill incoming missile launchers, etc.
          game.objects.superBunkers[0].data.energy = 0;

          missileX = Math.min(game.objects.helicopters[0].data.x + (game.objects.view.data.browser.width * 2), game.objects.view.data.battleField.width - 64);

          // make ze missile launcher
          game.addObject(TYPES.missileLauncherCamel, {
            x: missileX,
            isEnemy: true
          });

          game.addObject(TYPES.missileLauncherCamel, {
            x: missileX + 64,
            isEnemy: true
          });

        },

        animate: function() {

          return (countSides('missileLaunchers').enemy === 0 && countSides('smartMissiles').enemy === 0);

        },

        complete: function() {

          nextItem();

        }

      });

      addStep({

        // rebuild the first friendly, dead turret

        animate: function() {

          return (
            !game.objects.turrets[0].data.isEnemy
            && !game.objects.turrets[0].data.dead
            && game.objects.turrets[0].data.energy === game.objects.turrets[0].data.energyMax
          );

        },

        complete: function() {

          nextItem();

        }

      });

      addStep({

        // destroy (or claim) the first enemy turret

        activate: function() {

          var turrets = game.objects.turrets;

          // bring the mid-level turrets[1] and [2] to life.
          turrets[1].repair(true);
          turrets[2].repair(true);

        },

        animate: function() {

          return (!game.objects.turrets[1].data.isEnemy || game.objects.turrets[1].data.dead || !game.objects.turrets[2].data.isEnemy || game.objects.turrets[2].data.dead);

        },

        complete: function() {

          nextItem();

        }

      });

      addStep({

        // earn 50 funds

        animate: function() {

          return (game.objects.endBunkers[0].data.funds >= 50);

        },

        complete: function() {

          nextItem();

        }

      });

      // and begin
      selectItem(0);

    }

    config = {
      steps: []
    };

    css = {
      active: 'active'
    };

    data = {
      frameCount: 0,
      animateModulus: FPS / 2,
      step: 0,
      steps: 0
    };

    dom = {
      o: null,
      oList: null,
      lastItem: null
    };

    exports = {
      animate: animate,
      selectItem: selectItem
    };

    initTutorial();

    return exports;

  };

  Queue = function() {

    var data, exports;

    data = {
      frameCount: 0,
      processInterval: FPS * 3,
      queue: [],
      queueMax: 512
    };

    function process() {

      if (debug) {
        console.log('processing queue of ' + data.queue.length + ' items at frameCount = ' + data.frameCount);
      }

      // process all items in queue
      var i, j;

      for (i = 0, j = data.queue.length; i < j; i++) {
        data.queue[i]();
      }

      // reset the queue + counter
      data.queue = [];
      data.frameCount = 0;

    }

    function add(callback) {

      // reset frameCount on add?
      data.frameCount = 0;
      data.queue.push(callback);

      if (data.queue.length >= data.queueMax) {
        // flush the queue
        process();
      }

    }

    function animate() {

      data.frameCount++;

      if (data.frameCount % data.processInterval === 0) {
        process();
      }

    }

    exports = {
      add: add,
      animate: animate,
      process: process
    };

    return exports;

  };

  Notifications = function() {
    var css, data, dom, exports;

    function add(text, options) {
      /* options = { onRender, onComplete, type } */

      var i, j, item, isDuplicate, replacementItem, renderedText;

      options = options || {};

      if (!data.items) data.items = [];

      // account for duplicate / repeated items
      for (i = 0, j = data.items.length; i < j; i++) {
        item = data.items[i];

        // hackish: update item / node of same text, or matching type
        if (item && item.node && (item.text === text || (item.type && item.type === options.type))) {
          
          // ignore if newest (last) item is about to be repeated, and shouldn't be
          if (i === j - 1 && options.noRepeat) {
            isDuplicate = true;
            break;
          }

          item.count++;

          if (options.onRender) {
            renderedText = options.onRender(text);
            item.delay = calcDelay(renderedText);
          }

          // provided text, or, custom render function
          // if options.onRender(), that function gets called to do the work.
          // otherwise, plain text - and if options.onRepeat, don't show multiplier.
          item.node.innerHTML = '<span>' + (options.onRender ? renderedText : ( item.text + (options.noRepeat ? '' : ' × ' + item.count))) + '</span>';

          // clear, start new timer
          if (item.timer) {
            item.timer.reset();
            item.timer = setFrameTimeout(displayItemComplete, item.delay);
          }

          replacementItem = item;

          break;
        }
      }

      // the last item was going to be repeated
      if (isDuplicate) return;

      if (replacementItem) return replacementItem;

      item = {
        text: text,
        count: 1,
        node: null,
        delay: calcDelay(text),
        doubleHeight: options.doubleHeight,
        onComplete: options.onComplete,
        onRender: options.onRender,
        timer: null,
      };

      data.items.push(item);

      showItem(item);
    }

    function calcDelay(text) {
      // number of words / letters? let's say 240 WPM, 4 words per second as an optimum.
      var delay, defaultDelay, delayPerWord, maxDelay;

      defaultDelay = 2000;
      delayPerWord = 1000;
      maxDelay = 5000;

      // just in case
      if (!text || !text.length || text.indexOf(' ') === -1) return defaultDelay;

      // hackish: if "NSF", return special delay
      if (text.match(/nsf/i)) return maxDelay / 2;

      // e.g., `this is a test` = 4 * delayPerWord - stripping HTML, also.
      delay = Math.min(text.replace('/<(.|\n)*?>/', '').split(' ').length * delayPerWord, maxDelay);

      return delay;
    }

    function showItem(item) {
      var oToast;

      // show, and queue the next check.
      oToast = document.createElement('div');
      oToast.className = css.notificationToast;

      if (item.doubleHeight) utils.css.add(oToast, css.doubleHeight);

      oToast.innerHTML = '<span>' + (item.onRender ? item.onRender(item.text) : item.text) + '</span>';

      dom.oToasts.appendChild(oToast);

      // delay required for transition to work
      setFrameTimeout(function() {
        utils.css.add(oToast, css.toastActive);
      }, 96);

      // assign for later node removal
      item.node = oToast;

      // these can pile up. display immediately but process one at a time, FIFO.
      if (!data.isDisplaying) {
        data.isDisplaying = true;
        item.timer = setFrameTimeout(displayItemComplete, item.delay);
      }
    }

    function displayItemComplete() {
      var item;

      if (!data.items.length) {
        data.isDisplaying = false;
        return;
      }

      item = data.items.shift();

      // slide contents out of view, to the right
      // utils.css.remove(item.node, css.toastActive);
      utils.css.add(item.node, css.toastExpiring);

      if (item.onComplete) {
        item.onComplete();
      }

      // collapse height, and then disappear.
      setFrameTimeout(function() {
        utils.css.add(item.node, css.toastExpired);
        setFrameTimeout(function() {
          item.node.parentNode.removeChild(item.node);
        }, 500);
      }, 500);

      if (!data.items.length) {
        // all done.
        data.isDisplaying = false;
      } else {
        // we're onto the next one.
        // queue its removal.
        setFrameTimeout(displayItemComplete, data.items[0].delay);
      }
    }

    function initDOM() {
      dom.oToasts = document.getElementById('notification-toasts');
    }

    css = {
      doubleHeight: 'double-height',
      notificationToast: 'notification-toast',
      toastActive: 'toast-active',
      toastExpiring: 'toast-expiring',
      toastExpired: 'toast-expired'
    };

    data = {
      items: [],
      isDisplaying: false
    };

    dom = {
      oToasts: null
    }

    initDOM();

    exports = {
      add: add
    };

    return exports;
    
  }

  Funds = function() {
    var css, data, dom, exports;

    css = {
      collapsed: 'collapsed'
    };

    data = {
      active: false,
      value: DEFAULT_FUNDS,
      displayValue: DEFAULT_FUNDS,
      hideLeadingZeroes: true,
      frameInterval: 3,
      frameCount: 0,
      fontSize: 10,
      offsetType: 'px',
      digitCount: 3,
      // state for each digit  
      offsetTop: [],
      lastOffsetTop: [],
      visible: []
    };
  
    // initialize state
    for (var n = 0; n < data.digitCount; n++) {
      data.offsetTop[n] = null;
      data.lastOffsetTop[n] = null;
      data.visible[n] = true;
    }

    dom = {
      o: null,
      digits: null
    }

    function show(offset) {
      if (data.visible[offset]) return;

      data.visible[offset] = true;
      utils.css.remove(dom.digits[offset].parentNode, css.collapsed);
    }

    function hide(offset) {
      if (!data.visible[offset]) return;

      data.visible[offset] = false;
      utils.css.add(dom.digits[offset].parentNode, css.collapsed);
    }
    
    function updateDOM() {
      // raw string, and array of integers
      var digits = data.displayValue.toString();
      var digitInts = [];
      var tensOffset = 0;

      // pad with leading zeroes, e.g., 9 -> 009
      if (digits.length < data.digitCount) {
        // old-skool, ES5: use an array trick to get an arbitrary "repeating" string.
        digits = new Array(data.digitCount - digits.length + 1).join('0') + digits;
      }

      if (!dom.digits) dom.digits = document.querySelectorAll('#funds-count .digit-wrapper');

      // guard, in case these haven't rendered yet.
      if (!dom.digits.length) return;

      var delta;

      // rough concept of rotation speed / velocity on the UI.
      if (!data.active) {

        // update frequency relative to the credits being spent / earned.
        delta = Math.abs(data.displayValue - data.value);

        // how fast should the ticks go by?
        // (timed roughly to inventory ordering animations.)
        var i;

        if (delta >= 10) {
          i = 2;
        } else if (delta >= 9) {
          i = 3;
        } else if (delta >= 8) {
          i = 4;
        } else if (delta >= 7) {
          i = 5;
        } else if (delta >= 6) {
          i = 6;
        } else if (delta >= 5) {
          i = 8;
        } else if (delta >= 3) {
          i = 10;
        } else {
          i = 21;
        }

        data.frameInterval = i;
        
        data.active = true;
      }

      var digitCountMinusOne = data.digitCount - 1;

      // handle digit changes.
      for (var i = 0, j = data.digitCount; i < j; i++) {
        data.offsetTop[i] = digits[i] * -1;
        if (data.lastOffsetTop[i] === data.offsetTop[i]) continue;
        data.lastOffsetTop[i] = data.offsetTop[i];

        // show or hide 10s / 100s "columns" accordingly.
        if (data.hideLeadingZeroes && (!i || i < digitCountMinusOne)) {
          // first digit: hide if zero.
          digitInts[i] = parseInt(digits[i], 10);

          // when not first nor last digit, show if non-zero - OR, when the digit to the left is non-zero.
          if (digitInts[i] || digitInts[i-1]) {
            show(i);
          } else if (i < digitCountMinusOne) {
            // never hide the rightmost, ones column.
            hide(i);
          }
        }

        // include the value of the prior column in the current background position offset.
        // e.g., if there are 30 funds, the "ones" column should have an offset accounting for three "sets" of 0-9.
        // without this, decrementing from 30 to 29 would cause the ones column to "jump" across a single set of digits visibly with the transition.
        // this offset means the background repeats, and the next 9 slides in from the top as would be expected.
        tensOffset = (data.offsetTop[i-1] || 0) * 10;

        dom.digits[i].style.backgroundPosition = '0px ' + ((data.offsetTop[i] + 1 + tensOffset) * data.fontSize) + data.offsetType;
      }
   
    }
  
    function updateSound() {

      // "... Press debit or credit" 🤣 -- Maria Bamford https://www.youtube.com/watch?v=hi8UURLK6FM
      if (data.displayValue <= data.value) {
        playSound(sounds.inventory.credit);
      } else {
        playSound(sounds.inventory.debit);
      }
    }

    function animate() {
      // are we up-to-date?
      if (data.displayValue === data.value) {
        data.active = false;
        return false;
      }

      // wait until it's time.
      data.frameCount++;
      if (data.frameCount < data.frameInterval) return false;
      
      // otherwise, reset.
      data.frameCount = 0;
  
      // debit or credit sound, first and foremost.
      updateSound();
   
      data.displayValue += (data.displayValue < data.value ? 1 : -1);

      updateDOM();
    }
    
    function setFunds(newValue) {
      data.value = newValue;
      // allow "speed" to change
      data.intervalApplied = false;
    }

    exports = {
      animate: animate,
      data: data,
      setFunds: setFunds
    }

    updateDOM();

    return exports;

  }

  /**
   * hooks into main game requestAnimationFrame() loop.
   * calls animate() methods on active FrameTimeout() instances.
   */
  frameTimeoutManager = (function() {
    var completedCount, exports, instances, spliceArgs = [null, 1];

    instances = [];

    function addInstance(frameTimeout) {
      instances.push(frameTimeout);
    }

    function animate() {
      if (!instances || !instances.length) return;

      var completed = [];

      for (var i = 0, j = instances.length; i < j; i++) {
        // do work, and track completion
        if (instances[i].animate()) {
          completed.push(instances[i]);
        }
      }

      if (completed.length) {
        for (i=0, j=completed.length; i<j; i++) {
          spliceArgs[0] = instances.indexOf(completed[i]);
          Array.prototype.splice.apply(instances, spliceArgs);
        }
      }
      
    }

    exports = {
      addInstance: addInstance,
      animate: animate
    };

    return exports;
  }());

  setFrameTimeout = function(callback, delayMsec) {

    /**
     * a frame-counting-based setTimeout() implementation.
     * milisecond value (parameter) is converted to a frame count.
     */

    var data, exports;

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
      animate: animate,
      data: data,
      reset: reset
    };

    frameTimeoutManager.addInstance(exports);

    return exports;

  };

  // recycled from survivor.js

  keyboardMonitor = (function() {

    var keys,
      events,

      // hash for keys being pressed
      downKeys = {},

      // meaningful labels for key values
      keyMap = {
        rubber_chicken: 67,
        shift: 16,
        ctrl: 17,
        space: 32,
        left: 37,
        up: 38,
        right: 39,
        down: 40,
        missileLauncher: 77,
        tank: 84,
        van: 86,
        infantry: 73,
        engineer: 69
        // 'helicopter': 72
      };

    events = {

      keydown: function(e) {

        // console.log(e.keyCode);

        if (!e.metaKey && keys[e.keyCode] && keys[e.keyCode].down) {
          if (!downKeys[e.keyCode]) {
            downKeys[e.keyCode] = true;
            keys[e.keyCode].down(e);
          }
          if (keys[e.keyCode].allowEvent === undefined) {
            return stopEvent(e);
          }
        }

        return true;

      },

      keyup: function(e) {

        if (!e.metaKey && downKeys[e.keyCode] && keys[e.keyCode]) {
          downKeys[e.keyCode] = null;
          if (keys[e.keyCode].up) {
            keys[e.keyCode].up(e);
          }
          if (keys[e.keyCode].allowEvent === undefined) {
            return stopEvent(e);
          }
        }

        return true;

      }

    };

    keys = {

      // NOTE: Each function gets an (e) event argument.

      // shift
      13: {

        allowEvent: true, // don't use stopEvent()

        down: function() {

          game.objects.helicopters[0].eject();

        }

      },

      // shift
      16: {

        allowEvent: true, // don't use stopEvent()

        down: function() {

          game.objects.helicopters[0].setFiring(true);

        }

      },

      // ctrl (alternate for shift key)
      17: {

        allowEvent: true, // don't use stopEvent()

        down: function() {

          game.objects.helicopters[0].setBombing(true);

        }

      },

      // space bar
      32: {

        down: function() {

          game.objects.helicopters[0].setParachuting(true);

        },

        up: function() {

          game.objects.helicopters[0].setParachuting(false);

        }

      },

      // "m"
      77: {

        down: function() {

          game.objects.inventory.order(TYPES.missileLauncherCamel);

        }

      },

      // "t"
      84: {

        down: function() {

          game.objects.inventory.order(TYPES.tank);

        }

      },

      // "v"
      86: {

        down: function() {

          game.objects.inventory.order(TYPES.van);

        }

      },

      // "c" (rubber chicken)
      67: {

        down: function() {

          game.objects.helicopters[0].setMissileLaunching(true, true);

          // enable rubber chicken in UI, if not already.
          if (!forceRubberChicken) {
            utils.css.add(document.getElementById('world'), rubberChickenMode);
          }

          document.querySelector('#stats-bar .missiles .letter-block').innerHTML = 'C';

        },

        up: function() {

          game.objects.helicopters[0].setMissileLaunching(false);

        }

      },

      // "x"
      88: {

        down: function() {

          game.objects.helicopters[0].setMissileLaunching(true);

        },

        up: function() {

          game.objects.helicopters[0].setMissileLaunching(false);

        }

      },

      // "e"
      69: {

        down: function() {

          game.objects.inventory.order(TYPES.engineer);

        }

      },

      // "i"
      73: {

        down: function() {

          game.objects.inventory.order(TYPES.infantry);

        }

      }

    };

    function isDown(labelOrCode) {

      // check for a pressed key based on '37' or 'left', etc.
      return (keyMap[labelOrCode] !== undefined ? downKeys[keyMap[labelOrCode]] : downKeys[labelOrCode]);

    }

    function releaseAll() {

      // reset all pressed key states.
      var item;
      for (item in downKeys) {
        if (downKeys.hasOwnProperty(item) && downKeys[item]) {
          // simulate the keyup event
          events.keyup({
            keyCode: item
          });
        }
      }

    }

    function attachEvents() {

      utils.events.add(document, 'keydown', events.keydown);
      utils.events.add(document, 'keyup', events.keyup);

    }

    // init?

    function initKeyboardMonitor() {

      attachEvents();

    }

    return {

      init: initKeyboardMonitor,
      isDown: isDown,
      keydown: events.keydown,
      keyMap: keyMap,
      keyup: events.keyup,
      releaseAll: releaseAll

    };

  }());

  game = (function() {

    var data, dom, objects, objectConstructors, exports;

    function addObject(type, options) {

      // given type of TYPES.van, create object and append to respective array.

      var object, objectArray;

      // TYPES.van -> game.objects['vans'], etc.
      objectArray = game.objects[type + (type === TYPES.infantry ? '' : 's')];

      options = options || {};

      // create and push an instance object onto its relevant array by type (e.g., TYPES.van -> game.objects['vans'])
      if (objectConstructors[type]) {
        object = new objectConstructors[type](options);
      } else {
        console.warn('No constructor of type ' + type);
      }

      objectArray.push(object);

      return object;

    }

    function createObjects() {

      var i, x;

      stats = new Stats();

      objects.gameLoop = new GameLoop();

      objects.notifications = new Notifications();

      objects.funds = new Funds();

      objects.queue = new Queue();

      objects.view = new View();

      // allow joystick if in debug mode (i.e., testing on desktop)
      if (isMobile || debug) {

        objects.joystick = new Joystick();

        objects.joystick.onSetDirection = function(directionX, directionY) {
          // percentage to pixels (circle coordinates)
          objects.view.data.mouse.x = ((directionX / 100) * objects.view.data.browser.width);
          objects.view.data.mouse.y = ((directionY / 100) * objects.view.data.browser.height);
        };

      }

      objects.radar = new Radar();

      objects.inventory = new Inventory();

      // tutorial?

      if (tutorialMode) {

        objects.tutorial = new Tutorial();

        utils.css.add(document.getElementById('help'), 'active');

      } else {

        utils.css.add(document.getElementById('help'), 'inactive');

      }

      // player's landing pad

      addObject('landingPad', {
        x: 300
      });

      addObject('base', {
        x: 160
      });

      addObject('base', {
        x: 8000,
        isEnemy: true
      });

      // local, and enemy base end bunkers

      addObject('endBunker');

      addObject('endBunker', {
        isEnemy: true
      });

      if (gameType === 'hard' || gameType === 'extreme') {

        // level 9

        // mid and end-level landing pad. create up-front, since vans rely on it for xGameOver.

        addObject('landingPad', {
          x: 3944
        });

        addObject('landingPad', {
          x: 7800
        });

        // twin enemy turrets, mid-field - good luck.
        if (gameType === 'extreme') {
          addObject(TYPES.turret, {
            x: 3800,
            isEnemy: true
          });
          addObject(TYPES.turret, {
            x: 4145,
            isEnemy: true
          });
        }

        addItem('right-arrow-sign', 550);

        x = 630;

        addObject(TYPES.bunker, {
          x: x,
          isEnemy: true
        });

        x += 230;

        addItem('grave-cross', x);

        x += 12;

        addItem('cactus2', x);

        x += 92;

        addObject(TYPES.turret, {
          x: x,
          isEnemy: true,
          DOA: false
        });

        x += 175;

        addObject(TYPES.bunker, {
          x: x,
          isEnemy: true
        });

        x += 100;

        addObject(TYPES.tank, {
          x: x,
          isEnemy: true
        });

        addItem('grave-cross', x);

        x += 40;

        addItem('cactus', x);

        x += 250;

        addObject(TYPES.tank, {
          x: x,
          isEnemy: true
        });

        x += 50;

        addObject(TYPES.tank, {
          x: x,
          isEnemy: true
        });

        x += 80;

        for (i = 0; i < 10; i++) {

          addObject(TYPES.infantry, {
            x: x + (i * 11),
            isEnemy: true
          });

        }

        addObject(TYPES.van, {
          x: x + 210,
          isEnemy: true
        });

        addItem('gravestone', x);

        x += 110;

        addObject(TYPES.superBunkerCamel, {
          x: x,
          isEnemy: true,
          energy: 5
        });

        x += 120;

        addObject(TYPES.turret, {
          x: x,
          isEnemy: true,
          DOA: false
        });

        x += 640;

        addItem('gravestone', x);

        addObject(TYPES.van, {
          x: x,
          isEnemy: true
        });

        for (i = 0; i < 5; i++) {

          addObject(TYPES.infantry, {
            x: (x + 50) + (i * 11),
            isEnemy: true
          });

        }

        x += 80;

        addItem('sand-dunes', x);

        addObject(TYPES.tank, {
          x: x + 75,
          isEnemy: true
        });

        for (i = 0; i < 5; i++) {

          addObject(TYPES.infantry, {
            x: (x + 75) + (i * 11),
            isEnemy: true
          });

        }

        addObject(TYPES.tank, {
          x: x + 240,
          isEnemy: true
        });

        x += 540;

        addObject(TYPES.tank, {
          x: x,
          isEnemy: true
        });

        addObject(TYPES.tank, {
          x: x + 240,
          isEnemy: true
        });

        for (i = 0; i < 5; i++) {

          addObject(TYPES.infantry, {
            x: (x + 240 + 75) + (i * 11),
            isEnemy: true
          });

        }

        addObject(TYPES.van, {
          x: x + 240 + 215,
          isEnemy: true
        });

        addObject(TYPES.bunker, {
          x: x,
          isEnemy: true
        });

        x += 135;

        addItem('gravestone', x);

        x += 25;

        addItem('cactus2', x);

        x += 260;

        addItem('sand-dune', x);

        x -= 40;

        addItem('grave-cross', x);

        x += 150;

        addItem('sand-dunes', x);

        x += 150;

        addObject(TYPES.bunker, {
          x: x,
          isEnemy: true
        });

        x += 115;

        // landing pad is logically added here.

        x += 88;

        // gravestone sits behind...

        x += 10;

        addItem('gravestone', x);

        x -= 10;

        // now, stack on top

        addItem('sand-dune', x);

        addItem('grave-cross', x);

        x += 54;

        addObject(TYPES.bunker, {
          x: x,
          isEnemy: true
        });

        x -= 6;

        addItem('checkmark-grass', x);

        x += 90;

        addItem('cactus', x);

        x += 305;

        addItem('gravestone', x);

        x += 32;

        addItem('grave-cross', x);

        x += 80;

        addItem('sand-dune', x);

        x += 115;

        addItem('grave-cross', x);

        x += 175;

        addItem('gravestone', x);

        x += 55;

        addItem('cactus2', x);

        x += 85;

        addItem('gravestone', x);

        x += 25;

        addItem('grave-cross', x);

        x += 70;

        addObject(TYPES.bunker, {
          x: x,
          isEnemy: true
        });

        x += 5;

        addItem('gravestone', x);

        x += 85;

        addItem('gravestone', x);

        x += 192;

        addItem('gravestone', x);

        x += 96;

        addItem('gravestone', x);

        x += 150;

        addItem('grave-cross', x);

        x += 50;

        addItem('gravestone', x);

        x += 260;

        addItem('gravestone', x);

        x += 45;

        addItem('sand-dunes', x);

        x += 215;

        addItem('cactus2', x);

        x += 60;

        addObject(TYPES.superBunkerCamel, {
          x: x,
          isEnemy: true,
          energy: 5
        });

        x += 125;

        addObject(TYPES.turret, {
          x: x,
          isEnemy: true,
          DOA: false
        });

        x += 145;

        addObject(TYPES.bunker, {
          x: x,
          isEnemy: true
        });

        x += 128;

        addObject(TYPES.bunker, {
          x: x,
          isEnemy: true
        });

        x += 20;

        addItem('grave-cross', x);

        x += 64;

        addItem('cactus2', x);

        x += 50;

        addItem('gravestone', x);

        x += 200;

        addItem('gravestone', x);

        x += 115;

        addItem('cactus', x);

        x += 42;

        addItem('grave-cross', x);

        x += 140;

        addItem('cactus2', x);

        x += 12;

        addItem('cactus2', x);

        x += 100;

        addItem('gravestone', x);

        x += 145;

        // ideally, this should be between the right post sign now.

        addItem('grave-cross', x);

      } else {

        // level 1

        // mid and end-level landing pads (affects van objects' xGameOver property, so create this ahead of vans.)

        addObject('landingPad', {
          x: 4096 - 290
        });

        addObject('landingPad', {
          x: 7800
        });

        addObject(TYPES.turret, {
          x: 475,
          DOA: true
        });

        addObject(TYPES.bunker, {
          x: 1024,
          isEnemy: true
        });

        addItem('right-arrow-sign', 550);

        addItem('tree', 660);

        addItem('palm-tree', 860);

        addItem('barb-wire', 918);

        addItem('palm-tree', 1120);

        addItem('rock2', 1280);

        addItem('palm-tree', 1390);

        addObject(TYPES.bunker, {
          x: 1536
        });

        addItem('palm-tree', 1565);

        addItem('flower', 1850);

        addObject(TYPES.bunker, {
          x: 2048
        });

        addItem('tree', 2110);

        addItem('gravestone', 2150);

        addItem('palm-tree', 2260);

        addItem('tree', 2460);

        addObject(TYPES.bunker, {
          x: 2560
        });

        addItem('tree', 2700);

        addObject(TYPES.bunker, {
          x: 3072
        });

        addItem('palm-tree', 3400);

        addItem('palm-tree', 3490);

        addItem('checkmark-grass', 4120);

        addItem('palm-tree', 4550);

        addObject(TYPES.bunker, {
          x: 4608,
          isEnemy: true
        });

        addItem('tree', 4608);

        addItem('tree', 4820);

        addItem('palm-tree', 4850);

        addItem('grave-cross', 4970);

        addObject(TYPES.bunker, {
          x: 5120,
          isEnemy: true
        });

        addItem('tree', 5110);

        addItem('barb-wire', 5200);

        addItem('grave-cross', 5275);

        addObject(TYPES.bunker, {
          x: 5632,
          isEnemy: true
        });

        // near-end / enemy territory

        addItem('palm-tree', 3932 + 32);

        addItem('tree', 3932 + 85);

        addItem('palm-tree', 3932 + 85 + 230);

        addItem('tree', 3932 + 85 + 230 + 90);

        addObject(TYPES.bunker, {
          x: 6656,
          isEnemy: true
        });

        addItem('tree', 6736);

        addItem('tree', 6800);

        addItem('palm-tree', 6888);

        addItem('gravestone', 7038);

        addItem('tree', 7070);

        addItem('gravestone', 7160);

        addItem('palm-tree', 7310);

        addItem('tree', 7325);

        addItem('flower', 7500);

        // enemy base sign

        addItem('left-arrow-sign', 7700);

        // more mid-level stuff

        addObject(TYPES.superBunkerCamel, {
          x: 4096 - 640 - 128,
          isEnemy: true,
          energy: 5
        });

        addObject(TYPES.turret, {
          x: 4096 - 640, // width of landing pad
          isEnemy: true,
          DOA: !!tutorialMode
        });

        addObject(TYPES.turret, {
          x: 4096 + 120, // width of landing pad
          isEnemy: true,
          DOA: !!tutorialMode
        });

        // vehicles!

        if (!winloc.match(/novehicles/i) && !tutorialMode) {

          // friendly units

          addObject(TYPES.van, {
            x: 192
          });

          for (i = 0; i < 5; i++) {

            addObject(TYPES.infantry, {
              x: 600 + (i * 20)
            });

          }

          addObject(TYPES.van, {
            x: 716
          });

          addObject(TYPES.tank, {
            x: 780
          });

          addObject(TYPES.tank, {
            x: 845
          });

          // first enemy convoy

          addObject(TYPES.tank, {
            x: 1536,
            isEnemy: true
          });

          addObject(TYPES.tank, {
            x: 1536 + 70,
            isEnemy: true
          });

          addObject(TYPES.tank, {
            x: 1536 + 140,
            isEnemy: true
          });

          addObject(TYPES.van, {
            x: 1536 + 210,
            isEnemy: true
          });

          addObject(TYPES.tank, {
            x: 2048 + 256,
            isEnemy: true
          });

          addObject(TYPES.tank, {
            x: 4608 + 256,
            isEnemy: true
          });

          for (i = 0; i < 5; i++) {

            // enemy infantry, way out there
            addObject(TYPES.infantry, {
              x: 5120 + (i * 20),
              isEnemy: true
            });

          }

        }

      }

      // happy little clouds!

      addObject('cloud', {
        x: 512
      });

      addObject('cloud', {
        x: 4096 - 256
      });

      addObject('cloud', {
        x: 4096 + 256
      });

      addObject('cloud', {
        x: 4096 + 512
      });

      addObject('cloud', {
        x: 4096 + 768
      });

      // a few rogue balloons

      addObject(TYPES.balloon, {
        x: 4096 - 256
      });

      addObject(TYPES.balloon, {
        x: 4096 + 256
      });

      addObject(TYPES.balloon, {
        x: 4096 + 512
      });

      addObject(TYPES.balloon, {
        x: 4096 + 768
      });

      // player + enemy helicopters

      addObject(TYPES.helicopter, {
        x: 310,
        y: game.objects.view.data.world.height - 20,
        attachEvents: true
      });

      if (!tutorialMode) {

        addObject(TYPES.helicopter, {
          x: 8192 - 64,
          y: 72,
          isEnemy: true,
          vX: -8
        });

      }

    }

    function pause() {

      if (!data.paused) {
        objects.gameLoop.stop();
        if (!userDisabledSound) {
          soundManager.mute();
        }
        utils.css.add(document.body, 'game-paused');
        data.paused = true;
      }

    }

    function resume() {

      if (data.paused) {
        objects.gameLoop.start();
        if (!userDisabledSound) {
          soundManager.unmute();
        }
        utils.css.remove(document.body, 'game-paused');
        data.paused = false;
      }

    }

    function initGame() {

      dom.world = document.getElementById('battlefield');

      if (convoyParam) {

        // for example, ?convoydelay=30
        convoyDelay = parseInt(winloc.substr(convoyParam + 12), 10);

        if (!isNaN(convoyDelay)) {
          console.log('applying custom enemy convoy delay of ' + convoyDelay);
        } else {
          convoyDelay = (gameType === 'extreme' ? 20 : (gameType === 'hard' ? 30 : 60));
        }

      }

      createObjects();

      objects.gameLoop.init();

      function startEngine() {
        sounds.helicopter.engine.sound.play();
        utils.events.remove(document, 'click', startEngine);
      }

      if (sounds.helicopter.engine && !userDisabledSound) {
        // wait for click or keypress, "user interaction"
        utils.events.add(document, 'click', startEngine);
      }

      (function() {

        // basic enemy ordering pattern
        var enemyOrders = [TYPES.missileLauncherCamel, TYPES.tank, TYPES.van, TYPES.infantry, TYPES.infantry, TYPES.infantry, TYPES.infantry, TYPES.infantry, TYPES.engineer, TYPES.engineer];
        var enemyDelays = [4, 4, 3, 0.4, 0.4, 0.4, 0.4, 1, 0.45];
        var i = 0;

        if (gameType === 'extreme') {
          // one more tank to round out the bunch, and (possibly) further complicate things :D
          enemyOrders.push(TYPES.tank);
          // 
          enemyDelays.push(4);
        }

        // after ordering, wait a certain amount before the next convoy
        enemyDelays.push(convoyDelay);

        function orderNextItem() {

          var options;

          if (!battleOver && !data.paused) {

            options = {
              isEnemy: true,
              x: 8192 + 64
            };

            if (!productionHalted) {
              game.objects.inventory.createObject(game.objects.inventory.data.types[enemyOrders[i]], options);
            }

            setFrameTimeout(orderNextItem, enemyDelays[i] * 1000);

            i++;

            if (i >= enemyOrders.length) {
              i = 0;
            }

          }

        }

        // and begin
        if (!tutorialMode) {
          setFrameTimeout(orderNextItem, 5000);
        }

      }());

    }

    data = {
      paused: false
    };

    dom = {
      world: null // TODO: rename to battlefield
    };

    objects = {
      gameLoop: null,
      view: null,
      chains: [],
      balloons: [],
      bunkers: [],
      endBunkers: [],
      engineers: [],
      gunfire: [],
      infantry: [],
      parachuteInfantry: [],
      missileLaunchers: [],
      superBunkers: [],
      tanks: [],
      vans: [],
      helicopters: [],
      smartMissiles: [],
      bases: [],
      clouds: [],
      landingPads: [],
      turrets: [],
      shrapnel: [],
      smoke: [],
      terrainItems: [],
      radar: null,
      inventory: null,
      tutorial: null,
      queue: null,
      funds: null,
      notifications: null,
    };

    objectConstructors = {
      balloon: Balloon,
      base: Base,
      bunker: Bunker,
      cloud: Cloud,
      endBunker: EndBunker,
      engineer: Engineer,
      helicopter: Helicopter,
      infantry: Infantry,
      landingPad: LandingPad,
      missileLauncher: MissileLauncher,
      superBunker: SuperBunker,
      turret: Turret,
      tank: Tank,
      van: Van
    };

    exports = {
      addObject: addObject,
      data: data,
      dom: dom,
      init: initGame,
      objects: objects,
      pause: pause,
      resume: resume
    };

    return exports;

  }());

  function startGame() {

    // should scaling be disabled, per user preference?
    if (utils.storage.get(prefs.noScaling)) {
      userDisabledScaling = true;
    }

    if (utils.storage.get(prefs.noSound)) {
      userDisabledSound = true;
    }

    // updateScreenScale();
    // applyScreenScale();

    if (forceRubberChicken) {
      utils.css.add(document.getElementById('world'), rubberChickenMode);
      document.querySelector('#stats-bar .missiles .letter-block').innerHTML = 'C';
    }

    game.init();

    keyboardMonitor.init();

  }

  function orientationChange() {
    // primarily for handling iPhone X, and position of The Notch.
    // apply CSS to <body> per orientation, and iPhone-specific CSS will handle the padding.

    // shortcuts
    var body = document.body;
    var add = utils.css.add;
    var remove = utils.css.remove;

    var atLeft = 'notch-at-left';
    var atRight = 'notch-at-right';

    var notchPosition = getLandscapeLayout();

    // inefficient/lazy: remove both, apply the active one.
    remove(body, atLeft);
    remove(body, atRight);

    if (notchPosition === 'left') {
      add(body, atLeft);
    } else if (notchPosition === 'right') {
      add(body, atRight);
    }

    // helicopters need to know stuff, too.
    if (game.objects.helicopters[0]) game.objects.helicopters[0].refreshCoords(true);
    if (game.objects.helicopters[1]) game.objects.helicopters[1].refreshCoords();

  }

  function initArmorAlley() {

    // late addition: tutorial vs. regular game mode

    // no-transform CSS tweak for legacy stuff.
    if (noTransform) {
      utils.css.add(document.body, 'no-transform');
    }

    if (isMobile) {

      utils.css.add(document.body, 'is-mobile');

      // prevent context menu on links.
      // this is dirty, but it works (supposedly) for Android.
      window.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      // if iPads etc. get The Notch, this will need updating. as of 01/2018, this is fine.
      if (isiPhone) {
        /**
         * iPhone X notch detection shenanigans. AA should avoid the notch,
         * but doesn't need to pad the right end of the screen - thus, we detect
         * this case and apply CSS for orientation so we know which side the notch is on.
         *
         * Tips o' the hat:
         * PPK - hasNotch() detection. Doesn't seem to work on iOS 11.0.2 as of 01/2018.
         * https://www.quirksmode.org/blog/archives/2017/10/safeareainset_v.html
         * Mark Nolton on SO - orientation change.
         * https://stackoverflow.com/a/47226825
         */
        console.log('watching orientation for possible iPhone X Notch handling.');
        window.addEventListener('orientationchange', orientationChange);
        // and get the current layout.
        orientationChange();
      }

    }

    var menu,
      description = document.getElementById('game-description'),
      defaultDescription = description.innerHTML,
      lastHTML = defaultDescription;

    function resetMenu() {
      if (lastHTML !== defaultDescription) {
        description.innerHTML = defaultDescription;
        lastHTML = defaultDescription;
      }
    }

    function menuUpdate(e) {

      var target = (e.target || window.event.sourceElement),
        title;

      // normalize to <a>
      if (target && utils.css.has(target, 'emoji')) {
        target = target.parentNode;
      }

      if (target && target.className.match(/cta/i)) {
        title = target.title;
        if (title) {
          target.setAttribute('data-title', title);
          target.title = '';
        } else {
          title = target.getAttribute('data-title');
        }
        if (lastHTML !== title) {
          description.innerHTML = title;
          lastHTML = title;
        }
      } else {
        resetMenu();
      }

    }

    function menuClick(e) {

      // infer game type from link, eg., #tutorial

      var target = (e.target || window.event.sourceElement),
        storedOK,
        param;

      if (target && target.href) {

        // cleanup
        utils.events.remove(menu, 'click', menuClick);
        utils.events.remove(menu, 'mouseover', menuUpdate);
        utils.events.remove(menu, 'mouseout', menuUpdate);
        menu = null;

        param = target.href.substr(target.href.indexOf('#') + 1);

        if (param === 'easy') {

          // window.location.hash = param;

          // set local storage value, and continue
          storedOK = utils.storage.set(prefs.gameType, 'easy');

          // stoage failed? use hash, then.
          if (!storedOK) {
            window.location.hash = param;
          }

          if (gameType === 'hard' || gameType === 'extreme') {

            // reload, since we're switching to easy
            window.location.reload();

          } else {

            // show exit link
            var exit = document.getElementById('exit');
            if (exit) {
              exit.className = 'visible';
            }

          }

        } else if (param === 'hard' || param === 'extreme') {

          // set local storage value, and continue
          storedOK = utils.storage.set(prefs.gameType, param);

          // stoage failed? use hash, then.
          if (!storedOK) {
            window.location.hash = param;
          }

          window.location.reload();

        } else {

          window.location.hash = 'tutorial';

          window.location.reload();

        }

      }

      utils.events.preventDefault(e);

      canHideLogo = true;

      return false;

    }

    winloc = window.location.href.toString();

    // should we show the menu?

    gameType = (winloc.match(/easy|hard|extreme|tutorial/i) || utils.storage.get(prefs.gameType));

    if (gameType instanceof Array) {
      gameType = gameType[0];
    }

    // safety check
    if (gameType && !gameType.match(/easy|hard|extreme|tutorial/i)) {
      gameType = null;
    }

    if (!gameType) {

      menu = document.getElementById('game-menu');

      if (menu) {

        utils.css.add(document.getElementById('world'), 'blurred');

        utils.css.add(menu, 'visible');

        utils.events.add(menu, 'click', menuClick);

        utils.events.add(menu, 'mouseover', menuUpdate);

        utils.events.add(menu, 'mouseout', menuUpdate);

      }

    } else {

      // preference set or game type in URL - start immediately.

      // TODO: cleaner DOM reference
      if (gameType.match(/easy|hard|extreme/i)) {
        utils.css.add(document.getElementById('world'), 'regular-mode');
      }

      if (gameType) {
        // copy emoji to "exit" link
        var exitEmoji = document.getElementById('exit-emoji');
        var emojiReference = document.getElementById('game-menu').getElementsByClassName('emoji-' + gameType);
        emojiReference = emojiReference && emojiReference[0];
        if (exitEmoji && emojiReference) {
          exitEmoji.innerHTML = emojiReference.innerHTML;
        }
        // and show "exit"
        var exit = document.getElementById('exit');
        if (exit) {
          exit.className = 'visible';
        }
      }

      canHideLogo = true;

    }

    startGame();

  }

  window.aa = {

    initArmorAlley: initArmorAlley,

    startGame: startGame,

    toggleScaling: function(savePref) {

      var prefName = prefs.noScaling;

      userDisabledScaling = !userDisabledScaling;

      updateScreenScale();

      applyScreenScale();

      game.objects.view.events.resize();

      if (savePref) {

        if (userDisabledScaling) {
          utils.storage.set(prefName, true);
        } else {
          utils.storage.remove(prefName);
        }

      }

      return false;

    },

    startTutorial: function() {

      utils.storage.remove(prefs.gameType);

      window.location.hash = 'tutorial';

      setTimeout(function() {
        window.location.reload();
      }, 1);

      return false;

    },

    exit: function() {

      // delete stored preference
      utils.storage.remove(prefs.gameType);

      window.location.hash = '';

      setTimeout(function() {
        window.location.reload();
      }, 1);

      return false;

    },

    toggleSound: function() {

      userDisabledSound = !userDisabledSound;

      if (userDisabledSound) {
        utils.storage.set(prefs.noSound, true);
        soundManager.mute();
      } else {
        utils.storage.remove(prefs.noSound);
        soundManager.unmute();
      }

      return false;

    }

  };

  prefs = {
    gameType: 'gameType',
    noScaling: 'noScaling',
    noSound: 'noSound'
  };

  // OGG is available, so MP3 is not required.
  soundManager.audioFormats.mp3.required = false;

  if (isSafari) {
    // Safari 7+ engine freezes when multiple Audio() objects play simultaneously, making gameplay unacceptable.
    // https://bugs.webkit.org/show_bug.cgi?id=116145
    // try html5audio=1 in URL to override/test.
    var matches = navigator.userAgent.match(/Version\/([0-9]+)/i);
    // last item should be the version number.
    var majorVersion = matches && matches.pop && parseInt(matches.pop(), 10);
    if (majorVersion && majorVersion >= 7) {
      console.log('Safari 7-15 (and maybe newer) rendering engine stutters when multiple Audio() objects play simultaneously, possibly due to trackbar. https://bugs.webkit.org/show_bug.cgi?id=116145');
      if (!winloc.match(/html5audio/i)) {
        console.log('Audio is disabled by default. You can try forcing audio by adding html5audio=1 to the URL.');
        userDisabledSound = true;
        soundManager.disable();
      }
    }
  }

  soundManager.setup({
    debugMode: false,
    defaultOptions: {
      volume: 25,
      multiShot: true // !!(winloc.match(/multishot/i)),
    }
  });

  if (window.location.toString().match(/mute/i)) {
    soundManager.disable();
  }

  setTimeout(window.aa.initArmorAlley, 20);

}(window));
