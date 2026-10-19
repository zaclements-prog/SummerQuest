import { describe, it, expect, vi, afterEach } from 'vitest'
import { curriculum, zoneStages } from '../../../curriculum'
import { createProvider, type ProviderConfig } from '..'
import { GRADE_LEVELS, GRADE_TIERS, effectiveConfigForStage, type GradeLevel } from '../../gradeTiers'
import { nextProblem, type Problem, type ProblemProvider, type ProblemVisual } from '../../problem'
import { seededRng } from '../../random'
import { makeDivisionProvider } from '../division'
import { makeFractionEquivalenceProvider } from '../fractionEquivalence'
import { makeMultiplicationGroveProvider } from '../multiplicationGrove'
import { makeScienceCycleProvider } from '../scienceCycle'
import { arenaFactConfig, warmFactConfig } from '../../arena/divisionCore'
import { forgeFactConfig } from '../../forge/fractionCore'
import { groveMaxFactor } from '../../grove/groveCore'
import { PROCESSES } from '../../cycle/cycleCore'

/**
 * Generator fuzz suite: every stage in the curriculum, at every grade tier, plus
 * the bounded fact sources the 3D mini-games draw on their own. Each config is
 * drawn a few hundred times under a seeded Math.random (failures reproduce) and
 * every problem a child could see is checked for:
 *
 *  - clean text: no undefined / NaN / null / [object …] / Infinity, no doubled
 *    spaces, no leftover template braces — in the prompt, options, hint and visual;
 *  - a fair multiple choice: 2–6 unique options with the answer exactly once,
 *    no NaN/Infinity, nothing negative;
 *  - the RIGHT answer, recomputed independently from the problem's own data
 *    (prompt numbers or the visual's bars), and a visual that agrees with the prompt.
 */

const DRAWS = 400
const BAD_TOKEN = /undefined|NaN|\bnull\b|\[object|Infinity/

interface Case {
  label: string
  /** The config the problems should honor (ranges, kinds). */
  config: ProviderConfig
  grade: GradeLevel
  make: () => ProblemProvider
  /** Override the draw (Cloud Keeper asks for a given process). */
  draw?: (p: ProblemProvider, i: number) => Promise<Problem> | Problem
}

/** Every distinct (stage config × grade) a GameRunner can build: each grade plays its band's stage set. */
function stageCases(): Case[] {
  const seen = new Set<string>()
  const out: Case[] = []
  for (const zone of curriculum.zones) {
    for (const grade of GRADE_LEVELS) {
      zoneStages(zone, grade).forEach((stage, idx) => {
        const config = effectiveConfigForStage(stage, idx, grade)
        const key = JSON.stringify(config)
        if (seen.has(key)) return
        seen.add(key)
        out.push({ label: `${zone.id}/${stage.id} G${grade}`, config, grade, make: () => createProvider(config) })
      })
    }
  }
  return out
}

/** The 3D mini-games draw their own bounded facts (see each core's *FactConfig). */
function arenaCases(): Case[] {
  const out: Case[] = []
  for (const grade of GRADE_LEVELS) {
    const t = GRADE_TIERS[grade]
    for (const [name, cfg] of [['arena', arenaFactConfig(t.divMax)], ['arena warm-up', warmFactConfig(t.divMax)]] as const) {
      out.push({ label: `${name} G${grade}`, config: { kind: 'division', ...cfg }, grade, make: () => makeDivisionProvider(cfg) })
    }
    const forge = forgeFactConfig(t.fracEquivMaxDenom)
    out.push({ label: `forge G${grade}`, config: { kind: 'fractionEquivalence', ...forge }, grade, make: () => makeFractionEquivalenceProvider(forge) })
    out.push({
      label: `grove G${grade}`,
      config: { kind: 'multiplicationGrove' },
      grade,
      make: () => makeMultiplicationGroveProvider({ maxFactor: groveMaxFactor(grade) }),
    })
  }
  out.push({
    label: 'cloud keeper legs',
    config: { kind: 'scienceCycle' },
    grade: 3,
    make: () => makeScienceCycleProvider(),
    draw: (p, i) => (p as ReturnType<typeof makeScienceCycleProvider>).nextFor(PROCESSES[i % PROCESSES.length]),
  })
  return out
}

// ── text checks ──────────────────────────────────────────────────────────────

function textProblems(what: string, text: unknown): string[] {
  if (typeof text !== 'string') return [`${what} is not a string (${String(text)})`]
  const errs: string[] = []
  if (text.trim().length === 0) errs.push(`${what} is empty`)
  if (text !== text.trim()) errs.push(`${what} has leading/trailing space: "${text}"`)
  if (BAD_TOKEN.test(text)) errs.push(`${what} leaks a bad token: "${text}"`)
  if (/ {2}/.test(text)) errs.push(`${what} has a doubled space: "${text}"`)
  if (/[{}]/.test(text)) errs.push(`${what} has a leftover template brace: "${text}"`)
  // (a lone "?" is a blank to fill, as in "3 × 4 = ?" — only a sentence's "?" hugs its word)
  if (/\s[,.!;:]|[a-z] \?/i.test(text)) errs.push(`${what} has a space before punctuation: "${text}"`)
  if (/\b(\w+) \1\b/i.test(text)) errs.push(`${what} repeats a word: "${text}"`)
  return errs
}

function visualTextProblems(v: ProblemVisual | undefined): string[] {
  if (!v) return []
  const errs: string[] = []
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === 'number' && !Number.isFinite(val)) errs.push(`visual.${k} is ${val}`)
  }
  switch (v.kind) {
    case 'passage':
      errs.push(...textProblems('passage title', v.passageTitle), ...textProblems('passage text', v.passageText), ...textProblems('passage question', v.question))
      break
    case 'wordProblem':
      errs.push(...textProblems('story text', v.text))
      break
    case 'array':
      if (v.label !== undefined) errs.push(...textProblems('array label', v.label))
      break
    case 'barGraph':
      if (v.title !== undefined) errs.push(...textProblems('graph title', v.title))
      if (v.unit !== undefined) errs.push(...textProblems('graph unit', v.unit))
      for (const b of v.bars) {
        errs.push(...textProblems('bar label', b.label))
        if (!Number.isInteger(b.value) || b.value <= 0) errs.push(`bar ${b.label} has value ${b.value}`)
      }
      if (new Set(v.bars.map((b) => b.label)).size !== v.bars.length) errs.push('bar labels repeat')
      break
  }
  return errs
}

/** Prompt, options, answer, hint and visual are clean, and the choice is fair. */
function genericProblems(p: Problem, multipleChoice: boolean): string[] {
  const errs = [...textProblems('prompt', p.prompt), ...visualTextProblems(p.visual)]
  if (p.hint !== undefined) errs.push(...textProblems('hint', p.hint))
  if (p.explanation !== undefined) errs.push(...textProblems('explanation', p.explanation))
  if (!multipleChoice) return errs
  if (p.options.length < 2 || p.options.length > 6) errs.push(`${p.options.length} options`)
  if (new Set(p.options.map(String)).size !== p.options.length) errs.push(`duplicate options ${JSON.stringify(p.options)}`)
  if (p.options.filter((o) => o === p.answer).length !== 1) errs.push(`answer ${JSON.stringify(p.answer)} is not exactly once in ${JSON.stringify(p.options)}`)
  if (p.options.filter((o) => String(o) === String(p.answer)).length !== 1) errs.push('answer matches more than one option as text')
  for (const o of [...p.options, p.answer]) {
    if (typeof o === 'number') {
      if (!Number.isFinite(o)) errs.push(`option ${o} is not finite`)
      else if (o < 0) errs.push(`option ${o} is negative`)
    } else {
      errs.push(...textProblems('option', o))
    }
  }
  return errs
}

// ── independent answers ──────────────────────────────────────────────────────

const PLACE = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands']
const NEAREST: Record<string, number> = { ten: 10, hundred: 100, thousand: 1000 }

/** "12,345" → 12345, but only when the grouping is the US one (no "12.345" / "12 345"). */
function usNumber(s: string): number {
  const n = Number(s.replace(/,/g, ''))
  return n.toLocaleString('en-US') === s ? n : NaN
}

const clock = (mins: number) => {
  const t = ((mins % 720) + 720) % 720
  return `${Math.floor(t / 60) || 12}:${String(t % 60).padStart(2, '0')}`
}
const dollars = (cents: number) => `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`

function arrayIs(p: Problem, rows: number, cols: number): string[] {
  const v = p.visual
  if (v?.kind !== 'array') return ['expected an array visual']
  return v.rows === rows && v.cols === cols ? [] : [`array is ${v.rows}×${v.cols}, prompt says ${rows}×${cols}`]
}

/** Recompute the answer (and cross-check the visual) from the problem's own data. */
function answerProblems(config: ProviderConfig, grade: GradeLevel, p: Problem): string[] {
  const errs: string[] = []
  const expectAnswer = (want: unknown) => {
    if (p.answer !== want) errs.push(`answer is ${JSON.stringify(p.answer)}, should be ${JSON.stringify(want)}`)
  }
  const inRange = (what: string, n: number, lo: number, hi: number) => {
    if (!(n >= lo && n <= hi)) errs.push(`${what} ${n} outside [${lo}, ${hi}]`)
  }
  const match = (re: RegExp) => {
    const m = re.exec(p.prompt)
    if (!m) errs.push(`prompt doesn't read as ${config.kind}: "${p.prompt}"`)
    return m
  }

  switch (config.kind) {
    case 'multiplication': {
      const m = match(/^(\d+) × (\d+) = \?$/)
      if (!m) break
      const [a, b] = [Number(m[1]), Number(m[2])]
      inRange('factor', a, config.factorMin, config.factorMax)
      inRange('factor', b, config.factorMin, config.factorMax)
      expectAnswer(a * b)
      errs.push(...arrayIs(p, a, b))
      // the skip-count hint lands on the product
      const counts = /: ([\d, ]+)$/.exec(p.hint ?? '')?.[1].split(', ').map(Number) ?? []
      if (counts[counts.length - 1] !== a * b) errs.push(`hint skip-count ends at ${counts[counts.length - 1]}: "${p.hint}"`)
      break
    }
    case 'division': {
      const m = match(/^(\d+) ÷ (\d+) = \?$/)
      if (!m) break
      const [dividend, divisor] = [Number(m[1]), Number(m[2])]
      inRange('divisor', divisor, config.divisorMin, config.divisorMax)
      inRange('quotient', dividend / divisor, config.quotientMin, config.quotientMax)
      expectAnswer(dividend / divisor)
      errs.push(...arrayIs(p, divisor, dividend / divisor))
      if (p.visual?.kind === 'array' && p.visual.label?.includes('×')) errs.push(`array caption prints the fact: ${p.visual.label}`)
      if (!p.hint?.includes(`${divisor} × what = ${dividend}`)) errs.push(`hint doesn't ask for the missing factor: "${p.hint}"`)
      break
    }
    case 'fractionEquivalence': {
      const m = match(/^(\d+)\/(\d+) = \?\/(\d+)$/)
      if (!m) break
      const [n, d, target] = [Number(m[1]), Number(m[2]), Number(m[3])]
      inRange('numerator', n, 1, d - 1)
      if (target % d !== 0 || target <= d) errs.push(`${target} is not a bigger multiple of ${d}`)
      inRange('target denominator', target, 4, config.maxDenominator)
      expectAnswer((n * target) / d)
      if (p.visual?.kind !== 'fraction' || p.visual.numerator !== n || p.visual.denominator !== d) errs.push(`fraction visual doesn't show ${n}/${d}`)
      if (p.hint !== `Multiply top and bottom by ${target / d}.`) errs.push(`hint names the wrong multiplier: "${p.hint}"`)
      break
    }
    case 'fractionCompare': {
      const m = match(/^(\d+)\/(\d+) \? (\d+)\/(\d+)$/)
      if (!m) break
      const [n1, d1, n2, d2] = m.slice(1).map(Number)
      for (const [n, d] of [[n1, d1], [n2, d2]]) {
        inRange('denominator', d, 2, config.maxDenominator)
        inRange('numerator', n, 1, d - 1)
      }
      const cmp = n1 * d2 - n2 * d1
      expectAnswer(cmp < 0 ? '<' : cmp > 0 ? '>' : '=')
      if ([...p.options].sort().join('') !== '<=>') errs.push(`options ${JSON.stringify(p.options)}`)
      const v = p.visual
      if (v?.kind !== 'fractionCompare' || v.a.numerator !== n1 || v.a.denominator !== d1 || v.b.numerator !== n2 || v.b.denominator !== d2) {
        errs.push('comparison visual disagrees with the prompt')
      }
      if (p.hint?.startsWith('Same denominator') !== (d1 === d2)) errs.push(`hint doesn't fit the pair: "${p.hint}"`)
      break
    }
    case 'placeValueIdentify': {
      const m = match(/^In ([\d,]+), what is the VALUE of the (ones|tens|hundreds|thousands|ten thousands) digit\?$/)
      if (!m) break
      const n = usNumber(m[1])
      const place = PLACE.indexOf(m[2])
      if (Number.isNaN(n)) errs.push(`number isn't written the US way: ${m[1]}`)
      inRange('number', n, 100, config.maxPlace - 1)
      if (10 ** place > n) errs.push(`${n} has no ${m[2]} digit`)
      const digit = Math.floor(n / 10 ** place) % 10
      expectAnswer(digit * 10 ** place)
      if (p.hint !== `The ${m[2]} digit is ${digit}, so its value is ${digit} × ${10 ** place}.`) errs.push(`hint: "${p.hint}"`)
      break
    }
    case 'placeValueRounding': {
      const m = match(/^Round ([\d,]+) to the nearest (ten|hundred|thousand)\.$/)
      if (!m) break
      const n = usNumber(m[1])
      const to = NEAREST[m[2]]
      if (Number.isNaN(n)) errs.push(`number isn't written the US way: ${m[1]}`)
      if (to !== config.roundTo) errs.push(`rounds to ${to}, stage asks for ${config.roundTo}`)
      inRange('number', n, Math.max(10, to), config.maxPlace - 1)
      expectAnswer(Math.floor(n / to + 0.5) * to) // half rounds up
      for (const o of p.options) if (typeof o !== 'number' || o % to !== 0 || o <= 0) errs.push(`option ${o} isn't a positive multiple of ${to}`)
      break
    }
    case 'measurement': {
      if (p.topic === 'measurement-area' || p.topic === 'measurement-perimeter') {
        const m = match(/^A rectangle is (\d+) units wide and (\d+) units tall\. What is its (area|perimeter)\?$/)
        if (!m) break
        const [w, h] = [Number(m[1]), Number(m[2])]
        if (`measurement-${m[3]}` !== p.topic) errs.push(`asks for ${m[3]} on a ${p.topic} problem`)
        expectAnswer(m[3] === 'area' ? w * h : 2 * (w + h))
        if (p.visual?.kind !== 'shape' || p.visual.width !== w || p.visual.height !== h) errs.push('shape visual disagrees with the prompt')
      } else if (p.topic === 'measurement-time') {
        const m = match(/^It is (\d+):(\d{2})\. What time will it be in (?:(\d+) (hours?) and )?(\d+) minutes\?$/)
        if (!m) break
        const [h, min, eh, unit, em] = [Number(m[1]), Number(m[2]), Number(m[3] ?? 0), m[4], Number(m[5])]
        inRange('start hour', h, 1, 12)
        if (unit && (unit === 'hour') !== (eh === 1)) errs.push(`"${eh} ${unit}"`)
        expectAnswer(clock(h * 60 + min + eh * 60 + em))
        if (p.visual?.kind !== 'clock' || p.visual.hour !== h || p.visual.minute !== min) errs.push('clock visual disagrees with the prompt')
        for (const o of p.options) if (!/^(1[0-2]|[1-9]):[0-5]\d$/.test(String(o))) errs.push(`option ${o} isn't a clock time`)
        if (/\b0 hours?\b|\b1 hours\b/.test(p.hint ?? '')) errs.push(`hint: "${p.hint}"`)
      } else if (p.topic === 'measurement-money') {
        const m = match(/^Something costs \$(\d+)\.(\d{2})\. You pay with \$(\d+)\. How much change do you get\?$/)
        if (!m) break
        const cost = Number(m[1]) * 100 + Number(m[2])
        const paid = Number(m[3]) * 100
        if (paid <= cost) errs.push(`paying ${paid}¢ for ${cost}¢`)
        expectAnswer(dollars(paid - cost))
        if (p.visual?.kind !== 'money' || p.visual.cents !== cost) errs.push('money visual disagrees with the price')
        for (const o of p.options) if (!/^\$\d+\.\d{2}$/.test(String(o)) || String(o) === '$0.00') errs.push(`option ${o} isn't an amount of change`)
      } else {
        errs.push(`unknown measurement topic ${p.topic}`)
      }
      break
    }
    case 'wordProblem': {
      const nums = (p.prompt.match(/\d+/g) ?? []).map(Number)
      if (nums.length !== 2) {
        errs.push(`story should state exactly two numbers: "${p.prompt}"`)
        break
      }
      const [a, b] = nums
      const want: Record<string, number> = {
        'word-problem-addition': a + b,
        'word-problem-subtraction': a - b,
        'word-problem-multiplication': a * b,
        'word-problem-division': a / b,
      }
      if (!(p.topic in want)) errs.push(`unknown word-problem topic ${p.topic}`)
      expectAnswer(want[p.topic])
      if (!Number.isInteger(p.answer) || Number(p.answer) <= 0) errs.push(`answer ${p.answer} isn't a counting number`)
      // grade band: 2nd grade adds/subtracts, 3rd/4th multiply/divide
      const g2 = p.topic === 'word-problem-addition' || p.topic === 'word-problem-subtraction'
      if (g2 !== (config.topic === 'addSubtract')) errs.push(`${p.topic} served for topic ${config.topic}`)
      if (g2 && Number(p.answer) > 100) errs.push(`grade-2 answer ${p.answer} is over 100`)
      if (p.visual?.kind !== 'wordProblem' || p.visual.text !== p.prompt) errs.push('story visual disagrees with the prompt')
      break
    }
    case 'multiplicationGrove': {
      const nums = (p.prompt.match(/\d+/g) ?? []).map(Number)
      if (p.visual?.kind !== 'array') {
        errs.push('expected an array visual')
        break
      }
      const { rows, cols } = p.visual
      if (nums[0] !== rows || nums[1] !== cols) errs.push(`prompt says ${nums.join('×')}, array is ${rows}×${cols}`)
      expectAnswer(rows * cols)
      inRange('factor', Math.max(rows, cols), 2, groveMaxFactor(grade))
      if (nums.includes(rows * cols)) errs.push('prompt prints the total')
      break
    }
    case 'scienceCycle':
      if (!(PROCESSES as readonly string[]).includes(String(p.answer))) errs.push(`answer ${p.answer} isn't a process`)
      if ([...p.options].sort().join() !== [...PROCESSES].sort().join()) errs.push(`options ${JSON.stringify(p.options)}`)
      if (!/\?|___/.test(p.prompt)) errs.push(`situation never asks anything: "${p.prompt}"`)
      break
    case 'dataGraph': {
      if (p.visual?.kind !== 'barGraph') {
        errs.push('expected a bar graph')
        break
      }
      const solved = solveGraph(p.prompt, p.visual.bars)
      if (solved.error) errs.push(`${solved.error}: "${p.prompt}"`)
      else expectAnswer(solved.answer)
      if (config.level === 2 && p.visual.bars.length > 4) errs.push('grade-2 graphs have at most 4 categories')
      break
    }
    case 'readingComprehension':
    case 'science':
      if (p.visual?.kind !== 'passage') errs.push('expected a passage')
      else if (p.visual.question !== p.prompt) errs.push('passage question differs from the prompt')
      break
    case 'geometry':
    case 'writingPrompt':
      break
  }
  return errs
}

// ── bar-graph solver: answers every question shape the bank uses ─────────────

const ALIAS: Record<string, string> = {
  mon: 'monday', tue: 'tuesday', wed: 'wednesday', thu: 'thursday', fri: 'friday', sat: 'saturday', sun: 'sunday',
  jan: 'january', feb: 'february', mar: 'march', apr: 'april', jun: 'june', jul: 'july', dec: 'december',
}

/** The words a question may use for a bar: its label, singular/plural, a spelled-out day or month, "Wk 2" → "week 2". */
function namesFor(label: string): string[] {
  const l = label.toLowerCase()
  const names = [l, l.endsWith('s') ? l.slice(0, -1) : `${l}s`]
  if (ALIAS[l]) names.push(ALIAS[l])
  const wk = /^wk (\d+)$/.exec(l)
  if (wk) names.push(`week ${wk[1]}`)
  return names
}

type Bar = { label: string; value: number }

function solveGraph(question: string, bars: Bar[]): { answer?: string; error?: string } {
  const q = question.toLowerCase()
  // bars the question names, in the order it names them
  const named = bars
    .map((b) => {
      const at = namesFor(b.label)
        .map((n) => q.search(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)))
        .filter((i) => i >= 0)
      return { b, at: at.length ? Math.min(...at) : -1 }
    })
    .filter((x) => x.at >= 0)
    .sort((x, y) => x.at - y.at)
    .map((x) => x.b)
  const sum = (bs: Bar[]) => bs.reduce((s, b) => s + b.value, 0)
  const extreme = (pick: (a: number, b: number) => number) => {
    const best = bars.reduce((m, b) => pick(m, b.value), bars[0].value)
    const hits = bars.filter((b) => b.value === best)
    return hits.length === 1 ? { answer: hits[0].label } : { error: 'tie for the extreme bar' }
  }

  if (/\baverage\b/.test(q)) {
    const avg = sum(bars) / bars.length
    return Number.isInteger(avg) ? { answer: String(avg) } : { error: 'average is not whole' }
  }
  const unit = /each bar unit is (\d+)/.exec(q)
  if (unit) return named.length === 1 ? { answer: String(named[0].value * Number(unit[1])) } : { error: 'scaled read needs one bar' }
  if (/how (many|much) (more|fewer|farther)\b/.test(q)) {
    if (named.length !== 2) return { error: `difference names ${named.length} bars` }
    const [x, y] = named
    const diff = /\bfewer\b/.test(q) ? y.value - x.value : x.value - y.value
    return diff > 0 ? { answer: String(diff) } : { error: 'difference is not positive' }
  }
  if (/\btogether\b/.test(q)) return named.length >= 2 ? { answer: String(sum(named)) } : { error: '"together" names fewer than 2 bars' }
  if (/\b(in total|in all|all three|across all)\b/.test(q)) return { answer: String(sum(bars)) }
  if (!/^how many/.test(q)) {
    const who = /\b(\d+)\b/.exec(q)
    if (who) {
      const hits = bars.filter((b) => b.value === Number(who[1]))
      return hits.length === 1 ? { answer: hits[0].label } : { error: `no single bar reaches ${who[1]}` }
    }
    if (/\b(most|tallest|biggest)\b/.test(q)) return extreme(Math.max)
    if (/\b(fewest|shortest|least)\b/.test(q)) return extreme(Math.min)
  }
  if (/^how many/.test(q) && named.length === 1) return { answer: String(named[0].value) }
  return { error: 'the solver cannot read this question' }
}

// ── the suite ────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.restoreAllMocks()
})

async function fuzz(c: Case): Promise<string[]> {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(`content-fuzz:${c.label}`))
  const provider = c.make()
  const failures: string[] = []
  const mc = c.config.kind !== 'writingPrompt'
  for (let i = 0; i < DRAWS && failures.length < 12; i++) {
    const p = c.draw ? await c.draw(provider, i) : await nextProblem(provider)
    const errs = [...genericProblems(p, mc), ...answerProblems(c.config, c.grade, p)]
    for (const e of errs) failures.push(`${e}\n    ↳ ${p.prompt} | ${JSON.stringify(p.options)} → ${JSON.stringify(p.answer)}`)
  }
  return [...new Set(failures)]
}

describe('content fuzz: every stage × grade', () => {
  it.each(stageCases().map((c) => [c.label, c]))('%s', async (_label, c) => {
    expect(await fuzz(c as Case)).toEqual([])
  })
})

describe('content fuzz: mini-game fact sources', () => {
  it.each(arenaCases().map((c) => [c.label, c]))('%s', async (_label, c) => {
    expect(await fuzz(c as Case)).toEqual([])
  })
})

describe('place-value numbers on a non-US tablet', () => {
  it('still group digits the US way (12,345 — never the German 12.345)', async () => {
    const native = Number.prototype.toLocaleString
    vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(function (this: number, locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions) {
      return native.call(this, locales ?? 'de-DE', options)
    })
    const configs: ProviderConfig[] = [
      { kind: 'placeValueIdentify', maxPlace: 100000 },
      { kind: 'placeValueRounding', maxPlace: 100000, roundTo: 1000 },
    ]
    for (const config of configs) {
      const provider = createProvider(config)
      for (let i = 0; i < 50; i++) {
        const { prompt } = await nextProblem(provider)
        expect(prompt).toMatch(/\d,\d{3}\b/)
        expect(prompt).not.toMatch(/\d[.\s]\d{3}\b/) // \s covers the French/Swiss no-break spaces too
      }
    }
  })
})

describe('bar-graph solver', () => {
  const bars = [
    { label: 'Mon', value: 7 },
    { label: 'Tue', value: 12 },
    { label: 'Wed', value: 9 },
  ]
  it('reads the question shapes the bank uses', () => {
    expect(solveGraph('Which day had the MOST laps?', bars)).toEqual({ answer: 'Tue' })
    expect(solveGraph('On which day were the FEWEST laps run?', bars)).toEqual({ answer: 'Mon' })
    expect(solveGraph('How many laps were run on Wednesday?', bars)).toEqual({ answer: '9' })
    expect(solveGraph('How many MORE laps on Tuesday than Monday?', bars)).toEqual({ answer: '5' })
    expect(solveGraph('How many FEWER laps on Monday than Wednesday?', bars)).toEqual({ answer: '2' })
    expect(solveGraph('How many laps on Monday and Wednesday TOGETHER?', bars)).toEqual({ answer: '16' })
    expect(solveGraph('How many laps were run across all THREE days?', bars)).toEqual({ answer: '28' })
    expect(solveGraph('On which day were 9 laps run?', bars)).toEqual({ answer: 'Wed' })
    expect(solveGraph('If each bar unit is 10 laps, how many laps were run on Tuesday?', bars)).toEqual({ answer: '120' })
  })
  it('refuses questions it cannot read instead of guessing', () => {
    expect(solveGraph('What is the weather like?', bars).error).toBeDefined()
    expect(solveGraph('Which day was best?', [{ label: 'A', value: 2 }, { label: 'B', value: 2 }]).error).toBeDefined()
  })
})
