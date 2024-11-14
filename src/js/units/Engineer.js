import { Infantry } from './Infantry.js';
import { game } from '../core/Game.js';
import { getTypes } from '../core/global.js';

const Engineer = (options = {}) => {
  // flag as an engineer
  options.role = 1;

  // hackish: BNB - alternate characters with each group.
  if (!options.isEnemy) {
    options.isBeavis = !game.data.engineerSwitch;
    options.isButthead = !options.isBeavis;
    game.data.engineerSwitch = !game.data.engineerSwitch;
  }

  // special case 1: -ve lookahead offset allowing engineers to be basically atop turrets
  // the BnB stuff is set later.
  options.xLookAheadTurret = options.isEnemy ? 0 : -8;

  // special case 2: BnB bunker offsets
  options.xLookAheadBunker = {
    beavis: 11,
    butthead: -9
  };

  /**
   * Hackish: override nearby list to include usual enemies, *plus* only friendly bunkers.
   * Infantry can interact with both friendly and enemy bunkers.
   * Engineers can interact with both friendly and enemy turrets.
   */

  // Ahead-of-time data for `getTypes()`
  const fakeExports = {
    data: {
      isEnemy: options.isEnemy
    }
  };

  options.nearbyItems = getTypes(
    'tank, van, missileLauncher, infantry, engineer, helicopter, turret:all, bunker:friendly',
    { group: 'enemy', exports: fakeExports }
  );

  const engineer = Infantry(options);

  // override infantry method
  engineer.data.domCanvas.radarItem = Engineer.radarItemConfig();

  return engineer;
};

Engineer.radarItemConfig = () => ({
  width: 1.25,
  height: 2.5,
  excludeFillStroke: true,
  draw: (ctx, obj, pos, width, height) => {
    // "backpack"
    const scaledWidth = pos.width(width);
    const scaledOffset =
      scaledWidth * 0.75 * (1 / game.objects.radar.data.cssRadarScale);
    ctx.roundRect(
      pos.left(
        obj.data.left +
          (obj.oParent?.data?.isEnemy ? scaledOffset : -scaledOffset)
      ),
      pos.bottomAlign(height - 0.25, obj),
      scaledWidth,
      pos.height(1),
      0.5
    );
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    // "body"
    ctx.roundRect(
      pos.left(obj.data.left),
      pos.bottomAlign(height, obj),
      pos.width(width),
      pos.height(height),
      [height, height, 0, 0]
    );
    ctx.fill();
    ctx.stroke();
  }
});

export { Engineer };
