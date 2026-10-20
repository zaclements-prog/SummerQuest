import { defineVoicePack } from '../types'

/**
 * Things to count. The emoji for each lives with the provider
 * (src/lib/providers/kCounting.ts); a test keeps the two lists in step.
 */
export const K_COUNT_THINGS = ['apples', 'stars', 'fish', 'ducks', 'balls', 'flowers', 'bees', 'cars', 'cookies', 'frogs'] as const

/**
 * Kindergarten math (K.CC: counting to 20, "how many?", more / fewer / same,
 * which number is bigger). Every template is a small space, so each
 * filled-in sentence is recorded whole.
 */
export default defineVoicePack({
  id: 'k-math',
  lines: {
    greatCounting: 'Great counting!',
    letsCount: "Let's count!",
    // ── comparing (K.CC.6–7): Counting Mesa's "More or fewer" ──
    /** Two group cards; the guide sweeps them. */
    whichMore: 'Which group has more?',
    whichFewer: 'Which group has fewer?',
    /** Two groups side by side, then 👍 lit on "yes" and 👎 on "no". */
    areSame: 'Are they the same? Tap yes or no.',
    /** Two numeral cards, 1–10. */
    whichBigger: 'Which number is bigger?',
    // the 👍 / 👎 cards' labels
    yes: 'Yes!',
    no: 'No!',
    // praise for this pack's questions (taking turns with the kit's own)
    youKnowNumbers: 'You know your numbers!',
    sharpEyes: 'Sharp eyes!',
  },
  templates: {
    /** 10 clips. The picture lights up on the thing, the number cards on "Tap". */
    howMany: { text: 'How many {thing}? Tap the number.', slots: { thing: { words: K_COUNT_THINGS } }, render: 'whole' },
    /** 190 clips (2–20 × 10 things; no "1 apples"). */
    findGroup: {
      text: 'Tap the group with {n} {thing}.',
      slots: { n: { numbers: [2, 20] }, thing: { words: K_COUNT_THINGS } },
      render: 'whole',
    },
    /** 90 clips (2–10). Drag-to-make: the tray lights on "Put", the bowl on "bowl". */
    putInBowl: {
      text: 'Put {n} {thing} in the bowl.',
      slots: { n: { numbers: [2, 10] }, thing: { words: K_COUNT_THINGS } },
      render: 'whole',
    },
  },
})
