import type { Lesson } from '../types'

/**
 * Place Value Plateau, 5th grade (5.NBT.1, 5.NBT.3–4, 5.NBT.7; powers of 10):
 * places to thousandths, reading a decimal, comparing place by place, rounding,
 * the point sliding under × and ÷ by ten, and + and × with decimals. Its
 * practice is Decimal Detective (g5-dec-1).
 */
export const g5DecimalsLesson: Lesson = {
  id: 'g5Decimals',
  zoneId: 'place-value-plateau',
  band: 'g5',
  skillIds: ['g5-dec-place', 'g5-dec-compare', 'g5-dec-round', 'g5-dec-ops', 'g5-dec-pow10'],
  title: 'Decimals to Thousandths',
  emoji: '🔬',
  intro: 'Tenths, hundredths, thousandths: read, compare, round and compute with decimals.',
  practiceStageId: 'g5-dec-1',
  steps: [
    {
      id: 'places',
      narration:
        'Decimal places keep going to the right of the ones: tenths, hundredths, thousandths. Each place is worth ten times the place to its right. In three point four seven two, the four is four tenths, the seven is seven hundredths, and the two is two thousandths.',
      body: '3.472 = 3 + 0.4 + 0.07 + 0.002',
      check: {
        question: 'In 5.384, what is the value of the 8?',
        options: ['0.08', '0.8', '8', '0.008'],
        answer: '0.08',
        explain: 'The 8 is in the hundredths place. Eight hundredths is 0.08.',
      },
    },
    {
      id: 'names',
      narration:
        "Read three point four seven two as three and four hundred seventy-two thousandths. The word and stands for the decimal point, and the last digit's place names the fraction.",
      body: '3.472 → "three and four hundred seventy-two thousandths"',
      check: {
        question: 'Which number is six and fifteen hundredths?',
        options: ['6.15', '6.015', '615', '6.5'],
        answer: '6.15',
        explain: 'Fifteen hundredths needs two places after the point: 6.15.',
      },
    },
    {
      id: 'compare',
      narration:
        'Compare decimals place by place from the left, not by how long they are. Which is bigger, zero point five or zero point four five? Five tenths beats four tenths, so zero point five is greater. Writing a zero helps: zero point five zero is more than zero point four five.',
      body: '0.5 = 0.50 > 0.45',
      check: {
        question: 'Which number is the greatest?',
        options: ['0.7', '0.65', '0.698', '0.07'],
        answer: '0.7',
        explain: '7 tenths beats 6 tenths. Lined up: 0.700, 0.650, 0.698, 0.070.',
      },
    },
    {
      id: 'round',
      narration:
        "To round three point four seven six to the nearest tenth, look one place to the right, at the hundredths digit. It's a seven, which is five or more, so round up: three point five.",
      body: '3.476 → 3.5 (to the nearest tenth)',
      check: {
        question: 'Round 8.243 to the nearest hundredth.',
        options: ['8.24', '8.25', '8.2', '8.3'],
        answer: '8.24',
        explain: 'The thousandths digit is 3, less than 5, so the hundredths stay: 8.24.',
      },
    },
    {
      id: 'powers',
      narration:
        'Multiplying by ten makes every digit worth ten times more, so the digits slide one place to the left. Three point four five times ten is thirty-four point five, and times one hundred is three hundred forty-five. Dividing by ten slides them to the right.',
      body: '3.45 × 10 = 34.5    3.45 × 100 = 345    3.45 ÷ 10 = 0.345',
      check: {
        question: '2.7 × 100 = ?',
        options: ['270', '27', '2.700', '0.027'],
        answer: '270',
        explain: '× 100 slides every digit two places left: 2.7 becomes 270.',
      },
    },
    {
      id: 'operate',
      narration:
        'To add, line up the decimal points so tenths add to tenths: four point five plus two point three seven is six point eight seven. To multiply zero point six times zero point four, multiply six times four, which is twenty-four. Tenths times tenths make hundredths, so the answer is zero point two four.',
      body: '4.50 + 2.37 = 6.87    0.6 × 0.4 = 0.24',
      check: {
        question: '0.3 × 0.2 = ?',
        options: ['0.06', '0.6', '6', '0.5'],
        answer: '0.06',
        explain: '3 × 2 = 6, and tenths times tenths make hundredths: 0.06.',
      },
    },
  ],
}
