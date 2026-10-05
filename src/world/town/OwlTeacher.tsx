import { TOON } from '../../toon/palette'
import { TBox, TCapsule, TCone, TCyl, TSphere, TTorus } from '../../toon/shapes'

const BODY = TOON.woodDark
const WING = TOON.bark
const CREAM = TOON.wallCream
const BEAK = TOON.autumn
const FRAMES = '#4a3b52'
const CAP = '#3d3550'

/** Two glossy eyes behind round glasses (shared look for the town's NPCs). */
export function SpectacledEyes({ y, z, spread = 0.11, frame = FRAMES }: { y: number; z: number; spread?: number; frame?: string }) {
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * spread, y, z]}>
          <TSphere scale={0.068} color={TOON.eye} castShadow={false} />
          <TSphere position={[0.024, 0.026, 0.055]} scale={0.022} color={TOON.white} emissive={TOON.white} emissiveIntensity={0.8} castShadow={false} segments={6} />
          <TTorus radius={0.102} tube={0.018} position={[0, 0, 0.03]} color={frame} castShadow={false} segments={18} />
        </group>
      ))}
      <TBox size={[0.06, 0.024, 0.024]} radius={0.01} position={[0, y + 0.01, z + 0.04]} color={frame} castShadow={false} />
    </group>
  )
}

/**
 * The Schoolhouse teacher: a round owl in a mortarboard and round glasses,
 * hugging a red book and holding a pointer. Chibi proportions, ~1.25 tall,
 * feet at local y = 0 (Npc stands it on the stage), facing +z.
 */
export default function OwlTeacher() {
  return (
    <group position={[0, 0.22, 0]}>
      {/* feet */}
      {[-1, 1].map((s) => (
        <TSphere key={s} position={[s * 0.1, 0.03, 0.16]} scale={[0.075, 0.04, 0.1]} color={BEAK} castShadow={false} />
      ))}
      {/* body + belly */}
      <TSphere position={[0, 0.37, 0]} scale={[0.34, 0.37, 0.3]} color={BODY} outline />
      <TSphere position={[0, 0.33, 0.17]} scale={[0.25, 0.27, 0.15]} color={CREAM} castShadow={false} />

      {/* head with a heart-shaped face disc */}
      <TSphere position={[0, 0.86, 0]} scale={[0.35, 0.31, 0.31]} color={BODY} outline />
      <TSphere position={[0, 0.87, 0.21]} scale={[0.27, 0.17, 0.11]} color={CREAM} castShadow={false} />
      <SpectacledEyes y={0.89} z={0.3} />
      <TCone radius={0.05} height={0.11} position={[0, 0.78, 0.33]} rotation={[Math.PI * 0.82, 0, 0]} color={BEAK} castShadow={false} segments={6} />
      {[-1, 1].map((s) => (
        <TSphere key={s} position={[s * 0.22, 0.79, 0.24]} scale={[0.055, 0.032, 0.02]} color={TOON.blush} castShadow={false} segments={8} />
      ))}
      {/* ear tufts peeking out under the cap */}
      {[-1, 1].map((s) => (
        <TCone key={s} radius={0.07} height={0.18} position={[s * 0.27, 1.1, -0.02]} rotation={[0, 0, -s * 0.6]} color={BODY} castShadow={false} segments={5} />
      ))}

      {/* mortarboard with a golden tassel */}
      <group position={[0, 1.13, -0.01]} rotation={[0.08, 0, -0.08]}>
        <TCyl radiusTop={0.22} radiusBottom={0.24} height={0.11} color={CAP} outline segments={12} />
        <TBox size={[0.6, 0.05, 0.6]} radius={0.015} position={[0, 0.07, 0]} rotation={[0, Math.PI / 4, 0]} color={CAP} outline />
        <TSphere position={[0, 0.11, 0]} scale={0.035} color={TOON.gold} castShadow={false} segments={8} />
        <TCyl radiusTop={0.012} height={0.3} position={[0.18, 0.1, 0.1]} rotation={[0, 0, 1.25]} color={TOON.gold} castShadow={false} segments={4} />
        <TCapsule radius={0.03} length={0.1} position={[0.33, -0.02, 0.1]} color={TOON.gold} castShadow={false} segments={6} />
      </group>

      {/* wings: one hugs the book, the other holds a pointer */}
      <TSphere position={[0.31, 0.42, 0.1]} scale={[0.1, 0.24, 0.16]} rotation={[0.3, 0, 0.5]} color={WING} outline />
      <TSphere position={[-0.33, 0.45, 0.04]} scale={[0.1, 0.24, 0.16]} rotation={[0, 0, -0.55]} color={WING} outline />
      <group position={[0.1, 0.4, 0.29]} rotation={[-0.1, -0.25, 0.12]}>
        <TBox size={[0.3, 0.38, 0.09]} radius={0.03} color={TOON.roofRed} outline />
        <TBox size={[0.27, 0.34, 0.08]} radius={0.02} position={[-0.02, 0, -0.02]} color={TOON.flowerWhite} castShadow={false} />
        <TSphere position={[0, 0.05, 0.05]} scale={[0.06, 0.06, 0.015]} color={TOON.gold} castShadow={false} segments={8} />
      </group>
      <group position={[-0.45, 0.55, 0.1]} rotation={[0.2, 0, 0.75]}>
        <TCyl radiusTop={0.02} radiusBottom={0.03} height={0.62} position={[0, 0.25, 0]} color={TOON.woodLight} castShadow={false} segments={6} />
        <TSphere position={[0, 0.57, 0]} scale={0.035} color={TOON.flowerRed} castShadow={false} segments={8} />
      </group>
    </group>
  )
}
