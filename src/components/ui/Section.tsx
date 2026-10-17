import type { ReactNode } from 'react'

const widthClass = {
  sm: 'max-w-xl',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-7xl',
} as const

/** The standard 2D page frame: comfy gutters, a centered column, one rhythm. */
export function Page({
  children,
  width = 'lg',
  className = '',
}: {
  children: ReactNode
  width?: keyof typeof widthClass
  className?: string
}) {
  return (
    <div className="flex-1 flex flex-col px-4 pt-5 pb-10 sm:px-6 sm:pt-6">
      <div className={`${widthClass[width]} w-full mx-auto flex flex-col gap-5 ${className}`}>
        {children}
      </div>
    </div>
  )
}

/** A section heading that sits on the sky between cards. */
export function SectionTitle({
  icon,
  children,
  right,
  className = '',
}: {
  icon?: ReactNode
  children: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <h2 className="kid-text font-bold text-2xl text-sky flex items-center gap-2">
        {icon && (
          <span className="text-2xl" aria-hidden="true">
            {icon}
          </span>
        )}
        {children}
      </h2>
      {right}
    </div>
  )
}
