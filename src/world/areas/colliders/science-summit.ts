import type { Collider } from '../../worldLayout'

/** Solid parts of the science-summit area (world coordinates). */
const colliders: Collider[] = [
  // Landmark footprint (placeholder until the area is built) — the area author
  // replaces this with colliders that match what's drawn.
  { kind: 'circle', cx: 0, cz: -28, r: 2.5 },
]

export default colliders
