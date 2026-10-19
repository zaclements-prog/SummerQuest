import type { ProviderConfig } from '../lib/providers'

export type StageKind = 'concept' | 'practice' | 'mastery'

export type GameId =
  | 'conceptPlay'
  | 'speedRun'
  | 'bossBattle'
  | 'towerDefense'
  | 'writingPad'
  | 'divisionArena'
  | 'fractionForge'
  | 'cloudKeeper'
  | 'timesGrove'
  /** K–1 voice-first picture quiz (src/games/listenPlay). */
  | 'listenPlay'
  | 'critterParade'

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
  /** The 2nd–4th grade stages (difficulty scaled per grade by lib/gradeTiers). */
  stages: Stage[]
  /**
   * Stage sets for the other content bands (lib/gradeBand): K–1 and 5th grade.
   * A band with no set yet plays `stages`. Their stage ids are new (e.g.
   * `count-k-1`), so stars never mix across bands. Read a zone's stages only
   * through `zoneStages(zone, grade)` (curriculum/index).
   */
  stagesByBand?: Partial<Record<'k1' | 'g5', Stage[]>>
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
