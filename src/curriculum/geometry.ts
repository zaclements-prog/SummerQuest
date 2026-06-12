import type { Zone } from './types'

export const geometryZone: Zone = {
  id: 'geometry-grove',
  title: 'Geometry Grove',
  subtitle: 'Shapes, lines & angles',
  emoji: '🔷',
  themeColor: 'island',
  description:
    'Explore the Geometry Grove! Name shapes by their sides and corners, then climb to lines and angles — right, acute, obtuse, parallel, and perpendicular. Aligned to 3rd-4th grade geometry standards.',
  estimatedMinutes: 18,
  available: true,
  position: { x: 61, y: 48 },
  stages: [
    {
      id: 'geo-shapes',
      kind: 'concept',
      title: 'Shape Trail (3rd grade)',
      description: 'Name 2D shapes by their sides and vertices.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'geometry', level: 3, source: 'static' },
      params: { questionCount: 5 },
      starsToEarn: 3,
    },
    {
      id: 'geo-angles',
      kind: 'practice',
      title: 'Angle Ascent (4th grade)',
      description: 'Classify lines and angles: right, acute, obtuse, parallel.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'geometry', level: 4, source: 'static' },
      params: { questionCount: 5 },
      starsToEarn: 3,
    },
    {
      id: 'geo-mastery',
      kind: 'mastery',
      title: 'The Shape Master',
      description: 'Geometry boss battle (shapes, lines & angles).',
      gameId: 'bossBattle',
      providerConfig: { kind: 'geometry', level: 4, source: 'static' },
      params: { questionCount: 6, bossEmoji: '🔷', bossName: 'The Shape Master' },
      starsToEarn: 3,
    },
  ],
}
