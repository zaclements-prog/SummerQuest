// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  PROBE,
  autoPlan,
  canvasQuality,
  decideAutoQuality,
  decideStepUp,
  effectiveQuality,
  maxPrettyDpr,
  readGfxMemory,
  setAutoResult,
  shadowMapSize,
  startPrettyTrial,
  useGraphics,
} from '../graphicsQuality'
import { useProgress } from '../../store/progress'

const frames = (ms: number, n = 200) => Array.from({ length: n }, () => ms)

describe('effectiveQuality', () => {
  it('honors an explicit choice; auto follows the session measurement', () => {
    expect(effectiveQuality('high', true)).toBe('high')
    expect(effectiveQuality('low', false)).toBe('low')
    expect(effectiveQuality('auto', false)).toBe('high')
    expect(effectiveQuality('auto', true)).toBe('low')
  })
})

describe('decideAutoQuality', () => {
  it('keeps Pretty on a machine that holds ~60 fps', () => {
    expect(decideAutoQuality(frames(16.7))).toBe('high')
  })

  it('drops to Fast when frames average above the threshold', () => {
    expect(decideAutoQuality(frames(40))).toBe('low')
    expect(decideAutoQuality(frames(PROBE.thresholdMs + 2))).toBe('low')
    expect(decideAutoQuality(frames(PROBE.thresholdMs - 2))).toBe('high')
  })

  it('ignores a few one-off hitches (a GC pause, a late shader compile)', () => {
    const f = frames(17, 240)
    for (let i = 0; i < 8; i++) f[i * 30] = 400
    expect(decideAutoQuality(f)).toBe('high')
  })

  it('a machine too slow for many frames at all is still judged', () => {
    expect(decideAutoQuality([900, 1100, 1300])).toBe('low')
  })

  it('has no opinion without usable samples', () => {
    expect(decideAutoQuality([])).toBeNull()
    expect(decideAutoQuality([NaN, -1, 0])).toBeNull()
  })
})

describe('canvasQuality', () => {
  it('low = no shadows and pixel ratio 1', () => {
    expect(canvasQuality(true)).toEqual({ shadows: false, dpr: 1 })
    expect(canvasQuality(false)).toEqual({ shadows: true, dpr: [1, 1.5] })
  })

  it('caps the pixel ratio per device class (phones stay at ≤ 1.5 even on Pretty)', () => {
    expect(canvasQuality(false, 'phone', { w: 390, h: 844 })).toEqual({ shadows: true, dpr: [1, 1.5] })
    expect(canvasQuality(true, 'phone', { w: 390, h: 844 })).toEqual({ shadows: false, dpr: 1 })
    // a 10" iPad keeps 1.5; a 12.9" one is held to ~2.4 MP of drawn pixels
    expect(canvasQuality(false, 'tablet', { w: 810, h: 1080 })).toEqual({ shadows: true, dpr: [1, 1.5] })
    const big = maxPrettyDpr('tablet', 1024, 1366)
    expect(big).toBeLessThan(1.5)
    expect(big).toBeGreaterThanOrEqual(1)
    expect(1024 * 1366 * big * big).toBeLessThanOrEqual(2_400_000 * 1.01)
    expect(maxPrettyDpr('desktop', 2560, 1440)).toBe(1.5)
    expect(maxPrettyDpr('tablet', 0, 0)).toBe(1.5)
  })

  it('halves the sun shadow map on phones and tablets', () => {
    expect(shadowMapSize('desktop')).toBe(2048)
    expect(shadowMapSize('tablet')).toBe(1024)
    expect(shadowMapSize('phone')).toBe(1024)
  })
})

describe('auto on phones and tablets: start Fast, step up only when proven', () => {
  const now = Date.UTC(2026, 9, 17)
  const day = 86_400_000

  it('computers keep the old behavior: start Pretty, verify', () => {
    expect(autoPlan('desktop', null, now)).toEqual({ start: 'high', probe: 'verify' })
    expect(autoPlan('desktop', { q: 'low', at: now }, now)).toEqual({ start: 'high', probe: 'verify' })
  })

  it('an unknown touch device starts Fast and tries to step up', () => {
    expect(autoPlan('tablet', null, now)).toEqual({ start: 'low', probe: 'step-up' })
    expect(autoPlan('phone', null, now)).toEqual({ start: 'low', probe: 'step-up' })
  })

  it('a touch device that proved itself starts Pretty (and is verified again)', () => {
    expect(autoPlan('tablet', { q: 'high', at: now - 30 * day }, now)).toEqual({ start: 'high', probe: 'verify' })
  })

  it('a touch device known to be slow stays Fast without retrying — until the memory goes stale', () => {
    expect(autoPlan('tablet', { q: 'low', at: now - 2 * day }, now)).toEqual({ start: 'low', probe: 'none' })
    expect(autoPlan('tablet', { q: 'low', at: now - (PROBE.rememberLowDays + 1) * day }, now)).toEqual({ start: 'low', probe: 'step-up' })
    // a clock that went backwards doesn't pin it forever
    expect(autoPlan('phone', { q: 'low', at: now + 5 * day }, now)).toEqual({ start: 'low', probe: 'step-up' })
  })

  it('steps up only with clear headroom on Fast', () => {
    expect(decideStepUp(frames(16.7))).toBe(true)
    expect(decideStepUp(frames(PROBE.stepUpMs))).toBe(true)
    expect(decideStepUp(frames(PROBE.stepUpMs + 3))).toBe(false)
    expect(decideStepUp(frames(33))).toBe(false)
    expect(decideStepUp([])).toBeNull()
  })
})

describe('the session graphics store', () => {
  beforeEach(() => {
    useGraphics.setState({ autoLow: false, probed: false, probe: 'verify' })
    useProgress.getState().setGraphicsQuality('auto')
    localStorage.clear()
  })

  it('a Pretty trial renders high and asks for a verify run; its result is remembered on touch devices only', () => {
    useGraphics.setState({ autoLow: true, probe: 'step-up' })
    useGraphics.setState({ low: true })
    startPrettyTrial()
    expect(useGraphics.getState()).toMatchObject({ autoLow: false, probe: 'verify', low: false, probed: false })
    setAutoResult('high', 'tablet')
    expect(useGraphics.getState()).toMatchObject({ probed: true, probe: 'none', low: false })
    expect(readGfxMemory()).toMatchObject({ q: 'high' })
    localStorage.clear()
    setAutoResult('low', 'desktop')
    expect(readGfxMemory()).toBeNull()
  })

  it('an explicit choice beats the device start', () => {
    useGraphics.setState({ autoLow: true })
    useProgress.getState().setGraphicsQuality('high')
    expect(useGraphics.getState().low).toBe(false)
    useProgress.getState().setGraphicsQuality('auto')
    expect(useGraphics.getState().low).toBe(true)
    useProgress.getState().setGraphicsQuality('low')
    useGraphics.setState({ autoLow: false })
    expect(useGraphics.getState().low).toBe(true)
  })

  it('ignores a corrupt remembered result', () => {
    localStorage.setItem('summerquest-gfx-auto-v1', '{nope')
    expect(readGfxMemory()).toBeNull()
    localStorage.setItem('summerquest-gfx-auto-v1', JSON.stringify({ q: 'ultra', at: 1 }))
    expect(readGfxMemory()).toBeNull()
  })

  it('follows the saved choice', () => {
    expect(useGraphics.getState().low).toBe(false)
    useProgress.getState().setGraphicsQuality('low')
    expect(useGraphics.getState().low).toBe(true)
    useProgress.getState().setGraphicsQuality('high')
    expect(useGraphics.getState().low).toBe(false)
  })

  it("auto's slow-machine result switches to low for the session without changing the saved choice", () => {
    setAutoResult('low')
    expect(useGraphics.getState()).toMatchObject({ autoLow: true, probed: true, low: true })
    expect(useProgress.getState().graphicsQuality).toBe('auto')
    // picking Pretty explicitly wins over the measurement…
    useProgress.getState().setGraphicsQuality('high')
    expect(useGraphics.getState().low).toBe(false)
    // …and going back to Auto remembers it
    useProgress.getState().setGraphicsQuality('auto')
    expect(useGraphics.getState().low).toBe(true)
  })
})
