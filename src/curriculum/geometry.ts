import type { Zone } from './types'

export const geometryZone: Zone = {
  id: 'geometry-grove',
  title: 'Geometry Grove',
  titleByBand: { k1: 'Shape Grove' },
  subtitle: 'Shapes, lines & angles',
  emoji: '🔷',
  themeColor: 'island',
  description:
    'Explore the Geometry Grove! Name shapes by their sides and corners, then climb to lines and angles — right, acute, obtuse, parallel, and perpendicular.',
  estimatedMinutes: 18,
  available: true,
  position: { x: 61, y: 48 },
  stages: [
    {
      id: 'geo-shapes',
      kind: 'concept',
      title: 'Shape Trail',
      description: 'Name 2D shapes by their sides and vertices.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'geometry', level: 3, source: 'static' },
      params: { questionCount: 5 },
      starsToEarn: 3,
    },
    {
      id: 'geo-angles',
      kind: 'practice',
      title: 'Angle Ascent',
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
      description: 'Answer shape and angle questions to defeat the Shape Master!',
      gameId: 'bossBattle',
      providerConfig: { kind: 'geometry', level: 4, source: 'static' },
      params: { questionCount: 6, bossEmoji: '🔷', bossName: 'The Shape Master' },
      starsToEarn: 3,
    },
  ],
  stagesByBand: {
    // K–1 "Shape Grove" (K.G.2–4): name flat shapes → flat or solid → a shape
    // hunt (turned shapes, sides, corners). Titles and descriptions are said aloud.
    k1: [
      {
        id: 'k-shapes-1',
        kind: 'concept',
        title: 'Name that shape',
        description: 'Find the circle, the square and the triangle!',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kShapes', mode: 'name2d' },
        params: { questionCount: 5 },
        starsToEarn: 3,
      },
      {
        id: 'k-shapes-2',
        kind: 'practice',
        title: 'Flat or solid',
        description: 'Flat like a circle, or solid like a ball?',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kShapes', mode: 'flatSolid' },
        params: { questionCount: 5 },
        starsToEarn: 3,
      },
      {
        id: 'k-shapes-3',
        kind: 'mastery',
        title: 'Shape hunt',
        description: 'Count the sides and find every shape!',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kShapes', mode: 'hunt' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
    ],
  },
}
