import type { Zone } from './types'

export const readingZone: Zone = {
  id: 'reading-reef',
  title: 'Reading Reef',
  subtitle: 'Comprehension passages',
  emoji: '🐠',
  themeColor: 'ocean',
  description:
    'Dive into short stories and science passages. Read carefully, then answer questions about what you read. Library is small now — AI-generated personalized passages are a future upgrade.',
  estimatedMinutes: 20,
  available: true,
  position: { x: 13, y: 81 },
  stages: [
    {
      id: 'read-3rd',
      kind: 'concept',
      title: 'Shallow Reef (3rd grade)',
      description: 'Read short passages and answer questions.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'readingComprehension', level: 3, source: 'static' },
      params: { questionCount: 5 },
      starsToEarn: 3,
    },
    {
      id: 'read-4th',
      kind: 'practice',
      title: 'Deep Reef (4th grade)',
      description: 'Trickier passages with more inference.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'readingComprehension', level: 4, source: 'static' },
      params: { questionCount: 5 },
      starsToEarn: 3,
    },
    {
      id: 'read-mastery',
      kind: 'mastery',
      title: 'Pufferfish Sage',
      description: 'Comprehension boss battle (4th grade passages).',
      gameId: 'bossBattle',
      providerConfig: { kind: 'readingComprehension', level: 4, source: 'static' },
      params: { questionCount: 6, bossEmoji: '🐡', bossName: 'Pufferfish Sage' },
      starsToEarn: 3,
    },
  ],
}
