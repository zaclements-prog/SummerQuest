import { create } from 'zustand'
import { useProgress } from '../store/progress'
import type { GraphicsQuality } from '../store/progress'

/**
 * Graphics quality for the 3D scenes (World, Home, and the toon outlines
 * everywhere).
 *
 * - The player's choice (`graphicsQuality`: 'auto' | 'high' | 'low') is
 *   persisted in the progress store; the ⚙️ toggle in the World HUD sets it.
 * - 'low' turns off shadows, renders at dpr 1 and skips toon outlines.
 * - 'auto' starts pretty, measures frame time for the first ~4 seconds in the
 *   World (`QualityProbe`) and, when the machine is too slow, drops to low for
 *   the rest of the session — without touching the saved choice.
 *
 * The effective result lives in a tiny store (`useGraphics`) so the many
 * outlined meshes subscribe to one boolean that changes only on a switch,
 * never to the big progress store.
 */

export type EffectiveQuality = 'high' | 'low'

/** Auto-detect tuning: skip warm-up frames (shader compiles), then measure a window. */
export const PROBE = {
  warmupSeconds: 0.75,
  warmupFrames: 5,
  windowSeconds: 4,
  /** Average frame time above this (ms) → low. ≈ 36 fps. */
  thresholdMs: 28,
  /** Share of the slowest frames ignored as one-off hitches (GC, a late compile). */
  trim: 0.05,
} as const

/** What the scene should render at for a choice and the session's auto result. */
export function effectiveQuality(choice: GraphicsQuality, autoLow: boolean): EffectiveQuality {
  if (choice === 'low') return 'low'
  if (choice === 'high') return 'high'
  return autoLow ? 'low' : 'high'
}

/**
 * Auto mode's decision from measured frame times (ms): the average of the
 * frames, minus the slowest `PROBE.trim` share, above `PROBE.thresholdMs`
 * means low. Null when there's nothing to judge.
 */
export function decideAutoQuality(frameMs: readonly number[]): EffectiveQuality | null {
  const ok = frameMs.filter((v) => Number.isFinite(v) && v > 0)
  if (ok.length === 0) return null
  const sorted = [...ok].sort((a, b) => a - b)
  const keep = Math.max(1, sorted.length - Math.floor(sorted.length * PROBE.trim))
  let sum = 0
  for (let i = 0; i < keep; i++) sum += sorted[i]
  return sum / keep > PROBE.thresholdMs ? 'low' : 'high'
}

/** Canvas props for a quality: shadows on/off and the pixel ratio. */
export function canvasQuality(low: boolean): { shadows: boolean; dpr: number | [number, number] } {
  return low ? { shadows: false, dpr: 1 } : { shadows: true, dpr: [1, 1.5] }
}

interface GraphicsSession {
  /** Auto mode measured a slow machine this session. */
  autoLow: boolean
  /** The auto probe has run (once per session). */
  probed: boolean
  /** Effective: render low right now. */
  low: boolean
}

const choiceNow = (): GraphicsQuality => useProgress.getState().graphicsQuality ?? 'auto'

export const useGraphics = create<GraphicsSession>(() => ({
  autoLow: false,
  probed: false,
  low: effectiveQuality(choiceNow(), false) === 'low',
}))

function sync() {
  const low = effectiveQuality(choiceNow(), useGraphics.getState().autoLow) === 'low'
  if (useGraphics.getState().low !== low) useGraphics.setState({ low })
}

// Follow the saved choice (the ⚙️ toggle, a rehydrate, a reset).
useProgress.subscribe((s, prev) => {
  if (s.graphicsQuality !== prev.graphicsQuality) sync()
})

/** Auto mode measured this session: remember the result (never saved). */
export function setAutoResult(result: EffectiveQuality) {
  useGraphics.setState({ autoLow: result === 'low', probed: true })
  sync()
}

/** Render low right now? (one boolean; cheap to subscribe from many meshes) */
export function useLowGraphics(): boolean {
  return useGraphics((s) => s.low)
}
