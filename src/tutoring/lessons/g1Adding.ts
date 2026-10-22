import type { Lesson } from '../types'
import { askAloud, numeralCards } from './k1Voice'

/**
 * 1st grade: adding within 20 (1.OA.3, 1.OA.6), for Adding Mesa. Count on
 * from the bigger number (a turn-around fact makes any sum start there), make
 * a ten, and know your doubles. Voice-first: the stage writes each number
 * sentence as it is said ("8 + 3 = 11"), the box of eight and its three dots
 * counted on, two counters hopping over to fill a ten, two rows of six; the
 * checks are answered with numeral cards. Its practice is "Count on" (`g1-add-1`).
 */
export const g1AddingLesson: Lesson = {
  id: 'g1Adding',
  band: 'g1',
  zoneId: 'multiplication-mesa',
  skillIds: ['g1-count-on', 'g1-doubles', 'g1-make-ten'],
  title: 'Adding to Twenty',
  emoji: '➕',
  intro: 'Count on from the bigger number, make a ten, and know your doubles.',
  practiceStageId: 'g1-add-1',
  steps: [
    {
      id: 'countOn',
      narration: 'Eight plus three. Start at eight. Count on: nine, ten, eleven!',
    },
    {
      id: 'turnAround',
      narration: 'Your turn! Two plus nine. Turn it around: start at nine.',
      check: {
        question: 'What is two plus nine? Tap the number.',
        speech: askAloud('g1Adding', 'turnAround'),
        options: [10, 11, 12],
        answer: 11,
        explain: 'Start at nine and count on two: ten, eleven.',
        pictures: numeralCards([10, 11, 12]),
      },
    },
    {
      id: 'makeTen',
      narration: 'Eight plus five. Move two to make ten. Ten and three is thirteen!',
    },
    {
      id: 'doubles',
      narration: 'Your turn! Six and six. That is a double.',
      check: {
        question: 'What is six plus six? Tap the number.',
        speech: askAloud('g1Adding', 'doubles'),
        options: [13, 12, 11],
        answer: 12,
        explain: 'Double six is twelve.',
        pictures: numeralCards([13, 12, 11]),
        // (a wrong pick counts the twelve counters in the two rows)
        countAlong: 12,
      },
    },
  ],
}
