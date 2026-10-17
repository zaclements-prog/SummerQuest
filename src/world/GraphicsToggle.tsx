import { useEffect, useRef, useState } from 'react'
import { useProgress } from '../store/progress'
import type { GraphicsQuality } from '../store/progress'
import { useGraphics } from './graphicsQuality'
import { sfx } from '../lib/sound'

const OPTIONS: { id: GraphicsQuality; icon: string; label: string; hint: string }[] = [
  { id: 'auto', icon: '✨', label: 'Auto', hint: 'Picks for this device' },
  { id: 'high', icon: '🌈', label: 'Pretty', hint: 'Shadows and outlines' },
  { id: 'low', icon: '⚡', label: 'Fast', hint: 'Smoother on slow devices' },
]

/** The ⚙️ graphics chooser in the World HUD: Auto / Pretty / Fast (saved). */
export default function GraphicsToggle() {
  const choice = useProgress((s) => s.graphicsQuality)
  const setChoice = useProgress((s) => s.setGraphicsQuality)
  const autoLow = useGraphics((s) => s.autoLow)
  const probed = useGraphics((s) => s.probed)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  // Close on Escape or a tap anywhere else.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <div ref={box} className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => { sfx.click(); setOpen((o) => !o) }}
        aria-label="Graphics settings"
        aria-expanded={open}
        title="Graphics"
        className="kid-text w-10 h-10 grid place-items-center rounded-full bg-paper/95 hover:bg-cream-100 text-lg border-2 border-line shadow-[0_3px_0_var(--color-line)]"
      >
        ⚙️
      </button>
      {open && (
        <div
          role="group"
          aria-label="Graphics"
          className="absolute right-0 mt-2 w-56 rounded-2xl bg-paper text-ink-900 border-2 border-line shadow-[0_5px_0_var(--color-line)] p-2 [text-shadow:none]"
        >
          <div className="kid-text text-sm px-2 pt-1 pb-2">Graphics</div>
          <div className="flex flex-col gap-1">
            {OPTIONS.map((o) => {
              const on = choice === o.id
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => { sfx.click(); setChoice(o.id); setOpen(false) }}
                  className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-left min-h-[44px] ${on ? 'bg-quest-500 text-quest-900' : 'hover:bg-ocean-50'}`}
                >
                  <span className="text-xl" aria-hidden="true">{o.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="kid-text block text-sm leading-tight">{o.label}</span>
                    <span className="block text-[11px] leading-tight opacity-75">{o.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
          {choice === 'auto' && probed && (
            <p className="text-[11px] text-ink-500 px-2 pt-2">
              {autoLow ? 'Auto chose Fast for this device.' : 'Auto chose Pretty for this device.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
