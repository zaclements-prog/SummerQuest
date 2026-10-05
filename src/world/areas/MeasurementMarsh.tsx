import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { TOON } from '../../toon/palette'
import { Lamp, Signpost } from '../../toon/props'
import Heron from './measurement-marsh/Heron'
import { Balance, GaugePost, Pond, RulerPier } from './measurement-marsh/MarshProps'
import { MARSH } from './colliders/measurement-marsh'

/**
 * Measurement Marsh: a lily pond on the east coast ringed with reeds and
 * cattails, a walkable pier striped and notched like a giant ruler, a tall
 * red-and-white water gauge at its end, and a balance scale weighing an apple.
 * Inch the heron (rain boots, ruler) waits by the path.
 */
export default function MeasurementMarsh({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('measurement-marsh')!
  const npc = npcPosition(a)!
  return (
    <group>
      <Pond />
      <RulerPier />
      <GaugePost />
      <Balance />

      <Signpost position={[MARSH.sign[0], 0, MARSH.sign[1]]} rotation={Math.PI / 4} color={TOON.flowerYellow} />
      <Lamp position={[MARSH.lamp[0], 0, MARSH.lamp[1]]} />

      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef} facing={0.45}>
        <Heron />
      </Npc>
    </group>
  )
}
