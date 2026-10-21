import type { Lesson } from '../types'
import { askAloud, numeralCards } from './k1Voice'

/**
 * Kindergarten: adding and taking away (K.OA.1, K.OA.5) and making ten
 * (K.OA.4), for Add-and-Take Falls. Things come, so there are more; things go,
 * so there are fewer; a ten-frame shows how many more make ten. Voice-first:
 * frogs hop onto a log, ducks swim away, a ten-frame fills, and the checks
 * are answered with numeral cards. Its practice is "Hop in, hop out"
 * (`k-addsub-1`).
 */
export const kAddTakeLesson: Lesson = {
  id: 'kAddTake',
  band: 'k1',
  zoneId: 'fraction-falls',
  skillIds: ['k-add-take', 'k-make-ten'],
  title: 'Add and Take Away',
  emoji: '🐸',
  intro: 'Things come and go. How many now? And how many more make ten?',
  practiceStageId: 'k-addsub-1',
  steps: [
    {
      id: 'join',
      narration: 'Three frogs sit on a log. Two more hop on! Now there are five frogs.',
    },
    {
      id: 'away',
      narration: 'Five ducks swim in the pond. Then two swim away. Bye, ducks!',
      check: {
        question: 'How many ducks are left? Tap the number.',
        speech: askAloud('kAddTake', 'away'),
        options: [2, 4, 3],
        answer: 3,
        explain: 'Two swam away. One, two, three ducks are left.',
        pictures: numeralCards([2, 4, 3]),
        // (a wrong pick counts the three ducks still in the pond)
        countAlong: 3,
      },
    },
    {
      id: 'ten',
      narration: 'This is a ten frame. It has ten spots. Seven are full. Three more make ten!',
    },
    {
      id: 'yourTurn',
      narration: 'Your turn! Six spots are full. Look at the empty spots.',
      check: {
        question: 'How many more make ten? Tap the number.',
        speech: askAloud('kAddTake', 'yourTurn'),
        options: [4, 5, 3],
        answer: 4,
        explain: 'Four empty spots. Four more make ten!',
        pictures: numeralCards([4, 5, 3]),
        // (a wrong pick counts the four empty spots)
        countAlong: 4,
      },
    },
  ],
}
