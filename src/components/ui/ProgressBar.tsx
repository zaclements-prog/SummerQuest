import type { Subject } from '../../lib/theme'

type Tone = Subject | 'correct' | 'wrong'

interface ProgressBarProps {
  value: number
  max: number
  tone?: Tone
  label?: string
  className?: string
}

const toneFill: Record<Tone, string> = {
  quest: 'bg-quest-400',
  island: 'bg-island-500',
  ocean: 'bg-ocean-500',
  monster: 'bg-monster-500',
  correct: 'bg-correct-500',
  wrong: 'bg-wrong-500',
}

export default function ProgressBar({
  value,
  max,
  tone = 'quest',
  label,
  className = '',
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const fillClass = toneFill[tone]

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <div className="flex justify-between text-xs kid-text text-ink-700">
          <span>{label}</span>
          <span>
            {value}/{max}
          </span>
        </div>
      )}
      <div
        className="h-3 w-full rounded-full bg-ink-500/20 overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
