import type { Zone } from './types'

export const measurementZone: Zone = {
  id: 'measurement-marsh',
  title: 'Measurement Marsh',
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
      description: 'Find area and perimeter of rectangles.',
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
}
