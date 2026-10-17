import type { ReactNode } from 'react'
import { TONES, type Tone } from './tones'

interface CardProps {
  tone?: Tone
  accent?: boolean
  className?: string
  children: ReactNode
  onClick?: () => void
}

/**
 * The toon card: cream paper, big soft corners, a subtle warm outline and a
 * chunky drop. `tone` tints the ledge under the card; `accent` adds the full
 * warm-dark outline (hero cards, results, anything you can tap).
 */
export default function Card({ tone, accent, className = '', children, onClick }: CardProps) {
  const t = tone ? TONES[tone] : null
  const outline = accent || onClick ? 'border-[3px] border-line' : 'border-2 border-line/15'
  const shadow = t ? t.ledge : 'shadow-card'

  const classes = [
    'bg-paper rounded-toon text-ink-900',
    outline,
    shadow,
    onClick
      ? 'cursor-pointer select-none transition-[translate,box-shadow] duration-100 ease-out hover:-translate-y-1 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (onClick) {
    return (
      <div
        className={classes}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
      >
        {children}
      </div>
    )
  }

  return <div className={classes}>{children}</div>
}
