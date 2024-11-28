const balloonFunLevel = [
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
    l: [1024, 1088, 1152, 2048, 2112, 2176],
    r: [6144, 6080, 6016, 7104, 7168, 7040]
  },
  {
    t: 'balloon',
    d: [
      ...(() => {
        /* 36 - not 99 - more balloons needed; distribute evenly across middle 3/4 of battlefield. */
        let luftBalloons = new Array(39);
        // NOTE: n = neutral
        for (let i = 0, j = luftBalloons.length; i < j; i++) {
          luftBalloons[i] = ['balloon', 'n', 3084 + parseInt((2048 * i) / j, 10)];
        }
        return luftBalloons;
      })()
    ]
  }
];

export { balloonFunLevel };
