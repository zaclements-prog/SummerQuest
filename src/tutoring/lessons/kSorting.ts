import type { Lesson } from '../types'
import { askAloud, numeralCards } from './k1Voice'

/**
 * Kindergarten: sorting and counting (K.MD.3). Things that go together go
 * in the same box (animals here, food there; red here, blue there), then we
 * count each group and see which group has more. Voice-first: the stage
 * sorts drawn things into boxes marked with pictures and colour swatches (as
 * in Sorting Delta), and the checks are answered with numeral and group cards.
 */
export const kSortingLesson: Lesson = {
  id: 'kSorting',
  band: 'k1',
  zoneId: 'data-delta',
  skillIds: ['k-sort', 'k-sort-compare'],
  title: 'Sort and Count',
  emoji: '🐶',
  intro: 'Things that go together go in the same group. Then count each group.',
  practiceStageId: 'k-sort-1',
  steps: [
    {
      id: 'sort',
      narration: 'Sorting means putting things that go together. Animals go in this box. Food goes in that box!',
    },
    {
      id: 'count',
      narration: "Now count each group. Let's count the animals!",
      check: {
        question: 'How many animals are in the box? Tap the number.',
        speech: askAloud('kSorting', 'count'),
        options: [2, 3, 4],
        answer: 3,
        explain: 'One, two, three. Three animals!',
        pictures: numeralCards([2, 3, 4]),
        countAlong: 3,
      },
    },
    {
      id: 'color',
      narration: 'We can sort by color, too. Red ones go here. Blue ones go there!',
    },
    {
      id: 'more',
      narration: 'Look at the two groups. Count each one. Which group has more?',
      check: {
        question: 'Which group has more? Tap it!',
        // (Sorting Delta's own question line: no new clip)
        speech: { line: 'k-sort/whichMore' },
        options: ['red', 'blue'],
        answer: 'red',
        explain: 'Four red ones and two blue ones. Four is more than two!',
        pictures: [
          { value: 'red', picture: { kind: 'group', count: 4, emoji: '🔴' }, speech: { line: 'k-sort/box-red' } },
          { value: 'blue', picture: { kind: 'group', count: 2, emoji: '🔵' }, speech: { line: 'k-sort/box-blue' } },
        ],
      },
    },
  ],
}
