import Card from './Card'
import Button from './Button'

interface EmptyStateProps {
  emoji: string
  title: string
  message?: string
  cta?: { label: string; to: string }
}

export default function EmptyState({ emoji, title, message, cta }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center p-6">
      <Card className="p-8 max-w-sm w-full text-center">
        <div className="text-6xl mb-4" aria-hidden="true">
          {emoji}
        </div>
        <h2 className="kid-text text-2xl text-ink-900 mb-2">{title}</h2>
        {message && <p className="text-ink-700 text-base mb-6">{message}</p>}
        {cta && (
          <Button to={cta.to} variant="primary" className="w-full justify-center">
            {cta.label}
          </Button>
        )}
      </Card>
    </div>
  )
}
