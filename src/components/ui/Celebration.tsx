import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Button from './Button'
import Modal from './Modal'
import { ToonStar } from './StarRating'
import { containerStagger, riseItem } from '../../lib/motion'

interface CelebrationProps {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  coins?: number
  stars?: number
}

// Toon confetti: outlined pastel bits that pop out from behind the trophy.
const CONFETTI = [
  { c: '#ffcf4d', x: -120, y: -70, r: -30, s: 'rounded-full' },
  { c: '#f7a1c4', x: 118, y: -84, r: 25, s: 'rounded-[3px]' },
  { c: '#8edb7c', x: -96, y: 30, r: 40, s: 'rounded-[3px]' },
  { c: '#9fd3ff', x: 104, y: 24, r: -20, s: 'rounded-full' },
  { c: '#cdb8f5', x: -40, y: -112, r: 60, s: 'rounded-[3px]' },
  { c: '#ff9f80', x: 48, y: -118, r: -45, s: 'rounded-full' },
  { c: '#9fe6c8', x: -140, y: -18, r: 15, s: 'rounded-full' },
  { c: '#ffd95e', x: 146, y: -24, r: 80, s: 'rounded-[3px]' },
]

function ConfettiBurst({ reduced }: { reduced: boolean }) {
  if (reduced) return null
  return (
    <div className="absolute left-1/2 top-16 pointer-events-none" aria-hidden="true">
      {CONFETTI.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute w-3.5 h-3.5 border-2 border-line ${p.s}`}
          style={{ background: p.c }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.3, rotate: 0 }}
          animate={{ opacity: [0, 1, 1, 0], x: p.x, y: [0, p.y, p.y + 40], scale: 1, rotate: p.r * 3 }}
          transition={{ delay: 0.08 + i * 0.03, duration: 1.1, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

export default function Celebration({
  open,
  onClose,
  title,
  children,
  coins,
  stars,
}: CelebrationProps) {
  const reduced = useReducedMotion() ?? false
  const buttonRef = useRef<HTMLDivElement>(null)

  // Auto-focus the close button when opened for keyboard/a11y
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        buttonRef.current?.querySelector('button')?.focus()
      }, 300)
      return () => clearTimeout(t)
    }
  }, [open])

  return (
    <Modal open={open} onClose={onClose} label={title}>
      <div className="relative px-6 pb-7 pt-6 text-center overflow-hidden rounded-toon">
        {/* sunny wash + rays behind the trophy */}
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-quest-100 to-transparent" aria-hidden="true" />
        <div
          className="absolute left-1/2 top-[3.25rem] -translate-x-1/2 -translate-y-1/2 w-72 h-72 sunburst animate-spin-slow"
          aria-hidden="true"
        />
        <ConfettiBurst reduced={reduced} />

        <motion.div
          className="relative mx-auto mb-3 grid place-items-center w-24 h-24 rounded-full bg-quest-300 border-[3px] border-line shadow-ledge text-5xl"
          initial={reduced ? {} : { scale: 0, rotate: -20 }}
          animate={reduced ? {} : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.05 }}
          aria-hidden="true"
        >
          🏆
        </motion.div>

        <h2 className="relative kid-text font-bold text-3xl text-ink-900 mb-3 leading-tight">{title}</h2>

        {/* Stars reveal */}
        {stars != null && stars > 0 && (
          <motion.div
            className="relative flex justify-center gap-1.5 mb-4"
            variants={containerStagger}
            initial="hidden"
            animate="show"
            role="img"
            aria-label={`${stars} stars earned`}
          >
            {Array.from({ length: stars }, (_, i) => (
              <motion.span key={i} variants={riseItem} aria-hidden="true">
                <ToonStar filled px={46} />
              </motion.span>
            ))}
          </motion.div>
        )}

        {/* Coins reveal */}
        {coins != null && coins > 0 && (
          <motion.div
            className="relative inline-flex items-center gap-2 bg-quest-300 text-ink-900 kid-text rounded-full border-2 border-line px-5 py-1.5 text-xl mb-4"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span aria-hidden="true">🪙</span>
            <span>+{coins} coins</span>
          </motion.div>
        )}

        {children && <div className="relative text-ink-700 text-lg mb-5">{children}</div>}

        <div ref={buttonRef} className="relative">
          <Button variant="primary" size="lg" className="w-full justify-center" onClick={onClose}>
            Awesome! 🎉
          </Button>
        </div>
      </div>
    </Modal>
  )
}
