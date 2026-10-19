import type { CaptionWord } from './spoken'

/**
 * Timeline math for a voice line played as a playlist of clips (one clip for a
 * fixed line or a `whole` template; carrier pieces and slot values for a
 * `stitch` template). Pure, so it is tested without audio.
 *
 * Accuracy of `timeAtChar`, best first (as for the lessons, see
 * src/tutoring/motion/cues.ts): word timings from each clip's `.words.json`,
 * pinned to the caption and offset by the clip's start; else the clip's
 * duration scaled by character position within the clip's caption span.
 */

export interface SegTiming {
  capStart: number
  capEnd: number
  /** Seconds of silence before this clip. */
  gap: number
  /** Best-known length of this clip in seconds. */
  dur: number
  /** Word timings pinned to caption characters, in seconds from THIS clip's start. */
  aligned: CaptionWord[] | null
}

/** Where each clip starts on the line's timeline. */
export function segmentStarts(segs: readonly SegTiming[]): number[] {
  const out: number[] = []
  let t = 0
  for (const s of segs) {
    t += s.gap
    out.push(t)
    t += s.dur
  }
  return out
}

export function playlistDuration(segs: readonly SegTiming[]): number {
  let t = 0
  for (const s of segs) t += s.gap + s.dur
  return t
}

/** Seconds, from the start of its clip, at which caption character `ci` (inside the clip's span) is said. */
function withinSegment(ci: number, s: SegTiming): number {
  if (s.aligned && s.aligned.length) {
    // the start of the word at or after `ci` (as the lesson clock does)
    let best = s.aligned[s.aligned.length - 1].s
    for (let i = s.aligned.length - 1; i >= 0; i--) {
      if (s.aligned[i].start >= ci) best = s.aligned[i].s
      else break
    }
    return best
  }
  const span = s.capEnd - s.capStart
  return span > 0 ? ((ci - s.capStart) / span) * s.dur : 0
}

/** Seconds on the line's timeline at which caption character `ci` is said. */
export function playlistTimeAtChar(ci: number, segs: readonly SegTiming[], starts = segmentStarts(segs)): number {
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]
    if (ci < s.capStart) return starts[i] // punctuation or space before this clip: when it starts
    if (ci < s.capEnd) return starts[i] + withinSegment(ci, s)
  }
  return playlistDuration(segs)
}

/** Seconds at which character `ci` is said when only a length is known (speech, silent timeline). */
export function scaledTimeAtChar(ci: number, textLen: number, duration: number): number {
  if (textLen <= 0) return 0
  return (Math.max(0, Math.min(ci, textLen)) / textLen) * duration
}
