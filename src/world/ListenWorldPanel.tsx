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
import { npcSleeping, npcTitle, schoolPetVoice } from './listenWorld'
import { EggIcon } from '../pets/EggIcon'
import { SCHOOL_PET_ID, schoolPetStatus } from '../lib/pets/schoolPet'
import { petEmoji } from '../lib/pets/catalog'
import { focusRows } from './hubContent'

/**
 * The World panel for a K–1 (voice-first) child: no paragraphs, no lists to
 * read. A zone (or the Library's Letter Reef) shows its stages as big picture
 * buttons and says its welcome with the hand on the next one; the Schoolhouse
 * shows its pet (the raven's egg or the raven: a tap says how it grows), a
 * 🎯 picture for the trickiest skill on This Week's Focus, and the band's
 * lessons as pictures; a place with nothing for K–1 yet is "still sleeping".
 * ✕ is a big button too.
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
        <>
          <SchoolPetPictures grade={grade} onLaunch={onLaunch} />
          <LessonPictures grade={grade} onLaunch={onLaunch} />
        </>
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

/**
 * The Schoolhouse's pet, voice-first: the raven's egg (or the raven) as a big
 * picture that says how it grows ("Practice the tricky ones to hatch it!"),
 * and, when This Week's Focus has a skill, a 🎯 picture that practices the
 * trickiest one ("Let's practice a tricky one!"). The 🐾 picture opens it on
 * the Pets page.
 */
function SchoolPetPictures({ grade, onLaunch }: { grade: GradeLevel | null | undefined; onLaunch: (path: string) => void }) {
  const record = useProgress((s) => s.schoolPet)
  const zones = useProgress((s) => s.zones)
  const attempts = useProgress((s) => s.attempts)
  const sessions = useProgress((s) => s.sessions)
  const status = schoolPetStatus(record)
  const practice = focusRows({ zones, attempts, sessions, grade }, 1)[0]?.practiceHref ?? null
  const say = () => void guide.show({ voice: schoolPetVoice(status.stage), target: practice ? 'school-practice' : null, dim: false })
  const go = () => {
    if (!practice) return
    void guide.sequence([{ voice: { line: 'k-nav/focusPractice' }, dim: false }], { repeatable: false }).then(() => onLaunch(practice))
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mb-3 pb-3 border-b-[3px] border-dashed border-line/30">
      <ListenIconButton
        icon={status.stage === 'egg' ? <EggIcon shell={status.pet.egg.shell} spot={status.pet.egg.spot} /> : petEmoji(SCHOOL_PET_ID)}
        label={status.stage === 'egg' ? 'Raven egg' : 'Raven'}
        guide="school-pet"
        tone="sun"
        onClick={say}
      />
      {practice && <ListenIconButton icon="🎯" label="Practice a tricky one" guide="school-practice" tone="go" onClick={go} />}
      <ListenIconButton icon="🐾" label="My pets" onClick={() => onLaunch(`/pets?pet=${SCHOOL_PET_ID}`)} />
    </div>
  )
}
