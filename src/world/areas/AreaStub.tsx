import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { TOON } from '../../toon/palette'
import { TBlob, TCone } from '../../toon/shapes'
import { Lamp, Signpost } from '../../toon/props'

/**
 * Placeholder for an area that hasn't been built in the toon style yet: a simple
 * landmark mound at the area's center, a signpost and lamp by the NPC, and the
 * gateway NPC itself (so the area is fully playable).
 */
export default function AreaStub({ id, posRef, color = TOON.mint }: { id: string; posRef: RefObject<Vector3>; color?: string }) {
  const a = areaById(id)!
  const [cx, cz] = a.worldPos
  const npc = npcPosition(a)!
  return (
    <group>
      <TBlob position={[cx, 0.6, cz]} scale={[2.2, 1.2, 2.2]} color={color} outline />
      <TCone radius={0.6} height={1.6} position={[cx, 2.2, cz]} color={TOON.flowerYellow} outline />
      <Signpost position={[npc[0] + 1.2, 0, npc[1] + 0.4]} />
      <Lamp position={[npc[0] - 1.1, 0, npc[1] + 0.3]} />
      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef} />
    </group>
  )
}
