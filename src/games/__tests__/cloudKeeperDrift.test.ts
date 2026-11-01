import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { seededRng } from '../../lib/random'
import { CLOUD_GLIDE_SEC, HILL, cloudGlide, cloudSpot } from '../CloudKeeper.parts'
import cloudKeeperSrc from '../CloudKeeper.tsx?raw'

/**
 * Cloud Keeper (2–4), the windy loop's start. The cloud's drift used to run on
 * the time since the game opened, so when the windy loop began (20–40 s in)
 * the cloud and its condensation ring jumped up to 2 units, and snapped back
 * to the hill when the storm began. Now the drift's clock restarts at each
 * twist change and the cloud glides from where it was.
 */

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-07-01T10:00:00'))
  vi.spyOn(Math, 'random').mockImplementation(seededRng('cloud-keeper-drift'))
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const hill: [number, number] = [HILL.x, HILL.z]
const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1])
const near = (a: readonly number[], b: readonly number[]) => expect(dist(a, b)).toBeLessThan(1e-9)

/** Largest move between 60 fps frames over `secs` seconds of a twist. */
function maxStep(twist: 'calm' | 'wind', from: [number, number], secs: number): number {
  let prev = cloudGlide(0, twist, from)
  let max = dist(prev, from)
  for (let f = 1; f <= secs * 60; f++) {
    const p = cloudGlide(f / 60, twist, from)
    max = Math.max(max, dist(p, prev))
    prev = p
  }
  return max
}

describe('Cloud Keeper: the cloud at a twist change', () => {
  it('the old clock: entering the windy loop at a typical moment jumped the cloud', () => {
    // what the frame loop drew before: cloudSpot(time since mount) — e.g. 31 s in
    expect(dist(cloudSpot(31, 'wind'), hill)).toBeGreaterThan(1)
  })

  it('the windy loop starts where the cloud is and glides onto its path (no jump)', () => {
    near(cloudGlide(0, 'wind', hill), hill)
    expect(maxStep('wind', hill, 30)).toBeLessThan(0.05)
    const t = CLOUD_GLIDE_SEC + 3.7
    near(cloudGlide(t, 'wind', hill), cloudSpot(t, 'wind'))
  })

  it('the storm glides back to the hill from wherever the wind left it', () => {
    const mid: [number, number] = cloudSpot(17.3, 'wind')
    near(cloudGlide(0, 'calm', mid), mid)
    expect(maxStep('calm', mid, 5)).toBeLessThan(0.05)
    near(cloudGlide(CLOUD_GLIDE_SEC, 'calm', mid), hill)
    // the warm-up never moves it at all
    expect(maxStep('calm', hill, 10)).toBe(0)
  })

  it('the warm-up hint arrow goes through the one-pending-timer hook, not a bare later()', () => {
    expect(cloudKeeperSrc).toContain("useGuideTimer<boolean>(setGuide)")
    expect(cloudKeeperSrc).not.toMatch(/later\([^)]*setGuide\(true\)/)
  })
})
