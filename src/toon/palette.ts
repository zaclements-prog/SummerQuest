/**
 * The toon palette: soft, sunny pastels shared by the World, the Home room, the
 * creatures and their accessories. Reach for these names first so everything
 * reads as one picture-book; a few raw accent hexes per model are fine.
 */
export const TOON = {
  // ground
  grass: '#8fd27a',
  grassLight: '#a9e08f',
  grassDark: '#6fbb63',
  meadow: '#b8e59a',
  path: '#f1d9a6',
  pathEdge: '#e2c48a',
  sand: '#f6e3b4',
  sandWet: '#e9cf98',
  dirt: '#c7955f',
  dirtDark: '#a8774a',
  cliff: '#d9a66b',
  cliffDark: '#b8834f',
  rock: '#b9bcc6',
  rockLight: '#d3d6de',
  rockDark: '#9198a6',
  snow: '#f7fbff',

  // water
  water: '#6cc7ea',
  waterDeep: '#4aa6d6',
  waterShallow: '#9fe0f2',
  foam: '#f3fbff',

  // plants
  bark: '#9a6a46',
  barkDark: '#7a5236',
  leaf: '#6cc56b',
  leafLight: '#8edb7c',
  leafDark: '#4fa65a',
  pine: '#4fa37a',
  pineDark: '#3c8a66',
  blossom: '#f8b6cf',
  blossomLight: '#fcd3e2',
  autumn: '#f2a65a',

  // flowers & accents
  flowerRed: '#f2766b',
  flowerYellow: '#ffd75e',
  flowerPink: '#f7a1c4',
  flowerPurple: '#b79af0',
  flowerWhite: '#fbf7ee',
  flowerBlue: '#8ab8ff',
  gold: '#ffcf4d',
  coral: '#ff9f80',
  mint: '#9fe6c8',
  lilac: '#cdb8f5',
  sky: '#9fd3ff',

  // buildings
  wallCream: '#fbefd6',
  wallWarm: '#f3d9b1',
  wallBlue: '#d6e9f7',
  wallPink: '#f8dbe0',
  brick: '#e58b6d',
  wood: '#d9a066',
  woodDark: '#a8714a',
  woodLight: '#ecc28f',
  roofRed: '#e86f5a',
  roofBlue: '#5f9fd6',
  roofTeal: '#4fb3a6',
  roofPlum: '#9c78c9',
  roofOrange: '#f29a52',
  stone: '#e6dfcf',
  stoneDark: '#cbbfa6',
  metal: '#a8b4c4',

  // light & glow
  lantern: '#ffe08a',
  glow: '#fff1b8',
  windowGlow: '#ffe7a3',

  // characters
  skinLight: '#ffe0c7',
  skinTan: '#e9b98f',
  skinBrown: '#b9825a',
  eye: '#2b2230',
  blush: '#ff9fb0',
  white: '#ffffff',

  // line work
  outline: '#3a2c38',
} as const

export type ToonColor = (typeof TOON)[keyof typeof TOON]
