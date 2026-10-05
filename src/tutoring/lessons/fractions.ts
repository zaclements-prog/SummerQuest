import type { Lesson } from '../types'

export const fractionsLesson: Lesson = {
  id: 'fractions',
  zoneId: 'fraction-falls',
  skillIds: ['frac-equiv', 'frac-cmp-likeden', 'frac-cmp-unlikeden'],
  title: 'Fractions',
  emoji: '🍕',
  intro: 'A fraction is a way to show part of a whole thing.',
  practiceStageId: 'frac-practice',
  steps: [
    {
      id: 'parts',
      narration: 'A fraction shows part of a whole. The bottom number tells how many equal pieces the whole is cut into, and the top number tells how many of those pieces we have.',
      body: '1/4 means 1 piece out of 4 equal pieces.',
      visual: { kind: 'fraction', numerator: 1, denominator: 4, shape: 'circle' },
    },
    {
      id: 'equivalent',
      narration: 'Watch this. Two fourths covers the same amount of space as one half. They look like different numbers, but they are the exact same amount. We call those equivalent fractions.',
      body: '1/2 = 2/4. Different numbers, same amount.',
      visual: { kind: 'fractionCompare', a: { numerator: 1, denominator: 2 }, b: { numerator: 2, denominator: 4 } },
    },
    {
      id: 'samebottom',
      narration: 'When the bottom numbers match, the fraction with more pieces on top is the bigger one. Three fifths is more than two fifths because three pieces is more than two pieces.',
      body: 'Same bottom? More on top wins.  3/5 > 2/5',
      visual: { kind: 'fractionCompare', a: { numerator: 2, denominator: 5 }, b: { numerator: 3, denominator: 5 } },
    },
    {
      // Only valid when the numerators match (1/2 > 1/3, 2/3 > 2/5) — say so, so
      // kids don't apply "fewer pieces wins" to pairs like 2/3 vs 5/6.
      id: 'unlikebottom',
      narration: 'When the top numbers are the same, look at the size of the pieces. The fewer pieces a whole is cut into, the bigger each piece is. So one half is more than one third. This trick only works when the tops match!',
      body: 'Same top? Fewer pieces = bigger pieces.  1/2 > 1/3',
      visual: { kind: 'fractionCompare', a: { numerator: 1, denominator: 2 }, b: { numerator: 1, denominator: 3 } },
      check: { question: 'Which is bigger, 2/3 or 2/5?', options: ['2/3', '2/5', 'equal', 'cannot tell'], answer: '2/3', explain: 'Both have 2 pieces on top. Thirds are bigger pieces than fifths, so two thirds is more.' },
    },
    {
      // CCSS 4.NF.A.2: different numerators AND denominators — make a common
      // denominator (or compare to the benchmark 1/2). The check is chosen so the
      // "fewer pieces" shortcut gives the WRONG answer (it would pick 2/3).
      id: 'matchbottoms',
      narration: 'When the tops and the bottoms are both different, the fewer pieces trick can fool you. Make the bottoms match first. Two fifths is the same as four tenths, and four tenths is less than seven tenths. So seven tenths is bigger.',
      body: 'Make the bottoms match:  2/5 = 4/10,  so 2/5 < 7/10.  Or compare to 1/2: 2/5 is less than half, 7/10 is more.',
      visual: { kind: 'fractionCompare', a: { numerator: 2, denominator: 5 }, b: { numerator: 7, denominator: 10 } },
      check: { question: 'Which is bigger, 2/3 or 5/6?', options: ['5/6', '2/3', 'equal', 'cannot tell'], answer: '5/6', explain: 'Two thirds is the same as four sixths, and five sixths is more than four sixths. So 5/6 is bigger, even though sixths are smaller pieces.' },
    },
  ],
}
