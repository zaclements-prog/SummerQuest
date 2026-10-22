import type { Zone } from './types'

export const multiplicationZone: Zone = {
  id: 'multiplication-mesa',
  title: 'Multiplication Mesa',
  titleByBand: { k1: 'Counting Mesa', g1: 'Adding Mesa' },
  subtitle: 'Times tables',
  emoji: '🏜️',
  themeColor: 'quest',
  description:
    'Master your multiplication facts so they feel automatic. Strong multiplication helps with division, fractions, and almost every other kind of math.',
  estimatedMinutes: 20,
  available: true,
  position: { x: 13, y: 15 },
  stages: [
    {
      id: 'mult-concept',
      kind: 'concept',
      title: 'Build the Array',
      description: 'See multiplication as rows and columns.',
      gameId: 'timesGrove',
      providerConfig: { kind: 'multiplicationGrove' },
      params: { questionCount: 6 },
      starsToEarn: 3,
    },
    {
      id: 'mult-practice',
      kind: 'practice',
      title: 'Critter Parade',
      description: 'Lead the parade: pick the gate that gives you more friends!',
      gameId: 'critterParade',
      providerConfig: { kind: 'multiplication', factorMin: 2, factorMax: 10 },
      // × gates (the grade picks the band: dots for K–1, fractions at 4, decimals at 5)
      params: { ops: 'mul' },
      starsToEarn: 3,
    },
    {
      id: 'mult-mastery',
      kind: 'mastery',
      title: 'Mesa Boss Battle',
      description: 'Defeat the Cactus Cyclops!',
      gameId: 'bossBattle',
      providerConfig: { kind: 'multiplication', factorMin: 2, factorMax: 10 },
      params: { questionCount: 10, bossEmoji: '🌵', bossName: 'Cactus Cyclops' },
      starsToEarn: 3,
    },
  ],
  stagesByBand: {
    // K–1 "Counting Mesa" (K.CC): count to 10 → count on to 20 in the parade →
    // compare groups and numerals to 10. Titles and descriptions are said aloud.
    k1: [
      {
        id: 'k-count-1',
        kind: 'concept',
        title: 'Count with me',
        description: 'Count the things, then tap the number.',
        gameId: 'listenPlay',
        // the last of the 5: "You counted 6! Now trace a 6." (Writing Workshop's trace activity)
        providerConfig: { kind: 'kCounting', mode: 'count', min: 1, max: 10, traceLast: 5 },
        params: { questionCount: 5 },
        starsToEarn: 3,
      },
      {
        id: 'k-count-parade',
        kind: 'practice',
        title: 'Critter Parade',
        description: 'Tap the gate that gives you more friends!',
        gameId: 'critterParade',
        // (the parade counts on to 20; its own questions — the provider only names the topic)
        providerConfig: { kind: 'kCounting', mode: 'count', min: 1, max: 20 },
        // K–1 gates: the grade's band picks the dots + and − set (lib/gates opSetFor), spoken, no clock
        params: { ops: 'add' },
        starsToEarn: 3,
      },
      {
        id: 'k-count-3',
        kind: 'mastery',
        title: 'More or fewer',
        description: 'Which group has more? Which number is bigger?',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kCounting', mode: 'compare', min: 1, max: 10 },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
    ],
    // 1st grade "Adding Mesa" (1.OA.3, 1.OA.6): add within 20 with a number
    // sentence on screen ("8 + 5 = ?") and a picture of the strategy under it:
    // count on from the bigger number and turn-around facts → the parade's +
    // gates as numerals → doubles, near doubles and making ten. Answered with
    // numeral cards (the `numberSentence` activity). Said aloud.
    g1: [
      {
        id: 'g1-add-1',
        kind: 'concept',
        title: 'Count on',
        description: 'Start with the bigger number. Count on!',
        gameId: 'listenPlay',
        providerConfig: { kind: 'g1Adding', mode: 'countOn' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'g1-add-parade',
        kind: 'practice',
        title: 'Critter Parade',
        description: 'Add the gates. Pick the one with more!',
        gameId: 'critterParade',
        // (the parade makes its own gates; the provider only names the topic)
        providerConfig: { kind: 'g1Adding', mode: 'facts' },
        // 1st grade's + gates within 20, written as numerals (lib/gates opSetFor: `add20`)
        params: { ops: 'add' },
        starsToEarn: 3,
      },
      {
        id: 'g1-add-3',
        kind: 'mastery',
        title: 'Doubles and tens',
        description: 'Use doubles and make a ten to add!',
        gameId: 'listenPlay',
        providerConfig: { kind: 'g1Adding', mode: 'facts' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
    ],
  },
}
