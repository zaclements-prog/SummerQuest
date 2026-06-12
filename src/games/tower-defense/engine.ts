import {
  BETWEEN_WAVE_MS,
  ENEMY_STATS,
  STARTING_GOLD,
  STARTING_LIVES,
  TOWER_STATS,
  WAVES,
  distToPath,
  makePath,
  pathLength,
  pointAtT,
} from './config'
import type { GameState, TowerKind, Vec2 } from './types'

export function createInitialState(width: number, height: number): GameState {
  const pathPoints = makePath(width, height)
  return {
    width,
    height,
    pathPoints,
    pathLength: pathLength(pathPoints),
    gold: STARTING_GOLD,
    lives: STARTING_LIVES,
    wave: 0,
    waveProgress: 'idle',
    waveSpawnedCount: 0,
    waveTotal: 0,
    waveTimerMs: 0,
    betweenWaveMs: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    floats: [],
    nextId: 1,
    kills: 0,
    isGameOver: false,
    hasWon: false,
  }
}

export function startNextWave(s: GameState) {
  if (s.wave >= WAVES.length) {
    s.hasWon = true
    s.isGameOver = true
    return
  }
  const def = WAVES[s.wave]
  s.wave++
  s.waveProgress = 'spawning'
  s.waveSpawnedCount = 0
  s.waveTotal = def.enemyCount
  s.waveTimerMs = 0
}

export function canAffordTower(s: GameState, kind: TowerKind): boolean {
  return s.gold >= TOWER_STATS[kind].cost
}

export function canPlaceTower(s: GameState, pos: Vec2, minDist = 28): boolean {
  if (distToPath(pos, s.pathPoints) < 32) return false
  for (const t of s.towers) {
    if (Math.hypot(t.pos.x - pos.x, t.pos.y - pos.y) < minDist * 2) return false
  }
  if (pos.x < 10 || pos.y < 10 || pos.x > s.width - 10 || pos.y > s.height - 10) {
    return false
  }
  return true
}

export function placeTower(s: GameState, kind: TowerKind, pos: Vec2): boolean {
  const stats = TOWER_STATS[kind]
  if (s.gold < stats.cost) return false
  if (!canPlaceTower(s, pos)) return false
  s.gold -= stats.cost
  s.towers.push({
    id: s.nextId++,
    kind,
    pos,
    cooldown: 0,
    level: 1,
  })
  s.floats.push({
    id: s.nextId++,
    pos: { x: pos.x, y: pos.y - 18 },
    text: `-${stats.cost}`,
    color: '#fbbf24',
    ageMs: 0,
  })
  return true
}

export function tick(s: GameState, dtMs: number) {
  if (s.isGameOver) return
  const dt = dtMs / 1000

  // wave management
  if (s.waveProgress === 'spawning') {
    const def = WAVES[s.wave - 1]
    s.waveTimerMs += dtMs
    while (
      s.waveSpawnedCount < s.waveTotal &&
      s.waveTimerMs >= def.spawnIntervalMs
    ) {
      s.waveTimerMs -= def.spawnIntervalMs
      spawnEnemy(s, def.enemyKind, def.hpScale)
      s.waveSpawnedCount++
    }
    if (s.waveSpawnedCount >= s.waveTotal) {
      s.waveProgress = 'in-progress'
    }
  } else if (s.waveProgress === 'in-progress') {
    if (s.enemies.length === 0) {
      if (s.wave >= WAVES.length) {
        s.hasWon = true
        s.isGameOver = true
      } else {
        s.waveProgress = 'between-waves'
        s.betweenWaveMs = BETWEEN_WAVE_MS
      }
    }
  } else if (s.waveProgress === 'between-waves') {
    s.betweenWaveMs -= dtMs
    if (s.betweenWaveMs <= 0) {
      startNextWave(s)
    }
  }

  // enemies advance along path
  for (const e of s.enemies) {
    if (!e.alive) continue
    const stats = ENEMY_STATS[e.kind]
    e.pathT += (stats.speed * dt) / s.pathLength
    if (e.pathT >= 1) {
      e.alive = false
      e.reachedEnd = true
      s.lives--
      s.floats.push({
        id: s.nextId++,
        pos: { x: s.width - 30, y: 30 },
        text: '-1 ❤️',
        color: '#ef4444',
        ageMs: 0,
      })
      if (s.lives <= 0) {
        s.isGameOver = true
      }
    }
  }

  // tower targeting + firing
  for (const t of s.towers) {
    t.cooldown -= dt
    if (t.cooldown > 0) continue
    const stats = TOWER_STATS[t.kind]
    let bestId = -1
    let bestT = -1
    for (const e of s.enemies) {
      if (!e.alive) continue
      const pos = pointAtT(s.pathPoints, e.pathT, s.pathLength)
      const d = Math.hypot(pos.x - t.pos.x, pos.y - t.pos.y)
      if (d <= stats.range && e.pathT > bestT) {
        bestT = e.pathT
        bestId = e.id
      }
    }
    if (bestId >= 0) {
      s.projectiles.push({
        id: s.nextId++,
        pos: { ...t.pos },
        target: bestId,
        damage: stats.damage,
        speed: stats.projectileSpeed,
        alive: true,
      })
      t.cooldown = 1 / stats.fireRateHz
    }
  }

  // projectiles travel
  for (const p of s.projectiles) {
    if (!p.alive) continue
    const target = s.enemies.find((e) => e.id === p.target && e.alive)
    if (!target) {
      p.alive = false
      continue
    }
    const tp = pointAtT(s.pathPoints, target.pathT, s.pathLength)
    const dx = tp.x - p.pos.x
    const dy = tp.y - p.pos.y
    const dist = Math.hypot(dx, dy)
    const step = p.speed * dt
    if (dist <= step) {
      // hit
      target.hp -= p.damage
      if (target.hp <= 0) {
        target.alive = false
        const stats = ENEMY_STATS[target.kind]
        s.gold += stats.reward
        s.kills++
        s.floats.push({
          id: s.nextId++,
          pos: { ...tp },
          text: `+${stats.reward}`,
          color: '#fbbf24',
          ageMs: 0,
        })
      }
      p.alive = false
    } else {
      p.pos.x += (dx / dist) * step
      p.pos.y += (dy / dist) * step
    }
  }

  // floats age
  for (const f of s.floats) {
    f.ageMs += dtMs
    f.pos.y -= 18 * dt
  }

  // cleanup
  s.enemies = s.enemies.filter((e) => e.alive)
  s.projectiles = s.projectiles.filter((p) => p.alive)
  s.floats = s.floats.filter((f) => f.ageMs < 1100)
}

function spawnEnemy(s: GameState, kind: 'grunt', hpScale: number) {
  const stats = ENEMY_STATS[kind]
  const hp = Math.round(stats.hp * hpScale)
  s.enemies.push({
    id: s.nextId++,
    kind,
    hp,
    maxHp: hp,
    pathT: 0,
    alive: true,
    reachedEnd: false,
  })
}
