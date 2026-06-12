import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'

interface Config {
  maxDenominator: number
}

export function makeFractionCompareProvider(cfg: Config): ProblemProvider {
  let serial = 0
  return {
    topic: 'fraction-compare',
    next(): Problem {
      let n1: number, d1: number, n2: number, d2: number
      do {
        d1 = randInt(2, cfg.maxDenominator)
        d2 = randInt(2, cfg.maxDenominator)
        n1 = randInt(1, d1)
        n2 = randInt(1, d2)
      } while (n1 / d1 === n2 / d2)
      const a = n1 / d1
      const b = n2 / d2
      const answer: '<' | '>' | '=' = a < b ? '<' : a > b ? '>' : '='
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
        hint:
          d1 === d2
            ? 'Same denominator — just compare the tops.'
            : 'Make the denominators match, then compare the tops.',
      }
    },
  }
}
