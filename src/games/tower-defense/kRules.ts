import { TOWER_STATS, distToPath, makePath } from './config'
import type { GameState, TdRules, TowerStats, Vec2, Wave } from './types'

/**
 * Counting Towers: the tower defense a kindergartner plays (K–1, the
 * `k-towers-*` stages; voice-first, see KTowers.tsx). The same board and
 * engine as grades 2–4, with gentler rules:
 *
 * - a few short waves of slow critters, and no clock between them: the next
 *   wave waits for the big ▶;
 * - no gold: a tower is built (or made stronger) by answering a counting
 *   question, on one of a few big build spots;
 * - a tower grows with each power-up (three levels): it shoots faster and
 *   reaches further;
 * - the base never falls: when the last heart would go, the wave just ends
 *   and is tried again, a little easier (engine `baseFalls: 'endWave'`).
 *
 * Pure data and helpers (no React), so the tests and the component share them.
 */

/** Guide ids: each build spot (`td-spot-<i>`), and the big ▶. */
export const tdSpot = (i: number) => `td-spot-${i}`
export const TD_GO = 'td-go'

/** Hearts at the house (shown as icons), full again at each wave's start: three critters getting by end the wave. */
export const K_HEARTS = 3
/** A tower's top level (built at 1; each power-up adds one). */
export const K_MAX_LEVEL = 3

/** The board (the engine's units; the same S-shaped path as grades 2–4). */
export const K_BOARD = { w: 720, h: 420 } as const

/** Where towers can go: big round spots beside the path, best first (the guide points at the first free one). */
export const K_SPOTS: readonly Vec2[] = [
  { x: 280, y: 200 },
  { x: 510, y: 220 },
  { x: 75, y: 120 },
  { x: 330, y: 335 },
  { x: 610, y: 100 },
  { x: 90, y: 315 },
]
/** A spot's radius (board units): about 64 px or more across on a phone. */
export const K_SPOT_R = 40

/**
 * The waves: three (four on the last stage), short and slow. Wave 1 is easy
 * with two towers; each one after asks for a tower more (or a stronger one).
 */
const WAVES_3: Wave[] = [
  { enemyCount: 3, enemyKind: 'grunt', spawnIntervalMs: 2600, hpScale: 1 },
  { enemyCount: 4, enemyKind: 'grunt', spawnIntervalMs: 2300, hpScale: 1 },
  { enemyCount: 5, enemyKind: 'grunt', spawnIntervalMs: 2100, hpScale: 1.5 },
]
const WAVES_4: Wave[] = [...WAVES_3, { enemyCount: 6, enemyKind: 'grunt', spawnIntervalMs: 1900, hpScale: 1.5 }]

/** A tower at a level: each level past the first shoots half again as fast and reaches 20 further. */
export function kTowerStats(level: number): TowerStats {
  const base = TOWER_STATS.cannon
  const up = Math.max(0, Math.min(K_MAX_LEVEL, level) - 1)
  return { ...base, range: 125 + up * 20, fireRateHz: base.fireRateHz * (1 + 0.5 * up) }
}

/** The rules for a K stage with this many waves (3 or 4). */
export function kRules(waves: 3 | 4 = 3): TdRules {
  return {
    waves: waves === 4 ? WAVES_4 : WAVES_3,
    startingGold: 0,
    startingLives: K_HEARTS,
    betweenWaveMs: Number.POSITIVE_INFINITY,
    speedScale: 0.6,
    tower: (_kind, level) => kTowerStats(level),
    baseFalls: 'endWave',
  }
}

/** The tower standing on spot `i` (towers are placed exactly on their spot). */
export function towerOnSpot(s: GameState, i: number) {
  const p = K_SPOTS[i]
  return s.towers.find((t) => t.pos.x === p.x && t.pos.y === p.y)
}

/** Build a tower on spot `i` (no gold in K: the question was the price). False if the spot is taken. */
export function buildOnSpot(s: GameState, i: number): boolean {
  const p = K_SPOTS[i]
  if (!p || towerOnSpot(s, i)) return false
  s.towers.push({ id: s.nextId++, kind: 'cannon', pos: { x: p.x, y: p.y }, cooldown: 0, level: 1 })
  return true
}

/** Make the tower on spot `i` stronger (up to `K_MAX_LEVEL`). False if there is none, or it is at the top. */
export function powerUpSpot(s: GameState, i: number): boolean {
  const t = towerOnSpot(s, i)
  if (!t || t.level >= K_MAX_LEVEL) return false
  t.level++
  return true
}

/** Every heart back (each wave starts full). */
export function fillHearts(s: GameState) {
  s.lives = K_HEARTS
}

/** Can spot `i` take a question right now (empty, or a tower that can still grow)? */
export function spotOpen(s: GameState, i: number): boolean {
  const t = towerOnSpot(s, i)
  return !t || t.level < K_MAX_LEVEL
}

/** Every spot sits on the grass, clear of the path and of the other spots (checked by the tests). */
export function spotClearance(i: number): number {
  return distToPath(K_SPOTS[i], makePath(K_BOARD.w, K_BOARD.h))
}
