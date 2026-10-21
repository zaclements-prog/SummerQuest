import { describe, expect, it } from 'vitest'
import { createInitialState, placeTower, startNextWave, tick } from '../engine'
import { BETWEEN_WAVE_MS, ENEMY_STATS, STARTING_GOLD, STARTING_LIVES, TOWER_STATS, WAVES } from '../config'
import type { GameState } from '../types'

/**
 * The 2nd–4th grade tower defense (td-arena) must play exactly as it did
 * before the kindergarten "Counting Towers" mode arrived. The golden traces
 * below were recorded from the engine BEFORE that work (commit a345988); any
 * change to the classic game's rules, numbers or timing changes a value here.
 */

/** A digest of everything that moves: rounded so the trace reads well, exact enough to catch any drift. */
function digest(s: GameState) {
  const r = (v: number) => Math.round(v * 1000) / 1000
  return {
    gold: s.gold,
    lives: s.lives,
    wave: s.wave,
    progress: s.waveProgress,
    spawned: s.waveSpawnedCount,
    kills: s.kills,
    enemies: s.enemies.map((e) => [e.id, e.hp, r(e.pathT)]),
    projectiles: s.projectiles.map((p) => [p.id, p.target, r(p.pos.x), r(p.pos.y)]),
    towers: s.towers.map((t) => [t.id, t.pos.x, t.pos.y, r(t.cooldown), t.level]),
    floats: s.floats.map((f) => f.text),
    over: s.isGameOver,
    won: s.hasWon,
  }
}

/**
 * Fixed-step play in 16 ms frames: every 50 frames, while there is gold for a
 * cannon, try the next spot in `spots` (a spot it can't use is skipped). A
 * digest every `every` frames, until the game ends or `maxFrames`.
 */
function play(spots: [number, number][], every: number, maxFrames = 60_000) {
  const s = createInitialState(720, 420)
  startNextWave(s)
  const trace: ReturnType<typeof digest>[] = []
  let next = 0
  let placed = 0
  let frames = 0
  for (let f = 1; f <= maxFrames && !s.isGameOver; f++) {
    if (f % 50 === 0 && next < spots.length && s.gold >= TOWER_STATS.cannon.cost) {
      if (placeTower(s, 'cannon', { x: spots[next][0], y: spots[next][1] })) placed++
      next++
    }
    tick(s, 16)
    frames = f
    if (f % every === 0) trace.push(digest(s))
  }
  return { s, trace, frames, placed }
}

/** A small string hash of a trace (FNV-1a), so the golden values stay short. */
function hash(x: unknown): string {
  const str = JSON.stringify(x)
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16)
}

const SPOTS: [number, number][] = [
  [150, 260],
  [300, 140],
  [470, 250],
  [620, 260], // too near the path: skipped
  [250, 40],
  [400, 380],
  [560, 150],
  [90, 150],
  [680, 90],
  [330, 260],
  [520, 400],
  [200, 360],
]

describe('classic tower defense (grades 2–4): unchanged', () => {
  it('keeps its numbers: 10 waves, 75 gold, 10 lives, a 25-gold cannon, 5 s between waves', () => {
    expect(WAVES.map((w) => [w.enemyCount, w.spawnIntervalMs, w.hpScale])).toEqual([
      [4, 1200, 1],
      [6, 1100, 1],
      [8, 950, 1.2],
      [10, 850, 1.4],
      [12, 750, 1.6],
      [14, 700, 1.9],
      [16, 650, 2.2],
      [18, 600, 2.6],
      [22, 550, 3],
      [28, 500, 3.6],
    ])
    expect([STARTING_GOLD, STARTING_LIVES, BETWEEN_WAVE_MS]).toEqual([75, 10, 5000])
    expect(TOWER_STATS.cannon).toMatchObject({ cost: 25, range: 110, damage: 1, fireRateHz: 1.25, projectileSpeed: 380 })
    expect(ENEMY_STATS.grunt).toMatchObject({ hp: 2, speed: 60, reward: 8, size: 22 })
    const s = createInitialState(720, 420)
    expect(digest(s)).toEqual({ gold: 75, lives: 10, wave: 0, progress: 'idle', spawned: 0, kills: 0, enemies: [], projectiles: [], towers: [], floats: [], over: false, won: false })
  })

  it('placement rules: gold, not on the path, not on a tower, not at the edge', () => {
    const s = createInitialState(720, 420)
    expect(placeTower(s, 'cannon', { x: 60, y: 210 })).toBe(false) // on the path
    expect(placeTower(s, 'cannon', { x: 5, y: 300 })).toBe(false) // the edge
    expect(placeTower(s, 'cannon', { x: 280, y: 200 })).toBe(true)
    expect(placeTower(s, 'cannon', { x: 300, y: 210 })).toBe(false) // too near the first
    expect(placeTower(s, 'cannon', { x: 520, y: 200 })).toBe(true)
    expect(placeTower(s, 'cannon', { x: 100, y: 330 })).toBe(true)
    expect(s.gold).toBe(0)
    expect(placeTower(s, 'cannon', { x: 600, y: 60 })).toBe(false) // no gold left
  })

  it('a defended run, buying towers with the gold it earns, plays the same frame for frame (golden trace)', () => {
    const { s, trace, frames, placed } = play(SPOTS, 400)
    expect([frames, placed, s.wave, s.kills, s.lives, s.gold, s.isGameOver, s.hasWon]).toEqual([13559, 11, 10, 124, 0, 792, true, false])
    expect(trace.length).toBe(33)
    expect(hash(trace)).toMatchInlineSnapshot(`"a0c3a3e4"`)
    expect(hash(digest(s))).toMatchInlineSnapshot(`"a204b26d"`)
  })

  it('an undefended base falls in wave 2: game over, not a win (golden trace)', () => {
    const { s, trace, frames } = play([], 500)
    expect(s.isGameOver).toBe(true)
    expect(s.hasWon).toBe(false)
    expect([frames, s.wave, s.lives, s.gold, s.kills]).toMatchInlineSnapshot(`
      [
        3257,
        2,
        0,
        75,
        0,
      ]
    `)
    expect(hash(trace)).toMatchInlineSnapshot(`"e6019f0e"`)
  })
})
