import type { Collider } from '../../worldLayout'
import { LANTERN_POSTS, LOGS, RING_TREES, SIGNPOSTS, STORY_TREE, STUMP, TOADSTOOLS } from '../word-problem-woods/layout'

/**
 * Solid parts of Word Problem Woods (world coordinates), built from the same
 * layout data the area draws. Mushrooms, flowers, fireflies and the forest
 * floor are walk-through.
 */
const colliders: Collider[] = [
  { kind: 'circle', cx: STORY_TREE.x, cz: STORY_TREE.z, r: STORY_TREE.r },
  ...RING_TREES.map((t): Collider => ({ kind: 'circle', cx: t.x, cz: t.z, r: 0.22 * t.s + 0.08 })),
  { kind: 'circle', cx: STUMP.x, cz: STUMP.z, r: STUMP.r },
  ...LOGS.map((l): Collider => ({
    kind: 'box',
    cx: l.x,
    cz: l.z,
    w: l.along === 'x' ? l.len : 0.44,
    d: l.along === 'z' ? l.len : 0.44,
  })),
  ...TOADSTOOLS.map((t): Collider => ({ kind: 'circle', cx: t.x, cz: t.z, r: 0.2 * t.s + 0.05 })),
  ...SIGNPOSTS.map((s): Collider => ({ kind: 'circle', cx: s.x, cz: s.z, r: 0.15 })),
  ...LANTERN_POSTS.map((p): Collider => ({ kind: 'circle', cx: p.x, cz: p.z, r: 0.14 })),
]

export default colliders
