import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'
import { createFactSampler, inRange } from '../adaptive'
import { currentFactStats } from '../../store/progress'

/**
 * Which side carries the blank, and which way the fact scales:
 *  - 'numUp':   "a/b = ?/d" — fill the top after multiplying both sides.
 *  - 'numDown': "a/b = ?/t" — fill the top after DIVIDING both sides (4/6 = ?/3).
 *  - 'denUp':   "a/b = c/??" — find the bottom after multiplying (2/3 = 4/?).
 *  - 'denDown': "a/b = c/??" — find the bottom after dividing both sides (4/6 = 2/?).
 * (Each "??" above stands for a single question mark — one blank per prompt.)
 *
 * Widening the shelf within 2.G.A.3 (halves, thirds, fourths — sixths and
 * eighths only as the doubled forms the standard's own examples use, e.g.
 * 4/6 = 2/3): at maxDenominator 8 the classic top-blank shape alone served
 * just 8 distinct facts; the four shapes serve 24. Pass `shapes: ['numUp']`
 * to restrict — the forge's gauge prints the target denominator, so it keeps
 * the one shape its mold was built around.
 */
export type FracEqMode = 'numUp' | 'numDown' | 'denUp' | 'denDown'

interface Fact {
  baseNum: number
  baseDenom: number
  /**
   * The other side's shown denominator ('num*' modes) or numerator ('den*'
   * modes): base × mult when scaling up, base ÷ div when scaling down.
   */
  known: number
  /** > 1 for the up modes; 1 for the down modes (see `div`). */
  mult: number
  /** ≥ 2 for the down modes; 1 for the up modes. */
  div: number
  mode: FracEqMode
}

interface Config {
  maxDenominator: number
  /** Shapes this stage asks (default: all four). */
  shapes?: readonly FracEqMode[]
  /**
   * The only denominators either fraction may have (default: any up to
   * maxDenominator). The forge passes the grade's own list (3.NF: 2, 3, 4, 6, 8).
   */
  denominators?: readonly number[]
}

const BASE_DENOM_MIN = 2
const BASE_DENOM_MAX = 6

/** Largest base denominator whose ×2 still fits maxDenominator (2nd grade's /8 → halves, thirds, fourths). */
const baseDenomMax = (cfg: Config) => Math.max(BASE_DENOM_MIN, Math.min(BASE_DENOM_MAX, Math.floor(cfg.maxDenominator / 2)))

/** Largest multiplier for a base denominator, so we land at most maxDenominator. */
const maxMultiplier = (baseDenom: number, cfg: Config) => Math.max(2, Math.floor(cfg.maxDenominator / baseDenom))

/** The denominator of the side that isn't the base. */
function otherDenom(f: Fact): number {
  if (f.mode === 'numUp' || f.mode === 'numDown') return f.known
  return f.mode === 'denUp' ? f.baseDenom * f.mult : f.baseDenom / f.div
}

/** Both of the fact's denominators are on the config's list (when it has one). */
const allowedDenoms = (f: Fact, cfg: Config) => !cfg.denominators || (cfg.denominators.includes(f.baseDenom) && cfg.denominators.includes(otherDenom(f)))

/** Every fact this config can serve — a small finite shelf enumerated once. */
function allFacts(cfg: Config): Fact[] {
  const out: Fact[] = []
  // scale-up facts: the base never exceeds maxDenominator / 2, so ×2 always fits
  for (let baseDenom = BASE_DENOM_MIN; baseDenom <= baseDenomMax(cfg); baseDenom++) {
    for (let baseNum = 1; baseNum <= baseDenom - 1; baseNum++) {
      for (let mult = 2; mult <= maxMultiplier(baseDenom, cfg); mult++) {
        const targetDenom = baseDenom * mult
        if (targetDenom > cfg.maxDenominator) continue
        out.push({ baseNum, baseDenom, known: targetDenom, mult, div: 1, mode: 'numUp' })
        out.push({ baseNum, baseDenom, known: baseNum * mult, mult, div: 1, mode: 'denUp' })
      }
    }
  }
  // scale-down facts: a divisor splits top and bottom; every number stays in range
  // and both fractions stay proper (4/6 = 2/3 is the standard's own example)
  for (let baseDenom = BASE_DENOM_MIN; baseDenom <= Math.min(BASE_DENOM_MAX, cfg.maxDenominator); baseDenom++) {
    for (let baseNum = 1; baseNum <= baseDenom - 1; baseNum++) {
      for (let div = 2; div <= baseNum; div++) {
        if (baseNum % div !== 0 || baseDenom % div !== 0) continue
        const knownNum = baseNum / div
        const knownDenom = baseDenom / div
        if (knownDenom < BASE_DENOM_MIN || knownNum >= knownDenom) continue
        out.push({ baseNum, baseDenom, known: knownDenom, mult: 1, div, mode: 'numDown' })
        out.push({ baseNum, baseDenom, known: knownNum, mult: 1, div, mode: 'denDown' })
      }
    }
  }
  return out
}

/**
 * The fact behind `id`, or null if it isn't an equivalence this stage would ask.
 * Ids mirror the prompt with the blank kept where the child sees it:
 * "frac-eq:2/3=?/6", "frac-eq:4/6=?/3", "frac-eq:2/3=4/?", "frac-eq:4/6=2/?".
 * Each id encodes both fractions' complete data plus one hidden number, so it
 * parses to exactly one fact and ids are unique.
 */
export function parseFracEqFactId(id: string, cfg: Config): Fact | null {
  const f = parseAnyFracEqFactId(id, cfg)
  return f && allowedDenoms(f, cfg) ? f : null
}

function parseAnyFracEqFactId(id: string, cfg: Config): Fact | null {
  const ok = (mode: FracEqMode) => !cfg.shapes || cfg.shapes.includes(mode)
  const withinBase = (baseNum: number, baseDenom: number) =>
    inRange(baseDenom, BASE_DENOM_MIN, Math.min(BASE_DENOM_MAX, cfg.maxDenominator)) && inRange(baseNum, 1, baseDenom - 1)
  const m = /^frac-eq:(\d+)\/(\d+)=([?\d]+)\/([?\d]+)$/.exec(id)
  if (!m) return null
  const baseNum = Number(m[1])
  const baseDenom = Number(m[2])
  if (!withinBase(baseNum, baseDenom)) return null
  if (m[4] !== '?' && m[3] !== '?') return null // exactly one blank
  if (m[3] === '?') {
    const targetDenom = Number(m[4])
    if (!inRange(targetDenom, BASE_DENOM_MIN, cfg.maxDenominator)) return null
    if (targetDenom > baseDenom) {
      const mult = targetDenom / baseDenom
      if (!ok('numUp') || !inRange(mult, 2, maxMultiplier(baseDenom, cfg))) return null
      return { baseNum, baseDenom, known: targetDenom, mult, div: 1, mode: 'numUp' }
    }
    if (targetDenom < baseDenom) {
      const div = baseDenom / targetDenom
      if (!ok('numDown') || !Number.isInteger(div) || div < 2 || baseNum % div !== 0) return null
      return { baseNum, baseDenom, known: targetDenom, mult: 1, div, mode: 'numDown' }
    }
    return null
  }
  const shownNum = Number(m[3])
  if (shownNum < 1 || shownNum === baseNum) return null
  const answerDenom = (shownNum * baseDenom) / baseNum
  if (!Number.isInteger(answerDenom) || !inRange(answerDenom, BASE_DENOM_MIN, cfg.maxDenominator)) return null
  if (shownNum >= answerDenom) return null // both fractions must stay proper
  if (answerDenom > baseDenom) {
    const mult = answerDenom / baseDenom
    if (!ok('denUp') || !inRange(mult, 2, maxMultiplier(baseDenom, cfg))) return null
    return { baseNum, baseDenom, known: shownNum, mult, div: 1, mode: 'denUp' }
  }
  const div = baseNum / shownNum
  if (ok('denDown') && Number.isInteger(div) && div >= 2 && baseDenom % div === 0) {
    return { baseNum, baseDenom, known: shownNum, mult: 1, div, mode: 'denDown' }
  }
  return null
}

/** The id mirrors the prompt: the "?" sits exactly where the child's blank is. */
export function fracEqFactId(f: Fact): string {
  const b = `${f.baseNum}/${f.baseDenom}`
  if (f.mode === 'numUp') return `frac-eq:${b}=?/${f.known}`
  if (f.mode === 'numDown') return `frac-eq:${b}=?/${f.known}`
  if (f.mode === 'denUp') return `frac-eq:${b}=${f.known}/?`
  return `frac-eq:${b}=${f.known}/?`
}

/** Three plausible, distinct, positive option buttons around `answer`. */
function optionSet(answer: number, candidates: number[], cfg: Config): number[] {
  const set = new Set<number>()
  for (const c of candidates) {
    if (c >= 1 && c <= cfg.maxDenominator && c !== answer) set.add(c)
    if (set.size >= 3) break
  }
  while (set.size < 3) set.add(answer + randInt(1, 5))
  return Array.from(set)
}

export function makeFractionEquivalenceProvider(cfg: Config): ProblemProvider {
  let serial = 0
  const shapes = cfg.shapes && cfg.shapes.length > 0 ? new Set(cfg.shapes) : null
  const facts = allFacts(cfg).filter((f) => (!shapes || shapes.has(f.mode)) && allowedDenoms(f, cfg))
  const sampler = createFactSampler<Fact>({
    key: fracEqFactId,
    parse: (id) => parseFracEqFactId(id, cfg),
    uniform: () => facts[randInt(0, facts.length - 1)],
    stats: currentFactStats,
  })
  return {
    topic: 'fraction-equivalence',
    reset: () => sampler.reset(),
    next(): Problem {
      const { fact, factId } = sampler.next()
      const { baseNum, baseDenom, known, mult, div, mode } = fact
      const visual = { kind: 'fraction' as const, numerator: baseNum, denominator: baseDenom, shape: 'circle' as const }
      const skill = { id: 'frac-equiv', label: 'equivalent fractions' }
      const base = { id: `frac-eq-${serial++}`, visual, topic: 'fraction-equivalence' as const, factId, skill }
      if (mode === 'numUp') {
        const answer = baseNum * mult
        const options = optionSet(answer, [answer + 1, answer * 2 - baseNum, baseDenom * mult - baseNum, baseNum + mult, answer - 1, answer + mult], cfg)
        return {
          ...base,
          prompt: `${baseNum}/${baseDenom} = ?/${known}`,
          options: shuffle([answer, ...options]),
          answer,
          subtopic: `×${mult}`,
          difficulty: mult,
          hint: `Multiply top and bottom by ${mult}.`,
        }
      }
      if (mode === 'numDown') {
        const answer = baseNum / div
        const options = optionSet(answer, [baseDenom, answer + div, answer + 1, answer - 1, answer + known], cfg)
        return {
          ...base,
          prompt: `${baseNum}/${baseDenom} = ?/${known}`,
          options: shuffle([answer, ...options]),
          answer,
          subtopic: `÷${div}`,
          difficulty: div,
          hint: `Divide top and bottom by ${div}.`,
        }
      }
      if (mode === 'denUp') {
        const answer = baseDenom * mult
        const options = optionSet(answer, [answer + 1, answer - 1, answer + baseDenom, answer - baseDenom, answer + mult, answer - mult], cfg)
        return {
          ...base,
          prompt: `${baseNum}/${baseDenom} = ${known}/?`,
          options: shuffle([answer, ...options]),
          answer,
          subtopic: `×${mult}`,
          difficulty: mult,
          hint: `Multiply top and bottom by ${mult}.`,
        }
      }
      const answer = baseDenom / div
      const options = optionSet(answer, [baseDenom, answer + div, answer + 1, answer - 1, answer + known], cfg)
      return {
        ...base,
        prompt: `${baseNum}/${baseDenom} = ${known}/?`,
        options: shuffle([answer, ...options]),
        answer,
        subtopic: `÷${div}`,
        difficulty: div,
        hint: `Divide top and bottom by ${div}.`,
      }
    },
  }
}
