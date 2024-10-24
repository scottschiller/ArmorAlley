import { objectsInView } from '../core/logic.js';

// CPU threshold for "dangerously-low" flying
const TOO_LOW = 320;
const MAX_AVOID_AHEAD = 64;
const MAX_VELOCITY = 8;

function distance(a, b) {
  // convenience method
  return Math.abs(a - b);
}

function findEnemy(
  // by default, the current helicopter
  helicopterData,
  items,
  triggerDistance = 0,
  enemyOnly = true
) {
  // convenience method for objectsInView()
  return objectsInView(helicopterData, {
    items,
    triggerDistance,
    enemyOnly
  });
}

function lineIntersectsObject(position, velocity, ahead, o) {
  var tv = velocity.clone();
  tv.setMag((MAX_AVOID_AHEAD * 0.5 * velocity.mag()) / MAX_VELOCITY);

  let ahead2 = position.clone();
  ahead2.add(tv);

  // check if within bounds of rect
  return (
    rectContains(o, ahead) ||
    rectContains(o, ahead2) ||
    rectContains(o, position)
  );
}

function rectContains(rect, point) {
  // https://stackoverflow.com/a/40687799
  return rect.x <= point.x &&
    point.x <= rect.x + rect.width &&
    rect.y <= point.y &&
    point.y <= rect.y + rect.height
    ? point
    : null;
}

function findObj(type, obj) {
  // return the battlefield object itself, OR, its sub-object as long as not dead.
  if (obj.data.type === type) return !obj?.data?.dead ? obj : null;
  const o = obj.objects?.[type];
  return !o?.data?.dead ? o : null;
}

function getCompositeObject(obj) {
  // if a bunker <-> chain <-> balloon, treat the whole thing as one big obstacle shape.
  let x = 0,
    y = 0,
    width = 0,
    height = 0;

  let balloon = findObj('balloon', obj);
  let chain = findObj('chain', obj);
  let bunker = findObj('bunker', obj);

  // X coordinate "priority": take widest first; bunker -> balloon -> chain
  if (bunker) {
    x = bunker.data.x;
    width = bunker.data.width;
  } else if (balloon) {
    x = balloon.data.x;
    width = balloon.data.width;
  } else if (chain) {
    // I don't think this is necessary, but just in case...
    let padding = 16;
    x = chain.data.x - (padding / 2 - chain.data.width);
    width = chain.data.width + padding;
  }

  // Y coordinate priority: top -> bottom, taking whichever is found first.
  // add height as we go.
  if (balloon) {
    if (!y) y = balloon.data.y;
    height += balloon.data.height;
  }

  if (chain) {
    if (!y) y = chain.data.y;
    // note: chain height may be negative.
    height += Math.max(0, chain.data.height);
  }

  if (bunker) {
    if (!y) y = bunker.data.y;
    height += bunker.data.height;
  }

  const shape = {
    id:
      'composite_' +
      [bunker, chain, balloon].map((o) => o?.data?.id || '').join('_'),
    type: 'composite',
    x,
    y,
    width,
    height
  };

  return shape;
}

function brakeX(data, x = 0.99) {
  data.vX *= x;
}

function brakeY(data, y = 0.99) {
  data.vY *= y;
}

function brakeXY(data, p1 = 0.99, p2) {
  brakeX(data, p1);
  // if no second param, use the first for both.
  brakeY(data, p2 || p1);
}

export {
  brakeX,
  brakeY,
  brakeXY,
  distance,
  findEnemy,
  findObj,
  getCompositeObject,
  lineIntersectsObject,
  rectContains,
  TOO_LOW,
  MAX_AVOID_AHEAD,
  MAX_VELOCITY
};
