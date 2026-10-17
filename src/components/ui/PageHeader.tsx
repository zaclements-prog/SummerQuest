import { Link, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { sfx } from '../../lib/sound'

interface BackButtonProps {
  to?: string
  label?: string
  onClick?: () => void
}

const backClasses = [
  'kid-text text-ink-900 text-lg inline-flex items-center gap-2',
  'pl-2 pr-4 min-h-[48px] rounded-full',
  'bg-paper border-[3px] border-line shadow-ledge',
  'transition-[translate,box-shadow,background-color] duration-100 ease-out',
  'hover:bg-cream-100 hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-ledge-sm',
  'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
].join(' ')

function Arrow() {
  return (
    <span
      className="grid place-items-center w-8 h-8 rounded-full bg-quest-300 border-2 border-line text-base leading-none"
      aria-hidden="true"
    >
      ←
    </span>
  )
}

export function BackButton({ to, label = 'Back', onClick }: BackButtonProps) {
  const navigate = useNavigate()

  function handleClick() {
    sfx.click()
    if (onClick) {
      onClick()
    } else if (!to) {
      navigate(-1)
    }
  }

  if (to) {
    return (
      <div
        className="inline-flex"
        onClick={() => {
          sfx.click()
          onClick?.()
        }}
      >
        <Link to={to} className={backClasses}>
          <Arrow />
          <span>{label}</span>
        </Link>
      </div>
    )
  }

  return (
    <button type="button" onClick={handleClick} className={backClasses}>
      <Arrow />
      <span>{label}</span>
    </button>
  )
}

interface PageHeaderProps {
  title: string
  back?: { to?: string; label?: string; onClick?: () => void }
  right?: ReactNode
  className?: string
}

/** The one screen header: a back pill, a big ink title, an optional right slot. */
export default function PageHeader({ title, back, right, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 mb-5 ${className}`}>
      {back && <BackButton to={back.to} label={back.label} onClick={back.onClick} />}
      <h1 className="kid-text text-3xl sm:text-4xl flex-1 min-w-0 text-sky font-bold">{title}</h1>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  )
}
