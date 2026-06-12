import type { Zone } from './types'

export const divisionZone: Zone = {
  id: 'division-dunes',
  title: 'Division Dunes',
  subtitle: 'Division facts ÷2 to ÷10',
  emoji: '🐪',
  themeColor: 'quest',
  description:
    'Division is multiplication played backwards. If you know your times tables, you already know most of your division facts!',
  estimatedMinutes: 20,
  available: true,
  position: { x: 37, y: 15 },
  stages: [
    {
      id: 'div-concept',
      kind: 'concept',
      title: 'Share It Out',
      description: 'See division as splitting into equal groups.',
      gameId: 'conceptPlay',
      providerConfig: {
        kind: 'division',
        divisorMin: 2,
        divisorMax: 6,
        quotientMin: 2,
        quotientMax: 6,
      },
      params: { questionCount: 6 },
      starsToEarn: 3,
    },
    {
      id: 'div-practice',
      kind: 'practice',
      title: 'Speed Run',
      description: 'Drill division facts under the clock.',
      gameId: 'speedRun',
      providerConfig: {
        kind: 'division',
        divisorMin: 2,
        divisorMax: 10,
        quotientMin: 2,
        quotientMax: 10,
      },
      params: { timeLimitSec: 60, starThresholds: [8, 13, 18] },
      starsToEarn: 3,
    },
    {
      id: 'div-mastery',
      kind: 'mastery',
      title: 'Sand Worm Battle',
      description: 'Defeat the Sand Worm!',
      gameId: 'bossBattle',
      providerConfig: {
        kind: 'division',
        divisorMin: 2,
        divisorMax: 10,
        quotientMin: 2,
        quotientMax: 10,
      },
      params: { questionCount: 10, bossEmoji: '🪱', bossName: 'Sand Worm' },
      starsToEarn: 3,
    },
  ],
}
