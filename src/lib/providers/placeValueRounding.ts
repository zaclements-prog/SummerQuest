import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'

interface Config {
  maxPlace: 100 | 1000 | 10000
  roundTo: 10 | 100 | 1000
}

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
        prompt: `Round ${n.toLocaleString()} to the nearest ${placeLabel}.`,
        options: shuffle([answer, ...distractors]),
        answer,
        topic: 'place-value-rounding',
        subtopic: `nearest-${cfg.roundTo}`,
        difficulty: Math.log10(cfg.maxPlace),
        hint: `Look at the digit in the ones place${cfg.roundTo > 10 ? ' below' : ''} — if it's 5 or more, round up.`,
      }
    },
  }
}

function roundToNearest(n: number, multiple: number): number {
  return Math.round(n / multiple) * multiple
}
