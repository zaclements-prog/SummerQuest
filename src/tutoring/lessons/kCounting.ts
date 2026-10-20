import type { Lesson } from '../types'
import { groupCards, numeralCards } from './k1Voice'

/**
 * Kindergarten: counting (K.CC.4–5). One number for each thing, and the last
 * number said tells how many. Voice-first: every word is spoken, the screen
 * shows apples, fish, cookies and numerals. The checks reuse the Counting
 * Mesa questions' recorded lines (`k-math`), so they cost no new clips.
 */
export const kCountingLesson: Lesson = {
  id: 'kCounting',
  band: 'k1',
  zoneId: 'multiplication-mesa',
  skillIds: ['k-count'],
  title: 'Count With Me',
  emoji: '🍎',
  intro: 'Touch each one and count. The last number tells how many.',
  practiceStageId: 'k-count-1',
  steps: [
    {
      id: 'touch',
      narration: "Let's count the apples. Touch each apple one time. One. Two. Three. Four.",
    },
    {
      id: 'last',
      narration: 'The last number tells how many. We stopped at four. So there are four apples!',
    },
    {
      id: 'fish',
      narration: 'Your turn! Here come some fish. Count them with your finger.',
      check: {
        question: 'How many fish? Tap the number.',
        speech: { template: 'k-math/howMany', slots: { thing: 'fish' } },
        options: [4, 5, 6],
        answer: 5,
        explain: 'One, two, three, four, five. Five fish!',
        pictures: numeralCards([4, 5, 6]),
        countAlong: 5,
      },
    },
    {
      id: 'three',
      narration: "This is the number three. Three is one, two, three. Let's find three!",
      check: {
        question: 'Tap the group with 3 cookies.',
        speech: { template: 'k-math/findGroup', slots: { n: 3, thing: 'cookies' } },
        options: [2, 4, 3],
        answer: 3,
        explain: 'One, two, three. Three cookies!',
        pictures: groupCards([2, 4, 3], '🍪'),
        countAlong: 3,
      },
    },
  ],
}
