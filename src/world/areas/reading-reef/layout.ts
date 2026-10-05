/**
 * Reading Reef layout in world (x, z). Pure data shared by the area component
 * and its colliders (no imports from worldLayout.ts: the colliders file is
 * imported by it).
 *
 * Area center (25, 8) on the east coast, NPC (21, 6) where the path from the
 * plaza ends (19.8, 5.8). The beach sweeps east from the NPC to the coast
 * (radius ≈ 37–38 here) and, past the walkable edge (31.5), slopes down into
 * the sea (y = −3.2), where the coral, the jetty and the rowboat are.
 */

/** The beach's angular span at the coast (θ = atan2(z, x)). */
export const BEACH = { thetaFrom: 0.07, thetaTo: 0.5 }
/** Land-side edge of the sand, north coast → round past the NPC → south coast. */
export const SAND_EDGE: [number, number][] = [
  [33.0, 1.7], [29.4, 1.5], [26.2, 2.0], [23.4, 2.6], [21.6, 3.8], [21.15, 5.0], [21.5, 6.2],
  [21.1, 7.5], [21.3, 9.4], [22.4, 11.6], [24.3, 13.5], [26.8, 15.0], [29.6, 16.1], [31.6, 17.2],
]

/** Palm trees: `s` scale, `lean` radians, `yaw` = the direction the trunk leans toward. */
export const PALMS: { x: number; z: number; s: number; lean: number; yaw: number }[] = [
  { x: 19.4, z: 9.6, s: 1.0, lean: 0.32, yaw: 2.5 },
  { x: 26.4, z: 13.0, s: 1.15, lean: 0.38, yaw: -0.9 },
  { x: 29.6, z: 10.4, s: 0.95, lean: 0.3, yaw: 0.4 },
  { x: 28.6, z: 2.6, s: 1.1, lean: 0.36, yaw: 0.9 },
  { x: 34.8, z: 10.4, s: 1.25, lean: 0.42, yaw: 1.3 },
]

/** The book-swap beach hut; its open front faces the camera (+x +z). */
export const HUT = { x: 24.7, z: 3.4, yaw: Math.PI / 4, w: 2.0, d: 1.4 }
/** Beach umbrella pole, towel and beach ball. */
export const UMBRELLA = { x: 24.8, z: 9.3 }
export const TOWEL = { x: 25.7, z: 9.9, yaw: 0.5 }
export const BALL = { x: 23.4, z: 10.6, r: 0.28 }
/** Rock-rimmed tide pool full of candy coral. */
export const POOL = { x: 28.2, z: 6.4, r: 1.45 }
/** Lighthouse on a rocky knoll at the north end of the beach (past the walkable edge). */
export const LIGHTHOUSE = { x: 33.6, z: 2.4, r: 1.2 }
/** The jetty runs straight out to sea at this angle, from the foot of the beach. */
export const JETTY_THETA = 0.29
