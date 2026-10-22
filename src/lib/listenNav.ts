import { zoneStages, type Stage, type Zone } from '../curriculum'
import { lineText } from '../voice/registry'
import type { VoiceRef } from '../voice/types'
import { bandFallbacks, contentBand, isListenMode } from './gradeBand'
import { isStageUnlocked } from './stageLocks'
import type { GradeLevel } from './gradeTiers'

/**
 * Getting around without reading (K–5 plan §6): what the World, the map and
 * the zone pages need to know to guide a K–1 child by voice. Pure (no React,
 * no store), so the screens and the tests share it.
 *
 * - A zone is OPEN to K–1 once it has a K–1 stage set (`stagesByBand.k1`);
 *   the others are "still sleeping, coming soon" and can't be entered.
 * - Every open zone and pilot stage has spoken lines in the `k-nav` pack,
 *   keyed by its id (the stage buttons have no words on them).
 */

type Grade = GradeLevel | null | undefined

/** The zone has its own kindergarten stage set. */
export function hasK1Set(zone: Pick<Zone, 'stagesByBand'>): boolean {
  return (zone.stagesByBand?.k1?.length ?? 0) > 0
}

/**
 * The zone has a voice-first stage set for this grade: kindergarten's for K;
 * 1st grade's own, or else kindergarten's, for 1st grade.
 */
export function hasListenSet(zone: Pick<Zone, 'stagesByBand'>, grade: Grade): boolean {
  if (grade == null) return false
  return bandFallbacks(contentBand(grade)).some((b) => (b === 'k1' || b === 'g1') && (zone.stagesByBand?.[b]?.length ?? 0) > 0)
}

/** A voice-first child (K–1) at this grade. */
export function listenGrade(grade: Grade): boolean {
  return grade != null && isListenMode(grade)
}

/** K–1 only: a zone with no voice-first stages for the grade yet is "still sleeping, coming soon" (it can't be entered). */
export function isZoneSleeping(zone: Pick<Zone, 'stagesByBand'>, grade: Grade): boolean {
  return listenGrade(grade) && !hasListenSet(zone, grade)
}

const line = (id: string): VoiceRef | null => (lineText(`k-nav/${id}`) !== undefined ? { line: `k-nav/${id}` } : null)

/** "This place is still sleeping. Come back soon!" */
export const SLEEPING_LINE: VoiceRef = { line: 'k-nav/sleeping' }

/**
 * A 1st-grade zone line where the zone has a 1st-grade name of its own
 * (`name-g1-<zoneId>`), else kindergarten's (`name-<zoneId>`).
 */
const zoneLine = (kind: 'name' | 'welcome', zoneId: string, grade: Grade): VoiceRef | null =>
  (grade != null && contentBand(grade) === 'g1' ? line(`${kind}-g1-${zoneId}`) : null) ?? line(`${kind}-${zoneId}`)

/** A zone's name, said when it's tapped on the map ("Counting Mesa!"); null when it has none. */
export function zoneNameVoice(zoneId: string, grade?: Grade): VoiceRef | null {
  return zoneLine('name', zoneId, grade)
}

/** A zone's welcome, at its gateway and on its page ("Counting Mesa! Tap a star to play!"). */
export function zoneWelcomeVoice(zoneId: string, grade?: Grade): VoiceRef {
  return zoneLine('welcome', zoneId, grade) ?? { line: 'k-nav/tapAStar' }
}

/** A stage's title, said when its picture button is focused or tapped ("Count with me!"). */
export function stageVoice(stageId: string): VoiceRef | null {
  return line(`stage-${stageId}`)
}

/** Pictures for the pilot's stage buttons (a stage may also bring its own `emoji`). */
const STAGE_PICTURE: Record<string, string> = {
  'k-count-1': '🍎',
  'k-count-parade': '🐾',
  'k-count-3': '⚖️',
  'k-shapes-1': '🔺',
  'k-shapes-2': '🧊',
  'k-shapes-3': '🔍',
  'k-letters-1': '🔤',
  'k-letters-2': 'Aa',
  'k-letters-3': '🐝',
  'k-rhyme-1': '🎩',
  'k-syllables-1': '🥁',
  'k-rhyme-2': '🌙',
  'k-blend-1': '🐍',
  'k-sight-1': '👀',
  // Writing Workshop
  'k-trace-1': '✏️',
  'k-trace-2': '🔢',
  'k-trace-3': '🔤',
  'k-story-1': '📖',
  // Add-and-Take Falls
  'k-addsub-1': '🐸',
  'k-addsub-2': '🦆',
  'k-addsub-3': '🔟',
  // Story Woods
  'k-woods-1': '🐻',
  'k-woods-2': '🍐',
  'k-woods-3': '🥕',
  // Number Dunes and Ten Frame Plateau (K, phase 2a)
  'k-dunes-1': '🐰',
  'k-dunes-2': '🎲',
  'k-dunes-3': '🚂',
  'k-teens-1': '🔟',
  'k-teens-2': '🔴',
  'k-teens-3': '⛰️',
}
const KIND_PICTURE: Record<Stage['kind'], string> = { concept: '💡', practice: '⚡', mastery: '🏆' }

/** The picture on a stage's button: its own emoji, the pilot's, or one for its kind. */
export function stagePicture(stage: Pick<Stage, 'id' | 'kind'> & { emoji?: string }): string {
  return stage.emoji ?? STAGE_PICTURE[stage.id] ?? KIND_PICTURE[stage.kind] ?? '⭐'
}

/**
 * How many picture buttons a K–1 stage picker puts in a row: all of them up
 * to four (the pilot's three, Writing Workshop's four), then rows of three
 * (five or six stages) or four (seven or eight: Letter Reef), so the rows come
 * out even and a short last row sits in the middle.
 */
export function stagePickerColumns(count: number): number {
  if (count <= 4) return Math.max(1, count)
  return count <= 6 ? 3 : 4
}

type ZoneProgressLike = { stages: Record<string, { stars: number } | undefined> } | undefined

/**
 * The stage the guide's hand points at: the first open stage with no star yet,
 * else the first open one short of all its stars; null once every star is in.
 */
export function nextStageToPlay(zone: Zone, progress: ZoneProgressLike, grade: Grade): Stage | null {
  const stages = zoneStages(zone, grade)
  const stars = (s: Stage) => progress?.stages[s.id]?.stars ?? 0
  const open = stages.filter((s) => isStageUnlocked(zone, s.id, progress as Parameters<typeof isStageUnlocked>[2], grade))
  return open.find((s) => stars(s) === 0) ?? open.find((s) => stars(s) < s.starsToEarn) ?? null
}
