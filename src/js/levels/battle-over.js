import { gameType } from '../aa.js';
import { common } from '../core/common.js';
import { IMAGE_ROOT, rndInt } from '../core/global.js';
import { levelName } from './default.js';

// network-specific battles, tutorial etc.
let genericVictory =
  'Congratulations!\nYou have won the battle. <span class="inline-emoji">🎉</span>';

// reused a few times
let youWon = `You've defeated the enemy and rescued the 'Old Tanker'...`;

let victoryMessages = {
  // if unspecified / no match, use 'easy' as default.
  'Tutorial': {
    easy: `${genericVictory}<br />Try playing the <u>REAL</u> thing!`
  },
  'Cake Walk': {
    easy: `You've done a good job in the first battle. Congratulations! But look out - the enemy is alerted now...`,
    hard: `The Wargames are on! You took the first enemy position, but now you need to work on the next battle!`
  },
  'One-Gun': {
    easy: `That was well done! Keep it up, but don't get overconfident: you can expect the going to get tougher.`,
    hard: `Looking good. Keep developing your convoy strategies. They will come in handy later.`
  },
  'Sucker Punch': {
    easy: `Excellent! Don't stop now. You're well on your way into enemy territory. Just watch out for new problems to overcome.`,
    hard: `We have napalm for your chopper. Now the enemy is in for a real surprise!`,
    armorgeddon: `They're on the run now...`
  },
  'Airborne': {
    easy: `Fantastic! I guess you are getting the hang of this.`,
    hard: `Careful! The enemy is getting smarter.`,
    extreme: `Fantastic! That napalm really must help...`,
    armorgeddon: `Are you having fun yet?`
  },
  'Two-Gun': {
    easy: `You've won again. Superb effort! You're now halfway to total victory. Expect the enemy to tighten their defenses.`,
    armorgeddon: `Just when you thought you had it made...`
  },
  'Super Bunker': {
    easy: `Another victory! You're on a roll, but remember the enemy has tricks you haven't seen yet.`,
    armorgeddon: `Things are going to get tougher now. Time to put in some overtime!`
  },
  'Scrapyard': {
    easy: `It was tough going, but you made it! You are closing to the completion of your mission. Don't expect things to get easier.`,
    armorgeddon: `They have nicknamed you, 'The Hawk.' Shows you what they know...`
  },
  'Blind Spot': {
    easy: `Terrific! Just two more battles to win. You've got the enemy cornered. They don't like that...`,
    armorgeddon: `You are almost to their final position! They are realy getting worried...`
  },
  'Wasteland': {
    easy: `You've conquered every obstacle and mastered every trick the enemy knew. You're a general to be reckoned with. Just one last battle.`,
    armorgeddon: `Well, you just think you're tough. Wait 'til the next battle!`,
  },
  'Midnight Oasis': {
    easy: `${youWon} Now that you have made it through Boot Camp, try your luck in Wargames!`,
    hard: `${youWon} Now you are ready for a real test! Try 'Combat' for a real test of your skills.`,
    extreme: `${youWon} Now you are ready for your final challenge! Try 'Armorgeddon' for the ultimate test of your skills.`,
    armorgeddon: `We don't believe it. You MUST have cheated... no way, Jose! Impossible! Holy handgrenades! ${youWon} in a battle of the highest difficulty. Congratulations!`
  }
};

/**
 * Data pattern: number of medals to show in order of types / images #1 - #6,
 * split between left and right columns, with the offset being the medal number.
 *
 * e.g., Wasteland pattern [ 3, 3, 1, 2, 1, 0 ]:
 * ROW 1: three of medal 1 and three of medal 2,
 * ROW 2: one of medal 3 and two of medal 4,
 * ROW 3: one of medal 5 and none of medal 6.
 *
 * Medals can run in arbitrary group lengths, but the default is three.
 */
const medalList = {
  'Cake Walk': [1, 0, 0, 0, 0, 0],
  'One-Gun': [2, 0, 0, 0, 0, 0],
  'Sucker Punch': [2, 1, 0, 0, 0, 0],
  'Airborne': [2, 2, 0, 0, 0, 0],
  'Two-Gun': [3, 2, 1, 0, 0, 0],
  'Super Bunker': [3, 2, 1, 0, 0, 0],
  'Scrapyard': [3, 3, 1, 1, 0, 0],
  'Blind Spot': [3, 3, 1, 2, 0, 0],
  'Wasteland': [3, 3, 1, 2, 1, 0],
  'Midnight Oasis': [4, 4, 2, 2, 1, 1]
};

function medalTemplate(i) {
  if (i === 0) return emptyTemplate();
  return `<span class="medal medal-${i}"></span>`;
}

function columnSpacer() {
  return '<span class="column-spacer"></span>';
}

function emptyTemplate() {
  return '<span class="medal-spacer"></span>';
}

function medalGroup(count, medal, isEven) {
  // show `count` of the specified `medal`, by offset - with alignment and padding for empty slots, as needed.
  let html = [];
  let defaultGroupSize = 3;
  // group size can be overridden, e.g., 4 for Midnight Oasis.
  let groupSize = Math.max(count, defaultGroupSize);
  for (var i = 0; i < groupSize; i++) {
    html.push(i < count ? medalTemplate(medal) : emptyTemplate());
  }
  // if an "even" column, we're on the left side - flip array, so items are right-aligned e.g., a single medal is on right.
  if (isEven) html.reverse();
  return html.join('');
}

function getMedals() {
  if (!medalList[levelName]) return '';

  let html = [];
  let isEven;

  // build out groups of medals, typically three at a time.
  medalList[levelName].forEach((count, i) => {
    isEven = i % 2 === 0;
    // note: medal CSS + images start at 1.
    html.push(medalGroup(count, i + 1, isEven));
    // space between "columns" vs. line break
    if (isEven) {
      html.push(columnSpacer());
    } else {
      html.push('<br />');
    }
  });

  window.requestAnimationFrame(() => {
    // hackish: assign transition delays before fading in.
    // this happens here because of laziness, having generated arrays of strings which are now live nodes.
    let m = document.getElementById('medals');
    // just in case...
    if (!m) return;
    let medalDelay = 150;
    m.querySelectorAll('.medal').forEach((m, i) => {
      m.style.transitionDelay = `${medalDelay * i}ms`;
    });
    // start transitions
    common.setFrameTimeout(() => {
      m.className = 'active';
    }, 1000);
  });

  return `<div id="medals">${html.join('')}</div>`;
}

function getVictoryMessage() {
  let msgs = victoryMessages[levelName];
  // if no match for the level (e.g., network-specific battle?), return a generic string.
  if (!msgs) return genericVictory;

  // default to 'easy', if no gameType-specific one found.
  let msg = msgs[gameType] || msgs['easy'];

  return msg + getMedals();
}

let defeatMessages = [
  `Avoid picking up engineers; they can not take their equipment on board.`,
  `Methods to destroy anti-aircraft guns include: two smart missiles in quick succession, tanks, paratroopers or engineers.`,
  `You can take over enemy anti-aircraft guns with your engineers; this will help to protect you and your convoys from airborne assault.`,
  `Attack ground units from behind.`,
  `To practice bombing, stay near your base so you can rearm quickly.`,
  `It is dangerous to fight over your convoys.`,
  `Unless the enemy helicopter is near by, take time to carefully aim your weapons at ground units.`,
  `Fire doesn't take sides.`,
  `Create more than one convoy. This way, if your leading convoy is destroyed, a new convoy will be ready to continue the assault immediately.`,
  // HINT: Pick up an engineer for a partial repair: fuel, ammo and so on.
  `You can repair your helicopter in the field if you have men on board.`,
  `Land to conserve fuel.`,
  `When you destroy the enemy, he comes back to the field fully armed and ready for battle. If the enemy is going back for supplies, it may be advantageous to let him spend the time to return to his base and refuel rather than destroy him.`,
  `Balloons and bunkers can provide a strategic advantage. Use infantry to retake bunkers and launch balloons.`,
  `This is a strategy game. It isn't easily won with quick reactions and superb dexterity. The key to winning is to use tactics to achieve strategic goals.`,
  `The enemy helicopter can be destroyed with missiles and bombs.`,
  `Set goals like destroying an enemy anti-aircraft gun or capturing an enemy bunker.`,
  `Determine exactly what is destroying your forces.`,
  `Look for blind spots in automated defenses.`,
  `Try attacking things from another angle.`,
  `If you're having problems landing on the pad, simply keep the mouse above the landing pad. When the helicopter is over the pad, lower the mouse.`,
  `On level one, the enemy does not use his missiles. This allows you destroy the enemy helicopter from a safe distance with your own missiles. By arming your convoys with missile trucks you can keep your convoy in relative safety from the enemy helicopter.`,
  `Destroy enemy missiles by leading them into other objects or shoot them down with machine guns &amp; missiles.`,
  `Your helicopter can be moved with great precision and varying speeds. To move slowly, don't move the mouse to the extremes of the screen; instead, lead the helicopter just slightly.`,
  `Always have at least one helicopter in reserve. As long as you destroy the enemy vans and have a helicopter in reserve you won't be able to lose instantly.`,
  `Survive! Each helicopter is worth 20 funds. A helicopter with a full load of men is worth 25 funds!`,
  `Build convoys that can survive both ground assaults and attacks from the enemy helicopter. Defend your convoy. Try different combinations of equipment in your convoys.`,
  `Distract the enemy from your convoys by convincing the enemy copter to follow you.`,
  `Use smart missiles to distract the enemy.`,
  `Use machine guns on men, tanks, and other items.`,
  `Learn to recognize items on the radar.`,
  `Capture the end bunkers to cut off enemy production.`,
  `Timing and teamwork are important in multi-player games.`,
  `Evasive action for misleading enemy guns includes: changing speeds and directions.`,
  `Can you utilize the enemy landing pad?`,
  `Use your paratroopers as missile fodder.`,
  `Use your bombs in quick succession to prevent targets from performing emergency repairs.`,
  `Missiles can be used against other missiles.`,
  `When your helicopter is destroyed, fire weapons to continue viewing the scene.`
];

function getDefeatMessage() {
  return `<div class="game-over-tip"><span class="inline-emoji">💡</span>${defeatMessages[rndInt(defeatMessages.length)]}</div><a href="${window.location.href}" data-ignore-touch="true" class="game-start large">Try again &nbsp;<span class="inline-emoji emoji-text">🚁</span></a>`;
}

export { getVictoryMessage, getDefeatMessage };
