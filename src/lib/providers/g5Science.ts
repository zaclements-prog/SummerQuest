import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'
import {
  G5_SCIENCE_PASSAGES,
  SPHERE_EVENTS,
  SPHERE_NAMES,
  SPHERE_THINGS,
  WATER_GRAPHS,
  type G5SciPassage,
  type G5ScienceStrand,
  type SphereName,
} from './content/g5Science'

/**
 * Science Summit, 5th grade (phase-3 contract: `g5-sci-1`, `g5-sci-2`,
 * `g5-sci-3`; the Cloud Keeper tier is ./g5Spheres). A stage names the strands
 * it covers; questions take turns between a level-5 passage (the `passage`
 * visual, as in grades 2–4) and a quick item:
 *
 *   matter    conservation of mass, generated: the total is worked out from the
 *             numbers in the question (dissolving, melting, freezing, a fizz
 *             in a sealed bag or an open cup, separating with a magnet, salt
 *             left behind by evaporation)
 *   foodWebs  a food chain, generated from real chains: the producer, what eats
 *             what, where the energy first came from, what a loss would do
 *   spheres   which sphere a thing belongs to; which two spheres an event
 *             links; Earth's salt and fresh water on a bar graph
 *   sky       which way and how long a shadow is at a time of day; Earth's spin;
 *             near and far stars
 *
 * Its own kind (`effectiveConfig` passes it as written); grades 2–4 keep `science`.
 */
export interface G5ScienceConfig {
  strands: G5ScienceStrand[]
}

export const G5_SCIENCE_SKILL: Record<G5ScienceStrand, { id: string; label: string }> = {
  matter: { id: 'g5-sci-matter', label: 'matter: particles and conserving weight' },
  foodWebs: { id: 'g5-sci-foodwebs', label: 'food webs: energy and matter' },
  spheres: { id: 'g5-sci-spheres', label: 'Earth’s spheres and its water' },
  sky: { id: 'g5-sci-sky', label: 'shadows, the sun and the stars' },
}

const PASSAGE_HINT: Record<G5ScienceStrand, string> = {
  matter: 'Go back to the passage. Matter can change form, but it does not vanish.',
  foodWebs: 'Go back to the passage. Follow the energy from the sun through each living thing.',
  spheres: 'Rocks and soil are the geosphere, water is the hydrosphere, air is the atmosphere, living things are the biosphere.',
  sky: 'Go back to the passage. Picture Earth spinning, and the sun far away but much closer than other stars.',
}

/** What a quick item carries before it becomes a Problem. */
interface Quick {
  prompt: string
  answer: string
  options: string[]
  hint: string
  visual?: Problem['visual']
}

const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]
const g = (n: number) => `${n} grams`

// ── matter: conservation of mass ────────────────────────────────────────────

const CLOSED_HINT = 'Matter is not lost or made when it mixes, melts or dissolves. Nothing got in or out, so the total mass stays the same.'

const SOLUTES = [
  { what: 'salt', mix: 'salt water' },
  { what: 'sugar', mix: 'sugar water' },
  { what: 'lemonade powder', mix: 'lemonade' },
] as const
const NAMES = ['Lena', 'Omar', 'Jada', 'Diego', 'Priya', 'Sam', 'Mei', 'Kofi'] as const

/** "exactly / less than / more than" choices around the right total. */
function around(total: number, extra: string[] = []): string[] {
  return [`exactly ${g(total)}`, `less than ${g(total)}`, `more than ${g(total)}`, ...extra]
}

export function matterItem(): Quick {
  const who = pick(NAMES)
  switch (randInt(0, 6)) {
    case 0: {
      const w = randInt(15, 40) * 10
      const s = randInt(2, 12) * 5
      const sol = pick(SOLUTES)
      return {
        prompt: `${who} pours ${g(w)} of water into a jar and stirs in ${g(s)} of ${sol.what}. The ${sol.what} dissolves and can no longer be seen. What is the mass of the ${sol.mix} now?`,
        answer: `exactly ${g(w + s)}`,
        options: [`exactly ${g(w + s)}`, `exactly ${g(w)}`, `less than ${g(w)}`, `more than ${g(w + s)}`],
        hint: `The ${sol.what} breaks into particles too small to see, but they are still there: ${w} + ${s} = ${w + s}.`,
      }
    }
    case 1: {
      const m = randInt(4, 30) * 5
      return {
        prompt: `A sealed bag holds an ice cube with a mass of ${g(m)}. The bag sits in the sun until all the ice melts. What is the mass of the water in the bag?`,
        answer: `exactly ${g(m)}`,
        options: around(m),
        hint: CLOSED_HINT,
      }
    }
    case 2: {
      const m = randInt(10, 50) * 5
      return {
        prompt: `${who} pours ${g(m)} of water into a tray and freezes it. The ice takes up a little more space than the water did. What is the mass of the ice?`,
        answer: `exactly ${g(m)}`,
        options: around(m),
        hint: 'Taking up more space does not add matter. The same particles are just spread a little farther apart.',
      }
    }
    case 3: {
      const v = randInt(10, 30) * 10
      const b = randInt(2, 8) * 5
      return {
        prompt: `In a sealed bag, ${g(v)} of vinegar and ${g(b)} of baking soda are mixed. The bag puffs up with gas. What is the total mass in the bag after the fizzing stops?`,
        answer: `exactly ${g(v + b)}`,
        options: [...around(v + b), `exactly ${g(v)}`],
        hint: `The gas is new matter made from the vinegar and baking soda, and the bag kept it in: ${v} + ${b} = ${v + b}.`,
      }
    }
    case 4: {
      const v = randInt(10, 30) * 10
      const b = randInt(2, 8) * 5
      return {
        prompt: `In an open cup, ${g(v)} of vinegar and ${g(b)} of baking soda are mixed. Bubbles of gas fizz up and escape into the air. What will the scale show after the fizzing stops?`,
        answer: `less than ${g(v + b)}`,
        options: around(v + b),
        hint: 'Gas is matter too. When it escapes into the air, the scale can no longer weigh it.',
      }
    }
    case 5: {
      const a = randInt(6, 30) * 10
      const b = randInt(2, 10) * 10
      return {
        prompt: `${who} stirs ${g(a)} of sand and ${g(b)} of iron filings together. Then a magnet pulls out all of the iron filings. What is the mass of the iron filings now?`,
        answer: `exactly ${g(b)}`,
        options: [...around(b), `exactly ${g(a + b)}`],
        hint: 'In a mixture each part keeps its own properties and its own mass. The magnet only separates them.',
      }
    }
    default: {
      const w = randInt(10, 30) * 10
      const s = randInt(2, 8) * 5
      return {
        prompt: `A dish holds ${g(w)} of water with ${g(s)} of salt dissolved in it. The dish sits in the sun until all of the water evaporates. What is the mass of what is left in the dish?`,
        answer: `exactly ${g(s)}`,
        options: [`exactly ${g(s)}`, '0 grams', `exactly ${g(w)}`, `exactly ${g(w + s)}`],
        hint: 'The water evaporates into the air, but the salt particles stay behind in the dish.',
      }
    }
  }
}

// ── food webs: chains ───────────────────────────────────────────────────────

/** Real food chains: producer first, each eaten by the next. */
export const FOOD_CHAINS: { place: string; chain: string[] }[] = [
  { place: 'meadow', chain: ['grass', 'grasshopper', 'frog', 'snake'] },
  { place: 'kelp forest', chain: ['kelp', 'sea urchin', 'sea otter'] },
  { place: 'woodland', chain: ['clover', 'rabbit', 'fox'] },
  { place: 'pond', chain: ['algae', 'mayfly larva', 'trout', 'heron'] },
  { place: 'Antarctic sea', chain: ['phytoplankton', 'krill', 'penguin', 'leopard seal'] },
  { place: 'forest', chain: ['oak leaves', 'caterpillar', 'songbird', 'hawk'] },
  { place: 'field', chain: ['wheat', 'mouse', 'owl'] },
  { place: 'desert', chain: ['cactus flower', 'beetle', 'lizard', 'roadrunner'] },
]

/** "All the grasshoppers": the plural of a chain's consumers (most just add -s). */
const PLURAL: Record<string, string> = { 'mayfly larva': 'mayfly larvae', krill: 'krill', mouse: 'mice', 'oak leaves': 'oak leaves' }
export const pluralOf = (thing: string) => PLURAL[thing] ?? `${thing}s`

const DECOMPOSE_HINT = 'Decomposers such as fungi and bacteria break down dead things and return the materials to the soil.'

export function foodWebItem(): Quick {
  const { place, chain } = pick(FOOD_CHAINS)
  const shown = chain.join(' → ')
  const top = chain[chain.length - 1]
  switch (randInt(0, 4)) {
    case 0:
      return {
        prompt: `In this ${place} food chain, which living thing is the producer? ${shown}`,
        answer: chain[0],
        options: [...chain.slice(0, 3), 'the sun'],
        hint: 'A producer makes its own food from sunlight. It is always at the start of the chain.',
      }
    case 1: {
      const i = randInt(1, chain.length - 1)
      return {
        prompt: `In this ${place} food chain, what does the ${chain[i]} eat? ${shown}`,
        answer: chain[i - 1],
        // the other links of the chain (the one it eats among them), and the sun
        options: [...chain.filter((c) => c !== chain[i]), 'the sun'],
        hint: 'Each arrow points from the living thing that is eaten to the one that eats it.',
      }
    }
    case 2:
      return {
        prompt: `Where did the energy in the ${top}’s food first come from? ${shown}`,
        answer: 'the sun',
        options: ['the sun', chain[0], chain[1], 'the soil'],
        hint: `The ${chain[0]} captured the sun’s energy, and it passed along the chain to the ${top}.`,
      }
    case 3:
      return {
        prompt: `In this ${place} food chain, what would most likely happen to the ${chain[2]} if all the ${pluralOf(chain[1])} disappeared? ${shown}`,
        answer: 'It would have less food.',
        options: ['It would have less food.', 'It would have more food.', 'Nothing would change for it.', 'It would make its own food.'],
        hint: `The ${chain[2]} eats the ${chain[1]}, so losing the ${pluralOf(chain[1])} takes away its food.`,
      }
    default:
      return {
        prompt: `A ${top} dies in the ${place}. Which living things break down its body and return the materials to the soil?`,
        answer: 'decomposers such as fungi and bacteria',
        options: ['decomposers such as fungi and bacteria', `producers such as the ${chain[0]}`, `consumers such as the ${chain[1]}`, 'the sun and the rain'],
        hint: DECOMPOSE_HINT,
      }
  }
}

// ── spheres ─────────────────────────────────────────────────────────────────

const SPHERE_HINT = 'Rocks and soil are the geosphere, water and ice are the hydrosphere, air is the atmosphere, living things are the biosphere.'
const pairText = (a: SphereName, b: SphereName) => `the ${a} and the ${b}`

/** Every pair of spheres, written one way round. */
const SPHERE_PAIRS: [SphereName, SphereName][] = SPHERE_NAMES.flatMap((a, i) => SPHERE_NAMES.slice(i + 1).map((b) => [a, b] as [SphereName, SphereName]))

export function spheresItem(): Quick {
  const r = randInt(0, 5)
  if (r <= 1) {
    const { thing, sphere } = pick(SPHERE_THINGS)
    return { prompt: `Which of Earth’s spheres does ${thing} belong to?`, answer: sphere, options: [...SPHERE_NAMES], hint: SPHERE_HINT }
  }
  if (r <= 3) {
    const { event, spheres } = pick(SPHERE_EVENTS)
    const right = SPHERE_PAIRS.find(([a, b]) => spheres.includes(a) && spheres.includes(b))!
    const wrong = shuffle(SPHERE_PAIRS.filter((p) => p !== right)).slice(0, 3)
    return {
      prompt: `${event} Which two spheres are interacting?`,
      answer: pairText(...right),
      options: [right, ...wrong].map((p) => pairText(...p)),
      hint: SPHERE_HINT,
    }
  }
  const graph = pick(WATER_GRAPHS)
  const q = pick(graph.questions)
  return {
    prompt: q.question,
    answer: q.answer,
    options: q.options,
    hint: 'Read each bar of the graph. The bars add up to 100 cups.',
    visual: { kind: 'barGraph', title: graph.title, unit: 'cups', bars: graph.bars },
  }
}

// ── sky ─────────────────────────────────────────────────────────────────────

const DIRS = ['toward the west', 'toward the east', 'toward the north', 'toward the south']
const SHADOW_HINT = 'A shadow points away from the sun. Morning sun is in the east, afternoon sun in the west, and at noon it is high in the southern sky.'

export function skyItem(): Quick {
  const who = pick(NAMES)
  switch (randInt(0, 5)) {
    case 0: {
      const time = pick(['7 a.m.', '8 a.m.', '9 a.m.'])
      return { prompt: `It is ${time} on a sunny day in Ohio, and the sun is low in the eastern sky. Which way does a flagpole’s shadow point?`, answer: 'toward the west', options: DIRS, hint: SHADOW_HINT }
    }
    case 1: {
      const time = pick(['4 p.m.', '5 p.m.', '6 p.m.'])
      return { prompt: `It is ${time} on a sunny day in Ohio, and the sun is low in the western sky. Which way does a flagpole’s shadow point?`, answer: 'toward the east', options: DIRS, hint: SHADOW_HINT }
    }
    case 2:
      return { prompt: 'It is noon on a sunny day in Ohio, and the sun is high in the southern sky. Which way does a flagpole’s shadow point?', answer: 'toward the north', options: DIRS, hint: SHADOW_HINT }
    case 3: {
      const morning = Math.random() < 0.5
      const [a, b] = morning ? [pick(['8 a.m.', '9 a.m.']), 'noon'] : ['noon', pick(['4 p.m.', '5 p.m.'])]
      return {
        prompt: `${who} measures the shadow of a tree at ${a} and again at ${b}. How does the shadow change?`,
        answer: morning ? 'It gets shorter.' : 'It gets longer.',
        options: ['It gets shorter.', 'It gets longer.', 'It stays the same length.', 'It disappears completely.'],
        hint: 'The higher the sun, the shorter the shadow. The sun is highest around noon.',
      }
    }
    case 4:
      return {
        prompt: 'Star A and Star B give off the same amount of light. Star A is much farther from Earth than Star B. Which star looks brighter from Earth?',
        answer: 'Star B',
        options: ['Star A', 'Star B', 'They look equally bright.'],
        hint: 'A light that is closer looks brighter. That is why the sun outshines every other star.',
      }
    default:
      return {
        prompt: 'About how long does it take Earth to spin around once?',
        answer: 'about 24 hours',
        options: ['about 24 hours', 'about one week', 'about one month', 'about one year'],
        hint: 'One spin gives one day and one night.',
      }
  }
}

const QUICK: Record<G5ScienceStrand, () => Quick> = { matter: matterItem, foodWebs: foodWebItem, spheres: spheresItem, sky: skyItem }

export function makeG5ScienceProvider(cfg: G5ScienceConfig): ProblemProvider {
  const strands = cfg.strands.length > 0 ? cfg.strands : (['matter', 'foodWebs', 'spheres', 'sky'] as G5ScienceStrand[])
  let serial = 0
  let turn = 0
  let strandQueue: G5ScienceStrand[] = []
  const passageQueues = new Map<G5ScienceStrand, Array<{ p: G5SciPassage; qi: number }>>()
  const nextStrand = () => {
    if (strandQueue.length === 0) strandQueue = shuffle(strands)
    return strandQueue.shift()!
  }
  const nextPassage = (s: G5ScienceStrand) => {
    let q = passageQueues.get(s) ?? []
    if (q.length === 0) {
      q = shuffle(G5_SCIENCE_PASSAGES.filter((p) => p.strand === s).flatMap((p) => p.questions.map((_, qi) => ({ p, qi }))))
      passageQueues.set(s, q)
    }
    return q.shift()!
  }
  return {
    topic: 'g5-science',
    next(): Problem {
      const strand = nextStrand()
      const id = `g5sci-${serial++}`
      const skill = G5_SCIENCE_SKILL[strand]
      // passage, quick item, passage, quick item… (a passage first)
      if (turn++ % 2 === 0) {
        const { p, qi } = nextPassage(strand)
        const q = p.questions[qi]
        return {
          id,
          prompt: q.question,
          options: shuffle(q.options),
          answer: q.answer,
          visual: { kind: 'passage', passageTitle: p.title, passageText: p.text, question: q.question },
          topic: `g5-science-${strand}`,
          difficulty: 5,
          skill,
          hint: PASSAGE_HINT[strand],
        }
      }
      const item = QUICK[strand]()
      return {
        id,
        prompt: item.prompt,
        options: shuffle([...new Set(item.options)]),
        answer: item.answer,
        visual: item.visual,
        topic: `g5-science-${strand}`,
        difficulty: 5,
        skill,
        hint: item.hint,
      }
    },
    reset() {
      turn = 0
      strandQueue = []
      passageQueues.clear()
    },
  }
}
