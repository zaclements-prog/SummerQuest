import { HOME_ITEMS } from '../lib/home/catalog'
import { canPlace, footprintTiles, tileKey } from '../lib/home/grid'
import { localDayKey } from '../lib/dates'

/** Shape of the persisted fields the migrations touch (kept loose: old saves vary). */
export interface PersistedProgressV0 {
  stats?: { streakDays?: number; bestStreak?: number; lastStreakDate?: string; [k: string]: unknown }
  playDate?: string
  dailyClaimedDate?: string
  sessions?: { at: number; kind: string }[]
  placedItems?: { uid: string; itemId: string; gx: number; gz: number; rot: number }[]
  ownedHomeItems?: Record<string, number>
  [k: string]: unknown
}

/**
 * Placed furniture that no longer fits the room (the floor shrank from 20×20 to
 * 10×10) or overlaps something placed earlier goes back into the inventory, so
 * it's never stranded outside the walls or lost.
 */
export function sanitizePlacements(
  placed: NonNullable<PersistedProgressV0['placedItems']>,
  owned: Record<string, number>,
) {
  const occupied = new Set<string>()
  const kept: typeof placed = []
  const nextOwned = { ...owned }
  for (const p of placed) {
    const item = HOME_ITEMS.find((i) => i.id === p.itemId)
    if (item && canPlace(occupied, item.footprint, p.gx, p.gz, p.rot)) {
      for (const t of footprintTiles(item.footprint, p.gx, p.gz, p.rot)) occupied.add(tileKey(t))
      kept.push(p)
    } else if (item) {
      nextOwned[p.itemId] = (nextOwned[p.itemId] ?? 0) + 1
    }
    // unknown item ids are dropped (nothing to render or return)
  }
  return { placedItems: kept, ownedHomeItems: nextOwned }
}

/**
 * v0 → v1: day keys switch from UTC dates to local dates, and stranded
 * furniture is returned to the inventory.
 *
 * A saved UTC key is at most one day ahead of the local date it was written on
 * (US evenings), so a key "in the future" is clamped to today. The daily-challenge
 * claim can be recovered exactly from the last daily session's timestamp.
 */
export function migrateV0toV1(p: PersistedProgressV0, now = Date.now()): PersistedProgressV0 {
  const today = localDayKey(now)
  const clamp = (k?: string) => (k && k > today ? today : k)
  const out: PersistedProgressV0 = { ...p }
  if (p.stats) {
    out.stats = {
      ...p.stats,
      lastStreakDate: clamp(p.stats.lastStreakDate),
      bestStreak: p.stats.bestStreak ?? p.stats.streakDays ?? 0,
    }
  }
  out.playDate = clamp(p.playDate)
  if (p.dailyClaimedDate) {
    const lastDaily = [...(p.sessions ?? [])].reverse().find((s) => s.kind === 'daily')
    out.dailyClaimedDate = lastDaily ? localDayKey(lastDaily.at) : clamp(p.dailyClaimedDate)
  }
  if (p.placedItems) {
    const r = sanitizePlacements(p.placedItems, p.ownedHomeItems ?? {})
    out.placedItems = r.placedItems
    out.ownedHomeItems = r.ownedHomeItems
  }
  return out
}
