import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import Building from '../Building'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { TOON } from '../../toon/palette'

/** Library — basic toon shell (detailing comes later). */
export default function Library({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('library')!
  const npc = npcPosition(a)!
  return (
    <group>
      <Building id={a.id} cx={a.worldPos[0]} cz={a.worldPos[1]} size={a.size} wall={TOON.stone} roof={TOON.roofBlue}>
      </Building>
      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef} />
    </group>
  )
}
