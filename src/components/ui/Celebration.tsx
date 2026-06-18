import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Card from './Card'
import Button from './Button'
import { containerStagger, riseItem } from '../../lib/motion'

interface CelebrationProps {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  coins?: number
  stars?: number
}

// Simple confetti-style emoji bursts — no dependency needed
const BURST_EMOJIS = ['🎉', '⭐', '✨', '🌟', '🎊', '💫']

function ConfettiBurst({ reduced }: { reduced: boolean }) {
  if (reduced) return null
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl" aria-hidden="true">
      {BURST_EMOJIS.map((emoji, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl"
          initial={{ opacity: 0, scale: 0, x: '50%', y: '50%' }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.4, 0.8],
            x: `${30 + (i % 3) * 20}%`,
            y: `${10 + Math.floor(i / 3) * 35}%`,
          }}
          transition={{ delay: i * 0.08, duration: 0.9, ease: 'easeOut' }}
        >
          {emoji}
        </motion.span>
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
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim */}
          <motion.div
            className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 32 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 32 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          >
            <Card className="relative p-8 w-full max-w-sm text-center overflow-hidden">
              <ConfettiBurst reduced={reduced} />

              <motion.div
                className="text-5xl mb-3"
                initial={reduced ? {} : { scale: 0 }}
                animate={reduced ? {} : { scale: [0, 1.3, 1] }}
                transition={{ delay: 0.1, duration: 0.4 }}
                aria-hidden="true"
              >
                🏆
              </motion.div>

              <h2 className="kid-text text-3xl text-ink-900 mb-4">{title}</h2>

              {/* Stars reveal */}
              {stars != null && stars > 0 && (
                <motion.div
                  className="flex justify-center gap-2 mb-4 text-4xl"
                  variants={containerStagger}
                  initial="hidden"
                  animate="show"
                  aria-label={`${stars} stars earned`}
                >
                  {Array.from({ length: stars }, (_, i) => (
                    <motion.span key={i} variants={riseItem} aria-hidden="true">
                      ⭐
                    </motion.span>
                  ))}
                </motion.div>
              )}

              {/* Coins reveal */}
              {coins != null && coins > 0 && (
                <motion.div
                  className="inline-flex items-center gap-2 bg-quest-400 text-quest-900 kid-text rounded-full px-5 py-2 text-xl mb-4"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <span aria-hidden="true">🪙</span>
                  <span>+{coins} coins</span>
                </motion.div>
              )}

              {children && <div className="text-ink-700 mb-6">{children}</div>}

              <div ref={buttonRef}>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center"
                  onClick={onClose}
                >
                  Awesome! 🎉
                </Button>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
