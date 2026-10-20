import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { sfx } from '../../lib/sound'

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
  /** A `data-guide` id, so the guide can point at this button. */
  guide?: string
}

/*
 * The toon button: a pastel fill with ink text (AA on every fill), the warm
 * outline every toon shape wears, and a chunky dark ledge underneath. Hover
 * lifts it a hair; pressing sinks it onto its ledge. Pure CSS, so it stays fast.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-quest-400 hover:bg-quest-300',
  secondary: 'bg-ocean-300 hover:bg-ocean-200',
  success: 'bg-correct-400 hover:bg-correct-300',
  danger: 'bg-wrong-400 hover:bg-wrong-300',
  ghost: 'bg-paper hover:bg-cream-100',
}

const sizeClasses: Record<ButtonSize, string> = {
  md: 'px-5 py-2 text-lg min-h-[48px] rounded-2xl',
  lg: 'px-6 py-3 text-xl min-h-[56px] rounded-[1.25rem]',
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
  guide,
}: ButtonProps) {
  function handleClick() {
    sfx.click()
    onClick?.()
  }

  const baseClasses = [
    'kid-text text-ink-900 leading-tight',
    'inline-flex items-center justify-center gap-2 text-center',
    'border-[3px] border-line shadow-ledge',
    'transition-[translate,box-shadow,background-color] duration-100 ease-out',
    'outline-none select-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
    variantClasses[variant],
    sizeClasses[size],
    disabled
      ? 'opacity-50 cursor-not-allowed pointer-events-none'
      : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_var(--color-line)] active:translate-y-[3px] active:shadow-ledge-sm',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (to && !disabled) {
    // The link sits in a wrapper (it carries the click sound); let the wrapper
    // stretch too when the caller asks the button to fill its row.
    const wrap = /(^|\s)w-full(\s|$)/.test(className)
      ? 'flex w-full'
      : /(^|\s)flex-1(\s|$)/.test(className)
        ? 'flex flex-1'
        : 'inline-flex'
    return (
      <div className={wrap} onClick={handleClick}>
        <Link to={to} className={baseClasses} data-guide={guide}>
          {children}
        </Link>
      </div>
    )
  }

  return (
    <button type={type} disabled={disabled} onClick={handleClick} className={baseClasses} data-guide={guide}>
      {children}
    </button>
  )
}
