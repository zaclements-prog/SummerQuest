import { TOON } from '../../toon/palette'

/**
 * Motion-graphics palette: the toon World's pastels on warm paper, with the
 * same warm-dark line work, so lessons feel like the same picture-book.
 */
export const M = {
  paper: '#fff8ec',
  paperDeep: '#fbe9cf',
  sky: '#dff1fb',
  ink: TOON.outline,
  inkSoft: '#6b5a66',
  coral: TOON.flowerRed,
  gold: TOON.gold,
  mint: TOON.mint,
  leaf: TOON.leaf,
  sea: TOON.water,
  seaDeep: TOON.waterDeep,
  lilac: TOON.lilac,
  pink: TOON.flowerPink,
  sand: TOON.sand,
  wood: TOON.wood,
  white: '#ffffff',
  /** A friendly sequence for "one of each" sets (pieces, groups, bars). */
  set: [TOON.flowerRed, TOON.gold, TOON.mint, TOON.flowerBlue, TOON.lilac, TOON.flowerPink, TOON.leaf, TOON.coral],
  font: "'Fredoka', ui-rounded, system-ui, sans-serif",
} as const

/** Stage size (SVG viewBox). Scenes draw in these units. */
export const W = 960
export const H = 540
