import type { ReactNode } from 'react'

type PillTone = 'quest' | 'island' | 'ocean' | 'monster' | 'correct' | 'wrong' | 'ink'

interface PillProps {
  tone?: PillTone
  icon?: ReactNode
  children: ReactNode
  className?: string
}

const toneBg: Record<PillTone, string> = {
  quest: 'bg-quest-400 text-quest-900',
  island: 'bg-island-500 text-white',
  ocean: 'bg-ocean-600 text-white',
  monster: 'bg-monster-600 text-white',
  correct: 'bg-correct-600 text-white',
  wrong: 'bg-wrong-600 text-white',
  ink: 'bg-ink-700 text-white',
}

export default function Pill({ tone = 'quest', icon, children, className = '' }: PillProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1',
        'rounded-full px-3 py-0.5',
        'text-sm font-semibold kid-text',
        toneBg[tone],
        className,
      ].join(' ')}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  )
}
