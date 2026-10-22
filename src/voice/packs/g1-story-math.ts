import { defineVoicePack } from '../types'

/**
 * The `mathStory` activity's 1st-grade lines (Story Woods, 1.OA.1–2), beside
 * kindergarten's `k-story-math`: what the child is asked to do for the new
 * kinds of story, the help's "let's count…" lines, a word about a wrong card,
 * praise, and the number sentence read aloud once the answer is found ("Eight
 * plus five equals thirteen.").
 *
 * The sentences are stitched from the shared number clips (a written sentence
 * read along, word by word); everything else is fixed or recorded whole.
 */
export default defineVoicePack({
  id: 'g1-story-math',
  lines: {
    // ── acting it out ──
    /** Add to, the change unknown: newcomers wait at the side; dashed spots up to the total. */
    actFill: 'Bring them in to fill the empty spots!',
    /** How many fewer: the second group waits by its owner; each tap lines one up under the first. */
    actLineUp: 'Tap each one to line it up!',

    // ── the help: what is counted after the story is acted out again ──
    countCame: "Let's count how many came.",
    countWent: "Let's count how many went away.",
    countLeft: "Let's count the ones that are left.",

    // ── a word about a wrong card ──
    noteTotal: "That's how many there are now.",
    noteCame: "That's how many came.",
    noteLeftNow: "That's how many are still there.",
    noteAll: "That's all of them together.",
    noteTakenOut: "That's how many we took out.",
    noteTwoGroups: "That's only some of the groups. Count them all!",
    noteBigger: "That's the bigger group.",
    noteSmaller: "That's the smaller group.",

    // ── praise (taking turns with the kit's own) ──
    storyStar: 'Super story solving!',
    numberSentence: 'You wrote the number sentence!',
  },
  templates: {
    /** "Eight plus five equals thirteen." (stitched) */
    sayPlus: { text: '{a} plus {b} equals {c}.', slots: { a: { numbers: [0, 20] }, b: { numbers: [0, 20] }, c: { numbers: [0, 20] } }, render: 'stitch' },
    /** "Fifteen minus six equals nine." (stitched) */
    sayMinus: { text: '{a} minus {b} equals {c}.', slots: { a: { numbers: [0, 20] }, b: { numbers: [0, 20] }, c: { numbers: [0, 20] } }, render: 'stitch' },
    /** "Four plus three plus five equals twelve." (stitched) */
    sayPlus3: { text: '{a} plus {b} plus {c} equals {d}.', slots: { a: { numbers: [0, 20] }, b: { numbers: [0, 20] }, c: { numbers: [0, 20] }, d: { numbers: [0, 20] } }, render: 'stitch' },
    /** Take from, the change unknown: "Tap them away until 9 are left!" (14 clips) */
    actAwayTo: { text: 'Tap them away until {n} are left!', slots: { n: { numbers: [3, 16] } }, render: 'whole' },
  },
})
