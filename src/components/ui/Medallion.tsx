import type { ReactNode } from 'react'
import { TONES, type Tone } from './tones'

interface MedallionProps {
  /** Usually an emoji. */
  children: ReactNode
  tone?: Tone | 'cream'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Rounded square instead of a circle. */
  square?: boolean
  className?: string
}

const sizeClass: Record<NonNullable<MedallionProps['size']>, string> = {
  sm: 'w-11 h-11 text-2xl border-2',
  md: 'w-14 h-14 text-3xl border-[3px]',
  lg: 'w-[4.5rem] h-[4.5rem] text-4xl border-[3px]',
  xl: 'w-24 h-24 text-5xl border-[3px]',
}

/**
 * A round toon token: an outlined pastel disc with an emoji in the middle and a
 * glossy highlight — the 2D stand-in for the World's outlined props. Used for
 * zone icons, stage kinds, stat icons and empty states.
 */
export default function Medallion({
  children,
  tone = 'cream',
  size = 'md',
  square = false,
  className = '',
}: MedallionProps) {
  const fill = tone === 'cream' ? 'bg-cream-100' : TONES[tone].fill
  return (
    <span
      className={[
        'relative inline-grid place-items-center shrink-0 border-line leading-none select-none',
        'shadow-ledge-sm',
        square ? 'rounded-2xl' : 'rounded-full',
        fill,
        sizeClass[size],
        className,
      ].join(' ')}
      aria-hidden="true"
    >
      <span
        className={`absolute left-[16%] top-[10%] w-[30%] h-[15%] bg-white/50 rounded-full -rotate-12`}
      />
      <span className="relative">{children}</span>
    </span>
  )
}
