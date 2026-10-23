import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'

/**
 * DOM-side juice for the 3D mini-games: a streak meter, a big kinetic banner
 * and a confetti overlay. Pair with `juice` (3D) and `sfx` (sound).
 */

/** "🔥 ×3" streak meter; pops each time the streak grows (hidden below 2). */
export function StreakMeter({ streak }: { streak: number }) {
  return (
    <AnimatePresence>
      {streak >= 2 && (
        <motion.div
          key={streak}
          initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 14 }}
          className="kid-text pointer-events-none select-none rounded-full px-4 py-1.5 text-2xl font-bold text-white shadow-lg"
          style={{ background: 'linear-gradient(180deg,#ffb54d,#f2766b)', border: '3px solid #3a2c38' }}
        >
          🔥 ×{streak}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** A big centered banner ("Boss round!", "Perfect!") that springs in; render with a changing `text` key. */
export function Banner({ text, color = '#ffcf4d' }: { text: string | null; color?: string }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={text}
          initial={{ scale: 0.3, y: 30, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
          exit={{ scale: 1.3, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 16 }}
          className="kid-text pointer-events-none absolute left-1/2 top-[28%] -translate-x-1/2 select-none whitespace-nowrap text-5xl font-bold"
          style={{ color, WebkitTextStroke: '3px #3a2c38', paintOrder: 'stroke fill', textShadow: '0 6px 0 rgba(58,44,56,.3)' }}
        >
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const COLORS = ['#ffcf4d', '#f2766b', '#8ab8ff', '#9fe6c8', '#f7a1c4', '#b79af0']

/** Full-screen falling confetti (CSS only). Mount while `show` is true. */
export function ConfettiOverlay({ show, pieces = 70 }: { show: boolean; pieces?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: (i * 137.5) % 100,
        delay: ((i * 53) % 100) / 100,
        dur: 1.8 + ((i * 29) % 100) / 80,
        rot: (i * 47) % 360,
        color: COLORS[i % COLORS.length],
        w: 8 + (i % 3) * 3,
      })),
    [pieces],
  )
  if (!show) return null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`@keyframes sq-confetti { 0% { transform: translateY(-10vh) rotate(0deg) } 100% { transform: translateY(110vh) rotate(720deg) } }`}</style>
      {bits.map((b, i) => (
        <span
          key={i}
          className="absolute top-0 block rounded-sm"
          style={{
            left: `${b.left}%`,
            width: b.w,
            height: b.w * 0.55,
            background: b.color,
            transform: `rotate(${b.rot}deg)`,
            animation: `sq-confetti ${b.dur}s ${b.delay}s cubic-bezier(.25,.6,.4,1) infinite`,
          }}
        />
      ))}
    </div>
  )
}

const BUBBLE_CSS = `
.sq-bubble{position:relative;white-space:nowrap;background:#fffaf0;color:#3a2c38;border:3px solid #3a2c38;border-radius:16px;padding:2px 10px;
  font-size:18px;box-shadow:0 3px 0 rgba(58,44,56,.3);animation:sqbub .35s cubic-bezier(.2,1.6,.4,1)}
.sq-bubble:after{content:'';position:absolute;left:50%;bottom:-9px;margin-left:-7px;border:7px solid transparent;border-top-color:#3a2c38;border-bottom:0}
@keyframes sqbub{from{transform:scale(.3);opacity:0}to{transform:scale(1);opacity:1}}
`

/**
 * A host character's speech bubble (one or two words + an icon). Render it
 * inside a drei <Html> over the character; it pops each time `text` changes.
 */
export function SpeechBubble({ text }: { text: string }) {
  return (
    <>
      <style>{BUBBLE_CSS}</style>
      <div key={text} className="sq-bubble kid-text">
        {text}
      </div>
    </>
  )
}

/**
 * Run score in a chunky chip; the number springs each time it changes. Its
 * icon is a target (🎯), not a star, so the score never reads as stars earned.
 */
export function ScoreChip({ score, best, pictureBest = false }: { score: number; best?: number; /** K–1: the best as 🏆 and its number, no word to read */ pictureBest?: boolean }) {
  return (
    <div
      className="kid-text pointer-events-none select-none flex items-center gap-2 rounded-2xl px-3 py-1 text-white shadow-lg"
      style={{ background: 'rgba(58,44,56,.72)', border: '3px solid rgba(255,255,255,.75)' }}
      aria-label={`Score ${score.toLocaleString()}`}
    >
      <span className="text-lg" aria-hidden="true">
        🎯
      </span>
      <motion.span
        key={score}
        initial={{ scale: 1.5, color: '#ffe58a' }}
        animate={{ scale: 1, color: '#ffffff' }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        className="text-2xl tabular-nums leading-none"
      >
        {score.toLocaleString()}
      </motion.span>
      {best != null && best > 0 && (
        <span className="text-xs opacity-75 leading-none" aria-label={pictureBest ? `best ${best.toLocaleString()}` : undefined}>
          {pictureBest ? '🏆' : 'best'} {best.toLocaleString()}
        </span>
      )}
    </div>
  )
}

/**
 * Round progress: one pip per round, the current one bigger, the last shown
 * as the finale's icon (e.g. 👑 / 💎). Done pips turn gold.
 */
export function RoundPips({ total, current, finaleIcon = '👑', done = false }: { total: number; current: number; finaleIcon?: string; done?: boolean }) {
  return (
    <div className="pointer-events-none select-none flex items-center gap-1.5" aria-label={`Round ${Math.min(current + 1, total)} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const finished = done || i < current
        const now = !done && i === current
        const finale = i === total - 1
        return finale ? (
          <span
            key={i}
            className={`grid place-items-center rounded-full border-2 border-white/90 shadow transition-all ${now ? 'w-8 h-8 text-lg' : 'w-6 h-6 text-sm'} ${finished ? 'bg-yellow-300' : now ? 'bg-rose-400' : 'bg-sky-900/35'}`}
          >
            {finaleIcon}
          </span>
        ) : (
          <span
            key={i}
            className={`rounded-full border-2 border-white/90 shadow transition-all ${now ? 'w-5 h-5' : 'w-3.5 h-3.5'} ${finished ? 'bg-yellow-300' : now ? 'bg-white' : 'bg-sky-900/35'}`}
          />
        )
      })}
    </div>
  )
}
