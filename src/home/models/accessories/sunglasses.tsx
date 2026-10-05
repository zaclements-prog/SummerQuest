import { TBox, TCapsule } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Ink } from '../parts'

/**
 * Sunglasses (face slot). Authored at the `face` anchor — midway between the
 * eyes on their front surface, facing +z. Two chunky dark rounded lenses with a
 * bright white glint, a hot-pink brow bar on top and pink arms running back
 * along the sides of the head.
 */
export function Sunglasses() {
  const lens = '#2c2b45'
  const frame = '#ff5c9d'
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.097, -0.005, 0.03]} rotation={[0, s * 0.14, 0]}>
          <TBox size={[0.15, 0.115, 0.026]} radius={0.045} color={lens} castShadow={false}>
            <Ink />
          </TBox>
          <TCapsule
            radius={0.008}
            length={0.035}
            position={[-0.03, 0.022, 0.014]}
            rotation={[0, 0, -0.75]}
            segments={6}
            color={TOON.white}
            emissive={TOON.white}
            emissiveIntensity={0.9}
            castShadow={false}
          />
        </group>
      ))}
      <TBox size={[0.37, 0.028, 0.03]} radius={0.012} position={[0, 0.058, 0.032]} color={frame} castShadow={false}>
        <Ink />
      </TBox>
      {[-1, 1].map((s) => (
        <TCapsule
          key={`arm${s}`}
          radius={0.011}
          length={0.13}
          position={[s * 0.18, 0.045, -0.04]}
          rotation={[Math.PI / 2, s * -0.12, 0]}
          segments={6}
          color={frame}
          castShadow={false}
        />
      ))}
    </group>
  )
}
