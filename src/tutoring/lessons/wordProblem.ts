import type { Lesson } from '../types'

// Motion scenes: src/tutoring/motion/scenes/wordProblem.tsx (cue phrases come
// from these narration lines; keep them in sync when editing).
export const wordProblemLesson: Lesson = {
  id: 'wordProblem',
  zoneId: 'word-problem-woods',
  skillIds: ['wp-solve'],
  title: 'Word Problems',
  emoji: '📖',
  intro: 'A word problem is a math puzzle hidden inside a little story.',
  practiceStageId: 'wp-practice',
  steps: [
    {
      id: 'read',
      narration: 'First, read the problem slowly: A box has six rows of four crayons. How many crayons are there in all? Then picture the story in your mind. See the box, and the crayons lined up inside it.',
      body: 'Read slowly. Make a picture in your head.',
      visual: { kind: 'wordProblem', text: 'A box has 6 rows of 4 crayons. How many crayons are there in all?' },
    },
    {
      id: 'plan',
      narration: 'Next, find the question the problem is asking, and then choose the right operation. When the story has equal groups, like rows that are all the same size, that is a clue to multiply.',
      body: 'Equal groups → multiply.',
    },
    {
      id: 'solve',
      narration: 'Now solve it. There are six rows, and each row has four crayons, so we multiply six times four. Count by fours: four, eight, twelve, sixteen, twenty, twenty-four! There are twenty-four crayons in all.',
      body: '6 rows × 4 crayons = 24 crayons.',
      // A new story with the same structure, so the check tests the idea (equal
      // rows → multiply) rather than repeating the answer just shown.
      check: { question: 'A garden has 3 rows of 5 flowers. How many flowers in all?', options: [15, 8, 35, 2], answer: 15, explain: 'Three equal rows of five: 3 × 5 = 15. Count by fives: 5, 10, 15.' },
    },
  ],
}
