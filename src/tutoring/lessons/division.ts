import type { Lesson } from '../types'

export const divisionLesson: Lesson = {
  id: 'division',
  zoneId: 'division-dunes',
  skillIds: ['div-basic', 'div-larger'],
  title: 'Division',
  emoji: '➗',
  intro: 'Division means sharing a number into equal groups.',
  practiceStageId: 'div-practice',
  steps: [
    {
      id: 'share',
      narration: 'Division is sharing fairly. Twelve cookies shared with three friends. How many does each friend get?',
      body: '12 ÷ 3 = ?  Share 12 into 3 equal groups.',
      visual: { kind: 'array', rows: 3, cols: 4, itemEmoji: '🍪' },
    },
    {
      id: 'answer',
      narration: 'Each of the three friends gets four cookies. So twelve divided by three equals four.',
      body: '12 ÷ 3 = 4',
    },
    {
      id: 'inverse',
      narration: 'Division is the opposite of multiplication. Because three times four is twelve, twelve divided by three is four. Use your times tables backwards!',
      body: 'Multiplication: 3 × 4 = 12.  Division: 12 ÷ 3 = 4.',
      check: { question: 'What is 20 ÷ 5?', options: [4, 5, 6, 15], answer: 4, explain: 'Ask: 5 times what is 20? 5 × 4 = 20, so 20 ÷ 5 = 4.' },
    },
  ],
}
