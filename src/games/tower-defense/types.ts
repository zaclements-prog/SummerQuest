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

/**
 * The rules a game is played by. Grades 2–4 play `CLASSIC_RULES` (config.ts:
 * today's numbers, unchanged); kindergarten's Counting Towers plays gentler
 * ones (kRules.ts): fewer, slower critters, no clock between waves, towers
 * that grow stronger, and a base that never falls.
 */
export interface TdRules {
  waves: Wave[]
  startingGold: number
  startingLives: number
  /** The pause before the next wave starts on its own (Infinity: it waits for the start button). */
  betweenWaveMs: number
  /** Critters walk at this share of their speed (1: as `ENEMY_STATS` says). */
  speedScale: number
  /** A tower's stats at a level (1: as built). */
  tower(kind: TowerKind, level: number): TowerStats
  /**
   * When the last life goes: `gameOver` (classic), or `endWave` (K–1, no
   * failing out): the critters still out go home, the lives fill up again,
   * and the same wave waits to be tried again, a little easier each time.
   */
  baseFalls: 'gameOver' | 'endWave'
}

export interface GameState {
  rules: TdRules
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
  /** Times the base would have fallen and the wave ended instead (`baseFalls: 'endWave'`). */
  setbacks: number
  /** Failed tries of the wave now being played (eases it: one critter fewer, a little less sturdy). */
  retries: number
  isGameOver: boolean
  hasWon: boolean
}

export interface PendingPurchase {
  kind: 'placeTower'
  towerKind: TowerKind
  pos: Vec2
  cost: number
}
