import type { Zone } from './types'

export const writingZone: Zone = {
  id: 'writing-workshop',
  title: 'Writing Workshop',
  subtitle: 'Sentences, paragraphs, stories',
  emoji: '✍️',
  themeColor: 'monster',
  description:
    'Write your own sentences, paragraphs, and stories. Earn stars and get tips on what you did well and what to try next time.',
  estimatedMinutes: 25,
  available: true,
  position: { x: 37, y: 81 },
  stages: [
    {
      id: 'write-sentence',
      kind: 'concept',
      title: 'Sentence Sprout',
      description: 'Write one great sentence.',
      gameId: 'writingPad',
      providerConfig: { kind: 'writingPrompt', writingKind: 'sentence', source: 'static' },
      params: { kind: 'sentence', questionCount: 2, minWords: 6 },
      starsToEarn: 3,
    },
    {
      id: 'write-paragraph',
      kind: 'practice',
      title: 'Paragraph Power',
      description: 'Write a 3-5 sentence paragraph.',
      gameId: 'writingPad',
      providerConfig: { kind: 'writingPrompt', writingKind: 'paragraph', source: 'static' },
      params: { kind: 'paragraph', questionCount: 1, minWords: 30 },
      starsToEarn: 3,
    },
    {
      id: 'write-story',
      kind: 'mastery',
      title: 'Story Time',
      description: 'Write a short story with a beginning, middle, and end.',
      gameId: 'writingPad',
      providerConfig: { kind: 'writingPrompt', writingKind: 'story', source: 'static' },
      params: { kind: 'story', questionCount: 1, minWords: 60 },
      starsToEarn: 3,
    },
  ],
  stagesByBand: {
    // K "Writing Workshop" (no K title of its own): trace with a finger in ball-and-stick
    // manuscript, from warm-up strokes to numerals to capital letters, then tell a story
    // in order. Titles and descriptions are said aloud.
    k1: [
      {
        id: 'k-trace-1',
        kind: 'concept',
        title: 'Warm-up lines',
        description: 'Trace the lines and curves with your finger.',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kTrace', mode: 'warmup' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'k-trace-2',
        kind: 'practice',
        title: 'Trace numbers',
        description: 'Start at the green dot and trace the numbers.',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kTrace', mode: 'numbers' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'k-trace-3',
        kind: 'practice',
        title: 'Trace big letters',
        description: 'Trace big letters, one line at a time.',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kTrace', mode: 'letters' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'k-story-1',
        kind: 'mastery',
        title: 'Story order',
        description: 'Listen to the story. Then tap first, next, last.',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kStories' },
        params: { questionCount: 5 },
        starsToEarn: 3,
      },
    ],
  },
}
