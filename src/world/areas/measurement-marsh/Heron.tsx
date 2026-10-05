import { TOON } from '../../../toon/palette'
import { TBox, TCapsule, TCone, TSphere, type Vec3 } from '../../../toon/shapes'

const PLUME = '#a9bfd6'
const PLUME_DARK = '#8aa3bf'
const CREST = '#4b5872'
const BEAK = '#ffbe55'
const BOOT = '#ffd75e'
const RULER = '#ffe27a'

function Eye({ position, size = 0.045 }: { position: Vec3; size?: number }) {
  return (
    <group position={position}>
      <TSphere scale={[size, size * 1.15, size]} color={TOON.eye} castShadow={false} segments={10} />
      <TSphere position={[size * 0.35, size * 0.45, size * 0.7]} scale={size * 0.36} color={TOON.white} emissive={TOON.white} emissiveIntensity={0.9} castShadow={false} segments={6} />
    </group>
  )
}

/**
 * Inch the heron: a chibi blue-grey heron in yellow rain boots with a swept-back
 * crest, holding a ruler as tall as its body. Feet on y = 0.22, facing +z.
 */
export default function Heron() {
  return (
    <group position={[0, 0.22, 0]}>
      {/* rain boots + little legs */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.11, 0, 0.02]}>
          <TCapsule radius={0.075} length={0.08} position={[0, 0.11, 0]} color={BOOT} outline outlineThickness={1.6} />
          <TSphere position={[0, 0.035, 0.05]} scale={[0.08, 0.04, 0.1]} color={BOOT} castShadow={false} />
          <TCapsule radius={0.035} length={0.08} position={[0, 0.25, 0]} color={BEAK} castShadow={false} segments={6} />
        </group>
      ))}

      {/* body, wings, tail */}
      <TSphere position={[0, 0.46, -0.02]} scale={[0.26, 0.24, 0.3]} color={PLUME} outline />
      <TSphere position={[0, 0.44, 0.13]} scale={[0.17, 0.19, 0.15]} color={TOON.white} castShadow={false} />
      <TSphere position={[0.25, 0.47, -0.05]} scale={[0.07, 0.17, 0.22]} rotation={[0.2, 0, -0.15]} color={PLUME_DARK} castShadow={false} />
      <TCone radius={0.11} height={0.24} position={[0, 0.48, -0.33]} rotation={[-Math.PI / 2 - 0.4, 0, 0]} color={PLUME_DARK} castShadow={false} segments={6} />

      {/* neck */}
      <TCapsule radius={0.09} length={0.16} position={[0, 0.7, 0.04]} rotation={[0.25, 0, 0]} color={TOON.white} outline />

      {/* head */}
      <group position={[0, 0.94, 0.06]}>
        <TSphere scale={[0.25, 0.24, 0.24]} color={TOON.white} outline />
        <TCone radius={0.065} height={0.36} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.04, 0.37]} color={BEAK} outline outlineThickness={1.5} segments={8} />
        <Eye position={[-0.095, 0.03, 0.2]} />
        <Eye position={[0.095, 0.03, 0.2]} />
        <TSphere position={[-0.16, -0.05, 0.17]} scale={[0.045, 0.028, 0.02]} rotation={[0, -0.6, 0]} color={TOON.blush} castShadow={false} segments={8} />
        <TSphere position={[0.16, -0.05, 0.17]} scale={[0.045, 0.028, 0.02]} rotation={[0, 0.6, 0]} color={TOON.blush} castShadow={false} segments={8} />
        {/* blue-black eye stripe + crest plumes sweeping back */}
        <TCapsule radius={0.035} length={0.24} position={[0, 0.17, -0.1]} rotation={[-1.1, 0, 0]} color={CREST} segments={6} />
        <TCapsule radius={0.028} length={0.22} position={[0.04, 0.12, -0.2]} rotation={[-1.35, 0.2, 0]} color={CREST} segments={6} castShadow={false} />
        <TCapsule radius={0.028} length={0.2} position={[-0.04, 0.12, -0.2]} rotation={[-1.35, -0.2, 0]} color={CREST} segments={6} castShadow={false} />
      </group>

      {/* left wing holds the ruler upright */}
      <TSphere position={[-0.27, 0.47, 0.04]} scale={[0.07, 0.17, 0.2]} rotation={[0.3, 0, 0.35]} color={PLUME_DARK} castShadow={false} />
      <group position={[-0.36, 0.5, 0.16]} rotation={[0, 0.3, 0.12]}>
        <TBox size={[0.12, 0.8, 0.035]} radius={0.015} color={RULER} outline outlineThickness={1.5} />
        {[0, 1, 2, 3, 4, 5, 6].map((k) => (
          <TBox key={k} size={[k % 2 ? 0.04 : 0.07, 0.016, 0.01]} radius={0.004} position={[0.06 - (k % 2 ? 0.02 : 0.035), -0.33 + k * 0.11, 0.02]} color={TOON.eye} castShadow={false} />
        ))}
      </group>
    </group>
  )
}
