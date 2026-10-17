import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import type { RefObject } from 'react'
import type { GameProps } from '../screens/GameRunner'
import type { Problem } from '../lib/problem'
import { nextProblem } from '../lib/problem'
import type { Collider } from '../world/worldLayout'
import { useProgress } from '../store/progress'
import { sfx } from '../lib/sound'
import { TOON } from '../toon/palette'
import { chalkText } from '../world/town/chalk'
import { useWanderWalk } from '../world/useWanderWalk'
import WorldCameraRig from '../world/WorldCameraRig'
import { creatureBuilder } from '../home/models/registry'
import CreatureAccessories from '../home/world/CreatureAccessories'
import { collidesAt } from '../world/collision'
import {
  BAD_HINT,
  CYCLE_START,
  GOOD_LINE,
  PROCESS_DIGIT,
  ROUNDS,
  applyProcess,
  cycleStars,
  parseCycleRound,
  type CycleRound,
  type CycleState,
  type Process,
} from '../lib/cycle/cycleCore'
import { makeScienceCycleProvider } from '../lib/providers/scienceCycle'
import { CloudTower, CycleYard, GongGarden, PondSun, StationCard, type StationMode } from './CloudKeeper.parts'
import { ChalkEasel } from './_shared/ChalkEasel'
import { GroundRing } from './_shared/GroundRing'
import { fitChalk } from './_shared/chalkBoard'

/**
 * Cloud Keeper — the water-cycle game for Science Summit (3-ESS2-ish: the
 * evaporation → condensation → precipitation loop). The board shows the round
 * counter and the trace of steps performed so far; the HUD speaks the
 * situation ("The sun warms the ocean. Water turns into vapor and rises…").
 * Three NUMBERED stations ARE the three answer choices: step onto one to
 * perform its process. The right station advances the loop's physical state
 * (pond dips, cloud fattens, rain refills the garden); the wrong one performs
 * and stalls — the vapor sinks back, nothing gathers — with a lesson. The
 * answer is never a word on a button: it is a place you walk to. Spec:
 * docs/superpowers/specs/2026-10-16-cloud-keeper-design.md
 *
 * Architecture (the arena's/forge's): all game flow lives HERE as React state
 * (`view`); the scene is presentational and only detects proximity, reporting
 * through callbacks. Refs are touched in effects/callbacks only.
 */

const BOUND = 7.2
const SPAWN: [number, number] = [4.9, 5.4]
/** The three stations, one per process — walking onto one IS answering. */
const STATIONS: { id: Process; x: number; z: number; r: number }[] = [
  { id: 'evaporation', x: -3.6, z: 0.6, r: 2.15 },
  { id: 'condensation', x: 0, z: -3.6, r: 1.6 },
  { id: 'precipitation', x: 3.6, z: 0.6, r: 1.35 },
]
/** How long a station performs before the answer resolves. */
const PERFORM_MS = 1300
const CYCLE_CAM: [number, number, number] = [10.5, 8.6, 10.5]

export type CyclePhase = 'loading' | 'explore' | 'perform' | 'good' | 'bad' | 'won'

export interface CycleView {
  round: CycleRound
  phase: CyclePhase
  /** station being performed / just performed (drives its animation) */
  station: Process | null
  /** bumped per resolve so animation flashes remount cleanly */
  token: number
}

export default function CloudKeeper({ params, onComplete, meta, paused = false }: GameProps) {
  const totalRounds = (params?.rounds as number | undefined) ?? (params?.questionCount as number | undefined) ?? ROUNDS
  const facts = useMemo(() => makeScienceCycleProvider(), [])
  const posRef = useRef(new Vector3(...SPAWN, 0))
  const avatarRef = useRef<Group>(null)
  const [view, setView] = useState<CycleView | null>(null)
  const [cycle, setCycle] = useState<CycleState>(CYCLE_START)
  const [trace, setTrace] = useState<Process[]>([])
  const [hud, setHud] = useState<{ text: string; dot: number; flash: 'good' | 'bad' | null } | null>(null)

  const viewRef = useRef<CycleView | null>(null)
  const problemRef = useRef<Problem | null>(null)
  const triedRef = useRef(false)
  const finishedRef = useRef(false)
  const timersRef = useRef<number[]>([])

  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  const activeCreature = useProgress((s) => s.activeCreature)

  useEffect(() => {
    viewRef.current = view
  }, [view])

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []
  }, [])
  useEffect(() => clearTimers, [clearTimers])

  const tallyIndex = useRef(0)

  const say = useCallback((text: string, flash: 'good' | 'bad' | null = null) => {
    setHud({ text, dot: tallyIndex.current, flash })
  }, [])

  const applyRound = useCallback(
    (problem: Problem, index: number) => {
      const round = parseCycleRound(problem)
      problemRef.current = problem
      triedRef.current = false
      tallyIndex.current = index
      setView({ round, phase: 'explore', station: null, token: Date.now() })
      say(round.prompt)
    },
    [say],
  )

  // first round (ConceptPlay's pattern: setState only in the .then)
  useEffect(() => {
    let cancel = false
    nextProblem(facts).then((p) => {
      if (!cancel) applyRound(p, 0)
    })
    return () => {
      cancel = true
    }
  }, [facts, applyRound])

  const tally = useRef({ cleared: 0, firstTry: 0 })

  const loadNext = useCallback(() => {
    const t = tally.current
    const index = tallyIndex.current + 1
    if (index >= totalRounds) {
      if (finishedRef.current) return
      finishedRef.current = true
      setView((v) => (v ? { ...v, phase: 'won', station: null } : v))
      say(t.firstTry === totalRounds ? 'The whole loop ran — every step first try! 🏆' : `Loop complete! ${t.firstTry} of ${totalRounds} first try.`)
      onComplete({ stars: cycleStars(t.firstTry, totalRounds), score: t.firstTry * 20, correct: t.firstTry, total: totalRounds })
      return
    }
    nextProblem(facts).then((p) => applyRound(p, index))
  }, [applyRound, onComplete, facts, totalRounds, say])

  /** The kid stepped onto a station: perform it, then grade when it finishes. */
  const perform = useCallback(
    (process: Process) => {
      sfx.click()
      setView((v) => (v && v.phase === 'explore' ? { ...v, phase: 'perform', station: process, token: v.token + 1 } : v))
      timersRef.current.push(
        window.setTimeout(() => {
          const v = viewRef.current
          const problem = problemRef.current
          if (!v || !problem || v.phase !== 'perform' || v.station !== process) return
          const right = process === v.round.answer
          const first = !triedRef.current
          triedRef.current = true
          recordAnswer(right, problem)
          const sk = problem.skill
          if (meta && sk) recordAttempt({ zoneId: meta.zoneId, topic: facts.topic, skillId: sk.id, skillLabel: sk.label, correct: right })

          if (right) {
            tally.current.cleared += 1
            tally.current.firstTry += first ? 1 : 0
            sfx.correct()
            setCycle((s) => applyProcess(s, process))
            setTrace((tr) => [...tr, process])
            say(GOOD_LINE[process], 'good')
            setView((w) => (w ? { ...w, phase: 'good' } : w))
            timersRef.current.push(window.setTimeout(loadNext, 2100))
          } else {
            sfx.wrong()
            say(BAD_HINT[process], 'bad')
            setView((w) => (w ? { ...w, phase: 'bad' } : w))
            timersRef.current.push(
              window.setTimeout(() => setView((w) => (w && w.phase === 'bad' ? { ...w, phase: 'explore', station: null } : w)), 2900),
            )
          }
        }, PERFORM_MS),
      )
    },
    [facts.topic, loadNext, meta, recordAnswer, recordAttempt, say],
  )

  // dev/QA hook: honest live machine state; `walk` teleports the avatar and the
  // REAL station detection reacts to it — nothing in QA results is faked.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    Object.assign(window, {
      __sqCycle: {
        state: () => {
          const v = viewRef.current
          return {
            phase: v?.phase ?? 'loading',
            index: tallyIndex.current,
            ...tally.current,
            round: v?.round ?? null,
            station: v?.station ?? null,
            cycle,
            trace,
          }
        },
        stations: STATIONS,
        walk: (x: number, z: number) => {
          avatarRef.current?.position.set(x, 0, z)
          posRef.current.set(x, 0, z)
        },
        pos: () => {
          const p = avatarRef.current?.position
          return p ? { x: +p.x.toFixed(2), z: +p.z.toFixed(2) } : null
        },
      },
    })
  }, [cycle, trace])

  const board1 = `${Math.min((hud?.dot ?? 0) + 1, totalRounds)}/${totalRounds}`
  const board2 = trace.length ? trace.slice(-7).map((p) => PROCESS_DIGIT[p]).join(' ') : '_'

  return (
    <div className="flex-1 relative select-none">
      <Canvas
        shadows
        flat
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: import.meta.env.DEV }}
        camera={{ position: [SPAWN[0] + CYCLE_CAM[0], CYCLE_CAM[1], SPAWN[1] + CYCLE_CAM[2]], fov: 46, near: 0.3, far: 220 }}
        style={{ position: 'absolute', inset: 0 }}
        onCreated={({ scene }) => {
          if (import.meta.env.DEV) Object.assign(window, { __sqScene: scene })
        }}
      >
        <color attach="background" args={['#d9effa']} />
        <fog attach="fog" args={['#d9effa', 42, 120]} />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[9, 15, 6]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
        />
        {view && (
          <CycleScene
            view={view}
            cycle={cycle}
            board1={board1}
            board2={board2}
            avatarRef={avatarRef}
            activeCreature={activeCreature}
            paused={paused}
            posRef={posRef}
            onStation={perform}
          />
        )}
      </Canvas>

      {/* round dots — completed rounds light up, and all light on a clear */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
        {Array.from({ length: totalRounds }, (_, i) => {
          const done = view?.phase === 'won' || i < (hud?.dot ?? 0)
          return (
            <span
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 border-white/80 shadow ${done ? 'bg-yellow-300' : 'bg-sky-900/25'}`}
            />
          )
        })}
      </div>
      {hud && (
        <div
          key={`${hud.dot}-${hud.text}`}
          className={`absolute bottom-16 left-1/2 -translate-x-1/2 max-w-[92%] kid-text text-lg sm:text-2xl text-center px-5 py-2 rounded-3xl shadow-lg text-white hud-pop ${
            hud.flash === 'bad' ? 'bg-rose-600/85' : hud.flash === 'good' ? 'bg-emerald-600/85' : 'bg-sky-900/70'
          }`}
        >
          {hud.text}
        </div>
      )}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 kid-text text-white/90 text-[11px] sm:text-xs bg-sky-900/50 px-3 py-1 rounded-full pointer-events-none whitespace-nowrap">
        WASD walk · step onto a numbered station to perform its step
      </div>
      <style>{`.hud-pop{animation:hudpop .3s ease-out}@keyframes hudpop{from{transform:translate(-50%,10px);opacity:0}to{transform:translate(-50%,0);opacity:1}}`}</style>
    </div>
  )
}

// ── scene: presentational + proximity detection only ─────────────────────────

function stationMode(view: CycleView, id: Process): StationMode {
  if (view.station !== id) return 'off'
  return view.phase === 'bad' ? 'stall' : 'run'
}

function CycleScene({
  view,
  cycle,
  board1,
  board2,
  avatarRef,
  activeCreature,
  paused,
  posRef,
  onStation,
}: {
  view: CycleView
  cycle: CycleState
  board1: string
  board2: string
  avatarRef: RefObject<Group | null>
  activeCreature: string | null
  paused: boolean
  posRef: RefObject<Vector3>
  onStation: (p: Process) => void
}) {
  const colliders = useMemo<Collider[]>(
    () => [
      { kind: 'circle', cx: -3.6, cz: 0.6, r: 1.55 },
      { kind: 'circle', cx: -1.1, cz: -3.6, r: 0.35 },
      { kind: 'circle', cx: 1.1, cz: -3.6, r: 0.35 },
      { kind: 'circle', cx: 3.6, cz: 0.6, r: 0.5 },
      { kind: 'box', cx: 3.35, cz: 2.1, w: 1.9, d: 1.2 },
      { kind: 'circle', cx: -6.3, cz: -4.9, r: 0.45 },
      { kind: 'circle', cx: 5.8, cz: -5.8, r: 0.4 },
      { kind: 'circle', cx: -6.6, cz: 2.6, r: 0.4 },
    ],
    [],
  )

  useWanderWalk({
    group: avatarRef,
    bound: BOUND,
    collide: (x, z) => collidesAt(colliders, x, z, 0),
    wander: false,
    paused: () => paused,
  })

  // the camera rig targets posRef, but WASD only moves the avatar group —
  // mirror it each frame so the camera actually follows live play
  useFrame(() => {
    const p = avatarRef.current?.position
    if (p) posRef.current.set(p.x, p.y, p.z)
  })

  // proximity poll (a tick, not render): walking onto a station performs it.
  // Re-arm gate: after a resolve the kid is still standing IN the ring — a new
  // round (or the explore after a bad) must not instantly re-fire it. Stations
  // stay inert until the kid has stepped clear of every ring once.
  const vRef = useRef(view)
  useEffect(() => {
    vRef.current = view
  }, [view])
  const disarmed = useRef(true)
  useEffect(() => {
    disarmed.current = true
  }, [view.round])
  useEffect(() => {
    if (view.phase === 'bad') disarmed.current = true
  }, [view.phase, view.round])
  const cbRef = useRef({ onStation, paused })
  useEffect(() => {
    cbRef.current = { onStation, paused }
  }, [onStation, paused])
  useEffect(() => {
    const id = window.setInterval(() => {
      const { onStation: go, paused: hold } = cbRef.current
      const v = vRef.current
      const g = avatarRef.current
      if (hold || !g || !v || v.phase !== 'explore') return
      const px = g.position.x
      const pz = g.position.z
      const inside = STATIONS.find((s) => Math.hypot(px - s.x, pz - s.z) < s.r)
      if (disarmed.current) {
        if (!inside) disarmed.current = false
        return
      }
      if (inside) go(inside.id)
    }, 60)
    return () => window.clearInterval(id)
  }, [avatarRef])

  const chalk = useMemo(() => {
    const l1 = fitChalk(board1)
    const l2 = fitChalk(board2)
    return [
      ...chalkText(board1, { y: 0.34, z: 0.06, w: l1.w, h: 0.4, t: 0.055, gap: l1.gap, color: TOON.white }),
      ...chalkText(board2, { y: -0.16, z: 0.06, w: l2.w, h: 0.46, t: 0.06, gap: l2.gap, color: TOON.white }),
    ]
  }, [board1, board2])
  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])

  return (
    <group>
      <CycleYard />

      {/* chalkboard easel — west of the pond, clear of the dial's line */}
      <ChalkEasel items={chalk} position={[-5.6, 0, -1.7]} rotation={[0, 0.9, 0]} />

      {/* where you may perform — chalk rings on the grass make the verb discoverable */}
      {view.phase === 'explore' &&
        STATIONS.map((s) => <GroundRing key={s.id} x={s.x} z={s.z} r={s.r} opacity={view.station === null ? 0.55 : 0.18} />)}

      <PondSun level={cycle.pond} mode={stationMode(view, 'evaporation')} />
      <CloudTower level={cycle.cloud} mode={stationMode(view, 'condensation')} />
      <GongGarden garden={cycle.garden} mode={stationMode(view, 'precipitation')} />

      {/* numbered signs: the board's trace uses these digits */}
      <StationCard n={1} position={[-2.1, 2.2]} rotation={0.75} />
      <StationCard n={2} position={[1.8, -3.3]} rotation={0.75} />
      <StationCard n={3} position={[5.0, -0.5]} rotation={0.75} />

      <group ref={avatarRef} position={[SPAWN[0], 0, SPAWN[1]]}>
        <group>
          <b.Builder />
          <CreatureAccessories />
        </group>
      </group>
      <WorldCameraRig targetRef={posRef} offset={CYCLE_CAM} />
    </group>
  )
}
