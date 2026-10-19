import type { Problem, ProblemProvider } from '../problem'
import { shuffle } from '../random'
import { makeLlmCachedProvider } from '../llm-cache'
import { pickLevel } from '../gradeTiers'
import { G2_CHARTS } from './content/grade2'
import { L4_ENRICH_DATAGRAPH } from './content/l4Enrich'
import { useProgress } from '../../store/progress'

interface Config {
  level: 2 | 3 | 4
  source?: 'static' | 'llm'
}

/**
 * Data & Graphing provider. Each problem embeds a bar graph (the `barGraph`
 * visual) that the child reads to answer the question. "Represent and interpret
 * data" standard. Level 2 = picture-bar reads; level 3 = direct reads (most/
 * fewest, how many); level 4 = multi-step (sums, differences across bars).
 * Unauthored levels fall back to the nearest easier shelf (lib/gradeTiers).
 */

interface DataChart {
  level: number
  title: string
  unit?: string
  bars: { label: string; value: number; emoji?: string }[]
  question: string
  answer: string
  options: string[]
  hint?: string
  /** Extra questions read off the same bars (optional; the primary is inline). */
  questions?: { question: string; answer: string; options: string[]; hint?: string }[]
}

/** Exported for content tests (grade-tier coverage; see lib/__tests__/gradeTiers.test.ts). */
export const CHARTS: DataChart[] = [
  ...G2_CHARTS,
  ...L4_ENRICH_DATAGRAPH,
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
      { label: 'Chocolate', value: 8, emoji: '🍫' },
      { label: 'Mint', value: 5, emoji: '🌿' },
      { label: 'Berry', value: 3, emoji: '🍓' },
    ],
    question: 'How many children chose chocolate?',
    answer: '8',
    options: ['8', '4', '5', '3'],
    hint: 'Read the height of the Chocolate bar.',
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
      { label: 'Pepperoni', value: 16, emoji: '🍕' },
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
  // ---- Level 3, added batch (CCSS 3.MD.D.3: read scaled bar graphs; direct reads, values 2–10) ----
  {
    level: 3,
    title: 'Fireflies at Night',
    unit: 'fireflies',
    bars: [
      { label: 'Porch', value: 6, emoji: '🏡' },
      { label: 'Meadow', value: 9, emoji: '🌿' },
      { label: 'Trees', value: 4, emoji: '🌳' },
    ],
    question: 'Where were the FEWEST fireflies seen?',
    answer: 'Trees',
    options: ['Porch', 'Meadow', 'Trees'],
    hint: 'Look for the shortest bar.',
    questions: [
      {
        question: 'How many fireflies were seen on the porch?',
        answer: '6',
        options: ['6', '7', '9', '4'],
        hint: 'Read the height of the Porch bar.',
      },
    ],
  },
  {
    level: 3,
    title: 'Paper Cranes Folded',
    unit: 'cranes',
    bars: [
      { label: 'Ada', value: 7 },
      { label: 'Cal', value: 3 },
      { label: 'Luna', value: 5 },
      { label: 'Nico', value: 8 },
    ],
    question: 'Who folded the MOST paper cranes?',
    answer: 'Nico',
    options: ['Nico', 'Ada', 'Luna', 'Cal'],
    hint: 'Find the tallest bar.',
    questions: [
      {
        question: 'How many MORE cranes did Nico fold than Cal?',
        answer: '5',
        options: ['5', '4', '11', '3'],
        hint: 'Nico (8) minus Cal (3).',
      },
    ],
  },
  {
    level: 3,
    title: 'Chalk Drawings',
    unit: 'drawings',
    bars: [
      { label: 'Tue', value: 5, emoji: '🎨' },
      { label: 'Wed', value: 9, emoji: '🎨' },
      { label: 'Thu', value: 7, emoji: '🎨' },
    ],
    question: 'On which day were the MOST chalk drawings made?',
    answer: 'Wed',
    options: ['Wed', 'Tue', 'Thu', 'Fri'],
    hint: 'Look for the tallest bar.',
    questions: [
      {
        question: 'How many chalk drawings were made on Thursday?',
        answer: '7',
        options: ['7', '5', '9', '3'],
        hint: 'Read the height of the Thursday bar.',
      },
    ],
  },
  {
    level: 3,
    title: 'Worms After the Rain',
    unit: 'worms',
    bars: [
      { label: 'Left Bed', value: 5, emoji: '🪱' },
      { label: 'Middle Bed', value: 8, emoji: '🪱' },
      { label: 'Right Bed', value: 3, emoji: '🪱' },
    ],
    question: 'Which bed had the FEWEST worms?',
    answer: 'Right Bed',
    options: ['Right Bed', 'Middle Bed', 'Left Bed'],
    hint: 'Look for the shortest bar.',
    questions: [
      {
        question: 'How many worms were found in the left bed?',
        answer: '5',
        options: ['5', '8', '3', '6'],
        hint: 'Read the height of the Left Bed bar.',
      },
    ],
  },
  {
    level: 3,
    title: 'Pinecones Gathered',
    unit: 'pinecones',
    bars: [
      { label: 'Bea', value: 4 },
      { label: 'Hugo', value: 9 },
      { label: 'Iris', value: 6 },
    ],
    question: 'Who gathered the MOST pinecones?',
    answer: 'Hugo',
    options: ['Hugo', 'Iris', 'Bea', 'Wes'],
    hint: 'Find the tallest bar.',
    questions: [
      {
        question: 'How many pinecones did Iris gather?',
        answer: '6',
        options: ['6', '4', '9', '5'],
        hint: 'Read the height of the Iris bar.',
      },
    ],
  },
  {
    level: 3,
    title: 'Mittens in the Lost and Found',
    unit: 'mittens',
    bars: [
      { label: 'Gray', value: 8, emoji: '🧤' },
      { label: 'Red', value: 6, emoji: '🧤' },
      { label: 'Blue', value: 3, emoji: '🧤' },
    ],
    question: 'Which color has the MOST mittens?',
    answer: 'Gray',
    options: ['Gray', 'Red', 'Blue'],
    hint: 'Look for the tallest bar.',
    questions: [
      {
        question: 'How many MORE gray mittens are there than blue mittens?',
        answer: '5',
        options: ['5', '3', '9', '11'],
        hint: 'Gray (8) minus Blue (3).',
      },
    ],
  },
  {
    level: 3,
    title: 'Vegetables Picked',
    unit: 'vegetables',
    bars: [
      { label: 'Carrots', value: 9 },
      { label: 'Potatoes', value: 4 },
      { label: 'Turnips', value: 6 },
    ],
    question: 'Which vegetable was picked the MOST?',
    answer: 'Carrots',
    options: ['Carrots', 'Potatoes', 'Turnips'],
    hint: 'Find the tallest bar.',
    questions: [
      {
        question: 'How many more carrots than potatoes were picked?',
        answer: '5',
        options: ['5', '4', '13', '6'],
        hint: 'Carrots (9) minus potatoes (4).',
      },
    ],
  },
  {
    level: 3,
    title: 'Marbles Won',
    unit: 'marbles',
    bars: [
      { label: 'Theo', value: 9 },
      { label: 'Uma', value: 6 },
      { label: 'Otto', value: 4 },
    ],
    question: 'Who won the MOST marbles?',
    answer: 'Theo',
    options: ['Theo', 'Otto', 'Uma', 'Bea'],
    hint: 'Look for the tallest bar.',
    questions: [
      {
        question: 'How many FEWER marbles did Otto have than Uma?',
        answer: '2',
        options: ['2', '4', '10', '3'],
        hint: 'Uma (6) minus Otto (4).',
      },
    ],
  },
  // ---- Level 4, added batch (CCSS 4.MD.B: multi-step reads from bar graphs; sums, differences, whole-number averages) ----
  {
    level: 4,
    title: 'Book Reading Week',
    unit: 'books',
    bars: [
      { label: 'Week 1', value: 19, emoji: '📚' },
      { label: 'Week 2', value: 28, emoji: '📚' },
      { label: 'Week 3', value: 24, emoji: '📚' },
      { label: 'Week 4', value: 33, emoji: '📚' },
    ],
    question: 'How many MORE books were read in Week 4 than in Week 1?',
    answer: '14',
    options: ['14', '13', '52', '19'],
    hint: 'Week 4 (33) minus Week 1 (19).',
    questions: [
      {
        question: 'How many books were read in Week 2 and Week 3 TOGETHER?',
        answer: '52',
        options: ['52', '57', '45', '54'],
        hint: 'Add Week 2 (28) and Week 3 (24).',
      },
      {
        question: 'Which week had the FEWEST books read?',
        answer: 'Week 1',
        options: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        hint: 'Look for the shortest bar.',
      },
    ],
  },
  {
    level: 4,
    title: 'Lost Library Books',
    unit: 'books',
    bars: [
      { label: 'Mon', value: 9, emoji: '🔎' },
      { label: 'Tue', value: 14, emoji: '🔎' },
      { label: 'Wed', value: 6, emoji: '🔎' },
      { label: 'Thu', value: 11, emoji: '🔎' },
    ],
    question: 'On which day were the MOST lost books returned?',
    answer: 'Tue',
    options: ['Tue', 'Wed', 'Mon', 'Thu'],
    hint: 'Find the tallest bar.',
    questions: [
      {
        question: 'How many books were returned on Monday and Tuesday TOGETHER?',
        answer: '23',
        options: ['23', '14', '11', '9'],
        hint: 'Add Monday (9) and Tuesday (14).',
      },
      {
        question: 'How many FEWER books were returned on Wednesday than on Thursday?',
        answer: '5',
        options: ['5', '11', '17', '25'],
        hint: 'Thursday (11) minus Wednesday (6).',
      },
    ],
  },
  {
    level: 4,
    title: 'Penny Jars',
    unit: 'pennies',
    bars: [
      { label: 'Red Jar', value: 34, emoji: '🪙' },
      { label: 'Blue Jar', value: 28, emoji: '🪙' },
      { label: 'Green Jar', value: 19, emoji: '🪙' },
      { label: 'Yellow Jar', value: 43, emoji: '🪙' },
    ],
    question: 'How many MORE pennies are in the Yellow Jar than the Green Jar?',
    answer: '24',
    options: ['24', '23', '86', '75'],
    hint: 'Yellow Jar (43) minus Green Jar (19).',
    questions: [
      {
        question: 'How many pennies are in the Red Jar and the Blue Jar TOGETHER?',
        answer: '62',
        options: ['62', '71', '57', '61'],
        hint: 'Add Red Jar (34) and Blue Jar (28).',
      },
      {
        question: 'What is the average number of pennies in the four jars?',
        answer: '31',
        options: ['31', '32', '28', '26'],
        hint: 'Add all four bars (124), then divide by 4.',
      },
    ],
  },
  {
    level: 4,
    title: 'Soccer Tryouts',
    unit: 'points',
    bars: [
      { label: 'Robins', value: 27, emoji: '⚽' },
      { label: 'Wrens', value: 32, emoji: '⚽' },
      { label: 'Hawks', value: 24, emoji: '⚽' },
      { label: 'Eagles', value: 38, emoji: '⚽' },
    ],
    question: 'How many MORE points did the Eagles score than the Robins?',
    answer: '11',
    options: ['11', '10', '65', '27'],
    hint: 'Eagles (38) minus Robins (27).',
    questions: [
      {
        question: 'How many points did the Hawks and the Wrens score TOGETHER?',
        answer: '56',
        options: ['56', '55', '62', '48'],
        hint: 'Add Hawks (24) and Wrens (32).',
      },
      {
        question: 'How many points did all FOUR teams score IN TOTAL?',
        answer: '121',
        options: ['121', '112', '98', '131'],
        hint: 'Add all four bars: 27 + 32 + 24 + 38.',
      },
    ],
  },
  {
    level: 4,
    title: 'Bird Feeder Counts',
    unit: 'birds',
    bars: [
      { label: 'Mon', value: 8, emoji: '🐦' },
      { label: 'Tue', value: 12, emoji: '🐦' },
      { label: 'Wed', value: 6, emoji: '🐦' },
      { label: 'Thu', value: 10, emoji: '🐦' },
    ],
    question: 'On which day did the birds visit the MOST?',
    answer: 'Tue',
    options: ['Tue', 'Mon', 'Thu', 'Wed'],
    hint: 'Look for the tallest bar.',
    questions: [
      {
        question: 'How many MORE birds visited on Tuesday than on Monday?',
        answer: '4',
        options: ['4', '3', '18', '8'],
        hint: 'Tuesday (12) minus Monday (8).',
      },
      {
        question: 'How many birds visited on Monday and Wednesday TOGETHER?',
        answer: '14',
        options: ['14', '18', '16', '6'],
        hint: 'Add Monday (8) and Wednesday (6).',
      },
    ],
  },
  {
    level: 4,
    title: 'Cookie Sale Days',
    unit: 'cookies',
    bars: [
      { label: 'Fri', value: 18, emoji: '🍪' },
      { label: 'Sat', value: 26, emoji: '🍪' },
      { label: 'Sun', value: 20, emoji: '🍪' },
    ],
    question: 'How many MORE cookies were sold on Saturday than on Friday?',
    answer: '8',
    options: ['8', '9', '46', '44'],
    hint: 'Saturday (26) minus Friday (18).',
    questions: [
      {
        question: 'How many cookies were sold on Friday and Sunday TOGETHER?',
        answer: '38',
        options: ['38', '36', '44', '46'],
        hint: 'Add Friday (18) and Sunday (20).',
      },
      {
        question: 'How many cookies were sold across all THREE days?',
        answer: '64',
        options: ['64', '62', '58', '74'],
        hint: 'Add all three: 18 + 26 + 20.',
      },
    ],
  },
  {
    level: 4,
    title: 'Lemonade Stand Sales',
    unit: 'dollars',
    bars: [
      { label: 'Thu', value: 14, emoji: '🍋' },
      { label: 'Fri', value: 24, emoji: '🍋' },
      { label: 'Sat', value: 28, emoji: '🍋' },
    ],
    question: 'How many MORE dollars were earned on Saturday than on Thursday?',
    answer: '14',
    options: ['14', '15', '42', '28'],
    hint: 'Saturday (28) minus Thursday (14).',
    questions: [
      {
        question: 'How many dollars did the stand earn IN TOTAL?',
        answer: '66',
        options: ['66', '68', '62', '56'],
        hint: 'Add all three bars: 14 + 24 + 28.',
      },
      {
        question: 'What is the average number of dollars earned each day?',
        answer: '22',
        options: ['22', '24', '20', '26'],
        hint: 'Add all three bars (66), then divide by 3.',
      },
    ],
  },
]

/** Every question a chart carries: the inline primary plus extras, in order. Exported for tests. */
export function chartQuestions(c: DataChart): { question: string; answer: string; options: string[]; hint?: string }[] {
  return [{ question: c.question, answer: c.answer, options: c.options, hint: c.hint }, ...(c.questions ?? [])]
}

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
  const level = pickLevel(cfg.level, CHARTS.map((c) => c.level))
  // Deal (chart, question) pairs: every chart plays its inline question plus any extras.
  const pool = CHARTS.filter((c) => c.level === level).flatMap((c) =>
    chartQuestions(c).map((q) => ({ chart: c, q })),
  )
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
      const { chart: c, q } = queue.shift()!
      return {
        id: `data-${serial++}`,
        prompt: q.question,
        options: shuffle(q.options),
        answer: q.answer,
        visual: { kind: 'barGraph', title: c.title, unit: c.unit, bars: c.bars },
        topic: 'data',
        difficulty: cfg.level,
        hint: q.hint,
        skill: { id: 'data-graphs', label: 'reading graphs' },
      }
    },
    reset() {
      queue = reshuffle()
    },
  }
}
