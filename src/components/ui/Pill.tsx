import type { ReactNode } from 'react'

type PillTone = 'quest' | 'island' | 'ocean' | 'monster' | 'correct' | 'wrong' | 'ink'

interface PillProps {
  tone?: PillTone
  icon?: ReactNode
  children: ReactNode
  className?: string
}

// Pastel chips with ink text (AA on all), outlined like every toon shape.
const toneBg: Record<PillTone, string> = {
  quest: 'bg-quest-300 text-ink-900',
  island: 'bg-island-300 text-ink-900',
  ocean: 'bg-ocean-300 text-ink-900',
  monster: 'bg-monster-300 text-ink-900',
  correct: 'bg-correct-400 text-ink-900',
  wrong: 'bg-wrong-400 text-ink-900',
  ink: 'bg-paper text-ink-900',
}

export default function Pill({ tone = 'quest', icon, children, className = '' }: PillProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 whitespace-nowrap',
        'rounded-full px-3 py-0.5 border-2 border-line',
        'text-sm leading-6 kid-text',
        toneBg[tone],
        className,
      ].join(' ')}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  )
}
