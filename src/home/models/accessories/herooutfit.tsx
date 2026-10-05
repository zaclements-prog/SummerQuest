import { TBox, TCone, TCyl, TSphere, TTorus } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Ink } from '../parts'

const STAR = Array.from({ length: 5 }, (_, i) => (i / 5) * Math.PI * 2)

/**
 * Hero suit (body slot). Authored at the `body` anchor (the front of the neck,
 * ~0.15 in front of the neck's centre line at scale 1): a glowing gold chest
 * badge with a red star on the tummy below the anchor, a blue utility belt
 * hugging the waist and a big gold buckle.
 */
export function Herooutfit() {
  const blue = '#3d6fe0'
  const red = '#ff4d5e'
  return (
    <group>
      {/* chest badge */}
      <group position={[0, -0.085, 0.05]} rotation={[-0.12, 0, 0]}>
        <TCyl radiusTop={0.075} radiusBottom={0.075} height={0.022} rotation={[Math.PI / 2, 0, 0]} segments={18} color={TOON.gold} emissive={TOON.gold} emissiveIntensity={0.3}>
          <Ink crease />
        </TCyl>
        <TTorus radius={0.075} tube={0.012} position={[0, 0, 0.004]} segments={22} color={blue} castShadow={false} />
        {STAR.map((a) => (
          <TCone key={a} position={[Math.sin(a) * 0.024, Math.cos(a) * 0.024, 0.014]} rotation={[0, 0, -a]} radius={0.016} height={0.04} segments={4} scale={[1, 1, 0.4]} color={red} castShadow={false} />
        ))}
        <TSphere position={[0, 0, 0.014]} scale={[0.02, 0.02, 0.008]} color={red} segments={8} castShadow={false} />
      </group>
      {/* utility belt round the waist + buckle */}
      <TTorus radius={0.205} tube={0.028} position={[0, -0.21, -0.15]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.93, 1]} segments={26} color={blue}>
        <Ink />
      </TTorus>
      <TBox size={[0.07, 0.055, 0.025]} radius={0.01} position={[0, -0.21, 0.07]} color={TOON.gold} emissive={TOON.gold} emissiveIntensity={0.3}>
        <Ink />
      </TBox>
    </group>
  )
}
