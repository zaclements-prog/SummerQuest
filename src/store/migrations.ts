import { HOME_ITEMS } from '../lib/home/catalog'
import { canPlace, footprintTiles, tileKey } from '../lib/home/grid'
import { localDayKey } from '../lib/dates'
import { adultPets, growthRank, hatchedPets, petStages } from '../lib/pets/growth'
import type { PetGrowth, ZonesLike } from '../lib/pets/growth'

/** Shape of the persisted fields the migrations touch (kept loose: old saves vary). */
export interface PersistedProgressV0 {
  stats?: { streakDays?: number; bestStreak?: number; lastStreakDate?: string; [k: string]: unknown }
  playDate?: string
  dailyClaimedDate?: string
  sessions?: { at: number; kind: string }[]
  placedItems?: { uid: string; itemId: string; gx: number; gz: number; rot: number }[]
  ownedHomeItems?: Record<string, number>
  zones?: unknown
  ownedCreatures?: unknown
  activeCreature?: unknown
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

/**
 * v2 → v3: pets. Every pet's stage is derived from the zones' stars (and
 * finished lessons, none recorded before v3), so:
 * - `lessonsDone` starts empty;
 * - `petsSeen` starts at each pet's current stage, so a player with lots of
 *   progress isn't met by a dozen celebrations at once;
 * - grown-up pets join `ownedCreatures` (kept, like `activeCreature`);
 * - a player whose pets have already hatched gets a World buddy: the most
 *   grown one (ties: catalog order), preferring one they aren't playing as.
 */
export function migrateV2toV3(p: PersistedProgressV0): PersistedProgressV0 {
  const zones = (p.zones && typeof p.zones === 'object' && !Array.isArray(p.zones) ? p.zones : {}) as ZonesLike
  // (a v2 save predates K–5: its stars are 2nd–4th grade stages, the default grade's set)
  const stages = petStages(zones, {}, null)
  const owned = Array.isArray(p.ownedCreatures) ? p.ownedCreatures.filter((id): id is string => typeof id === 'string') : []
  const petsSeen: Record<string, PetGrowth> = { ...stages }
  const hatched = hatchedPets(stages)
  const active = typeof p.activeCreature === 'string' ? p.activeCreature : null
  // most grown first; a stable sort keeps catalog order among equals
  const byGrowth = [...hatched].sort((a, b) => growthRank(stages[b]) - growthRank(stages[a]))
  const buddyPet = byGrowth.find((id) => id !== active) ?? byGrowth[0] ?? null
  return {
    ...p,
    lessonsDone: {},
    petsSeen,
    buddyPet,
    ownedCreatures: [...owned, ...adultPets(stages).filter((id) => !owned.includes(id))],
  }
}
