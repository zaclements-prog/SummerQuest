import type { Collider } from '../../worldLayout'

/**
 * Data Delta pieces (world x,z). The crate bar chart stands on a plank base
 * turned to face the camera (local +x runs along world (1, 0, −1)).
 */
export const DELTA = {
  chart: { at: [23.0, -9.8] as [number, number], rot: Math.PI / 4, bars: [2, 4, 3, 5, 1], step: 1.0 },
  pie: { at: [16.8, -11.0] as [number, number], r: 1.25 },
  tally: { x0: 25.2, x1: 29.0, z: -12.05 },
  sign: [16.9, -8.2] as [number, number],
  lamp: [20.5, -9.7] as [number, number],
}

/** A point along the chart's own x axis, in world coordinates. */
export function chartPoint(t: number): [number, number] {
  const { at, rot } = DELTA.chart
  return [at[0] + Math.cos(rot) * t, at[1] - Math.sin(rot) * t]
}

/** Solid parts of the data-delta area (world coordinates). */
const colliders: Collider[] = [
  // chart base + bars (circles strung along the diagonal) and its y-axis post
  ...[-2.2, -1.1, 0, 1.1, 2.2].map((t): Collider => {
    const [cx, cz] = chartPoint(t)
    return { kind: 'circle', cx, cz, r: 0.6 }
  }),
  (() => {
    const [cx, cz] = chartPoint(-2.8)
    return { kind: 'circle', cx, cz, r: 0.25 } as Collider
  })(),
  { kind: 'circle', cx: DELTA.pie.at[0], cz: DELTA.pie.at[1], r: DELTA.pie.r + 0.05 },
  { kind: 'box', cx: (DELTA.tally.x0 + DELTA.tally.x1) / 2, cz: DELTA.tally.z, w: DELTA.tally.x1 - DELTA.tally.x0 + 0.2, d: 0.3 },
  { kind: 'circle', cx: DELTA.sign[0], cz: DELTA.sign[1], r: 0.15 },
  { kind: 'circle', cx: DELTA.lamp[0], cz: DELTA.lamp[1], r: 0.15 },
]

export default colliders
