import type { Lesson } from '../types'
import { numeralCards } from './k1Voice'

/**
 * Kindergarten: more, fewer and the same (K.CC.6–7). Line two groups up, one
 * for one: what's left over shows which has more; nothing left over, they are
 * the same. Numbers can be more, too: the number with more dots. Voice-first:
 * the stage shows friends and cookies, bears and balls, ten-frames and
 * numerals; the checks are answered with picture and numeral cards, and reuse
 * Number Dunes' recorded lines (`k-compare`), so they cost no new clips. Its
 * practice is "Line them up" (`k-dunes-1`).
 */
export const kCompareLesson: Lesson = {
  id: 'kCompare',
  band: 'k1',
  zoneId: 'division-dunes',
  skillIds: ['k-match', 'k-compare-numbers'],
  title: 'More, Fewer, Same',
  emoji: '🐰',
  intro: 'Line them up, one for one. Left over means more; none left over means the same.',
  practiceStageId: 'k-dunes-1',
  steps: [
    {
      id: 'lineUp',
      narration: "Is there a cookie for every friend? Let's line them up. One, two, three.",
    },
    {
      id: 'more',
      narration: 'One friend has no cookie. More friends, fewer cookies. Now one more cookie. They are the same!',
    },
    {
      id: 'bears',
      narration: 'Your turn! Here come bears and balls. Does every bear get a ball?',
      check: {
        // (the question names the cards in the order they are shown: the bear, the ball, the same)
        question: 'Are there more bears or more balls? Or are they the same?',
        speech: { line: 'k-compare/ask-more-bears' },
        options: ['top', 'bottom', 'same'],
        answer: 'bottom',
        explain: 'Every bear has a ball, and one ball is left over. There are more balls!',
        pictures: [
          { value: 'top', picture: { kind: 'emoji', emoji: '🐻' }, speech: { line: 'k-compare/thing-bears' } },
          { value: 'bottom', picture: { kind: 'emoji', emoji: '⚽' }, speech: { line: 'k-compare/thing-balls' } },
          { value: 'same', picture: { kind: 'emoji', emoji: '⚖️' }, speech: { line: 'k-compare/same' } },
        ],
        namedAt: [
          { option: 'top', cue: 'bears' },
          { option: 'bottom', cue: 'balls' },
          { option: 'same', cue: 'same' },
        ],
      },
    },
    {
      id: 'numbers',
      narration: 'Numbers can be more, too. Four dots, seven dots. Seven is more!',
      check: {
        question: 'Which number is more, six or nine?',
        speech: { line: 'k-compare/more-6-9' },
        options: [6, 9],
        answer: 9,
        explain: 'Nine has more dots than six. Nine is more!',
        pictures: numeralCards([6, 9]),
        namedAt: [
          { option: 6, cue: 'six' },
          { option: 9, cue: 'nine' },
        ],
      },
    },
  ],
}
