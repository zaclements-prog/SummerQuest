export interface Vec2 {
  x: number
  y: number
}

export type TowerKind = 'cannon'
export type EnemyKind = 'grunt'

export interface TowerStats {
  cost: number
  range: number
  damage: number
  fireRateHz: number
  projectileSpeed: number
  color: string
  emoji: string
  label: string
}

export interface EnemyStats {
  hp: number
  speed: number // pixels per second along path
  reward: number
  size: number
  emoji: string
  color: string
}

export interface Tower {
  id: number
  kind: TowerKind
  pos: Vec2
  cooldown: number
  level: number
}

export interface Enemy {
  id: number
  kind: EnemyKind
  hp: number
  maxHp: number
  pathT: number // 0..1 along path
  alive: boolean
  reachedEnd: boolean
}

export interface Projectile {
  id: number
  pos: Vec2
  target: number // enemy id
  damage: number
  speed: number
  alive: boolean
}

export interface FloatingText {
  id: number
  pos: Vec2
  text: string
  color: string
  ageMs: number
}

export interface Wave {
  enemyCount: number
  enemyKind: EnemyKind
  spawnIntervalMs: number
  hpScale: number
}

export interface GameState {
  width: number
  height: number
  pathPoints: Vec2[]
  pathLength: number
  gold: number
  lives: number
  wave: number
  waveProgress: 'idle' | 'spawning' | 'in-progress' | 'between-waves'
  waveSpawnedCount: number
  waveTotal: number
  waveTimerMs: number
  betweenWaveMs: number
  towers: Tower[]
  enemies: Enemy[]
  projectiles: Projectile[]
  floats: FloatingText[]
  nextId: number
  kills: number
  isGameOver: boolean
  hasWon: boolean
}

export interface PendingPurchase {
  kind: 'placeTower'
  towerKind: TowerKind
  pos: Vec2
  cost: number
}
