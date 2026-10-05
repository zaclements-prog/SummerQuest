import type { Collider } from '../../worldLayout'

/** The plateau's lowest terrace (center + footprint radius at ground level). */
export const PLATEAU = { at: [-17, -29.9] as [number, number], r: 4.0 }

/**
 * The base-ten monument: center, Y rotation (faces the camera, +x+z) and the
 * pedestal's half-length / half-depth along its own axes.
 */
export const MONUMENT = { at: [-15.6, -23.6] as [number, number], rot: Math.PI / 4, halfLen: 3.43, halfDepth: 0.85 }

/** Smaller solid props round the plateau (world x,z). */
export const PLATEAU_PROPS = {
  /** boulders at the plateau's foot: x, z, scale */
  rocks: [[-12.7, -28.5, 1.5], [-20.9, -26.4, 1.8], [-21.3, -27.6, 1.1]] as [number, number, number][],
  /** giant unit cubes tumbled in the grass */
  cubes: [[-12.2, -27.0], [-20.2, -24.2]] as [number, number][],
  sign: [-10.4, -24.5] as [number, number],
  lamp: [-9.2, -23.9] as [number, number],
}

/** Circles strung along the (diagonal) monument pedestal. */
function monumentColliders(): Collider[] {
  const ax = Math.cos(MONUMENT.rot) // local +x in world = (cos, −sin)
  const az = -Math.sin(MONUMENT.rot)
  const out: Collider[] = []
  for (const t of [-2.6, -1.3, 0, 1.3, 2.6]) {
    out.push({ kind: 'circle', cx: MONUMENT.at[0] + ax * t, cz: MONUMENT.at[1] + az * t, r: MONUMENT.halfDepth })
  }
  return out
}

/** Solid parts of the place-value-plateau area (world coordinates). */
const colliders: Collider[] = [
  { kind: 'circle', cx: PLATEAU.at[0], cz: PLATEAU.at[1], r: PLATEAU.r },
  ...monumentColliders(),
  ...PLATEAU_PROPS.cubes.map(([x, z]): Collider => ({ kind: 'circle', cx: x, cz: z, r: 0.45 })),
  ...PLATEAU_PROPS.rocks.map(([x, z, s]): Collider => ({ kind: 'circle', cx: x, cz: z, r: 0.42 * s })),
  { kind: 'circle', cx: PLATEAU_PROPS.sign[0], cz: PLATEAU_PROPS.sign[1], r: 0.15 },
  { kind: 'circle', cx: PLATEAU_PROPS.lamp[0], cz: PLATEAU_PROPS.lamp[1], r: 0.15 },
]

export default colliders
