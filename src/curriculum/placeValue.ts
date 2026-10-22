import type { Zone } from './types'

export const placeValueZone: Zone = {
  id: 'place-value-plateau',
  title: 'Place Value Plateau',
  titleByBand: { k1: 'Ten Frame Plateau', g1: 'Tens Plateau' },
  subtitle: 'Place value and rounding',
  emoji: '🏔️',
  themeColor: 'quest',
  description:
    'Big numbers are built from ones, tens, hundreds, and thousands stacked on top of each other. Learn what each digit is worth and how to round.',
  estimatedMinutes: 18,
  available: true,
  position: { x: 85, y: 15 },
  stages: [
    {
      id: 'pv-concept',
      kind: 'concept',
      title: 'Digit Worth',
      description: 'What is each digit really worth?',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'placeValueIdentify', maxPlace: 10000 },
      params: { questionCount: 6 },
      starsToEarn: 3,
    },
    {
      id: 'pv-practice',
      kind: 'practice',
      title: 'Rounding Rush',
      description: 'Round big numbers — fast!',
      gameId: 'speedRun',
      providerConfig: { kind: 'placeValueRounding', maxPlace: 1000, roundTo: 10 },
      params: { timeLimitSec: 60, starThresholds: [8, 13, 18] },
      starsToEarn: 3,
    },
    {
      id: 'pv-mastery',
      kind: 'mastery',
      title: 'Summit Showdown',
      description: 'Round big numbers to defeat the Cliff Goat!',
      gameId: 'bossBattle',
      providerConfig: { kind: 'placeValueRounding', maxPlace: 10000, roundTo: 100 },
      params: { questionCount: 10, bossEmoji: '🐐', bossName: 'Cliff Goat' },
      starsToEarn: 3,
    },
  ],
  stagesByBand: {
    // K–1 "Ten Frame Plateau" (K.NBT.1; K.CC.2 and K.CC.5 to 20): a teen number
    // is a full ten and some more, on two ten-frames, said "ten and three more:
    // thirteen" → fill the frames to make one → count to twenty (what comes
    // next, things set out on ten-frames, a little of each). Every question is
    // answered through a number activity (src/games/listenPlay/activities).
    // Titles and descriptions are said aloud.
    k1: [
      {
        id: 'k-teens-1',
        kind: 'concept',
        title: 'Ten and more',
        description: 'A full ten and some more. How many?',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kTeens', mode: 'tenAnd' },
        params: { questionCount: 5 },
        starsToEarn: 3,
      },
      {
        id: 'k-teens-2',
        kind: 'practice',
        title: 'Fill the frames',
        description: 'Fill the ten-frames to make the number.',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kTeens', mode: 'build' },
        params: { questionCount: 5 },
        starsToEarn: 3,
      },
      {
        id: 'k-teens-3',
        kind: 'mastery',
        title: 'Count to twenty',
        description: 'Count all the way to twenty!',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kTeens', mode: 'twenty' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
    ],
    // 1st grade "Tens Plateau" (1.NBT.1–3, 1.NBT.5): a rod is a ten and a cube is a
    // one (base-ten blocks): how many, make a number, which blocks show it, how many
    // tens → compare two numbers (the bigger one, the sign > < = that fits), ten more
    // and ten less → count past 100 to 120, with a little of each. Every question is
    // answered through the `tens` and `buildTens` activities. Said aloud.
    g1: [
      {
        id: 'g1-tens-1',
        kind: 'concept',
        title: 'Tens and ones',
        description: 'A rod is ten. A cube is one.',
        gameId: 'listenPlay',
        providerConfig: { kind: 'g1Tens', mode: 'tensOnes' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'g1-tens-2',
        kind: 'practice',
        title: 'Bigger or smaller',
        description: 'Compare numbers, then add or take a ten.',
        gameId: 'listenPlay',
        providerConfig: { kind: 'g1Tens', mode: 'compare' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'g1-tens-3',
        kind: 'mastery',
        title: 'Count to 120',
        description: 'Count all the way past one hundred!',
        gameId: 'listenPlay',
        providerConfig: { kind: 'g1Tens', mode: 'to120' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
    ],
  },
}
