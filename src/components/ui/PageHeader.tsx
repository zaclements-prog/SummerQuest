import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { sfx } from '../../lib/sound'
import { hoverPop, tap } from '../../lib/motion'

interface BackButtonProps {
  to?: string
  label?: string
  onClick?: () => void
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

  const classes = [
    'kid-text text-sky inline-flex items-center gap-1.5',
    'px-4 py-2 min-h-[44px] rounded-full',
    'bg-ocean-900/70 backdrop-blur',
    'transition-colors duration-150',
    'hover:bg-ocean-900/85',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-400 focus-visible:ring-offset-2',
  ].join(' ')

  if (to) {
    return (
      <motion.div whileHover={hoverPop} whileTap={tap} className="inline-flex" onClick={sfx.click}>
        <Link to={to} className={classes}>
          <span aria-hidden="true">←</span>
          <span>{label}</span>
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.button whileHover={hoverPop} whileTap={tap} onClick={handleClick} className={classes}>
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </motion.button>
  )
}

interface PageHeaderProps {
  title: string
  back?: { to?: string; label?: string; onClick?: () => void }
  right?: ReactNode
  className?: string
}

export default function PageHeader({ title, back, right, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex items-center gap-3 mb-4 ${className}`}>
      {back && (
        <BackButton to={back.to} label={back.label} onClick={back.onClick} />
      )}
      <h1
        className={[
          'kid-text text-2xl sm:text-3xl flex-1',
          'text-sky drop-shadow-md',
          !back ? '' : '',
        ].join(' ')}
      >
        {title}
      </h1>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  )
}
