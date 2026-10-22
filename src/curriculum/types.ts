import type { ProviderConfig } from '../lib/providers'
import type { ContentBand } from '../lib/gradeBand'

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
  /** The zone's name for 2nd–4th grade (and any band without its own). Read it through `zoneTitle(zone, grade)`. */
  title: string
  /**
   * The zone's name for another content band, where its stages teach
   * something else: Multiplication Mesa is "Counting Mesa" in kindergarten.
   * 1st grade with no name of its own uses kindergarten's.
   */
  titleByBand?: Partial<Record<ContentBand, string>>
  subtitle: string
  /** The subtitle for another content band, where the zone teaches something else (5th grade's "Multi-digit multiplication"). Read it through `zoneSubtitle(zone, grade)`. */
  subtitleByBand?: Partial<Record<ContentBand, string>>
  emoji: string
  themeColor: 'island' | 'monster' | 'ocean' | 'quest'
  description: string
  /** The description for another content band, as `subtitleByBand`. Read it through `zoneDescription(zone, grade)`. */
  descriptionByBand?: Partial<Record<ContentBand, string>>
  /** The 2nd–4th grade stages (difficulty scaled per grade by lib/gradeTiers). */
  stages: Stage[]
  /**
   * Stage sets for the other content bands (lib/gradeBand): kindergarten
   * (`k1`), 1st grade (`g1`) and 5th grade (`g5`). 1st grade with no set of
   * its own plays kindergarten's; any other band with no set plays `stages`.
   * Their stage ids are new (e.g. `k-count-1`), so stars never mix across
   * bands. Read a zone's stages only through `zoneStages(zone, grade)`
   * (curriculum/index).
   */
  stagesByBand?: Partial<Record<'k1' | 'g1' | 'g5', Stage[]>>
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
