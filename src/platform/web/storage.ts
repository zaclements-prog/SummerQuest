/**
 * Saves live in localStorage. Under storage pressure a browser may evict a
 * site's data unless it has been granted "persistent" storage, so after the
 * first real interaction (engagement is what browsers weigh) ask once.
 * Harmless where unsupported or refused: saves keep working, just evictable.
 */
const EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const

export function persistStorageAfterFirstGesture(): () => void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return () => {}
  const storage = navigator.storage
  if (!storage || typeof storage.persist !== 'function') return () => {}
  const opts: AddEventListenerOptions = { capture: true, passive: true }
  const off = () => {
    for (const type of EVENTS) window.removeEventListener(type, ask, opts)
  }
  function ask() {
    off()
    void (async () => {
      try {
        if (await storage.persisted?.()) return
        await storage.persist()
      } catch {
        /* not allowed here (private mode, file://): saves still work, just evictable */
      }
    })()
  }
  for (const type of EVENTS) window.addEventListener(type, ask, opts)
  return off
}
