import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, Medallion } from './ui'
import { retryFailedLoads } from '../lib/lazyWithRetry'

/** The World: where "Back to the World" goes. */
const HUB = '/world'

/** A lazily loaded screen or game whose code couldn't be fetched (React.lazy rethrows it). */
function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Loading chunk/i.test(msg)
}

interface Props {
  /** The current path: a new screen gets a fresh try. */
  resetKey: string
  onHome: () => void
  onRestart: () => void
  children: ReactNode
}

interface State {
  failed: boolean
  /** It was code that failed to load (not a crash). */
  chunk: boolean
  /** The path the error happened on. */
  key: string
}

class Boundary extends Component<Props, State> {
  state: State = { failed: false, chunk: false, key: this.props.resetKey }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { failed: true, chunk: isChunkLoadError(error) }
  }

  // Moved on (Back to the World, the back button): try the new screen. Done
  // while rendering it, so the broken screen is never drawn again on the way
  // out (the router navigates in a transition, after the click's own render).
  // Pure: a transition can render this many times before it commits.
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey === state.key ? null : { failed: false, key: props.resetKey }
  }

  componentDidUpdate(prev: Props) {
    // The new screen is up: code that failed to load earlier gets a fresh
    // import next time. Only now, once per move, never while rendering: a
    // retry during a transition that hasn't committed would loop.
    if (prev.resetKey !== this.props.resetKey) retryFailedLoads()
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Console only: nothing is ever sent anywhere.
    const what = isChunkLoadError(error) ? 'a screen failed to load' : 'a screen crashed'
    console.error(`[app] ${what}`, error, info.componentStack)
  }

  goHome = () => {
    if (this.props.resetKey !== HUB) return this.props.onHome()
    // Already in the World. Its own code failed to load: Chromium (Fire's
    // WebView too) remembers a failed module until the page reloads, so only a
    // restart can bring it back. A crash just gets another try.
    if (this.state.chunk) return this.props.onRestart()
    this.setState({ failed: false })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <Oops onHome={this.goHome} onRestart={this.props.onRestart} />
  }
}

/** The friendly recovery screen. It stands in for the whole app, top bar included. */
function Oops({ onHome, onRestart }: { onHome: () => void; onRestart: () => void }) {
  return (
    <div role="alert" className="min-h-app flex items-center justify-center p-4 sm:p-6 px-safe">
      <Card tone="quest" accent className="p-7 sm:p-8 max-w-md w-full text-center flex flex-col items-center">
        <Medallion tone="quest" size="xl" className="mb-4">
          🙈
        </Medallion>
        <h1 className="kid-text font-bold text-3xl text-ink-900 mb-2 leading-tight">Oops! Let's try that again</h1>
        <p className="kid-text text-lg text-ink-700 mb-6">
          Something got stuck. Your stars and coins are safe.
        </p>
        <div className="w-full flex flex-col gap-3">
          <Button variant="primary" size="lg" onClick={onHome} className="w-full justify-center">
            🌴 Back to the World
          </Button>
          <Button variant="ghost" size="md" onClick={onRestart} className="w-full justify-center">
            🔄 Restart
          </Button>
        </div>
      </Card>
    </div>
  )
}

/**
 * The app's last line of defence, around the routed app (src/App.tsx):
 * anything a screen throws while drawing, including a lazily loaded screen or
 * mini-game whose code couldn't be fetched, lands on a kid-friendly "Oops!"
 * card instead of a blank page. "Back to the World" clears it and goes to the
 * hub; "Restart" reloads the app. Errors are logged to the console only.
 * (The 3D canvases have their own boundary in src/platform/gl/GLCanvas.tsx.)
 */
export default function AppErrorBoundary({
  children,
  reload = () => window.location.reload(),
}: {
  children: ReactNode
  /** Restart (tests pass their own). */
  reload?: () => void
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  return (
    <Boundary resetKey={pathname} onHome={() => navigate(HUB)} onRestart={reload}>
      {children}
    </Boundary>
  )
}
