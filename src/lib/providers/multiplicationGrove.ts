import type { Problem, ProblemProvider } from '../problem'
import { shuffle } from '../random'
import { groveCandidates } from '../grove/groveCore'
import { SKILLS } from '../../tutoring/skills'

/**
 * Planting orders for Times Grove. Each prompt describes ONE array ("a rows
 * of b"); the answer is how many trees that is — and in the game that total
 * IS a plot the kid walks to and crews. Candidate plots deliberately share a
 * dimension with the target (groveCandidates), so walking the right one means
 * reading both numbers of the order.
 *
 * Invariants (see __tests__/multiplicationGrove.test.ts): prompts never
 * contain the (or any candidate) total, all candidate totals in a round are
 * distinct, and the bank is a curated fixed set — no sampler factId.
 */

interface PlantingOrder {
  rows: number
  cols: number
  prompt: string
}

export const GROVE_ORDERS: PlantingOrder[] = [
  { rows: 2, cols: 3, prompt: 'Plant 2 rows with 3 apple trees in each row. Which plot already grows that?' },
  { rows: 3, cols: 2, prompt: 'The order calls for 3 rows of 2 young oaks. Which grove plants it?' },
  { rows: 2, cols: 4, prompt: 'The keeper chalks 2 rows of 4 pear trees. Which plot is already planted?' },
  { rows: 4, cols: 2, prompt: 'Plant 4 rows with 2 plum trees in each row. Which grove matches that?' },
  { rows: 2, cols: 5, prompt: 'This order wants 2 rows of 5 cherry trees. Which plot grows exactly that?' },
  { rows: 5, cols: 2, prompt: 'Plant 5 rows with 2 walnut trees in each row. Which plot is the one?' },
  { rows: 2, cols: 6, prompt: 'The kid draws 2 rows of 6 birch trees. Which grove is already like that?' },
  { rows: 6, cols: 2, prompt: 'Plant 6 rows with 2 maple trees in each row. Which plot matches the order?' },
  { rows: 3, cols: 4, prompt: 'The order says 3 rows of 4 apple trees. Which plot already grows it?' },
  { rows: 4, cols: 3, prompt: 'Plant 4 rows with 3 pine trees in each row. Which grove was planted that way?' },
  { rows: 3, cols: 5, prompt: 'The keeper posts 3 rows of 5 willow trees. Which plot matches this order?' },
  { rows: 5, cols: 3, prompt: 'This order wants 5 rows with 3 cedar trees in each. Which plot is it?' },
  { rows: 3, cols: 3, prompt: 'The kid wants 3 rows of 3 fig trees. Which grove already grows that way?' },
  { rows: 4, cols: 4, prompt: 'Plant a square patch: 4 rows of 4 peach trees. Which plot matches the order?' },
]

/** Coarse skill bucket for tutoring: the bigger factor decides the band. */
export function groveSkill(rows: number, cols: number): { id: string; label: string } {
  const hi = Math.max(rows, cols)
  const id = hi >= 6 ? 'mult-f6_9' : 'mult-f2_5'
  return SKILLS[id] ? { id, label: SKILLS[id].label } : { id: 'mult-f2_5', label: '2–5× facts' }
}

export function makeMultiplicationGroveProvider(): ProblemProvider {
  let serial = 0
  let queue: PlantingOrder[] = []
  const reshuffle = () => {
    queue = shuffle(GROVE_ORDERS)
  }
  reshuffle()
  return {
    topic: 'multiplication-grove',
    next(): Problem {
      if (queue.length === 0) reshuffle()
      const o = queue.shift()!
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
    },
    reset() {
      reshuffle()
    },
  }
}
