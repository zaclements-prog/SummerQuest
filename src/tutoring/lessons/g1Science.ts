import type { Lesson } from '../types'
import type { VoiceRef } from '../../voice/types'

/** A card's name, from the Sky Summit lines ("Glass!", "A hen!"): the same clips as the stages'. */
const said = (id: string): VoiceRef => ({ line: `g1-science/${id}` })

/**
 * 1st grade: Sky Summit (1-PS4, 1-ESS1, 1-LS1/LS3). Things that shake make
 * sound; we need light to see, light goes through glass, and wood blocks it
 * and makes a shadow; we see the sun in the day and the moon and stars at
 * night, and the sun comes up and goes down; babies look like their parents
 * (but not just the same), and parents feed them and keep them warm.
 * Voice-first: the stage shows the same drawings as the Sky Summit cards; the
 * checks are those picture cards, asked with the stages' own lines.
 */
export const g1ScienceLesson: Lesson = {
  id: 'g1Science',
  band: 'g1',
  zoneId: 'science-summit',
  skillIds: ['g1-science-light-sound', 'g1-science-sky', 'g1-science-families'],
  title: 'Light, Sound and Sky',
  emoji: '🌙',
  intro: 'Sound, light and shadows, the day and night sky, and animal families.',
  practiceStageId: 'g1-science-1',
  steps: [
    {
      id: 'sound',
      narration: 'Tap a drum. Its top shakes very fast. Things that shake make sound!',
    },
    {
      id: 'light',
      narration: 'We need light to see. Light goes through glass. Wood blocks the light and makes a shadow! Your turn!',
      check: {
        // (Sky Summit's own question line: no new clip)
        question: 'Tap the one that blocks the light.',
        speech: said('blocksLight'),
        options: ['glass', 'waxPaper', 'wood'],
        answer: 'wood',
        explain: 'Wood blocks the light. You can not see through it.',
        pictures: [
          { value: 'glass', picture: { kind: 'art', name: 'glass' }, speech: said('glass') },
          { value: 'waxPaper', picture: { kind: 'art', name: 'waxPaper' }, speech: said('waxPaper') },
          { value: 'wood', picture: { kind: 'art', name: 'wood' }, speech: said('wood') },
        ],
      },
    },
    {
      id: 'sky',
      narration: 'In the day, we see the sun. At night, we see the moon and stars. The sun comes up, and goes down.',
    },
    {
      id: 'families',
      narration: 'A puppy looks like its mom, but not just the same. Parents feed their babies and keep them warm. Your turn!',
      check: {
        question: 'This is a chick. Tap its parent!',
        speech: { template: 'g1-science/baby', slots: { baby: 'chick' } },
        options: ['cow', 'hen', 'dog'],
        answer: 'hen',
        explain: 'A chick grows up to be a hen. It looks like its mom!',
        pictures: [
          { value: 'cow', picture: { kind: 'emoji', emoji: '🐄' }, speech: said('cow') },
          { value: 'hen', picture: { kind: 'emoji', emoji: '🐔' }, speech: said('hen') },
          { value: 'dog', picture: { kind: 'emoji', emoji: '🐕' }, speech: said('dog') },
        ],
      },
    },
  ],
}
