import { TOON } from '../../../toon/palette'
import { TBox, TCapsule, TCyl, TSphere, TTorus } from '../../../toon/shapes'
import { ChibiFace } from '../fraction-falls/kit'

const ARMOR = '#cfd7e3'
const ARMOR_DARK = '#a9b4c6'
const TABARD = TOON.roofBlue
const PLUME = '#f2766b'

/**
 * Tower Battlefront's guide: a small round knight in an open-faced helmet with a
 * red plume, a blue tabard, a round shield and a toy sword held up proudly.
 * Stands on y = 0.22, faces +z.
 */
export default function Knight() {
  return (
    <group position={[0, 0.22, 0]}>
      {/* boots and short legs */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.1, 0, 0]}>
          <TSphere position={[0, 0.05, 0.04]} scale={[0.09, 0.065, 0.12]} color={TOON.woodDark} castShadow={false} />
          <TCapsule radius={0.07} length={0.06} position={[0, 0.14, 0]} color={ARMOR_DARK} castShadow={false} />
        </group>
      ))}

      {/* armoured body with a blue tabard skirt, belt and gold badge */}
      <TCapsule radius={0.24} length={0.16} position={[0, 0.42, 0]} color={ARMOR} outline />
      <TCyl radiusTop={0.25} radiusBottom={0.29} height={0.28} position={[0, 0.33, 0]} color={TABARD} outline segments={14} />
      <TTorus radius={0.25} tube={0.03} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.49, 0]} color={TOON.woodDark} castShadow={false} segments={18} />
      <TCyl radiusTop={0.06} height={0.03} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.49, 0.265]} color={TOON.gold} castShadow={false} segments={10} />
      <TSphere position={[0, 0.36, 0.27]} scale={[0.06, 0.06, 0.02]} color={TOON.gold} castShadow={false} segments={8} />

      {/* arms */}
      <TCapsule radius={0.075} length={0.12} position={[-0.27, 0.5, 0.06]} rotation={[0.6, 0, -0.6]} color={ARMOR} outline />
      <TCapsule radius={0.075} length={0.12} position={[0.27, 0.46, 0.08]} rotation={[0.5, 0, 0.5]} color={ARMOR} outline />

      {/* head: round helmet with an open face, a face ring and a fluffy plume */}
      <TSphere position={[0, 0.9, -0.03]} scale={0.31} color={ARMOR} outline segments={16} />
      <TSphere position={[0, 0.85, 0.08]} scale={[0.245, 0.23, 0.25]} color={TOON.skinLight} segments={16} />
      <TTorus radius={0.21} tube={0.045} position={[0, 0.86, 0.22]} color={ARMOR_DARK} castShadow={false} segments={20} />
      <TBox size={[0.06, 0.2, 0.05]} radius={0.02} position={[0, 1.12, 0.2]} rotation={[-0.5, 0, 0]} color={ARMOR_DARK} castShadow={false} />
      <TSphere position={[0, 1.22, -0.04]} scale={[0.09, 0.13, 0.15]} color={PLUME} outline />
      <TSphere position={[0, 1.15, -0.2]} scale={[0.075, 0.1, 0.12]} color={TOON.coral} castShadow={false} />
      <ChibiFace eyeY={0.88} eyeX={0.085} eyeZ={0.315} eyeR={0.045} blushY={0.8} blushX={0.14} blushZ={0.29} blushR={0.045} />

      {/* round shield on the left arm */}
      <group position={[0.33, 0.44, 0.16]} rotation={[0, 0.55, 0]}>
        <TCyl radiusTop={0.22} height={0.06} rotation={[Math.PI / 2, 0, 0]} color={TOON.roofRed} outline segments={18} />
        <TTorus radius={0.2} tube={0.025} position={[0, 0, 0.03]} color={TOON.gold} castShadow={false} segments={20} />
        <TBox size={[0.05, 0.22, 0.03]} radius={0.012} position={[0, 0, 0.04]} color={TOON.gold} castShadow={false} />
        <TBox size={[0.22, 0.05, 0.03]} radius={0.012} position={[0, 0, 0.04]} color={TOON.gold} castShadow={false} />
      </group>

      {/* toy sword raised in the right hand */}
      <group position={[-0.36, 0.6, 0.14]} rotation={[0.15, 0, 0.25]}>
        <TCyl radiusTop={0.03} height={0.13} position={[0, -0.04, 0]} color={TOON.woodDark} castShadow={false} segments={6} />
        <TSphere position={[0, -0.12, 0]} scale={0.04} color={TOON.gold} castShadow={false} segments={6} />
        <TBox size={[0.22, 0.05, 0.06]} radius={0.02} position={[0, 0.04, 0]} color={TOON.gold} castShadow={false} />
        <TBox size={[0.075, 0.44, 0.03]} radius={0.014} position={[0, 0.28, 0]} color={'#e8eef5'} outline />
      </group>
    </group>
  )
}
