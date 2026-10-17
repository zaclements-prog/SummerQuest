/** Pointer travel (px) between press and click beyond which the "click" was a camera drag. */
export const CLICK_SLOP_PX = 5
/** Fingers wobble more than a mouse: a touch tap may travel this far and still be a tap. */
export const TOUCH_SLOP_PX = 12
/** After a two-finger gesture (pinch / pan) ends, ignore taps for this long. */
const GESTURE_GRACE_MS = 350

// Multi-touch tracking for the Home canvas (see `trackGestures`).
const down = new Set<number>()
let multiUntil = 0

/**
 * Watch the canvas for multi-finger gestures, so lifting one finger of a pinch
 * (or the second of a two-finger pan) can never drop or pick up furniture.
 * Returns the cleanup.
 */
export function trackGestures(el: HTMLElement): () => void {
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    // The first finger of a new touch: nothing else can be down (forget any
    // finger whose lift we never heard about, so taps can't get stuck ignored).
    if (e.isPrimary) {
      down.clear()
      if (multiUntil === Infinity) multiUntil = 0
    }
    down.add(e.pointerId)
    if (down.size > 1) multiUntil = Infinity
  }
  const onUp = (e: PointerEvent) => {
    if (!down.delete(e.pointerId)) return
    if (down.size === 0 && multiUntil === Infinity) multiUntil = performance.now() + GESTURE_GRACE_MS
  }
  el.addEventListener('pointerdown', onDown, { capture: true })
  window.addEventListener('pointerup', onUp, { capture: true })
  window.addEventListener('pointercancel', onUp, { capture: true })
  return () => {
    el.removeEventListener('pointerdown', onDown, { capture: true })
    window.removeEventListener('pointerup', onUp, { capture: true })
    window.removeEventListener('pointercancel', onUp, { capture: true })
    down.clear()
    multiUntil = 0
  }
}

/**
 * R3F still fires onClick when a drag (orbiting/panning the camera) ends over an
 * object; `delta` is how far the pointer moved since it went down. Such clicks
 * must not drop or pick up furniture — nor may the end of a pinch.
 */
export function isDragClick(e: { delta: number; nativeEvent?: Event }): boolean {
  if (performance.now() < multiUntil) return true
  const touch = (e.nativeEvent as PointerEvent | undefined)?.pointerType === 'touch'
  return e.delta > (touch ? TOUCH_SLOP_PX : CLICK_SLOP_PX)
}
