import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { TOON } from '../../toon/palette'
import { Lamp, Signpost } from '../../toon/props'
import Beaver from './data-delta/Beaver'
import { CrateChart, PieBed, Sandbars, TallyFence } from './data-delta/DeltaProps'
import { DELTA } from './colliders/data-delta'

/**
 * Data Delta: where the river runs out to the east coast. Sandbars and reeds
 * line the bank; a bar chart of painted crates (each bar flying its own flag)
 * stands by the stage, a raised flower bed is planted as a pie chart, and the
 * riverside fence is built like tally marks. Tally the beaver keeps score.
 */
export default function DataDelta({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('data-delta')!
  const npc = npcPosition(a)!
  return (
    <group>
      <Sandbars />
      <CrateChart />
      <PieBed />
      <TallyFence />

      <Signpost position={[DELTA.sign[0], 0, DELTA.sign[1]]} rotation={Math.PI / 4} color={TOON.mint} />
      <Lamp position={[DELTA.lamp[0], 0, DELTA.lamp[1]]} />

      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef} facing={0.45}>
        <Beaver />
      </Npc>
    </group>
  )
}
