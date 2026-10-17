import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useKeyboardBox } from '../useViewport'

interface ModalProps {
  open: boolean
  /** Tapping the scrim or pressing Escape calls this (omit to make both inert). */
  onClose?: () => void
  label: string
  role?: 'dialog' | 'alertdialog'
  /** Width cap of the panel. */
  size?: 'sm' | 'md'
  children: ReactNode
}

/**
 * The shared modal shell: a soft plum scrim and a pop-in panel. Every dialog
 * (celebrations, confirms, badge details) uses it, so they all enter, look and
 * dismiss the same way: Escape, a tap on the scrim, or the dialog's own visible
 * button. The panel scrolls inside itself when it's taller than the screen
 * (a phone held sideways), and keeps clear of the notch / home indicator.
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
  // A field inside the dialog opened the on-screen keyboard: fit the dialog in
  // the strip above it (the panel scrolls inside itself if it has to).
  const kb = useKeyboardBox()
  const panelRef = useRef<HTMLDivElement>(null)
  // …and bring the field being typed in into view inside the (now shorter) panel.
  useEffect(() => {
    if (!kb.bottom) return
    const raf = requestAnimationFrame(() => {
      const el = document.activeElement
      if (el instanceof HTMLElement && panelRef.current?.contains(el)) el.scrollIntoView({ block: 'nearest' })
    })
    return () => cancelAnimationFrame(raf)
  }, [kb.top, kb.bottom])

  // Escape closes (keyboard parity with the scrim tap and the visible button).
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[max(1rem,var(--safe-top,env(safe-area-inset-top,0px)))] pb-[max(1rem,var(--safe-bottom,env(safe-area-inset-bottom,0px)))] sm:p-6 short:pt-[max(0.5rem,var(--safe-top,env(safe-area-inset-top,0px)))] short:pb-[max(0.5rem,var(--safe-bottom,env(safe-area-inset-bottom,0px)))] pointer-events-none"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 24 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={kb.bottom ? { top: kb.top, bottom: kb.bottom } : undefined}
          >
            <div
              ref={panelRef}
              className={[
                'pointer-events-auto relative w-full max-h-full overflow-y-auto overscroll-contain',
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
