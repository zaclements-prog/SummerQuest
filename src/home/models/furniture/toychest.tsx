import { TBox, TCone, TSphere, TTorus } from '../../../toon/shapes'
import { F } from './_palette'
import { Feet, Heart, Ol } from './_kit'

/** Toy chest (1×1): sky-blue chest with a heart, its butter lid propped open on a pile of toys. */
export function Toychest() {
  return (
    <group>
      <Feet x={0.32} z={0.2} h={0.08} r={0.06} />
      {/* body with wooden bands */}
      <TBox size={[0.8, 0.46, 0.56]} radius={0.07} position={[0, 0.31, 0]} color={F.sky}>
        <Ol />
      </TBox>
      <TBox size={[0.84, 0.08, 0.6]} radius={0.035} position={[0, 0.12, 0]} color={F.wood} castShadow={false} />
      <TBox size={[0.84, 0.07, 0.6]} radius={0.03} position={[0, 0.51, 0]} color={F.wood} castShadow={false} />
      <Heart position={[0, 0.31, 0.285]} size={0.2} color={F.pink} />
      {/* side handles */}
      {[-0.41, 0.41].map((x) => (
        <TTorus key={x} radius={0.06} tube={0.02} position={[x, 0.36, 0]} rotation={[0, Math.PI / 2, 0]} color={F.woodDark} castShadow={false} />
      ))}

      {/* toys peeking out */}
      <TSphere position={[-0.18, 0.55, 0.02]} scale={0.14} color={F.red} segments={12} castShadow={false} />
      <TBox size={[0.17, 0.17, 0.17]} radius={0.03} position={[0.17, 0.56, 0.06]} rotation={[0.3, 0.5, 0.2]} color={F.butter} castShadow={false} />
      <TSphere position={[0.04, 0.6, -0.1]} scale={0.085} color={F.yellow} segments={10} castShadow={false} />
      <TCone radius={0.035} height={0.07} position={[0.04, 0.6, -0.01]} rotation={[Math.PI / 2, 0, 0]} color={F.coral} segments={6} castShadow={false} />

      {/* lid, hinged at the back edge and propped open */}
      <group position={[0, 0.55, -0.3]} rotation={[-0.75, 0, 0]}>
        <TBox size={[0.86, 0.1, 0.6]} radius={0.045} position={[0, 0.05, 0.3]} color={F.butter}>
          <Ol />
        </TBox>
      </group>
    </group>
  )
}
