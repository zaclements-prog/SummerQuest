import type { Problem, ProblemProvider, WalkStep } from '../problem'
import { lineText } from '../../voice/registry'
import { randInt, shuffle } from '../random'

interface Config {
  maxPlace: 100 | 1000 | 10000 | 100000
  roundTo: 10 | 100 | 1000
}

/** The digit that decides the rounding sits one place to the right of the target place. */
const DECIDING_PLACE: Record<Config['roundTo'], string> = { 10: 'ones', 100: 'tens', 1000: 'hundreds' }

export function makePlaceValueRoundingProvider(cfg: Config): ProblemProvider {
  let serial = 0
  return {
    topic: 'place-value-rounding',
    next(): Problem {
      // pick a number in [roundTo, maxPlace - 1] with non-trivial rounding
      const min = Math.max(cfg.roundTo, 10)
      const max = cfg.maxPlace - 1
      const n = randInt(min, max)
      const answer = roundToNearest(n, cfg.roundTo)
      const set = new Set<number>()
      for (const c of [
        answer + cfg.roundTo,
        answer - cfg.roundTo,
        answer + cfg.roundTo * 2,
        answer - cfg.roundTo * 2,
      ]) {
        if (c > 0 && c !== answer) set.add(c)
        if (set.size >= 3) break
      }
      while (set.size < 3) set.add(answer + randInt(1, 5) * cfg.roundTo)
      const distractors = Array.from(set)
      const placeLabel = cfg.roundTo === 10 ? 'ten' : cfg.roundTo === 100 ? 'hundred' : 'thousand'
      return {
        id: `pv-round-${serial++}`,
        // US digit grouping on every device (a German-locale tablet would print 12.345)
        prompt: `Round ${n.toLocaleString('en-US')} to the nearest ${placeLabel}.`,
        options: shuffle([answer, ...distractors]),
        answer,
        topic: 'place-value-rounding',
        subtopic: `nearest-${cfg.roundTo}`,
        difficulty: Math.log10(cfg.maxPlace),
        skill: { id: 'pv-round', label: 'rounding numbers' },
        hint: `Look at the ${DECIDING_PLACE[cfg.roundTo]} digit (the place just to the right) — if it's 5 or more, round up.`,
        showMe: roundWalkthrough(n, cfg.roundTo),
      }
    },
  }
}

const PLACE_WORD: Record<Config['roundTo'], 'ten' | 'hundred' | 'thousand'> = { 10: 'ten', 100: 'hundred', 1000: 'thousand' }
const YOUR_TURN_LINE: Record<Config['roundTo'], string> = {
  10: 'show-me/roundTenYourTurn',
  100: 'show-me/roundHundredYourTurn',
  1000: 'show-me/roundThousandYourTurn',
}

/**
 * "Show me how" for rounding (src/games/_shared/ShowMeHow.tsx), from the
 * problem's own number: a number line between the two round numbers, the
 * halfway mark, the number on it, its deciding digit, then the child decides
 * which round number it is closer to. Never says which.
 */
export function roundWalkthrough(n: number, roundTo: Config['roundTo']): WalkStep[] {
  const fmt = (x: number) => x.toLocaleString('en-US')
  const lo = Math.floor(n / roundTo) * roundTo
  const hi = lo + roundTo
  const mid = lo + roundTo / 2
  const digitAt = roundTo / 10
  const digit = Math.floor(n / digitAt) % 10
  const digitName = DECIDING_PLACE[roundTo]
  const aDigit = `${digit === 8 ? 'an' : 'a'} ${digit}`
  const base = { kind: 'roundLine' as const, n, lo, hi }
  const fixed = (id: string) => ({ say: lineText(id) ?? '', voice: { line: id } })
  if (n === lo) {
    // already a round number: it sits on the line's start
    const vis = { ...base, showN: true, digitAt }
    return [
      { say: `Find ${fmt(n)} on the number line, between ${fmt(lo)} and ${fmt(hi)}.`, visual: { ...base, showN: true } },
      { say: `Look at the ${digitName} digit: it's a 0. ${fmt(n)} sits right on a ${PLACE_WORD[roundTo]}!`, visual: vis },
      { ...fixed('show-me/roundExactYourTurn'), visual: vis, yourTurn: true },
    ]
  }
  const full = { ...base, showMid: true, showN: true, digitAt }
  return [
    { say: `${fmt(n)} is between ${fmt(lo)} and ${fmt(hi)}.`, visual: base },
    { say: `Halfway between them is ${fmt(mid)}.`, visual: { ...base, showMid: true } },
    { say: `Here is ${fmt(n)} on the line.`, visual: { ...base, showMid: true, showN: true } },
    n === mid
      ? { say: `Look at the ${digitName} digit: it's a 5. ${fmt(n)} is exactly halfway!`, visual: full }
      : { say: `Look at the ${digitName} digit: it's ${aDigit}.`, visual: full },
    { ...fixed(n === mid ? 'show-me/roundHalfYourTurn' : YOUR_TURN_LINE[roundTo]), visual: full, yourTurn: true },
  ]
}

function roundToNearest(n: number, multiple: number): number {
  return Math.round(n / multiple) * multiple
}
