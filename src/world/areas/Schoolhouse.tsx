import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import Building from '../Building'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { TOON } from '../../toon/palette'

/** Schoolhouse — basic toon shell (detailing comes later). */
export default function Schoolhouse({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('schoolhouse')!
  const npc = npcPosition(a)!
  return (
    <group>
      <Building id={a.id} cx={a.worldPos[0]} cz={a.worldPos[1]} size={a.size} wall={TOON.brick} roof={TOON.roofTeal}>
      </Building>
      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef} />
    </group>
  )
}
