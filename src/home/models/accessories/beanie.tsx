import { TSphere, TTorus } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Ink } from '../parts'

/**
 * Beanie (head slot). Authored at the `head` anchor: a snug coral knit dome
 * (its lower half tucks into the head), a chunky cream folded cuff at y≈0, a
 * sunny stripe and a fluffy pom-pom on top.
 */
export function Beanie() {
  const knit = TOON.flowerRed
  const cream = '#fff3df'
  return (
    <group rotation={[-0.08, 0, 0.06]}>
      <TSphere position={[0, -0.005, 0]} scale={[0.212, 0.2, 0.212]} color={knit} segments={20}>
        <Ink />
      </TSphere>
      <TTorus radius={0.188} tube={0.016} position={[0, 0.095, 0]} rotation={[Math.PI / 2, 0, 0]} color={TOON.flowerYellow} segments={22} castShadow={false} />
      <TTorus radius={0.2} tube={0.048} position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} color={cream} segments={22}>
        <Ink />
      </TTorus>
      <TSphere position={[0, 0.21, 0]} scale={0.07} color={cream} segments={12}>
        <Ink />
      </TSphere>
    </group>
  )
}
