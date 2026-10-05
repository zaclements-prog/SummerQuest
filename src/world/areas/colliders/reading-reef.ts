import type { Collider } from '../../worldLayout'
import { BALL, HUT, LIGHTHOUSE, PALMS, POOL, UMBRELLA } from '../reading-reef/layout'

/**
 * Solid parts of Reading Reef (world coordinates), built from the same layout
 * data the area draws. Sand, shells, starfish and the towel are walk-through;
 * the jetty and the boat are down at sea level, out of reach.
 */
const hutAxis: [number, number] = [Math.cos(HUT.yaw), -Math.sin(HUT.yaw)] // the hut's local +x in world xz

const colliders: Collider[] = [
  // book-swap hut (turned 45°): two circles along its width
  ...[-0.5, 0.5].map((k): Collider => ({ kind: 'circle', cx: HUT.x + hutAxis[0] * k, cz: HUT.z + hutAxis[1] * k, r: 0.78 })),
  ...PALMS.map((p): Collider => ({ kind: 'circle', cx: p.x, cz: p.z, r: 0.18 * p.s + 0.08 })),
  { kind: 'circle', cx: UMBRELLA.x, cz: UMBRELLA.z, r: 0.12 },
  { kind: 'circle', cx: BALL.x, cz: BALL.z, r: BALL.r },
  { kind: 'circle', cx: POOL.x, cz: POOL.z, r: POOL.r + 0.15 },
  { kind: 'circle', cx: LIGHTHOUSE.x, cz: LIGHTHOUSE.z, r: LIGHTHOUSE.r },
]

export default colliders
