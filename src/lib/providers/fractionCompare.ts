import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'
import { createFactSampler, inRange } from '../adaptive'
import { currentFactStats } from '../../store/progress'

interface Config {
  maxDenominator: number
}

/** Left fraction n1/d1, right fraction n2/d2. */
interface Fact {
  n1: number
  d1: number
  n2: number
  d2: number
}

/** Share of items that are equivalent fractions, so "=" is a real choice, not a freebie. */
const EQUAL_SHARE = 0.2

/** "frac-cmp:1/3,2/5" — the pair in a fixed order (by denominator, then numerator), so either side order is one fact. */
export function fracCmpFactId({ n1, d1, n2, d2 }: Fact): string {
  const leftFirst = d1 < d2 || (d1 === d2 && n1 <= n2)
  return leftFirst ? `frac-cmp:${n1}/${d1},${n2}/${d2}` : `frac-cmp:${n2}/${d2},${n1}/${d1}`
}

/** The pair behind `id` in a random order, or null if it isn't two different proper fractions in range. */
export function parseFracCmpFactId(id: string, cfg: Config): Fact | null {
  const m = /^frac-cmp:(\d+)\/(\d+),(\d+)\/(\d+)$/.exec(id)
  if (!m) return null
  const [n1, d1, n2, d2] = m.slice(1).map(Number)
  const proper = (n: number, d: number) => inRange(d, 2, cfg.maxDenominator) && inRange(n, 1, d - 1)
  if (!proper(n1, d1) || !proper(n2, d2) || (n1 === n2 && d1 === d2)) return null
  return Math.random() < 0.5 ? { n1, d1, n2, d2 } : { n1: n2, d1: d2, n2: n1, d2: d1 }
}

function uniformPair(cfg: Config): Fact {
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
  return { n1, d1, n2, d2 }
}

export function makeFractionCompareProvider(cfg: Config): ProblemProvider {
  let serial = 0
  const sampler = createFactSampler<Fact>({
    key: fracCmpFactId,
    parse: (id) => parseFracCmpFactId(id, cfg),
    uniform: () => uniformPair(cfg),
    stats: currentFactStats,
  })
  return {
    topic: 'fraction-compare',
    reset: () => sampler.reset(),
    next(): Problem {
      const { fact: { n1, d1, n2, d2 }, factId } = sampler.next()
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
        factId,
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
