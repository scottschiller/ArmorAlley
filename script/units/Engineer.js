import { Infantry } from './Infantry.js';
import { getTypes } from '../core/global.js';

const Engineer = (options = {}) => {

  // flag as an engineer
  options.role = 1;

  // hack: -ve lookahead offset allowing engineers to be basically atop turrets
  options.xLookAhead = (options.isEnemy ? 4 : -8);


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
  }
  
  options.nearbyItems = getTypes('tank, van, missileLauncher, infantry, engineer, helicopter, turret:all, bunker:friendly', { group: 'enemy', exports: fakeExports });

  return Infantry(options);

};

export { Engineer };