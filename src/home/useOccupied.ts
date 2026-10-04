import { useMemo } from 'react'
import { useProgress } from '../store/progress'
import { occupiedTiles, avatarBlockers } from '../lib/home/occupancy'

/**
 * Set of "gx,gz" tile keys covered by placed furniture, used to validate
 * placement (walkable rugs included). Pass the uid of an item being moved to
 * exclude its own footprint (so it can be nudged onto itself).
 */
export function useOccupiedTiles(ignoreUid?: string | null): Set<string> {
  const placed = useProgress((s) => s.placedItems)
  return useMemo(() => occupiedTiles(placed, ignoreUid), [placed, ignoreUid])
}

/** Tiles that stop the avatar (walkable rugs excluded), mapped to the covering item's uid. */
export function useAvatarBlockers(): Map<string, string> {
  const placed = useProgress((s) => s.placedItems)
  return useMemo(() => avatarBlockers(placed), [placed])
}
