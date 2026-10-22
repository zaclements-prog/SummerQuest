import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from '../../screens/GameRunner'
import type { GameState, Vec2 } from './types'
import { ENEMY_STATS, pointAtT } from './config'
import { createInitialState, startNextWave, tick } from './engine'
import { K_BOARD, K_HEARTS, K_MAX_LEVEL, K_SPOTS, K_SPOT_R, TD_GO, buildOnSpot, fillHearts, kRules, kTowerStats, powerUpSpot, spotOpen, tdSpot, towerOnSpot } from './kRules'
import ListenGate from './ListenGate'
import { guide } from '../../guide/store'
import { SayAgainButton } from '../../guide/SayAgainButton'
import { useIdleReprompt } from '../../guide/useIdleReprompt'
import { listenStars } from '../listenPlay/script'
import { sfx } from '../../lib/sound'
import { TOON } from '../../toon/palette'
import { ToonStar } from '../../components/ui'
import type { VoiceRef } from '../../voice/types'
import { ROOMY_SCREEN, SHORT_SCREEN, useMediaQuery } from '../../components/useViewport'
import './kTowers.css'

const INK = TOON.outline
const { w: BW, h: BH } = K_BOARD


const line = (id: string): VoiceRef => ({ line: `k-towers/${id}` })

/** Run bookkeeping the board reads while it draws (held in state and mutated, like the engine's state). */
interface Run {
  /** Towers built or made stronger since the last wave started (or the last setback). */
  breakBuilds: number
  /** Questions asked, and answered right on the first pick (the stars). */
  asked: number
  firstRight: number
  /** Dev / QA: game-time speed (the bot plays at 4×). */
  speed: number
  /** What the frame loop saw last (to notice a wave stopped, a setback, the end). */
  prev: { progress: GameState['waveProgress']; setbacks: number; over: boolean }
  /** A tower just built or powered up: it pops. */
  pop: { spot: number; at: number } | null
  /** A spot just tapped that can't take more: it wobbles. */
  wobble: { spot: number; at: number } | null
  /** The frame loop's clock (ms): what the pop and the wobble are timed by. */
  now: number
  /** Questions opened (keys each gate, so it starts fresh). */
  gates: number
  finished: boolean
}

/**
 * The run's bookkeeping changes in place, like the engine's state: only here,
 * from the handlers and the frame loop, never while rendering.
 */
const RUN = {
  built(run: Run, spot: number) {
    run.breakBuilds++
    run.pop = { spot, at: run.now }
  },
  wobble(run: Run, spot: number) {
    run.wobble = { spot, at: run.now }
  },
  openGate(run: Run): number {
    return ++run.gates
  },
  answered(run: Run, correct: boolean) {
    run.asked++
    if (correct) run.firstRight++
  },
  waveStarted(run: Run) {
    run.breakBuilds = 0
  },
  speed(run: Run, k: number) {
    run.speed = Math.max(1, Math.min(8, Math.round(k)))
  },
}

/**
 * Counting Towers — tower defense for a kindergartner (K–1, voice-first;
 * the `k-towers-*` stages, rules in ./kRules). Nothing to read: the HUD is
 * icons (🔊, hearts, a critter per wave that turns into a star, the big ▶),
 * and the narrator says what to do while the guide's hand points at it.
 *
 * - Tap a build spot (or a tower, to make it stronger) → a spoken counting
 *   question in big picture cards (ListenGate); the waves wait while it is
 *   open. Right → the tower goes up (or grows). Wrong → a count-along and
 *   another try; never failing out. ↩ closes it.
 * - The ▶ shows once there is something to defend with (two towers before
 *   the first wave; one more, or a stronger one, before each next wave), and
 *   sends the critters. Waves are few, short and slow.
 * - If the critters would take the last heart, the wave just ends ("Oh no,
 *   some got by! Let's add a tower and try again."), the hearts come back and
 *   the same wave is tried again, a little easier.
 * - Stars come from the questions answered right on the first pick (never 0).
 *
 * Grades 2–4 play the classic game (TowerDefense.tsx), untouched.
 */
export default function KTowers({ provider, params, onComplete, meta, paused = false }: GameProps) {
  const waves = params?.waves === 4 ? 4 : 3
  const [game] = useState<GameState>(() => createInitialState(BW, BH, kRules(waves)))
  const [run] = useState<Run>(() => ({
    breakBuilds: 0,
    asked: 0,
    firstRight: 0,
    speed: 1,
    prev: { progress: 'idle', setbacks: 0, over: false },
    pop: null,
    wobble: null,
    now: 0,
    gates: 0,
    finished: false,
  }))
  const [, force] = useState(0)
  const [gate, setGate] = useState<{ spot: number; power: boolean; serial: number } | null>(null)
  const short = useMediaQuery(SHORT_SCREEN)
  const roomy = useMediaQuery(ROOMY_SCREEN)
  // the HUD sits beside the board on a short landscape screen (a 100 px column), above it otherwise
  const [fitRef, fit] = useBoardFit(short ? { w: 112, h: 0 } : { w: 0, h: roomy ? 112 : 104 })
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  })
  const s = game

  const building = !s.isGameOver && (s.waveProgress === 'idle' || s.waveProgress === 'between-waves')
  const anyOpen = K_SPOTS.some((_, i) => spotOpen(s, i))
  const need = s.wave === 0 && s.setbacks === 0 ? 2 : 1
  const canGo = building && (run.breakBuilds >= need || !anyOpen)

  /** Where the hand goes to say "build here": the first free spot, else a tower that can still grow. */
  const spotToPoint = useCallback((): number => {
    const free = K_SPOTS.findIndex((_, i) => !towerOnSpot(game, i))
    if (free >= 0) return free
    return Math.max(0, K_SPOTS.findIndex((_, i) => spotOpen(game, i)))
  }, [game])

  /** What to do next, said and pointed at (between waves only). */
  const hint = useCallback(
    (say?: string) => {
      if (game.isGameOver || !(game.waveProgress === 'idle' || game.waveProgress === 'between-waves')) return
      const open = K_SPOTS.some((_, i) => spotOpen(game, i))
      const go = run.breakBuilds >= (game.wave === 0 && game.setbacks === 0 ? 2 : 1) || !open
      if (go) {
        void guide.show({ voice: line(say ?? 'ready'), target: TD_GO, hand: 'tap', pad: 8 })
        return
      }
      const id = say ?? (game.wave === 0 && game.setbacks === 0 ? (game.towers.length === 0 ? 'intro' : 'buildMore') : 'moreComing')
      void guide.show({ voice: line(id), target: tdSpot(spotToPoint()), hand: 'tap', pad: 6 })
    },
    [game, run, spotToPoint],
  )

  // ── the frame loop: the engine, and noticing a wave stopped, a setback, the end ──
  const frozen = !!gate || paused
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    const loop = (t: number) => {
      const dt = t - last
      last = t
      run.now = t
      if (!frozen) for (let i = 0; i < run.speed; i++) tick(game, Math.min(dt, 50))
      const prev = run.prev
      if (game.setbacks !== prev.setbacks) {
        // the base would have fallen: the wave ended instead (never "you lose")
        run.breakBuilds = 0
        sfx.wrong()
        void guide.show({ voice: line('setback'), target: tdSpot(spotToPoint()), hand: 'tap', pad: 6 })
      } else if (prev.progress === 'in-progress' && game.waveProgress === 'between-waves') {
        sfx.victory()
        // every critter stopped, or a few got by (the base held)
        void guide.say(line(game.lives >= K_HEARTS ? 'waveDone' : 'phew')).then((ok) => {
          if (ok) hint()
        })
      }
      if (game.isGameOver && !prev.over && !run.finished) {
        run.finished = true
        sfx.fanfare()
        const stars = listenStars(run.firstRight, Math.max(1, run.asked))
        const result = { stars, score: run.firstRight * 10 + game.rules.waves.length * 20, correct: run.firstRight, total: run.asked }
        void guide.say(line('allDone')).then(() => setTimeout(() => onCompleteRef.current(result), 400))
      }
      run.prev = { progress: game.waveProgress, setbacks: game.setbacks, over: game.isGameOver }
      acc += dt
      if (acc >= 1000 / 30) {
        acc = 0
        force((n) => n + 1)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [game, run, frozen, hint, spotToPoint])

  // the welcome (the hand on the first spot, once the board is laid out); "Quit?" open: hush;
  // back to the game: say what to do again
  useEffect(() => {
    if (paused) {
      guide.clear()
      return
    }
    if (gate) return
    const t = setTimeout(() => hint(), 450)
    return () => clearTimeout(t)
    // (only on starting, pausing and un-pausing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused])
  // leaving: stop talking, and 🔊 has nothing left to repeat
  useEffect(() => () => guide.clear({ forget: true }), [])

  useIdleReprompt({ key: `${s.wave}:${s.setbacks}:${run.breakBuilds}:${building}`, enabled: building && !gate && !paused })

  // dev / QA hook for the playthrough bot (never in a production build)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __sqTowers?: unknown }
    w.__sqTowers = {
      state: () => ({
        progress: game.waveProgress,
        wave: game.wave,
        waves: game.rules.waves.length,
        lives: game.lives,
        setbacks: game.setbacks,
        towers: K_SPOTS.map((_, i) => towerOnSpot(game, i)?.level ?? 0),
        canGo: !game.isGameOver && (game.waveProgress === 'idle' || game.waveProgress === 'between-waves') && (run.breakBuilds >= (game.wave === 0 && game.setbacks === 0 ? 2 : 1) || !K_SPOTS.some((_, i) => spotOpen(game, i))),
        over: game.isGameOver,
        won: game.hasWon,
        asked: run.asked,
        firstRight: run.firstRight,
      }),
      speed: (k: number) => RUN.speed(run, k),
      /** QA: take every tower away (to see a wave get by, and be tried again). */
      clearTowers: () => {
        game.towers = []
      },
    }
    return () => {
      delete w.__sqTowers
    }
  }, [game, run])

  function tapSpot(i: number) {
    if (gate || paused || game.isGameOver) return
    const t = towerOnSpot(game, i)
    if (t && t.level >= K_MAX_LEVEL) {
      sfx.tick()
      RUN.wobble(run, i)
      void guide.say(line('maxed'))
      return
    }
    sfx.click()
    guide.clear()
    setGate({ spot: i, power: !!t, serial: RUN.openGate(run) })
  }

  function solved() {
    const g = gate
    setGate(null)
    if (!g) return
    if (g.power ? powerUpSpot(game, g.spot) : buildOnSpot(game, g.spot)) {
      RUN.built(run, g.spot)
      sfx.enter()
    }
    void guide.say(line(g.power ? 'stronger' : 'built')).then((ok) => {
      if (ok) hint()
    })
  }

  function cancel() {
    setGate(null)
    hint()
  }

  function go() {
    if (!canGo || gate || paused) return
    sfx.enter()
    guide.clear()
    RUN.waveStarted(run)
    // each wave starts with every heart
    fillHearts(game)
    startNextWave(game)
    force((n) => n + 1)
  }

  const cleared = s.isGameOver && s.hasWon ? s.rules.waves.length : building ? s.wave : Math.max(0, s.wave - 1)
  const now = run.now

  return (
    // the HUD and the board, together as big as the screen allows (the board keeps its shape), centred
    <div
      ref={fitRef}
      className="game-surface flex-1 min-h-0 min-w-0 flex flex-col short:flex-row items-center justify-center px-3 sm:px-5 pb-3 short:pb-2 short:pl-2 gap-2 short:gap-3"
      data-k-towers=""
      data-progress={s.waveProgress}
    >
      {/* the HUD: 🔊 · hearts · a critter per wave (a star once stopped) · ▶ — a row as wide as the board, or a column beside it */}
      <div
        className="flex short:flex-col items-center justify-between gap-3 short:gap-2 shrink-0 short:w-[100px] w-full"
        style={fit ? (short ? { height: fit.h } : { width: fit.w }) : undefined}
      >
        <SayAgainButton disabled={!!gate || paused} />
        <div className="flex short:flex-col items-center gap-4 short:gap-2 flex-1 justify-center">
          <Hearts lives={s.lives} />
          <WavePips total={s.rules.waves.length} cleared={cleared} running={!building && !s.isGameOver} />
        </div>
        <div className="grid place-items-center w-[88px] h-[88px] roomy:w-24 roomy:h-24 shrink-0">
          {canGo && (
            <button
              type="button"
              aria-label="Start"
              data-guide={TD_GO}
              onClick={go}
              className="td-go grid place-items-center w-full h-full rounded-full bg-correct-400 hover:bg-correct-300 border-[3px] border-line shadow-ledge active:translate-y-[3px] active:shadow-ledge-sm outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2"
            >
              <svg viewBox="0 0 48 48" className="w-[56%] h-[56%] translate-x-[6%]" aria-hidden="true">
                <path d="M15 9.5v29a2 2 0 0 0 3 1.7l23-14.5a2 2 0 0 0 0-3.4L18 7.8a2 2 0 0 0-3 1.7z" fill="#fffaf0" stroke="#3a2c38" strokeWidth="3.5" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* the board (sized from the screen, never from its own content) */}
      <div
        className="relative shrink-0 rounded-toon border-[3px] border-line shadow-card overflow-hidden"
        // (until it's measured the board takes no room, so the box keeps the size the layout gives it)
        style={fit ? { width: fit.w, height: fit.h } : fit === undefined ? { width: 0, height: 0, visibility: 'hidden' } : { width: '100%', aspectRatio: `${BW} / ${BH}` }}
      >
        <svg data-board="" viewBox={`0 0 ${BW} ${BH}`} className="absolute inset-0 w-full h-full" style={{ background: `radial-gradient(120% 90% at 50% 20%, ${TOON.grassLight} 0%, ${TOON.grass} 60%, ${TOON.grassDark} 100%)` }}>
          <Path state={s} />
          {K_SPOTS.map((p, i) => (
            <Spot key={i} i={i} pos={p} state={s} active={gate?.spot === i} pop={run.pop?.spot === i ? now - run.pop.at : null} wobble={run.wobble?.spot === i ? now - run.wobble.at : null} onTap={() => tapSpot(i)} />
          ))}
          <Critters state={s} />
          {s.projectiles.map((p) => (
            <circle key={p.id} cx={p.pos.x} cy={p.pos.y} r={5.5} fill={TOON.gold} stroke={INK} strokeWidth={2} />
          ))}
          {s.floats.map((f) => {
            const pic = f.text.startsWith('+') ? '✨' : f.text.includes('❤') ? '💔' : null
            return pic ? (
              <text key={f.id} x={f.pos.x} y={f.pos.y} textAnchor="middle" fontSize={26} opacity={Math.max(0, 1 - f.ageMs / 1100)} pointerEvents="none">
                {pic}
              </text>
            ) : null
          })}
        </svg>
      </div>

      {gate && (
        <ListenGate
          key={gate.serial}
          provider={provider}
          paused={paused}
          meta={meta}
          onAnswer={(correct, first) => {
            if (first) RUN.answered(run, correct)
          }}
          onSolved={solved}
          onCancel={cancel}
        />
      )}
    </div>
  )
}

/**
 * The biggest board of the right shape that fits the game's box once the HUD
 * has its room (`hud`: px taken beside it, or above it). `undefined` until
 * measured (the board waits, hidden); null where there's no ResizeObserver
 * (the board then just takes the width).
 */
function useBoardFit(hud: { w: number; h: number }): [(el: HTMLDivElement | null) => void, { w: number; h: number } | null | undefined] {
  const [box, setBox] = useState<HTMLDivElement | null>(null)
  const [fit, setFit] = useState<{ w: number; h: number } | null | undefined>(() => (typeof ResizeObserver === 'undefined' ? null : undefined))
  const { w: hudW, h: hudH } = hud
  useEffect(() => {
    if (!box || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      const w = Math.floor(Math.max(120, Math.min(width - hudW, ((height - hudH) * BW) / BH)))
      setFit((f) => (f && f.w === w ? f : { w, h: Math.round((w * BH) / BW) }))
    })
    ro.observe(box)
    return () => ro.disconnect()
  }, [box, hudW, hudH])
  return [setBox, fit]
}

// ── the HUD ─────────────────────────────────────────────────────────────────

function Hearts({ lives }: { lives: number }) {
  return (
    <div className="flex gap-0.5 text-[28px] short:text-[24px] leading-none" role="img" aria-label={`${lives} hearts`} data-hearts={lives}>
      {Array.from({ length: K_HEARTS }, (_, i) => (
        <span key={i} className={`transition-opacity duration-300 ${i < lives ? '' : 'opacity-25 grayscale'}`} aria-hidden="true">
          ❤️
        </span>
      ))}
    </div>
  )
}

function WavePips({ total, cleared, running }: { total: number; cleared: number; running: boolean }) {
  return (
    <div className="flex short:grid short:grid-cols-2 items-center gap-1.5" role="img" aria-label={`${cleared} of ${total} waves`}>
      {Array.from({ length: total }, (_, i) =>
        i < cleared ? (
          <span key={i} className="grid place-items-center w-9 h-9" aria-hidden="true">
            <ToonStar filled px={32} />
          </span>
        ) : (
          <span
            key={i}
            className={`grid place-items-center w-9 h-9 rounded-full border-[3px] border-line text-xl ${i === cleared && running ? 'bg-monster-200 td-pip-now' : 'bg-paper/70 opacity-60'}`}
            aria-hidden="true"
          >
            👾
          </span>
        ),
      )}
    </div>
  )
}

// ── the board ───────────────────────────────────────────────────────────────

function Path({ state: s }: { state: GameState }) {
  const d = useMemo(() => s.pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '), [s.pathPoints])
  const end = s.pathPoints[s.pathPoints.length - 1]
  return (
    <g pointerEvents="none">
      <path d={d} fill="none" stroke={INK} strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={TOON.pathEdge} strokeWidth="41" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={TOON.path} strokeWidth="33" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={TOON.pathEdge} strokeWidth="2.5" strokeDasharray="2 12" strokeLinecap="round" />
      {/* home: what the towers keep the critters away from */}
      <rect x={end.x - 40} y={end.y - 34} width={40} height={68} rx={8} fill={TOON.roofRed} stroke={INK} strokeWidth="3" />
      <text x={end.x - 20} y={end.y + 2} textAnchor="middle" dominantBaseline="central" fontSize="30">
        🏠
      </text>
    </g>
  )
}

/** A five-point star path (radius r) around (0, 0). */
function starD(r: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const rr = i % 2 ? r * 0.45 : r
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
    return `${i ? 'L' : 'M'} ${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`
  }).join(' ') + ' Z'
}

const LEVEL_FILL = ['#8ab8ff', '#b79af0', '#ffcf4d'] as const

/**
 * A build spot: an empty dashed ring with a ➕ (tap: build), or its tower with
 * a star per level and a faint ring for how far it reaches (tap: make it
 * stronger). Each is a big tap target with its own guide id.
 */
function Spot({ i, pos, state: s, active, pop, wobble, onTap }: { i: number; pos: Vec2; state: GameState; active: boolean; pop: number | null; wobble: number | null; onTap: () => void }) {
  const t = towerOnSpot(s, i)
  const k = pop !== null && pop < 450 ? 1 + 0.35 * Math.sin((pop / 450) * Math.PI) : 1
  const wob = wobble !== null && wobble < 500 ? Math.sin((wobble / 500) * Math.PI * 4) * 8 * (1 - wobble / 500) : 0
  return (
    <g
      data-guide={tdSpot(i)}
      data-spot={i}
      data-level={t?.level ?? 0}
      role="button"
      tabIndex={0}
      aria-label={t ? `Tower, level ${t.level}` : 'Build a tower here'}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTap()
        }
      }}
      style={{ cursor: 'pointer' }}
      transform={`translate(${pos.x} ${pos.y})`}
    >
      {t ? (
        <g transform={`rotate(${wob}) scale(${k})`}>
          <circle r={kTowerStats(t.level).range} fill={LEVEL_FILL[t.level - 1]} opacity={0.1} pointerEvents="none" />
          <circle r={K_SPOT_R} fill="transparent" />
          <circle r={29} fill={LEVEL_FILL[t.level - 1]} stroke={INK} strokeWidth={3.5} />
          <text y={2} textAnchor="middle" dominantBaseline="central" fontSize={34}>
            🏰
          </text>
          {Array.from({ length: t.level }, (_, l) => (
            <path key={l} d={starD(10.5)} transform={`translate(${(l - (t.level - 1) / 2) * 22} 38)`} fill={TOON.gold} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          ))}
        </g>
      ) : (
        <g className={active ? undefined : 'td-spot-idle'}>
          <circle r={K_SPOT_R} fill={active ? '#fff6c9' : 'rgba(255,255,255,0.4)'} stroke={INK} strokeWidth={3} strokeDasharray="9 7" />
          <path d="M -14 0 H 14 M 0 -14 V 14" stroke={INK} strokeWidth={7} strokeLinecap="round" />
        </g>
      )}
    </g>
  )
}

function Critters({ state: s }: { state: GameState }) {
  return (
    <g pointerEvents="none">
      {s.enemies.map((e) => {
        if (!e.alive) return null
        const p = pointAtT(s.pathPoints, e.pathT, s.pathLength)
        const size = ENEMY_STATS[e.kind].size + 12
        return (
          <g key={e.id} transform={`translate(${p.x} ${p.y})`}>
            <circle r={size / 2} fill="#b79af0" stroke={INK} strokeWidth={2.5} />
            <text y={2} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.8}>
              👾
            </text>
            <rect x={-16} y={-size / 2 - 11} width={32} height={6} rx={3} fill={INK} opacity={0.5} />
            <rect x={-16} y={-size / 2 - 11} width={32 * (e.hp / e.maxHp)} height={6} rx={3} fill={TOON.leafLight} />
          </g>
        )
      })}
    </g>
  )
}
