import { defineVoicePack } from '../types'

/**
 * Critter Parade at 1st grade (Adding Mesa's + gates, Take-Away Dunes' −
 * gates, written as numerals): what kindergarten's `parade` lines don't say.
 * The gate pairs are asked aloud ("Minus three or minus eight?"), a − parade
 * is about keeping friends, and a weak pick hears what the other gate would
 * have left. The small-range templates are recorded whole.
 */
export default defineVoicePack({
  id: 'g1-parade',
  lines: {
    introKeep: 'Lead the parade! Some gates send friends off for a snack. Tap the gate that keeps more friends.',
  },
  templates: {
    /** 81 clips each. */
    plusOrMinus: { text: 'Plus {a} or minus {b}?', slots: { a: { numbers: [1, 9] }, b: { numbers: [1, 9] } }, render: 'whole' },
    minusOrPlus: { text: 'Minus {a} or plus {b}?', slots: { a: { numbers: [1, 9] }, b: { numbers: [1, 9] } }, render: 'whole' },
    minusOrMinus: { text: 'Minus {a} or minus {b}?', slots: { a: { numbers: [1, 9] }, b: { numbers: [1, 9] } }, render: 'whole' },
    /** 171 clips: after a weak pick, what the other gate would have kept. */
    minusWouldHave: { text: 'Minus {a} would have left {n}!', slots: { a: { numbers: [1, 9] }, n: { numbers: [1, 19] } }, render: 'whole' },
  },
})
