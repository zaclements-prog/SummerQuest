import type { Collider } from '../../worldLayout'
import {
  ARMCHAIR, BASKET, CHEST, DESKS, MAILBOX, PENCIL, PLANT, PLANTERS, SHELF, SIGN, STOOLS, WORKSHOP,
} from '../writing-workshop/layout'

/**
 * Solid props of the Writing Workshop (world coordinates). The building's walls
 * come from buildingWalls() in worldLayout.ts; these are the furniture inside
 * (the aisle from the door stays open) and the garden pieces outside.
 */
const { cx, cz } = WORKSHOP
const box = (x: number, z: number, w: number, d: number): Collider => ({ kind: 'box', cx: cx + x, cz: cz + z, w, d })

const colliders: Collider[] = [
  // interior (local → world)
  ...DESKS.map((d) => box(d.x, d.z, d.w, d.d)),
  ...STOOLS.map((s): Collider => ({ kind: 'circle', cx: cx + s.x, cz: cz + s.z, r: 0.24 })),
  box(SHELF.x, SHELF.z, SHELF.w, SHELF.d),
  box(ARMCHAIR.x, ARMCHAIR.z, ARMCHAIR.w, ARMCHAIR.d),
  box(CHEST.x, CHEST.z, CHEST.w, CHEST.d),
  { kind: 'circle', cx: cx + BASKET.x, cz: cz + BASKET.z, r: BASKET.r },
  { kind: 'circle', cx: cx + PLANT.x, cz: cz + PLANT.z, r: PLANT.r },
  // outside (already world)
  { kind: 'circle', cx: PENCIL.x + PENCIL.dir[0] * 0.3, cz: PENCIL.z + PENCIL.dir[1] * 0.3, r: PENCIL.r },
  { kind: 'circle', cx: MAILBOX.x, cz: MAILBOX.z, r: 0.22 },
  { kind: 'circle', cx: SIGN.x, cz: SIGN.z, r: 0.16 },
  ...PLANTERS.map((p): Collider => ({ kind: 'box', cx: p.x, cz: p.z, w: p.w, d: p.d })),
]

export default colliders
