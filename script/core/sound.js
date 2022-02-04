import { utils } from '../core/utils.js';
import { game } from '../core/Game.js';
import { gamePrefs } from '../UI/preferences.js';
import { rndInt, TYPES, worldWidth, DEFAULT_VOLUME } from './global.js';
import { common } from './common.js';

let soundIDs = 0;
let soundIDsToPlay = {};
const soundsToPlay = [];
const fixedPlaybackRate = true;

function getSound(soundReference) {

  if (!gamePrefs.sound) return;

  // common sound wrapper, options for positioning and muting etc.
  let soundObject;

  // multiple sound case
  if (soundReference instanceof Array) {

    // tack on a counter for multiple sounds
    if (soundReference.soundOffset === undefined) {
      soundReference.soundOffset = 0;
    }

    // mark this object
    soundObject = soundReference[soundReference.soundOffset];

    // increase, and reset the counter as necessary
    soundReference.soundOffset++;

    if (soundReference.soundOffset >= soundReference.length) {

      // re-shuffle the array, randomize a little
      soundReference = utils.array.shuffle(soundReference);
      soundReference.soundOffset = 0;

    }

  } else {

    soundObject = soundReference;

  }

  /**
   * hackish: create and destroy SMSound instances once they finish playing,
   * unless they have an `onfinish()` provided. this is to avoid hitting
   * a very reasonable Chrome restriction on the maximum number of active
   * audio decoders, as they're relatively $$$ and browsers may now block.
   * https://bugs.chromium.org/p/chromium/issues/detail?id=1144736#c27
   */
  if (soundObject && !soundObject.sound) {

    // make it happen! if not needed, throw away when finished.
    soundObject.options.id = `s${soundIDs}_${soundObject.options.url}`;
    soundIDs++;

    let _onfinish;

    soundObject.onAASoundEnd = () => {

      // call the original, if specified
      if (_onfinish) _onfinish();

      // just to be sure
      window.soundManager.destroySound(soundObject.options.id);

      soundObject.sound = null;

    }

    if (soundObject.options.onfinish) {
      // local copy, before overwriting
      _onfinish = soundObject.options.onfinish;
    }

    soundObject.options.onfinish = soundObject.onAASoundEnd;
  
    soundObject.sound = window.soundManager.createSound(soundObject.options);
  }

  return soundObject;

}

function playQueuedSounds() {

  if (!soundsToPlay.length) return;

  // empty queue
  for (let i = 0, j = soundsToPlay.length; i < j; i++) {

    // guard
    if (!soundsToPlay[i]?.soundObject?.sound) continue;

    // play() may result in a new SM2 object being created, given cloning for the `multiShot` case.
    soundsToPlay[i].soundObject.sound.play(soundsToPlay[i].localOptions);

  }

  // reset, instead of creating a new array object
  soundsToPlay.length = 0;
  soundIDsToPlay = {};

}

function getVolumeFromDistance(source, chopper) {

  // based on two objects' distance from each other, return volume -
  // e.g., things far away are quiet, things close-up are loud
  if (!source || !chopper) return 100;

  const delta = Math.abs(source.data.x - chopper.data.x);

  // volume range: 5-30%?
  return (0.05 + (0.25 * ((worldWidth - delta) / worldWidth)));

}

function getPanFromLocation(source, chopper) {

  // rough panning based on distance from chopper, relative to world width
  if (!source || !chopper) return 0;

  let delta; 
  let pan = 0;

  // don't allow 100% L/R pan, exactly

  if (source.data.x < chopper.data.x) {
    // target is to the left
    delta = chopper.data.x - source.data.x;
    pan = -(delta / worldWidth) * 0.75;
  } else {
    // to the right
    delta = source.data.x - chopper.data.x;
    pan = (delta / worldWidth) * 0.75;
  }

  return pan;

}

function playSound(soundReference, target, soundOptions) {

  const soundObject = getSound(soundReference);
  let localOptions;
  let onScreen;

  // just in case
  if (!soundObject || !soundObject.sound) return null;

  if (!gamePrefs.sound) return soundObject.sound;

  // TODO: revisit on-screen logic, drop the function call
  onScreen = (!target || common.isOnScreen(target));
  // onScreen = (target && target.data && target.data.isOnScreen);

  // old: determine volume based on on/off-screen status
  // localOptions = soundObject.soundOptions[onScreen ? 'onScreen' : 'offScreen'];

  // new: calculate volume as range based on distance
  if (onScreen) {

    localOptions = soundObject.soundOptions.onScreen;

  } else {

    // determine volume based on distance
    localOptions = {
      volume: (soundObject.soundOptions.onScreen.volume || 100) * getVolumeFromDistance(target, game.objects.helicopters[0]),
      pan: getPanFromLocation(target, game.objects.helicopters[0])
    };

  }

  if (soundOptions) {
    localOptions = common.mixin(localOptions, soundOptions);
  }

  // playback speed based on object's `playbackRate`, OR, ±5% on playback speed, for variety
  if (!soundObject?.options?.fixedPlaybackRate) {
    localOptions.playbackRate = target?.data.playbackRate || (0.95 + (Math.random() * 0.1));
  }

  // 01/2021: push sound calls off to next frame to be played in a batch,
  // trade-off of slight async vs. blocking(?) current frame
  // 01/2022: only play if not already queued.

  if (!soundIDsToPlay[soundObject.sound.id]) {

    soundIDsToPlay[soundObject.sound.id] = true;

    soundsToPlay.push({
      soundObject,
      localOptions
    });

  }

  return soundObject.sound;

}

function playSoundWithDelay() {

  let args, delay;

  args = Array.prototype.slice.call(arguments);

  // modify args, and store last argument if it looks like a number.
  if (!isNaN(args[args.length - 1])) {
    delay = args.pop();
  }

  if (!delay || isNaN(delay)) {
    delay = 500;
  }

  common.setFrameTimeout(() => {
    playSound.apply(this, args);
  }, delay);

}

function stopSound(sound) {

  const soundObject = sound && getSound(sound);

  if (!soundObject) return;

  soundObject.sound.stop();

  // manually destruct
  destroySound(soundObject);

  soundObject.sound = null;

}

function destroySound(sound) {

  if (!sound) return;

  // AA sound object case
  if (sound.onAASoundEnd) return sound.onAASoundEnd();

  // SMSound instance, an actual SM2 sound object
  if (sound.id) {
    window.soundManager.destroySound(sound.id);
  }

}

function playRepairingWrench(isRepairing, exports) {

  const args = arguments;

  if (!isRepairing()) return;

  // hackish: prevent duplicate play calls.
  if (exports.repairingWrenchTimer) return;

  exports.repairingWrenchTimer = true;

  let repairingWrench;

  playSound(sounds.repairingWrench, exports, {
    onplay: (sound) => repairingWrench = sound,
    onstop: (sound) => sound.destruct(),
    onfinish() {
      destroySound(repairingWrench);
      exports.repairingWrenchTimer = common.setFrameTimeout(function() {
        exports.repairingWrenchTimer = null;
        if (isRepairing()) {
          playRepairingWrench.apply(this, args);
        }
      }, 1000 + rndInt(2000));
    }
  });

}

function playImpactWrench(isRepairing, exports) {

  const args = arguments;

  if (!isRepairing()) return;

  // slightly hackish: dynamic property on exports.
  if (exports.impactWrenchTimer) return;

  // flag immediately, so subsequent immediate calls only trigger once
  exports.impactWrenchTimer = true;

  let impactWrench;

  playSound(sounds.impactWrench, exports, {
    onplay: (sound) => impactWrench = sound,
    onstop: (sound) => sound.destruct(),
    onfinish() {
      destroySound(impactWrench);
      exports.impactWrenchTimer = common.setFrameTimeout(function() {
        exports.impactWrenchTimer = null;
        if (isRepairing()) {
          playImpactWrench.apply(this, args);
        }
      }, 500 + rndInt(2000));
    }
  });

}

function playTinkerWrench(isRepairing, exports) {

  const args = arguments;

  // slightly hackish: dynamic property on exports.
  if (exports.tinkerWrenchActive) return;

  // flag immediately, so subsequent immediate calls only trigger once
  exports.tinkerWrenchActive = true;

  let tinkerWrench;

  playSound(sounds.tinkerWrench, exports, {
    onplay: (sound) => tinkerWrench = sound,
    onstop: (sound) => sound.destruct(),
    position: rndInt(8000),
    onfinish() {
      destroySound(tinkerWrench);
      exports.tinkerWrenchActive = false;
      if (isRepairing()) {
        playTinkerWrench.apply(this, args);
      }
    }
  });

}

/**
 * sound effects
 */

let sounds = {
  types: {
    // dependent on `TYPES`, set via `initSoundTypes()`
    metalHit: [],
    genericSplat: []
  },
  // sound configuration
  helicopter: {
    bomb: null,
    engine: null,
    engineVolume: 25,
    rotate: null
  },
  inventory: {
    begin: null,
    credit: null,
    debit: null,
    end: null,
  },
  shrapnel: {
    counter: 0,
    counterMax: 4,
    hit0: null,
    hit1: null,
    hit2: null,
    hit3: null
  },
  rubberChicken: {
    launch: null,
    expire: null,
    die: null
  },
  banana: {
    launch: null,
    expire: null,
  },
  machineGunFire: null,
  machineGunFireEnemy: null
  // numerous others will be assigned at init time.
};

function initSoundTypes() {

  sounds.types = {
    // associate certain sounds with inventory / object types
    metalHit: [TYPES.tank, TYPES.van, TYPES.missileLauncher, TYPES.bunker, TYPES.superBunker, TYPES.turret],
    genericSplat: [TYPES.engineer,TYPES.infantry,TYPES.parachuteInfantry],
  }

}

function getURL(file) {

  // SM2 will determine the appropriate format to play, based on client support.
  // URL pattern -> array of .ogg and .mp3 URLs
  return [
    `audio/mp3/${file}.mp3`,
    `audio/ogg/${file}.ogg`,
    `audio/wav/${file}.wav`
  ];

}

function addSound(options) {

  return {
    // sound object is now deferred until play(), which itself is now queued.
    sound: null,
    options,
    soundOptions: {
      onScreen: {
        volume: options.volume || DEFAULT_VOLUME,
        pan: 0
      },
      offScreen: {
        // off-screen sounds are more quiet.
        volume: parseInt((options.volume || DEFAULT_VOLUME) / 4, 10)
      }
    }
  };

}

// if SM2 is disabled or fails, still complete the sound config.
window.soundManager.ontimeout(initSoundTypes);

window.soundManager.onready(() => {

  initSoundTypes();

  sounds.machineGunFire = addSound({
    url: getURL('machinegun'),
    volume: 25
  });

  sounds.machineGunFireEnemy = addSound({
    // http://creativesounddesign.com/the-recordist-free-sound-effects/
    url: getURL('Gun_AR15_Machine_Gun_3_Single_Shot_edit')
  });

  sounds.bulletGroundHit = utils.array.shuffle([
    // https://freesound.org/people/mlsulli/sounds/234853/
    addSound({ url: getURL('234853__mlsulli__body-hits-concrete_1'), volume: 10 }),
    addSound({ url: getURL('234853__mlsulli__body-hits-concrete_2'), volume: 10 }),
    addSound({ url: getURL('234853__mlsulli__body-hits-concrete_3'), volume: 10 }),
    addSound({ url: getURL('234853__mlsulli__body-hits-concrete_4'), volume: 10 }),
    addSound({ url: getURL('234853__mlsulli__body-hits-concrete_5'), volume: 10 }),
  ]);

  sounds.bulletShellCasing = utils.array.shuffle([
    // https://freesound.org/search/?g=1&q=shell%20hitting%20ground&f=%20username:%22filmmakersmanual%22
    addSound({ url: getURL('522290__filmmakersmanual__shell-hitting-ground-12'), volume: 50 }),
    addSound({ url: getURL('522294__filmmakersmanual__shell-hitting-ground-16'), volume: 50 }),
    addSound({ url: getURL('522391__filmmakersmanual__shells-hitting-ground-2'), volume: 50 }),
    addSound({ url: getURL('522394__filmmakersmanual__shell-hitting-ground-36'), volume: 50 }),
    addSound({ url: getURL('522395__filmmakersmanual__shell-hitting-ground-3'), volume: 50 }),
    addSound({ url: getURL('522399__filmmakersmanual__shell-hitting-ground-37'), volume: 50 }),
  ]);

  sounds.bombHatch = addSound({
    // hat tip to the Death Adder for this one. ;)
    // https://youtu.be/PAER-rSS8Jk
    url: getURL('ga-typewriter'),
    volume: 33
    /*
      // different sound for enemy?
      url: getURL('ta-bombrel'),
      volume: 33
    */
  });

  sounds.impactWrench = [
    addSound({
      // http://freesound.org/people/andrewgnau2/sounds/71534/
      url: getURL('impact-wrench-1'),
      volume: 10
    }),

    addSound({
      url: getURL('impact-wrench-2'),
      volume: 10
    }),

    addSound({
      url: getURL('impact-wrench-3'),
      volume: 10
    })
  ];

  // https://freesound.org/people/jorickhoofd/sounds/160048/
  sounds.chainRepair = addSound({
    url: getURL('heavy-mechanics'),
    volume: 25
  });

  sounds.repairingWrench = [
    // http://freesound.org/people/TheGertz/sounds/131200/
    addSound({
      url: getURL('socket-wrench-1'),
      volume: 10
    }),

    // http://freesound.org/people/xxqmanxx/sounds/147018/
    addSound({
      url: getURL('socket-wrench-2'),
      volume: 10
    }),

    addSound({
      url: getURL('socket-wrench-3'),
      volume: 10
    })
  ];

  sounds.tinkerWrench = addSound({
    // http://freesound.org/people/klankbeeld/sounds/198299/
    url: getURL('tinker-wrench'),
    multiShot: false,
    volume: 20
  });

  sounds.friendlyClaim = addSound({
    // http://freesound.org/people/Carlos_Vaquero/sounds/153616/
    url: getURL('violin-c5-pizzicato-non-vibrato'),
    fixedPlaybackRate,
    volume: 8
  });

  sounds.enemyClaim = addSound({
    // http://freesound.org/people/Carlos_Vaquero/sounds/153611/
    url: getURL('violin-g4-pizzicato-non-vibrato'),
    fixedPlaybackRate,
    volume: 8
  });

  sounds.turretEnabled = addSound({
    // used when picking up infantry + engineers
    // hat tip: "tower turn" sound from TA, guns like the Guardian - a personal favourite.
    url: getURL('ta-twrturn3'),
    fixedPlaybackRate,
    volume: 25
  });

  sounds.popSound = addSound({
    // used when picking up infantry + engineers
    // http://freesound.org/people/SunnySideSound/sounds/67095/
    // url: getURL('ta-loadair'),
    url: getURL('ga-234_pickup'),
    fixedPlaybackRate,
    volume: 25
  });

  sounds.popSound2 = addSound({
    // used when deploying parachute infantry
    // http://freesound.org/people/runirasmussen/sounds/178446/
    url: getURL('popsound2'),
    volume: 10
  });

  sounds.crashAndGlass = addSound({
    // http://freesound.org/people/Rock%20Savage/sounds/59263/
    url: getURL('crash-glass')
  });

  sounds.balloonExplosion = addSound({
    url: getURL('balloon-explosion'),
    volume: 20
  });

  sounds.baseExplosion = addSound({
    // two sounds, edited and mixed together
    // https://freesound.org/people/FxKid2/sounds/367622/
    // https://freesound.org/people/Quaker540/sounds/245372/
    url: getURL('hq-explosion-with-debris')
  });

  sounds.genericSplat = [];

  // http://freesound.org/people/FreqMan/sounds/42962/
  sounds.genericSplat = [
    addSound({
      url: getURL('splat1'),
      volume: 15
    }),
    addSound({
      url: getURL('splat2'),
      volume: 15
    }),
    addSound({
      url: getURL('splat3'),
      volume: 15
    })
  ];

  sounds.genericSplat = utils.array.shuffle(sounds.genericSplat);

  sounds.scream = utils.array.shuffle([
    addSound({
      url: getURL('scream1'),
      volume: 9
    }),
    addSound({
      url: getURL('scream2'),
      volume: 9
    }),
    addSound({
      url: getURL('scream3'),
      volume: 9
    }),
    addSound({
      url: getURL('scream4'),
      volume: 9
    }),
    addSound({
      url: getURL('scream5'),
      volume: 9
    }),
    addSound({
      url: getURL('ga-191_ouch'),
      volume: 40
    }),
    addSound({
      url: getURL('ga-237_ouch2'),
      volume: 40
    }),
  ]);

  sounds.bombExplosion = [
    addSound({
      url: getURL('ga-219_bomb'),
      volume: 50
    }),
    addSound({
      url: getURL('ga-220_bomb'),
      volume: 50
    }),
    addSound({
      url: getURL('explosion'),
      volume: 45
    })
  ];

  sounds.genericBoom = addSound({
    url: getURL('explosion'),
    volume: 45
  });

  sounds.genericExplosion = [
    addSound({
      url: getURL('generic-explosion'),
      volume: 24
    }),
    addSound({
      url: getURL('generic-explosion-2'),
      volume: 24
    }),
    addSound({
      url: getURL('generic-explosion-3'),
      volume: 24
    }),
    addSound({
      url: getURL('explosion2'),
      volume: 33
    })
  ];

  sounds.genericGunFire = addSound({
    url: getURL('generic-gunfire')
  });

  sounds.infantryGunFire = addSound({
    // http://creativesounddesign.com/the-recordist-free-sound-effects/
    url: getURL('Gun_Machine_Gun_M60E_Burst_1_edit')
  });

  sounds.turretGunFire = addSound({
    // https://freesound.org/people/CGEffex/sounds/101961/
    url: getURL('101961__cgeffex__heavy-machine-gun_edit'),
    volume: 40
  });

  // http://freesound.org/people/ceberation/sounds/235513/
  sounds.doorClose = addSound({
    url: getURL('door-closing'),
    volume: 12
  });

  sounds.metalHitBreak = addSound({
    // https://freesound.org/people/issalcake/sounds/115919/
    url: getURL('115919__issalcake__chairs-break-crash-pieces-move'),
    volume: 40
  });

  // Bolo "hit tank self" sound, Copyright (C) Steuart Cheshire 1993.
  // A subtle tribute to my favourite Mac game of all-time, hands down. <3
  // https://en.wikipedia.org/wiki/Bolo_(1987_video_game)
  // http://bolo.net/
  // https://github.com/stephank/orona/
  // http://web.archive.org/web/20170105114652/https://code.google.com/archive/p/winbolo/
  sounds.boloTank = addSound({
    url: getURL('bolo-hit-tank-self'),
    volume: 25
  });

  // "Tank fire Mixed.wav" by Cyberkineticfilms (CC0 License, “No Rights Reserved”)
  // https://freesound.org/people/Cyberkineticfilms/sounds/127845/
  sounds.tankGunFire = addSound({
    url: getURL('tank-gunfire'),
    volume: 15
  });

  sounds.metalHit = utils.array.shuffle([
    // https://freesound.org/search/?g=1&q=bullet%20metal%20hit&f=%20username:%22filmmakersmanual%22
    addSound({
      url: getURL('522506__filmmakersmanual__bullet-metal-hit-2_edit'),
      volume: 25
    }),

    addSound({
      url: getURL('522507__filmmakersmanual__bullet-metal-hit-3_edit'),
      volume: 25
    }),

    addSound({
      url: getURL('522508__filmmakersmanual__bullet-metal-hit-4_edit'),
      volume: 25
    }),

    addSound({
      url: getURL('522509__filmmakersmanual__bullet-metal-hit-4_edit'),
      volume: 25
    })
  ]);

  // https://freesound.org/search/?q=bullet+concrete+hit&f=username%3A%22filmmakersmanual%22
  sounds.concreteHit = utils.array.shuffle([
    addSound({
      url: getURL('522403__filmmakersmanual__bullet-concrete-hit-2_edit')
    }),
    addSound({
      url: getURL('522402__filmmakersmanual__bullet-concrete-hit-3_edit')
    }),
    addSound({
      url: getURL('522401__filmmakersmanual__bullet-concrete-hit-4_edit')
    })
  ]);

  // https://freesound.org/people/rakurka/sounds/109957/
  sounds.ricochet = utils.array.shuffle([
    addSound({
      url: getURL('109957__rakurka__incoming-ricochets-2_1'),
      volume: 25
    }),

    addSound({
      url: getURL('109957__rakurka__incoming-ricochets-2_2'),
      volume: 25
    }),

    addSound({
      url: getURL('109957__rakurka__incoming-ricochets-2_3'),
      volume: 25
    }),

    addSound({
      url: getURL('109957__rakurka__incoming-ricochets-2_4'),
      volume: 25
    }),

    // https://freesound.org/people/Timbre/sounds/486343/
    addSound({
      url: getURL('486343__timbre__selected-ricochets-no-bang-from-craigsmith-s-freesound-486071_1'),
      volume: 4
    }),

    addSound({
      url: getURL('486343__timbre__selected-ricochets-no-bang-from-craigsmith-s-freesound-486071_2'),
      volume: 4
    }),

    addSound({
      url: getURL('486343__timbre__selected-ricochets-no-bang-from-craigsmith-s-freesound-486071_3'),
      volume: 4
    }),

    addSound({
      url: getURL('486343__timbre__selected-ricochets-no-bang-from-craigsmith-s-freesound-486071_4'),
      volume: 4
    }),

    addSound({
      url: getURL('486343__timbre__selected-ricochets-no-bang-from-craigsmith-s-freesound-486071_5'),
      volume: 4
    }),

    addSound({
      url: getURL('486343__timbre__selected-ricochets-no-bang-from-craigsmith-s-freesound-486071_6'),
      volume: 4
    }),

    addSound({
      url: getURL('486343__timbre__selected-ricochets-no-bang-from-craigsmith-s-freesound-486071_7'),
      volume: 4
    }),

  ]);

  sounds.balloonHit = addSound({
    // https://freesound.org/people/citeyo1/sounds/430302/
    url: getURL('430302__citeyo1__aparicion_edit')
  });
  
  sounds.explosionLarge = utils.array.shuffle([
    addSound({
      url: getURL('explosion-large'),
      volume: 60
    }),
    addSound({
      // https://freesound.org/people/Quaker540/sounds/245372/
      url: getURL('245372__quaker540__hq-explosion'),
      volume: 50
    }),
    addSound({
      // https://freesound.org/people/Bykgames/sounds/414345/
      url: getURL('414345__bykgames__explosion-near'),
      volume: 50
    }),
  ]);

  sounds.chainSnapping = addSound({
    url: getURL('chain-snapping'),
    volume: 15
  });

  sounds.wilhemScream = utils.array.shuffle([
    addSound({
      url: getURL('wilhem-scream'),
      volume: 20
    }),
    addSound({
      url: getURL('ga-156_scream'),
      volume: 40
    }),
  ]);

  sounds.helicopter.engine = addSound({
    url: getURL('helicopter-engine'),
    fixedPlaybackRate,
    volume: 50,
    loops: 999
  });

  sounds.helicopter.rotate = addSound({
    url: getURL('helicopter-rotate'),
    fixedPlaybackRate,
    volume: 10
  });

  sounds.inventory.denied = addSound({
    url: getURL('order-denied'),
    fixedPlaybackRate,
  });

  sounds.inventory.begin = addSound({
    url: getURL('order-start'),
    fixedPlaybackRate,
    volume: 30
  });

  sounds.inventory.debit = addSound({
    url: getURL('funds-debit'),
    fixedPlaybackRate,
    volume: 50
  });

  sounds.inventory.credit = addSound({
    url: getURL('funds-credit'),
    fixedPlaybackRate,
    volume: 60
  });

  sounds.inventory.end = addSound({
    url: getURL('order-complete'),
    fixedPlaybackRate,
    volume: 10
  });

  sounds.missileLaunch = addSound({
    url: getURL('ga-217_missile_launch'),
    volume: 25
  });

  sounds.missileWarning = addSound({
    // http://soundbible.com/1766-Fire-Pager.html
    // public domain
    url: getURL('fire_pager-jason-1283464858_edit'),
    fixedPlaybackRate,
    loops: 999,
    volume: 3
  });

  sounds.missileWarningExpiry = addSound({
    // http://soundbible.com/1766-Fire-Pager.html
    // public domain
    url: getURL('fire_pager-jason-1283464858_edit_long'),
    fixedPlaybackRate,
    volume: 2
  })

  sounds.parachuteOpen = addSound({
    url: getURL('parachute-open'),
    volume: 25
  });

  sounds.shrapnel.hit0 = addSound({
    url: getURL('shrapnel-hit'),
    volume: 7
  });

  sounds.shrapnel.hit1 = addSound({
    url: getURL('shrapnel-hit-2'),
    volume: 7
  });

  sounds.shrapnel.hit2 = addSound({
    url: getURL('shrapnel-hit-3'),
    volume: 7
  });

  sounds.shrapnel.hit3 = addSound({
    url: getURL('shrapnel-hit-4'),
    volume: 7
  });

  sounds.splat = addSound({
    url: getURL('splat'),
    volume: 25
  });

  sounds.radarStatic = addSound({
    url: getURL('radar-static'),
    fixedPlaybackRate,
    volume: 40
  });

  sounds.radarJamming = addSound({
    url: getURL('radar-jamming'),
    fixedPlaybackRate,
    volume: 33,
    loops: 999
  });

  sounds.repairing = addSound({
    url: getURL('repairing'),
    volume: 15,
    loops: 999
  });

  sounds.ipanemaMuzak = addSound({
    // hat tip to Mike Russell for the "vintage radio" / elevator muzak EQ effect: https://youtu.be/ko9hRYx1lF4
    url: getURL('ipanema-elevator'),
    fixedPlaybackRate,
    volume: 5,
    loops: 999
  })

  sounds.rubberChicken.launch = utils.array.shuffle([
    addSound({
      url: getURL('rubber-chicken-launch-1'),
      volume: 20
    }),
    addSound({
      url: getURL('rubber-chicken-launch-2'),
      volume: 20
    }),
    addSound({
      url: getURL('rubber-chicken-launch-3'),
      volume: 20
    })
  ]);

  sounds.rubberChicken.expire = addSound({
    url: getURL('rubber-chicken-expire'),
    volume: 30
  });

  sounds.rubberChicken.die = utils.array.shuffle([
    addSound({
      url: getURL('rubber-chicken-hit-1'),
      volume: 20
    }),
    addSound({
      url: getURL('rubber-chicken-hit-2'),
      volume: 20
    }),
    addSound({
      url: getURL('rubber-chicken-hit-3'),
      volume: 20
    }),
    addSound({
      url: getURL('rubber-chicken-hit-4'),
      volume: 20
    })
  ]);

  // https://freesound.org/people/JohnsonBrandEditing/sounds/173948/
  sounds.banana.launch = addSound({
    url: getURL('173948__johnsonbrandediting__musical-saw-ascending-ufo'),
    volume: 50
  });

  sounds.banana.expire = addSound({
    url: getURL('ufo-expire'),
    volume: 75
  });
  
});

export {
  destroySound,
  getSound,
  playQueuedSounds,
  playSound,
  getVolumeFromDistance,
  playSoundWithDelay,
  stopSound,
  playRepairingWrench,
  playImpactWrench,
  playTinkerWrench,
  sounds
};
