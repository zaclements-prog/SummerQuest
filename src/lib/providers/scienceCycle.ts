import type { Problem, ProblemProvider } from '../problem'
import { shuffle } from '../random'
import { PROCESSES, type Process } from '../cycle/cycleCore'

/**
 * Water-cycle situations for Cloud Keeper. Each prompt describes ONE step of
 * the cycle without naming it; the answer is the process word. In the game
 * that word IS a station: the kid walks Drip the droplet to it and the station
 * performs the process.
 *
 * Every situation also carries a `short` caption (a few words + an icon) that
 * the host speaks as the leg's clue: 7-year-olds get the picture, the full
 * prompt stays the recorded problem.
 *
 * Invariants (see __tests__/scienceCycle.test.ts): answers are balanced across
 * the three processes, prompts and captions never contain their own answer
 * word, and the "what happens next?" phrasings are where the cycle's ORDER is
 * taught.
 */

interface Situation {
  prompt: string
  answer: Process
  /** A few words for the host's speech bubble. */
  short: string
}

export const CYCLE_SITUATIONS: Situation[] = [
  // ── evaporation ────────────────────────────────────────────────────────────
  { prompt: 'The sun warms the ocean. Water turns into vapor and rises into the sky. This step is called ___.', answer: 'evaporation', short: '🌊 Sun warms the ocean' },
  { prompt: 'Puddles shrink and disappear on a hot, sunny day. Where does the water go?', answer: 'evaporation', short: '🥵 Puddles dry up' },
  { prompt: 'Wet clothes dry on a breezy, sunny afternoon. Where does the water go?', answer: 'evaporation', short: '👕 Wet clothes dry' },
  { prompt: 'The sun heats a river, and water rises as invisible vapor into the air. This step is called ___.', answer: 'evaporation', short: '🏞️ Sun heats the river' },
  { prompt: 'Rain flows into the river. Then the sun heats the river again. What happens next?', answer: 'evaporation', short: '🔁 Rain, river, sun again' },
  { prompt: 'The sun warms a lake, and invisible water vapor floats up into the sky. Which step is this?', answer: 'evaporation', short: '🏝️ Warm lake, rising air' },
  // A22 batch (grade 2-4 science: water cycle, Earth's systems)
  { prompt: 'The sun warms the wet sand at the beach, and the water rises into the air out of sight. Which step is this?', answer: 'evaporation', short: '🏖️ Sun warms wet sand' },
  { prompt: 'A puddle on the sidewalk shrinks on a warm afternoon until it is gone. What step took the water away?', answer: 'evaporation', short: '🚶 Sidewalk puddle vanishes' },
  { prompt: 'Grandpa hangs the laundry outside, and the sunny breeze takes the wetness out of the shirts. Which step is this?', answer: 'evaporation', short: '👕 Breeze dries the shirts' },
  { prompt: 'Sunlight warms the swimming pool all day, and some of the water floats up into the sky out of sight. What is that step called?', answer: 'evaporation', short: '🏊 Pool water floats up' },
  // A23 batch (grade 2-4 science: water cycle, Earth's systems)
  { prompt: 'Steam floats up out of the hot kettle and disappears into the air above the stove. Which step is this?', answer: 'evaporation', short: '🫖 Steam leaves the kettle' },
  { prompt: 'The sprinkler wets the driveway, and the hot sun dries it off again before dinner. What step took the water up?', answer: 'evaporation', short: '☀️ Driveway dries off' },
  { prompt: 'Nina hangs the wet towels on the deck rail after swimming, and the warm wind dries them by dinnertime. Which step is this?', answer: 'evaporation', short: '🧺 Towels dry on the deck' },
  { prompt: 'At the park, the damp grass dries out completely before lunch. Where did all the water go?', answer: 'evaporation', short: '🌿 Park grass dries' },
  // ── condensation ────────────────────────────────────────────────────────────
  { prompt: 'High in the sky the air is cool, so water vapor turns back into tiny droplets. This step is called ___.', answer: 'condensation', short: '🌬️ Cool air up high' },
  { prompt: 'Tiny droplets of water gather around bits of dust in the sky and form a cloud. This step is called ___.', answer: 'condensation', short: '✨ Droplets gather on dust' },
  { prompt: 'Water vapor rises high into the cool sky. What happens to it up there?', answer: 'condensation', short: '⬆️ Vapor rises, air cools' },
  { prompt: 'Dew forms on the cool grass in the early morning. This step is called ___.', answer: 'condensation', short: '🌱 Dew on cool grass' },
  { prompt: 'Water vapor in the air touches a cold glass, and tiny droplets appear on the outside. Which step is this?', answer: 'condensation', short: '🥛 Drops on a cold glass' },
  { prompt: 'Water vapor spreads through the cool upper sky and turns back into tiny drops. Which step is this?', answer: 'condensation', short: '❄️ Vapor meets cold sky' },
  // A22 batch (grade 2-4 science: water cycle, Earth's systems)
  { prompt: 'The bathroom mirror turns fuzzy with tiny drops while Ana takes a warm shower. Which step is this?', answer: 'condensation', short: '🪞 Steam fogs the mirror' },
  { prompt: 'On a chilly morning, Pablo breathes out and his breath looks like a little white cloud. What step makes that happen?', answer: 'condensation', short: '💨 Breath shows in cold air' },
  { prompt: 'Steam rises from the pot of soup, and tiny drops form on the cool lid above it. What is that step called?', answer: 'condensation', short: '🍲 Drops on the cool lid' },
  { prompt: 'Tiny water drops hang low over the meadow on a foggy day. Which step made the fog?', answer: 'condensation', short: '🌁 Fog over the meadow' },
  // A23 batch (grade 2-4 science: water cycle, Earth's systems)
  { prompt: 'On a cold night, tiny water drops form on the inside of the kitchen window. What step left them there?', answer: 'condensation', short: '🪟 Drops on the window' },
  { prompt: 'Zoe takes her cold water bottle out of the fridge, and tiny drops bead up on the outside of it. Which step is this?', answer: 'condensation', short: '🥤 Drops on the bottle' },
  { prompt: 'Diego walks in from the cold, and his glasses turn foggy the moment he steps into the warm house. What step is that?', answer: 'condensation', short: '👓 Foggy glasses' },
  // ── precipitation ──────────────────────────────────────────────────────────
  { prompt: 'A cloud grows heavy with droplets. The water falls as rain onto the ground. This step is called ___.', answer: 'precipitation', short: '🏋️ The cloud gets heavy' },
  { prompt: 'Thick gray clouds let their droplets fall to the earth as rain or snow. This step is called ___.', answer: 'precipitation', short: '🌫️ Thick gray clouds' },
  { prompt: 'A cloud is full of droplets and turns dark gray. What happens next?', answer: 'precipitation', short: '🌑 Dark, full cloud' },
  { prompt: 'Snow falls from the sky onto the mountaintops. Which step is this?', answer: 'precipitation', short: '🏔️ Snowy mountain tops' },
  { prompt: 'The droplets in a cloud get heavy. What step brings water back down to the ground?', answer: 'precipitation', short: '⬇️ Heavy drops come down' },
  { prompt: 'Rain pours down from a dark cloud and fills the pond again. Which step is this?', answer: 'precipitation', short: '☔ The pond fills up' },
  // A22 batch (grade 2-4 science: water cycle, Earth's systems)
  { prompt: 'The cloud can no longer hold its water, so the drops come tumbling down as rain. What is that step called?', answer: 'precipitation', short: '🌧️ Rain tumbles down' },
  { prompt: 'Raindrops patter on the tent all night, and the barrel by the porch fills right up. Which step is this?', answer: 'precipitation', short: '⛺ Rain on the tent' },
  { prompt: 'Soft white flakes drift down on a cold winter day and cover the yard. What is that step called?', answer: 'precipitation', short: '⛄ Yard turns white' },
  // A23 batch (grade 2-4 science: water cycle, Earth's systems)
  { prompt: 'Dark clouds hang over the baseball game, and rain starts to patter on the caps and umbrellas in the stands. Which step is this?', answer: 'precipitation', short: '⚾ Rain at the ball game' },
  { prompt: 'Ivy watches the first snowflakes of the year settle on the fence and the mailbox. What is that step called?', answer: 'precipitation', short: '📬 Snow on the fence' },
  { prompt: 'The sky turns dark gray after lunch, and fat raindrops begin to splash on the pavement below. Which step is this?', answer: 'precipitation', short: '🌧️ Rain splashes down' },
  { prompt: 'Hail stones clatter onto the greenhouse roof as a summer storm passes over the farm. Which step is this?', answer: 'precipitation', short: '🌩️ Hail on the roof' },
]

const SHORT_BY_PROMPT = new Map(CYCLE_SITUATIONS.map((s) => [s.prompt, s.short]))

/** The host's few-word caption for a situation prompt (the prompt itself if unknown). */
export function situationShort(prompt: string): string {
  return SHORT_BY_PROMPT.get(prompt) ?? prompt
}

/**
 * The provider Cloud Keeper uses. `next()` serves the whole bank shuffled (the
 * generic ProblemProvider contract); `nextFor(process)` serves a situation for
 * the leg the droplet is on (the game routes Drip around the loop IN ORDER, so
 * it asks for the step that comes next). Per-process queues reshuffle when
 * empty and never repeat a prompt back to back.
 */
export interface CycleProvider extends ProblemProvider {
  nextFor(process: Process): Problem
}

export function makeScienceCycleProvider(): CycleProvider {
  let serial = 0
  let queue: Situation[] = []
  const byProcess = new Map<Process, Situation[]>()
  let last: string | null = null

  const reshuffle = () => {
    queue = shuffle(CYCLE_SITUATIONS)
  }
  const refill = (p: Process) => {
    let q = shuffle(CYCLE_SITUATIONS.filter((s) => s.answer === p))
    // no back-to-back repeat across a reshuffle
    if (q.length > 1 && q[0].prompt === last) q = [...q.slice(1), q[0]]
    byProcess.set(p, q)
    return q
  }
  const toProblem = (s: Situation): Problem => {
    last = s.prompt
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
  }
  reshuffle()
  return {
    topic: 'science-water-cycle',
    next(): Problem {
      if (queue.length === 0) reshuffle()
      return toProblem(queue.shift()!)
    },
    nextFor(process: Process): Problem {
      let q = byProcess.get(process) ?? []
      if (q.length === 0) q = refill(process)
      return toProblem(q.shift()!)
    },
    reset() {
      reshuffle()
      byProcess.clear()
      last = null
    },
  }
}
