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
  /**
   * Letters and words a child is learning to read (K–1): Andika, designed for
   * beginning readers (one-storey a and g, a serifed I next to a tailed l).
   * Fredoka's heavy weights also draw B's middle bar as an overlapping piece
   * that renders as a gap.
   */
  letters: "'Andika', 'Fredoka', ui-rounded, system-ui, sans-serif",
} as const

/** Stage size (SVG viewBox). Scenes draw in these units. */
export const W = 960
export const H = 540

/**
 * Deeper, text-safe partners of the pastels: draw numbers and words in these
 * (with a white stroke) so a colour-coded label stays readable on paper.
 */
export const DEEP = {
  coral: '#e0564a',
  gold: '#c98a00',
  mint: '#2a9b75',
  sea: '#2a86b8',
  blue: '#3f6fd1',
  lilac: '#8559cf',
  pink: '#d4558f',
  leaf: '#3c9446',
  orange: '#e07a4a',
} as const

/** `M.set[i]`'s deep partner, so a group's number matches its colour. */
export const DEEP_SET = [DEEP.coral, DEEP.gold, DEEP.mint, DEEP.blue, DEEP.lilac, DEEP.pink, DEEP.leaf, DEEP.orange] as const
