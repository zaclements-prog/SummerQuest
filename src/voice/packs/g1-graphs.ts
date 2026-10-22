import { defineVoicePack } from '../types'

/**
 * What our friends picked, by topic: each graph has two or three rows, one
 * per thing, each marked with its picture (never a word). The pictures live
 * with the provider (src/lib/providers/g1Graphs.ts).
 */
export const G1_GRAPH_TOPICS = {
  fruit: ['apples', 'bananas', 'grapes', 'strawberries'],
  pets: ['dogs', 'cats', 'fish', 'rabbits'],
  treats: ['cookies', 'ice cream', 'cake', 'donuts'],
  games: ['soccer', 'basketball', 'baseball', 'football'],
} as const
export type GraphTopic = keyof typeof G1_GRAPH_TOPICS
export type GraphThing = (typeof G1_GRAPH_TOPICS)[GraphTopic][number]
export const G1_GRAPH_THINGS: readonly GraphThing[] = Object.values(G1_GRAPH_TOPICS).flat()

/** "apples than bananas": every two things of one topic (the "how many more" templates' one slot, so no clip is wasted). */
export const G1_GRAPH_PAIRS: readonly string[] = Object.values(G1_GRAPH_TOPICS).flatMap((ts) => ts.flatMap((a) => ts.filter((b) => b !== a).map((b) => `${a} than ${b}`)))

const ROW_NAME: Record<GraphThing, string> = {
  apples: 'Apples!',
  bananas: 'Bananas!',
  grapes: 'Grapes!',
  strawberries: 'Strawberries!',
  dogs: 'Dogs!',
  cats: 'Cats!',
  fish: 'Fish!',
  rabbits: 'Rabbits!',
  cookies: 'Cookies!',
  'ice cream': 'Ice cream!',
  cake: 'Cake!',
  donuts: 'Donuts!',
  soccer: 'Soccer!',
  basketball: 'Basketball!',
  baseball: 'Baseball!',
  football: 'Football!',
}
const IS_LINE: Record<GraphThing, string> = {
  apples: 'That one is an apple!',
  bananas: 'That one is a banana!',
  grapes: 'Those are grapes!',
  strawberries: 'That one is a strawberry!',
  dogs: 'That one is a dog!',
  cats: 'That one is a cat!',
  fish: 'That one is a fish!',
  rabbits: 'That one is a rabbit!',
  cookies: 'That one is a cookie!',
  'ice cream': 'That one is ice cream!',
  cake: 'That one is cake!',
  donuts: 'That one is a donut!',
  soccer: 'That is a soccer ball!',
  basketball: 'That is a basketball!',
  baseball: 'That is a baseball!',
  football: 'That is a football!',
}
const key = (t: string) => t.replace(/ /g, '-')

/**
 * 1st-grade Graph Delta (1.MD.4): sort what our friends picked into a picture
 * graph (one picture for each friend) or a tally graph (one mark each), then
 * how many like one thing, which has the most or the fewest, how many in all,
 * and how many more or fewer. A row's name is said as it lights up
 * (`row-<thing>`); a thing put in the wrong row hears what it is (`is-<thing>`).
 */
export default defineVoicePack({
  id: 'g1-graphs',
  lines: {
    // ── the topic, said first ──
    'topic-fruit': 'Our friends picked their favorite fruit.',
    'topic-pets': 'Our friends picked their favorite pet.',
    'topic-treats': 'Our friends picked their favorite treat.',
    'topic-games': 'Our friends picked their favorite ball game.',
    // ── making the graph (the hand sweeps over the things, then the rows) ──
    putInRow: 'Put each one in its row!',
    tallyEach: 'Put each one in its row. Each one makes a tally mark!',
    /** A graph that is already made. */
    lookGraph: 'Look at the graph!',
    lookTally: 'Look at the tally marks!',
    // ── the questions ──
    most: 'Which one has the most? Tap its row!',
    fewest: 'Which one has the fewest? Tap its row!',
    inAll: 'How many friends in all?',
    // ── the help after a miss ──
    countAll: "Let's count them all.",
    longestRow: 'The longest row has the most!',
    shortestRow: 'The shortest row has the fewest!',
    matchUp: "Let's match them up, one with one.",
    extraOnes: "These ones have no match. Let's count them!",
    // praise (taking turns with the kit's own)
    greatGraphing: 'Great graphing!',
    readGraph: 'You read the graph!',
    // row names and what each thing is
    ...Object.fromEntries(Object.entries(ROW_NAME).map(([t, s]) => [`row-${key(t)}`, s])),
    ...Object.fromEntries(Object.entries(IS_LINE).map(([t, s]) => [`is-${key(t)}`, s])),
  },
  templates: {
    /** 16 clips. */
    howMany: { text: 'How many friends like {thing}?', slots: { thing: { words: G1_GRAPH_THINGS } }, render: 'whole' },
    /** 48 clips: two things of one topic. */
    more: { text: 'How many more friends like {pair}?', slots: { pair: { words: G1_GRAPH_PAIRS } }, render: 'whole' },
    /** 48 clips. */
    fewer: { text: 'How many fewer friends like {pair}?', slots: { pair: { words: G1_GRAPH_PAIRS } }, render: 'whole' },
  },
})

/** A row's name line (said as it lights up). */
export const rowLineId = (t: GraphThing) => `g1-graphs/row-${key(t)}`
/** "That one is a banana!" */
export const isLineId = (t: GraphThing) => `g1-graphs/is-${key(t)}`
