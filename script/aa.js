(function(window) {

/*

                    MMM   MMMM?MN   ZMMMM  MMMMM  MMMM  MMMMMMMM       MMM   MMMMMZ   MMMMMM   MMMM MMM MMMM MMMM       
         D         MMMM   DMMM+MMM  $MMMM  MMMM MMMMMMMD MMMM MMM      MMMM  ZMMMM     MMMM     MMM NMM MMMM DMN        
       MM   M      MMMM    MMM MMM:  MMMM  MMMM MMM  MMM MMMM MMM     MMMMM   MMMM     MMMM     MMM  MM  MMM =M         
 M   MMMMMMMM      MMMMM   MMM MMMM  MMMMMMMMMM MMM  MMM MMMM MMM     MNMMM   MMMM     MMMM     MMM      MMMM~M         
 M  MMMMMMMMM      MMMMM   MMM MMM:  MMMMMMMMMM MMM  MMM MMMM MMM     M7MMM   MMMM     MMMM     MMM MM    MMMM          
 MMMMMMMMMMM      MM MMM   MMM?MM    MMMMN MMMM MMM  MMM MMMM MM     8M MMM   MMMM     MMMM     MMMMMM    MMMM          
      .  ,        MM MMMN  MMM?MMM   MMMM  MMMM MMM  MMM MMMMMMMM    MM MMMM  MMMM     MMMM     MMM MM    MMMM          
                  M MMMMN  MMM MMMM  MMMM  MMMM MMM  MMM MMMM MMM    MMNMMMM  MMMM   M MMMM   M MMM       MMMM          
                 8M  MMMM  MMM MMMM  MMMM  MMMM MMM  MMM MMMM MMM    M  MMMM  MMMM  MM MMMM  MM MMM  MM   MMMM          
                 MM  MMMM DMMM7MMMMM MMMM  MMMM  MMMMMM  MMMM MMMM  DMD MMMM 8MMMMNMMM MMMMNMMM MMM MMM   MMMM          
                 MM  MMMM MMMM$ MMM  MMMM  MMMM    MM    MMMM  MN   MMM MMMM 8MMMMMMMM MMMMMMM MMMM MMM   MMMM          

*/

  var game, utils;

  var FPS = 24;
  var FRAMERATE = 1000/FPS;

  var winloc = window.location.href.toString();

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

      return {
        compare: compare
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

    return features;

  }());

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
    missileLaunch: null
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

    var data, defaults, dom, events, objects, keyboardMonitor, exports;

    // inherited by vehicle objects
    defaults = {
      css: {
        dead: 'dead',
        enemy: 'enemy',
        exploding: 'exploding'
      }
    }

    dom = {
      world: null
    }

    objects = {
      gameLoop: null,
      view: null,
      balloons: [],
      bunkers: [],
      engineers: [],
      infantry: [],
      missileLaunchers: [],
      tanks: [],
      vans: [],
      helicopters: [],
      smartMissiles: [],
      bases: [],
      radar: null,
      inventory: null
    }

    function createObjects() {

      objects.gameLoop = new GameLoop();

      objects.view = new View();

      objects.radar = new Radar();

      objects.inventory = new Inventory();

      objects.bases.push(new Base());

      objects.bases.push(new Base({
        isEnemy: true
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

      enemyCopter.rotate();

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
      defaults: defaults,
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

    return mixin(game.defaults.css, options);

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

    var data, dom, events, exports;

    data = {
      browser: {
        width: 0,
        fractionWidth: 0,
        halfWidth: 0,
        height: 0,
      },
      mouse: {
        x: 0,
        y: 0,
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
        scrollLeftVX: 0
      },
      topBar: {
        height: 0
      },
      maxScroll: 6
    }

    dom = {
      battleField: null,
      topBar: null
    }

    events = {

      mousedown: function(e) {
        // fire ze machine gun!!
        if (game.objects.helicopters && game.objects.helicopters[0]) {
          game.objects.helicopters[0].setFiring(true);
        }
        e.preventDefault();
        return false;
      },

      mouseup: function(e) {
        // stop firing ze machine gun!!
        if (game.objects.helicopters && game.objects.helicopters[0]) {
          game.objects.helicopters[0].setFiring(false);
        }
        e.preventDefault();
        return false;
      },

      mousemove: function(e) {
        data.mouse.x = (e||event).clientX;
        data.mouse.y = (e||event).clientY;
      },

      resize: function() {
        // throttle?
        refreshCoords();
      }

    }

    function resetLeftScroll(x) {

      data.battleField.scrollLeft = x;
      dom.battleField.scrollLeft = data.battleField.scrollLeft;

    }

    function setLeftScroll(x) {

      // scroll the battlefield.
      data.battleField.scrollLeftVX = x;
      data.battleField.scrollLeft = Math.max(-(data.browser.width/2), Math.min(data.battleField.width - (data.browser.width/2), data.battleField.scrollLeft + x));

      dom.worldWrapper.style.backgroundPosition = (-data.battleField.scrollLeft * 0.1) + 'px 0px';

      // dom.battleField.scrollLeft = data.battleField.scrollLeft;
      dom.battleField.style.marginLeft = -data.battleField.scrollLeft + 'px';

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

      data.browser.width = window.innerWidth;
      data.browser.height = window.innerHeight;

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

    }

    function addEvents() {

      utils.events.add(window, 'resize', events.resize);
      utils.events.add(document, 'mousemove', events.mousemove);
      utils.events.add(document, 'keydown', events.keydown);

    }

    function initDOM() {

      dom.worldWrapper = document.getElementById('world-wrapper');
      dom.battleField = document.getElementById('battlefield');
      dom.topBar = document.getElementById('top-bar');

    }

    function init() {

      initDOM();

      addEvents();

      resetLeftScroll(0);

      refreshCoords();

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

    var css, data, dom, exports;

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

    dom = {
      gameStatusBar: null
    }

    function animate() {

      data.frameCount++;

      if (data.frameCount >= 0 && data.building) {

        utils.css.remove(dom.gameStatusBar, css.building);

        // "Construction complete."
        data.building = false;

        // play sound?
        if (sounds.inventory.end) {
          sounds.inventory.end.play();
        }

      }

    }

    function createObject(typeData, options) {

      // create and append a new (something) to its appropriate array.

      var orderObject;

      orderObject = new typeData[1](options);

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

        typeData = data.types[type];

        // infantry or engineer? handle those specially.

        if (type === 'infantry') {

          orderSize = 5;

        } else if (type === 'engineer') {

          orderSize = 2;

        }

        if (orderSize < 2) {

          // single-item order.
          orderObject = createObject(typeData, options);

          // make one for the bad guy, too
          // createObject(typeData, mixin(options, {x: 8192 - 64, isEnemy: true}));

        } else {

          // make the first one immediately.
          orderObject = createObject(typeData, options);

          // multiples. note 1 offset.
          for (i=1; i<orderSize; i++) {

            // TODO: review, make smarter - queue-based off of data.frameCount % orderObject.data.inventory % frameCount === 0 and build a new item, instead of timeout-based.
            window.setTimeout(function() {
              createObject(typeData, options);
            }, orderObject.data.inventory.frameCount * FRAMERATE * i); // approximate framerate

          }
        
        }

        // reset the frame count, and re-enable building when it surpasses this object's "build time"
        // TODO: Don't play sounds if options.enemy set.
        data.frameCount = orderObject.data.inventory.frameCount * -1 * (orderSize > 1 ? orderSize + 1 : orderSize);

        // update the UI
        utils.css.add(dom.gameStatusBar, css.building);

        if (sounds.inventory.begin) {
          sounds.inventory.begin.play();
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

      data.frameCount++;

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

    }

    function RadarItem(options) {

      var css, data, dom, oParent, exports;

      css = {
        radarItem: 'radar-item'
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
          dom.o.style.display = 'none';
          data.dead = true;
          if (!options.canRespawn) {
            removeItem(exports);
          }
        }
      }

      function reset() {
        if (data.dead) {
          dom.o.style.display = 'block';
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
      dom.radar.style.visibility = (jam ? 'hidden' : 'visible');

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
          if (gameObjects[item].animate) {
            if (gameObjects[item].animate()) {
              // object is dead - take it out.
              gameObjects[item] = null;
            }
          } else {
            // array case
            for (i = gameObjects[item].length-1; i >= 0; i--) {
              if (gameObjects[item][i].animate()) {
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

  function Balloon(options) {

    var css, data, dom, objects, radarItem, exports;

    options = options || {};

    css = inheritCSS({
      className: 'balloon'
    });

    data = inheritData({
      bottomAligned: true, // TODO: review/remove
      type: 'balloon',
      canRespawn: false,
      energy: 3,
      defaultEnergy: 3,
      direction: 0,
      verticalDirection: 0.33,
      verticalDirectionDefault: 0.33,
      leftMargin: options.leftMargin || 0,
      width: 36,
      height: 14,
      deadTimer: null
    }, options);

    dom = {
      o: null
    }

    objects = {
      bunker: options.bunker || null
    }

    function animate() {

      if (!data.dead) {

        if ((data.bottomY > 100 && data.verticalDirection > 0) || (data.bottomY < 0 && data.verticalDirection < 0)) {
          data.verticalDirection *= -1;
        }

        moveTo(data.x, data.bottomY + data.verticalDirection);

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
        setX(x);
        data.x = x;
      }

      if (bottomY !== undefined && data.bottomY !== bottomY) {

        setY(bottomY);

        data.bottomY = bottomY;

        // special handling for balloon case
        // TODO: fix this
        data.y = game.objects.view.data.battleField.height - data.height - (280 * (bottomY / 100));
      }

    }

    function setX(x) {
      dom.o.style.left = (x + 'px');
    }

    function setY(bottomY) {
      dom.o.style.bottom = ((280 * bottomY / 100) + 'px');
    }

    function setEnemy(isEnemy) {

      data.isEnemy = isEnemy;

      if (isEnemy) {
        utils.css.add(dom.o, css.enemy);
      } else {
        utils.css.remove(dom.o, css.enemy);
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

      if (data.canRespawn && data.dead && !objects.bunker.data.dead) {
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
      data.bottomY = 0;
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
      data.x = options.x; // (objects.bunker ? objects.bunker.data.x : 0);

      setX(data.x);

      data.bottomY = Math.random() * 100;
      data.y = bottomAlignedY(data.bottomY);

      game.dom.world.appendChild(dom.o);

      // TODO: review hacky "can respawn" parameter
      radarItem = game.objects.radar.addItem(exports, dom.o.className, true);

    }

    exports = {
      animate: animate,
      data: data,
      die: die,
      hit: hit,
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
      chainClassName: 'balloon-chain',
      burning: 'burning'
    });

    data = inheritData({
      type: 'bunker',
      bottomAligned: true,
      energy: 30,
      width: 51,
      halfWidth: 25,
      height: 25,
      infantryTimer: null
    }, options);

    dom = {
      o: null,
      oSubSprite: null,
      oChain: null
    }

    objects = {
      balloon: null
    }

    function animate() {
      // TODO: fix height: 0px case (1-pixel white border)
      dom.oChain.style.height = ((objects.balloon.data.bottomY / 100 * 280) - data.height - 6 + 'px');
    }

    function moveTo(x, bottomY) {

      if (x !== undefined && data.x !== x) {
        setX(x);
        data.x = x;
      }

      if (bottomY !== undefined && data.bottomY !== bottomY) {
        setY(bottomY);
        data.bottomY = bottomY;
        data.y = bottomAlignedY(data.bottomY);
      }

    }

    function setX(x) {
      dom.o.style.left = (x + 'px');
    }

    function setY(y) {
      dom.o.style.bottom = (y + 'px');
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
        if (!data.infantryTimer) {
          data.infantryTimer = window.setTimeout(function() {
            // oh, what a hack! apply this when the infantry is roughly at the entrance to the base.
            capture(target.data.isEnemy);
            target.die();
            data.infantryTimer = null;
          }, 1200);
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
      objects.balloon.setEnemy(isEnemy);

    }

    function repair() {

      // fix the balloon, if it's broken - or, rather, flag it for respawn.
      if (objects.balloon.data.dead) {
        objects.balloon.data.canRespawn = true;
      }

    }

    function die() {

      if (data.dead) {
        return false;
      }

      utils.css.add(dom.o, css.exploding);

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

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      dom.oSubSprite = makeSubSprite();

      dom.o.appendChild(dom.oSubSprite);

      dom.oChain = makeSprite({
        className: css.chainClassName
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      dom.o.appendChild(dom.oChain);

      objects.balloon = new Balloon({
        bunker: exports,
        leftMargin: 7,
        isEnemy: data.isEnemy,
        x: data.x
      });

      // push onto the larger array
      game.objects.balloons.push(objects.balloon);

      setX(data.x);

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    exports = {
      animate: animate,
      objects: objects,
      data: data,
      hit: hit,
      infantryHit: infantryHit,
      init: init
    }

    init();

    return exports;

  }

  function Base(options) {

    var data, exports;

    options = options || {};

    data = inheritData({
      type: 'base',
      bottomAligned: true,
      dead: false,
      frameCount: 0,
      fireModulus: 50,
      // left side, or right side (roughly)
      x: (options.isEnemy ? 8192 - 64: 64),
      y: 0,
      width: 102,
      height: 25
    }, options);

    function animate() {

      if (!data.dead) {

        data.frameCount++;

        if (data.frameCount % data.fireModulus === 0) {
          fire();
        }

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

    exports = {
      animate: animate
    }

    return exports;

  }

  function Paratrooper() {}

  function MissileLauncher(options) {

    var css, data, dom, radarItem, exports;

    options = options || {};

    css = inheritCSS({
      className: 'missile-launcher',
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
        setX(x);
        data.x = x;
      }

      if (bottomY !== undefined && data.bottomY !== bottomY) {
        setY(bottomY);
        data.bottomY = bottomY;
        data.y = bottomAlignedY(bottomY);
      }

    }

    function setX(x) {
      dom.o.style.left = (x + 'px');
    }

    function setY(bottomY) {
      dom.o.style.bottom = (bottomY + 'px');
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

      setX(data.x);
      setY(data.bottomY);

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

    init();

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
          sparkAndDie(target);
        }
      },
      items: ['tanks', 'vans', 'missileLaunchers', 'infantry', 'engineers', 'helicopters', 'smartMissiles']
    }

    // special case: tank gunfire should not hit bunkers.
    if (data.parentType !== 'tank') {
      collision.items.push('bunkers');
      // also, balloons aren't expected to be in range of tanks.
      collision.items.push('balloons');
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

      // hit top?
      if (data.y < game.objects.view.data.topBar.height) {
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
          target.hit(data.damagePoints);
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
        setX(x);
        data.x = x;
      }

      if (y !== undefined && data.y !== y) {
        setY(y);
        data.y = y;
      }

    }

    function setX(x) {
      dom.o.style.left = (x + 'px');
    }

    function setY(y) {
      dom.o.style.top = (y + 'px');
    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      setX(data.x);
      setY(data.y);

      game.dom.world.appendChild(dom.o);

    }

    init();

    exports = {
      animate: animate,
      data: data
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
      items: ['balloons', 'tanks', 'vans', 'missileLaunchers', 'infantry', 'engineers', 'bunkers', 'helicopters']
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
      if (data.y > game.objects.view.data.battleField.height) {
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
        setX(x);
        data.x = x;
      }

      if (y !== undefined && data.y !== y) {
        setY(y);
        data.y = y;
      }

    }

    function setX(x) {
      dom.o.style.left = (x + 'px');
    }

    function setY(y) {
      dom.o.style.top = (y + 'px');
    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      setX(data.x);
      setY(data.y);

      game.dom.world.appendChild(dom.o);

    }

    init();

    exports = {
      animate: animate,
      data: data
    }

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

    var css, dom, data, radarItem, objects, collision, exports, rad2Deg;

    rad2Deg = 180/Math.PI;

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
      // TODO: can also hit other smart missiles?
      items: ['tanks', 'vans', 'missileLaunchers', 'infantry', 'engineers', 'helicopters', 'bunkers', 'balloons', 'smartMissiles']
    }

    function animate() {

      var items, item, hit, tmpData, tmpObject, deltaX, deltaY, targetData, angle, hitBottom;

      if (data.dead) {
        return true;
      }

      targetData = objects.target.data;

      var targetHalfWidth = targetData.width / 2;
      var targetHalfHeight = targetData.height / 2;

      // delta of x/y between this and target
      deltaX = (targetData.x + targetHalfWidth) - data.x;
      deltaY = (targetData.y + targetHalfHeight) - data.y;

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

        data.vX += (deltaX >= 0 ? data.thrust : -data.thrust);

        if (deltaY <= targetData.height && deltaY >= -targetData.height) {
          // "lock on target"
          // data.vY *= 0.95;
          data.vY += (deltaY >= 0 ? data.thrust : -data.thrust) * 1.33;
        } else {
          data.vY += (deltaY >= 0 ? data.thrust : -data.thrust) * 1.33;
        }

      }

      // and throttle
      data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
      data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));

      hitBottom = moveTo(data.x + data.vX, data.y + data.vY + (data.expired ? data.gravity : 0));

      if (!hitBottom) {

        angle = Math.atan2(data.vY, data.vX) * rad2Deg;

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
        die();
      }

      collisionTest(collision, exports);

      // notify caller if now dead and can be removed.
      return (data.dead && !dom.o);

    }

    function moveTo(x, y) {

      var hitBottom = false;

      if (x !== undefined && data.x !== x) {
        setX(x);
        data.x = x;
      }

      // prevent from "crashing", only if not expiring and target is still alive
      if (!data.expired && !objects.target.data.dead && y >= data.yMax) {
        y = data.yMax;
        hitBottom = true;
      }

      if (y !== undefined && data.y !== y) {
        setY(y);
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

    function setX(x) {
      dom.o.style.left = (x + 'px');
    }

    function setY(y) {
      dom.o.style.top = (y + 'px');
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
        target.hit(data.damagePoints);
      }

      // and cleanup shortly.
      window.setTimeout(die, 250);

    }

    function dead() {
      if (data.dead && dom.o) {
        utils.css.swap(dom.o, css.spark, css.dead);
      }
    }

    function die() {

      if (!data.deadTimer) {

        utils.css.add(dom.o, css.spark);

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

      setX(data.x);
      setY(data.y);

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
      fuel: 100,
      fireModulus: 2,
      bombModulus: 6,
      fuelModulus: 40,
      fuelModulusFlying: 6,
      missileModulus: 12,
      radarJamming: 0,
      landed: true,
      rotated: false,
      rotateTimer: null,
      energy: 10,
      direction: 0,
      xMin: 0,
      xMax: null,
      yMin: 0,
      yMax: null,
      vX: 0,
      vXMax: 12,
      vY: 0,
      vyMin: 0,
      vYMax: 10,
      width: 48,
      height: 15,
      halfWidth: 24,
      halfHeight: 7,
      tilt: null,
      lastTiltCSS: null,
      tiltYOffset: 2
    }, options);

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
        if (!data.isEnemy && e.button === 0) {
          rotate();
        }
      },

      mouseup: function() {
        // setFiring(false);
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
          // console.log('helicopter hit something', target);
          die();
          // should the target die, too? ... probably do.
          target.hit(999);
        }
      },
      items: ['balloons', 'tanks', 'vans', 'missileLaunchers', 'bunkers', 'helicopters']
    }

    function animate() {

      // move according to delta between helicopter x/y and mouse, up to a max.

      var i, j, view, mouse, jamming = 0;

      view = game.objects.view;

      if (!data.isEnemy) {

        mouse = view.data.mouse;

        // only allow X-axis if not on ground...
        if (mouse.x) {
          // accelerate scroll vX, so chopper nearly matches mouse when scrolling
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

      // safety net: don't let chopper run on bottom of screen
      // TODO: or when on landing pad.
      if (data.y === 369) {
        data.landed = true;
        data.vX = 0;
        if (data.vY > 0) {
          data.vY = 0;
        }
      } else {
        data.landed = false;
      }

      if (!data.dead) {

        applyTilt();

        moveTo(data.x + data.vX, data.y + data.vY);

        collisionTest(collision, exports);

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

      burnFuel();

    }

    function burnFuel() {

      var frameCount, modulus;

      frameCount = game.objects.gameLoop.data.frameCount;

      modulus = (data.landed ? data.fuelModulus : data.fuelModulusFlying);

      if (frameCount % modulus === 0 && data.fuel > 0) {
        // burn!
        data.fuel -= 0.1;
        // update UI
        dom.fuelLine.style.width = (data.fuel + '%');
        if (data.fuel <= 0) {
          die();
        }
      }

    }

    function setFiring(state) {

      if (data.firing !== state) {
         data.firing = state;
      }

    }

    function setBombing(state) {

      if (data.bombing !== state) {
         data.bombing = state;
      }

    }

    function setMissileLaunching(state) {

      if (data.missileLaunching !== state) {
         data.missileLaunching = state;
      }

    }

    function applyTilt() {

      // L -> R / R -> L + foreward / backward

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

    function rotate() {

      // flip the helicopter so it's pointing R-L instead of the default R/L (toggle behaviour)

      // if not dead or landed, that is.
      if (data.dead || data.y <= 0) {
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

      if (sounds.helicopter.rotate) {
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

      if (x !== undefined) {
        x = Math.min(data.xMax, x);
        if (x && data.x !== x) {
          setX(x);
          data.x = x;
        }
      }

      if (y !== undefined) {
        y = Math.max(data.yMin, Math.min(data.yMax, y));
        if (data.y !== y) {
          setY(y);
          data.y = y;
        }
      }

    }

    function setX(x) {
      dom.o.style.left = (x + 'px');
    }

    function setY(y) {
      dom.o.style.top = (y + 'px');
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

      var tiltOffset, frameCount, missileTarget;

      frameCount = game.objects.gameLoop.data.frameCount;

      if (!data.firing && !data.bombing && !data.missileLaunching) {
        return false;
      }

      // TODO: decrement ammo, etc.

      if (data.firing && frameCount % data.fireModulus === 0) {

        tiltOffset = (data.tilt !== null ? data.tiltYOffset * data.tilt * (data.rotated ? -1 : 1) : 0);

        objects.gunfire.push(new GunFire({
          parentType: data.type,
          isEnemy: data.isEnemy,
          x: data.x + (data.rotated ? 0 : data.width) - 8,
          y: data.y + data.halfHeight + (data.tilt !== null ? tiltOffset + 2 : 0),
          vX: data.vX + 8 * (data.rotated ? -1 : 1),
          vY: data.vY + tiltOffset
        }));

        if (sounds.genericGunFire) {
          sounds.genericGunFire.play();
        }

      }

      if (data.bombing && frameCount % data.bombModulus === 0) {

        objects.bombs.push(new Bomb({
          isEnemy: data.isEnemy,
          x: data.x + data.halfWidth,
          y: data.y + data.height - 6,
          vX: data.vX
        }));

      }

      if (data.missileLaunching && frameCount % data.missileModulus === 0) {

        missileTarget = getNearbyEnemyObject(exports);

        if (missileTarget) {

          objects.smartMissiles.push(new SmartMissile({
            parentType: data.type,
            isEnemy: data.isEnemy,
            x: data.x + (data.rotated ? 0 : data.width) - 8,
            y: data.y + data.halfHeight, // + (data.tilt !== null ? tiltOffset + 2 : 0),
            target: missileTarget
            // vX: data.vX + 8 * (data.rotated ? -1 : 1)
          }));

        } else {

          // "unavailable" sound?
          if (sounds.inventory.denied) {
            sounds.inventory.denied.play();
          }

        }

      }

    }

    function die() {

      if (data.dead) {
        return false;
      }

      utils.css.add(dom.o, css.exploding);

      // timeout?
      window.setTimeout(function() {
        utils.css.add(dom.o, css.dead);
      }, 500);

      data.energy = 0;

      data.dead = true;

      if (sounds.genericExplosion) {
        sounds.genericExplosion.play();
      }

      // radarItem.die();

      // temporary: unlimited respawn.
      window.setTimeout(reset, 3000);

    }

    function reset() {

      data.energy = 10;
      updateHealth();

      if (data.isEnemy) {
        data.x = 8192 - 64;
      } else {
        data.vX = 0;
        data.vY = 0;
      }

      setX(data.x);
      setY(data.y);

      utils.css.remove(dom.o, css.exploding);
      utils.css.remove(dom.o, css.dead);

      data.dead = false;

    }

    function init() {

      dom.o = makeSprite({
        className: css.className + (data.isEnemy ? ' ' + css.enemy : '')
      });

      dom.oSubSprite = makeSubSprite();

      dom.o.appendChild(dom.oSubSprite);

      dom.fuelLine = document.getElementById('fuel-line');

      setX(data.x);
      setY(data.y);

      game.dom.world.appendChild(dom.o);

      // attach events?

      if (options.attachEvents) {

        utils.events.add(game.dom.world, 'mousedown', events.mousedown);
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
      rotate: rotate,
      setBombing: setBombing,
      setFiring: setFiring,
      setMissileLaunching: setMissileLaunching
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
          stop();
        },
        miss: function() {
          // resume moving, stop firing.
          resume();
        }
      },
      // who gets fired at?
      items: ['tanks', 'vans', 'missileLaunchers', 'infantry', 'engineers', 'helicopters'],
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
        setX(x);
        data.x = x;
      }

      if (bottomY !== undefined && data.bottomY !== bottomY) {
        setY(bottomY);
        data.bottomY = bottomY;
        data.y = bottomAlignedY(bottomY);
      }

    }

    function setX(x) {
      dom.o.style.left = (x + 'px');
    }

    function setY(bottomY) {
      dom.o.style.bottom = (bottomY + 'px');
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

      setX(data.x);
      setY(data.bottomY);

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

    init();

    return exports;

  }

  function Van(options) {

    var css, dom, data, radarItem, exports;

    options = options || {};

    css = inheritCSS({
      className: 'van',
    });

    data = inheritData({
      type: 'van',
      bottomAligned: true,
      frameCount: 0,
      radarJammerModulus: 50,
      jamming: false,
      energy: 1,
      direction: 0,
      vX: (options.isEnemy ? -1 : 1),
      width: 38,
      height: 16,
      inventory: {
        frameCount: 50,
        cost: 5
      },
      // if the van reaches the enemy base, it's game over.
      xGameOver: (options.isEnemy ? 256 : game.objects.view.data.battleField.width - 256)
    }, options);

    dom = {
      o: null
    }

    function animate() {

      var enemyHelicopter;

      if (!data.dead) {

        data.frameCount++;

        moveTo(data.x + data.vX, data.bottomY);

        if (data.isEnemy && data.x <= data.xGameOver) {

          // Game over, man, game over! (Enemy wins.)
          console.log('The enemy has won the battle.');

        } else if (!data.isEnemy && data.x >= data.xGameOver) {

          // player wins
          console.log('You have won the battle.');

        } else {

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

      }      

      return data.dead;

    }

    function moveTo(x, bottomY) {

      if (x !== undefined && data.x !== x) {
        setX(x);
        data.x = x;
      }

      if (bottomY !== undefined && data.bottomY !== bottomY) {
        setY(bottomY);
        data.bottomY = bottomY;
        data.y = bottomAlignedY(bottomY);
      }

    }

    function setX(x) {
      dom.o.style.left = (x + 'px');
    }

    function setY(y) {
      dom.o.style.bottom = (y + 'px');
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

      setX(data.x);
      setY(data.bottomY);

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
      direction: 0,
      width: 10,
      height: 11,
      gunYOffset: 9,
      fireModulus: 10,
      vX: (options.isEnemy ? -1 : 1),
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
          // stop moving, start firing.
          stop();
        },
        miss: function() {
          // resume moving, stop firing.
          resume();
        }
      },
      // who gets fired at?
      items: ['tanks', 'vans', 'missileLaunchers', 'infantry', 'engineers', 'helicopters'],
      targets: []
    }

    collision = {
      options: {
        source: exports, // initially undefined
        targets: undefined,
        hit: function(target) {
          // bunker might kill this infantry unit, etc.
          target.infantryHit(exports);
        }
      },
      items: ['bunkers']
    }


    function animate() {

      data.frameCount++;

      if (!data.dead) {

        if (!data.stopped) {

          moveTo(data.x + data.vX, data.bottomY);

        } else {

          // only fire (i.e., GunFire objects) when stopped
          fire();

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

      return (data.dead && !dom.o && !objects.gunfire.length);

    }

    function fire() {

      if (data.frameCount % data.fireModulus === 0) {

        objects.gunfire.push(new GunFire({
          parentType: data.type,
          isEnemy: data.isEnemy,
          x: data.x + ((data.width + 1) * (data.isEnemy ? 0 : 1)),
          y: game.objects.view.data.world.height - data.gunYOffset, // half of infantry height
          vX: data.vX, // same velocity
          vY: 0
        }));

      }

    }

    function moveTo(x, bottomY) {

      if (x !== undefined && data.x !== x) {
        setX(x);
        data.x = x;
      }

      if (bottomY !== undefined && data.bottomY !== bottomY) {
        setY(bottomY);
        data.bottomY = bottomY;
        data.y = bottomAlignedY(bottomY);
      }

    }

    function setX(x) {
      dom.o.style.left = (x + 'px');
    }

    function setY(bottomY) {
      dom.o.style.bottom = (bottomY + 'px');
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

    function die() {

      if (data.dead) {
        return false;
      }

      utils.css.add(dom.o, css.exploding);

      // timeout?
      window.setTimeout(function() {
        removeNodes(dom);
        radarItem.die();
      }, 1200);

      data.energy = 0;

      data.dead = true;

/*
      if (sounds.genericExplosion) {
        sounds.genericExplosion.play();
      }
*/

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

      setX(data.x);
      setY(data.bottomY);

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

    init();

    return exports;

  }

  function Engineer(options) {

    options = options || {};

    // flag as an engineer
    options.role = 1;

    return new Infantry(options);

  }

  function getNearbyEnemyObject(source) {

    // given a source object (the helicopter), find the nearest enemy in front of the source - dependent on X axis + facing direction.

    var i, j, k, l, objects, item, itemArray, items, localObjects, target, result, targetData, yBias, isInFront;

    objects = game.objects;

    // should a smart missile be able to target another smart missile? ... why not.
    items = ['tanks', 'vans', 'missileLaunchers', 'helicopters', 'bunkers', 'balloons', 'smartMissiles'];

    localObjects = [];

    // if the source object isn't near the ground, be biased toward airborne items.
    if (source.data.y < game.objects.view.data.world.height - 100) {
      yBias = 1.5;
    }

    for (i=0, j=items.length; i<j; i++) {

      itemArray = objects[items[i]];

      for (k=0, l=itemArray.length; k<l; k++) {

        // potential target: not dead, and an enemy
        if (!itemArray[k].data.dead && itemArray[k].data.isEnemy !== source.data.isEnemy) {

          // is the target in front of the source?
          isInFront = (itemArray[k].data.x >= source.data.x);

          // additionally: is the helicopter pointed at the thing, and is it "in front" of the helicopter?
          if ((!source.data.rotated && isInFront) || (source.data.rotated && !isInFront)) {

            targetData = itemArray[k].data;

            localObjects.push({
              obj: itemArray[k],
              totalDistance: Math.abs(targetData.x) + Math.abs(source.data.x) + Math.abs(targetData.y * yBias) + Math.abs(source.data.y) * yBias
            });

          }

        }

      }

    }

    // sort by distance, first item being the closest.
    localObjects.sort(utils.array.compare('totalDistance'));

    if (localObjects.length) {

      result = localObjects[0].obj;

    } else {

      result = null;

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

      // how far away is the target?
      deltaX = (game.objects.helicopters[i].data.x > data.x ? game.objects.helicopters[i].data.x - data.x : data.x - game.objects.helicopters[i].data.x);

      if (!game.objects.helicopters[i].data.dead && data.isEnemy !== game.objects.helicopters[i].data.isEnemy && deltaX < triggerDistance) {

        result = game.objects.helicopters[i];

        break;

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
      // data1.x += (Math.max(16, options.source.data.width * 0.33) * (options.source.data.isEnemy ? -1 : 1));
      xLookAhead = (Math.max(16, options.source.data.width * 0.33) * (options.source.data.isEnemy ? -1 : 1));
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

        // ignore dead objects,
        && !objects[item].data.dead

        // don't check against friendly units, unless infantry vs. bunker, OR we're dealing with a "hostile" object (dangerous to both sides)
        && ((objects[item].data.isEnemy !== options.source.data.isEnemy) || (data1.type === 'infantry' && objects[item].data.type === 'bunker') || (data1.hostile || objects[item].data.hostile))

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
        if (point1.y < point2.y) {
          // point 1 is above point 2.
          if (point1.y + point1.h >= point2.y) {
            // point 1 overlaps point 2 on y.
            result = true;
          }
        } else {
          result = (point1.y < point2.y + point2.height);
        }
      }

    } else {

      // point 1 is to the right.

      if (point2.x + point2.width >= point1.x + point1XLookAhead) {
        // point 2 overlaps point 1 on x.
        if (point2.y < point1.y) {
          // point 2 is above point 1.
          result = (point2.y + point2.height >= point1.y);
        } else {
          // point 2 is below point 1.
          result = (point1.y + point1.height >= point2.y);
        }
      } else {
        // no overlap?
        result = false;
      }

    }

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

        },

        up: function() {

          game.objects.helicopters[0].setFiring(false);

        }

      },

      // ctrl (alternate for shift key)
      '17': {

        allowEvent: true, // don't use stopEvent()

        down: function() {

          game.objects.helicopters[0].setBombing(true);

        },

        up: function() {

          game.objects.helicopters[0].setBombing(false);

        }

      },

      // space bar
      '32': {

        down: function() {

          game.objects.helicopters[0].setMissileLaunching(true);

        },

        up: function() {

          game.objects.helicopters[0].setMissileLaunching(false);

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

    addItem('end-bunker', 8);

    addItem('base', 64);

    addItem('cactus', 355);

    addItem('tree', 660);

    addItem('palm-tree', 720);

    addItem('right-arrow-sign', 312);

    addItem('barb-wire', 318);

    addItem('base-landing-pad', 190);

    addItem('checkmark-grass', 394);

    addItem('flower', 576);

    addItem('flowers', 620);

    addItem('base-landing-pad', 7800);

    addItem('base', 8000);

    addItem('end-bunker', 8192 - 48);

    function updateStats() {

      var c1, c2;

      c1 = document.getElementById('top-bar').querySelectorAll('.sprite').length;
      c2 = document.getElementById('battlefield').querySelectorAll('.sprite').length;

      console.log('bar, world: ' + c1 + ', ' + c2);      

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