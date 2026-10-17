import type { Problem, ProblemProvider } from '../problem'
import { shuffle } from '../random'
import { groveCandidates } from '../grove/groveCore'
import { SKILLS } from '../../tutoring/skills'

/**
 * Planting orders for Times Grove. Each order describes ONE array ("a rows
 * of b"); the answer is how many trees that is. Since the fun pass the kid
 * PLANTS the array on a field (see groveCore's `judgePlanting`); the options
 * (the order's two structural sibling totals, `groveCandidates`) remain for
 * any multiple-choice host.
 *
 * Grade tiers: `maxFactor` keeps orders inside the grade (2nd grade ≤ 5,
 * 3rd ≤ 6, 4th ≤ 7 — the field is 7 × 7).
 *
 * Invariants (see __tests__/multiplicationGrove.test.ts): prompts never
 * contain the (or any candidate) total, all candidate totals in a round are
 * distinct, and the bank is a curated fixed set — no sampler factId.
 */

export interface PlantingOrder {
  rows: number
  cols: number
  prompt: string
}

export const GROVE_ORDERS: PlantingOrder[] = [
  { rows: 2, cols: 3, prompt: 'Plant 2 rows with 3 apple trees in each row.' },
  { rows: 3, cols: 2, prompt: 'The order calls for 3 rows of 2 young oaks.' },
  { rows: 2, cols: 4, prompt: 'The keeper chalks 2 rows of 4 pear trees.' },
  { rows: 4, cols: 2, prompt: 'Plant 4 rows with 2 plum trees in each row.' },
  { rows: 2, cols: 5, prompt: 'This order wants 2 rows of 5 cherry trees.' },
  { rows: 5, cols: 2, prompt: 'Plant 5 rows with 2 walnut trees in each row.' },
  { rows: 2, cols: 6, prompt: 'The keeper wants 2 rows of 6 birch trees.' },
  { rows: 6, cols: 2, prompt: 'Plant 6 rows with 2 maple trees in each row.' },
  { rows: 3, cols: 3, prompt: 'Plant a square patch: 3 rows of 3 fig trees.' },
  { rows: 3, cols: 4, prompt: 'The order says 3 rows of 4 apple trees.' },
  { rows: 4, cols: 3, prompt: 'Plant 4 rows with 3 pine trees in each row.' },
  { rows: 3, cols: 5, prompt: 'The keeper posts 3 rows of 5 willow trees.' },
  { rows: 5, cols: 3, prompt: 'This order wants 5 rows with 3 cedar trees in each.' },
  { rows: 4, cols: 4, prompt: 'Plant a square patch: 4 rows of 4 peach trees.' },
  { rows: 4, cols: 5, prompt: 'The orchard needs 4 rows of 5 lemon trees.' },
  { rows: 5, cols: 4, prompt: 'Plant 5 rows with 4 orange trees in each row.' },
  { rows: 3, cols: 6, prompt: 'The keeper chalks 3 rows of 6 olive trees.' },
  { rows: 6, cols: 3, prompt: 'Plant 6 rows with 3 almond trees in each row.' },
  { rows: 5, cols: 5, prompt: 'Plant a square patch: 5 rows of 5 apricot trees.' },
  { rows: 4, cols: 6, prompt: 'The big order: 4 rows of 6 mango trees.' },
  { rows: 6, cols: 4, prompt: 'Plant 6 rows with 4 lime trees in each row.' },
  { rows: 5, cols: 6, prompt: 'A giant order: 5 rows of 6 banana trees.' },
  { rows: 6, cols: 5, prompt: 'Plant 6 rows with 5 coconut palms in each row.' },
  { rows: 6, cols: 6, prompt: 'Plant a square patch: 6 rows of 6 pear trees.' },
  { rows: 2, cols: 7, prompt: 'The keeper wants 2 rows of 7 elm trees.' },
  { rows: 3, cols: 7, prompt: 'This order wants 3 rows of 7 hazel trees.' },
  { rows: 7, cols: 3, prompt: 'Plant 7 rows with 3 cork trees in each row.' },
  { rows: 4, cols: 7, prompt: 'The big order: 4 rows of 7 chestnut trees.' },
  { rows: 5, cols: 7, prompt: 'A giant order: 5 rows of 7 mulberry trees.' },
  { rows: 6, cols: 7, prompt: 'A giant order: 6 rows of 7 quince trees.' },
]

/** The orders a grade may plant: both factors ≤ `maxFactor` (default: up to 6). */
export function groveOrdersFor(maxFactor = 6): PlantingOrder[] {
  return GROVE_ORDERS.filter((o) => Math.max(o.rows, o.cols) <= maxFactor)
}

/** Coarse skill bucket for tutoring: the bigger factor decides the band. */
export function groveSkill(rows: number, cols: number): { id: string; label: string } {
  const hi = Math.max(rows, cols)
  const id = hi >= 6 ? 'mult-f6_9' : 'mult-f2_5'
  return SKILLS[id] ? { id, label: SKILLS[id].label } : { id: 'mult-f2_5', label: '2–5× facts' }
}

let serial = 0

/** The Problem for one planting order (recordAnswer/recordAttempt carry it). */
export function groveProblem(o: PlantingOrder): Problem {
  const [target, s1, s2] = groveCandidates(o.rows, o.cols)
  return {
    id: `grove-${serial++}`,
    prompt: o.prompt,
    options: shuffle([target.total, s1.total, s2.total]),
    answer: target.total,
    visual: { kind: 'array', rows: o.rows, cols: o.cols },
    topic: 'multiplication-grove',
    difficulty: 3,
    skill: groveSkill(o.rows, o.cols),
    hint: 'Count the rows first, then count how many trees in each row.',
  }
}

/** The bank order for a shape (a generic prompt if the bank has none). */
export function groveOrder(rows: number, cols: number): PlantingOrder {
  return GROVE_ORDERS.find((o) => o.rows === rows && o.cols === cols) ?? { rows, cols, prompt: `Plant ${rows} rows of ${cols} trees.` }
}

export function makeMultiplicationGroveProvider(opts: { maxFactor?: number } = {}): ProblemProvider {
  const bank = groveOrdersFor(opts.maxFactor)
  let queue: PlantingOrder[] = []
  const reshuffle = () => {
    queue = shuffle(bank)
  }
  reshuffle()
  return {
    topic: 'multiplication-grove',
    next(): Problem {
      if (queue.length === 0) reshuffle()
      return groveProblem(queue.shift()!)
    },
    reset() {
      reshuffle()
    },
  }
}
