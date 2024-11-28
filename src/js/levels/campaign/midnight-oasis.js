const midnightOasisLevel = [
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
      704, 768, 944, 1008, 1104, 1184, 1536, 2720, 2960, 3120, 3200, 3584, 3664
    ]
  },
  {
    t: 'tree',
    s: [4206, 5144]
  },
  {
    t: 'turret',
    // note: intentional duplicates, here: there are two turrets at the same coordinates here.
    r: [1888, 4224, 4704, 4704, 5248, 5632, 6496],
    gr: [
      1920, 1952, 4256, 4288, 4736, 4736, 4768, 4768, 5280, 5312, 5664, 5696,
      6528, 6560
    ]
  },
  {
    t: 'van',
    r: [1218, 2146, 4034]
  }
];

export { midnightOasisLevel };
