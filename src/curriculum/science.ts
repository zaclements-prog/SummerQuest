import type { Zone } from './types'

export const scienceZone: Zone = {
  id: 'science-summit',
  title: 'Science Summit',
  titleByBand: { k1: 'Nature Summit' },
  subtitle: 'Plants, life cycles & nature',
  emoji: '🔬',
  themeColor: 'island',
  description:
    'Climb the Science Summit! Read short passages about plants, animals, weather, and how the world works, then answer questions about what you learned.',
  estimatedMinutes: 20,
  available: true,
  position: { x: 61, y: 81 },
  stages: [
    {
      id: 'science-3rd',
      kind: 'concept',
      title: 'Base Camp',
      description: 'Read short science passages, then answer questions.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'science', level: 3, source: 'static' },
      params: { questionCount: 5 },
      starsToEarn: 3,
    },
    {
      id: 'science-cycle',
      kind: 'practice',
      title: 'Cloud Keeper',
      description: 'Guide Drip the droplet around the water cycle, then rescue friends in the storm.',
      gameId: 'cloudKeeper',
      providerConfig: { kind: 'scienceCycle' },
      params: { rounds: 5 },
      starsToEarn: 3,
    },
    {
      id: 'science-4th',
      kind: 'practice',
      title: 'High Ridge',
      description: 'Tougher passages about living things and our planet.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'science', level: 4, source: 'static' },
      params: { questionCount: 5 },
      starsToEarn: 3,
    },
    {
      id: 'science-mastery',
      kind: 'mastery',
      title: 'Professor Hoot',
      description: 'Answer science questions to defeat Professor Hoot!',
      gameId: 'bossBattle',
      providerConfig: { kind: 'science', level: 4, source: 'static' },
      params: { questionCount: 6, bossEmoji: '🦉', bossName: 'Professor Hoot' },
      starsToEarn: 3,
    },
  ],
  stagesByBand: {
    // K–1 "Nature Summit" (K-ESS2, K-LS1, K-PS2): the weather and what to wear →
    // what plants and animals need → push and pull. Every card a picture, named
    // as it lights up. Titles and descriptions are said aloud.
    k1: [
      {
        id: 'k-science-1',
        kind: 'concept',
        title: 'What to wear',
        description: 'Sun, rain, snow or wind: what do you need?',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kScience', mode: 'weather' },
        params: { questionCount: 5 },
        starsToEarn: 3,
      },
      {
        id: 'k-science-2',
        kind: 'practice',
        title: 'Plants and animals',
        description: 'What do plants and animals need to live?',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kScience', mode: 'needs' },
        params: { questionCount: 5 },
        starsToEarn: 3,
      },
      {
        id: 'k-science-3',
        kind: 'mastery',
        title: 'Push and pull',
        description: 'Is it a push or a pull?',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kScience', mode: 'pushPull' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
    ],
  },
}
