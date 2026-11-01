import type { VoiceRef } from '../../voice/types'
import type { NumberShown } from './sets'

/**
 * What Gobble Garden says (src/voice/packs/gobble-garden.ts). K–1 hears the
 * cloud's number in a sentence; grades 2–5 read the numbers, so their lines
 * are the fixed ones.
 */

const P = 'gobble-garden'

/** A whole number the K–1 templates can say (1–99), or null. */
function sayable(v: NumberShown): number | null {
  const { n, d } = v.value
  return d === 1 && n >= 1 && n <= 99 ? n : null
}

export function introLine(cloud: NumberShown, listen: boolean): VoiceRef {
  const n = sayable(cloud)
  if (listen && n !== null) return { template: `${P}/youAre`, slots: { n } }
  return { line: `${P}/${listen ? 'introListen' : 'intro'}` }
}

const PRAISE = ['yum', 'delicious', 'smartSnacking', 'greatComparing'] as const

/** A cheer for a snack eaten: a short "Yum!" most bites, a bigger one on a streak. */
export function eatLine(streak: number): VoiceRef | null {
  if (streak > 0 && streak % 3 === 0) return { line: `${P}/${PRAISE[2 + ((streak / 3) % 2)]}` }
  return streak === 1 ? { line: `${P}/${PRAISE[streak % 2]}` } : null
}

/** After a burp: "Too big, burp!" (K–1 then hears the comparison its picture shows). */
export function burpLines(snack: NumberShown, cloud: NumberShown, listen: boolean): VoiceRef[] {
  const out: VoiceRef[] = [{ line: `${P}/tooBig` }]
  const a = sayable(snack)
  const b = sayable(cloud)
  if (listen && a !== null && b !== null) out.push({ template: `${P}/bigger`, slots: { a, b } })
  return out
}

export function growLine(to: NumberShown, top: boolean, listen: boolean): VoiceRef {
  if (top) return { line: `${P}/topCloud` }
  const n = sayable(to)
  return listen && n !== null ? { template: `${P}/nowYouAre`, slots: { n } } : { line: `${P}/grew` }
}

export function nudgeLine(cloud: NumberShown): VoiceRef | null {
  const n = sayable(cloud)
  return n === null ? null : { template: `${P}/findSmaller`, slots: { n } }
}

export function ateLine(n: number): VoiceRef | null {
  return n >= 1 && n <= 60 ? { template: `${P}/ateSnacks`, slots: { n } } : null
}

export const roundEndLine = (reason: 'tidy' | 'time'): VoiceRef => ({ line: `${P}/${reason === 'tidy' ? 'parkTidy' : 'timeUp'}` })
export const NEXT_PARK: VoiceRef = { line: `${P}/nextPark` }
export const ALL_DONE: VoiceRef = { line: `${P}/allDone` }
