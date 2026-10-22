import { defineVoicePack } from '../types'
import { numberWord } from '../../lib/numberWords'

/**
 * 1st grade number sentences (Adding Mesa and Take-Away Dunes, 1.OA.3–8), the
 * `numberSentence` activity: the question ("What is 8 plus 5?"), a strategy
 * hint as the picture under the sentence lights up, what to do when the child
 * acts the strategy out, the help after a wrong card (start at 8 and count
 * on, 8 needs 2 more to make ten, double 6 is 12…), a word about a wrong
 * card, and praise.
 *
 * Fixed lines spell their numbers out (the recording says exactly what is
 * written); the questions are templates recorded whole, one clip per
 * sentence, over the numbers a stage asks. The counting itself ("nine!",
 * "ten!") is the Listen & Play kit's own `listen/number`.
 */

const w = numberWord
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
const each = <T,>(xs: readonly T[], f: (x: T) => [string, string][]) => Object.fromEntries(xs.flatMap(f))

/** The largest number an addition question starts from (count on from up to 17). */
export const G1_ADD_A_MAX = 17
/** Questions add or take away at most this many. */
export const G1_CHANGE_MAX = 10

/** "Eight and three make eleven.": every pair of parts with a whole up to 20 (both orders). */
export const makeLineId = (a: number, b: number) => `make-${a}-${b}`
/** "Six are left." (0–19) */
export const leftLineId = (n: number) => `left-${n}`

export default defineVoicePack({
  id: 'g1-facts',
  lines: {
    // ── hints: said as the picture under the sentence lights up ──
    hintCountOn: 'Start with the bigger number. Count on!',
    hintTurn: 'A turn-around fact! The same numbers make the same total.',
    hintDouble: 'It is a double! Two of the same.',
    hintNear: 'Almost a double. Just one more!',
    hintMakeTen: 'Make a ten to help!',
    hintTake: 'Take some away. How many are left?',
    hintBack: 'Count back to take away!',
    hintThink: 'Think addition!',
    hintMissing: 'What number is missing?',
    hintFamily: 'These three numbers are a family.',

    // ── acting the strategy out first (the cards wait) ──
    actCountOn: 'Tap each dot to count on!',
    actBack: 'Tap the frog to hop back!',
    actFill: 'Tap each empty spot to count up!',
    actMove: 'Tap the dots to fill the ten!',

    // ── the help after a wrong card ──
    biggerFirst: 'Start with the bigger number.',
    turnAround: 'Turn it around. The same numbers make the same total.',
    familyRule: 'Two parts make the whole. Take away a part, and the other part is left.',
    // "Start at eight." (then each dot is counted on: "nine!", "ten!")
    ...each(range(1, 19), (n) => [[`startAt-${n}`, `Start at ${w(n)}.`]]),
    // "Eight needs two more to make ten."
    ...each(range(1, 9), (a) => [[`needs-${a}`, `${cap(w(a))} needs ${w(10 - a)} more to make ten.`]]),
    // "Ten and three more is thirteen."
    ...each(range(1, 10), (n) => [[`tenAnd-${n}`, `Ten and ${w(n)} more is ${w(10 + n)}.`]]),
    // "Double six is twelve."
    ...each(range(1, 10), (n) => [[`double-${n}`, `Double ${w(n)} is ${w(2 * n)}.`]]),
    // "Six and six make twelve. One more is thirteen."
    ...each(range(1, 9), (n) => [[`near-${n}`, `${cap(w(n))} and ${w(n)} make ${w(2 * n)}. One more is ${w(2 * n + 1)}.`]]),
    // "Take away three."
    ...each(range(1, G1_CHANGE_MAX), (n) => [[`take-${n}`, `Take away ${w(n)}.`]]),
    // "Six are left."
    ...each(range(0, 19), (n) => [[leftLineId(n), n === 0 ? 'None are left.' : n === 1 ? 'One is left.' : `${cap(w(n))} are left.`]]),
    // "Hop back three."
    ...each(range(1, 9), (n) => [[`hop-${n}`, `Hop back ${w(n)}.`]]),
    // "We land on nine."
    ...each(range(0, 19), (n) => [[`land-${n}`, `We land on ${w(n)}.`]]),
    // "Eight and three make eleven."
    ...each(range(1, 19), (a) => range(1, 20 - a).map((b): [string, string] => [makeLineId(a, b), `${cap(w(a))} and ${w(b)} make ${w(a + b)}.`])),

    // ── a word about a wrong card ──
    noteNext: "Count on from the next number. Don't count the first one again!",
    notePart: "That's one of the numbers we're adding.",
    noteTookAway: "That's taking away. Plus means put them together!",
    noteTen: "That's just the ten. Add the extra ones too!",
    noteDouble: "That's the double. Add one more!",
    noteAdded: "That's adding. Minus means take away!",
    noteBackOne: 'Count back from the next number down.',
    noteWhole: "That's how many there were at the start.",
    noteTaken: "That's how many we took away.",
    noteKnown: 'That number is already in the sentence.',
    noteIsWhole: "That's the whole. Find the missing part!",

    // ── praise (taking turns with the kit's own) ──
    niceCountingOn: 'Nice counting on!',
    doublesPro: 'You know your doubles!',
    tenPro: 'You made a ten! So smart!',
    greatSubtracting: 'Great subtracting!',
    thinkPro: 'Great thinking!',
  },
  templates: {
    /** 289 clips: "What is 8 plus 5?" (and "3 plus 14": the smaller number first) */
    add: { text: 'What is {a} plus {b}?', slots: { a: { numbers: [1, G1_ADD_A_MAX] }, b: { numbers: [1, G1_ADD_A_MAX] } }, render: 'whole' },
    /** 190 clips: "What is 13 minus 5?" */
    sub: { text: 'What is {a} minus {b}?', slots: { a: { numbers: [2, 20] }, b: { numbers: [1, G1_CHANGE_MAX] } }, render: 'whole' },
    /** 190 clips: "5 plus what makes 13?" (5 + ? = 13: think addition, the missing part) */
    addB: { text: '{a} plus what makes {c}?', slots: { a: { numbers: [1, G1_CHANGE_MAX] }, c: { numbers: [2, 20] } }, render: 'whole' },
    /** 190 clips: "What plus 4 makes 9?" (? + 4 = 9) */
    addA: { text: 'What plus {b} makes {c}?', slots: { b: { numbers: [1, G1_CHANGE_MAX] }, c: { numbers: [2, 20] } }, render: 'whole' },
    /** 190 clips: "12 minus what is 4?" (12 − ? = 4) */
    subB: { text: '{a} minus what is {c}?', slots: { a: { numbers: [2, 20] }, c: { numbers: [1, G1_CHANGE_MAX] } }, render: 'whole' },
    /** 9 clips: "Tap 3 to take them away!" (two or more) */
    actTake: { text: 'Tap {n} to take them away!', slots: { n: { numbers: [2, G1_CHANGE_MAX] } }, render: 'whole' },
  },
})
