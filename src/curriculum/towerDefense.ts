import type { Zone } from './types'

/**
 * Tower Battlefront, played as Puddle Patrol (src/games/tower-defense/PuddlePatrol.tsx;
 * docs/superpowers/specs/2026-10-19-trending-games-plan.md §3): numbered Mud
 * Puddings waddle toward the island pond, and each sprinkler tower washes
 * ONLY the Puddings that fit its rule. Choosing which tower goes where is the
 * math; there is no quiz. Leaks just splash into the pond (no lives, no
 * failing out); stars come from how clean the pond stays.
 *
 * Every stage's `params.patrol` names its set of rules and waves
 * (src/lib/puddle/stages.ts). Grades 2–5 draw them from the `puddlePatrol`
 * provider (which also asks the game's own question, for the Daily
 * Challenge); kindergarten and 1st grade keep their spoken picture questions
 * (kTowers, g1Towers) for the Daily, and play the same tower game,
 * voice-first.
 */
export const towerDefenseZone: Zone = {
  id: 'tower-battlefront',
  title: 'Tower Battlefront',
  titleByBand: { k1: 'Counting Towers' },
  subtitle: 'Puddle Patrol: sprinklers that wash by the rules',
  subtitleByBand: { g5: 'Puddle Patrol: factors, primes and fractions' },
  emoji: '🏰',
  themeColor: 'monster',
  description:
    'Mud Puddings are waddling to the island pond! Each sprinkler tower washes only the Puddings that fit its rule: even, odd, multiples of 5. Look at who is coming, then put the right towers in the right spots.',
  descriptionByBand: {
    g5: 'Mud Puddings are waddling to the island pond! Sprinklers wash factors of 24, multiples, primes, and fractions or decimals equal to ½. Match the towers to who is coming.',
  },
  estimatedMinutes: 15,
  available: true,
  position: { x: 85, y: 81 },
  // grades 2–4: even and odd, then skip-counting, then the mixed 10-wave defense (today's mastery stage)
  stages: [
    {
      id: 'td-even-odd',
      kind: 'concept',
      title: 'Even & Odd Sprinklers',
      description: 'Even sprinklers wash even Puddings, odd ones wash odd. Keep the pond clean!',
      gameId: 'towerDefense',
      providerConfig: { kind: 'puddlePatrol', set: 'g24-evenOdd' },
      params: { patrol: 'g24-evenOdd' },
      starsToEarn: 3,
    },
    {
      id: 'td-skip-count',
      kind: 'practice',
      title: 'Skip-Count Sprinklers',
      description: 'Sprinklers for multiples of 2, 5 and 10. Match them to the Puddings coming!',
      gameId: 'towerDefense',
      providerConfig: { kind: 'puddlePatrol', set: 'g24-skip' },
      params: { patrol: 'g24-skip' },
      starsToEarn: 3,
    },
    {
      id: 'td-arena',
      kind: 'mastery',
      title: 'Mixed Patrol',
      description: 'Even, multiples of 5 and 10, and one more surprise rule: 10 waves of Puddings!',
      gameId: 'towerDefense',
      providerConfig: { kind: 'puddlePatrol', set: 'g24-mixed' },
      params: { patrol: 'g24-mixed' },
      starsToEarn: 3,
    },
  ],
  stagesByBand: {
    // K–1 "Counting Towers": the same game, voice-first. Puddings carry dot
    // groups; the narrator says each sprinkler's rule and the guide's hand
    // shows where to tap; nothing to read, no clock. The questions (kTowers)
    // are the Daily Challenge's. Titles and descriptions are said aloud.
    k1: [
      {
        id: 'k-towers-1',
        kind: 'concept',
        title: 'How many?',
        description: 'Count the dots to wash the Puddings!',
        gameId: 'towerDefense',
        providerConfig: { kind: 'kTowers', mode: 'count' },
        params: { listen: true, patrol: 'k-count' },
        starsToEarn: 3,
      },
      {
        id: 'k-towers-2',
        kind: 'practice',
        title: 'More or fewer',
        description: 'More than five, or fewer? Wash them all!',
        gameId: 'towerDefense',
        providerConfig: { kind: 'kTowers', mode: 'compare' },
        params: { listen: true, patrol: 'k-compare' },
        starsToEarn: 3,
      },
      {
        id: 'k-towers-3',
        kind: 'mastery',
        title: 'Tower count',
        description: 'Count and compare to keep the pond clean!',
        gameId: 'towerDefense',
        providerConfig: { kind: 'kTowers', mode: 'mixed' },
        params: { listen: true, patrol: 'k-mixed' },
        starsToEarn: 3,
      },
    ],
    // 1st grade (1.OA.6; the zone keeps the name "Counting Towers"): Puddings
    // carry number sentences ("3 + 2", "7 − 2"); sprinklers wash what makes
    // 5, 10… Its lesson is kindergarten's kTowers. Titles and descriptions are said aloud.
    g1: [
      {
        id: 'g1-towers-1',
        kind: 'concept',
        title: 'Add to build',
        description: 'Which ones make five? Which make ten?',
        gameId: 'towerDefense',
        providerConfig: { kind: 'g1Towers', mode: 'add10' },
        params: { listen: true, patrol: 'g1-add' },
        starsToEarn: 3,
      },
      {
        id: 'g1-towers-2',
        kind: 'practice',
        title: 'Take away',
        description: 'Take away, then wash the ones that match!',
        gameId: 'towerDefense',
        providerConfig: { kind: 'g1Towers', mode: 'sub10' },
        params: { listen: true, patrol: 'g1-sub' },
        starsToEarn: 3,
      },
      {
        id: 'g1-towers-3',
        kind: 'mastery',
        title: 'Tower math',
        description: 'Add and take away to twenty!',
        gameId: 'towerDefense',
        providerConfig: { kind: 'g1Towers', mode: 'mix20' },
        params: { listen: true, patrol: 'g1-mix' },
        starsToEarn: 3,
      },
    ],
    // 5th grade: factors and multiples, primes, then fractions and decimals
    // equal to ½, ¼, ¾ and ⅕ (today's mastery stage, `g5-td-1`).
    g5: [
      {
        id: 'g5-td-factors',
        kind: 'concept',
        title: 'Factor Fountains',
        description: 'Sprinklers wash factors of 24 and multiples of 5 and 7. Match them up!',
        gameId: 'towerDefense',
        providerConfig: { kind: 'puddlePatrol', set: 'g5-factors' },
        params: { patrol: 'g5-factors' },
        starsToEarn: 3,
      },
      {
        id: 'g5-td-primes',
        kind: 'practice',
        title: 'Prime Sprinklers',
        description: 'Wash the primes, and the multiples of 4, 6 and 5. Keep the pond clean!',
        gameId: 'towerDefense',
        providerConfig: { kind: 'puddlePatrol', set: 'g5-primes' },
        params: { patrol: 'g5-primes' },
        starsToEarn: 3,
      },
      {
        id: 'g5-td-1',
        kind: 'mastery',
        title: 'Fraction & Decimal Front',
        description: 'Sprinklers wash fractions and decimals equal to ½, ¼, ¾ and ⅕. Spot the equal ones!',
        gameId: 'towerDefense',
        providerConfig: { kind: 'puddlePatrol', set: 'g5-fracDec' },
        params: { patrol: 'g5-fracDec' },
        starsToEarn: 3,
      },
    ],
  },
}
