import { TSphere } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'

const COLORS = [TOON.flowerPink, TOON.flowerYellow, TOON.flowerWhite, TOON.flowerPurple, '#ff8a7a']
const N = 12
const R = 0.18

/**
 * Flower lei (body slot). Authored at the `body` anchor (the front of the neck,
 * ~0.15 in front of the neck's centre line at scale 1): a ring of twelve puffy
 * blossoms in pink, yellow, white, lilac and coral resting on the shoulders,
 * dipping lower at the front, with sunny centres on the front flowers.
 */
export function Lei() {
  return (
    <group position={[0, -0.01, -0.15]} rotation={[0.34, 0, 0]}>
      {Array.from({ length: N }, (_, i) => {
        const a = (i / N) * Math.PI * 2
        const x = Math.sin(a) * R
        const z = Math.cos(a) * R
        const front = Math.cos(a) > 0.2
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, a, 0]}>
            <TSphere scale={[0.055, 0.038, 0.05]} color={COLORS[i % COLORS.length]} segments={12} castShadow={false} />
            {front && <TSphere position={[0, 0.032, 0.01]} scale={0.017} color={TOON.gold} segments={6} castShadow={false} />}
          </group>
        )
      })}
    </group>
  )
}
