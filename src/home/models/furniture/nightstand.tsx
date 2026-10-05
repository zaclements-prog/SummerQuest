import { TBox, TCyl, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { fgeo } from './_geo'
import { Feet, Knob, Ol, TGeo } from './_kit'

/** Nightstand (1×1): lilac cabinet with a drawer, a glowing toadstool night-light and an alarm clock. */
export function Nightstand() {
  return (
    <group>
      <Feet x={0.26} z={0.2} h={0.08} r={0.055} />
      <TBox size={[0.66, 0.5, 0.54]} radius={0.06} position={[0, 0.33, -0.02]} color={F.lilac}>
        <Ol />
      </TBox>
      <TBox size={[0.72, 0.07, 0.6]} radius={0.03} position={[0, 0.615, -0.02]} color={F.woodLight}>
        <Ol />
      </TBox>
      {/* drawer + open cubby */}
      <TBox size={[0.54, 0.2, 0.04]} radius={0.02} position={[0, 0.45, 0.25]} color={F.blush} castShadow={false} />
      <Knob position={[0, 0.45, 0.285]} r={0.04} />
      <TBox size={[0.54, 0.16, 0.02]} radius={0.008} position={[0, 0.2, 0.255]} color={F.purple} castShadow={false} />

      {/* toadstool night-light */}
      <group position={[-0.14, 0.65, -0.06]}>
        <TCyl radiusTop={0.055} radiusBottom={0.07} height={0.12} position={[0, 0.06, 0]} color={F.cream} segments={10} castShadow={false} />
        <TGeo geometry={fgeo.dome(16)} position={[0, 0.11, 0]} scale={[0.17, 0.13, 0.17]} color={F.coral} emissive={F.coral} emissiveIntensity={0.45}>
          <Ol />
        </TGeo>
        <TCyl radiusTop={0.165} height={0.02} position={[0, 0.11, 0]} color={F.cream} emissive={F.glow} emissiveIntensity={0.5} segments={16} castShadow={false} />
        <TSphere position={[0.06, 0.2, 0.08]} scale={[0.03, 0.02, 0.03]} color={F.white} emissive={F.white} emissiveIntensity={0.4} segments={6} castShadow={false} />
        <TSphere position={[-0.08, 0.19, 0.06]} scale={[0.025, 0.018, 0.025]} color={F.white} emissive={F.white} emissiveIntensity={0.4} segments={6} castShadow={false} />
        <TSphere position={[0.0, 0.235, -0.02]} scale={[0.028, 0.015, 0.028]} color={F.white} emissive={F.white} emissiveIntensity={0.4} segments={6} castShadow={false} />
      </group>

      {/* alarm clock */}
      <group position={[0.16, 0.74, 0.02]} rotation={[0, -0.35, 0]}>
        <TCyl radiusTop={0.095} height={0.07} rotation={[Math.PI / 2, 0, 0]} color={F.mint} segments={14} />
        <TCyl radiusTop={0.072} height={0.012} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.037]} color={F.white} segments={14} castShadow={false} />
        <TBox size={[0.012, 0.05, 0.01]} radius={0.004} position={[0, 0.022, 0.046]} color={F.ink} castShadow={false} />
        <TBox size={[0.04, 0.012, 0.01]} radius={0.004} position={[0.018, 0, 0.046]} color={F.ink} castShadow={false} />
        {[-0.06, 0.06].map((x) => (
          <TSphere key={x} position={[x, 0.09, 0]} scale={0.035} color={F.butter} segments={8} castShadow={false} />
        ))}
      </group>
    </group>
  )
}
