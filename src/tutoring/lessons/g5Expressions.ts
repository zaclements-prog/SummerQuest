import type { Lesson } from '../types'

// 5th grade (phase 3): Word Problem Woods. Motion scenes:
// src/tutoring/motion/scenes/g5Expressions.tsx (cue phrases come from these
// narration lines; keep them in sync when editing).
export const g5ExpressionsLesson: Lesson = {
  id: 'g5Expressions',
  zoneId: 'word-problem-woods',
  band: 'g5',
  skillIds: ['g5-expr-write', 'g5-expr-order', 'g5-expr-patterns', 'g5-wp-multistep'],
  title: 'Expressions',
  emoji: '🧮',
  intro: 'Write math in the right order, read it without working it out, and solve stories with more than one step.',
  practiceStageId: 'g5-woods-1',
  steps: [
    {
      id: 'order',
      narration: 'Every expression has an order. Work inside the grouping symbols first, then multiply and divide, then add and subtract. In three plus four times five, multiply first: four times five is twenty, and three plus twenty is twenty-three.',
      body: 'Grouping first, then × and ÷, then + and −. 3 + 4 × 5 = 23.',
    },
    {
      id: 'grouping',
      narration: 'Parentheses change the order. Put three plus four in parentheses, then times five. Now we add first: three plus four is seven, and seven times five is thirty-five. Brackets work the same way, around the parentheses.',
      body: '(3 + 4) × 5 = 35. Brackets [ ] group like parentheses.',
      check: { question: 'What is [2 × (9 − 4)] + 7?', options: ['17', '21', '15', '25'], answer: '17', explain: '9 − 4 = 5, then 2 × 5 = 10, then 10 + 7 = 17.' },
    },
    {
      id: 'write',
      narration: 'Words can turn into an expression. Add eight and seven, then multiply by two. The adding happens first, so eight plus seven goes inside parentheses, and we write two times that group. Without working it out, we know it is twice as large as eight plus seven.',
      body: '"Add 8 and 7, then multiply by 2" → 2 × (8 + 7).',
      check: { question: 'Which expression means: Subtract 3 from 10, then multiply by 4.', options: ['4 × (10 − 3)', '4 × 10 − 3', '10 − 3 × 4', '(4 − 3) × 10'], answer: '4 × (10 − 3)', explain: 'The subtracting happens first, so 10 − 3 goes in parentheses, then times 4.' },
    },
    {
      id: 'patterns',
      narration: 'Two patterns can grow side by side. Pattern A starts at zero and adds three: zero, three, six, nine. Pattern B starts at zero and adds six: zero, six, twelve, eighteen. Each term in pattern B is twice the matching term in pattern A.',
      body: 'A: 0, 3, 6, 9. B: 0, 6, 12, 18. Each B term is 2 times the A term.',
      check: { question: 'Pattern A adds 4 and pattern B adds 12, both from 0. Each B term is how many times the A term?', options: ['3', '8', '4', '12'], answer: '3', explain: '4, 8, 12 and 12, 24, 36: every B term is 3 times its A term.' },
    },
    {
      id: 'multiStep',
      narration: 'A multi-step problem hides two steps in one story. A class buys six packs of twenty-four markers and gives thirty away. First multiply: six times twenty-four is one hundred forty-four. Then subtract thirty: one hundred fourteen markers are left.',
      body: '6 × 24 − 30 = 144 − 30 = 114 markers.',
    },
  ],
}
