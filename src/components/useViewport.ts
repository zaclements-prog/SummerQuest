import { useEffect, useSyncExternalStore } from 'react'
import type { RefObject } from 'react'

/**
 * Small viewport helpers for the touch / responsive layer: media queries,
 * "is this a touch screen", and the on-screen keyboard.
 *
 * All of them read the browser through `useSyncExternalStore`, so they stay in
 * step with rotation and keyboard changes without effects that set state.
 */

/**
 * A short screen — in practice a phone held sideways. Must match the shell's
 * `short:` CSS variant (`@custom-variant short (@media (max-height: 32rem))`).
 */
export const SHORT_SCREEN = '(max-height: 32rem)'
/**
 * Wide and not very tall: a phone held sideways, a wide laptop window, or any
 * touch tablet in landscape (iPad Safari, a full-screen iPad web app, iPad Pro
 * 13", Android tablets). A 16:9 picture stacked above text would push the text
 * off screen, so players put the two side by side — and on a tablet held in
 * both hands the answers land near a thumb.
 */
export const WIDE_SHORT =
  '(min-aspect-ratio: 4/3) and (max-height: 32rem), (min-aspect-ratio: 3/2) and (max-height: 760px), (pointer: coarse) and (min-aspect-ratio: 4/3) and (max-height: 1100px)'
/**
 * Room to spare in both directions: any tablet in either orientation, or a big
 * desktop window (not phones, not iPad Split View). Game screens centre their
 * content and use bigger tiles and pictures. Must match the `roomy:` CSS variant.
 */
export const ROOMY_SCREEN = '(min-width: 700px) and (min-height: 640px)'
/** The main pointer is a finger (phones, tablets) rather than a mouse or trackpad. */
export const COARSE_POINTER = '(pointer: coarse)'

function mediaStore(query: string) {
  return {
    subscribe(cb: () => void) {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    get() {
      return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches
    },
  }
}

const stores = new Map<string, ReturnType<typeof mediaStore>>()
function storeFor(query: string) {
  let s = stores.get(query)
  if (!s) {
    s = mediaStore(query)
    stores.set(query, s)
  }
  return s
}

/** True while the CSS media query matches. */
export function useMediaQuery(query: string): boolean {
  const s = storeFor(query)
  return useSyncExternalStore(s.subscribe, s.get, () => false)
}

/** True on touch-first devices — use it to word help text ("Tap" vs "Click"). */
export function useCoarsePointer(): boolean {
  return useMediaQuery(COARSE_POINTER)
}

// ── On-screen keyboard ─────────────────────────────────────────────────────────
// iOS Safari (and Chrome on Android by default) open the keyboard over the page:
// only the *visual* viewport shrinks, the layout viewport (what `fixed` and
// `100vh` use) stays the same. The covered strip at the bottom is the keyboard.

function keyboardInset(): number {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (!vv) return 0
  const covered = window.innerHeight - vv.height - vv.offsetTop
  // Ignore pinch-zoom and tiny browser-chrome wobbles.
  return covered > 80 && vv.scale <= 1.01 ? Math.round(covered) : 0
}

function subscribeViewport(cb: () => void) {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  window.addEventListener('resize', cb)
  vv?.addEventListener('resize', cb)
  vv?.addEventListener('scroll', cb)
  return () => {
    window.removeEventListener('resize', cb)
    vv?.removeEventListener('resize', cb)
    vv?.removeEventListener('scroll', cb)
  }
}

/** Pixels of the layout viewport hidden under the on-screen keyboard (0 when it's closed). */
export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribeViewport, keyboardInset, () => 0)
}

/**
 * The visible strip of the layout viewport while the keyboard is open, as
 * `{ top, bottom }` insets for a `position: fixed` box (both 0 when it's closed).
 * Fixed overlays use it to stay above the keyboard.
 */
export function useKeyboardBox(): { top: number; bottom: number } {
  const key = useSyncExternalStore(
    subscribeViewport,
    () => {
      const bottom = keyboardInset()
      return bottom ? `${Math.round(window.visualViewport?.offsetTop ?? 0)},${bottom}` : '0,0'
    },
    () => '0,0',
  )
  const [top, bottom] = key.split(',').map(Number)
  return { top, bottom }
}

/** The height that's actually visible right now (shrinks while the keyboard is open). */
export function useVisibleHeight(): number {
  return useSyncExternalStore(
    subscribeViewport,
    () => Math.round(window.visualViewport?.height ?? window.innerHeight),
    () => 800,
  )
}

/**
 * Scroll the page so `el` sits inside the visible area (above the keyboard),
 * leaving `bottomGap` px free under it (for a bar pinned above the keyboard).
 */
export function scrollIntoVisible(el: HTMLElement | null, bottomGap = 16, topGap = 12) {
  if (!el || typeof window === 'undefined') return
  const vv = window.visualViewport
  const top = vv ? vv.offsetTop : 0
  const bottom = top + (vv ? vv.height : window.innerHeight)
  const r = el.getBoundingClientRect()
  if (r.bottom > bottom - bottomGap) {
    // Bring the bottom up — but never push the top out of view.
    const dy = Math.min(r.bottom - (bottom - bottomGap), r.top - (top + topGap))
    if (dy > 0) window.scrollBy({ top: dy })
  } else if (r.top < top + topGap) {
    window.scrollBy({ top: r.top - (top + topGap) })
  }
}

/**
 * While `active` (e.g. a text field is focused), keep `ref` visible above the
 * on-screen keyboard: re-checks whenever the visual viewport resizes, i.e. as
 * the keyboard slides in.
 */
export function useKeepAboveKeyboard(ref: RefObject<HTMLElement | null>, active: boolean, bottomGap = 16) {
  useEffect(() => {
    if (!active) return
    const vv = window.visualViewport
    let raf = 0
    const run = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => scrollIntoVisible(ref.current, bottomGap))
    }
    // The keyboard animates in: check now, as it resizes, and once it has settled.
    run()
    const t = window.setTimeout(run, 350)
    vv?.addEventListener('resize', run)
    window.addEventListener('resize', run)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
      vv?.removeEventListener('resize', run)
      window.removeEventListener('resize', run)
    }
  }, [ref, active, bottomGap])
}
