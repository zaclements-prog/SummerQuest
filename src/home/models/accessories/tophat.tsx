import { TBox, TCyl } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Ink } from '../parts'

/**
 * Top hat (head slot). Authored at the `head` anchor: the brim rests at y≈0 on
 * the crown of the head (the skull is ~0.19 wide there at scale 1), the tall
 * plum-black crown rises to y≈0.31, with a red band and a little gold buckle.
 */
export function Tophat() {
  const felt = '#3e3552'
  const band = '#ef5b5b'
  return (
    <group rotation={[0, 0, -0.06]}>
      <TCyl radiusTop={0.245} radiusBottom={0.25} height={0.03} position={[0, 0.012, 0]} segments={22} color={felt}>
        <Ink crease />
      </TCyl>
      <TCyl radiusTop={0.165} radiusBottom={0.15} height={0.28} position={[0, 0.165, 0]} segments={18} color={felt}>
        <Ink crease />
      </TCyl>
      <TCyl radiusTop={0.156} radiusBottom={0.154} height={0.06} position={[0, 0.06, 0]} segments={18} color={band} castShadow={false} />
      <TBox size={[0.06, 0.05, 0.016]} radius={0.007} position={[0, 0.06, 0.156]} color={TOON.gold} emissive={TOON.gold} emissiveIntensity={0.35} castShadow={false} />
    </group>
  )
}
