import { describe, it, expect } from 'vitest'
import { ease, interpolate, mixColor, progress, slicePath, spring } from '../anim'
import { alignWords, phraseIndex, timeAtChar } from '../cues'

describe('motion anim', () => {
  it('interpolates piecewise with clamping', () => {
    expect(interpolate(0, [1, 2], [0, 10])).toBe(0)
    expect(interpolate(1.5, [1, 2], [0, 10])).toBe(5)
    expect(interpolate(3, [1, 2], [0, 10])).toBe(10)
    expect(interpolate(2.5, [1, 2, 3], [0, 10, 0])).toBe(5)
    expect(interpolate(1.5, [1, 2], [0, 10], ease.outCubic)).toBeCloseTo(8.75)
  })
  it('springs from 0 toward 1 and settles', () => {
    expect(spring(0, 1)).toBe(0)
    expect(spring(1.2, 1)).toBeGreaterThan(0.3)
    expect(Math.abs(spring(5, 1) - 1)).toBeLessThan(0.01)
    // underdamped springs overshoot
    let max = 0
    for (let t = 1; t < 3; t += 0.01) max = Math.max(max, spring(t, 1, { damping: 8 }))
    expect(max).toBeGreaterThan(1)
  })
  it('progress, colors and slices', () => {
    expect(progress(2, 1, 2)).toBe(0.5)
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(slicePath(0, 0, 10, 0, Math.PI / 2)).toMatch(/^M 0 0 L 0\.00 -10\.00 A 10 10 0 0 1 10\.00 (-)?0\.00 Z$/)
  })
})

describe('narration cues', () => {
  const text = 'Two fourths covers the same space as one half. One half!'
  it('finds phrases case-insensitively, nth occurrence', () => {
    expect(phraseIndex(text, 'one half')).toBe(text.indexOf('one half'))
    expect(phraseIndex(text, 'one half', 1)).toBe(text.indexOf('One half!'))
    expect(phraseIndex(text, 'nope')).toBe(-1)
  })
  it('maps characters to time proportionally without word timings', () => {
    expect(timeAtChar(0, 100, 10)).toBe(0)
    expect(timeAtChar(50, 100, 10)).toBe(5)
  })
  it('uses aligned word timings when present', () => {
    const words = [
      { w: 'Two', s: 0.1, e: 0.3 }, { w: 'fourths', s: 0.35, e: 0.8 }, { w: 'covers', s: 0.9, e: 1.2 },
      { w: 'the', s: 1.25, e: 1.3 }, { w: 'same', s: 1.35, e: 1.6 }, { w: 'space', s: 1.65, e: 2 },
      { w: 'as', s: 2.05, e: 2.1 }, { w: 'one', s: 2.2, e: 2.4 }, { w: 'half.', s: 2.45, e: 2.9 },
    ]
    const aligned = alignWords(text, words)
    expect(aligned[0]).toEqual({ start: 0, s: 0.1 })
    expect(timeAtChar(phraseIndex(text, 'one half'), text.length, 99, aligned)).toBe(2.2)
  })
})
