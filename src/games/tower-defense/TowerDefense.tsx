import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameProps } from '../../screens/GameRunner'
import type { GameState, PendingPurchase, Vec2 } from './types'
import { ENEMY_STATS, TOWER_STATS, pointAtT } from './config'
import {
  canAffordTower,
  canPlaceTower,
  createInitialState,
  placeTower,
  startNextWave,
  tick,
} from './engine'
import MathGate from './MathGate'
import { sfx } from '../../lib/sound'

const GAME_W = 720
const GAME_H = 420

export default function TowerDefense({ provider, onComplete }: GameProps) {
  const stateRef = useRef<GameState>(createInitialState(GAME_W, GAME_H))
  const [, force] = useState(0)
  const [selectedTower, setSelectedTower] = useState<'cannon' | null>('cannon')
  const [hoverPos, setHoverPos] = useState<Vec2 | null>(null)
  const [pending, setPending] = useState<PendingPurchase | null>(null)
  const pendingRef = useRef<PendingPurchase | null>(null)
  pendingRef.current = pending
  const completedRef = useRef(false)

  // RAF tick — runs once for component lifetime, reads pending via ref
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    const renderEvery = 1000 / 30 // re-render at 30fps
    const loop = (t: number) => {
      const dt = t - last
      last = t
      if (!pendingRef.current) {
        tick(stateRef.current, Math.min(dt, 50))
      }
      acc += dt
      if (acc >= renderEvery) {
        acc = 0
        force((n) => n + 1)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // detect end-of-game and report result
  useEffect(() => {
    const s = stateRef.current
    if (!s.isGameOver || completedRef.current) return
    completedRef.current = true
    setTimeout(() => {
      const wavesCleared = s.hasWon ? 10 : Math.max(0, s.wave - 1)
      const stars =
        wavesCleared >= 10 ? 3 : wavesCleared >= 6 ? 2 : wavesCleared >= 3 ? 1 : 0
      onComplete({
        stars,
        score: s.kills * 5 + wavesCleared * 20,
        correct: s.kills,
        total: s.kills + (s.enemies.filter((e) => e.reachedEnd).length || 0),
      })
    }, 1400)
  })

  function svgClick(evt: React.MouseEvent<SVGSVGElement>) {
    if (!selectedTower) return
    const svg = evt.currentTarget
    const pt = svg.createSVGPoint()
    pt.x = evt.clientX
    pt.y = evt.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const local = pt.matrixTransform(ctm.inverse())
    const pos: Vec2 = { x: local.x, y: local.y }
    const s = stateRef.current
    if (!canAffordTower(s, selectedTower)) {
      return
    }
    if (!canPlaceTower(s, pos)) {
      return
    }
    sfx.click()
    setPending({
      kind: 'placeTower',
      towerKind: selectedTower,
      pos,
      cost: TOWER_STATS[selectedTower].cost,
    })
  }

  function confirmPurchase() {
    if (!pending) return
    const s = stateRef.current
    if (pending.kind === 'placeTower') {
      placeTower(s, pending.towerKind, pending.pos)
    }
    setPending(null)
    force((n) => n + 1)
  }

  function startWaveClick() {
    sfx.enter()
    startNextWave(stateRef.current)
    force((n) => n + 1)
  }

  const s = stateRef.current
  const showStart =
    !s.isGameOver &&
    (s.waveProgress === 'idle' || s.waveProgress === 'between-waves')

  return (
    <div className="flex-1 flex flex-col items-center p-3">
      <StatsBar state={s} />

      <div
        className="relative w-full max-w-[760px] mt-2"
        style={{ aspectRatio: `${GAME_W} / ${GAME_H}` }}
      >
        <svg
          viewBox={`0 0 ${GAME_W} ${GAME_H}`}
          className="absolute inset-0 w-full h-full rounded-2xl shadow-xl"
          style={{
            background:
              'linear-gradient(180deg, #4ade80 0%, #16a34a 100%)',
            cursor: selectedTower ? 'crosshair' : 'default',
          }}
          onClick={svgClick}
          onMouseMove={(e) => {
            const svg = e.currentTarget
            const pt = svg.createSVGPoint()
            pt.x = e.clientX
            pt.y = e.clientY
            const ctm = svg.getScreenCTM()
            if (!ctm) return
            const l = pt.matrixTransform(ctm.inverse())
            setHoverPos({ x: l.x, y: l.y })
          }}
          onMouseLeave={() => setHoverPos(null)}
        >
          <PathView state={s} />
          <TowersView state={s} />
          <EnemiesView state={s} />
          <ProjectilesView state={s} />
          {hoverPos && selectedTower && !pending && (
            <PlacementPreview pos={hoverPos} state={s} />
          )}
          <FloatsView state={s} />
        </svg>

        {showStart && !s.isGameOver && (
          <button
            onClick={startWaveClick}
            className="absolute left-1/2 -translate-x-1/2 top-1/3 btn-quest bg-correct-500 text-white"
            style={{ borderColor: '#16a34a' }}
          >
            {s.wave === 0 ? '▶︎ Start Wave 1' : `▶︎ Start Wave ${s.wave + 1}`}
          </button>
        )}

        {s.isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-ocean-900/60 rounded-2xl">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-white text-ocean-900 rounded-3xl p-6 text-center max-w-xs"
            >
              <div className="text-5xl mb-2">{s.hasWon ? '🏆' : '💔'}</div>
              <div className="kid-text text-3xl">
                {s.hasWon ? 'Victory!' : 'Base destroyed'}
              </div>
              <div className="text-gray-600 mt-1">
                Wave reached: {s.wave}
                <br />
                Enemies defeated: {s.kills}
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <TowerPicker
        state={s}
        selected={selectedTower}
        onSelect={(k) => {
          sfx.click()
          setSelectedTower(k)
        }}
      />

      <MathGate
        open={!!pending}
        title={pending ? `Buy ${TOWER_STATS[pending.towerKind].label} for ${pending.cost} 🪙` : ''}
        provider={provider}
        onCorrect={confirmPurchase}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}

function StatsBar({ state: s }: { state: GameState }) {
  return (
    <div className="flex gap-2 flex-wrap justify-center text-white kid-text">
      <Pill bg="bg-quest-500 text-quest-900">🪙 {s.gold}</Pill>
      <Pill bg="bg-wrong-500">❤️ {s.lives}</Pill>
      <Pill bg="bg-ocean-500">
        Wave {Math.max(s.wave, 1)}/10
      </Pill>
      <Pill bg="bg-monster-500">⚔️ {s.kills}</Pill>
    </div>
  )
}

function Pill({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <div className={`px-3 py-1 rounded-full kid-text ${bg}`}>{children}</div>
  )
}

function TowerPicker({
  state: s,
  selected,
  onSelect,
}: {
  state: GameState
  selected: 'cannon' | null
  onSelect: (k: 'cannon' | null) => void
}) {
  return (
    <div className="mt-3 flex gap-3 justify-center flex-wrap">
      {(['cannon'] as const).map((k) => {
        const stats = TOWER_STATS[k]
        const afford = s.gold >= stats.cost
        const active = selected === k
        return (
          <button
            key={k}
            onClick={() => onSelect(active ? null : k)}
            disabled={!afford}
            className={`px-4 py-2 rounded-2xl kid-text shadow-lg border-4 ${
              active
                ? 'bg-quest-300 text-ocean-900 border-quest-500'
                : afford
                  ? 'bg-white text-ocean-900 border-white hover:bg-quest-100'
                  : 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed'
            }`}
          >
            <div className="text-3xl">{stats.emoji}</div>
            <div className="text-sm">{stats.label}</div>
            <div className="text-xs">🪙 {stats.cost}</div>
          </button>
        )
      })}
    </div>
  )
}

function PathView({ state: s }: { state: GameState }) {
  const d = useMemo(() => {
    return s.pathPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ')
  }, [s.pathPoints])
  return (
    <g>
      <path d={d} fill="none" stroke="#78350f" strokeWidth="44" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#a16207" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#fde68a" strokeWidth="2" strokeDasharray="6 8" />
      {/* base */}
      <rect
        x={s.width - 28}
        y={s.height * 0.42 - 28}
        width={28}
        height={56}
        fill="#1e3a8a"
        stroke="white"
        strokeWidth="3"
      />
      <text
        x={s.width - 14}
        y={s.height * 0.42 + 4}
        textAnchor="middle"
        fontSize="20"
      >
        🏠
      </text>
    </g>
  )
}

function TowersView({ state: s }: { state: GameState }) {
  return (
    <g>
      {s.towers.map((t) => {
        const stats = TOWER_STATS[t.kind]
        return (
          <g key={t.id}>
            <circle
              cx={t.pos.x}
              cy={t.pos.y}
              r={stats.range}
              fill={stats.color}
              opacity="0.08"
            />
            <circle
              cx={t.pos.x}
              cy={t.pos.y}
              r="20"
              fill={stats.color}
              stroke="white"
              strokeWidth="3"
            />
            <text
              x={t.pos.x}
              y={t.pos.y + 6}
              textAnchor="middle"
              fontSize="20"
            >
              {stats.emoji}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function EnemiesView({ state: s }: { state: GameState }) {
  return (
    <g>
      {s.enemies.map((e) => {
        if (!e.alive) return null
        const stats = ENEMY_STATS[e.kind]
        const p = pointAtT(s.pathPoints, e.pathT, s.pathLength)
        const hpPct = e.hp / e.maxHp
        return (
          <g key={e.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={stats.size / 2}
              fill={stats.color}
              stroke="white"
              strokeWidth="2"
            />
            <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="16">
              {stats.emoji}
            </text>
            <rect
              x={p.x - 14}
              y={p.y - stats.size}
              width={28}
              height={4}
              fill="#000"
              opacity="0.4"
              rx="2"
            />
            <rect
              x={p.x - 14}
              y={p.y - stats.size}
              width={28 * hpPct}
              height={4}
              fill="#22c55e"
              rx="2"
            />
          </g>
        )
      })}
    </g>
  )
}

function ProjectilesView({ state: s }: { state: GameState }) {
  return (
    <g>
      {s.projectiles.map((p) => (
        <circle
          key={p.id}
          cx={p.pos.x}
          cy={p.pos.y}
          r="4"
          fill="#facc15"
          stroke="#78350f"
          strokeWidth="1.5"
        />
      ))}
    </g>
  )
}

function FloatsView({ state: s }: { state: GameState }) {
  return (
    <g>
      {s.floats.map((f) => {
        const fade = Math.max(0, 1 - f.ageMs / 1100)
        return (
          <text
            key={f.id}
            x={f.pos.x}
            y={f.pos.y}
            textAnchor="middle"
            fontSize="16"
            fontWeight="bold"
            fill={f.color}
            opacity={fade}
          >
            {f.text}
          </text>
        )
      })}
    </g>
  )
}

function PlacementPreview({ pos, state: s }: { pos: Vec2; state: GameState }) {
  if (!s) return null
  const stats = TOWER_STATS['cannon']
  const valid = canPlaceTower(s, pos) && canAffordTower(s, 'cannon')
  return (
    <g pointerEvents="none">
      <circle
        cx={pos.x}
        cy={pos.y}
        r={stats.range}
        fill={valid ? stats.color : '#dc2626'}
        opacity={valid ? 0.15 : 0.2}
      />
      <circle
        cx={pos.x}
        cy={pos.y}
        r="20"
        fill={valid ? stats.color : '#dc2626'}
        opacity={0.6}
        stroke="white"
        strokeWidth="2"
        strokeDasharray="3 3"
      />
    </g>
  )
}
