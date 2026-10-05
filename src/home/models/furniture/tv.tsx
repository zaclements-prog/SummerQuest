import { TBox, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { fgeo } from './_geo'
import { Feet, Knob, Ol, TGeo } from './_kit'

// The cartoon on screen: two hills, a sun and a cloud, in front of a glowing sky.
const SCREEN_Z = -0.03 // front of the screen panel
const SCREEN_BOTTOM = 0.68

/** TV (2×1): a chunky rounded TV showing a sunny cartoon, on a low cabinet with a game pad. */
export function Tv() {
  const z = SCREEN_Z + 0.004
  return (
    <group>
      <Feet x={0.78} z={0.22} h={0.08} r={0.055} />
      {/* cabinet */}
      <TBox size={[1.8, 0.42, 0.6]} radius={0.06} position={[0, 0.29, 0]} color={F.woodLight}>
        <Ol />
      </TBox>
      {[-0.43, 0.43].map((x, i) => (
        <group key={x}>
          <TBox size={[0.8, 0.3, 0.04]} radius={0.02} position={[x, 0.29, 0.3]} color={i ? F.lilac : F.sky} castShadow={false} />
          <Knob position={[x - Math.sign(x) * 0.3, 0.29, 0.33]} color={F.white} r={0.035} />
        </group>
      ))}

      {/* TV: neck, chunky bezel, glowing screen */}
      <TBox size={[0.26, 0.12, 0.14]} radius={0.04} position={[0, 0.55, -0.12]} color={F.slate} castShadow={false} />
      <TBox size={[1.56, 0.94, 0.14]} radius={0.09} position={[0, 1.07, -0.12]} color={F.slate}>
        <Ol />
      </TBox>
      <TBox size={[1.38, 0.76, 0.02]} radius={0.008} position={[0, 1.07, SCREEN_Z - 0.01]} color={F.sky} emissive={F.sky} emissiveIntensity={0.55} castShadow={false} />
      {/* the picture (flat, just in front of the screen) */}
      <TGeo geometry={fgeo.halfDisc(0.42)} position={[-0.3, SCREEN_BOTTOM + 0.01, z]} color={F.leaf} emissive={F.leaf} emissiveIntensity={0.4} castShadow={false} />
      <TGeo geometry={fgeo.halfDisc(0.34)} position={[0.3, SCREEN_BOTTOM + 0.01, z + 0.002]} color={F.leafLight} emissive={F.leafLight} emissiveIntensity={0.4} castShadow={false} />
      <TGeo geometry={fgeo.disc(0.11)} position={[0.45, 1.27, z]} color={F.butter} emissive={F.butter} emissiveIntensity={0.7} castShadow={false} />
      <TGeo geometry={fgeo.disc(0.08)} position={[-0.42, 1.24, z]} color={F.white} emissive={F.white} emissiveIntensity={0.5} castShadow={false} />
      <TGeo geometry={fgeo.disc(0.1)} position={[-0.3, 1.27, z]} color={F.white} emissive={F.white} emissiveIntensity={0.5} castShadow={false} />
      {/* power light */}
      <TSphere position={[0.66, 0.65, -0.05]} scale={0.022} color={F.mint} emissive={F.mint} emissiveIntensity={0.8} segments={6} castShadow={false} />

      {/* game pad on the cabinet */}
      <group position={[0.45, 0.515, 0.12]} rotation={[0, -0.3, 0]}>
        <TBox size={[0.26, 0.05, 0.13]} radius={0.024} color={F.coral} castShadow={false} />
        <TSphere position={[0.06, 0.028, 0]} scale={[0.022, 0.012, 0.022]} color={F.butter} segments={6} castShadow={false} />
        <TSphere position={[-0.06, 0.028, 0]} scale={[0.026, 0.012, 0.026]} color={F.white} segments={6} castShadow={false} />
      </group>
    </group>
  )
}
