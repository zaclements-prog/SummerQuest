/**
 * Tower Battlefront placement, shared by the area renderer and its colliders (no
 * imports, so worldLayout.ts can load the colliders without a cycle). World x, z.
 */

/** The toy castle: a crenellated curtain wall (w × d) with its gate on the east (+x) wall. */
export const CASTLE = { x: -13.2, z: 23.4, w: 6.0, d: 5.6, wallH: 1.7 }

/** Corner towers (x, z) and their roof colours are picked in the renderer. */
export const TOWER_R = 0.95
export const CORNERS: [number, number][] = [
  [CASTLE.x - CASTLE.w / 2, CASTLE.z - CASTLE.d / 2],
  [CASTLE.x + CASTLE.w / 2, CASTLE.z - CASTLE.d / 2],
  [CASTLE.x - CASTLE.w / 2, CASTLE.z + CASTLE.d / 2],
  [CASTLE.x + CASTLE.w / 2, CASTLE.z + CASTLE.d / 2],
]
/** The tall keep in the middle of the courtyard. */
export const KEEP = { x: CASTLE.x - 0.4, z: CASTLE.z + 0.3, r: 1.3 }

/** Siege toys outside the gate. */
export const CATAPULT = { x: -7.3, z: 21.7, yaw: (Math.PI * 3) / 4 }
export const CANNONBALLS = { x: -8.25, z: 20.15 }

/** Signpost and lamp beside the NPC. */
export const SIGN = { x: -8.3, z: 18.5 }
export const LAMP = { x: -11.6, z: 18.3 }
