import { FIELD, tileCenter } from '../lib/grove/groveCore'
import { toWorld } from './_scene/isoFrame'

/**
 * Times Grove set layout, in the iso-facing local frame (see _scene/isoFrame:
 * +x right across the screen, +z toward the viewer). The planting field sits
 * in the middle, its seed bag at the top-left corner tile; the Roadrunner
 * keeper stands left of it, the harvest crates stack on the right.
 */
export { toLocal, toWorld, wpos, ISO_YAW } from './_scene/isoFrame'

/** Half the field's side (tile edges), local units. */
export const FIELD_HALF = (FIELD.cols / 2) * FIELD.pitch

export const HOST = { x: -4.55, z: 0.9 } as const
export const CRATES = { x: 4.75, z: -1.5 } as const
export const SEED_BAG = { x: -FIELD_HALF - 0.55, z: -FIELD_HALF - 0.45 } as const

/** Where the kid starts each order: on the seed-bag tile. */
export const SPAWN_LOCAL: [number, number] = tileCenter(0, 0)

/** Seconds standing still on a shape before it takes root. */
export const DWELL = 1.15

export const CAM_FOCUS_LOCAL: [number, number] = [0, 0.25]
export const CAM_OFFSET: [number, number, number] = (() => {
  const [x, z] = toWorld(0, 7.6)
  return [x, 9, z]
})()
export const CAM_FOV = 36
/** Narrower than this (a tablet held upright), the camera backs off so the row numbers and the keeper stay in view. */
export const GROVE_FIT_ASPECT = 1.45

/** Fruit colour per order, so every harvest looks different. */
export const FRUITS = ['#ef5b50', '#ffc93c', '#a77bec', '#ff9a3c', '#ff7aa8', '#e8504a', '#ffd23f']
