import { HOME_ITEMS } from './catalog'
import { footprintTiles, tileKey, worldToTile, tileToWorld, GRID_SIZE } from './grid'
import type { Tile } from './grid'

/** The fields of a placed item that occupancy needs (structurally the store's PlacedItem). */
export interface PlacedLike { uid: string; itemId: string; gx: number; gz: number; rot: number }

const inGrid = (t: Tile) => t.gx >= 0 && t.gz >= 0 && t.gx < GRID_SIZE && t.gz < GRID_SIZE

/**
 * "gx,gz" keys covered by placed items, used to validate placement. Every item
 * counts here, walkable ones (rugs) included. Pass the uid of an item being moved
 * to leave out its own footprint.
 */
export function occupiedTiles(placed: readonly PlacedLike[], ignoreUid?: string | null): Set<string> {
  const s = new Set<string>()
  for (const p of placed) {
    if (ignoreUid && p.uid === ignoreUid) continue
    const item = HOME_ITEMS.find((i) => i.id === p.itemId)
    if (item) for (const t of footprintTiles(item.footprint, p.gx, p.gz, p.rot)) s.add(tileKey(t))
  }
  return s
}

/**
 * Tiles that stop the avatar, each mapped to the uid of the item covering it.
 * Walkable items (rugs) are left out: the creature walks over them.
 */
export function avatarBlockers(placed: readonly PlacedLike[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const p of placed) {
    const item = HOME_ITEMS.find((i) => i.id === p.itemId)
    if (!item || item.walkable) continue
    for (const t of footprintTiles(item.footprint, p.gx, p.gz, p.rot)) m.set(tileKey(t), p.uid)
  }
  return m
}

/**
 * True when the avatar, centred at (fromX, fromZ), may not move a body point onto
 * (x, z). Furniture blocks, except the item the avatar is standing in, so a
 * creature that spawned inside furniture or had it dropped on top of it can always
 * walk out (but can't walk back in). Points off the grid are left to the room
 * bounds.
 */
export function avatarBlockedAt(
  blockers: ReadonlyMap<string, string>,
  x: number, z: number, fromX: number, fromZ: number,
): boolean {
  const t = worldToTile(x, z)
  if (!inGrid(t)) return false
  const uid = blockers.get(tileKey(t))
  if (uid === undefined) return false
  return blockers.get(tileKey(worldToTile(fromX, fromZ))) !== uid
}

/**
 * The free tile closest to `from` (by centre distance, ties broken by scan
 * order), `from` itself when it's free, or null when every tile is blocked.
 */
export function nearestFreeTile(blockers: ReadonlyMap<string, string>, from: Tile): Tile | null {
  let best: Tile | null = null
  let bestD = Infinity
  for (let gz = 0; gz < GRID_SIZE; gz++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      if (blockers.has(tileKey({ gx, gz }))) continue
      const d = (gx - from.gx) ** 2 + (gz - from.gz) ** 2
      if (d < bestD) { bestD = d; best = { gx, gz } }
    }
  }
  return best
}

/**
 * Where the avatar should appear: (x, z) itself when that spot is clear, else the
 * centre of the nearest free tile, so a creature doesn't start inside the bed.
 */
export function avatarSpawnPoint(blockers: ReadonlyMap<string, string>, x = 0, z = 0): { x: number; z: number } {
  const t = worldToTile(x, z)
  if (!blockers.has(tileKey(t))) return { x, z }
  const free = nearestFreeTile(blockers, t)
  return free ? tileToWorld(free.gx, free.gz) : { x, z }
}
