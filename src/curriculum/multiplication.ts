import type { Zone } from './types'

export const multiplicationZone: Zone = {
  id: 'multiplication-mesa',
  title: 'Multiplication Mesa',
  subtitle: 'Times tables',
  emoji: '🏜️',
  themeColor: 'quest',
  description:
    'Master your multiplication facts so they feel automatic. Strong multiplication helps with division, fractions, and almost every other kind of math.',
  estimatedMinutes: 20,
  available: true,
  position: { x: 13, y: 15 },
  stages: [
    {
      id: 'mult-concept',
      kind: 'concept',
      title: 'Build the Array',
      description: 'See multiplication as rows and columns.',
      gameId: 'timesGrove',
      providerConfig: { kind: 'multiplicationGrove' },
      params: { questionCount: 6 },
      starsToEarn: 3,
    },
    {
      id: 'mult-practice',
      kind: 'practice',
      title: 'Speed Run',
      description: 'How many can you solve in 60 seconds?',
      gameId: 'critterParade',
      providerConfig: { kind: 'multiplication', factorMin: 2, factorMax: 10 },
      // × gates (the grade picks the band: dots for K–1, fractions at 4, decimals at 5)
      params: { ops: 'mul' },
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
