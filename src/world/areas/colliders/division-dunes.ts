import type { Collider } from '../../worldLayout'
import { BARRELS, DUNES, LAMP, MARKET, OASIS, PALMS, SAGUAROS, SIGN } from '../division-dunes/layout'

/** Market local frame (x across, z toward the camera) → world. */
const market = (lx: number, lz: number): [number, number] => {
  const c = Math.cos(MARKET.yaw)
  const s = Math.sin(MARKET.yaw)
  return [MARKET.x + lx * c + lz * s, MARKET.z - lx * s + lz * c]
}
const [tentX, tentZ] = market(0, -1.35)
const baskets = [-1.05, 0, 1.05].map((lx) => market(lx, 0.3))

/** Solid parts of the division-dunes area (world coordinates). */
const colliders: Collider[] = [
  // dunes (the inner part of each mound — you can walk up to their soft edges)
  ...DUNES.map((d): Collider => ({ kind: 'circle', cx: d.x, cz: d.z, r: Math.min(d.sx, d.sz) * 0.95 })),
  // oasis pool and palm trunks
  { kind: 'circle', cx: OASIS.x, cz: OASIS.z, r: OASIS.r - 0.15 },
  ...PALMS.map((p): Collider => ({ kind: 'circle', cx: p.x, cz: p.z, r: 0.25 })),
  // market tent and the basket rug in front of it
  { kind: 'circle', cx: tentX, cz: tentZ, r: 1.15 },
  ...baskets.map(([cx, cz]): Collider => ({ kind: 'circle', cx, cz, r: 0.45 })),
  // cacti
  ...SAGUAROS.map((c): Collider => ({ kind: 'circle', cx: c.x, cz: c.z, r: 0.3 })),
  ...BARRELS.map((b): Collider => ({ kind: 'circle', cx: b.x, cz: b.z, r: b.s })),
  // signpost and lamp beside the NPC
  { kind: 'circle', cx: SIGN.x, cz: SIGN.z, r: 0.2 },
  { kind: 'circle', cx: LAMP.x, cz: LAMP.z, r: 0.2 },
]

export default colliders
