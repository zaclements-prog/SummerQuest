import { TCyl, TSphere, TTorus } from '../../../toon/shapes'
import { F } from './_palette'
import { Ol } from './_kit'

const LEGS = [0.25, 1.82, 3.39, 4.96].map((a) => a + Math.PI / 4)

/** Stool (1×1): round wooden seat on four splayed legs, a puffy buttoned cushion on top. */
export function Stool() {
  return (
    <group>
      {LEGS.map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <TCyl radiusTop={0.055} radiusBottom={0.068} height={0.46} position={[0.21, 0.24, 0]} rotation={[0, 0, 0.13]} color={F.wood} segments={8} />
        </group>
      ))}
      <TTorus radius={0.22} tube={0.032} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.17, 0]} color={F.woodDark} castShadow={false} />
      <TCyl radiusTop={0.31} radiusBottom={0.29} height={0.1} position={[0, 0.48, 0]} color={F.woodLight} segments={18}>
        <Ol />
      </TCyl>
      <TSphere position={[0, 0.545, 0]} scale={[0.28, 0.075, 0.28]} color={F.lilac} segments={16}>
        <Ol />
      </TSphere>
      <TSphere position={[0, 0.615, 0]} scale={[0.035, 0.018, 0.035]} color={F.purple} segments={8} castShadow={false} />
    </group>
  )
}
