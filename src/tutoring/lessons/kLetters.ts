import type { Lesson } from '../types'
import { askAloud, kLine } from './k1Voice'

/**
 * Kindergarten: letters (RF.K.1d, RF.K.2–3). Letters have names, every
 * letter comes big and little, and words start with a letter's sound.
 * Voice-first: the stage shows letter tiles and pictures; the checks are
 * answered with letter tiles and pictures. Sounds are taught through whole
 * words ("Ball. Bear. Bus.") rather than isolated phonemes, which device
 * speech can't say yet (K–5 plan §3, "Phonics is the hard case").
 */
export const kLettersLesson: Lesson = {
  id: 'kLetters',
  band: 'k1',
  zoneId: 'reading-reef',
  skillIds: ['k-letters'],
  title: 'Letters',
  emoji: '🔤',
  intro: 'Letter names, big and little letters, and first sounds.',
  practiceStageId: 'k-letters-1',
  steps: [
    {
      id: 'names',
      narration: 'Letters have names! Here is the letter A. Here is B. And here is C.',
    },
    {
      id: 'bigLittle',
      narration: 'Letters come big and little. This is big B. This is little b. They are both B!',
      check: {
        question: 'Tap little b!',
        speech: askAloud('kLetters', 'bigLittle'),
        options: ['B', 'b', 'a'],
        answer: 'b',
        explain: 'Little b is the small one. Big B is the tall one.',
        pictures: [
          { value: 'B', picture: { kind: 'letter', ch: 'B' }, speech: kLine('bigB') },
          { value: 'b', picture: { kind: 'letter', ch: 'b' }, speech: kLine('littleB') },
          { value: 'a', picture: { kind: 'letter', ch: 'a' }, speech: kLine('littleA') },
        ],
      },
    },
    {
      id: 'sounds',
      narration: 'Listen to how these words start. Ball. Bear. Bus. They all start with B!',
    },
    {
      id: 'yourTurn',
      narration: 'Your turn! Listen to the start of each word. Does it start like ball?',
      check: {
        // (the question names the pictures in the order they are shown)
        question: 'Banana. Apple. Fish. Which one starts like ball?',
        speech: askAloud('kLetters', 'yourTurn'),
        options: ['fish', 'banana', 'apple'],
        answer: 'banana',
        explain: 'Banana starts with B, just like ball.',
        pictures: [
          { value: 'fish', picture: { kind: 'emoji', emoji: '🐟' }, speech: kLine('fish') },
          { value: 'banana', picture: { kind: 'emoji', emoji: '🍌' }, speech: kLine('banana') },
          { value: 'apple', picture: { kind: 'emoji', emoji: '🍎' }, speech: kLine('apple') },
        ],
        namedAt: [
          { option: 'banana', cue: 'Banana' },
          { option: 'apple', cue: 'Apple' },
          { option: 'fish', cue: 'Fish' },
        ],
      },
    },
  ],
}
