import type { ReactNode } from 'react'

/** Crisp inline icons for the lesson player (currentColor, 24×24 grid). */

type P = { className?: string; size?: number }

const svg = (size: number, className: string | undefined, body: ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
    {body}
  </svg>
)

export const PlayIcon = ({ className, size = 24 }: P) => svg(size, className, <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor" />)

export const PauseIcon = ({ className, size = 24 }: P) =>
  svg(
    size,
    className,
    <>
      <rect x="6" y="5" width="4.2" height="14" rx="1.6" fill="currentColor" />
      <rect x="13.8" y="5" width="4.2" height="14" rx="1.6" fill="currentColor" />
    </>,
  )

export const ReplayIcon = ({ className, size = 24 }: P) =>
  svg(
    size,
    className,
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M4 3.8v4.6h4.6" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </>,
  )

export const SpeakerIcon = ({ className, size = 24 }: P) =>
  svg(
    size,
    className,
    <>
      <path d="M4 9.5h3.2L12 5.6v12.8l-4.8-3.9H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" fill="currentColor" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>,
  )

export const CheckIcon = ({ className, size = 24 }: P) => svg(size, className, <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />)

export const CrossIcon = ({ className, size = 24 }: P) => svg(size, className, <path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />)

export const ArrowRightIcon = ({ className, size = 24 }: P) => svg(size, className, <path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)

export const ArrowLeftIcon = ({ className, size = 24 }: P) => svg(size, className, <path d="M19 12H6M11 6.5 5.5 12l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)

export const StarIcon = ({ className, size = 24 }: P) => svg(size, className, <path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z" fill="currentColor" stroke="#3a2c38" strokeWidth="1.6" strokeLinejoin="round" />)

export const BulbIcon = ({ className, size = 24 }: P) =>
  svg(
    size,
    className,
    <>
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V17h5.2v-1.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" fill="#ffcf4d" stroke="#3a2c38" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9.6 19.5h4.8M10.4 21.6h3.2" stroke="#3a2c38" strokeWidth="1.8" strokeLinecap="round" />
    </>,
  )
