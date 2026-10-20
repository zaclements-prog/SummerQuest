import { alignWords, type TimedWord } from '../tutoring/motion/cues'

/**
 * Captions show numbers as digits ("Tap the group with 7 apples."), but the
 * recordings say them as words ("…with seven apples."). These helpers convert
 * one way (for the clip text the renderer is given) and map back (so word
 * timings from a recording land on the right characters of the caption).
 *
 * The spelling matches what scripts/tts/textnorm.py reads back from Whisper:
 * American style, hyphenated tens ("twenty-one"), no "and" ("one hundred five").
 */

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
]
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/** The largest number `numberWords` spells. */
export const MAX_SPOKEN_NUMBER = 999_999

function under1000(n: number): string {
  const parts: string[] = []
  const h = Math.floor(n / 100)
  const r = n % 100
  if (h) parts.push(`${ONES[h]} hundred`)
  if (r) parts.push(r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : ''))
  return parts.join(' ')
}

/** 7 → "seven", 21 → "twenty-one", 105 → "one hundred five", 1200 → "one thousand two hundred". */
export function numberWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > MAX_SPOKEN_NUMBER) throw new Error(`can't speak the number ${n}`)
  if (n === 0) return 'zero'
  const th = Math.floor(n / 1000)
  const rest = n % 1000
  return [th ? `${under1000(th)} thousand` : '', rest ? under1000(rest) : ''].filter(Boolean).join(' ')
}

/**
 * The spoken form of a caption: every run of digits as words. `map[i]` is the
 * caption index that spoken character `i` came from (every character of a
 * number's words maps to the number's first digit).
 */
export function spokenView(caption: string): { spoken: string; map: number[] } {
  let spoken = ''
  const map: number[] = []
  const re = /\d+/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(caption))) {
    for (let i = last; i < m.index; i++) {
      spoken += caption[i]
      map.push(i)
    }
    const n = Number(m[0])
    const words = n <= MAX_SPOKEN_NUMBER ? numberWords(n) : m[0]
    for (let k = 0; k < words.length; k++) map.push(m.index)
    spoken += words
    last = m.index + m[0].length
  }
  for (let i = last; i < caption.length; i++) {
    spoken += caption[i]
    map.push(i)
  }
  return { spoken, map }
}

/** A spoken word pinned to the caption: the character it starts at and its time (seconds). */
export interface CaptionWord {
  start: number
  s: number
}

/**
 * Pin a recording's word timings to the caption characters they speak:
 * `caption.slice(capStart, capEnd)` is what the recording says (digits and
 * all), `words` its timings from the `.words.json`, `offset` the recording's
 * start on the line's timeline. Returns caption-absolute character offsets.
 */
export function alignCaptionWords(
  caption: string,
  capStart: number,
  capEnd: number,
  words: TimedWord[],
  offset = 0,
): CaptionWord[] {
  const { spoken, map } = spokenView(caption.slice(capStart, capEnd))
  return alignWords(spoken, words).map((a) => ({ start: capStart + (map[a.start] ?? 0), s: a.s + offset }))
}
