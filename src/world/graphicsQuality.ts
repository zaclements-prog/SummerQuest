import { create } from 'zustand'
import { useProgress } from '../store/progress'
import type { GraphicsQuality } from '../store/progress'
import { deviceClass, readDeviceSignals } from '../platform/gl/deviceClass'
import type { DeviceClass } from '../platform/gl/deviceClass'

/**
 * Graphics quality for the 3D scenes (World, Home, the 3D games, and the toon
 * outlines everywhere).
 *
 * - The player's choice (`graphicsQuality`: 'auto' | 'high' | 'low') is
 *   persisted in the progress store; the ⚙️ toggle in the World HUD sets it.
 *   An explicit Pretty / Fast is always obeyed.
 * - 'low' turns off shadows, renders at dpr 1 and skips toon outlines.
 * - 'auto' picks per device and measures in the World (`QualityProbe`):
 *   - computers start Pretty and drop to Fast for the session if ~4 s of frames
 *     come out too slow (the original behavior);
 *   - phones and tablets start Fast and step UP to Pretty only after Fast has
 *     proven smooth and a Pretty trial holds up — better to look a bit plainer
 *     for a few seconds than to stutter first. The outcome is remembered for the
 *     device (`gfxMemory`), so a tablet that proved itself starts Pretty next
 *     time (still verified) and a slow one doesn't retry every launch.
 *   The auto result is never written into the saved choice.
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
  /**
   * Touch devices on Fast try Pretty only if Fast averages at most this (ms):
   * ≈ 50+ fps, i.e. clear headroom (Pretty draws shadows, outlines and ~2× the pixels).
   */
  stepUpMs: 20,
  /** A remembered "this device is slow" stands for this long before Auto tries Pretty again. */
  rememberLowDays: 14,
} as const

/** What the scene should render at for a choice and the session's auto result. */
export function effectiveQuality(choice: GraphicsQuality, autoLow: boolean): EffectiveQuality {
  if (choice === 'low') return 'low'
  if (choice === 'high') return 'high'
  return autoLow ? 'low' : 'high'
}

/** Average of the frames (ms), minus the slowest `PROBE.trim` share. Null without usable samples. */
function trimmedMean(frameMs: readonly number[]): number | null {
  const ok = frameMs.filter((v) => Number.isFinite(v) && v > 0)
  if (ok.length === 0) return null
  const sorted = [...ok].sort((a, b) => a - b)
  const keep = Math.max(1, sorted.length - Math.floor(sorted.length * PROBE.trim))
  let sum = 0
  for (let i = 0; i < keep; i++) sum += sorted[i]
  return sum / keep
}

/**
 * Auto mode's verdict on frames measured at Pretty (ms): a trimmed average
 * above `PROBE.thresholdMs` means low. Null when there's nothing to judge.
 */
export function decideAutoQuality(frameMs: readonly number[]): EffectiveQuality | null {
  const avg = trimmedMean(frameMs)
  if (avg === null) return null
  return avg > PROBE.thresholdMs ? 'low' : 'high'
}

/**
 * Touch devices start on Fast: do these Fast frames (ms) show enough headroom
 * to try Pretty? Null when there's nothing to judge.
 */
export function decideStepUp(frameMs: readonly number[]): boolean | null {
  const avg = trimmedMean(frameMs)
  if (avg === null) return null
  return avg <= PROBE.stepUpMs
}

/** What Auto measured on this device in an earlier session (touch devices only). */
export interface GfxMemory {
  q: EffectiveQuality
  /** When it was measured (ms since epoch). */
  at: number
}

/** How a session in Auto starts: the first render quality and what the probe should do. */
export interface AutoPlan {
  start: EffectiveQuality
  /** 'verify' = measure Pretty, drop if slow; 'step-up' = measure Fast, try Pretty if smooth; 'none' = keep. */
  probe: 'verify' | 'step-up' | 'none'
}

/** The session plan for Auto on this device, given what an earlier session learned. */
export function autoPlan(device: DeviceClass, memory: GfxMemory | null, now: number): AutoPlan {
  if (device === 'desktop') return { start: 'high', probe: 'verify' }
  if (memory?.q === 'high') return { start: 'high', probe: 'verify' }
  const fresh = memory?.q === 'low' && now - memory.at < PROBE.rememberLowDays * 86_400_000 && memory.at <= now
  return fresh ? { start: 'low', probe: 'none' } : { start: 'low', probe: 'step-up' }
}

/** Largest pixel ratio for Pretty on a device (screen in CSS px). */
export function maxPrettyDpr(device: DeviceClass, screenW: number, screenH: number): number {
  if (device !== 'tablet') return 1.5
  // Big tablets (iPad Pro 12.9" ≈ 1.4 MP of CSS pixels) would push > 3 MP at 1.5:
  // cap the drawn pixels at ~2.4 MP, never below 1.
  const px = screenW * screenH
  if (!(px > 0)) return 1.5
  const cap = Math.sqrt(2_400_000 / px)
  return Math.round(Math.min(1.5, Math.max(1, cap)) * 100) / 100
}

/** Canvas props for a quality on a device: shadows on/off and the pixel ratio range. */
export function canvasQuality(
  low: boolean,
  device: DeviceClass = deviceClass(),
  screen: { w: number; h: number } = screenSize(),
): { shadows: boolean; dpr: number | [number, number] } {
  return low ? { shadows: false, dpr: 1 } : { shadows: true, dpr: [1, maxPrettyDpr(device, screen.w, screen.h)] }
}

function screenSize(): { w: number; h: number } {
  const s = readDeviceSignals()
  return { w: s.screenW, h: s.screenH }
}

/** Sun shadow map resolution on Pretty: half on phones/tablets (mobile GPUs, little memory). */
export function shadowMapSize(device: DeviceClass = deviceClass()): number {
  return device === 'desktop' ? 2048 : 1024
}

// ── Remembered auto result (touch devices) ──────────────────────────────────

const MEMORY_KEY = 'summerquest-gfx-auto-v1'

/** Read the remembered auto result (null when absent, unreadable or storage is blocked). */
export function readGfxMemory(): GfxMemory | null {
  try {
    const raw = globalThis.localStorage?.getItem(MEMORY_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<GfxMemory>
    if ((v.q === 'high' || v.q === 'low') && typeof v.at === 'number' && Number.isFinite(v.at)) return { q: v.q, at: v.at }
  } catch {
    // private mode / blocked storage: just don't remember
  }
  return null
}

function writeGfxMemory(q: EffectiveQuality) {
  try {
    globalThis.localStorage?.setItem(MEMORY_KEY, JSON.stringify({ q, at: Date.now() }))
  } catch {
    // ignore
  }
}

// ── The session store ───────────────────────────────────────────────────────

interface GraphicsSession {
  /** Auto mode renders Fast this session (the device's start, or a slow measurement). */
  autoLow: boolean
  /** The auto probe has finished (once per session). */
  probed: boolean
  /** What the probe should do next (see `AutoPlan`). */
  probe: AutoPlan['probe']
  /** Effective: render low right now. */
  low: boolean
}

const choiceNow = (): GraphicsQuality => useProgress.getState().graphicsQuality ?? 'auto'
const plan = autoPlan(deviceClass(), readGfxMemory(), Date.now())

export const useGraphics = create<GraphicsSession>(() => ({
  autoLow: plan.start === 'low',
  probed: plan.probe === 'none',
  probe: plan.probe,
  low: effectiveQuality(choiceNow(), plan.start === 'low') === 'low',
}))

function sync() {
  const low = effectiveQuality(choiceNow(), useGraphics.getState().autoLow) === 'low'
  if (useGraphics.getState().low !== low) useGraphics.setState({ low })
}

// Follow the saved choice (the ⚙️ toggle, a rehydrate, a reset).
useProgress.subscribe((s, prev) => {
  if (s.graphicsQuality !== prev.graphicsQuality) sync()
})

/**
 * Auto mode measured this session: remember the result (never saved into the
 * player's choice). On phones/tablets it is also remembered for the device.
 */
export function setAutoResult(result: EffectiveQuality, device: DeviceClass = deviceClass()) {
  useGraphics.setState({ autoLow: result === 'low', probed: true, probe: 'none' })
  if (device !== 'desktop') writeGfxMemory(result)
  sync()
}

/** A touch device's Fast run was smooth: render Pretty and verify it (the probe runs again). */
export function startPrettyTrial() {
  useGraphics.setState({ autoLow: false, probe: 'verify' })
  sync()
}

/** Render low right now? (one boolean; cheap to subscribe from many meshes) */
export function useLowGraphics(): boolean {
  return useGraphics((s) => s.low)
}
