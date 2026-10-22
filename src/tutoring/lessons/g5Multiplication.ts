import type { Lesson } from '../types'

// 5th grade (phase 3): Multiplication Mesa. Motion scenes:
// src/tutoring/motion/scenes/g5Multiplication.tsx (cue phrases come from these
// narration lines; keep them in sync when editing).
export const g5MultiplicationLesson: Lesson = {
  id: 'g5Multiplication',
  zoneId: 'multiplication-mesa',
  band: 'g5',
  skillIds: ['g5-mult-area', 'g5-mult-algorithm', 'g5-mult-powers'],
  title: 'Big Multiplication',
  emoji: '🌳',
  intro: 'Split big numbers by place value, multiply the parts, and add them up.',
  practiceStageId: 'g5-mult-1',
  steps: [
    {
      id: 'split',
      narration: 'To multiply twenty-three by fourteen, split each number by place value. Twenty-three is twenty plus three, and fourteen is ten plus four. Draw a rectangle and cut it into four boxes, one for each pair of parts. This is an area model.',
      body: '23 = 20 + 3 and 14 = 10 + 4: four boxes.',
      visual: { kind: 'areaModel', rows: [20, 3], cols: [10, 4], cells: [[null, null], [null, null]] },
    },
    {
      id: 'partials',
      narration: 'Now fill each box. Twenty times ten is two hundred. Twenty times four is eighty. Three times ten is thirty. Three times four is twelve. These four numbers are the partial products.',
      body: '200, 80, 30 and 12 are the partial products.',
      visual: { kind: 'areaModel', rows: [20, 3], cols: [10, 4], cells: [[200, 80], [30, 12]] },
      check: { question: 'In the area model for 23 × 14, what is 20 × 4?', options: ['80', '8', '800', '24'], answer: '80', explain: '2 × 4 = 8, and the zero in 20 makes it 80.' },
    },
    {
      id: 'total',
      narration: 'Add the partial products: two hundred, plus eighty, plus thirty, plus twelve, makes three hundred twenty-two. So twenty-three times fourteen is three hundred twenty-two.',
      body: '200 + 80 + 30 + 12 = 322, so 23 × 14 = 322.',
      check: { question: 'The partial products of 31 × 12 are 300, 60, 10 and 2. What is 31 × 12?', options: ['372', '312', '362', '302'], answer: '372', explain: '300 + 60 + 10 + 2 = 372. Add every box!' },
    },
    {
      id: 'algorithm',
      narration: 'The standard algorithm does the same work in two rows. First multiply by the ones: twenty-three times four is ninety-two. Then multiply by the tens: twenty-three times ten is two hundred thirty. Add the two rows to get three hundred twenty-two.',
      body: '23 × 4 = 92, 23 × 10 = 230, and 92 + 230 = 322.',
    },
    {
      id: 'powers',
      narration: 'Multiplying by ten moves every digit one place to the left. Ten to the third power means ten times ten times ten, which is one thousand. So six times ten to the third power is six thousand.',
      body: '10³ = 10 × 10 × 10 = 1,000, so 6 × 10³ = 6,000.',
      check: { question: 'What is 4 × 10³?', options: ['4,000', '400', '40,000', '12'], answer: '4,000', explain: '10³ is 1,000, so 4 × 10³ is 4 thousands: 4,000.' },
    },
  ],
}
