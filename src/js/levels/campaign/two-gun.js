const twoGunLevel = [
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
    r: [1840, 4134, 6448],
    // "ground" turrets start taking effect at level 5, in Wargames.
    // this means they probably also apply on Conflict at level 5, and Armorgeddon at 5.
    // ground turrets don't show on Boot Camp level 6, Super Bunker - they may not show on any.
    gr: [1904, 4166, 6512]
  },
  {
    t: 'van',
    r: [7234, 7680, 7744]
  }
];

export { twoGunLevel };
