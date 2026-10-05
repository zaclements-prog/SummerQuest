import { TBox, TCapsule, TCyl, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { Feet, Knob, Ol } from './_kit'

const FRONT = 0.33 // drawer-front z

/** Dresser (2×1): a cream chest of rainbow drawers with a framed picture and a little cactus on top. */
export function Dresser() {
  return (
    <group>
      <Feet x={0.78} z={0.26} h={0.1} r={0.065} />
      <TBox size={[1.76, 0.86, 0.72]} radius={0.06} position={[0, 0.53, -0.04]} color={F.cream}>
        <Ol />
      </TBox>
      <TBox size={[1.86, 0.08, 0.8]} radius={0.035} position={[0, 0.99, -0.03]} color={F.woodLight}>
        <Ol />
      </TBox>
      {/* drawers: two small on top, two wide below */}
      {[-0.41, 0.41].map((x, i) => (
        <group key={x}>
          <TBox size={[0.78, 0.22, 0.05]} radius={0.025} position={[x, 0.8, FRONT]} color={i ? F.butter : F.pink} castShadow={false} />
          <Knob position={[x, 0.8, FRONT + 0.035]} color={F.white} />
        </group>
      ))}
      {[
        [0.54, F.mint],
        [0.28, F.sky],
      ].map(([y, c]) => (
        <group key={y as number}>
          <TBox size={[1.6, 0.22, 0.05]} radius={0.025} position={[0, y as number, FRONT]} color={c as string} castShadow={false} />
          <Knob position={[-0.4, y as number, FRONT + 0.035]} color={F.white} />
          <Knob position={[0.4, y as number, FRONT + 0.035]} color={F.white} />
        </group>
      ))}

      {/* framed picture (a little heart) */}
      <group position={[-0.5, 1.03, -0.15]} rotation={[-0.15, 0.15, 0]}>
        <TBox size={[0.34, 0.4, 0.05]} radius={0.025} position={[0, 0.2, 0]} color={F.wood} />
        <TBox size={[0.25, 0.31, 0.02]} radius={0.008} position={[0, 0.2, 0.025]} color={F.sky} castShadow={false} />
        <TSphere position={[0, 0.2, 0.04]} scale={[0.06, 0.06, 0.012]} color={F.red} segments={8} castShadow={false} />
      </group>
      {/* little cactus */}
      <group position={[0.52, 1.03, -0.08]}>
        <TCyl radiusTop={0.1} radiusBottom={0.08} height={0.14} position={[0, 0.07, 0]} color={F.coral} segments={10} castShadow={false} />
        <TCapsule radius={0.07} length={0.16} position={[0, 0.24, 0]} color={F.leaf} segments={8} />
        <TCapsule radius={0.04} length={0.06} position={[0.09, 0.27, 0]} rotation={[0, 0, -0.5]} color={F.leaf} segments={6} castShadow={false} />
        <TSphere position={[0, 0.38, 0]} scale={0.04} color={F.pink} segments={8} castShadow={false} />
      </group>
    </group>
  )
}
