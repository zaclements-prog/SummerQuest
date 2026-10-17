import type { ReactNode } from 'react'
import { BackButton } from './PageHeader'

interface TopBarProps {
  back: { label: string; to?: string; onClick?: () => void }
  title: ReactNode
  /** An emoji shown in a token at the start of the title plate. */
  icon?: string
  right?: ReactNode
}

/**
 * The play-screen chrome: a back/quit pill on the left and the title on a
 * centered cream sign, balanced by an equal-width slot on the right.
 */
export default function TopBar({ back, title, icon, right }: TopBarProps) {
  return (
    <div className="px-3 sm:px-4 pt-3 pb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
      <div className="justify-self-start">
        <BackButton to={back.to} label={back.label} onClick={back.onClick} />
      </div>
      <h1
        className={[
          'kid-text font-bold text-lg sm:text-2xl text-ink-900 text-center min-w-0',
          'inline-flex items-center gap-2 max-w-[56vw] sm:max-w-none',
          'bg-paper border-[3px] border-line rounded-full shadow-ledge-sm pr-4 sm:pr-5 py-1',
          icon ? 'pl-1.5' : 'pl-4 sm:pl-5',
        ].join(' ')}
      >
        {icon && (
          <span
            className="grid place-items-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-quest-300 border-2 border-line text-xl sm:text-2xl leading-none shrink-0"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <span className="truncate">{title}</span>
      </h1>
      <div className="justify-self-end">{right}</div>
    </div>
  )
}
