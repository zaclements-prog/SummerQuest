/**
 * Division Dunes placement, shared by the area renderer and its colliders (no
 * imports, so worldLayout.ts can load the colliders without a cycle). World x, z.
 */

/** The sand field the whole area sits on. */
export const SAND = { x: -26.4, z: 0.2, r: 6.1 }

/** Soft dunes on the sea side (sx/sz = footprint radii, h = height). */
export const DUNES: { x: number; z: number; sx: number; sz: number; h: number; rot: number }[] = [
  { x: -30.1, z: -1.9, sx: 2.9, sz: 1.75, h: 1.15, rot: 0.55 },
  { x: -29.6, z: 3.4, sx: 2.5, sz: 1.5, h: 0.95, rot: -0.5 },
  { x: -27.3, z: 6.2, sx: 1.6, sz: 1.0, h: 0.55, rot: 0.25 },
]

/** The oasis pool, ringed with grass and palms. */
export const OASIS = { x: -24.7, z: -3.7, r: 1.6 }
export const PALMS: { x: number; z: number; s: number; rot: number }[] = [
  { x: -26.5, z: -4.7, s: 1.15, rot: 2.6 },
  { x: -23.1, z: -5.2, s: 0.95, rot: 0.9 },
]

/** The fruit market: a striped tent behind a rug of 3 baskets × 4 oranges (local frame yaw π/4). */
export const MARKET = { x: -25.3, z: 2.7, yaw: Math.PI / 4 }

/** Cacti: saguaros (tall, with arms) and round barrel cacti. */
export const SAGUAROS: { x: number; z: number; h: number; rot: number }[] = [
  { x: -28.4, z: -0.4, h: 1.9, rot: 0.6 },
  { x: -22.9, z: 5.4, h: 1.4, rot: -0.4 },
  { x: -30.9, z: 1.0, h: 1.2, rot: 1.9 },
]
export const BARRELS: { x: number; z: number; s: number }[] = [
  { x: -27.6, z: -2.2, s: 0.32 },
  { x: -23.8, z: 4.6, s: 0.26 },
  { x: -28.7, z: -4.9, s: 0.28 },
  { x: -22.3, z: -2.7, s: 0.24 },
]

/** Signpost and lamp beside the NPC. */
export const SIGN = { x: -22.2, z: -1.7 }
export const LAMP = { x: -22.4, z: 1.6 }
