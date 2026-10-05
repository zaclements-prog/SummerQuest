/**
 * Word Problem Woods layout in world (x, z). Pure data, shared by the area
 * component and its colliders so what you see and what blocks you agree.
 * (No imports from worldLayout.ts: the colliders file is imported by it.)
 *
 * Area center (2, 25), NPC (1, 20.5) at the end of the path from the plaza
 * (which comes straight down x ≈ 0.3 → 0.9). The clearing opens south of the
 * NPC; the south coast is behind it.
 */

import { TOON } from '../../../toon/palette'

export type WoodsTreeKind = 'leaf' | 'autumn' | 'blossom'

/** The huge hollow storybook tree, west of the clearing; `yaw` turns its hollow toward the clearing. */
export const STORY_TREE = { x: -2.5, z: 25.4, yaw: 1.05, r: 1.75 }

/** The ring of big chunky trees that walls the clearing in. `s` = scale. */
export const RING_TREES: { x: number; z: number; s: number; kind: WoodsTreeKind }[] = [
  // far side (behind the clearing as the camera sees it): the tall ones
  { x: -5.7, z: 21.9, s: 1.9, kind: 'leaf' },
  { x: -3.7, z: 17.3, s: 1.6, kind: 'blossom' },
  { x: -6.4, z: 25.4, s: 1.8, kind: 'leaf' },
  { x: 4.7, z: 17.4, s: 1.65, kind: 'autumn' },
  { x: 7.6, z: 20.6, s: 1.8, kind: 'leaf' },
  // near side (toward the camera and the south coast): smaller, so the clearing shows
  { x: -5.2, z: 29.6, s: 1.5, kind: 'autumn' },
  { x: 8.2, z: 24.6, s: 1.3, kind: 'blossom' },
  { x: -2.4, z: 31.2, s: 1.15, kind: 'leaf' },
]

/** The riddle stump with a glowing open book, inside the mushroom fairy ring. */
export const STUMP = { x: 2.7, z: 24.5, r: 0.55 }
export const MUSHROOM_RING_R = 1.4

/** Log seats around the fairy ring (`along` = the log's axis). */
export const LOGS: { x: number; z: number; along: 'x' | 'z'; len: number }[] = [
  { x: 5.5, z: 24.0, along: 'z', len: 1.7 },
  { x: 0.4, z: 26.9, along: 'x', len: 1.8 },
]

/** Giant toadstools (`s` = scale; ~1.6 tall at s = 1). */
export const TOADSTOOLS: { x: number; z: number; s: number }[] = [
  { x: -0.2, z: 29.0, s: 1.25 },
  { x: -0.9, z: 22.6, s: 0.8 },
  { x: 5.0, z: 27.6, s: 0.95 },
]

/**
 * "?" signposts: a tall one beside the path end with three arrow boards, and a
 * short one in the clearing pointing at the hollow tree. Each board: height,
 * yaw, which end its arrow tip is on, color. Then the lantern crooks.
 */
export const SIGNPOSTS: { x: number; z: number; h: number; boards: { y: number; yaw: number; tip: 1 | -1; c: string }[] }[] = [
  {
    x: 2.9, z: 19.3, h: 1.85,
    boards: [
      { y: 1.55, yaw: 0.55, tip: 1, c: TOON.flowerYellow },
      { y: 1.15, yaw: 0.95, tip: -1, c: TOON.woodLight },
      { y: 0.78, yaw: 0.7, tip: 1, c: TOON.mint },
    ],
  },
  { x: 0.0, z: 24.0, h: 1.2, boards: [{ y: 0.98, yaw: 0.5, tip: -1, c: TOON.flowerPink }] },
]
export const LANTERN_POSTS: { x: number; z: number; side: 1 | -1 }[] = [
  { x: -0.9, z: 17.4, side: 1 },
  { x: 2.7, z: 16.6, side: -1 },
]
