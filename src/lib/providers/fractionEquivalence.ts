import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'

interface Config {
  maxDenominator: number
}

export function makeFractionEquivalenceProvider(cfg: Config): ProblemProvider {
  let serial = 0
  return {
    topic: 'fraction-equivalence',
    next(): Problem {
      // pick a simple base fraction with denominator 2-6
      const baseDenom = randInt(2, 6)
      const baseNum = randInt(1, baseDenom - 1)
      // multiplier so we land at most maxDenominator
      const maxMultiplier = Math.floor(cfg.maxDenominator / baseDenom)
      const mult = randInt(2, Math.max(2, maxMultiplier))
      const targetNum = baseNum * mult
      const targetDenom = baseDenom * mult
      const set = new Set<number>()
      for (const c of [
        baseNum * mult + 1,
        baseNum * (mult + 1),
        baseDenom * mult - baseNum,
        baseNum + mult,
        targetNum - 1,
      ]) {
        if (c > 0 && c !== targetNum) set.add(c)
        if (set.size >= 3) break
      }
      while (set.size < 3) set.add(targetNum + randInt(1, 5))
      const distractors = Array.from(set)
      return {
        id: `frac-eq-${serial++}`,
        prompt: `${baseNum}/${baseDenom} = ?/${targetDenom}`,
        options: shuffle([targetNum, ...distractors]),
        answer: targetNum,
        visual: { kind: 'fraction', numerator: baseNum, denominator: baseDenom, shape: 'circle' },
        topic: 'fraction-equivalence',
        subtopic: `×${mult}`,
        difficulty: mult,
        skill: { id: 'frac-equiv', label: 'equivalent fractions' },
        hint: `Multiply top and bottom by ${mult}.`,
      }
    },
  }
}
