/* global soundManager */
  'use strict';
/*
                                         ████▙   ▀████▌████▙  ▀█████   █████▀ ▄██████▄ ▀████▌████▙         ████▙   ▀█████▀    ▀█████▀     ▀████▐███▋▀█████▀ ▀█████▀ TM
                        ▄██▀            ▕█████▏   ████▌ ████▌  ▐████▌  ████▌ ████▎▐███▊ ████▌ ████▌        █████▏   █████      █████       ████ ▝██▋ ▝████   ▐███▘
                      ▄█▀               ▐▐████▎   ████▌ ████▙   █████ ▌████▌▐███▊  ████▏████▌ ████▙       ▐▐████▎   █████      █████       ████   ▝▋  ▝███▙ ▗███▘
      ▄████▄▄▄▄▄▄▄▄▄ █▀▄▄▄▄▄▄▄▄▄▄▄      █▌████▋   ████▌▗████▘   ▌█████▌████▌████▊  ████▌████▌▗████▘       █▌████▋   █████      █████       ████ ▗█▌    ▝███▙▝█▘
                  ▄█████▄▄▄▄  ▀▀▀      ▐█▌▐████   ████▌████▘    ▌█████▌████▌████▊  ████▌████▌████▘       ▐█▌▐████   █████      █████       ████▐██▌     ▐████▌
  ▄          ▄████████████████▄        ██ ▄████▎  ████▌▝███▙    █▐████ ████▌████▊  ████▌████▌▝███▙       ██ ▄████▎  █████      █████       ████ ▝█▌     ▐████▌
  ██        ▀████████████████████▄    ▐█▌██████▌  ████▌ ████▌  ▕█ ███▌ ████▌▐███▊  ████ ████▌ ████▌     ▐█▌██████▌  █████    ▗▋█████    ▗▋ ████   ▗▋    ▐████▌
  ▀███     ▄██████████████████████    ███  ▐████  ████▌ ████▌▗▋▐█ ▐██  ████▌ ████▎▐███▊ ████▌ ████▌▗▋   ███  ▐████  █████  ▗██▌█████  ▗██▌ ████ ▗██▌    ▐████▌
   ████▄▄███████████████████████▀    ▄███▄ ▄████▌▄█████▄▀████▀▄██▄ █▌ ▄█████▄ ▀██████▀ ▄█████▄▀████▀   ▄███▄ ▄████▌▄█████▐████▌█████▌████▌▄████▐███▌   ▄██████▄
  ████████▀▀▀▀▀▀▀▀████▀█▀▀▀▀█▀
   ██▀              ██▘▘ ██▘▘
  
  A browser-based interpretation of the MS-DOS release of Armor Alley.

  Original game Copyright (C) 1989 - 1991 Information Access Technologies.
  http://en.wikipedia.org/wiki/Armor_alley

  Images, text and other portions of the original game used with permission under an ISC license.
  Original sound effects could not be re-licensed; modern replacements used from freesound.org.

  http://www.schillmania.com/armor-alley/
  http://github.com/scottschiller/ArmorAlley/
  http://www.schillmania.com/content/entries/2013/armor-alley-web-prototype/

  General disclaimer: This is a fun personal side project. The code could surely be better. ;)

  This release:     V1.6.20220201
  Previous release: V1.5.20180201
  Original release: V1.0.20131031

  Changelog / Revision History
  ----------------------------

  + V1.6.20220101: Massive update for 2022, based on work from 2020 + 2021
    
    + Video oveview
    • Demo, features and walk-through of "extreme" mode (55 minutes): https://youtu.be/9BQ62c7u2JM 

    + Performance improvements
    • The game should be smoother, targeting 30FPS. It is OK full-screen @ 1080p and windowed @ 4K in Chrome on a 2018 Mac Mini, 3.2 GHz 6-core i7 w/Intel UHD Graphics 630 1536 MB.
    • More GPU-accelerated rendering, reduced DOM nodes by removing when off-screen (e.g., static terrain items)
    • All sprites should be on the GPU and moved using transforms, reducing paint operations
    • All transforms (CSS + JS) for positioning + animation are 3d, with the goal of GPU acceleration - e.g., translate3d(), rotate3d(), scale3d()
    • DOM nodes are not appended at object create time - now deferred until the object is on-screen for the first time.
    • All "sub-sprites" should now be GPU-accelerated via CSS animations, transforms and transitions
    • Sound: Only create `Audio()` when actively playing sounds, and destroy when they finish playing. Browsers are starting to limit the number of `Audio()` instances.
    • Sound: Queue and play sounds all at once with each animation frame callback, vs. prior ad-hoc behaviour.
    • Refactored game tip scroller to only show two nodes at a time, 1024px width vs. 102,400px. Front-end tech / Chrome Dev Tools demo: https://youtu.be/eVW0WgTdK3A
    • Performance: Don't update known static radar items: turret, base, bunkers (bunker, end bunker, super bunker) unless marked as "stale" during resize / world scaling
    • Performance: CSS / `contentVisibility` to reduce / optimize rendering costs
    • Animation loop: improved timing, target 30 fps. Request next frame right away. Exit early if next frame arrives too quickly.
    • Turret "scan" is now a CSS animation; previously, animated via JS.
    • Smart missiles and helicopter trailers are now GPU-accelerated.
    • Performance: Battlefield and radar units are now positioned via transform: translate3d() - no more legacy CSS shenanigans using `bottom: 0px`.
    • Memory leak fixes: DOM nodes, audio events, and a few others.

    + Sound
    • Over 100 sound assets now in use
    • New and updated sound effects: Infantry and engineer gunfire, injury and death, credit +/-, helicopter and turret guns, shell casings on turrets,
      bullets hitting the ground, turret being disabled and enabled (restored.)

    + UX / UI
    • Proper "game options" modal with radio buttons and checkboxes for various UX/UI and gameplay features
    • "It was a dark and stormy night" - option for snow on the battlefield. (May be slow on some computers.)
    • Bunkers, balloons and super-bunkers now use graphics from the Macintosh (68K) version of Armor Alley; a bit more orange, and less garish yellow.
    • Dune ][-style credit / debit UI and sounds
    • Toast-style game notifications
    • Health status bars when units are being hit or repaired
    • New and improved smoke / particle effects, more explosions and shrapnel, more fun!
    • Order queue: Refactored UI to show letters (e.g., MTVIE), with superscript numbers as appropriate.
    • Missiles smoke more, and in extreme mode, have a burst of thrust (as in the original game) as they near expiry
    • Pseudo-3D effect on shrapnel: Increase size slightly with vertical position on screen
    • Ground units are "behind" most terrain elements like trees, bushes etc.

    + Bug fixes
    • Bombing floating balloons no longer causes an explosion on the ground
    • Improved bomb and shrapnel alignment / collision positioning with balloons, tanks, bunkers, and super-bunkers
    • Fixed bug with quickly-respawning balloons (shooting balloon while infantry are passing under bunker, for example.)
    • Fixed UI bug where the "incoming missile" white line would not always disappear.
    • Game end: Improve alignment of view and base
    • Adjusted initial position of game, centering view on the helicopter + base
    • Helicopter / super-bunker: Improve vertical alignment if helicopter crashes on superbunker "roof."
    • Fixed radar item for Super Bunkers, now shows correct friendly / enemy status.
    • Cloud "wind" accelerates / decelerates more smoothly
    • Clouds no longer "bounce" when they drift off the end of the world, but get a nice bit of wind to bring them back into view.
    • Slight vertical alignment tweaks on gunfire and balloons in radar view.
    • Improved orientation of heat-seeking smart missiles (and rubber chickens and bananas) as they track their target
    • Tweaked movement and velocity of smart missiles, making them potentially faster / more random
    • Enemy helicopter will now turn to face targets. Sometimes it would fire the other way. ;)
    • Improved helicopter motion when approaching landing pad - "bounce" has largely been eliminated.
    • Improved off-screen / on-screen DOM pruning, restoration of 3D transforms when re-appending DOM elements
    • Fixed end-game bug, sometimes ground units (e.g. van) did not appear at base when blowing up.
    • Adjusted collision detection: if helicopter is hiding "in" a friendly super-bunker, bombs should hit the roof of the super bunker and not the helicopter.

    + Gameplay
    • New weapon: Heat-seeking bananas
    • Ground unit "Traffic Control" option: Vehicles try to leave space between, and avoid overlapping each other. Tanks will now "park" behind friendly tanks,
      avoiding a pile-up. Tanks normally only stop to fire. Vans and missile launchers will now wait for each other, too. Tanks will not stop for vans or
      missile launchers, giving tanks a greater chance of ending up at the front of a convoy - a preferable offensive position.
    • Units can now be "recycled" if they cross the battlefield, you are rewarded 2x cost in credits
    • Engineers can now steal all funds from enemy bunker
    • Engineers can now repair (but not rebuid) friendly bunkers
    • Bullets now ricochet off non-friendly super-bunkers
    • Shrapnel will ricochet off certain units (tank, super-bunker)
    • "Incoming missile" doesn't show in extreme mode when the radar is jammed.
    • End base, extreme mode: if a defense missile is destroyed, respawn another within 0.5 seconds.
    • Missile launchers trigger when closer to the helicopter, more likely now to be on-screen
    • Helicopter respawn: Delay if certain ground units are obstructing the landing pad.
    • Enemy helicopter AI: Default 10% of dropping bombs when targeting a tank, subject to game difficulty (hard: 15%, extreme: 25%.)
    • Bombs can now collide with smart missiles and take them out
    • Tank gunfire only hits bunkers if tanks are shooting at a helicopter, or another tank
      (bug fix: previously, tanks could destroy a bunker trying to hit an infantry on the other side.)
    • Super bunkers that are un-manned are "neutral" and dangerous to both sides, and will be shown as hostile on the radar.
      (This includes when tanks disarm a bunker by firing at it.)
    • Bomb trajectory now includes the helicopter's Y-axis velocity, and they now rotate along with their trajectory.
    • Helicopters now rise up from the landing pad on game start and respawn, like the original game.
    • Helicopter gunfire takes tilt / angle into account.
    • Helicopter "shake" starts when health is under 70%, gets worse with damage. This affects gunfire trajectory.
    • Your missile launchers only fire at the enemy helicopter when the convoy is "unassisted", e.g., there is no friendly helicopter or turret nearby.
    • Extreme mode: If you shoot down the enemy base's smart missiles while near the base, it will launch new ones that are faster and more difficult to dodge.
    • While on a landing pad, your gunfire may go over infantry's heads most of the time.
    • Don't assume the top of the battlefield is always safe; watch out for balloons!
    • Parachute infantry now fall at slightly different rates, and may be affected more by wind
    • A few additional, inspirational [ game paused in background ] messages

    + Technical notes: development / code
    • Migrated core JavaScript to ES6 syntax, retaining functional + prototypal inheritance style. Slightly less verbose.
    • As part of ES6 migration, dropped legacy IE 8 + 9 code and checks: ancient event handlers, lack of transform, `requestAnimationFrame()` polyfill etc.
    • Lots of cleanup: Exit early, reduced `if/else` nesting. Dropped all `setTimeout()` calls, moved to a frame-based approach: `setFrameTimeout()`.
    • `aa.js` (core game code) is massive at ~450 KB, and seems like a good candidate to be broken up into ES6 modules. TBD.

  + V1.51.20181124

    + Performance tweaks
    • More motion / animation is now on the GPU via `transform`, vs. `style.left` / `style.top`.
    • Main animation loop calls `requestAnimationFrame()` first, before anything else (like VSYNC.)
    • Drop legacy SM2 flash options.
    • Turret scan is now driven by CSS animation vs. JS setting an angle transform every frame.

    + Sound
    • New base explosion, tweaked other explosion sound effects.
    • New "heavy mechanics" bunker chain (repair) sound.

  + V1.5.20180201

    + Big feature updates!
    • Game "mostly" now works on mobile devices. Touch-based events for helicopter control, UI for helicopter weapons and inventory / ordering. Tested on iPhone X. Others should work reasonably-well. Hopefully.
    • Inventory order queueing! 🎉 (Finally.) e.g., 3 tanks in a row. Queueing deducts funds immediately. No added UI or cancel ability (yet.)
    • Battlefield view is now bigger on screen. Stats UI is dead, long live stats.
    • Performance improvements. tl;dr: JavaScript tweaks, putting most all sprites onto the GPU. Replaced most common animated .GIF backgrounds with 3d-transform, GPU-accelerated CSS animation-driven sprites. 😅

    + Sound
    • No sound for any Safari (desktop or mobile) for now, including version 11.0. Multiple sounds kill performance on desktop, and "auto-play" is effectively blocked on mobile. https://bugs.webkit.org/show_bug.cgi?id=116145
    • New + improved helicopter machine gun sounds. 9 different samples, played at random.
    • New sound effects: "bomb hatch" (helicopter bomb release), tank gunfire, bunker chain/balloon repair, helicopter gunfire hit.
    • "Medals clanking" sound for bunker chain/balloon repair. (BY-NC 3.0.) https://freesound.org/people/Gareth_H/sounds/365799/
    • New tank gunfire sound: "Tank Fire Mixed.wav" by Cyberkineticfilms/freesound.org (CC0, "No Rights Reserved". 🙇)
    • Hat tip: "Bolo" "tank self hit" sound effect, Copyright (C) Steuart Cheshire 1993. My favourite Mac game of all time. ❤️

    + UX / UI
    • "Radar jammed" TV static-like overlay with transform sprite.
    • Slightly faster helicopter bombing rate - more responsive.
    • Chain refactor. Use fixed height, animate via transform, fall with gravity when balloon and/or bunker are lost.
    • Balloons are yellow-ish on radar, and now transform-rotated to elliptical shapes. Bunkers / base color and border tweaks, friendly vs. enemy now look different.
    • Inventory and helicopter ammo, etc., become greyed out when unaffordable / unavailable.
    • Target / "tracking" animation on Smart Missile targets.
    • Smart Missiles can now re-target on the next frame after the original target dies. If a new target can not be immediately acquired, the Smart Missile dies as previously.
    • Radar items, clouds and some other sprites move more smoothly simply by dropping `parseInt()`.
    • "C" / rubber chicken use causes UI to switch to rubber chicken mode.
    • Possible bugfix: If paused and enemy order timer fires, re-start timer. This probably fixes enemy inventory building sometimes breaking.
    • Jam radar all the time on hard + extreme game types.

    + Miscellany
    • Note re: Firefox `will-change` memory consumption warning that might show in console.
    • URL feature flags: `noTranslate3d` and `noRadarGPU`. `frameRate=[60|*]` for testing of `requestAnimationFrame()` timing. camelCase others. Let Opera (now webkit-based) have transforms.
    • +`makeTransformSprite()`, a sort of sub-sprite for CSS transform-based animations (GPU-accelerated animated .GIF alternatives.)
    • `z-index: -1` can be harmful for performance / compositing.
    • iPhone X notch handling based on orientation and whatnot.

  + 12/2017

    + Optimized performance / dropped CPU usage significantly by hiding off-screen elements.
    + Fixed silly blank / empty frame in balloon right -> left animation sequence.
    + Dropped numerous legacy -webkit and -moz prefixes in CSS.
    + DOM Pruning option with offscreen logic

  + 10/2017

    + Fixed up top stats layout in Firefox, Safari, Chrome.
    + Emoji to convey meaning of tutorial, easy, hard, extreme modes.
    + ESLint code clean-up.

  + 09/2015

    + "Extreme" game mode
    • Higher enemy convoy production rate.
    • Turrets fire at a faster rate.
    • Twin enemy turrets near mid-field.
    • Turrets fire at ground vehicles and smart missiles. Infantry and engineers are not targeted, but can be hit.
    • Owning all bunkers does not halt enemy production.

    + Miscellaneous
    • Fix for "negative look-ahead" case - enemy Super Bunker now fires at helicopter on both sides.
    • `Math.abs()` checks on distance for missile launchers
    • Fixed Bunker and Super Bunker vertical alignment / collision detection with helicopter
    • Infantry will not be picked up when the helicopter is on a landing pad and repairing.
    • Shrapnel shows on radar.
    • Background color fixed on bullet and missile "spark" graphic.

  + 08/2014

    + Sound events / sound effects
    • Wrench and related sounds on helicopter repair/refuel, balloon repair, turret claiming/rebuilding/repair
    • Violin notes for friendly capture events: bunker, turret etc. (C5). Enemy note is C4.
    • "Pop" / "vacuum" sounds for infantry pick up + deployment, and turret restoration
    • Door close for passing infantry entering bunkers
    • Splat for infantry and engineer kills
    • Crash-and-glass for bunker explosions
    • Heavy/light impact sounds for bullets hitting metal (tanks) and other structures (bunkers)
    • Turrets audibly "break" when destroyed.

    + Game logic / rules
    • Turret gunfire can now hit infantry, regular bunkers and Super Bunkers. However, only tank gunfire can hit Super Bunkers for damage.
    • For "easy" game mode, turrets now fire at half the previous rate.

    + UI / design
    • Arrows on bunkers now animate to the right/left when claimed by friendly/enemy infantry.

    + Miscellaneous
    • Sound arrays (i.e., 5 bullet/metal sounds) shuffle on each rotation, reducing chance of repetitiveness.
    • Upped turret gunfire sound array, possibly reduce cloning of Audio() in heavy fire cases.
    • Infantry build "faster" now, so they are more closely grouped together (in units of five.)
    • Shrapnel now rotates using CSS animations, rotation direction determined randomly.
    • In tutorial mode, disarm user-armed Super Bunker so it doesn't accidentally kill Missile Launchers that later show up.
    • Fixed enemy infantry + engineer die animation to be bottom-aligned.

  + 07/2014

    • Safari 7.1 and 8 (OS X 10.10/Yosemite preview) still have HTML5 audio jank bug, thus prefer Flash. https://bugs.webkit.org/show_bug.cgi?id=116145
    • Opacity fade on edge of game tips.
    • Font legibility tweaks.

  + 04/2014

    • "Hard" game option, comparable to original game's level 9.
    • Gunfire and shrapnel now shows up on radar.
    • Enemy unit production halts when all bunkers are friendly / player-owned.
    • Heat-seeking rubber chickens (launched with C key.)
    • Turret gunfire can hit tanks, vans and missile launchers in "hard" mode. Protip: Don't approach turrets from low angles.

  + 03/2014

    • Added "Super Bunkers" (pillbox bunkers) http://en.wikipedia.org/wiki/Armor_alley#Terrain_elements

*/

let winloc = window.location.href.toString();

const ua = navigator.userAgent;

const FPS = 30;
const FRAMERATE = 1000 / FPS;

// skip frame(s) as needed, prevent the game from running too fast.
const FRAME_MIN_TIME = FRAMERATE * 0.95;

const unlimitedFrameRate = winloc.match(/frameRate=\*/i);

/**
 * Evil tricks needed because Safari 6 (and Webkit nightly)
 * scale text after rasterization - thus, there's an option
 * to use document[element].style.zoom vs. transform: scale3d()
 * which renders text cleanly. Both have minor quirks.
 * force-enable transform under Safari 6 w/ #forceTransform=1
 */

const isWebkit = ua.match(/webkit/i);
const isChrome = !!(isWebkit && (ua.match(/chrome/i) || []).length);
const isFirefox = ua.match(/firefox/i);
const isSafari = (isWebkit && !isChrome && ua.match(/safari/i));
const isMobile = ua.match(/mobile/i); // should get iOS.
const isiPhone = ua.match(/iphone/i);

// whether off-screen elements are forcefully removed from the DOM.
// may be expensive up front, and/or cause style recalcs while
// scrolling the world. the fastest nodes are the ones that aren't there.
const useDOMPruning = !winloc.match(/noDomPruning/i);

const trackEnemy = winloc.match(/trackEnemy/i);

const debug = winloc.match(/debug/i);

// TODO: get rid of this.
const debugType = winloc.match(/debugType/i);

// TODO: move missile mode bits into game object
let missileMode;

const defaultMissileMode = null;

// can also be enabled by pressing "C".
const rubberChickenMode = 'rubber-chicken-mode';

// can also be enabled by pressing "B".
const bananaMode = 'banana-mode';

function renderMissileText(character, mode) {
  if (mode === missileMode) return character;
  return `<span style="opacity:0.5">${character}</span>`;
}

function setMissileMode(mode) {
  if (missileMode === mode) return;
  
  // swap in new class, removing old one
  utils.css.swap(document.getElementById('world'), missileMode, mode);

  missileMode = mode;

  // determine which letter to highlight
  const html = [
    renderMissileText('X', defaultMissileMode),
    renderMissileText('C', rubberChickenMode),
    renderMissileText('B', bananaMode)
  ].join('<span class="divider">|</span>');

  document.querySelector('#stats-bar .missiles .letter-block').innerHTML = html;

}

const DEFAULT_VOLUME = 25;

const rad2Deg = 180 / Math.PI;

// used for various measurements in the game
const worldWidth = 8192;
const worldHeight = 380;

let battleOver = false;

let productionHalted = false;

let canHideLogo = false;

let keyboardMonitor;

// TODO: move into view
let screenScale = 1;

// transform, or zoom
let usingZoom;

const forceTransform = !!(winloc.match(/forceTransform/i));

const forceZoom = !!(winloc.match(/forceZoom/i));

const disableScaling = !!(!forceTransform && winloc.match(/noscal/i));

let userDisabledScaling = false;

const tutorialMode = !!(winloc.match(/tutorial/i));

let gameType;

// how often the enemy attempts to build convoys
let convoyDelay = 60;

function setConvoyDelay(delay) {
  convoyDelay = delay;
}

// unique IDs for quick object equality checks
let guid = 0;

let setFrameTimeout;

let frameTimeoutManager;

let shrapnelExplosion;

// legacy: game type, etc.
let prefs;

// modern
let gamePrefs;

let prefsManager;

const TYPES = {
  bomb: 'bomb',
  balloon: 'balloon',
  cloud: 'cloud',
  helicopter: 'helicopter',
  tank: 'tank',
  gunfire: 'gunfire',
  turret: 'turret',
  infantry: 'infantry',
  parachuteInfantry: 'parachute-infantry',
  'parachute-infantry': 'parachuteInfrantry',
  parachuteInfantryCamel: 'parachuteInfantry',
  engineer: 'engineer',
  bunker: 'bunker',
  endBunker: 'end-bunker',
  endBunkerCamel: 'endBunker',
  superBunker: 'super-bunker',
  superBunkerCamel: 'superBunker',
  missileLauncher: 'missile-launcher',
  'missile-launcher': 'missileLauncher',
  missileLauncherCamel: 'missileLauncher',
  smartMissile: 'smart-missile',
  shrapnel: 'shrapnel',
  van: 'van'
};

const COSTS = {
  missileLauncher: {
    funds: 3,
    css: 'can-not-order-missile-launcher'
  },
  tank: {
    funds: 4,
    css: 'can-not-order-tank'
  },
  van: {
    funds: 2,
    css: 'can-not-order-van',
  },
  infantry: {
    funds: 5,
    count: 5,
    css: 'can-not-order-infantry',
  },
  engineer: {
    funds: 5,
    count: 2,
    css: 'can-not-order-engineer'
  }
};

let stats;

function getLandscapeLayout() {

  // notch position guesses, as well as general orientation.
  let notchPosition;

  if ('orientation' in window) {

    // Mobile
    if (window.orientation === 90) {
      notchPosition = 'left';
    } else if (window.orientation === -90) {
      notchPosition = 'right';
    }

  } else if ('orientation' in window.screen) {

    // Webkit
    if (window.screen.orientation.type === 'landscape-primary') {
      notchPosition = 'left';
    } else if (window.screen.orientation.type === 'landscape-secondary') {
      notchPosition = 'right';
    }

  }

  return notchPosition;

}

function updateScreenScale() {

  if (disableScaling) return;

  const innerHeight = window.innerHeight;

  let offset = 0;
  let localWorldHeight = 410;

  // TODO: clean this up.
  if (isMobile) {

    const id = 'body-height-element';
    let div = document.getElementById(id);

    const bottom = document.getElementById('bottom');

    // make and append once, as necessary.
    if (!div) {
      div = document.createElement('div');
      div.id = id;
      document.body.appendChild(div);
    }

    // measure.
    offset = parseInt(div.offsetHeight, 10) || 0;

    // take the smaller one, in any case.
    if (innerHeight < offset) {

      // Safari URL / address bar is showing. hack around it.
      // TODO: ignore touch, make user scroll window first?
      console.log('scaling world down slightly because of Safari URL / address bar.');
      // 50 (~pixel height of URL bar) * 2, so world is centered nicely. I think. :D
      localWorldHeight += 100;

      utils.css.add(bottom, 'rotate-hint');

    } else {

      utils.css.remove(bottom, 'rotate-hint');

      // if we were paused, but rotated and now full-screen
      // (i.e., landscape and no address bar), resume automagically.
      if (game.data.paused && getLandscapeLayout()) {
        game.resume();
      }

    }

  }

  if (userDisabledScaling) {

    screenScale = 1;

  } else {

    screenScale = innerHeight / localWorldHeight;

  }

  prefsManager.updateScreenScale();

}

function applyScreenScale() {

  if (disableScaling) return;

  const wrapper = document.getElementById('world-wrapper');

  /**
   * 09/2021: Most browsers perform and look better using scale3d() vs style.zoom.
   * Chrome seems to be the exception, where zoom renders accurately, sharp and performant.
   * Safari 15 still scales and has "fuzzy" text via scale3d(), but style.zoom is slower.
   * 
   * 04/2020: It seems `style.zoom` is the way to go for performance, overall.
   * Browsers seem to understand that this means "just magnify everything" in an efficient way.
   * 
   * 10/2013: Safari 6.0.5 scales text after rasterizing via transform: scale3d(), thus it looks crap.
   * Using document[element].zoom is OK, however.
   * 
   * TESTING
   * Force transform-based scaling with #forceTransform=1
   * Force zoom-based scaling with #forceZoom=1
   */

  // Pardon the non-standard formatting in exchange for legibility.
  if (!forceZoom && (
    // URL param: prefer transform-based scaling
    forceTransform

    // Firefox clips some of the world when using style.zoom.
    || isFirefox
  
    // Chrome can do zoom, but mentions Safari in its userAgent.
    // Safari does not do well with zoom.
    || (!isChrome && isSafari)

    // Assume that on mobile, transform (GPU) is the way to go
    || isMobile
  )) {

    if (debug) console.log('using transform-based scaling');

    usingZoom = false;

    wrapper.style.marginTop = `${-((406 / 2) * screenScale)}px`;
    wrapper.style.width = `${Math.floor((window.innerWidth || document.body.clientWidth) * (1 / screenScale))}px`;
    // TODO: consider translate() instead of marginTop here. Seems to throw off mouse Y coordinate, though,
    // and will need more refactoring to make that work the same.
    wrapper.style.transform = `scale3d(${screenScale}, ${screenScale}, 1)`;
    wrapper.style.transformOrigin = '0px 0px';

  } else {

    if (debug) console.log('using style.zoom-based scaling');

    usingZoom = true;

    wrapper.style.marginTop = `${-(406 / 2)}px`;

    // Safari 6 + Webkit nightlies (as of 10/2013) scale text after rasterizing, so it looks bad. This method is hackish, but text scales nicely.
    // Additional note: this won't work in Firefox.
    document.getElementById('aa').style.zoom = `${screenScale * 100}%`;

  }

  game.objects.funds.updateScale();

}

function removeNode(node) {

  // DOM pruning safety check: object dom references may include object -> parent node for items that died
  // while they were off-screen (e.g., infantry) and removed from the DOM, if pruning is enabled.
  // normally, all nodes would be removed as part of object clean-up. however, we don't want to remove
  // the battlefield under any circumstances. ;)
  if (useDOMPruning && node === game.objects.view.dom.battleField) return;

  // hide immediately, cheaply
  node.style.opacity = 0;

  game.objects.queue.add(() => {
    if (!node) return;
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
    node = null;
  });

}

function removeNodeArray(nodeArray) {

  let i, j;

  j = nodeArray.length;

  // removal will invalidate layout, $$$. hide first, cheaply.
  for (i = 0; i < j; i++) {
    nodeArray[i].style.opacity = 0;
  }

  game.objects.queue.add(() => {

    for (i = 0; i < j; i++) {
      // TESTING: Does manually-removing transform before node removal help with GC? (apparently not.)
      // Chrome issue: https://code.google.com/p/chromium/issues/detail?id=304689
      // nodeArray[i].style.transform = 'none';
      nodeArray[i].parentNode.removeChild(nodeArray[i]);
      nodeArray[i] = null;
    }

    nodeArray = null;

  });

}

function removeNodes(dom) {

  // remove all nodes in a structure
  let item;

  for (item in dom) {
    if (Object.prototype.hasOwnProperty.call(dom, item) && dom[item]) {
      // node reference, or array of nodes?
      if (dom[item] instanceof Array) {
        removeNodeArray(dom[item]);
      } else {
        removeNode(dom[item]);
      }
      dom[item] = null;
    }
  }

}

function mixin(oMain, oAdd) {

  // edge case: if nothing to add, return "as-is"
  // if otherwise unspecified, `oAdd` is the default options object
  if (oAdd === undefined) return oMain;

  // the modern way
  return Object.assign(oMain, oAdd);

}

function stopEvent(e) {

  const evt = e || window.event;

  if (evt.preventDefault !== undefined) {
    evt.preventDefault();
  } else {
    evt.cancelBubble = true;
  }

  return false;

}

function applyRandomRotation(node) {
  if (!node) return;
  /**
   * Here be dragons: this should only be applied once, given concatenation,
   * and might cause bugs and/or performance problems if it isn't. :D
   */
  node.style.transform += ` rotate3d(0, 0, 1, ${rnd(360)}deg)`;
}

function updateEnergy(object, forceUpdate) {

  if (gamePrefs.show_health_status === PREFS.SHOW_HEALTH_NEVER) {
    // if present, remove right away
    if (object?.dom?.oEnergy) {
      object.dom.oEnergy.remove();
      object.dom.oEnergy = null;
    }
    return;
  }
  
  let node, didCreate, energy, energyLineScale, newWidth, DEFAULT_ENERGY_SCALE;

  DEFAULT_ENERGY_SCALE = 1;

  // only do work if valid
  if (!object?.dom?.o) return;

  // only do work if visible, OR "always" shown and needing updates
  if (!object.data.isOnScreen && gamePrefs.show_health_status !== PREFS.SHOW_HEALTH_ALWAYS) return;

  // prevent certain things from rendering this, e.g., smart missiles.
  if (object.data.noEnergyStatus) return;

  // dynamically create, and maybe queue removal of `.energy` node
  if (!object.dom.oEnergy) {
    node = document.createElement('div');
    node.className = 'energy-status energy';
    object.dom.oEnergy = object.dom.o.appendChild(node);
    didCreate = true;
  }

  node = object.dom.oEnergy;

  // some objects may have a custom width, e.g., 0.33.
  energyLineScale = object.data.energyLineScale || DEFAULT_ENERGY_SCALE;

  energy = (object.data.energy / object.data.energyMax) * 100;

  if (isNaN(energy)) return;

  // don't show node unless just created, or forced
  if (object.data.lastEnergy === energy && !didCreate && !forceUpdate) return;

  object.data.lastEnergy = energy;

  // show when damaged, but not when dead.
  node.style.opacity = (energy < 100 ? 1 : 0);

  if (energy > 66) {
    node.style.backgroundColor = '#33cc33';
  } else if (energy > 33) {
    node.style.backgroundColor = '#cccc33';
  } else {
    node.style.backgroundColor = '#cc3333';
  }

  newWidth = energy * energyLineScale;

  // width may be relative, e.g., 0.33 for helicopter so it doesn't overlap
  node.style.width = `${newWidth}%`;
  
  // only center if full-width, or explicitly specified
  if (energyLineScale === DEFAULT_ENERGY_SCALE || object.data.centerEnergyLine) {
    node.style.left = ((100 - newWidth) / 2) + '%';
  }

  // if "always" show, no further work to do
  if (gamePrefs.show_health_status === PREFS.SHOW_HEALTH_ALWAYS) return;

  // hide in a moment, clearing any existing timers.
  if (object.data.energyTimerFade) {
    object.data.energyTimerFade.reset();
  }

  if (object.data.energyTimerRemove) {
    object.data.energyTimerRemove.reset();
  }

  // fade out, and eventually remove
  object.data.energyTimerFade = setFrameTimeout(() => {

    // in case prefs changed during a timer, prevent removal now
    if (gamePrefs.show_health_status === PREFS.SHOW_HEALTH_ALWAYS) return;

    if (node) node.style.opacity = 0;

    // fade should be completed within 250 msec
    object.data.energyTimerRemove = setFrameTimeout(() => {
      if (node?.parentNode) node.parentNode.removeChild(node);
      object.dom.oEnergy = null;
      node = null;
    }, 250);

  }, 2000);

}

function rnd(number) {
  return Math.random() * number;
}

function rndInt(number) {
  return parseInt(rnd(number), 10);
}

function plusMinus() {
  return Math.random() >= 0.5 ? 1 : -1;
}

function getNormalizedUnitName(item) {
  if (!item || !item.data) return;

  // gunfire has `parentType`, e.g., fired from a tank
  let type = item.data.parentType || item.data.type;

  if (!type) return;

  // hackish: fixes
  type = type.replace('missileLauncher', 'missile launcher');
  type = type.replace('-', ' ');

  return type;
}

function bottomAlignedY(y) {

  // correct bottom-aligned Y value
  return 370 - 2 - (y || 0);

}

function makeSprite(options) {

  const o = document.createElement('div');

  o.className = `sprite ${options.className}`;

  if (!options.className.match(/transform-sprite|sub-sprite|terrain/i)) {
    o.style.top = '0px';
    o.style.left = '0px';
  }

  if (debugType) {
    o.innerHTML = options.className.replace(/sub-sprite/i, '');
    o.style.fontSize = '3px';
  }

  return o;

}

function makeTransformSprite(extraClass) {

  return makeSprite({
    className: `transform-sprite${extraClass ? ` ${extraClass}` : ''}`
  });

}

function makeSubSprite(extraClass) {

  return makeSprite({
    className: `sub-sprite${extraClass ? ` ${extraClass}` : ''}`
  });

}

const layoutCache = {};

function addItem(className, x) {

  let node, data, dom, width, height, inCache, exports;

  node = makeSprite({
    className: `${className} terrain-item`
  });

  if (x) {
    common.setTransformXY(undefined, node, `${x}px`, '0px');
  }
  
  if (layoutCache[className]) {
    inCache = true;
    width = layoutCache[className].width;
    height = layoutCache[className].height;
  }

  if (!inCache) {
    // append only so we can read layout
    game.dom.world.appendChild(node);
  }

  data = {
    type: className,
    x,
    y: 0,
    // dirty / lazy - force layout, read from CSS.
    width: width || node.offsetWidth,
    height: height || node.offsetHeight      
  };

  dom = {
    o: node
  };

  // basic structure for a terrain item
  exports = {
    data,
    dom
  };

  if (!inCache) {
    // store
    layoutCache[className] = {
      width: data.width,
      height: data.height
    };

    // and now, remove; these will be re-appended when on-screen only.
    game.dom.world.removeChild(node);
  }

  // these will be tracked only for on-screen / off-screen purposes.
  game.objects.terrainItems.push(exports);

  return node;

}

function inheritCSS(options) {

  // var defaults;

  options = options || {};

  if (options.animating === undefined) {
    options.animating = common.defaultCSS.animating;
  }

  if (options.dead === undefined) {
    options.dead = common.defaultCSS.dead;
  }

  if (options.enemy === undefined) {
    options.enemy = common.defaultCSS.enemy;
  }

  if (options.exploding === undefined) {
    options.exploding = common.defaultCSS.exploding;
  }

  return options;

}

function inheritData(data, options) {

  // mixin defaults, and apply common options

  options = options || {};

  // for quick object comparison
  if (data.id === undefined) {
    data.id = (options.id || guid++);
  }

  // assume not in view at first, used for DOM pruning / performance
  if (data.isOnScreen === undefined) {
    data.isOnScreen = false;
  }

  if (data.isEnemy === undefined) {
    data.isEnemy = (options.isEnemy || false);
  }

  if (data.bottomY === undefined) {
    data.bottomY = (options.bottomY || 0);
  }

  if (data.dead === undefined) {
    data.dead = false;
  }

  if (data.x === undefined) {
    data.x = (options.x || 0);
  }

  if (data.y === undefined) {
    data.y = (options.y || 0);
  }

  if (data.vX === undefined) {
    data.vX = (options.vX || 0);
  }

  if (data.vY === undefined) {
    data.vY = (options.vY || 0);
  }

  if (options.fireModulus !== undefined) {
    data.fireModulus = options.fireModulus;
  }

  return data;

}

/**
 * collision detection and related logic
 */

function collisionCheck(point1, point2, point1XLookAhead) {

  /**
   * given x, y, width and height, determine if one object is overlapping another.
   * additional hacky param: X-axis offset for object. Used for cases where tanks etc. need to know when objects are nearby.
   * provided as an override because live objects are passed directly and can't be modified (eg., options.source.data.x += ...).
   * cloning these objects via mixin() works, but then lot of temporary objects are created, leading to increased garbage collection.
   */

  if (!point1 || !point2) {
    return null;
  }

  // given two boxes, check for intersects.
  // presume each object has x, y, width, height - otherwise, all hell will break loose.

  if (point2.x >= point1.x + point1XLookAhead) {

    // point 2 is to the right.

    if (point1.x + point1XLookAhead + point1.width >= point2.x) {

      // point 1 overlaps point 2 on x.
      // width = point2.x - (point1.x + point1XLookAhead + point1.width);

      if (point1.y < point2.y) {

        // point 1 is above point 2.

        if (point1.y + point1.height >= point2.y) {

          // point 1 overlaps point 2 on y.
          // height = point2.y - (point1.y + point1.h);
          return true;

        }

      } else {

        // height = (point2.y + point2.height) - point1.y;
        return (point1.y < point2.y + point2.height);

      }

    }

    // otherwise, point 1 is to the right.

  } else if (point2.x + point2.width >= point1.x + point1XLookAhead) {

    // point 2 overlaps point 1 on x.
    // width = point1.x - (point2.x + point1XLookAhead + point2.width);

    if (point2.y < point1.y) {

      // point 2 is above point 1.
      // height = point1.y - (point2.height + point2.y);
      return (point2.y + point2.height >= point1.y);

    } else {

      // point 2 is below point 1.
      // height = point2.y - (point1.y + point1.height);
      return (point1.y + point1.height >= point2.y);

    }

  } else {

    // no overlap, per checks.
    return false;

  }

}

function collisionCheckArray(options) {

  /**
   * options = {
   *   source: object (eg., game.objects.gunfire[0]);
   *   targets: array (eg., game.objects.tanks)
   * }
   */

  if (!options || !options.targets) {
    return false;
  }

  // don't check if the object is dead or inert. If expired, only allow the object if it's also "hostile" (can still hit things)
  if (options.source.data.dead || options.source.data.isInert || (options.source.data.expired && !options.source.data.hostile)) {
    return false;
  }

  let xLookAhead, foundHit;

  // is this a "lookahead" (nearby) case? buffer the x value, if so. Armed vehicles use this.

  if (options.useLookAhead) {

    // friendly things move further right, enemies move further left.

    // hackish: define "one-third width" only once.
    if (options.source.data.xLookAhead === undefined && options.source.data.widthOneThird === undefined) {
        options.source.data.widthOneThird = options.source.data.width * 0.33;
    }

    xLookAhead = Math.min(16, options.source.data.xLookAhead || options.source.data.widthOneThird);
    if (options.source.data.isEnemy) xLookAhead *= -1;

  } else {

    xLookAhead = 0;

  }

  for (let i = 0, j = options.targets.length; i < j; i++) {

    // non-standard formatting, lengthy logic check here...
    if (

      // don't compare the object against itself
      options.targets[i].data.id !== options.source.data.id

      // ignore dead options.targets (unless a turret, which can be reclaimed / repaired by engineers)
      && (
        !options.targets[i].data.dead
        || (options.targets[i].data.type === TYPES.turret && options.source.data.type === TYPES.infantry && options.source.data.role)
      )

      // more non-standard formatting....
      && (

        // don't check against friendly units by default, UNLESS looking only for friendly.
        ((options.friendlyOnly && options.targets[i].data.isEnemy === options.source.data.isEnemy) || (!options.friendlyOnly && options.targets[i].data.isEnemy !== options.source.data.isEnemy))

        // specific friendly cases: infantry vs. bunker, end-bunker, super-bunker or helicopter
        || (options.source.data.type === TYPES.infantry && options.targets[i].data.type === TYPES.bunker)

        || (options.targets[i].data.type === TYPES.infantry && (
          (options.source.data.type === TYPES.endBunker && !options.targets[i].data.role)
          || (options.source.data.type === TYPES.superBunker && !options.targets[i].data.role)
          || (options.source.data.type === TYPES.helicopter)
        ))

        // OR engineer vs. turret
        || (options.source.data.type === TYPES.infantry && options.source.data.role && options.targets[i].data.type === TYPES.turret)

        // OR we're dealing with a hostile or neutral object
        || (options.source.data.hostile || options.targets[i].data.hostile)
        || (options.source.data.isNeutral || options.targets[i].data.isNeutral)

      )

    ) {

      // note special Super Bunker "negative look-ahead" case - detects helicopter on both sides.
      if (
        collisionCheck(options.source.data, options.targets[i].data, xLookAhead)
        || (options.targets[i].data.type === TYPES.helicopter && collisionCheck(options.source.data, options.targets[i].data, -xLookAhead))
      ) {

        foundHit = true;

        if (options.hit) {
          
          // provide target, "no specific points", source.
          options.hit(options.targets[i], null, options.source);

          // update energy?
          updateEnergy(options.targets[i]);
        }

      }

    }

  }

  return foundHit;

}

function collisionTest(collision, exports) {

  // don't do collision detection during game-over sequence.
  if (battleOver) {
    // restore to original state
    collision.targets = null;
    return;
  }

  let i, j;

  // hack: first-time run fix, as exports is initially undefined
  if (!collision.options.source) {
    collision.options.source = exports;
  }

  // loop through relevant game object arrays
  for (i = 0, j = collision.items.length; i < j; i++) {

    // assign current targets...
    collision.options.targets = game.objects[collision.items[i]];

    // ... and check them
    collisionCheckArray(collision.options);

  }

  // restore to original state
  collision.targets = null;

}

function collisionCheckMidPoint(obj1, obj2) {

  // infantry-at-midpoint (bunker or helicopter) case
  return collisionCheck(obj1.data.midPoint, obj2.data, 0);

}

function trackObject(source, target) {

  // given a source object (the helicopter) and a target, return the relevant vX / vY delta to get progressively closer to the target.

  let deltaX, deltaY;

  deltaX = (target.data.x + target.data.halfWidth) - (source.data.x + source.data.halfWidth);

  // by default, offset target to one side of a balloon.

  if (target.data.type === TYPES.tank) {

    // hack: bomb from high up.
    deltaY = (40 + target.data.halfHeight) - (source.data.y + source.data.halfHeight);

  } else {

    deltaY = (target.data.y + target.data.halfHeight) - (source.data.y + source.data.halfHeight);

  }

  return {
    deltaX,
    deltaY
  };

}

function getNearestObject(source, options) {

  // given a source object (the helicopter), find the nearest enemy in front of the source - dependent on X axis + facing direction.

  let i, j, k, l, itemArray, items, localObjects, targetData, preferGround, isInFront, useInFront, totalDistance;

  options = options || {};

  useInFront = !!options.useInFront;

  // should a smart missile be able to target another smart missile? ... why not.
  items = (options.items || ['tanks', 'vans', 'missileLaunchers', 'helicopters', 'bunkers', 'balloons', 'smartMissiles', 'turrets']);

  localObjects = [];

  // if the source object isn't near the ground, be biased toward airborne items.
  if (source.data.type === TYPES.helicopter && source.data.y > worldHeight - 100) {
    preferGround = true;
  }

  for (i = 0, j = items.length; i < j; i++) {

    itemArray = game.objects[items[i]];

    for (k = 0, l = itemArray.length; k < l; k++) {

      // potential target: not dead, and an enemy
      if (!itemArray[k].data.dead && itemArray[k].data.isEnemy !== source.data.isEnemy) {

        // is the target in front of the source?
        isInFront = (itemArray[k].data.x >= source.data.x);

        // [revised] - is the target within an acceptable range?
        // isInFront = (itemArray[k].data.x >= source.data.x || itemArray[k].data.x - source.data.x > -100);

        // additionally: is the helicopter pointed at the thing, and is it "in front" of the helicopter?
        if (!useInFront || (useInFront && ((!source.data.rotated && isInFront) || (source.data.rotated && !isInFront)))) {

          targetData = itemArray[k].data;

          if (
            (preferGround && targetData.bottomAligned && targetData.type !== TYPES.balloon)
            || (!preferGround && (!targetData.bottomAligned || targetData.type === TYPES.balloon))
          ) {

            totalDistance = Math.abs(Math.abs(targetData.x) - Math.abs(source.data.x));

            // "within range"
            if (totalDistance < 3072) {

              localObjects.push({
                obj: itemArray[k],
                totalDistance
              });

            }

          }

        }

      }

    }

  }

  if (!localObjects.length) return null;

  // sort by distance
  localObjects.sort(utils.array.compare('totalDistance'));

  // TODO: review and remove ugly hack here - enemy helicopter gets reverse-order logic.
  return localObjects[source.data.type === TYPES.helicopter && source.data.isEnemy ? localObjects.length - 1 : 0].obj;

}

function objectInView(data, options) {

  // unrelated to other nearby functions: test if an object is on-screen (or slightly off-screen),
  // alive, either enemy or friendly (depending on option), not cloaked, and within range.

  let i, j, items, result;

  options = options || {};

  // defaults
  options.triggerDistance = options.triggerDistance || game.objects.view.data.browser.twoThirdsWidth;
  options.friendlyOnly = !!options.friendlyOnly;

  items = game.objects[(options.items || 'helicopters')];

  for (i = 0, j = items.length; i < j; i++) {
    if (
      !items[i].data.dead
      && !items[i].data.cloaked
      && (options.friendlyOnly ? data.isEnemy === items[i].data.isEnemy : (data.isEnemy !== items[i].data.isEnemy || items[i].data.isNeutral))
      && Math.abs(items[i].data.x - data.x) < options.triggerDistance
    ) {
      result = items[i];
      break;
    }
  }

  return result;

}

function isOnScreen(target) {

  // is the target within the range of screen coordinates?
  return (
    target
    && target.data
    && (target.data.x + target.data.width) >= game.objects.view.data.battleField.scrollLeft
    && target.data.x < game.objects.view.data.battleField.scrollLeftWithBrowserWidth
  );

}

function initNearby(nearby, exports) {

  // map options.source -> exports
  nearby.options.source = exports;

}

function nearbyTest(nearby) {

  let i, j, foundHit;

  // loop through relevant game object arrays
  // TODO: revisit for object creation / garbage collection improvements
  for (i = 0, j = nearby.items.length; i < j; i++) {

    // assign current targets...
    nearby.options.targets = game.objects[nearby.items[i]];

    // ... and check them
    if (collisionCheckArray(nearby.options)) {
      foundHit = true;
      break;
    }

  }

  // reset
  nearby.options.targets = null;

  // callback for no-hit case, too
  if (!foundHit && nearby.options.miss) {
    nearby.options.miss(nearby.options.source);
  }

}

function enemyNearby(data, targets, triggerDistance) {

  let i, j, k, l, targetData, results;

  results = [];

  // "targets" is an array of class types, e.g., tank, missileLauncher etc.

  for (i = 0, j = targets.length; i < j; i++) {

    for (k = 0, l = game.objects[targets[i]].length; k < l; k++) {

      targetData = game.objects[targets[i]][k].data;

      // non-friendly, not dead, and nearby?
      if (targetData.isEnemy !== data.isEnemy && !targetData.dead) {
        if (Math.abs(targetData.x - data.x) < triggerDistance) {
          results.push(game.objects[targets[i]][k]);
          // 12/2021: take first result, and exit.
          return results;
        }
      }

    }

  }

  return results;

}

function enemyHelicopterNearby(data, triggerDistance) {

  let i, j, result;

  // by default
  triggerDistance = triggerDistance || game.objects.view.data.browser.twoThirdsWidth;

  for (i = 0, j = game.objects.helicopters.length; i < j; i++) {

    // not cloaked, not dead, and an enemy?
    if (!game.objects.helicopters[i].data.cloaked && !game.objects.helicopters[i].data.dead && data.isEnemy !== game.objects.helicopters[i].data.isEnemy) {

      // how far away is the target?
      if (Math.abs(game.objects.helicopters[i].data.x - data.x) < triggerDistance) {
        result = game.objects.helicopters[i];
        break;
      }

    }

  }

  return result;

}

function getDoorCoords(obj) {

  // for special collision check case with bunkers

  const door = {
    width: 5,
    height: obj.data.height, // HACK: should be ~9px, figure out why true height does not work.
    halfWidth: 2.5
  };

  return ({
    width: door.width,
    height: door.height,
    // slight offset on X, don't subtract door half-width
    x: parseInt(obj.data.x + obj.data.halfWidth + door.halfWidth + 2, 10),
    y: parseInt((obj.data.y + obj.data.height) - door.height, 10)
  });

}

function recycleTest(obj) {

  // did a unit reach the other side? destroy the unit, and reward the player with credits.
  let doRecycle, isEnemy, costObj, refund, type;

  isEnemy = obj.data.isEnemy;

  if (!obj || obj.data.dead || obj.data.isRecycling) return;

  if (isEnemy) {
    // slightly left of player's base
    doRecycle = obj.data.x <= -48;
  } else {
    doRecycle = obj.data.x >= worldWidth;
  }

  if (!doRecycle) return;

  obj.data.isRecycling = true;

  // animate down, back into the depths from whence it came
  utils.css.remove(obj.dom.o, 'ordering');
  utils.css.add(obj.dom.o, 'recycling');

  // ensure 'building' is set, as well. "pre-existing" game units will not have this.
  setFrameTimeout(() => {
    utils.css.add(obj.dom.o, 'building');
  }, 16);

  setFrameTimeout(() => {
    // die silently, and go away.
    obj.die({ silent: true});

    // tank, infantry etc., or special-case: engineer.
    type = obj.data.role ? obj.data.roles[obj.data.role] : obj.data.type;

    // special case: infantry may have been dropped by player, or when helicopter exploded.
    // exclude those from being "refunded" at all, given player was involved in their move.
    // minor: players could collect and drop infantry near enemy base, and collect refunds.
    if (type === TYPES.infantry && !obj.data.unassisted) return;

    costObj = COSTS[TYPES[type]];

    // reward player for their good work. 200% return on "per-item" cost.
    // e.g., tank cost = 4 credits, return = 8. for 5 infantry, 10.
    refund = (costObj.funds / (costObj.count || 1) * 2);

    game.objects.endBunkers[isEnemy ? 1 : 0].data.funds += refund;
    
    if (!isEnemy) {
      // notify player that a unit has been recycled?
      game.objects.notifications.add(`+${refund} 💰: recycled ${type} ♻️`);
      game.objects.funds.setFunds(game.objects.endBunkers[0].data.funds);
      game.objects.view.updateFundsUI();
    }

  }, 2000);

}

function countSides(objectType, includeDead) {

  let i, j, result;

  result = {
    friendly: 0,
    enemy: 0
  };

  if (!game.objects[objectType]) return result;

  for (i = 0, j = game.objects[objectType].length; i < j; i++) {
    if (!game.objects[objectType][i].data.dead) {
      if (game.objects[objectType][i].data.isEnemy || game.objects[objectType][i].data.hostile) {
        result.enemy++;
      } else {
        result.friendly++;
      }
    } else if (includeDead) {
      // things that are dead are considered harmless - therefore, friendly.
      result.friendly++;
    }
  }

  return result;

}

function countFriendly(objectType, includeDead) {

  includeDead = (includeDead || false);

  return countSides(objectType, includeDead).friendly;

}

function playerOwnsBunkers() {

  // has the player captured (or destroyed) all bunkers? this may affect enemy convoy production.
  let owned, total, includeDead = true;

  owned = countFriendly('bunkers', includeDead) + countFriendly('superBunkers', includeDead);
  total = game.objects.bunkers.length + game.objects.superBunkers.length;

  return (owned >= total);

}

function checkProduction() {

  let bunkersOwned, announcement;

  // playing extreme mode? this benefit would practically be cheating! ;)
  if (gameType === 'extreme') return;

  bunkersOwned = playerOwnsBunkers();

  if (!productionHalted && bunkersOwned) {

    // player is doing well; reward them for their efforts.
    announcement = '🎉 You have captured all bunkers. Enemy convoy production has been halted. 🚫';
    productionHalted = true;

  } else if (productionHalted && !bunkersOwned) {

    // CPU has regained control of a bunker.
    announcement = '😰 You no longer control all bunkers. Enemy convoy production is resuming. 🛠️';
    productionHalted = false;

  }

  if (announcement) {
    game.objects.view.setAnnouncement(announcement);
    game.objects.notifications.add(announcement);
  }

}



function updateIsOnScreen(o, forceUpdate) {

  if (!o || !o.data || !useDOMPruning) return;

  if (isOnScreen(o) || forceUpdate) {

    // exit if not already updated
    if (o.data.isOnScreen) return;

    o.data.isOnScreen = true;

    // node may not exist
    if (!o.dom || !o.dom.o) return;

    if (o.dom.o._lastTransform) {
      // MOAR GPU! re-apply transform that was present at, or updated since, removal
      o.dom.o.style.transform = o.dom.o._lastTransform;
    }

    o.dom.o.style.contentVisibility = 'visible';

    if (o.dom._oRemovedParent) {

      // previously removed: re-append to DOM
      o.dom._oRemovedParent.appendChild(o.dom.o);
      o.dom._oRemovedParent = null;

    } else {

      // first-time append, first time on-screen
      game.dom.world.appendChild(o.dom.o);

    }
    
    // callback, if defined
    if (o.isOnScreenChange) {
      o.isOnScreenChange(o.data.isOnScreen);
    }

  } else if (o.data.isOnScreen) {

    o.data.isOnScreen = false;

    if (o.dom && o.dom.o) {

      // manually remove x/y transform, will be restored when on-screen.
      if (o.dom.o.style.transform) {
        // 'none' might be considered a type of transform per Chrome Dev Tools,
        // and thus incur an "inline transform" cost vs. an empty string.
        // notwithstanding, transform has a "value" and can be detected when restoring elements on-screen.
        o.dom.o._lastTransform = o.dom.o.style.transform;
        o.dom.o.style.transform = 'none';
      }

      if (o.dom.o.parentNode) {
        o.dom._oRemovedParent = o.dom.o.parentNode;
        o.dom._oRemovedParent.removeChild(o.dom.o);
      }

      o.dom.o.style.contentVisibility = 'hidden';

    }

    // callback, if defined
    if (o.isOnScreenChange) {
      o.isOnScreenChange(o.data.isOnScreen);
    }

  }

}

function gameOver(youWon) {

  // somebody's base is about to get blown up.

  let yourBase, enemyBase;

  // just in case
  if (battleOver) return;

  yourBase = game.objects.bases[0];
  enemyBase = game.objects.bases[1];

  if (!youWon) {

    // sorry, better luck next time.
    yourBase.die();

  } else {

    enemyBase.die();

  }

  battleOver = true;

  utils.css.add(document.body, 'game-over');

  game.objects.stats.displayEndGameStats();

}

shrapnelExplosion = (options, shrapnelOptions) => {

  let localOptions, halfWidth;

  let vectorX, vectorY, i, angle, shrapnelCount, angleIncrement, explosionVelocity1, explosionVelocity2, explosionVelocityMax;

  shrapnelOptions = shrapnelOptions || {};

  localOptions = mixin({}, options);

  halfWidth = localOptions.width / 2;

  // randomize X?
  if (shrapnelOptions.centerX) {
    localOptions.x += halfWidth;
  } else {
    localOptions.x += rnd(localOptions.width);
  }

  // silly, but copy right over.
  if (shrapnelOptions.noInitialSmoke) {
    localOptions.noInitialSmoke = shrapnelOptions.noInitialSmoke;
  }

  angle = 0;

  explosionVelocityMax = shrapnelOptions.velocity || 4;

  shrapnelCount = shrapnelOptions.count || 8;

  angleIncrement = 180 / (shrapnelCount - 1);

  for (i = 0; i < shrapnelCount; i++) {

    explosionVelocity1 = rnd(explosionVelocityMax);
    explosionVelocity2 = rnd(explosionVelocityMax);

    vectorX = -explosionVelocity1 * Math.cos(angle * rad2Deg);
    vectorY = -explosionVelocity2 * Math.sin(angle * rad2Deg);

    localOptions.vX = (localOptions.vX * 0.5) + vectorX;
    localOptions.vY += vectorY;

    // bottom-aligned object? explode "up".
    if (localOptions.vY > 0 && options.bottomAligned) {
      localOptions.vY *= -1;
    }

    // have first and last make noise
    localOptions.hasSound = (i === 0 || (shrapnelCount > 4 && i === shrapnelCount - 1));

    game.objects.shrapnel.push(Shrapnel(localOptions));

    angle += angleIncrement;

  }

};

/**
 * hooks into main game requestAnimationFrame() loop.
 * calls animate() methods on active FrameTimeout() instances.
 */
frameTimeoutManager = (() => {
  let exports;
  const instances = [];
  const spliceArgs = [null, 1];

  function addInstance(frameTimeout) {
    instances.push(frameTimeout);
  }

  function animate() {
    if (!instances || !instances.length) return;

    const completed = [];

    for (var i = 0, j = instances.length; i < j; i++) {
      // do work, and track completion
      if (instances[i].animate()) {
        completed.push(instances[i]);
      }
    }

    if (completed.length) {
      for (i=0, j=completed.length; i<j; i++) {
        spliceArgs[0] = instances.indexOf(completed[i]);
        Array.prototype.splice.apply(instances, spliceArgs);
      }
    }
    
  }

  exports = {
    addInstance,
    animate
  };

  return exports;
})();

setFrameTimeout = (callback, delayMsec) => {

  /**
   * a frame-counting-based setTimeout() implementation.
   * millisecond value (parameter) is converted to a frame count.
   */

  let data, exports;

  data = {
    frameCount: 0,
    frameInterval: parseInt(delayMsec / FRAMERATE, 10), // e.g., msec = 1000 -> frameInterval = 60
    callbackFired: false,
    didReset: false,
  };

  function animate() {

    // if reset() was called, exit early
    if (data.didReset) return true; 

    data.frameCount++;

    if (!data.callbackFired && data.frameCount >= data.frameInterval) {
      callback();
      data.callbackFired = true;
      return true;
    }

    return false;

  }

  function reset() {
    // similar to clearTimeout()
    data.didReset = true;
  }

  exports = {
    animate,
    data,
    reset
  };

  frameTimeoutManager.addInstance(exports);

  return exports;

};

// recycled from survivor.js
keyboardMonitor = (() => {
  let keys;
  let events;

  const // hash for keys being pressed
  downKeys = {};

  const // meaningful labels for key values
  keyMap = {
    banana: 66,
    rubber_chicken: 67,
    shift: 16,
    ctrl: 17,
    space: 32,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    missileLauncher: 77,
    tank: 84,
    van: 86,
    infantry: 73,
    engineer: 69
  };

  events = {

    keydown(e) {

      if (game.data.paused) return;

      // console.log(e.keyCode);

      if (!e.metaKey && keys[e.keyCode]?.down) {
        if (!downKeys[e.keyCode]) {
          downKeys[e.keyCode] = true;
          keys[e.keyCode].down(e);
        }
        if (keys[e.keyCode].allowEvent === undefined) {
          return stopEvent(e);
        }
      }

      return true;

    },

    keyup(e) {

      if (game.data.paused) return;

      if (!e.metaKey && downKeys[e.keyCode] && keys[e.keyCode]) {
        downKeys[e.keyCode] = null;
        if (keys[e.keyCode].up) {
          keys[e.keyCode].up(e);
        }
        if (keys[e.keyCode].allowEvent === undefined) {
          return stopEvent(e);
        }
      }

      return true;

    }

  };

  keys = {

    // NOTE: Each function gets an (e) event argument.

    // shift
    13: {

      allowEvent: true, // don't use stopEvent()

      down() {

        game.objects.helicopters[0].eject();

      }

    },

    // shift
    16: {

      allowEvent: true, // don't use stopEvent()

      down() {

        game.objects.helicopters[0].setFiring(true);

      }

    },

    // ctrl
    17: {

      allowEvent: true, // don't use stopEvent()

      down() {

        game.objects.helicopters[0].setBombing(true);

      }

    },

    // space bar
    32: {

      down() {

        game.objects.helicopters[0].setParachuting(true);

      },

      up() {

        game.objects.helicopters[0].setParachuting(false);

      }

    },

    // 1

    49: {

      down() {

        game.addObject(TYPES.missileLauncherCamel, {
          x: game.objects.helicopters[0].data.x,
          isEnemy: true
        });

      }

    },

    50: {

      down() {

        game.addObject(TYPES.infantry, {
          x: game.objects.helicopters[0].data.x,
          // isEnemy: true
        });

      }

    },

    51: {

      down() {

        game.addObject(TYPES.engineer, {
          x: game.objects.helicopters[0].data.x,
          isEnemy: false
        });

      }

    },

    // "m"
    77: {

      down() {

        game.objects.inventory.order(TYPES.missileLauncherCamel);

      }

    },

    // "t"
    84: {

      down() {

        game.objects.inventory.order(TYPES.tank);

      }

    },

    // "v"
    86: {

      down() {

        game.objects.inventory.order(TYPES.van);

      }

    },

    // "b" (banana)
    66: {
      down() {

        // heat-seeking banana
        setMissileMode(bananaMode);

        game.objects.helicopters[0].setMissileLaunching(true);

      },

      up() {

        game.objects.helicopters[0].setMissileLaunching(false);

      }

    },

    // "c" (rubber chicken)
    67: {

      down() {

        // heat-seeking rubber chicken
        setMissileMode(rubberChickenMode);

        game.objects.helicopters[0].setMissileLaunching(true);

      },

      up() {

        game.objects.helicopters[0].setMissileLaunching(false);

      }

    },

    // TESTING
    // "d"
    68: {

      down() {

        shrapnelExplosion(game.objects.helicopters[0].data, {
          count: 2,
          velocity: 20 * Math.random()
        });
      },
    },

    // "x"
    88: {

      down() {

        // standard heat-seeking missile
        setMissileMode(defaultMissileMode);

        game.objects.helicopters[0].setMissileLaunching(true);

      },

      up() {

        game.objects.helicopters[0].setMissileLaunching(false);

      }

    },

    // "e"
    69: {

      down() {

        game.objects.inventory.order(TYPES.engineer);

      }

    },

    // "i"
    73: {

      down() {

        game.objects.inventory.order(TYPES.infantry);

      }

    }

  };

  function isDown(labelOrCode) {

    // check for a pressed key based on '37' or 'left', etc.
    return (keyMap[labelOrCode] !== undefined ? downKeys[keyMap[labelOrCode]] : downKeys[labelOrCode]);

  }

  function releaseAll() {

    // reset all pressed key states.
    let item;
    for (item in downKeys) {
      if (downKeys[item]) {
        // simulate the keyup event
        events.keyup({
          keyCode: item
        });
      }
    }

  }

  function attachEvents() {

    utils.events.add(document, 'keydown', events.keydown);
    utils.events.add(document, 'keyup', events.keyup);

  }

  // init?

  function initKeyboardMonitor() {

    attachEvents();

  }

  return {

    init: initKeyboardMonitor,
    isDown,
    keydown: events.keydown,
    keyMap,
    keyup: events.keyup,
    releaseAll

  };
})();

function startGame() {

  game.init();

  prefsManager.init();

  keyboardMonitor.init();

}

function orientationChange() {
  // primarily for handling iPhone X, and position of The Notch.
  // apply CSS to <body> per orientation, and iPhone-specific CSS will handle the padding.

  // shortcuts
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
  if (game.objects.helicopters[0]) game.objects.helicopters[0].refreshCoords(true);
  if (game.objects.helicopters[1]) game.objects.helicopters[1].refreshCoords();

}

function initArmorAlley() {

  // A few specific CSS tweaks - regrettably - are required.
  if (isFirefox) utils.css.add(document.body, 'is_firefox');
  if (isSafari) utils.css.add(document.body, 'is_safari');

  if (isMobile) {

    utils.css.add(document.body, 'is-mobile');

    // prevent context menu on links.
    // this is dirty, but it works (supposedly) for Android.
    window.oncontextmenu = e => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // if iPads etc. get The Notch, this will need updating. as of 01/2018, this is fine.
    if (isiPhone) {
      /**
       * iPhone X notch detection shenanigans. AA should avoid the notch,
       * but doesn't need to pad the right end of the screen - thus, we detect
       * this case and apply CSS for orientation so we know which side the notch is on.
       *
       * Tips o' the hat:
       * PPK - hasNotch() detection. Doesn't seem to work on iOS 11.0.2 as of 01/2018.
       * https://www.quirksmode.org/blog/archives/2017/10/safeareainset_v.html
       * Mark Nolton on SO - orientation change.
       * https://stackoverflow.com/a/47226825
       */
      console.log('watching orientation for possible iPhone X Notch handling.');
      window.addEventListener('orientationchange', orientationChange);
      // and get the current layout.
      orientationChange();
    }

  }

  let menu;
  const description = document.getElementById('game-description');
  const defaultDescription = description.innerHTML;
  let lastHTML = defaultDescription;

  function resetMenu() {
    if (lastHTML !== defaultDescription) {
      description.innerHTML = defaultDescription;
      lastHTML = defaultDescription;
    }
  }

  function menuUpdate(e) {

    let target = (e.target || window.event.sourceElement), title;

    // normalize to <a>
    if (target && utils.css.has(target, 'emoji')) {
      target = target.parentNode;
    }

    if (target && target.className.match(/cta/i)) {
      title = target.title;
      if (title) {
        target.setAttribute('data-title', title);
        target.title = '';
      } else {
        title = target.getAttribute('data-title');
      }
      if (lastHTML !== title) {
        description.innerHTML = title;
        lastHTML = title;
      }
    } else {
      resetMenu();
    }

  }

  function menuClick(e) {
    // infer game type from link, eg., #tutorial

    const target = (e.target || window.event.sourceElement);

    let storedOK;
    let param;

    if (target && target.href) {

      // cleanup
      utils.events.remove(menu, 'click', menuClick);
      utils.events.remove(menu, 'mouseover', menuUpdate);
      utils.events.remove(menu, 'mouseout', menuUpdate);
      menu = null;

      param = target.href.substr(target.href.indexOf('#') + 1);

      if (param === 'easy') {

        // window.location.hash = param;

        // set local storage value, and continue
        storedOK = utils.storage.set(prefs.gameType, 'easy');

        // stoage failed? use hash, then.
        if (!storedOK) {
          window.location.hash = param;
        }

        if (gameType === 'hard' || gameType === 'extreme') {

          // reload, since we're switching to easy
          window.location.reload();

        } else {

          // show exit link
          const exit = document.getElementById('exit');
          if (exit) {
            exit.className = 'visible';
          }

        }

      } else if (param === 'hard' || param === 'extreme') {

        // set local storage value, and continue
        storedOK = utils.storage.set(prefs.gameType, param);

        // stoage failed? use hash, then.
        if (!storedOK) {
          window.location.hash = param;
        }

        window.location.reload();

      } else {

        window.location.hash = 'tutorial';

        window.location.reload();

      }

    }

    utils.events.preventDefault(e);

    canHideLogo = true;

    return false;
  }

  winloc = window.location.href.toString();

  // should we show the menu?

  gameType = (winloc.match(/easy|hard|extreme|tutorial/i) || utils.storage.get(prefs.gameType));

  if (gameType instanceof Array) {
    gameType = gameType[0];
  }

  // safety check
  if (gameType && !gameType.match(/easy|hard|extreme|tutorial/i)) {
    gameType = null;
  }

  if (!gameType) {

    menu = document.getElementById('game-menu');

    if (menu) {

      utils.css.add(document.getElementById('world'), 'blurred');

      utils.css.add(menu, 'visible');

      utils.events.add(menu, 'click', menuClick);

      utils.events.add(menu, 'mouseover', menuUpdate);

      utils.events.add(menu, 'mouseout', menuUpdate);

    }

  } else {

    // preference set or game type in URL - start immediately.

    // TODO: cleaner DOM reference
    if (gameType.match(/easy|hard|extreme/i)) {
      utils.css.add(document.getElementById('world'), 'regular-mode');
    }

    if (gameType) {
      // copy emoji to "exit" link
      const exitEmoji = document.getElementById('exit-emoji');
      let emojiReference = document.getElementById('game-menu').getElementsByClassName(`emoji-${gameType}`);
      emojiReference = emojiReference && emojiReference[0];
      if (exitEmoji && emojiReference) {
        exitEmoji.innerHTML = emojiReference.innerHTML;
      }
      // and show "exit"
      const exit = document.getElementById('exit');
      if (exit) {
        exit.className = 'visible';
      }
    }

    canHideLogo = true;

  }

  startGame();

}

window.aa = {

  initArmorAlley,

  startGame,

  startTutorial() {

    utils.storage.remove(prefs.gameType);

    window.location.hash = 'tutorial';

    setTimeout(() => {
      window.location.reload();
    }, 100);

    return false;

  },

  exit() {

    // delete stored preference
    utils.storage.remove(prefs.gameType);

    window.location.hash = '';

    setTimeout(() => {
      window.location.reload();
    }, 100);

    return false;

  }

};

prefs = {
  // legacy
  gameType: 'gameType',
  noScaling: 'noScaling',
  noSound: 'noSound',
}

// for non-boolean form values; set by form, referenced by game
const PREFS = {
  SHOW_HEALTH_NEVER: 'never',
  SHOW_HEALTH_SOMETIMES: 'sometimes',
  SHOW_HEALTH_ALWAYS: 'always',
  NOTIFICATIONS_LOCATION_LEFT: 'left',
  NOTIFICATIONS_LOCATION_RIGHT: 'right'
};

// game defaults
const defaultPrefs = {
  sound: true,
  snow: false,
  show_inventory: true,
  show_weapons_status: true,
  show_keyboard_labels: true,
  show_game_tips: true,
  show_health_status: PREFS.SHOW_HEALTH_SOMETIMES, // never | sometimes | always
  notifications_location: PREFS.NOTIFICATIONS_LOCATION_RIGHT, // left | right
  enemy_missile_match_type: true,
  engineers_repair_bunkers: true,
  engineers_rob_the_bank: true,
  tank_gunfire_miss_bunkers: true,
  ground_unit_traffic_control: true
};

// initially, the game inherits the defaults
gamePrefs = {
  ...defaultPrefs
};

prefsManager = (function() {

  let data, dom, events;

  function init() {

    dom.o = document.getElementById('game-prefs-modal');
    dom.oForm = document.getElementById('game-prefs-form');
    dom.optionsLink = document.getElementById('game-options-link');
    dom.oStatsBar = document.getElementById('stats-bar');
    dom.oGameTips = document.getElementById('game-tips');
    dom.oToasts = document.getElementById('notification-toasts');

    // just in case
    if (!dom.o || !dom.oForm || !dom.optionsLink) return;

    // delightfully old-skool.
    dom.oForm.onsubmit = events.onFormSubmit;
    dom.optionsLink.onclick = events.optionsLinkOnClick;

    // hackish: adjust dialog body to "natural" height, prevent scrollbars.
    // display temporarily, read layout, adjust and then hide.
    dom.o.style.opacity = 0;
    dom.o.style.display = 'block';

    let body = dom.o.querySelector('.body');
    body.style.height = 'auto';

    let height = body.offsetHeight;

    // now assign the natural content height
    body.style.height = height + 'px';

    // one more thing: audio is force-disabled in Safari.
    // handle exceptions here.
    if (!soundManager.ok()) {
      document.getElementById('cb_sound').setAttribute('disabled', true);
      document.getElementById('cb_sound_description').innerHTML = [
        'HTML5 Audio() disabled, sorry.',
        (isSafari ? ' <a href="https://bugs.webkit.org/show_bug.cgi?id=116145">Webkit #116145</a>.' : ''),
        ' <a href="?html5audio=1">Try it</a> at your own risk.'
      ].join('');
    }

    // Remove the menu entirely from the DOM, set it up to append only when active.
    dom.o.remove();

    // reset opacity
    dom.o.style.opacity = null;

    getPrefsFromStorage();

  }

  function show() {

    if (data.active || !dom.o) return;

    data.active = true;

    events.updateScreenScale();

    document.body.appendChild(dom.o);

    game.pause();
  }

  function hide() {

    if (!data.active || !dom.o) return;

    dom.o.remove();
    data.active = false;

    game.resume();

  }

  function isActive() {

    return data.active;

  }

  function getEmptyCheckboxData() {

    // checkbox inputs that aren't checked, won't be submitted.
    // iterate through those here, and provide the name with value=0 for each.
    // there is likely a cleaner way to do this.
    if (!dom.oForm) return {};

    let result = {};
    let checkboxes = dom.oForm.querySelectorAll('input[type="checkbox"]:not(:checked)');

    checkboxes.forEach((checkbox) => {
      result[checkbox.name] = 0;
    });
    
    return result;

  }

  function getPrefsFromForm() {

    if (!dom.oForm) return;

    const formData = new FormData(dom.oForm);

    if (!formData) return;

    let data = {};

    formData.forEach((value, key) => {
      // NOTE: form uses numbers, but game state tracks booleans.
      // form values will be 0, 1, or a non-numeric string.
      // try for int, e.g., "0" -> 0 - otherwise, keep original string.
      let number = parseInt(value, 10);
      data[key] = isNaN(number) ? value : number;
    });

    // mixin of e.g., sound=0 where checkboxes are unchecked, and remainder of form data
    let prefs = {
      ...getEmptyCheckboxData(),
      ...data
    };

    return prefs;
    
  }

  function convertPrefsForGame(prefs) {

    // all form values are integer-based, but the game references booleans and string values.
    // given prefs with 0|1 or integer, translate to boolean or string values.
    if (!prefs) return {};

    let result = {};
    let value;

    for (let key in prefs) {
      // NOTE: form uses numbers, but game state tracks booleans.
      // key -> value: 0/1 to boolean; otherwise, keep as string.
      value = prefs[key];
      result[key] = isNaN(value) ? value : !!value;
    }

    return result;

  }

  function updatePrefs() {

    // fetch from the live form
    let formPrefs = getPrefsFromForm();

    // convert 0/1 to booleans
    let newGamePrefs = convertPrefsForGame(formPrefs);

    applyNewPrefs(newGamePrefs);

  }

  function applyNewPrefs(newGamePrefs) {

    let prefChanges = [];

    // queue data for onChange() calls,as applicable
    // e.g., game needs to handle enabling or disabling snow or health bars
    for (let key in newGamePrefs) {
      if (events.onPrefChange[key] && gamePrefs[key] !== newGamePrefs[key]) {
        prefChanges.push({ key, value: newGamePrefs[key] });
      }
    }

    // update the live game prefs
    gamePrefs = {
      ...gamePrefs,
      ...newGamePrefs
    };

    // and now, fire all the pref change events.
    prefChanges.forEach((item) => {
      events.onPrefChange[item.key](item.value);
    });

  }

  function updateForm() {

    // given current `gamePrefs`, ensure the form has the right things selected / checked.
    Object.keys(gamePrefs).forEach((key) => {

      let value = boolToInt(gamePrefs[key]);

      // find the matching input based on name, and update it.
      let input = dom.oForm.querySelector(`input[name="${key}"]`);

      // just in case...
      if (!input) return;

      // NOTE: intentional non-strict comparison here, string vs. int.
      if (input.value == value) {
        input.setAttribute('checked', true);
      } else {
        input.removeAttribute('checked');
      }

    });

  }

  function boolToInt(value) {

    // gamePrefs uses true / false, but the form needs 1 / 0.
    if (typeof value === 'boolean') return value ? 1 : 0;

    return value;

  }

  function stringToBool(value) {
    // LocalStorage stores strings, but JS state uses booleans and numbers.

    // number?
    if (!isNaN(value)) return parseInt(value, 10);

    // string to boolean?
    if (value === 'true') return true;
    if (value === 'false') return false;

    // string
    return value;
  }

  function writePrefsToStorage() {

    Object.keys(gamePrefs).forEach((key) => utils.storage.set(key, gamePrefs[key]));
    
  }

  function getPrefsFromStorage() {

    let prefsFromStorage = {};

    // should scaling be disabled, per user preference?
    if (utils.storage.get(prefs.noScaling)) {
      userDisabledScaling = true;
    }

    // TODO: validate the values pulled from storage. 😅
    Object.keys(defaultPrefs).forEach((key) => {
      let value = utils.storage.get(key);
      if (value !== undefined) {
        prefsFromStorage[key] = stringToBool(value);
      }
    });

    applyNewPrefs(prefsFromStorage);

    updateForm();

  }

  data = {
    active: false
  };

  dom = {
    o: null,
    oForm: null,
    optionsLink: null,
    oStatsBar: null,
    oGameTips: null,
    oToasts: null
  };

  events = {

    onFormSubmit: (e) => {

      updatePrefs();
      writePrefsToStorage();
      hide();
      e.preventDefault();
      return false;

    },

    optionsLinkOnClick: (e) => {

      show();
      e.preventDefault();
      return false;

    },

    onPrefChange: {

      sound: (isActive) => soundManager[isActive ? 'mute' : 'unmute'](),

      snow: (isActive) => {
        window?.snowStorm?.toggleSnow();
        // update battlefield sprites
        utils.css.addOrRemove(game.objects.view.dom.battleField, isActive, 'snow');
      },

      show_inventory: (show) => utils.css.addOrRemove(dom.oStatsBar, !show, 'hide-inventory'),

      show_weapons_status: (show) => utils.css.addOrRemove(dom.oStatsBar, !show, 'hide-weapons-status'),

      show_keyboard_labels: (show) => utils.css.addOrRemove(dom.oStatsBar, !show, 'hide-keyboard-labels'),

      show_game_tips: (show) => {

        // prevent removal if in tutorial mode, which requires tips
        if (!show && tutorialMode) return;

        utils.css.addOrRemove(dom.oGameTips, show, 'active');
      
      },

      show_health_status: (newValue) => {

        // hackish: iterate over most objects, and force a redraw of health bars
        let targets = ['tanks', 'vans', 'bunkers', 'missileLaunchers', 'infantry', 'parachuteInfantry', 'engineers', 'helicopters', 'balloons', 'smartMissiles', 'endBunkers', 'superBunkers', 'turrets'];
        let forceUpdate = true;

        targets.forEach((type) => {

          game.objects[type].forEach((obj) => {

            // exit if unset or zero
            if (!obj?.data?.lastEnergy) return;

            // update immediately if pref is now "always" show, OR, "sometimes/never" and we have an energy DOM node present.
            if (newValue === PREFS.SHOW_HEALTH_ALWAYS || obj?.dom?.oEnergy) {
              updateEnergy(obj, forceUpdate);
            }

          });

        });

      },

      notifications_location: (newValue) => utils.css.addOrRemove(dom.oToasts, newValue === PREFS.NOTIFICATIONS_LOCATION_LEFT, 'left-aligned')

    },

    updateScreenScale: () => {

      if (!data.active || !dom.o) return;

      // CSS shenanigans: `zoom: 2` applied, so we offset that here where supported.
      let scale = screenScale * (usingZoom || isSafari ? 0.5 : 1);

      dom.o.style.transform = `translate3d(-50%, -50%, 0px) scale3d(${scale},${scale},1)`;

    }

  };

  return {
    init,
    isActive,
    updateScreenScale: events.updateScreenScale
  };

}());

// OGG is available, so MP3 is not required.
soundManager.audioFormats.mp3.required = false;

if (isSafari) {
  // Safari 7+ engine freezes when multiple Audio() objects play simultaneously, making gameplay unacceptable.
  // https://bugs.webkit.org/show_bug.cgi?id=116145
  // try html5audio=1 in URL to override/test.
  const matches = navigator.userAgent.match(/Version\/([0-9]+)/i);
  // last item should be the version number.
  const majorVersion = matches && matches.pop && parseInt(matches.pop(), 10);
  if (majorVersion && majorVersion >= 7) {
    console.log('Safari 7-15 (and maybe newer) rendering engine stutters when multiple Audio() objects play simultaneously, possibly due to trackbar. https://bugs.webkit.org/show_bug.cgi?id=116145');
    if (!winloc.match(/html5audio/i)) {
      console.log('Audio is disabled by default. You can try forcing audio by adding html5audio=1 to the URL.');
      soundManager.disable();
    }
  }
}

soundManager.setup({
  debugMode: false,
  defaultOptions: {
    volume: DEFAULT_VOLUME,
    multiShot: false // !isSafari // !!(winloc.match(/multishot/i)),
  },
});

function updateSound(ok) {
  const soundOption = document.getElementById('sound-option');
  if (soundOption) soundOption.style.display = ok ? 'inline' : 'none';
}

soundManager.onready(updateSound);
soundManager.ontimeout(() => {
  const ok = false;
  updateSound(ok);
});

if (winloc.match(/mute/i)) {
  soundManager.disable();
}

window.addEventListener('DOMContentLoaded', window.aa.initArmorAlley);

// --- THE END ---

import { common } from './core/common.js';
import { utils } from './core/utils.js';
import { game } from './core/Game.js';
import { Shrapnel } from './elements/Shrapnel.js';

// some other modules reference this from here.
// TODO: move this into a better shared place.
export { DEFAULT_FUNDS } from './UI/Funds.js';

export {
  common,
  game,
  gamePrefs,
  inheritData,
  inheritCSS,
  TYPES,
  updateEnergy,
  utils,
  shrapnelExplosion,
  setFrameTimeout,
  removeNodes,
  FPS,
  nearbyTest,
  makeSprite,
  makeTransformSprite,
  initNearby,
  recycleTest,
  collisionCheck,
  rndInt,
  plusMinus,
  applyRandomRotation,
  rnd,
  collisionTest,
  mixin,
  worldWidth,
  worldHeight,
  bottomAlignedY,
  gameType,
  makeSubSprite,
  getDoorCoords,
  getNormalizedUnitName,
  checkProduction,
  collisionCheckMidPoint,
  enemyHelicopterNearby,
  objectInView,
  missileMode,
  bananaMode,
  rubberChickenMode,
  getNearestObject,
  rad2Deg,
  updateIsOnScreen,
  tutorialMode,
  debug,
  enemyNearby,
  defaultMissileMode,
  canHideLogo,
  battleOver,
  getLandscapeLayout,
  isMobile,
  isiPhone,
  keyboardMonitor,
  screenScale,
  trackEnemy,
  trackObject,
  winloc,
  gameOver,
  stats,
  isFirefox,
  COSTS,
  updateScreenScale,
  applyScreenScale,
  isSafari,
  isChrome,
  countFriendly,
  countSides,
  FRAMERATE,
  FRAME_MIN_TIME,
  unlimitedFrameRate,
  frameTimeoutManager,
  addItem,
  convoyDelay,
  setConvoyDelay,
  productionHalted,
  prefsManager,
  DEFAULT_VOLUME,
  isOnScreen
};