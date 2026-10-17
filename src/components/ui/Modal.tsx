import type { ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface ModalProps {
  open: boolean
  /** Tapping the scrim calls this (omit to make the scrim inert). */
  onClose?: () => void
  label: string
  role?: 'dialog' | 'alertdialog'
  /** Width cap of the panel. */
  size?: 'sm' | 'md'
  children: ReactNode
}

/**
 * The shared modal shell: a soft plum scrim and a pop-in panel. Every dialog
 * (celebrations, confirms, badge details, the tower shop's math gate) uses it,
 * so they all enter, look and dismiss the same way.
 */
export default function Modal({
  open,
  onClose,
  label,
  role = 'dialog',
  size = 'sm',
  children,
}: ModalProps) {
  const reduced = useReducedMotion() ?? false

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink-900/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role={role}
            aria-modal="true"
            aria-label={label}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 24 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <div
              className={[
                'pointer-events-auto relative w-full max-h-full overflow-y-auto',
                'bg-paper text-ink-900 rounded-toon border-[3px] border-line shadow-pop [text-shadow:none]',
                size === 'sm' ? 'max-w-sm' : 'max-w-md',
              ].join(' ')}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
