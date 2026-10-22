import type { Lesson } from '../types'

/** A no-break space inside a mixed number ("3 1/4"), as the quizzes print it. */
const _ = '\u00a0'

/**
 * Fraction Falls, 5th grade (5.NF.1–4): unlike denominators made alike, mixed
 * numbers, a benchmark check, multiplying with the area model, a fraction of a
 * whole number, and a fraction as a division. Its practice is the forge in its
 * unlike-denominators mode (g5-frac-1).
 */
export const g5FractionsLesson: Lesson = {
  id: 'g5Fractions',
  zoneId: 'fraction-falls',
  band: 'g5',
  skillIds: ['g5-frac-addsub', 'g5-frac-mult', 'g5-frac-divide', 'g5-frac-compare'],
  title: 'Fraction Power-Ups',
  emoji: '🍰',
  intro: 'Add unlike fractions, multiply them, and see a fraction as a division.',
  practiceStageId: 'g5-frac-1',
  steps: [
    {
      id: 'common',
      narration:
        "To add one half and one third, the pieces have to be the same size. Halves and thirds don't match. Cut both into sixths! One half is three sixths, and one third is two sixths. Three sixths plus two sixths is five sixths.",
      body: '1/2 + 1/3 = 3/6 + 2/6 = 5/6',
      check: {
        question: '1/2 + 1/4 = ?',
        options: ['3/4', '2/6', '2/4', '1/8'],
        answer: '3/4',
        explain: 'Fourths work for both: 1/2 = 2/4, and 2/4 + 1/4 = 3/4. Adding the bottoms (2/6) is the trap!',
      },
    },
    {
      id: 'mixed',
      narration:
        'With mixed numbers, add the whole numbers, then add the fractions. Two and one half plus one and one third is three, plus five sixths: three and five sixths. When you subtract and the first fraction is too small, trade one whole for more pieces.',
      body: `2${_}1/2 + 1${_}1/3 = 3 + 5/6 = 3${_}5/6`,
      check: {
        question: `3${_}1/4 − 1${_}1/2 = ?`,
        options: [`1${_}3/4`, `2${_}1/4`, `1${_}1/4`, `2${_}3/4`],
        answer: `1${_}3/4`,
        explain: `1/4 is less than 1/2, so trade a whole: 3${_}1/4 = 2${_}5/4. Then 2${_}5/4 − 1${_}2/4 = 1${_}3/4.`,
      },
    },
    {
      id: 'estimate',
      narration:
        "Check your answer with benchmarks. Two fifths is a little less than one half. Add one half, and the sum must be a little less than one whole. An answer like three sevenths is too small, so it can't be right.",
      body: '2/5 + 1/2 is a bit less than 1. 3/7 is way too small!',
      check: {
        question: 'Is 3/4 + 2/3 more or less than 1?',
        options: ['more than 1', 'less than 1', 'exactly 1'],
        answer: 'more than 1',
        explain: 'Both are more than one half, so together they make more than one whole.',
      },
    },
    {
      id: 'area',
      narration:
        'To multiply two thirds times three fourths, shade three fourths of a square one way, then two thirds of it the other way. The overlap is six of twelve equal pieces. Multiply the tops and multiply the bottoms: six twelfths, which is one half.',
      body: '2/3 × 3/4 = (2 × 3)/(3 × 4) = 6/12 = 1/2',
      visual: { kind: 'fractionArea', a: { numerator: 3, denominator: 4 }, b: { numerator: 2, denominator: 3 } },
      check: {
        question: '2/3 × 4/5 = ?',
        options: ['8/15', '6/8', '8/5', '6/15'],
        answer: '8/15',
        explain: '2 × 4 = 8 on top and 3 × 5 = 15 on the bottom: 8/15.',
      },
    },
    {
      id: 'whole',
      narration: 'Three fourths times eight means three fourths of eight. Split eight into four equal groups of two. Three of those groups make six.',
      body: '3/4 × 8 = (3 × 8) ÷ 4 = 6',
      check: {
        question: '2/3 × 9 = ?',
        options: ['6', '18', '3', '2/27'],
        answer: '6',
        explain: 'Split 9 into 3 equal groups of 3. Two of those groups make 6.',
      },
    },
    {
      id: 'share',
      narration:
        'A fraction is also a division. Three pizzas are shared by four friends. Cut each pizza into fourths. Every friend gets one fourth of each pizza, so three fourths in all. Three divided by four is three fourths.',
      body: '3 ÷ 4 = 3/4: 3 pizzas, 4 friends, 3/4 each.',
      check: {
        question: '2 pizzas are shared equally by 5 friends. How much pizza does each friend get?',
        options: ['2/5', '5/2', '1/5', '3/5'],
        answer: '2/5',
        explain: 'Sharing 2 among 5 is 2 ÷ 5, which is 2/5 of a pizza.',
      },
    },
  ],
}
