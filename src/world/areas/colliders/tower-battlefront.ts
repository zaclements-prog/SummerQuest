import type { Collider } from '../../worldLayout'
import { CANNONBALLS, CASTLE, CATAPULT, CORNERS, LAMP, SIGN, TOWER_R } from '../tower-battlefront/layout'

/** Solid parts of the tower-battlefront area (world coordinates). */
const colliders: Collider[] = [
  // the castle (gate closed): the whole walled footprint, plus the round corner towers
  { kind: 'box', cx: CASTLE.x, cz: CASTLE.z, w: CASTLE.w + 0.5, d: CASTLE.d + 0.5 },
  ...CORNERS.map(([cx, cz]): Collider => ({ kind: 'circle', cx, cz, r: TOWER_R + 0.05 })),
  // the gatehouse and its door stick out of the east wall
  { kind: 'box', cx: CASTLE.x + CASTLE.w / 2 + 0.3, cz: CASTLE.z, w: 1.3, d: 2.2 },
  // catapult and its cannonball pile
  { kind: 'circle', cx: CATAPULT.x, cz: CATAPULT.z, r: 0.8 },
  { kind: 'circle', cx: CANNONBALLS.x, cz: CANNONBALLS.z, r: 0.45 },
  // signpost and lamp beside the NPC
  { kind: 'circle', cx: SIGN.x, cz: SIGN.z, r: 0.2 },
  { kind: 'circle', cx: LAMP.x, cz: LAMP.z, r: 0.2 },
]

export default colliders
