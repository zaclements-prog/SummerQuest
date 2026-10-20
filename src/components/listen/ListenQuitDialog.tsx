import { useEffect, useRef } from 'react'
import { Modal } from '../ui'
import { guide } from '../../guide/store'
import { sfx } from '../../lib/sound'

/**
 * "Quit?" for a K–1 (voice-first) child: nothing to read. The voice asks "Do
 * you want to stop playing?" and the ring sweeps over the two answers: a big
 * ↺ (keep playing — the safe one, focused first) and a big ✓ (leave). The
 * scrim and Escape keep playing, like the grown-up dialog.
 */
export function ListenQuitDialog({ open, onLeave, onStay }: { open: boolean; onLeave: () => void; onStay: () => void }) {
  const stayRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    // (after the game has hushed its own line and the dialog has popped in)
    const t = window.setTimeout(() => {
      stayRef.current?.focus({ preventScroll: true })
      void guide.show({ voice: { line: 'k-nav/quitAsk' }, target: ['quit-stay', 'quit-leave'], hand: 'sweep', dim: false, pad: 6 })
    }, 250)
    return () => {
      window.clearTimeout(t)
      guide.clear({ forget: true })
    }
  }, [open])

  const round = [
    'grid place-items-center rounded-full border-[3px] border-line shadow-ledge',
    'w-24 h-24 short:w-[5.25rem] short:h-[5.25rem] roomy:w-28 roomy:h-28',
    'transition-[translate,box-shadow,background-color] duration-100 active:translate-y-[4px] active:shadow-ledge-sm',
    'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2',
  ].join(' ')

  return (
    <Modal open={open} onClose={onStay} label="Stop playing?" role="alertdialog" size="sm">
      <div className="px-6 pt-5 pb-6 short:pt-3 short:pb-4 flex flex-col items-center gap-4 short:gap-3" data-listen-quit="">
        <div className="grid place-items-center w-20 h-20 short:w-14 short:h-14 rounded-full bg-cream-100 border-[3px] border-line text-5xl short:text-4xl" aria-hidden="true">
          🚪
        </div>
        <div className="flex items-center justify-center gap-8 short:gap-6">
          <button
            ref={stayRef}
            type="button"
            aria-label="Keep playing"
            data-guide="quit-stay"
            onClick={() => {
              sfx.click()
              onStay()
            }}
            className={`${round} bg-ocean-300 hover:bg-ocean-200`}
          >
            <svg viewBox="0 0 48 48" className="w-[58%] h-[58%]" aria-hidden="true">
              <path d="M36 25a12 12 0 1 1-4.2-9.1" fill="none" stroke="#3a2c38" strokeWidth="5.5" strokeLinecap="round" />
              <path d="M30 8.5l3.2 8.6-8.8 1.7z" fill="#3a2c38" stroke="#3a2c38" strokeWidth="3" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Leave"
            data-guide="quit-leave"
            onClick={() => {
              sfx.click()
              onLeave()
            }}
            className={`${round} bg-correct-400 hover:bg-correct-300`}
          >
            <svg viewBox="0 0 48 48" className="w-[58%] h-[58%]" aria-hidden="true">
              <path d="M11 25.5l8.5 8.5L37 15" fill="none" stroke="#3a2c38" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </Modal>
  )
}
