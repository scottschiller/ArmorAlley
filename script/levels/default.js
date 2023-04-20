import { game, gameType } from '../core/Game.js';
import { rng, searchParams, tutorialMode, TYPES, winloc, worldHeight } from '../core/global.js';

// Default "world": Tutorial, level 1 or level 9 (roughly)

function addWorldObjects() {

  const { addItem } = game;

  function addObject(type, options) {
    game.addObject(type, {
      ...options,
      staticID: true
    });
  }

  // prototype, maybe shows only around Thanksgiving
  // when The Great Pumpkin is anticipated!
  /*
  addObject(TYPES.flyingAce, {
    x: -192
  });
  */

  const env = !!(window.location.href.match(/schillmania|original/i));

  const defaultLevel = 'Midnight Oasis';

  const level = searchParams.get('level');

  if ((env && !level) || tutorialMode) {
  
    let i, x;

    // player's landing pad

    addObject(TYPES.landingPad, {
      name: 'THE LANDING PAD',
      x: 300
    });

    addItem('right-arrow-sign', -48);

    addObject(TYPES.base, {
      x: 160
    });

    addObject(TYPES.base, {
      x: 8000,
      isEnemy: true
    });

    // local, and enemy base end bunkers

    addObject(TYPES.endBunker);

    addObject(TYPES.endBunker, {
      isEnemy: true
    });

    if (gameType === 'hard' || gameType === 'extreme') {

      // "level 9"

      // mid and end-level landing pad. create up-front, since vans rely on it for xGameOver.

      addObject(TYPES.landingPad, {
        name: 'THE MIDWAY',
        isMidway: true,
        x: 3944
      });

      addObject(TYPES.landingPad, {
        name: 'THE DANGER ZONE',
        x: 7800
      });

      // twin enemy turrets, mid-field - good luck. 😅
      if (gameType === 'extreme') {
        addObject(TYPES.turret, {
          x: 3800,
          isEnemy: true
        });
        addObject(TYPES.turret, {
          x: 4145,
          isEnemy: true
        });
      }

      addItem('tree', 505);

      addItem('right-arrow-sign', 550);

      x = 630;

      addObject(TYPES.bunker, {
        x,
        isEnemy: true
      });

      x += 230;

      addItem('grave-cross', x);

      x += 12;

      addItem('cactus2', x);

      x += 92;

      addObject(TYPES.turret, {
        x,
        isEnemy: true,
        DOA: false
      });

      x += 175;

      addObject(TYPES.bunker, {
        x,
        isEnemy: true
      });

      x += 100;

      addObject(TYPES.tank, {
        x,
        isEnemy: true
      });

      addItem('grave-cross', x);

      x += 40;

      addItem('cactus', x);

      x += 250;

      addObject(TYPES.tank, {
        x,
        isEnemy: true
      });

      x += 50;

      addObject(TYPES.tank, {
        x,
        isEnemy: true
      });

      x += 80;

      for (i = 0; i < 10; i++) {

        addObject(TYPES.infantry, {
          x: x + (i * 11),
          isEnemy: true
        });

      }

      addObject(TYPES.van, {
        x: x + 210,
        isEnemy: true
      });

      addItem('gravestone', x);

      x += 110;

      addObject(TYPES.superBunker, {
        x,
        isEnemy: true,
        energy: 5
      });

      x += 120;

      addObject(TYPES.turret, {
        x,
        isEnemy: true,
        DOA: false
      });

      x += 640;

      addItem('gravestone', x);

      addObject(TYPES.van, {
        x,
        isEnemy: true
      });

      for (i = 0; i < 5; i++) {

        addObject(TYPES.infantry, {
          x: (x + 50) + (i * 11),
          isEnemy: true
        });

      }

      x += 80;

      addItem('sand-dunes', x);

      addObject(TYPES.tank, {
        x: x + 75,
        isEnemy: true
      });

      for (i = 0; i < 5; i++) {

        addObject(TYPES.infantry, {
          x: (x + 75) + (i * 11),
          isEnemy: true
        });

      }

      addObject(TYPES.tank, {
        x: x + 240,
        isEnemy: true
      });

      x += 540;

      addObject(TYPES.tank, {
        x,
        isEnemy: true
      });

      addObject(TYPES.tank, {
        x: x + 240,
        isEnemy: true
      });

      for (i = 0; i < 5; i++) {

        addObject(TYPES.infantry, {
          x: (x + 240 + 75) + (i * 11),
          isEnemy: true
        });

      }

      addObject(TYPES.van, {
        x: x + 240 + 215,
        isEnemy: true
      });

      addObject(TYPES.bunker, {
        x,
        isEnemy: true
      });

      x += 135;

      addItem('gravestone', x);

      x += 25;

      addItem('cactus2', x);

      x += 260;

      addItem('sand-dune', x);

      x -= 40;

      addItem('grave-cross', x);

      x += 150;

      addItem('sand-dunes', x);

      x += 150;

      addObject(TYPES.bunker, {
        x,
        isEnemy: true
      });

      x += 115;

      // landing pad is logically added here.

      x += 88;

      // gravestone sits behind...

      x += 10;

      addItem('gravestone', x);

      x -= 10;

      // now, stack on top

      addItem('sand-dune', x);

      addItem('grave-cross', x);

      x += 54;

      addObject(TYPES.bunker, {
        x,
        isEnemy: true
      });

      x -= 6;

      addItem('checkmark-grass', x);

      x += 90;

      addItem('cactus', x);

      x += 305;

      addItem('gravestone', x);

      x += 32;

      addItem('grave-cross', x);

      x += 80;

      addItem('sand-dune', x);

      x += 115;

      addItem('grave-cross', x);

      x += 175;

      addItem('gravestone', x);

      x += 55;

      addItem('cactus2', x);

      x += 85;

      addItem('gravestone', x);

      x += 25;

      addItem('grave-cross', x);

      x += 70;

      addObject(TYPES.bunker, {
        x,
        isEnemy: true
      });

      x += 5;

      addItem('gravestone', x);

      x += 85;

      addItem('gravestone', x);

      x += 192;

      addItem('gravestone', x);

      x += 96;

      addItem('gravestone', x);

      x += 150;

      addItem('grave-cross', x);

      x += 50;

      addItem('gravestone', x);

      x += 260;

      addItem('gravestone', x);

      x += 45;

      addItem('sand-dunes', x);

      x += 215;

      addItem('cactus2', x);

      x += 60;

      addObject(TYPES.superBunker, {
        x,
        isEnemy: true,
        energy: 5
      });

      x += 125;

      addObject(TYPES.turret, {
        x,
        isEnemy: true,
        DOA: false
      });

      x += 145;

      addObject(TYPES.bunker, {
        x,
        isEnemy: true
      });

      x += 128;

      addObject(TYPES.bunker, {
        x,
        isEnemy: true
      });

      x += 20;

      addItem('grave-cross', x);

      x += 64;

      addItem('cactus2', x);

      x += 50;

      addItem('gravestone', x);

      x += 200;

      addItem('gravestone', x);

      x += 115;

      addItem('cactus', x);

      x += 42;

      addItem('grave-cross', x);

      x += 140;

      addItem('cactus2', x);

      x += 12;

      addItem('cactus2', x);

      x += 100;

      addItem('gravestone', x);

      x += 145;

      // ideally, this should be between the right post sign now.

      addItem('grave-cross', x);

    } else {

      // level 1

      // mid and end-level landing pads (affects van objects' xGameOver property, so create this ahead of vans.)

      addObject(TYPES.landingPad, {
        name: 'THE MIDWAY',
        isMidway: true,
        x: 4096 - 290
      });

      addObject(TYPES.landingPad, {
        name: 'THE DANGER ZONE',
        isKennyLoggins: true,
        x: 7800
      });

      // this turret is used in the tutorial, rebuilt by engineers - and a handy defense in the real games. ;)
      addObject(TYPES.turret, {
        x: 475,
        DOA: true
      });

      addObject(TYPES.bunker, {
        x: 1024,
        isEnemy: true
      });

      addItem('tree', 660);

      addItem('palm-tree', 860);

      addItem('barb-wire', 918);

      addItem('palm-tree', 1120);

      addItem('rock2', 1280);

      addItem('palm-tree', 1390);

      addObject(TYPES.bunker, {
        x: 1536
      });

      addItem('palm-tree', 1565);

      addItem('flower', 1850);

      addObject(TYPES.bunker, {
        x: 2048
      });

      addItem('tree', 2110);

      addItem('gravestone', 2150);

      addItem('palm-tree', 2260);

      addItem('tree', 2460);

      addObject(TYPES.bunker, {
        x: 2560
      });

      addItem('tree', 2700);

      addObject(TYPES.bunker, {
        x: 3072
      });

      addItem('palm-tree', 3400);

      addItem('palm-tree', 3490);

      addItem('checkmark-grass', 4120);

      addItem('palm-tree', 4550);

      addObject(TYPES.bunker, {
        x: 4608,
        isEnemy: true
      });

      addItem('tree', 4608);

      addItem('tree', 4820);

      addItem('palm-tree', 4850);

      addItem('grave-cross', 4970);

      addObject(TYPES.bunker, {
        x: 5120,
        isEnemy: true
      });

      addItem('tree', 5110);

      addItem('barb-wire', 5200);

      addItem('grave-cross', 5275);

      addObject(TYPES.bunker, {
        x: 5632,
        isEnemy: true
      });

      // near-end / enemy territory

      addItem('palm-tree', 3932 + 32);

      addItem('tree', 3932 + 85);

      addItem('palm-tree', 3932 + 85 + 230);

      addItem('tree', 3932 + 85 + 230 + 90);

      addObject(TYPES.bunker, {
        x: 6656,
        isEnemy: true
      });

      addItem('tree', 6736);

      addItem('tree', 6800);

      addItem('palm-tree', 6888);

      addItem('gravestone', 7038);

      addItem('tree', 7070);

      addItem('gravestone', 7160);

      addItem('palm-tree', 7310);

      addItem('tree', 7325);

      addItem('flower', 7500);

      // more mid-level stuff

      addObject(TYPES.superBunker, {
        x: 4096 - 640 - 128,
        isEnemy: true,
        energy: 5
      });

      addObject(TYPES.turret, {
        x: 4096 - 640, // width of landing pad
        isEnemy: true,
        DOA: !!tutorialMode
      });

      addObject(TYPES.turret, {
        x: 4096 + 120, // width of landing pad
        isEnemy: true,
        DOA: !!tutorialMode
      });

      // vehicles!

      if (!winloc.match(/novehicles/i) && !tutorialMode) {

        // friendly units

        addObject(TYPES.van, {
          x: 192
        });

        for (i = 0; i < 5; i++) {

          addObject(TYPES.infantry, {
            x: 600 + (i * 20)
          });

        }

        addObject(TYPES.van, {
          x: 716
        });

        addObject(TYPES.tank, {
          x: 780
        });

        addObject(TYPES.tank, {
          x: 845
        });

        // first enemy convoy

        addObject(TYPES.tank, {
          x: 1536,
          isEnemy: true
        });

        addObject(TYPES.tank, {
          x: 1536 + 70,
          isEnemy: true
        });

        addObject(TYPES.tank, {
          x: 1536 + 140,
          isEnemy: true
        });

        addObject(TYPES.van, {
          x: 1536 + 210,
          isEnemy: true
        });

        addObject(TYPES.tank, {
          x: 2048 + 256,
          isEnemy: true
        });

        addObject(TYPES.tank, {
          x: 4608 + 256,
          isEnemy: true
        });

        for (i = 0; i < 5; i++) {

          // enemy infantry, way out there
          addObject(TYPES.infantry, {
            x: 5120 + (i * 20),
            isEnemy: true
          });

        }

      }

    }

    // happy little clouds!

    addObject(TYPES.cloud, {
      x: 512
    });

    addObject(TYPES.cloud, {
      x: 4096 - 256
    });

    addObject(TYPES.cloud, {
      x: 4096 + 256
    });

    addObject(TYPES.cloud, {
      x: 4096 + 512
    });

    addObject(TYPES.cloud, {
      x: 4096 + 768
    });

    // a few rogue balloons

    addObject(TYPES.balloon, {
      x: 4096 - 256,
      y: rng(worldHeight)
    });

    addObject(TYPES.balloon, {
      x: 4096 + 256,
      y: rng(worldHeight)
    });

    addObject(TYPES.balloon, {
      x: 4096 + 512,
      y: rng(worldHeight)
    });

    addObject(TYPES.balloon, {
      x: 4096 + 768,
      y: rng(worldHeight)
    });

    // enemy base signs (flipped via `extraTransform`)

    addItem('left-arrow-sign', 7700, 'scaleX(-1)');

    addItem('left-arrow-sign', 8192 + 16, 'scaleX(-1)');

    return;

  }

  /**
   * Original game levels
   */

  // left base area...
  addItem('right-arrow-sign', -16);
  addItem('tree', 505);
  addItem('right-arrow-sign', 550);

  // right base area...
  addItem('left-arrow-sign', 7700);
  addItem('left-arrow-sign', 8192 + 16);

  // happy little clouds!

  for (var i = 0; i < 8; i++) {
    addObject(TYPES.cloud, {
      x: 2048 + (4096 * (i / 7))
    });
  }

  const n = 'neutral',
  l = 'left',
  r = 'right';

  const originalLevels = {

    'demo 1': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 4000 ],
      [ 'base', r, 4084 ],
      [ 'end-bunker', r, 4084 ],
      [ 'bunker', l, 512 ],
      [ 'turret', l, 768 ],
      [ 'bunker', l, 1024 ],
      [ 'turret', l, 1280 ],
      [ 'bunker', l, 1536 ],
      [ 'super-bunker', r, 2048 ],
      [ 'bunker', r, 2240 ],
      [ 'turret', r, 2560 ],
      [ 'bunker', r, 2816 ],
      [ 'bunker', r, 3072 ],
      [ 'turret', r, 3328 ]
    ],

    'demo 2': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'landing-pad', n, 2048 ],
      [ 'bunker', r, 994 ],
      [ 'super-bunker', r, 1024 ],
      [ 'bunker', r, 1054 ],
      [ 'turret', r, 984 ],
      [ 'turret', r, 1084 ],
      [ 'turret', l, 1536 ],
      [ 'turret', l, 1792 ],
      [ 'bunker', l, 1984 ],
      [ 'bunker', l, 1856 ],
      [ 'bunker', r, 2112 ],
      [ 'bunker', r, 2176 ],
      [ 'turret', r, 2304 ],
      [ 'turret', r, 2560 ],
      [ 'bunker', r, 3042 ],
      [ 'super-bunker', r, 3072 ],
      [ 'bunker', r, 3102 ],
      [ 'turret', r, 3032 ],
      [ 'turret', r, 3132 ]
    ],

    'demo 3': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'turret', l, 256 ],
      [ 'turret', l, 512 ],
      [ 'turret', l, 768 ],
      [ 'super-bunker', l, 1024 ],
      [ 'turret', l, 1104 ],
      [ 'turret', l, 1136 ],
      [ 'bunker', l, 1536 ],
      [ 'bunker', l, 1792 ],
      [ 'turret', l, 2048 ],
      [ 'turret', l, 2016 ],
      [ 'turret', r, 2048 ],
      [ 'turret', r, 2080 ],
      [ 'super-bunker', r, 2304 ],
      [ 'super-bunker', r, 2384 ],
      [ 'bunker', r, 2560 ],
      [ 'bunker', r, 2816 ],
      [ 'super-bunker', r, 3072 ],
      [ 'turret', r, 2992 ],
      [ 'turret', r, 2960 ],
      [ 'turret', r, 3328 ],
      [ 'turret', r, 3584 ],
      [ 'turret', r, 3840 ]
    ],

    'demo 4': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'bunker', l, 512 ],
      [ 'turret', l, 576 ],
      [ 'bunker', l, 640 ],
      [ 'turret', l, 1024 ],
      [ 'turret', l, 1040 ],
      [ 'bunker', l, 1280 ],
      [ 'turret', l, 1344 ],
      [ 'bunker', l, 1408 ],
      [ 'turret', l, 1536 ],
      [ 'turret', l, 1552 ],
      [ 'bunker', l, 1760 ],
      [ 'bunker', l, 1792 ],
      [ 'bunker', r, 2304 ],
      [ 'bunker', r, 2336 ],
      [ 'turret', r, 2544 ],
      [ 'turret', r, 2560 ],
      [ 'bunker', r, 2688 ],
      [ 'turret', r, 2752 ],
      [ 'bunker', r, 2816 ],
      [ 'turret', r, 3312 ],
      [ 'turret', r, 3328 ],
      [ 'bunker', r, 3456 ],
      [ 'turret', r, 3520 ],
      [ 'bunker', r, 3584 ]
    ],

    // Practice Battle #1
    'Cake Walk': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r , 4084 ],
      [ 'van', l, 80 ],
      [ 'infantry', l, 224 ],
      [ 'van', l, 256 ],
      [ 'tank', l, 288 ],
      [ 'tank', l, 320 ],
      [ 'tank', r, 768 ],
      [ 'tank', r, 800 ],
      [ 'tank', r, 832 ],
      [ 'van', r, 864 ],
      [ 'tank', r, 1344 ],
      [ 'tank', r, 2368 ],
      [ 'infantry', r, 2560 ],
      [ 'bunker', r, 768 ],
      [ 'bunker', l, 1024 ],
      [ 'bunker', l, 1280 ],
      [ 'bunker', l, 1536 ],
      [ 'bunker', l, 1792 ],
      [ 'bunker', r, 2304 ],
      [ 'bunker', l, 2560 ],
      [ 'bunker', l, 2816 ],
      [ 'bunker', l, 3328 ]
    ],

    // Practice Battle #2
    'One-Gun': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'tank', l, 256 ],
      [ 'tank', l, 320 ],
      [ 'infantry', l, 128 ],
      [ 'van', l, 64 ],
      [ 'missile-launcher', l, 32 ],
      [ 'bunker', l, 384 ],
      [ 'bunker', l, 512 ],
      [ 'bunker', l, 1024 ],
      [ 'bunker', l, 1280 ],
      [ 'bunker', l, 1536 ],
      [ 'bunker', l, 1792 ],
      [ 'bunker', l, 1856 ],
      [ 'turret', r, 2048 ],
      [ 'bunker', r, 2240 ],
      [ 'bunker', r, 2304 ],
      [ 'bunker', r, 2560 ],
      [ 'bunker', r, 2816 ],
      [ 'bunker', r, 3072 ],
      [ 'bunker', r, 3584 ],
      [ 'bunker', r, 3712 ],
    ],

    // Practice Battle #3
    'Sucker Punch': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'bunker', l, 512 ],
      [ 'turret', l, 768 ],
      [ 'bunker', l, 1024 ],
      [ 'turret', l, 1280 ],
      [ 'bunker', l, 1536 ],
      [ 'bunker', l, 1920 ],
      [ 'bunker', r, 2176 ],
      [ 'turret', r, 2560 ],
      [ 'turret', r, 2816 ],
      [ 'bunker', r, 3072 ],
      [ 'turret', r, 3328 ],
      [ 'bunker', r, 3584 ]
    ],

    // Practice Battle #4
    'Airborne': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'bunker', l, 512 ],
      [ 'turret', l, 768 ],
      [ 'bunker', l, 960 ],
      [ 'bunker', l, 1280 ],
      [ 'turret', l, 1344 ],
      [ 'bunker', l, 1408 ],
      [ 'super-bunker', n, 2048 ],
      [ 'bunker', r, 2688 ],
      [ 'turret', r, 2752 ],
      [ 'bunker', r, 2816 ],
      [ 'bunker', r, 3136 ],
      [ 'turret', r, 3328 ],
      [ 'bunker', r, 3584 ]
    ],

    'Two-Gun': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'turret', l, 256 ],
      [ 'bunker', l, 320 ],
      [ 'bunker', l, 576 ],
      [ 'bunker', l, 640 ],
      [ 'super-bunker', r, 872 ],
      [ 'turret', r, 920 ],
      [ 'turret', r, 952 ],
      [ 'bunker', r, 1984 ],
      [ 'bunker', r, 2016 ],
      [ 'turret', r, 2048 ],
      [' turret', r, 2064 ],
      [ 'bunker', r, 2112 ],
      [ 'bunker', r, 3072 ],
      [ 'bunker', r, 3104 ],
      [ 'super-bunker', r, 3176 ],
      [ 'turret', r, 3224 ],
      [ 'turret', r, 3256 ],
      [ 'bunker', r, 3520 ],
      [ 'tank', r, 2368 ],
      [ 'infantry', r, 2408 ],
      [ 'tank', r, 2488 ],
      [ 'infantry', r, 2528 ],
      [ 'tank', r, 2568 ],
      [ 'tank', r, 2608 ],
      [ 'tank', r, 3392 ],
      [ 'infantry', r, 3432 ],
      [ 'tank', r, 3512 ],
      [ 'infantry', r, 3552 ],
      [ 'missile-launcher', r, 3592 ],
      [ 'van', r, 3617 ],
      [ 'van', r, 3840 ],
      [ 'van', r, 3872 ]
    ],

    'Super Bunker': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'bunker', r, 512 ],
      [ 'turret', r, 824 ],
      [ 'turret', r, 840 ],
      [ 'super-bunker', r, 896 ],
      [ 'turret', r, 944 ],
      [ 'turret', r, 976 ],
      [ 'bunker', r, 1984 ],
      [ 'turret', r, 2023 ],
      [ 'super-bunker', r, 2048 ],
      [ 'turret', r, 2091 ],
      [ 'bunker', r, 2112 ],
      [ 'turret', r, 3128 ],
      [ 'turret', r, 3144 ],
      [ 'super-bunker', r, 3200 ],
      [ 'turret', r, 3248 ],
      [ 'turret', r, 3280 ],
      [ 'infantry', r, 3328 ],
      [ 'bunker', r, 3584 ],
      [ 'tank', r, 768 ],
      [ 'infantry', r, 808 ],
      [ 'tank', r, 888 ],
      [ 'infantry', r, 928 ],
      [ 'missile-launcher', r, 968 ],
      [ 'van', r, 993 ],
      [ 'tank', r, 2048 ],
      [ 'infantry', r, 2088 ],
      [ 'tank', r, 2168 ],
      [ 'infantry', r, 2208 ],
      [ 'tank', r, 2248 ],
      [ 'tank', r, 2288 ],
      // [ ??? (241), r, 2112 ],
      [ 'infantry', r, 3328 ],
      // [ ??? (241), r, 3408 ],
      [ 'missile-launcher', r, 3488 ],
      [ 'tank', r, 2560 ],
      [ 'infantry', r, 2600 ],
      [ 'infantry', r, 2680 ],
      [ 'missile-launcher', r, 2760 ],
      // [ ??? (241), r, 2785 ],
      [ 'van', r, 2865 ],
      [ 'missile-launcher', r, 1648 ],
      [ 'missile-launcher', r, 2048 ]
    ],

    'Scrapyard': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'bunker', r, 512 ],
      [ 'bunker', r, 768 ],
      [ 'super-bunker', r, 896 ],
      [ 'turret', r, 944 ],
      [ 'turret', r, 976 ],
      [ 'bunker', r, 1024 ],
      [ 'bunker', r, 1536 ],
      [ 'turret', r, 1600 ],
      [ 'turret', r, 1616 ],
      [ 'turret', r, 1632 ],
      [ 'bunker', r, 2016 ],
      [ 'bunker', r, 2080 ],
      [ 'bunker', r, 2560 ],
      [ 'turret', r, 2896 ],
      [ 'turret', r, 2912 ],
      [ 'turret', r, 2928 ],
      [ 'bunker', r, 3072 ],
      [ 'super-bunker', r, 3200 ],
      [ 'turret', r, 3248 ],
      [ 'turret', r, 3280 ],
      [ 'bunker', r, 3584 ],
      [ 'tank', r, 384 ],
      [ 'infantry', r, 424 ],
      [ 'tank', r, 504 ],
      [ 'infantry', r, 544 ],
      [ 'tank', r, 584 ],
      [ 'tank', r, 624 ],
      [ 'infantry', r, 1280 ],
      // [ ??? (241), r, 1360 ],
      [ 'missile-launcher', r, 1440 ],
      [ 'tank', r, 3072 ],
      [ 'infantry', r, 3112 ],
      [ 'tank', r, 3192 ],
      [ 'infantry', r, 3232 ],
      [ 'van', r, 3297 ],
      [ 'van', r, 504 ],
      [ 'van', r, 584 ],
      [ 'missile-launcher', r, 512 ],
      [ 'missile-launcher', r, 768],
      [ 'missile-launcher', r, 1024 ],
      [ 'missile-launcher', r, 1280 ],
      [ 'missile-launcher', r, 2048 ]
    ],

    'Blind Spot': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'super-bunker', r, 896 ],
      [ 'turret', r, 944 ],
      [ 'turret', r, 976 ],
      [ 'bunker', r, 1760 ],
      [ 'turret', r, 1792 ],
      [ 'turret', r, 1808 ],
      [ 'bunker', r, 2176 ],
      [ 'bunker', r, 2656 ],
      [ 'turret', r, 2688 ],
      [ 'turret', r, 2704 ],
      [ 'bunker', r, 2816 ],
      [ 'bunker', r, 2848 ],
      [ 'bunker', r, 3328 ],
      [ 'super-bunker', r, 3200 ],
      [ 'turret', r, 3248 ],
      [ 'turret', r, 3304 ],
      [ 'infantry', r, 3328 ],
      [ 'bunker', r, 3264 ],
      [ 'turret', r, 3584 ],
      [ 'turret', r, 3600 ],
      [ 'tank', r, 512 ],
      [ 'infantry', r, 552 ],
      [ 'infantry', r, 632 ],
      [ 'missile-launcher', r, 712 ],
      // [ ??? (241), r, 737 ],
      [ 'van', r, 817 ],
      [ 'infantry', r, 1280 ],
      // [ ??? (241), r, 1360 ],
      [ 'missile-launcher', r, 1440 ],
      [ 'tank', r, 3584 ],
      [ 'infantry', r, 3624 ],
      [ 'tank', r, 3704 ],
      [ 'infantry', r, 3744 ],
      [ 'tank', r, 3784 ],
      [ 'tank', r, 3824 ],
      [ 'tank', r, 3072 ],
      [ 'infantry', r, 3112 ],
      [ 'tank', r, 3192 ],
      [ 'infantry', r, 3232 ],
      [ 'missile-launcher', r, 3272 ],
      [ 'van', r, 3297 ],
      [ 'missile-launcher', r, 512 ]
    ],

    'Wasteland': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', n, 2048 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'bunker', r, 320 ],
      [ 'turret', 4, 480 ],
      [ 'turret', 4, 496 ],
      [ 'bunker', r, 576 ],
      [ 'super-bunker', r, 896 ],
      [ 'turret', r, 944 ],
      [ 'turret', r, 976 ],
      [ 'bunker', r, 1600 ],
      [ 'bunker', r, 1984 ],
      [ 'bunker', r, 2112 ],
      [ 'bunker', r, 2624 ],
      [ 'bunker', r, 3008 ],
      [ 'super-bunker', r, 3200 ],
      [ 'turret', r, 3248 ],
      [ 'turret', r, 3280 ],
      [ 'bunker', r, 3328 ],
      [ 'bunker', r, 3392 ],
      [ 'turret', r, 3648 ],
      [ 'tank', r, 640 ],
      [ 'infantry', r, 680 ],
      [ 'tank', r, 760 ],
      [ 'infantry', r, 800 ],
      [ 'missile-launcher', r, 840 ],
      [ 'van', r, 865 ],
      [ 'infantry', r, 1280 ],
      // [ ??? (241), r, 1360 ],
      [ 'missile-launcher', r, 1440 ],
      [ 'tank', r, 1360 ],
      [ 'infantry', r, 1400 ],
      [ 'tank', r, 1480 ],
      [ 'infantry', r, 1520 ],
      [ 'tank', r, 1560 ],
      [ 'tank', r, 1600 ],
      [ 'tank', r, 1792 ],
      [ 'infantry', r, 1832 ],
      [ 'tank', r, 1912 ],
      [ 'infantry', r, 1952 ],
      [ 'missile-launcher', r, 1992 ],
      [ 'van', r, 2017 ],
      [ 'tank', r, 768 ],
      [ 'infantry', r, 808 ],
      [ 'infantry', r, 888 ],
      [ 'missile-launcher', r, 968 ],
      // [ ??? (241), r, 993 ],
      [ 'van', r, 1073 ]

    ],

    'Midnight Oasis': [
      // this seems like a bug.
      // [ 'infantry', r, 21 ],
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', n, 2048 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'super-bunker', r, 896 ],
      [ 'turret', r, 944 ],
      [ 'turret', r, 960 ],
      [ 'turret', r, 976 ],
      [ 'bunker', r, 1344 ],
      [ 'bunker', r, 1664 ],
      [ 'bunker', r, 2000 ],
      [ 'turret', r, 2112 ],
      [ 'turret', r, 2128 ],
      [ 'turret', r, 2144 ],
      [ 'super-bunker', r, 2304 ],
      [ 'super-bunker', r, 2456 ],
      [ 'turret', r, 2352 ],
      [ 'turret', r, 2368 ],
      [ 'turret', r, 2384 ],
      [ 'bunker', r, 2560 ],
      [ 'turret', r, 2624 ],
      [ 'turret', r, 2640 ],
      [ 'turret', r, 2656 ],
      [ 'bunker', r, 2752 ],
      [ 'turret', r, 2816 ],
      [ 'turret', r, 2832 ],
      [ 'turret', r, 2848 ],
      [ 'super-bunker', r, 3200 ],
      [ 'turret', 3248 ],
      [ 'turret', 3264 ],
      [ 'turret', 3280 ],
      [ 'tank', r, 384 ],
      [ 'infantry', r, 424 ],
      [ 'tank', r, 504 ],
      [ 'infantry', r, 544 ],
      [ 'missile-launcher', r, 584 ],
      [ 'van', r, 609 ],
      [ 'tank', r, 352 ],
      [ 'infantry', r, 392 ],
      [ 'tank', r, 472 ],
      [ 'infantry', r, 512 ],
      [ 'tank', r, 552 ],
      [ 'tank', r, 592 ],
      [ 'tank', r, 768 ],
      [ 'infantry', r, 808 ],
      [ 'infantry', r, 888 ],
      [ 'missile-launcher', r, 968 ],
      // [ ??? (241), 4, 993 ]
      [ 'van', r, 1073 ],
      [ 'infantry', r, 1280 ],
      // [ ??? (241), r, 1360 ],
      [ 'tank', r, 1360 ],
      [ 'infantry', r, 1400 ],
      [ 'tank', r, 1480 ],
      [ 'infantry', r, 1520 ],
      [ 'tank', r, 1560 ],
      [ 'tank', r, 1600 ],
      [ 'tank', r, 1792 ],
      [ 'tank', r, 1832 ],
      [ 'infantry', r, 1952 ],
      [ 'missile-launcher', r, 1992 ],
      [ 'van', r, 2017 ],
      [ 'infantry', r, 2048 ],
      // [ '??? (241)', r, 2128 ],
      [ 'missile-launcher', r, 2208 ]
    ],

    'Balloon Fun': [
      [ 'end-bunker', n, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      ...(() => {
        /* 36 - not 99 - more balloons needed; distribute evenly across middle 3/4 of battlefield. */
        let luftBalloons = new Array(39);
        for (let i = 0, j = luftBalloons.length; i < j; i++) {
          luftBalloons[i] = ([ 'balloon', n, 1024 + parseInt(2048 * i / j) ]);
        }
        return luftBalloons;
      })(),
      [ 'super-bunker', l, 1984 ],
      [ 'turret', l, 512 ],
      [ 'turret', l, 544 ],
      [ 'turret', l, 576 ],
      [ 'turret', l, 1024 ],
      [ 'turret', l, 1056 ],
      [ 'turret', l, 1088 ],
      [ 'turret', r, 3072 ],
      [ 'turret', r, 3040 ],
      [ 'turret', r, 3008 ],
      [ 'turret', r, 3584 ],
      [ 'turret', r, 3552 ],
      [ 'turret', r, 3520 ],
      [ 'super-bunker', r, 2112 ]
    ],

    'Cavern Cobra': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'bunker', l, 512 ],
      [ 'turret', l, 576 ],
      [ 'bunker', l, 640 ],
      [ 'turret', l, 1024 ],
      [ 'turret', l, 1040 ],
      [ 'bunker', l, 1280 ],
      [ 'turret', l, 1344 ],
      [ 'bunker', l, 1408 ],
      [ 'turret', l, 1536 ],
      [ 'turret', l, 1552 ],
      [ 'bunker', l, 1760 ],
      [ 'bunker', l, 1792 ],
      [ 'bunker', r, 2304 ],
      [ 'bunker', r, 2336 ],
      [ 'turret', r, 2544 ],
      [ 'turret', r, 2560 ],
      [ 'bunker', r, 2688 ],
      [ 'turret', r, 2752 ],
      [ 'bunker', r, 2816 ],
      [ 'turret', r, 3312 ],
      [ 'turret', r, 3328 ],
      [ 'bunker', r, 3456 ],
      [ 'turret', r, 3520 ],
      [ 'bunker', r, 3584 ]
    ],

    'Desert Sortie': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'bunker', l, 512 ],
      [ 'turret', l, 768 ],
      [ 'bunker', l, 1024 ],
      [ 'turret', l, 1280 ],
      [ 'bunker', l, 1536 ],
      [ 'super-bunker', r, 2048 ],
      [ 'bunker', r, 2240 ],
      [ 'turret', r, 2560 ],
      [ 'bunker', r, 2816 ],
      [ 'bunker', r, 3072 ],
      [ 'turret', r, 3328 ]
    ],

    'First Blood': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'turret', l, 256 ],
      [ 'bunker', l, 320 ],
      [ 'bunker', l, 576 ],
      [ 'bunker', l, 640 ],
      [ 'super-bunker', r, 872 ],
      [ 'turret', r, 920 ],
      [ 'turret', r, 952 ],
      [ 'bunker', r, 1984 ],
      [ 'bunker', r, 2016 ],
      [ 'turret', r, 2048 ],
      [ 'turret', r, 2064 ],
      [ 'bunker', r, 2112 ],
      [ 'bunker', r, 3072 ],
      [ 'bunker', r, 3104 ],
      [ 'super-bunker', r, 3176 ],
      [ 'turret', r, 3224 ],
      [ 'turret', r, 3256 ],
      [ 'bunker', r, 3520 ],
      [ 'tank', r, 2368 ],
      [ 'infantry', r, 2408 ],
      [ 'tank', r, 2488 ],
      [ 'infantry', r, 2528 ],
      [ 'tank', r, 2568 ],
      [ 'tank', r, 2608 ],
      [ 'tank', r, 3392 ],
      [ 'infantry', r, 3432 ],
      [ 'tank', r, 3512 ],
      [ 'infantry', r, 3552 ],
      [ 'missile-launcher', r, 3592 ],
      [ 'van', r, 3617 ],
      [ 'van', r, 3840 ],
      [ 'van', r, 3872 ]
    ],

  'Network Mania': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'bunker', r, 512 ],
      [ 'turret', r, 824 ],
      [ 'turret', r, 840 ],
      [ 'super-bunker', r, 896 ],
      [ 'turret', r, 944 ],
      [ 'turret', r, 976 ],
      [ 'bunker', r, 1984 ],
      [ 'turret', r, 2023 ],
      [ 'super-bunker', r, 2048 ],
      [ 'turret', r, 2091 ],
      [ 'bunker', r, 2112 ],
      [ 'turret', r, 3128 ],
      [ 'turret', r, 3144 ],
      [ 'super-bunker', r, 3200 ],
      [ 'turret', r, 3248 ],
      [ 'turret', r, 3280 ],
      [ 'infantry', r, 3328 ],
      [ 'bunker', r, 3584 ],
      [ 'tank', r, 768 ],
      [ 'infantry', r, 808 ],
      [ 'tank', r, 888 ],
      [ 'infantry', r, 928 ],
      [ 'missile-launcher', r, 968 ],
      [ 'van', r, 993 ],
      [ 'tank', r, 2048 ],
      [ 'infantry', r, 2088 ],
      [ 'tank', r, 2168 ],
      [ 'infantry', r, 2208 ],
      [ 'tank', r, 2248 ],
      [ 'tank', r, 2288 ],
      // [ ??? (241), r, 2112 ],
      [ 'infantry', r, 3328 ],
      // [ ??? (241), r, 3408 ],
      [ 'missile-launcher', r, 3488 ],
      [ 'tank', r, 2560 ],
      [ 'infantry', r, 2600 ],
      [ 'infantry', r, 2680 ],
      [ 'missile-launcher', r, 2760 ],
      // [ ??? (241), r, 2785 ],
      [ 'van', r, 2865 ],
      [ 'missile-launcher', r, 1648 ],
      [ 'missile-launcher', r, 2048 ]
    ],

    'Rescue Raiders': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'turret', l, 256 ],
      [ 'turret', l, 512 ],
      [ 'turret', l, 768 ],
      [ 'super-bunker', l, 1024 ],
      [ 'turret', l, 1104 ],
      [ 'turret', l, 1136 ],
      [ 'bunker', l, 1536 ],
      [ 'bunker', l, 1792 ],
      [ 'turret', l, 2016 ],
      [ 'turret', l, 2032 ],
      [ 'turret', r, 2060 ],
      [ 'turret', r, 2080 ],
      [ 'super-bunker', r, 2304 ],
      [ 'super-bunker', r, 2384 ],
      [ 'bunker', r, 2560 ],
      [ 'bunker', r, 2816 ],
      [ 'super-bunker', r, 3072 ],
      [ 'turret', r, 2992 ],
      [ 'turret', r, 2960 ],
      [ 'turret', r, 3328 ],
      [ 'turret', r, 3584 ],
      [ 'turret', r, 3840 ]
    ],

    'Midpoint': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', n, 2048 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'turret', l, 256 ],
      [ 'turret', l, 288 ],
      [ 'super-bunker', r, 1280 ],
      [ 'bunker', l, 1360 ],
      [ 'turret', r, 1536 ],
      [ 'turret', r, 1568 ],
      [ 'turret', r, 2000 ],
      [ 'turret', r, 2016 ],
      [ 'turret', l, 2080 ],
      [ 'turret', l, 2096 ],
      [ 'turret', r, 2560 ],
      [ 'turret', r, 2528 ],
      [ 'bunker', l, 2736 ],
      [ 'super-bunker', r, 2816 ],
      [ 'turret', r, 3808 ],
      [ 'turret', r, 3840 ]
    ],

    'Slithy Toves': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'bunker', l, 512 ],
      [ 'turret', l, 768 ],
      [ 'bunker', l, 1024 ],
      [ 'turret', l, 1280 ],
      [ 'bunker', l, 1536 ],
      [ 'bunker', l, 1920 ],
      [ 'bunker', r, 2176 ],
      [ 'bunker', r, 2560 ],
      [ 'turret', r, 2816 ],
      [ 'bunker', r, 3072 ],
      [ 'turret', r, 3328 ],
      [ 'bunker', r, 3584 ]
    ],

    'Tanker\'s Demise': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'super-bunker', l, 256 ],
      [ 'turret', l, 286 ],
      // two of these, per original list? bug?
      // [ 'turret', l, 275 ],
      [ 'super-bunker', l, 294 ],
      [ 'turret', l, 1024 ],
      [ 'turret', l, 1040 ],
      [ 'turret', l, 1056 ],
      [ 'super-bunker', l, 1280 ],
      [ 'turret', l, 1314 ],
      [ 'turret', l, 1266 ],
      [ 'bunker', l, 1792 ],
      [ 'bunker', l, 1856 ],
      [ 'super-bunker', l, 2000 ],
      [ 'turret', r, 2040 ],
      [ 'turret', r, 2056 ],
      [ 'turret', r, 2072 ],
      [ 'turret', l, 2050 ],
      [ 'turret', l, 2066 ],
      [ 'turret', l, 2082 ],
      [ 'super-bunker', r, 2100 ],
      [ 'bunker', r, 2272 ],
      [ 'bunker', r, 2304 ],
      [ 'turret', r, 3072 ],
      [ 'turret', r, 3088 ],
      [ 'turret', r, 3104 ],
      [ 'super-bunker', r, 2816 ],
      [ 'turret', r, 2848 ],
      [ 'turret', r, 2802 ],
      [ 'super-bunker', r, 3517 ],
      [ 'turret', r, 3548 ],
      [ 'super-bunker', r, 3557 ],
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ]
    ],

    'WindStalker': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', n, 2048 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ],
      [ 'bunker', r, 996 ],
      [ 'super-bunker', r, 1024 ],
      [ 'bunker', r, 1059],
      [ 'turret', r, 984 ],
      [ 'turret', r, 1084 ],
      [ 'turret', l, 1536 ],
      [ 'turret', l, 1792 ],
      [ 'bunker', l, 1984 ],
      [ 'bunker', l, 1916 ],
      [ 'bunker', r, 2112 ],
      [ 'bunker', r, 2176 ],
      [ 'turret', r, 2304 ],
      [ 'turret', r, 2560 ],
      [ 'bunker', r, 3045 ],
      [ 'super-bunker', r, 3072 ],
      [ 'bunker', r, 3106 ],
      [ 'turret', r, 3032 ],
      [ 'turret', r, 3132 ]
    ],

    'Sandstorm': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ]
    ],

    'Rainstorm': [
      [ 'balloon', n, 1792 ],
      [ 'balloon', n, 2048 ],
      [ 'balloon', n, 2304 ],
      [ 'end-bunker', l, 12 ],
      [ 'base', l, 96 ],
      [ 'landing-pad', l, 160 ],
      [ 'landing-pad', r, 3936 ],
      [ 'base', r, 4000 ],
      [ 'end-bunker', r, 4084 ]
    ]

  };

  function addOriginalLevel(data) {

    data.forEach((item) => {
      addObject(item[0], {
        isEnemy: item[1] === 'right',
        hostile: item[1] === 'neutral',
        x: item[2] * 2
      });
    });
    
  }

  addOriginalLevel(originalLevels[level] || originalLevels[defaultLevel]);

}

export { addWorldObjects };