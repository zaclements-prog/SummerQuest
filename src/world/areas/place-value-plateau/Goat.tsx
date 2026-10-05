import { TorusGeometry } from 'three'
import { TOON } from '../../../toon/palette'
import { toonMaterial } from '../../../toon/materials'
import { geo } from '../../../toon/geometry'
import { ToonInstances, type InstanceSpec } from '../../../toon/Scatter'
import { TBox, TCapsule, TCone, TCyl, TSphere, TTorus, type Vec3 } from '../../../toon/shapes'

const FUR = '#f8f1e4'
const FUR_SHADE = '#e9dcc6'
const HORN = '#c9a87c'
const HOOF = '#7a5a48'
const PACK = TOON.roofTeal
const ROD = '#ff8a6b' // the "tens" color from the monument

/** A curled horn: a ¾ torus arc (shared geometry, built once). */
const hornGeo = new TorusGeometry(0.13, 0.052, 6, 12, Math.PI * 1.2)

/** A tiny ten-rod hiking stick: ten little cubes stacked up. */
const ROD_CUBES: InstanceSpec[] = Array.from({ length: 10 }, (_, i) => ({
  x: 0,
  y: 0.05 + i * 0.085,
  z: 0,
  color: i % 2 ? ROD : '#ff9f80',
}))

function Eye({ position, size = 0.048 }: { position: Vec3; size?: number }) {
  return (
    <group position={position}>
      <TSphere scale={[size, size * 1.15, size]} color={TOON.eye} castShadow={false} segments={10} />
      <TSphere position={[size * 0.35, size * 0.45, size * 0.7]} scale={size * 0.36} color={TOON.white} emissive={TOON.white} emissiveIntensity={0.9} castShadow={false} segments={6} />
    </group>
  )
}

/**
 * Pip the mountain goat: a chibi hiker with curly horns, a little beard, a teal
 * backpack with a bedroll, and a ten-rod (ten stacked cubes) for a walking stick.
 * Feet on y = 0.22 (the stage top), facing +z.
 */
export default function Goat() {
  return (
    <group position={[0, 0.22, 0]}>
      {/* legs + hooves */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.11, 0, 0.02]}>
          <TCapsule radius={0.075} length={0.1} position={[0, 0.14, 0]} color={FUR_SHADE} />
          <TCyl radiusTop={0.07} radiusBottom={0.085} height={0.07} position={[0, 0.035, 0.01]} color={HOOF} castShadow={false} />
        </group>
      ))}

      {/* body + scarf */}
      <TCapsule radius={0.23} length={0.14} position={[0, 0.4, 0]} color={FUR} outline />
      <TSphere position={[0, 0.36, 0.13]} scale={[0.15, 0.17, 0.11]} color={TOON.white} castShadow={false} />
      <TTorus radius={0.17} tube={0.055} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.63, 0]} color={TOON.flowerYellow} castShadow={false} />

      {/* backpack: pack, flap, bedroll, straps */}
      <TBox size={[0.36, 0.38, 0.2]} radius={0.07} position={[0, 0.44, -0.26]} color={PACK} outline />
      <TBox size={[0.38, 0.13, 0.22]} radius={0.05} position={[0, 0.6, -0.26]} color={TOON.flowerYellow} castShadow={false} />
      <TCyl radiusTop={0.08} height={0.44} rotation={[0, 0, Math.PI / 2]} position={[0, 0.72, -0.27]} color={TOON.coral} outline />
      {[-1, 1].map((s) => (
        <TBox key={s} size={[0.06, 0.32, 0.06]} radius={0.02} position={[s * 0.13, 0.5, 0.17]} rotation={[0.12, 0, 0]} color={PACK} castShadow={false} />
      ))}

      {/* arms: left waves a little, right holds the ten-rod */}
      <TCapsule radius={0.065} length={0.13} position={[-0.27, 0.46, 0.04]} rotation={[0, 0, 0.6]} color={FUR} />
      <TCapsule radius={0.065} length={0.13} position={[0.26, 0.43, 0.08]} rotation={[0.4, 0, -0.35]} color={FUR} />
      <group position={[0.33, -0.05, 0.16]}>
        <ToonInstances geometry={geo.box(0.075, 0.075, 0.075, 0.018)} color={TOON.white} items={ROD_CUBES} />
      </group>

      {/* head */}
      <group position={[0, 0.9, 0.02]}>
        <TSphere scale={[0.3, 0.28, 0.27]} color={FUR} outline />
        {/* muzzle + nose + beard */}
        <TSphere position={[0, -0.08, 0.2]} scale={[0.15, 0.11, 0.11]} color={TOON.white} castShadow={false} />
        <TSphere position={[0, -0.04, 0.3]} scale={[0.045, 0.03, 0.03]} color={TOON.flowerPink} castShadow={false} segments={8} />
        <TCone radius={0.06} height={0.15} rotation={[Math.PI - 0.25, 0, 0]} position={[0, -0.22, 0.18]} color={FUR_SHADE} castShadow={false} segments={6} />
        {/* eyes + blush */}
        <Eye position={[-0.11, 0.03, 0.235]} />
        <Eye position={[0.11, 0.03, 0.235]} />
        <TSphere position={[-0.19, -0.06, 0.19]} scale={[0.055, 0.03, 0.02]} rotation={[0, -0.6, 0]} color={TOON.blush} castShadow={false} segments={8} />
        <TSphere position={[0.19, -0.06, 0.19]} scale={[0.055, 0.03, 0.02]} rotation={[0, 0.6, 0]} color={TOON.blush} castShadow={false} segments={8} />
        {/* floppy ears */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.29, 0.04, -0.02]} rotation={[0, 0, s * -0.5]}>
            <TSphere scale={[0.13, 0.05, 0.075]} color={FUR} castShadow={false} />
            <TSphere position={[0, 0.01, 0.02]} scale={[0.09, 0.03, 0.045]} color={TOON.blossom} castShadow={false} segments={8} />
          </group>
        ))}
        {/* curly horns sweeping back */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.12, 0.2, -0.04]} rotation={[0, 0, -s * 0.35]}>
            {/* arc starts at the forehead, rises and curls back and down */}
            <mesh geometry={hornGeo} material={toonMaterial(HORN)} rotation={[0, -Math.PI / 2, 0]} castShadow />
          </group>
        ))}
        {/* tuft */}
        <TSphere position={[0, 0.27, 0.06]} scale={[0.07, 0.05, 0.06]} color={FUR_SHADE} castShadow={false} segments={8} />
      </group>
    </group>
  )
}
