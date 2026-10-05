import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import Building from '../Building'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { TOON } from '../../toon/palette'
import { useBuildingFade } from '../town/buildingStyle'
import { LibraryInterior, Portico, ReadingBench } from '../town/LibraryParts'
import Bookworm from '../town/Bookworm'

const ROOF = TOON.roofBlue

/**
 * Library — a pale-blue reading house with a grand little portico (white columns,
 * a pediment with an open-book emblem, blue banners). Inside (when the front
 * walls fade): bookcases along the back walls, a round rug with floor cushions,
 * an armchair and a lamp table. A reading bench sits against the east wall, and
 * the bookworm (hub NPC) waits on the doorstep.
 */
export default function Library({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('library')!
  const npc = npcPosition(a)!
  const fade = useBuildingFade(a.id)
  return (
    <group>
      <Building
        id={a.id}
        cx={a.worldPos[0]}
        cz={a.worldPos[1]}
        size={a.size}
        wall={TOON.wallBlue}
        roof={ROOF}
        trim={TOON.flowerWhite}
        band={TOON.stone}
        floor={TOON.wood}
        shutters={TOON.roofBlue}
        doorHood={false}
        frontWindows={false}
        fadeWhenHiding
      >
        <Portico roof={ROOF} opacity={fade.wall} />
        <LibraryInterior />
      </Building>
      <ReadingBench />
      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef}>
        <Bookworm />
      </Npc>
    </group>
  )
}
