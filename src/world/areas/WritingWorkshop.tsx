import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import Building from '../Building'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { TOON } from '../../toon/palette'
import Interior from './writing-workshop/Interior'
import Garden from './writing-workshop/Garden'
import CatAuthor from './writing-workshop/CatAuthor'

/**
 * Writing Workshop — a warm plum-roofed cottage whose cosy writing room (desks,
 * typewriter, ink and quill, bookshelf, rug, string lights) shows when you step
 * inside; outside, a giant pencil writes loops across the lawn among flower
 * planters and paper airplanes, beside a story mailbox and an ink-bottle sign.
 * The cat author waits on the doorstep with her quill.
 */
export default function WritingWorkshop({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('writing-workshop')!
  const npc = npcPosition(a)!
  return (
    <group>
      <Building id={a.id} cx={a.worldPos[0]} cz={a.worldPos[1]} size={a.size} wall={TOON.wallWarm} roof={TOON.roofPlum}>
        <Interior />
      </Building>
      <Garden />
      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef}>
        <CatAuthor />
      </Npc>
    </group>
  )
}
