import { defineVoicePack } from '../types'
import { numberWord } from '../../lib/numberWords'

/** Two-digit numbers on base-ten blocks: what Tens Plateau builds and compares (1.NBT.2–3). */
export const G1_TENS_MIN = 11
export const G1_TENS_MAX = 99
/** 1st grade counts, reads and writes numbers to 120 (1.NBT.1). */
export const G1_COUNT_MAX = 120
/** "What comes next?": the three numbers said start here at the lowest, so the answer runs 20–120. */
export const G1_NEXT_FIRST = 17
/** Ten more starts at most here (the answer stays two-digit); ten less starts at least here. */
export const G1_TEN_MORE_MAX = 89
export const G1_TEN_LESS_MIN = 21

/** A number the mat asks for: two digits, at least two ones. */
export const buildable = (n: number) => n >= G1_TENS_MIN && n <= G1_TENS_MAX && n % 10 >= 2

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const w = numberWord
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
const each = <T,>(xs: readonly T[], f: (x: T) => [string, string][]) => Object.fromEntries(xs.flatMap(f))

/** "three tens and six ones" ("one ten", "four tens" with no ones, "ten tens"). */
export function tensAndOnes(n: number): string {
  const t = Math.floor(n / 10)
  const o = n % 10
  const tens = t === 1 ? 'one ten' : `${w(t)} tens`
  if (!o) return tens
  return `${tens} and ${w(o)} ${o === 1 ? 'one' : 'ones'}`
}

/** How a number is said as its tens and ones: "Three tens and six ones: thirty-six." */
export const tensOnesSaid = (n: number) => (n === 100 ? 'Ten tens: one hundred!' : `${cap(tensAndOnes(n))}: ${w(n)}.`)

/** Counting the tens of a number: "Ten, twenty, thirty." */
export const tensCountText = (t: number) => `${cap(range(1, t).map((k) => w(k * 10)).join(', '))}.`

/**
 * Tens Plateau (1st grade; 1.NBT.1–3, 1.NBT.5): tens and ones on base-ten
 * blocks (a rod is a ten, a cube is a one), counting to 120, comparing
 * two-digit numbers with > < =, ten more and ten less. Every line is recorded
 * whole (the number templates have at most 121 combinations each).
 */
export default defineVoicePack({
  id: 'g1-tens',
  lines: {
    // ── how many? (rods and cubes; numeral cards) ──
    howMany: 'How many? Count the tens, then the ones.',
    howManyPlain: 'How many? Tap the number.',
    // ── make it (the `buildTens` activity): tap rods and cubes onto the mat, then ✓ ──
    // (never a number ending in 0 or 1: "four tens and one one" is a mouthful to ask with)
    ...each(range(G1_TENS_MIN, G1_TENS_MAX).filter(buildable), (n) => [[`make-${n}`, `Make ${w(n)}: ${tensAndOnes(n)}! Then tap the check.`]]),
    // ── what comes next? (three numbers said, then a blank) ──
    ...each(range(G1_NEXT_FIRST, G1_COUNT_MAX - 3), (a) => [[`next-${a}`, `${cap(w(a))}, ${w(a + 1)}, ${w(a + 2)}. What comes next?`]]),
    // ── compare (two numbers; tap the bigger one, or the sign that fits) ──
    bigger: 'Which number is bigger? Tap it.',
    smaller: 'Which number is smaller? Tap it.',
    sign: 'Which sign goes in the box?',
    // the sign cards' names, said as they are tapped
    greater: 'Greater than!',
    less: 'Less than!',
    equal: 'Equal to!',

    // ── the help ──
    // tens and ones: the rods light as the tens are counted, the cubes as the ones are counted on
    ...each(range(1, 9), (t) => [[`tens-${t}`, tensCountText(t)]]),
    ...each(range(10, 100), (n) => [[`is-${n}`, tensOnesSaid(n)]]),
    countTens: "Let's count the tens.",
    letsMake: "Let's make it together.",
    // (building: a tenth cube on the mat snaps the ten cubes into a rod)
    tenOnesMakeTen: 'Ten ones make a ten!',
    countOn: "Let's count on.",
    // comparing: each number's tens and ones, then what decides it
    tensFirst: 'Look at the tens first.',
    moreTens: 'More tens is bigger!',
    sameTens: 'Same tens. Then more ones is bigger!',
    sameNumber: 'They are the same number. They are equal!',
    openSide: 'The open side faces the bigger number.',
    // ten more / ten less: a ten (a rod) comes or goes; the ones stay the same
    onesStay: 'The ones stay the same. Only the tens change!',

    // ── praise (taking turns with the kit's own) ──
    tensPro: 'You know your tens and ones!',
    bigNumbers: 'Wow, big numbers!',
  },
  templates: {
    /** A card's name, the count on and the running count: "47!" is said "forty-seven!". */
    number: { text: '{n}!', slots: { n: { numbers: [0, G1_COUNT_MAX] } }, render: 'whole' },
    /** A numeral; three base-ten cards. */
    shows: { text: 'Which one shows {n}?', slots: { n: { numbers: [G1_TENS_MIN, G1_TENS_MAX] } }, render: 'whole' },
    /** A numeral; digit cards (the tens, the ones, the tens' worth). */
    tensIn: { text: 'How many tens are in {n}?', slots: { n: { numbers: [G1_TENS_MIN, G1_TENS_MAX] } }, render: 'whole' },
    /** A rod rolls in on "Ten more" (1.NBT.5). */
    tenMore: { text: 'Here is {n}. Ten more comes in! How many now?', slots: { n: { numbers: [G1_TENS_MIN, G1_TEN_MORE_MAX] } }, render: 'whole' },
    /** A rod rolls away on "Ten goes away". */
    tenLess: { text: 'Here is {n}. Ten goes away! How many now?', slots: { n: { numbers: [G1_TEN_LESS_MIN, G1_TENS_MAX] } }, render: 'whole' },
    /**
     * Make it (the `buildTens` activity), asked: just the number. The tens and
     * ones (`make-<n>`, "Make thirty-six: three tens and six ones!…") are the
     * help, asked again after a miss.
     */
    makeIt: { text: 'Make {n}! Then tap the check.', slots: { n: { numbers: [G1_TENS_MIN, G1_TENS_MAX] } }, render: 'whole' },
  },
})
