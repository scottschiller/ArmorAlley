// no-op stub for sound.js

function noop() {}

let sounds = {
  types: {
    genericSplat: [],
    metalHit: []
  },
  helicopter: {},
  inventory: {},
  shrapnel: {},
  rubberChicken: {},
  banana: {},
  bnb: {}
};

const emptyStr = '';

export {
  noop as addSequence,
  noop as addSound,
  emptyStr as audioSpriteURL,
  emptyStr as chosenCodec,
  noop as destroySound,
  noop as getPanFromLocation,
  noop as getSound,
  noop as initBNBSFX,
  noop as playQueuedSounds,
  noop as playSound,
  noop as getVolumeFromDistance,
  noop as playSoundWithDelay,
  noop as preloadCommonSounds,
  noop as skipSound,
  noop as stopSound,
  noop as playRepairingWrench,
  noop as playImpactWrench,
  noop as playTinkerWrench,
  sounds
};
