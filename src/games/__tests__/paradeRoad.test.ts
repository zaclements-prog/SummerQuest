import { describe, it, expect } from 'vitest'
import { SEGMENTS, SEGMENT_LEN, segmentIndex } from '../CritterParade.layout'

/** The stretches of road on show with the camera at `camZ` (each segment's index). */
const shown = (camZ: number) => Array.from({ length: SEGMENTS }, (_, i) => segmentIndex(i, camZ))

describe('the parade road', () => {
  it('starts with the stretches the scene first lays out', () => {
    // (the camera starts behind the start line, at positive z)
    expect(shown(10)).toEqual(Array.from({ length: SEGMENTS }, (_, i) => i - 1))
  })

  it('always covers the road from the camera forward, with no gaps or repeats', () => {
    for (let camZ = 20; camZ > -2000; camZ -= 3.7) {
      const idx = [...shown(camZ)].sort((a, b) => a - b)
      for (let k = 1; k < idx.length; k++) expect(idx[k]).toBe(idx[k - 1] + 1)
      // the nearest stretch's far end isn't behind the camera, and the one before it was
      expect(-(idx[0] + 1) * SEGMENT_LEN).toBeLessThanOrEqual(camZ + 2)
      expect(-idx[0] * SEGMENT_LEN).toBeGreaterThan(camZ + 2 - SEGMENT_LEN - 1e-9)
    }
  })

  it('comes back to the start line when a new level starts (levels 2 and 3 had no road)', () => {
    const start = shown(10)
    // level 1 marched ~400 units up the road …
    shown(-400)
    // … and a new level puts the camera back behind the start line
    expect(shown(10)).toEqual(start)
  })
})
