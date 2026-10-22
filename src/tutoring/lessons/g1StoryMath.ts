import type { Lesson } from '../types'
import { askAloud, numeralCards } from './k1Voice'

/**
 * 1st grade: story problems within 20 (1.OA.1–2), for Story Woods. Act the
 * story out and write its number sentence; find a missing number (some flew
 * away: how many?); add three groups by making a ten first; line two groups
 * up to see how many fewer. Voice-first: the stage acts each story out and
 * writes its sentence; the checks are answered with numeral cards. Its
 * practice is "Bigger stories" (`g1-woods-1`).
 */
export const g1StoryMathLesson: Lesson = {
  id: 'g1StoryMath',
  band: 'g1',
  zoneId: 'word-problem-woods',
  skillIds: ['g1-story-problems', 'g1-story-unknowns', 'g1-story-compare', 'g1-three-addends'],
  title: 'Story Problems to Twenty',
  emoji: '🦉',
  intro: 'Act the story out, then write its number sentence.',
  practiceStageId: 'g1-woods-1',
  steps: [
    {
      id: 'story',
      narration: 'Bear has eight apples. Fox brings five more. Eight plus five is thirteen!',
    },
    {
      id: 'mystery',
      narration: 'Your turn! Owl saw twelve birds. Some flew away. Now nine are left.',
      check: {
        question: 'How many birds flew away? Tap the number.',
        speech: askAloud('g1StoryMath', 'mystery'),
        options: [9, 3, 4],
        answer: 3,
        explain: 'Twelve take away three is nine. Three birds flew away.',
        pictures: numeralCards([9, 3, 4]),
        // (a wrong pick counts the three birds that flew to the cloud)
        countAlong: 3,
      },
    },
    {
      id: 'three',
      narration: 'Bunny picks four tulips, six roses and three daisies. Four and six make ten. Ten and three is thirteen!',
    },
    {
      id: 'fewer',
      narration: 'Your turn! Bear has nine pears. Fox has six pears.',
      check: {
        question: 'How many fewer pears does Fox have? Tap the number.',
        speech: askAloud('g1StoryMath', 'fewer'),
        options: [6, 9, 3],
        answer: 3,
        explain: 'Line them up. Three of Bear’s pears have no partner.',
        pictures: numeralCards([6, 9, 3]),
        // (a wrong pick counts the three empty spots in Fox's row)
        countAlong: 3,
      },
    },
  ],
}
