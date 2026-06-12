import type { Lesson } from '../types'

export const multiplicationLesson: Lesson = {
  id: 'multiplication',
  zoneId: 'multiplication-mesa',
  skillIds: ['mult-f2_5', 'mult-f6_9', 'mult-f10_12'],
  title: 'Multiplication',
  emoji: '✖️',
  intro: 'Multiplication is a fast way to add the same number again and again.',
  practiceStageId: 'mult-practice',
  steps: [
    {
      id: 'intro',
      narration: 'Multiplication means adding equal groups. When we say three times four, we mean three groups with four in each group.',
      body: '3 × 4 means 3 groups of 4.',
      visual: { kind: 'array', rows: 3, cols: 4, itemEmoji: '🍎' },
    },
    {
      id: 'count',
      narration: 'Look at the rows. Count them all: four, eight, twelve. Three rows of four make twelve. So three times four equals twelve.',
      body: 'Count the rows: 4, 8, 12.  →  3 × 4 = 12',
      visual: { kind: 'array', rows: 3, cols: 4, itemEmoji: '⭐' },
    },
    {
      id: 'commutative',
      narration: 'Here is a trick. Three times four and four times three give the same answer. You can flip the numbers to make it easier.',
      body: '3 × 4 = 12 and 4 × 3 = 12. Same answer!',
      visual: { kind: 'array', rows: 4, cols: 3, itemEmoji: '🔵' },
    },
    {
      id: 'skip',
      narration: 'For the harder facts, skip count. For seven times three, count by sevens: seven, fourteen, twenty-one.',
      body: 'Skip count by 7s: 7, 14, 21.  →  7 × 3 = 21',
      check: { question: 'What is 7 × 3?', options: [21, 24, 18, 10], answer: 21, explain: 'Count by 7s three times: 7, 14, 21.' },
    },
  ],
}
