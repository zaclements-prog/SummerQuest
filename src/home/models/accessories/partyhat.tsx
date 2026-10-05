import { TCone, TSphere, TTorus } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Ink } from '../parts'

const H = 0.34 // cone height
const R = 0.145 // cone base radius

/**
 * Party hat (head slot). Authored at the `head` anchor: a jaunty pink cone
 * (base at y≈0) with sunny stripes, a mint ruffle round the base and a bright
 * glowing pom-pom on top.
 */
export function Partyhat() {
  const pink = '#ff8cc6'
  return (
    <group rotation={[0, 0, -0.16]}>
      <TCone radius={R} height={H} position={[0, H / 2, 0]} segments={16} color={pink}>
        <Ink crease />
      </TCone>
      {[0.09, 0.19].map((h) => (
        <TTorus
          key={h}
          radius={R * (1 - h / H) + 0.002}
          tube={0.017}
          position={[0, h, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          color={TOON.flowerYellow}
          segments={18}
          castShadow={false}
        />
      ))}
      <TTorus radius={R} tube={0.03} position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]} color={TOON.mint} segments={18}>
        <Ink />
      </TTorus>
      <TSphere position={[0, H + 0.02, 0]} scale={0.05} color={TOON.flowerYellow} emissive={TOON.flowerYellow} emissiveIntensity={0.35} segments={12}>
        <Ink />
      </TSphere>
    </group>
  )
}
