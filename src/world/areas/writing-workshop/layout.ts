/**
 * Writing Workshop layout. Pure data shared by the area component and its
 * colliders (no imports from worldLayout.ts: the colliders file is imported by it).
 *
 * The building is centered at (15, 20), size 6, door in its +z wall at (15, 23);
 * the NPC stands on the doorstep at (15, 24.2) and the path arrives from the
 * south-west, ending at (13.8, 24.4).
 */
export const WORKSHOP = { cx: 15, cz: 20, size: 6 }

// ── Interior, in the building's local space (origin = building center, floor y = 0).
// Inner wall faces are at ±2.85; the aisle from the door (x ∈ ±0.8) stays clear.

/** Writing desks under the two back windows (w along x, d along z). */
export const DESKS = [
  { x: -1.35, z: -2.42, w: 1.35, d: 0.72 },
  { x: 1.35, z: -2.42, w: 1.35, d: 0.72 },
]
/** Stools tucked in front of the desks. */
export const STOOLS = [
  { x: -1.35, z: -1.72 },
  { x: 1.35, z: -1.72 },
]
/** Tall bookshelf on the left wall, between its two windows. */
export const SHELF = { x: -2.58, z: 0, w: 0.5, d: 1.6, h: 2.05 }
/** Cosy reading armchair in the front-left corner. */
export const ARMCHAIR = { x: -2.12, z: 1.95, w: 0.95, d: 0.95 }
/** Low paper chest by the right wall, and the wastepaper basket by desk 2. */
export const CHEST = { x: 2.42, z: 0.75, w: 0.62, d: 1.05 }
export const BASKET = { x: 2.42, z: -1.4, r: 0.24 }
/** Potted plant in the back-left corner. */
export const PLANT = { x: -2.45, z: -2.45, r: 0.28 }

// ── Outside, in world space.

/**
 * The giant pencil: its tip touches the lawn at (x, z) and its body leans `lean`
 * radians from upright toward `dir` (screen-right as the camera sees it, so its
 * whole length shows), having just written a loopy line that trails back from
 * the tip for `trail` units. Solid round its low end only.
 */
export const PENCIL = { x: 20.4, z: 21.7, dir: [0.7071, -0.7071] as [number, number], lean: 0.62, length: 4.6, trail: 2.6, r: 0.75 }
/** Story mailbox by the garden, and the ink-bottle sign by the path. */
export const MAILBOX = { x: 17.5, z: 24.8 }
export const SIGN = { x: 12.0, z: 25.8 }
/** Raised flower planters with paper-airplane spinners, in a row along the east wall (w along x, d along z). */
export const PLANTERS = [
  { x: 19.45, z: 19.8, w: 0.9, d: 1.5 },
  { x: 19.6, z: 17.75, w: 0.9, d: 1.5 },
]
/** Walk-through flower clusters on the front lawn. */
export const LAWN_FLOWERS: [number, number][] = [
  [18.7, 25.3], [16.5, 26.1], [12.9, 26.7], [19.9, 23.4],
]
