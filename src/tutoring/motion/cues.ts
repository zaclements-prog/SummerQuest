/**
 * Narration → time mapping. Scenes ask "when is this phrase spoken?" and get
 * seconds, so the visuals land on the words whatever voice reads them.
 *
 * Accuracy, best first:
 *  1. word timings rendered alongside the audio (`<step>.words.json`, see
 *     docs/narration-handoff.md) → the exact start of the phrase's first word;
 *  2. the audio's real duration → the phrase's character position, scaled;
 *  3. an estimate (browser speech or narration off) → characters ÷ reading rate,
 *     corrected live from speech `boundary` events where the browser sends them.
 */

/** One spoken word with its start/end in seconds. */
export interface TimedWord {
  w: string
  s: number
  e: number
}

/** Typical child-friendly narration pace (characters per second, incl. spaces). */
export const DEFAULT_CHARS_PER_SEC = 14

/**
 * The K–1 lessons' pace without a recording (device speech and the silent
 * timeline), as a share of the usual: slower, about 120–130 words a minute
 * (K–5 plan §3). A recorded clip keeps its own pace.
 */
export const K1_NARRATION_PACE = 0.85

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')

/**
 * Attach character offsets in `text` to timed words (aligned in order, robust
 * to punctuation / casing differences and to words the aligner dropped).
 */
export function alignWords(text: string, words: TimedWord[]): { start: number; s: number }[] {
  const out: { start: number; s: number }[] = []
  const lower = text.toLowerCase()
  let cursor = 0
  for (const tw of words) {
    const target = norm(tw.w)
    if (!target) continue
    // find the next token in the text whose normalized form matches
    const re = /[A-Za-z0-9'’-]+/g
    re.lastIndex = cursor
    let m: RegExpExecArray | null
    let found = -1
    let guard = 0
    while ((m = re.exec(lower)) && guard++ < 6) {
      if (norm(m[0]) === target) {
        found = m.index
        cursor = m.index + m[0].length
        break
      }
    }
    if (found >= 0) out.push({ start: found, s: tw.s })
  }
  return out
}

/** Index of the `nth` (0-based) case-insensitive occurrence of `phrase`, or -1. */
export function phraseIndex(text: string, phrase: string, nth = 0): number {
  const hay = text.toLowerCase()
  const needle = phrase.toLowerCase()
  let at = -1
  for (let i = 0; i <= nth; i++) {
    at = hay.indexOf(needle, at + 1)
    if (at < 0) return -1
  }
  return at
}

/**
 * Seconds at which character `ci` is spoken: from aligned word timings when we
 * have them (the start of the word at or after `ci`), else proportional to the
 * known/estimated duration.
 */
export function timeAtChar(ci: number, textLen: number, duration: number, aligned?: { start: number; s: number }[] | null): number {
  if (aligned && aligned.length) {
    let best = aligned[aligned.length - 1].s
    for (let i = aligned.length - 1; i >= 0; i--) {
      if (aligned[i].start >= ci) best = aligned[i].s
      else break
    }
    return best
  }
  if (textLen <= 0) return 0
  return (Math.max(0, Math.min(ci, textLen)) / textLen) * duration
}
