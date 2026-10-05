import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'
import { createFactSampler, inRange } from '../adaptive'
import { currentFactStats } from '../../store/progress'

interface Config {
  factorMin: number
  factorMax: number
}

interface Fact {
  a: number
  b: number
}

/** "mult:6x8" — smaller factor first, so 6 × 8 and 8 × 6 are the same fact. */
export function multFactId(a: number, b: number): string {
  return `mult:${Math.min(a, b)}x${Math.max(a, b)}`
}

/** The fact behind `id` in a random order, or null if it isn't a multiplication fact in range. */
export function parseMultFactId(id: string, cfg: Config): Fact | null {
  const m = /^mult:(\d+)x(\d+)$/.exec(id)
  if (!m) return null
  const a = Number(m[1])
  const b = Number(m[2])
  if (!inRange(a, cfg.factorMin, cfg.factorMax) || !inRange(b, cfg.factorMin, cfg.factorMax)) return null
  return Math.random() < 0.5 ? { a, b } : { a: b, b: a }
}

export function makeMultiplicationProvider(cfg: Config): ProblemProvider {
  let serial = 0
  const sampler = createFactSampler<Fact>({
    key: ({ a, b }) => multFactId(a, b),
    parse: (id) => parseMultFactId(id, cfg),
    uniform: () => ({ a: randInt(cfg.factorMin, cfg.factorMax), b: randInt(cfg.factorMin, cfg.factorMax) }),
    stats: currentFactStats,
  })
  return {
    topic: 'multiplication',
    reset: () => sampler.reset(),
    next(): Problem {
      const { fact: { a, b }, factId } = sampler.next()
      const answer = a * b
      const distractors = makeDistractors(answer, a, b)
      return {
        id: `mult-${serial++}`,
        prompt: `${a} × ${b} = ?`,
        options: shuffle([answer, ...distractors]),
        answer,
        visual: { kind: 'array', rows: a, cols: b },
        topic: 'multiplication',
        subtopic: `${a}×${b}`,
        factId,
        difficulty: Math.max(a, b),
        skill: {
          id: Math.max(a, b) >= 10 ? 'mult-f10_12' : Math.max(a, b) >= 6 ? 'mult-f6_9' : 'mult-f2_5',
          label: Math.max(a, b) >= 10 ? '10–12× facts' : Math.max(a, b) >= 6 ? '6–9× facts' : '2–5× facts',
        },
        hint: a <= b
          ? `Try counting by ${a}s: ${Array.from({ length: b }, (_, i) => a * (i + 1)).join(', ')}`
          : `Try counting by ${b}s: ${Array.from({ length: a }, (_, i) => b * (i + 1)).join(', ')}`,
      }
    },
  }
}

function makeDistractors(answer: number, a: number, b: number): number[] {
  const set = new Set<number>()
  const candidates = [
    a * (b + 1),
    (a + 1) * b,
    a * (b - 1),
    (a - 1) * b,
    a + b,
    a * b + 1,
    a * b - 1,
  ]
  for (const c of candidates) {
    if (c > 0 && c !== answer && set.size < 3) set.add(c)
  }
  while (set.size < 3) set.add(answer + randInt(1, 5))
  return Array.from(set)
}
