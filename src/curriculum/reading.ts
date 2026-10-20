import type { Zone } from './types'

export const readingZone: Zone = {
  id: 'reading-reef',
  title: 'Reading Reef',
  titleByBand: { k1: 'Letter Reef' },
  subtitle: 'Comprehension passages',
  emoji: '🐠',
  themeColor: 'ocean',
  description:
    'Dive into short stories and science passages. Read carefully, then answer questions about what you read.',
  estimatedMinutes: 20,
  available: true,
  position: { x: 13, y: 81 },
  stages: [
    {
      id: 'read-3rd',
      kind: 'concept',
      title: 'Shallow Reef',
      description: 'Read short passages and answer questions.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'readingComprehension', level: 3, source: 'static' },
      params: { questionCount: 5 },
      starsToEarn: 3,
    },
    {
      id: 'read-4th',
      kind: 'practice',
      title: 'Deep Reef',
      description: 'Trickier passages — use clues to figure things out.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'readingComprehension', level: 4, source: 'static' },
      params: { questionCount: 5 },
      starsToEarn: 3,
    },
    {
      id: 'read-mastery',
      kind: 'mastery',
      title: 'Pufferfish Sage',
      description: 'Answer questions about what you read to defeat the Pufferfish Sage!',
      gameId: 'bossBattle',
      providerConfig: { kind: 'readingComprehension', level: 4, source: 'static' },
      params: { questionCount: 6, bossEmoji: '🐡', bossName: 'Pufferfish Sage' },
      starsToEarn: 3,
    },
  ],
  stagesByBand: {
    // K–1 "Letter Reef" (RF.K.1d, RF.K.2–3): letter names → big and little
    // letters (look-alikes like b and d from the fourth item) → first sounds.
    // Titles and descriptions are said aloud.
    k1: [
      {
        id: 'k-letters-1',
        kind: 'concept',
        title: 'Find the letter',
        description: 'Listen, then tap the letter you hear.',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kLetters', mode: 'findUpper' },
        params: { questionCount: 5 },
        starsToEarn: 3,
      },
      {
        id: 'k-letters-2',
        kind: 'practice',
        title: 'Big and little letters',
        description: 'Match each big letter to its little letter.',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kLetters', mode: 'matchCase', confusablesAfter: 3 },
        params: { questionCount: 5 },
        starsToEarn: 3,
      },
      {
        id: 'k-letters-3',
        kind: 'mastery',
        title: 'First sounds',
        description: 'Which picture starts with the letter?',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kLetters', mode: 'firstSound' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
    ],
  },
}
