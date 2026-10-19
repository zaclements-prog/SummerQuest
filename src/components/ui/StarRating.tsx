interface StarRatingProps {
  earned: number
  total: number
  size?: 'sm' | 'md' | 'lg'
}

const sizePx: Record<NonNullable<StarRatingProps['size']>, number> = {
  sm: 20,
  md: 28,
  lg: 44,
}

// A chubby five-point star (rounded joins do the rest), in a 24×24 box.
const STAR_PATH =
  'M12 2.6l2.75 5.72 6.27.84-4.58 4.36 1.14 6.22L12 16.74l-5.58 3 1.14-6.22-4.58-4.36 6.27-.84z'

/** One toon star: gold with the warm outline, or an empty cream socket. */
export function ToonStar({
  filled,
  px = 28,
  className = '',
}: {
  filled: boolean
  px?: number
  className?: string
}) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path
        d={STAR_PATH}
        fill={filled ? '#ffcf4d' : '#f6e6c4'}
        stroke={filled ? '#3a2c38' : 'rgb(58 44 56 / 0.35)'}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
      {filled && (
        <path d="M9.2 9.4l1.6-.25" stroke="#fff6cf" strokeWidth={1.6} strokeLinecap="round" />
      )}
    </svg>
  )
}

export default function StarRating({ earned, total, size = 'md' }: StarRatingProps) {
  const px = sizePx[size]

  return (
    <span
      className="inline-flex flex-wrap items-center gap-0.5 align-middle max-w-full"
      aria-label={`${earned} of ${total} stars`}
      role="img"
    >
      {Array.from({ length: total }, (_, i) => (
        <ToonStar key={i} filled={i < earned} px={px} className={i < earned ? 'animate-pop' : ''} />
      ))}
    </span>
  )
}
