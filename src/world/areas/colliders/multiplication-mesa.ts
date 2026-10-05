import type { Collider } from '../../worldLayout'
import { ARRAY_YAW, BUTTE, LAMP, MESA, PLANTER, RED_ROCKS, SIGN } from '../multiplication-mesa/layout'

/** The planter is turned to face the camera, so it's covered by circles along its length. */
const planter = [-0.9, 0, 0.9].map((lx): Collider => ({
  kind: 'circle',
  cx: PLANTER.x + lx * Math.cos(ARRAY_YAW),
  cz: PLANTER.z - lx * Math.sin(ARRAY_YAW),
  r: 0.6,
}))

/** Solid parts of the multiplication-mesa area (world coordinates). */
const colliders: Collider[] = [
  { kind: 'circle', cx: MESA.x, cz: MESA.z, r: MESA.r },
  { kind: 'circle', cx: BUTTE.x, cz: BUTTE.z, r: BUTTE.r },
  ...planter,
  ...RED_ROCKS.map((k): Collider => ({ kind: 'circle', cx: k.x, cz: k.z, r: k.s * 0.8 })),
  { kind: 'circle', cx: SIGN.x, cz: SIGN.z, r: 0.2 },
  { kind: 'circle', cx: LAMP.x, cz: LAMP.z, r: 0.2 },
]

export default colliders
