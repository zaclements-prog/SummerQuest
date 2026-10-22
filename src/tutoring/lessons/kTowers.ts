import type { Lesson } from '../types'
import { groupCards, numeralCards } from './k1Voice'

/**
 * Kindergarten: how to play Counting Towers (Tower Battlefront for K–1).
 * Critters walk down the path toward the house; tap a spot and answer a
 * counting question, and a tower pops up; towers stop the critters (they go
 * home in a puff of sparkles), and tapping a tower makes it stronger. Friendly:
 * the towers shoot gold balls, nothing scarier. The checks are the game's own
 * questions (`k-towers` and `k-math` lines): how many critters, which group
 * has more.
 */
export const kTowersLesson: Lesson = {
  id: 'kTowers',
  band: 'k1',
  zoneId: 'tower-battlefront',
  skillIds: ['k-towers-count', 'k-towers-compare'],
  title: 'Counting Towers',
  emoji: '🏰',
  intro: 'Tap a spot, answer to build a tower, and towers stop the critters.',
  practiceStageId: 'k-towers-1',
  steps: [
    {
      id: 'critters',
      narration: "Critters are coming down the path! Let's keep them away from the house.",
    },
    {
      id: 'build',
      narration: 'Tap a spot. Answer the question. Pop! A tower!',
    },
    {
      id: 'count',
      narration: 'Your turn! Count the critters with your finger.',
      check: {
        question: 'How many critters? Tap the number.',
        speech: { template: 'k-towers/howMany', slots: { thing: 'critters' } },
        options: [3, 4, 5],
        answer: 4,
        explain: 'One, two, three, four. Four critters!',
        pictures: numeralCards([3, 4, 5]),
        countAlong: 4,
      },
    },
    {
      id: 'stronger',
      narration: 'Towers stop the critters. Tap a tower to make it stronger!',
      check: {
        question: 'Which group has more?',
        speech: { line: 'k-math/whichMore' },
        options: [5, 2],
        answer: 5,
        explain: 'Five is more than two.',
        pictures: groupCards([5, 2], '👾'),
      },
    },
  ],
}
