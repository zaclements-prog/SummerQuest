import type { Lesson } from '../types'
import { askAloud, numeralCards } from './k1Voice'

/**
 * Kindergarten: story problems (K.OA.2), for Story Woods. Listen to a story,
 * act it out, then count: Bear's apples and the ones Fox brings, Owl's birds
 * flying away, pears and peaches in one basket. Voice-first: the stage acts
 * each story out with a pointing hand; the checks are answered with numeral
 * cards. Its practice is "Act it out" (`k-woods-1`).
 */
export const kStoryMathLesson: Lesson = {
  id: 'kStoryMath',
  band: 'k1',
  zoneId: 'word-problem-woods',
  skillIds: ['k-story-problems', 'k-story-more'],
  title: 'Story Problems',
  emoji: '🐻',
  intro: 'Listen to the story, act it out, then count.',
  practiceStageId: 'k-woods-1',
  steps: [
    {
      id: 'story',
      narration: 'Listen to a story. Bear has two apples. Fox brings her three more!',
    },
    {
      id: 'act',
      narration: "Let's act it out. Put them together and count. One, two, three, four, five. Five apples!",
    },
    {
      id: 'away',
      narration: 'Owl sees six birds in a tree. Then two birds fly away.',
      check: {
        question: 'How many birds are still in the tree? Tap the number.',
        speech: askAloud('kStoryMath', 'away'),
        options: [5, 4, 3],
        answer: 4,
        explain: 'Six birds, then two flew away. Four birds are still there.',
        pictures: numeralCards([5, 4, 3]),
        // (a wrong pick counts the four birds still on the branch)
        countAlong: 4,
      },
    },
    {
      id: 'basket',
      narration: 'Your turn! Bunny has three pears and two peaches.',
      check: {
        question: 'How many fruits are in the basket? Tap the number.',
        speech: askAloud('kStoryMath', 'basket'),
        options: [6, 5, 3],
        answer: 5,
        explain: 'Three pears and two peaches. Five fruits!',
        pictures: numeralCards([6, 5, 3]),
        // (a wrong pick counts all five fruits in the basket)
        countAlong: 5,
      },
    },
  ],
}
