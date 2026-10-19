import { defineVoicePack } from '../types'

/**
 * Critter Parade (src/games/CritterParade.tsx): the intro, the gate prompts,
 * cheers, the counting cages and the tug-of-war. K–1 hears every gate pair
 * asked out loud ("Plus two or plus five?"); the small-range templates are
 * recorded whole (≤ about 200 sentences each), the open-ended scores stitched.
 */
export default defineVoicePack({
  id: 'parade',
  lines: {
    intro: 'Lead the parade! Walk through the gate that gives us more friends.',
    introKeep: 'Lead the parade! Some gates send friends off for a snack. Pick the gate that keeps more friends.',
    introListen: 'Lead the parade! Tap the gate that gives us more friends.',
    gatePrompt: 'Which gate gives us more friends?',
    keepPrompt: 'Which gate keeps more friends?',
    tapGate: 'Tap the gate you want.',
    smartPick: 'Smart pick!',
    bothWork: 'Both gates give the same. Both work!',
    cheerMore: 'Hooray, more friends!',
    cheerGrow: 'Look at our parade grow!',
    cheerThink: 'Great thinking!',
    otherHadMore: 'The other gate had more. Watch the see-through parade!',
    cageOpen: 'New friends join the parade!',
    paradeFull: 'Our parade is full! On to the tug of war!',
    finaleIntro: 'Tug of war with the Grumble Gang!',
    doWeHaveMore: 'Do we have more?',
    weHaveMore: 'We have more!',
    finaleWin: 'We win! The Grumble Gang cheers up and joins the party!',
    finaleTie: "It's a tie! Everybody wins, and the Grumble Gang joins the party!",
    finaleLose: 'The Grumble Gang pulled harder this time. Want a rematch?',
    nextParade: 'Ready for the next parade?',
    slowMo: 'Slow motion!',
    runDone: 'What a parade! Tap to collect your stars.',
  },
  templates: {
    plusOrPlus: { text: 'Plus {a} or plus {b}?', slots: { a: { numbers: [1, 10] }, b: { numbers: [1, 10] } }, render: 'whole' },
    plusOrTakeAway: { text: 'Plus {a} or take away {b}?', slots: { a: { numbers: [1, 6] }, b: { numbers: [1, 6] } }, render: 'whole' },
    takeAwayOrTakeAway: { text: 'Take away {a} or take away {b}?', slots: { a: { numbers: [1, 6] }, b: { numbers: [1, 6] } }, render: 'whole' },
    friendsJoin: { text: '{n} friends join!', slots: { n: { numbers: [1, 20] } }, render: 'whole' },
    nowWeHave: { text: 'Now we have {n} friends!', slots: { n: { numbers: [1, 20] } }, render: 'whole' },
    plusWouldHave: { text: 'Plus {a} would have made {n}!', slots: { a: { numbers: [1, 10] }, n: { numbers: [2, 20] } }, render: 'whole' },
    winBy: { text: 'We win by {n}!', slots: { n: { numbers: [1, 999] } }, render: 'stitch' },
    usAgainstThem: { text: '{a} against {b}!', slots: { a: { numbers: [1, 999] }, b: { numbers: [1, 999] } }, render: 'stitch' },
  },
})
