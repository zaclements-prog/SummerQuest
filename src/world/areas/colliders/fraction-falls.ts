import type { Collider } from '../../worldLayout'
import { LAMP, LOGS, POOL, SIGN, STUMP, WET_ROCKS, fallsToWorld } from '../fraction-falls/layout'

const circleAt = (lx: number, lz: number, r: number): Collider => {
  const [cx, cz] = fallsToWorld(lx, lz)
  return { kind: 'circle', cx, cz, r }
}

/** Solid parts of the fraction-falls area (world coordinates). */
const colliders: Collider[] = [
  // the cliff behind the falls, and the boulders that frame it
  circleAt(0, -1.3, 2.2),
  circleAt(-2.4, -1.0, 1.8),
  circleAt(2.4, -1.0, 1.8),
  circleAt(-2.7, 1.0, 1.1),
  circleAt(2.7, 1.0, 1.1),
  // the plunge pool (you can stand on its rim); the river's own colliders start at its east edge
  { kind: 'circle', cx: POOL.x, cz: POOL.z, r: POOL.r - 0.25 },
  // wet rocks on the bank
  ...WET_ROCKS.filter((r) => r.solid).map((r): Collider => ({ kind: 'circle', cx: r.x, cz: r.z, r: r.s * 0.75 })),
  // signpost and lamp beside the NPC, the beaver's stump and log pile
  { kind: 'circle', cx: SIGN.x, cz: SIGN.z, r: 0.2 },
  { kind: 'circle', cx: LAMP.x, cz: LAMP.z, r: 0.2 },
  { kind: 'circle', cx: STUMP.x, cz: STUMP.z, r: 0.35 },
  { kind: 'circle', cx: LOGS.x, cz: LOGS.z, r: 0.7 },
]

export default colliders
