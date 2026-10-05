import { TBlob, TCyl, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { Ol } from './_kit'

// Big paddle leaves fanning out from the middle: [yaw, tilt, length, color].
const LEAVES: [number, number, number, string][] = [
  [0.3, 0.75, 0.24, F.leaf],
  [1.55, 0.85, 0.22, F.leafDark],
  [2.75, 0.7, 0.24, F.leaf],
  [3.95, 0.9, 0.21, F.leafLight],
  [5.15, 0.75, 0.23, F.leafDark],
]

/** Potted plant (1×1): a round pink pot with a leafy, blooming bush. */
export function Plant() {
  const pot = F.coral
  return (
    <group>
      {/* saucer, pot and rolled rim */}
      <TCyl radiusTop={0.25} radiusBottom={0.22} height={0.05} position={[0, 0.025, 0]} color={F.woodDark} segments={14} castShadow={false} />
      <TCyl radiusTop={0.26} radiusBottom={0.19} height={0.36} position={[0, 0.22, 0]} color={pot} segments={14}>
        <Ol />
      </TCyl>
      <TCyl radiusTop={0.3} radiusBottom={0.28} height={0.1} position={[0, 0.41, 0]} color={pot} segments={14}>
        <Ol />
      </TCyl>
      <TCyl radiusTop={0.25} height={0.02} position={[0, 0.455, 0]} color={F.woodDark} segments={14} castShadow={false} />
      {/* leafy middle */}
      <TBlob position={[0, 0.72, 0]} scale={0.25} color={F.leaf}>
        <Ol />
      </TBlob>
      <TBlob position={[-0.13, 0.6, 0.09]} scale={0.19} color={F.leafLight} />
      <TBlob position={[0.14, 0.62, -0.05]} scale={0.2} color={F.leafDark} />
      {/* paddle leaves */}
      {LEAVES.map(([yaw, tilt, len, c]) => (
        <group key={yaw} rotation={[0, yaw, 0]} position={[0, 0.62, 0]}>
          <TSphere position={[0, Math.cos(tilt) * len * 0.95, Math.sin(tilt) * len * 0.95]} rotation={[tilt, 0, 0]} scale={[0.1, len, 0.035]} color={c} segments={10} />
        </group>
      ))}
      {/* two little blooms */}
      <TSphere position={[0.08, 0.95, 0.12]} scale={0.065} color={F.pink} segments={10} castShadow={false} />
      <TSphere position={[-0.14, 0.86, -0.1]} scale={0.055} color={F.butter} segments={10} castShadow={false} />
    </group>
  )
}
