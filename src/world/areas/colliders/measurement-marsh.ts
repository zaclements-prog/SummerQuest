import type { Collider } from '../../worldLayout'

/**
 * Measurement Marsh pieces (world x,z). The pond is an axis-aligned ellipse; the
 * ruler pier runs east along its middle (z = pond.cz) from the west shore and is
 * walkable, so the water colliders leave a corridor along it.
 */
export const MARSH = {
  pond: { cx: 26.6, cz: -4.6, rx: 3.2, rz: 2.5 },
  pier: { x0: 22.9, x1: 27.7, halfW: 0.6 },
  gauge: [27.95, -4.0] as [number, number],
  balance: [25.3, -0.9] as [number, number],
  sign: [20.5, -4.7] as [number, number],
  lamp: [23.1, -3.75] as [number, number],
}

/** Rows of boxes filling the pond (minus the pier corridor). */
function pondColliders(): Collider[] {
  const { cx, cz, rx, rz } = MARSH.pond
  const { x1, halfW } = MARSH.pier
  const inset = 0.15 // let the avatar stand right at the water's edge
  const out: Collider[] = []
  const halfWidthAt = (z: number) => rx * Math.sqrt(Math.max(0, 1 - ((z - cz) / rz) ** 2))
  // north and south of the pier: bands from the pier edge out to the shore,
  // each as wide as the ellipse at the band's middle
  for (const dir of [-1, 1]) {
    const zStart = cz + dir * halfW
    const n = 6
    const step = (rz - halfW) / n
    for (let i = 0; i < n; i++) {
      const zc = zStart + dir * step * (i + 0.5)
      const hw = halfWidthAt(zc) - inset
      if (hw <= 0.1) continue
      out.push({ kind: 'box', cx, cz: zc, w: hw * 2, d: step })
    }
  }
  // past the pier's end, across the pier band
  const hw = halfWidthAt(cz) - inset
  const east = cx + hw
  out.push({ kind: 'box', cx: (x1 + 0.05 + east) / 2, cz, w: east - (x1 + 0.05), d: halfW * 2 })
  return out
}

/** Solid parts of the measurement-marsh area (world coordinates). */
const colliders: Collider[] = [
  ...pondColliders(),
  { kind: 'circle', cx: MARSH.balance[0], cz: MARSH.balance[1], r: 0.6 },
  { kind: 'circle', cx: MARSH.sign[0], cz: MARSH.sign[1], r: 0.15 },
  { kind: 'circle', cx: MARSH.lamp[0], cz: MARSH.lamp[1], r: 0.15 },
]

export default colliders
