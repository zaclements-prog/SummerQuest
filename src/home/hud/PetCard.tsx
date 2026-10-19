import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useProgress } from '../../store/progress'
import { usePetStatusMap } from '../../lib/pets/usePets'
import { petEmoji, petName } from '../../lib/pets/catalog'
import { nextStepText, stageLabel } from '../../lib/pets/copy'
import { sfx } from '../../lib/sound'

const btn =
  'kid-text inline-flex items-center justify-center gap-1.5 min-h-12 px-4 rounded-full text-base border-2 border-line shadow-ledge-sm outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 active:translate-y-0.5'

/**
 * The card a tapped pet opens in the Home room (Play mode): its name and
 * stage, what it needs next, and buttons to make it your World buddy or see
 * it on the Pets page.
 */
export default function PetCard({ creatureId, onClose }: { creatureId: string; onClose: () => void }) {
  const status = usePetStatusMap()[creatureId]
  const buddy = useProgress((s) => s.buddyPet)
  const setBuddyPet = useProgress((s) => s.setBuddyPet)
  const isBuddy = buddy === creatureId

  // Esc closes it, like the other HUD pop-ups.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!status) return null
  const name = petName(creatureId)

  return (
    <div
      role="dialog"
      aria-label={`${name}, your pet`}
      className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-[calc(0.75rem+var(--safe-bottom,env(safe-area-inset-bottom,0px)))] w-[min(26rem,calc(100%-1.5rem))] bg-paper text-ink-900 rounded-[1.5rem] border-[3px] border-line shadow-pop p-3 [text-shadow:none]"
    >
      <div className="flex items-start gap-3">
        <span className="grid place-items-center shrink-0 w-14 h-14 short:w-12 short:h-12 rounded-full bg-quest-200 border-2 border-line text-3xl" aria-hidden="true">
          {petEmoji(creatureId)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h2 className="kid-text text-xl leading-tight">{name}</h2>
            <span className="kid-text text-sm leading-none rounded-full bg-island-200 border-2 border-line px-2 py-1">{stageLabel(status.stage)}</span>
            {isBuddy && <span className="kid-text text-sm leading-none rounded-full bg-quest-300 border-2 border-line px-2 py-1">⭐ Buddy</span>}
          </div>
          <p className="kid-text text-base leading-snug text-ink-700 mt-1">{nextStepText(status)}</p>
        </div>
        <button
          type="button"
          onClick={() => { sfx.click(); onClose() }}
          aria-label="Close"
          className="grid place-items-center shrink-0 w-12 h-12 -mt-1 -mr-1 rounded-full bg-cream-100 border-2 border-line text-xl outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-2.5">
        {isBuddy ? (
          <button type="button" onClick={() => { sfx.click(); setBuddyPet(null) }} className={`${btn} bg-cream-100`}>
            🏠 Stay home
          </button>
        ) : (
          <button type="button" onClick={() => { sfx.correct(); setBuddyPet(creatureId) }} className={`${btn} bg-quest-400`}>
            ⭐ Make buddy
          </button>
        )}
        <Link to={`/pets?pet=${creatureId}`} onClick={() => sfx.click()} className={`${btn} bg-ocean-300`}>
          🐾 Pets page
        </Link>
      </div>
    </div>
  )
}
