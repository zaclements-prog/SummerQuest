import type { ReactNode } from 'react'
import Medallion from './Medallion'
import { TONES, type Tone } from './tones'

interface StatTileProps {
  icon: string
  label: string
  value: ReactNode
  tone: Tone
  /** Extra line under the label (e.g. a "Great" pill). */
  footer?: ReactNode
  /** Override the value color (defaults to ink). */
  valueClass?: string
  className?: string
}

/** One big, friendly number: a tinted tile with an icon token, the value and a label. */
export default function StatTile({
  icon,
  label,
  value,
  tone,
  footer,
  valueClass = 'text-ink-900',
  className = '',
}: StatTileProps) {
  return (
    <div
      className={[
        'h-full rounded-[1.5rem] border-[3px] border-line px-3 pt-3 pb-3.5',
        'flex flex-col items-center justify-center gap-1 text-center',
        TONES[tone].soft,
        TONES[tone].ledge,
        className,
      ].join(' ')}
    >
      <Medallion tone={tone} size="sm">
        {icon}
      </Medallion>
      <div className={`kid-text font-bold text-4xl leading-none tabular-nums mt-1 ${valueClass}`}>{value}</div>
      <div className="kid-text text-sm text-ink-700">{label}</div>
      {footer}
    </div>
  )
}
