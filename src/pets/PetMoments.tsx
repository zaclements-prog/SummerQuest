import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useProgress } from '../store/progress'
import { pendingMoments, petStages } from '../lib/pets/growth'
import type { PetMoment } from '../lib/pets/growth'
import { isCalmRoute, nextMomentShow } from '../lib/pets/moments'
import type { MomentShow } from '../lib/pets/moments'
import { usePetUi } from '../lib/pets/usePetUi'
import { petEmoji, petName } from '../lib/pets/catalog'
import { stageLabel } from '../lib/pets/copy'
import { lazyWithRetry } from '../lib/lazyWithRetry'
import { Button, Modal } from '../components/ui'
import { sfx } from '../lib/sound'

// The 3D card (three.js and the creature models) loads only when a pet has something to celebrate.
const PetMomentCard = lazyWithRetry(() => import('./PetMomentCard'))

/** Wait this long on a calm screen before celebrating (ms): let it settle first. */
const SETTLE_MS = 900
/** …and longer over the lesson-complete card, so its own fanfare plays first. */
const SETTLE_LESSON_MS = 1800

/** Another dialog is up (a zone or badge celebration, the grown-ups' check): wait for it. */
function otherDialogOpen(): boolean {
  return document.querySelector('[aria-modal="true"]:not([data-pet-calm])') !== null
}

/** A 3D screen (World, Home, Pets) still loading: wait until its view is up. */
function stillLoading(pathname: string): boolean {
  const is3d = pathname === '/world' || pathname === '/home' || pathname === '/pets'
  return is3d && document.querySelector('main canvas') === null
}

/**
 * Pet celebrations, mounted once in the app shell. When a pet's stage (derived
 * from progress) is ahead of the one last celebrated (`petsSeen`), it shows a
 * hatch or grow-up moment — but only at calm moments: the World, the map, a
 * zone, Home, Pets, the Tutor's list, or a lesson's complete card. Never in the
 * middle of a game or a lesson. Several wait in a queue, one at a time; more
 * than three become one summary card. Each is marked seen when it's dismissed.
 */
export default function PetMoments() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const player = useProgress((s) => s.player)
  const zones = useProgress((s) => s.zones)
  const lessonsDone = useProgress((s) => s.lessonsDone)
  const petsSeen = useProgress((s) => s.petsSeen)
  const markPetsSeen = useProgress((s) => s.markPetsSeen)
  const becomeCreature = useProgress((s) => s.becomeCreature)
  const lessonOpen = usePetUi((s) => s.lessonCompleteOpen)
  const calm = !!player && isCalmRoute(pathname, lessonOpen)
  const grade = player?.grade
  const pending = useMemo(() => pendingMoments(petStages(zones, lessonsDone, grade), petsSeen), [zones, lessonsDone, grade, petsSeen])
  const [show, setShow] = useState<MomentShow | null>(null)
  // Leaving the calm screen hides it without marking it seen (it comes back later).
  const visible = calm ? show : null

  // Something to celebrate on a calm screen: after a beat, once its 3D view is up and no other dialog is.
  useEffect(() => {
    if (show || !calm || pending.length === 0) return
    let timer = 0
    const tryOpen = () => {
      if (otherDialogOpen() || stillLoading(pathname)) timer = window.setTimeout(tryOpen, 600)
      else setShow(nextMomentShow(pending))
    }
    timer = window.setTimeout(tryOpen, lessonOpen ? SETTLE_LESSON_MS : SETTLE_MS)
    return () => window.clearTimeout(timer)
  }, [show, calm, pending, lessonOpen, pathname])

  // The lesson-complete card holds its countdown while a celebration is up.
  useEffect(() => {
    usePetUi.getState().setMomentOpen(visible !== null)
  }, [visible])
  useEffect(() => () => usePetUi.getState().setMomentOpen(false), [])

  const done = useCallback(() => {
    if (!show) return
    const list = show.kind === 'one' ? [show.moment] : show.moments
    markPetsSeen(Object.fromEntries(list.map((m) => [m.creatureId, m.to])))
    setShow(null)
  }, [show, markPetsSeen])

  if (!visible) return null
  if (visible.kind === 'summary') {
    return (
      <SummaryCard
        moments={visible.moments}
        onPets={
          pathname === '/pets'
            ? undefined
            : () => {
                done()
                navigate('/pets')
              }
        }
        onDone={done}
      />
    )
  }
  return (
    <Suspense fallback={null}>
      <PetMomentCard
        key={`${visible.moment.creatureId}-${visible.moment.to}`}
        moment={visible.moment}
        onDone={done}
        onBecome={(id) => {
          becomeCreature(id)
          done()
        }}
      />
    </Suspense>
  )
}

/** Lots happened at once (more than three pets): one card that lists them all. */
function SummaryCard({ moments, onPets, onDone }: { moments: PetMoment[]; onPets?: () => void; onDone: () => void }) {
  const adults = moments.filter((m) => m.to === 'adult').map((m) => petName(m.creatureId))
  useEffect(() => {
    sfx.fanfare()
  }, [])
  return (
    <Modal open onClose={onDone} label="Your pets grew!" size="md">
      <div className="relative overflow-hidden rounded-toon px-5 pt-5 pb-5 short:pt-4 short:pb-4 text-center">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-quest-100 to-transparent" aria-hidden="true" />
        <h2 className="relative kid-text font-bold text-2xl short:text-xl text-ink-900 leading-tight">🎉 Your pets grew!</h2>
        <p className="relative kid-text text-lg short:text-base text-ink-700 mt-1">
          {moments.length} pets hatched or grew while you were learning.
        </p>
        <ul className="relative mt-3 short:mt-2 flex flex-wrap justify-center gap-2" aria-label="What changed">
          {moments.map((m) => (
            <li key={m.creatureId} className="kid-text inline-flex items-center gap-1.5 rounded-full bg-paper border-2 border-line shadow-ledge-sm px-3 py-1.5 text-base">
              <span aria-hidden="true">{petEmoji(m.creatureId)}</span>
              {petName(m.creatureId)} · {stageLabel(m.to)}
            </li>
          ))}
        </ul>
        {adults.length > 0 && (
          <p className="relative kid-text text-base text-ink-800 mt-3 short:mt-2">
            You can now play as the {adults.join(' and the ')}!
          </p>
        )}
        <div className="relative mt-4 short:mt-3 flex flex-wrap justify-center gap-2.5">
          {onPets && (
            <Button variant="primary" size="lg" onClick={onPets}>
              🐾 See my pets
            </Button>
          )}
          <Button variant={onPets ? 'ghost' : 'primary'} size="lg" onClick={onDone}>
            Yay! 🎉
          </Button>
        </div>
      </div>
    </Modal>
  )
}
