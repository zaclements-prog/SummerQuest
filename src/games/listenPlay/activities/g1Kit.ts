import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * Small helpers the 1st-grade activities share (lengthOrder, units,
 * clockMatch, graph): the stage's size, and a value that glides.
 */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
export const boxStyle = (r: Rect) => ({ left: r.x, top: r.y, width: r.w, height: r.h })
export function union(rs: Rect[]): Rect {
  const x0 = Math.min(...rs.map((r) => r.x))
  const y0 = Math.min(...rs.map((r) => r.y))
  const x1 = Math.max(...rs.map((r) => r.x + r.w))
  const y1 = Math.max(...rs.map((r) => r.y + r.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/**
 * The element's size, kept up to date (0 × 0 before it is laid out, and in a test DOM).
 * `measured` turns true once it has been measured (before the first paint): anything that
 * moves with a CSS transition waits for it, so it never glides in from a guessed place.
 */
export function useBoxSize(ref: RefObject<HTMLElement | null>): { w: number; h: number; measured: boolean } {
  const [size, setSize] = useState({ w: 0, h: 0, measured: false })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight, measured: true })
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}

/** A value that glides to `to` over `ms` (straight there with reduced motion, or no animation frames). */
export function useGlide(to: number, ms = 900): number {
  const [v, setV] = useState(to)
  const now = useRef(to)
  useEffect(() => {
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (typeof requestAnimationFrame !== 'function' || reduced) {
      const id = setTimeout(() => {
        now.current = to
        setV(to)
      }, 0)
      return () => clearTimeout(id)
    }
    const from = now.current
    let t0 = -1
    let raf = 0
    const step = (ts: number) => {
      if (t0 < 0) t0 = ts
      const k = Math.min(1, (ts - t0) / ms)
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
      now.current = from + (to - from) * e
      setV(now.current)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return v
}

/** True while mounted (for promises that finish after the question has moved on). */
export function useMounted() {
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  return mounted
}
