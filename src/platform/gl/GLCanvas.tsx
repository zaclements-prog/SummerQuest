import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import type { CanvasProps, RootState } from '@react-three/fiber'
import { RECOVERY, mayAutoRecover, pruneRecoveries } from './recovery'
import { releaseGpuResources } from './release'

type Status = 'ok' | 'lost' | 'failed'

/**
 * The app's one way to put a react-three-fiber <Canvas> on screen (World, Home
 * and its model studio, every 3D game). Same props as <Canvas>, plus:
 *
 * - **Context loss** (iOS/Android drop WebGL under memory pressure or in the
 *   background): a friendly "tap to continue" card covers the black canvas and
 *   the canvas remounts cleanly when the context comes back, after a short wait
 *   while visible, or on a tap (see `recovery.ts`). If the canvas can't start
 *   at all (no WebGL, a crash inside the scene) the same card offers a retry
 *   instead of a blank screen.
 * - **Lifecycle**: while the page is hidden the render loop stops; on return the
 *   clock resumes where it stopped (no giant frame delta, no jump in animations).
 * - **Memory**: on unmount the scene's geometries, materials and textures — and
 *   the toon kit's shared caches — are released from the renderer before the
 *   next canvas starts, so route changes don't pile up GPU memory or dead
 *   renderers (see `release.ts`).
 * - Dev builds expose the live renderer and scene as `window.__sqGl` /
 *   `window.__sqScene` for headless draw-call and memory checks.
 */
export default function GLCanvas({ children, onCreated, ...props }: CanvasProps) {
  // `gen` re-keys the canvas: a new generation is a fresh WebGL context.
  const [gen, setGen] = useState(0)
  const [status, setStatus] = useState<Status>('ok')
  const rootRef = useRef<RootState | null>(null)
  const autoRef = useRef<number[]>([])

  /** Stop the current root and release what it uploaded (it is about to be torn down). */
  const release = useCallback(() => {
    const state = rootRef.current
    rootRef.current = null
    if (!state) return
    state.get().internal.active = false
    releaseGpuResources(state.scene)
  }, [])

  const remount = useCallback(
    (auto: boolean) => {
      const now = Date.now()
      if (auto) {
        const recent = pruneRecoveries(autoRef.current, now)
        autoRef.current = recent
        if (!mayAutoRecover(recent, now)) return
        autoRef.current = [...recent, now]
      }
      release()
      setGen((g) => g + 1)
      setStatus('ok')
    },
    [release],
  )

  const handleCreated = useCallback(
    (state: RootState) => {
      rootRef.current = state
      if (import.meta.env.DEV) Object.assign(window, { __sqGl: state.gl, __sqScene: state.scene })
      onCreated?.(state)
    },
    [onCreated],
  )

  // Layout cleanup: runs before R3F begins tearing its root down (and before the
  // next route's canvas uploads anything), while the scene graph is still intact.
  useLayoutEffect(() => release, [release])

  // Lost: remount after a short wait whenever the page is visible (or sooner on
  // `webglcontextrestored` / a tap).
  useEffect(() => {
    if (status !== 'lost') return
    let timer: number | undefined
    const arm = () => {
      window.clearTimeout(timer)
      if (!document.hidden) timer = window.setTimeout(() => remount(true), RECOVERY.autoAfterMs)
    }
    arm()
    document.addEventListener('visibilitychange', arm)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', arm)
    }
  }, [status, remount])

  const onLost = useCallback(() => setStatus((s) => (s === 'failed' ? s : 'lost')), [])
  const onRestored = useCallback(() => {
    if (!document.hidden) remount(true)
  }, [remount])
  const onFailed = useCallback(() => setStatus('failed'), [])

  return (
    <>
      <CanvasBoundary key={gen} onError={onFailed}>
        <Canvas {...props} onCreated={handleCreated}>
          <ContextWatch onLost={onLost} onRestored={onRestored} />
          <PauseWhenHidden />
          {children}
        </Canvas>
      </CanvasBoundary>
      {status !== 'ok' && <GlOverlay failed={status === 'failed'} onContinue={() => remount(false)} />}
    </>
  )
}

/** Listens for the browser dropping / restoring this canvas's WebGL context. */
function ContextWatch({ onLost, onRestored }: { onLost: () => void; onRestored: () => void }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    const lost = (e: Event) => {
      // Without preventDefault the browser never offers the context back.
      e.preventDefault()
      onLost()
    }
    el.addEventListener('webglcontextlost', lost)
    el.addEventListener('webglcontextrestored', onRestored)
    // (Removed before R3F's own unmount force-loses the context, so that isn't mistaken for a crash.)
    return () => {
      el.removeEventListener('webglcontextlost', lost)
      el.removeEventListener('webglcontextrestored', onRestored)
    }
  }, [gl, onLost, onRestored])
  return null
}

/**
 * Stops this canvas's render loop while the page is hidden, and resumes the
 * clock exactly where it stopped: no catch-up frame spanning the whole absence
 * (golems teleporting, particles vanishing) and `clock.elapsedTime`-based
 * timers carry on as if no time passed.
 */
function PauseWhenHidden() {
  const get = useThree((s) => s.get)
  useEffect(() => {
    let frozenAt: number | null = null
    const apply = () => {
      const s = get()
      if (document.hidden) {
        if (frozenAt !== null || !s.internal.active) return
        frozenAt = s.clock.elapsedTime
        s.internal.active = false
      } else if (frozenAt !== null) {
        s.clock.getDelta() // swallow the time spent hidden…
        s.clock.elapsedTime = frozenAt // …and carry on from the moment we stopped
        frozenAt = null
        s.internal.active = true
        s.invalidate()
      }
    }
    document.addEventListener('visibilitychange', apply)
    apply()
    return () => document.removeEventListener('visibilitychange', apply)
  }, [get])
  return null
}

/** Catches a canvas that can't start (no WebGL) or a scene that throws. */
class CanvasBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[gl] 3D view failed', error, info.componentStack)
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** The friendly card over a lost (or failed) 3D view: the whole area is one big tap target. */
function GlOverlay({ failed, onContinue }: { failed: boolean; onContinue: () => void }) {
  return (
    <button
      type="button"
      onClick={onContinue}
      data-gl-overlay={failed ? 'failed' : 'lost'}
      className="absolute inset-0 z-[25] grid place-items-center p-4 bg-[#3a2c38]/60 backdrop-blur-sm cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ocean-600/70"
      style={{ touchAction: 'manipulation' }}
    >
      <span className="flex flex-col items-center gap-3 max-w-xs rounded-3xl bg-paper text-ink-900 border-[3px] border-line shadow-ledge px-6 py-5 text-center">
        <span className="text-5xl" aria-hidden="true">
          {failed ? '🛠️' : '😴'}
        </span>
        <span className="kid-text text-xl leading-tight">{failed ? 'The 3D view needs a fresh start' : 'The picture took a little nap'}</span>
        <span className="kid-text inline-flex items-center justify-center min-h-[56px] px-6 rounded-[1.25rem] bg-quest-400 border-[3px] border-line shadow-ledge text-xl">
          {failed ? 'Tap to try again' : 'Tap to continue'}
        </span>
      </span>
    </button>
  )
}
