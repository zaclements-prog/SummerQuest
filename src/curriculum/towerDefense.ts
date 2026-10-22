import type { Zone } from './types'

export const towerDefenseZone: Zone = {
  id: 'tower-battlefront',
  title: 'Tower Battlefront',
  titleByBand: { k1: 'Counting Towers' },
  subtitle: 'Math-powered tower defense',
  emoji: '🏰',
  themeColor: 'monster',
  description:
    'Build towers to stop the invading space critters! Every tower you buy costs gold AND a correct multiplication answer. Survive 10 waves to win.',
  estimatedMinutes: 15,
  available: true,
  position: { x: 85, y: 81 },
  stages: [
    {
      id: 'td-arena',
      kind: 'mastery',
      title: 'Tower Battlefront',
      description: 'Defend your base across 10 waves.',
      gameId: 'towerDefense',
      providerConfig: { kind: 'multiplication', factorMin: 2, factorMax: 10 },
      starsToEarn: 3,
    },
  ],
  stagesByBand: {
    // K–1 "Counting Towers" (K.CC): the same tower defense, voice-first. A spot
    // or a tower asks a spoken counting question, answered with big picture
    // cards; the waves wait for it. Few slow waves, an icon HUD, and no failing
    // out (src/games/tower-defense/KTowers.tsx). Titles and descriptions are said aloud.
    k1: [
      {
        id: 'k-towers-1',
        kind: 'concept',
        title: 'How many?',
        description: 'Count to build your towers!',
        gameId: 'towerDefense',
        providerConfig: { kind: 'kTowers', mode: 'count' },
        params: { listen: true, waves: 3 },
        starsToEarn: 3,
      },
      {
        id: 'k-towers-2',
        kind: 'practice',
        title: 'More or fewer',
        description: 'Which group has more? Build and find out!',
        gameId: 'towerDefense',
        providerConfig: { kind: 'kTowers', mode: 'compare' },
        params: { listen: true, waves: 3 },
        starsToEarn: 3,
      },
      {
        id: 'k-towers-3',
        kind: 'mastery',
        title: 'Tower count',
        description: 'Count to twenty and stop every critter!',
        gameId: 'towerDefense',
        providerConfig: { kind: 'kTowers', mode: 'mixed' },
        params: { listen: true, waves: 4 },
        starsToEarn: 3,
      },
    ],
  },
}
