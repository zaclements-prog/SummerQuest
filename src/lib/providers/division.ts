import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'
import { createFactSampler, inRange } from '../adaptive'
import { currentFactStats } from '../../store/progress'

interface Config {
  divisorMin: number
  divisorMax: number
  quotientMin: number
  quotientMax: number
}

interface Fact {
  divisor: number
  quotient: number
}

/** "div:56/8" — dividend / divisor. */
export function divFactId(divisor: number, quotient: number): string {
  return `div:${divisor * quotient}/${divisor}`
}

/** The fact behind `id`, or null if it isn't a whole-number division fact in range. */
export function parseDivFactId(id: string, cfg: Config): Fact | null {
  const m = /^div:(\d+)\/(\d+)$/.exec(id)
  if (!m) return null
  const dividend = Number(m[1])
  const divisor = Number(m[2])
  const quotient = dividend / divisor
  if (!inRange(divisor, cfg.divisorMin, cfg.divisorMax) || !inRange(quotient, cfg.quotientMin, cfg.quotientMax)) return null
  return { divisor, quotient }
}

export function makeDivisionProvider(cfg: Config): ProblemProvider {
  let serial = 0
  const sampler = createFactSampler<Fact>({
    key: ({ divisor, quotient }) => divFactId(divisor, quotient),
    parse: (id) => parseDivFactId(id, cfg),
    uniform: () => ({
      divisor: randInt(cfg.divisorMin, cfg.divisorMax),
      quotient: randInt(cfg.quotientMin, cfg.quotientMax),
    }),
    stats: currentFactStats,
  })
  return {
    topic: 'division',
    reset: () => sampler.reset(),
    next(): Problem {
      const { fact: { divisor, quotient }, factId } = sampler.next()
      const dividend = divisor * quotient
      const distractors = makeDistractors(quotient)
      return {
        id: `div-${serial++}`,
        prompt: `${dividend} ÷ ${divisor} = ?`,
        options: shuffle([quotient, ...distractors]),
        answer: quotient,
        // Caption names the total and the rows — not "rows × cols", which would print the answer.
        visual: { kind: 'array', rows: divisor, cols: quotient, label: `${dividend} shared into ${divisor} equal rows` },
        topic: 'division',
        subtopic: `÷${divisor}`,
        factId,
        difficulty: divisor,
        skill: {
          id: divisor >= 6 ? 'div-larger' : 'div-basic',
          label: divisor >= 6 ? 'larger division facts' : 'basic division facts',
        },
        hint: `Think: ${divisor} × what = ${dividend}?`,
      }
    },
  }
}

function makeDistractors(answer: number): number[] {
  const set = new Set<number>()
  const candidates = [answer + 1, answer - 1, answer + 2, answer * 2, Math.max(1, answer - 2)]
  for (const c of candidates) {
    if (c > 0 && c !== answer && set.size < 3) set.add(c)
  }
  while (set.size < 3) set.add(answer + randInt(1, 5))
  return Array.from(set)
}
