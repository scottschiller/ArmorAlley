import { Infantry } from './Infantry.js';

const Engineer = (options = {}) => {

  let object;

  // flag as an engineer
  options.role = 1;

  // hack: -ve lookahead offset allowing engineers to be basically atop turrets
  options.xLookAhead = (options.isEnemy ? 4 : -8);

  object = Infantry(options);

  // selective override: shorter delay on engineers
  object.data.inventory.orderCompleteDelay = 5;

  return object;

};

export { Engineer };