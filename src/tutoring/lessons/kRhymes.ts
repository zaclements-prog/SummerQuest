import type { Lesson } from '../types'
import { askAloud, kLine, numeralCards } from './k1Voice'

/**
 * Kindergarten: rhymes and word parts (RF.K.2a–b). Words that rhyme sound the
 * same at the end (cat, hat, bat; moon, spoon), and words have parts we can
 * clap (ti… ger). Voice-first: the stage shows the pictures, the same coral
 * squiggle under words that rhyme, and the drum hit once per part; the checks
 * are answered with picture and numeral cards. Its practice is "Rhyme time"
 * (`k-rhyme-1`); "Clap the parts" (`k-syllables-1`) practises the drum.
 */
export const kRhymesLesson: Lesson = {
  id: 'kRhymes',
  band: 'k1',
  zoneId: 'reading-reef',
  skillIds: ['k-rhymes', 'k-syllables'],
  title: 'Rhymes',
  emoji: '🎩',
  intro: 'Words that rhyme, and clapping the parts of a word.',
  practiceStageId: 'k-rhyme-1',
  steps: [
    {
      id: 'rhyme',
      narration: 'Listen to the end of each word. Cat. Hat. Bat. They sound the same at the end. They rhyme!',
    },
    {
      id: 'moon',
      narration: 'Moon and spoon rhyme, too. Moon, spoon! Now you find a rhyme.',
      check: {
        // (the question names the pictures in the order they are shown)
        question: 'Car. Spoon. Fish. Which one rhymes with moon?',
        speech: askAloud('kRhymes', 'moon'),
        options: ['car', 'fish', 'spoon'],
        answer: 'spoon',
        explain: 'Spoon rhymes with moon. They sound the same at the end.',
        pictures: [
          { value: 'car', picture: { kind: 'emoji', emoji: '🚗' }, speech: kLine('car') },
          { value: 'fish', picture: { kind: 'emoji', emoji: '🐟' }, speech: kLine('fish') },
          { value: 'spoon', picture: { kind: 'emoji', emoji: '🥄' }, speech: kLine('spoon') },
        ],
        namedAt: [
          { option: 'car', cue: 'Car' },
          { option: 'spoon', cue: 'Spoon' },
          { option: 'fish', cue: 'Fish' },
        ],
      },
    },
    {
      id: 'parts',
      // (a listening-pass line: "Ti… ger." should come out as two clear parts)
      narration: "Words have parts. Let's clap them! Ti… ger. Tiger has two claps!",
    },
    {
      id: 'yourTurn',
      // (a listening-pass line: "Ba… na… na!" should come out as three clear parts)
      narration: 'Your turn! Clap the parts of banana. Ba… na… na!',
      check: {
        question: 'How many claps in banana? Tap the number!',
        speech: askAloud('kRhymes', 'yourTurn'),
        options: [2, 3, 1],
        answer: 3,
        explain: 'Banana has three parts: ba, na, na.',
        pictures: numeralCards([2, 3, 1]),
        // (a wrong pick counts the three claps on the stage together)
        countAlong: 3,
      },
    },
  ],
}
