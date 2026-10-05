import Building from '../Building'
import PlacedItems from '../../home/world/PlacedItems'
import { areaById } from '../worldLayout'
import { TOON } from '../../toon/palette'

/**
 * Your House — the player's decorated Home room, inside a toon cottage. The
 * interior is the same 10×10 tile room as /home (PlacedItems), revealed when the
 * front walls and roof fade as you walk in.
 */
export default function House() {
  const a = areaById('house')!
  return (
    <Building id={a.id} cx={a.worldPos[0]} cz={a.worldPos[1]} size={a.size} wall={TOON.wallCream} roof={TOON.roofRed}>
      <PlacedItems />
    </Building>
  )
}
