import { Color } from 'three'

/**
 * Cozy Voxel Isle palette — a cohesive, slightly-desaturated-but-vibrant set of
 * named voxel colors. Tones come in 2–3 variants where mass benefits from
 * subtle variation (grass/rock/foliage). Tune these hexes to shift the whole
 * world's mood in one place.
 */
export const PALETTE = {
  // Ground / grass top (walkable). 3 tones scattered for a living surface.
  grass: '#8fc05a',
  grassLight: '#a6d36c',
  grassDark: '#6fa544',

  // Underside strata
  dirt: '#9a6b43',
  dirtDark: '#7c5436',
  rock: '#8a8f98',
  rockDark: '#6c727c',

  // Shore / beach
  sand: '#e4d3a0',
  sandWet: '#cdb886',
  pebble: '#b9b2a3',

  // Wood / bark
  bark: '#7a5a3c',
  barkDark: '#5e442d',
  wood: '#b98a52',
  woodDark: '#9c6f3e',

  // Foliage greens
  foliage: '#5a9a46',
  foliageLight: '#76b85c',
  foliageDark: '#427a37',
  pine: '#3f7a4e',
  pineDark: '#2f5e3c',

  // Water
  water: '#5db4e6',
  waterDeep: '#2f7fb8',
  foam: '#eaf6ff',

  // Flower accents
  flowerRed: '#e5604f',
  flowerYellow: '#f2c64b',
  flowerPink: '#ec8fb6',
  flowerPurple: '#9b7bd4',
  flowerWhite: '#f4f1e6',

  // Mushroom
  mushroomCap: '#d4503f',
  mushroomStem: '#efe6cf',

  // Cottage / house
  cottageWall: '#e6d4b0',
  cottageWallWarm: '#d8bd8e',
  roof: '#b3543f',
  roofDark: '#8f3f2e',

  // Glow
  lantern: '#ffd27a',
  windowGlow: '#ffe6a8',

  // Cloud / sky helpers
  cloud: '#fbfdff',
} as const

export type PaletteKey = keyof typeof PALETTE

/** Deterministic 32-bit hash → [0,1). Stable across runs (no Math.random). */
function hash01(seed: number): number {
  let h = (seed | 0) ^ 0x9e3779b9
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h ^= h >>> 16
  // >>> 0 to unsigned, then normalize
  return (h >>> 0) / 4294967296
}

/**
 * Slightly vary a base color, deterministically from `seed`. `amount` is the
 * peak per-channel lightness swing in (roughly) HSL space [0..1]. Returns a new
 * THREE.Color so callers can pass it straight to a material/instance.
 */
export function jitter(hexBase: string, amount = 0.06, seed = 0): Color {
  const c = new Color(hexBase)
  // Symmetric offset in [-amount, +amount], deterministic per seed.
  const lOff = (hash01(seed) - 0.5) * 2 * amount
  // A touch of hue wobble keeps masses from banding; smaller than lightness.
  const hOff = (hash01(seed * 2654435761) - 0.5) * 2 * amount * 0.4
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  hsl.h = (hsl.h + hOff + 1) % 1
  hsl.l = Math.min(0.96, Math.max(0.04, hsl.l + lOff))
  c.setHSL(hsl.h, hsl.s, hsl.l)
  return c
}

/** Convenience: a fresh THREE.Color for a named palette entry. */
export function color(key: PaletteKey): Color {
  return new Color(PALETTE[key])
}
