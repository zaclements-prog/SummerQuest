import { TBox, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { Feet, Heart, Knob, Ol } from './_kit'

const DOOR_Z = 0.36

/** Wardrobe (2×1): a tall sky-blue wardrobe with paneled cream doors, a crown and a heart medallion. */
export function Wardrobe() {
  return (
    <group>
      <Feet x={0.78} z={0.28} h={0.1} r={0.07} />
      <TBox size={[1.8, 0.12, 0.8]} radius={0.04} position={[0, 0.15, -0.04]} color={F.wood} castShadow={false} />
      <TBox size={[1.76, 1.76, 0.78]} radius={0.07} position={[0, 1.08, -0.04]} color={F.sky}>
        <Ol />
      </TBox>
      {/* crown with a heart medallion */}
      <TBox size={[1.88, 0.14, 0.82]} radius={0.05} position={[0, 2.0, -0.04]} color={F.woodLight}>
        <Ol />
      </TBox>
      <TSphere position={[0, 2.16, 0.3]} scale={[0.16, 0.14, 0.05]} color={F.white} segments={14} castShadow={false} />
      <Heart position={[0, 2.17, 0.355]} size={0.16} color={F.pink} />
      {/* doors with raised panels */}
      {[-0.42, 0.42].map((x) => (
        <group key={x}>
          <TBox size={[0.8, 1.58, 0.05]} radius={0.03} position={[x, 1.08, DOOR_Z]} color={F.cream} castShadow={false} />
          <TBox size={[0.6, 0.62, 0.03]} radius={0.025} position={[x, 1.42, DOOR_Z + 0.03]} color={F.blush} castShadow={false} />
          <TBox size={[0.6, 0.62, 0.03]} radius={0.025} position={[x, 0.72, DOOR_Z + 0.03]} color={F.blush} castShadow={false} />
          <Knob position={[x - Math.sign(x) * 0.32, 1.08, DOOR_Z + 0.03]} r={0.05} />
        </group>
      ))}
    </group>
  )
}
