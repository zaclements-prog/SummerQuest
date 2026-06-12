import type { Zone } from './types'

export const dataGraphZone: Zone = {
  id: 'data-delta',
  title: 'Data Delta',
  subtitle: 'Reading bar graphs',
  emoji: '📊',
  themeColor: 'ocean',
  description:
    'Explore the Data Delta! Read bar graphs to answer questions — find the most and fewest, then add and compare the bars. Aligned to the 3rd-4th grade "represent and interpret data" standard.',
  estimatedMinutes: 18,
  available: true,
  position: { x: 37, y: 48 },
  stages: [
    {
      id: 'data-read',
      kind: 'concept',
      title: 'Graph Basics (3rd grade)',
      description: 'Read a bar graph to find the most, the fewest, and how many.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'dataGraph', level: 3, source: 'static' },
      params: { questionCount: 5 },
      starsToEarn: 3,
    },
    {
      id: 'data-compare',
      kind: 'practice',
      title: 'Graph Detective (4th grade)',
      description: 'Add and compare bars: how many more, how many fewer, how many in all.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'dataGraph', level: 4, source: 'static' },
      params: { questionCount: 5 },
      starsToEarn: 3,
    },
    {
      id: 'data-mastery',
      kind: 'mastery',
      title: 'The Graph Guru',
      description: 'Data boss battle (reading and comparing bar graphs).',
      gameId: 'bossBattle',
      providerConfig: { kind: 'dataGraph', level: 4, source: 'static' },
      params: { questionCount: 6, bossEmoji: '📊', bossName: 'The Graph Guru' },
      starsToEarn: 3,
    },
  ],
}
