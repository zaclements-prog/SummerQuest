import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  tone?: 'quest' | 'island' | 'ocean' | 'monster' | 'correct' | 'wrong'
  accent?: boolean
  className?: string
  children: ReactNode
  onClick?: () => void
}

const toneAccentClass: Record<NonNullable<CardProps['tone']>, string> = {
  quest: 'border-quest-400',
  island: 'border-island-500',
  ocean: 'border-ocean-500',
  monster: 'border-monster-500',
  correct: 'border-correct-500',
  wrong: 'border-wrong-500',
}

const toneShadowClass: Record<NonNullable<CardProps['tone']>, string> = {
  quest: 'shadow-[0_6px_0_0_theme(colors.quest.400),0_10px_24px_-4px_rgba(0,0,0,0.15)]',
  island: 'shadow-[0_6px_0_0_theme(colors.island.500),0_10px_24px_-4px_rgba(0,0,0,0.15)]',
  ocean: 'shadow-[0_6px_0_0_theme(colors.ocean.500),0_10px_24px_-4px_rgba(0,0,0,0.15)]',
  monster: 'shadow-[0_6px_0_0_theme(colors.monster.500),0_10px_24px_-4px_rgba(0,0,0,0.15)]',
  correct: 'shadow-[0_6px_0_0_theme(colors.correct.500),0_10px_24px_-4px_rgba(0,0,0,0.15)]',
  wrong: 'shadow-[0_6px_0_0_theme(colors.wrong.500),0_10px_24px_-4px_rgba(0,0,0,0.15)]',
}

export default function Card({ tone, accent, className = '', children, onClick }: CardProps) {
  const baseShadow = 'shadow-[0_6px_0_0_rgba(0,0,0,0.12),0_10px_24px_-4px_rgba(0,0,0,0.12)]'
  const shadowClass = tone ? toneShadowClass[tone] : baseShadow
  const borderClass = accent && tone ? `border-4 ${toneAccentClass[tone]}` : ''

  const classes = [
    'bg-paper rounded-3xl',
    borderClass,
    shadowClass,
    onClick ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (onClick) {
    return (
      <motion.div
        className={classes}
        onClick={onClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {children}
      </motion.div>
    )
  }

  return <div className={classes}>{children}</div>
}
