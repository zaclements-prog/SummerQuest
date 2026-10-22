import type { Lesson } from '../types'
import type { VoiceRef } from '../../voice/types'
import { askAloud } from './k1Voice'

/** A card's name, from the Nature Summit lines ("An umbrella!", "Push!"): the same clips as the stages'. */
const said = (id: string): VoiceRef => ({ line: `k-science/${id}` })

/**
 * Kindergarten: nature (K-ESS2, K-LS1, K-PS2), for Nature Summit. The weather
 * has names (sunny, rainy, snowy, windy) and tells us what to wear; plants
 * need sun and water, and animals need food, water and a home; a push moves
 * something away, a pull brings it close. Voice-first: the stage shows the
 * same drawings as the Nature Summit cards, and introduces the push and pull
 * icon pair (a flat hand and an arrow going away; a hand on a rope and an
 * arrow coming back). The checks are answered with those picture cards.
 */
export const kScienceLesson: Lesson = {
  id: 'kScience',
  band: 'k1',
  zoneId: 'science-summit',
  skillIds: ['k-science-weather', 'k-science-needs', 'k-science-push'],
  title: 'Look at Nature',
  emoji: '🌦️',
  intro: 'The weather and what to wear, what living things need, and push and pull.',
  practiceStageId: 'k-science-1',
  steps: [
    {
      id: 'weather',
      narration: 'Look at the sky! It can be sunny, rainy, snowy or windy.',
    },
    {
      id: 'rain',
      narration: 'Uh oh, rain! We want to stay dry. Your turn!',
      check: {
        // (the question names the pictures in the order they are shown)
        question: 'Sunglasses. Umbrella. Mittens. It is raining. What do you need?',
        speech: askAloud('kScience', 'rain'),
        options: ['sunglasses', 'umbrella', 'mittens'],
        answer: 'umbrella',
        explain: 'An umbrella keeps you dry in the rain.',
        pictures: [
          { value: 'sunglasses', picture: { kind: 'art', name: 'sunglasses' }, speech: said('sunglasses') },
          { value: 'umbrella', picture: { kind: 'art', name: 'umbrella' }, speech: said('umbrella') },
          { value: 'mittens', picture: { kind: 'art', name: 'mittens' }, speech: said('mittens') },
        ],
        namedAt: [
          { option: 'sunglasses', cue: 'Sunglasses' },
          { option: 'umbrella', cue: 'Umbrella' },
          { option: 'mittens', cue: 'Mittens' },
        ],
      },
    },
    {
      id: 'needs',
      narration: 'Plants need sun and water. Animals need food, water and a home.',
    },
    {
      id: 'push',
      narration: 'A push moves it away. A pull brings it close. Your turn!',
      check: {
        question: 'Push. Pull. Which one moves the box away?',
        speech: askAloud('kScience', 'push'),
        options: ['push', 'pull'],
        answer: 'push',
        explain: 'A push moves the box away.',
        pictures: [
          { value: 'push', picture: { kind: 'art', name: 'pushIcon' }, speech: said('push') },
          { value: 'pull', picture: { kind: 'art', name: 'pullIcon' }, speech: said('pull') },
        ],
        namedAt: [
          { option: 'push', cue: 'Push' },
          { option: 'pull', cue: 'Pull' },
        ],
      },
    },
  ],
}
