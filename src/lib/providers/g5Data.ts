import type { Problem, ProblemProvider, ProblemVisual } from '../problem'
import { randInt, shuffle } from '../random'
import { mixedText, pair, pick, withDistractors } from './g5MgdKit'

/**
 * 5th-grade Data Delta:
 *
 * - `linePlot` (5.MD.2): a line plot of measurements in halves, fourths or
 *   eighths of a unit (the `linePlot` visual). Read it (how many, the most
 *   common, how many longer than…), find the spread and a group's total, and
 *   share all of it out equally. Every data set is built so its answers are
 *   whole ticks; answers are written in simplest form.
 * - `patterns` (5.OA.3): two patterns from 0 by "add a" and "add b" (b a
 *   multiple of a), their ordered pairs (A, B) and their graph (the
 *   `coordPlane` visual), and how B compares with A (B is m times A).
 * - `mixed`: the boss, both.
 *
 * Wrong options count tick marks as whole units, forget to divide, swap the
 * ordered pair, or see "add 4 more" where the rule is "times 3".
 */

export type G5DataMode = 'linePlot' | 'patterns' | 'mixed'
export interface G5DataConfig {
  mode: G5DataMode
}

export const G5_LINEPLOT_SKILL = { id: 'g5-lineplots', label: 'line plots with fractions' }
export const G5_PATTERN_SKILL = { id: 'g5-patterns', label: 'graphing number patterns' }

// ── line plots ───────────────────────────────────────────────────────────────

interface PlotContext {
  title: string
  /** The things measured: "sprouts". */
  things: string
  /** "How many sprouts were ___?" */
  were: string
  unit: string
  units: string
  d: 2 | 4 | 8
  /** The axis, in ticks of 1/d. */
  min: number
  max: number
  /** Shared out equally: "If all the water were poured out and shared equally, …" */
  share: string
  /** "the {most} and the {least}" */
  most: string
  least: string
}

const PLOTS: readonly PlotContext[] = [
  { title: 'Bean sprout heights', things: 'sprouts', were: 'tall', unit: 'inch', units: 'inches', d: 8, min: 0, max: 8, share: 'If the sprouts were cut and the pieces shared out so every sprout was the same height', most: 'tallest', least: 'shortest' },
  { title: 'Rain each day', things: 'days', were: 'of rain', unit: 'inch', units: 'inches', d: 4, min: 0, max: 8, share: 'If the same total rain had fallen evenly on each of those days', most: 'wettest day', least: 'driest day' },
  { title: 'Juice in each glass', things: 'glasses', were: 'full', unit: 'cup', units: 'cups', d: 4, min: 0, max: 6, share: 'If all the juice were poured together and shared equally among the glasses', most: 'fullest glass', least: 'emptiest glass' },
  { title: 'Caterpillar lengths', things: 'caterpillars', were: 'long', unit: 'inch', units: 'inches', d: 8, min: 8, max: 16, share: 'If the caterpillars could share their length equally', most: 'longest', least: 'shortest' },
  { title: 'Water in each beaker', things: 'beakers', were: 'full', unit: 'liter', units: 'liters', d: 8, min: 0, max: 8, share: 'If all the water were poured together and shared equally among the beakers', most: 'fullest beaker', least: 'emptiest beaker' },
  { title: 'Ribbon pieces', things: 'ribbons', were: 'long', unit: 'yard', units: 'yards', d: 4, min: 0, max: 8, share: 'If the ribbon were joined up and cut into equal pieces, one for each ribbon', most: 'longest', least: 'shortest' },
  { title: 'Pumpkin weights', things: 'pumpkins', were: 'heavy', unit: 'pound', units: 'pounds', d: 2, min: 4, max: 12, share: 'If the pumpkin weight were shared equally, one share per pumpkin', most: 'heaviest', least: 'lightest' },
]

/** A value in ticks of 1/d, as words for the question: "3/8 inch", "1 1/4 inches", "2 pounds". */
const amount = (t: number, c: PlotContext) => `${mixedText(t, c.d)} ${t <= c.d ? c.unit : c.units}`

interface Plot {
  c: PlotContext
  /** The measurements, in ticks of 1/d. */
  values: number[]
}

const countsOf = (p: Plot) => Array.from({ length: p.c.max - p.c.min + 1 }, (_, i) => p.values.filter((v) => v === p.c.min + i).length)
const linePlot = (p: Plot): ProblemVisual => ({ kind: 'linePlot', denominator: p.c.d, min: p.c.min, max: p.c.max, counts: countsOf(p), title: p.c.title, unit: p.c.units[0].toUpperCase() + p.c.units.slice(1) })

/** 8–13 measurements on 4–6 different ticks, with one most common value (and no tick piled past 5). */
function plotData(c: PlotContext): Plot {
  const span = c.max - c.min
  for (;;) {
    const kinds = randInt(4, Math.min(6, span))
    const ticks = shuffle(Array.from({ length: span - 1 }, (_, i) => c.min + 1 + i)).slice(0, kinds)
    const counts = ticks.map(() => randInt(1, 4))
    counts[randInt(0, kinds - 1)] = 5
    const top = Math.max(...counts)
    const n = counts.reduce((a, b) => a + b, 0)
    if (counts.filter((k) => k === top).length !== 1 || n < 8 || n > 13) continue
    return { c, values: ticks.flatMap((t, i) => Array.from({ length: counts[i] }, () => t)).sort((a, b) => a - b) }
  }
}

/** Measurements whose mean is a whole tick: pairs m − δ and m + δ around it (plus m if odd). */
function shareData(c: PlotContext): Plot & { mean: number } {
  for (;;) {
    const n = pick([4, 5, 6, 8])
    const mean = randInt(c.min + 2, c.max - 2)
    const values: number[] = n % 2 ? [mean] : []
    while (values.length < n) {
      const d = randInt(0, 2)
      values.push(mean - d, mean + d)
    }
    // no stack taller than 4 Xs
    if (values.every((v) => values.filter((w) => w === v).length <= 4)) return { c, values: values.sort((a, b) => a - b), mean }
  }
}

const plotQ = (id: string, prompt: string, answer: string, options: string[], hint: string, subtopic: string, visual: ProblemVisual): Problem => ({
  id,
  prompt,
  answer,
  options,
  topic: 'g5-lineplots',
  subtopic,
  visual,
  hint,
  skill: G5_LINEPLOT_SKILL,
})

/** Fraction answers: the answer and the wrong ticks, each in simplest form. */
function tickOptions(c: PlotContext, answer: number, wrong: number[]): [string, string[]] {
  const text = mixedText(answer, c.d)
  return [text, withDistractors(text, wrong.filter((w) => w > 0).map((w) => mixedText(w, c.d)), (i) => mixedText(answer + i, c.d))]
}

function readPlot(id: string): Problem {
  const c = pick(PLOTS)
  const p = plotData(c)
  const counts = countsOf(p)
  const used = counts.map((k, i) => (k > 0 ? c.min + i : -1)).filter((t) => t >= 0)
  const lo = used[0]
  const hi = used[used.length - 1]
  const n = p.values.length
  const visual = linePlot(p)
  switch (randInt(0, 4)) {
    case 0: {
      // how many at one value
      const t = pick(used)
      const k = counts[t - c.min]
      const options = withDistractors(String(k), [String(counts[t - c.min + 1] ?? 0), String(counts[t - c.min - 1] ?? 0), String(n), String(k + 1)], (i) => String(k + i + 1))
      return plotQ(id, `How many ${c.things} were ${amount(t, c)} ${c.were}?`, String(k), options, `Find ${mixedText(t, c.d)} on the number line and count the Xs above it.`, 'count', visual)
    }
    case 1: {
      // the most common value
      const top = Math.max(...counts)
      const t = c.min + counts.indexOf(top)
      const [text, options] = tickOptions(c, t, [...used.filter((u) => u !== t), t + 1, t - 1])
      return plotQ(id, `Which measurement shows up most often on the line plot, in ${c.units}?`, text, options, 'Look for the tallest stack of Xs.', 'mode', visual)
    }
    case 2: {
      // the spread: greatest − least (one wrong option counts the tick marks between them as whole units)
      const text = mixedText(hi - lo, c.d)
      const whole = String(hi - lo)
      const options = withDistractors(text, [whole, ...[hi, hi + lo, hi - lo + 1, hi - lo - 1].filter((w) => w > 0).map((w) => mixedText(w, c.d))], (i) => mixedText(hi - lo + i + 1, c.d))
      return plotQ(id, `What is the difference, in ${c.units}, between the ${c.most} and the ${c.least}?`, text, options, `Subtract the smallest measurement, ${mixedText(lo, c.d)}, from the biggest, ${mixedText(hi, c.d)}.`, 'spread', visual)
    }
    case 3: {
      // a group's total
      const t = pick(used.filter((u) => counts[u - c.min] >= 2).length ? used.filter((u) => counts[u - c.min] >= 2) : used)
      const k = counts[t - c.min]
      const text = mixedText(k * t, c.d)
      // (just the count, one of them, one too many or too few)
      const options = withDistractors(text, [String(k), ...[t, (k + 1) * t, (k - 1) * t].filter((w) => w > 0).map((w) => mixedText(w, c.d))], (i) => mixedText(k * t + i, c.d))
      return plotQ(id, `What is the total of all the ${c.things} that were ${amount(t, c)} ${c.were}, in ${c.units}?`, text, options, `There are ${k} of them. Add ${mixedText(t, c.d)} ${k} times (or multiply ${k} × ${mixedText(t, c.d)}).`, 'total', visual)
    }
    default: {
      // more than a value
      const cut = pick(used.slice(0, -1))
      const more = p.values.filter((v) => v > cut).length
      const atLeast = p.values.filter((v) => v >= cut).length
      const less = p.values.filter((v) => v < cut).length
      const options = withDistractors(String(more), [String(atLeast), String(less), String(n), String(more + 1)], (i) => String(more + i + 1))
      return plotQ(id, `How many ${c.things} were more than ${amount(cut, c)} ${c.were}?`, String(more), options, `Count the Xs to the right of ${mixedText(cut, c.d)} only (not the ones above it).`, 'moreThan', visual)
    }
  }
}

/** Share it all out equally (5.MD.2's beakers): total ÷ how many. */
function sharePlot(id: string): Problem {
  const c = pick(PLOTS)
  const p = shareData(c)
  const n = p.values.length
  const total = p.values.reduce((a, b) => a + b, 0)
  const top = Math.max(...countsOf(p))
  const mode = c.min + countsOf(p).indexOf(top)
  const [text, options] = tickOptions(c, p.mean, [total, p.mean + 1, p.mean - 1, mode !== p.mean ? mode : p.mean + 2, Math.max(...p.values)])
  return plotQ(
    id,
    `${c.share}, how much would each of the ${n} get, in ${c.units}?`,
    text,
    options,
    `Add all ${n} measurements (${mixedText(total, c.d)} ${c.units} in all), then divide by ${n}.`,
    'share',
    linePlot(p),
  )
}

// ── number patterns ──────────────────────────────────────────────────────────

const patQ = (id: string, prompt: string, answer: string, options: string[], hint: string, subtopic: string, visual?: ProblemVisual): Problem => ({
  id,
  prompt,
  answer,
  options,
  topic: 'g5-patterns',
  subtopic,
  visual,
  hint,
  skill: G5_PATTERN_SKILL,
})

const terms = (step: number, n = 5) => Array.from({ length: n }, (_, k) => k * step).join(', ')

function patterns(id: string): Problem {
  const a = randInt(1, 5)
  const m = pick([2, 3, 4])
  const b = a * m
  const rules = `Pattern A starts at 0 and adds ${a}. Pattern B starts at 0 and adds ${b}.`
  switch (randInt(0, 3)) {
    case 0: {
      // the next ordered pair
      const answer = pair(3 * a, 3 * b)
      const options = withDistractors(answer, [pair(3 * b, 3 * a), pair(3 * a, 2 * b + a), pair(4 * a, 4 * b), pair(2 * a + b, 3 * b)], (i) => pair(3 * a, 3 * b + i))
      return patQ(id, `${rules} Their ordered pairs (A, B) start (0, 0), ${pair(a, b)}, ${pair(2 * a, 2 * b)}. Which ordered pair comes next?`, answer, options, `Add ${a} to the A number and ${b} to the B number.`, 'nextPair')
    }
    case 1: {
      // how B compares with A
      const answer = `${m} times as large`
      const options = withDistractors(answer, [`${b - a} more`, `${m} more`, m === 2 ? 'the same' : `${m - 1} times as large`, 'half as large'], (i) => `${m + i} times as large`)
      return patQ(
        id,
        `Pattern A: ${terms(a)}. Pattern B: ${terms(b)}. How does each term in Pattern B compare with the matching term in Pattern A?`,
        answer,
        options,
        `Try a pair: ${2 * a} and ${2 * b}. What do you multiply ${2 * a} by to get ${2 * b}? Check another pair.`,
        'relation',
      )
    }
    case 2: {
      // the missing number of a pair further along
      const k = randInt(5, 8)
      const answer = String(k * b)
      const options = withDistractors(answer, [String(k * a + (b - a)), String(k * a + b), String((k - 1) * b), String(k * b + b)], (i) => String(k * b + i * a))
      return patQ(id, `${rules} One of their ordered pairs is (${k * a}, ?). What is the missing number?`, answer, options, `Each B term is ${m} times its A term. What is ${m} × ${k * a}?`, 'missing')
    }
    default: {
      // read the graph: the next point on the line
      const answer = pair(4 * a, 4 * b)
      const options = withDistractors(answer, [pair(4 * b, 4 * a), pair(4 * a, 3 * b + a), pair(5 * a, 5 * b), pair(3 * a, 4 * b)], (i) => pair(4 * a, 4 * b + i))
      const visual: ProblemVisual = {
        kind: 'coordPlane',
        xMax: 5 * a,
        yMax: 5 * b,
        xStep: a,
        yStep: b,
        points: [0, 1, 2, 3].map((k) => ({ x: k * a, y: k * b })),
        line: true,
        xLabel: 'Pattern A',
        yLabel: 'Pattern B',
      }
      return patQ(id, `${rules} The graph shows their ordered pairs (A, B). Which point comes next on the line?`, answer, options, `The points go over ${a} and up ${b} each time.`, 'graph', visual)
    }
  }
}

// ── the provider ─────────────────────────────────────────────────────────────

function plotQuestion(id: string): Problem {
  return Math.random() < 0.8 ? readPlot(id) : sharePlot(id)
}

export function makeG5DataProvider(cfg: G5DataConfig): ProblemProvider {
  let serial = 0
  return {
    topic: 'g5-data',
    next(): Problem {
      const id = `g5-data-${cfg.mode}-${serial++}`
      switch (cfg.mode) {
        case 'linePlot':
          return plotQuestion(id)
        case 'patterns':
          return patterns(id)
        case 'mixed':
          return serial % 2 === 1 ? plotQuestion(id) : patterns(id)
      }
    },
  }
}
