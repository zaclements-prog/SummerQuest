import { TOON } from '../../../toon/palette'

/**
 * Furniture colors: the toon palette plus a few toy-room pastels. Warm woods for
 * frames, soft candy pastels for paint, cushions and fabric.
 */
export const F = {
  wood: TOON.wood,
  woodLight: TOON.woodLight,
  woodDark: TOON.woodDark,
  honey: '#e8b77e',
  cream: '#fff3df',
  white: '#fffaf3',
  pink: '#f7a8c4',
  blush: '#fbd0dc',
  coral: '#ff9f80',
  peach: '#ffc8a6',
  butter: '#ffe08a',
  yellow: TOON.flowerYellow,
  mint: TOON.mint,
  sage: '#a9dcb8',
  teal: '#7fcfc4',
  tealLight: '#a8e2d8',
  sky: TOON.sky,
  blue: '#7fb0ee',
  lilac: TOON.lilac,
  purple: '#a98ce6',
  red: TOON.flowerRed,
  gold: TOON.gold,
  goldLight: '#ffe7a0',
  leaf: TOON.leaf,
  leafLight: TOON.leafLight,
  leafDark: TOON.leafDark,
  ink: '#3a3346',
  slate: '#5d6182',
  water: TOON.water,
  glow: TOON.glow,
  lantern: TOON.lantern,
  sand: TOON.sand,
} as const

/**
 * Outline width in drawing-buffer pixels. drei's <Outlines> (default, non
 * screen-space mode) offsets the hull in clip space, so its `thickness` is a
 * constant pixel width, not world units.
 */
export const OUTLINE_PX = 2.2
