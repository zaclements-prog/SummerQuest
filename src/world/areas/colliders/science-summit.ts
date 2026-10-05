import type { Collider } from '../../worldLayout'

/**
 * Science Summit pieces (world x,z). Peaks are 7-sided cones whose bases sit
 * below the grass (y = baseY) so they rise straight out of the cliff top;
 * `ground` is each cone's radius where it meets y = 0.
 */
export const SUMMIT = {
  peaks: [
    { at: [0.5, -33.2] as [number, number], radius: 7.8, height: 12.4, baseY: -3.4, rot: 0.2 },
    { at: [-5.4, -31.0] as [number, number], radius: 4.8, height: 9.0, baseY: -3.4, rot: 0.9 },
    { at: [6.0, -31.6] as [number, number], radius: 5.2, height: 9.8, baseY: -3.4, rot: 1.6 },
  ],
  ledge: { at: [-4.4, -27.6] as [number, number], r: 2.0, top: 1.8 },
  lab: { at: [2.9, -25.9] as [number, number], rot: Math.PI / 4 },
  rocket: { at: [6.3, -27.0] as [number, number], r: 0.95 },
  pines: [[-7.7, -27.2], [-2.3, -27.4]] as [number, number][],
  /** boulders at the mountain's foot: x, z, scale */
  rocks: [[-1.2, -27.6, 1.3], [4.2, -28.2, 1.6]] as [number, number, number][],
  sign: [-1.7, -25.3] as [number, number],
  lamp: [1.5, -25.2] as [number, number],
}

/** A cone's radius where it crosses y = 0. */
export function groundRadius(p: { radius: number; height: number; baseY: number }): number {
  return p.radius * (1 - -p.baseY / p.height)
}

/** Solid parts of the science-summit area (world coordinates). */
const colliders: Collider[] = [
  ...SUMMIT.peaks.map((p): Collider => ({ kind: 'circle', cx: p.at[0], cz: p.at[1], r: groundRadius(p) - 0.1 })),
  { kind: 'circle', cx: SUMMIT.ledge.at[0], cz: SUMMIT.ledge.at[1], r: SUMMIT.ledge.r },
  { kind: 'circle', cx: SUMMIT.lab.at[0], cz: SUMMIT.lab.at[1], r: 1.0 },
  { kind: 'circle', cx: SUMMIT.rocket.at[0], cz: SUMMIT.rocket.at[1], r: SUMMIT.rocket.r },
  ...SUMMIT.pines.map(([x, z]): Collider => ({ kind: 'circle', cx: x, cz: z, r: 0.3 })),
  ...SUMMIT.rocks.map(([x, z, s]): Collider => ({ kind: 'circle', cx: x, cz: z, r: 0.42 * s })),
  { kind: 'circle', cx: SUMMIT.sign[0], cz: SUMMIT.sign[1], r: 0.15 },
  { kind: 'circle', cx: SUMMIT.lamp[0], cz: SUMMIT.lamp[1], r: 0.15 },
]

export default colliders
