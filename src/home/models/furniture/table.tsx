import { TCyl, TSphere, TTorus } from '../../../toon/shapes'
import { F } from './_palette'
import { Ol } from './_kit'

const LEGS: [number, number][] = [
  [-0.4, -0.4],
  [0.4, -0.4],
  [-0.4, 0.4],
  [0.4, 0.4],
]
const TOP = 0.79 // table-top surface height

/** Round table (2×2): a chunky honey-wood top on ball-footed legs, set for a tea party. */
export function Table() {
  return (
    <group>
      {LEGS.map(([x, z]) => (
        <group key={`${x},${z}`}>
          <TCyl radiusTop={0.085} radiusBottom={0.07} height={0.62} position={[x, 0.39, z]} color={F.wood} segments={10} />
          <TSphere position={[x, 0.085, z]} scale={0.085} color={F.woodDark} segments={10} castShadow={false} />
        </group>
      ))}
      <TCyl radiusTop={0.76} height={0.1} position={[0, 0.66, 0]} color={F.wood} segments={24} castShadow={false} />
      <TCyl radiusTop={0.86} radiusBottom={0.84} height={0.12} position={[0, 0.73, 0]} color={F.woodLight} segments={28}>
        <Ol />
      </TCyl>
      {/* lace doily */}
      <TCyl radiusTop={0.44} height={0.012} position={[0, TOP + 0.006, 0]} color={F.white} segments={20} castShadow={false} />

      {/* teapot */}
      <group position={[-0.16, TOP, -0.12]}>
        <TSphere position={[0, 0.12, 0]} scale={[0.15, 0.12, 0.15]} color={F.mint} segments={14}>
          <Ol />
        </TSphere>
        <TSphere position={[0, 0.225, 0]} scale={[0.085, 0.04, 0.085]} color={F.pink} segments={12} castShadow={false} />
        <TSphere position={[0, 0.27, 0]} scale={0.035} color={F.pink} segments={8} castShadow={false} />
        <TCyl radiusTop={0.025} radiusBottom={0.045} height={0.15} position={[0.17, 0.15, 0]} rotation={[0, 0, -0.85]} color={F.mint} segments={8} castShadow={false} />
        <TTorus radius={0.065} tube={0.022} position={[-0.155, 0.13, 0]} color={F.mint} castShadow={false} />
      </group>
      {/* two teacups on saucers */}
      {[
        [0.3, 0.18],
        [0.02, 0.4],
      ].map(([x, z]) => (
        <group key={`${x},${z}`} position={[x, TOP, z]}>
          <TCyl radiusTop={0.09} radiusBottom={0.075} height={0.016} position={[0, 0.008, 0]} color={F.white} segments={12} castShadow={false} />
          <TCyl radiusTop={0.065} radiusBottom={0.045} height={0.075} position={[0, 0.054, 0]} color={F.blush} segments={12} castShadow={false} />
        </group>
      ))}
    </group>
  )
}
