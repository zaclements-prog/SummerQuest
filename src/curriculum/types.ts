import type { ProviderConfig } from '../lib/providers'

export type StageKind = 'concept' | 'practice' | 'mastery'

export type GameId =
  | 'conceptPlay'
  | 'speedRun'
  | 'bossBattle'
  | 'towerDefense'
  | 'writingPad'

export interface Stage {
  id: string
  kind: StageKind
  title: string
  description: string
  gameId: GameId
  /** Where problems come from for this stage. */
  providerConfig: ProviderConfig
  /** Game-specific tuning (timer, count, etc.) — not problem source. */
  params?: Record<string, unknown>
  starsToEarn: number
}

export interface Zone {
  id: string
  title: string
  subtitle: string
  emoji: string
  themeColor: 'island' | 'monster' | 'ocean' | 'quest'
  description: string
  stages: Stage[]
  estimatedMinutes: number
  available: boolean
  position: { x: number; y: number }
}

export interface Curriculum {
  id: string
  title: string
  gradeRange: string
  zones: Zone[]
}

export interface MultiplicationParams {
  factorMin: number
  factorMax: number
  questionCount?: number
  timeLimitSec?: number
}
