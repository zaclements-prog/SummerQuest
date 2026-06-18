import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { sfx } from '../../lib/sound'
import { hoverPop, tap } from '../../lib/motion'

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'
export type ButtonSize = 'md' | 'lg'

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  to?: string
  onClick?: () => void
  disabled?: boolean
  className?: string
  children: ReactNode
  type?: 'button' | 'submit' | 'reset'
}

// AA-safe: fills are -600/-700 with light text, or -400 with dark text
const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-quest-400 text-quest-900',
    'shadow-[0_5px_0_0_theme(colors.quest.600)]',
    'hover:bg-quest-300 active:shadow-[0_2px_0_0_theme(colors.quest.600)] active:translate-y-[3px]',
    'focus-visible:ring-4 focus-visible:ring-quest-500 focus-visible:ring-offset-2',
  ].join(' '),
  secondary: [
    'bg-island-500 text-white',
    'shadow-[0_5px_0_0_theme(colors.island.700)]',
    'hover:bg-island-400 active:shadow-[0_2px_0_0_theme(colors.island.700)] active:translate-y-[3px]',
    'focus-visible:ring-4 focus-visible:ring-island-600 focus-visible:ring-offset-2',
  ].join(' '),
  success: [
    'bg-correct-600 text-white',
    'shadow-[0_5px_0_0_theme(colors.correct.700)]',
    'hover:bg-correct-500 active:shadow-[0_2px_0_0_theme(colors.correct.700)] active:translate-y-[3px]',
    'focus-visible:ring-4 focus-visible:ring-correct-600 focus-visible:ring-offset-2',
  ].join(' '),
  danger: [
    'bg-wrong-600 text-white',
    'shadow-[0_5px_0_0_theme(colors.wrong.700)]',
    'hover:bg-wrong-500 active:shadow-[0_2px_0_0_theme(colors.wrong.700)] active:translate-y-[3px]',
    'focus-visible:ring-4 focus-visible:ring-wrong-600 focus-visible:ring-offset-2',
  ].join(' '),
  ghost: [
    'bg-transparent text-ink-900',
    'shadow-none border-2 border-ink-700/30',
    'hover:bg-ink-900/8 active:bg-ink-900/12',
    'focus-visible:ring-4 focus-visible:ring-ink-700 focus-visible:ring-offset-2',
  ].join(' '),
}

const sizeClasses: Record<ButtonSize, string> = {
  md: 'px-5 py-2.5 text-lg min-h-[44px]',
  lg: 'px-7 py-3.5 text-xl min-h-[52px]',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  to,
  onClick,
  disabled = false,
  className = '',
  children,
  type = 'button',
}: ButtonProps) {
  function handleClick() {
    sfx.click()
    onClick?.()
  }

  const baseClasses = [
    'kid-text rounded-2xl font-semibold',
    'inline-flex items-center justify-center gap-2',
    'transition-[transform,box-shadow,background-color] duration-100',
    'outline-none select-none',
    variantClasses[variant],
    sizeClasses[size],
    disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (to && !disabled) {
    return (
      <motion.div
        whileHover={hoverPop}
        whileTap={tap}
        className="inline-flex"
        onClick={handleClick}
      >
        <Link to={to} className={baseClasses}>
          {children}
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      whileHover={disabled ? undefined : hoverPop}
      whileTap={disabled ? undefined : tap}
      className={baseClasses}
    >
      {children}
    </motion.button>
  )
}
