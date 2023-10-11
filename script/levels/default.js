import { gamePrefs } from '../UI/preferences.js';
import { game, gameType } from '../core/Game.js';
import { common } from '../core/common.js';
import { searchParams, TYPES } from '../core/global.js';
import { net } from '../core/network.js';
import { scanNodeTypes } from '../UI/Radar.js';

// Default "world": Tutorial, level 1 or level 9 (roughly)

let originalLevels;

let level = searchParams.get('level');
let levelName;

// The original 10 game battles, in order.
const campaignBattles = [
  'Cake Walk',
  'One-Gun',
  'Sucker Punch',
  'Airborne',
  'Two-Gun',
  'Super Bunker',
  'Scrapyard',
  'Blind Spot',
  'Wasteland',
  'Midnight Oasis'
];

function setCustomLevel(levelData) {
  originalLevels['Custom Level'] = levelData;

  setLevel('Custom Level', 'Custom Level');
}

function setLevel(levelLabel, newLevelName) {
  level = levelLabel;
  levelName = newLevelName;
}

function dependsOnGameType(levelName) {
  // if there's an inline function, there's dynamic data - assume it may reference gameType.
  return !!originalLevels[levelName]?.hasDynamicData;
}

function normalizeLevelData(data) {
  let results = [];

  // new "version 3" parsing has an array of { objects }, not an array of arrays.
  if (!data[0].length) {
    const groupMap = {
      l: 'left',
      n: 'neutral',
      r: 'right',
      s: 'static', // terrain items
      d: 'dynamic', // inline function
      o: 'obscured' // some landing pads
    };

    // special case
    const extraParams = {
      obscured: { obscured: true }
    };

    data.forEach((entry) => {
      Object.keys(entry).forEach((group) => {
        // skip over the type itself
        if (group === 't') return;

        entry[group].forEach((item) => {
          /**
           * Special case: "dynamic" level data - where a function is run that returns results.
           * e.g., groups of turrets range from one to three depending on game difficulty.
           */
          if (item instanceof Function) {
            // flag the original level, so re-renders occur on game difficulty change
            data.hasDynamicData = true;
            item = item();
            // at this point, item is a nested array.
            // hackish: replace item[n][1], typically l|r|n etc., with full string
            item.forEach((n) => {
              if (groupMap[n[1]]) {
                n[1] = groupMap[n[1]];
              }
            });
            results = results.concat(item);
            return;
          }

          if (group === 's') {
            // static items (e.g., terrain): only two args.
            results.push([entry.t, item]);
          } else if (group === 'd') {
            data.hasDynamicData = true;
            const args = item.map((groupItem) => {
              // method, l/n/r, or X offset
              if (groupItem instanceof Function) {
                const result = groupItem();
                // might be l/n/r, or some other value
                return groupMap[result] || result;
              }
              if (groupMap[groupItem]) return groupMap[groupItem];
              return groupItem;
            });
            results.push(args);
          } else {
            const kind = groupMap[group];
            const args = [entry.t, kind, item];
            // e.g., obscured landing pad
            if (extraParams[kind]) {
              args.push(extraParams[kind]);
            }
            results.push(args);
          }
        });
      });
    });

    return results;
  }

  // "V2" level data - e,g., from level editor
  data?.forEach((item) => {
    /**
     * Special case: "dynamic" level data - where a function is run that returns results.
     * e.g., groups of turrets range from one to three depending on game difficulty.
     */

    if (item instanceof Function) {
      data.hasDynamicData = true;

      // append this array to the result.
      results = results.concat(item());
    } else {
      // check all items for "dynamic" level data via functions, too.
      const parsed = item.map((element) => {
        if (element instanceof Function) {
          // flag this level, so changing game type causes a re-render
          data.hasDynamicData = true;
          return element();
        }

        return element;
      });

      results.push(parsed);
    }
  });

  return results;
}

function previewLevel(levelName, excludeVehicles) {
  // given level data, filter down and render at scale.

  if (!levelName) return;

  let data = normalizeLevelData(originalLevels[levelName]);

  if (!data) return;

  // if nothing is > 4096, then it's original game data; double all values.
  let multiplier = 2;

  data.forEach((item) => {
    if (item[item.length - 1] >= 4096) {
      multiplier = 1;
    }
  });

  game.objects.radar.reset();

  if (excludeVehicles) {
    // buildings only
    data = data.filter((item) =>
      item?.[0]?.match(
        /base|bunker|super-bunker|chain|balloon|turret|landing-pad/i
      )
    );
  } else {
    // buildings + units
    data = data.filter((item) =>
      item?.[0]?.match(
        /base|bunker|super-bunker|chain|balloon|turret|landing-pad|tank|launcher|van|infantry|engineer/i
      )
    );
  }

  const initMethods = {
    base: {
      transformSprite: true
    },
    balloon: {
      data: {
        y: 32
      }
    }
  };

  const oPreview = document.createElement('div');

  // ensure that GUIDs start from zero, so objects line up if we're playing a network game.
  common.resetGUID();

  data.forEach((item) => {
    // don't show landing pads that are intentionally hidden by terrain decor
    if (item[0] === TYPES.landingPad && item[3]?.obscured) return;

    const exports = {
      data: common.inheritData(
        {
          type: item[0],
          bottomAligned: item[0] !== 'balloon',
          isOnScreen: true,
          isEnemy: item[1] === 'right',
          ...item[0].data
        },
        {
          x: item[2] * multiplier,
          y: initMethods[item[0]]?.data?.y
        }
      )
    };

    const css = ['sprite', item[0]];

    if (item[1] === 'right') {
      css.push('enemy');
    }

    // neutral = dead turret
    if (item[0] === TYPES.turret && item[1] === 'neutral') {
      // show as grey (vs. green) on radar
      css.push('enemy');

      // and faded, etc.
      css.push('destroyed');
    }

    const radarItem = game.objects.radar.addItem(exports, css.join(' '));

    // pull vehicles behind bunkers, super-bunkers etc.
    if (item[0].match(/tank|launcher|van|infantry|engineer/i)) {
      radarItem.dom.o.style.zIndex = -1;
    }

    // if a bunker, also tweak opacity so overlapping units can be seen.
    if (item[0].match(/base|bunker/i)) {
      radarItem.dom.o.style.opacity = 0.9;
    }

    // if a bunker, also make a matching balloon.
    if (item[0] === 'bunker') {
      const balloonExports = {
        data: common.inheritData(
          {
            type: 'balloon',
            isOnScreen: true,
            isEnemy: exports.data.isEnemy
          },
          {
            x: exports.data.x,
            y: initMethods.balloon.data.y
          }
        )
      };

      game.objects.radar.addItem(
        balloonExports,
        `sprite balloon${item[1] === 'left' ? ' friendly' : ' enemy'}`
      );
    } else if (scanNodeTypes[item[0]]) {
      // special case: certain radar items also get a "scan range" node.
      radarItem.initScanNode();
    }
  });

  const levelPreview = document.getElementById('level-preview');
  levelPreview.innerHTML = '';
  levelPreview.appendChild(oPreview);
}

function addWorldObjects() {
  const { addItem } = game;

  function addObject(type, options) {
    game.addObject(type, {
      ...options,
      staticID: true
    });
  }

  const defaultLevel = 'Cake Walk';

  /**
   * Original game levels
   */

  if (levelName !== 'Custom Level' && !game.objects.editor) {
    if (levelName !== 'Tutorial') {
      // left base area...
      addItem('right-arrow-sign', -16);
      addItem('tree', 505);
      addItem('right-arrow-sign', 550);

      // right base area...
      addItem('left-arrow-sign', 7700, 'scaleX(-1)');
      addItem('left-arrow-sign', 8192 + 16, 'scaleX(-1)');
    }
  }

  function addOriginalLevel(data) {
    // if nothing is > 4096, then it's original game data; double all values.
    let multiplier = 2;

    data.forEach((item) => {
      if (item[item.length - 1] >= 4096) {
        multiplier = 1;
      }
    });

    const landingPadNames = {
      left: 'THE LANDING PAD',
      neutral: 'THE MIDWAY',
      right: 'THE DANGER ZONE'
    };

    const excludeVehicles =
      net.active && !gamePrefs.net_game_style.match(/coop/i);

    const cloudCount = data.filter((item) => item[0] === TYPES.cloud).length;

    if (!cloudCount) {
      // happy little clouds!
      // all other default levels should have a bunch.
      for (var i = 0; i < 8; i++) {
        addObject(TYPES.cloud, {
          x: 2048 + 4096 * (i / 7)
        });
      }
    }

    data.forEach((item) => {
      // hackish: terrain items (and clouds) only have two params.
      if (item.length === 2) {
        if (item[0] === TYPES.cloud) {
          addObject(item[0], {
            x: item[1] * multiplier
          });
        } else {
          addItem(item[0], item[1]);
        }
        return;
      }

      const args = {
        isEnemy: item[1] === 'right',
        hostile: item[1] === 'neutral',
        x: item[2] * multiplier
      };

      // additional arguments, e.g., `{ obscured: true }`
      if (item[3]) Object.assign(args, item[3]);

      // special cases
      if (item[0] === TYPES.landingPad) {
        args.name = landingPadNames[item[1]];
        if (item[1] === 'neutral') {
          delete args.hostile;
          args.isMidway = true;
        }
      } else if (item[0] === TYPES.turret && item[1] === 'neutral') {
        // neutral turret = dead, DOA
        delete args.hostile;
        args.DOA = true;
      }

      // if a network game, only include CPU vehicles if playing co-op - i.e., vs. a CPU.
      if (
        excludeVehicles &&
        item[0].match(/missile|tank|van|infantry|engineer/i)
      )
        return;

      addObject(item[0], args);
    });
  }

  addOriginalLevel(
    normalizeLevelData(originalLevels[level] || originalLevels[defaultLevel])
  );
}

function selectByDifficulty(optionsArray) {
  /**
   * Given optionsArray of [1, 2, 3], return the whole thing or a subset based on difficulty.
   * e.g., groups of turrets in "Midnight Oasis", in easy / hard / extreme mode.
   * This will be inconsistent if there are more than three options provided.
   */

  // note: always return an array with nested items.
  if (!gameType || gameType === 'easy') return [optionsArray[0]];
  if (gameType === 'hard')
    return optionsArray.slice(0, optionsArray.length - 1);

  return optionsArray;
}

// a few local shortcuts
const n = 'n',
  l = 'l',
  r = 'r';

originalLevels = {
  'Tutorial': [
    {
      t: 'balloon',
      l: [3840, 4352, 4608, 4864]
    },
    {
      t: 'barb-wire',
      s: [918, 5200]
    },
    {
      t: 'base',
      l: [160],
      r: [8000]
    },
    {
      t: 'bunker',
      r: [1024, 4608, 5120, 5632, 6656],
      l: [1536, 2048, 2560, 3072]
    },
    {
      t: 'checkmark-grass',
      s: [4120]
    },
    {
      t: 'cloud',
      s: [512, 3840, 4352, 4608, 4864]
    },
    {
      t: 'end-bunker',
      l: [8],
      r: [8144]
    },
    {
      t: 'flower',
      s: [1850, 7500]
    },
    {
      t: 'grave-cross',
      s: [4970, 5275]
    },
    {
      t: 'gravestone',
      s: [2150, 7038, 7160]
    },
    {
      t: 'landing-pad',
      l: [300, 3806],
      r: [7800]
    },
    {
      t: 'left-arrow-sign',
      s: [7700, 8208]
    },
    {
      t: 'palm-tree',
      s: [
        860, 1120, 1390, 1565, 2260, 3400, 3490, 4550, 4850, 3964, 4247, 6888,
        7310
      ]
    },
    {
      t: 'right-arrow-sign',
      s: [-48]
    },
    {
      t: 'rock2',
      s: [1280]
    },
    {
      t: 'super-bunker',
      r: [3328]
    },
    {
      t: 'tree',
      s: [
        660, 2110, 2460, 2700, 4608, 4820, 5110, 4017, 4337, 6736, 6800, 7070,
        7325
      ]
    },
    {
      t: 'turret',
      n: [475, 3456, 4216]
    }
  ],

  'demo 1': [
    {
      t: 'balloon',
      n: [1792, 2048, 2304]
    },
    {
      t: 'base',
      l: [96],
      r: [4084]
    },
    {
      t: 'bunker',
      l: [512, 1024, 1536],
      r: [2240, 2816, 3072]
    },
    {
      t: 'end-bunker',
      l: [12],
      r: [4084]
    },
    {
      t: 'landing-pad',
      l: [160],
      r: [4000]
    },
    {
      t: 'super-bunker',
      r: [2048]
    },
    {
      t: 'turret',
      l: [768, 1280],
      r: [2560, 3328]
    }
  ],

  'demo 2': [
    {
      t: 'balloon',
      n: [1792, 2048, 2304]
    },
    {
      t: 'base',
      l: [96],
      r: [4000]
    },
    {
      t: 'bunker',
      r: [994, 1054, 2112, 2176, 3042, 3102],
      l: [1984, 1856]
    },
    {
      t: 'end-bunker',
      l: [12],
      r: [4084]
    },
    {
      t: 'landing-pad',
      l: [160],
      r: [3936],
      n: [2048]
    },
    {
      t: 'super-bunker',
      r: [1024, 3072]
    },
    {
      t: 'turret',
      r: [984, 1084, 2304, 2560, 3032, 3132],
      l: [1536, 1792]
    }
  ],

  'demo 3': [
    {
      t: 'balloon',
      n: [1792, 2048, 2304]
    },
    {
      t: 'base',
      l: [96],
      r: [4000]
    },
    {
      t: 'bunker',
      l: [1536, 1792],
      r: [2560, 2816]
    },
    {
      t: 'end-bunker',
      l: [12],
      r: [4084]
    },
    {
      t: 'landing-pad',
      l: [160],
      r: [3936]
    },
    {
      t: 'super-bunker',
      l: [1024],
      r: [2304, 2384, 3072]
    },
    {
      t: 'turret',
      l: [256, 512, 768, 1104, 1136, 2048, 2016],
      r: [2048, 2080, 2992, 2960, 3328, 3584, 3840]
    }
  ],

  'demo 4': [
    {
      t: 'balloon',
      n: [1792, 2048, 2304]
    },
    {
      t: 'base',
      l: [96],
      r: [4000]
    },
    {
      t: 'bunker',
      l: [512, 640, 1280, 1408, 1760, 1792],
      r: [2304, 2336, 2688, 2816, 3456, 3584]
    },
    {
      t: 'end-bunker',
      l: [12],
      r: [4084]
    },
    {
      t: 'landing-pad',
      l: [160],
      r: [3936]
    },
    {
      t: 'turret',
      l: [576, 1024, 1040, 1344, 1536, 1552],
      r: [2544, 2560, 2752, 3312, 3328, 3520]
    }
  ],

  // Based on Practice Battle #1: Boot Camp, Level 1
  'Cake Walk': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'barb-wire',
      s: [5208]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      r: [1536, 4608],
      l: [2048, 2560, 3072, 3584, 5120, 5632, 6656]
    },
    {
      t: 'checkmark-grass',
      s: [1200, 4205]
    },
    {
      t: 'cloud',
      s: [
        2048, 2048, 2633, 2633, 3218, 3218, 3803, 3803, 4388, 4388, 4973, 4973,
        5558, 5558, 6144, 6144
      ]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'flower',
      s: [2361]
    },
    {
      t: 'flowers',
      s: [1426]
    },
    {
      t: 'grave-cross',
      s: [4971, 5282]
    },
    {
      t: 'gravestone',
      s: [2663, 7029, 7150]
    },
    {
      t: 'infantry',
      l: [448],
      r: [5120]
    },
    {
      t: 'landing-pad',
      l: [320],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [
        705, 1634, 1883, 2076, 2084, 2792, 3219, 3879, 3929, 4375, 4482, 4851,
        5931, 6246, 6884, 7335
      ]
    },
    {
      t: 'rock2',
      s: [1774]
    },
    {
      t: 'tank',
      l: [576, 640],
      r: [1536, 1600, 1664, 2688, 4736]
    },
    {
      t: 'tree',
      s: [
        2624, 2976, 4271, 4607, 4813, 5110, 6015, 6332, 6734, 6796, 7060, 7348
      ]
    },
    {
      t: 'van',
      l: [160, 512],
      r: [1728]
    }
  ],

  // Based On Practice Battle #2: Boot Camp, Level 2
  'One-Gun': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'barb-wire',
      s: [1129, 4824]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [768, 1024, 2048, 2560, 3072, 3584, 3712],
      r: [4480, 4608, 5120, 5632, 6144, 7168, 7424]
    },
    {
      t: 'cactus',
      s: [4454]
    },
    {
      t: 'cactus2',
      s: [6793]
    },
    {
      t: 'checkmark-grass',
      s: [2537]
    },
    {
      t: 'cloud',
      s: [
        2048, 2048, 2048, 2633, 2633, 2633, 3218, 3218, 3218, 3803, 3803, 3803,
        4388, 4388, 4388, 4973, 4973, 4973, 5558, 5558, 5558, 6144, 6144, 6144
      ]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'infantry',
      l: [256]
    },
    {
      t: 'landing-pad',
      l: [320],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      l: [64]
    },
    {
      t: 'palm-tree',
      s: [
        490, 1918, 2960, 3015, 3139, 3187, 3194, 3789, 3965, 4135, 4149, 4211,
        4328, 4387, 4872, 4918, 5106, 5190, 5231, 5264
      ]
    },
    {
      t: 'sand-dune',
      s: [2961]
    },
    {
      t: 'sand-dunes',
      s: [2924]
    },
    {
      t: 'tank',
      l: [512, 640]
    },
    {
      t: 'tree',
      s: [
        3493, 3550, 3643, 3705, 3710, 3729, 3873, 4395, 4614, 4655, 4739, 4797,
        5189, 5264, 5771, 6522, 6722
      ]
    },
    {
      t: 'turret',
      r: [4096]
    },
    {
      t: 'van',
      l: [128]
    }
  ],

  // Based On Practice Battle #3: Boot Camp, Level 3
  'Sucker Punch': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'barb-wire',
      s: [6066]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [1024, 2048, 3072, 3840],
      r: [4352, 5120, 6144, 7168]
    },
    {
      t: 'cactus',
      s: [1750, 6063, 6457]
    },
    {
      t: 'cactus2',
      s: [636, 1892, 1951, 2286, 2481, 6187, 6670]
    },
    {
      t: 'cloud',
      s: [
        2048, 2048, 2633, 2633, 3218, 3218, 3803, 3803, 4388, 4388, 4973, 4973,
        5558, 5558, 6144, 6144
      ]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grave-cross',
      s: [4043, 4088, 4354, 4395, 4487]
    },
    {
      t: 'gravestone',
      s: [3761, 3905, 4062, 4139, 4197]
    },
    {
      t: 'landing-pad',
      l: [320],
      r: [7872]
    },
    {
      t: 'sand-dune',
      s: [1413, 2243, 4236, 4423, 5002, 5476, 6487, 6596, 6985, 7054]
    },
    {
      t: 'sand-dunes',
      s: [601, 816, 1048, 3789, 4267, 4533, 4690, 4906, 5160, 5754]
    },
    {
      t: 'turret',
      l: [1536, 2560],
      r: [5632, 6678]
    }
  ],

  // Based On Practice Battle #4: Boot Camp, Level 4
  'Airborne': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'barb-wire',
      s: [4405, 5814]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [1024, 1920, 2560, 2816],
      r: [5376, 5632, 6272, 7168]
    },
    {
      t: 'checkmark-grass',
      s: [4335]
    },
    {
      t: 'cloud',
      s: [
        2048, 2048, 2633, 2633, 3218, 3218, 3803, 3803, 4388, 4388, 4973, 4973,
        5558, 5558, 6144, 6144
      ]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'flower',
      s: [1117]
    },
    {
      t: 'flower-bush',
      s: [1869, 2517]
    },
    {
      t: 'grass',
      s: [1918, 2884]
    },
    {
      t: 'grave-cross',
      s: [2672, 3480, 6195]
    },
    {
      t: 'gravestone',
      s: [5828, 7159]
    },
    {
      t: 'landing-pad',
      l: [320],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [
        744, 853, 1658, 1673, 2018, 2700, 2823, 2992, 4003, 4530, 5082, 5238,
        6307, 6496, 6590, 7420, 7432, 7604, 7625, 6967, 7046
      ]
    },
    {
      t: 'super-bunker',
      l: [4096]
    },
    {
      t: 'tree',
      s: [561, 1265, 2260, 3199, 3288, 4144, 5074, 6550, 7732]
    },
    {
      t: 'turret',
      l: [1536, 2688],
      r: [5517]
    }
  ],

  'Two-Gun': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'barb-wire',
      s: [4892]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [640, 1152, 1280],
      r: [3968, 4032, 4224, 6144, 6208, 7040]
    },
    {
      t: 'cactus',
      s: [989, 1698, 2143, 3876, 3984, 4478]
    },
    {
      t: 'cactus2',
      s: [776, 2614, 6617, 7304, 7512]
    },
    {
      t: 'checkmark-grass',
      s: [749, 1934, 4555]
    },
    {
      t: 'cloud',
      s: [2048, 2633, 3218, 3803, 4388, 4973, 5558, 6144]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'flower',
      s: [7049]
    },
    {
      t: 'flower-bush',
      s: [1314]
    },
    {
      t: 'flowers',
      s: [6162]
    },
    {
      t: 'grass',
      s: [6041]
    },
    {
      t: 'grave-cross',
      s: [1526, 5776, 6120, 6568]
    },
    {
      t: 'gravestone',
      s: [2680]
    },
    {
      t: 'infantry',
      r: [4816, 5056, 6864, 7104]
    },
    {
      t: 'landing-pad',
      l: [320],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      r: [7184]
    },
    {
      t: 'palm-tree',
      s: [751, 3799, 3827, 5295]
    },
    {
      t: 'sand-dune',
      s: [2343, 4776, 5447, 6323, 6347]
    },
    {
      t: 'sand-dunes',
      s: [1745, 4555, 6273]
    },
    {
      t: 'super-bunker',
      r: [1744, 6352]
    },
    {
      t: 'tank',
      r: [4736, 4976, 5136, 5216, 6784, 7024]
    },
    {
      t: 'tree',
      s: [1456, 4107, 4776, 5459, 6108, 7170, 7669]
    },
    {
      t: 'turret',
      l: [534],
      r: [1857, 4108, 6466]
    },
    {
      t: 'van',
      r: [7234, 7680, 7744]
    }
  ],

  'Super Bunker': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      r: [1024, 3968, 4224, 7168]
    },
    {
      t: 'cactus',
      s: [2074, 2995, 7066]
    },
    {
      t: 'checkmark-grass',
      s: [5982]
    },
    {
      t: 'cloud',
      s: [2048, 2633, 3218, 3803, 4388, 4973, 5558, 6144]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grass',
      s: [2205]
    },
    {
      t: 'gravestone',
      s: [4783]
    },
    {
      t: 'infantry',
      r: [1616, 1856, 4176, 4416, 5200, 5360, 6656, 6656]
    },
    {
      t: 'landing-pad',
      l: [320],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      r: [1936, 3296, 4096, 5520, 6976]
    },
    {
      t: 'palm-tree',
      s: [
        1760, 3862, 3892, 3961, 4356, 4531, 4551, 3453, 3398, 3327, 3405, 3073,
        4820, 4825, 4855, 4900, 4927, 5074, 5232, 5303
      ]
    },
    {
      t: 'super-bunker',
      r: [1792, 4096, 6400]
    },
    {
      t: 'tank',
      r: [1536, 1776, 4096, 4336, 4496, 4576, 5120]
    },
    {
      t: 'tree',
      s: [
        4074, 4650, 4657, 3681, 3391, 3379, 3336, 3268, 3227, 3237, 3116, 4695,
        4733, 4776, 4871, 4958, 5023, 5224, 5260, 5974, 6782
      ]
    },
    {
      t: 'turret',
      r: [1667, 1897, 4165, 6288, 6513]
    },
    {
      t: 'van',
      r: [1986, 5730]
    }
  ],

  'Scrapyard': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      r: [1024, 1536, 2048, 3072, 4032, 4160, 5120, 6144, 7168]
    },
    {
      t: 'cactus',
      s: [1945, 2457, 5793, 6415, 7023]
    },
    {
      t: 'cactus2',
      s: [1678, 2530, 6334, 6612, 6699]
    },
    {
      t: 'cloud',
      s: [
        2048, 2048, 2048, 2633, 2633, 2633, 3218, 3218, 3218, 3803, 3803, 3803,
        4388, 4388, 4388, 4973, 4973, 4973, 5558, 5558, 5558, 6144, 6144, 6144
      ]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grave-cross',
      s: [3829, 3909, 3958, 4289, 4508]
    },
    {
      t: 'gravestone',
      s: [3858, 4022, 4175, 4294, 4321]
    },
    {
      t: 'infantry',
      r: [848, 1088, 2560, 6224, 6464]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      r: [1024, 1536, 2048, 2560, 2880, 4096]
    },
    {
      t: 'sand-dune',
      s: [2087, 2810, 4747, 5297, 5582, 7504, 7518]
    },
    {
      t: 'sand-dunes',
      s: [
        1063, 1615, 1643, 1686, 2108, 2913, 3796, 3960, 5379, 5672, 6508, 7526
      ]
    },
    {
      t: 'super-bunker',
      r: [6400, 1792]
    },
    {
      t: 'tank',
      r: [768, 1008, 1168, 1248, 6144, 6384]
    },
    {
      t: 'tree',
      s: [3518]
    },
    {
      t: 'turret',
      r: [1913, 3210, 5802]
    },
    {
      t: 'van',
      r: [958, 1123, 6594]
    }
  ],

  'Blind Spot': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'barb-wire',
      s: [3697, 6518]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      r: [3520, 4352, 5312, 5632, 5696, 6528, 6656]
    },
    {
      t: 'checkmark-grass',
      s: [3788]
    },
    {
      t: 'cloud',
      s: [2048, 2633, 3218, 3803, 4388, 4973, 5558, 6144]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'flower',
      s: [3604]
    },
    {
      t: 'flower-bush',
      s: [1031, 1828, 3921]
    },
    {
      t: 'grave-cross',
      s: [1235, 6191, 6462, 6574]
    },
    {
      t: 'gravestone',
      s: [4976]
    },
    {
      t: 'infantry',
      r: [1104, 1264, 2560, 6224, 6464, 6656, 7248, 7488]
    },
    {
      t: 'landing-pad',
      l: [320],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      r: [1024, 1424, 2880, 6544]
    },
    {
      t: 'palm-tree',
      s: [
        734, 976, 2452, 3016, 3106, 3504, 4072, 4106, 4842, 5506, 5697, 6182,
        6413, 6872, 7308, 7599
      ]
    },
    {
      t: 'rock',
      s: [6933]
    },
    {
      t: 'super-bunker',
      r: [1792, 6400]
    },
    {
      t: 'tank',
      r: [1024, 6144, 6384, 7171, 7408, 7568, 7648]
    },
    {
      t: 'tree',
      s: [
        1606, 1590, 2060, 2733, 3301, 3689, 4073, 4729, 4846, 5029, 5075, 5443,
        6111
      ]
    },
    {
      t: 'turret',
      r: [1908, 3600, 5392, 6510, 6608, 7175]
    },
    {
      t: 'van',
      r: [1634, 6594]
    }
  ],

  'Wasteland': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      r: [640, 1152, 3200, 3968, 4224, 5248, 6656, 6784]
    },
    {
      t: 'cactus',
      s: [4308, 7227, 1294]
    },
    {
      t: 'cactus2',
      s: [3371, 5068, 6338, 6862, 7416, 7427, 883]
    },
    {
      t: 'checkmark-grass',
      s: [4219]
    },
    {
      t: 'cloud',
      s: [
        2048, 2048, 2633, 2633, 3218, 3218, 3803, 3803, 4388, 4388, 4973, 4973,
        5558, 5558, 6144, 6144
      ]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grave-cross',
      s: [3662, 4178, 4643, 4836, 5172, 5763, 6803, 7270, 7663, 871, 1254]
    },
    {
      t: 'gravestone',
      s: [
        2542, 1676, 3345, 4191, 4611, 5011, 5150, 5250, 5335, 5530, 5620, 5819,
        6085, 6915, 7115, 7524
      ]
    },
    {
      t: 'infantry',
      r: [1360, 1600, 1616, 1776, 2560, 2800, 3040, 3663, 3904]
    },
    {
      t: 'landing-pad',
      l: [320],
      n: [4092],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      r: [1680, 1936, 2880, 3984]
    },
    {
      t: 'sand-dune',
      s: [3629, 4178, 4715]
    },
    {
      t: 'sand-dunes',
      s: [2618, 3814, 6126]
    },
    {
      t: 'super-bunker',
      r: [1792, 6400]
    },
    {
      t: 'tank',
      r: [1280, 1520, 1536, 2720, 2960, 3120, 3200, 3584, 3824]
    },
    {
      t: 'turret',
      d: [
        [
          'turret',
          // Special case: in extreme mode, incoming enemy tanks would be shot by nearby opposing turret.
          () => (gameType === 'extreme' ? r : l),
          967
        ]
      ],
      r: [1897, 1952, 6518]
    },
    {
      t: 'van',
      r: [1730, 2146, 4034]
    }
  ],

  'Midnight Oasis': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      r: [2688, 3328, 4000, 5120, 5504]
    },
    {
      t: 'cloud',
      s: [2048, 2633, 3218, 3803, 4388, 4973, 5558, 6144]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'flower',
      s: [2984]
    },
    {
      t: 'flower-bush',
      s: [4082, 4128, 6608]
    },
    {
      t: 'flowers',
      s: [4095]
    },
    {
      t: 'grass',
      s: [4103]
    },
    {
      t: 'grave-cross',
      s: [5219]
    },
    {
      t: 'infantry',
      r: [784, 848, 1024, 1088, 1616, 1776, 2560, 2800, 3040, 3904, 4096]
    },
    {
      t: 'landing-pad',
      l: [320],
      // o = obscured: hidden from radar by shrubbery and whatnot
      o: [4096],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      r: [1168, 1936, 3984, 4416]
    },
    {
      t: 'palm-tree',
      s: [6702, 7695]
    },
    {
      t: 'rock',
      s: [996, 4182, 4161]
    },
    {
      t: 'rock2',
      s: [4153]
    },
    {
      t: 'sand-dunes',
      s: [7635]
    },
    {
      t: 'super-bunker',
      r: [1792, 4608, 6400]
    },
    {
      t: 'tank',
      r: [
        704, 768, 944, 1008, 1104, 1184, 1536, 2720, 2960, 3120, 3200, 3584,
        3664
      ]
    },
    {
      t: 'tree',
      s: [4206, 5144]
    },
    {
      t: 'turret',
      d: [
        /**
         * Tie the number of turrets to the difficulty.
         * 1 for easy, 2 for hard, 3 for extreme.
         */
        () =>
          selectByDifficulty([
            ['turret', r, 1888],
            ['turret', r, 1920],
            ['turret', r, 1952]
          ]),
        () =>
          selectByDifficulty([
            ['turret', r, 4224],
            ['turret', r, 4256],
            ['turret', r, 4288]
          ]),
        () =>
          selectByDifficulty([
            ['turret', r, 4704],
            ['turret', r, 4736],
            ['turret', r, 4768]
          ]),
        () =>
          selectByDifficulty([
            ['turret', r, 5248],
            ['turret', r, 5280],
            ['turret', r, 5312]
          ]),
        () =>
          selectByDifficulty([
            ['turret', r, 5632],
            ['turret', r, 5664],
            ['turret', r, 5696]
          ]),
        () =>
          selectByDifficulty([
            ['turret', r, 6496],
            ['turret', r, 6528],
            ['turret', r, 6560]
          ])
      ]
    },
    {
      t: 'van',
      r: [1218, 2146, 4034]
    }
  ],

  'Balloon Fun': [
    {
      t: 'balloon',
      n: [
        3084, 3136, 3189, 3241, 3294, 3346, 3399, 3451, 3504, 3556, 3609, 3661,
        3714, 3766, 3819, 3871, 3924, 3976, 4029, 4081, 4134, 4186, 4239, 4291,
        4344, 4396, 4449, 4501, 4554, 4606, 4659, 4711, 4764, 4816, 4869, 4921,
        4974, 5026, 5079
      ]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'cactus2',
      s: [6288]
    },
    {
      t: 'checkmark-grass',
      s: [5758]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grass',
      s: [1523, 4890]
    },
    {
      t: 'grave-cross',
      s: [6412, 7138]
    },
    {
      t: 'gravestone',
      s: [7134]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [
        1223, 3118, 3197, 3486, 3682, 3833, 3863, 3885, 3931, 4057, 4311, 4374,
        4472, 4489, 4510, 4520, 4853, 4917, 5216, 6797
      ]
    },
    {
      t: 'sand-dune',
      s: [3920]
    },
    {
      t: 'sand-dunes',
      s: [2621, 4615, 4918]
    },
    {
      t: 'super-bunker',
      l: [3968],
      r: [4224]
    },
    {
      t: 'tree',
      s: [
        2919, 2959, 3573, 3914, 4196, 4210, 4279, 4320, 4382, 4618, 4648, 4778,
        4816, 4934, 5054, 5110, 5116, 5151
      ]
    },
    {
      t: 'turret',
      d: [
        () =>
          selectByDifficulty([
            ['turret', l, 1088],
            ['turret', l, 1024],
            ['turret', l, 1152]
          ]),
        () =>
          selectByDifficulty([
            ['turret', l, 2112],
            ['turret', l, 2048],
            ['turret', l, 2176]
          ]),
        () =>
          selectByDifficulty([
            ['turret', r, 6080],
            ['turret', r, 6016],
            ['turret', r, 6144]
          ]),
        () =>
          selectByDifficulty([
            ['turret', r, 7104],
            ['turret', r, 7040],
            ['turret', r, 7168]
          ])
      ]
    },
    {
      t: 'balloon',
      d: [
        ...(() => {
          /* 36 - not 99 - more balloons needed; distribute evenly across middle 3/4 of battlefield. */
          let luftBalloons = new Array(39);
          for (let i = 0, j = luftBalloons.length; i < j; i++) {
            luftBalloons[i] = [
              'balloon',
              n,
              3084 + parseInt((2048 * i) / j, 10)
            ];
          }
          return luftBalloons;
        })()
      ]
    }
  ],

  'Cavern Cobra': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [1024, 1280, 2560, 2816, 3520, 3584],
      r: [4608, 4672, 5376, 5632, 6912, 7168]
    },
    {
      t: 'cactus2',
      s: [6291]
    },
    {
      t: 'checkmark-grass',
      s: [5771]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grass',
      s: [1535, 4875]
    },
    {
      t: 'grave-cross',
      s: [6415]
    },
    {
      t: 'gravestone',
      s: [7155]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [
        1238, 3121, 3192, 3507, 3708, 3833, 3868, 3889, 3950, 4061, 4305, 4369,
        4454, 4470, 4490, 4497, 4845, 4902, 5189, 6814
      ]
    },
    {
      t: 'sand-dune',
      s: [3940]
    },
    {
      t: 'sand-dunes',
      s: [2631, 4607, 4901]
    },
    {
      t: 'tree',
      s: [
        2931, 2972, 3591, 3931, 4185, 4201, 4269, 4312, 4375, 4604, 4769, 4810,
        4917, 5018, 5077, 5083, 5125
      ]
    },
    {
      t: 'turret',
      l: [1152, 2048, 2080, 2688, 3072, 3104],
      r: [5088, 5120, 5504, 6624, 6656, 7040]
    }
  ],

  'Desert Sortie': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [1024, 2048, 3072],
      r: [4480, 5632, 6144]
    },
    {
      t: 'cactus',
      s: [1716, 1778, 2092, 5991]
    },
    {
      t: 'cactus2',
      s: [1815, 6030, 6307, 6319, 6437]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grave-cross',
      s: [3758, 3783, 3815, 4263, 4347, 4389, 4403, 4445, 4461]
    },
    {
      t: 'gravestone',
      s: [3754, 4206, 4343, 4385, 4440, 7155]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'sand-dune',
      s: [709, 1604, 1867, 2070, 2750, 3198, 3927, 4364, 4838, 5920, 6872, 7322]
    },
    {
      t: 'sand-dunes',
      s: [498, 2584, 4590, 4793, 4921, 6708, 7038]
    },
    {
      t: 'super-bunker',
      r: [4096]
    },
    {
      t: 'tree',
      s: [4212]
    },
    {
      t: 'turret',
      l: [1536, 2560],
      r: [5120, 6656]
    }
  ],

  'First Blood': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'barb-wire',
      s: [5207]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [640, 1152, 1280],
      r: [3968, 4032, 4224, 6144, 6208, 7040]
    },
    {
      t: 'checkmark-grass',
      s: [1207, 4200]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'flower',
      s: [2371, 7549]
    },
    {
      t: 'flowers',
      s: [1427]
    },
    {
      t: 'grave-cross',
      s: [2685, 4971, 5282, 7034, 7149]
    },
    {
      t: 'gravestone',
      s: [2681, 7031, 7145]
    },
    {
      t: 'infantry',
      r: [4816, 5056, 6864, 7104]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      r: [7184]
    },
    {
      t: 'palm-tree',
      s: [
        719, 1633, 1868, 2088, 2099, 2795, 3219, 3872, 3919, 4377, 4497, 4855,
        5942, 6245, 6884, 7347
      ]
    },
    {
      t: 'rock',
      s: [1283]
    },
    {
      t: 'rock2',
      s: [1783]
    },
    {
      t: 'super-bunker',
      r: [1744, 6352]
    },
    {
      t: 'tank',
      r: [4736, 4976, 5136, 5216, 6784, 7024]
    },
    {
      t: 'tree',
      s: [
        498, 2636, 2983, 4270, 4614, 4816, 5108, 5141, 6022, 6340, 6738, 6800,
        7359
      ]
    },
    {
      t: 'turret',
      l: [512],
      r: [1840, 1904, 4096, 4128, 6448, 6512]
    },
    {
      t: 'van',
      r: [7234, 7680, 7744]
    }
  ],

  'Network Mania': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      r: [1024, 3968, 4224, 7168]
    },
    {
      t: 'cactus2',
      s: [6289]
    },
    {
      t: 'checkmark-grass',
      s: [5770]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grass',
      s: [1542, 4893]
    },
    {
      t: 'gravestone',
      s: [7151]
    },
    {
      t: 'infantry',
      r: [1616, 1856, 4176, 4416, 5200, 5360, 6656, 6656]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'missile-launcher',
      r: [1936, 3296, 4096, 5520, 6976]
    },
    {
      t: 'palm-tree',
      s: [
        1244, 3091, 3177, 3479, 3689, 3813, 3850, 3880, 3928, 4054, 4315, 4467,
        4483, 4502, 4515, 4865, 4922, 5225, 6822
      ]
    },
    {
      t: 'sand-dune',
      s: [3912]
    },
    {
      t: 'sand-dunes',
      s: [2588, 4607, 4922]
    },
    {
      t: 'super-bunker',
      r: [1792, 4096, 6400]
    },
    {
      t: 'tank',
      r: [1536, 1776, 4096, 4336, 4496, 4576, 5120]
    },
    {
      t: 'tree',
      s: [
        2892, 2934, 3567, 3908, 4185, 4199, 4268, 4322, 4605, 4637, 4774, 4819,
        4936, 5063, 5125, 5132, 5173
      ]
    },
    {
      t: 'turret',
      r: [6560],
      d: [
        () =>
          selectByDifficulty([
            ['turret', r, 1680],
            ['turret', r, 1648],
            ['turret', r, 1888]
          ]),
        () =>
          selectByDifficulty([
            ['turret', r, 1952],
            ['turret', r, 4067],
            ['turret', r, 4163]
          ]),
        () =>
          selectByDifficulty([
            ['turret', r, 6288],
            ['turret', r, 6256],
            ['turret', r, 6496]
          ])
      ]
    },
    {
      t: 'van',
      r: [1986, 5730]
    }
  ],

  'Rescue Raiders': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [3072, 3584],
      r: [5120, 5632]
    },
    {
      t: 'cactus',
      s: [1026, 2655, 6997, 7136]
    },
    {
      t: 'cactus2',
      s: [1932, 1946, 2719, 4971, 5288, 7569]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grave-cross',
      s: [
        506, 699, 1115, 1892, 2087, 2097, 2619, 2784, 2994, 3228, 3888, 3936,
        4248, 4294, 4294, 4314, 4413, 4527, 4623, 4829, 4864, 5120, 5918, 6014,
        6267, 6370, 6740, 6807, 6884, 7031, 7315, 7334
      ]
    },
    {
      t: 'gravestone',
      s: [
        501, 2616, 2991, 4290, 4618, 4825, 5116, 6011, 6366, 6735, 6803, 7027,
        7330
      ]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'sand-dune',
      s: [3083, 3242]
    },
    {
      t: 'sand-dunes',
      s: [3559, 4150, 5685]
    },
    {
      t: 'super-bunker',
      l: [2048],
      r: [4608, 4768, 6144]
    },
    {
      t: 'turret',
      l: [512, 1024, 1536, 2208, 2272, 4064, 4120],
      r: [4119, 4182, 5920, 5984, 6656, 7168, 7680]
    }
  ],

  'Midpoint': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [2720, 5472]
    },
    {
      t: 'cactus2',
      s: [6296]
    },
    {
      t: 'checkmark-grass',
      s: [5779]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grass',
      s: [2028, 4885]
    },
    {
      t: 'grave-cross',
      s: [6425, 7141]
    },
    {
      t: 'gravestone',
      s: [7137]
    },
    {
      t: 'landing-pad',
      n: [320, 4066],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [
        1726, 3116, 3205, 3516, 3725, 3818, 3856, 3882, 3929, 4037, 4292, 4346,
        4432, 4451, 4471, 4478, 4831, 4919, 5196, 6807
      ]
    },
    {
      t: 'sand-dune',
      s: [3918]
    },
    {
      t: 'sand-dunes',
      s: [2636, 4594, 4917]
    },
    {
      t: 'super-bunker',
      r: [2560, 5632]
    },
    {
      t: 'tree',
      s: [
        2937, 2977, 3611, 3912, 4169, 4187, 4249, 4300, 4355, 4590, 4626, 4756,
        4795, 4932, 5032, 5084, 5091, 5128
      ]
    },
    {
      t: 'turret',
      l: [512, 576, 4160, 4192],
      r: [3072, 3136, 4000, 4032, 5056, 5120, 7616, 7680]
    }
  ],

  'Slithy Toves': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [1024, 2048, 3072],
      r: [3840, 4352, 5120, 6144, 7168]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'flower',
      s: [1955, 3554]
    },
    {
      t: 'flower-bush',
      s: [3595, 6602]
    },
    {
      t: 'flowers',
      s: [3564]
    },
    {
      t: 'grass',
      s: [3551]
    },
    {
      t: 'grave-cross',
      s: [4443, 5213]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [907, 6706, 7657]
    },
    {
      t: 'rock',
      s: [973, 3644, 3664]
    },
    {
      t: 'rock2',
      s: [3636]
    },
    {
      t: 'sand-dunes',
      s: [7599]
    },
    {
      t: 'tree',
      s: [3687, 4377, 5144]
    },
    {
      t: 'turret',
      l: [1536, 2560],
      r: [5632, 6656]
    }
  ],

  "Tanker's Demise": [
    {
      t: 'balloon',
      l: [3584, 3584, 3584, 4096, 4096, 4096, 4608, 4608, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      l: [3584, 3712],
      r: [4544, 4608]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'flower',
      s: [2981, 4086]
    },
    {
      t: 'flower-bush',
      s: [4130, 6603]
    },
    {
      t: 'flowers',
      s: [4096]
    },
    {
      t: 'grass',
      s: [4079, 4106]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [914, 6706, 7734]
    },
    {
      t: 'rock',
      s: [995, 4164, 4185]
    },
    {
      t: 'rock2',
      s: [4156]
    },
    {
      t: 'sand-dunes',
      s: [7673]
    },
    {
      t: 'super-bunker',
      l: [512, 588, 2560, 4000],
      r: [4200, 5632, 7034, 7114]
    },
    {
      t: 'tree',
      s: [4205]
    },
    {
      t: 'turret',
      // NB: original level editor suggests there were two turrets @ 572 and 7096.
      l: [572, 2552, 2611],
      r: [5623, 5684, 7096],
      d: [
        () =>
          selectByDifficulty([
            ['turret', l, 2080],
            ['turret', l, 2048],
            ['turret', l, 2112]
          ]),
        () =>
          selectByDifficulty([
            ['turret', l, 4132],
            ['turret', l, 4100],
            ['turret', l, 4164]
          ]),
        () =>
          selectByDifficulty([
            ['turret', r, 4080],
            ['turret', r, 4112],
            ['turret', r, 4144]
          ]),
        () =>
          selectByDifficulty([
            ['turret', r, 6176],
            ['turret', r, 6144],
            ['turret', r, 6208]
          ])
      ]
    }
  ],

  'WindStalker': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'barb-wire',
      s: [575, 3398, 4195, 4906]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'bunker',
      r: [1992, 2118, 4224, 4352, 6090, 6212],
      l: [3688, 3968]
    },
    {
      t: 'cactus',
      s: [638, 6281, 7047]
    },
    {
      t: 'cactus2',
      s: [2783, 2865, 4583, 4866, 5354, 5683, 5924]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'flower',
      s: [2978, 6329]
    },
    {
      t: 'flower-bush',
      s: [6806, 7012]
    },
    {
      t: 'grave-cross',
      s: [824, 2103, 4242, 4297, 6888]
    },
    {
      t: 'gravestone',
      s: [820, 2098]
    },
    {
      t: 'landing-pad',
      n: [320, 4096],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [1183, 1318, 1645, 2721, 4943, 6253, 7595]
    },
    {
      t: 'rock2',
      s: [3117, 7549]
    },
    {
      t: 'sand-dune',
      s: [3786, 4765, 7562]
    },
    {
      t: 'super-bunker',
      r: [2048, 6144]
    },
    {
      t: 'tree',
      s: [1293, 2844, 4824, 5336, 6737, 7602]
    },
    {
      t: 'turret',
      r: [1986, 2189, 4608, 5120, 6085, 6291],
      l: [3072, 3584]
    }
  ],

  'Sandstorm': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'cactus',
      s: [1752, 2347, 2974, 4128, 5582, 5891, 6360, 6928, 7114]
    },
    {
      t: 'cactus2',
      s: [1262, 1424, 2057, 3722, 4338, 5805]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'grave-cross',
      s: [1533, 1890, 1904, 2654, 2720, 4826, 5140, 6594, 6717, 7164]
    },
    {
      t: 'gravestone',
      s: [1530, 2650, 6590, 6713]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'sand-dune',
      s: [
        712, 1589, 1836, 2051, 2752, 3182, 3753, 4199, 4702, 4991, 5459, 6438,
        6892
      ]
    },
    {
      t: 'sand-dunes',
      s: [491, 2578, 4439, 4656, 4943, 6269, 6604]
    }
  ],

  'Rainstorm': [
    {
      t: 'balloon',
      l: [3584, 4096, 4608]
    },
    {
      t: 'base',
      l: [192],
      r: [8000]
    },
    {
      t: 'end-bunker',
      l: [24],
      r: [8168]
    },
    {
      t: 'landing-pad',
      n: [320],
      r: [7872]
    },
    {
      t: 'palm-tree',
      s: [4735]
    },
    {
      t: 'tree',
      s: [1299, 3941, 6991, 7109]
    }
  ]
};

export {
  addWorldObjects,
  campaignBattles,
  dependsOnGameType,
  levelName,
  previewLevel,
  setCustomLevel,
  setLevel
};
