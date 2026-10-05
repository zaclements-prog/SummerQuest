import Building from '../Building'
import PlacedItems from '../../home/world/PlacedItems'
import { areaById } from '../worldLayout'
import { TOON } from '../../toon/palette'
import HouseYard, { Dormers } from '../town/HouseYard'
import TownDecor from '../town/TownDecor'

/**
 * Your House — the player's decorated Home room, inside a toon cottage with
 * shutters and flower boxes. The interior is the same 10×10 tile room as /home
 * (PlacedItems), revealed when the front walls and roof fade as you walk in.
 * The House also hosts the town's shared dressing (lanes, lawns, trees, lamps).
 */
export default function House() {
  const a = areaById('house')!
  return (
    <group>
      <Building
        id={a.id}
        cx={a.worldPos[0]}
        cz={a.worldPos[1]}
        size={a.size}
        wall={TOON.wallCream}
        roof={TOON.roofRed}
        shutters={TOON.roofTeal}
        windowBoxes
        fadeWhenHiding
      >
        <Dormers size={a.size ?? 10} xs={[-2.9, 2.9]} wall={TOON.wallCream} roof={TOON.roofRed} trim={TOON.woodDark} />
        <PlacedItems />
      </Building>
      <HouseYard />
      <TownDecor />
    </group>
  )
}
