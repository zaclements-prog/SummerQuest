import type { Lesson } from '../types'

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
      narration: 'For a word problem, the first thing to do is read it slowly and picture what is happening in the story. Imagine the box and the crayons in your mind.',
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
      narration: 'Now solve it. There are six rows, and each row has four crayons, so we multiply six times four to find how many crayons there are in all.',
      body: '6 rows × 4 crayons = 24 crayons.',
      check: { question: 'How many crayons? 6 rows of 4.', options: [24, 10, 18, 20], answer: 24, explain: 'Six groups of four: 6 × 4 = 24.' },
    },
  ],
}
