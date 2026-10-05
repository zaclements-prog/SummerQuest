import { TOON } from '../../../toon/palette'
import { TBox, TCapsule, TCyl, TSphere } from '../../../toon/shapes'
import { ChibiFace } from '../fraction-falls/kit'

const COAT = '#e8b878'
const COAT_DARK = '#c99357'
const MUZZLE = '#f6dcae'
const FEZ = '#e2544a'

/**
 * Division Dunes' guide: a chibi camel in a little red fez, with a striped saddle
 * blanket and two matching saddle bags (an equal share on each side). Its body
 * stands side-on so the hump shows, and `headTurn` swings the neck and head
 * round toward the viewer. Stands on y = 0.22, faces +z.
 */
export default function Camel({ headTurn = 0 }: { headTurn?: number }) {
  return (
    <group position={[0, 0.22, 0]}>
      {/* sturdy legs with soft hooves */}
      {([
        [-0.15, 0.2],
        [0.15, 0.2],
        [-0.15, -0.22],
        [0.15, -0.22],
      ] as const).map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <TCapsule radius={0.075} length={0.2} position={[0, 0.17, 0]} color={COAT} />
          <TSphere position={[0, 0.04, 0.02]} scale={[0.085, 0.05, 0.1]} color={COAT_DARK} castShadow={false} />
        </group>
      ))}

      {/* long round body and a big hump */}
      <TSphere position={[0, 0.48, -0.02]} scale={[0.29, 0.23, 0.42]} color={COAT} outline segments={16} />
      <TSphere position={[0, 0.66, -0.08]} scale={[0.22, 0.24, 0.24]} color={COAT} outline segments={14} />
      <TSphere position={[0, 0.4, 0.04]} scale={[0.22, 0.14, 0.3]} color={MUZZLE} castShadow={false} />
      {/* tail with a dark tuft */}
      <TCapsule radius={0.035} length={0.16} position={[0, 0.44, -0.45]} rotation={[0.45, 0, 0]} color={COAT_DARK} castShadow={false} />
      <TSphere position={[0, 0.36, -0.49]} scale={0.055} color={'#8b5e3a'} castShadow={false} />

      {/* striped saddle blanket over the hump, and one bag on each side */}
      <TBox size={[0.52, 0.06, 0.36]} radius={0.025} position={[0, 0.63, -0.08]} color={TOON.roofTeal} outline />
      <TBox size={[0.54, 0.065, 0.08]} radius={0.025} position={[0, 0.635, -0.08]} color={TOON.flowerYellow} castShadow={false} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.32, 0.47, -0.08]} rotation={[0, 0, s * 0.1]}>
          <TBox size={[0.13, 0.22, 0.24]} radius={0.045} color={TOON.coral} outline />
          <TSphere position={[s * 0.07, 0.03, 0]} scale={0.028} color={TOON.gold} castShadow={false} segments={6} />
        </group>
      ))}

      {/* neck and big head, turned toward the viewer */}
      <group position={[0, 0.5, 0.3]} rotation={[0, headTurn, 0]}>
        <TCapsule radius={0.11} length={0.24} position={[0, 0.2, 0.05]} rotation={[0.45, 0, 0]} color={COAT} outline />
        <group position={[0, 0.48, 0.13]}>
          <TSphere scale={[0.25, 0.24, 0.24]} color={COAT} outline segments={16} />
          <TSphere position={[0, -0.07, 0.18]} scale={[0.17, 0.13, 0.15]} color={MUZZLE} outline />
          <TSphere position={[-0.06, -0.04, 0.32]} scale={[0.022, 0.014, 0.01]} color={'#6b4a36'} castShadow={false} segments={6} />
          <TSphere position={[0.06, -0.04, 0.32]} scale={[0.022, 0.014, 0.01]} color={'#6b4a36'} castShadow={false} segments={6} />
          {/* ears */}
          <TSphere position={[-0.2, 0.12, -0.04]} scale={[0.07, 0.045, 0.05]} rotation={[0, 0, 0.5]} color={COAT_DARK} castShadow={false} />
          <TSphere position={[0.2, 0.12, -0.04]} scale={[0.07, 0.045, 0.05]} rotation={[0, 0, -0.5]} color={COAT_DARK} castShadow={false} />
          <ChibiFace eyeY={0.04} eyeX={0.1} eyeZ={0.2} eyeR={0.045} blushY={-0.04} blushX={0.17} blushZ={0.16} blushR={0.05} />
          {/* the fez, with its gold tassel */}
          <group position={[0, 0.22, -0.02]} rotation={[-0.15, 0, 0.12]}>
            <TCyl radiusTop={0.095} radiusBottom={0.125} height={0.16} color={FEZ} outline segments={12} />
            <TCyl radiusTop={0.02} height={0.03} position={[0, 0.09, 0]} color={'#2f2a3a'} castShadow={false} segments={6} />
            <TCapsule radius={0.012} length={0.1} position={[0.1, 0.03, 0]} rotation={[0, 0, 0.25]} color={TOON.gold} castShadow={false} />
            <TSphere position={[0.115, -0.04, 0]} scale={0.03} color={TOON.gold} castShadow={false} segments={6} />
          </group>
        </group>
      </group>
    </group>
  )
}
