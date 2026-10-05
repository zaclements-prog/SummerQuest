import type { Collider } from '../../worldLayout'

export type GroveShape = 'sphere' | 'cube' | 'cone' | 'pyramid' | 'cylinder' | 'octahedron' | 'icosahedron'

/** Geometry Grove pieces (world x,z). */
export const GROVE = {
  trees: [
    { at: [9.0, -25.1], shape: 'sphere', color: '#ff9ec4', trunk: 1.15 },
    { at: [10.2, -28.5], shape: 'pyramid', color: '#ffd25e', trunk: 1.0 },
    { at: [13.4, -29.9], shape: 'cube', color: '#8fe3c4', trunk: 1.3 },
    { at: [16.7, -28.6], shape: 'cone', color: '#c7a6ff', trunk: 0.9 },
    { at: [18.4, -25.3], shape: 'octahedron', color: '#ff9f80', trunk: 1.1 },
    { at: [17.0, -22.4], shape: 'cylinder', color: '#8fd0ff', trunk: 1.0 },
    { at: [11.6, -31.6], shape: 'icosahedron', color: '#8ab0ff', trunk: 1.2 },
  ] as { at: [number, number]; shape: GroveShape; color: string; trunk: number }[],
  crystal: { at: [13.6, -26.2] as [number, number], r: 0.85 },
  sign: [10.4, -24.4] as [number, number],
  lamp: [13.7, -21.9] as [number, number],
}

/** Solid parts of the geometry-grove area (world coordinates). */
const colliders: Collider[] = [
  ...GROVE.trees.map((t): Collider => ({ kind: 'circle', cx: t.at[0], cz: t.at[1], r: 0.55 })),
  { kind: 'circle', cx: GROVE.crystal.at[0], cz: GROVE.crystal.at[1], r: GROVE.crystal.r },
  { kind: 'circle', cx: GROVE.sign[0], cz: GROVE.sign[1], r: 0.15 },
  { kind: 'circle', cx: GROVE.lamp[0], cz: GROVE.lamp[1], r: 0.15 },
]

export default colliders
