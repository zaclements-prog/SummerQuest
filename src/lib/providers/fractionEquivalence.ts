import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'
import { createFactSampler, inRange } from '../adaptive'
import { currentFactStats } from '../../store/progress'

interface Config {
  maxDenominator: number
}

interface Fact {
  baseNum: number
  baseDenom: number
  mult: number
}

const BASE_DENOM_MIN = 2
const BASE_DENOM_MAX = 6

/** Largest multiplier for a base denominator, so we land at most maxDenominator. */
const maxMultiplier = (baseDenom: number, cfg: Config) => Math.max(2, Math.floor(cfg.maxDenominator / baseDenom))

/** "frac-eq:2/3=?/6" — the base fraction and the target denominator. */
export function fracEqFactId({ baseNum, baseDenom, mult }: Fact): string {
  return `frac-eq:${baseNum}/${baseDenom}=?/${baseDenom * mult}`
}

/** The fact behind `id`, or null if it isn't an equivalence this stage would ask. */
export function parseFracEqFactId(id: string, cfg: Config): Fact | null {
  const m = /^frac-eq:(\d+)\/(\d+)=\?\/(\d+)$/.exec(id)
  if (!m) return null
  const baseNum = Number(m[1])
  const baseDenom = Number(m[2])
  const mult = Number(m[3]) / baseDenom
  if (!inRange(baseDenom, BASE_DENOM_MIN, BASE_DENOM_MAX)) return null
  if (!inRange(baseNum, 1, baseDenom - 1) || !inRange(mult, 2, maxMultiplier(baseDenom, cfg))) return null
  return { baseNum, baseDenom, mult }
}

export function makeFractionEquivalenceProvider(cfg: Config): ProblemProvider {
  let serial = 0
  const sampler = createFactSampler<Fact>({
    key: fracEqFactId,
    parse: (id) => parseFracEqFactId(id, cfg),
    uniform: () => {
      // pick a simple base fraction with denominator 2-6
      const baseDenom = randInt(BASE_DENOM_MIN, BASE_DENOM_MAX)
      const baseNum = randInt(1, baseDenom - 1)
      return { baseNum, baseDenom, mult: randInt(2, maxMultiplier(baseDenom, cfg)) }
    },
    stats: currentFactStats,
  })
  return {
    topic: 'fraction-equivalence',
    reset: () => sampler.reset(),
    next(): Problem {
      const { fact: { baseNum, baseDenom, mult }, factId } = sampler.next()
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
        factId,
        difficulty: mult,
        skill: { id: 'frac-equiv', label: 'equivalent fractions' },
        hint: `Multiply top and bottom by ${mult}.`,
      }
    },
  }
}
