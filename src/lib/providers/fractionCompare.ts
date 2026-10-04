import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'

interface Config {
  maxDenominator: number
}

/** Share of items that are equivalent fractions, so "=" is a real choice, not a freebie. */
const EQUAL_SHARE = 0.2

export function makeFractionCompareProvider(cfg: Config): ProblemProvider {
  let serial = 0
  return {
    topic: 'fraction-compare',
    next(): Problem {
      let n1: number, d1: number, n2: number, d2: number
      if (Math.random() < EQUAL_SHARE && cfg.maxDenominator >= 4) {
        // An equivalent pair (e.g. 2/3 = 4/6) so "=" is sometimes the answer.
        d1 = randInt(2, Math.floor(cfg.maxDenominator / 2))
        n1 = randInt(1, d1 - 1)
        const k = randInt(2, Math.floor(cfg.maxDenominator / d1))
        ;[n2, d2] = [n1 * k, d1 * k]
        if (Math.random() < 0.5) [n1, d1, n2, d2] = [n2, d2, n1, d1]
      } else {
        // Proper fractions (no wholes like 10/10), never equal.
        do {
          d1 = randInt(2, cfg.maxDenominator)
          d2 = randInt(2, cfg.maxDenominator)
          n1 = randInt(1, d1 - 1)
          n2 = randInt(1, d2 - 1)
        } while (n1 * d2 === n2 * d1)
      }
      // Cross-multiply (exact integers) rather than comparing floats.
      const cmp = n1 * d2 - n2 * d1
      const answer: '<' | '>' | '=' = cmp < 0 ? '<' : cmp > 0 ? '>' : '='
      return {
        id: `frac-cmp-${serial++}`,
        prompt: `${n1}/${d1}  ?  ${n2}/${d2}`,
        options: shuffle(['<', '>', '=']),
        answer,
        visual: {
          kind: 'fractionCompare',
          a: { numerator: n1, denominator: d1 },
          b: { numerator: n2, denominator: d2 },
        },
        topic: 'fraction-compare',
        difficulty: Math.max(d1, d2),
        skill:
          d1 === d2
            ? { id: 'frac-cmp-likeden', label: 'comparing (same bottom)' }
            : { id: 'frac-cmp-unlikeden', label: 'comparing (different bottoms)' },
        hint:
          d1 === d2
            ? 'Same denominator — just compare the tops.'
            : 'Make the denominators match, then compare the tops. If the tops match too, they are equal!',
      }
    },
  }
}
