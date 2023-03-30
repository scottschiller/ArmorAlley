import { game, gameType } from '../core/Game.js';
import { rng, tutorialMode, TYPES, winloc, worldHeight } from '../core/global.js';

// Default "world": Tutorial, level 1 or level 9 (roughly)

function addWorldObjects() {

  const { addItem } = game;

  function addObject(type, options) {
    game.addObject(type, {
      ...options,
      staticID: true
    });
  }

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

    // prototype, maybe shows only around Thanksgiving
    // when The Great Pumpkin is anticipated!
    /*
    addObject(TYPES.flyingAce, {
      x: -192
    });
    */

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

}

export { addWorldObjects };