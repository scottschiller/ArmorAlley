// no-op stub for floppy disk builds
function noop() {}

const net = {
  active: false,
  debugNetwork: false,
  connected: false,

  init: noop,
  connect: noop,

  remoteID: '',

  reset: noop,
  updateFrameTiming: noop
};

export { net };
