import { defineVoicePack } from '../types'
import { countAlongText } from '../../lib/numberWords'

/** The highest number the kit counts to aloud (K counts to 20, K.CC.4–5). */
export const COUNT_MAX = 20

/**
 * The Listen & Play kit's own lines (K–1, voice-first): counting aloud, the
 * gentle walkthrough after a wrong answer, praise and the results card.
 * Subject packs (k-math, …) hold the questions.
 */
export default defineVoicePack({
  id: 'listen',
  lines: {
    countTogether: "Let's count together.",
    /** The walkthrough of a comparison: both groups are counted, one after the other. */
    countEach: "Let's count each group.",
    /** The walkthrough of a shape: each side lights up as it is counted. */
    countSides: "Let's count the sides.",
    yourTurn: 'Now you try!',
    youDidIt: 'You did it!',
    thatsRight: "Yes! That's right!",
    stars1: 'You got one star! Tap the arrow to keep going.',
    stars2: 'You got two stars! Tap the arrow to keep going.',
    stars3: 'You got three stars! Tap the arrow to keep going.',
    tapToCount: 'Tap each one to count it.',
    // count1 … count20: "One.", "One, two.", … — one clip each, so the count has natural rhythm.
    ...Object.fromEntries(Array.from({ length: COUNT_MAX }, (_, i) => [`count${i + 1}`, countAlongText(i + 1)])),
  },
  templates: {
    /** A card's label or the running count: "7!" is said "seven!". */
    number: { text: '{n}!', slots: { n: { numbers: [0, COUNT_MAX] } }, render: 'whole' },
  },
})
