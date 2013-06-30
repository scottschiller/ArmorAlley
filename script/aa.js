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
      gunfire: null,
      bomb: null,
      rotate: null,
      genericExplosion: null
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
      multiShot: true
    });
    sounds.genericExplosion = soundManager.createSound({
      url: 'audio/generic-explosion.wav',
      multiShot: true
    });
    sounds.helicopter.gunfire = soundManager.createSound({
      url: 'audio/helicopter-gunfire.wav',
      multiShot: true
    });
    sounds.helicopter.rotate = soundManager.createSound({
      url: 'audio/helicopter-rotate.wav',
      multiShot: true
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
      balloonBunkers: [],
      engineers: [],
      infantry: [],
      missileLaunchers: [],
      tanks: [],
      vans: [],
      helicopters: [],
      radar: null
    }

    function createObjects() {

      objects.gameLoop = new GameLoop();

      objects.view = new View();

      objects.radar = new Radar();

      objects.balloonBunkers.push(new BalloonBunker({
        x: 1024
      }));

      objects.balloonBunkers.push(new BalloonBunker({
        x: 1536
      }));

      objects.balloonBunkers.push(new BalloonBunker({
        x: 2048
      }));

      objects.balloonBunkers.push(new BalloonBunker({
        x: 2560
      }));

      objects.balloonBunkers.push(new BalloonBunker({
        x: 3072
      }));

      // mid-level

      objects.balloonBunkers.push(new BalloonBunker({
        x: 4608,
        isEnemy: true
      }));

      objects.balloonBunkers.push(new BalloonBunker({
        x: 5120,
        isEnemy: true
      }));

      objects.balloonBunkers.push(new BalloonBunker({
        x: 5632,
        isEnemy: true
      }));

      // near-end / enemy territory

      objects.balloonBunkers.push(new BalloonBunker({
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
        x: 48
      }));

      objects.vans.push(new Van({
        x: -32
      }));

      objects.missileLaunchers.push(new MissileLauncher({
        x: -128
      }));

      objects.infantry.push(new Infantry({
        x: -192
      }));

      objects.infantry.push(new Infantry({
        x: -212
      }));

      objects.infantry.push(new Infantry({
        x: -232
      }));

      objects.infantry.push(new Infantry({
        x: -252
      }));

      objects.infantry.push(new Infantry({
        x: -272
      }));

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

      objects.tanks.push(new Tank({
        x: 1048,
        isEnemy: true
      }));

      var thatTank = objects.tanks[objects.tanks.length-1];
      window.setTimeout(thatTank.hit, 2000);

      window.setTimeout(thatTank.hit, 4000);

      window.setTimeout(thatTank.hit, 6000);

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

    }

    function init() {

      dom.world = document.getElementById('battlefield');

      // create objects?
      createObjects();

      objects.gameLoop.init();

    }

    exports = {
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

/*

    keyMap = {

      'keyCode_86': {
        method: function() {
          game.objects.vans.push(new Van({
            x: -32
          }));
        }
      },

      'keyCode_84': {
        method: function() {
          game.objects.vans.push(new Tank({
            x: -32
          }));
        }
      },

      'keyCode_77': {
        method: function() {
          game.objects.vans.push(new MissileLauncher({
            x: -32
          }));
        }
      }

    }

*/

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
          objects.items[i].o.style.left = (((objects.items[i].oParent.data.x + (objects.items[i].oParent.data.xOffset || 0)) / battleFieldWidth) * 100) + '%';
          if (objects.items[i].oParent.data.y) {
            objects.items[i].o.style.top = (objects.items[i].oParent.data.y/battleFieldHeight * 100) + '%';
          }
        }

      }

    }

    function addItem(item, className) {

      var itemObject, o;

      o = dom.radarItem.cloneNode(true);

      o.className = 'radar-item ' + className;

      objects.items.push({
        o: o,
        oParent: item,
        die: function() {
          o.parentNode.removeChild(o);
          o = null;
          itemObject = null;
        }
      });

      itemObject = objects.items[objects.items.length-1];

      dom.radar.appendChild(o);

      return itemObject;

    }

    function removeItem(item) {

      console.log('radar.removeItem()', item);

      // look up item
      var i, j, foundItem;

      // find and remove from DOM + array
      for (i=items.length, j=0; i>j; i--) {
        if (items[i].oParent === item) {
          console.log('radar.removeItem(): found match', item);
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
            gameObjects[item].animate();
          } else {
            // array case
            for (i = 0, j = gameObjects[item].length; i < j; i++) {
              gameObjects[item][i].animate();
            }
          }
        }
      }

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

    var css, data, dom, exports;

    options = options || {};

    css = {
      className: 'balloon',
      dead: 'dead',
      enemy: 'enemy',
      exploding: 'exploding'
    }

    data = {
      dead: false,
      energy: 5,
      defaultEnergy: 5,
      direction: 0,
      verticalDirection: 0.33,
      verticalDirectionDefault: 0.33,
      isEnemy: options.isEnemy || false,
      leftMargin: options.leftMargin || 0,
      x: options.x || 0,
      xOffset: 0,
      y: options.y || 0,
      height: 14
    }

    dom = {
      o: null
    }

    objects = {
      base: options.base || null
    }

    function animate() {

      if (!data.dead) {

        if ((data.y > 100 && data.verticalDirection > 0) || (data.y < 0 && data.verticalDirection < 0)) {
          data.verticalDirection *= -1;
        }

        moveTo(0, data.y + data.verticalDirection);

      } else {

        if (data.y > 0) {

          // dead, but chain has not retracted yet. Make sure it's moving down.
          if (data.verticalDirection > 0) {
            data.verticalDirection *= -1;
          }

          moveTo(0, data.y + data.verticalDirection);

        } else {

          // chain is at bottom, and the balloon can now reappear.
          if (data.canRespawn) {
            reset();
            data.canRespawn = false;
          }

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
    }

    function setEnemy(isEnemy) {
      data.isEnemy = isEnemy;
    }

    function hit() {
      if (!data.dead) {
        data.energy--;
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
      }
    }

    function die() {
      // pop!
      if (!data.dead) {
        utils.css.add(dom.o, css.exploding);
        if (sounds.genericBoom) {
          sounds.genericBoom.play();
        }
        window.setTimeout(dead, 500);
        data.dead = true;
        // testing: respawn
        window.setTimeout(respawn, 1500);
      }
    }

    function respawn() {
      if (data.dead && !data.canRespawn) {
        // restore balloon once chain reaches bottom
        data.canRespawn = true;
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
      
    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      dom.o.style.marginLeft = (data.leftMargin + 'px');

      if (options.oParent) {
        options.oParent.appendChild(dom.o);
      }

      // TODO: review when balloon gets separated from base
      data.xOffset = (objects.base ? objects.base.data.x : 0);

      data.y = Math.random() * 100;

      game.objects.radar.addItem(exports, dom.o.className);

    }

    exports = {
      animate: animate,
      data: data,
      die: die,
      hit: hit,
      respawn: respawn,
      setEnemy: setEnemy
    }

    init();

    return exports;

  }

  function BalloonBunker(options) {

    var css, data, dom, objects, exports;

    options = options || {};

    css = {
      className: 'balloon-bunker',
      chainClassName: 'balloon-chain',
      enemy: 'enemy'
    }

    data = {
      energy: 50,
      // balloonHeight: 0,
      isEnemy: options.isEnemy || false,
      x: options.x || 0,
      y: options.y || 0,
      width: null,
      height: 31
    }

    dom = {
      o: null,
      oChain: null
    }

    objects = {
      balloon: null
    }

    function animate() {
      if (objects.balloon) {
        objects.balloon.animate();
      }
      // TODO: fix height: 0px case (1-pixel white border)
      dom.oChain.style.height = ((objects.balloon.data.y / 100 * 280) - data.height + 'px');
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

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      dom.oChain = makeSprite({
        className: css.chainClassName
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      dom.o.appendChild(dom.oChain);

      objects.balloon = new Balloon({
        oParent: dom.o,
        base: exports,
        leftMargin: 7,
        isEnemy: data.isEnemy
      });

if (Math.random() > 0.5) {
  window.setTimeout(function() {
    objects.balloon.die();
  }, 1000 + Math.random() * 1000);
}

      setX(data.x);

      game.dom.world.appendChild(dom.o);

      game.objects.radar.addItem(exports, dom.o.className);

    }

    exports = {
      animate: animate,
      data: data,
      init: init
    }

    init();

    return exports;

  }

  function Base() {}

  function Paratrooper() {}

  function MissileLauncher(options) {

    var css, data, dom, exports;

    options = options || {};

    css = {
      className: 'missile-launcher',
      enemy: 'enemy'
    }

    data = {
      energy: 10,
      isEnemy: (options.isEnemy || false),
      direction: 0,
      x: options.x || 0,
      y: options.y || 0,
      vX: (options.isEnemy ? -1 : 1),
      vY: 0
    }

    dom = {
      o: null
    }

    function animate() {
      moveTo(data.x + data.vX, data.y);
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

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      game.dom.world.appendChild(dom.o);

    }

    init();

    exports = {
      animate: animate,
      data: data
    }

    return exports;

  }

  function HelicopterGunFire(options) {

    var css, data, dom, exports;

    options = options || {};

    css = {
      className: 'helicopter-gunfire'
    }

    data = {
      dead: false,
      frameCount: 0,
      expireFrameCount: 33,
      dieFrameCount: 33, // live up to N frames, then die?
      x: options.x || 0,
      y: options.y || 0,
      vX: options.vX || 0,
      vY: options.vY || 0,
      gravity: 1
    }

    dom = {
      o: null
    }

    function animate() {

      if (data.dead) {
        return false;
      }

/*
      if (data.frameCount > data.expireFrameCount) {
        data.gravity *= 1.25;
      }
*/

      moveTo(data.x + data.vX, data.y + data.vY + (data.frameCount > data.expireFrameCount ? data.gravity : 0));

      // collision check?

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

      // notify caller if now dead
      return !data.dead;

    }

    function die() {

      // aieee!

      if (data.dead) {
        return false;
      }

      if (dom.o) {
        dom.o.parentNode.removeChild(dom.o);
        dom.o = null;
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

  function Bomb(options) {

    var css, data, dom, exports;

    options = options || {};

    css = {
      className: 'bomb',
      dropping: 'dropping',
      explosionLarge: 'explosion-large',
      spark: 'spark'
    }

    data = {
      dead: false,
      firstFrame: true,
      x: options.x || 0,
      y: options.y || 0,
      vX: options.vX || 0,
      vY: options.vY || 0,
      gravity: 1
    }

    dom = {
      o: null
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
        if (sounds.genericBoom) {
          sounds.genericBoom.play();
        }
      }

      // notify caller if now dead
      return !data.dead;

    }

    function die() {

      // aieee!

      if (data.dead) {
        return false;
      }

      // possible hit, blowing something up.

      if (dom.o) {
        utils.css.add(dom.o, Math.random() > 0.5 ? css.explosionLarge : css.spark);
        // TODO: use single timer for all bombs
        window.setTimeout(function() {
          if (dom.o) {
            dom.o.parentNode.removeChild(dom.o);
            dom.o = null;
          }
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

    var css, data, dom, events, objects, exports;

    options = options || {};

    css = {
      className: 'helicopter',
      facingLeft: 'facing-left',
      facingRight: 'facing-right',
      rotatedLeft: 'rotated-left',
      rotatedRight: 'rotated-right',
      movingLeft: 'moving-left',
      movingRight: 'moving-right',
      tilt: 'tilt'
    }

    data = {
      bombing: false,
      firing: false,
      fireModulus: 2,
      bombModulus: 6,
      rotated: false,
      rotateTimer: null,
      fuel: 100,
      energy: 10,
      direction: 0,
      x: options.x || 0,
      xMin: 0,
      xMax: null,
      y: options.y || 0,
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
    }

    dom = {
      o: null
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
        data.vX = 0;
      }

      applyTilt();

      moveTo(data.x + data.vX, data.y + data.vY);

      // animate child objects, too

      for (i = objects.gunfire.length-1; i > 0; i--) {
        if (!objects.gunfire[i].animate()) {
          // object is dead - take it out.
          objects.gunfire.splice(i, 1);
        }
      }

      for (i = objects.bombs.length-1; i > 0; i--) {
        if (!objects.bombs[i].animate()) {
          // object is dead - take it out.
          objects.bombs.splice(i, 1);
        }
      }

      // should we be firing, also?
      fire();

    }

    function setFiring(state) {
      if (data.firing !== state) {
         data.firing = state;
         // TODO: implement separately
         setBombing(state);
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

    function fire() {

      var tiltOffset, frameCount;

      frameCount = game.objects.gameLoop.data.frameCount;

      if (!data.firing && !data.bombing) {
        return false;
      }

      // TODO: decrement ammo, etc.

      if (data.firing && frameCount % data.fireModulus === 0) {

        tiltOffset = (data.tilt !== null ? data.tiltYOffset * data.tilt * (data.rotated ? -1 : 1) : 0);

        objects.gunfire.push(new HelicopterGunFire({
          x: data.x + (data.rotated ? 0 : data.width) - 8,
          y: data.y + data.halfHeight + (data.tilt !== null ? tiltOffset + 2 : 0),
          vX: data.vX + 8 * (data.rotated ? -1 : 1),
          vY: data.vY + tiltOffset
        }));

        if (sounds.helicopter.gunfire) {
          sounds.helicopter.gunfire.play();
        }

      }

      if (data.bombing && frameCount % data.bombModulus === 0) {

        objects.bombs.push(new Bomb({
          x: data.x + data.halfWidth,
          y: data.y + data.height + 2,
          vX: data.vX,
          vY: data.vY // + tiltOffset
        }));

      }

    }

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

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
      fire: fire,
      setBombing: setBombing,
      setFiring: setFiring
    }

    init();

    return exports;

  }

  function Tank(options) {

    var css, data, dom, radarItem, exports;

    options = options || {};

    css = {
      className: 'tank',
      enemy: 'enemy',
      hit1: 'smouldering-phase-1',
      hit2: 'smouldering-phase-2',
      exploding: 'exploding'
    }

    data = {
      energy: 10,
      energyMax: 10,
      frameCount: 0,
      isEnemy: options.isEnemy || false,
      healModulus: 50,
      x: options.x || 0,
      y: options.y || 0,
      vX: (options.isEnemy ? -1 : 1)
    }

    dom = {
      o: null
    }

    function animate() {

      if (!data.dead) {
        data.frameCount++;
        moveTo(data.x + data.vX, data.y);
        heal();
      }

    }

    function heal() {

      if (data.frameCount % data.healModulus === 0) {
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
      if (data.energy <= 4) {
        utils.css.add(dom.o, css.hit2);
        utils.css.remove(dom.o, css.hit1);
      } else if (data.energy <= 8) {
        utils.css.add(dom.o, css.hit1);
        utils.css.remove(dom.o, css.hit2);
      } else {
        // TODO: optimize
        utils.css.remove(dom.o, css.hit1);
        utils.css.remove(dom.o, css.hit2);
      }
    }

    function hit(hitPoints) {

      hitPoints = hitPoints || 4; // default: bomb

      if (!data.dead) {
        data.energy -= hitPoints;
        updateHealth();
        if (data.energy <= 0) {
          die();
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
        dom.o.parentNode.removeChild(dom.o);
        dom.o = null;
      }, 1200);

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

      // for testing
      if (options.extraClass) {
        utils.css.add(dom.o, options.extraClass);
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

  function Van(options) {

    var css, dom, data, exports;

    options = options || {};

    css = {
      className: 'van',
      enemy: 'enemy'
    }

    data = {
      energy: 1,
      isEnemy: options.isEnemy || false,
      direction: 0,
      x: options.x || 0,
      y: options.y || 0,
      vX: (options.isEnemy ? -1 : 1)
    }

    dom = {
      o: null
    }

    function animate() {
      moveTo(data.x + data.vX, data.y);
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

    function init() {

      dom.o = makeSprite({
        className: css.className
      });

      if (data.isEnemy) {
        utils.css.add(dom.o, css.enemy);
      }

      game.dom.world.appendChild(dom.o);

      game.objects.radar.addItem(exports, dom.o.className);

    }

    exports = {
      animate: animate,
      data: data
    }

    init();

    return exports;

  }

  function Infantry(options) {

    var css, dom, data, exports;

    options = options || {};

    css = {
      className: null,
      infantry: 'infantry',
      engineer: 'engineer',
      enemy: 'enemy'
    }

    data = {
      energy: 1,
      isEnemy: options.isEnemy || false,
      role: options.role || 0,
      roles: ['infantry', 'engineer'],
      direction: 0,
      x: options.x || 0,
      y: options.y || 0,
      vX: (options.isEnemy ? -1 : 1)
    }

    dom = {
      o: null
    }

    function animate() {
      moveTo(data.x + data.vX, data.y);
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

      game.objects.radar.addItem(exports, dom.o.className);

    }

    exports = {
      animate: animate,
      data: data,
      dom: dom
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
         'down': 40
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

          game.objects.helicopters[0].setFiring(true);

        },

        up: function() {

          game.objects.helicopters[0].setFiring(false);

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

  function init() {

    game.init();

    keyboardMonitor.init();

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