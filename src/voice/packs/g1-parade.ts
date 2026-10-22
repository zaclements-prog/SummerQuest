import { defineVoicePack } from '../types'

/**
 * The numbers each template is recorded for: what 1st grade's gate sets make
 * (lib/gates opSets `add20`: + up to 6, a "+2 or −6" trap with − up to 9;
 * `sub20`: − up to 6). Anything else says the plain "Which gate keeps more
 * friends?" (lib/parade/voice).
 */
export const G1_PARADE_RANGES = {
  plusOrMinus: { a: [1, 4], b: [1, 9] },
  minusOrPlus: { a: [1, 9], b: [1, 4] },
  minusOrMinus: { a: [1, 6], b: [1, 6] },
  minusWouldHave: { a: [1, 6], n: [1, 19] },
} as const
const R = G1_PARADE_RANGES

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
    /** 36 clips each. */
    plusOrMinus: { text: 'Plus {a} or minus {b}?', slots: { a: { numbers: R.plusOrMinus.a }, b: { numbers: R.plusOrMinus.b } }, render: 'whole' },
    minusOrPlus: { text: 'Minus {a} or plus {b}?', slots: { a: { numbers: R.minusOrPlus.a }, b: { numbers: R.minusOrPlus.b } }, render: 'whole' },
    minusOrMinus: { text: 'Minus {a} or minus {b}?', slots: { a: { numbers: R.minusOrMinus.a }, b: { numbers: R.minusOrMinus.b } }, render: 'whole' },
    /** 114 clips: after a weak pick, what the other gate would have kept. */
    minusWouldHave: { text: 'Minus {a} would have left {n}!', slots: { a: { numbers: R.minusWouldHave.a }, n: { numbers: R.minusWouldHave.n } }, render: 'whole' },
  },
})
