import type { ScatterItem } from './Vox'

type Vec2 = [number, number]

/** Deterministic [0,1) generator threaded from a seed (no module-scope Math.random). */
export function rng(seed: number) {
  let s = (seed | 0) || 1
  return () => {
    s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d)
    s = Math.imul(s ^ (s >>> 12), 0x297a2d39)
    s ^= s >>> 15
    return (s >>> 0) / 4294967296
  }
}

/**
 * Build a deterministic field of scatter items inside a rectangle. Useful for
 * grass/pebble/flower beds fed to <Scatter>. (x,z) are world-local around
 * `center`. Items keep y at 0 by default.
 */
export function field(
  center: Vec2,
  halfW: number,
  halfD: number,
  count: number,
  seed: number,
  opts: { y?: number; minScale?: number; maxScale?: number } = {},
): ScatterItem[] {
  const r = rng(seed)
  const { y = 0, minScale = 0.7, maxScale = 1.2 } = opts
  const out: ScatterItem[] = []
  for (let i = 0; i < count; i++) {
    const x = center[0] + (r() - 0.5) * 2 * halfW
    const z = center[1] + (r() - 0.5) * 2 * halfD
    out.push({
      position: [x, y, z],
      scale: minScale + r() * (maxScale - minScale),
      rotationY: r() * Math.PI * 2,
      seed: seed + i * 131,
    })
  }
  return out
}
