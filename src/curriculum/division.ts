import type { Zone } from './types'

export const divisionZone: Zone = {
  id: 'division-dunes',
  title: 'Division Dunes',
  titleByBand: { k1: 'Number Dunes', g1: 'Take-Away Dunes' },
  subtitle: 'Sharing and division facts',
  subtitleByBand: { g5: 'Long division' },
  emoji: '🐪',
  themeColor: 'quest',
  description:
    'Division is multiplication played backwards. If you know your times tables, you already know most of your division facts!',
  descriptionByBand: {
    g5: "Divide four-digit numbers by two-digit divisors, one step at a time, and decide what a remainder means in the story.",
  },
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
      id: 'div-arena',
      kind: 'practice',
      title: 'Crystal Golems',
      description: 'Shatter the golems — grab the divisor crystal that splits them into the pen!',
      gameId: 'divisionArena',
      providerConfig: {
        kind: 'division',
        divisorMin: 2,
        divisorMax: 10,
        quotientMin: 2,
        quotientMax: 10,
      },
      params: { rounds: 5 },
      starsToEarn: 3,
    },
    {
      id: 'div-practice',
      kind: 'practice',
      title: 'Critter Parade',
      description: 'Lead the parade: pick the gate that keeps more friends!',
      gameId: 'critterParade',
      providerConfig: {
        kind: 'division',
        divisorMin: 2,
        divisorMax: 10,
        quotientMin: 2,
        quotientMax: 10,
      },
      // ÷ and − gates (the grade picks the band)
      params: { ops: 'div' },
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
  stagesByBand: {
    // K–1 "Number Dunes" (K.CC.6–7, K.CC.4c): match two rows one to one (more,
    // fewer or the same) → compare two written numbers, one more and one less
    // → numbers in order, with a little of each. Within 10. Every question is
    // answered through a number activity (src/games/listenPlay/activities).
    // Titles and descriptions are said aloud.
    k1: [
      {
        id: 'k-dunes-1',
        kind: 'concept',
        title: 'Line them up',
        description: 'Match them up. More, fewer, or the same?',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kCompare', mode: 'match' },
        params: { questionCount: 5 },
        starsToEarn: 3,
      },
      {
        id: 'k-dunes-2',
        kind: 'practice',
        title: 'Which is more?',
        description: 'Which number is more? What is one more?',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kCompare', mode: 'numbers' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'k-dunes-3',
        kind: 'mastery',
        title: 'Numbers in order',
        description: 'Put the numbers in order, smallest first!',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kCompare', mode: 'lineUp' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
    ],
    // 1st grade "Take-Away Dunes" (1.OA.4, 1.OA.6, 1.OA.8): subtract within 20
    // with a number sentence on screen ("13 − 5 = ?") and a picture of the
    // strategy: take away and count back → the parade's − gates as numerals →
    // think addition ("5 + ? = 13"), the unknown in "? + 4 = 9" and "9 − ? = 4",
    // and fact families. Answered with numeral cards (the `numberSentence`
    // activity). Said aloud.
    g1: [
      {
        id: 'g1-sub-1',
        kind: 'concept',
        title: 'Take away',
        description: 'Take some away. How many are left?',
        gameId: 'listenPlay',
        providerConfig: { kind: 'g1Subtract', mode: 'takeAway' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'g1-sub-parade',
        kind: 'practice',
        title: 'Critter Parade',
        description: 'Take away at the gates. Keep more friends!',
        gameId: 'critterParade',
        // (the parade makes its own gates; the provider only names the topic)
        providerConfig: { kind: 'g1Subtract', mode: 'takeAway' },
        // 1st grade's − gates within 20, written as numerals (lib/gates opSetFor: `sub20`)
        params: { ops: 'sub' },
        starsToEarn: 3,
      },
      {
        id: 'g1-sub-3',
        kind: 'mastery',
        title: 'Think addition',
        description: 'Think addition to find the missing number!',
        gameId: 'listenPlay',
        providerConfig: { kind: 'g1Subtract', mode: 'think' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
    ],
    // 5th grade (phase 3; 5.NBT.6): long division to 4-digit by 2-digit →
    // Crystal Golems with two-digit crystals (its grade-5 mode) → what a
    // remainder means in a story → the boss, everything in words.
    g5: [
      {
        id: 'g5-div-1',
        kind: 'concept',
        title: 'Long Division Trail',
        description: 'Divide numbers up to 4 digits by 2-digit numbers, one step at a time.',
        gameId: 'conceptPlay',
        providerConfig: { kind: 'g5Div', mode: 'long' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'g5-div-arena',
        kind: 'practice',
        title: 'Crystal Golems',
        description: 'Two-digit crystals now! Grab the divisor that splits each golem into the pen.',
        gameId: 'divisionArena',
        providerConfig: { kind: 'g5Div', mode: 'arena' },
        params: { rounds: 5, divisorDigits: 2 },
        starsToEarn: 3,
      },
      {
        id: 'g5-div-2',
        kind: 'practice',
        title: 'Remainder Rescue',
        description: 'Round up, leave it, or answer with it? Decide what the remainder means.',
        gameId: 'conceptPlay',
        providerConfig: { kind: 'g5Div', mode: 'remainders' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'g5-div-3',
        kind: 'mastery',
        title: 'Sand Serpent Battle',
        description: 'Defeat the Sand Serpent with long division and remainders!',
        gameId: 'bossBattle',
        providerConfig: { kind: 'g5Div', mode: 'mastery' },
        params: { questionCount: 10, bossEmoji: '🐍', bossName: 'Sand Serpent' },
        starsToEarn: 3,
      },
    ],
  },
}
