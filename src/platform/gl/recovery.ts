/**
 * WebGL context-loss recovery policy (pure, unit-tested).
 *
 * iOS Safari / WKWebView and Android drop WebGL contexts under memory pressure
 * or when the app is backgrounded; the canvas then goes black or freezes. The
 * GLCanvas wrapper shows a "tap to continue" card and remounts the canvas: right
 * away when the browser says the context is back (`webglcontextrestored`), after
 * `autoAfterMs` while the page is visible, or on a tap. Automatic remounts are
 * rationed (`maxAuto` per `windowMs`) so a device that keeps losing contexts
 * stops thrashing and waits for the child to tap.
 */
export const RECOVERY = {
  /** Remount this long after a loss if the browser hasn't restored the context. */
  autoAfterMs: 2500,
  /** At most this many automatic remounts… */
  maxAuto: 3,
  /** …within this window; after that only a tap remounts. */
  windowMs: 60_000,
} as const

/** May the canvas remount on its own now, given when it last did (ms timestamps)? */
export function mayAutoRecover(recentAuto: readonly number[], now: number): boolean {
  let n = 0
  for (const t of recentAuto) if (now - t < RECOVERY.windowMs) n++
  return n < RECOVERY.maxAuto
}

/** Keep only the automatic remounts still inside the window (bounded history). */
export function pruneRecoveries(recentAuto: readonly number[], now: number): number[] {
  return recentAuto.filter((t) => now - t < RECOVERY.windowMs)
}
