// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { PROBE, canvasQuality, decideAutoQuality, effectiveQuality, setAutoResult, useGraphics } from '../graphicsQuality'
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
})

describe('the session graphics store', () => {
  beforeEach(() => {
    useGraphics.setState({ autoLow: false, probed: false })
    useProgress.getState().setGraphicsQuality('auto')
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
