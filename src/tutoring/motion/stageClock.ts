import type { NarrationClock } from '../../lib/narration'

/**
 * The time the lesson stage shows right now: the narration clock, unless a
 * DEV/QA hook pins it (`window.__sqMotionT = 3.2` → headless screenshots of an
 * exact frame). The stage, the karaoke caption and the time bar all read this,
 * so they always agree.
 */
export function stageNow(clock: NarrationClock): number {
  const forced = import.meta.env.DEV ? (window as { __sqMotionT?: number }).__sqMotionT : undefined
  return typeof forced === 'number' ? forced : clock.now()
}
