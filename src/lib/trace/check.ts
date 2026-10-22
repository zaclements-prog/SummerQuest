import { dist, type Pt, type SampledStroke } from './geometry'

/**
 * Did this finger trace follow the stroke? A forgiving check for
 * five-year-old fingers, pure so it can be tested on synthetic traces.
 *
 * A trace passes when it
 *   1. starts near the green dot (the stroke's start);
 *   2. moves along the stroke's samples in order, covering most of them
 *      (a point only counts for the part of the stroke just ahead of where
 *      the finger has got to, so going the wrong way round a circle, or
 *      jumping across a letter, covers nothing);
 *   3. doesn't wander far off the path for long (a wobble is fine);
 *   4. gets near the end.
 *
 * All distances are in the glyph's box units (the box is 100 across), so the
 * tolerances grow with the drawn size; `unitPx` (px per unit) also keeps
 * them at least a fingertip wide on a small drawing.
 */

export interface TraceTolerance {
  /** How far from the start the trace may begin. */
  start: number
  /** How close to the path a point must be to cover it. */
  near: number
  /** Further than this from the path counts as wandering. */
  far: number
  /** The longest stretch (units of trace) allowed far off the path… */
  wanderRun: number
  /** …and the most of the whole trace that may be far off it. */
  wanderShare: number
  /** How much of the stroke must be covered (0–1). */
  coverage: number
  /** How near the end the trace must get. */
  end: number
  /** How far ahead along the stroke a point may count (the finger can't skip ahead). */
  ahead: number
}

/**
 * Tuned on a drawing about 300–550 px across (a Fire tablet's stage), where a
 * unit is 3–5 px: start within ~16 units (a fingertip and a half), stay
 * within ~14 to cover, ~22 before it counts as off the path, cover 78%.
 */
export const TOLERANCE: TraceTolerance = {
  start: 16,
  near: 14,
  far: 22,
  wanderRun: 16,
  wanderShare: 0.25,
  coverage: 0.78,
  end: 16,
  ahead: 24,
}

/** At least this many px, whatever the drawn size (a small fingertip). */
const MIN_PX = { start: 44, near: 36, far: 56, end: 44 }

/** Why a trace didn't pass, for the gentle word that follows. */
export type TraceMiss = 'start' | 'wander' | 'short'

export interface TraceResult {
  ok: boolean
  /** The first reason it didn't pass (`null` when it did). */
  miss: TraceMiss | null
  /** How much of the stroke the trace covered, in order (0–1). */
  coverage: number
  /** How far the trace began from the start. */
  startDist: number
}

/** The tolerances for a drawing at `unitPx` px per box unit (none: as written). */
export function tolerancesFor(unitPx?: number, base: TraceTolerance = TOLERANCE): TraceTolerance {
  if (!unitPx || !(unitPx > 0)) return base
  const atLeast = (units: number, px: number) => Math.max(units, px / unitPx)
  return {
    ...base,
    start: atLeast(base.start, MIN_PX.start),
    near: atLeast(base.near, MIN_PX.near),
    far: atLeast(base.far, MIN_PX.far),
    end: atLeast(base.end, MIN_PX.end),
  }
}

/** The trace filled in to a point every `step` units (a fast finger leaves gaps between events). */
export function densify(trace: readonly Pt[], step = 1): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < trace.length; i++) {
    const p = trace[i]
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue
    const prev = out[out.length - 1]
    if (prev) {
      const d = dist(prev, p)
      const n = Math.floor(d / step)
      for (let k = 1; k < n; k++) out.push({ x: prev.x + ((p.x - prev.x) * k) / n, y: prev.y + ((p.y - prev.y) * k) / n })
      if (d < 1e-9) continue
    }
    out.push(p)
  }
  return out
}

/** Check one finger trace (box units, in the order drawn) against a stroke. */
export function checkTrace(stroke: SampledStroke, trace: readonly Pt[], tol: TraceTolerance = TOLERANCE): TraceResult {
  const samples = stroke.pts
  const n = samples.length
  const pts = densify(trace)
  const fail = (miss: TraceMiss, coverage: number, startDist: number): TraceResult => ({ ok: false, miss, coverage, startDist })
  if (!pts.length || n < 2) return fail('short', 0, Infinity)

  const startDist = dist(pts[0], samples[0])
  if (startDist > tol.start) return fail('start', 0, startDist)

  const spacing = stroke.length / (n - 1) || 1
  const aheadIdx = Math.max(2, Math.round(tol.ahead / spacing))
  const backIdx = Math.max(2, Math.round(tol.near / spacing))
  const covered = new Uint8Array(n)
  // where along the stroke the finger has got to (the furthest sample covered so far)
  let reach = 0
  covered[0] = 1
  let farRun = 0
  let farTotal = 0
  let total = 0
  let nearEnd = Infinity
  let worstRun = 0

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const step = i > 0 ? dist(pts[i - 1], p) : 0
    total += step
    // the nearest sample in the stretch around where the finger is (a little back, a little ahead)
    const lo = Math.max(0, reach - backIdx)
    const hi = Math.min(n - 1, reach + aheadIdx)
    let best = Infinity
    let at = -1
    for (let j = lo; j <= hi; j++) {
      const d = dist(p, samples[j])
      if (d < best) {
        best = d
        at = j
      }
    }
    // the finger has got as far as the bit of the stroke it is nearest, and covered the bit
    // between there and where it was (not everything within reach of it: a short stroke would
    // be "covered" from its middle). A finger a little off a corner skips past its tip, so the
    // stretch it went past counts.
    if (best <= tol.near && at > reach) {
      for (let j = reach + 1; j <= at; j++) covered[j] = 1
      reach = at
    }
    if (best > tol.far) {
      farRun += step
      farTotal += step
      worstRun = Math.max(worstRun, farRun)
    } else {
      farRun = 0
    }
    if (reach >= n - 1 - aheadIdx) nearEnd = Math.min(nearEnd, dist(p, samples[n - 1]))
  }

  let count = 0
  for (let j = 0; j < n; j++) count += covered[j]
  const coverage = count / n
  if (worstRun > tol.wanderRun || (total > 0 && farTotal / total > tol.wanderShare)) return fail('wander', coverage, startDist)
  if (coverage < tol.coverage || nearEnd > tol.end) return fail('short', coverage, startDist)
  return { ok: true, miss: null, coverage, startDist }
}

/**
 * A dot (i's and j's, 1st grade): a tap, or a little touch, near it passes. It
 * may not be a long line (that is a stroke somewhere else), and a touch far
 * from it is a "start at the green dot".
 */
export function checkDot(stroke: SampledStroke, trace: readonly Pt[], tol: TraceTolerance = TOLERANCE): TraceResult {
  const pts = trace.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  if (!pts.length || !stroke.pts.length) return { ok: false, miss: 'short', coverage: 0, startDist: Infinity }
  const at = stroke.pts[Math.floor(stroke.pts.length / 2)]
  const startDist = dist(pts[0], at)
  if (startDist > tol.start) return { ok: false, miss: 'start', coverage: 0, startDist }
  let len = 0
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i])
  if (len > tol.far) return { ok: false, miss: 'wander', coverage: 0, startDist }
  return { ok: true, miss: null, coverage: 1, startDist }
}
