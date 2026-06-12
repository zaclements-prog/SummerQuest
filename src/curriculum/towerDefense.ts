import type { Zone } from './types'

export const towerDefenseZone: Zone = {
  id: 'tower-battlefront',
  title: 'Tower Battlefront',
  subtitle: 'Math-powered tower defense',
  emoji: '🏰',
  themeColor: 'monster',
  description:
    'Build towers to stop the invading goons! Every tower you buy costs gold AND a correct multiplication answer. Survive 10 waves to win.',
  estimatedMinutes: 15,
  available: true,
  position: { x: 85, y: 81 },
  stages: [
    {
      id: 'td-arena',
      kind: 'mastery',
      title: 'Tower Battlefront',
      description: 'Defend your base across 10 waves',
      gameId: 'towerDefense',
      providerConfig: { kind: 'multiplication', factorMin: 2, factorMax: 10 },
      starsToEarn: 3,
    },
  ],
}
