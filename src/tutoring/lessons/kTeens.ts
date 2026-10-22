import type { Lesson } from '../types'
import { numeralCards, sayNumber } from './k1Voice'

/**
 * Kindergarten: teen numbers (K.NBT.1). A ten-frame holds ten; a full one is
 * a ten, and a teen number is a full ten and some more ones: "ten and three
 * more is thirteen". Voice-first: the stage shows ten-frames filling dot by
 * dot and the numerals they make; the checks are answered with numeral and
 * ten-frame cards, and reuse Ten Frame Plateau's recorded lines (`k-teens`),
 * so they cost no new clips. Its practice is "Ten and more" (`k-teens-1`).
 */
export const kTeensLesson: Lesson = {
  id: 'kTeens',
  band: 'k1',
  zoneId: 'place-value-plateau',
  skillIds: ['k-teens', 'k-teens-build'],
  title: 'Ten and Some More',
  emoji: '🔟',
  intro: 'A full ten-frame is ten. A teen number is a full ten and some more.',
  practiceStageId: 'k-teens-1',
  steps: [
    {
      id: 'ten',
      narration: "This is a ten-frame. It has ten boxes. When every box is full, that's a full ten!",
    },
    {
      id: 'more',
      narration: 'A full ten, and three more. Ten, eleven, twelve, thirteen. Ten and three more is thirteen!',
    },
    {
      id: 'fifteen',
      narration: 'Your turn! Look at the full ten. Then count on.',
      check: {
        question: 'How many dots? Tap the number.',
        speech: { line: 'k-teens/howManyDots' },
        options: [5, 15, 14],
        answer: 15,
        explain: 'A full ten and five more. Ten and five more is fifteen!',
        pictures: numeralCards([5, 15, 14]),
        // (a wrong pick counts the dots on the stage together)
        countAlong: 15,
      },
    },
    {
      id: 'twelve',
      narration: "Every teen number is ten and some more. Let's find twelve!",
      check: {
        question: 'Which one shows twelve?',
        speech: { line: 'k-teens/shows-12' },
        options: [2, 12, 13],
        answer: 12,
        explain: 'Twelve is a full ten and two more.',
        pictures: [2, 12, 13].map((n) => ({ value: n, picture: { kind: 'tenFrame' as const, count: n }, speech: sayNumber(n) })),
      },
    },
  ],
}
