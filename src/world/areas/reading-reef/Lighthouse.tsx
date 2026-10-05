import { TOON } from '../../../toon/palette'
import { geo } from '../../../toon/geometry'
import { TBox, TCone, TCyl, TSphere, TTorus } from '../../../toon/shapes'
import { Parts } from '../word-problem-woods/storyKit'
import type { Part } from '../word-problem-woods/instancing'
import { LIGHTHOUSE } from './layout'

const RED = TOON.roofRed
const WHITE = TOON.flowerWhite
const BANDS = 4
const BAND_H = 1.0
const R0 = 0.95
const TAPER = 0.07

/** The rocky knoll it stands on. */
const KNOLL: Part[] = [
  { p: [0, 0.18, 0], s: [1.55, 0.5, 1.45], c: TOON.rockDark },
  { p: [-0.9, 0.12, 0.85], s: [0.75, 0.42, 0.7], r: [0, 0.6, 0], c: TOON.rock },
  { p: [1.0, 0.1, -0.6], s: [0.7, 0.36, 0.65], r: [0, 1.4, 0], c: TOON.rock },
  { p: [0.55, 0.08, 1.15], s: [0.5, 0.3, 0.45], r: [0, 2.2, 0], c: TOON.rockLight },
]

/**
 * A red-and-white striped lighthouse on a rocky knoll at the north end of the
 * beach: a glowing lantern room under a red cap, a railed gallery, a little
 * door and window.
 */
export default function Lighthouse() {
  const top = 0.45 + BANDS * BAND_H
  return (
    <group position={[LIGHTHOUSE.x, 0, LIGHTHOUSE.z]}>
      <Parts geometry={geo.blob(1)} items={KNOLL} flat outline receiveShadow />
      {Array.from({ length: BANDS }, (_, i) => (
        <TCyl
          key={i}
          radiusBottom={R0 - i * TAPER * BAND_H}
          radiusTop={R0 - (i + 1) * TAPER * BAND_H}
          height={BAND_H}
          position={[0, 0.45 + (i + 0.5) * BAND_H, 0]}
          color={i % 2 ? WHITE : RED}
          outline
          segments={14}
        />
      ))}
      {/* door + window on the beach side */}
      <TBox size={[0.42, 0.62, 0.2]} radius={0.12} position={[-0.6, 0.78, 0.62]} rotation={[0, -0.75, 0]} color={TOON.woodDark} castShadow={false} />
      <TBox size={[0.24, 0.3, 0.12]} radius={0.06} position={[-0.56, 2.7, 0.56]} rotation={[0, -0.75, 0]} color={TOON.windowGlow} emissive={TOON.windowGlow} emissiveIntensity={0.6} castShadow={false} />
      {/* gallery, railing, lantern room, cap */}
      <TCyl radiusTop={0.95} radiusBottom={0.8} height={0.16} position={[0, top + 0.08, 0]} color={TOON.outline} segments={14} />
      <TTorus radius={0.88} tube={0.035} position={[0, top + 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} color={TOON.outline} castShadow={false} segments={24} />
      <TCyl radiusTop={0.52} height={0.7} position={[0, top + 0.5, 0]} color={TOON.lantern} emissive={TOON.lantern} emissiveIntensity={1.0} segments={12} castShadow={false} />
      <TCone radius={0.72} height={0.62} position={[0, top + 1.16, 0]} color={RED} outline segments={14} />
      <TSphere position={[0, top + 1.55, 0]} scale={0.11} color={TOON.gold} castShadow={false} />
    </group>
  )
}
