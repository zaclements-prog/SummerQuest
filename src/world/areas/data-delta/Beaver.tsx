import { TOON } from '../../../toon/palette'
import { TBox, TCapsule, TCone, TSphere, type Vec3 } from '../../../toon/shapes'

const FUR = '#b47c50'
const FUR_DARK = '#8c5a37'
const BELLY = '#ecc79a'
const TAIL = '#6b4a35'
const TOOTH = '#fffaf0'

function Eye({ position, size = 0.045 }: { position: Vec3; size?: number }) {
  return (
    <group position={position}>
      <TSphere scale={[size, size * 1.15, size]} color={TOON.eye} castShadow={false} segments={10} />
      <TSphere position={[size * 0.35, size * 0.45, size * 0.7]} scale={size * 0.36} color={TOON.white} emissive={TOON.white} emissiveIntensity={0.9} castShadow={false} segments={6} />
    </group>
  )
}

/**
 * Tally the beaver: a chubby chibi beaver with big buck teeth, a pencil tucked
 * behind one ear, a flat paddle tail, and a clipboard with a tiny bar chart.
 * Feet on y = 0.22, facing +z.
 */
export default function Beaver() {
  return (
    <group position={[0, 0.22, 0]}>
      {/* feet */}
      {[-1, 1].map((s) => (
        <TSphere key={s} position={[s * 0.12, 0.035, 0.07]} scale={[0.09, 0.045, 0.12]} color={FUR_DARK} castShadow={false} />
      ))}
      {/* paddle tail, tipped up behind */}
      <TBox size={[0.3, 0.07, 0.46]} radius={0.03} position={[0, 0.12, -0.34]} rotation={[-0.35, 0, 0]} color={TAIL} outline />
      {[-0.07, 0.07].map((x) => (
        <TBox key={x} size={[0.02, 0.075, 0.36]} radius={0.008} position={[x, 0.135, -0.34]} rotation={[-0.35, 0, 0]} color={FUR_DARK} castShadow={false} />
      ))}

      {/* body + belly */}
      <TSphere position={[0, 0.4, 0]} scale={[0.28, 0.3, 0.26]} color={FUR} outline />
      <TSphere position={[0, 0.37, 0.1]} scale={[0.19, 0.22, 0.17]} color={BELLY} castShadow={false} />

      {/* arms holding the clipboard */}
      <TCapsule radius={0.06} length={0.12} position={[-0.21, 0.45, 0.15]} rotation={[0.9, 0, 0.6]} color={FUR} />
      <TCapsule radius={0.06} length={0.12} position={[0.21, 0.45, 0.15]} rotation={[0.9, 0, -0.6]} color={FUR} />
      <group position={[0, 0.5, 0.27]} rotation={[-0.35, 0, 0]}>
        <TBox size={[0.3, 0.38, 0.03]} radius={0.015} color={TOON.wood} outline outlineThickness={1.5} />
        <TBox size={[0.25, 0.3, 0.012]} radius={0.004} position={[0, -0.015, 0.018]} color={TOON.white} castShadow={false} />
        <TBox size={[0.12, 0.05, 0.03]} radius={0.01} position={[0, 0.18, 0.02]} color={TOON.metal} castShadow={false} />
        {/* the tiny chart on the paper */}
        {[TOON.coral, TOON.gold, TOON.mint, TOON.flowerBlue].map((c, i) => {
          const h = [0.08, 0.16, 0.11, 0.2][i]
          return <TBox key={c} size={[0.04, h, 0.008]} radius={0.003} position={[-0.075 + i * 0.05, -0.15 + h / 2, 0.026]} color={c} castShadow={false} />
        })}
      </group>

      {/* head */}
      <group position={[0, 0.88, 0.02]}>
        <TSphere scale={[0.28, 0.26, 0.26]} color={FUR} outline />
        <TSphere position={[0, -0.07, 0.19]} scale={[0.15, 0.11, 0.1]} color={BELLY} castShadow={false} />
        <TSphere position={[0, -0.03, 0.29]} scale={[0.055, 0.04, 0.035]} color={TOON.eye} castShadow={false} segments={8} />
        {[-1, 1].map((s) => (
          <TBox key={s} size={[0.048, 0.075, 0.025]} radius={0.01} position={[s * 0.027, -0.16, 0.255]} color={TOOTH} castShadow={false} />
        ))}
        <Eye position={[-0.1, 0.04, 0.22]} />
        <Eye position={[0.1, 0.04, 0.22]} />
        <TSphere position={[-0.18, -0.05, 0.18]} scale={[0.05, 0.03, 0.02]} rotation={[0, -0.6, 0]} color={TOON.blush} castShadow={false} segments={8} />
        <TSphere position={[0.18, -0.05, 0.18]} scale={[0.05, 0.03, 0.02]} rotation={[0, 0.6, 0]} color={TOON.blush} castShadow={false} segments={8} />
        {/* ears */}
        {[-1, 1].map((s) => (
          <TSphere key={s} position={[s * 0.2, 0.17, -0.02]} scale={[0.07, 0.065, 0.045]} color={FUR_DARK} castShadow={false} segments={8} />
        ))}
        {/* pencil tucked behind the right ear */}
        <group position={[0.2, 0.12, 0.02]} rotation={[0.2, 0, 1.25]}>
          <TCapsule radius={0.026} length={0.22} color={TOON.flowerYellow} castShadow={false} segments={6} />
          <TCone radius={0.026} height={0.06} position={[0, 0.16, 0]} color={TOON.wallWarm} castShadow={false} segments={6} />
          <TSphere position={[0, -0.13, 0]} scale={0.03} color={TOON.flowerPink} castShadow={false} segments={6} />
        </group>
      </group>
    </group>
  )
}
