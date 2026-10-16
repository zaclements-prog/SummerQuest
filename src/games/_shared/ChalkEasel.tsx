import { geo } from '../../toon/geometry'
import { TOON } from '../../toon/palette'
import { TBox, TCyl } from '../../toon/shapes'
import { Instances, type Inst } from '../../world/town/kit'

/**
 * The A-frame chalk easel (Division Arena + Fraction Forge). The legs sit
 * BEHIND the panel plane so they never cross the writing surface (in front,
 * they occluded glyphs — an 8 read as a 3). Callers pass the chalk `items`
 * (see `chalkText`), drawn just off the green panel.
 */
export function ChalkEasel({
  items,
  position,
  rotation = [0, 0.55, 0],
}: {
  items: Inst[]
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      <TCyl radiusTop={0.07} height={2.15} position={[-1.2, 1.07, -0.06]} rotation={[-0.16, 0, 0.09]} color={TOON.woodDark} />
      <TCyl radiusTop={0.07} height={2.15} position={[1.2, 1.07, -0.06]} rotation={[-0.16, 0, -0.09]} color={TOON.woodDark} />
      <TCyl radiusTop={0.07} height={2.0} position={[0, 1.0, -0.45]} rotation={[0.3, 0, 0]} color={TOON.woodDark} />
      <group position={[0, 1.8, 0]} rotation={[-0.1, 0, 0]}>
        <TBox size={[3.5, 1.55, 0.1]} radius={0.05} color={TOON.wood} outline />
        <TBox size={[3.24, 1.28, 0.06]} radius={0.02} position={[0, 0, 0.04]} color={'#3f6b5a'} castShadow={false} />
        <group position={[0, 0, 0.08]}>
          <Instances geometry={geo.box(1, 1, 1, 0.2)} color={TOON.white} items={items} />
        </group>
        <TBox size={[3.4, 0.09, 0.16]} radius={0.03} position={[0, -0.76, 0.08]} color={TOON.flowerYellow} castShadow={false} />
      </group>
    </group>
  )
}
