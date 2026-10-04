/** Pointer travel (px) between press and click beyond which the "click" was a camera drag. */
export const CLICK_SLOP_PX = 5

/**
 * R3F still fires onClick when a drag (orbiting/panning the camera) ends over an
 * object; `delta` is how far the pointer moved since it went down. Such clicks
 * must not drop or pick up furniture.
 */
export function isDragClick(e: { delta: number }): boolean {
  return e.delta > CLICK_SLOP_PX
}
