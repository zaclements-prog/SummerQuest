import type { Zone } from './types'

export const measurementZone: Zone = {
  id: 'measurement-marsh',
  title: 'Measurement Marsh',
  titleByBand: { k1: 'Measure Marsh' },
  subtitle: 'Area, perimeter, time, money',
  emoji: '📐',
  themeColor: 'island',
  description:
    'Measure the world! Find the area and perimeter of shapes, tell time and figure out elapsed time, and count change at the marsh market.',
  estimatedMinutes: 22,
  available: true,
  position: { x: 85, y: 48 },
  stages: [
    {
      id: 'meas-concept',
      kind: 'concept',
      title: 'Shapes & Sizes',
      description: 'Find the area of rectangles.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'measurement', type: 'area' },
      params: { questionCount: 6 },
      starsToEarn: 3,
    },
    {
      id: 'meas-practice',
      kind: 'practice',
      title: 'Marsh Mix-Up',
      description: 'Mixed area, perimeter, time, and money — speed round.',
      gameId: 'speedRun',
      providerConfig: { kind: 'measurement', type: 'mixed' },
      params: { timeLimitSec: 90, starThresholds: [6, 9, 12] },
      starsToEarn: 3,
    },
    {
      id: 'meas-mastery',
      kind: 'mastery',
      title: 'Frog King Quiz',
      description: 'Mixed measurement boss — defeat the Frog King!',
      gameId: 'bossBattle',
      providerConfig: { kind: 'measurement', type: 'mixed' },
      params: { questionCount: 10, bossEmoji: '🐸', bossName: 'Frog King' },
      starsToEarn: 3,
    },
  ],
  stagesByBand: {
    // K "Measure Marsh" (K.MD.1–2): longer and taller, lined up at the start →
    // heavier and lighter on a balance scale → a mix that lines up first, with
    // a big-but-light thing or two. The child taps the thing itself (the
    // `measure` activity). Titles and descriptions are said aloud.
    k1: [
      {
        id: 'k-measure-1',
        kind: 'concept',
        title: 'Long and tall',
        description: 'Which one is longer? Which one is taller?',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kMeasure', mode: 'length' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'k-measure-2',
        kind: 'practice',
        title: 'Heavy and light',
        description: 'The heavy side of the scale goes down!',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kMeasure', mode: 'weight' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'k-measure-3',
        kind: 'mastery',
        title: 'Measure mix',
        description: 'Line them up first. Then compare them!',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kMeasure', mode: 'mix' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
    ],
  },
}
