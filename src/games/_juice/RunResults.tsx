import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { sfx } from '../../lib/sound'
import { ConfettiOverlay } from './JuiceHud'

/**
 * End-of-run celebration for the 3D mini-games: the score counts up with
 * ticks, then the personal-best flag lands, the streak recap and stars pop in,
 * and one big button hands the result to the host (GameRunner) — which then
 * shows its own stars/coins screen. Purely presentational: the game decides
 * the numbers (see `bests.ts` for the stored personal best). Compact enough
 * for a short laptop window (it scrolls rather than clips if it must).
 */

export interface RecapRow {
  icon: string
  label: string
  value: string | number
}

export function RunResults({
  title,
  emoji,
  score,
  prevBest,
  newBest,
  rows,
  stars,
  perfect,
  onCollect,
  autoMs = 30000,
}: {
  title: string
  emoji: string
  score: number
  /** The best score BEFORE this run (0 = first run). */
  prevBest: number
  newBest: boolean
  /** Recap chips, shown two per row (four reads best). */
  rows: RecapRow[]
  stars: number
  /** Badge text for a perfect run (e.g. "Golem Smasher"), shown with a medal. */
  perfect?: string | null
  onCollect: () => void
  /** Safety net: collect automatically after this long (the stars must land). */
  autoMs?: number
}) {
  const reduced = useReducedMotion() ?? false
  const [shown, setShown] = useState(reduced ? score : 0)
  const [settled, setSettled] = useState(reduced)
  const collected = useRef(false)

  const collect = () => {
    if (collected.current) return
    collected.current = true
    sfx.coin()
    onCollect()
  }
  const collectRef = useRef(collect)
  useEffect(() => {
    collectRef.current = collect
  })

  // score count-up: ease-out over ~1–2 s with a tick every few frames
  useEffect(() => {
    if (reduced) return
    let raf = 0
    let lastTick = 0
    const t0 = performance.now()
    const dur = Math.min(2000, 900 + score * 0.6)
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur)
      const e = 1 - Math.pow(1 - k, 3)
      setShown(Math.round(score * e))
      if (t - lastTick > 70 && k < 1) {
        lastTick = t
        sfx.tick()
      }
      if (k < 1) raf = requestAnimationFrame(step)
      else {
        setSettled(true)
        if (newBest) sfx.fanfare()
        else sfx.sparkle()
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [score, newBest, reduced])

  useEffect(() => {
    const t = window.setTimeout(() => collectRef.current(), autoMs)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') collectRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [autoMs])

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-2 bg-sky-950/35 backdrop-blur-[2px]">
      <ConfettiOverlay show={settled && (newBest || !!perfect)} pieces={60} />
      <motion.div
        initial={reduced ? { opacity: 0 } : { scale: 0.6, y: 40, opacity: 0 }}
        animate={reduced ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        className="relative w-full max-w-sm max-h-full overflow-y-auto rounded-[26px] bg-[#fffaf0] px-5 pt-3 pb-4 text-center shadow-2xl"
        style={{ border: '4px solid #3a2c38', boxShadow: '0 8px 0 rgba(58,44,56,.35)' }}
      >
        <h2 className="kid-text text-2xl text-[#3a2c38] flex items-center justify-center gap-2">
          <span className="text-3xl leading-none" aria-hidden="true">
            {emoji}
          </span>
          {title}
        </h2>

        <div className="mt-1 kid-text text-[11px] tracking-widest text-[#7a6a76]">SCORE</div>
        <div className="kid-text text-5xl leading-none text-[#3a2c38] tabular-nums" aria-live="polite">
          {shown.toLocaleString()}
        </div>
        <div className="h-8 mt-1 flex items-center justify-center">
          {settled && newBest ? (
            <motion.span
              initial={reduced ? { opacity: 0 } : { scale: 1.8, rotate: -14, opacity: 0 }}
              animate={reduced ? { opacity: 1 } : { scale: 1, rotate: -4, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 14 }}
              className="kid-text inline-block rounded-xl px-3 py-0.5 text-lg text-white"
              style={{ background: '#f2766b', border: '3px solid #3a2c38' }}
            >
              🏆 NEW BEST!
            </motion.span>
          ) : (
            <span className="kid-text text-base text-[#7a6a76]">{prevBest > 0 ? `Best ${prevBest.toLocaleString()}` : ''}</span>
          )}
        </div>

        <div className="mt-1 grid grid-cols-2 gap-1.5">
          {rows.map((r, i) => (
            <motion.div
              key={r.label}
              initial={reduced ? { opacity: 0 } : { y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reduced ? 0 : 0.25 + i * 0.12 }}
              className="rounded-2xl bg-[#f3e9d6] px-2 py-1 kid-text text-[#3a2c38]"
            >
              <div className="flex items-center justify-center gap-1.5 text-xl leading-tight">
                <span aria-hidden="true">{r.icon}</span>
                <span className="tabular-nums">{r.value}</span>
              </div>
              <div className="text-xs text-[#7a6a76] leading-tight">{r.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <div className="flex gap-0.5 text-4xl leading-none" role="img" aria-label={`${stars} of 3 stars`}>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                initial={reduced ? { opacity: 0 } : { scale: 0, rotate: -120 }}
                animate={reduced ? { opacity: stars > i ? 1 : 0.3 } : { scale: 1, rotate: 0, opacity: stars > i ? 1 : 0.3 }}
                transition={{ delay: reduced ? 0 : 0.5 + i * 0.15, type: 'spring', stiffness: 260, damping: 11 }}
                className={stars > i ? 'text-[#f7c102]' : 'text-[#b9aeb6]'}
                aria-hidden="true"
              >
                {stars > i ? '★' : '☆'}
              </motion.span>
            ))}
          </div>
          {perfect && (
            <motion.div
              initial={reduced ? { opacity: 0 } : { scale: 0, rotate: 30 }}
              animate={reduced ? { opacity: 1 } : { scale: 1, rotate: 0 }}
              transition={{ delay: reduced ? 0 : 0.9, type: 'spring', stiffness: 300, damping: 12 }}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 kid-text text-base text-[#3a2c38]"
              style={{ background: 'linear-gradient(180deg,#ffe58a,#ffc94d)', border: '3px solid #3a2c38' }}
            >
              🎖️ {perfect}
            </motion.div>
          )}
        </div>

        <button
          type="button"
          autoFocus
          onClick={collect}
          className="kid-text mt-3 w-full rounded-2xl py-2.5 text-2xl text-white transition active:translate-y-0.5"
          style={{ background: 'linear-gradient(180deg,#5fd18a,#2fa866)', border: '3px solid #3a2c38', boxShadow: '0 5px 0 #3a2c38' }}
        >
          Collect ⭐ →
        </button>
      </motion.div>
    </div>
  )
}
