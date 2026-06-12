import type { Zone } from './types'

export const placeValueZone: Zone = {
  id: 'place-value-plateau',
  title: 'Place Value Plateau',
  subtitle: 'Place value and rounding',
  emoji: '🏔️',
  themeColor: 'quest',
  description:
    'Big numbers are built from ones, tens, hundreds, and thousands stacked on top of each other. Learn what each digit is worth and how to round.',
  estimatedMinutes: 18,
  available: true,
  position: { x: 85, y: 15 },
  stages: [
    {
      id: 'pv-concept',
      kind: 'concept',
      title: 'Digit Worth',
      description: 'What is each digit really worth?',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'placeValueIdentify', maxPlace: 10000 },
      params: { questionCount: 6 },
      starsToEarn: 3,
    },
    {
      id: 'pv-practice',
      kind: 'practice',
      title: 'Rounding Rush',
      description: 'Round to the nearest 10 or 100 — fast!',
      gameId: 'speedRun',
      providerConfig: { kind: 'placeValueRounding', maxPlace: 1000, roundTo: 10 },
      params: { timeLimitSec: 60, starThresholds: [8, 13, 18] },
      starsToEarn: 3,
    },
    {
      id: 'pv-mastery',
      kind: 'mastery',
      title: 'Summit Showdown',
      description: 'Round to the nearest 100 to defeat the Cliff Goat!',
      gameId: 'bossBattle',
      providerConfig: { kind: 'placeValueRounding', maxPlace: 10000, roundTo: 100 },
      params: { questionCount: 10, bossEmoji: '🐐', bossName: 'Cliff Goat' },
      starsToEarn: 3,
    },
  ],
}
