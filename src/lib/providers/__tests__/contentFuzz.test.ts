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
import { CHARTS, chartQuestions } from '../dataGraph'
import { arenaFactConfig, warmFactConfig } from '../../arena/divisionCore'
import { forgeFactConfig } from '../../forge/fractionCore'
import { groveMaxFactor } from '../../grove/groveCore'
import { PROCESSES } from '../../cycle/cycleCore'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { isSolidShape, shapeSides } from '../../../games/listenPlay/shapeGeometry'
import { glyph } from '../../trace/glyphs'
import { isTraceSpec } from '../../trace/spec'
import { isOrderSpec, STORY_PICTURES } from '../kStories'
import { isMathStorySpec } from '../../../games/listenPlay/activities/mathStorySpec'
import { answerOf, isNumberSpec, type NumberActivitySpec } from '../../../games/listenPlay/activities/numberSpecs'
import { K_PAIRS } from '../../../voice/packs/k-compare'
import { isMeasureSpec } from '../kMeasure'
import { boxCounts, isSortSpec, mostBox } from '../kSort'
import { K_TOWERS_MAX } from '../kTowers'
import { K_ACTIONS, K_FOOD, K_GEAR, K_HOME_OF, type KAction, type KGear } from '../kScience'
import { DRAWINGS } from '../../../games/listenPlay/drawings'
// 1st grade (phase 2b): Measure Marsh, Graph Delta, Sky Summit
import { digital, isClockSpec, isLengthOrderSpec, isUnitsSpec, orderOf, sameTime } from '../g1Measure'
import { asksRow, graphAnswer, isGraphSpec } from '../g1Graphs'

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
      const m = match(/^(\d+)\/(\d+) = ([?\d]+)\/([?\d]+)$/)
      if (!m) break
      const [n, d] = [Number(m[1]), Number(m[2])]
      inRange('numerator', n, 1, d - 1)
      const visualOk = p.visual?.kind === 'fraction' && p.visual.numerator === n && p.visual.denominator === d
      if (!visualOk) errs.push(`fraction visual doesn't show ${n}/${d}`)
      if ((m[3] === '?') === (m[4] === '?')) {
        errs.push(`exactly one side must be blank: "${p.prompt}"`)
        break
      }
      if (m[3] === '?') {
        // blank top: answer = n·k where the shown denominators set the scale
        const shown = Number(m[4])
        const a = Number(p.answer)
        if (!Number.isInteger(a) || !Number.isFinite(a)) {
          errs.push(`answer ${p.answer} isn't a whole number`)
          break
        }
        if (shown === d) errs.push(`blank side equals the base: "${p.prompt}"`)
        if (shown > d) {
          inRange('target denominator', shown, 4, config.maxDenominator)
          if (shown % d !== 0) errs.push(`${shown} is not a bigger multiple of ${d}`)
          expectAnswer((n * shown) / d)
          if (p.hint !== `Multiply top and bottom by ${shown / d}.`) errs.push(`hint names the wrong multiplier: "${p.hint}"`)
        } else {
          inRange('target denominator', shown, 2, config.maxDenominator)
          if (d % shown !== 0) errs.push(`${d} isn't divisible by ${shown}: "${p.prompt}"`)
          expectAnswer((n * shown) / d)
          if (p.hint !== `Divide top and bottom by ${d / shown}.`) errs.push(`hint names the wrong divisor: "${p.hint}"`)
        }
      } else {
        // blank bottom: a = c·d/n must hold exactly and keep both fractions proper
        const c = Number(m[3])
        const a = Number(p.answer)
        if (!Number.isInteger(a) || !Number.isFinite(a)) {
          errs.push(`answer ${p.answer} isn't a whole denominator`)
          break
        }
        inRange('answer denominator', a, 2, config.maxDenominator)
        if (c * d !== a * n) errs.push(`${n}/${d} = ${c}/${a} is not a true equivalence`)
        if (c === n) errs.push(`blank side just repeats the top: "${p.prompt}"`)
        if (c >= a) errs.push(`shown fraction ${c}/${a} is not proper`)
        if (a > d) {
          if (!Number.isInteger(a / d) || p.hint !== `Multiply top and bottom by ${a / d}.`) errs.push(`hint doesn't name the multiplier: "${p.hint}"`)
        } else if (a < d) {
          if (!Number.isInteger(n / c) || p.hint !== `Divide top and bottom by ${n / c}.`) errs.push(`hint doesn't name the divisor: "${p.hint}"`)
        } else {
          errs.push(`blank side equals the base: "${p.prompt}"`)
        }
      }
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
    case 'kCounting':
    case 'kShapes':
    case 'kLetters':
      // (Count with me's last question is a trace: answered by the activity, not a card)
      errs.push(...((p as ListenProblem).activity ? activityProblems(p as ListenProblem) : kAnswerProblems(config, p as ListenProblem)))
      break
    case 'kTrace':
    case 'kStories':
      errs.push(...activityProblems(p as ListenProblem))
      break
    // (K complete, phase 2a: Add-and-Take Falls and Story Woods, the `mathStory` activity)
    case 'kAddTake':
    case 'kStoryMath':
      errs.push(...mathStoryProblems(config, p as ListenProblem))
      break
    // (K complete, phase 2a: Number Dunes and Ten Frame Plateau, answered through the number activities)
    case 'kCompare':
    case 'kTeens':
      errs.push(...numberActivityProblems(config.kind, p as ListenProblem))
      break
    // K complete (phase 2a): answered by the measure and sort activities
    case 'kMeasure':
    case 'kSort':
      errs.push(...activityProblems(p as ListenProblem))
      break
    // Counting Towers: Counting Mesa's question shapes, in the stage's range
    case 'kTowers':
      errs.push(...kAnswerProblems({ kind: 'kCounting', min: 1, max: K_TOWERS_MAX[config.mode] }, p as ListenProblem))
      break
    case 'kScience':
      errs.push(...kScienceProblems(p as ListenProblem))
      break
    // 1st grade (phase 2b): Measure Marsh, Graph Delta, Sky Summit (each has its own deeper suite: g1*.test.ts)
    case 'g1Measure':
    case 'g1Graphs':
    case 'g1Science':
      errs.push(...g1Problems(p as ListenProblem))
      break
  }
  return errs
}

// ── 1st grade (Measure Marsh, Graph Delta, Sky Summit): the answer, from the question's own data ──

function g1Problems(p: ListenProblem): string[] {
  const a = p.activity
  const errs: string[] = []
  const want = (x: unknown) => {
    if (p.answer !== x) errs.push(`answer is ${JSON.stringify(p.answer)}, the question says ${JSON.stringify(x)}`)
  }
  if (isLengthOrderSpec(a)) want(a.mode === 'order' ? orderOf(a.sizes, a.ask).join('-') : String(a.answer[0]))
  else if (isUnitsSpec(a)) {
    want(a.n)
    if (a.cards.filter((c) => c === a.n).length !== 1) errs.push(`the cards ${a.cards.join(',')} don't hold ${a.n} once`)
  } else if (isClockSpec(a)) {
    want(digital(a.time))
    if (a.cards.filter((c) => sameTime(c, a.time)).length !== 1) errs.push('the right time is not on exactly one card')
  } else if (isGraphSpec(a)) {
    const n = graphAnswer(a)
    want(asksRow(a) ? a.rows[n] : n)
    if (!asksRow(a) && a.cards?.filter((c) => c === n).length !== 1) errs.push(`the cards ${a.cards?.join(',')} don't hold ${n} once`)
  } else if (a) errs.push(`unknown 1st-grade activity ${a.kind}`)
  else {
    const cards = p.pictureOptions ?? []
    if (cards.length !== p.options.length || cards.some((c, i) => c.value !== p.options[i])) errs.push("picture cards don't match the options")
    for (const c of [p.picture, ...cards.map((x) => x.picture)]) if (c?.kind === 'art' && !DRAWINGS[c.name]) errs.push(`no drawing "${c.name}"`)
  }
  return errs
}

// ── K–1 story math (Add-and-Take Falls, Story Woods): the answer, worked out from what is SAID ──

function mathStoryProblems(config: Extract<ProviderConfig, { kind: 'kAddTake' | 'kStoryMath' }>, p: ListenProblem): string[] {
  const s = p.activity
  if (!isMathStorySpec(s)) return [`not a mathStory question: ${JSON.stringify(s)}`]
  const errs: string[] = []
  const want = (n: number) => {
    if (p.answer !== n) errs.push(`answer is ${JSON.stringify(p.answer)}, the story says ${n}`)
  }
  const cards = p.pictureOptions ?? []
  if (cards.length !== 3 || cards.some((c, i) => c.value !== p.options[i] || c.picture.kind !== 'numeral')) errs.push('three numeral cards, one per option')
  if (p.options.filter((o) => o === p.answer).length !== 1) errs.push('the answer is not exactly one card')
  for (const o of p.options) if (!(Number.isInteger(o) && (o as number) >= 1 && (o as number) <= 10)) errs.push(`card ${o} is not 1–10`)
  const word = (x: string | undefined) => (x === undefined ? NaN : /^one$/i.test(x) ? 1 : Number(x))
  if (config.kind === 'kAddTake') {
    const a = word(/^Here (?:are (\d+)|is (one)) \w+\./.exec(p.prompt)?.slice(1).find(Boolean))
    if (Number.isNaN(a)) return [...errs, `no start in "${p.prompt}"`]
    if (/How many more make ten\?$/.test(p.prompt)) {
      if (config.mode !== 'make10') errs.push(`make ten in ${config.mode}`)
      want(10 - a)
    } else {
      const join = /(\d+|One) more \w+ in\./.exec(p.prompt)
      const leave = /(\d+|One) \w+ away\./.exec(p.prompt)
      const b = word((join ?? leave)?.[1])
      if (Number.isNaN(b)) return [...errs, `no change in "${p.prompt}"`]
      if (join && !/How many now\?$/.test(p.prompt)) errs.push('joining, but not asked how many now')
      if (leave && !/How many are left\?$/.test(p.prompt)) errs.push('leaving, but not asked how many are left')
      want(join ? a + b : a - b)
      const top = join ? a + b : a
      if (top > (config.mode === 'within5' ? 5 : 10)) errs.push(`${top} is past the stage's ${config.mode}`)
    }
    if (s.a !== a) errs.push(`the scene starts with ${s.a}, the voice says ${a}`)
  } else {
    const [a, b] = (p.prompt.match(/\d+/g) ?? []).map(Number)
    if (s.a !== a || s.b !== b) errs.push(`the scene shows ${s.a} and ${s.b}, the story says ${a} and ${b}`)
    if (!(config.plots as readonly string[] | undefined)?.includes(s.plot)) errs.push(`a ${s.plot} story in a stage of ${config.plots}`)
    want(s.plot === 'join' || s.plot === 'together' ? a + b : a - b)
    if ((s.plot === 'compare') !== /How many more /.test(p.prompt)) errs.push(`"how many more" for a ${s.plot} story`)
    if (!s.act) errs.push('a Story Woods story with nothing to act out')
  }
  return errs
}

// ── K–1 number activities (Number Dunes, Ten Frame Plateau) ──────────────────

function numberActivityProblems(kind: 'kCompare' | 'kTeens', p: ListenProblem): string[] {
  const a = p.activity
  if (!isNumberSpec(a)) return [`not a number activity: ${JSON.stringify(a)}`]
  const s: NumberActivitySpec = a
  const errs: string[] = []
  if (p.answer !== answerOf(s)) errs.push(`answer ${JSON.stringify(p.answer)}, the activity says ${JSON.stringify(answerOf(s))}`)
  const whole = (n: number, lo: number, hi: number, what: string) => {
    if (!(Number.isInteger(n) && n >= lo && n <= hi)) errs.push(`${what} ${n} outside [${lo}, ${hi}]`)
  }
  const fairCards = (cards: readonly number[], lo: number, hi: number) => {
    if (cards.length < 2 || cards.length > 3) errs.push(`${cards.length} cards`)
    if (new Set(cards).size !== cards.length) errs.push(`duplicate cards ${JSON.stringify(cards)}`)
    if (cards.filter((c) => c === p.answer).length !== 1) errs.push(`answer ${p.answer} is not on exactly one card ${JSON.stringify(cards)}`)
    cards.forEach((c) => whole(c, lo, hi, 'card'))
  }
  if (kind === 'kCompare') {
    // within 10 (K.CC.6–7)
    switch (s.kind) {
      case 'matchRows':
        if (!K_PAIRS.some((x) => x.id === s.pair)) errs.push(`no pair ${s.pair}`)
        whole(s.top, 1, 10, 'top row')
        whole(s.bottom, 1, 10, 'bottom row')
        break
      case 'compareNumbers':
        fairCards(s.cards, 1, 10)
        if (s.ask === 'more' || s.ask === 'less') {
          if (s.a === s.b) errs.push('the same number twice')
          if (JSON.stringify(s.cards) !== JSON.stringify([s.a, s.b])) errs.push('the cards are not in the order said')
        } else {
          whole(s.a, s.ask === 'oneMore' ? 1 : 2, s.ask === 'oneMore' ? 9 : 10, 'dots')
          if (!s.cards.includes(s.a) && !s.cards.includes(s.a + (s.ask === 'oneMore' ? 2 : -2))) errs.push('no near miss among the cards')
        }
        break
      case 'numberOrder': {
        const n = s.numbers
        if (n.length < 3 || n.length > 5) errs.push(`${n.length} numbers to order`)
        n.forEach((v, i) => {
          whole(v, 1, 10, 'number')
          if (i && v !== n[i - 1] + 1) errs.push(`not counting order ${JSON.stringify(n)}`)
        })
        if ([...s.mixed].sort().join() !== n.map((_, i) => i).join() || s.mixed.every((x, i) => x === i)) errs.push(`mixed ${JSON.stringify(s.mixed)} isn't a real mix-up`)
        break
      }
      default:
        errs.push(`Number Dunes asks a ${s.kind}`)
    }
  } else {
    // teen numbers to 20 (K.NBT.1, K.CC.2)
    switch (s.kind) {
      case 'teenFrames':
        whole(s.n, 11, 20, 'the number')
        fairCards(s.cards, 1, 20)
        break
      case 'buildTeen':
        whole(s.n, 11, 20, 'the number to make')
        break
      default:
        errs.push(`Ten Frame Plateau asks a ${s.kind}`)
    }
  }
  return errs
}

// ── K–1 Nature Summit: the answer, worked out from what is shown and said ────

function kScienceProblems(p: ListenProblem): string[] {
  const errs: string[] = []
  const cards = p.pictureOptions ?? []
  if (cards.length !== p.options.length || cards.some((c, i) => c.value !== p.options[i])) return ['picture cards don\'t match the options']
  for (const pic of [p.picture, ...cards.map((c) => c.picture)]) if (pic?.kind === 'art' && !DRAWINGS[pic.name]) errs.push(`no drawing "${pic.name}"`)
  const vals = p.options.map(String)
  const animal = /^The (\w+) /.exec(p.prompt)?.[1] ?? ''
  const right: Record<string, (v: string) => boolean> = {
    whichWeather: (v) => p.prompt === `Tap the ${v} day.`,
    wear: (v) => p.picture?.kind === 'art' && K_GEAR[v as KGear] === p.picture.name,
    plant: (v) => v === 'sun' || v === 'water',
    food: (v) => K_FOOD[animal as keyof typeof K_FOOD]?.name === v,
    drink: (v) => v === 'water',
    home: (v) => K_HOME_OF[animal as keyof typeof K_HOME_OF]?.home === v,
    pushOrPull: (v) => p.picture?.kind === 'art' && K_ACTIONS[p.picture.name as KAction] === v,
    tapAction: (v) => K_ACTIONS[v as KAction] === (p.prompt === 'Tap the push!' ? 'push' : 'pull'),
    strength: (v) => v === (p.prompt.includes('far') ? 'bigPush' : 'littlePush'),
  }
  const ok = right[p.subtopic ?? '']
  if (!ok) return [`unknown science question ${p.subtopic}`]
  const hits = vals.filter(ok)
  if (hits.length !== 1) errs.push(`${hits.length} cards answer "${p.prompt}"`)
  else if (hits[0] !== p.answer) errs.push(`answer is ${JSON.stringify(p.answer)}, the pictures say ${hits[0]}`)
  return errs
}

// ── K–1 activities (answered by doing: tracing, story order) ─────────────────

function activityProblems(p: ListenProblem): string[] {
  const a = p.activity
  if (isTraceSpec(a)) {
    let g: ReturnType<typeof glyph>
    try {
      g = glyph(a.glyph, a.id)
    } catch {
      return [`no ${a.glyph} glyph "${a.id}" to trace`]
    }
    const errs = g.strokes.length ? [] : ['a glyph with no strokes']
    if (p.answer !== a.id) errs.push(`answer ${JSON.stringify(p.answer)} isn't the glyph ${a.id}`)
    return errs
  }
  if (isOrderSpec(a)) {
    const errs: string[] = []
    if (STORY_PICTURES[a.story]?.join('') !== a.pictures.join('')) errs.push(`story ${a.story} shows the wrong pictures`)
    if ([...a.mixed].sort().join('') !== '012' || a.mixed.join('') === '012') errs.push(`mixed ${JSON.stringify(a.mixed)} isn't a real mix-up`)
    if (p.answer !== a.pictures.join('')) errs.push('answer isn\'t the story order')
    return errs
  }
  if (isMeasureSpec(a)) {
    const errs: string[] = []
    if (a.attr === 'weight') {
      if (a.items?.length !== 2) errs.push('a scale needs two things')
    } else {
      const [x, y] = a.sizes ?? [0, 0]
      if (Math.abs(x - y) < 2) errs.push(`sizes ${x} and ${y} are too close to see`)
      const longer = x > y ? 0 : 1
      if (a.answer !== (a.ask === 'more' ? longer : 1 - longer)) errs.push(`the answer isn't the ${a.ask === 'more' ? 'longer' : 'shorter'} one`)
    }
    if (p.answer !== (a.answer === 0 ? 'first' : 'second')) errs.push(`answer ${JSON.stringify(p.answer)} isn't thing ${a.answer}`)
    return errs
  }
  if (isSortSpec(a)) {
    const errs: string[] = []
    const counts = boxCounts(a)
    if (counts.some((n) => n < 1)) errs.push(`an empty box: ${counts.join('-')}`)
    if (a.countCards.filter((n) => n === counts[a.countBox]).length !== 1) errs.push(`the count cards ${a.countCards.join(',')} don't hold ${counts[a.countBox]} once`)
    if (a.more && mostBox(a) === null) errs.push(`"which group has more?" with a tie: ${counts.join('-')}`)
    if (p.answer !== counts.join('-')) errs.push(`answer ${JSON.stringify(p.answer)} isn't the counts ${counts.join('-')}`)
    return errs
  }
  return [`unknown activity ${JSON.stringify(a)}`]
}

// ── K–1 (Listen & Play): the answer, worked out from the pictures ────────────

function kAnswerProblems(config: Extract<ProviderConfig, { kind: 'kCounting' | 'kShapes' | 'kLetters' }>, p: ListenProblem): string[] {
  const errs: string[] = []
  const cards = p.pictureOptions ?? []
  if (cards.length !== p.options.length || cards.some((c, i) => c.value !== p.options[i])) return ['picture cards don\'t match the options']
  const want = (a: unknown) => {
    if (p.answer !== a) errs.push(`answer is ${JSON.stringify(p.answer)}, the pictures say ${JSON.stringify(a)}`)
  }
  const count = (pic: unknown) => ((pic as { kind?: string; count?: number })?.kind === 'group' ? (pic as { count: number }).count : NaN)
  const numeral = (pic: unknown) => ((pic as { kind?: string; n?: number })?.kind === 'numeral' ? (pic as { n: number }).n : NaN)
  const shape = (pic: unknown) => ((pic as { kind?: string })?.kind === 'shape' ? (pic as { shape: Parameters<typeof shapeSides>[0] }).shape : null)
  const only = <T,>(xs: T[], what: string): T | undefined => {
    if (xs.length !== 1) errs.push(`${xs.length} cards are ${what}`)
    return xs[0]
  }
  switch (config.kind) {
    case 'kCounting': {
      const lo = config.min ?? 1
      const hi = config.max ?? 10
      const inRange = (n: number) => {
        if (!(n >= lo && n <= hi)) errs.push(`count ${n} outside [${lo}, ${hi}]`)
      }
      switch (p.subtopic) {
        case 'howMany':
          want(count(p.picture))
          inRange(count(p.picture))
          break
        case 'findGroup':
          want(numeral(p.picture))
          only(cards.filter((c) => count(c.picture) === numeral(p.picture)), `a group of ${numeral(p.picture)}`)
          inRange(numeral(p.picture))
          break
        case 'more':
        case 'fewer': {
          const ns = cards.map((c) => count(c.picture))
          want(p.subtopic === 'more' ? Math.max(...ns) : Math.min(...ns))
          if (ns[0] === ns[1]) errs.push('both groups are the same size')
          ns.forEach((n) => inRange(n))
          break
        }
        case 'same': {
          const [a, b] = (p.pair ?? []).map(count)
          want(a === b ? 'yes' : 'no')
          ;[a, b].forEach((n) => inRange(n))
          break
        }
        case 'bigger':
          want(Math.max(...cards.map((c) => numeral(c.picture))))
          break
        default:
          errs.push(`unknown counting question ${p.subtopic}`)
      }
      break
    }
    case 'kShapes': {
      const shapes = cards.map((c) => shape(c.picture))
      const named = /^Tap the (\w+)\.$/.exec(p.prompt)?.[1]
      switch (p.subtopic) {
        case 'name':
        case 'nameSolid':
          want(only(shapes.filter((s) => s === named), `a ${named}`))
          if (named === 'rectangle' && shapes.includes('square')) errs.push('a square beside "Tap the rectangle"')
          break
        case 'flat':
        case 'solid':
          want(only(shapes.filter((s) => s && isSolidShape(s) === (p.subtopic === 'solid')), p.subtopic))
          break
        case 'withSides': {
          const n = { three: 3, four: 4, six: 6 }[/with (\w+) sides/.exec(p.prompt)?.[1] ?? ''] ?? NaN
          want(only(shapes.filter((s) => s && shapeSides(s) === n), `${n}-sided`))
          break
        }
        case 'noCorners':
          want(only(shapes.filter((s) => s && !shapeSides(s) && !isSolidShape(s)), 'without corners'))
          break
        case 'howManySides':
          want(shapeSides(shape(p.picture) ?? 'circle'))
          break
        default:
          errs.push(`unknown shape question ${p.subtopic}`)
      }
      break
    }
    case 'kLetters': {
      const shown = cards.map((c) => (c.picture.kind === 'letter' ? c.picture.ch : c.picture.kind === 'emoji' ? String(c.value) : ''))
      if (p.prompt.startsWith('Tap the letter ')) want(only(shown.filter((c) => c === p.prompt.slice(15, 16)), 'that letter'))
      else if (p.prompt.startsWith('Find the little ')) {
        const l = p.prompt.slice(16, 17)
        if (p.picture?.kind !== 'letter' || p.picture.ch !== l.toUpperCase()) errs.push(`the big letter shown isn't ${l.toUpperCase()}`)
        want(only(shown.filter((c) => c === l), `a little ${l}`))
      } else {
        const L = /starts with ([A-Z])\?$/.exec(p.prompt)?.[1] ?? '?'
        want(only(shown.filter((w) => w[0]?.toUpperCase() === L), `a word starting with ${L}`))
      }
      break
    }
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
  for (let i = 0; i < DRAWS && failures.length < 12; i++) {
    const p = c.draw ? await c.draw(provider, i) : await nextProblem(provider)
    // (a question answered by an activity has no options to choose from)
    const mc = c.config.kind !== 'writingPrompt' && !(p as ListenProblem).activity
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
  it('answers every question of every chart in the bank, keyed to its own bars', () => {
    // charts may carry an inline question plus `questions` extras (see dataGraph.ts);
    // the solver must read ALL of them against the chart's own bars, key included.
    let checked = 0
    for (const c of CHARTS) {
      for (const q of chartQuestions(c)) {
        const solved = solveGraph(q.question, c.bars)
        expect(solved.error, `${c.title} (L${c.level}): "${q.question}" — ${solved.error ?? ''}`).toBeUndefined()
        expect(solved.answer, `${c.title} (L${c.level}): "${q.question}"`).toBe(q.answer)
        checked++
      }
    }
    expect(checked).toBeGreaterThanOrEqual(CHARTS.length)
  })
})
