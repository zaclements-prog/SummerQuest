import { TCone, TCyl, TSphere } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Ink } from '../parts'

const POINTS = Array.from({ length: 5 }, (_, i) => (i / 5) * Math.PI * 2)
// front ruby + two side gems (angle around the band, color)
const GEMS: [number, string][] = [
  [0, '#ff4f6d'],
  [-1.15, '#4fa8ff'],
  [1.15, '#3fd18a'],
]

/**
 * Royal crown (head slot). Authored at the `head` anchor: a flared gold band
 * hugging the top of the head (base at y≈0), five points tipped with glowing
 * pearls, a red velvet cap inside, and sparkling ruby/sapphire/emerald gems.
 */
export function Crown() {
  const gold = TOON.gold
  return (
    <group rotation={[0, 0, 0.05]}>
      {/* red velvet cap filling the crown */}
      <TSphere position={[0, 0.03, 0]} scale={[0.17, 0.1, 0.17]} color="#d9405a" segments={14} />
      {/* gold band */}
      <TCyl radiusTop={0.205} radiusBottom={0.19} height={0.1} position={[0, 0.05, 0]} segments={20} color={gold} emissive={gold} emissiveIntensity={0.18}>
        <Ink crease />
      </TCyl>
      {POINTS.map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <TCone position={[0, 0.14, 0.19]} rotation={[0.12, 0, 0]} radius={0.05} height={0.1} segments={8} scale={[1, 1, 0.45]} color={gold} emissive={gold} emissiveIntensity={0.18}>
            <Ink crease />
          </TCone>
          <TSphere position={[0, 0.2, 0.198]} scale={0.024} color={TOON.white} emissive="#fff6d8" emissiveIntensity={0.6} segments={8} castShadow={false} />
        </group>
      ))}
      {GEMS.map(([a, c]) => (
        <group key={a} rotation={[0, a, 0]}>
          <TSphere position={[0, 0.05, 0.2]} scale={[0.03, 0.03, 0.016]} color={c} emissive={c} emissiveIntensity={0.55} segments={10} castShadow={false} />
        </group>
      ))}
    </group>
  )
}
