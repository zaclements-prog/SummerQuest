import type { Lesson } from '../types'
import { askAloud, numeralCards } from './k1Voice'

/**
 * 1st grade: subtracting within 20 (1.OA.4, 1.OA.6, 1.OA.8), for Take-Away
 * Dunes. Take away and count what is left, count back, think addition, and a
 * fact family: three numbers, four number sentences. Voice-first: the stage
 * writes each number sentence as it is said, crosses counters out, hops a
 * frog back along numbered stones, fills a ten-frame counting up, and builds
 * the family's house; the checks are answered with numeral cards. Its
 * practice is "Take away" (`g1-sub-1`).
 */
export const g1SubtractLesson: Lesson = {
  id: 'g1Subtract',
  band: 'g1',
  zoneId: 'division-dunes',
  skillIds: ['g1-take-away', 'g1-think-addition', 'g1-fact-families'],
  title: 'Taking Away',
  emoji: '➖',
  intro: 'Take away, count back, and think addition. Three numbers make a family.',
  practiceStageId: 'g1-sub-1',
  steps: [
    {
      id: 'takeAway',
      narration: 'Nine take away three. Cross out three. Six are left!',
    },
    {
      id: 'countBack',
      narration: 'Your turn! Twelve minus three. Hop back three.',
      check: {
        question: 'What is twelve minus three? Tap the number.',
        speech: askAloud('g1Subtract', 'countBack'),
        options: [10, 9, 15],
        answer: 9,
        explain: 'Start at twelve. Hop back: eleven, ten, nine.',
        pictures: numeralCards([10, 9, 15]),
      },
    },
    {
      id: 'think',
      narration: 'Thirteen minus five. Think addition! Five plus eight makes thirteen. So the answer is eight.',
    },
    {
      id: 'family',
      narration: 'Your turn! Three, five and eight are a family.',
      check: {
        question: 'What is eight minus five? Tap the number.',
        speech: askAloud('g1Subtract', 'family'),
        options: [13, 2, 3],
        answer: 3,
        explain: 'Three and five make eight. So eight minus five is three.',
        pictures: numeralCards([13, 2, 3]),
      },
    },
  ],
}
