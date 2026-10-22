import type { PictureOption } from '../../lib/problem'
import type { Lesson } from '../types'
import { askAloud } from './k1Voice'

/**
 * 1st grade: Writing Workshop (L.1.1a lowercase letters, L.1.2 spelling and
 * end punctuation). Little letters live on the lines (tall ones touch the top
 * line, small ones start at the dashed line, a few have a tail below); a
 * little a is around like a c, then a line down; to spell a word, say it
 * slowly, one letter for each sound; and a sentence starts with a capital
 * letter and ends with a period. Voice-first: the stage shows the letters,
 * tiles and the sentence being built; the checks are answered with letter
 * tiles and word cards (the word that can start a sentence). Its practice is "Little
 * letters" (`g1-trace-1`).
 */
const letterCard = (ch: string): PictureOption => ({ value: ch, picture: { kind: 'letter', ch }, speech: { template: 'k-letters/letter', slots: { letter: ch.toUpperCase() } } })

/** The word cards for "Which word can start a sentence?": each says what its first letter is when tapped. */
const startCards: PictureOption[] = [
  { value: 'the', picture: { kind: 'word', text: 'the' }, speech: { line: 'g1-writing/cardLittleT' } },
  { value: 'The', picture: { kind: 'word', text: 'The' }, speech: { line: 'g1-writing/cardCapitalT' } },
  { value: 'dog', picture: { kind: 'word', text: 'dog' }, speech: { line: 'g1-writing/cardLittleD' } },
]

export const g1WritingLesson: Lesson = {
  id: 'g1Writing',
  band: 'g1',
  zoneId: 'writing-workshop',
  skillIds: ['g1-trace-lower', 'g1-spelling', 'g1-sentences'],
  title: 'Writing Words',
  emoji: '📝',
  intro: 'Little letters, spelling, and a sentence.',
  practiceStageId: 'g1-trace-1',
  steps: [
    {
      id: 'lines',
      narration: 'Little letters live on the lines. Tall ones touch the top line. Small ones start at the dashed line.',
      check: {
        question: 'Which letter has a tail below the line? Tap it.',
        speech: askAloud('g1Writing', 'lines'),
        options: ['a', 'g', 'b'],
        answer: 'g',
        explain: 'G has a tail that hangs below the line.',
        pictures: ['a', 'g', 'b'].map(letterCard),
      },
    },
    {
      id: 'traceA',
      narration: "Let's trace a little a. Around like a C. Then a little line down.",
    },
    {
      id: 'spell',
      // (a listening-pass line: "Kuh… aa… tuh." three clear sounds)
      narration: 'To spell a word, say it slowly. Cat. Kuh… aa… tuh. Three sounds, three letters!',
    },
    {
      id: 'sentence',
      narration: 'A sentence starts with a capital letter. It ends with a period. The dog ran.',
      check: {
        question: 'Which word can start a sentence? Tap it.',
        speech: askAloud('g1Writing', 'sentence'),
        options: ['the', 'The', 'dog'],
        answer: 'The',
        explain: 'The, with a capital T, can start a sentence.',
        pictures: startCards,
      },
    },
  ],
}
