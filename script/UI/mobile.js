// phones, tablets and non-desktop-type devices
import { utils } from '../core/utils.js';
import { game } from '../core/Game.js';
import { TYPES } from '../core/global.js';

function getLandscapeLayout() {
  // notch position guesses, as well as general orientation.
  let notchPosition;

  if (!window.screen.orientation) return;

  const { type } = window.screen.orientation;

  if (type === 'landscape-primary') {
    notchPosition = 'left';
  } else if (type === 'landscape-secondary') {
    notchPosition = 'right';
  }

  return notchPosition;
}

function handleOrientationChange() {
  // primarily for handling iPhone X, and position of The Notch.
  // apply CSS to <body> per orientation, and iPhone-specific CSS will handle the padding.

  // DRY
  const body = document.body;
  const add = utils.css.add;
  const remove = utils.css.remove;

  const atLeft = 'notch-at-left';
  const atRight = 'notch-at-right';

  const notchPosition = getLandscapeLayout();

  // inefficient/lazy: remove both, apply the active one.
  remove(body, atLeft);
  remove(body, atRight);

  if (notchPosition === 'left') {
    add(body, atLeft);
  } else if (notchPosition === 'right') {
    add(body, atRight);
  }

  // helicopters need to know stuff, too.
  const helicopters = game.objects[TYPES.helicopter];

  helicopters?.forEach?.((helicopter) => helicopter.refreshCoords());

  game.objects.starController?.reset();
}

export { getLandscapeLayout, handleOrientationChange };
