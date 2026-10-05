import { TBox, TCyl } from '../../../toon/shapes'
import { F } from './_palette'
import { Ol } from './_kit'

// A braided oval rug: concentric rings, each a hair taller than the one outside
// it so nothing z-fights. Everything sits between y = 0.011 and y = 0.038 (above
// the floors at y = 0 / 0.006, low enough to walk over).
const RX = 0.9
const RZ = 1.3
const BOTTOM = 0.011
const RINGS: { r: number; top: number; color: string }[] = [
  { r: 1.0, top: 0.026, color: F.coral },
  { r: 0.86, top: 0.029, color: F.butter },
  { r: 0.7, top: 0.032, color: F.mint },
  { r: 0.53, top: 0.035, color: F.cream },
  { r: 0.34, top: 0.038, color: F.pink },
]

// Fringe tassels along both short ends, starting just outside the oval's edge.
const TASSEL_LEN = 0.12
const TASSELS = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3].flatMap((x) => {
  const edge = RZ * Math.sqrt(1 - (x / RX) ** 2)
  const z = Math.min(edge + TASSEL_LEN / 2 - 0.02, 1.45 - TASSEL_LEN / 2)
  return [
    { x, z },
    { x, z: -z },
  ]
})

/** Cozy rug (2×3), walkable: a soft braided oval with fringed ends. */
export function Rug() {
  return (
    <group>
      {RINGS.map((ring, i) => {
        const h = ring.top - BOTTOM
        return (
          <TCyl
            key={ring.r}
            radiusTop={ring.r}
            height={h}
            segments={36}
            position={[0, BOTTOM + h / 2, 0]}
            scale={[RX, 1, RZ]}
            color={ring.color}
            castShadow={false}
            receiveShadow
          >
            {i === 0 && <Ol thickness={1.6} />}
          </TCyl>
        )
      })}
      {TASSELS.map((t) => (
        <TBox key={`${t.x},${t.z}`} size={[0.05, 0.01, TASSEL_LEN]} radius={0.004} position={[t.x, 0.017, t.z]} color={F.cream} castShadow={false} receiveShadow />
      ))}
    </group>
  )
}
