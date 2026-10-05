import { TBox, TCyl, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { Ol } from './_kit'

const DOTS: [number, number][] = [
  [-0.5, 0.0],
  [0.12, 0.25],
  [0.55, -0.05],
  [-0.22, 0.62],
  [0.42, 0.72],
  [-0.6, 1.0],
]

/** Comfy bed (2×3): arched headboard at −z with ball posts, puffy pillows, a dotted duvet. */
export function Bed() {
  const frame = F.wood
  const head = F.mint
  const duvet = F.sky
  return (
    <group>
      {/* stubby feet + base frame */}
      {[
        [-0.78, -1.22],
        [0.78, -1.22],
        [-0.78, 1.22],
        [0.78, 1.22],
      ].map(([x, z]) => (
        <TCyl key={`${x},${z}`} radiusTop={0.09} radiusBottom={0.07} height={0.14} position={[x, 0.07, z]} color={F.woodDark} segments={8} castShadow={false} />
      ))}
      <TBox size={[1.8, 0.3, 2.7]} radius={0.09} position={[0, 0.28, 0.02]} color={frame}>
        <Ol />
      </TBox>

      {/* headboard: painted panel with an arched top, chunky posts with ball finials */}
      <TBox size={[1.64, 0.95, 0.2]} radius={0.06} position={[0, 0.62, -1.3]} color={head}>
        <Ol />
      </TBox>
      <TCyl radiusTop={0.82} height={0.2} segments={28} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.42]} position={[0, 1.08, -1.3]} color={head}>
        <Ol />
      </TCyl>
      {[-0.84, 0.84].map((x) => (
        <group key={x}>
          <TCyl radiusTop={0.095} height={1.3} position={[x, 0.65, -1.3]} color={frame} segments={10} />
          <TSphere position={[x, 1.38, -1.3]} scale={0.1} color={F.butter} segments={10} />
        </group>
      ))}
      {/* footboard (low, so the duvet shows) */}
      <TBox size={[1.64, 0.42, 0.16]} radius={0.06} position={[0, 0.5, 1.32]} color={head}>
        <Ol />
      </TBox>
      {[-0.84, 0.84].map((x) => (
        <group key={x}>
          <TCyl radiusTop={0.09} height={0.78} position={[x, 0.39, 1.32]} color={frame} segments={10} />
          <TSphere position={[x, 0.84, 1.32]} scale={0.095} color={F.butter} segments={10} />
        </group>
      ))}

      {/* mattress, duvet (drapes over the sides) with a turned-down band, polka dots */}
      <TBox size={[1.64, 0.22, 2.5]} radius={0.09} position={[0, 0.52, 0]} color={F.white} />
      <TBox size={[1.76, 0.16, 1.72]} radius={0.075} position={[0, 0.65, 0.4]} color={duvet}>
        <Ol />
      </TBox>
      <TBox size={[1.78, 0.18, 0.3]} radius={0.08} position={[0, 0.67, -0.4]} color={F.white} />
      {DOTS.map(([x, z]) => (
        <TSphere key={`${x},${z}`} position={[x, 0.73, z + 0.38]} scale={[0.075, 0.02, 0.075]} color={F.white} segments={10} castShadow={false} />
      ))}

      {/* two puffy pillows by the headboard */}
      <TBox size={[0.68, 0.2, 0.42]} radius={0.095} position={[-0.39, 0.73, -0.94]} rotation={[0.28, 0, 0.05]} color={F.white} />
      <TBox size={[0.68, 0.2, 0.42]} radius={0.095} position={[0.39, 0.73, -0.94]} rotation={[0.28, 0, -0.05]} color={F.blush} />
    </group>
  )
}
