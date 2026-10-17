import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { sfx } from '../../lib/sound'
import { ConfettiOverlay } from '../_juice/JuiceHud'
import { SAFE, UI } from './uiTokens'

/**
 * DOM HUD pieces shared by Fraction Forge and Cloud Keeper: the score counter,
 * round pips, a host speech bubble, the icon-led prompt pill, a soft-clock bar,
 * the walk hint and the end-of-run results card (score count-up, streak recap,
 * personal best).
 *
 * The look matches the soft-toon 2D UI kit (src/components/ui): cream paper,
 * the warm-dark #3a2c38 outline, pastel fills with ink text and a chunky
 * ledge. Colors are written as hex here (the kit's tokens: paper #fffaf0,
 * cream-100 #fdf3dc, line #3a2c38, quest/correct/wrong/ocean pastels), so the
 * HUD renders the same with or without them. Everything that floats over the
 * canvas is `pointer-events-none`, so a tap under it still reaches the ground
 * (tap-to-walk); only the results card takes clicks.
 */


/** Tween a number toward `value` (count-up), returning the shown value. */
function useCountUp(value: number, ms = 600, onTick?: () => void): number {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  const shownRef = useRef(value)
  const tickRef = useRef(onTick)
  useEffect(() => {
    tickRef.current = onTick
  }, [onTick])
  useEffect(() => {
    from.current = shownRef.current
    const start = performance.now()
    let raf = 0
    let lastTick = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms)
      const e = 1 - Math.pow(1 - k, 3)
      const v = Math.round(from.current + (value - from.current) * e)
      shownRef.current = v
      setShown(v)
      if (tickRef.current && now - lastTick > 70 && k < 1) {
        lastTick = now
        tickRef.current()
      }
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return shown
}

/** "⭐ 1240" with a count-up and a pop on every gain. */
export function ScorePill({ score }: { score: number }) {
  const shown = useCountUp(score)
  return (
    <motion.div
      key={score}
      initial={{ scale: score > 0 ? 1.25 : 1 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 14 }}
      className="kid-text pointer-events-none select-none rounded-full px-4 py-1 text-2xl font-bold tabular-nums"
      style={{ background: UI.quest, color: UI.line, border: `3px solid ${UI.line}`, boxShadow: UI.ledge }}
    >
      ⭐ {shown.toLocaleString()}
    </motion.div>
  )
}

/** Round pips; the finale pip is a crown. */
export function RoundPips({ total, current, done }: { total: number; current: number; done: number }) {
  return (
    <div className="flex items-center gap-1.5 pointer-events-none select-none">
      {Array.from({ length: total }, (_, i) => {
        const finale = i === total - 1 && total > 1
        const isDone = i < done
        const isNow = i === current && !isDone
        return (
          <span
            key={i}
            className={`flex items-center justify-center rounded-full transition-all ${finale ? 'w-7 h-7 text-sm' : 'w-4 h-4'} ${isNow ? 'scale-125' : ''}`}
            style={{
              background: isDone ? UI.quest : isNow ? UI.paper : 'rgba(255,250,240,.55)',
              border: `${isNow ? 3 : 2}px solid ${isDone || isNow ? UI.line : 'rgba(58,44,56,.35)'}`,
              boxShadow: isDone || isNow ? UI.ledgeSm : 'none',
            }}
          >
            {finale ? '👑' : ''}
          </span>
        )
      })}
    </div>
  )
}

/** A host speech bubble (face + a few words). */
export function SpeechBubble({ face, text, tone = 'plain' }: { face: string; text: string | null; tone?: 'plain' | 'good' | 'bad' }) {
  const bg = tone === 'good' ? UI.correctSoft : tone === 'bad' ? UI.wrongSoft : UI.paper
  return (
    <AnimatePresence mode="popLayout">
      {text && (
        <motion.div
          key={text}
          initial={{ scale: 0.6, opacity: 0, y: -8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 20 }}
          className="pointer-events-none select-none flex items-center gap-2 rounded-2xl px-3 py-1.5 max-w-[min(92vw,420px)]"
          style={{ background: bg, border: `3px solid ${UI.line}`, boxShadow: UI.ledge }}
        >
          <span className="text-3xl leading-none">{face}</span>
          <span className="kid-text text-lg sm:text-xl leading-tight" style={{ color: UI.line }}>
            {text}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** The bottom prompt: a few words + icons, plus the walk hint under it. */
export function PromptPill({ text, tone = 'plain', hint = '⌨️ WASD / 👆 tap to walk' }: { text: string; tone?: 'plain' | 'good' | 'bad'; hint?: string | null }) {
  const bg = tone === 'bad' ? UI.wrong : tone === 'good' ? UI.correct : UI.paper
  return (
    <div className="pointer-events-none select-none flex flex-col items-center gap-1.5">
      <motion.div
        key={text}
        initial={{ y: 12, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        className="kid-text text-xl sm:text-2xl text-center px-5 py-1.5 rounded-full max-w-[92vw]"
        style={{ background: bg, color: UI.line, border: `3px solid ${UI.line}`, boxShadow: UI.ledge }}
      >
        {text}
      </motion.div>
      {hint && (
        <div className="kid-text text-xs sm:text-sm px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,250,240,.8)', color: UI.line, border: `2px solid rgba(58,44,56,.35)` }}>
          {hint}
        </div>
      )}
    </div>
  )
}

/** A soft clock: fills down from 1 to 0, green → amber → red. Bonus only. */
export function SoftClock({ frac, icon, label }: { frac: number; icon: string; label?: string }) {
  const f = Math.max(0, Math.min(1, frac))
  const color = f > 0.5 ? UI.correctBtn : f > 0.2 ? UI.quest : UI.wrong
  return (
    <div className="pointer-events-none select-none flex items-center gap-2 rounded-full px-2.5 py-1" style={{ background: UI.paper, border: `3px solid ${UI.line}`, boxShadow: UI.ledgeSm }}>
      <span className="text-xl leading-none">{icon}</span>
      <div className="h-3.5 w-24 sm:w-32 overflow-hidden rounded-full" style={{ background: UI.cream, border: `2px solid ${UI.line}` }}>
        <div className="h-full rounded-full" style={{ width: `${f * 100}%`, background: color, transition: 'width .25s linear, background .4s' }} />
      </div>
      {label && (
        <span className="kid-text text-sm" style={{ color: UI.line }}>
          {label}
        </span>
      )}
    </div>
  )
}

export interface ResultLine {
  icon: string
  label: string
  value: string
}

/**
 * End-of-run card: the score counts up (ticking), stars pop in, the streak
 * recap and the personal best show, and "NEW BEST!" / "PERFECT!" get their
 * moment. Continue hands the result to the host (stars, coins, records); it
 * also continues on its own after `autoMs` (paused while `paused`) so a run
 * is never lost to a kid who wanders off.
 */
export function RunResults({
  title,
  face,
  score,
  stars,
  lines,
  bestScore,
  newBest,
  perfect,
  paused,
  onContinue,
  autoMs = 12000,
}: {
  title: string
  face: string
  score: number
  stars: number
  lines: ResultLine[]
  bestScore: number
  newBest: boolean
  perfect: boolean
  paused: boolean
  onContinue: () => void
  autoMs?: number
}) {
  const [target, setTarget] = useState(0)
  useEffect(() => {
    const id = window.setTimeout(() => setTarget(score), 450)
    return () => window.clearTimeout(id)
  }, [score])
  const shown = useCountUp(target, 1500, sfx.tick)
  const counted = target === score && shown === score
  const [left, setLeft] = useState(autoMs)
  const done = useRef(false)
  const go = useRef(onContinue)
  useEffect(() => {
    go.current = onContinue
  }, [onContinue])
  useEffect(() => {
    if (!counted) return
    if (newBest || perfect) sfx.fanfare()
    else sfx.sparkle()
  }, [counted, newBest, perfect])
  useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => {
      setLeft((l) => {
        const n = l - 100
        if (n <= 0 && !done.current) {
          done.current = true
          window.setTimeout(() => go.current(), 0)
        }
        return Math.max(0, n)
      })
    }, 100)
    return () => window.clearInterval(id)
  }, [paused])
  const finish = () => {
    if (done.current) return
    done.current = true
    sfx.click()
    go.current()
  }
  return (
    <div className={`absolute inset-0 z-40 flex items-center justify-center ${SAFE.pad}`} style={{ background: 'rgba(58,44,56,.28)' }}>
      <ConfettiOverlay show={counted && (newBest || perfect)} pieces={60} />
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -4 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        className="relative w-full max-w-sm rounded-3xl p-5 text-center"
        style={{ background: UI.paper, border: `3px solid ${UI.line}`, boxShadow: UI.pop }}
        data-testid="run-results"
      >
        <div className="text-5xl leading-none">{face}</div>
        <div className="kid-text mt-1 text-3xl" style={{ color: UI.line }}>
          {title}
        </div>
        <div
          className="kid-text my-2 text-6xl font-bold tabular-nums"
          style={{ color: UI.quest, WebkitTextStroke: `0.12em ${UI.line}`, paintOrder: 'stroke fill', textShadow: `0 0.07em 0 ${UI.line}` }}
        >
          {shown.toLocaleString()}
        </div>
        <div className="flex justify-center gap-1 text-4xl">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, rotate: -120 }}
              animate={counted ? { scale: 1, rotate: 0 } : { scale: 0 }}
              transition={{ delay: i * 0.18, type: 'spring', stiffness: 300, damping: 12 }}
              className={i < stars ? '' : 'opacity-25 grayscale'}
            >
              ⭐
            </motion.span>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <AnimatePresence>
            {counted && newBest && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                className="kid-text rounded-full px-3 py-0.5 text-lg"
                style={{ background: UI.quest, border: `3px solid ${UI.line}`, color: UI.line, boxShadow: UI.ledgeSm }}
              >
                🏅 NEW BEST!
              </motion.span>
            )}
            {counted && perfect && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ delay: 0.25 }}
                className="kid-text rounded-full px-3 py-0.5 text-lg"
                style={{ background: UI.monster, border: `3px solid ${UI.line}`, color: UI.line, boxShadow: UI.ledgeSm }}
              >
                💎 PERFECT!
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-1.5 text-left">
          {lines.map((l) => (
            <div key={l.label} className="kid-text flex items-center justify-between rounded-xl px-3 py-1 text-lg" style={{ color: UI.line, background: UI.cream, border: '2px solid rgba(58,44,56,.15)' }}>
              <span>
                {l.icon} {l.label}
              </span>
              <span className="font-bold">{l.value}</span>
            </div>
          ))}
          <div className="kid-text flex items-center justify-between rounded-xl px-3 py-1 text-lg" style={{ color: UI.line, background: UI.questSoft, border: '2px solid rgba(58,44,56,.15)' }}>
            <span>🏆 Best</span>
            <span className="font-bold">{Math.max(bestScore, score).toLocaleString()}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={finish}
          className="kid-text relative mt-4 w-full overflow-hidden rounded-[1.25rem] py-2.5 text-2xl transition-[translate,box-shadow] duration-100 hover:-translate-y-0.5 active:translate-y-1"
          style={{ background: UI.correctBtn, color: UI.line, border: `3px solid ${UI.line}`, boxShadow: UI.ledge }}
        >
          <span className="absolute inset-y-0 left-0" style={{ width: `${(1 - left / autoMs) * 100}%`, background: 'rgba(255,250,240,.45)' }} />
          <span className="relative">Collect ⭐ ▶</span>
        </button>
      </motion.div>
    </div>
  )
}
