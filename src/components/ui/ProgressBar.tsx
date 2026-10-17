import type { Tone } from './tones'
import { TONES } from './tones'

interface ProgressBarProps {
  value: number
  max: number
  tone?: Tone
  label?: string
  className?: string
}

/**
 * A chunky toon progress bar: an outlined cream track with a glossy pastel
 * fill (a light highlight stripe along its top, like the toon shading bands).
 */
export default function ProgressBar({
  value,
  max,
  tone = 'quest',
  label,
  className = '',
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const fillClass = TONES[tone].bar

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <div className="flex justify-between gap-3 text-sm kid-text text-ink-700">
          <span>{label}</span>
          <span className="tabular-nums">
            {value}/{max}
          </span>
        </div>
      )}
      <div
        className="h-4 w-full rounded-full bg-cream-200 border-2 border-line overflow-hidden shadow-[inset_0_2px_0_rgb(58_44_56/0.12)]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={[
            'relative h-full rounded-full transition-[width] duration-500 ease-out',
            pct > 0 && pct < 100 ? 'border-r-2 border-line' : '',
            fillClass,
          ].join(' ')}
          style={{ width: `${pct}%` }}
        >
          <span className="absolute left-1.5 right-1.5 top-[3px] h-[3px] rounded-full bg-white/55" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
