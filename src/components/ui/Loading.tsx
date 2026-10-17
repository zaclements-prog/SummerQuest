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
      <span className="relative grid place-items-center w-20 h-20" aria-hidden="true">
        <span className="absolute inset-0 rounded-full sunburst animate-spin-slow" />
        <span className="relative text-5xl animate-bob">🌞</span>
      </span>
      <p className="kid-text text-lg text-ink-700">{label}</p>
    </div>
  )
}
