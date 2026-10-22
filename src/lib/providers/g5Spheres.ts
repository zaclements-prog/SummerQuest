import type { Problem, ProblemProvider } from '../problem'
import { shuffle } from '../random'
import { SPHERES, SPHERE_PLAIN, TRAVELER_NAME, TRAVELER_WHAT, TRAVELERS, type Sphere, type Traveler } from '../cycle/spheresCore'

/**
 * Cloud Keeper, 5th grade: Earth's spheres (5-ESS2-1; `g5-sci-cycle`). Each
 * move is one thing that happens to a traveler (water, carbon dioxide, a grain
 * of minerals) and sends it from one sphere into another. The question: which
 * sphere does it move into? Prompts name where the traveler IS and what
 * happens; they never name the sphere it goes to (tests check).
 *
 * `next()` serves any move (the generic multiple-choice contract: the four
 * spheres are the options); `nextFrom(traveler, at)` serves a move that starts
 * where the traveler is, so the game's journeys chain leg to leg.
 */
export interface SphereMove {
  traveler: Traveler
  from: Sphere
  to: Sphere
  /** What happens (one or two sentences, naming the traveler). */
  event: string
  /** Professor Pebble's speech bubble: an icon and a few words. */
  clue: string
}

const m = (traveler: Traveler, from: Sphere, to: Sphere, event: string, clue: string): SphereMove => ({ traveler, from, to, event, clue })

export const SPHERE_MOVES: SphereMove[] = [
  // ── Drip, water ──────────────────────────────────────────────────────────
  m('water', 'hydrosphere', 'atmosphere', 'The sun warms the ocean, and Drip rises out of it as invisible vapor.', '☀️ Sun warms the ocean'),
  m('water', 'hydrosphere', 'atmosphere', 'A warm breeze blows across the lake, and Drip evaporates.', '🌬️ Warm breeze over the lake'),
  m('water', 'hydrosphere', 'atmosphere', 'Drip sits in a puddle all through a hot afternoon until the puddle dries up.', '🥵 The puddle dries up'),
  m('water', 'hydrosphere', 'biosphere', 'The roots of a sunflower soak Drip up out of the wet ground.', '🌻 Roots soak up Drip'),
  m('water', 'hydrosphere', 'biosphere', 'A thirsty deer bends down and drinks Drip from the stream.', '🦌 A deer drinks from the stream'),
  m('water', 'hydrosphere', 'biosphere', 'A camel at an oasis gulps Drip down in one long drink.', '🐪 A camel takes a long drink'),
  m('water', 'atmosphere', 'hydrosphere', 'High in the cool sky, Drip joins a cloud droplet and falls as rain into the sea.', '🌧️ Rain falls on the sea'),
  m('water', 'atmosphere', 'hydrosphere', 'Drip freezes into a snowflake and lands on a glacier.', '❄️ Snow falls on a glacier'),
  m('water', 'atmosphere', 'hydrosphere', 'Drip falls as rain and trickles down to the groundwater under a field.', '💧 Rain trickles underground'),
  m('water', 'biosphere', 'atmosphere', 'On a hot day, a maple tree lets Drip out of tiny holes in its leaves as vapor.', '🍁 Leaves give off vapor'),
  m('water', 'biosphere', 'atmosphere', 'A runner sweats, and Drip evaporates off her warm skin.', '🏃 Sweat dries on a runner'),
  m('water', 'biosphere', 'atmosphere', 'A dog pants on a summer day and breathes Drip out with its warm breath.', '🐕 A panting dog breathes out'),
  // ── Puff, carbon dioxide ─────────────────────────────────────────────────
  m('carbon', 'atmosphere', 'biosphere', 'A maple leaf takes Puff in through tiny holes and uses sunlight to make sugar.', '🍁 A leaf makes sugar'),
  m('carbon', 'atmosphere', 'biosphere', 'A field of corn soaks up sunshine and turns Puff into food.', '🌽 Corn makes food'),
  m('carbon', 'atmosphere', 'biosphere', 'Grass on a sunny hillside takes Puff in during photosynthesis.', '🌱 Grass does photosynthesis'),
  m('carbon', 'atmosphere', 'hydrosphere', 'Puff dissolves into the cold ocean as the waves roll.', '🌊 Puff dissolves in the sea'),
  m('carbon', 'atmosphere', 'hydrosphere', 'Puff mixes into the chilly water of a mountain lake.', '🏞️ Puff mixes into a lake'),
  m('carbon', 'biosphere', 'atmosphere', 'A rabbit eats a leaf with Puff inside it, and later breathes Puff out.', '🐇 A rabbit breathes out'),
  m('carbon', 'biosphere', 'atmosphere', 'A campfire burns a dry log, and Puff floats up with the smoke.', '🔥 A log burns'),
  m('carbon', 'biosphere', 'atmosphere', 'Fungi break down a fallen tree and give Puff off as a gas.', '🍄 Fungi break down a tree'),
  m('carbon', 'biosphere', 'geosphere', 'A fern dies in a swamp, gets buried, and over millions of years is pressed into coal.', '⛏️ Buried ferns become coal'),
  m('carbon', 'biosphere', 'geosphere', 'Dead leaves holding Puff rot into the forest floor and become part of the soil.', '🍂 Leaves rot into soil'),
  m('carbon', 'biosphere', 'geosphere', 'A snail’s shell is buried under the sea mud and slowly hardens into limestone.', '🐚 A shell turns to stone'),
  m('carbon', 'geosphere', 'atmosphere', 'A volcano erupts and blasts Puff high into the sky.', '🌋 A volcano erupts'),
  m('carbon', 'geosphere', 'atmosphere', 'A power plant burns coal, and Puff streams out of its chimney.', '🏭 Coal is burned'),
  m('carbon', 'hydrosphere', 'biosphere', 'Seaweed growing in the shallow sea takes Puff in to make food.', '🌿 Seaweed makes food'),
  m('carbon', 'hydrosphere', 'biosphere', 'A clam uses Puff from the seawater to help build its shell.', '🦪 A clam builds its shell'),
  // ── Grit, a grain of minerals ────────────────────────────────────────────
  m('mineral', 'geosphere', 'atmosphere', 'A strong desert wind lifts Grit off a sand dune as a speck of dust.', '🌪️ Wind lifts desert dust'),
  m('mineral', 'geosphere', 'atmosphere', 'A volcano erupts and blasts Grit high into the sky as ash.', '🌋 Ash shoots skyward'),
  m('mineral', 'geosphere', 'hydrosphere', 'Rain dissolves Grit out of a rock and washes it into a river.', '🌧️ Rain washes Grit away'),
  m('mineral', 'geosphere', 'hydrosphere', 'Pounding waves break Grit off a cliff and carry it out to sea.', '🌊 Waves pound the cliff'),
  m('mineral', 'geosphere', 'biosphere', 'The roots of a bean plant take Grit up from the soil to help the plant grow.', '🌱 Roots take up minerals'),
  m('mineral', 'geosphere', 'biosphere', 'A deer licks a salty rock and swallows Grit.', '🦌 A deer licks a salt rock'),
  m('mineral', 'atmosphere', 'geosphere', 'The wind dies down, and Grit settles onto a mountain slope.', '⛰️ Dust settles on a slope'),
  m('mineral', 'atmosphere', 'geosphere', 'Grit drifts down as ash and settles on a farmer’s field.', '🌾 Ash lands on a field'),
  m('mineral', 'atmosphere', 'hydrosphere', 'Grit drifts down from the sky into the middle of the ocean.', '🌊 Dust drops into the sea'),
  m('mineral', 'atmosphere', 'hydrosphere', 'A raindrop forms around Grit and falls into a lake.', '🌧️ Rain falls into a lake'),
  m('mineral', 'hydrosphere', 'geosphere', 'Grit sinks to the seafloor and, over thousands of years, is pressed into new rock.', '🪨 Grit sinks and turns to rock'),
  m('mineral', 'hydrosphere', 'geosphere', 'The river slows down and drops Grit onto a sandbar.', '🏖️ Grit lands on a sandbar'),
  m('mineral', 'hydrosphere', 'biosphere', 'A coral takes Grit from the seawater to build its stony skeleton.', '🪸 Coral builds its skeleton'),
  m('mineral', 'hydrosphere', 'biosphere', 'A sea snail takes Grit from the water to grow its shell.', '🐚 A sea snail grows its shell'),
  m('mineral', 'biosphere', 'geosphere', 'An old tree dies, and decomposers return Grit to the soil.', '🍄 Decomposers return Grit'),
  m('mineral', 'biosphere', 'geosphere', 'An empty seashell tumbles in the surf until it breaks into beach sand.', '🏝️ A shell breaks into sand'),
]

/** The question a move asks, standing on its own. */
export function movePrompt(mv: SphereMove): string {
  const who = TRAVELER_NAME[mv.traveler]
  return `${who}, ${TRAVELER_WHAT[mv.traveler]}, is in the ${mv.from} (${SPHERE_PLAIN[mv.from]}). ${mv.event} Which sphere does ${who} move into?`
}

const WHY: Record<Sphere, string> = {
  geosphere: 'Rock, soil, sand and coal are the geosphere.',
  hydrosphere: 'Oceans, lakes, rivers, ice and groundwater are the hydrosphere.',
  atmosphere: 'The air and the gases in it are the atmosphere.',
  biosphere: 'Plants, animals, fungi and every living thing are the biosphere.',
}

export interface SpheresProvider extends ProblemProvider {
  /** A move for this traveler from where it is now (never the same event twice in a row). */
  nextFrom(traveler: Traveler, at: Sphere): Problem & { clue: string; to: Sphere }
}

/** Is this provider the spheres one (Cloud Keeper's grade-5 tier)? */
export const isSpheresProvider = (p: ProblemProvider): p is SpheresProvider => typeof (p as Partial<SpheresProvider>).nextFrom === 'function'

export function makeG5SpheresProvider(): SpheresProvider {
  let serial = 0
  let queue: SphereMove[] = []
  let last = ''
  const toProblem = (mv: SphereMove) => {
    last = mv.event
    return {
      id: `spheres-${serial++}`,
      prompt: movePrompt(mv),
      options: shuffle([...SPHERES]),
      answer: mv.to,
      topic: 'g5-science-spheres',
      difficulty: 5,
      skill: { id: 'g5-sci-spheres', label: 'Earth’s spheres and its water' },
      hint: `Where does ${TRAVELER_NAME[mv.traveler]} end up? ${WHY[mv.to]}`,
      clue: mv.clue,
      to: mv.to,
    }
  }
  return {
    topic: 'g5-science-spheres',
    next() {
      if (queue.length === 0) queue = shuffle(SPHERE_MOVES)
      return toProblem(queue.shift()!)
    },
    nextFrom(traveler, at) {
      const here = SPHERE_MOVES.filter((x) => x.traveler === traveler && x.from === at)
      const fresh = here.filter((x) => x.event !== last)
      const pool = fresh.length > 0 ? fresh : here
      if (pool.length === 0) throw new Error(`no ${traveler} move out of the ${at}`)
      return toProblem(pool[Math.floor(Math.random() * pool.length)])
    },
    reset() {
      queue = []
      last = ''
    },
  }
}

/** Every sphere a traveler can reach from its start (each must have a way out: tests). */
export function reachable(traveler: Traveler): Set<Sphere> {
  const seen = new Set<Sphere>()
  const walk = (s: Sphere) => {
    if (seen.has(s)) return
    seen.add(s)
    for (const x of SPHERE_MOVES) if (x.traveler === traveler && x.from === s) walk(x.to)
  }
  const start = { water: 'hydrosphere', carbon: 'atmosphere', mineral: 'geosphere' } as const
  walk(start[traveler])
  return seen
}

export { TRAVELERS }
