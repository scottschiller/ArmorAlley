import { gameEvents, EVENTS } from './GameEvents.js';
import { oneOf, TYPES, winloc } from './global.js';
import { utils } from '../core/utils.js';
import { addSequence, addSound, getSound, playSound, skipSound } from './sound.js';
import { game } from './Game.js';
import { common } from './common.js';
import { gamePrefs } from '../UI/preferences.js';
import { isGameOver } from './logic.js';
import { effects } from './effects.js';

const bnb = {};
const playImmediately = { playImmediately: true };
const excludeThrottling = { excludeThrottling: true };
const fixedPlaybackRate = true;

const { shuffle } = utils.array;

// sound playback functions

let lastPlayedBnBSound = null;

let soundsToPlayBNB = [];

let nextBNBTimer;
let nextBNBTimeout;

// called by sound.js
const queueBNBSound = (obj = {}) => soundsToPlayBNB.push(obj);

/**
 * sounds.bnb[name] = { ... }
 * [s1, s2, s3];                               // legacy array. play() gets one sound at a time, array shuffled after last sound picked.
 * addSequence(s1, s2, s3);                    // play() goes through all items, and returns a flat array of sounds to play in sequence.
 * [s1, () => Math.random() >= 0.5 ? s2 : s3]  // functions can be provided, allowing run-time logic and sound selection.
 * addSequence(s1, addSequence(s2, () => {})); // nesting of both sequences and functions should work.
 */

function getBnBSound(ref) {

  if (!gamePrefs.bnb) return;

  if (!ref) return;

  if (ref.isSequence) return getBnBSound(getSoundFromSequence(ref));

  if (ref.length && !ref.isSoundArray) return getBnBSound(getSoundFromArray(ref));

  if (ref instanceof Function) return getBnBSound(ref());

  return ref;

}

function getSoundFromSequence(ref) {

  if (!ref?.forEach) return;

  let result = [];
  let soundItem;

  ref.forEach((item) => {

    if (!item) {
      console.warn('getSoundFromSequence: WTF no item?', ref, item);
      return;
    }

    soundItem = getSound(item);

    // guard
    if (soundItem === undefined) {
      console.warn('getSoundFromSequence - missing sound?', ref, item, soundItem);
      return;
    }

    if (soundItem === false) {
      console.warn('getSoundFromSequence: boolean false - ignoring', ref, item, soundItem);
      return;
    }

    result.push(soundItem);

  });

  // prevent recursion through this result
  result.isSoundArray = true;

  return result;

}

function playSequence(soundReference, exports, sequenceOptions = {}) {

  // single sound, sequence, or nested variant
  let sounds = getBnBSound(soundReference);

  if (!sounds) return;

  // only skip a sequence if this sequenceOptions method is provided, and returns false-y.
  const playNextCondition = soundReference.playNextCondition || sequenceOptions.playNextCondition || (() => true);

  const soundOptions = {
    onfinish: function(sound) {

      const { parentSoundObject } = sound;

      // bail if a sound didn't play, if the playNextCondition is false-y, or we're at the end.
      if (sound.skipped || !playNextCondition()) {

        // if a sequence, and this is the first, then drop all the others.
        if (parentSoundObject.sequenceOffset === 0) {

          // note length - 1, we have already processed the first sound in the sequence.
          const removed = soundsToPlayBNB.splice(0, parentSoundObject.sequenceLength);

          // ensure those objects are destroyed, too.
          removed.forEach((removedItem) => {
            if (removedItem?.soundObject?.sound) {
              removedItem.soundObject.sound.parentSoundObject = null;
              removedItem.soundObject.sound.destruct();
              removedItem.soundObject.sound = null;
            }
          });

        }

        sequenceOptions?.onfinish?.apply(sound, [sound]);

        return;
        
      }

      // last sound? fire onfinish if specified.
      // be liberal: allow for "missing" sounds, too. Derrrr.
      if (parentSoundObject.sequenceOffset >= parentSoundObject.sequenceLength - 1) {
        sequenceOptions?.onfinish?.apply(sound, [sound]);
      }

      nextBNBSoundIfPaused();

    }
  }

  // filter out false boolean results, given () => logic.
  sounds = sounds.filter((sound => sound !== false));

  // note: sequenceOffset is provided to each.
  sounds.forEach((sound, index) => {

    // sequence -> sound objects for max delay
    if (soundReference.maxDelay) {
      sound.maxDelay = soundReference.maxDelay;
    }

    // hackish. TODO: move these to somewhere better?
    sound.sequenceOffset = index;
    sound.sequenceLength = sounds.length;

    // by default, subsequent sounds are allowed to take as long as they need to play.
    // if the first sound is skipped, then subsequent ones will be removed entirely.
    // if already true, let it be.
    sound.excludeDelay = sound.excludeDelay || (index > 0);

    playSound(sound, exports, {
      ...soundOptions,
      maxDelay: soundReference.maxDelay
    });

  });

}

function nextBNBSoundIfPaused() {

  if (!gamePrefs.bnb || !soundsToPlayBNB.processing) return;

  // if the game is paused, setFrameTimeout()-based callbacks may not be happening.
  // use the classic, instead.
  if (game.data.paused && !nextBNBTimeout) {
    soundsToPlayBNB.processing = false;
    nextBNBTimeout = window.setTimeout(() => {
      nextBNBTimeout = null;
      playQueuedBNBSounds();
    }, 500);
  }

}

function nextBNBSound() {

  if (!soundsToPlayBNB.processing) return;

  nextBNBSoundIfPaused();
 
  // guard
  if (nextBNBTimer) return;
  
  // slight delay between sounds, when processing queue
  nextBNBTimer = common.setFrameTimeout(() => {
    nextBNBTimer = null;
    // a sound has finished, or is being skipped (because it was throttled etc.)
    soundsToPlayBNB.processing = false;
  }, 250);

}

function resetBNBSoundQueue() {

  soundsToPlayBNB = [];
  soundsToPlayBNB.processing = false;

}

function playQueuedBNBSounds() {

  var now = Date.now();

  // sound playback failed / onfinish callback was missed, or game was paused / window was blurred, computer went to sleep etc.
  if (soundsToPlayBNB.processing && soundsToPlayBNB.length && now - soundsToPlayBNB[0].queued > 66666 && !isGameOver()) {
    console.warn(`Stuck or delayed sound queue? ${soundsToPlayBNB.processing ? 'Resetting "processing" flag' : ' processing = false'}`, soundsToPlayBNB.length, soundsToPlayBNB);
    console.warn('sounds in queue:', soundsToPlayBNB.map((bnbSound) => bnbSound));
    console.warn('sound that may have gotten stuck:', lastPlayedBnBSound);
    console.warn('soundManager.soundIDs', window.soundManager.soundIDs.join(', '));
    // soundsToPlayBNB.processing = false;
    // return;
  }

  if (soundsToPlayBNB.length && !soundsToPlayBNB.processing) {

    soundsToPlayBNB.processing = true;

    // take the first one.
    const item = soundsToPlayBNB.shift();

    lastPlayedBnBSound = item;

    // if no sound, just skip - this applies to throttled sounds.
    if (!item.soundObject.sound) return nextBNBSound();

    const options = item.soundObject.soundOptions;

    // TODO: verify the source of `throttle`.
    const throttle = item.throttle || options.throttle || item.soundObject.throttle || 0;

    const lastPlayed = item.soundObject.lastPlayed || 0;

    let delay = (now - item.queued);

    // if unspecified, go with a huge delay.
    const maxDelay = item.soundObject.maxDelay || item.maxDelay || 99999;

    const delayed = (delay >= maxDelay && !item.soundObject.excludeDelay);

    const throttled = (!item.soundObject.excludeThrottling && lastPlayed && throttle && (now - lastPlayed < throttle));

    // if this sound is the second (or greater) in a sequence, never skip.
    const isContinuingSequenceSound = (item.soundObject.sequenceOffset > 0);

    // skip if a BnB sound is queued, but pref was disabled in the meantime
    if (!gamePrefs.bnb) {
      item.soundObject.skip = true;
    }

    // too late to play, OR, too fast to replay
    if ((delayed || throttled || item.soundObject.skip) && !isContinuingSequenceSound) {

      const url = item.soundObject.options.url.substr(item.soundObject.options.url.lastIndexOf('/') + 1);

      if (delayed) {
        console.log(`Delayed (${delay} > ${maxDelay} msec)`, url, item);
      }

      if (throttled) {
        console.log(`Throttled ${now - lastPlayed} / ${throttle}, ${url}`);
      }

      if (item.soundObject.skip) {
        console.log('Skipping (part of sequence?)', url, item);
      }

      // hackish: mark as "skipped"
      item.soundObject.sound.skipped = true;

      // hackish
      item.soundObject.sound.sequenceOffset = item.soundObject.sequenceOffset;
      item.soundObject.sound.sequenceLength = item.soundObject.sequenceLength;

      // special case: fire onfinish() immediately, if specified.
      if (item.localOptions.onfinish) {
        item.localOptions.onfinish.apply(item.soundObject.sound, [{ ...item.soundObject.sound, skipped: true }]);
      }

      // fire the original onfinish, too.
      if (item.soundObject.options.onfinish) {
        item.soundObject.options.onfinish.apply(item.soundObject.sound, [{ ...item.soundObject.sound, skipped: true }]);
      }

      return nextBNBSound();

    }

    const playDelay = item.soundObject.delay || (isContinuingSequenceSound ? 500 : 0);

    item.soundObject.lastPlayed = now + playDelay;

    playAndThen(item, nextBNBSound, playDelay);

  }

}

function playAndThen(soundReference, callback, delay = 0) {

  // given a sound reference, play it "and then" fire a custom callback.
  if (!soundReference?.soundObject || !callback) {
    console.warn('WTF no soundObject or missing callback?', soundReference, callback);
    return;
  }

  // preserve existing SMSound onfinish, if specified.
  const _onfinish = soundReference.soundObject.options.onfinish;

  const { sound } = soundReference.soundObject;

  const newOnFinish = function() {

    // hackish: avoid recursion
    if (soundReference.localOptions.onfinish && soundReference.localOptions.onfinish !== newOnFinish) soundReference.localOptions.onfinish.apply(sound, [sound]);

    // fire the original, if specified
    if (_onfinish) _onfinish.apply(sound, [sound]);

    sound.destruct();

    // break circular reference
    sound.parentSoundObject.sound = null;
    sound.parentSoundObject = null;

    // now, the local callback.
    callback();

  }

  function play() {
    gameEvents.fire(EVENTS.boring);
    sound.play({
      ...soundReference.localOptions,
      onfinish: newOnFinish
    });
  }

  if (delay) {
    if (game.data.paused) {
      window.setTimeout(play, delay);
    } else {
      common.setFrameTimeout(play, delay);
    }
  } else {
    play();
  }

}

function getSoundFromArray(ref) {

  if (!ref?.length) return;

  if (!ref.soundIndex) ref.soundIndex = 0;

  const arrayItem = ref[ref.soundIndex];

  // have we hit the end?
  if (++ref.soundIndex >= ref.length) {
    // shuffle could be done here, if not a sequence AND shuffle isn't excluded.
    ref.soundIndex = null;
  }

  // prevent recursion through nested array results
  if (arrayItem instanceof Array) {
    arrayItem.isSoundArray = true;
  }

  return arrayItem;

}

// --- BnB sound config ---

// https://youtu.be/nSsYgd96seg

function bnbURL(file) {
  if (document.domain === 'localhost') return `audio/bnb/${file}.wav`;

  // SM2 will determine the appropriate format to play, based on client support.
  // URL pattern -> array of .ogg and .mp3 URLs
  return [
    `audio/mp3/bnb/${file}.mp3`,
    `audio/ogg/bnb/${file}.ogg`,
    `audio/bnb/${file}.wav`
  ];
}

const soundCache = {};

function add(url, volume = 50, throttle = 5000, onfinish, extraOptions = null) {
  
  let cacheable = !onfinish && !extraOptions;

  const cacheKey = `${url}_${volume}_${throttle}`;

  // eligible for re-use?
  if (soundCache[cacheKey] && cacheable) return soundCache[cacheKey];

  const sound = addSound(
    Object.assign({
      fixedPlaybackRate,
      url: bnbURL(url),
      volume,
      onfinish,
      throttle
    }, extraOptions)
  );

  if (cacheable) soundCache[cacheKey] = sound;

  return sound;

}

// volume for "very loud" (compressed) sounds
const VL_VOLUME = 20;

function addVL(url, ...rest) {
  return add(url, VL_VOLUME, ...rest);
}

function addBnBEvent(key, soundURLs) {

  const newSounds = [];

  soundURLs = shuffle(soundURLs);

  soundURLs.forEach((url) => {
    newSounds.push(addSound({
      url: bnbURL(url),
      volume: 50,
      fixedPlaybackRate
    }));
  });

  bnb[key] = shuffle(newSounds);

}

export {
  playSequence,
  playQueuedBNBSounds,
  queueBNBSound,
  resetBNBSoundQueue,
  soundsToPlayBNB
};