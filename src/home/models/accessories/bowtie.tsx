import { TCone, TSphere } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Ink } from '../parts'

/**
 * Bow tie (body slot). Authored at the `body` anchor (the front of the neck just
 * under the chin, facing +z): two plump pink-red wings pinched into a round
 * knot, sitting just proud of the chest, with white polka dots.
 */
export function Bowtie() {
  const red = '#ff5470'
  const knot = '#e23d5c'
  return (
    <group position={[0, 0, 0.03]}>
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* each wing: a fat cone whose tip points into the knot */}
          <TCone
            position={[s * 0.065, 0, 0]}
            rotation={[0, 0, s * (Math.PI / 2)]}
            radius={0.06}
            height={0.12}
            segments={12}
            scale={[1, 1, 0.5]}
            color={red}
          >
            <Ink crease />
          </TCone>
          <TSphere position={[s * 0.09, 0.02, 0.026]} scale={[0.011, 0.011, 0.006]} color={TOON.white} segments={6} castShadow={false} />
          <TSphere position={[s * 0.075, -0.025, 0.024]} scale={[0.009, 0.009, 0.006]} color={TOON.white} segments={6} castShadow={false} />
        </group>
      ))}
      <TSphere position={[0, 0, 0.012]} scale={[0.032, 0.035, 0.028]} color={knot} segments={12}>
        <Ink />
      </TSphere>
    </group>
  )
}
