// helicopter AI extensions: forces

import { arrive, Vector } from '../core/Vector.js';

function addAction(data, action, object) {
  // basic flags, e.g., avoid: { helicopter: true }
  if (!data.actions[action]) data.actions[action] = {};
  data.actions[object] = true;
}

function addForce(data, vector, action = 'default', object = 'default') {
  // just in case...
  if (action !== 'default' && object !== 'default') {
    addAction(data, action, object);
  }

  // e.g., forces.avoid = {};
  if (!data.forces[action]) data.forces[action] = {};

  let f = data.forces[action];

  // forces.avoid.default = [] or forces.avoid.balloon = [];
  if (!f[object]) {
    f[object] = [];
  }

  f[object].push(vector);
}

function processForces(data) {
  // high-level: drop seek + arrive if an avoid is underway.
  if (data.forces.avoid) {
    data.forces.seek = null;
    data.forces.arrive = null;
  }

  // if heading for landing pad, drop other seek / arrive forces
  if (
    data.forces.seek?.['landing-pad'] ||
    data.forces.arrive?.['landing-pad']
  ) {
    if (data.forces.seek) {
      for (const s in data.forces.seek) {
        if (s !== 'landing-pad') {
          delete data.forces.seek[s];
        }
      }
    }
    if (data.forces.arrive) {
      for (const a in data.forces.arrive) {
        if (a !== 'landing-pad') {
          delete data.forces.arrive[a];
        }
      }
    }
  }
}

function sumForces(data) {
  // iterate through actions and objects, adding all vectors.
  let vec = new Vector();
  for (const action in data.forces) {
    // forces -> avoid -> balloon -> [...]
    for (const obj in data.forces[action]) {
      data.forces[action][obj].forEach((v) => vec.add(v));
    }
  }
  return vec;
}

function applyForces(data) {
  // figure out which (if any) forces to drop or ignore
  processForces(data);

  // add + apply the remainder
  const theForce = sumForces(data);

  data.vX += theForce.x;
  data.vY += theForce.y;
}

export { addForce, applyForces };
