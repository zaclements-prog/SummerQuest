import Card from './Card'
import Button from './Button'

interface ErrorStateProps {
  emoji?: string
  title: string
  message?: string
  back?: { label: string; to: string }
}

export default function ErrorState({
  emoji = '😵',
  title,
  message,
  back,
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center p-6">
      <Card tone="wrong" accent className="p-8 max-w-sm w-full text-center">
        <div className="text-6xl mb-4" aria-hidden="true">
          {emoji}
        </div>
        <h2 className="kid-text text-2xl text-ink-900 mb-2">{title}</h2>
        {message && <p className="text-ink-700 text-base mb-6">{message}</p>}
        {back && (
          <Button to={back.to} variant="ghost" className="w-full justify-center">
            ← {back.label}
          </Button>
        )}
      </Card>
    </div>
  )
}
