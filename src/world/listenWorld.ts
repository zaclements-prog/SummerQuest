import { getZone, zoneTitle } from '../curriculum'
import { isZoneSleeping, listenGrade, SLEEPING_LINE, zoneWelcomeVoice } from '../lib/listenNav'
import type { GradeLevel } from '../lib/gradeTiers'
import type { VoiceRef } from '../voice/types'
import { lessonBand, lessonsFor } from '../tutoring/lessons'
import type { ActiveNpc } from './useWorldUi'

/**
 * The World's gateways for a K–1 (voice-first) child: which are open, what
 * they say when you walk up, and what they're called. A subject NPC follows
 * its zone (open once the zone has K–1 stages); the Library follows Reading
 * Reef (Letter Reef); the Schoolhouse opens once the child's band has lessons.
 */

type Grade = GradeLevel | null | undefined
type NpcLike = Pick<ActiveNpc, 'zoneId' | 'hub' | 'label'>

/** K–1: this gateway can't be entered yet ("still sleeping, coming soon"). Never true for grades 2–5. */
export function npcSleeping(npc: NpcLike, grade: Grade): boolean {
  if (!listenGrade(grade)) return false
  // (the band has its own lessons: `lessonsFor` lends 2–4's to a band that has none)
  if (npc.hub === 'schoolhouse') return !lessonsFor(grade).some((l) => lessonBand(l) === 'k1')
  const zone = npc.zoneId ? getZone(npc.zoneId) : undefined
  return !zone || isZoneSleeping(zone, grade)
}

/** What the gateway says when a K–1 child walks up (or taps 🔊 next to it). */
export function npcGreeting(npc: NpcLike, grade: Grade): VoiceRef {
  if (npcSleeping(npc, grade)) return SLEEPING_LINE
  if (npc.hub === 'schoolhouse') return { line: 'k-nav/lessonTime' }
  return npc.zoneId ? zoneWelcomeVoice(npc.zoneId) : { line: 'k-nav/tapAStar' }
}

/** The gateway's name for the child's grade ("Counting Mesa" in K–1). */
export function npcTitle(npc: NpcLike, grade: Grade): string {
  const zone = npc.zoneId ? getZone(npc.zoneId) : undefined
  if (npc.hub || !zone) return npc.label
  return zoneTitle(zone, grade)
}
