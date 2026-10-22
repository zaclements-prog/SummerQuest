import { defineVoicePack } from '../types'
import { numberWord } from '../../lib/numberWords'

/** The teen numbers and twenty: what Ten Frame Plateau builds (K.NBT.1, K.CC: counting to 20). */
export const K_TEENS_MIN = 11
export const K_TEENS_MAX = 20
/** "What comes next?": the three numbers said start here at the lowest (and the answer is at most 20). */
export const K_NEXT_FIRST = 6

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const w = numberWord
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
const each = <T,>(xs: readonly T[], f: (x: T) => [string, string][]) => Object.fromEntries(xs.flatMap(f))

/** How a teen number is said as a ten and some more ("Ten and three more: thirteen."). */
export const teenSaid = (n: number) => (n === 20 ? 'Two full tens: twenty!' : n === 10 ? 'A full ten: ten!' : `Ten and ${w(n - 10)} more: ${w(n)}.`)

/**
 * Ten Frame Plateau (K.NBT.1; K.CC.2 and K.CC.5 to 20): a teen number is a
 * full ten and some more ones, shown on two ten-frames, said "ten and three
 * more: thirteen". Every line is recorded whole.
 */
export default defineVoicePack({
  id: 'k-teens',
  lines: {
    // ── how many? (two ten-frames: a full ten on top, the ones below) ──
    ...each(range(1, 9), (k) => [[`tenAnd-${k}`, `A full ten and ${w(k)} more. How many dots?`]]),
    twoTens: 'Two full tens. How many dots?',
    howManyDots: 'How many dots? Tap the number.',
    // ── which one shows…? (a numeral; ten-frame cards) ──
    ...each(range(K_TEENS_MIN, K_TEENS_MAX), (n) => [[`shows-${n}`, `Which one shows ${w(n)}?`]]),
    // ── make it (the `build` activity): fill the ten-frames, then ✓ ──
    ...each(range(K_TEENS_MIN, K_TEENS_MAX), (n) => [
      [`make-${n}`, n === 20 ? 'Make twenty: two full tens! Then tap the check.' : `Make ${w(n)}: a full ten and ${w(n - 10)} more! Then tap the check.`],
      [`makeJust-${n}`, `Make ${w(n)}! Then tap the check.`],
    ]),
    // ── what comes next? (three numbers said, then a blank) ──
    ...each(range(K_NEXT_FIRST, K_TEENS_MAX - 3), (a) => [[`next-${a}`, `${cap(w(a))}, ${w(a + 1)}, ${w(a + 2)}. What comes next?`]]),

    // ── the help: the full ten lights, the ones are counted on, then the teen number is said ──
    fullTen: 'A full ten!',
    fillTen: "Let's fill a full ten.",
    ...each(range(10, K_TEENS_MAX), (n) => [[`is-${n}`, teenSaid(n)]]),
    // a ten-frame card with no full ten (the ones alone): counted, then this
    ...each(range(1, 9), (k) => [[`onlyOnes-${k}`, `That's only ${w(k)}. There's no full ten!`]]),
    // what comes next? after a miss: the three numbers again, each lit, then the blank as the next is said
    countOn: "Let's count on.",

    // ── praise (taking turns with the kit's own) ──
    youKnowTens: 'You know your tens!',
    bigCounting: 'Wow, big counting!',
  },
})
