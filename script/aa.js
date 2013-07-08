(function(window) {

  var game, utils;

  utils = {

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

  var hasSound = false;

  var sounds = {
    helicopter: {
      bomb: null,
      rotate: null
    },
    inventory: {
      begin: null,
      end: null
    }
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
      volume: 20
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
      radar: null,
      inventory: null
    }

    function createObjects() {

      objects.gameLoop = new GameLoop();

      objects.view = new View();

      objects.radar = new Radar();

      objects.inventory = new Inventory();

      objects.bunkers.push(new Bunker({
        x: 1024,
        isEnemy: true
      }));

      objects.bunkers.push(new Bunker({
        x: 1536
      }));

      objects.bunkers.push(new Bunker({
        x: 2048
      }));

      objects.bunkers.push(new Bunker({
        x: 2560
      }));

      objects.bunkers.push(new Bunker({
        x: 3072
      }));

      // mid-level

      objects.bunkers.push(new Bunker({
        x: 4608,
        isEnemy: true
      }));

      objects.bunkers.push(new Bunker({
        x: 5120,
        isEnemy: true
      }));

      objects.bunkers.push(new Bunker({
        x: 5632,
        isEnemy: true
      }));

      // near-end / enemy territory

      objects.bunkers.push(new Bunker({
        x: 6656,
        isEnemy: true
      }));

      // enemy base

      node = makeSprite({
        className: 'right-arrow-sign'
      });

      node.style.left = '7656px';

      game.dom.world.appendChild(node);

      //

      objects.tanks.push(new Tank({
        x: 96
      }));

var testTank = objects.tanks[objects.tanks.length-1];

window.setTimeout(function(){
	testTank.stop();
	window.setTimeout(testTank.resume, 2000);
}, 5000);


      objects.tanks.push(new Tank({
        x: 700
      }));


      objects.tanks.push(new Tank({
        x: 760
      }));


      objects.vans.push(new Van({
        x: -32
      }));

      objects.missileLaunchers.push(new MissileLauncher({
        x: -128
      }));

      for (var i=0; i<5; i++) {

        objects.infantry.push(new Infantry({
          x: -192 + (i * -20)
        }));

        objects.infantry.push(new Infantry({
          x: 500 + (i * 20)
        }));

        objects.infantry.push(new Infantry({
          x: 1460 + (i * -20),
          isEnemy: true
        }));


      }

// test
// objects.infantry[objects.infantry.length-1].stop();

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

      objects.infantry.push(new Infantry({
        x: 256
      }));

      objects.infantry.push(new Infantry({
        x: 276
      }));


      // some enemy stuff

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

      objects.tanks.push(new Van({
        x: 1248,
        isEnemy: true
      }));

      objects.missileLaunchers.push(new MissileLauncher({
        x: 1302,
        isEnemy: true
      }));

      objects.tanks.push(new Tank({
        x: 8192,
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
      dead: false,
      isEnemy: (options.isEnemy || false),
      x: options.x || 0,
      y: options.y || 0,
      vX: options.vX || 0,
      vY: options.vY || 0
    }

    return mixin(defaultData, data);

  }

  function View() {

    var data, dom, events, exports;

    data = {
      browser: {
        width: 0,
        fractionWidth: 0,
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
      }
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

        var leftScrollMargin, rightScrollMargin, fractionWidth;

        // don't scroll if the helicopter isn't moving.
        if (game.objects.helicopters[0].data.vX === 0) {
          return false;
        }

        // are we moving left, centered or right?
        fractionWidth = data.browser.fractionWidth;

        // should we scroll the world?
        if (data.mouse.x >= 0) {
          rightScrollMargin = data.browser.width - data.mouse.x;
          if (data.battleField.scrollLeft) {
            leftScrollMargin = data.mouse.x;
          }
        }

        if (rightScrollMargin < fractionWidth) {
          setLeftScroll((fractionWidth - rightScrollMargin) * 0.01);
        } else if (leftScrollMargin < fractionWidth) {
          setLeftScroll((fractionWidth - leftScrollMargin) * -0.01);
        }

    }

    function refreshCoords() {

      data.browser.width = window.innerWidth;
      data.browser.height = window.innerHeight;

      data.browser.fractionWidth = data.browser.width / 3;

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
      setLeftScroll: setLeftScroll
    }

    return exports;

  }

  function Inventory() {

    var css, data, dom, exports;

    css = {
      building: 'building'
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

    function order(type, options) {

      var typeData, orderObject;

      options = options || {};

      if (!data.building) {

       // let's build something.
       data.building = true;

       typeData = data.types[type];

       // create and append a new (something) to its appropriate array.
       orderObject = new typeData[1](options);

       typeData[0].push(orderObject);

       // reset the frame count, and re-enable building when it surpasses this object's "build time"
       data.frameCount = orderObject.data.inventory.frameCount * -1;

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

    }

    function init() {
      dom.gameStatusBar = document.getElementById('game-status-bar');
    }

    exports = {
      animate: animate,
      order: order
    }

    init();

    return exports;

  }

  function Radar() {

    var data, css, dom, exports, objects;

    objects = {
      items: []
    }

    data = {
      frameCount: 0,
      animateModulus: 1 // TODO: review
    }

    dom = {
      radar: null,
      radarItem: null
    }

    function animate() {

      var i, j, battleFieldWidth, battleFieldHeight;

      data.frameCount++;

      if (data.frameCount % data.animateModulus === 0) {

        // move all radar items

        battleFieldWidth = game.objects.view.data.battleField.width;
        battleFieldHeight = game.objects.view.data.battleField.height;

        for (i=0, j=objects.items.length; i<j; i++) {
          // TODO: optimize
          objects.items[i].dom.o.style.left = (((objects.items[i].oParent.data.x) / battleFieldWidth) * 100) + '%';
          if (objects.items[i].oParent.data.type && objects.items[i].oParent.data.type === 'balloon') {
            // balloon
            objects.items[i].dom.o.style.bottom = objects.items[i].oParent.data.y + '%';
          }
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

    function addItem(item, className) {

      var itemObject, o;

      itemObject = new RadarItem({
        o: dom.radarItem.cloneNode(true),
        className: className,
        oParent: item
       });

      objects.items.push(itemObject);

      dom.radar.appendChild(itemObject.dom.o);

      return itemObject;

    }

    function removeItem(item) {

      // console.log('radar.removeItem()', item);

      // look up item
      var i, j, foundItem;

      // find and remove from DOM + array
      for (i=items.length, j=0; i>j; i--) {
        if (items[i].oParent === item) {
          // console.log('radar.removeItem(): found match', item);
          items[i].o.parentNode.removeChild(items[i].o);
          items.splice(i, 1);
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
      animate: animate
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

      // collision detection?

      // view is separate
      gameObjects.view.animate();

    }

    function start() {

      if (!timer) {

        // TODO: use rAF
        timer = window.setInterval(animate, 1000 / 24);

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
      energy: 3,
      defaultEnergy: 3,
      direction: 0,
      verticalDirection: 0.33,
      verticalDirectionDefault: 0.33,
      leftMargin: options.leftMargin || 0,
      width: 36,
      height: 14
    }, options);

    dom = {
      o: null
    }

    objects = {
      bunker: options.bunker || null
    }

    function animate() {

      if (!data.dead) {

        if ((data.y > 100 && data.verticalDirection > 0) || (data.y < 0 && data.verticalDirection < 0)) {
          data.verticalDirection *= -1;
        }

        moveTo(data.x, data.y + data.verticalDirection);

      } else {

        if (data.y > 0) {

          // dead, but chain has not retracted yet. Make sure it's moving down.
          if (data.verticalDirection > 0) {
            data.verticalDirection *= -1;
          }

          moveTo(data.x, data.y + data.verticalDirection);

        } else {

          // chain is at bottom, and the balloon can now reappear.
          checkRespawn();

        }

      }

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
      dom.o.style.bottom = ((280 * y / 100) + 'px');
      // dom.o.style.top = y + 'px';
    }

    function setEnemy(isEnemy) {
      data.isEnemy = isEnemy;
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
    }

    function die() {
      // pop!
      if (!data.dead) {
        utils.css.add(dom.o, css.exploding);
        if (sounds.genericBoom) {
          sounds.genericBoom.play();
        }
        window.setTimeout(dead, 550);
        data.dead = true;
      }
    }

    function checkRespawn() {

      if (data.dead && !objects.bunker.data.dead) {
        reset();
      }

    }

    function reset() {
      // respawn can actually happen now
      utils.css.remove(dom.o, css.dead);
      data.energy = data.defaultEnergy;
      // and restore default vertical
      data.verticalDirection = data.verticalDirectionDefault;
      // look ma, no longer dead!
      data.dead = false;
      // reset position, too
      data.y = 0;
      radarItem.reset();
    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      dom.o.style.marginLeft = (data.leftMargin + 'px');

      game.dom.world.appendChild(dom.o);

      // TODO: review when balloon gets separated from bunker
      data.x = options.x; // (objects.bunker ? objects.bunker.data.x : 0);

      setX(data.x);

      data.y = Math.random() * 100;

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

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
      burning: 'burning',
    });

    data = inheritData({
      bottomAligned: true,
      type: 'bunker',
      energy: 30,
      width: 51,
      halfWidth: 25,
      height: 25
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
/*
      if (objects.balloon) {
        objects.balloon.animate();
      }
*/
      // TODO: fix height: 0px case (1-pixel white border)
      dom.oChain.style.height = ((objects.balloon.data.y / 100 * 280) - data.height - 6 + 'px');
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

/*
    function dead() {
      if (data.dead && dom.o) {
        utils.css.swap(dom.o, css.exploding, css.dead);
      }
    }
*/

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
      init: init
    }

    init();

    return exports;

  }

  function Base() {}

  function Paratrooper() {}

  function MissileLauncher(options) {

    var css, data, dom, radarItem, exports;

    options = options || {};

    css = inheritCSS({
      className: 'missile-launcher',
    });

    data = inheritData({
      bottomAligned: true,
      energy: 3,
      direction: 0,
      vX: (options.isEnemy ? -1 : 1),
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

      if (!data.dead) {
        moveTo(data.x + data.vX, data.y);
      }

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

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    exports = {
      animate: animate,
      data: data,
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
      items: ['balloons', 'tanks', 'vans', 'missileLaunchers', 'infantry', 'engineers', 'bunkers', 'helicopters']
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
        target.hit(data.damagePoints);
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

      game.dom.world.appendChild(dom.o);

      setX(data.x);
      setY(data.y);

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

      target.hit(data.damagePoints);

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
      items: ['balloons', 'tanks', 'vans', 'missileLaunchers', 'infantry', 'engineers', 'bunkers']
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

      game.dom.world.appendChild(dom.o);

    }

    init();

    exports = {
      animate: animate,
      data: data
    }

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
      bombing: false,
      firing: false,
      fuel: 100,
      fireModulus: 3,
      bombModulus: 6,
      fuelModulus: 40,
      fuelModulusFlying: 6,
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
        if (e.button === 0) {
          rotate();
        }
      },

      mouseup: function() {
        // setFiring(false);
      }

    }

    objects = {
      bombs: [],
      gunfire: []
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
      items: ['balloons', 'tanks', 'vans', 'missileLaunchers', 'bunkers']
    }

    function animate() {

      // move according to delta between helicopter x/y and mouse, up to a max.

      var i, j, view, mouse;

      view = game.objects.view;
      mouse = view.data.mouse;

      // only allow X-axis if not on ground...
      if (mouse.x) {
        // accelerate scroll vX, so chopper nearly matches mouse when scrolling
        data.vX = (view.data.battleField.scrollLeft + (view.data.battleField.scrollLeftVX * 9) + mouse.x - data.x - data.halfWidth) * 0.1;
        // and limit
        data.vX = Math.max(data.vXMax * -1, Math.min(data.vXMax, data.vX));
      }

      if (mouse.y) {
        data.vY = (mouse.y - data.y - view.data.world.y - data.halfHeight) * 0.1;
        // and limit
        data.vY = Math.max(data.vYMax * -1, Math.min(data.vYMax, data.vY));
      }

      // safety net: don't let chopper run on bottom of screen
      // TODO: or when on landing pad.
      if (data.y === 369) {
        data.landed = true;
        data.vX = 0;
      } else {
        data.landed = false;
      }

      if (!data.dead) {

        applyTilt();

        moveTo(data.x + data.vX, data.y + data.vY);

        collisionTest(collision, exports);

      }

      // animate child objects, too

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

      // should we be firing, also?
      fire();

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
        data.yMin = document.getElementById('top-bar').offsetHeight;
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

      var tiltOffset, frameCount;

      frameCount = game.objects.gameLoop.data.frameCount;

      if (!data.firing && !data.bombing) {
        return false;
      }

      // TODO: decrement ammo, etc.

      if (data.firing && frameCount % data.fireModulus === 0) {

        tiltOffset = (data.tilt !== null ? data.tiltYOffset * data.tilt * (data.rotated ? -1 : 1) : 0);

        objects.gunfire.push(new GunFire({
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
          vX: data.vX,
          vY: data.vY // + tiltOffset
        }));

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
      }, 1200);

      data.energy = 0;

      data.dead = true;

      if (sounds.genericExplosion) {
        sounds.genericExplosion.play();
      }

      radarItem.die();

      console.log('helicopter died.');

    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      dom.oSubSprite = makeSubSprite();

      dom.o.appendChild(dom.oSubSprite);

      setX(data.x);
      setY(data.y);

      dom.fuelLine = document.getElementById('fuel-line');

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
      die: die,
      fire: fire,
      hit: hit,
      setBombing: setBombing,
      setFiring: setFiring
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

          moveTo(data.x + data.vX, data.y);

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
          isEnemy: data.isEnemy,
          x: data.x + ((data.width + 1) * (data.isEnemy ? 0 : 1)),
          y: game.objects.view.data.world.height - data.gunYOffset, // half of tank height
          vX: data.vX, // same velocity as tank
          vY: 0
        }));

        if (sounds.genericGunFire) {
          sounds.genericGunFire.play();
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
      dom.o.style.bottom = (y + 'px');
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

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

      initNearby(nearby, exports);

    }

    exports = {
      animate: animate,
      data: data,
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
      bottomAligned: true,
      energy: 1,
      direction: 0,
      vX: (options.isEnemy ? -1 : 1),
      width: 38,
      height: 16,
      inventory: {
        frameCount: 50,
        cost: 5
      }
    }, options);

    dom = {
      o: null
    }

    function animate() {

      if (!data.dead) {
        moveTo(data.x + data.vX, data.y);
      }

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

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

    }

    exports = {
      animate: animate,
      data: data,
      hit: hit,
      die: die
    }

    init();

    return exports;

  }

  function Infantry(options) {

    var css, dom, data, objects, radarItem, nearby, exports;

    options = options || {};

    css = inheritCSS({
      className: null,
      infantry: 'infantry',
      engineer: 'engineer',
      stopped: 'stopped'
    });

    data = inheritData({
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
        frameCount: 150,
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

    function animate() {

      data.frameCount++;

      if (!data.dead) {

        if (!data.stopped) {

          moveTo(data.x + data.vX, data.y);

        } else {

          // only fire (i.e., GunFire objects) when stopped
          fire();

        }

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
          isEnemy: data.isEnemy,
          x: data.x + ((data.width + 1) * (data.isEnemy ? 0 : 1)),
          y: game.objects.view.data.world.height - data.gunYOffset, // half of infantry height
          vX: data.vX, // same velocity
          vY: 0
        }));

      }

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
      dom.o.style.bottom = (y + 'px');
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

      game.dom.world.appendChild(dom.o);

      radarItem = game.objects.radar.addItem(exports, dom.o.className);

      initNearby(nearby, exports);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom,
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

  function getBalloonObject(obj) {

    // compensate for bunker offset minus balloon offset
    var data;

    // local copy
    data = mixin({}, obj);

    data.x = obj.data.x;

    // world minus radar
    data.y = 370 - (280 * obj.data.y/100);

    data.width = obj.data.width;

    data.height = obj.data.height;

    return data;

  }

  function initNearby(nearby, exports) {
    // map options.source -> exports
    nearby.options.source = exports;
  }

  function nearbyTest(nearby) {

    var i, j, foundHit;

    // loop through relevant game object arrays
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

  function collisionTest(collision, exports) {

    var i, j;

    // hack: first-time run fix, as exports is initially undefined
    if (!collision.options.source) {
      collision.options.source = exports;
    }

    // loop through relevant game object arrays
    for (i=0, j=collision.items.length; i<j; i++) {
      // ... and check them
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

    var item, objects, data1, data2, foundHit;

    if (!options) {
      return false;
    }

    if (options.source.data.dead || options.source.data.expired) {
      return false;
    }

    // local copy of souce object coordinates
    data1 = mixin({}, options.source.data);

    // should data1 be bottom-aligned?
    if (data1.bottomAligned) {
      data1 = bottomAlignedObject(data1);
    }

    // is this a "lookahead" (nearby) case? buffer the x value, if so. Armed vehicles use this.
    if (options.useLookAhead) {
      // friendly things move further right, enemies move further left.
      data1.x += (Math.max(16, data1.width * 0.33) * (data1.isEnemy ? -1 : 1));
    }

    objects = options.targets;

    for (item in objects) {

      // don't check against friendly units, dead objects, or against self
      if (objects.hasOwnProperty(item) && objects[item].data.isEnemy !== options.source.data.isEnemy && !objects[item].data.dead && objects[item] !== options.source) {

        if (options.isBalloon || (objects[item].data.type && objects[item].data.type === 'balloon')) {
          // special case
          data2 = getBalloonObject(objects[item]);
        } else if (objects[item].data.bottomAligned) {
          data2 = bottomAlignedObject(objects[item].data);
        } else {
          // normal top-aligned x/y case (or we're comparing apples and apples, i.e., two bottom-aligned items, and we don't care.)
          data2 = objects[item].data;
        }

        hit = collisionCheck(data1, data2);

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

  function bottomAlignedObject(obj) {

    // compensate for objects positioned using bottom: 0

    // correct for fixed-value bottom positioning
    obj.y = 370 - 2;

    return obj;

  }

  var domPoint1, domPoint2;

  domPoint1 = document.createElement('div');
  domPoint1.className = 'collision-check-1';

  domPoint2 = document.createElement('div');
  domPoint2.className = 'collision-check-2';


  function collisionCheck(point1, point2) {

    // given x, y, width and height, determine if one object is overlapping another.

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

    if (point2.x >= point1.x) {

      // point 2 is to the right.

      if (point1.x + point1.width >= point2.x) {
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

      if (point2.x + point2.width >= point1.x) {
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

  function removeNodes(dom) {

    // remove all nodes in a structure
    var item;

    for (item in dom) {
      if (dom.hasOwnProperty(item) && dom[item]) {
        dom[item].parentNode.removeChild(dom[item]);
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

      // space bar!
      '32': {

        down: function() {

          // game.objects.smartbombController.fire();

        }

      },

      // "m"
      '77': {

        down: function() {

          game.objects.inventory.order('missileLauncher');

        }

      },

      // "t"
      '84': {

        down: function() {

          game.objects.inventory.order('tank');

        }

      },

      // "v"
      '86': {

        down: function() {

          game.objects.inventory.order('van');

        }

      },

      // "e"
      '69': {

        down: function() {

          game.objects.inventory.order('engineer');

        }

      },

      // "i"
      '73': {

        down: function() {

          game.objects.inventory.order('infantry');

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

    addItem('end-bunker', 8200);

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

  setTimeout(aa.init, 500);

}(window));