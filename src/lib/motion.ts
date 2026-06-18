import { useReducedMotion } from 'framer-motion'
import type { Variants, TargetAndTransition } from 'framer-motion'

// ── Stagger container ─────────────────────────────────────────────────────────

export const containerStagger: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

// ── Rise-in child item ────────────────────────────────────────────────────────

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 22 },
  },
}

// ── Reduced-motion fade-only variants ────────────────────────────────────────

const fadeContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const fadeItem: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
}

// ── Tap / hover presets ───────────────────────────────────────────────────────

export const tap: TargetAndTransition = { scale: 0.96 }
export const hoverPop: TargetAndTransition = { scale: 1.04 }

// ── useEntrance hook ──────────────────────────────────────────────────────────

interface EntranceVariants {
  container: Variants
  item: Variants
}

/**
 * Returns stagger+rise variants normally; degrades to a plain fade when
 * `prefers-reduced-motion` is set.
 */
export function useEntrance(): EntranceVariants {
  const reduced = useReducedMotion()
  if (reduced) {
    return { container: fadeContainer, item: fadeItem }
  }
  return { container: containerStagger, item: riseItem }
}
