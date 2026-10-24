import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import GLCanvas from '../platform/gl/GLCanvas'
import { canvasQuality, useLowGraphics } from '../world/graphicsQuality'
import { Button, Modal } from '../components/ui'
import { petEmoji, petName } from '../lib/pets/catalog'
import { momentText } from '../lib/pets/copy'
import { SCHOOL_PET_ID } from '../lib/pets/schoolPet'
import type { PetMoment } from '../lib/pets/growth'
import CelebrationScene from './CelebrationScene'
import { useProgress } from '../store/progress'
import { listenGrade } from '../lib/listenNav'
import { guide } from '../guide/store'
import { lineText } from '../voice/registry'

/**
 * One pet celebration (a hatch, or a pet growing up), loaded on demand: a small
 * 3D stage over a sunburst, then the words and buttons once the new stage is
 * out. A grown-up offers **Become <pet>** or **Not now**.
 *
 * The 3D view is a tiny overlay canvas: while it's open, the screen's own 3D
 * view (World, Home, Pets) pauses, and it's unmounted when the card closes.
 */
export default function PetMomentCard({
  moment,
  onDone,
  onBecome,
}: {
  moment: PetMoment
  onDone: () => void
  onBecome: (creatureId: string) => void
}) {
  const reduced = useReducedMotion() ?? false
  // The screen's own 3D view pauses under this one, so it may use the same pixel ratio (no shadows).
  const gfx = canvasQuality(useLowGraphics())
  const [revealed, setRevealed] = useState(reduced)
  const name = petName(moment.creatureId)
  const text = momentText(moment)
  const adult = moment.to === 'adult'
  const btnRef = useRef<HTMLDivElement>(null)

  // Focus the main button once it appears (keyboard / switch access).
  useEffect(() => {
    if (revealed) btnRef.current?.querySelector('button')?.focus()
  }, [revealed])

  // K–1: the news is said out loud once the pet is out, the hand on the big button
  const listen = listenGrade(useProgress((s) => s.player?.grade))
  useEffect(() => {
    if (!listen) return
    // (whatever the screen behind was pointing at is hidden now)
    if (!revealed) {
      guide.clear()
      return
    }
    // (the Schoolhouse raven hatches from practice: its own line says so)
    const hatched = moment.creatureId === SCHOOL_PET_ID ? 'k-nav/ravenHatched' : 'k-nav/petHatched'
    const line = moment.to === 'adult' ? 'k-nav/petGrownUp' : moment.from === 'egg' ? hatched : 'k-nav/petGrew'
    // hatched: and what came out ("It's a baby lion!")
    const baby = moment.from === 'egg' && moment.to === 'baby' && lineText(`k-nav/baby-${moment.creatureId}`) ? `k-nav/baby-${moment.creatureId}` : null
    void guide.sequence([{ voice: { line }, target: 'pet-moment-ok', dim: false }, ...(baby ? [{ voice: { line: baby }, target: 'pet-moment-ok', dim: false }] : [])])
    return () => guide.clear({ forget: true })
  }, [listen, revealed, moment.to, moment.from, moment.creatureId])

  // Before the reveal a stray tap on the scrim (or Esc) doesn't skip the moment.
  const close = revealed ? onDone : undefined
  const waiting = moment.from === 'egg' ? 'Your egg is hatching…' : `${name} is growing…`

  return (
    <Modal open onClose={close} label={revealed ? `${text.title} ${text.line}` : waiting} size="md">
      <div className="relative overflow-hidden rounded-toon text-center">
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-quest-100 to-transparent" aria-hidden="true" />
        <div className="absolute left-1/2 top-30 short:top-24 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sunburst animate-spin-slow opacity-80" aria-hidden="true" />
        <div className="relative h-60 short:h-48 [@media(max-height:25rem)]:h-36">
          <GLCanvas overlay flat dpr={gfx.dpr} camera={{ fov: 32, position: [0, 1, 3] }} style={{ position: 'absolute', inset: 0 }}>
            <CelebrationScene moment={moment} reduced={reduced} onReveal={() => setRevealed(true)} />
          </GLCanvas>
        </div>
        <div className="relative px-5 pb-5 pt-1 short:px-4 short:pb-3" aria-live="polite">
          <h2 className="kid-text font-bold text-2xl short:text-xl text-ink-900 leading-tight">{revealed ? text.title : waiting}</h2>
          <p className={`kid-text text-lg short:text-base text-ink-700 mt-1 min-h-[1.75rem] transition-opacity duration-300 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
            {text.line}
          </p>
          <div ref={btnRef} className={`mt-3 short:mt-2 flex flex-wrap justify-center gap-2.5 transition-opacity duration-300 ${revealed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {adult ? (
              <>
                <Button variant="success" size="lg" guide="pet-moment-ok" disabled={!revealed} onClick={() => onBecome(moment.creatureId)}>
                  <span aria-hidden="true">{petEmoji(moment.creatureId)}</span> Become {name}
                </Button>
                <Button variant="ghost" size="lg" disabled={!revealed} onClick={onDone}>
                  Not now
                </Button>
              </>
            ) : (
              <Button variant="primary" size="lg" className="min-w-[10rem]" guide="pet-moment-ok" disabled={!revealed} onClick={onDone}>
                Yay! 🎉
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
