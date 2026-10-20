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

// CCSS 2.OA.A.3-4 (equal-size arrays, factors within each grade's cap).
export const GROVE_ORDERS: PlantingOrder[] = [
  { rows: 2, cols: 2, prompt: 'Plant a square patch: 2 rows of 2 spruce trees.' },
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

/**
 * Second-pass phrasings (CCSS 2.OA.A.3-4): the same arrays, re-described so a
 * second sighting of a pair reads fresh. A variant may repeat a pair (that is
 * its whole point), so it lives OUTSIDE GROVE_ORDERS — the canonical bank
 * stays pair-unique. Together they widen the served pool a grade sees to 30+
 * (32 at G2, factors ≤5). Same invariants as canonical orders: the prompt
 * states "rows of/with cols" in that order, never a candidate total.
 */
export const GROVE_ORDER_ALTS: PlantingOrder[] = [
  { rows: 2, cols: 3, prompt: 'The keeper tags 2 rows of 3 fir trees for the north slope.' },
  { rows: 3, cols: 2, prompt: 'Put 3 rows with 2 beech trees in each row by the gate.' },
  { rows: 2, cols: 4, prompt: 'The plan lists 2 rows of 4 cypress trees along the fence.' },
  { rows: 4, cols: 2, prompt: 'Plant 4 rows with 2 hickory trees in each row near the barn.' },
  { rows: 2, cols: 5, prompt: 'The map shows 2 rows of 5 linden trees by the pond.' },
  { rows: 5, cols: 2, prompt: 'Plant 5 rows with 2 juniper trees in each row by the trail.' },
  { rows: 3, cols: 3, prompt: 'Plant a square patch: 3 rows of 3 palm trees down the shell path.' },
  { rows: 3, cols: 4, prompt: 'The keeper ropes off 3 rows of 4 dogwood trees near the creek.' },
  { rows: 2, cols: 2, prompt: 'The tiny plot wants 2 rows with 2 sycamore trees beside the signpost.' },
  { rows: 4, cols: 3, prompt: 'Draw 4 rows with 3 aspen trees in each row below the orchard hill.' },
  { rows: 3, cols: 5, prompt: 'The order card asks for 3 rows of 5 redwood trees down the long yard.' },
  { rows: 5, cols: 3, prompt: 'Set out 5 rows with 3 serviceberry trees in each row along the lane.' },
  { rows: 4, cols: 4, prompt: 'Plant a square patch: 4 rows of 4 magnolia trees on the plaza.' },
  { rows: 4, cols: 5, prompt: 'The keeper marks 4 rows of 5 persimmon trees beside the market path.' },
  { rows: 5, cols: 4, prompt: 'The garden plan wants 5 rows with 4 pawpaw trees in each row.' },
  { rows: 5, cols: 5, prompt: 'Plant a square patch: 5 rows of 5 pine trees on the south hedge.' },
]

/** The orders a grade may plant: both factors ≤ `maxFactor` (default: up to 6). */
export function groveOrdersFor(maxFactor = 6): PlantingOrder[] {
  return GROVE_ORDERS.filter((o) => Math.max(o.rows, o.cols) <= maxFactor)
}

/** Everything a grade may plant: the canonical orders plus fresh phrasings. */
export function grovePoolFor(maxFactor = 6): PlantingOrder[] {
  const fits = (o: PlantingOrder) => Math.max(o.rows, o.cols) <= maxFactor
  return [...GROVE_ORDERS, ...GROVE_ORDER_ALTS].filter(fits)
}

/** Coarse skill bucket for tutoring: the bigger factor decides the band. */
export function groveSkill(rows: number, cols: number): { id: string; label: string } {
  const hi = Math.max(rows, cols)
  const id = hi >= 6 ? 'mult-f6_9' : 'mult-f2_5'
  return SKILLS[id] ? { id, label: SKILLS[id].label } : { id: 'mult-f2_5', label: '2–5× facts' }
}

let serial = 0

/**
 * The Problem for one planting order (recordAnswer/recordAttempt carry it). A
 * multiple-choice host (the Daily Challenge) shows the prompt as its question,
 * so the order ends by asking for the count.
 */
export function groveProblem(o: PlantingOrder): Problem {
  const [target, s1, s2] = groveCandidates(o.rows, o.cols)
  return {
    id: `grove-${serial++}`,
    prompt: `${o.prompt} How many trees is that?`,
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

/**
 * The order for a shape, rotating through its fresh phrasings so repeat
 * sightings read differently (`sighting` counts how often this shape has come
 * up — pass the round index). Falls back to the generic prompt.
 */
export function groveOrderWithAlts(rows: number, cols: number, sighting = 0): PlantingOrder {
  const fits = [...GROVE_ORDERS, ...GROVE_ORDER_ALTS].filter((o) => o.rows === rows && o.cols === cols)
  return fits.length ? fits[sighting % fits.length] : { rows, cols, prompt: `Plant ${rows} rows of ${cols} trees.` }
}

export function makeMultiplicationGroveProvider(opts: { maxFactor?: number } = {}): ProblemProvider {
  const bank = grovePoolFor(opts.maxFactor)
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
