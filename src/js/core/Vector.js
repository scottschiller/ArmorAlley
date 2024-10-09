/**
 * Basic vector methods
 * hat tip: p5.js and "nature of code: autonomous agents"
 * https://github.com/processing/p5.js/blob/main/src/math/p5.Vector.js
 * https://natureofcode.com/vectors
 */

import { MAX_AVOID_AHEAD, MAX_VELOCITY } from '../units/Helicopter-utils.js';

const MAX_FORCE = 4;

// approximate "nearby" distance
const ARRIVE_DISTANCE = MAX_AVOID_AHEAD * 2;

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) {
    // note: most methods mutate x + y. `sub()` and `clone()` return new Vector() instances.
    if (!v) return;
    this.x += v.x;
    this.y += v.y;
  }

  sub(v) {
    // calls expect a new object, not a mutation.
    return new Vector(this.x - (v?.x || 0), this.y - (v?.y || 0));
  }

  mag() {
    // vector "length": pythagorean theorem: hypotenuse of a right-angle triangle.
    // https://natureofcode.com/vectors/#vector-magnitude
    return (
      Math.hypot?.(this.x, this.y) ||
      Math.sqrt(this.x * this.x + this.y * this.y)
    );
  }

  normalize() {
    // scale X + Y components down to "unit vectors" with a length of 1.
    // https://natureofcode.com/vectors/#vector-magnitude
    this.div(this.mag());
  }

  mult(n = 0) {
    this.x *= n;
    this.y *= n;
  }

  clone() {
    // return a new vector object.
    return new Vector(this.x, this.y);
  }

  getAngle() {
    return Math.atan2(this.y, this.x);
  }

  limit(max) {
    if (this.mag() > max) {
      this.setMag(max);
    }
  }

  div(n) {
    // avoid dividing by zero.
    if (this.x !== 0) this.x /= n;
    if (this.y !== 0) this.y /= n;
  }

  setMag(n) {
    // set the magnitude of a vector
    this.normalize();
    this.mult(n);
  }

  dist(v) {
    // scalar: distance between two vectors
    return this.sub(v).mag();
  }

  dot(v) {
    /**
     * returns the dot product, as a number
     * often used to find the angle between two vectors
     * https://natureofcode.com/autonomous-agents/#the-dot-product
     * https://github.com/processing/p5.js/blob/main/src/math/p5.Vector.js
     * also: https://radzion.com/blog/linear-algebra/vectors
     */
    return this.x * v.x + this.y * v.y;
  }
}

// "static" vector methods

function dist(v1, v2) {
  return v1.sub(v2).mag();
}

function xyDistance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

function seek(
  target,
  position,
  velocity,
  maxForce = MAX_FORCE,
  maxVelocity = MAX_VELOCITY
) {
  // calculates and applies a steering force towards a target
  let desired = target.sub(position);

  desired.setMag(maxVelocity);

  // steering = desired minus velocity
  var steer = desired.sub(velocity);

  steer.limit(maxForce);

  return steer;
}

function arrive(
  target,
  position,
  velocity,
  maxVelocity = MAX_VELOCITY,
  arriveDistance = ARRIVE_DISTANCE
) {
  // slow down as target draws nearer.
  let desired = target.sub(position);

  let d = desired.mag();

  // if "close"...
  if (d < arriveDistance) {
    desired.setMag(Math.max(0.5, d * 2 - arriveDistance) / arriveDistance);
  } else {
    // otherwise, speed up relative to distance away.
    // TODO: review.
    desired.setMag(Math.max(0.1, Math.min(d / arriveDistance, maxVelocity)));
  }

  // steering = desired – velocity
  let steer = desired.sub(velocity);

  return steer;
}

function getNormalPoint(position, a, b) {
  // https://natureofcode.com/autonomous-agents/#path-following

  // a -> position
  let vectorA = position.sub(a);

  // a -> b
  let vectorB = b.sub(a);

  // use the dot product for scalar projection
  vectorB.normalize();
  vectorB.mult(vectorA.dot(vectorB));

  // find the normal point along the line segment
  let normalPoint = a.clone();
  normalPoint.add(vectorB);

  return normalPoint;
}

function findProjection(pos, a, b) {
  let v1 = a.clone();
  let v2 = b.clone();

  v1 = v1.sub(pos);
  v2 = v2.sub(pos);

  v2.normalize();

  let sp = v1.dot(v2);

  v2.mult(sp);
  v2.add(pos);

  return v2;
}

function getAverages() {
  // reduce "jitter" on certain forces
  return {
    arrive: {
      length: 8,
      samples: []
    },
    avoid: {
      length: 16,
      samples: []
    },
    seek: {
      length: 8,
      samples: []
    },
    steering: {
      length: 8,
      samples: []
    },
    path: {
      length: 16,
      samples: []
    }
  };
}

function averageForce(force, averages, type = 'avoid') {
  // rolling average of last N values
  let avg = averages[type];

  // cycle + maintain array length
  avg.samples.push(force);
  if (avg.samples.length > avg.length) {
    avg.samples.shift();
  }

  // calc + return the average
  let result = new Vector(0, 0);
  for (var i = 0, j = avg.samples.length; i < j; i++) {
    result.add(avg.samples[i]);
  }
  result.div(avg.samples.length);
  return result;
}

export {
  MAX_AVOID_AHEAD,
  MAX_VELOCITY,
  Vector,
  arrive,
  averageForce,
  dist,
  findProjection,
  getAverages,
  getNormalPoint,
  seek,
  xyDistance
};
