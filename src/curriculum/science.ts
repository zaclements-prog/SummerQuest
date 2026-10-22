import type { Zone } from './types'

export const scienceZone: Zone = {
  id: 'science-summit',
  title: 'Science Summit',
  titleByBand: { k1: 'Nature Summit', g1: 'Sky Summit' },
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
    // 1st grade (phase 2b) "Sky Summit" (1-PS4, 1-ESS1, 1-LS1/LS3): light and
    // sound (things that shake make sound; light lets us see; shadows; see-through
    // or not) → the sky (sun by day, moon and stars by night; the sun comes up and
    // goes down; long summer days) → animal families (babies look like their
    // parents, parents help them, body parts that keep them safe). Picture cards,
    // each named as it lights up.
    g1: [
      {
        id: 'g1-science-1',
        kind: 'concept',
        title: 'Light and sound',
        description: 'Things that shake make sound. Light helps us see!',
        gameId: 'listenPlay',
        providerConfig: { kind: 'g1Science', mode: 'lightSound' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'g1-science-2',
        kind: 'practice',
        title: 'Day and night sky',
        description: 'The sun, the moon and the stars!',
        gameId: 'listenPlay',
        providerConfig: { kind: 'g1Science', mode: 'sky' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'g1-science-3',
        kind: 'mastery',
        title: 'Animal families',
        description: 'Babies and their parents. How do they stay safe?',
        gameId: 'listenPlay',
        providerConfig: { kind: 'g1Science', mode: 'families' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
    ],
  },
}
