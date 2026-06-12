import type { Zone } from './types'

export const multiplicationZone: Zone = {
  id: 'multiplication-mesa',
  title: 'Multiplication Mesa',
  subtitle: 'Times tables 2-10',
  emoji: '🏜️',
  themeColor: 'quest',
  description:
    'Master your multiplication facts so they feel automatic. Strong multiplication is the foundation for division, fractions, and almost every math topic in 4th grade.',
  estimatedMinutes: 20,
  available: true,
  position: { x: 13, y: 15 },
  stages: [
    {
      id: 'mult-concept',
      kind: 'concept',
      title: 'Build the Array',
      description: 'See multiplication as rows and columns.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'multiplication', factorMin: 2, factorMax: 6 },
      params: { questionCount: 6 },
      starsToEarn: 3,
    },
    {
      id: 'mult-practice',
      kind: 'practice',
      title: 'Speed Run',
      description: 'How many can you solve in 60 seconds?',
      gameId: 'speedRun',
      providerConfig: { kind: 'multiplication', factorMin: 2, factorMax: 10 },
      params: { timeLimitSec: 60, starThresholds: [10, 15, 20] },
      starsToEarn: 3,
    },
    {
      id: 'mult-mastery',
      kind: 'mastery',
      title: 'Mesa Boss Battle',
      description: 'Defeat the Cactus Cyclops!',
      gameId: 'bossBattle',
      providerConfig: { kind: 'multiplication', factorMin: 2, factorMax: 10 },
      params: { questionCount: 10, bossEmoji: '🌵', bossName: 'Cactus Cyclops' },
      starsToEarn: 3,
    },
  ],
}
