import { TCapsule, TCyl, TTorus } from '../../../toon/shapes'
import { Ink } from '../parts'

/**
 * Round glasses (face slot). Authored at the `face` anchor — midway between the
 * eyes on their front surface, facing +z. Two big round navy rims sit just in
 * front of the eyes (x = ±0.1, z ≈ 0.02) so the eyes shine through the pale
 * lenses; a bridge joins them and the arms run back along the sides of the head.
 */
export function Glasses() {
  const frame = '#3c4c8c'
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.1, 0, 0.022]} rotation={[0, s * 0.12, 0]}>
          <TTorus radius={0.075} tube={0.0135} segments={24} color={frame} castShadow={false}>
            <Ink />
          </TTorus>
          <TCyl radiusTop={0.07} radiusBottom={0.07} height={0.004} rotation={[Math.PI / 2, 0, 0]} segments={20} color="#d8f1ff" opacity={0.3} castShadow={false} />
        </group>
      ))}
      <TCapsule radius={0.011} length={0.035} position={[0, 0.018, 0.026]} rotation={[0, 0, Math.PI / 2]} segments={8} color={frame} castShadow={false} />
      {[-1, 1].map((s) => (
        <TCapsule
          key={`arm${s}`}
          radius={0.01}
          length={0.13}
          position={[s * 0.178, 0.008, -0.045]}
          rotation={[Math.PI / 2, s * -0.12, 0]}
          segments={6}
          color={frame}
          castShadow={false}
        />
      ))}
    </group>
  )
}
