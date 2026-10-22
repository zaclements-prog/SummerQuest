import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import type { RefObject } from 'react'
import GLCanvas from '../platform/gl/GLCanvas'
import { usePageHidden } from '../platform/gl/usePageHidden'
import StaticBatch from '../toon/StaticBatch'
import type { GameProps } from '../screens/GameRunner'
import { useProgress } from '../store/progress'
import { sfx } from '../lib/sound'
import { useWanderWalk } from '../world/useWanderWalk'
import { creatureBuilder } from '../home/models/registry'
import CreatureAccessories from '../home/world/CreatureAccessories'
import { useStarterCreature } from '../home/starterCreature'
import {
  AREA_ROUNDS,
  AREA_SPAWN,
  POSTS,
  areaStars,
  areaStepProblem,
  planAreaRun,
  plotPoints,
  plotRects,
  postAt,
  stepAsk,
  wrongPostLine,
  type AreaOrder,
} from '../lib/grove/areaCore'
import { fmt } from '../lib/providers/g5Shared'
import { CrateStack, Keeper, RootRing, type KeeperMood } from './TimesGrove.parts'
import { GroveSet } from './TimesGrove.set'
import { CAM_FOV, CAM_OFFSET, CRATES, DWELL, FIELD_HALF, FRUITS, ISO_YAW, toWorld, wpos } from './TimesGrove.layout'
import { AreaPlots, SeedPost } from './TimesGroveArea.parts'
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
 * Times Grove, 5th grade: the area-model grove (lib/grove/areaCore). The
 * field is the area model of an order like 23 × 14 — 20 and 3 down the side,
 * 10 and 4 across the top, a plot for each partial product. The keeper asks
 * for one plot at a time ("20 × 4 = ?"); three seed posts below the field
 * offer a number each; standing still at a post plants it. Right: the plot
 * grows into a little orchard and shows its product. Wrong: the post droops,
 * the keeper says what that plot really isn't, and the kid tries another.
 * With every plot planted the posts offer totals; the right one is the
 * harvest crate. A warm-up order, a 2-digit by 2-digit one, and a giant
 * 3-digit by 2-digit finale. Same props, results and stars path as Times Grove.
 */

const BEST_KEY = 'sq-best-times-grove-area-v1'

type Phase = 'ask' | 'wrong' | 'grow' | 'harvest' | 'results'

interface View {
  order: number
  step: number
  phase: Phase
  solved: boolean[][]
  /** posts tried and wrong this step */
  tried: number[]
  right: number | null
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
}

interface Stats {
  firstTry: number
  steps: number
  streak: number
  bestStreak: number
  score: number
  plots: number
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

const emptySolved = (o: AreaOrder) => o.model.rows.map(() => o.model.cols.map(() => false))

export default function TimesGroveArea({ params, onComplete, meta, paused: hostPaused = false }: GameProps) {
  const hidden = usePageHidden()
  const paused = hostPaused || hidden
  const gfx = canvasQuality(useLowGraphics())
  useStarterCreature()
  const rounds = Math.max(1, (params?.rounds as number | undefined) ?? AREA_ROUNDS)
  const orders = useMemo(() => planAreaRun(rounds), [rounds])
  const totalSteps = useMemo(() => orders.reduce((s, o) => s + o.steps.length, 0), [orders])

  const spawnWorld = useMemo(() => toWorld(...AREA_SPAWN), [])
  const posRef = useRef(new Vector3(spawnWorld[0], 0, spawnWorld[1]))
  const avatarRef = useRef<Group>(null)

  const [view, setView] = useState<View>(() => ({ order: 0, step: 0, phase: 'ask', solved: emptySolved(orders[0]), tried: [], right: null, fruit: FRUITS[0] }))
  const [hud, setHud] = useState<Hud>({ score: 0, streak: 0, banner: null, mood: 'wave', moodToken: 0, say: null })
  const [crates, setCrates] = useState<{ totals: number[]; fruits: string[] }>({ totals: [], fruits: [] })
  const [results, setResults] = useState<Results | null>(null)
  const [best] = useState(() => loadBest(BEST_KEY).score)

  const viewRef = useRef(view)
  const dwellRef = useRef(0)
  const clockRef = useRef(0)
  const triedRef = useRef(false)
  const finishedRef = useRef(false)
  const timersRef = useRef<number[]>([])
  const stats = useRef<Stats>({ firstTry: 0, steps: 0, streak: 0, bestStreak: 0, score: 0, plots: 0, misses: 0 })
  const serial = useRef(0)

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

  const order = orders[view.order]
  const step = order.steps[view.step]

  /** Say the step's question (the keeper's bubble and the voice). */
  const ask = useCallback(
    (oi: number, si: number) => {
      const o = orders[oi]
      const st = o.steps[si]
      clockRef.current = 0
      triedRef.current = false
      const q = stepAsk(o, st)
      react(si === 0 && oi === 0 ? 'wave' : 'idle', q)
      if (st.kind === 'total') {
        banner('Now the total!', '#ffcf4d', 1500)
        voice.say(`All planted! What is ${fmt(o.model.a)} times ${fmt(o.model.b)}? Add the plots.`, { interrupt: true })
      } else {
        voice.say(`${fmt(o.model.rows[st.i])} times ${fmt(o.model.cols[st.j])}?`, { interrupt: true })
      }
    },
    [orders, react, banner],
  )

  // the first order (deferred: no setState in the effect body)
  useEffect(() => {
    const t = window.setTimeout(() => {
      banner('Area Model Grove!', '#9fe6c8', 1700)
      ask(0, 0)
    }, 0)
    return () => window.clearTimeout(t)
  }, [ask, banner])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    const st = stats.current
    const stars = areaStars(st.firstTry, totalSteps)
    const perfect = st.firstTry === totalSteps && st.misses === 0
    const run = recordRun(BEST_KEY, { score: st.score, streak: st.bestStreak, perfect })
    setResults({ stars, score: st.score, prevBest: run.prev.score, newBest: run.newBest, perfect, stats: { ...st } })
    setView((v) => ({ ...v, phase: 'results' }))
    react('cheer', perfect ? 'Perfect!' : 'Beep beep!')
  }, [react, totalSteps])

  const hopHome = useCallback(() => {
    avatarRef.current?.position.set(spawnWorld[0], 0, spawnWorld[1])
    posRef.current.set(spawnWorld[0], 0, spawnWorld[1])
    juice.dust(wpos(AREA_SPAWN[0], 0.05, AREA_SPAWN[1]))
  }, [spawnWorld])

  /** The kid stood still at post `k`: plant that number. */
  const pick = useCallback(
    (k: number) => {
      const v = viewRef.current
      if (v.phase !== 'ask' || v.tried.includes(k)) return
      const o = orders[v.order]
      const st = o.steps[v.step]
      const n = st.posts[k]
      const right = n === st.answer
      const problem = areaStepProblem(o, st, `grove-area-${serial.current++}`)
      recordAnswer(right, problem)
      if (meta && problem.skill) recordAttempt({ zoneId: meta.zoneId, topic: problem.topic, skillId: problem.skill.id, skillLabel: problem.skill.label, correct: right })
      const [px, pz] = POSTS[k]
      const s = stats.current
      if (!right) {
        s.misses += 1
        s.streak = 0
        triedRef.current = true
        patchHud({ streak: 0 })
        sfx.wrong()
        sfx.thud()
        juice.text({ pos: wpos(px, 1.6, pz), text: '✗', size: 'md', color: '#ffd0c8' })
        react('worry', wrongPostLine(o, st, n))
        setView({ ...v, phase: 'wrong', tried: [...v.tried, k] })
        later(1300, () => setView((w) => (w.phase === 'wrong' ? { ...w, phase: 'ask' } : w)))
        return
      }
      if (!triedRef.current) s.firstTry += 1
      s.steps += 1
      s.streak += 1
      s.bestStreak = Math.max(s.bestStreak, s.streak)
      const hit = plotPoints({ total: st.kind === 'total', elapsed: clockRef.current, streak: s.streak })
      s.score += hit.points
      patchHud({ score: s.score, streak: s.streak })
      sfx.sparkle()
      sfx.correct()
      if (s.streak >= 2) sfx.combo(s.streak)
      juice.hitstop(70)
      juice.text({ pos: wpos(px, 1.9, pz), text: `+${hit.points}`, size: 'lg', color: '#ffe58a' })
      if (hit.mult > 1) later(160, () => juice.text({ pos: wpos(px + 0.8, 1.5, pz), text: multLabel(hit.mult), size: 'md', color: '#ffb54d' }))

      if (st.kind === 'cell') {
        s.plots += 1
        const [x0, x1, z0, z1] = plotRects(o.model)[st.i][st.j]
        const mid = wpos((x0 + x1) / 2, 0.8, (z0 + z1) / 2)
        juice.burst({ pos: mid, color: ['#8edb7c', '#ffffff', v.fruit], count: 26, speed: 2.4, up: 3, size: 0.09, life: 0.8 })
        juice.ring({ pos: wpos((x0 + x1) / 2, 0.15, (z0 + z1) / 2), color: '#ffe58a', radius: 1.6 })
        const solved = v.solved.map((row, i) => row.map((x, j) => x || (i === st.i && j === st.j)))
        react('cheer', `${fmt(o.model.rows[st.i])} × ${fmt(o.model.cols[st.j])} = ${fmt(st.answer)}`)
        voice.say(`${fmt(st.answer)}!`)
        setView({ ...v, phase: 'grow', solved, right: k })
        later(1200, () => {
          setView((w) => ({ ...w, phase: 'ask', step: w.step + 1, tried: [], right: null }))
          ask(v.order, v.step + 1)
        })
        return
      }
      // the total: harvest
      juice.confetti(wpos(0, 1.5, -0.9), o.kind === 'finale' ? 120 : 70)
      juice.shake(o.kind === 'finale' ? 0.5 : 0.25)
      banner(`${fmt(o.model.a)} × ${fmt(o.model.b)} = ${fmt(o.model.total)}`, '#9fe6c8', 1800)
      react('zip', 'Beep beep!')
      voice.say(`${fmt(o.model.a)} times ${fmt(o.model.b)} is ${fmt(o.model.total)}!`)
      setView({ ...v, phase: 'harvest', right: k })
      later(1500, () => {
        juice.burst({ pos: wpos(CRATES.x, 1.2, CRATES.z), color: [v.fruit, '#ffe58a'], count: 24, speed: 2.4, up: 3, size: 0.1, life: 0.8 })
        sfx.coin()
        setCrates((c) => ({ totals: [...c.totals, o.model.total], fruits: [...c.fruits, v.fruit] }))
      })
      later(2400, () => {
        const next = v.order + 1
        if (next >= orders.length) {
          finish()
          return
        }
        hopHome()
        setView({ order: next, step: 0, phase: 'ask', solved: emptySolved(orders[next]), tried: [], right: null, fruit: FRUITS[next % FRUITS.length] })
        if (orders[next].kind === 'finale') {
          banner('GIANT ORDER!', '#ffcf4d', 1700)
          juice.shake(0.3)
        }
        ask(next, 0)
      })
    },
    [orders, meta, recordAnswer, recordAttempt, patchHud, react, banner, later, ask, finish, hopHome],
  )

  const collect = useCallback(() => {
    const r = results
    if (!r) return
    onComplete({ stars: r.stars, score: r.score, correct: r.stats.firstTry, total: totalSteps })
  }, [results, onComplete, totalSteps])

  // dev/QA hook: honest live state; `walk` teleports the avatar and the REAL
  // post detection + dwell react to it.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    Object.assign(window, {
      __sqGroveArea: {
        state: () => {
          const v = viewRef.current
          const o = orders[v.order]
          const st = o.steps[v.step]
          return {
            phase: v.phase,
            order: v.order,
            step: v.step,
            ask: st ? stepAsk(o, st) : null,
            posts: st?.posts ?? null,
            answer: st?.answer ?? null,
            tried: v.tried,
            dwell: +dwellRef.current.toFixed(2),
            ...stats.current,
            results: results ? { stars: results.stars, score: results.score } : null,
          }
        },
        post: (k: number) => {
          const [x, z] = toWorld(...POSTS[k])
          return { x: +x.toFixed(2), z: +z.toFixed(2) }
        },
        home: () => ({ x: +spawnWorld[0].toFixed(2), z: +spawnWorld[1].toFixed(2) }),
        walk: (x: number, z: number) => {
          avatarRef.current?.position.set(x, 0, z)
          posRef.current.set(x, 0, z)
        },
        collect,
      },
    })
  }, [orders, results, collect, spawnWorld])

  const active: [number, number] | null = step && step.kind === 'cell' && view.phase !== 'grow' ? [step.i, step.j] : null
  const asking = view.phase === 'ask' || view.phase === 'wrong'

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
        <AreaScene
          order={order}
          view={view}
          hud={hud}
          crates={crates}
          active={active}
          avatarRef={avatarRef}
          activeCreature={activeCreature}
          paused={paused || !!results}
          posRef={posRef}
          spawn={spawnWorld}
          dwellRef={dwellRef}
          clockRef={clockRef}
          onPick={pick}
        />
      </GLCanvas>

      <div className={`absolute ${SAFE.top2} ${SAFE.left2} z-10 flex flex-col items-start gap-1.5 pointer-events-none`}>
        <ScoreChip score={hud.score} best={best} />
        <StreakMeter streak={hud.streak} />
      </div>
      {!results && step && (
        <div className={`absolute ${SAFE.top2} left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 pointer-events-none`}>
          <div className="kid-text flex items-center gap-2 rounded-2xl px-4 py-1 text-2xl sm:text-3xl text-white shadow-lg whitespace-nowrap bg-[#3a2c38]/80" style={{ border: '3px solid rgba(255,255,255,.85)' }}>
            <span aria-hidden="true">{order.kind === 'finale' ? '👑' : '🌳'}</span>
            <span className="tabular-nums">{asking ? stepAsk(order, step) : `${fmt(order.model.a)} × ${fmt(order.model.b)}`}</span>
          </div>
          <RoundPips total={orders.length} current={view.order} finaleIcon="👑" done={!!results} />
        </div>
      )}
      <Banner text={hud.banner} color={hud.bannerColor} />
      {!results && view.order === 0 && view.step === 0 && view.phase === 'ask' && (
        <div className={`absolute ${SAFE.bottom3} left-1/2 -translate-x-1/2 z-10 pointer-events-none`}>
          <div className="kid-text rounded-2xl bg-[#3a2c38]/80 px-3 py-0.5 text-lg text-white shadow whitespace-nowrap">
            <WalkHint keys="WASD / tap to walk to a post, then stand still" touch="👆 Walk to a post, then stand still" />
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
            { icon: '🎯', label: 'First-try plantings', value: `${results.stats.firstTry}/${totalSteps}` },
            { icon: '🟩', label: 'Plots planted', value: results.stats.plots },
            { icon: '🔥', label: 'Best streak', value: `×${results.stats.bestStreak}` },
          ]}
          onCollect={collect}
        />
      )}
      <div className="sr-only" aria-live="polite">
        {step ? `${fmt(order.model.a)} times ${fmt(order.model.b)}. ${stepAsk(order, step)} The posts say ${step.posts.map(fmt).join(', ')}.` : ''}
      </div>
    </div>
  )
}

function AreaScene({
  order,
  view,
  hud,
  crates,
  active,
  avatarRef,
  activeCreature,
  paused,
  posRef,
  spawn,
  dwellRef,
  clockRef,
  onPick,
}: {
  order: AreaOrder
  view: View
  hud: Hud
  crates: { totals: number[]; fruits: string[] }
  active: [number, number] | null
  avatarRef: RefObject<Group | null>
  activeCreature: string | null
  paused: boolean
  posRef: RefObject<Vector3>
  spawn: [number, number]
  dwellRef: RefObject<number>
  clockRef: RefObject<number>
  onPick: (k: number) => void
}) {
  // the kid stays on the field (a square in the turned local frame)
  const collide = useCallback((x: number, z: number) => Math.abs(localX(x, z)) > FIELD_HALF + 0.12 || Math.abs(localZ(x, z)) > FIELD_HALF + 0.12, [])
  useWanderWalk({ group: avatarRef, bound: 30, collide, wander: false, paused: () => paused })

  const live = useRef({ view, paused, onPick })
  useEffect(() => {
    live.current = { view, paused, onPick }
  }, [view, paused, onPick])
  const st = useRef({ post: null as number | null, done: null as number | null, lx: 0, lz: 0, still: 0 })

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const a = avatarRef.current
    if (!a) return
    posRef.current.set(a.position.x, a.position.y, a.position.z)
    const { view: v, paused: hold, onPick: pickCb } = live.current
    if (hold) return
    if (v.phase === 'ask') clockRef.current = (clockRef.current ?? 0) + dt
    const lx = localX(a.position.x, a.position.z)
    const lz = localZ(a.position.x, a.position.z)
    const s = st.current
    const k = postAt(lx, lz)
    // a post picked once needs the kid to step away before it counts again
    if (k !== s.done) s.done = null
    const moved = Math.hypot(lx - s.lx, lz - s.lz) > 0.004
    s.lx = lx
    s.lz = lz
    if (v.phase === 'ask' && k !== null && k !== s.done && !v.tried.includes(k) && !moved) {
      s.still += dt
      dwellRef.current = Math.min(1, s.still / DWELL)
      if (s.still >= DWELL) {
        s.still = 0
        dwellRef.current = 0
        s.done = k
        pickCb(k)
      }
    } else {
      s.still = 0
      dwellRef.current = 0
    }
  })

  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])
  const step = order.steps[view.step]
  return (
    <group>
      <group rotation={[0, ISO_YAW, 0]}>
        <StaticBatch>
          <GroveSet />
        </StaticBatch>
        {/* the bed under the plots and posts */}
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[FIELD_HALF * 2 + 0.3, FIELD_HALF * 2 + 0.3]} />
          <meshLambertMaterial color={'#d8b27c'} />
        </mesh>
        <AreaPlots key={view.order} model={order.model} solved={view.solved} active={active} wilt={view.phase === 'wrong'} />
        {step &&
          view.phase !== 'results' &&
          POSTS.map(([x, z], k) => (
            <SeedPost key={`${view.order}:${view.step}:${k}`} x={x} z={z} n={step.posts[k]} state={view.right === k ? 'right' : view.tried.includes(k) ? 'wrong' : 'idle'} />
          ))}
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
  const [x, z] = toWorld(0, 0.1)
  return [x, 0, z]
})()
