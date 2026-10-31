import { defineVoicePack } from '../types'

/**
 * Puddle Patrol (Tower Battlefront reworked: src/games/tower-defense/PuddlePatrol.tsx).
 * Kindergarten and 1st grade hear everything they need: what to tap (the
 * guide's hand on it), each sprinkler's rule when it arrives, a Pudding's
 * number when it's tapped, and why a spray bounced off ("That one has four.").
 * Grades 2–5 read the same things and hear the big moments. Small spaces are
 * recorded whole; the number sentences are stitched from the shared number clips.
 */
export default defineVoicePack({
  id: 'puddle-patrol',
  lines: {
    // ── the game ──
    /** K–1 start: the hand on a sprinkler card, then on a spot. */
    intro: 'Mud Puddings are coming! Pick a sprinkler, then tap a spot by the path.',
    /** Grades 2–5 start. */
    introOlder: 'Each sprinkler washes only the Puddings that fit its rule. Put the right ones by the path!',
    pickSpot: 'Now tap a spot by the path.',
    pickSprinkler: 'Now pick a sprinkler.',
    buildMore: 'Add another sprinkler!',
    /** The hand on the big ▶. */
    ready: 'Ready? Tap the arrow to send the Puddings!',
    /** Between waves: the hand on the lineup. */
    lookComing: 'Look who is coming next!',
    /** A placed sprinkler can wash something else: tap it, then a card. */
    swapHint: 'Tap a sprinkler to change what it washes.',
    newSprinkler: 'A new sprinkler!',
    squeaky: 'Squeaky clean!',
    waveClean: 'The pond is clean!',
    /** Some got by: never a "you lose". */
    waveSplash: 'A few splashed in the pond. That is okay!',
    noDrops: 'Wash more Puddings to get drops for a new sprinkler.',
    allDone: 'Patrol done! The pond is sparkling!',
    runDone: 'Patrol done! Tap to collect your stars.',
    /** Every spot is busy and there are drops to spare: the hand sweeps the cards (a sprinkler's own card again = Super Soak). */
    superHint: 'You have lots of drops! Give a sprinkler its own card again to make it super.',
    /** A tower was Super Soaked (one a wave). */
    superSoak: 'Super soak! It sprays extra fast this wave.',
    /** A rule changed mid-wave: the tower fills up before it sprays again. */
    refilling: 'It fills up with water first.',

    // ── each sprinkler's rule, said when it arrives and when its card is tapped (K–1) ──
    'rule-dots-2': 'This sprinkler washes groups of two.',
    'rule-dots-3': 'This sprinkler washes groups of three.',
    'rule-dots-4': 'This sprinkler washes groups of four.',
    'rule-dots-5': 'This sprinkler washes groups of five.',
    'rule-more-5': 'This sprinkler washes groups with more than five.',
    'rule-fewer-5': 'This sprinkler washes groups with fewer than five.',
    'rule-make-3': 'This sprinkler washes the ones that make three.',
    'rule-make-4': 'This sprinkler washes the ones that make four.',
    'rule-make-5': 'This sprinkler washes the ones that make five.',
    'rule-make-7': 'This sprinkler washes the ones that make seven.',
    'rule-make-10': 'This sprinkler washes the ones that make ten.',
    'rule-make-15': 'This sprinkler washes the ones that make fifteen.',
  },
  templates: {
    /** A tapped (or bounced-off) kindergarten Pudding: "That one has four." (10 clips) */
    hasDots: { text: 'That one has {n}.', slots: { n: { numbers: [1, 10] } }, render: 'whole' },
    /** A tapped (or bounced-off) 1st-grade Pudding: "Seven plus two makes nine." (stitched) */
    plusMakes: { text: '{a} plus {b} makes {n}.', slots: { a: { numbers: [0, 20] }, b: { numbers: [0, 20] }, n: { numbers: [0, 20] } }, render: 'stitch' },
    minusMakes: { text: '{a} take away {b} makes {n}.', slots: { a: { numbers: [0, 20] }, b: { numbers: [0, 20] }, n: { numbers: [0, 20] } }, render: 'stitch' },
  },
})
