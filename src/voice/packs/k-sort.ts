import { defineVoicePack } from '../types'

/**
 * The groups Sorting Delta sorts into (K.MD.3): by kind, by colour, by size.
 * Each box shows its group with pictures or a colour swatch, never a word;
 * the narrator names each box as it lights up. The pictures for each group
 * live with the provider (src/lib/providers/kSort.ts); a test keeps the
 * lists in step.
 */
export const K_SORT_GROUPS = ['animals', 'food', 'toys', 'red', 'blue', 'yellow', 'green', 'big', 'small'] as const

/**
 * Kindergarten sorting and counting (Sorting Delta, K.MD.3): sort the things
 * into two or three boxes (the `sort` activity: drag each one, or tap it and
 * then its box), count a group, then say which group has more.
 */
export default defineVoicePack({
  id: 'k-sort',
  lines: {
    // ── asking: the rule, then each box named as it lights up, then the child's turn ──
    letsSort: "Let's sort! Look at the boxes.",
    byColor: "Let's sort by color! Look at the boxes.",
    bySize: "Let's sort by size! Look at the boxes.",
    'box-animals': 'Animals!',
    'box-food': 'Food!',
    'box-toys': 'Toys!',
    'box-red': 'Red!',
    'box-blue': 'Blue!',
    'box-yellow': 'Yellow!',
    'box-green': 'Green!',
    'box-big': 'Big ones!',
    'box-small': 'Small ones!',
    putEach: 'Put each one in its box!',
    // ── a wrong box: the thing bounces back, and a word about it, its own box lit ──
    'is-animals': 'That one is an animal!',
    'is-food': 'That one is food!',
    'is-toys': 'That one is a toy!',
    'is-red': 'That one is red!',
    'is-blue': 'That one is blue!',
    'is-yellow': 'That one is yellow!',
    'is-green': 'That one is green!',
    'is-big': 'That one is big!',
    'is-small': 'That one is small!',
    // ── once all are sorted ──
    /** One box lit, then the numeral cards on "Tap". */
    howMany: 'How many in this group? Tap the number!',
    /** The boxes lit; the child taps the box with more. */
    whichMore: 'Which group has more? Tap it!',
    // praise for this pack's questions (taking turns with the kit's own)
    greatSorting: 'Great sorting!',
    allSorted: 'All sorted!',
  },
})
