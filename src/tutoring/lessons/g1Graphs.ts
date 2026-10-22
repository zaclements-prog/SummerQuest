import type { Lesson } from '../types'
import { numeralCards } from './k1Voice'

/**
 * 1st grade: picture graphs (1.MD.4), for Graph Delta. Our friends picked
 * their favorite fruit; each pick goes in its row, one picture for each
 * friend; count a row to say how many; the longest row has the most and the
 * shortest the fewest; match two rows up one with one to see how many more.
 * Voice-first: the stage builds the same graph as the stages (four apples, two
 * bananas, three grapes), and the checks are numeral cards asked with Graph
 * Delta's own lines.
 */
export const g1GraphsLesson: Lesson = {
  id: 'g1Graphs',
  band: 'g1',
  zoneId: 'data-delta',
  skillIds: ['g1-graphs-make', 'g1-graphs-read', 'g1-graphs-compare'],
  title: 'Picture Graphs',
  emoji: '📊',
  intro: 'Put each pick in its row, count the rows, and see which has more.',
  practiceStageId: 'g1-graphs-1',
  steps: [
    {
      id: 'sort',
      narration: 'Our friends picked their favorite fruit. Put each one in its row. One picture for each friend!',
    },
    {
      id: 'count',
      narration: 'Now count each row. Four friends like apples. Your turn!',
      check: {
        // (Graph Delta's own question line: no new clip)
        question: 'How many friends like bananas?',
        speech: { template: 'g1-graphs/howMany', slots: { thing: 'bananas' } },
        options: [1, 2, 3],
        answer: 2,
        explain: 'Two pictures in the banana row. Two friends like bananas.',
        pictures: numeralCards([1, 2, 3]),
        countAlong: 2,
      },
    },
    {
      id: 'most',
      narration: 'The longest row has the most. Apples! The shortest row has the fewest. Bananas!',
    },
    {
      id: 'more',
      narration: 'How many more like apples than grapes? Match them up, one with one. One apple has no match. One more! Your turn!',
      check: {
        question: 'How many more friends like apples than bananas?',
        speech: { template: 'g1-graphs/more', slots: { pair: 'apples than bananas' } },
        options: [2, 4, 3],
        answer: 2,
        explain: 'Match them up: two apples have no match. Two more friends like apples.',
        pictures: numeralCards([2, 4, 3]),
      },
    },
  ],
}
