import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
import {
  ENEMY_COLOR,
  FPS,
  GAME_SPEED,
  GAME_SPEED_RATIOED,
  TYPES,
  getTypes
} from '../core/global.js';
import { playSound, playSoundWithDelay, sounds } from '../core/sound.js';
import { common } from '../core/common.js';
import {
  checkProduction,
  collisionCheck,
  collisionCheckMidPoint,
  nearbyTest
} from '../core/logic.js';
import { zones } from '../core/zones.js';
import { sprites } from '../core/sprites.js';
import { gamePrefs } from '../UI/preferences.js';

const crossedSwords = '<span class="no-emoji-substitution">⚔️</span>';

const slashPattern = new Image();
// slashPattern.src ='image/UI/checkerboard-white-mask-50percent.png'
slashPattern.src =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABAAQMAAACQp+OdAAAABlBMVEX///8AAABVwtN+AAAAAnRSTlN/AN40qAEAAAAVSURBVHgBYwiFAoZVUEC8yKjIqAgAdHP/Abts7zEAAAAASUVORK5CYII=';

let pattern;

const SuperBunker = (options = {}) => {
  let css, dom, data, width, height, nearby, radarItem, exports;

  const FIRE_MODULUS = 7;

  function updateFireModulus() {
    // firing speed increases with # of infantry
    const gsRatio = 1 / GAME_SPEED_RATIOED;
    data.fireModulus = Math.max(
      1,
      FIRE_MODULUS * gsRatio - data.energy * gsRatio
    );
    // hackish: apply this back to the "1X" value, for scaling vs. game speed and FPS
    data.fireModulus1X = data.fireModulus;
  }

  function capture(isEnemy) {
    let isFriendlyCapture = isEnemy === game.players.local.data.isEnemy;

    updateStatus({ isEnemy });

    if (isFriendlyCapture) {
      game.objects.notifications.add(
        'You captured and armed a super bunker ⛳'
      );

      playSoundWithDelay(sounds.friendlyClaim, exports, 500);
    } else {
      game.objects.notifications.add(
        'The enemy captured and armed a super bunker 🚩'
      );

      playSoundWithDelay(sounds.enemyClaim, exports, 500);
    }

    // check if enemy convoy production should stop or start
    checkProduction();
  }

  function updateStatus(status) {
    /**
     * status = { isEnemy, hostile }
     * If we are friendly or enemy, then we cannot be hostile.
     * Conversely, if we are hostile, friendly/enemy can be ignored.
     */
    if (status.isEnemy !== undefined) {
      status.hostile = false;
    } else if (status.hostile) {
      // "no change."
      status.isEnemy = data.isEnemy;
    }

    // exit if no change
    if (status.hostile === data.hostile && status.isEnemy === data.isEnemy)
      return;

    // apply updates
    data.isEnemy = status.isEnemy;
    data.hostile = status.hostile;

    updateArrowState();

    zones.changeOwnership(exports);
  }

  function setFiring(state) {
    // firing only works, of course, when there is also energy.
    data.firing = !!(state && data.energy);
  }

  function updateHealth(attacker) {
    // notify if just disarmed by tank gunfire
    // note: the super bunker has not become friendly to the tank; it's still "dangerous", but unarmed and won't fire at incoming units.
    if (data.energy) return;

    const isFriendly =
      attacker.data.isEnemy === game.players.local.data.isEnemy;

    // we have a tank, after all
    if (isFriendly) {
      game.objects.notifications.addNoRepeat('You disarmed a super bunker ⛳');
    } else {
      game.objects.notifications.addNoRepeat(
        'The enemy disarmed a super bunker 🚩'
      );
    }

    // disarmed super bunkers are dangerous to both sides.

    updateStatus({ hostile: true });
  }

  function hit(points, target) {
    // only tank flamethrowers - or, gunfire - counts against super bunkers.
    if (
      target &&
      (target.data.type === TYPES.flame ||
        target.data.type === TYPES.gunfire) &&
      target.data.parentType === TYPES.tank
    ) {
      data.energy = Math.max(0, data.energy - points);
      updateFireModulus();
      sprites.updateEnergy(exports);
    }
  }

  function die() {
    if (data.dead) return;
    // gunfire from both sides should now hit this element.

    data.energy = 0;

    updateFireModulus();

    // this object, in fact, never actually dies because it only becomes neutral/hostile and can still be hit.
    data.dead = false;

    // un-manned, but dangerous to helicopters on both sides.
    updateStatus({ hostile: true });

    sprites.updateEnergy(exports);

    // check if enemy convoy production should stop or start
    checkProduction();

    common.onDie(exports);
  }

  function fire() {
    // TODO: BUG FIX - figure out why super bunker doesn't fire at local helicopter on right side. :X

    let fireOptions;

    if (
      !data.firing ||
      !data.energy ||
      data.frameCount % data.fireModulus !== 0
    )
      return;

    fireOptions = {
      parent: exports,
      parentType: data.type,
      isEnemy: data.isEnemy,
      collisionItems: nearby.items,
      x: data.x + data.width - 2,
      y: data.y + data.gunYOffset, // position of bunker gun
      fixedXY: true,
      vX: 2,
      vY: 0
    };

    game.addObject(TYPES.gunfire, fireOptions);

    // other side
    fireOptions.x = data.x;

    // and reverse direction
    fireOptions.vX *= -1;

    game.addObject(TYPES.gunfire, fireOptions);

    if (sounds.genericGunFire) {
      playSound(sounds.genericGunFire, exports);
    }
  }

  function animate() {
    sprites.moveWithScrollOffset(exports);

    data.frameCount++;

    nearbyTest(nearby, exports);

    fire();

    if (data.arrowFrameActive) {
      arrowConfig.target.angle = data.arrowFrames[data.arrowFrame];
      data.arrowFrame++;
      if (data.arrowFrame >= data.arrowFrames.length) {
        data.arrowFrameActive = false;
      }
    }

    // note: super bunkers never die, but leaving this in anyway.
    return !dom.o;
  }

  function refreshNearbyItems() {
    // set on init, updated with `zones.changeOwnership()` as targets change sides
    nearby.items = getTypes(
      'infantry:all, engineer, missileLauncher, van, helicopter',
      { group: 'enemy', exports }
    );
  }

  function updateArrowState() {
    // TODO: DRY / utility function
    function dropOff(x) {
      // x from 0 to 1 returns from 1 to 0, with in-out easing.
      // https://stackoverflow.com/questions/30007853/simple-easing-function-in-javascript/30007935#30007935
      // Wolfram alpha graph: http://www.wolframalpha.com/input/?i=plot%20%28cos%28pi*x%29%20%2B%201%29%20%2F%202%20for%20x%20in%20%280%2C1%29
      return (Math.cos(Math.PI * x) + 1) / 2;
    }

    function makeArrowFrames(angleDelta) {
      const duration = FPS * 0.5 * (1 / GAME_SPEED);

      data.arrowFrames = [];

      for (let i = 0; i <= duration; i++) {
        // 1/x, up to 1
        data.arrowFrames[i] =
          arrowConfig.target.angle + dropOff(i / duration) * angleDelta;
      }
      // we want 0 to 1.
      data.arrowFrames.reverse();

      data.arrowFrame = 0;
      data.arrowFrameActive = true;
    }

    const angles = {
      left: -180,
      up: -90,
      right: 0
    };

    const toAngle =
      angles[data.hostile ? 'up' : data.isEnemy ? 'left' : 'right'];

    let delta = toAngle - arrowConfig.target.angle;

    // don't loop / turn around the wrong way.
    if (delta <= -180) {
      delta += 360;
    }

    makeArrowFrames(delta);
  }

  function onArrowHiddenChange(isVisible) {
    // update domCanvas config
    data.domCanvas.img = isVisible ? [spriteConfig, arrowConfig] : spriteConfig;
  }

  function initDOM() {
    if (game.objects.editor) {
      dom.o = sprites.create({
        className: css.className,
        id: data.id
      });
    } else {
      dom.o = {};
    }

    data.domCanvas.img = gamePrefs.super_bunker_arrows
      ? [spriteConfig, arrowConfig]
      : spriteConfig;

    onArrowHiddenChange(gamePrefs.super_bunker_arrows);

    // this will set x + y for domCanvas
    sprites.moveTo(exports, data.x, data.y);
  }

  function initSuperBunker() {
    refreshNearbyItems();

    initDOM();

    updateFireModulus();

    radarItem = game.objects.radar.addItem(exports);
  }

  function destroy() {
    radarItem?.die();
    sprites.removeNodes(dom);
  }

  function getSpriteURL() {
    return (
      'super-bunker_mac' +
      (gamePrefs.weather === 'snow' ? '_snow' : '') +
      '.png'
    );
  }

  function applySpriteURL() {
    if (!spriteConfig) return;
    spriteConfig.src = utils.image.getImageObject(getSpriteURL());
  }

  width = 66;
  height = 28;

  css = common.inheritCSS({
    className: TYPES.superBunker,
    arrow: 'arrow',
    friendly: 'friendly',
    facingLeft: 'facing-left',
    facingRight: 'facing-right',
    hostile: 'hostile'
  });

  data = common.inheritData(
    {
      type: TYPES.superBunker,
      bottomAligned: true,
      frameCount: 0,
      energy: options.energy || 5,
      energyMax: 5, // note: +/- depending on friendly vs. enemy infantry
      energyLineScale: 0.95,
      centerEnergyLine: true,
      isEnemy: !!options.isEnemy,
      width,
      halfWidth: width / 2,
      doorWidth: 6,
      height,
      firing: false,
      gunYOffset: 19,
      // fire speed relative to # of infantry arming it
      fireModulus: FIRE_MODULUS,
      fireModulus1X: FIRE_MODULUS,
      gameSpeedProps: ['fireModulus'],
      hostile: false,
      midPoint: null,
      xLookAhead: width / 3,
      y: game.objects.view.data.world.height - height
    },
    options
  );

  updateFireModulus();

  if (data.energy === 0) {
    // initially neutral/hostile only if 0 energy
    updateStatus({ hostile: true });
  }

  // coordinates of the doorway
  data.midPoint = {
    x: data.x + data.halfWidth,
    y: data.y,
    // hackish: make the collision point the center, not the actual width
    width: 1,
    height: data.height
  };

  dom = {
    o: null
  };

  exports = {
    animate,
    capture,
    data,
    destroy,
    die,
    dom,
    hit,
    init: initSuperBunker,
    onArrowHiddenChange,
    refreshNearbyItems,
    updateHealth,
    updateSprite: applySpriteURL
  };

  const spriteWidth = 132;
  const spriteHeight = 56;

  const spriteConfig = {
    src: utils.image.getImageObject(getSpriteURL()),
    source: {
      x: 0,
      y: 0,
      width: spriteWidth,
      height: spriteHeight
    },
    target: {
      width: spriteWidth / 2,
      height: spriteHeight / 2
    }
  };

  const arrowWidth = 6;
  const arrowHeight = 10;

  const arrowConfig = {
    src: utils.image.getImageObject('arrow-right.png'),
    excludeEnergy: true,
    source: {
      x: 0,
      y: 0,
      frameWidth: arrowWidth,
      frameHeight: arrowHeight,
      frameX: 0,
      frameY: 0
    },
    target: {
      width: arrowWidth,
      height: arrowHeight,
      xOffset: 50,
      yOffset: -11,
      angle: data.isEnemy ? 180 : data.isHostile ? -90 : 0
    }
  };

  data.domCanvas = {
    radarItem: SuperBunker.radarItemConfig(exports)
  };

  nearby = {
    options: {
      source: exports,
      targets: undefined,
      fireTargetCount: 0,
      useLookAhead: true,
      hitAll: true,
      before() {
        // reset before test
        nearby.options.fireTargetCount = 0;
      },
      after() {
        // hits may have been counted
        setFiring(nearby.options.fireTargetCount > 0);
      },
      hit(target) {
        let isFriendly = target.data.isEnemy === data.isEnemy;

        const isTargetFriendlyToPlayer =
          target.data.isEnemy === game.players.local.data.isEnemy;

        // enemy might be inside the bunker bounding box, e.g., parachuted in from above. Consider a miss, if so.
        if (
          !isFriendly &&
          data.energy > 0 &&
          !collisionCheck(target.data, exports.data)
        ) {
          // nearby enemy, and defenses activated? let 'em have it.
          nearby.options.fireTargetCount++;
        }

        // only infantry (excluding engineers by role=1) are involved, beyond this point
        if (target.data.type !== TYPES.infantry || target.data.role) return;

        // super bunkers can hold up to five men. only interact if not full (and friendly), OR an opposing, non-friendly infantry.
        if (isFriendly && data.energy === data.energyMax) return;

        // infantry at door? contribute to capture, or arm base, depending.
        if (!collisionCheckMidPoint(target, exports)) return;

        // claim infantry, change "alignment" depending on friendliness.
        if (data.energy === 0) {
          // claimed by infantry, switching sides from neutral/hostile.

          // ensure that if we were dead, we aren't any more.
          data.dead = false;

          // super bunker can be enemy, hostile or friendly. for now, we only care about enemy / friendly.
          capture(target.data.isEnemy);

          // update, now that capture has happened.
          isFriendly = target.data.isEnemy === data.isEnemy;
        }

        // add or subtract energy, depending on alignment.

        // passing infantry on same team?
        if (isFriendly) {
          // friendly passer-by, relative to the super bunker.
          data.energy++;

          if (data.energy > 0) {
            // "one of ours?"
            if (isTargetFriendlyToPlayer) {
              game.objects.notifications.add(
                'You reinforced a super bunker 🛡️'
              );
            } else {
              game.objects.notifications.add(
                'The enemy reinforced a super bunker 🛡️'
              );
            }
          }
        } else {
          // enemy infantry hit.

          // "one of ours?"
          if (isTargetFriendlyToPlayer) {
            if (data.energy > 1)
              game.objects.notifications.add(
                `You weakened a super bunker ${crossedSwords}`
              );
          } else {
            if (data.energy > 1)
              game.objects.notifications.add(
                `The enemy weakened a super bunker ${crossedSwords}`
              );
          }

          data.energy--;
        }

        // limit to +/- range.
        data.energy = Math.min(data.energyMax, data.energy);

        // firing speed relative to # of infantry.
        updateFireModulus();

        if (data.energy === 0) {
          // un-manned, but dangerous to helicopters on both sides.
          updateStatus({ hostile: true });

          if (isTargetFriendlyToPlayer) {
            game.objects.notifications.add(
              'Your infantry neutralized a super bunker ⛳'
            );
          } else {
            game.objects.notifications.add(
              `Enemy infantry neutralized a super bunker ${crossedSwords}`
            );
          }
        }

        // "claim" the infantry, kill if enemy and man the bunker if friendly.
        target.die({ silent: true });

        playSound(sounds.doorClose, exports);

        sprites.updateEnergy(exports);
      },

      miss() {
        setFiring(false);
      }
    },

    // who gets fired at?
    items: null,
    targets: []
  };

  return exports;
};

SuperBunker.radarItemConfig = (exports) => ({
  width: 6.5,
  height: 3,
  excludeFillStroke: true,
  draw: (ctx, obj, pos, width, height) => {
    if (exports?.data.hostile) {
      if (!pattern) {
        pattern = ctx.createPattern(slashPattern, 'repeat');
      }
      ctx.fillStyle = pattern;
    } else {
      ctx.fillStyle =
        !gamePrefs.super_bunker_arrows || exports?.data.isEnemy
          ? ENEMY_COLOR
          : '#17a007';
    }

    const left = pos.left(obj.data.left);
    const scaledWidth = pos.width(width);

    // bunker shape
    ctx.beginPath();
    ctx.roundRect(
      left,
      pos.bottomAlign(height),
      scaledWidth,
      pos.height(height),
      [height, height, 0, 0]
    );
    ctx.fill();
    ctx.stroke();

    // horizontal lines, building shape
    ctx.beginPath();
    ctx.rect(left, pos.bottomAlign(height * 0.75), scaledWidth, 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.stroke();

    const nearBottom = pos.bottomAlign(height * 0.25);

    ctx.moveTo(left, nearBottom);

    ctx.lineTo(left + scaledWidth, nearBottom);

    ctx.stroke();

    const doorWidth = 0.75;
    const doorHeight = 1.25;
    const scaledDoorWidth = pos.width(doorWidth);

    // doorway
    ctx.beginPath();
    ctx.roundRect(
      left + scaledWidth / 2 - scaledDoorWidth / 2,
      pos.bottomAlign(doorHeight),
      scaledDoorWidth,
      pos.height(doorHeight),
      [doorHeight, doorHeight, 0, 0]
    );
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.stroke();
  }
});

export { SuperBunker };
