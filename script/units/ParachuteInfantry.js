import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import { common } from '../core/common.js';
import { rnd, rndInt, worldHeight, tutorialMode } from '../core/global.js';
import { playSound, sounds } from '../core/sound.js';
import { Infantry } from './Infantry.js';

const ParachuteInfantry = (options = {}) => {

  let css, dom, data, radarItem, exports;

  function openParachute() {

    if (data.parachuteOpen) return;

    // undo manual assignment from free-fall animation
    dom.oTransformSprite.style.backgroundPosition = '';

    utils.css.add(dom.o, css.parachuteOpen);

    // update model with open height
    data.height - 19;
    data.halfHeight = data.height / 2;

    // randomize the animation a little
    dom.oTransformSprite._style.setProperty('animation-duration', `${0.75 + rnd(0.75)}s`);

    // and parachute speed, too.
    data.vY = 0.3 + rnd(0.3);

    // make the noise
    if (sounds.parachuteOpen) {
      playSound(sounds.parachuteOpen, exports);
    }

    data.parachuteOpen = true;

  }

  function die(options) {

    if (data.dead) return;

    if (!options?.silent) {

      common.inertGunfireExplosion({ exports });

      playSound(sounds.scream, exports);

    }
    
    common.removeNodes(dom);

    data.energy = 0;

    data.dead = true;

    radarItem.die(options);

  }

  function hit(hitPoints, target) {

    // special case: helicopter explosion resulting in a parachute infantry - make parachute invincible to shrapnel.
    if (target?.data?.type === 'shrapnel' && data.ignoreShrapnel) {
      return false;
    }

    return common.hit(exports, hitPoints);

  }

  function animate() {

    let randomWind, bgY;

    if (data.dead) return !dom.o;

    // falling?

    common.moveTo(exports, data.x + data.vX, data.y + data.vY);

    if (!data.parachuteOpen) {

      if (data.y >= data.parachuteOpensAtY) {

        openParachute();

      } else if (data.frameCount % data.panicModulus === 0) {
        // like Tom Petty, free fallin'.

        if (data.isOnScreen) {
          dom.oTransformSprite._style.setProperty('background-position', `0px ${-(60 + (data.frameHeight * data.panicFrame))}px`);
        }

        // alternate between 0/1
        data.panicFrame = !data.panicFrame;

      }

    } else {

      // (potentially) gone with the wind.

      if (data.frameCount % data.windModulus === 0) {

        // choose a random direction?
        if (Math.random() > 0.5) {

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

          if (data.isOnScreen) {
            dom.oTransformSprite._style.setProperty('background-position', (`0px ${bgY}px`));
          }

          // choose a new wind modulus, too.
          data.windModulus = 64 + rndInt(64);

        } else {

          // reset wind effect

          data.vX = 0;

          if (data.isOnScreen) {
            dom.oTransformSprite._style.setProperty('background-position', '0px 0px');
          }

        }

      }

    }

    if (data.parachuteOpen && data.y >= data.maxYParachute) {

      // touchdown! die "quietly", and transition into new infantry.
      die({ silent: true });

      game.objects.infantry.push(Infantry({
        x: data.x,
        isEnemy: data.isEnemy,
        // exclude from recycle "refund" / reward case
        unassisted: false
      }));

    } else if (!data.parachuteOpen) {

      if (data.y > data.maxYPanic && !data.didScream) {

        // It's not looking good for our friend. Call up our buddy Wilhem.
        // http://archive.org/details/WilhelmScreamSample

        if (sounds.wilhemScream) {
          playSound(sounds.wilhemScream, exports);
        }

        data.didScream = true;

      }

      if (data.y >= data.maxY) {

        // hit ground, and no parachute. gravity is a cruel mistress.

        // special case: mark the "occasion."
        data.didHitGround = true;

        // reposition, first
        common.moveTo(exports, data.x, data.maxY);

        // balloon-on-skin "splat" sound
        if (sounds.splat) {
          playSound(sounds.splat, exports);
        }

        die();

      }

    }

    data.frameCount++;

  }

  function initDOM() {

    dom.o = common.makeSprite({
      className: css.className,
      isEnemy: (data.isEnemy ? css.enemy : false)
    });

    // CSS animation (rotation) gets applied to this element
    dom.oTransformSprite = common.makeTransformSprite();
    dom.o.appendChild(dom.oTransformSprite);

    common.moveTo(exports);

  }

  function initParachuteInfantry() {

    initDOM();

    radarItem = game.objects.radar.addItem(exports, dom.o.className);

  }

  css = common.inheritCSS({
    className: 'parachute-infantry',
    parachuteOpen: 'parachute-open'
  });

  data = common.inheritData({
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
    halfWidth: 5,
    height: 11, // 19 when parachute opens
    halfHeight: 5.5,
    frameHeight: 20, // each sprite frame
    ignoreShrapnel: options.ignoreShrapnel || false,
    didScream: false,
    didHitGround: false,
    vX: 0, // wind
    vY: 2 + Math.random() + Math.random(),
    maxY: worldHeight + 3,
    maxYPanic: 300,
    maxYParachute: worldHeight - 13,
  }, options);

  dom = {
    o: null,
    oTransformSprite: null
  };

  exports = {
    animate,
    data,
    dom,
    die,
    hit,
    initDOM
  };

  initParachuteInfantry();

  return exports;

};

export { ParachuteInfantry };