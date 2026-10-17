import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import Button from './Button'
import Modal from './Modal'
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
    <Modal open={open} onClose={onCancel} label={title} role="alertdialog" size="md">
      <div className="p-6 sm:p-7 text-center">
        {emoji && (
          <div
            className="mx-auto mb-3 grid place-items-center w-20 h-20 rounded-full bg-cream-100 border-[3px] border-line text-4xl"
            aria-hidden="true"
          >
            {emoji}
          </div>
        )}
        <h2 className="kid-text font-bold text-2xl text-ink-900 mb-2 leading-tight">{title}</h2>
        {children && <div className="text-ink-700 text-base mb-5">{children}</div>}
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center">
          <div ref={cancelRef} className="flex sm:flex-1">
            <Button variant="ghost" size="md" className="flex-1 justify-center" onClick={onCancel}>
              {cancelLabel}
            </Button>
          </div>
          <Button
            variant={confirmVariant}
            size="md"
            className="justify-center sm:flex-1"
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
