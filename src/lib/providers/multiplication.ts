import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'

interface Config {
  factorMin: number
  factorMax: number
}

export function makeMultiplicationProvider(cfg: Config): ProblemProvider {
  let serial = 0
  return {
    topic: 'multiplication',
    next(): Problem {
      const a = randInt(cfg.factorMin, cfg.factorMax)
      const b = randInt(cfg.factorMin, cfg.factorMax)
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
        difficulty: Math.max(a, b),
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
