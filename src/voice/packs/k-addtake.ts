import { defineVoicePack } from '../types'

/**
 * Things that join and leave at Add-and-Take Falls, and how each one moves
 * (the `{verb}In` / `{verb}Away` lines it uses). Their pictures live with the
 * provider (src/lib/providers/kAddTake.ts); a test keeps the two lists in step.
 */
export const K_ADDTAKE_THINGS = ['frogs', 'bunnies', 'ducks', 'fish', 'turtles', 'bees', 'butterflies', 'ladybugs', 'birds'] as const
export type KAddTakeThing = (typeof K_ADDTAKE_THINGS)[number]

/** One of each thing, for "Here is one frog." */
export const K_ADDTAKE_ONE: Record<KAddTakeThing, string> = {
  frogs: 'frog',
  bunnies: 'bunny',
  ducks: 'duck',
  fish: 'fish',
  turtles: 'turtle',
  bees: 'bee',
  butterflies: 'butterfly',
  ladybugs: 'ladybug',
  birds: 'bird',
}

export const K_ADDTAKE_VERBS = ['hop', 'swim', 'fly'] as const
export type KAddTakeVerb = (typeof K_ADDTAKE_VERBS)[number]

export const K_ADDTAKE_VERB: Record<KAddTakeThing, KAddTakeVerb> = {
  frogs: 'hop',
  bunnies: 'hop',
  ducks: 'swim',
  fish: 'swim',
  turtles: 'swim',
  bees: 'fly',
  butterflies: 'fly',
  ladybugs: 'fly',
  birds: 'fly',
}

/** "One more hops in." / "One hops away.": a verb's lines for one (the templates say two and up). */
const ONE: Record<KAddTakeVerb, { in: string; away: string }> = {
  hop: { in: 'One more hops in.', away: 'One hops away.' },
  swim: { in: 'One more swims in.', away: 'One swims away.' },
  fly: { in: 'One more flies in.', away: 'One flies away.' },
}

/**
 * Add-and-Take Falls (K.OA.1, K.OA.5, K.OA.4), voice-first: a tiny scene is
 * said as it happens, the things joining or leaving on screen in time with
 * the voice, then the question:
 *
 *   "Here are 3 frogs." "2 more hop in." "How many now?"
 *   "Here are 5 ducks." "2 swim away." "How many are left?"
 *   "Here are 7 bees." "How many more make ten?" (a ten-frame)
 *
 * Every template is a small space, recorded whole.
 */
export default defineVoicePack({
  id: 'k-addtake',
  lines: {
    howManyNow: 'How many now?',
    howManyLeft: 'How many are left?',
    makeTen: 'How many more make ten?',
    // "Here is one frog." (the start of a story with one)
    ...Object.fromEntries(K_ADDTAKE_THINGS.map((t) => [`one-${t}`, `Here is one ${K_ADDTAKE_ONE[t]}.`])),
    // "One more hops in." / "One hops away."
    ...Object.fromEntries(K_ADDTAKE_VERBS.flatMap((v) => [[`${v}In-1`, ONE[v].in], [`${v}Away-1`, ONE[v].away]])),
  },
  templates: {
    /** 81 clips (2–10 × 9 things). The things pop in as it's said. */
    start: { text: 'Here are {n} {thing}.', slots: { n: { numbers: [2, 10] }, thing: { words: K_ADDTAKE_THINGS } }, render: 'whole' },
    /** 8 clips each (2–9): the newcomers come in as it's said, the leavers go. */
    hopIn: { text: '{n} more hop in.', slots: { n: { numbers: [2, 9] } }, render: 'whole' },
    hopAway: { text: '{n} hop away.', slots: { n: { numbers: [2, 9] } }, render: 'whole' },
    swimIn: { text: '{n} more swim in.', slots: { n: { numbers: [2, 9] } }, render: 'whole' },
    swimAway: { text: '{n} swim away.', slots: { n: { numbers: [2, 9] } }, render: 'whole' },
    flyIn: { text: '{n} more fly in.', slots: { n: { numbers: [2, 9] } }, render: 'whole' },
    flyAway: { text: '{n} fly away.', slots: { n: { numbers: [2, 9] } }, render: 'whole' },
  },
})
