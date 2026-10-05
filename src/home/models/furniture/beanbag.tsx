import { TBox, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { Heart, Ol } from './_kit'

/** Bean bag (1×1): a squishy coral sack with a slouched back and a sat-in dent. */
export function Beanbag() {
  const c = F.coral
  return (
    <group>
      <TSphere position={[0, 0.25, 0.02]} scale={[0.43, 0.25, 0.41]} color={c} segments={18}>
        <Ol />
      </TSphere>
      <TSphere position={[0, 0.44, -0.19]} rotation={[-0.35, 0, 0]} scale={[0.37, 0.29, 0.2]} color={c} segments={18}>
        <Ol />
      </TSphere>
      {/* the dent where you sit */}
      <TSphere position={[0, 0.42, 0.07]} scale={[0.27, 0.06, 0.24]} color={F.peach} segments={16} castShadow={false} />
      {/* a sewn-on heart patch + a little tag */}
      <Heart position={[0.16, 0.28, 0.37]} size={0.14} color={F.butter} />
      <TBox size={[0.07, 0.1, 0.02]} radius={0.008} position={[-0.3, 0.16, 0.33]} rotation={[0.2, -0.6, 0]} color={F.white} castShadow={false} />
    </group>
  )
}
