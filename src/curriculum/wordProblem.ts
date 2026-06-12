import type { Zone } from './types'

export const wordProblemZone: Zone = {
  id: 'word-problem-woods',
  title: 'Word Problem Woods',
  subtitle: 'Read, plan, solve',
  emoji: '🌲',
  themeColor: 'island',
  description:
    'Word problems are math hiding inside stories. Read carefully, figure out what to do, then solve. Problems are templated for now — switching to AI-generated stories themed around your avatar is a future upgrade.',
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
}
