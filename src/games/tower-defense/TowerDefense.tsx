import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
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
import { lazyWithRetry } from '../../lib/lazyWithRetry'
import { sfx } from '../../lib/sound'
import { Button, Pill, Card } from '../../components/ui'
import { TOON } from '../../toon/palette'
import { ROOMY_SCREEN, SHORT_SCREEN, useMediaQuery } from '../../components/useViewport'

const INK = TOON.outline

const GAME_W = 720
const GAME_H = 420

// K–1's Counting Towers, loaded only when a K–1 stage is played
const KTowers = lazyWithRetry(() => import('./KTowers'))

/**
 * Tower Battlefront. Grades 2–4 (td-arena) play the classic game below,
 * unchanged; a K–1 stage (`params.listen`: the `k-towers-*` stages) plays
 * Counting Towers (./KTowers: voice-first, picture answers, no failing out).
 */
export default function TowerDefense(props: GameProps) {
  if (props.params?.listen !== true) return <ClassicTowerDefense {...props} />
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <KTowers {...props} />
    </Suspense>
  )
}

function ClassicTowerDefense({ provider, onComplete, meta, paused = false }: GameProps) {
  // The engine mutates this one object in place every frame; `force` re-renders.
  // (Held in state, not a ref, so render can read it.)
  const [game] = useState<GameState>(() => createInitialState(GAME_W, GAME_H))
  const [, force] = useState(0)
  const [selectedTower, setSelectedTower] = useState<'cannon' | null>('cannon')
  const [hoverPos, setHoverPos] = useState<Vec2 | null>(null)
  const [pending, setPending] = useState<PendingPurchase | null>(null)
  // A tap where a tower can't go: a red ring + a short reason, so a touch player
  // (who has no hover preview) knows why nothing happened.
  const [nope, setNope] = useState<{ pos: Vec2; text: string; id: number } | null>(null)
  const nopeId = useRef(0)
  // Phone held sideways: the board fills the height, stats + shop sit beside it.
  const short = useMediaQuery(SHORT_SCREEN)
  // tablets: bigger shop tiles and a little more air, so the board leaves them a bit more room
  const roomy = useMediaQuery(ROOMY_SCREEN)
  // The RAF loop runs for the component's lifetime and reads these through refs.
  const frozenRef = useRef(false)
  useEffect(() => {
    frozenRef.current = !!pending || paused
  }, [pending, paused])
  const completedRef = useRef(false)
  // Math-gate answers are the quiz part of this game: they (not enemy kills) are
  // what's reported as correct/total, so accuracy, stats and coins stay honest.
  const answersRef = useRef({ correct: 0, total: 0 })
  const reduced = useReducedMotion()

  // RAF tick — runs once for component lifetime, reads pending via ref
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    const renderEvery = 1000 / 30 // re-render at 30fps
    const loop = (t: number) => {
      const dt = t - last
      last = t
      if (!frozenRef.current) {
        tick(game, Math.min(dt, 50))
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
  }, [game])

  // detect end-of-game and report result
  useEffect(() => {
    if (!game.isGameOver || completedRef.current) return
    completedRef.current = true
    setTimeout(() => {
      const wavesCleared = game.hasWon ? 10 : Math.max(0, game.wave - 1)
      const stars =
        wavesCleared >= 10 ? 3 : wavesCleared >= 6 ? 2 : wavesCleared >= 3 ? 1 : 0
      onComplete({
        stars,
        score: game.kills * 5 + wavesCleared * 20,
        correct: answersRef.current.correct,
        total: answersRef.current.total,
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
    const s = game
    const afford = canAffordTower(s, selectedTower)
    if (!afford || !canPlaceTower(s, pos)) {
      sfx.wrong()
      const id = ++nopeId.current
      setNope({ pos, id, text: !afford ? `Need ${TOWER_STATS[selectedTower].cost} 🪙` : 'Not here!' })
      setTimeout(() => setNope((n) => (n && n.id === id ? null : n)), 1100)
      return
    }
    setNope(null)
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
    const s = game
    if (pending.kind === 'placeTower') {
      placeTower(s, pending.towerKind, pending.pos)
    }
    setPending(null)
    force((n) => n + 1)
  }

  function startWaveClick() {
    sfx.enter()
    startNextWave(game)
    force((n) => n + 1)
  }

  const s = game
  const showStart =
    !s.isGameOver &&
    (s.waveProgress === 'idle' || s.waveProgress === 'between-waves')

  const startButton = (
    <Button variant="success" size="lg" onClick={startWaveClick}>
      <span aria-hidden="true">▶︎</span>
      {s.wave === 0 ? 'Start Wave 1' : `Start Wave ${s.wave + 1}`}
    </Button>
  )

  return (
    <div
      className={[
        // tablets: the board, stats and shop sit in the middle of the screen
        'game-surface flex-1 flex flex-col items-center p-3 roomy:justify-center roomy:gap-2',
        // sideways phone: board on the left (full height), stats + shop on the right
        'short:grid short:grid-cols-[auto_minmax(0,15rem)] short:grid-rows-[auto_1fr] short:content-start short:justify-center short:items-start short:gap-x-3 short:pt-1',
      ].join(' ')}
    >
      <div className="short:col-start-2 short:row-start-1">
        <StatsBar state={s} />
      </div>

      <div
        className="relative mt-3 short:mt-0 short:col-start-1 short:row-start-1 short:row-span-2 rounded-toon border-[3px] border-line shadow-card overflow-hidden"
        style={{
          aspectRatio: `${GAME_W} / ${GAME_H}`,
          // As big as fits: the whole board, its stats and the shop stay on screen.
          width: short
            ? `min(64vw, calc((100dvh - 140px) * ${GAME_W / GAME_H}))`
            : `min(960px, 100%, max(320px, calc((100dvh - ${roomy ? 362 : 330}px) * ${GAME_W / GAME_H})))`,
        }}
      >
        <svg
          viewBox={`0 0 ${GAME_W} ${GAME_H}`}
          className="absolute inset-0 w-full h-full"
          style={{
            background: `radial-gradient(120% 90% at 50% 20%, ${TOON.grassLight} 0%, ${TOON.grass} 60%, ${TOON.grassDark} 100%)`,
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
          {hoverPos && selectedTower && !pending && !nope && (
            <PlacementPreview pos={hoverPos} state={s} />
          )}
          {nope && <NopeMark pos={nope.pos} text={nope.text} />}
          <FloatsView state={s} />
        </svg>

        {/* Big screens: the start button floats on the board. Phones: it sits
            under the board instead, so it doesn't cover the spots you tap. */}
        {showStart && !s.isGameOver && (
          <div className="absolute left-1/2 -translate-x-1/2 top-1/3 hidden md:block short:hidden">{startButton}</div>
        )}

        {s.isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900/45 backdrop-blur-[2px] p-4">
            <GameOverCard reduced={reduced} state={s} />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 short:col-start-2 short:row-start-2 short:flex-col short:items-stretch">
        {showStart && !s.isGameOver && <div className="flex justify-center md:hidden short:flex">{startButton}</div>}
        <TowerPicker
          state={s}
          selected={selectedTower}
          onSelect={(k) => {
            sfx.click()
            setSelectedTower(k)
          }}
        />
      </div>

      {pending && (
        <MathGate
          title={`Buy ${TOWER_STATS[pending.towerKind].label} for ${pending.cost} 🪙`}
          provider={provider}
          onAnswer={(correct) => {
            answersRef.current.total += 1
            if (correct) answersRef.current.correct += 1
          }}
          onCorrect={confirmPurchase}
          onCancel={() => setPending(null)}
          meta={meta}
        />
      )}
    </div>
  )
}

function StatsBar({ state: s }: { state: GameState }) {
  return (
    <div className="flex gap-2 flex-wrap justify-center short:gap-1.5">
      <Pill tone="quest" icon="🪙" className="text-lg px-4 py-0.5 tabular-nums">
        {s.gold}
      </Pill>
      <Pill tone="wrong" icon="❤️" className="text-lg px-4 py-0.5 tabular-nums">
        {s.lives}
      </Pill>
      <Pill tone="ocean" icon="🌊" className="text-lg px-4 py-0.5">
        Wave {Math.max(s.wave, 1)}/10
      </Pill>
      <Pill tone="monster" icon="⚔️" className="text-lg px-4 py-0.5 tabular-nums">
        {s.kills}
      </Pill>
    </div>
  )
}

function GameOverCard({ reduced, state: s }: { reduced: boolean | null; state: GameState }) {
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { scale: 0 }}
      animate={reduced ? { opacity: 1 } : { scale: 1 }}
      className="w-full max-w-xs"
    >
      <Card tone={s.hasWon ? 'correct' : 'wrong'} accent className="p-6 text-center">
        <div
          className="mx-auto mb-2 grid place-items-center w-20 h-20 rounded-full bg-quest-300 border-[3px] border-line text-4xl"
          aria-hidden="true"
        >
          {s.hasWon ? '🏆' : '💔'}
        </div>
        <div className="kid-text font-bold text-3xl text-ink-900">
          {s.hasWon ? 'Victory!' : 'Base destroyed'}
        </div>
        <div className="text-ink-700 kid-text text-base mt-2">
          Wave reached: {s.wave}
          <br />
          Enemies defeated: {s.kills}
        </div>
      </Card>
    </motion.div>
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
    <div className="flex gap-3 justify-center flex-wrap">
      {(['cannon'] as const).map((k) => {
        const stats = TOWER_STATS[k]
        const afford = s.gold >= stats.cost
        const active = selected === k
        const stateClass = active
          ? 'bg-quest-400 text-ink-900 border-line shadow-ledge'
          : afford
            ? 'bg-paper text-ink-900 border-line shadow-ledge hover:bg-cream-50 hover:-translate-y-0.5'
            : 'bg-cream-200 text-ink-500 border-line/30 cursor-not-allowed'
        return (
          <button
            key={k}
            onClick={() => onSelect(active ? null : k)}
            disabled={!afford}
            aria-pressed={active}
            className={[
              'kid-text rounded-[1.25rem] border-[3px] px-6 py-2.5 short:py-1.5 min-h-[48px] text-center roomy:px-8 roomy:py-3',
              'transition-[translate,box-shadow,background-color] duration-100 active:translate-y-[3px]',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2',
              stateClass,
            ].join(' ')}
          >
            <div className="text-3xl" aria-hidden="true">{stats.emoji}</div>
            <div className="text-sm roomy:text-base">{stats.label}</div>
            <div className="text-xs roomy:text-sm inline-flex items-center gap-1 justify-center">
              <span aria-hidden="true">🪙</span> {stats.cost}
            </div>
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
      <path d={d} fill="none" stroke={INK} strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={TOON.pathEdge} strokeWidth="41" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={TOON.path} strokeWidth="33" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={TOON.pathEdge} strokeWidth="2.5" strokeDasharray="2 12" strokeLinecap="round" />
      {/* base */}
      <rect
        x={s.width - 28}
        y={s.height * 0.42 - 28}
        width={28}
        height={56}
        rx={6}
        fill={TOON.roofRed}
        stroke={INK}
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
              stroke={INK}
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
              stroke={INK}
              strokeWidth="2.5"
            />
            <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="16">
              {stats.emoji}
            </text>
            <rect
              x={p.x - 14}
              y={p.y - stats.size}
              width={28}
              height={5}
              fill={INK}
              opacity="0.55"
              rx="2.5"
            />
            <rect
              x={p.x - 14}
              y={p.y - stats.size}
              width={28 * hpPct}
              height={5}
              fill={TOON.leafLight}
              rx="2.5"
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
          r="4.5"
          fill={TOON.gold}
          stroke={INK}
          strokeWidth="1.8"
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

/** Where a tapped tower can't go: a red dashed ring and a short reason. */
function NopeMark({ pos, text }: { pos: Vec2; text: string }) {
  const y = pos.y < 60 ? pos.y + 44 : pos.y - 30
  return (
    <g pointerEvents="none">
      <circle cx={pos.x} cy={pos.y} r="20" fill={TOON.flowerRed} opacity={0.55} stroke={INK} strokeWidth="2.5" strokeDasharray="4 4" />
      <text x={pos.x} y={y} textAnchor="middle" fontSize="20" fontWeight="bold" fill="#fff" stroke={INK} strokeWidth="5" paintOrder="stroke" fontFamily="Fredoka, system-ui, sans-serif">
        {text}
      </text>
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
        fill={valid ? stats.color : TOON.flowerRed}
        opacity={valid ? 0.18 : 0.22}
      />
      <circle
        cx={pos.x}
        cy={pos.y}
        r="20"
        fill={valid ? stats.color : TOON.flowerRed}
        opacity={0.7}
        stroke={INK}
        strokeWidth="2.5"
        strokeDasharray="4 4"
      />
    </g>
  )
}
