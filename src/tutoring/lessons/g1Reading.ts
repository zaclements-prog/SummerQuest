import type { PictureOption } from '../../lib/problem'
import type { Lesson } from '../types'
import { askAloud } from './k1Voice'
import { g1Cards } from '../../lib/providers/g1Shared'

/**
 * 1st grade: Word Reef (RF.1.2–4). Short words have a middle sound (c-a-t);
 * two letters can team up to make one sound (s and h say shh); sounding a word
 * out and putting the sounds together reads it (sh-i-p, ship); and when we
 * read along, each word lights up as it is said. Voice-first: the stage shows
 * the letters and words being learned (in Andika) and pictures; the checks
 * are answered with letter tiles and pictures. Its practice is "Short vowels"
 * (`g1-vowels-1`).
 *
 * ⚠ The narration sounds words out ("Kuh… aa… tuh"): like the phonics voice
 * lines (src/voice/packs/g1-phonics.ts), these steps need the owner's
 * listening pass once recorded.
 */
const letterCard = (ch: string): PictureOption => ({ value: ch, picture: { kind: 'letter', ch }, speech: { template: 'k-letters/letter', slots: { letter: ch.toUpperCase() } } })

export const g1ReadingLesson: Lesson = {
  id: 'g1Reading',
  band: 'g1',
  zoneId: 'reading-reef',
  skillIds: ['g1-short-vowels', 'g1-digraphs', 'g1-decoding', 'g1-read-along'],
  title: 'Reading Words',
  emoji: '📖',
  intro: 'Middle sounds, letter teams, and reading along.',
  practiceStageId: 'g1-vowels-1',
  steps: [
    {
      id: 'middle',
      // (a listening-pass line: "Kuh… aa… tuh." three clear sounds, the aa held)
      narration: 'Listen to the middle of a word. Cat. Kuh… aa… tuh. The A in the middle says aa!',
      check: {
        question: 'Pig! Which letter is in the middle? Tap it.',
        speech: askAloud('g1Reading', 'middle'),
        options: ['a', 'i', 'o'],
        answer: 'i',
        explain: 'Pig: p, i, g. The I is in the middle.',
        pictures: ['a', 'i', 'o'].map(letterCard),
      },
    },
    {
      id: 'teams',
      // (a listening-pass line: "shh" held, no vowel after it)
      narration: 'Some letters team up to make one sound. S and H say shh, like ship and shell!',
      check: {
        // (the question names the pictures in the order they are shown)
        question: 'Sun. Chick. Ship. Which one starts with shh?',
        speech: askAloud('g1Reading', 'teams'),
        options: ['sun', 'chick', 'ship'],
        answer: 'ship',
        explain: 'Ship starts with shh: S and H.',
        pictures: g1Cards(['sun', 'chick', 'ship']),
        namedAt: [
          { option: 'sun', cue: 'Sun' },
          { option: 'chick', cue: 'Chick' },
          { option: 'ship', cue: 'Ship' },
        ],
      },
    },
    {
      id: 'read',
      // (a listening-pass line: "Shh… ih… puh." three sounds, then "ship" said smoothly)
      narration: 'Now read a word. Sound it out: shh… ih… puh. Put the sounds together. Ship!',
    },
    {
      id: 'along',
      narration: 'When we read along, each word lights up. The cat is on the mat. Your turn!',
    },
  ],
}
