import type { Zone } from './types'

export const writingZone: Zone = {
  id: 'writing-workshop',
  title: 'Writing Workshop',
  subtitle: 'Sentences, paragraphs, stories',
  emoji: '✍️',
  themeColor: 'monster',
  description:
    'Write your own sentences, paragraphs, and stories. An AI tutor reads your work and tells you what you nailed and what to try next time.',
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
}
