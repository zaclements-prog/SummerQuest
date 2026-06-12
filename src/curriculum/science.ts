import type { Zone } from './types'

export const scienceZone: Zone = {
  id: 'science-summit',
  title: 'Science Summit',
  subtitle: 'Plants, life cycles & nature',
  emoji: '🔬',
  themeColor: 'island',
  description:
    'Climb the Science Summit! Read short passages about plants, animals, weather, and how the world works, then answer questions about what you learned. Aligned to 3rd-4th grade science standards.',
  estimatedMinutes: 20,
  available: true,
  position: { x: 61, y: 81 },
  stages: [
    {
      id: 'science-3rd',
      kind: 'concept',
      title: 'Base Camp (3rd grade)',
      description: 'Read about plants and life cycles, then answer questions.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'science', level: 3, source: 'static' },
      params: { questionCount: 5 },
      starsToEarn: 3,
    },
    {
      id: 'science-4th',
      kind: 'practice',
      title: 'High Ridge (4th grade)',
      description: 'Tougher passages on photosynthesis and the water cycle.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'science', level: 4, source: 'static' },
      params: { questionCount: 5 },
      starsToEarn: 3,
    },
    {
      id: 'science-mastery',
      kind: 'mastery',
      title: 'Professor Hoot',
      description: 'Science boss battle (4th grade passages).',
      gameId: 'bossBattle',
      providerConfig: { kind: 'science', level: 4, source: 'static' },
      params: { questionCount: 6, bossEmoji: '🦉', bossName: 'Professor Hoot' },
      starsToEarn: 3,
    },
  ],
}
