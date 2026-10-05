import { TOON } from '../../toon/palette'
import { TBox, TCapsule, TCyl, TSphere } from '../../toon/shapes'
import { SpectacledEyes } from './OwlTeacher'

const GREEN = '#8fd66a'
const GREEN_LIGHT = '#b5e88a'
const FRAMES = '#e0604f'

/** Body segments from the tail tip (behind) curling up to the chest. */
const SEGMENTS: { p: [number, number, number]; r: number; c: string }[] = [
  { p: [0.1, 0.1, -0.52], r: 0.1, c: GREEN_LIGHT },
  { p: [0.05, 0.14, -0.33], r: 0.14, c: GREEN },
  { p: [0, 0.18, -0.1], r: 0.18, c: GREEN_LIGHT },
  { p: [0, 0.34, 0.06], r: 0.2, c: GREEN },
  { p: [0, 0.55, 0.1], r: 0.21, c: GREEN_LIGHT },
]

/**
 * The Library's bookworm: a plump green worm curling up out of a reading pose,
 * big red-rimmed glasses, bobbly antennae, and an open book held in tiny arms.
 * ~1.3 tall, feet (well, tail) at local y = 0, facing +z.
 */
export default function Bookworm() {
  return (
    <group position={[0, 0.22, 0]}>
      {SEGMENTS.map((s) => (
        <TSphere key={s.p[2]} position={s.p} scale={s.r} color={s.c} outline />
      ))}

      {/* head */}
      <TSphere position={[0, 0.9, 0.1]} scale={[0.34, 0.32, 0.31]} color={GREEN} outline />
      <SpectacledEyes y={0.94} z={0.36} spread={0.12} frame={FRAMES} />
      <TSphere position={[0, 0.8, 0.39]} scale={[0.06, 0.03, 0.02]} color={TOON.eye} castShadow={false} segments={8} />
      {[-1, 1].map((s) => (
        <TSphere key={s} position={[s * 0.22, 0.82, 0.34]} scale={[0.055, 0.032, 0.02]} color={TOON.blush} castShadow={false} segments={8} />
      ))}
      {/* antennae */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <TCyl radiusTop={0.022} height={0.26} position={[s * 0.13, 1.27, 0.06]} rotation={[0, 0, -s * 0.38]} color={GREEN} castShadow={false} segments={5} />
          <TSphere position={[s * 0.19, 1.4, 0.06]} scale={0.06} color={TOON.flowerYellow} outline castShadow={false} />
        </group>
      ))}

      {/* tiny arms holding an open book up to read */}
      {[-1, 1].map((s) => (
        <TCapsule key={s} radius={0.05} length={0.12} position={[s * 0.2, 0.55, 0.27]} rotation={[1.2, 0, -s * 0.5]} color={GREEN} castShadow={false} segments={6} />
      ))}
      <group position={[0, 0.5, 0.38]} rotation={[-0.95, 0, 0]}>
        <TBox size={[0.5, 0.035, 0.34]} radius={0.015} color={TOON.roofBlue} outline />
        {[-1, 1].map((s) => (
          <TBox key={s} size={[0.22, 0.04, 0.3]} radius={0.015} position={[s * 0.115, 0.035, 0]} rotation={[0, 0, -s * 0.14]} color={TOON.flowerWhite} castShadow={false} />
        ))}
        <TBox size={[0.03, 0.01, 0.2]} radius={0.004} position={[0.05, 0.06, -0.05]} color={TOON.flowerRed} castShadow={false} />
      </group>
    </group>
  )
}
