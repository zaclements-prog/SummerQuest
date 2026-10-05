import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import Building from '../Building'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { TOON } from '../../toon/palette'
import { useBuildingFade } from '../town/buildingStyle'
import { SCHOOL_YARD } from '../town/townData'
import { BellTower, ChalkboardSign, Flagpole, Playground, SchoolInterior } from '../town/SchoolhouseParts'
import OwlTeacher from '../town/OwlTeacher'

const WALL = TOON.brick
const ROOF = TOON.roofTeal
const TRIM = TOON.wallCream

/**
 * Schoolhouse — a little red schoolhouse with white trim and a bell tower. Inside
 * (when the front walls fade): a chalkboard under paper bunting, the teacher's
 * desk, two rows of little desks either side of a rug-covered aisle, cubbies and
 * a clock. Outside: an A-frame chalkboard, a flagpole and, across the path, a
 * swing set and slide. The owl teacher (hub NPC) waits by the door.
 */
export default function Schoolhouse({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('schoolhouse')!
  const npc = npcPosition(a)!
  const fade = useBuildingFade(a.id)
  const [cx, cz] = SCHOOL_YARD.chalkboard
  const [fx, fz] = SCHOOL_YARD.flagpole
  return (
    <group>
      <Building id={a.id} cx={a.worldPos[0]} cz={a.worldPos[1]} size={a.size} wall={WALL} roof={ROOF} trim={TRIM} floor={TOON.woodLight} fadeWhenHiding>
        <BellTower size={a.size ?? 6} roof={ROOF} trim={TRIM} opacity={fade.roof} />
        <SchoolInterior />
      </Building>
      <ChalkboardSign position={[cx, 0, cz]} rotation={0.45} />
      <Flagpole position={[fx, 0, fz]} />
      <Playground swings={SCHOOL_YARD.swings} slide={SCHOOL_YARD.slide} />
      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef}>
        <OwlTeacher />
      </Npc>
    </group>
  )
}
