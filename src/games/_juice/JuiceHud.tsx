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
