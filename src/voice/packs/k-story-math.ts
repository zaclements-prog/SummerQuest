import { defineVoicePack } from '../types'

/**
 * The `mathStory` activity's own lines (K.OA.1–5: adding to, taking from,
 * putting together, how many more, making ten), shared by Add-and-Take Falls
 * and Story Woods. The questions and the stories themselves are in `k-addtake`
 * and `k-woods`; these are what the activity says around them:
 *
 * - Story Woods' "act it out" prompts, said after a story's change line, when
 *   the child taps the things to move them;
 * - the help after a wrong card: watch (or act) the story again, slowly,
 *   counting the change one by one, then count the answer;
 * - a word about a wrong card ("That's how many there were at the start.");
 * - "Three more make ten!" after counting a ten-frame's empty spots.
 *
 * Every line is fixed, or a small template recorded whole.
 */
export default defineVoicePack({
  id: 'k-story-math',
  lines: {
    // ── acting the story out (Story Woods): the things to tap light up ──
    /** The newcomers wait at the side: each tap brings one in. */
    actIn: 'Tap each one to bring it in!',
    /** Some leave: each tap sends one away (the child decides which, and stops at the story's number). */
    actAway: 'Tap each one that goes away!',
    /** The second kind waits by the basket: each tap puts one in. */
    actPut: 'Tap each one to put it in!',
    /** How many more: each tap gives one to the next friend in the row. */
    actGive: 'Tap each one to give it to a friend!',

    // ── the help after a wrong card ──
    /** Add-and-Take Falls: the story again, slowly, the change counted one by one. */
    watchAgain: "Let's watch it again.",
    /** Story Woods: the same, with the hand doing the acting. */
    actTogether: "Let's act it out together.",
    /** A ten-frame, or a row of friends still waiting: each empty spot fills as it is counted. */
    countEmpty: "Let's count the empty spots.",

    // ── a word about the wrong card that was tapped ──
    noteStart: "That's how many there were at the start.",
    noteMoreCame: 'More came, so there are more now.',
    noteSomeLeft: 'Some went away, so there are fewer now.',
    noteGone: "That's how many went away.",
    noteOneKind: "That's just one kind. Count them all!",
    noteFull: "That's how many are there already.",
    noteTen: 'Ten fills the whole frame.',
    noteFriends: "That's how many friends there are.",
    noteHave: "That's how many we have.",

    // ── making ten ──
    oneMoreMakesTen: 'One more makes ten!',

    // ── praise for these questions (taking turns with the kit's own) ──
    greatAdding: 'Great adding!',
    greatTakingAway: 'Great taking away!',
    youMadeTen: 'You made ten!',
    youSolvedIt: 'You solved the story!',
    smartThinking: 'Smart thinking!',
  },
  templates: {
    /** 8 clips: said after the empty spots are counted (one: `oneMoreMakesTen`). */
    moreMakeTen: { text: '{n} more make ten!', slots: { n: { numbers: [2, 9] } }, render: 'whole' },
  },
})
