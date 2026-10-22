import type { Zone } from './types'

export const wordProblemZone: Zone = {
  id: 'word-problem-woods',
  title: 'Word Problem Woods',
  titleByBand: { k1: 'Story Woods' },
  subtitle: 'Read, plan, solve',
  emoji: '🌲',
  themeColor: 'island',
  description:
    'Word problems are math hiding inside stories. Read carefully, figure out what to do, then solve.',
  estimatedMinutes: 20,
  available: true,
  position: { x: 13, y: 48 },
  stages: [
    {
      id: 'wp-concept',
      kind: 'concept',
      title: 'Story Problems',
      description: 'Practice reading a problem and finding the math.',
      gameId: 'conceptPlay',
      providerConfig: { kind: 'wordProblem', topic: 'mixed', source: 'static' },
      params: { questionCount: 5 },
      starsToEarn: 3,
    },
    {
      id: 'wp-practice',
      kind: 'practice',
      title: 'Trail Race',
      description: 'How many can you solve in 90 seconds?',
      gameId: 'speedRun',
      providerConfig: { kind: 'wordProblem', topic: 'mixed', source: 'static' },
      params: { timeLimitSec: 90, starThresholds: [4, 7, 10] },
      starsToEarn: 3,
    },
    {
      id: 'wp-mastery',
      kind: 'mastery',
      title: 'Owl Sage Trial',
      description: 'Solve word problems to defeat the Owl Sage!',
      gameId: 'bossBattle',
      providerConfig: { kind: 'wordProblem', topic: 'mixed', source: 'static' },
      params: { questionCount: 8, bossEmoji: '🦉', bossName: 'Owl Sage' },
      starsToEarn: 3,
    },
  ],
  stagesByBand: {
    // K "Story Woods" (K.OA.2): spoken story problems within 10 with characters and places;
    // the child acts each story out (the `mathStory` activity), then taps the answer. Adding
    // to and taking from within 5; then within 10 with two kinds in one basket; then every
    // kind, how many more too. Titles and descriptions are said aloud.
    k1: [
      {
        id: 'k-woods-1',
        kind: 'concept',
        title: 'Act it out',
        description: 'Listen to the story. Then act it out!',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kStoryMath', plots: ['join', 'leave'], max: 5 },
        params: { questionCount: 5 },
        starsToEarn: 3,
      },
      {
        id: 'k-woods-2',
        kind: 'practice',
        title: 'Story time',
        description: 'Stories up to ten. Fill the basket!',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kStoryMath', plots: ['join', 'leave', 'together'], max: 10 },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'k-woods-3',
        kind: 'mastery',
        title: 'Story puzzles',
        description: 'Every kind of story. How many more?',
        gameId: 'listenPlay',
        providerConfig: { kind: 'kStoryMath', plots: ['join', 'leave', 'together', 'compare'], max: 10 },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
    ],
    // 5th grade (phase 3; 5.OA.1–3): write and read expressions, two-rule
    // patterns → work out expressions against the clock → multi-step stories
    // in the boss.
    g5: [
      {
        id: 'g5-woods-1',
        kind: 'concept',
        title: 'Expression Trail',
        description: 'Write and read expressions with parentheses and brackets, and follow two-rule patterns.',
        gameId: 'conceptPlay',
        providerConfig: { kind: 'g5Expr', mode: 'expressions' },
        params: { questionCount: 6 },
        starsToEarn: 3,
      },
      {
        id: 'g5-woods-2',
        kind: 'practice',
        title: 'Trail Race',
        description: 'Grouping first! How many expressions can you solve in 2 minutes?',
        gameId: 'speedRun',
        providerConfig: { kind: 'g5Expr', mode: 'evaluate' },
        params: { timeLimitSec: 120, starThresholds: [3, 6, 9] },
        starsToEarn: 3,
      },
      {
        id: 'g5-woods-3',
        kind: 'mastery',
        title: 'Riddle Wolf Trial',
        description: 'Solve multi-step problems to outwit the Riddle Wolf!',
        gameId: 'bossBattle',
        providerConfig: { kind: 'g5Expr', mode: 'mastery' },
        params: { questionCount: 8, bossEmoji: '🐺', bossName: 'Riddle Wolf' },
        starsToEarn: 3,
      },
    ],
  },
}
