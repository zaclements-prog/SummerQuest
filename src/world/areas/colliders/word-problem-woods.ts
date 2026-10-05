import type { Collider } from '../../worldLayout'

/** Solid parts of the word-problem-woods area (world coordinates). */
const colliders: Collider[] = [
  // Landmark footprint (placeholder until the area is built) — the area author
  // replaces this with colliders that match what's drawn.
  { kind: 'circle', cx: 2, cz: 25, r: 2.5 },
]

export default colliders
