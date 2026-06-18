interface StarRatingProps {
  earned: number
  total: number
  size?: 'sm' | 'md' | 'lg'
}

const sizeClass: Record<NonNullable<StarRatingProps['size']>, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
}

export default function StarRating({ earned, total, size = 'md' }: StarRatingProps) {
  const textSize = sizeClass[size]

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${textSize}`}
      aria-label={`${earned} of ${total} stars`}
      role="img"
    >
      {Array.from({ length: total }, (_, i) => {
        const isFilled = i < earned
        return (
          <span
            key={i}
            className={isFilled ? 'animate-pop animate-glow text-quest-400' : 'text-ink-500/40'}
            aria-hidden="true"
          >
            {isFilled ? '★' : '☆'}
          </span>
        )
      })}
    </span>
  )
}
