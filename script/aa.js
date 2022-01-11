'use strict';
/* global soundManager */
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

// TODO: move into view
let screenScale = 1;

const prefsManager = PrefsManager();

const keyboardMonitor = KeyboardMonitor();
    
keyboardMonitor.init();

let stats;

function setScreenScale(scale) {
  screenScale = scale;
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

// used by the "exit [game type]" link
window.aa = {

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

if (winloc.match(/mute/i)) {
  soundManager.disable();
}

window.addEventListener('DOMContentLoaded', game.initArmorAlley);

// --- THE END ---

// TODO: clean up local references to this stuff.
import {
  winloc,
  isSafari,
  DEFAULT_VOLUME
} from './core/global.js';

import {
  getLandscapeLayout
} from './UI/mobile.js';

import { utils } from './core/utils.js';
import { game } from './core/Game.js';
import { KeyboardMonitor } from './UI/KeyboardMonitor.js';
import { gamePrefs, prefs, PrefsManager } from './UI/preferences.js';

// TODO: review. This method may be more DRY.
export { gameType } from './core/Game.js';
export { PREFS } from './UI/preferences.js';

export * from './core/global.js';

export {
  keyboardMonitor,
  setScreenScale,
  game,
  gamePrefs,
  utils,
  rndInt,
  plusMinus,
  rnd,
  getNormalizedUnitName,
  getLandscapeLayout,
  screenScale,
  stats,
  stopEvent,
  prefsManager
};