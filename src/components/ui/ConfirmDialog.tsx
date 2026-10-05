import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Card from './Card'
import Button from './Button'
import type { ButtonVariant } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  emoji?: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  confirmVariant?: ButtonVariant
  /** Disable the confirm button (e.g. until a grown-up check is answered). */
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A plain yes/no modal for decisions (quit, reset…). Unlike `Celebration` it has
 * no confetti or trophy, and the safe choice (cancel) gets the initial focus;
 * Escape or tapping the scrim also cancels.
 */
export default function ConfirmDialog({
  open,
  title,
  emoji,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const reduced = useReducedMotion() ?? false
  const cancelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => cancelRef.current?.querySelector('button')?.focus(), 200)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            aria-hidden="true"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 16 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <Card className="pointer-events-auto p-7 w-full max-w-sm text-center [text-shadow:none]">
              {emoji && (
                <div className="text-5xl mb-2" aria-hidden="true">
                  {emoji}
                </div>
              )}
              <h2 className="kid-text text-2xl text-ink-900 mb-3">{title}</h2>
              {children && <div className="text-ink-700 mb-5">{children}</div>}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <div ref={cancelRef} className="flex">
                  <Button variant="ghost" size="md" className="flex-1 justify-center" onClick={onCancel}>
                    {cancelLabel}
                  </Button>
                </div>
                <Button
                  variant={confirmVariant}
                  size="md"
                  className="justify-center"
                  disabled={confirmDisabled}
                  onClick={onConfirm}
                >
                  {confirmLabel}
                </Button>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
