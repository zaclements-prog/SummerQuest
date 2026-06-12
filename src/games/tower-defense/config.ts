import type { EnemyStats, TowerStats, Vec2, Wave } from './types'

export const TOWER_STATS: Record<string, TowerStats> = {
  cannon: {
    cost: 25,
    range: 110,
    damage: 1,
    fireRateHz: 1.25,
    projectileSpeed: 380,
    color: '#3b82f6',
    emoji: '🏰',
    label: 'Cannon Tower',
  },
}

export const ENEMY_STATS: Record<string, EnemyStats> = {
  grunt: {
    hp: 2,
    speed: 60,
    reward: 8,
    size: 22,
    emoji: '👾',
    color: '#dc2626',
  },
}

export const WAVES: Wave[] = [
  { enemyCount: 4, enemyKind: 'grunt', spawnIntervalMs: 1200, hpScale: 1.0 },
  { enemyCount: 6, enemyKind: 'grunt', spawnIntervalMs: 1100, hpScale: 1.0 },
  { enemyCount: 8, enemyKind: 'grunt', spawnIntervalMs: 950, hpScale: 1.2 },
  { enemyCount: 10, enemyKind: 'grunt', spawnIntervalMs: 850, hpScale: 1.4 },
  { enemyCount: 12, enemyKind: 'grunt', spawnIntervalMs: 750, hpScale: 1.6 },
  { enemyCount: 14, enemyKind: 'grunt', spawnIntervalMs: 700, hpScale: 1.9 },
  { enemyCount: 16, enemyKind: 'grunt', spawnIntervalMs: 650, hpScale: 2.2 },
  { enemyCount: 18, enemyKind: 'grunt', spawnIntervalMs: 600, hpScale: 2.6 },
  { enemyCount: 22, enemyKind: 'grunt', spawnIntervalMs: 550, hpScale: 3.0 },
  { enemyCount: 28, enemyKind: 'grunt', spawnIntervalMs: 500, hpScale: 3.6 },
]

export const STARTING_GOLD = 75
export const STARTING_LIVES = 10
export const BETWEEN_WAVE_MS = 5000

export function makePath(w: number, h: number): Vec2[] {
  // S-curve path from left edge to right edge
  return [
    { x: 0, y: h * 0.5 },
    { x: w * 0.18, y: h * 0.5 },
    { x: w * 0.28, y: h * 0.2 },
    { x: w * 0.5, y: h * 0.2 },
    { x: w * 0.6, y: h * 0.78 },
    { x: w * 0.82, y: h * 0.78 },
    { x: w * 0.92, y: h * 0.42 },
    { x: w, y: h * 0.42 },
  ]
}

export function pathLength(points: Vec2[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    total += Math.hypot(dx, dy)
  }
  return total
}

export function pointAtT(points: Vec2[], t: number, totalLen: number): Vec2 {
  const target = totalLen * t
  let traveled = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    const segLen = Math.hypot(dx, dy)
    if (traveled + segLen >= target) {
      const into = (target - traveled) / segLen
      return {
        x: points[i - 1].x + dx * into,
        y: points[i - 1].y + dy * into,
      }
    }
    traveled += segLen
  }
  return points[points.length - 1]
}

export function distToPath(p: Vec2, points: Vec2[]): number {
  let min = Infinity
  for (let i = 1; i < points.length; i++) {
    const d = distToSegment(p, points[i - 1], points[i])
    if (d < min) min = d
  }
  return min
}

function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = a.x + t * dx
  const cy = a.y + t * dy
  return Math.hypot(p.x - cx, p.y - cy)
}
