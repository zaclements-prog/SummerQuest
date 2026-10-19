import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import GLCanvas from '../platform/gl/GLCanvas'
import { usePageHidden } from '../platform/gl/usePageHidden'
import StaticBatch from '../toon/StaticBatch'
import { Group, Vector3 } from 'three'
import type { RefObject } from 'react'
import type { GameProps } from '../screens/GameRunner'
import type { Problem } from '../lib/problem'
import { useProgress } from '../store/progress'
import { sfx } from '../lib/sound'
import { useWanderWalk } from '../world/useWanderWalk'
import { creatureBuilder } from '../home/models/registry'
import CreatureAccessories from '../home/world/CreatureAccessories'
import { useStarterCreature } from '../home/starterCreature'
import {
  FIELD,
  GROVE_ROUNDS,
  groveMaxFactor,
  groveStars,
  isCommittable,
  judgePlanting,
  planGroveRun,
  plantPoints,
  plantedShape,
  tileAt,
  tileCenter,
  type GroveTask,
  type Planted,
  type Tile,
} from '../lib/grove/groveCore'
import { groveOrder, groveOrdersFor, groveProblem } from '../lib/providers/multiplicationGrove'
import { CrateStack, FieldLabels, Keeper, PlantField, RootRing, SeedBag, type FieldMode, type KeeperMood } from './TimesGrove.parts'
import { GroveSet } from './TimesGrove.set'
import { CAM_FOCUS_LOCAL, CAM_FOV, CAM_OFFSET, CRATES, DWELL, FIELD_HALF, FRUITS, ISO_YAW, SEED_BAG, SPAWN_LOCAL, toWorld, wpos } from './TimesGrove.layout'
import { GameSky } from './_scene/GameSky'
import { localX, localZ } from './_scene/isoFrame'
import { GameCameraRig } from './_scene/GameCameraRig'
import JuiceLayer from './_juice/JuiceLayer'
import { juice } from './_juice/juice'
import { Banner, RoundPips, ScoreChip, StreakMeter } from './_juice/JuiceHud'
import { RunResults } from './_juice/RunResults'
import { loadBest, recordRun } from './_juice/bests'
import { multLabel } from './_juice/score'
import { voice } from './_juice/voice'
import { canvasQuality, useLowGraphics } from '../world/graphicsQuality'
import { SAFE } from './_runkit/uiTokens'
import { WalkHint } from './_runkit/RunHud'

/**
 * Times Grove — the array orchard, fun pass (docs/superpowers/specs/
 * 2026-10-17-mini-games-fun-pass.md over 2026-10-16-times-grove-design.md).
 *
 * The kid PLANTS the array: the field grows a rectangle of saplings from its
 * corner seed bag to wherever the kid stands — walk right and the first row
 * gets longer, walk down and another equal row snaps in (4… 8… 12). Standing
 * still roots the shape (a ring fills under the kid). The right shape blooms
 * row by row with the skip-count chant, the keeper Roadrunner zips a lap, a
 * rotated array spins a quarter turn (3 rows of 4 = 4 rows of 3), and the
 * fruit lands in a crate. A wrong shape wilts and says its own count, and the
 * kid just steps to fix it — no reset, no re-arm gate.
 *
 * Run: warm-ups with the field's row/column numbers showing, then orders
 * without them, a "mystery row" (3 rows → 15: how many in each?), "any equal
 * rows" (15 trees, any way), and a giant finale order worth double. Score =
 * base + bloom-clock bonus × streak; personal best in localStorage.
 *
 * Architecture: game flow lives HERE as React state (`view`); the scene
 * detects tiles/dwell/hops in its frame loop and reports through callbacks.
 */

const BEST_KEY = 'sq-best-times-grove-v1'
const ROW_GAP = 430

type Phase = 'build' | 'wilt' | 'bloom' | 'harvest' | 'results'

interface GroveView {
  index: number
  task: GroveTask
  phase: Phase
  /** the shape on show while not building (rooted / wilting / blooming) */
  shown: Planted | null
  bloomed: number
  spin: boolean
  fruit: string
}

interface Hud {
  score: number
  streak: number
  banner: string | null
  bannerColor?: string
  mood: KeeperMood
  moodToken: number
  say: string | null
  chip: 'open' | 'right' | 'wrong'
}

interface Stats {
  firstTry: number
  cleared: number
  streak: number
  bestStreak: number
  score: number
  trees: number
  quick: number
  misses: number
}

interface Results {
  stars: number
  score: number
  prevBest: number
  newBest: boolean
  perfect: boolean
  stats: Stats
}

const shapeKey = (p: Planted | null) => (p ? `${p.rows}x${p.cols}` : '')

/** The order on the keeper's scroll, in a few words. */
function orderText(t: GroveTask): string {
  switch (t.kind) {
    case 'missing':
      return `${t.rows} rows · ${t.total} trees`
    case 'total':
      return `${t.total} trees · equal rows`
    default:
      return `${t.rows} rows of ${t.cols}`
  }
}

/** What the keeper says when the shape doesn't fit. */
function needText(t: GroveTask, p: Planted): string {
  if (t.kind === 'total') return `Need ${t.total}!`
  if (t.kind === 'missing') return p.rows !== t.rows && p.cols !== t.rows ? `${t.rows} rows!` : `Need ${t.total}!`
  return `${t.rows} rows of ${t.cols}!`
}

export default function TimesGrove({ params, onComplete, meta, paused: hostPaused = false }: GameProps) {
  // A hidden page (app in the background, screen locked) pauses the run like the Quit dialog does.
  const hidden = usePageHidden()
  const paused = hostPaused || hidden
  // Graphics setting (Auto / Pretty / Fast): shadows + resolution follow it here too.
  const gfx = canvasQuality(useLowGraphics())
  useStarterCreature()
  const totalRounds = Math.max(1, (params?.rounds as number | undefined) ?? (params?.questionCount as number | undefined) ?? GROVE_ROUNDS)
  const grade = useProgress((s) => s.player?.grade)
  const maxFactor = groveMaxFactor(grade)
  // grade tiers: the order bank is filtered to the grade's factors
  const tasks = useMemo(() => planGroveRun(totalRounds, groveOrdersFor(maxFactor)), [totalRounds, maxFactor])

  const spawnWorld = useMemo(() => toWorld(...SPAWN_LOCAL), [])
  const posRef = useRef(new Vector3(spawnWorld[0], 0, spawnWorld[1]))
  const avatarRef = useRef<Group>(null)

  const [view, setView] = useState<GroveView | null>(null)
  const [built, setBuilt] = useState<Planted | null>({ rows: 1, cols: 1 })
  const [hud, setHud] = useState<Hud>({ score: 0, streak: 0, banner: null, mood: 'wave', moodToken: 0, say: null, chip: 'open' })
  const [crates, setCrates] = useState<{ totals: number[]; fruits: string[] }>({ totals: [], fruits: [] })
  const [results, setResults] = useState<Results | null>(null)
  const [best] = useState(() => loadBest(BEST_KEY).score)

  const viewRef = useRef<GroveView | null>(null)
  const builtRef = useRef<Planted | null>({ rows: 1, cols: 1 })
  const problemRef = useRef<Problem | null>(null)
  const triedRef = useRef(false)
  const finishedRef = useRef(false)
  const lastCommit = useRef('')
  const clockRef = useRef(0)
  const dwellRef = useRef(0)
  const hopRef = useRef<{ from: [number, number]; to: [number, number]; t: number; done: () => void } | null>(null)
  const timersRef = useRef<number[]>([])
  const stats = useRef<Stats>({ firstTry: 0, cleared: 0, streak: 0, bestStreak: 0, score: 0, trees: 0, quick: 0, misses: 0 })

  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  const activeCreature = useProgress((s) => s.activeCreature)

  useEffect(() => {
    viewRef.current = view
  }, [view])

  const later = useCallback((ms: number, fn: () => void) => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }, [])
  useEffect(
    () => () => {
      for (const t of timersRef.current) window.clearTimeout(t)
      timersRef.current = []
      voice.cancel()
    },
    [],
  )
  const patchHud = useCallback((p: Partial<Hud>) => setHud((h) => ({ ...h, ...p })), [])
  const react = useCallback((mood: KeeperMood, say: string | null) => setHud((h) => ({ ...h, mood, say, moodToken: h.moodToken + 1 })), [])
  const banner = useCallback(
    (text: string, color?: string, ms = 1500) => {
      patchHud({ banner: text, bannerColor: color })
      later(ms, () => setHud((h) => (h.banner === text ? { ...h, banner: null } : h)))
    },
    [later, patchHud],
  )

  // ── rounds ────────────────────────────────────────────────────────────────

  const startTask = useCallback(
    (index: number) => {
      const task = tasks[index]
      problemRef.current = groveProblem(groveOrder(task.rows, task.cols))
      triedRef.current = false
      lastCommit.current = ''
      clockRef.current = 0
      dwellRef.current = 0
      // every order starts from the seed bag (the kid has just hopped home)
      builtRef.current = { rows: 1, cols: 1 }
      setBuilt(builtRef.current)
      setView({ index, task, phase: 'build', shown: null, bloomed: 0, spin: false, fruit: FRUITS[index % FRUITS.length] })
      patchHud({ chip: 'open' })
      react(index === 0 ? 'wave' : 'idle', orderText(task))
      voice.say(task.kind === 'total' ? `Plant ${task.total} trees in equal rows!` : task.kind === 'missing' ? `${task.rows} rows, ${task.total} trees!` : `Plant ${task.rows} rows of ${task.cols}!`, { interrupt: true })
      if (index === 0) banner('Times Grove!', '#9fe6c8', 1700)
      else if (task.kind === 'finale') {
        banner('GIANT ORDER!', '#ffcf4d', 1700)
        juice.shake(0.3)
      } else if (task.kind === 'missing') banner('Mystery row!', '#cdb8f5', 1400)
      else if (task.kind === 'total') banner('Any equal rows!', '#8ab8ff', 1400)
      else if (index === tasks.findIndex((t) => !t.labels)) banner('No numbers now!', '#ffcf4d', 1400)
    },
    [tasks, patchHud, react, banner],
  )

  // the first order (deferred: no setState in the effect body)
  useEffect(() => {
    const t = window.setTimeout(() => startTask(0), 0)
    return () => window.clearTimeout(t)
  }, [startTask])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    const st = stats.current
    const stars = groveStars(st.firstTry, totalRounds)
    const perfect = st.firstTry === totalRounds && st.misses === 0
    const run = recordRun(BEST_KEY, { score: st.score, streak: st.bestStreak, perfect })
    setResults({ stars, score: st.score, prevBest: run.prev.score, newBest: run.newBest, perfect, stats: { ...st } })
    setView((v) => (v ? { ...v, phase: 'results' } : v))
    react('cheer', perfect ? 'Perfect!' : 'Beep beep!')
  }, [react, totalRounds])

  // ── the kid's planting ────────────────────────────────────────────────────

  /** The kid stepped onto another tile: the rectangle follows (with juice). */
  const onTile = useCallback((tile: Tile | null) => {
    const next = plantedShape(tile)
    const prev = builtRef.current
    if (shapeKey(next) === shapeKey(prev)) return
    builtRef.current = next
    setBuilt(next)
    const v = viewRef.current
    if (!v || v.phase !== 'build' || !next) return
    const total = next.rows * next.cols
    if (!prev || next.rows > prev.rows) {
      // a whole new row snaps in: count by the row
      const [x, z] = tileCenter(next.rows - 1, next.cols - 1)
      juice.text({ pos: wpos(x + 0.55, 1.3, z), text: String(total), size: 'md', color: '#ffe58a' })
      juice.burst({ pos: wpos(tileCenter(next.rows - 1, 0)[0] + ((next.cols - 1) * FIELD.pitch) / 2, 0.4, z), color: ['#8edb7c', '#6cc56b', '#ffffff'], count: 6 + next.cols * 2, speed: 1.6, up: 2, size: 0.07, life: 0.6 })
      sfx.combo(Math.min(next.rows, 8))
    } else if (next.cols > prev.cols) {
      sfx.pop()
      const [x, z] = tileCenter(next.rows - 1, next.cols - 1)
      juice.burst({ pos: wpos(x, 0.4, z), color: ['#8edb7c', '#ffffff'], count: 5, speed: 1.2, up: 1.6, size: 0.06, life: 0.5 })
    } else sfx.tick()
  }, [])

  const credit = useCallback(
    (right: boolean, problem: Problem) => {
      recordAnswer(right, problem)
      const sk = problem.skill
      if (meta && sk) recordAttempt({ zoneId: meta.zoneId, topic: 'multiplication-grove', skillId: sk.id, skillLabel: sk.label, correct: right })
    },
    [recordAnswer, recordAttempt, meta],
  )

  const hopHome = useCallback((done: () => void) => {
    const a = avatarRef.current
    if (!a) return done()
    hopRef.current = { from: [a.position.x, a.position.z], to: toWorld(...SPAWN_LOCAL), t: 0, done }
  }, [])

  /** The shape took root: grade it and play it out. */
  const commit = useCallback(
    (shape: Planted) => {
      const v = viewRef.current
      const problem = problemRef.current
      if (!v || !problem || v.phase !== 'build') return
      const key = shapeKey(shape)
      if (key === lastCommit.current) return
      lastCommit.current = key
      const { task } = v
      const verdict = judgePlanting(task, shape)
      const right = verdict !== 'wrong'
      credit(right, problem)
      const total = shape.rows * shape.cols
      const [c0x, c0z] = tileCenter(0, 0)
      const bx = c0x + ((shape.cols - 1) * FIELD.pitch) / 2
      const bz = c0z + ((shape.rows - 1) * FIELD.pitch) / 2
      const mid = wpos(bx, 1.6, bz)

      if (!right) {
        const st = stats.current
        st.misses += 1
        st.streak = 0
        triedRef.current = true
        patchHud({ streak: 0, chip: 'wrong' })
        sfx.wrong()
        sfx.thud()
        juice.text({ pos: mid, text: `${shape.rows} rows of ${shape.cols} = ${total}`, size: 'md', color: '#ffd0c8' })
        react('worry', needText(task, shape))
        setView({ ...v, phase: 'wilt', shown: shape })
        later(1500, () => {
          patchHud({ chip: 'open' })
          setView((w) => (w && w.phase === 'wilt' ? { ...w, phase: 'build', shown: null } : w))
        })
        return
      }

      // ── right: bloom row by row with the skip-count chant
      const st = stats.current
      if (!triedRef.current) st.firstTry += 1
      st.cleared += 1
      st.trees += total
      st.streak += 1
      st.bestStreak = Math.max(st.bestStreak, st.streak)
      const hit = plantPoints({ task, elapsed: clockRef.current, streak: st.streak })
      if (clockRef.current < task.par * 0.5) st.quick += 1
      st.score += hit.points
      juice.hitstop(80)
      juice.ring({ pos: wpos(bx, 0.15, bz), color: '#ffe58a', radius: 3.4 })
      sfx.sparkle()
      patchHud({ chip: 'right' })
      react('zip', 'Beep beep!')
      setView({ ...v, phase: 'bloom', shown: shape, bloomed: 0 })
      for (let i = 0; i < shape.rows; i++) {
        later(250 + i * ROW_GAP, () => {
          const [x, z] = tileCenter(i, shape.cols - 1)
          const n = (i + 1) * shape.cols
          const last = i === shape.rows - 1
          juice.text({ pos: wpos(x + 0.7, 1.45, z), text: last ? `${n}!` : String(n), size: last ? 'lg' : 'md', color: last ? '#ffe58a' : '#ffffff' })
          juice.burst({ pos: wpos(tileCenter(i, 0)[0] + ((shape.cols - 1) * FIELD.pitch) / 2, 0.9, z), color: [v.fruit, '#fcd3e2', '#ffffff', '#8edb7c'], count: 8 + shape.cols * 3, speed: 2.2, up: 2.6, size: 0.08, life: 0.8 })
          sfx.combo(i + 1)
          voice.say(String(n))
          setView((w) => (w && w.phase === 'bloom' ? { ...w, bloomed: i + 1 } : w))
        })
      }
      const afterRows = 250 + shape.rows * ROW_GAP + 150
      later(afterRows, () => {
        sfx.correct()
        juice.confetti(mid, task.kind === 'finale' ? 120 : 60)
        juice.shake(task.kind === 'finale' ? 0.5 : 0.25)
        juice.text({ pos: [mid[0], mid[1] + 1.1, mid[2]], text: `+${hit.points}`, size: 'lg', color: '#ffe58a' })
        if (hit.mult > 1) later(180, () => juice.text({ pos: [mid[0] + 1, mid[1] + 0.6, mid[2]], text: multLabel(hit.mult), size: 'md', color: '#ffb54d' }))
        if (st.streak >= 2) sfx.combo(st.streak)
        patchHud({ score: st.score, streak: st.streak })
        banner(`${shape.rows} × ${shape.cols} = ${total}`, '#9fe6c8', 1500)
        react('cheer', verdict === 'turned' ? 'Turned — same!' : `${total} trees!`)
      })
      // the commutativity beat: a quarter turn shows the twin array
      const turn = shape.rows !== shape.cols
      const spinAt = afterRows + 700
      if (turn) {
        later(spinAt, () => {
          setView((w) => (w && w.phase === 'bloom' ? { ...w, spin: true } : w))
          sfx.whoosh()
          juice.text({ pos: [mid[0], mid[1] + 0.8, mid[2]], text: `${shape.cols} rows of ${shape.rows} = ${total} too!`, size: 'md', color: '#cdb8f5' })
          voice.say(`${shape.cols} rows of ${shape.rows} is ${total} too!`)
        })
        later(spinAt + 1300, () => setView((w) => (w && w.phase === 'bloom' ? { ...w, spin: false } : w)))
      }
      const harvestAt = spinAt + (turn ? 1900 : 300)
      later(harvestAt, () => {
        // fruit flies to the crates
        const [kx, kz] = [CRATES.x, CRATES.z]
        juice.burst({ pos: wpos(kx, 1.2, kz), color: [v.fruit, '#ffe58a'], count: 24, speed: 2.4, up: 3, size: 0.1, life: 0.8 })
        sfx.coin()
        setCrates((c) => ({ totals: [...c.totals, total], fruits: [...c.fruits, v.fruit] }))
        setView((w) => (w ? { ...w, phase: 'harvest', spin: false } : w))
        later(650, () =>
          hopHome(() => {
            const next = v.index + 1
            if (next >= tasks.length) finish()
            else startTask(next)
          }),
        )
      })
    },
    [credit, later, patchHud, react, banner, hopHome, tasks.length, finish, startTask],
  )

  const collect = useCallback(() => {
    const r = results
    if (!r) return
    onComplete({ stars: r.stars, score: r.score, correct: r.stats.firstTry, total: totalRounds })
  }, [results, onComplete, totalRounds])

  // dev/QA hook: honest live machine state; `walk` teleports the avatar and the
  // REAL tile tracking + dwell react to it — nothing in QA results is faked.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    Object.assign(window, {
      __sqGrove: {
        state: () => {
          const v = viewRef.current
          return {
            phase: v?.phase ?? 'loading',
            index: v?.index ?? 0,
            task: v?.task ?? null,
            built: builtRef.current,
            shown: v?.shown ?? null,
            bloomed: v?.bloomed ?? 0,
            spin: v?.spin ?? false,
            dwell: +dwellRef.current.toFixed(2),
            clock: +clockRef.current.toFixed(1),
            ...stats.current,
            results: results ? { stars: results.stars, score: results.score, newBest: results.newBest, perfect: results.perfect } : null,
          }
        },
        /** world (x, z) of field tile (r, c) — rows down, columns right, from the seed bag */
        tile: (r: number, c: number) => {
          const [x, z] = toWorld(...tileCenter(r, c))
          return { x: +x.toFixed(2), z: +z.toFixed(2) }
        },
        walk: (x: number, z: number) => {
          avatarRef.current?.position.set(x, 0, z)
          posRef.current.set(x, 0, z)
        },
        pos: () => {
          const p = avatarRef.current?.position
          return p ? { x: +p.x.toFixed(2), z: +p.z.toFixed(2) } : null
        },
        collect,
      },
    })
  }, [results, collect])

  const task = view?.task ?? null
  const warm = !!task?.labels
  const shape = view && view.phase !== 'build' ? view.shown : built
  const live = built ?? null

  return (
    <div className="flex-1 relative select-none overflow-hidden">
      <GLCanvas
        shadows={gfx.shadows}
        flat
        dpr={gfx.dpr}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: import.meta.env.DEV }}
        camera={{ position: [spawnWorld[0] + CAM_OFFSET[0], CAM_OFFSET[1], spawnWorld[1] + CAM_OFFSET[2]], fov: CAM_FOV, near: 0.3, far: 260 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <GameSky shadowBox={9} />
        {view && (
          <GroveScene
            view={view}
            shape={shape}
            hud={hud}
            crates={crates}
            avatarRef={avatarRef}
            activeCreature={activeCreature}
            paused={paused || !!results}
            posRef={posRef}
            spawn={spawnWorld}
            dwellRef={dwellRef}
            clockRef={clockRef}
            hopRef={hopRef}
            lastCommit={lastCommit}
            onTile={onTile}
            onCommit={commit}
          />
        )}
      </GLCanvas>

      {/* ── HUD ── */}
      <div className={`absolute ${SAFE.top2} ${SAFE.left2} z-10 flex flex-col items-start gap-1.5 pointer-events-none`}>
        <ScoreChip score={hud.score} best={best} />
        <StreakMeter streak={hud.streak} />
      </div>
      {task && !results && (
        <div className={`absolute ${SAFE.top2} left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 pointer-events-none`}>
          <div
            key={`${view?.index}:${hud.chip}`}
            className={`kid-text flex items-center gap-2 rounded-2xl px-4 py-1 text-2xl sm:text-3xl text-white shadow-lg whitespace-nowrap chip-pop ${
              hud.chip === 'right' ? 'bg-emerald-600/90' : hud.chip === 'wrong' ? 'bg-rose-600/90' : task.kind === 'finale' ? 'bg-[#b5562f]/90' : 'bg-[#3a2c38]/80'
            }`}
            style={{ border: '3px solid rgba(255,255,255,.85)' }}
          >
            <span aria-hidden="true">{task.kind === 'finale' ? '👑' : task.kind === 'total' ? '🧺' : task.kind === 'missing' ? '❓' : '🌳'}</span>
            <span>{orderText(task)}</span>
          </div>
          <RoundPips total={totalRounds} current={view?.index ?? 0} finaleIcon="👑" done={!!results} />
        </div>
      )}
      {task && !results && view?.phase === 'build' && (
        <div className={`absolute ${SAFE.top2} ${SAFE.right2} z-10 pointer-events-none flex items-center gap-1.5 rounded-full bg-[#3a2c38]/70 px-2 py-1`} style={{ border: '2px solid rgba(255,255,255,.8)' }} aria-label="bloom clock">
          <span className="text-xl" aria-hidden="true">
            ☀️
          </span>
          <span className="block h-3 w-20 overflow-hidden rounded-full bg-white/25">
            <span
              key={`clock${view.index}`}
              className="block h-full rounded-full bg-[#ffd75e]"
              style={{ animation: `sqclock ${task.par}s linear forwards`, animationPlayState: paused ? 'paused' : 'running' }}
            />
          </span>
        </div>
      )}
      <Banner text={hud.banner} color={hud.bannerColor} />

      {task && !results && live && (
        <div className={`absolute ${SAFE.bottom3} left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-1.5`}>
          {view?.index === 0 && view.phase === 'build' && (
            <div key={isCommittable(live) ? 'still' : 'walk'} className="kid-text rounded-2xl bg-[#3a2c38]/80 px-3 py-0.5 text-lg text-white shadow chip-pop whitespace-nowrap">
              {isCommittable(live) ? '✋ Stand still to plant!' : <WalkHint keys="WASD / tap to walk — trees follow you" touch="👆 Tap to walk — trees follow you" />}
            </div>
          )}
          <div className="kid-text flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-1 text-2xl text-[#3a2c38] shadow-lg" style={{ border: '3px solid #3a2c38' }}>
            <span aria-hidden="true">🌱</span>
            {warm || task.kind === 'missing' ? (
              <span>
                {live.rows} {live.rows === 1 ? 'row' : 'rows'} of {live.cols} = <b className="tabular-nums">{live.rows * live.cols}</b>
              </span>
            ) : (
              <b className="tabular-nums">{live.rows * live.cols}</b>
            )}
          </div>
        </div>
      )}

      {results && (
        <RunResults
          title={results.perfect ? 'Perfect grove!' : 'Grove planted!'}
          emoji={results.perfect ? '🏆' : '🌳'}
          score={results.score}
          prevBest={results.prevBest}
          newBest={results.newBest}
          stars={results.stars}
          perfect={results.perfect ? 'Master Gardener' : null}
          rows={[
            { icon: '🎯', label: 'First-try orders', value: `${results.stats.firstTry}/${totalRounds}` },
            { icon: '🌳', label: 'Trees planted', value: results.stats.trees },
            { icon: '🔥', label: 'Best streak', value: `×${results.stats.bestStreak}` },
            { icon: '☀️', label: 'Quick plantings', value: results.stats.quick },
          ]}
          onCollect={collect}
        />
      )}
      <style>{`.chip-pop{animation:chippop .32s cubic-bezier(.2,1.5,.4,1)}@keyframes chippop{from{transform:scale(.7)}to{transform:scale(1)}}@keyframes sqclock{from{width:100%}to{width:0%}}`}</style>
      <div className="sr-only" aria-live="polite">
        {task ? `Order: ${orderText(task)}. You have planted ${live ? live.rows * live.cols : 0} trees.` : ''}
      </div>
    </div>
  )
}

// ── scene: presentational + tile tracking + dwell + hops ─────────────────────

function GroveScene({
  view,
  shape,
  hud,
  crates,
  avatarRef,
  activeCreature,
  paused,
  posRef,
  spawn,
  dwellRef,
  clockRef,
  hopRef,
  lastCommit,
  onTile,
  onCommit,
}: {
  view: GroveView
  shape: Planted | null
  hud: Hud
  crates: { totals: number[]; fruits: string[] }
  avatarRef: RefObject<Group | null>
  activeCreature: string | null
  paused: boolean
  posRef: RefObject<Vector3>
  spawn: [number, number]
  dwellRef: RefObject<number>
  clockRef: RefObject<number>
  hopRef: RefObject<{ from: [number, number]; to: [number, number]; t: number; done: () => void } | null>
  lastCommit: RefObject<string>
  onTile: (t: Tile | null) => void
  onCommit: (p: Planted) => void
}) {
  // the kid stays on the field (a square in the turned local frame)
  const collide = useCallback((x: number, z: number) => {
    return Math.abs(localX(x, z)) > FIELD_HALF + 0.12 || Math.abs(localZ(x, z)) > FIELD_HALF + 0.12
  }, [])
  const hopping = useRef(false)
  useWanderWalk({
    group: avatarRef,
    bound: 30,
    collide,
    wander: false,
    paused: () => paused || hopping.current,
  })

  const live = useRef({ view, paused, onTile, onCommit })
  useEffect(() => {
    live.current = { view, paused, onTile, onCommit }
  }, [view, paused, onTile, onCommit])
  const st = useRef({ tile: null as Tile | null, shape: null as Planted | null, lx: 0, lz: 0, still: 0 })

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const a = avatarRef.current
    if (!a) return
    posRef.current.set(a.position.x, a.position.y, a.position.z)
    const { view: v, paused: hold, onTile: tileCb, onCommit: commitCb } = live.current

    // hop home (between orders): an arc back to the seed bag
    const hop = hopRef.current
    if (hop) {
      hopping.current = true
      hop.t = Math.min(1, hop.t + dt / 0.6)
      const k = hop.t
      const e = k * k * (3 - 2 * k)
      a.position.set(hop.from[0] + (hop.to[0] - hop.from[0]) * e, Math.sin(k * Math.PI) * 1.4, hop.from[1] + (hop.to[1] - hop.from[1]) * e)
      if (k >= 1) {
        a.position.y = 0
        hopRef.current = null
        hopping.current = false
        juice.dust([a.position.x, 0.05, a.position.z])
        sfx.pop()
        hop.done()
      }
      return
    }
    if (hold) return
    if (v.phase === 'build') clockRef.current = (clockRef.current ?? 0) + dt

    const lx = localX(a.position.x, a.position.z)
    const lz = localZ(a.position.x, a.position.z)
    const s = st.current
    const tile = tileAt(lx, lz, s.tile)
    if (tile !== s.tile) {
      s.tile = tile
      s.shape = plantedShape(tile)
      tileCb(tile)
    }
    // standing still on a finished-looking shape roots it
    const moved = Math.hypot(lx - s.lx, lz - s.lz) > 0.004
    s.lx = lx
    s.lz = lz
    const p = s.shape
    if (v.phase === 'build' && isCommittable(p) && shapeKey(p) !== lastCommit.current && !moved) {
      s.still += dt
      dwellRef.current = Math.min(1, s.still / DWELL)
      if (s.still >= DWELL) {
        s.still = 0
        dwellRef.current = 0
        commitCb(p)
      }
    } else {
      s.still = 0
      dwellRef.current = 0
    }
  })

  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])
  const mode: FieldMode = view.phase === 'wilt' ? 'wilt' : view.phase === 'bloom' ? 'bloom' : view.phase === 'harvest' || view.phase === 'results' ? 'harvest' : 'build'

  return (
    <group>
      <group rotation={[0, ISO_YAW, 0]}>
        <StaticBatch><GroveSet /></StaticBatch>
        <PlantField shape={shape} mode={mode} bloomed={view.bloomed} spin={view.spin} fruit={view.fruit} />
        {view.task.labels && <FieldLabels shape={shape} />}
        <SeedBag x={SEED_BAG.x} z={SEED_BAG.z} />
        <Keeper mood={hud.mood} token={hud.moodToken} say={hud.say} />
        <CrateStack totals={crates.totals} fruits={crates.fruits} />
        <RootRing avatarRef={avatarRef} progress={dwellRef} />
      </group>
      <group ref={avatarRef} position={[spawn[0], 0, spawn[1]]}>
        <group scale={1.25}>
          <b.Builder />
          <CreatureAccessories />
        </group>
      </group>
      <GameCameraRig targetRef={posRef} focus={FOCUS} offset={CAM_OFFSET} follow={0.12} />
      <JuiceLayer />
    </group>
  )
}

const FOCUS: [number, number, number] = (() => {
  const [x, z] = toWorld(...CAM_FOCUS_LOCAL)
  return [x, 0, z]
})()

