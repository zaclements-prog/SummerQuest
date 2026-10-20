import { defineVoicePack } from '../types'

/**
 * Things to count. The emoji for each lives with the provider
 * (src/lib/providers/kCounting.ts); a test keeps the two lists in step.
 */
export const K_COUNT_THINGS = ['apples', 'stars', 'fish', 'ducks', 'balls', 'flowers', 'bees', 'cars', 'cookies', 'frogs'] as const

/**
 * Kindergarten math (K.CC counting to 10, "how many?"). Every template is a
 * small space, so each filled-in sentence is recorded whole.
 */
export default defineVoicePack({
  id: 'k-math',
  lines: {
    greatCounting: 'Great counting!',
    letsCount: "Let's count!",
  },
  templates: {
    /** 10 clips. The picture lights up on the thing, the number cards on "Tap". */
    howMany: { text: 'How many {thing}? Tap the number.', slots: { thing: { words: K_COUNT_THINGS } }, render: 'whole' },
    /** 90 clips (2–10 × 10 things; no "1 apples"). */
    findGroup: {
      text: 'Tap the group with {n} {thing}.',
      slots: { n: { numbers: [2, 10] }, thing: { words: K_COUNT_THINGS } },
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
