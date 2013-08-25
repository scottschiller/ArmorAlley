(function(window) {

/*

                    MMM   MMMM?MN   ZMMMM  MMMMM  MMMM  MMMMMMMM       MMM   MMMMMM   MMMMMM   MMMM MMM MMMM MMMM       
         D         MMMM   DMMM+MMM  $MMMM  MMMM MMMMMMMD MMMM MMM      MMMM   MMMM     MMMM     MMM NMM MMMM DMN        
       MM   M      MMMM    MMM MMM:  MMMM  MMMM MMM  MMM MMMM MMM     MMMMM   MMMM     MMMM     MMM  MM  MMM =M         
 M   MMMMMMMM      MMMMM   MMM MMMM  MMMMMMMMMM MMM  MMM MMMM MMM     MNMMM   MMMM     MMMM     MMM      MMMM~M         
 M  MMMMMMMMM      MMMMM   MMM MMM:  MMMMMMMMMM MMM  MMM MMMM MMM     M7MMM   MMMM     MMMM     MMM MM    MMMM          
 MMMMMMMMMMM      MM MMM   MMM?MM    MMMMN MMMM MMM  MMM MMMM MM     8M MMM   MMMM     MMMM     MMMMMM    MMMM          
      .  ,        MM MMMN  MMM?MMM   MMMM  MMMM MMM  MMM MMMMMMMM    MM MMMM  MMMM     MMMM     MMM MM    MMMM          
                  M MMMMN  MMM MMMM  MMMM  MMMM MMM  MMM MMMM MMM    MMNMMMM  MMMM   M MMMM   M MMM       MMMM          
                 8M  MMMM  MMM MMMM  MMMM  MMMM MMM  MMM MMMM MMM    M  MMMM  MMMM  MM MMMM  MM MMM  MM   MMMM          
                 MM  MMMM DMMM7MMMMM MMMM  MMMM  MMMMMM  MMMM MMMM  DMD MMMMM MMMMNMMM MMMMNMMM MMM MMM   MMMM          
                 MM  MMMM MMMM$ MMM  MMMM  MMMM    MM    MMMM  MN   MMM MMMMM MMMMMMMM MMMMMMM MMMM MMM   MMMM          

*/

  var game, utils, common;

  var FPS = 24;
  var FRAMERATE = 1000/FPS;

  var winloc = window.location.href.toString();

  // just in case...
  var console = (window.console || { log: function(){} });

  var noJamming = winloc.match(/nojam/i);

  var noTransform = winloc.match(/notransform/i);

  var trackEnemy = winloc.match(/trackenemy/i);

  var deg2Rad = 180/Math.PI;

  var battleOver = false;

  utils = {

    array: (function() {

      function compare(property) {
        return function(a, b) {
          if (a[property] < b[property]) {
            return -1;
          } else if (a[property] > b[property]) {
            return 1;
          } else {
            return 0;
          }
        }
      }

      function shuffle(array) {

        // Fisher-Yates shuffle algo

        var i, j, temp;

        for (i = array.length - 1; i > 0; i--) {
          j = Math.floor(Math.random() * (i+1));
          temp = array[i];
          array[i] = array[j];
          array[j] = temp;
        }

        return array;

      }

      return {
        compare: compare,
        shuffle: shuffle
      }

    }()),

    css: (function() {

      function hasClass(o, cStr) {

        return (o.className !== undefined ? new RegExp('(^|\\s)' + cStr + '(\\s|$)').test(o.className) : false);

      }

      function addClass(o, cStr) {

        if (!o || !cStr || hasClass(o, cStr)) {
          return false; // safety net
        }
        o.className = (o.className ? o.className + ' ' : '') + cStr;

      }

      function removeClass(o, cStr) {

        if (!o || !cStr || !hasClass(o, cStr)) {
          return false;
        }
        o.className = o.className.replace(new RegExp('( ' + cStr + ')|(' + cStr + ')', 'g'), '');

      }

      function swapClass(o, cStr1, cStr2) {

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
        add: addClass,
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

    }())

  };

  function mixin(oMain, oAdd) {

    // non-destructive merge
    var o1 = (oMain || {}), o2, o;

    // if unspecified, o2 is the default options object
    o2 = (oAdd === undefined ? {} : oAdd);

    for (o in o2) {

      if (o2.hasOwnProperty(o)) {

        if (typeof o2[o] !== 'object' || o2[o] === null || o2[o] === undefined || o2[o] instanceof Array) {

          // assign directly
          o1[o] = o2[o];

        } else {

          // recurse through o2
          o1[o] = mixin(o1[o], o2[o]);

        }

      }

    }

    return o1;

  };

  function stopEvent(e) {

    var evt = e || window.event;

    if (evt.preventDefault !== undefined) {

      evt.preventDefault();

    } else {

      evt.cancelBubble = true;

    }

    return false;

  }

  var features;

  var testDiv = document.createElement('div');

  features = (function() {

    var getAnimationFrame;

    /**
     * hat tip: paul irish
     * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
     * https://gist.github.com/838785
     */

    var _animationFrame = (window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        null);

    // apply to window, avoid "illegal invocation" errors in Chrome
    getAnimationFrame = _animationFrame ? function() {
      return _animationFrame.apply(window, arguments);
    } : null;

    // requestAnimationFrame is still somewhat slower in this case than an old-skool setInterval(). Not sure why.
    if (getAnimationFrame && winloc.match(/raf=1/i)) {
      console.log('preferring requestAnimationFrame for game loop');
    } else {
      getAnimationFrame = null;
    }

    var transform, styles, prop;

    function has(prop) {

      // test for feature support
      var result = testDiv.style[prop];
      return (result !== undefined ? prop : null);

    }

    // note local scope.
    var features = {

/*
      audio: false, // set later via SM2

      opacity: (function(){
        try {
          testDiv.style.opacity = '0.5';
        } catch(e) {
          return false;
        }
        return true;
      }()),
*/

      transform: {
        ie:  has('-ms-transform'),
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

      'getAnimationFrame': getAnimationFrame

    };

    features.transform.prop = (
      features.transform.w3 || 
      features.transform.moz ||
      features.transform.webkit ||
      features.transform.ie ||
      features.transform.opera
    );

    function attempt(style) {

      try {
        testDiv.style[transform] = style;
      } catch(e) {
        // that *definitely* didn't work.
        return false;
      }
      // if we can read back the style, it should be cool.
      return !!testDiv.style[transform];

    }

    if (features.transform.prop) {

      // try to derive the rotate/3D support.
      transform = features.transform.prop;
      styles = {
        css_2d: 'rotate(0deg)',
        css_3d: 'rotate3d(0,0,0,0deg)'
      };

      if (attempt(styles.css_3d)) {
        features.rotate.has3D = true;
        prop = 'rotate3d';
      } else if (attempt(styles.css_2d)) {
        prop = 'rotate';
      }

      features.rotate.prop = prop;

    }

    console.log('user agent feature test:', features);

    console.log('requestAnimationFrame() is' + (features.getAnimationFrame ? '' : ' not') + ' enabled');

    if (features.transform.prop) {
      if (noTransform) {
        console.log('transform support present, disabling via URL parameter');
        features.transform.prop = null;
      } else {
        console.log('using transforms for parallax, rotation and some positioning.');
      }
    }

    return features;

  }());

  common = {

    setX: function(exports, x) {

      if (exports && exports.dom) {
        exports.dom.o.style.left = (x + 'px');
      }

    },

    setY: function(exports, y) {

      if (exports && exports.dom) {
        exports.dom.o.style.top = (y + 'px');
      }

    },

    setBottomY: function(exports, bottomY) {

      if (exports && exports.dom) {
        exports.dom.o.style.bottom = ((280 * bottomY / 100) + 'px');
      }

    },

    setBottomYPixels: function(exports, bottomY) {

      if (exports && exports.dom) {
        exports.dom.o.style.bottom = (bottomY + 'px');
      }

    },

    setTransformX: function(exports, x) {

      if (exports && exports.dom) {
        if (features.transform.prop) {
          exports.dom.o.style[features.transform.prop] = 'translate3d(' + parseInt(x, 10) + 'px, ' + parseInt(exports.data.y, 10) +'px, 0px)';
        } else {
          exports.dom.o.style.left = (x + 'px');
        }
      }
    },

    setTransformY: function(exports, y) {

      if (exports && exports.dom) {
        if (features.transform.prop) {
          exports.dom.o.style[features.transform.prop] = 'translate3d(' + parseInt(exports.data.x, 10) + 'px, ' + parseInt(y, 10) +'px, 0px)';
        } else {
          exports.dom.o.style.top = (y + 'px');
        }
      }

    }

  };

  var hasSound = false;

  var sounds = {
    helicopter: {
      bomb: null,
      rotate: null
    },
    inventory: {
      begin: null,
      end: null
    },
    genericBoom: null,
    genericExplosion: null,
    genericGunFire: null,
    missileLaunch: null,
    turretGunFire: null
  }

  soundManager.setup({
    defaultOptions: {
      volume: 25
    }
  });

  soundManager.onready(function() {

    hasSound = true;

    sounds.genericBoom = soundManager.createSound({
      url: 'audio/generic-boom.wav',
      multiShot: true,
      volume: 20
    });

    sounds.genericExplosion = soundManager.createSound({
      url: 'audio/generic-explosion.wav',
      multiShot: true,
      volume: 18
    });

    sounds.genericGunFire = soundManager.createSound({
      url: 'audio/generic-gunfire.wav',
      multiShot: true
    });

    sounds.turretGunFire = soundManager.createSound({
      url: 'audio/turret-gunfire.wav',
      multiShot: true
    });

    sounds.helicopter.rotate = soundManager.createSound({
      url: 'audio/helicopter-rotate.wav',
      multiShot: true
    });

    sounds.inventory.denied = soundManager.createSound({
      url: 'audio/order-denied.wav',
      multiShot: true
    });

    sounds.inventory.begin = soundManager.createSound({
      url: 'audio/order-start.wav'
    });

    sounds.inventory.end = soundManager.createSound({
      url: 'audio/order-complete.wav'
    });

    sounds.missileLaunch = soundManager.createSound({
      url: 'audio/missile-launch.wav'
    });

  });

  game = (function() {

    var data, dom, events, objects, keyboardMonitor, exports;

    dom = {
      world: null
    }

    objects = {
      gameLoop: null,
      view: null,
      chains: [],
      balloons: [],
      bunkers: [],
      endBunkers: [],
      engineers: [],
      infantry: [],
      parachuteInfantry: [],
      missileLaunchers: [],
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
      radar: null,
      inventory: null
    }

    function createObjects() {

      objects.gameLoop = new GameLoop();

      objects.view = new View();

      objects.radar = new Radar();

      objects.inventory = new Inventory();

      objects.bases.push(new Base({
        x: 64
      }));

      objects.bases.push(new Base({
        x: 8000,
        isEnemy: true
      }));

      objects.endBunkers.push(new EndBunker());

      objects.endBunkers.push(new EndBunker({
        isEnemy: true
      }));

      objects.turrets.push(new Turret({
        x: 475,
        DOA: true
      }));

      objects.bunkers.push(new Bunker({
        x: 1024,
        isEnemy: true
      }));

      addItem('palm-tree', 1150);

      addItem('rock2', 1280);

      addItem('palm-tree', 1390);

      objects.bunkers.push(new Bunker({
        x: 1536
      }));

      addItem('palm-tree', 1575);

      addItem('palm-tree', 1565);

      addItem('flower', 1850);

      objects.bunkers.push(new Bunker({
        x: 2048
      }));

      addItem('tree', 2110);

      addItem('gravestone', 2150);

      addItem('palm-tree', 2260);

      addItem('tree', 2460);

      objects.bunkers.push(new Bunker({
        x: 2560
      }));

      addItem('tree', 2700);

      objects.bunkers.push(new Bunker({
        x: 3072
      }));

      addItem('palm-tree', 3400);

      addItem('palm-tree', 3450);

      // mid-level

      addItem('checkmark-grass', 4220);

      addItem('tree', 4300);

      addItem('palm-tree', 4400);

      addItem('palm-tree', 4500);

      objects.bunkers.push(new Bunker({
        x: 4608,
        isEnemy: true
      }));

      addItem('tree', 4608);

      addItem('tree', 4820);

      addItem('palm-tree', 4850);

      addItem('grave-cross', 4970);

      objects.bunkers.push(new Bunker({
        x: 5120,
        isEnemy: true
      }));

      addItem('tree', 5110);

      addItem('barb-wire', 5200);

      addItem('grave-cross', 5275);

      objects.bunkers.push(new Bunker({
        x: 5632,
        isEnemy: true
      }));

      // near-end / enemy territory

      addItem('palm-tree', 3932);

      addItem('tree', 3932 + 85);

      addItem('palm-tree', 3932 + 85 + 230);

      addItem('tree', 3932 + 85 + 230 + 90);

      objects.bunkers.push(new Bunker({
        x: 6656,
        isEnemy: true
      }));

      addItem('tree', 6736);

      addItem('tree', 6800);

      addItem('palm-tree', 6888);

      addItem('gravestone', 7038);

      addItem('tree', 7070);

      addItem('gravestone', 7160);

      addItem('palm-tree', 7310);

      addItem('tree', 7325);

      addItem('flower', 7500);

      // enemy base

      node = makeSprite({
        className: 'left-arrow-sign'
      });

      node.style.left = '7656px';

      game.dom.world.appendChild(node);

      // landing pads

      objects.landingPads.push(new LandingPad({
        x: 190
      }));

      objects.turrets.push(new Turret({
        x: 4096 - 256 - 81, // width of landing pad
        isEnemy: true
        // DOA: true
      }));

      // midway
      objects.landingPads.push(new LandingPad({
        x: 4096 - 40
      }));

      objects.turrets.push(new Turret({
        x: 4096 + 256 + 81, // width of landing pad
        isEnemy: true
      }));

      objects.landingPads.push(new LandingPad({
        x: 7800
      }));

      // happy little clouds!

      objects.clouds.push(new Cloud({
        x: 512
      }));

      objects.clouds.push(new Cloud({
        x: 4096 - 256
      }));

      objects.clouds.push(new Cloud({
        x: 4096 + 256
      }));


      objects.clouds.push(new Cloud({
        x: 4096 + 512
      }));


      objects.clouds.push(new Cloud({
        x: 4096 + 768
      }));

      // a few rogue balloons

      objects.balloons.push(new Balloon({
        x: 4096 - 256
      }));

      objects.balloons.push(new Balloon({
        x: 4096 + 256
      }));

      objects.balloons.push(new Balloon({
        x: 4096 + 512
      }));

      objects.balloons.push(new Balloon({
        x: 4096 + 768
      }));

      objects.tanks.push(new Tank({
        x: 96
      }));

      objects.tanks.push(new Tank({
        x: 690
      }));

      objects.tanks.push(new Tank({
        x: 760
      }));

      objects.vans.push(new Van({
        x: 435
      }));

      objects.missileLaunchers.push(new MissileLauncher({
        x: 350
      }));

      for (var i=0; i<5; i++) {

        objects.infantry.push(new Infantry({
          x: 500 + (i * 20)
        }));

        objects.infantry.push(new Infantry({
          x: 1460 + (i * -20),
          isEnemy: true
        }));

      }

      objects.engineers.push(new Engineer({
        x: -300
      }));

      objects.engineers.push(new Engineer({
        x: -320
      }));

      objects.helicopters.push(new Helicopter({
        x: 204,
        y: game.objects.view.data.world.height - 20,
        attachEvents: true
      }));

      // some enemy stuff

      var enemyCopter = new Helicopter({
        x: 8192 - 64,
        y: 72,
        isEnemy: true
      });

      enemyCopter.data.vX = -8;

      objects.helicopters.push(enemyCopter);

      // console.log(enemyCopter);

      objects.tanks.push(new Tank({
        x: 1048,
        isEnemy: true
      }));

      objects.tanks.push(new Tank({
        x: 1112,
        isEnemy: true
      }));

      objects.tanks.push(new Tank({
        x: 1176,
        isEnemy: true
      }));

      objects.vans.push(new Van({
        x: 1248,
        isEnemy: true
      }));

      objects.missileLaunchers.push(new MissileLauncher({
        x: 1302,
        isEnemy: true
      }));

      objects.tanks.push(new Tank({
        x: 1600,
        isEnemy: true
      }));

      objects.vans.push(new Van({
        x: 1680,
        isEnemy: true
      }));

      objects.missileLaunchers.push(new MissileLauncher({
        x: 1760,
        isEnemy: true
      }));

      objects.tanks.push(new Tank({
        x: 8192 - 64,
        isEnemy: true
      }));

      objects.tanks.push(new Tank({
        x: 8000,
        isEnemy: true
      }));

      for (var i=0; i<5; i++) {

        objects.infantry.push(new Infantry({
          x: 8000 + ((i+1) * -20),
          isEnemy: true
        }));

      }

    }

    function init() {

      dom.world = document.getElementById('battlefield');

      // create objects?
      createObjects();

      objects.gameLoop.init();

      (function() {

        // basic enemy ordering crap
        var enemyOrders = ['missileLauncher', 'tank', 'van', 'infantry', 'infantry', 'infantry', 'infantry', 'infantry', 'engineer', 'engineer'];
        var enemyDelays = [4, 4, 3, 1, 1, 1, 1, 1, 1, 60];
        var i=0;

        function orderNextItem() {

          var options = {
            isEnemy: true,
            x: 8192 - 64
          };

          game.objects.inventory.createObject(game.objects.inventory.data.types[enemyOrders[i]], options);

          window.setTimeout(orderNextItem, enemyDelays[i] * 1000 * 24/FPS);

          i++;
          if (i >= enemyOrders.length) {
            i = 0;
          }

        }

        // and begin
        window.setTimeout(orderNextItem, 5000);

      }());

    }

    exports = {
      data: data,
      dom: dom,
      init: init,
      objects: objects
    }

    return exports;

  }());

  function makeSprite(options) {

    var o = document.createElement('div');

    o.className = 'sprite ' + options.className;

    return o;

  }

  function makeSubSprite() {

    return makeSprite({
      className: 'sub-sprite'
    });

  }

  function inheritCSS(options) {

    var defaults;

    options = options || {};

    defaults = {
      dead: 'dead',
      enemy: 'enemy',
      exploding: 'exploding'
    }

    return mixin(defaults, options);

  }

  function inheritData(data, options) {

    // mixin defaults, and apply common options

    var defaultData;

    options = options || {};

    defaultData = {
      isEnemy: (options.isEnemy || false),
      bottomY: (options.bottomY || 0),
      dead: false,
      x: options.x || 0,
      y: options.y || 0,
      vX: options.vX || 0,
      vY: options.vY || 0
    };

    // correct y data, if the object is bottom-aligned
    if (data.bottomAligned) {
      data.y = bottomAlignedY(defaultData.bottomY);
    }

    return mixin(defaultData, data);

  }

  function View() {

    var css, data, dom, events, exports;

    css = {
      gameTips: {
        active: 'active'
      }
    }

    data = {
      ignoreMouseEvents: false,
      browser: {
        width: 0,
        fractionWidth: 0,
        halfWidth: 0,
        height: 0
      },
      mouse: {
        x: 0,
        y: 0
      },
      world: {
        width: 0,
        height: 0,
        x: 0,
        y: 0
      },
      battleField: {
        width: 0,
        height: 0,
        scrollLeft: 0,
        scrollLeftVX: 0,
        parallaxRate: 0.1
      },
      topBar: {
        height: 0
      },
      gameTips: {
        active: false
      },
      maxScroll: 6,
    }

    dom = {
      battleField: null,
      stars: null,
      topBar: null,
      gameTips: null,
      gameTipsList: null
    }

    events = {

      mousemove: function(e) {
        if (!data.ignoreMouseEvents) {
          data.mouse.x = (e||event).clientX;
          data.mouse.y = (e||event).clientY;
        }
      },

      resize: function() {
        // throttle?
        refreshCoords();
      }

    }

    function setLeftScroll(x) {

      // scroll the battlefield by relative amount.
      data.battleField.scrollLeftVX = x;
      data.battleField.scrollLeft = Math.max(-512, Math.min(data.battleField.width - (data.browser.width/2), data.battleField.scrollLeft + x));

      if (features.transform.prop) {
        // aim for GPU-based scrolling...
        dom.battleField.style[features.transform.prop] = 'translate3d(' + (parseInt(data.battleField.scrollLeft, 10) * -1) + 'px, 0px, 0px)';
        // ... and parallax.
        dom.stars.style[features.transform.prop] = 'translate3d(' + parseInt(-data.battleField.scrollLeft * data.battleField.parallaxRate, 10) + 'px, 0px, 0px)';
      } else {
        // move via margin + background position
        dom.battleField.style.marginLeft = -parseInt(data.battleField.scrollLeft, 10) + 'px';
        dom.stars.style.backgroundPosition = parseInt(-data.battleField.scrollLeft * data.battleField.parallaxRate, 10) + 'px 0px';
      }

    }

    function animate() {

      var scrollAmount, mouseDelta;

      // don't scroll if the helicopter isn't moving.
      if (game.objects.helicopters[0].data.vX === 0) {
        return false;
      }

      // is the mouse to the right, or left?
      mouseDelta = (data.mouse.x - data.browser.halfWidth);

      // how much...
      scrollAmount = mouseDelta / data.browser.halfWidth;

      // and scale
      setLeftScroll(scrollAmount * data.maxScroll);

    }

    function refreshCoords() {

      data.browser.width = window.innerWidth || document.body.clientWidth;
      data.browser.height = window.innerHeight || document.body.clientHeight;

      data.browser.fractionWidth = data.browser.width / 3;

      data.browser.halfWidth = data.browser.width / 2;

      data.world.width = dom.worldWrapper.offsetWidth;
      data.world.height = dom.worldWrapper.offsetHeight;

      data.world.x = 0;
      data.world.y = dom.worldWrapper.offsetTop;

      if (!data.battleField.width) {
        // dimensions assumed to be static, can be grabbed once
        data.battleField.width = dom.battleField.offsetWidth;
        data.battleField.height = dom.battleField.offsetHeight;
        data.topBar.height = dom.topBar.offsetHeight;
      }

      if (dom.stars && features.transform.prop) {
        // GPU case: Be wide enough to cover parallax scroll effect. browser width + (world width * 0.1)
        dom.stars.style.width = data.browser.width + (data.battleField.width * 0.1) + 'px';
      }

    }

    function setTipsActive(active) {
       if (data.gameTips.active !== active) {
         utils.css[active ? 'add' : 'remove'](dom.gameTips, css.gameTips.active);
       }
    }

    function shuffleTips() {

      var i, j, elements, fragment;

      // TODO: this doesn't work in Firefox, barfs with "TypeError: Argument 1 of Node.appendChild is not an object." - likely due to live DOM list being returned.
      try {

        elements = dom.gameTips.getElementsByTagName('span');

        fragment = document.createDocumentFragment();

        elements = utils.array.shuffle(elements);

        for (i=0, j=elements.length; i<j; i++) {
          fragment.appendChild(elements[i]);
        }

        // re-append in new order
        dom.gameTipsList.appendChild(fragment);

      } catch(e) {

        if (console && console.warn) {
          console.warn('Warning: Exception while shuffling game tips. TODO: Review/fix.', e);
        }

      }

    }


    function addEvents() {

      utils.events.add(window, 'resize', events.resize);
      utils.events.add(document, 'mousemove', events.mousemove);

      // TODO: sort out 'invalid argument' issue for IE 8 later.
      if (!navigator.userAgent.match(/msie 8/i)) {
        utils.events.add(document, 'keydown', events.keydown);
      }

    }

    function initDOM() {

      dom.worldWrapper = document.getElementById('world-wrapper');
      dom.battleField = document.getElementById('battlefield');
      dom.stars = document.getElementById('stars');
      dom.topBar = document.getElementById('top-bar');
      dom.gameTips = document.getElementById('game-tips');
      dom.gameTipsList = document.getElementById('game-tips-list');

    }

    function init() {

      initDOM();

      addEvents();

      refreshCoords();

      setLeftScroll(0);

      shuffleTips();

      setTipsActive(true);

    }

    init();

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      setLeftScroll: setLeftScroll
    }

    return exports;

  }

  function Inventory() {

    var css, data, dom, objects, exports;

    css = {
      building: 'building',
      ordering: 'ordering'
    }

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
      building: false
    }

    objects = {
      order: null
    }

    dom = {
      gameStatusBar: null
    }

    function animate() {

      if (data.building) {

        if (data.frameCount % objects.order.data.inventory.frameCount === 0) {

          if (objects.order.size) {

            // make an object.

            createObject(objects.order.typeData, objects.order.options);

            objects.order.size--;

          } else {

            // "Construction complete."

            utils.css.remove(dom.gameStatusBar, css.building);

            data.building = false;

            // play sound?
            if (sounds.inventory.end) {
              sounds.inventory.end.play();
            }

          }

        }

      }

      data.frameCount++;

    }

    function createObject(typeData, options) {

      // create and append a new (something) to its appropriate array.

      var orderObject;

      orderObject = new typeData[1](options);

      // ignore if this is the stub object case
      if (!options.noInit) {

        typeData[0].push(orderObject);

        utils.css.add(orderObject.dom.o, css.building);

        // TODO: review/reduce setTimeout() calls
        window.setTimeout(function() {
          utils.css.add(orderObject.dom.o, css.ordering);
          /*
          window.setTimeout(function() {
            // undo
            utils.css.swap(orderObject.dom.o, css.ordered);
          }, 1200);
          */
        }, 1);

      }

      return orderObject;

    }

    function order(type, options) {

      var i, typeData, orderObject, orderSize;

      options = options || {};

      orderSize = 1;

      // temporary hack
      if (options.isEnemy) {
 
        options.x = game.objects.view.data.battleField.scrollLeft + (game.objects.view.data.browser.width * 0.75);

      } else {

        options.x = -72; // default off-screen setting

      }

      if (!data.building) {

        // let's build something.
        data.building = true;

        data.frameCount = 0;

        typeData = data.types[type];

        // infantry or engineer? handle those specially.

        if (type === 'infantry') {

          orderSize = 5;

        } else if (type === 'engineer') {

          orderSize = 2;

        }

        // Hack: make a temporary object, so we can get the relevant data for the actual order.
        if (!options.isEnemy) {
          options.noInit = true;
        }

        orderObject = createObject(typeData, options);

        // and now, remove that for the real build.
        options.noInit = false;

        objects.order = {
          data: orderObject.data,
          typeData: typeData,
          options: options,
          size: orderSize
        };

        // reset the frame count, and re-enable building when it surpasses this object's "build time"
        // TODO: Don't play sounds if options.enemy set.
        // data.frameCount = orderObject.data.inventory.frameCount * -1 * (orderSize > 1 ? orderSize + 1 : orderSize);

        if (!options.isEnemy) {

          // update the UI
          utils.css.add(dom.gameStatusBar, css.building);

          if (sounds.inventory.begin) {
            sounds.inventory.begin.play();
          }

        }

      } else {

        // busy.
        if (sounds.inventory.denied) {
          sounds.inventory.denied.play();
        }

      }

      // HACK
      if (options.isEnemy) {
        data.building = false;
      }

    }

    function init() {
      dom.gameStatusBar = document.getElementById('game-status-bar');
    }

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      createObject: createObject,
      order: order
    }

    init();

    return exports;

  }

  function Radar() {

    var data, css, dom, exports, objects;

    css = {
      incomingSmartMissile: 'incoming-smart-missile'
    }

    objects = {
      items: []
    }

    data = {
      frameCount: 0,
      animateModulus: 1, // TODO: review
      // jammingModulus: 12,
      jammingTimer: null,
      lastMissileCount: 0,
      incomingMissile: false
    }

    dom = {
      radar: null,
      radarItem: null
    }

    function setIncomingMissile(incoming) {

      if (data.incomingMissile !== incoming) {

        utils.css[incoming ? 'add' : 'remove'](game.objects.view.dom.worldWrapper, css.incomingSmartMissile);

        data.incomingMissile = incoming;

      }

    }

    function animate() {

      var i, j, battleFieldWidth, battleFieldHeight, hasEnemyMissile;

      hasEnemyMissile = false;

      if (data.frameCount % data.animateModulus === 0) {

        // move all radar items

        battleFieldWidth = game.objects.view.data.battleField.width;
        battleFieldHeight = game.objects.view.data.battleField.height;

        for (i=0, j=objects.items.length; i<j; i++) {
          // TODO: optimize
          objects.items[i].dom.o.style.left = (((objects.items[i].oParent.data.x) / battleFieldWidth) * 100) + '%';
          if (objects.items[i].oParent.data.type) {
            if (objects.items[i].oParent.data.type === 'balloon') {
              // balloon
              objects.items[i].dom.o.style.bottom = objects.items[i].oParent.data.bottomY + '%';
            }
          }
          if (!objects.items[i].oParent.data.bottomAligned && objects.items[i].oParent.data.y > 0) {
            objects.items[i].dom.o.style.top = ((objects.items[i].oParent.data.y / game.objects.view.data.battleField.height) * 100) + '%';
          }
        }

        // any active smart missiles?

        if (game.objects.smartMissiles.length !== data.lastMissileCount) {

          // change state?

          for (i=0, j=game.objects.smartMissiles.length; i<j; i++) {

            // is this missile not dead, not expired/hostile, and an enemy?

            if (!game.objects.smartMissiles[i].data.dead && !game.objects.smartMissiles[i].data.hostile && game.objects.smartMissiles[i].data.isEnemy !== game.objects.helicopters[0].data.isEnemy) {

              hasEnemyMissile = true;

              break;  

            }
          
          }

          data.lastMissileCount = game.objects.smartMissiles.length;

          setIncomingMissile(hasEnemyMissile);

        }

      }

      data.frameCount++;

    }

    function RadarItem(options) {

      var css, data, dom, oParent, exports;

      css = {
        radarItem: 'radar-item',
        dying: 'dying',
        dead: 'dead'
      }

      data = {
        dead: false
      }

      dom = {
        o: options.o
      }

      oParent = options.oParent;

      function die() {
        if (!data.dead) {
          utils.css.add(dom.o, css.dying);
          data.dead = true;
          if (!options.canRespawn) {
            // permanent removal
            window.setTimeout(function() {
              removeItem(exports);
            }, 2000);
          } else {
            // balloon, etc.
            window.setTimeout(function() {
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
        }
      }

      function init() {
        utils.css.add(dom.o, css.radarItem + ' ' + options.className);
      }

      init();

      exports = {
        dom: dom,
        die: die,
        oParent: oParent,
        reset: reset
      }

      return exports;

    }

    function addItem(item, className, canRespawn) {

      var itemObject, o;

      itemObject = new RadarItem({
        o: dom.radarItem.cloneNode(true),
        className: className,
        oParent: item,
        canRespawn: (canRespawn || false)
       });

      objects.items.push(itemObject);

      dom.radar.appendChild(itemObject.dom.o);

      return itemObject;

    }

    function maybeJam() {

      var jam = (Math.random() > 0.25);

      // TODO: prevent excessive DOM I/O
      if (!noJamming) {
        dom.radar.style.visibility = (jam ? 'hidden' : 'visible');
      }

      data.jammingTimer = null;

      // and do this again.
      startJamming(jam);

    }

    function startJamming(isJamming) {

      // [ obligatory Bob Marley reference goes here ]

      if (!data.jammingTimer) {
        data.jammingTimer = window.setTimeout(maybeJam, 250 + parseInt(Math.random() * (isJamming ? 1000 : 500), 10));
      }

    }

    function stopJamming() {

      if (data.jammingTimer) {
        window.clearTimeout(data.jammingTimer);
        data.jammingTimer = null;
        dom.radar.style.visibility = 'visible';
      }

    }

    function removeItem(item) {

      // console.log('radar.removeItem()', item);

      // look up item
      var i, j, foundItem;

      // find and remove from DOM + array
      for (i=objects.items.length-1, j=0; i>=j; i--) {
        if (objects.items[i] === item) {
          // console.log('radar.removeItem(): found match', item);
          removeNodes(objects.items[i].dom);
          // objects.items[i].dom.o.parentNode.removeChild(objects.items[i].dom);
          objects.items.splice(i, 1);
          foundItem = true;
          break;
        }
      }

      if (!foundItem) {
        console.log('radar.removeItem(): Warn: No match found for item', item);
      }

    }

    function init() {

      dom.radar = document.getElementById('radar');

      dom.radarItem = document.createElement('div');

    }

    init();

    exports = {
      addItem: addItem,
      animate: animate,
      data: data,
      dom: dom,
      startJamming: startJamming,
      stopJamming: stopJamming
    };

    return exports;

  }

  function GameLoop() {

    var data, timer, exports;

    data = {
      frameCount: 0
    }

    function animate() {

      // loop through all objects, animate.
      var item, i, j, k;
      var gameObjects = game.objects;

      data.frameCount++;

      for (item in gameObjects) {
        if (gameObjects.hasOwnProperty(item) && gameObjects[item]) {
          // single object case
          if (gameObjects[item].animate && gameObjects[item].animate()) {
            // object is dead - take it out.
            gameObjects[item] = null;
          } else {
            // array case
            for (i = gameObjects[item].length-1; i >= 0; i--) {
              if (gameObjects[item][i].animate && gameObjects[item][i].animate()) {
                // object is dead - take it out.
                gameObjects[item].splice(i, 1);
              }
            }
          }
        }
      }

      // view is separate
      // gameObjects.view.animate();

    }

    function start() {

      if (!timer) {

        // TODO: use rAF
        timer = window.setInterval(animate, FRAMERATE);

      }

    }

    function init() {

      start();

    }

    exports = {
      data: data,
      init: init
    }

    return exports;

  }

  function gameOver(youWon) {

    // somebody's base is about to get blown up.

    var yourBase, enemyBase;

    if (!battleOver) {

      yourBase = game.objects.bases[0];
      enemyBase = game.objects.bases[1];

      if (!youWon) {

        // sorry, better luck next time.
        yourBase.die();

      } else {

        enemyBase.die();

      }

      battleOver = true;

    }

  }

  function Balloon(options) {

    var css, data, dom, objects, radarItem, exports;

    options = options || {};

    css = inheritCSS({
      className: 'balloon',
      friendly: 'facing-right',
      enemy: 'facing-left',
      facingLeft: 'facing-left',
      facingRight: 'facing-right'
    });

    data = inheritData({
      type: 'balloon',
      bottomAligned: true, // TODO: review/remove
      canRespawn: false,
      frameCount: 0,
      windModulus: 16,
      windOffsetX: 0,
      windOffsetY: 0,
      energy: 3,
      defaultEnergy: 3,
      direction: 0,
      detached: false,
      hostile: false, // dangerous when detached
      verticalDirection: 0.33,
      verticalDirectionDefault: 0.33,
      leftMargin: options.leftMargin || 0,
      width: 38,
      height: 16,
      halfWidth: 19,
      halfHeight: 8,
      deadTimer: null,
      // relative % to pull down when rising from the ground...
      bottomYOffset: 6
    }, options);

    dom = {
      o: null
    }

    objects = {
      bunker: options.bunker || null
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

            data.windOffsetX += Math.random() > 0.5 ? -0.5 : 0.5;

            data.windOffsetX = Math.max(-3, Math.min(3, data.windOffsetX));

            if (data.windOffsetX > 0 && data.direction !== 1) {

              // heading right
              utils.css.remove(dom.o, css.facingLeft);
              utils.css.add(dom.o, css.facingRight);

              data.direction = 1;

            } else if (data.windOffsetX < 0 && data.direction !== -1) {

              // heading left

              utils.css.remove(dom.o, css.facingRight);
              utils.css.add(dom.o, css.facingLeft);

              data.direction = -1;

            }

            data.windOffsetY += Math.random() > 0.5 ? -0.1 : 0.1;

            data.windOffsetY = Math.max(-0.5, Math.min(0.5, data.windOffsetY));

            // and randomize
            data.windModulus = 16 + parseInt(Math.random() * 16, 10);

          }

          moveTo(data.x + data.windOffsetX, data.bottomY + data.windOffsetY);

        }

      } else {

        if (data.bottomY > 0) {

          // dead, but chain has not retracted yet. Make sure it's moving down.
          if (data.verticalDirection > 0) {
            data.verticalDirection *= -1;
          }

          moveTo(data.x, data.bottomY + data.verticalDirection);

        }

        checkRespawn();

      }

    }

    function moveTo(x, bottomY) {

      if (x !== undefined && data.x !== x) {
        common.setX(exports, x);
        data.x = x;
      }

      if (bottomY !== undefined) {

        // if detached, don't go all the way to the bottom.
        bottomY = Math.min(100, Math.max(data.detached ? 10 : -data.bottomYOffset, bottomY));

        if (data.bottomY !== bottomY) {

          common.setBottomY(exports, bottomY);

          data.bottomY = bottomY;

          // special handling for balloon case
          // TODO: fix this
          data.y = game.objects.view.data.battleField.height - data.height - (280 * (bottomY / 100));

        }

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

    function hit(hitPoints) {
      if (!data.dead) {
        hitPoints = hitPoints || 1;
        data.energy -= hitPoints;
        if (data.energy <= 0) {
          data.energy = 0;
          die();
        }
      }
    }

    function dead() {
      if (data.dead && dom.o) {
        // hide the balloon
        utils.css.swap(dom.o, css.exploding, css.dead);
        radarItem.die();
      }
      if (data.deadTimer) {
        data.deadTimer = null;
      }
    }

    function die() {
      // pop!
      if (!data.dead) {
        utils.css.add(dom.o, css.exploding);
        if (sounds.genericBoom) {
          sounds.genericBoom.play();
        }
        data.deadTimer = window.setTimeout(dead, 550);
        data.dead = true;
      }
    }

    function checkRespawn() {

      // odd edge case - data not always defined if destroyed at the right time?
      if (data && data.canRespawn && data.dead && !objects.bunker.data.dead) {
        reset();
      }

    }

    function reset() {

      // respawn can actually happen now

      data.energy = data.defaultEnergy;

      // restore default vertical
      data.verticalDirection = data.verticalDirectionDefault;

      // look ma, no longer dead!
      data.dead = false;

      // reset position, too
      data.bottomY = -data.bottomYOffset;
      data.y = bottomAlignedY(data.bottomY);

      radarItem.reset();

      data.canRespawn = false;

      if (data.deadTimer) {
        window.clearTimeout(data.deadTimer);
        data.deadTimer = null;
      }

      // update UI, right away?
      animate();

      utils.css.remove(dom.o, css.exploding);
      utils.css.remove(dom.o, css.dead);

    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      dom.o.style.marginLeft = (data.leftMargin + 'px');

      // TODO: review when balloon gets separated from bunker
      // data.x = options.x; // (objects.bunker ? objects.bunker.data.x : 0);

      // if bottomY is 0, subtract a few percent so the balloon rises from the depths.
      if (data.bottomY === 0) {
        data.bottomY = -data.bottomYOffset;
      }

      moveTo(data.x, data.bottomY);

      common.setX(exports, data.x);

      common.setBottomY(exports, data.bottomY);

      if (!objects.bunker) {
        detach();
      }

      game.dom.world.appendChild(dom.o);

      // TODO: review hacky "can respawn" parameter
      radarItem = game.objects.radar.addItem(exports, dom.o.className, true);

    }

    exports = {
      animate: animate,
      data: data,
      detach: detach,
      die: die,
      dom: dom,
      hit: hit,
      reset: reset,
      setEnemy: setEnemy
    }

    init();

    return exports;

  }

  function Bunker(options) {

    var css, data, dom, objects, radarItem, exports;

    options = options || {};

    css = inheritCSS({
      className: 'bunker',
      burning: 'burning'
    });

    data = inheritData({
      type: 'bunker',
      bottomAligned: true,
      energy: 30,
      width: 51,
      halfWidth: 25,
      height: 25,
      infantryTimer: null,
      midPoint: null
    }, options);

    dom = {
      o: null,
      oSubSprite: null
    }

    objects = {
      balloon: null,
      chain: null
    }

    function moveTo(x, bottomY) {

      if (x !== undefined && data.x !== x) {
        common.setX(exports, x);
        data.x = x;
      }

      if (bottomY !== undefined && data.bottomY !== bottomY) {
        common.setBottomY(exports, bottomY);
        data.bottomY = bottomY;
        data.y = bottomAlignedY(data.bottomY);
      }

    }

    function hit(hitPoints) {
      if (!data.dead) {
        hitPoints = hitPoints || 1;
        data.energy -= hitPoints;
        if (data.energy <= 0) {
          data.energy = 0;
          die();
        }
      }
    }

    function infantryHit(target) {

      // an infantry unit has made contact with a bunker.

      if (target.data.isEnemy === data.isEnemy) {

        // a friendly passer-by.

        repair();

      } else {

        // non-friendly, kill the infantry - but let them capture the bunker first.

        if (collisionCheckMidPoint(exports, target)) {

          capture(target.data.isEnemy);
          target.die();

        }

      }

    }

    function capture(isEnemy) {

      if (isEnemy) {
        utils.css.add(dom.o, css.enemy);
      } else {
        utils.css.remove(dom.o, css.enemy);
      }

      data.isEnemy = isEnemy;

      // and the balloon, too.
      if (objects.balloon) {
        objects.balloon.setEnemy(isEnemy);
      }

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

      if (objects.balloon) {
        objects.balloon.detach();
        nullifyBalloon();
      }

    }

    function die() {

      if (data.dead) {
        return false;
      }

      utils.css.add(dom.o, css.exploding);

      // detach balloon?
      detachBalloon();

      // timeout?
      window.setTimeout(function() {

        utils.css.swap(dom.o, css.exploding, css.burning);

        window.setTimeout(function() {
          utils.css.swap(dom.o, css.burning, css.dead);
        }, 10000);

      }, 1100);

      data.energy = 0;

      data.dead = true;

      if (sounds.genericExplosion) {
        sounds.genericExplosion.play();
      }

      radarItem.die();

    }

    function createBalloon(useRandomY) {

      if (!objects.balloon) {

        objects.balloon = new Balloon({
          bunker: exports,
          leftMargin: 7,
          isEnemy: data.isEnemy,
          x: data.x,
          // if 0, balloon will "rise from the depths".
          bottomY: (useRandomY ? parseInt(Math.random() * 100, 10) : 0)
        });

        // push onto the larger array
        game.objects.balloons.push(objects.balloon);

      }

      if (!objects.chain) {

        // create a chain, linking the base and the balloon
        objects.chain = new Chain({
          x: data.x + data.halfWidth - 1,
          y: data.y,
          height: data.y - objects.balloon.data.y,
          balloon: objects.balloon,
          bunker: exports
        });

        game.objects.chains.push(objects.chain);

      }

    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      dom.oSubSprite = makeSubSprite();

      dom.o.appendChild(dom.oSubSprite);

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      // first time, create at random Y location.
      createBalloon(true);

      common.setX(exports, data.x);

      data.midPoint = getDoorCoords(exports);

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    exports = {
      objects: objects,
      data: data,
      dom: dom,
      hit: hit,
      infantryHit: infantryHit,
      nullifyChain: nullifyChain,
      nullifyBalloon: nullifyBalloon,
      init: init
    }

    init();

    return exports;

  }

  function EndBunker(options) {

    var css, dom, data, objects, nearby, radarItem, exports;

    options = options || {};

    css = inheritCSS({
      className: 'end-bunker'
    });

    data = inheritData({
      type: 'end-bunker',
      bottomAligned: true,
      frameCount: 0,
      energy: 0,
      x: (options.x ? options.x : (options.isEnemy ? 8192 - 48 : 8)),
      width: 39,
      halfWidth: 19,
      height: 17,
      funds: 0,
      firing: false,
      gunYOffset: 10,
      fireModulus: 6,
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
    }

    objects = {
      gunfire: []
    }

    function setFiring(state) {

      if (state && data.energy) {
        data.firing = state;
      } else {
        data.firing = false;
      }

    }

    function hit(points, target) {

      // only tank gunfire counts against end bunkers.
      if (target && target.data.type === 'gunfire' && target.data.parentType && target.data.parentType === 'tank') {
        data.energy = Math.max(0, data.energy-1);
      }

    }

    function animate() {

      var i;

      data.frameCount++;

      for (i = objects.gunfire.length-1; i >= 0; i--) {
        if (objects.gunfire[i].animate()) {
          // object is dead - take it out.
          objects.gunfire.splice(i, 1);
        }
      }

      nearbyTest(nearby);

      fire();

      return (data.dead && !dom.o && !objects.gunfire.length);

    }

    function fire() {

      if (data.firing && data.energy && data.frameCount % data.fireModulus === 0) {

        objects.gunfire.push(new GunFire({
          parentType: data.type,
          isEnemy: data.isEnemy,
          collisionItems: nearby.items,
          x: data.x + (data.width + 1),
          y: game.objects.view.data.world.height - data.gunYOffset, // half of height
          vX: 1,
          vY: 0
        }));

        objects.gunfire.push(new GunFire({
          parentType: data.type,
          isEnemy: data.isEnemy,
          collisionItems: nearby.items,
          x: (data.x - 1),
          y: game.objects.view.data.world.height - data.gunYOffset, // half of height
          vX: -1,
          vY: 0
        }));

        if (sounds.genericGunFire) {
          sounds.genericGunFire.play();
        }

      }

    }

    function captureFunds(target) {

      if (data.funds) {

        console.log('funds captured!');

        data.funds--;

        if (target) {
          target.die(true);
        }

        // updateStatusUI()

      }

    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      common.setX(exports, data.x);
      common.setBottomY(exports, data.bottomY);

      // testing
      data.funds = 5;

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      hit: hit
    }

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
          // nearby infantry?
          if (target.data.type === 'infantry') {
            // enemy at door, and funds to steal?
            if (!isFriendly) {
              if (data.funds && collisionCheckMidPoint(exports, target)) {
                captureFunds(target);
              }
            } else if (!data.energy && isFriendly && collisionCheckMidPoint(exports, target)) {
              // end bunker isn't "staffed" / manned by infantry, guns are inoperable.
              // claim infantry, enable guns.
              data.energy = 10;
              target.die(true);
            }
          }
        },
        miss: function() {
          setFiring(false);
        }
      },
      // who gets fired at?
      items: ['infantry', 'engineers', 'helicopters'],
      targets: []
    }

    init();

    return exports;

  }

  function Turret(options) {

    var css, data, dom, objects, radarItem, exports;

    options = options || {};

    css = inheritCSS({
      className: 'turret',
      destroyed: 'destroyed'
    });

    data = inheritData({
      type: 'turret',
      bottomAligned: true,
      dead: false,
      // isNeutral: false,
      energy: 50,
      energyMax: 50,
      firing: false,
      frameCount: 2 * game.objects.turrets.length, // stagger so sound effects interleave nicely
      fireModulus: 8,
      scanModulus: 1,
      claimModulus: 8,
      repairModulus: 24,
      smokeModulus: 2,
      claimPoints: 0,
      claimPointsMax: 50,
      y: 0,
      width: 6,
      height: 15,
      // hacks
      halfWidth: 7,
      halfHeight: 7,
      angle: 0,
      maxAngle: 90,
      scanIncrement: 0
    }, options);

    // how fast to "scan" (left -> right, and back)
    data.scanIncrement = (90 * data.scanModulus/FPS);

    dom = {
      o: null,
      oSubSprite: null
    };

    objects = {
      gunfire: []
    };

    function animate() {

      var didFire;

      data.frameCount++;

      if (data.frameCount % data.scanModulus === 0) {
        if (!data.dead) {
          fire();
        }
        // workaround: allow scanning while being repaired
        if (!data.firing || data.energy > 0) {
          scan();
        }
      }

      if (data.energy > 0 && data.energy < data.energyMax && data.frameCount % data.smokeModulus === 0) {

        // smoke relative to damage

        if (Math.random() > 1 - ((data.energyMax-data.energy)/data.energyMax)) {

          game.objects.smoke.push(new Smoke({
            x: data.x + data.halfWidth + (parseInt(Math.random() * data.halfWidth * 0.5 * (Math.random() > 0.5 ? -1 : 1), 10)),
            y: data.y + data.halfHeight + (parseInt(Math.random() * data.halfHeight * 0.5 * (Math.random() > 0.5 ? -1 : 1), 10))
          }));

        }

        // randomize next one a bit
        data.smokeModulus = 2 + parseInt(Math.random() * 24, 10);

      }

      if (!data.dead && data.energy > 0 && data.frameCount % data.repairModulus === 0) {
        // self-repair
        repair();
      }

      for (i = objects.gunfire.length-1; i >= 0; i--) {
        if (objects.gunfire[i].animate()) {
          // object is dead - take it out.
          objects.gunfire.splice(i, 1);
        }
      }

    }

    function okToMove() {
      // guns scan and fire 100% of the time, OR a random percent bias based on the amount of damage they've sustained. No less than 25% of the time.
      if (data.energy === 0) {
        return false;
      }
      return (data.energy === data.energyMax || (1 - Math.random() < (Math.max(0.25, data.energy / data.energyMax))));
    }

    function scan() {

      if (features.transform.prop && okToMove()) {
        data.angle += data.scanIncrement;
        if (data.angle > data.maxAngle || data.angle < -data.maxAngle) {
          data.scanIncrement *= -1;
        }
        setAngle(data.angle);
      }

    }

    function setAngle(angle) {

      if (features.transform.prop) {
        dom.oSubSprite.style[features.transform.prop] = 'rotate(' + angle + 'deg)';
      }

    }

    function fire() {

      var deltaX, deltaY, deltaXGretzky, deltaYGretzky, vectorX, vectorY, angle, targetHelicopter, moveOK;

      targetHelicopter = enemyHelicopterNearby(data, game.objects.view.data.browser.fractionWidth);

      if (targetHelicopter) {

        data.firing = true;

        deltaX = targetHelicopter.data.x - data.x - targetHelicopter.data.halfWidth;
        deltaY = targetHelicopter.data.y - data.y;

        // Gretzky: "Skate where the puck is going to be".
        deltaXGretzky = targetHelicopter.data.vX;
        deltaYGretzky = targetHelicopter.data.vY;

        // turret angle
        angle = (Math.atan2(deltaY, deltaX) * deg2Rad) + 90;
        angle = Math.max(-data.maxAngle, Math.min(data.maxAngle, angle));

        // hack - helicopter directly to left, on ground of turret: correct 90 to -90 degrees.
        if (deltaX < 0 && angle === 90) {
          angle = -90;
        }

        // bullet origin x/y
        vectorX = 8 * Math.cos(angle * deg2Rad);
        vectorY = 8 * Math.sin(angle * deg2Rad);

        moveOK = okToMove();

        if (data.frameCount % data.fireModulus === 0 && moveOK) {

          objects.gunfire.push(new GunFire({
            parentType: data.type,
            isEnemy: data.isEnemy,
            // turret gunfire should probably only hit airborne things.
            collisionItems: ['helicopters', 'balloons', 'parachuteInfantry'],
            x: data.x + data.width + 2 + (deltaX * 0.05),
            y: bottomAlignedY() + 8 + (deltaY * 0.05),
            vX: deltaX * 0.05 + deltaXGretzky,
            vY: deltaY * 0.05 + deltaYGretzky
          }));

          if (sounds.turretGunFire) {
            sounds.turretGunFire.play();
          }

        }

        // target the enemy
        data.angle = angle;
        if (moveOK) {
          setAngle(angle);
        }

        didFire = true;

      } else {

        data.firing = false;

      }

    }

    function hit(hitPoints) {
      if (!data.dead) {
        hitPoints = hitPoints || 1;
        data.energy -= hitPoints;
        if (data.energy <= 0) {
          data.energy = 0;
          die();
        }
      }
    }

    function setEnemy(isEnemy) {

      if (data.isEnemy !== isEnemy) {

        data.isEnemy = isEnemy;
        utils.css[isEnemy ? 'add' : 'remove'](dom.o, css.enemy);

      }

    }

    function claim(isEnemy) {

      if (data.frameCount % data.claimModulus === 0) {

        data.claimPoints++;

        if (data.claimPoints >= data.claimPointsMax) {
          // change sides.
          setEnemy(isEnemy);
          data.claimPoints = 0;
        }

      }

    }

    function engineerHit(target) {

      // target is an engineer.

      if (data.isEnemy !== target.data.isEnemy) {
        // gradual take-over.
        claim(target.data.isEnemy);
      } else {
        repair();
      }

    }

    function engineerCanInteract(isEnemy) {

      // passing engineers should only stop if they have work to do.
      return (data.isEnemy !== isEnemy || data.energy < data.energyMax);

    }

    function repair() {

      if (data.energy < data.energyMax && data.frameCount % data.repairModulus === 0) {
        restore();
        data.energy = Math.min(data.energyMax, data.energy + 1);
        if (data.dead && data.energy > data.energyMax * 0.25) {
          // restore to life at 25%
          data.dead = false;
        }
      }

    }

    function restore() {

      // restore visual, but don't re-activate gun yet
      if (data.dead) {
        utils.css.remove(dom.o, css.destroyed);
        utils.css.remove(radarItem.dom.o, css.destroyed);
      }

    }

    function die() {

      if (data.dead) {
        return false;
      }

      // reset rotation
      data.angle = 0;
      setAngle(0);

      utils.css.add(dom.o, css.destroyed);
      utils.css.add(radarItem.dom.o, css.destroyed);

      data.energy = 0;

      data.dead = true;

    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      dom.oSubSprite = makeSubSprite();
      dom.o.appendChild(dom.oSubSprite);

      common.setX(exports, data.x);
      common.setY(exports, data.y);

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      engineerCanInteract: engineerCanInteract,
      engineerHit: engineerHit,
      hit: hit
    }

    init();

    // "dead on arrival"
    if (options.DOA) {
      die();
    }

    return exports;

  }

  function Base(options) {

    var css, data, exports, radarItem;

    options = options || {};

    css = inheritCSS({
      className: 'base'
    });

    data = inheritData({
      type: 'base',
      bottomAligned: true,
      dead: false,
      frameCount: 0,
      fireModulus: 100,
      // left side, or right side (roughly)
      x: (options.x ? options.x : (options.isEnemy ? 8192 - 192: 64)),
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
      o: null
    };

    function animate() {

      if (!data.dead) {

        if (data.frameCount % data.fireModulus === 0) {
          fire();
        }

        data.frameCount++;

      }

    }

    function fire() {

      var targetHelicopter = enemyHelicopterNearby(data);

      if (targetHelicopter) {

        game.objects.smartMissiles.push(new SmartMissile({
          parentType: data.type,
          isEnemy: data.isEnemy,
          x: data.x + data.width/2,
          y: bottomAlignedY() - data.height/2,
          target: targetHelicopter
        }));

      }

    }

    function die() {

      var counter = 0, counterMax = 30;

      data.dead = true;

      // move to the target
      // TODO: transition
      game.objects.view.setLeftScroll(game.objects.view.data.battleField.width * (data.isEnemy ? 1 : -1));

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
          sounds.genericExplosion.play();
        }

        counter++;

        if (counter >= counterMax) {

          // HUGE boom, why not.
          window.setTimeout(function() {

            if (sounds.genericExplosion) {
              sounds.genericExplosion.play();
              sounds.genericExplosion.play();
              sounds.genericExplosion.play();
            }

            window.setTimeout(function() {

              var i;

              for (i=0; i<7; i++) {

                shrapnelExplosion(data, {
                  count: 60,
                  velocity: 20,
                  randomX: true
                });

              }

            }, 25);

            if (data.isEnemy) {
              console.log('Congratulations, you won.');
              document.getElementById('game-tips-list').innerHTML = '<span>Congratulations, you won.</span>';
            } else {
              console.log('Sorry! Better luck next time.');
              document.getElementById('game-tips-list').innerHTML = '<span>Sorry! Better luck next time.</span>';
            }

          }, 3500);

        } else {

          // big boom
          window.setTimeout(boom, 20 + parseInt(Math.random() * 350, 10));

        }

      }

      document.getElementById('game-tips-list').innerHTML = '';

      boom();

    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      common.setX(exports, data.x);
      common.setBottomY(exports, data.bottomY);

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die
    }

    init();

    return exports;

  }

  function Chain(options) {

    var css, data, dom, objects, exports;

    options = options || {};

    css = inheritCSS({
      className: 'chain'
    });

    data = inheritData({
      type: 'chain',
      energy: 1,
      hostile: false, // applies when detached from base or balloon
      width: 1,
      height: 0,
      frameCount: 0,
      animateModulus: 2,
      damagePoints: 6
    }, options);

    dom = {
      o: null
    }

    objects = {
      bunker: options.bunker || null,
      balloon: options.balloon || null
    }

    function animate() {

      var x, y, height;

      x = data.x;
      y = data.y;
      height = data.height;

      if (data.frameCount % data.animateModulus === 0) {

        // move if attached, fall if not

        if (objects.bunker && !objects.bunker.data.dead) {

          // bunker

          data.isEnemy = objects.bunker.data.isEnemy;

          if (objects.balloon) {

            // + balloon

            y = objects.balloon.data.y + objects.balloon.data.height;

            height = 380 - y - objects.bunker.data.height + 4;

          } else {

            // - balloon

            y = 380 - data.height;

          }

        } else {

          // no bunker

          data.hostile = true;

          if (objects.balloon && !objects.balloon.data.dead) {

            x = objects.balloon.data.x + objects.balloon.data.halfWidth + 5;

            y = objects.balloon.data.y + objects.balloon.data.height;

          } else {

            // free-falling chain
            y = data.y;

            y += 3;

            if (y >= 380 + 3) {
              die();
            }

          }

        }

        if (dom.o) {

          moveTo(x, y, height);

        }

      }

      data.frameCount++;

      return (data.dead && !data.o);

    }

    function moveTo(x, y, height) {

      if (x !== undefined && data.x !== x) {
        common.setX(exports, x);
        data.x = x;
      }

      if (y !== undefined && data.y !== y) {
        common.setY(exports, y);
        data.y = y;
      }

      if (height !== undefined && data.height !== height) {
        setHeight(height);
        data.height = height;
      }

    }

    function setHeight(height) {
      dom.o.style.height = (height + 'px');
    }

    function hit(hitPoints) {
      if (!data.dead) {
        hitPoints = hitPoints || 1;
        data.energy -= hitPoints;
        if (data.energy <= 0) {
          data.energy = 0;
          die();
        }
      }
    }

    function sparkAndDie(target) {

      if (target) {
        target.hit(data.damagePoints, exports);
      }

      die();

    }

    function die() {

      if (data.dead) {
        return false;
      }

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

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      common.setX(exports, data.x);
      common.setY(exports, data.y);
      setHeight(data.height);

      game.dom.world.appendChild(dom.o);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      hit: hit,
      die: die,
      sparkAndDie: sparkAndDie
    }

    init();

    return exports;

  }

  function MissileLauncher(options) {

    var css, data, dom, radarItem, exports;

    options = options || {};

    css = inheritCSS({
      className: 'missile-launcher'
    });

    data = inheritData({
      type: 'missile-launcher',
      bottomAligned: true,
      energy: 3,
      direction: 0,
      vX: (options.isEnemy ? -1 : 1),
      frameCount: 0,
      fireModulus: FPS, // check every second or so
      width: 54,
      height: 18,
      inventory: {
        frameCount: 60,
        cost: 5
      }
    }, options);

    dom = {
      o: null
    }

    function animate() {

      data.frameCount++;

      if (!data.dead) {

        moveTo(data.x + data.vX, data.bottomY);

        // fire?
        fire();

      }

      return (data.dead && !dom.o);

    }

    function moveTo(x, bottomY) {

      if (x !== undefined && data.x !== x) {
        common.setX(exports, x);
        data.x = x;
      }

      if (bottomY !== undefined && data.bottomY !== bottomY) {
        common.setBottomY(bottomY);
        data.bottomY = bottomY;
        data.y = bottomAlignedY(bottomY);
      }

    }

    function hit(hitPoints) {
      if (!data.dead) {
        hitPoints = hitPoints || 1;
        data.energy -= hitPoints;
        if (data.energy <= 0) {
          data.energy = 0;
          die();
        }
      }
    }

    function fire() {

      var i, j, k, l, deltaX, similarMissileCount, triggerDistance, targetHelicopter;

      triggerDistance = game.objects.view.data.browser.width * 2/3;

      if (data.frameCount % data.fireModulus === 0) {

        // is an enemy helicopter nearby?

        targetHelicopter = enemyHelicopterNearby(data);

        if (targetHelicopter) {

          // we have a possible target.

          // any missiles already chasing the target?
          similarMissileCount = 0;

          for (k=0, l=game.objects.smartMissiles.length; k<l; k++) {

            if (game.objects.smartMissiles[k].objects.target === targetHelicopter) {
              similarMissileCount++;
            }

          }

          if (!similarMissileCount) {

            // self-destruct, FIRE ZE MISSILE
            die();

            game.objects.smartMissiles.push(new SmartMissile({
              parentType: data.type,
              isEnemy: data.isEnemy,
              x: data.x + data.width/2,
              y: bottomAlignedY(),
              target: targetHelicopter
            }));

          }

        }

      }

    }

    function dead() {
      if (data.dead && dom.o) {
        utils.css.swap(dom.o, css.exploding, css.dead);
      }
    }

    function die() {

      if (data.dead) {
        return false;
      }

      utils.css.add(dom.o, css.exploding);

      // timeout?
      window.setTimeout(function() {
        removeNodes(dom);
        radarItem.die();
      }, 1000);

      data.energy = 0;

      data.dead = true;

      if (sounds.genericExplosion) {
        sounds.genericExplosion.play();
      }

    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      common.setX(exports, data.x);
      common.setBottomY(exports, data.bottomY);

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      hit: hit,
      die: die
    }

    if (!options.noInit) {
      init();
    }

    return exports;

  }

  function GunFire(options) {

    var css, data, dom, collision, exports;

    options = options || {};

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
      damagePoints: 1
    }, options);

    dom = {
      o: null
    }

    collision = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        hit: function(target) {
          // special case: let tank gunfire pass thru if 0 energy, or friendly.
          if (data.parentType === 'tank' && target.data.type === 'end-bunker' && (target.data.energy === 0 || target.data.isEnemy === data.isEnemy)) {
            return false;
          } else {
            sparkAndDie(target);
          }
        }
      },
      // if unspecified, use default list of items which bullets can hit.
      items: options.collisionItems || ['tanks', 'vans', 'bunkers', 'missileLaunchers', 'infantry', 'parachuteInfantry', 'engineers', 'helicopters', 'balloons', 'smartMissiles', 'endBunkers', 'turrets']
    }

    function animate() {

      var items, item, hit, tmpData, tmpObject;

      if (data.dead) {
        return false;
      }

      if (!data.expired && data.frameCount > data.expireFrameCount) {
        utils.css.add(dom.o, css.expired);
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

      // hit top? (TODO: get real # from DOM)
      if (data.y < 32) { // game.objects.view.data.topBar.height) {
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

    function spark() {
      utils.css.add(dom.o, css.spark);
    }

    function sparkAndDie(target) {

      // TODO: reduce timers
      spark();

      // hack: no more animation.
      data.dead = true;

      if (target) {
        // special case: tanks are impervious to infantry gunfire.
        if (data.parentType === 'infantry' && target.data.type === 'tank') {
          // do nothing
        } else {
          target.hit(data.damagePoints, exports);
        }
      }

      // and cleanup shortly.
      window.setTimeout(die, 250);

    }

    function die() {

      // aieee!

      if (!dom.o) {
        return false;
      }

      removeNodes(dom);

      data.dead = true;

    }

    function moveTo(x, y) {

      if (x !== undefined && data.x !== x) {
        common.setTransformX(exports, x);
        data.x = x;
      }

      if (y !== undefined && data.y !== y) {
        common.setTransformY(exports, y);
        data.y = y;
      }

    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      common.setTransformX(exports, data.x);
      common.setTransformY(exports, data.y);

      // hack?
      if (features.transform.prop) {
        dom.o.style.left = dom.o.style.top = '0px';
      }

      game.dom.world.appendChild(dom.o);

    }

    init();

    exports = {
      animate: animate,
      data: data,
      dom: dom
    }

    return exports;

  }

  function Bomb(options) {

    var css, data, dom, collision, exports;

    options = options || {};

    css = inheritCSS({
      className: 'bomb',
      dropping: 'dropping',
      explosionLarge: 'explosion-large',
      spark: 'spark'
    });

    data = inheritData({
      firstFrame: true,
      width: 13,
      height: 12,
      gravity: 1,
      damagePoints: 3
    }, options);

    dom = {
      o: null
    }

    function bombHitTarget(target) {

      if (target.data.type && target.data.type === 'balloon') {
        die({
          omitSound: true,
          retainPosition: true
        });
      }

      // special case: one bomb kills a helicopter.
      target.hit(target.data.type === 'helicopter' ? 999 : data.damagePoints);

      die();

    }

    collision = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        hit: function(target) {
          bombHitTarget(target);
        }
      },
      items: ['balloons', 'tanks', 'vans', 'missileLaunchers', 'infantry', 'parachuteInfantry', 'engineers', 'bunkers', 'helicopters', 'turrets']
    }

    function animate() {

      if (data.dead) {
        return false;
      }

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
        die();
      }

      collisionTest(collision, exports);

      // notify caller if dead, and node has been removed.
      return (data.dead && !dom.o);

    }

    function die(options) {

      // aieee!

      var className;

      if (data.dead) {
        return false;
      }

      options = options || {};

      // possible hit, blowing something up.

      if (!options.omitSonud && sounds.genericBoom) {
        sounds.genericBoom.play();
      }

      className = (Math.random () > 0.5 ? css.explosionLarge : css.spark);

      if (!options.retainPosition) {
        // stick this explosion to the bottom.
        className += ' bottom-align';
      }

      if (dom.o) {
        utils.css.add(dom.o, className);
        // TODO: use single timer for all bombs
        window.setTimeout(function() {
          removeNodes(dom);
        }, 750);
      }

      data.dead = true;

    }

    function moveTo(x, y) {

      if (x !== undefined && data.x !== x) {
        common.setX(exports, x);
        data.x = x;
      }

      if (y !== undefined && data.y !== y) {
        common.setY(exports, y);
        data.y = y;
      }

    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      common.setX(exports, data.x);
      common.setY(exports, data.y);

      // hack?
      if (features.transform.prop) {
        dom.o.style.left = dom.o.style.top = '0px';
      }

      game.dom.world.appendChild(dom.o);

    }

    init();

    exports = {
      animate: animate,
      data: data,
      dom: dom
    }

    return exports;

  }

  function Cloud(options) {

    var css, dom, data, exports;

    options = options || {};

    css = inheritCSS({
      className: 'cloud' + (Math.random() > 0.5 ? 2 : 1)
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
      y: options.y || (96 + parseInt((380 - 96 - 128) * Math.random(), 10)),
      width: 102,
      halfWidth: 51,
      height: 29,
      halfHeight: 14
    }, options);

    dom = {
      o: null
    }

    function animate() {

      data.frameCount++;

      if (data.frameCount % data.windModulus === 0) {

        // TODO: improve, limit on axes

        data.windOffsetX += (data.x < 0 || Math.random() > 0.5 ? 0.5 : -0.5);

        data.windOffsetX = Math.max(-3, Math.min(3, data.windOffsetX));

        data.windOffsetY += (data.y < 72 || Math.random() > 0.5 ? 0.1 : -0.1);

        data.windOffsetY = Math.max(-0.5, Math.min(0.5, data.windOffsetY));

        // and randomize
        data.windModulus = 16 + parseInt(Math.random() * 16, 10);

      }

      if ((data.x > 8192 && data.windOffsetX) || (data.x < 0 && !data.windOffsetX)) {

        // reverse gears
        data.windOffsetX *= -1;

      }

      if (380 - data.y - 32 < 64 || data.y < 64) {

        // reverse gears
        data.windOffsetY *= -1;

      }

      moveTo(data.x + data.windOffsetX, data.y + data.windOffsetY);

    }

    function moveTo(x, y) {

      var hasNew;

      if (x !== undefined && data.x !== x) {
        common.setTransformX(exports, x);
        data.x = x;
      }

      if (y !== undefined && data.y !== y) {
        common.setTransformY(exports, y);
        data.y = y;
      }

    }

    function hit(hitPoints) {
      if (!data.dead) {
        hitPoints = hitPoints || 1;
        data.energy -= hitPoints;
        if (data.energy <= 0) {
          data.energy = 0;
          die();
        }
      }
    }

    function dead() {
      if (data.dead && dom.o) {
        utils.css.swap(dom.o, css.exploding, css.dead);
      }
    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      common.setTransformX(exports, data.x);
      common.setTransformY(exports, data.y);

      game.dom.world.appendChild(dom.o);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom
    }

    init();

    return exports;

  }

  function SmartMissile(options) {

    /**
     * I am so smart!
     * I am so smart!
     * S-MRT,
     * I mean, S-MAR-T...
     *  -- Homer Simpson
     */

    var css, dom, data, radarItem, objects, collision, exports;

    options = options || {};

    css = inheritCSS({
      className: 'smart-missile',
      trailer: 'smart-missile-trailer',
      expired: 'expired',
      spark: 'spark'
    });

    data = inheritData({
      type: 'smart-missile',
      parentType: options.parentType || null,
      energy: 1,
      expired: false,
      hostile: false, // when expiring/falling, this object is dangerous to both friendly and enemy units.
      frameCount: 0,
      expireFrameCount: options.expireFrameCount || 256,
      dieFrameCount: options.dieFrameCount || 640, // 640 frames ought to be enough for anybody.
      width: 14,
      height: 15,
      gravity: 1,
      damagePoints: 15,
      vX: 2,
      vY: 2,
      vXMax: 12,
      vYMax: 12,
      thrust: 0.75,
      deadTimer: null,
      trailerCount: 5,
      xHistory: [],
      yHistory: [],
      yMax: null
    }, options);

    dom = {
      o: null,
      trailers: []
    }

    objects = {
      target: options.target
    }

    collision = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        hit: function(target) {
          sparkAndDie(target);
        }
      },
      items: ['tanks', 'vans', 'missileLaunchers', 'infantry', 'parachuteInfantry', 'engineers', 'helicopters', 'bunkers', 'balloons', 'smartMissiles', 'turrets']
    }

    function animate() {

      var items, item, hit, tmpData, tmpObject, deltaX, deltaY, targetData, angle, hitBottom;

      if (data.dead) {
        return true;
      }

      targetData = objects.target.data;

      var targetHalfWidth = targetData.width / 2;
      var targetHeightOffset = (targetData.type === 'balloon' ? targetData.height * 0 : targetData.height / 2);

      // delta of x/y between this and target
      deltaX = (targetData.x + targetHalfWidth) - data.x;

      // TODO: hack full height for balloon?
      deltaY = (targetData.y + (targetData.bottomAligned ? targetHeightOffset : -targetHeightOffset)) - data.y;

      if (!data.expired && (data.frameCount > data.expireFrameCount || (!objects.target || objects.target.data.dead))) {
        utils.css.add(dom.o, css.expired);
        data.expired = true;
        data.hostile = true;
        // burst of thrust when the missile expires?
        data.vX *= 1.5;
        data.vY *= 1.5;
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

          data.vY += (deltaY >= 0 ? data.thrust : -data.thrust)

        }

      }

      // and throttle
      data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
      data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));

      if (Math.random() >= 0.99) {

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
          deltaX = (deltaX % 180);
        }

        angle = Math.atan2(deltaY, deltaX) * deg2Rad;

      } else {

        // bottom-aligned. Heading left, or right?

        if (data.vX > 0) {
          angle = 0;
        } else {
          angle = 180;
        }

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

      /*
      // hit top?
      if (data.y < game.objects.view.data.topBar.height) {
        die();
      }
      */

      // hit bottom?
      if (data.y > game.objects.view.data.battleField.height) {
        data.y = game.objects.view.data.battleField.height;
        die(true);
      }

      collisionTest(collision, exports);

      // notify caller if now dead and can be removed.
      return (data.dead && !dom.o);

    }

    function moveTo(x, y) {

      var hitBottom = false;

      if (x !== undefined && data.x !== x) {
        common.setX(exports, x);
        data.x = x;
      }

      // prevent from "crashing", only if not expiring and target is still alive
      if (!data.expired && !objects.target.data.dead && y >= data.yMax) {
        y = data.yMax;
        hitBottom = true;
      }

      if (y !== undefined && data.y !== y) {
        common.setY(exports, y);
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

      for (i=0, j=data.trailerCount; i<j; i++) {

        // if previous X value exists, apply it
        if (data.xHistory[i]) {
          dom.trailers[i].style.left = data.xHistory[i] + (data.width/2) + 'px';
          dom.trailers[i].style.top = data.yHistory[i] + (data.height/2) + 'px';
        }

      }

    }

    function hit(hitPoints) {
      if (!data.dead) {
        hitPoints = hitPoints || 1;
        data.energy -= hitPoints;
        if (data.energy <= 0) {
          data.energy = 0;
          die();
        }
      }
    }

    function spark() {
      utils.css.add(dom.o, css.spark);
    }

    function sparkAndDie(target) {

      // TODO: reduce timers
      spark();

      // hack: no more animation.
      data.dead = true;

      if (target) {
        target.hit(data.damagePoints, exports);
      }

      die();

    }

    function dead() {
      if (data.dead && dom.o) {
        utils.css.swap(dom.o, css.spark, css.dead);
      }
    }

    function die(excludeShrapnel) {

      if (!data.deadTimer) {

        utils.css.add(dom.o, css.spark);

        if (!excludeShrapnel) {
          shrapnelExplosion(data, {
            count: 3,
            velocity: 2
          });
        }

        // timeout?
        data.deadTimer = window.setTimeout(function() {
          removeNodes(dom);
          radarItem.die();
        }, 250);

        data.energy = 0;

      }

      data.dead = true;

/*
      if (sounds.genericExplosion) {
        sounds.genericExplosion.play();
      }
*/

    }

    function init() {

      var i, trailerConfig, fragment;

      fragment = document.createDocumentFragment();

      dom.o = makeSprite({
        className: css.className
      });

      trailerConfig = {
        className: css.trailer
      };

      for (i=0; i<data.trailerCount; i++) {
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

      common.setX(exports, data.x);
      common.setY(exports, data.y);

      game.dom.world.appendChild(fragment);

      game.dom.world.appendChild(dom.o);

      // findTarget();

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

      if (sounds.missileLaunch) {
        sounds.missileLaunch.play();
      }

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      hit: hit,
      die: die,
      objects: objects
    }

    init();

    return exports;

  }

  function Helicopter(options) {

    var css, data, dom, events, objects, collision, radarItem, exports;

    options = options || {};

    css = inheritCSS({
      className: 'helicopter',
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
      }
    });

    data = inheritData({
      type: 'helicopter',
      bombing: false,
      firing: false,
      missileLaunching: false,
      parachuting: false,
      ignoreMouseEvents: false,
      fuel: 100,
      maxFuel: 100,
      fireModulus: 2,
      bombModulus: 6,
      fuelModulus: 10,
      fuelModulusFlying: 4,
      missileModulus: 12,
      parachuteModulus: 4,
      repairModulus: 2,
      smokeModulus: 2,
      radarJamming: 0,
      repairComplete: false,
      landed: true,
      onLandingPad: false,
      cloaked: false,
      rotated: false,
      rotateTimer: null,
      autoRotate: (options.isEnemy || false),
      repairing: false,
      repairFrames: 0,
      energy: 10,
      maxEnergy: 10,
      direction: 0,
      xMin: 0,
      xMax: null,
      yMin: 0,
      yMax: null,
      vX: 0,
      vXMax: 12,
      lastVX: 0,
      vY: 0,
      vyMin: 0,
      vYMax: 10,
      width: 48,
      height: 15,
      halfWidth: 24,
      halfHeight: 7,
      tilt: null,
      lastTiltCSS: null,
      tiltYOffset: 2,
      ammo: 50,
      maxAmmo: 50,
      bombs: 10,
      maxBombs: 10,
      parachutes: 1,
      maxParachutes: 5,
      smartMissiles: 2,
      maxSmartMissiles: 2,
      midPoint: null
    }, options);

    data.midPoint = {
      x: data.x + data.halfWidth + 10,
      y: data.y,
      width: 5,
      height: data.height
    };

    dom = {
      o: null,
      fuelLine: null,
      subSprite: null
    }

    events = {

      resize: function() {
        refreshCoords();
      },

      mousedown: function(e) {
        if (!data.ignoreMouseEvents && !data.isEnemy && data.fuel > 0) {
          if (e.button === 0) {
            // disable auto-rotate
            // data.autoRotate = false;
            rotate();
          }
        }
      },

      mouseup: function() {
        // setFiring(false);
      },

      dblclick: function(e) {
        if (!data.ignoreMouseEvents && !data.isEnemy && data.fuel > 0) {
          if (e.button === 0) {
            // revert to normal setting
            if (data.rotated) {
              rotate();
            }
            // enable auto-rotate
            data.autoRotate = true;
          }
        }
      }

    }

    objects = {
      bombs: [],
      gunfire: [],
      smartMissiles: []
    }

    collision = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        hit: function(target) {
          if (target.data.type === 'chain') {
            // special case: chains do damage, but don't kill.
            hit(target.data.damagePoints);
            // should the target die, too? ... probably so.
            target.hit(999);
          } else if (target.data.type === 'infantry') {
            // helicopter landed, and friendly, landed infantry (or engineer)?
            if (data.landed && data.parachutes < data.maxParachutes && target.data.isEnemy === data.isEnemy) {
              // check if it's at the helicopter "door".
              if (collisionCheckMidPoint(exports, target)) {
                // pick up infantry
                target.die(true);
                data.parachutes = Math.min(data.maxParachutes, data.parachutes + 1);
                updateStatusUI();
              }
            }
          } else if (target.data.type === 'cloud') {
            cloak();
          } else {
            // hit something else. boom!
            die();
            // should the target die, too? ... probably so.
            target.hit(999);
          }
        }
      },
      items: ['balloons', 'tanks', 'vans', 'missileLaunchers', 'bunkers', 'helicopters', 'chains', 'infantry', 'engineers', 'clouds']
    }

    function animate() {

      // move according to delta between helicopter x/y and mouse, up to a max.

      var i, j, view, mouse, jamming, newX, yLimit;

      jamming = 0;

      view = game.objects.view;

      if (!data.isEnemy && data.fuel > 0) {

        mouse = view.data.mouse;

        // only allow X-axis if not on ground...
        if (mouse.x) {
          // accelerate scroll vX, so chopper nearly matches mouse when scrolling
          data.lastVX = parseFloat(data.vX);
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

      yLimit = 369 - (data.onLandingPad ? 4 : 0);

      // slight offset when on landing pad
      if (data.y >= yLimit) {
        data.landed = true;
        data.vX = 0;
        if (data.vY > 0) {
          data.vY = 0;
        }
      } else {
        data.landed = false;
        onLandingPad(false);
      }

      // no fuel?
      if (data.fuel <= 0) {

        // gravity until dead.
        if (data.vY < 0.5) {
          data.vY = 0.5;
        }

        data.vY *= 1.1;

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
          newX = Math.max(view.data.battleField.scrollLeft + (data.width/2) , Math.min(view.data.browser.width + view.data.battleField.scrollLeft - (data.width * 1.5), newX));
        }

        moveTo(newX, data.y + data.vY);

        applyTilt();

        collisionTest(collision, exports);

        // repairing?
        if (data.repairing) {
          repair();
        }

      }

      // animate child objects, too

      // TODO: for ... in

      for (i = objects.gunfire.length-1; i >= 0; i--) {
        if (objects.gunfire[i].animate()) {
          // object is dead - take it out.
          objects.gunfire.splice(i, 1);
        }
      }

      for (i = objects.bombs.length-1; i >= 0; i--) {
        if (objects.bombs[i].animate()) {
          // object is dead - take it out.
          objects.bombs.splice(i, 1);
        }
      }

      for (i = objects.smartMissiles.length-1; i >= 0; i--) {
        if (objects.smartMissiles[i].animate()) {
          // object is dead - take it out.
          objects.smartMissiles.splice(i, 1);
        }
      }

      // should we be firing, also?

      if (!data.dead) {
        fire();
      }

      if (!data.dead && !data.isEnemy) {

        // any enemy vans that jamming our radar?
        for (i = 0, j = game.objects.vans.length; i<j; i++) {

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

        if (!data.dead && Math.random() > 1 - ((10-data.energy)/10)) {

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

      }

      // uncloak if not in a cloud?
      uncloak();

    }

    function cloak() {

      if (!data.cloaked) {
        utils.css.add(dom.o, css.cloaked);
        utils.css.add(radarItem.dom.o, css.cloaked);
      }

      // hackish: mark and/or update the current frame when this happened.
      data.cloaked = game.objects.gameLoop.data.frameCount;

    }

    function uncloak() {

      // hackish: uncloak if a frame or more has passed and we aren't in a cloud.
      if (data.cloaked && data.cloaked !== game.objects.gameLoop.data.frameCount) {
        utils.css.remove(dom.o, css.cloaked);
        utils.css.remove(radarItem.dom.o, css.cloaked);
        data.cloaked = false;
      }

    }

    // TODO: move up top.
    var lastTarget;

    function centerView() {

      // hack: center on enemy helicopter at all times.

      if (trackEnemy) {
        game.objects.view.dom.battleField.style[features.transform.prop] = 'translate3d(' + (parseInt(data.x - game.objects.view.data.browser.halfWidth, 10) * -1) + 'px, 0px, 0px)'; 
      }

    }

    function ai() {

      // rudimentary, dumb smarts.

      if (data.fuel <= 0) {
        return false;
      }

      var target, balloonTarget;

      // low fuel means low fuel.

      if (data.energy > 0 && !data.landed && !data.repairing && (data.fuel < 33 || data.energy < 3)) {

        var target = game.objects.landingPads[game.objects.landingPads.length-1];

        // head back toward base

        var deltaX = target.data.x - data.x;
        var deltaY = -4;

        data.vX = deltaX;
        data.vY = deltaY;

        data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
        data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));

        data.lastVX = data.lastVX;
        data.lastVY = data.lastVY;

        // are we over the landing pad?

        if (data.x >= target.data.x && data.x + data.width <= target.data.x + target.data.width) {

          data.vX = 0;
          data.vY = 4;

        }

        centerView();

        return false;

      }

      if (data.landed) {

        if (data.repairComplete) {

          // repair has completed. go go go!
          data.vY = -4;
          data.vX = -8;

        } else {

          // still repairing. don't move.

          data.vX = 0;
          data.vY = 0;

          return false;

        }

      }

      // target balloons.

      if (lastTarget) {

        // toast?

        if (lastTarget.data.dead) {

          lastTarget = null;

        } else if (lastTarget.data.y > 340) {

          lastTarget = null;

        }

      }

      if (!lastTarget) {

        lastTarget = objectInView(data, { items: 'balloons' }) || objectInView(data, { items: 'clouds' });

        // is the new target too low?
        if (lastTarget && lastTarget.data.y > 340) {
          lastTarget = null;
        }

      } else if (lastTarget.data.type !== 'balloon') {

        // we already have a target - can we get a balloon?
        balloonTarget = objectInView(data, { items: 'balloons', triggerDistance: game.objects.view.data.browser.halfWidth });

        // better - go for that.
        if (balloonTarget && !balloonTarget.data.dead) {
          lastTarget = balloonTarget;
        }

      }

      target = lastTarget;

      data.lastVX = parseFloat(data.vX);

      if (target) {

        // go go go!

        var targetData = target.data;

        var result;

        result = trackObject(exports, target);

        // TODO: revise.

        var desiredVX, desiredVY;
        var deltaX, deltaY;


if (1) {

        desiredVX = result.deltaX * 0.25;
        desiredVY = result.deltaY * 0.25;

        // quickly normalize to target vX + vY.

        data.vX = desiredVX;
        data.vY = desiredVY;

        // data.vX = desiredVX; // += (deltaX * 0.5);
        // data.vY = desiredVY; // += (deltaY * 0.5);

        if (desiredVY > data.vY) {
          data.vY++;
        } else {
          data.vY--;
        }

} else {

        // change over time?

}

        // throttle

        data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
        data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));

        // within firing range?
        if (target.data.type === 'balloon' && Math.abs(result.deltaX) < 300) {
          setFiring(true);
        }

      } else {

        // default: go left
        data.vX -= 0.25;
        // and up
        data.vY -= 0.1;

        // and throttle
        data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
        data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));

      }

      centerView();

    }

    function burnFuel() {

      var frameCount, modulus;

      if (data.dead || data.repairing) {
        // don't burn fuel in these cases
        return false;
      }

      frameCount = game.objects.gameLoop.data.frameCount;

      modulus = (data.landed ? data.fuelModulus : data.fuelModulusFlying);

      if (frameCount % modulus === 0 && data.fuel > 0) {

        // burn!

        data.fuel = Math.max(0, data.fuel - 0.1);

        // update UI

        updateFuelUI();

        if (data.fuel <= 0) {
          console.log('no fuel');
        }

      }

    }

    function updateFuelUI() {

      if (!data.isEnemy) {
        dom.fuelLine.style.width = (data.fuel + '%');
      }

    }

    function onLandingPad(state) {

      data.onLandingPad = state;

      if (state) {

        startRepairing();

      } else {

        stopRepairing();

      }

    }

    function startRepairing() {

      if (!data.repairing) {

        data.repairing = true;

      }

    }

    function stopRepairing() {

      if (data.repairing) {

        data.repairing = false;

        if (data.repairComplete) {

          data.repairComplete = false;

          if (!data.isEnemy) {

            document.getElementById('repair-complete').style.display = 'none';

          }

        }

      }

    }

    function repair() {

      var hasUpdate;

      data.repairFrames++;

      data.fuel = Math.min(data.maxFuel, data.fuel + 0.4);

      if (data.repairFrames % 2 === 0) {
        data.ammo = Math.min(data.maxAmmo, data.ammo + 1);
        hasUpdate = 1;
      }

      if (data.repairFrames % 5 === 0) {

        // fix damage
        data.energy = Math.min(data.maxEnergy, data.energy + 1);

      }

      if (data.repairFrames % 25 === 0) {

        data.bombs = Math.min(data.maxBombs, data.bombs + 1);
        hasUpdate = 1;
       
      }

      if (data.repairFrames % 200 === 0) {
        data.smartMissiles = Math.min(data.maxSmartMissiles, data.smartMissiles + 1);
        hasUpdate = 1;
      }

      updateFuelUI();

      if (hasUpdate) {
        updateStatusUI();
      }

    }

    function updateStatusUI() {

      if (!data.isEnemy) {

        // TODO: optimize

        document.getElementById('infantry-count').textContent = data.parachutes;
        document.getElementById('ammo-count').textContent = data.ammo;
        document.getElementById('bomb-count').textContent = data.bombs;
        document.getElementById('missile-count').textContent = data.smartMissiles;

      }

      // fully-repaired?
      if (data.repairing && !data.repairComplete && data.fuel === data.maxFuel && data.ammo === data.maxAmmo && data.energy === data.maxEnergy && data.bombs === data.maxBombs && data.smartMissiles === data.maxSmartMissiles) {

        data.repairComplete = true;

        if (!data.isEnemy) {

          document.getElementById('repair-complete').style.display = 'block';

          if (sounds.inventory.end) {
            sounds.inventory.end.play();
          }

        }

      }

    }

    function setFiring(state) {

      if (state) {
         data.firing = state;
      }

    }

    function setBombing(state) {

      if (state) {
        data.bombing = state;
      }

    }

    function setMissileLaunching(state) {

      if (data.missileLaunching !== state) {
         data.missileLaunching = state;
      }

    }

    function setParachuting(state) {

      if (data.parachuting !== state) {
        data.parachuting = state;
      }

    }

    function applyTilt() {

      // L -> R / R -> L + forward / backward

      // auto-rotate feature
      if (data.autoRotate && ((data.vX > 0 && data.lastVX < 0) || (data.vX < 0 && data.lastVX > 0))) {
        rotate();
      }

      if (features.transform.prop) {

        // rotate by angle.
        dom.o.style[features.transform.prop] = 'rotate(' + ((data.vX / data.vXMax) * 12.5) + 'deg)';

        // TODO: clean up, improve
        return false;

      }

      if (data.tilt === null) {

        // new tilt

        if (data.vX > data.vXMax/4) {

          // L -> R
          utils.css.add(dom.o, css.tilt);

          utils.css.add(dom.o, css.movingRight);

          data.tilt = 1;

        } else if (data.vX < data.vXMax/4 * -1) {

          // R -> L
          utils.css.add(dom.o, css.tilt);

          utils.css.add(dom.o, css.movingLeft);

          data.tilt = -1;

        }

      } else {

        if (data.tilt === 1 && data.vX < data.vXMax/4) {

          // leaving L -> R tilt

          utils.css.remove(dom.o, css.tilt);
          utils.css.remove(dom.o, css.movingRight);

          data.tilt = null;

        } else if (data.tilt === -1 && data.vX > data.vXMax/4 * -1) {

          // leaving R -> L tilt

          utils.css.remove(dom.o, css.tilt);
          utils.css.remove(dom.o, css.movingLeft);

          data.tilt = null;

        }

      }

    }

    function rotate(force) {

      // flip the helicopter so it's pointing R-L instead of the default R/L (toggle behaviour)

      // if not dead or landed, that is.
      if (!force && (data.dead || data.y <= 0 || data.landed)) {
        return false;
      }

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
        data.rotateTimer = window.setTimeout(function() {
          utils.css.remove(dom.o, (data.rotated ? css.rotatedLeft : css.rotatedRight));
          utils.css.add(dom.o, (data.rotated ? css.facingLeft : css.facingRight));
          data.rotateTimer = null;
        }, 333);
      }

      if (!data.autoRotate && sounds.helicopter.rotate) {
        sounds.helicopter.rotate.play();
      }

    }

    function refreshCoords() {

      var view = game.objects.view;

      // determine max X and Y coords
      data.xMax = view.data.battleField.width - data.width;
      data.yMax = view.data.world.height - data.height - 2; // including border

      // haaaack
      if (!data.yMin) {
        data.yMin = document.getElementById('game-status-bar').offsetHeight;
      }

    }

    function moveTo(x, y) {

      // Hack: limit enemy helicopter to visible screen
      if (data.isEnemy) {
        x = Math.min(8192, Math.max(0, x));
      }

      if (x !== undefined) {
        x = Math.min(data.xMax, x);
        if (x && data.x !== x) {
          common.setX(exports, x);
          data.x = x;
          data.midPoint.x = data.x + data.halfWidth;
        }
      }

      if (y !== undefined) {
        y = Math.max(data.yMin, Math.min(data.yMax - (data.repairing ? 3 : 0), y));
        if (data.y !== y) {
          common.setY(exports, y);
          data.y = y;
          // TODO: redundant?
          data.midPoint.y = data.y;
        }
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

    function hit(hitPoints) {
      if (!data.dead) {
        hitPoints = hitPoints || 1;
        data.energy -= hitPoints;
        updateHealth();
        if (data.energy <= 0) {
          data.energy = 0;
          die();
        }
      }
    }

    function fire() {

      var tiltOffset, frameCount, missileTarget, hasUpdate;

      frameCount = game.objects.gameLoop.data.frameCount;

      if (!data.firing && !data.bombing && !data.missileLaunching && !data.parachuting) {
        return false;
      }

      if (data.firing && data.ammo > 0 && frameCount % data.fireModulus === 0) {

        tiltOffset = (data.tilt !== null ? data.tiltYOffset * data.tilt * (data.rotated ? -1 : 1) : 0);

        objects.gunfire.push(new GunFire({
          parentType: data.type,
          isEnemy: data.isEnemy,
          x: data.x + (data.rotated ? 0 : data.width) - 8,
          y: data.y + data.halfHeight + (data.tilt !== null ? tiltOffset + 2 : 0),
          vX: data.vX + 8 * (data.rotated ? -1 : 1) * (data.isEnemy ? -1 : 1),
          vY: data.vY + tiltOffset
        }));

        if (sounds.genericGunFire) {
          sounds.genericGunFire.play();
        }

        // TODO: CPU

        if (!data.isEnemy) {

          data.ammo = Math.max(0, data.ammo - 1);

          hasUpdate = 1;

        }

        // SHIFT key still down?
        if (!keyboardMonitor.isDown('shift')) {
          data.firing = false;
        }

      }

      if (data.bombing && data.bombs > 0 && frameCount % data.bombModulus === 0) {

        objects.bombs.push(new Bomb({
          isEnemy: data.isEnemy,
          x: data.x + data.halfWidth,
          y: data.y + data.height - 6,
          vX: data.vX
        }));

        data.bombs = Math.max(0, data.bombs - 1);

        hasUpdate = 1;

        // CTRL key still down?
        if (!keyboardMonitor.isDown('ctrl')) {
          data.bombing = false;
        }

      }

      if (data.missileLaunching && data.smartMissiles > 0 && frameCount % data.missileModulus === 0) {

        missileTarget = getNearestObject(exports, { useInFront: true });

        if (missileTarget && !missileTarget.data.cloaked) {

          objects.smartMissiles.push(new SmartMissile({
            parentType: data.type,
            isEnemy: data.isEnemy,
            x: data.x + (data.rotated ? 0 : data.width) - 8,
            y: data.y + data.halfHeight, // + (data.tilt !== null ? tiltOffset + 2 : 0),
            target: missileTarget
            // vX: data.vX + 8 * (data.rotated ? -1 : 1)
          }));

          data.smartMissiles = Math.max(0, data.smartMissiles - 1);

          hasUpdate = 1;

        } else {

          // "unavailable" sound?
          if (sounds.inventory.denied) {
            sounds.inventory.denied.play();
          }

        }

      }

      if (data.parachuting && data.parachutes > 0 && frameCount % data.parachuteModulus === 0) {

        // helicopter landed? Just create an infantry.
        if (data.landed) {

          game.objects.infantry.push(new Infantry({
            isEnemy: data.isEnemy,
            // don't create at half-width, will be immediately recaptured (picked up) by helicopter.
            x: data.x + (data.width * 0.75),
            y: data.y + data.height - 11
          }));

        } else {

          game.objects.parachuteInfantry.push(new ParachuteInfantry({
            isEnemy: data.isEnemy,
            x: data.x + data.halfWidth,
            y: data.y + data.height - 11
          }));

        }

        data.parachutes = Math.max(0, data.parachutes - 1);

        hasUpdate = 1;

      }

      if (hasUpdate) {

        updateStatusUI();

      }

    }

    function moveTrailers() {

      var i, j;

      for (i=0, j=data.trailerCount; i<j; i++) {

        // if previous X value exists, apply it
        if (data.xHistory[i]) {
          dom.trailers[i].style.left = data.xHistory[i] + (data.width/2) + 'px';
          dom.trailers[i].style.top = data.yHistory[i] + (data.height/2) + 'px';
          dom.trailers[i].style.backgroundPosition = '0px -' + ((j-i) * 10) + 'px';
        }

      }

    }

    function die() {

      if (data.dead) {
        return false;
      }

      // reset animations
      data.frameCount = 0;

      utils.css.add(dom.o, css.exploding);

      shrapnelExplosion(data, {
        count: 20,
        velocity: 5
      });

      // drop infantry?
      if ((data.isEnemy && Math.random() > 0.5) || Math.random() > 0.75) {
        game.objects.parachuteInfantry.push(new ParachuteInfantry({
          isEnemy: data.isEnemy,
          x: data.x + data.halfWidth,
          y: data.y + data.height - 11,
          ignoreShrapnel: true
        }));
      }

      // timeout?
      window.setTimeout(function() {
        utils.css.add(dom.o, css.dead);
        // undo rotate, if needed
        if (data.autoRotate && data.rotated) {
          rotate(true);
        }
      }, 1200);

      data.energy = 0;

      data.dead = true;

      if (sounds.genericExplosion) {
        sounds.genericExplosion.play();
      }

      window.setTimeout(respawn, 3000);

    }

    function respawn() {

      // helicopter died. move view, and reset.

      reset();

      // local player? move the view back to zero.

      if (!data.isEnemy) {
        game.objects.view.setLeftScroll(game.objects.view.data.battleField.width * -1);
      }

    }

    function reset() {

      data.fuel = data.maxFuel;
      data.energy = data.maxEnergy;
      data.parachutes = 1;
      data.smartMissiles = data.maxSmartMissiles;
      data.ammo = data.maxAmmo;
      data.bombs = data.maxBombs;

      if (!data.isEnemy) {

        data.vX = 0;
        data.vY = 0;
        data.lastVX = 0;

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
      data.parachuting = false;

      updateHealth();

      if (data.isEnemy) {

        data.x = 8192 - 64;

      } else {

        data.x = 204;

        data.y = game.objects.view.data.world.height - 20;

      }

      common.setX(exports, data.x);
      common.setY(exports, data.y);

      utils.css.remove(dom.o, css.exploding);
      utils.css.remove(dom.o, css.dead);

      data.dead = false;

      updateStatusUI();

    }

    function init() {

      var i, trailerConfig, fragment;

      fragment = document.createDocumentFragment();

      trailerConfig = {
        className: css.trailer
      };

      for (i=0; i<data.trailerCount; i++) {
        dom.trailers.push(makeSprite(trailerConfig));
        // TODO: clone, optimize etc.
        fragment.appendChild(dom.trailers[i]);
      }

      game.dom.world.appendChild(fragment);

      dom.o = makeSprite({
        className: css.className + (data.isEnemy ? ' ' + css.enemy : '')
      });

      dom.oSubSprite = makeSubSprite();

      dom.o.appendChild(dom.oSubSprite);

      dom.fuelLine = document.getElementById('fuel-line');

      common.setX(exports, data.x);
      common.setY(exports, data.y);

      game.dom.world.appendChild(dom.o);

      // attach events?

      if (options.attachEvents) {

        utils.events.add(game.dom.world, 'mousedown', events.mousedown);
        utils.events.add(game.dom.world, 'dblclick', events.dblclick);
        utils.events.add(game.dom.world, 'mouseup', events.mouseup);

      }

      refreshCoords();

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die,
      fire: fire,
      hit: hit,
      onLandingPad: onLandingPad,
      startRepairing: startRepairing,
      rotate: rotate,
      setBombing: setBombing,
      setFiring: setFiring,
      setMissileLaunching: setMissileLaunching,
      setParachuting: setParachuting
    }

    init();

    return exports;

  }

  function Tank(options) {

    var css, data, dom, radarItem, objects, radarItem, nearby, exports;

    options = options || {};

    css = inheritCSS({
      className: 'tank',
      hit1: 'smouldering-phase-1',
      hit2: 'smouldering-phase-2',
      stopped: 'stopped'
    });

    data = inheritData({
      type: 'tank',
      bottomAligned: true,
      energy: 8,
      energyMax: 8,
      frameCount: 0,
      repairModulus: 50,
      fireModulus: 6,
      vX: (options.isEnemy ? -1 : 1),
      width: 57,
      height: 18,
      gunYOffset: 15,
      stopped: false,
      inventory: {
        frameCount: 60,
        cost: 5
      }
    }, options);

    dom = {
      o: null,
      oSubSprite: null
    }

    objects = {
      gunfire: []
    }

    nearby = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        useLookAhead: true,
        // TODO: rename to something generic?
        hit: function(target) {
          // stop moving, start firing.
          // special case: only fire at EndBunker if it has energy.
          if ((target.data.type === 'end-bunker' && target.data.energy) || target.data.type !== 'end-bunker') {
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
      items: ['tanks', 'vans', 'missileLaunchers', 'infantry', 'engineers', 'helicopters', 'endBunkers'],
      targets: []
    }

    function animate() {

      var i;

      data.frameCount++;

      for (i = objects.gunfire.length-1; i >= 0; i--) {
        if (objects.gunfire[i].animate()) {
          // object is dead - take it out.
          objects.gunfire.splice(i, 1);
        }
      }

      if (!data.dead) {

        repair();

        if (!data.stopped) {

          moveTo(data.x + data.vX, data.bottomY);

        } else {

          // only fire (i.e., GunFire objects) when stopped
          fire();

        }

        // start, or stop firing?
        nearbyTest(nearby);

      }

      return (data.dead && !dom.o && !objects.gunfire.length);

    }

    function fire() {

      if (data.frameCount % data.fireModulus === 0) {

        objects.gunfire.push(new GunFire({
          parentType: data.type,
          isEnemy: data.isEnemy,
          collisionItems: nearby.items,
          x: data.x + ((data.width + 1) * (data.isEnemy ? 0 : 1)),
          y: game.objects.view.data.world.height - data.gunYOffset, // half of tank height
          vX: data.vX, // same velocity as tank
          vY: 0
        }));

        if (sounds.genericGunFire) {
          if (!data.isEnemy) {
            sounds.genericGunFire.play();
          } else {
            // offset enemy tank fire sounds
            window.setTimeout(sounds.genericGunFire.play, 120);
          }
        }

      }

    }

    function repair() {

      if (data.frameCount % data.repairModulus === 0) {
        if (data.energy < data.energyMax) {
          data.energy++;
          updateHealth();
        }
      }

    }

    function moveTo(x, bottomY) {

      if (x !== undefined && data.x !== x) {
        common.setX(exports, x);
        data.x = x;
      }

      if (bottomY !== undefined && data.bottomY !== bottomY) {
        common.setBottomYPixels(exports, bottomY);
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
    }

    function hit(hitPoints) {

      hitPoints = hitPoints || 1;

      if (!data.dead) {
        data.energy -= hitPoints;
        updateHealth();
        if (data.energy <= 0) {
          die();
        }

      }

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

    function die() {

      if (data.dead) {
        return false;
      }

      utils.css.add(dom.o, css.exploding);

      shrapnelExplosion(data);

      // timeout?
      window.setTimeout(function() {
        removeNodes(dom);
        radarItem.die();
      }, 1000);

      data.energy = 0;

      data.dead = true;

      if (sounds.genericExplosion) {
        sounds.genericExplosion.play();
      }

      radarItem.die();

    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      dom.oSubSprite = makeSubSprite();

      dom.o.appendChild(dom.oSubSprite);

      // for testing
      if (options.extraClass) {
        utils.css.add(dom.o, options.extraClass);
      }

      common.setX(exports, data.x);
      common.setBottomYPixels(exports, data.bottomY);

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

      initNearby(nearby, exports);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      hit: hit,
      die: die,
      stop: stop,
      resume: resume
    }

    if (!options.noInit) {
      init();
    }

    return exports;

  }

  function Van(options) {

    var css, dom, data, radarItem, exports;

    options = options || {};

    css = inheritCSS({
      className: 'van'
    });

    data = inheritData({
      type: 'van',
      bottomAligned: true,
      frameCount: 0,
      radarJammerModulus: 50,
      jamming: false,
      energy: 1,
      direction: 0,
      stopped: false,
      vX: (options.isEnemy ? -1 : 1),
      width: 38,
      height: 16,
      state: 0,
      stateMax: 2,
      stateModulus: 38,
      inventory: {
        frameCount: 60,
        cost: 5
      },
      // if the van reaches the enemy base, it's game over.
      xGameOver: (options.isEnemy ? 312 + 32 : game.objects.view.data.battleField.width - 256)
    }, options);

    dom = {
      o: null
    }

    function animate() {

      var enemyHelicopter;

      if (!data.dead && !data.stopped) {

        moveTo(data.x + data.vX, data.bottomY);

        if (data.isEnemy && data.x <= data.xGameOver) {

          stop();

          // Game over, man, game over! (Enemy wins.)
          console.log('The enemy has won the battle.');

          gameOver();

        } else if (!data.isEnemy && data.x >= data.xGameOver) {

          stop();

          // player wins
          console.log('You have won the battle.');

          gameOver(true);

        } else {

          // bounce wheels?

          if (data.frameCount % data.stateModulus === 0) {

            data.state++;

            if (data.state > data.stateMax) {
              data.state = 0;
            }

            dom.o.style.backgroundPosition = '0px ' + -(data.height * data.state) + 'px';

          } else if (data.frameCount % data.stateModulus === 4) {

            // next frame - reset.
            dom.o.style.backgroundPosition = '0px 0px';

          }

          if (data.frameCount % data.radarJammerModulus === 0) {

            // look for nearby bad guys
            enemyHelicopter = enemyHelicopterNearby(data, game.objects.view.data.browser.width);

            if (!data.jamming && enemyHelicopter) {

              data.jamming = true;

            } else if (data.jamming && !enemyHelicopter) {

              data.jamming = false;

            }

          }

        }

        data.frameCount++;

      }

      return data.dead;

    }

    function stop() {

      data.stopped = true;

    }

    function moveTo(x, bottomY) {

      if (x !== undefined && data.x !== x) {
        common.setX(exports, x);
        data.x = x;
      }

      if (bottomY !== undefined && data.bottomY !== bottomY) {
        common.setBottomYPixels(exports, bottomY);
        data.bottomY = bottomY;
        data.y = bottomAlignedY(bottomY);
      }

    }


    function hit(hitPoints) {
      if (!data.dead) {
        hitPoints = hitPoints || 1;
        data.energy -= hitPoints;
        if (data.energy <= 0) {
          data.energy = 0;
          die();
        }
      }
    }

    function dead() {
      if (data.dead && dom.o) {
        utils.css.swap(dom.o, css.exploding, css.dead);
      }
    }

    function die() {

      if (data.dead) {
        return false;
      }

      utils.css.add(dom.o, css.exploding);

      shrapnelExplosion(data);

      // timeout?
      window.setTimeout(function() {
        removeNodes(dom);
        radarItem.die();
      }, 1000);

      data.energy = 0;

      data.jamming = false;

      data.dead = true;

      if (sounds.genericExplosion) {
        sounds.genericExplosion.play();
      }

    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      common.setX(exports, data.x);
      common.setBottomYPixels(exports, data.bottomY);

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      hit: hit,
      die: die
    }

    if (!options.noInit) {
      init();
    }

    return exports;

  }

  function ParachuteInfantry(options) {

    var css, dom, data, radarItem, exports;

    css = inheritCSS({
      className: 'parachute-infantry',
      parachuteOpen: 'parachute-open'
    });

    data = inheritData({
      type: 'parachute-infantry',
      frameCount: 0,
      panicModulus: 3,
      windModulus: 16 + parseInt(Math.random() * 16),
      panicFrame: 0,
      energy: 2,
      parachuteOpen: false,
      // "most of the time", a parachute will open. no idea what the original game did. 10% failure rate.
      parachuteOpensAtY: options.y + (Math.random() * (370 - options.y)) + (Math.random() > 0.9 ? 999 : 0),
      direction: 0,
      width: 10,
      height: 11, // 19 when parachute opens
      frameHeight: 20, // each sprite frame
      ignoreShrapnel: options.ignoreShrapnel || false,
      vX: 0, // wind?
      vY: 3
    }, options);

    dom = {
      o: null
    }

    function openParachute() {

      if (data.parachuteOpen) {
        return false;
      }

      // undo manual assignment from free-fall animation
      dom.o.style.backgroundPosition = '';

      utils.css.add(dom.o, css.parachuteOpen);

      data.vY = 0.5;

      data.parachuteOpen = true;

    }

    function animate() {

      var randomWind, windMod, bgY;

      if (!data.dead) {

        // falling?

        moveTo(data.x + data.vX, data.y + data.vY);

        if (!data.parachuteOpen) {

          if (data.y >= data.parachuteOpensAtY) {

            openParachute();

          } else {

            // like Tom Petty, free fallin'.
            if (data.frameCount % data.panicModulus === 0) {

              dom.o.style.backgroundPosition = '0px ' + -(60 + (data.frameHeight * data.panicFrame)) + 'px';

              // alternate between 0/1
              data.panicFrame = !data.panicFrame;

            }

          }

        } else {

          // (potentially) gone with the wind.

          windMod = data.frameCount % data.windModulus;

          if (windMod === 0) {

            // choose a random direction?
            if (Math.random() > 0.66) {

              // -1, 0, 1
              randomWind = parseInt(Math.random() * 3, 10) - 1;

              data.vX = randomWind * 0.5;

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
              data.windModulus = 16 + parseInt(Math.random() * 16);

            } else {

              // reset wind effect

              data.vX = 0;

              dom.o.style.backgroundPosition = '0px 0px';

            }

          }

        }

        if (data.parachuteOpen && data.y >= 370) {

          if (data.parachuteOpen) {

            // touchdown! die "quietly", and transition into new infantry.
            die(true);

            game.objects.infantry.push(new Infantry({
              x: data.x,
              isEnemy: data.isEnemy
            }));

          }

        } else if (!data.parachuteOpen && data.y - data.height + 4 >= 370) {

          // hit ground, and no parachute. gravity is a cruel mistress.

          // reposition, first
          moveTo(data.x, 370);


          die();

        }

        data.frameCount++;

      }

      return (data.dead && !dom.o);

    }

    function moveTo(x, y) {

      if (x !== undefined && data.x !== x) {
        common.setX(exports, x);
        data.x = x;
      }

      if (y !== undefined && data.y !== y) {
        common.setY(exports, y);
        data.y = y;
      }

    }

    function hit(hitPoints, target) {

      // special case: helicopter explosion resulting in a parachute infantry - make parachute invincible to shrapnel.
      if (target && target.data && target.data.type === 'shrapnel' && data.ignoreShrapnel) {
        return false;
      }

      if (!data.dead) {
        hitPoints = hitPoints || 1;
        data.energy -= hitPoints;
        if (data.energy <= 0) {
          data.energy = 0;
          die();
        }
      }

    }

    function dead() {
      if (data.dead && dom.o) {
        utils.css.swap(dom.o, css.exploding, css.dead);
      }
    }

    function dieComplete() {

      removeNodes(dom);
      radarItem.die();

    }

    function die(silent) {

      if (data.dead) {
        return false;
      }

      if (!silent) {

        utils.css.add(dom.o, css.exploding);

        // timeout?
        window.setTimeout(dieComplete, 1200);

      } else {

        // no explosion, remove right away.
        dieComplete();

      }

      data.energy = 0;

      data.dead = true;

    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      common.setX(exports, data.x);
      common.setY(exports, data.y);

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die,
      hit: hit
    }

    init();

    return exports;

  }

  function Infantry(options) {

    var css, dom, data, objects, radarItem, nearby, collision, exports;

    options = options || {};

    css = inheritCSS({
      className: null,
      infantry: 'infantry',
      engineer: 'engineer',
      stopped: 'stopped'
    });

    data = inheritData({
      type: 'infantry',
      frameCount: 0,
      bottomAligned: true,
      energy: 2,
      role: options.role || 0,
      roles: ['infantry', 'engineer'],
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
        frameCount: 20,
        cost: 5
      }
    }, options);

    dom = {
      o: null
    }

    objects = {
      gunfire: []
    }

    nearby = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        useLookAhead: true,
        // TODO: rename to something generic?
        hit: function(target) {
          // engineer + turret case? reclaim or repair.
          if (data.role && target.data.type === 'turret') {
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
      items: ['tanks', 'vans', 'missileLaunchers', 'infantry', 'engineers', 'helicopters', 'turrets'],
      targets: []
    }

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
          } else if (target.data.type !== 'bunker' && target.data.type !== 'end-bunker') {
            // probably a tank.
            die();
          }
        }
      },
      items: ['bunkers', 'tanks']
    }

    function animate() {

      if (!data.dead) {

        if (!data.stopped) {

          moveTo(data.x + data.vX, data.bottomY);

        } else {

          // firing, or reclaiming/repairing?

          // only fire (i.e., GunFire objects) when stopped
          if (!data.noFire) {
            fire();
          }

        }

        collisionTest(collision, exports);

        // start, or stop firing?
        nearbyTest(nearby);

      }

      for (i = objects.gunfire.length-1; i >= 0; i--) {
        if (objects.gunfire[i].animate()) {
          // object is dead - take it out.
          objects.gunfire.splice(i, 1);
        }
      }

      data.frameCount++;

      return (data.dead && !dom.o && !objects.gunfire.length);

    }

    function fire() {

      if (!data.noFire && data.frameCount % data.fireModulus === 0) {

        objects.gunfire.push(new GunFire({
          parentType: data.type,
          isEnemy: data.isEnemy,
          collisionItems: nearby.items,
          x: data.x + ((data.width + 1) * (data.isEnemy ? 0 : 1)),
          y: game.objects.view.data.world.height - data.gunYOffset, // half of infantry height
          vX: data.vX, // same velocity
          vY: 0
        }));

      }

    }

    function moveTo(x, bottomY) {

      if (x !== undefined && data.x !== x) {
        common.setX(exports, x);
        data.x = x;
      }

      if (bottomY !== undefined && data.bottomY !== bottomY) {
        common.setBottomYPixels(exports, bottomY);
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

    function hit(hitPoints) {

      if (!data.dead) {
        hitPoints = hitPoints || 1;
        data.energy -= hitPoints;
        if (data.energy <= 0) {
          data.energy = 0;
          die();
        }
      }

    }

    function dead() {
      if (data.dead && dom.o) {
        utils.css.swap(dom.o, css.exploding, css.dead);
      }
    }

    function dieComplete() {
      removeNodes(dom);
      radarItem.die();
    }

    function die(silent) {

      if (data.dead) {
        return false;
      }

      if (!silent) {

        utils.css.add(dom.o, css.exploding);

        // timeout?
        window.setTimeout(dieComplete, 1200);

      } else {

        dieComplete();

      }

      data.energy = 0;

      data.dead = true;

    }

    function init() {

      // infantry, or engineer?
      setRole(data.role, true);

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      common.setX(exports, data.x);
      common.setBottomYPixels(exports, data.bottomY);

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

      initNearby(nearby, exports);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die,
      hit: hit
    }

    if (!options.noInit) {
      init();
    }

    return exports;

  }

  function Engineer(options) {

    options = options || {};

    // flag as an engineer
    options.role = 1;
    // hack: -ve lookahead offset allowing engineers to be basically atop turrets
    options.xLookAhead = (options.isEnemy ? 4 : -8);

    return new Infantry(options);

  }

  function LandingPad(options) {

    var css, dom, data, nearby, collision, exports;

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
      y: 380 - 4
    }, options);

    dom = {
      o: null
    }

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

    function animate() {

      if (data.frameCount % data.repairModulus === 0) {

        collisionTest(collision, exports);

      }

      data.frameCount++;

    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      common.setX(exports, data.x);
      common.setY(exports, data.y);

      game.dom.world.appendChild(dom.o);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom
    }

    init();

    return exports;
    
  }

  function shrapnelExplosion(options, shrapnelOptions) {

    var localOptions, vX, vY, halfWidth;

    var vectorX, vectorY, i, angle, shrapnelCount, angleIncrement, explosionVelocity, explosionVelocityMax;

    shrapnelOptions = shrapnelOptions || {};

    localOptions = mixin({}, options);

    halfWidth = localOptions.width/2;

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

    angleIncrement = 180 / (shrapnelCount-1);

    for (i=0; i<shrapnelCount; i++) {

      explosionVelocity = Math.random() * explosionVelocityMax;

      vectorX = -explosionVelocity * Math.cos(angle * deg2Rad);
      vectorY = -explosionVelocity * Math.sin(angle * deg2Rad);

      localOptions.vX = (localOptions.vX * 0.5) + vectorX;
      localOptions.vY += vectorY;

      // bottom-aligned object? explode "up".
      if (localOptions.vY > 0 && options.bottomAligned) {
        localOptions.vY *= -1;
      }

      game.objects.shrapnel.push(new Shrapnel(localOptions));

      angle += angleIncrement;

    }
    
  }

  function Shrapnel(options) {

    var css, dom, data, collision, exports, type, types;

    types = 4;

    options = options || {};

    css = inheritCSS({
      className: 'shrapnel'
    });

    data = inheritData({
      type: 'shrapnel',
      frameCount: 0,
      animationModulus: 2,
      spriteType: parseInt(Math.random() * 4, 10),
      spriteFrame: 0,
      spriteFrames: 3,
      direction: 0,
      vX: options.vX || 0,
      vY: options.vY || 0,
      maxVY: 48,
      gravity: 1,
      width: 12,
      height: 12,
      hostile: true,
      damagePoints: 0.75
    }, options);

    dom = {
      o: null
    }

    function animate() {

      if (!data.dead) {

        if (data.frameCount % data.animationModulus === 0) {

          data.spriteFrame++;

          if (data.spriteFrame > data.spriteFrames) {
            data.spriteFrame = 0;
          }

          // TODO: use sub-sprite (double # of elements, bad?) and transform: translate3d(). May be faster.

          dom.o.style.backgroundPosition = (data.spriteType * -data.width) + 'px ' + (data.spriteFrame * -data.height) + 'px';

          // dom.o.style[features.transform.prop] = 'translate3d(' + (data.spriteType * -data.width) + 'px ' + (data.spriteFrame * -data.height) + 'px, 0px, 0px)';

        }

        moveTo(data.x + data.vX, data.y + (Math.min(data.maxVY, data.vY + data.gravity)));

        data.gravity *= 1.1;

        if (data.y - data.height >= 380) {
          moveTo(data.x + data.vX, 380);
          die();
        }

        // collision check
        collisionTest(collision, exports);

        data.frameCount++;

      }      

      return data.dead && !dom.o;

    }

    function moveTo(x, y) {

      if (x !== undefined && data.x !== x) {
        common.setTransformX(exports, x);
        data.x = x;
      }

      if (y !== undefined && data.y !== y) {
        common.setTransformY(exports, y);
        data.y = y;
      }

    }

    function hit(hitPoints) {
      if (!data.dead) {
        hitPoints = hitPoints || 1;
        data.energy -= hitPoints;
        if (data.energy <= 0) {
          data.energy = 0;
          die();
        }
      }
    }

    function dead() {
      if (data.dead && dom.o) {
        // utils.css.swap(dom.o, css.exploding, css.dead);
        utils.css.add(dom.o, css.dead);
      }
    }

    function die() {

      if (data.dead) {
        return false;
      }

      // timeout?
      window.setTimeout(function() {
        removeNodes(dom);
      }, 200);

      data.energy = 0;

      data.dead = true;

    }

    function hitAndDie(target) {

      if (target) {
        target.hit(data.damagePoints, exports);
      }

      die();

    }


    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      common.setTransformX(exports, data.x);
      common.setTransformY(exports, data.y);

      game.dom.world.appendChild(dom.o);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die
    }

    collision = {
      options: {
        source: exports,
        targets: undefined,
        hit: function(target) {
          hitAndDie(target);
        }
      },
      items: ['tanks', 'vans', 'missileLaunchers', 'infantry', 'parachuteInfantry', 'engineers', 'helicopters', 'smartMissiles', 'bunkers', 'balloons', 'turrets']
    }

    init();

    return exports;

  }

  function Smoke(options) {

    var css, dom, data, exports;

    options = options || {};

    css = inheritCSS({
      className: 'smoke'
    });

    data = inheritData({
      type: 'smoke',
      frameCount: 0,
      animateModulus: 2,
      spriteFrame: 0,
      spriteFrames: 10,
      direction: 0,
      width: 9,
      height: 10
    }, options);

    dom = {
      o: null
    }

    function animate() {

      if (data.frameCount % data.animateModulus === 0) {

        data.spriteFrame++;

        // advance smoke sprite
        dom.o.style.backgroundPosition = '0px -' + (data.height * data.spriteFrame) + 'px';

        if (data.spriteFrame > data.spriteFrames) {

          // animation finished
          die();

        }

      }

      data.frameCount++;

      return (data.dead && !dom.o);

    }

    function moveTo(x, y) {

      if (x !== undefined && data.x !== x) {
        common.setX(exports, x);
        data.x = x;
      }

      if (y !== undefined && data.y !== y) {
        common.setY(exports, y);
        data.y = y;
      }

    }

    function die() {

      if (data.dead) {
        return false;
      }

      removeNodes(dom);

      data.dead = true;

    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      common.setX(exports, data.x);
      common.setY(exports, data.y);

      game.dom.world.appendChild(dom.o);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom,
      die: die
    }

    init();

    return exports;

  }

  function trackObject(source, target, options) {

    // given a source object (the helicopter) and a target, return the relevant vX / vY delta to get progressively closer to the target.

    var deltaX, deltaY, vX, vY, result;

    options = options || {};

    // TODO: (target.data.x - target.data.halfWidth) results in helicopter being on left side. + target.data.halfWidth is screwy??

    // deltaX = target.data.x - source.data.x;

    deltaX = (target.data.x + target.data.halfWidth) - (source.data.x + source.data.halfWidth);

    // deltaX += target.data.halfWidth; // ?

    // by default, offset target to one side of a balloon.

    if (target.data.type === 'balloon') {

      if (target.data.x > source.data.x) {

        deltaX -= 150;

      } else {

        deltaX += 150;

      }

    }

    deltaY = target.data.y - source.data.y;

    deltaY = (target.data.y + target.data.halfHeight) - (source.data.y + source.data.halfHeight);

    result = {
      deltaX: deltaX,
      deltaY: deltaY
    }

    return result;

  }

  function getNearestObject(source, options) {

    // given a source object (the helicopter), find the nearest enemy in front of the source - dependent on X axis + facing direction.

    var i, j, k, l, objects, item, itemArray, items, localObjects, target, result, targetData, yBias, isInFront, useInFront;

    options = options || {};

    objects = game.objects;

    useInFront = (options.useInFront || null);

    // should a smart missile be able to target another smart missile? ... why not.
    items = (options.items || ['tanks', 'vans', 'missileLaunchers', 'helicopters', 'bunkers', 'balloons', 'smartMissiles', 'turrets']);

    localObjects = [];

    // if the source object isn't near the ground, be biased toward airborne items.
    if (source.data.type === 'helicopter' && source.data.y < game.objects.view.data.world.height - 100) {
      yBias = 1.5;
    }

    for (i=0, j=items.length; i<j; i++) {

      itemArray = objects[items[i]];

      for (k=0, l=itemArray.length; k<l; k++) {

        // potential target: not dead, and an enemy
        if (!itemArray[k].data.dead && itemArray[k].data.isEnemy !== source.data.isEnemy) {

          // is the target in front of the source?
          isInFront = (itemArray[k].data.x >= source.data.x);

          // [revised] - is the target within an acceptable range?
          // isInFront = (itemArray[k].data.x >= source.data.x || itemArray[k].data.x - source.data.x > -100);

          // additionally: is the helicopter pointed at the thing, and is it "in front" of the helicopter?
          if (!useInFront || (useInFront && (!source.data.rotated && isInFront) || (source.data.rotated && !isInFront))) {

            targetData = itemArray[k].data;

            localObjects.push({
              obj: itemArray[k],
              totalDistance: Math.abs(targetData.x) + Math.abs(source.data.x) + Math.abs(targetData.y * yBias) + Math.abs(source.data.y) * yBias
            });

          }

        }

      }

    }

    // sort by distance
    localObjects.sort(utils.array.compare('totalDistance'));

    if (localObjects.length) {

      // TODO: review and remove ugly hack here - enemy helicopter gets reverse-order logic.
      result = localObjects[source.data.type === 'helicopter' && source.data.isEnemy ? localObjects.length-1 : 0].obj;

    } else {

      result = null;

    }

    return result;

  }

  function objectInView(data, options) {

    // unrelated to other nearby functions: test if an object is on-screen (or slightly off-screen).

    var i, j, items, deltaX, result;

    options = options || {};

    // by default, 67% of screen width
    options.triggerDistance = options.triggerDistance || (game.objects.view.data.browser.width * 2/3);

    // by default, take helicopters if nothing else.
    items = game.objects[(options.items ? options.items : 'helicopters')];

    for (i=0, j=items.length; i<j; i++) {

      // how far away is the target?
      deltaX = (items[i].data.x > data.x ? items[i].data.x - data.x : data.x - items[i].data.x);

      if (!items[i].data.dead && deltaX < options.triggerDistance && (data.isEnemy !== items[i].data.isEnemy || items[i].data.isNeutral)) {

        result = items[i];

        break;

      }

    }

    return result;

  }

  function initNearby(nearby, exports) {

    // map options.source -> exports
    nearby.options.source = exports;

  }

  function nearbyTest(nearby) {

    var i, j, foundHit;

    // loop through relevant game object arrays
    // TODO: revisit for object creation / garbage collection improvements
    for (i=0, j=nearby.items.length; i<j; i++) {
      // ... and check them
      if (collisionCheckArray(mixin(nearby.options, { targets: game.objects[nearby.items[i]] }))) {
        foundHit = true;
      }
    }

    // callback for no-hit case, too
    if (!foundHit && nearby.options.miss) {
      nearby.options.miss(nearby.options.source);
    }

  }

  function enemyHelicopterNearby(data, triggerDistance) {

    var i, j, deltaX, result;

    // by default, 67% of screen width
    triggerDistance = triggerDistance || (game.objects.view.data.browser.width * 2/3);

    for (i=0, j=game.objects.helicopters.length; i<j; i++) {

      // not cloaked, not dead, and an enemy?
      if (!game.objects.helicopters[i].data.cloaked && !game.objects.helicopters[i].data.dead && data.isEnemy !== game.objects.helicopters[i].data.isEnemy) {

        // how far away is the target?
        deltaX = (game.objects.helicopters[i].data.x > data.x ? game.objects.helicopters[i].data.x - data.x : data.x - game.objects.helicopters[i].data.x);

        if (deltaX < triggerDistance) {

          result = game.objects.helicopters[i];

          break;

        }

      }

    }

    return result;

  }

  function collisionTest(collision, exports) {

    var i, j;

    // hack: first-time run fix, as exports is initially undefined
    if (!collision.options.source) {
      collision.options.source = exports;
    }

    // loop through relevant game object arrays
    for (i=0, j=collision.items.length; i<j; i++) {
      // ... and check them
      // TODO: revisit for object creation / garbage collection improvements
      collisionCheckArray(mixin(collision.options, {
        targets: game.objects[collision.items[i]]
      }));
    }

  }

  function collisionCheckArray(options) {

    /**
     * options = {
     *   source: object (eg., game.objects.gunfire[0]);
     *   targets: array (eg., game.objects.tanks)
     * }
     */

    var item, objects, data1, data2, xLookAhead, foundHit;

    if (!options) {
      return false;
    }

    // don't check if the object is dead. If it's expired, only allow the object if it's also "hostile" (can still hit things)
    if (options.source.data.dead || (options.source.data.expired && !options.source.data.hostile)) {
      return false;
    }

    // is this a "lookahead" (nearby) case? buffer the x value, if so. Armed vehicles use this.

    if (options.useLookAhead) {

      // friendly things move further right, enemies move further left.

      xLookAhead = (Math.min(16, options.source.data.xLookAhead || (options.source.data.width * 0.33)) * (options.source.data.isEnemy ? -1 : 1));

    } else {

      xLookAhead = 0;

    }

    data1 = options.source.data;

    objects = options.targets;

    for (item in objects) {

      // non-standard formatting, lengthy logic check here...
      if (

        objects.hasOwnProperty(item)

        // don't compare the object against itself
        && objects[item] !== options.source

        // ignore dead objects (unless a turret, which can be reclaimed / repaired by engineers)
        && (!objects[item].data.dead || (objects[item].data.type === 'turret' && data1.type === 'infantry' && data1.role))

        // more non-standard formatting....
        && (
          // don't check against friendly units
          (objects[item].data.isEnemy !== options.source.data.isEnemy)
          // unless infantry vs. bunker, end-bunker or helicopter
          || (data1.type === 'infantry' && objects[item].data.type === 'bunker')
          || (data1.type === 'end-bunker' && objects[item].data.type === 'infantry' && !objects[item].data.role)

          || (data1.type === 'helicopter' && objects[item].data.type === 'infantry')
          // OR engineer vs. turret
          || (data1.type === 'infantry' && data1.role && objects[item].data.type === 'turret')
          // OR we're dealing with a hostile or neutral object
          || (data1.hostile || objects[item].data.hostile)
          || (data1.isNeutral || objects[item].data.isNeutral)
        )

        // ignore if both objects are hostile, i.e., free-floating balloons (or missiles)
        && ((!data1.hostile || !objects[item].data.hostile) || (data1.hostile !== objects[item].data.hostile))

      ) {

        data2 = objects[item].data;

        hit = collisionCheck(data1, data2, xLookAhead);

        if (hit) {

          foundHit = true;

          if (options.hit) {
            options.hit(objects[item]);
          }

        }

      }

    }

    return foundHit;

  }

  function bottomAlignedY(y) {

    // correct bottom-aligned Y value
    return 370 - 2 - (y || 0);

  }

  var domPoint1, domPoint2;

  domPoint1 = document.createElement('div');
  domPoint1.className = 'collision-check-1';

  domPoint2 = document.createElement('div');
  domPoint2.className = 'collision-check-2';


  function collisionCheck(point1, point2, point1XLookAhead) {

    /**
     * given x, y, width and height, determine if one object is overlapping another.
     * additional hacky param: X-axis offset for object. Used for cases where tanks etc. need to know when objects are nearby.
     * provided as an override because live objects are passed directly and can't be modified (eg., data1.x += ...).
     * cloning these objects via mixin() works, but then lot of temporary objects are created, leading to increased garbage collection.
     */

    if (!point1 || !point2) {
      return null;
    }

    // presume each object has x, y, width, height - otherwise, all hell will break loose.

    // given two boxes, check for intersects.
    var result;

    var d1, d2;

    // var width, height;

    if (0) {

      d1 = domPoint1.cloneNode(false);
      d2 = domPoint2.cloneNode(false);

      d1.style.width = point1.width + 'px';
      d1.style.height = point1.height + 'px';
      d1.style.left = (point1.x) + 'px';
      d1.style.top = point1.y + 'px';

      d2.style.width = point2.width + 'px';
      d2.style.height = point2.height + 'px';
      d2.style.left = (point2.x) + 'px';
      d2.style.top = point2.y + 'px';

      game.dom.world.appendChild(d1);
      game.dom.world.appendChild(d2);

    }

    if (point2.x >= point1.x + point1XLookAhead) {

      // point 2 is to the right.

      if (point1.x + point1XLookAhead + point1.width >= point2.x) {

        // point 1 overlaps point 2 on x.

        // width = point2.x - (point1.x + point1XLookAhead + point1.width);

        if (point1.y < point2.y) {

          // point 1 is above point 2.

          if (point1.y + point1.h >= point2.y) {

            // point 1 overlaps point 2 on y.
            result = true;

            // height = point2.y - (point1.y + point1.h);

          }

        } else {

          result = (point1.y < point2.y + point2.height);

          // height = (point2.y + point2.height) - point1.y;

        }

      }

    } else {

      // point 1 is to the right.

      if (point2.x + point2.width >= point1.x + point1XLookAhead) {

        // point 2 overlaps point 1 on x.

        // width = point1.x - (point2.x + point1XLookAhead + point2.width);

        if (point2.y < point1.y) {

          // point 2 is above point 1.
          result = (point2.y + point2.height >= point1.y);

          // height = point1.y - (point2.height + point2.y);

        } else {

          // point 2 is below point 1.
          result = (point1.y + point1.height >= point2.y);

          // height = point2.y - (point1.y + point1.height);

        }

      } else {

        // no overlap?
        result = false;

      }

    }

/*
    if (width && height) {
      console.log(width, height);
    }
*/
    return result;

  }

  function collisionCheckMidPoint(obj1, obj2) {

    // infantry-at-midpoint (bunker or helicopter) case
    return collisionCheck(obj1.data.midPoint, obj2.data, 0);

  }

  function getDoorCoords(obj) {

    // for special collision check case with bunkers

    var door, result;

    door = {
      width: 5,
      height: obj.data.height, // HACK: should be ~9px, figure out why true height does not work.
      halfWidth: 2.5
    };

    result = {
      width: door.width,
      height: door.height,
      // slight offset on X, don't subtract door half-width
      x: parseInt(obj.data.x + obj.data.halfWidth + door.halfWidth + 2, 10),
      y: parseInt(obj.data.y + obj.data.height - door.height, 10)
    };

    return result;

  }

  function removeNodeArray(nodeArray) {
    for (var i=0, j=nodeArray.length; i<j; i++) {
      nodeArray[i].parentNode.removeChild(nodeArray[i]);
      nodeArray[i] = null;
    }
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
          dom[item].parentNode.removeChild(dom[item]);
        }
        dom[item] = null;
      }
    }

  }

  // recycled from survivor.js

  keyboardMonitor = (function KeyboardMonitor() {

    var keys,
        events,

       // hash for keys being pressed
       downKeys = {},

       // meaningful labels for key values
       keyMap = {
         'shift': 16,
         'ctrl': 17,
         'space': 32,
         'left': 37,
         'up': 38,
         'right': 39,
         'down': 40,
         'missileLauncher': 77,
         'tank': 84,
         'van': 86,
         'infantry': 73,
         'engineer': 69
         // 'helicopter': 72
       };

    events = {

      keydown: function(e) {

        // console.log(e.keyCode);

        if (keys[e.keyCode] && keys[e.keyCode].down) {
          if (downKeys[e.keyCode] === undefined) {
            downKeys[e.keyCode] = true;
            keys[e.keyCode].down(e);
          }
          if (keys[e.keyCode].allowEvent === undefined) {
            return stopEvent(e);
          }
        }

      },

      keyup: function(e) {

        if (downKeys[e.keyCode] !== undefined && keys[e.keyCode]) {
          delete downKeys[e.keyCode];
          if (keys[e.keyCode].up) {
            keys[e.keyCode].up(e);
          }
          if (keys[e.keyCode].allowEvent === undefined) {
            return stopEvent(e);
          }
        }

      }

    };

    keys = {

      // NOTE: Each function gets an (e) event argument.

      // shift
      '16': {

        allowEvent: true, // don't use stopEvent()

        down: function() {

          game.objects.helicopters[0].setFiring(true);

        }/*,

        up: function() {

          game.objects.helicopters[0].setFiring(false);

        }*/

      },

      // ctrl (alternate for shift key)
      '17': {

        allowEvent: true, // don't use stopEvent()

        down: function() {

          game.objects.helicopters[0].setBombing(true);

        }/*,
        
        up: function() {

          game.objects.helicopters[0].setBombing(false);

        }*/

      },

      // space bar
      '32': {

        down: function() {

          game.objects.helicopters[0].setParachuting(true);

        },

        up: function() {

          game.objects.helicopters[0].setParachuting(false);

        }

      },

      // left
      '37': {

        down: function() {

          // game.objects.ship.thrust(-1, 0);

        },


        up: function() {

          // game.objects.ship.endThrust();

        }

      },

      // up
      '38': {

        down: function() {

          // game.objects.ship.thrust(0, -1);

        },


        up: function() {

          // game.objects.ship.endThrust();

        }

      },

      // right
      '39': {

        down: function() {

          // game.objects.ship.thrust(1, 0);

        },


        up: function() {

          // game.objects.ship.endThrust();

        }

      },

      // down
      '40': {

        down: function() {

          // game.objects.ship.thrust(0, 1);

        },


        up: function() {

          // game.objects.ship.endThrust();

        }

      },

      // "m"
      '77': {

        down: function(e) {

          game.objects.inventory.order('missileLauncher', { isEnemy: e.shiftKey });

        }

      },

      // "t"
      '84': {

        down: function(e) {

          game.objects.inventory.order('tank', { isEnemy: e.shiftKey });

        }

      },

      // "v"
      '86': {

        down: function(e) {

          game.objects.inventory.order('van', { isEnemy: e.shiftKey });

        }

      },

      // "x"
      '88': {

        down: function(e) {

          game.objects.helicopters[0].setMissileLaunching(true);

        },

        up: function() {

          game.objects.helicopters[0].setMissileLaunching(false);

        }

      },

      // "e"
      '69': {

        down: function(e) {

          game.objects.inventory.order('engineer', { isEnemy: e.shiftKey });

        }

      },

      // "i"
      '73': {

        down: function(e) {

          game.objects.inventory.order('infantry', { isEnemy: e.shiftKey });

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
        if (downKeys.hasOwnProperty(item)) {
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

    function init() {

      attachEvents();

    }

    return {

      init: init,
      isDown: isDown,
      releaseAll: releaseAll

    };

  }());

  function addItem(className, x) {

    var node = makeSprite({
      className: className
    });

    if (x) {
      node.style.left = x + 'px';
    }

    game.dom.world.appendChild(node);

    return node;

  }

/*
  var domPoint1 = document.createElement('div');
  domPoint1.className = 'collision-check-1';

  var domPoint2 = document.createElement('div');
  domPoint2.className = 'collision-check-2';
*/

  function init() {

    game.init();

    keyboardMonitor.init();

/*
    document.getElementById('world').appendChild(domPoint1);
    document.getElementById('world').appendChild(domPoint2);
*/

    // addItem('end-bunker', 8);

    // addItem('base', 64);

    addItem('cactus', 355);

    addItem('tree', 660);

    addItem('palm-tree', 720);

    addItem('right-arrow-sign', 312);

    addItem('barb-wire', 318);

    // addItem('base-landing-pad', 190);

    addItem('checkmark-grass', 394);

    addItem('flower', 576);

    addItem('flowers', 620);

    // addItem('base-landing-pad', 7800);

    // addItem('base', 8000);

    // addItem('end-bunker', 8192 - 48);

    function updateStats() {

      var c1, c2;

      c1 = document.getElementById('top-bar').querySelectorAll('.sprite').length;
      c2 = document.getElementById('battlefield').querySelectorAll('.sprite').length;

      window.setTimeout(updateStats, 5000);

    }

    if (window.location.toString().match(/profil/i)) {

      updateStats();

    }

  }

  exports = {
    init: init
  }

  window.aa = exports;

  soundManager.audioFormats.mp3.required = false;

  soundManager.setup({
    flashVersion: 9,
    preferFlash: false,
    debugMode: false
  });

  if (window.location.toString().match(/mute/i)) {
    soundManager.disable();
  }

  setTimeout(aa.init, 500);

}(window));