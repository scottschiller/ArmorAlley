import { game, getObjectById } from '../core/Game.js';
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
// slashPattern.src ='image/UI/checkerboard-white-mask-75percent.png'
slashPattern.src =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABAAQMAAACQp+OdAAAABlBMVEX///8AAABVwtN+AAAAAnRSTlO/ABXOf08AAAAVSURBVHgBYwiFAoZVUEC8yKjIqAgAdHP/Abts7zEAAAAASUVORK5CYII=';

let pattern;

const FIRE_MODULUS = 6;

const width = 66;
const height = 28;

const spriteWidth = 132;
const spriteHeight = 56;

const arrowWidth = 6;
const arrowHeight = 10;

const SuperBunker = (options = {}) => {
  let domCanvas, data, nearby, exports;

  data = common.inheritData(
    {
      type: TYPES.superBunker,
      bottomAligned: true,
      frameCount: 0,
      /**
       * If neutral / hostile, then "unmanned" - but helicopters
       * and munitions can still hit it.
       */
      energy: options.hostile ? 0 : options.energy || 5,
      energyMax: 5, // note: +/- depending on friendly vs. enemy infantry
      isEnemy: !!options.isEnemy,
      width,
      halfWidth: width / 2,
      halfHeight: height / 2,
      doorWidth: 6,
      height,
      firing: false,
      gunYOffset: 19,
      // fire speed relative to # of infantry arming it
      fireModulus: FIRE_MODULUS,
      fireModulus1X: FIRE_MODULUS,
      gameSpeedProps: ['fireModulus'],
      hostile: !!options.hostile,
      midPoint: null,
      xLookAhead: width / 3,
      y: game.objects.view.data.world.height - height
    },
    options
  );

  // coordinates of the doorway
  data.midPoint = {
    x: data.x + data.halfWidth,
    y: data.y,
    // hackish: make the collision point the center, not the actual width
    width: 1,
    height: data.height
  };

  domCanvas = {
    radarItem: SuperBunker.radarItemConfig({ data })
  };

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

  exports = {
    animate: () => animate(exports),
    arrowConfig,
    capture: (isEnemy) => capture(exports, isEnemy),
    data,
    die: (dieOptions) => die(exports, dieOptions),
    domCanvas,
    hit: (points, target) => hit(exports, points, target),
    init: () => initSuperBunker(exports),
    nearby,
    onArrowHiddenChange: (isVisible) => onArrowHiddenChange(exports, isVisible),
    refreshNearbyItems: () => refreshNearbyItems(exports),
    spriteConfig,
    updateHealth: (attacker) => updateHealth(exports, attacker),
    updateSprite: () => applySpriteURL(exports),
    updateStatus: (newStatus) => updateStatus(exports, newStatus)
  };

  updateFireModulus(exports);

  if (data.energy === 0) {
    // initially neutral/hostile only if 0 energy
    updateStatus(exports, { hostile: true });
  }

  nearby = {
    options: {
      source: data.id,
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
        setFiring(exports, nearby.options.fireTargetCount > 0);
      },
      hit(targetID) {
        let target = getObjectById(targetID);

        let isFriendly = !data.hostile && target.data.isEnemy === data.isEnemy;

        const isTargetFriendlyToPlayer =
          !target.data.hostile &&
          target.data.isEnemy === game.players.local.data.isEnemy;

        /**
         * Enemy might be inside the bunker bounding box, e.g., parachuted in
         * from above. Consider a miss, if so.
         */
        if (
          !isFriendly &&
          data.energy > 0 &&
          !collisionCheck(target.data, exports.data)
        ) {
          // nearby enemy, and defenses activated? let 'em have it.
          nearby.options.fireTargetCount++;
        }

        /**
         * Only infantry (excluding engineers by role=1) are involved,
         * beyond this point.
         */
        if (target.data.type !== TYPES.infantry || target.data.role) return;

        /**
         * Super Bunkers can hold up to five men. Only interact if not full
         * (and friendly), OR an opposing, non-friendly infantry.
         */
        if (isFriendly && data.energy === data.energyMax) return;

        // infantry at door? contribute to capture, or arm base, depending.
        if (!collisionCheckMidPoint(target, exports)) return;

        // claim infantry, change "alignment" depending on friendliness.
        if (data.energy === 0) {
          // claimed by infantry, switching sides from neutral/hostile.

          // ensure that if we were dead, we aren't any more.
          data.dead = false;

          /**
           * Super Bunker can be enemy, hostile or friendly. For now,
           * we only care about enemy / friendly.
           */
          capture(exports, target.data.isEnemy);

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
        updateFireModulus(exports);

        if (data.energy === 0) {
          // un-manned, but dangerous to helicopters on both sides.
          updateStatus(exports, { hostile: true });

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

        sprites.updateEnergy(data.id);
      },

      miss() {
        setFiring(exports, false);
      }
    },

    // who gets fired at?
    items: null,
    targets: []
  };

  exports.nearby = nearby;

  return exports;
};

function updateFireModulus(exports) {
  let { data } = exports;

  // firing speed increases with # of infantry
  const gsRatio = 1 / GAME_SPEED_RATIOED;
  data.fireModulus = Math.max(
    1,
    FIRE_MODULUS * gsRatio - data.energy * gsRatio
  );
  // hackish: apply this back to the "1X" value - for scaling game speed / FPS.
  data.fireModulus1X = data.fireModulus;
}

function capture(exports, isEnemy) {
  let isFriendlyCapture = isEnemy === game.players.local.data.isEnemy;

  updateStatus(exports, { isEnemy });

  if (isFriendlyCapture) {
    game.objects.notifications.add('You captured and armed a super bunker ⛳');

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

function updateStatus(exports, status) {
  let { data } = exports;

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

  updateArrowState(exports);

  zones.changeOwnership(exports);
}

function setFiring(exports, state) {
  let { data } = exports;

  // firing only works, of course, when there is also energy.
  data.firing = !!(state && data.energy);
}

function updateHealth(exports, attacker) {
  let { data } = exports;

  /**
   * Notify if just disarmed by tank gunfire.
   * Note: The Super Bunker has not become friendly to the tank;
   * it's still "dangerous", but unarmed and won't fire at incoming units.
   */
  if (data.energy) return;

  let oAttacker = getObjectById(attacker);

  const isFriendly =
    oAttacker?.data?.isEnemy === game.players.local.data.isEnemy;

  // we have a tank, after all
  if (isFriendly) {
    game.objects.notifications.addNoRepeat('You disarmed a super bunker ⛳');
  } else {
    game.objects.notifications.addNoRepeat(
      'The enemy disarmed a super bunker 🚩'
    );
  }

  // disarmed super bunkers are dangerous to both sides.

  updateStatus(exports, { hostile: true });
}

function hit(exports, points, target) {
  let { data } = exports;

  // only tank flamethrowers - or, gunfire - counts against super bunkers.
  if (
    target &&
    (target.data.type === TYPES.flame || target.data.type === TYPES.gunfire) &&
    target.data.parentType === TYPES.tank
  ) {
    data.energy = Math.max(0, data.energy - points);
    updateFireModulus();
    sprites.updateEnergy(data.id);
  }
}

function die(exports) {
  let { data } = exports;

  if (data.dead) return;
  // gunfire from both sides should now hit this element.

  data.energy = 0;

  updateFireModulus(exports);

  /**
   * This object, in fact, never actually dies because it only becomes
   * neutral/hostile and can still be hit.
   */
  data.dead = false;

  // un-manned, but dangerous to helicopters on both sides.
  updateStatus(exports, { hostile: true });

  sprites.updateEnergy(data.id);

  // check if enemy convoy production should stop or start
  checkProduction();

  common.onDie(data.id);
}

function fire(exports) {
  /**
   * TODO: BUG - figure out why super bunker doesn't fire at local helicopter
   * on right side. :X
   */

  let { data, nearby } = exports;

  let fireOptions;

  if (!data.firing || !data.energy || data.frameCount % data.fireModulus !== 0)
    return;

  fireOptions = {
    parent: data.id,
    parentType: data.type,
    isEnemy: data.isEnemy,
    collisionItems: nearby.items,
    x: data.x + data.width - 2,
    y: data.y + data.gunYOffset, // position of bunker gun
    fixedXY: true,
    vX: 2,
    vY: 0,
    damagePoints: 5
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

function animate(exports) {
  let { arrowConfig, data, nearby } = exports;

  sprites.draw(exports);

  data.frameCount++;

  nearbyTest(nearby, exports);

  fire(exports);

  if (data.arrowFrameActive) {
    arrowConfig.target.angle = data.arrowFrames[data.arrowFrame];
    data.arrowFrame++;
    if (data.arrowFrame >= data.arrowFrames.length) {
      data.arrowFrameActive = false;
    }
  }

  // note: super bunkers cannot be destroyed.
  return;
}

function refreshNearbyItems(exports) {
  let { nearby } = exports;
  /**
   * Set on init, updated with zones.changeOwnership() as targets change sides.
   * NOTE: Super Bunkers likely fire at all units when armed,
   * but not when neutral.
   */
  nearby.items = getTypes(
    'infantry:all, engineer, missileLauncher, van, helicopter',
    { group: 'enemy', exports }
  );
}

function updateArrowState(exports) {
  let { arrowConfig, data } = exports;

  function makeArrowFrames(angleDelta) {
    const duration = FPS * 0.5 * (1 / GAME_SPEED);

    data.arrowFrames = [];

    for (let i = 0; i <= duration; i++) {
      // 1/x, up to 1
      data.arrowFrames[i] =
        arrowConfig.target.angle + common.dropOff(i / duration) * angleDelta;
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

  const toAngle = angles[data.hostile ? 'up' : data.isEnemy ? 'left' : 'right'];

  let delta = toAngle - arrowConfig.target.angle;

  // don't loop / turn around the wrong way.
  if (delta <= -180) {
    delta += 360;
  }

  makeArrowFrames(delta);
}

function onArrowHiddenChange(exports, isVisible) {
  let { arrowConfig, domCanvas, spriteConfig } = exports;

  // update domCanvas config
  domCanvas.img = isVisible ? [spriteConfig, arrowConfig] : spriteConfig;
}

function initDOM(exports) {
  let { arrowConfig, domCanvas, spriteConfig } = exports;

  domCanvas.img = gamePrefs.super_bunker_arrows
    ? [spriteConfig, arrowConfig]
    : spriteConfig;

  onArrowHiddenChange(exports, gamePrefs.super_bunker_arrows);

  common.initDOM(exports);
}

function initSuperBunker(exports) {
  refreshNearbyItems(exports);

  initDOM(exports);

  updateFireModulus(exports);

  exports.radarItem = game.objects.radar.addItem(exports);
}

function getSpriteURL() {
  const file = 'super-bunker_mac';
  return gamePrefs.weather === 'snow' ? `snow/${file}_snow.png` : `${file}.png`;
}

function applySpriteURL(exports) {
  let { spriteConfig } = exports;

  if (!spriteConfig) return;
  spriteConfig.src = utils.image.getImageObject(getSpriteURL());
}

SuperBunker.radarItemConfig = ({ data }) => ({
  width: 6.5,
  height: 3,
  excludeFillStroke: true,
  draw: (ctx, obj, pos, width, height) => {
    if (data?.hostile && gamePrefs.super_bunker_arrows) {
      if (!pattern) {
        pattern = ctx.createPattern(slashPattern, 'repeat');
      }
      ctx.fillStyle = pattern;
    } else {
      ctx.fillStyle =
        !data || data.hostile || data.isEnemy ? ENEMY_COLOR : '#17a007';
    }

    const left = pos.left(obj.data.left);
    const scaledWidth = pos.width(width) * 0.75;

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
