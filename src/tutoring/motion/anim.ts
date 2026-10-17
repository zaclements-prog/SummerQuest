/**
 * Pure animation math for the lesson motion graphics. Everything is a function
 * of time `t` (seconds), so a scene is a pure render of "where is everything at
 * t?" — scrubbing, replays and narration sync come for free.
 */

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))

/** 0→1 progress of a segment that starts at `start` and lasts `dur` seconds. */
export const progress = (t: number, start: number, dur: number) => (dur <= 0 ? (t >= start ? 1 : 0) : clamp((t - start) / dur))

export type Easing = (x: number) => number

export const ease = {
  linear: (x: number) => x,
  inQuad: (x: number) => x * x,
  outQuad: (x: number) => 1 - (1 - x) * (1 - x),
  inOutQuad: (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  outCubic: (x: number) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuart: (x: number) => 1 - Math.pow(1 - x, 4),
  inOutSine: (x: number) => -(Math.cos(Math.PI * x) - 1) / 2,
  /** Overshoots a little past 1, then settles (pops, landings). */
  outBack: (x: number) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
  },
  /** Springy wobble into place. */
  outElastic: (x: number) => {
    if (x === 0 || x === 1) return x
    return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
  },
} satisfies Record<string, Easing>

/**
 * Map `t` through piecewise-linear `input` stops to `output` values, with an
 * easing applied inside each segment. Clamps outside the range.
 *   interpolate(t, [1, 2], [0, 100], ease.outCubic)
 */
export function interpolate(t: number, input: number[], output: number[], easing: Easing = ease.linear): number {
  if (input.length !== output.length || input.length < 2) throw new Error('interpolate: input/output must be equal length ≥ 2')
  if (t <= input[0]) return output[0]
  const last = input.length - 1
  if (t >= input[last]) return output[last]
  let i = 0
  while (i < last - 1 && t > input[i + 1]) i++
  const span = input[i + 1] - input[i]
  const k = span <= 0 ? 1 : easing((t - input[i]) / span)
  return output[i] + (output[i + 1] - output[i]) * k
}

/**
 * A damped spring from 0 to 1 starting at `start` (closed form, so it's a pure
 * function of t). Lower damping = more bounce.
 */
export function spring(t: number, start: number, { stiffness = 170, damping = 14, mass = 1 } = {}): number {
  const x = t - start
  if (x <= 0) return 0
  const w0 = Math.sqrt(stiffness / mass)
  const zeta = damping / (2 * Math.sqrt(stiffness * mass))
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta)
    return 1 - Math.exp(-zeta * w0 * x) * (Math.cos(wd * x) + ((zeta * w0) / wd) * Math.sin(wd * x))
  }
  // critically / over-damped
  return 1 - Math.exp(-w0 * x) * (1 + w0 * x)
}

/** Start time of item `i` in a staggered group. */
export const stagger = (start: number, i: number, gap = 0.08) => start + i * gap

/** Mix two #rrggbb colors (k = 0 → a, 1 → b). */
export function mixColor(a: string, b: string, k: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const kk = clamp(k)
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) + ((((pb >> shift) & 255) - ((pa >> shift) & 255)) * kk))
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`
}

/** Smooth 0→1→0 pulse with the given period (idle breathing, glows). */
export const pulse = (t: number, period = 1.6) => 0.5 - 0.5 * Math.cos((t / period) * Math.PI * 2)

/** SVG path for a pie slice (angles in radians, 0 = 12 o'clock, clockwise). */
export function slicePath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)]
  const [x0, y0] = p(a0)
  const [x1, y1] = p(a1)
  if (a1 - a0 >= Math.PI * 2 - 1e-6) return `M ${cx - r} ${cy} a ${r} ${r} 0 1 1 ${2 * r} 0 a ${r} ${r} 0 1 1 ${-2 * r} 0 Z`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
}
