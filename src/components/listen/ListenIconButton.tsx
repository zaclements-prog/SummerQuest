import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { sfx } from '../../lib/sound'

/**
 * A big round picture button for K–1 (voice-first) screens: no words on it,
 * just an icon, 64 px (72 on a roomy tablet) so a five-year-old's finger finds
 * it. The words are its `label` (screen readers, and a grown-up's long-press
 * tooltip). `guide` gives it a `data-guide` id so a tour can point at it.
 */
export function ListenIconButton({
  icon,
  label,
  to,
  onClick,
  guide,
  tone = 'paper',
  size = 'md',
  className = '',
  disabled = false,
}: {
  icon: ReactNode
  label: string
  to?: string
  onClick?: () => void
  guide?: string
  tone?: 'paper' | 'sun' | 'ocean' | 'go' | 'sleep'
  /** md: 64 px; lg: 88 px (the one thing to tap next). */
  size?: 'md' | 'lg'
  className?: string
  disabled?: boolean
}) {
  const fill = {
    paper: 'bg-paper hover:bg-cream-100',
    sun: 'bg-quest-400 hover:bg-quest-300',
    ocean: 'bg-ocean-300 hover:bg-ocean-200',
    go: 'bg-correct-400 hover:bg-correct-300',
    sleep: 'bg-cream-200 hover:bg-cream-100',
  }[tone]
  const cls = [
    'grid place-items-center shrink-0 rounded-full leading-none select-none [text-shadow:none]',
    size === 'lg' ? 'w-[88px] h-[88px] text-5xl roomy:w-24 roomy:h-24' : 'w-16 h-16 text-[2rem] roomy:w-[72px] roomy:h-[72px]',
    'border-[3px] border-line shadow-ledge transition-[translate,box-shadow,background-color] duration-100',
    'active:translate-y-[3px] active:shadow-ledge-sm disabled:opacity-60',
    'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2',
    fill,
    className,
  ].join(' ')
  const press = () => {
    sfx.click()
    onClick?.()
  }
  if (to && !disabled) {
    return (
      <Link to={to} onClick={press} aria-label={label} title={label} data-guide={guide} className={cls}>
        <span aria-hidden="true">{icon}</span>
      </Link>
    )
  }
  return (
    <button type="button" onClick={press} aria-label={label} title={label} data-guide={guide} disabled={disabled} className={cls}>
      <span aria-hidden="true">{icon}</span>
    </button>
  )
}
