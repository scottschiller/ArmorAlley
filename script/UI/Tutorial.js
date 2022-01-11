import {
  game,
  utils
} from '../aa.js';

import {
  TYPES,
  FPS
} from '../core/global.js';

import { countFriendly, countSides } from '../core/logic.js';

import { TutorialStep } from './TutorialStep.js';

const Tutorial = () => {

  let config, css, data, dom, exports;

  function addStep(options) {

    config.steps.push(TutorialStep(options));

  }

  function initDOM() {

    dom.o = document.getElementById('tutorial');
    dom.oList = document.getElementById('tutorial-list').getElementsByTagName('li');
    data.steps = dom.oList.length;
    utils.css.add(document.getElementById('world'), 'tutorial-mode');

  }

  function selectItem(i) {

    dom.lastItem = dom.oList[i];

    data.step = i;

    game.objects.view.setAnnouncement();

    game.objects.view.setAnnouncement(dom.lastItem.innerHTML, -1, true);

    // animate immediately, twice; first to activate, second to check for completion. useful if this step has already been passed, etc.
    if (data.step > 0 && config.steps[data.step]) {
      config.steps[data.step].animate();
      config.steps[data.step].animate();
    }

  }

  function nextItem() {

    selectItem(data.step + 1);

  }

  function animate() {

    // "runtime" for tutorial
    if (data.frameCount % data.animateModulus === 0 && data.step !== null && config.steps[data.step]) {

      config.steps[data.step].animate();

    }

    data.frameCount++;

  }

  function initTutorial() {

    let temp;

    initDOM();

    utils.css.add(dom.o, css.active);

    addStep({

      // introduction

      animate() {

        // the player's helicopter.
        const chopper = game.objects.helicopters[0], chopperData = chopper.data;

        // condition for completion
        return (
          chopperData.ammo < chopperData.maxAmmo
          && chopperData.bombs < chopperData.maxBombs
        );

      },

      complete() {

        nextItem();

      }

    });

    addStep({

      // helicopter refuel/repair

      animate() {

        let chopper = game.objects.helicopters[0];

        // player either landed and refueled, or died. ;)
        return chopper.data.repairComplete;

      },

      complete() {

        nextItem();

      }

    });

    addStep({

      // look, ma! bad guys!

      activate() {

        game.addObject(TYPES.tank, {
          x: 1536,
          isEnemy: true
        });

        game.addObject(TYPES.tank, {
          x: 1536 + 70,
          isEnemy: true
        });

        game.addObject(TYPES.tank, {
          x: 1536 + 140,
          isEnemy: true
        });

        game.addObject(TYPES.van, {
          x: 1536 + 210,
          isEnemy: true
        });

      },

      animate() {

        const counts = [countSides('tanks'), countSides('vans')];

        return (!counts[0].enemy && !counts[1].enemy);

      },

      complete() {

        nextItem();

      }

    });

    addStep({

      // pick up a full load of infantry

      animate() {

        return (game.objects.helicopters[0].data.parachutes >= game.objects.helicopters[0].data.maxParachutes);

      },

      complete() {

        nextItem();

      }

    });

    addStep({

      // claim a nearby enemy bunker

      activate() {

        let targetBunker, i, j;

        for (i = 0, j = game.objects.bunkers.length; i < j; i++) {

          if (!game.objects.bunkers[i].data.dead) {
            targetBunker = game.objects.bunkers[i];
            break;
          }

        }

        if (targetBunker) {

          // ensure the first bunker is an enemy one.
          targetBunker.capture(true);

          // ... and has a balloon
          targetBunker.repair();

          // keep track of original bunker states
          temp = countSides('bunkers');

        } else {

          // edge case: bunker has already been blown up, etc. bail.
          temp = countSides('bunkers');

          // next animate() call will pick this up and move to next step.
          temp.enemy++;

        }

      },

      animate() {

        let bunkers = countSides('bunkers');

        // a bunker was blown up, or claimed.
        return (bunkers.enemy < temp.enemy);

      },

      complete() {

        nextItem();

      }

    });

    addStep({

      // claim a nearby enemy Super Bunker

      activate() {

        let targetSuperBunker = game.objects.superBunkers[0];

        if (targetSuperBunker) {

          // make it an enemy unit, if not already.
          targetSuperBunker.capture(true);

          // and arm it with infantry, such that 3 infantry will claim it.
          targetSuperBunker.data.energy = 2;

          // keep track of original bunker states
          temp = countSides('superBunkers');

        } else {

          // edge case: bunker has already been blown up, etc. bail.
          temp = countSides('superBunkers');

          // next animate() call will pick this up and move to next step.
          temp.enemy++;

        }

      },

      animate() {

        let superBunkers = countSides('superBunkers');

        // a Super Bunker was claimed.
        return (superBunkers.enemy < temp.enemy);

      },

      complete() {

        nextItem();

      }

    });

    addStep({

      // order a Missile launcher, Tank, Van

      animate() {

        let item, counts, isComplete;

        // innocent until proven guilty.
        isComplete = true;

        counts = {

          missileLaunchers: countFriendly('missileLaunchers'),
          tanks: countFriendly('tanks'),
          vans: countFriendly('vans')

        };

        for (item in counts) {

          if (Object.prototype.hasOwnProperty.call(counts, item)) {

            if (!counts[item]) {

              isComplete = false;

            }

          }

        }

        return isComplete;

      },

      complete() {

        nextItem();

      }

    });

    addStep({

      // destroy the enemy chopper!

      activate() {

        // make sure enemy helicopter is present

        if (game.objects.helicopters.length < 2) {

          // two screenfuls away, OR end of battlefield - whichever is less
          game.addObject(TYPES.helicopter, {
            x: Math.min(game.objects.helicopters[0].data.x + (game.objects.view.data.browser.width * 2), game.objects.view.data.battleField.width - 64),
            y: 72,
            isEnemy: true,
            // give the player a serious advantage, here.
            fireModulus: FPS / 3,
            vX: 0
          });

        }

      },

      animate() {

        return game.objects.helicopters[1].data.dead;

      },

      complete() {

        nextItem();

      }

    });

    addStep({

      // defeat an incoming smart missile

      activate() {

        let missileX;

        // dis-arm superBunker so it doesn't kill incoming missile launchers, etc.
        game.objects.superBunkers[0].data.energy = 0;

        missileX = Math.min(game.objects.helicopters[0].data.x + (game.objects.view.data.browser.width * 2), game.objects.view.data.battleField.width - 64);

        // make ze missile launcher
        game.addObject(TYPES.missileLauncherCamel, {
          x: missileX,
          isEnemy: true
        });

        game.addObject(TYPES.missileLauncherCamel, {
          x: missileX + 64,
          isEnemy: true
        });

      },

      animate() {

        return (countSides('missileLaunchers').enemy === 0 && countSides('smartMissiles').enemy === 0);

      },

      complete() {

        nextItem();

      }

    });

    addStep({

      // rebuild the first friendly, dead turret

      animate() {

        return (
          !game.objects.turrets[0].data.isEnemy
          && !game.objects.turrets[0].data.dead
          && game.objects.turrets[0].data.energy === game.objects.turrets[0].data.energyMax
        );

      },

      complete() {

        nextItem();

      }

    });

    addStep({

      // destroy (or claim) the first enemy turret

      activate() {

        let turrets, engineer, complete;

        turrets = game.objects.turrets;
        engineer = null;
        complete = true;

        // bring the mid-level turrets[1] and [2] to life.
        turrets[1].repair(engineer, complete);
        turrets[2].repair(engineer, complete);

      },

      animate() {

        return (!game.objects.turrets[1].data.isEnemy || game.objects.turrets[1].data.dead || !game.objects.turrets[2].data.isEnemy || game.objects.turrets[2].data.dead);

      },

      complete() {

        nextItem();

      }

    });

    addStep({

      // earn 50 funds

      animate() {

        return (game.objects.endBunkers[0].data.funds >= 50);

      },

      complete() {

        nextItem();

      }

    });

    // and begin
    selectItem(0);

  }

  config = {
    steps: []
  };

  css = {
    active: 'active'
  };

  data = {
    frameCount: 0,
    animateModulus: FPS / 2,
    step: 0,
    steps: 0
  };

  dom = {
    o: null,
    oList: null,
    lastItem: null
  };

  exports = {
    animate,
    selectItem
  };

  initTutorial();

  return exports;

};

export { Tutorial };