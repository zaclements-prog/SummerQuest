import type { Problem, ProblemProvider } from '../problem'
import { shuffle } from '../random'
import { makeLlmCachedProvider } from '../llm-cache'
import { useProgress } from '../../store/progress'

interface Config {
  level: 3 | 4
  source?: 'static' | 'llm'
}

/**
 * Data & Graphing provider. Each problem embeds a bar graph (the `barGraph`
 * visual) that the child reads to answer the question. Aligned to the 3rd/4th
 * "Represent and interpret data" standard. Level 3 = direct reads (most/fewest,
 * how many); level 4 = multi-step (sums, differences across bars).
 */

interface DataChart {
  level: 3 | 4
  title: string
  unit?: string
  bars: { label: string; value: number; emoji?: string }[]
  question: string
  answer: string
  options: string[]
  hint?: string
}

const CHARTS: DataChart[] = [
  // ---- Level 3: direct reads (small values 2–10) ----
  {
    level: 3,
    title: 'Favorite Fruit',
    unit: 'votes',
    bars: [
      { label: 'Apple', value: 8, emoji: '🍎' },
      { label: 'Banana', value: 5, emoji: '🍌' },
      { label: 'Orange', value: 3, emoji: '🍊' },
      { label: 'Grape', value: 6, emoji: '🍇' },
    ],
    question: 'Which fruit got the MOST votes?',
    answer: 'Apple',
    options: ['Apple', 'Banana', 'Grape', 'Orange'],
    hint: 'Look for the tallest bar.',
  },
  {
    level: 3,
    title: 'Pets in Our Class',
    unit: 'number of children',
    bars: [
      { label: 'Dog', value: 7, emoji: '🐶' },
      { label: 'Cat', value: 5, emoji: '🐱' },
      { label: 'Fish', value: 4, emoji: '🐟' },
      { label: 'Bird', value: 2, emoji: '🐦' },
    ],
    question: 'How many children have a cat?',
    answer: '5',
    options: ['5', '4', '7', '2'],
    hint: 'Find the Cat bar and read its height.',
  },
  {
    level: 3,
    title: 'Books Read This Week',
    unit: 'books',
    bars: [
      { label: 'Mon', value: 3 },
      { label: 'Tue', value: 6 },
      { label: 'Wed', value: 2 },
      { label: 'Thu', value: 5 },
    ],
    question: 'On which day were the FEWEST books read?',
    answer: 'Wed',
    options: ['Wed', 'Mon', 'Thu', 'Tue'],
    hint: 'Look for the shortest bar.',
  },
  {
    level: 3,
    title: 'Stickers Earned',
    unit: 'stickers',
    bars: [
      { label: 'Ava', value: 4 },
      { label: 'Ben', value: 9 },
      { label: 'Cody', value: 6 },
    ],
    question: 'How many MORE stickers did Ben earn than Ava?',
    answer: '5',
    options: ['5', '4', '13', '3'],
    hint: 'Ben (9) minus Ava (4).',
  },
  {
    level: 3,
    title: 'Favorite Color',
    unit: 'votes',
    bars: [
      { label: 'Blue', value: 9, emoji: '🔵' },
      { label: 'Red', value: 4, emoji: '🔴' },
      { label: 'Green', value: 7, emoji: '🟢' },
      { label: 'Yellow', value: 5, emoji: '🟡' },
    ],
    question: 'Which color got the MOST votes?',
    answer: 'Blue',
    options: ['Blue', 'Green', 'Yellow', 'Red'],
    hint: 'Find the tallest bar.',
  },
  {
    level: 3,
    title: 'Snacks We Like',
    unit: 'votes',
    bars: [
      { label: 'Pretzel', value: 6, emoji: '🥨' },
      { label: 'Popcorn', value: 8, emoji: '🍿' },
      { label: 'Cookie', value: 3, emoji: '🍪' },
    ],
    question: 'How many children like popcorn best?',
    answer: '8',
    options: ['8', '6', '3', '5'],
    hint: 'Read the height of the Popcorn bar.',
  },
  {
    level: 3,
    title: 'Sunny Days Each Month',
    unit: 'days',
    bars: [
      { label: 'May', value: 6, emoji: '☀️' },
      { label: 'Jun', value: 10, emoji: '☀️' },
      { label: 'Jul', value: 9, emoji: '☀️' },
    ],
    question: 'Which month had the MOST sunny days?',
    answer: 'Jun',
    options: ['Jun', 'Jul', 'May', 'Apr'],
    hint: 'Look for the tallest bar.',
  },
  {
    level: 3,
    title: 'Goals This Game',
    unit: 'goals',
    bars: [
      { label: 'Maya', value: 3, emoji: '⚽' },
      { label: 'Leo', value: 5, emoji: '⚽' },
      { label: 'Zoe', value: 2, emoji: '⚽' },
      { label: 'Sam', value: 4, emoji: '⚽' },
    ],
    question: 'Who scored the FEWEST goals?',
    answer: 'Zoe',
    options: ['Zoe', 'Maya', 'Sam', 'Leo'],
    hint: 'Find the shortest bar.',
  },
  {
    level: 3,
    title: 'Seeds That Sprouted',
    unit: 'plants',
    bars: [
      { label: 'Bean', value: 7, emoji: '🌱' },
      { label: 'Pea', value: 4, emoji: '🌱' },
      { label: 'Corn', value: 6, emoji: '🌽' },
    ],
    question: 'How many pea seeds sprouted?',
    answer: '4',
    options: ['4', '7', '6', '5'],
    hint: 'Read the height of the Pea bar.',
  },
  {
    level: 3,
    title: 'Library Books Borrowed',
    unit: 'books',
    bars: [
      { label: 'Mon', value: 5, emoji: '📚' },
      { label: 'Tue', value: 8, emoji: '📚' },
      { label: 'Wed', value: 6, emoji: '📚' },
      { label: 'Thu', value: 9, emoji: '📚' },
    ],
    question: 'On which day were the MOST books borrowed?',
    answer: 'Thu',
    options: ['Thu', 'Tue', 'Wed', 'Mon'],
    hint: 'Look for the tallest bar.',
  },
  {
    level: 3,
    title: 'Favorite Ice Cream',
    unit: 'votes',
    bars: [
      { label: 'Vanilla', value: 4, emoji: '🍦' },
      { label: 'Choc', value: 8, emoji: '🍫' },
      { label: 'Mint', value: 5, emoji: '🌿' },
      { label: 'Berry', value: 3, emoji: '🍓' },
    ],
    question: 'How many children chose chocolate?',
    answer: '8',
    options: ['8', '4', '5', '3'],
    hint: 'Read the height of the Choc bar.',
  },
  {
    level: 3,
    title: 'Shells We Found',
    unit: 'shells',
    bars: [
      { label: 'Ana', value: 6, emoji: '🐚' },
      { label: 'Kai', value: 9, emoji: '🐚' },
      { label: 'Mia', value: 7, emoji: '🐚' },
    ],
    question: 'Who found the MOST shells?',
    answer: 'Kai',
    options: ['Kai', 'Mia', 'Ana', 'Tom'],
    hint: 'Find the tallest bar.',
  },
  {
    level: 3,
    title: 'Butterflies Spotted',
    unit: 'butterflies',
    bars: [
      { label: 'Garden', value: 7, emoji: '🦋' },
      { label: 'Park', value: 10, emoji: '🦋' },
      { label: 'Field', value: 4, emoji: '🦋' },
    ],
    question: 'How many butterflies were spotted in the park?',
    answer: '10',
    options: ['10', '7', '4', '8'],
    hint: 'Read the height of the Park bar.',
  },
  {
    level: 3,
    title: 'Favorite Sport',
    unit: 'votes',
    bars: [
      { label: 'Soccer', value: 9, emoji: '⚽' },
      { label: 'Tennis', value: 3, emoji: '🎾' },
      { label: 'Swim', value: 6, emoji: '🏊' },
      { label: 'Bike', value: 5, emoji: '🚲' },
    ],
    question: 'Which sport got the FEWEST votes?',
    answer: 'Tennis',
    options: ['Tennis', 'Bike', 'Swim', 'Soccer'],
    hint: 'Look for the shortest bar.',
  },
  // ---- Level 4: multi-step (sums & differences, values up to ~40) ----
  {
    level: 4,
    title: 'Cans Recycled',
    unit: 'cans',
    bars: [
      { label: 'Wk 1', value: 12 },
      { label: 'Wk 2', value: 18 },
      { label: 'Wk 3', value: 9 },
      { label: 'Wk 4', value: 15 },
    ],
    question: 'How many cans were recycled in Week 2 and Week 3 TOGETHER?',
    answer: '27',
    options: ['27', '30', '9', '18'],
    hint: 'Add Week 2 (18) and Week 3 (9).',
  },
  {
    level: 4,
    title: 'Goals Scored',
    unit: 'goals',
    bars: [
      { label: 'Lions', value: 14 },
      { label: 'Tigers', value: 9 },
      { label: 'Bears', value: 11 },
    ],
    question: 'How many MORE goals did the Lions score than the Tigers?',
    answer: '5',
    options: ['5', '3', '23', '14'],
    hint: 'Lions (14) minus Tigers (9).',
  },
  {
    level: 4,
    title: 'Tickets Sold',
    unit: 'tickets',
    bars: [
      { label: 'Fri', value: 20 },
      { label: 'Sat', value: 35 },
      { label: 'Sun', value: 25 },
    ],
    question: 'How many tickets were sold across all THREE days?',
    answer: '80',
    options: ['80', '60', '55', '35'],
    hint: 'Add all three bars: 20 + 35 + 25.',
  },
  {
    level: 4,
    title: 'Rainy Days',
    unit: 'days',
    bars: [
      { label: 'Jan', value: 8 },
      { label: 'Feb', value: 6 },
      { label: 'Mar', value: 11 },
      { label: 'Apr', value: 7 },
    ],
    question: 'How many FEWER rainy days were there in February than March?',
    answer: '5',
    options: ['5', '6', '17', '11'],
    hint: 'March (11) minus February (6).',
  },
  {
    level: 4,
    title: 'Pizza Slices Sold',
    unit: 'slices',
    bars: [
      { label: 'Cheese', value: 22, emoji: '🍕' },
      { label: 'Pepper', value: 16, emoji: '🍕' },
      { label: 'Veggie', value: 13, emoji: '🍕' },
    ],
    question: 'How many cheese and veggie slices were sold TOGETHER?',
    answer: '35',
    options: ['35', '38', '29', '22'],
    hint: 'Add Cheese (22) and Veggie (13).',
  },
  {
    level: 4,
    title: 'Bottles Collected',
    unit: 'bottles',
    bars: [
      { label: 'Room A', value: 24, emoji: '♻️' },
      { label: 'Room B', value: 17, emoji: '♻️' },
      { label: 'Room C', value: 30, emoji: '♻️' },
    ],
    question: 'How many MORE bottles did Room C collect than Room B?',
    answer: '13',
    options: ['13', '14', '47', '6'],
    hint: 'Room C (30) minus Room B (17).',
  },
  {
    level: 4,
    title: 'Laps Run',
    unit: 'laps',
    bars: [
      { label: 'Mon', value: 7, emoji: '🏃' },
      { label: 'Tue', value: 12, emoji: '🏃' },
      { label: 'Wed', value: 9, emoji: '🏃' },
      { label: 'Thu', value: 14, emoji: '🏃' },
    ],
    question: 'How many laps were run on Monday and Wednesday TOGETHER?',
    answer: '16',
    options: ['16', '21', '19', '14'],
    hint: 'Add Monday (7) and Wednesday (9).',
  },
  {
    level: 4,
    title: 'Stickers in the Jar',
    unit: 'stickers',
    bars: [
      { label: 'Stars', value: 28, emoji: '⭐' },
      { label: 'Hearts', value: 19, emoji: '❤️' },
      { label: 'Smiles', value: 25, emoji: '🙂' },
    ],
    question: 'How many MORE star stickers are there than heart stickers?',
    answer: '9',
    options: ['9', '6', '47', '11'],
    hint: 'Stars (28) minus Hearts (19).',
  },
  {
    level: 4,
    title: 'Apples Picked',
    unit: 'apples',
    bars: [
      { label: 'Tree 1', value: 15, emoji: '🍎' },
      { label: 'Tree 2', value: 21, emoji: '🍎' },
      { label: 'Tree 3', value: 18, emoji: '🍎' },
    ],
    question: 'How many apples were picked from all THREE trees?',
    answer: '54',
    options: ['54', '50', '39', '36'],
    hint: 'Add all three: 15 + 21 + 18.',
  },
  {
    level: 4,
    title: 'Minutes Read',
    unit: 'minutes',
    bars: [
      { label: 'Nora', value: 30, emoji: '📖' },
      { label: 'Eli', value: 18, emoji: '📖' },
      { label: 'Pia', value: 25, emoji: '📖' },
    ],
    question: 'How many MORE minutes did Nora read than Eli?',
    answer: '12',
    options: ['12', '8', '48', '7'],
    hint: 'Nora (30) minus Eli (18).',
  },
  {
    level: 4,
    title: 'Cupcakes Baked',
    unit: 'cupcakes',
    bars: [
      { label: 'Mon', value: 14, emoji: '🧁' },
      { label: 'Tue', value: 22, emoji: '🧁' },
      { label: 'Wed', value: 16, emoji: '🧁' },
    ],
    question: 'How many cupcakes were baked on Tuesday and Wednesday TOGETHER?',
    answer: '38',
    options: ['38', '36', '30', '22'],
    hint: 'Add Tuesday (22) and Wednesday (16).',
  },
  {
    level: 4,
    title: 'Stamps Collected',
    unit: 'stamps',
    bars: [
      { label: 'Liam', value: 26, emoji: '📮' },
      { label: 'Ivy', value: 13, emoji: '📮' },
      { label: 'Ray', value: 20, emoji: '📮' },
    ],
    question: 'How many FEWER stamps does Ivy have than Liam?',
    answer: '13',
    options: ['13', '14', '39', '7'],
    hint: 'Liam (26) minus Ivy (13).',
  },
  {
    level: 4,
    title: 'Snowy Days',
    unit: 'days',
    bars: [
      { label: 'Dec', value: 9, emoji: '❄️' },
      { label: 'Jan', value: 16, emoji: '❄️' },
      { label: 'Feb', value: 11, emoji: '❄️' },
    ],
    question: 'How many snowy days were there across all THREE months?',
    answer: '36',
    options: ['36', '34', '27', '25'],
    hint: 'Add all three: 9 + 16 + 11.',
  },
  {
    level: 4,
    title: 'Crayons by Color',
    unit: 'crayons',
    bars: [
      { label: 'Red', value: 17, emoji: '🖍️' },
      { label: 'Blue', value: 23, emoji: '🖍️' },
      { label: 'Green', value: 12, emoji: '🖍️' },
      { label: 'Pink', value: 19, emoji: '🖍️' },
    ],
    question: 'How many MORE blue crayons are there than green crayons?',
    answer: '11',
    options: ['11', '9', '35', '6'],
    hint: 'Blue (23) minus Green (12).',
  },
]

export function makeDataGraphProvider(cfg: Config): ProblemProvider {
  const staticProvider = makeStaticDataGraphProvider(cfg)
  if (cfg.source !== 'llm') return staticProvider

  const playerName = useProgress.getState().player?.name ?? ''
  return makeLlmCachedProvider({
    staticProvider,
    topic: 'data',
    template: 'dataGraph',
    variables: { level: cfg.level, playerName },
    initialBatch: 3,
    refillThreshold: 2,
    refillBatch: 3,
  })
}

function makeStaticDataGraphProvider(cfg: Config): ProblemProvider {
  let serial = 0
  const pool = CHARTS.filter((c) => c.level === cfg.level)
  function reshuffle() {
    const order = [...pool]
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    return order
  }
  let queue = reshuffle()
  return {
    topic: 'data',
    next(): Problem {
      if (queue.length === 0) queue = reshuffle()
      const c = queue.shift()!
      return {
        id: `data-${serial++}`,
        prompt: c.question,
        options: shuffle(c.options),
        answer: c.answer,
        visual: { kind: 'barGraph', title: c.title, unit: c.unit, bars: c.bars },
        topic: 'data',
        difficulty: cfg.level,
        hint: c.hint,
      }
    },
    reset() {
      queue = reshuffle()
    },
  }
}
