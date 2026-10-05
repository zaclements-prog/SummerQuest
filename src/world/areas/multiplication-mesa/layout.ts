/**
 * Multiplication Mesa placement, shared by the area renderer and its colliders
 * (no imports, so worldLayout.ts can load the colliders without a cycle). World x, z.
 */

/** Terracotta ground the mesa stands on. */
export const DIRT = { x: -23.3, z: 13.0, r: 5.4 }

/** The big layered mesa (bands stacked bottom → top; r = bottom radius). */
export const MESA = { x: -24.5, z: 14.2, r: 3.2 }
/** A small two-band butte beside it. */
export const BUTTE = { x: -27.3, z: 9.8, r: 1.45 }

/**
 * Arrays share one frame turned toward the camera (yaw π/4: local +x runs across
 * the view, local +z comes toward the viewer), so rows and columns read cleanly.
 */
export const ARRAY_YAW = Math.PI / 4

/** 3 × 4 stepping-stone grid between the guide and the mesa. */
export const STEP_GRID = { x: -20.6, z: 11.6, rows: 3, cols: 4, size: 0.55, gap: 0.14 }

/** 2 × 4 cactus planter at the mesa's foot. */
export const PLANTER = { x: -20.3, z: 16.0, rows: 2, cols: 4, w: 2.7, d: 1.05 }

/** Red rocks (x, z, size). */
export const RED_ROCKS: { x: number; z: number; s: number }[] = [
  { x: -19.4, z: 14.1, s: 0.42 },
  { x: -25.6, z: 17.6, s: 0.55 },
  { x: -27.8, z: 12.4, s: 0.4 },
  { x: -24.8, z: 8.6, s: 0.36 },
]

/** Signpost and lamp beside the NPC. */
export const SIGN = { x: -17.6, z: 11.1 }
export const LAMP = { x: -18.9, z: 8.0 }
