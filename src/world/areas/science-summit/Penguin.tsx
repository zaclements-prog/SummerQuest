import { TOON } from '../../../toon/palette'
import { TBox, TCapsule, TCone, TCyl, TSphere, TTorus, type Vec3 } from '../../../toon/shapes'

const NAVY = '#3d4a6e'
const NAVY_DARK = '#2f3a58'
const BEAK = '#ffae4a'
const COAT = '#fbfbf7'
const LENS = '#9fe6ff'
const BREW = TOON.mint

function Eye({ position, size = 0.045 }: { position: Vec3; size?: number }) {
  return (
    <group position={position}>
      <TSphere scale={[size, size * 1.15, size]} color={TOON.eye} castShadow={false} segments={10} />
      <TSphere position={[size * 0.35, size * 0.45, size * 0.7]} scale={size * 0.36} color={TOON.white} emissive={TOON.white} emissiveIntensity={0.9} castShadow={false} segments={6} />
    </group>
  )
}

/**
 * Professor Pebble: a chibi penguin scientist in a white lab coat with brass
 * goggles pushed up on the forehead, holding a glowing flask. Feet on y = 0.22,
 * facing +z.
 */
export default function Penguin() {
  return (
    <group position={[0, 0.22, 0]}>
      {/* feet */}
      {[-1, 1].map((s) => (
        <TSphere key={s} position={[s * 0.11, 0.035, 0.08]} scale={[0.09, 0.04, 0.13]} color={BEAK} castShadow={false} />
      ))}

      {/* body + lab coat (the coat flares a little at the hem) */}
      <TCapsule radius={0.24} length={0.12} position={[0, 0.36, 0]} color={NAVY} outline />
      <TCyl radiusTop={0.235} radiusBottom={0.3} height={0.42} position={[0, 0.3, -0.005]} color={COAT} outline segments={14} />
      {/* white tummy peeking out where the coat opens */}
      <TSphere position={[0, 0.38, 0.17]} scale={[0.11, 0.2, 0.09]} color={TOON.white} castShadow={false} />
      {/* lapels, pocket + pens, buttons */}
      {[-1, 1].map((s) => (
        <TBox key={s} size={[0.08, 0.2, 0.04]} radius={0.015} position={[s * 0.1, 0.48, 0.19]} rotation={[-0.25, 0, s * 0.35]} color="#e7ecf2" castShadow={false} />
      ))}
      <TBox size={[0.11, 0.08, 0.03]} radius={0.012} position={[-0.15, 0.32, 0.23]} rotation={[-0.15, -0.5, 0]} color="#e7ecf2" castShadow={false} />
      <TCapsule radius={0.014} length={0.07} position={[-0.17, 0.39, 0.22]} color={TOON.flowerRed} castShadow={false} segments={6} />
      <TCapsule radius={0.014} length={0.07} position={[-0.13, 0.385, 0.235]} color={TOON.flowerBlue} castShadow={false} segments={6} />
      <TSphere position={[0.1, 0.32, 0.245]} scale={0.022} color={TOON.flowerBlue} castShadow={false} segments={6} />
      <TSphere position={[0.1, 0.22, 0.25]} scale={0.022} color={TOON.flowerBlue} castShadow={false} segments={6} />

      {/* flippers: left out a little, right holds the flask up */}
      <TCapsule radius={0.06} length={0.18} position={[-0.29, 0.38, 0.02]} rotation={[0, 0, 0.45]} color={COAT} />
      <TCapsule radius={0.06} length={0.16} position={[0.28, 0.44, 0.1]} rotation={[0.5, 0, -0.6]} color={COAT} />
      <group position={[0.36, 0.56, 0.2]}>
        <TCone radius={0.1} height={0.15} position={[0, 0, 0]} color={BREW} emissive={BREW} emissiveIntensity={0.55} castShadow={false} segments={10} />
        <TCyl radiusTop={0.035} radiusBottom={0.04} height={0.1} position={[0, 0.11, 0]} color="#dff4ff" castShadow={false} segments={8} />
        <TSphere position={[0.02, 0.21, 0.01]} scale={0.03} color={TOON.white} emissive={BREW} emissiveIntensity={0.4} castShadow={false} segments={6} />
      </group>

      {/* head */}
      <group position={[0, 0.86, 0.02]}>
        <TSphere scale={[0.29, 0.27, 0.27]} color={NAVY} outline />
        {/* heart-shaped white face */}
        <TSphere position={[-0.07, -0.02, 0.15]} scale={[0.13, 0.16, 0.12]} color={TOON.white} castShadow={false} />
        <TSphere position={[0.07, -0.02, 0.15]} scale={[0.13, 0.16, 0.12]} color={TOON.white} castShadow={false} />
        <Eye position={[-0.09, 0.0, 0.255]} />
        <Eye position={[0.09, 0.0, 0.255]} />
        <TSphere position={[-0.17, -0.07, 0.21]} scale={[0.05, 0.03, 0.02]} rotation={[0, -0.6, 0]} color={TOON.blush} castShadow={false} segments={8} />
        <TSphere position={[0.17, -0.07, 0.21]} scale={[0.05, 0.03, 0.02]} rotation={[0, 0.6, 0]} color={TOON.blush} castShadow={false} segments={8} />
        <TCone radius={0.055} height={0.12} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.07, 0.3]} color={BEAK} castShadow={false} segments={8} />
        {/* goggles on the forehead: strap + two brass rims with glowing lenses */}
        <TTorus radius={0.262} tube={0.03} rotation={[Math.PI / 2 - 0.55, 0, 0]} position={[0, 0.13, -0.02]} color={TOON.coral} castShadow={false} segments={24} />
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.085, 0.2, 0.17]} rotation={[-0.95, s * 0.25, 0]}>
            <TTorus radius={0.07} tube={0.026} color={TOON.gold} castShadow={false} segments={14} />
            <TCyl radiusTop={0.062} height={0.03} rotation={[Math.PI / 2, 0, 0]} color={LENS} emissive={LENS} emissiveIntensity={0.4} castShadow={false} segments={12} />
          </group>
        ))}
        {/* little feather tuft */}
        <TCone radius={0.04} height={0.12} position={[0.02, 0.29, 0.0]} rotation={[0.3, 0, -0.3]} color={NAVY_DARK} castShadow={false} segments={5} />
        <TCone radius={0.035} height={0.1} position={[-0.04, 0.28, -0.02]} rotation={[0.2, 0, 0.4]} color={NAVY_DARK} castShadow={false} segments={5} />
      </group>
    </group>
  )
}
