import type { Problem, ProblemProvider } from '../problem'
import { shuffle } from '../random'
import { PROCESSES, type Process } from '../cycle/cycleCore'

/**
 * Water-cycle situations for Cloud Keeper. Each prompt describes ONE step of
 * the cycle without naming it; the answer is the process word — in the game
 * that word IS a station you walk to and perform.
 *
 * Invariants (see __tests__/scienceCycle.test.ts): answers are balanced across
 * the three processes, prompts never contain their own answer word, and the
 * "what happens next?" phrasings are where the cycle's ORDER is taught.
 */

interface Situation {
  prompt: string
  answer: Process
}

export const CYCLE_SITUATIONS: Situation[] = [
  // ── evaporation ────────────────────────────────────────────────────────────
  { prompt: 'The sun warms the ocean. Water turns into vapor and rises into the sky. This step is called ___.', answer: 'evaporation' },
  { prompt: 'Puddles shrink and disappear on a hot, sunny day. Where does the water go?', answer: 'evaporation' },
  { prompt: 'Wet clothes dry on a breezy, sunny afternoon. Where does the water go?', answer: 'evaporation' },
  { prompt: 'The sun heats a river, and water rises as invisible vapor into the air. This step is called ___.', answer: 'evaporation' },
  { prompt: 'Rain flows into the river. Then the sun heats the river again. What happens next?', answer: 'evaporation' },
  { prompt: 'The sun warms a lake, and invisible water vapor floats up into the sky.', answer: 'evaporation' },
  // ── condensation ───────────────────────────────────────────────────────────
  { prompt: 'High in the sky the air is cool, so water vapor turns back into tiny droplets. This step is called ___.', answer: 'condensation' },
  { prompt: 'Tiny droplets of water gather around bits of dust in the sky and form a cloud. This step is called ___.', answer: 'condensation' },
  { prompt: 'Water vapor rises high into the cool sky. What happens to it up there?', answer: 'condensation' },
  { prompt: 'Dew forms on the cool grass in the early morning. This step is called ___.', answer: 'condensation' },
  { prompt: 'The air cools, and tiny water droplets appear on the outside of a cold glass.', answer: 'condensation' },
  { prompt: 'Water vapor spreads through the cool upper sky and turns back into tiny drops.', answer: 'condensation' },
  // ── precipitation ──────────────────────────────────────────────────────────
  { prompt: 'A cloud grows heavy with droplets. The water falls as rain onto the ground. This step is called ___.', answer: 'precipitation' },
  { prompt: 'Thick gray clouds let their droplets fall to the earth as rain or snow. This step is called ___.', answer: 'precipitation' },
  { prompt: 'A cloud is full of droplets and turns dark gray. What happens next?', answer: 'precipitation' },
  { prompt: 'Snow falls from the sky onto the mountain tops.', answer: 'precipitation' },
  { prompt: 'The droplets in a cloud get heavy. What step brings water back down to the ground?', answer: 'precipitation' },
  { prompt: 'Rain pours down from a dark cloud and fills the pond again.', answer: 'precipitation' },
]

export function makeScienceCycleProvider(): ProblemProvider {
  let serial = 0
  let queue: Situation[] = []
  const reshuffle = () => {
    queue = shuffle(CYCLE_SITUATIONS)
  }
  reshuffle()
  return {
    topic: 'science-water-cycle',
    next(): Problem {
      if (queue.length === 0) reshuffle()
      const s = queue.shift()!
      return {
        id: `cycle-${serial++}`,
        prompt: s.prompt,
        options: shuffle([...PROCESSES]),
        answer: s.answer,
        topic: 'science-water-cycle',
        difficulty: 3,
        skill: { id: 'sci-water-cycle', label: 'the water cycle' },
        hint: 'Picture where the water is — and where it is going next.',
      }
    },
    reset() {
      reshuffle()
    },
  }
}
