import type { Zone } from './types'

export const geometryZone: Zone = {
  id: 'geometry-grove',
  title: 'Geometry Grove',
  titleByBand: { k1: 'Shape Grove' },
  subtitle: 'Shapes, lines & angles',
  subtitleByBand: { g5: 'The coordinate plane and shape families' },
  emoji: '🔷',
  themeColor: 'island',
  description:
    'Explore the Geometry Grove! Name shapes by their sides and corners, then climb to lines and angles — right, acute, obtuse, parallel, and perpendicular.',
  descriptionByBand: {
    g5: "Plot and read points on the coordinate plane, and sort shapes into families: every square is a rectangle, but is every rectangle a square?",
  },
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
    // 1st grade, still "Shape Grove" (1.G.1–2): what makes a triangle a triangle
    // (closed, three straight sides and corners) and what doesn't (colour, size, which
    // way it turns) → put shapes together (the `snap` activity) → solids that roll
    // and stack. Said aloud.
    g1: [
      {
        id: 'g1-shapes-1',
        kind: 'concept',
        title: 'Still a triangle?',
        description: 'Turned or tiny, a triangle is still a triangle!',
        gameId: 'listenPlay',
        providerConfig: { kind: 'g1Shapes', mode: 'attributes' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'g1-shapes-2',
        kind: 'practice',
        title: 'Put shapes together',
        description: 'Snap two shapes together to make a new one.',
        gameId: 'listenPlay',
        providerConfig: { kind: 'g1Shapes', mode: 'compose' },
        params: { questionCount: 5 },
        starsToEarn: 3,
      },
      {
        id: 'g1-shapes-3',
        kind: 'mastery',
        title: 'Roll or stack',
        description: 'Which shapes can roll? Which shapes can stack?',
        gameId: 'listenPlay',
        providerConfig: { kind: 'g1Shapes', mode: 'solids' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
    ],
    // 5th grade (phase 3; 5.G.1–4): the first-quadrant coordinate plane (read and
    // plot points, axes and origin, maps and graphs) → the family tree of
    // two-dimensional figures → the boss mixes both.
    g5: [
      {
        id: 'g5-geo-1',
        kind: 'concept',
        title: 'Grid Quest',
        description: 'Read and plot points (x, y) on the coordinate plane, and use grid maps.',
        gameId: 'conceptPlay',
        providerConfig: { kind: 'g5Geometry', mode: 'coordinates' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'g5-geo-2',
        kind: 'practice',
        title: 'Shape Family Tree',
        description: 'Is every square a rectangle? Sort shapes by their sides and angles.',
        gameId: 'conceptPlay',
        providerConfig: { kind: 'g5Geometry', mode: 'classify' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'g5-geo-3',
        kind: 'mastery',
        title: 'The Grid Guardian',
        description: 'Coordinates and shape families to defeat the Grid Guardian!',
        gameId: 'bossBattle',
        providerConfig: { kind: 'g5Geometry', mode: 'mixed' },
        params: { questionCount: 8, bossEmoji: '🗿', bossName: 'The Grid Guardian' },
        starsToEarn: 3,
      },
    ],
  },
}
