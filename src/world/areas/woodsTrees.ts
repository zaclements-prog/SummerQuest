import type { TreeVariant } from '../voxel/props'

/**
 * Every tree drawn in Word Problem Woods (world x,z). One list feeds both the
 * renderer (areas/WordProblemWoods.tsx) and the colliders (worldLayout.ts), so a
 * tree can never be added without also becoming solid.
 */
export const WOODS_TREES: { pos: [number, number]; variant: TreeVariant; seed: number }[] = [
  // inner ring
  { pos: [-14, -10], variant: 'round', seed: 11 },
  { pos: [-10, -11], variant: 'pine', seed: 22 },
  { pos: [-15, -6], variant: 'round', seed: 33 },
  { pos: [-9, -6], variant: 'fruit', seed: 44 },
  // NW arc
  { pos: [-16, -9], variant: 'pine', seed: 51 },
  { pos: [-17, -7], variant: 'round', seed: 52 },
  { pos: [-16, -11], variant: 'round', seed: 53 },
  { pos: [-13, -12], variant: 'pine', seed: 54 },
  // NE arc
  { pos: [-8, -9], variant: 'round', seed: 61 },
  { pos: [-8, -11], variant: 'fruit', seed: 62 },
  { pos: [-11, -12], variant: 'pine', seed: 63 },
  { pos: [-7, -7], variant: 'round', seed: 64 },
  // deep background (north)
  { pos: [-12, -13], variant: 'round', seed: 71 },
  { pos: [-14, -13], variant: 'pine', seed: 72 },
  { pos: [-10, -13], variant: 'fruit', seed: 73 },
  { pos: [-15, -12], variant: 'pine', seed: 74 },
  { pos: [-9, -12], variant: 'round', seed: 75 },
  // flanking the entrance on the south side
  { pos: [-15, -5.5], variant: 'round', seed: 81 },
  { pos: [-9, -5.5], variant: 'pine', seed: 82 },
]

/** Trunk + lower canopy footprint the avatar bumps into. */
export const WOODS_TREE_RADIUS = 0.6
