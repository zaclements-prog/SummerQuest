import { TBox, TSphere, TTorus } from '../../../toon/shapes'
import { Ink } from '../parts'

/**
 * Cozy scarf (body slot). Authored at the `body` anchor (the front of the neck,
 * ~0.15 in front of the neck's centre line at scale 1): a chunky coral knit
 * roll wrapped round the neck, a knot at the front and two cream-striped tails
 * hanging down the chest.
 */
export function Scarf() {
  const knit = '#f2685a'
  const stripe = '#fff1d8'
  return (
    <group position={[0, 0, 0.005]}>
      <TTorus radius={0.155} tube={0.05} position={[0, 0.0, -0.15]} rotation={[Math.PI / 2 + 0.12, 0, 0]} segments={24} color={knit}>
        <Ink />
      </TTorus>
      <TSphere position={[0.055, -0.02, 0.03]} scale={[0.045, 0.045, 0.04]} color={knit} segments={12}>
        <Ink />
      </TSphere>
      {[
        [0.045, -0.12, 0.05, 0.1, 0.17],
        [0.1, -0.1, 0.035, 0.38, 0.14],
      ].map(([x, y, z, roll, len]) => (
        <group key={x} position={[x, y, z]} rotation={[0.15, 0, roll]}>
          <TBox size={[0.075, len, 0.03]} radius={0.013} color={knit}>
            <Ink />
          </TBox>
          <TBox size={[0.078, 0.024, 0.032]} radius={0.008} position={[0, -len / 2 + 0.04, 0]} color={stripe} castShadow={false} />
        </group>
      ))}
    </group>
  )
}
