import { TBox, TTorus } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Ink } from '../parts'

/**
 * Backpack (back slot). Authored at the `back` anchor (the spine between the
 * shoulders): a chunky mint school pack sitting behind the back (−z), with a
 * darker top flap, a gold clasp, a coral front pocket and two straps looping
 * over the shoulders and down the chest.
 */
export function Backpack() {
  const pack = '#5cc6b0'
  const dark = '#3f9f8c'
  const pocket = TOON.coral
  return (
    <group position={[0, -0.04, 0]}>
      <TBox size={[0.27, 0.29, 0.15]} radius={0.06} position={[0, -0.03, -0.075]} color={pack}>
        <Ink />
      </TBox>
      <TBox size={[0.28, 0.1, 0.165]} radius={0.04} position={[0, 0.085, -0.08]} rotation={[0.08, 0, 0]} color={dark}>
        <Ink />
      </TBox>
      <TBox size={[0.05, 0.04, 0.02]} radius={0.008} position={[0, 0.045, -0.165]} color={TOON.gold} emissive={TOON.gold} emissiveIntensity={0.35} castShadow={false} />
      <TBox size={[0.18, 0.11, 0.05]} radius={0.022} position={[0, -0.09, -0.16]} color={pocket}>
        <Ink />
      </TBox>
      {/* shoulder straps: loops round the torso (centred on the body's mid-line,
          ~0.175 in front of the anchor) that show over the shoulders and down the chest */}
      {[-1, 1].map((s) => (
        <TTorus key={s} radius={0.18} tube={0.017} position={[s * 0.11, 0.0, 0.175]} rotation={[0, Math.PI / 2, 0]} scale={[1, 0.62, 1]} segments={24} color={dark} castShadow={false} />
      ))}
    </group>
  )
}
