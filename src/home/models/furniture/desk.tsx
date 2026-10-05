import { TBox, TCyl, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { fgeo } from './_geo'
import { Knob, Ol, TGeo } from './_kit'

const TOP = 0.785 // desk-top surface height

/** Desk (2×1): honey top on a mint drawer pedestal, with a glowing desk lamp, books, crayons and an apple. */
export function Desk() {
  return (
    <group>
      {/* top */}
      <TBox size={[1.86, 0.09, 0.84]} radius={0.04} position={[0, 0.74, 0]} color={F.woodLight}>
        <Ol />
      </TBox>
      {/* drawer pedestal (right) */}
      <TBox size={[0.56, 0.68, 0.74]} radius={0.05} position={[0.62, 0.35, -0.02]} color={F.mint}>
        <Ol />
      </TBox>
      {[0.52, 0.2].map((y, i) => (
        <group key={y}>
          <TBox size={[0.46, 0.26, 0.04]} radius={0.02} position={[0.62, y, 0.36]} color={i ? F.butter : F.blush} castShadow={false} />
          <Knob position={[0.62, y, 0.39]} r={0.04} color={F.white} />
        </group>
      ))}
      {/* chunky legs (left) + a footbar */}
      {[-0.3, 0.3].map((z) => (
        <TBox key={z} size={[0.12, 0.7, 0.12]} radius={0.04} position={[-0.83, 0.35, z]} color={F.wood} />
      ))}
      <TBox size={[0.08, 0.08, 0.6]} radius={0.03} position={[-0.83, 0.14, 0]} color={F.wood} castShadow={false} />

      {/* desk lamp */}
      <group position={[-0.66, TOP, -0.2]}>
        <TCyl radiusTop={0.09} radiusBottom={0.11} height={0.05} position={[0, 0.025, 0]} color={F.coral} segments={12} castShadow={false} />
        <TCyl radiusTop={0.034} height={0.3} position={[0, 0.2, 0]} color={F.white} segments={8} castShadow={false} />
        {/* dome shade tipped forward over the desk, glowing underneath */}
        <group position={[0, 0.36, 0.02]} rotation={[-0.6, 0, 0]}>
          <TGeo geometry={fgeo.dome(14)} scale={[0.14, 0.12, 0.14]} color={F.coral}>
            <Ol />
          </TGeo>
          <TCyl radiusTop={0.13} height={0.012} color={F.glow} emissive={F.glow} emissiveIntensity={1} segments={14} castShadow={false} />
        </group>
      </group>
      {/* stacked books */}
      <TBox size={[0.34, 0.06, 0.24]} radius={0.02} position={[-0.25, TOP + 0.03, -0.12]} rotation={[0, 0.12, 0]} color={F.sky} castShadow={false} />
      <TBox size={[0.3, 0.06, 0.22]} radius={0.02} position={[-0.24, TOP + 0.09, -0.11]} rotation={[0, -0.1, 0]} color={F.pink} castShadow={false} />
      {/* crayon cup */}
      <TCyl radiusTop={0.075} radiusBottom={0.065} height={0.15} position={[0.3, TOP + 0.075, -0.24]} color={F.butter} segments={12} castShadow={false} />
      {[
        [-0.025, 0.2, F.red],
        [0.03, -0.15, F.blue],
        [0.0, 0.0, F.leaf],
      ].map(([dx, tilt, c]) => (
        <TCyl
          key={c as string}
          radiusTop={0.024}
          height={0.18}
          position={[0.3 + (dx as number), TOP + 0.17, -0.24]}
          rotation={[0, 0, tilt as number]}
          color={c as string}
          segments={6}
          castShadow={false}
        />
      ))}
      {/* open notebook */}
      <TBox size={[0.36, 0.02, 0.24]} radius={0.008} position={[0.25, TOP + 0.01, 0.13]} rotation={[0, -0.15, 0]} color={F.white} castShadow={false} />
      {/* an apple for the teacher */}
      <TSphere position={[-0.02, TOP + 0.075, 0.2]} scale={[0.08, 0.075, 0.08]} color={F.red} segments={12} castShadow={false} />
      <TCyl radiusTop={0.012} height={0.05} position={[-0.02, TOP + 0.17, 0.2]} color={F.woodDark} segments={5} castShadow={false} />
      <TSphere position={[0.015, TOP + 0.17, 0.2]} scale={[0.03, 0.012, 0.018]} rotation={[0, 0, 0.4]} color={F.leaf} segments={6} castShadow={false} />
    </group>
  )
}
