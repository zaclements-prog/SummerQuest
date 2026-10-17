import type { Zone } from './types'

export const fractionZone: Zone = {
  id: 'fraction-falls',
  title: 'Fraction Falls',
  subtitle: 'Equivalent and comparing',
  emoji: '💧',
  themeColor: 'ocean',
  description:
    'Fractions are pieces of a whole. Learn which pieces are equivalent and how to tell which fraction is bigger.',
  estimatedMinutes: 18,
  available: true,
  position: { x: 61, y: 15 },
  stages: [
    {
      id: 'frac-concept',
      kind: 'concept',
      title: 'Candy Forge',
      description: 'Stamp candy slabs and pour them to fill each order exactly. Equivalent fractions!',
      gameId: 'fractionForge',
      providerConfig: { kind: 'fractionEquivalence', maxDenominator: 12 },
      params: { rounds: 5 },
      starsToEarn: 3,
    },
    {
      id: 'frac-practice',
      kind: 'practice',
      title: 'Falls Speed Run',
      description: 'Match equivalent fractions fast.',
      gameId: 'speedRun',
      providerConfig: { kind: 'fractionEquivalence', maxDenominator: 12 },
      params: { timeLimitSec: 90, starThresholds: [6, 10, 14] },
      starsToEarn: 3,
    },
    {
      id: 'frac-mastery',
      kind: 'mastery',
      title: 'Compare the Pour',
      description: 'Which fraction is bigger? Defeat the Drip Drake!',
      gameId: 'bossBattle',
      providerConfig: { kind: 'fractionCompare', maxDenominator: 10 },
      params: { questionCount: 10, bossEmoji: '🐉', bossName: 'Drip Drake' },
      starsToEarn: 3,
    },
  ],
}
