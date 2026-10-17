/**
 * What kind of device is rendering the 3D scenes — a hint for graphics defaults
 * (auto quality, pixel ratio, shadow map size), never for layout.
 *
 * - `phone`: touch-first with a small screen (short side under 600 CSS px), or
 *   any screen that small.
 * - `tablet`: touch-first (primary pointer is coarse) with a bigger screen.
 * - `desktop`: everything else (a mouse or trackpad is the primary pointer —
 *   including touch-screen laptops and iPads driven by a trackpad).
 */
export type DeviceClass = 'desktop' | 'tablet' | 'phone'

export interface DeviceSignals {
  /** `(pointer: coarse)`: the primary pointer is a finger. */
  coarse: boolean
  /** Screen size in CSS pixels (orientation-independent). */
  screenW: number
  screenH: number
}

/** Short screen side (CSS px) under which a device counts as a phone. */
export const PHONE_MAX_SHORT_SIDE = 600

export function classifyDevice(s: DeviceSignals): DeviceClass {
  const short = Math.min(s.screenW, s.screenH)
  const known = Number.isFinite(short) && short > 0
  if (known && short < 500) return 'phone'
  if (!s.coarse) return 'desktop'
  return known && short < PHONE_MAX_SHORT_SIDE ? 'phone' : 'tablet'
}

/** The browser's signals right now (desktop defaults outside a browser, e.g. in tests). */
export function readDeviceSignals(): DeviceSignals {
  if (typeof window === 'undefined') return { coarse: false, screenW: 1280, screenH: 800 }
  let coarse: boolean
  try {
    coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
  } catch {
    coarse = false
  }
  const scr = window.screen
  return { coarse, screenW: scr?.width ?? window.innerWidth, screenH: scr?.height ?? window.innerHeight }
}

let cached: DeviceClass | null = null
/** This device's class (read once per session: it does not change while the app runs). */
export function deviceClass(): DeviceClass {
  if (!cached) cached = classifyDevice(readDeviceSignals())
  return cached
}

/** Touch-first devices (phones and tablets): mobile GPUs, little memory. */
export function isTouchFirst(d: DeviceClass = deviceClass()): boolean {
  return d !== 'desktop'
}
