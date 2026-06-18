interface LoadingProps {
  label?: string
}

export default function Loading({ label = 'Loading…' }: LoadingProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-12"
      role="status"
      aria-label={label}
    >
      <span className="text-5xl animate-bounce-soft" aria-hidden="true">
        🌞
      </span>
      <p className="text-sky kid-text text-lg">{label}</p>
    </div>
  )
}
