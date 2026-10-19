import { useEffect } from 'react'
import { sfx } from '../../lib/sound'
import { guide } from '../../guide/store'
import { SayAgainButton } from '../../guide/SayAgainButton'
import { ToonStar } from '../../components/ui'
import './listenPlay.css'

/**
 * The end of a Listen & Play round, with nothing to read: the stars land one
 * by one, the narrator says how many ("You got two stars! Tap the arrow to
 * keep going.") while the hand points at the big ▶; ↺ plays the round again.
 * Coins show as a number only. Used by GameRunner for every K–1 result.
 */
export function ListenResultCard({ stars, coins, onReplay, onNext }: { stars: number; coins?: number; onReplay: () => void; onNext: () => void }) {
  const n = Math.min(3, Math.max(1, Math.round(stars)))

  useEffect(() => {
    if (n >= 3) sfx.fanfare()
    else sfx.victory()
    // (the stars land first)
    const t = setTimeout(() => void guide.show({ voice: { line: `listen/stars${n}` }, target: 'lp-next', cue: 'arrow', pad: 8 }), 700)
    return () => {
      clearTimeout(t)
      guide.clear({ forget: true })
    }
  }, [n])

  const round = [
    'grid place-items-center rounded-full border-[3px] border-line shadow-ledge',
    'transition-[translate,box-shadow,background-color] duration-100 active:translate-y-[4px] active:shadow-ledge-sm',
    'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2',
  ].join(' ')

  return (
    <div className="game-surface flex-1 flex flex-col min-h-0 px-3 sm:px-5 pb-3" data-listen-result="">
      <div className="flex items-center pt-1 pb-2 short:pb-1">
        <SayAgainButton />
      </div>
      <div className="flex-1 min-h-0 grid place-items-center">
        <div className="relative w-full max-w-lg short:max-w-2xl bg-paper border-[3px] border-line rounded-[2rem] shadow-pop px-6 py-7 short:py-4 roomy:py-10 flex flex-col short:flex-row items-center justify-center gap-6 short:gap-10 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] sunburst pointer-events-none opacity-70" aria-hidden="true" />
          <div className="relative flex flex-col items-center gap-3">
            <div className="flex items-end gap-1" role="img" aria-label={`${n} of 3 stars`}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={`lp-star block ${i === 1 ? '-translate-y-3' : ''}`} style={{ ['--d' as string]: `${0.15 + i * 0.22}s` }}>
                  <ToonStar filled={i < n} px={i === 1 ? 124 : 96} />
                </span>
              ))}
            </div>
            {coins !== undefined && coins > 0 && (
              <span className="kid-text font-bold text-2xl inline-flex items-center gap-2 rounded-full border-[3px] border-line bg-quest-300 px-4 py-1 shadow-ledge-sm">
                <span aria-hidden="true">🪙</span>+{coins}
              </span>
            )}
          </div>
          <div className="relative flex items-center gap-6 roomy:gap-8">
            <button
              type="button"
              aria-label="Play again"
              data-guide="lp-again"
              onClick={() => {
                sfx.click()
                onReplay()
              }}
              className={`${round} w-24 h-24 roomy:w-28 roomy:h-28 bg-ocean-300 hover:bg-ocean-200`}
            >
              <svg viewBox="0 0 48 48" className="w-[58%] h-[58%]" aria-hidden="true">
                <path d="M36 25a12 12 0 1 1-4.2-9.1" fill="none" stroke="#3a2c38" strokeWidth="5.5" strokeLinecap="round" />
                <path d="M30 8.5l3.2 8.6-8.8 1.7z" fill="#3a2c38" stroke="#3a2c38" strokeWidth="3" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next"
              data-guide="lp-next"
              onClick={() => {
                sfx.click()
                onNext()
              }}
              className={`${round} w-28 h-28 roomy:w-32 roomy:h-32 bg-correct-400 hover:bg-correct-300`}
            >
              <svg viewBox="0 0 48 48" className="w-[56%] h-[56%] translate-x-[6%]" aria-hidden="true">
                <path d="M15 9.5v29a2 2 0 0 0 3 1.7l23-14.5a2 2 0 0 0 0-3.4L18 7.8a2 2 0 0 0-3 1.7z" fill="#fffaf0" stroke="#3a2c38" strokeWidth="3.5" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
