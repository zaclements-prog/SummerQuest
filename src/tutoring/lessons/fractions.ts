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
      id: 'unlikebottom',
      narration: 'When the bottom numbers are different, think about the size of the pieces. The fewer pieces a whole is cut into, the bigger each piece is. So halves are bigger pieces than thirds.',
      body: 'Fewer pieces = bigger pieces.  1/2 > 1/3',
      check: { question: 'Which is bigger, 1/2 or 1/3?', options: ['1/2', '1/3', 'equal', 'cannot tell'], answer: '1/2', explain: 'Halves are bigger pieces than thirds, so one half is more.' },
    },
  ],
}
