/** 10×10 floor. Tile (0,0) is a corner; world origin is the floor centre. */
export const GRID_SIZE = 10
export const TILE = 1 // world units per tile

export interface Footprint { w: number; d: number }
export interface Tile { gx: number; gz: number }

const HALF = (GRID_SIZE * TILE) / 2

/** Centre of a tile in world space (y=0 floor plane). */
export function tileToWorld(gx: number, gz: number): { x: number; z: number } {
  return { x: (gx + 0.5) * TILE - HALF, z: (gz + 0.5) * TILE - HALF }
}

/** World point → tile indices (floored; may be out of range — callers check). */
export function worldToTile(x: number, z: number): Tile {
  return { gx: Math.floor((x + HALF) / TILE), gz: Math.floor((z + HALF) / TILE) }
}

/** Tiles an item covers at (gx,gz) given rotation. 90°/270° swap w/d. */
export function footprintTiles(fp: Footprint, gx: number, gz: number, rot: number): Tile[] {
  const swap = rot === 90 || rot === 270
  const w = swap ? fp.d : fp.w
  const d = swap ? fp.w : fp.d
  const out: Tile[] = []
  for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) out.push({ gx: gx + dx, gz: gz + dz })
  return out
}

const key = (t: Tile) => `${t.gx},${t.gz}`

/** True if the footprint at (gx,gz,rot) is fully in-bounds and unoccupied. */
export function canPlace(occupied: Set<string>, fp: Footprint, gx: number, gz: number, rot: number): boolean {
  for (const t of footprintTiles(fp, gx, gz, rot)) {
    if (t.gx < 0 || t.gz < 0 || t.gx >= GRID_SIZE || t.gz >= GRID_SIZE) return false
    if (occupied.has(key(t))) return false
  }
  return true
}

export const tileKey = key
