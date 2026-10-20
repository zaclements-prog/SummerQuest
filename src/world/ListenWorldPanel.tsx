import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { getZone } from '../curriculum'
import { useProgress } from '../store/progress'
import { guide } from '../guide/store'
import { ListenStagePicker } from '../components/listen/ListenStagePicker'
import { ListenSleeping } from '../components/listen/ListenSleeping'
import { ListenIconButton } from '../components/listen/ListenIconButton'
import type { ActiveNpc } from './useWorldUi'
import { lessonsFor } from '../tutoring/lessons'
import type { GradeLevel } from '../lib/gradeTiers'
import { npcSleeping, npcTitle } from './listenWorld'

/**
 * The World panel for a K–1 (voice-first) child: no paragraphs, no lists to
 * read. A zone (or the Library's Letter Reef) shows its stages as big picture
 * buttons and says its welcome with the hand on the next one; the Schoolhouse
 * shows the band's lessons as pictures; a place with nothing for K–1 yet is
 * "still sleeping". ✕ is a big button too.
 */
export default function ListenWorldPanel({ npc, onLaunch, onClose }: { npc: ActiveNpc; onLaunch: (path: string) => void; onClose: () => void }) {
  const reduced = useReducedMotion()
  const grade = useProgress((s) => s.player?.grade)
  const zone = npc.zoneId ? getZone(npc.zoneId) : undefined
  const sleeping = npcSleeping(npc, grade)
  const title = npcTitle(npc, grade)
  const emoji = npc.hub === 'schoolhouse' ? '🏫' : npc.hub === 'library' ? '📚' : (zone?.emoji ?? '🗺️')

  return (
    <motion.div
      role="dialog"
      aria-label={title}
      data-listen-panel=""
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      className="pointer-events-auto absolute inset-x-2 bottom-2 sm:inset-x-auto sm:right-4 sm:top-14 sm:bottom-auto sm:w-[460px] max-h-[calc(100%-5.5rem)] overflow-y-auto rounded-3xl bg-paper text-ink-900 shadow-2xl border-[3px] border-line p-3 sm:p-4 [text-shadow:none]"
    >
      <div className="flex items-center gap-3 mb-3 short:mb-2">
        <span className="grid place-items-center w-14 h-14 shrink-0 rounded-full bg-cream-100 border-[3px] border-line text-4xl leading-none" aria-hidden="true">
          {emoji}
        </span>
        <h2 className="kid-text text-2xl flex-1 min-w-0 leading-tight">{title}</h2>
        <ListenIconButton icon="✕" label="Close" onClick={onClose} />
      </div>

      {sleeping ? (
        <ListenSleeping emoji={emoji} />
      ) : npc.hub === 'schoolhouse' ? (
        <LessonPictures grade={grade} onLaunch={onLaunch} />
      ) : zone ? (
        <ListenStagePicker zone={zone} onPlay={onLaunch} />
      ) : null}
    </motion.div>
  )
}

/**
 * The band's lessons as picture buttons, asked like the K–1 lesson picker
 * ("Pick a lesson to watch. Tap a picture!", the hand gliding over them).
 */
function LessonPictures({ grade, onLaunch }: { grade: GradeLevel | null | undefined; onLaunch: (path: string) => void }) {
  const lessons = lessonsFor(grade)
  const key = lessons.map((l) => l.id).join(',')
  useEffect(() => {
    const ids = key ? key.split(',').map((id) => `lesson-${id}`) : null
    void guide.show({ voice: { line: 'k-lessons/pickLesson' }, target: ids, cue: 'Tap', hand: 'sweep' })
    return () => guide.clear({ forget: true })
  }, [key])
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {lessons.map((l) => (
        <ListenIconButton key={l.id} icon={l.emoji} label={l.title} guide={`lesson-${l.id}`} size="lg" tone="ocean" onClick={() => onLaunch(`/tutor/${l.id}`)} />
      ))}
    </div>
  )
}
