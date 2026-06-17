import Building from '../Building'
import PlacedItems from '../../home/world/PlacedItems'
import { areaById } from '../worldLayout'

export default function House() {
  const a = areaById('house')!
  return (
    <Building id={a.id} cx={a.worldPos[0]} cz={a.worldPos[1]} size={a.size ?? 10} wall="#cfe3e8" roof="#c0573c">
      {/* the player's actual decorated furniture (same store as /home) */}
      <PlacedItems />
    </Building>
  )
}
