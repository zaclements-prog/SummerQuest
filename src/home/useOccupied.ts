import { useMemo } from 'react'
import { useProgress } from '../store/progress'
import { HOME_ITEMS } from '../lib/home/catalog'
import { footprintTiles, tileKey } from '../lib/home/grid'

/**
 * Set of "gx,gz" tile keys covered by placed furniture. Used both to validate
 * placement and to stop the avatar from walking through items. Pass the uid of an
 * item being moved to exclude its own footprint (so it can be nudged onto itself).
 */
export function useOccupiedTiles(ignoreUid?: string | null): Set<string> {
  const placed = useProgress((s) => s.placedItems)
  return useMemo(() => {
    const s = new Set<string>()
    for (const p of placed) {
      if (ignoreUid && p.uid === ignoreUid) continue
      const item = HOME_ITEMS.find((i) => i.id === p.itemId)
      if (item) for (const t of footprintTiles(item.footprint, p.gx, p.gz, p.rot)) s.add(tileKey(t))
    }
    return s
  }, [placed, ignoreUid])
}
