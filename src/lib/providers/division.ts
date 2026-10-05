import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'

interface Config {
  divisorMin: number
  divisorMax: number
  quotientMin: number
  quotientMax: number
}

export function makeDivisionProvider(cfg: Config): ProblemProvider {
  let serial = 0
  return {
    topic: 'division',
    next(): Problem {
      const divisor = randInt(cfg.divisorMin, cfg.divisorMax)
      const quotient = randInt(cfg.quotientMin, cfg.quotientMax)
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
