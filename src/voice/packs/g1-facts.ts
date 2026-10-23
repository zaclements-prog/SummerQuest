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
 * written). The questions are fixed lines too, one per true sentence within
 * 20 (`add-8-5`: "What is eight plus five?"), so no clip is recorded for a
 * sentence no stage can ask. The counting itself ("nine!", "ten!") is the
 * Listen & Play kit's own `listen/number`.
 */

const w = numberWord
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
const each = <T,>(xs: readonly T[], f: (x: T) => [string, string][]) => Object.fromEntries(xs.flatMap(f))

/** Take-away and missing-part questions take away (or are missing) at most this many. */
export const G1_CHANGE_MAX = 10

/** The question lines, one per true sentence within 20 (see `factAskId`). */
export type G1FactAskKind = 'add' | 'sub' | 'addB' | 'addA' | 'subB'
/**
 * A question's line id: `add-8-5` ("What is eight plus five?"), `sub-13-5`
 * ("What is thirteen minus five?"), `addB-5-13` ("Five plus what makes
 * thirteen?"), `addA-4-9` ("What plus four makes nine?"), `subB-12-4`
 * ("Twelve minus what is four?").
 */
export const factAskId = (kind: G1FactAskKind, x: number, y: number) => `${kind}-${x}-${y}`
/** Every question the pack says: [kind, x, y, text]. */
export function g1FactAsks(): [G1FactAskKind, number, number, string][] {
  const out: [G1FactAskKind, number, number, string][] = []
  for (let a = 1; a <= 19; a++) for (let b = 1; a + b <= 20; b++) out.push(['add', a, b, `What is ${w(a)} plus ${w(b)}?`])
  for (let b = 1; b <= G1_CHANGE_MAX; b++)
    for (let a = b + 1; a <= 20; a++) {
      out.push(['sub', a, b, `What is ${w(a)} minus ${w(b)}?`])
      // a + ? = c and ? + b = c, with the known part up to ten
      out.push(['addB', b, a, `${cap(w(b))} plus what makes ${w(a)}?`])
      out.push(['addA', b, a, `What plus ${w(b)} makes ${w(a)}?`])
      // a − ? = c, the part left up to ten
      out.push(['subB', a, b, `${cap(w(a))} minus what is ${w(b)}?`])
    }
  return out
}

/** "Eight and three make eleven.": every pair of parts with a whole up to 20 (both orders). */
export const makeLineId = (a: number, b: number) => `make-${a}-${b}`
/** "Six are left." (0–19) */
export const leftLineId = (n: number) => `left-${n}`

export default defineVoicePack({
  id: 'g1-facts',
  lines: {
    // ── the questions: one line per true sentence within 20 ──
    ...Object.fromEntries(g1FactAsks().map(([kind, x, y, text]) => [factAskId(kind, x, y), text])),

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
    // ── a first miss: the help stops one step short of the answer and asks ──
    'stop-inAll': 'So how many in all?',
    'stop-left': 'So how many are left?',
    'stop-land': 'So where do we land?',
    'stop-fill': 'So how many did we fill in?',
    // a double's help: every counter counted, then the double said
    countAll: "Let's count them all.",
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
    /** 9 clips: "Tap 3 to take them away!" (two or more) */
    actTake: { text: 'Tap {n} to take them away!', slots: { n: { numbers: [2, G1_CHANGE_MAX] } }, render: 'whole' },
  },
})
