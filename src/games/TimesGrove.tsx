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
  GROVE_ROUNDS,
  groveBadHint,
  groveChant,
  groveStars,
  groveWinLine,
  parseGroveRound,
  shapeForTotal,
  type GroveRound,
} from '../lib/grove/groveCore'
import { makeMultiplicationGroveProvider } from '../lib/providers/multiplicationGrove'
import {
  CRATE_BASE,
  GroveCard,
  GrovePlot,
  GroveYard,
  HarvestCrate,
  PLOTS,
  SIGN_OFFSET,
  SIGN_ROT,
  type StationMode,
} from './TimesGrove.parts'
import { ChalkEasel } from './_shared/ChalkEasel'
import { GroundRing } from './_shared/GroundRing'
import { fitChalk } from './_shared/chalkBoard'

/**
 * Times Grove — the array-orchard game for Multiplication Mesa's concept stage.
 * The keeper chalks a planting order ("3 rows of 4"); three plots stand
 * pre-grown as the three answer choices — walking onto a plot performs its
 * count: the rows pop one by one while the HUD chants groups ("1 four… 2
 * fours… 3 fours — 12!"). The right plot blooms and earns a harvest crate
 * chalked with its total; the wrong one performs and SINKS — that order was
 * never planted here — with a lesson about the shape you walked. Candidates
 * share a dimension with the target on purpose, so reading BOTH numbers of
 * the order is the only reliable route. The answer is never a word on a
 * button: it is a place you walk to. Spec:
 * docs/superpowers/specs/2026-10-16-times-grove-design.md
 *
 * Architecture (the arena/forge/keeper's): all game flow lives HERE as React
 * state (`view`); the scene is presentational and only detects proximity,
 * reporting through callbacks. Refs are touched in effects/callbacks only.
 */

const BOUND = 7.2
const SPAWN: [number, number] = [4.9, 5.4]
const GROVE_CAM: [number, number, number] = [10.5, 8.6, 10.5]

/** Plot slots are re-dealt per round so the target is never always "plot 1". */
const PERMS: [number, number, number][] = [
  [0, 1, 2],
  [1, 2, 0],
  [2, 0, 1],
  [1, 0, 2],
  [2, 1, 0],
  [0, 2, 1],
]

export type GrovePhase = 'loading' | 'explore' | 'perform' | 'good' | 'bad' | 'won'

export interface GroveView {
  round: GroveRound
  phase: GrovePhase
  /** the candidate total being performed / just performed */
  station: number | null
  /** bumped per resolve so animations remount cleanly */
  token: number
  /** slot → candidate index for this round */
  perm: [number, number, number]
}

export default function TimesGrove({ params, onComplete, meta, paused = false }: GameProps) {
  const totalRounds =
    (params?.rounds as number | undefined) ?? (params?.questionCount as number | undefined) ?? GROVE_ROUNDS
  const planner = useMemo(() => makeMultiplicationGroveProvider(), [])
  const posRef = useRef(new Vector3(...SPAWN, 0))
  const avatarRef = useRef<Group>(null)
  const [view, setView] = useState<GroveView | null>(null)
  const [harvest, setHarvest] = useState<number[]>([])
  const [trace, setTrace] = useState<number[]>([])
  const [hud, setHud] = useState<{ text: string; dot: number; flash: 'good' | 'bad' | null } | null>(null)

  const viewRef = useRef<GroveView | null>(null)
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
  const tally = useRef({ cleared: 0, firstTry: 0 })

  const say = useCallback((text: string, flash: 'good' | 'bad' | null = null) => {
    setHud({ text, dot: tallyIndex.current, flash })
  }, [])

  const applyRound = useCallback(
    (problem: Problem, index: number) => {
      const round = parseGroveRound(problem)
      problemRef.current = problem
      triedRef.current = false
      tallyIndex.current = index
      setView({ round, phase: 'explore', station: null, token: Date.now(), perm: PERMS[index % PERMS.length] })
      say(round.prompt)
    },
    [say],
  )

  // first round (ConceptPlay's pattern: setState only in the .then)
  useEffect(() => {
    let cancel = false
    nextProblem(planner).then((p) => {
      if (!cancel) applyRound(p, 0)
    })
    return () => {
      cancel = true
    }
  }, [planner, applyRound])

  const loadNext = useCallback(() => {
    const t = tally.current
    const index = tallyIndex.current + 1
    if (index >= totalRounds) {
      if (finishedRef.current) return
      finishedRef.current = true
      setView((v) => (v ? { ...v, phase: 'won', station: null } : v))
      say(t.firstTry === totalRounds ? 'The whole grove read first try — every order! 🏆' : `Grove complete! ${t.firstTry} of ${totalRounds} first try.`)
      onComplete({ stars: groveStars(t.firstTry, totalRounds), score: t.firstTry * 20, correct: t.firstTry, total: totalRounds })
      return
    }
    nextProblem(planner).then((p) => applyRound(p, index))
  }, [applyRound, onComplete, planner, totalRounds, say])

  /** The kid stepped onto a plot: perform its count, then grade when it lands. */
  const perform = useCallback(
    (total: number) => {
      const v = viewRef.current
      const walked = v ? shapeForTotal(v.round.siblings, total) : null
      if (!walked) return
      sfx.click()
      setView((w) => (w && w.phase === 'explore' ? { ...w, phase: 'perform', station: total, token: w.token + 1 } : w))
      for (let k = 1; k <= walked.rows; k++) {
        timersRef.current.push(window.setTimeout(() => say(groveChant(walked.rows, walked.cols, k)), 280 + k * 300))
      }
      timersRef.current.push(
        window.setTimeout(
          () => {
            const w = viewRef.current
            const problem = problemRef.current
            if (!w || !problem || w.phase !== 'perform' || w.station !== total) return
            const right = total === w.round.shape.total
            const first = !triedRef.current
            triedRef.current = true
            recordAnswer(right, problem)
            const sk = problem.skill
            if (meta && sk) recordAttempt({ zoneId: meta.zoneId, topic: planner.topic, skillId: sk.id, skillLabel: sk.label, correct: right })

            if (right) {
              tally.current.cleared += 1
              tally.current.firstTry += first ? 1 : 0
              sfx.correct()
              setHarvest((h) => [...h, total])
              setTrace((tr) => [...tr, total])
              say(groveWinLine(w.round.shape.rows, w.round.shape.cols), 'good')
              setView((x) => (x ? { ...x, phase: 'good' } : x))
              timersRef.current.push(window.setTimeout(loadNext, 2400))
            } else {
              sfx.wrong()
              say(groveBadHint(walked), 'bad')
              setView((x) => (x ? { ...x, phase: 'bad' } : x))
              timersRef.current.push(
                window.setTimeout(() => setView((x) => (x && x.phase === 'bad' ? { ...x, phase: 'explore', station: null } : x)), 2900),
              )
            }
          },
          Math.max(1300, 280 + walked.rows * 300 + 480),
        ),
      )
    },
    [meta, planner.topic, loadNext, recordAnswer, recordAttempt, say],
  )

  // dev/QA hook: honest live machine state; `walk` teleports the avatar and the
  // REAL plot detection reacts to it — nothing in QA results is faked.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    Object.assign(window, {
      __sqGrove: {
        state: () => {
          const v = viewRef.current
          return {
            phase: v?.phase ?? 'loading',
            index: tallyIndex.current,
            ...tally.current,
            round: v?.round ?? null,
            station: v?.station ?? null,
            perm: v?.perm ?? null,
            harvest,
            trace,
          }
        },
        plots: PLOTS,
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
  }, [harvest, trace])

  const board1 = `${Math.min((hud?.dot ?? 0) + 1, totalRounds)}/${totalRounds}`
  const board2 = trace.length ? trace.slice(-6).join(' ') : '_'

  return (
    <div className="flex-1 relative select-none">
      <Canvas
        shadows
        flat
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: import.meta.env.DEV }}
        camera={{ position: [SPAWN[0] + GROVE_CAM[0], GROVE_CAM[1], SPAWN[1] + GROVE_CAM[2]], fov: 46, near: 0.3, far: 220 }}
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
          <GroveScene
            view={view}
            harvest={harvest}
            board1={board1}
            board2={board2}
            avatarRef={avatarRef}
            activeCreature={activeCreature}
            paused={paused}
            posRef={posRef}
            onPlot={perform}
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
        WASD walk · step onto the grove that grows the keeper's order
      </div>
      <style>{`.hud-pop{animation:hudpop .3s ease-out}@keyframes hudpop{from{transform:translate(-50%,10px);opacity:0}to{transform:translate(-50%,0);opacity:1}}`}</style>
    </div>
  )
}

// ── scene: presentational + proximity detection only ─────────────────────────

function stationMode(view: GroveView, total: number): StationMode {
  if (view.station !== total) return 'off'
  return view.phase === 'bad' ? 'stall' : 'run'
}

/** Absolute sign positions (colliders must match the render exactly). */
const CARD_ABS: [number, number][] = PLOTS.map((p, i) => [p.x + SIGN_OFFSET[i][0], p.z + SIGN_OFFSET[i][1]])

function GroveEaselChalk({ board1, board2 }: { board1: string; board2: string }) {
  const chalk = useMemo(() => {
    const l1 = fitChalk(board1)
    const l2 = fitChalk(board2)
    return [
      ...chalkText(board1, { y: 0.34, z: 0.06, w: l1.w, h: 0.4, t: 0.055, gap: l1.gap, color: TOON.white }),
      ...chalkText(board2, { y: -0.16, z: 0.06, w: l2.w, h: 0.46, t: 0.06, gap: l2.gap, color: TOON.white }),
    ]
  }, [board1, board2])
  return <ChalkEasel items={chalk} position={[-5.6, 0, -1.7]} rotation={[0, 0.9, 0]} />
}

function GroveScene({
  view,
  harvest,
  board1,
  board2,
  avatarRef,
  activeCreature,
  paused,
  posRef,
  onPlot,
}: {
  view: GroveView
  harvest: number[]
  board1: string
  board2: string
  avatarRef: RefObject<Group | null>
  activeCreature: string | null
  paused: boolean
  posRef: RefObject<Vector3>
  onPlot: (total: number) => void
}) {
  // crops dot the yard edges; the easel, the sign posts and the crate stack
  // are the only true obstacles — plots are meant to be WALKED THROUGH
  const colliders = useMemo<Collider[]>(() => {
    const list: Collider[] = [
      { kind: 'circle', cx: -5.6, cz: -1.7, r: 0.5 },
      { kind: 'circle', cx: CRATE_BASE[0], cz: CRATE_BASE[1], r: 0.55 },
    ]
    for (const [x, z] of CARD_ABS) list.push({ kind: 'circle', cx: x, cz: z, r: 0.3 })
    return [
      ...list,
      { kind: 'circle', cx: -6.1, cz: -3.1, r: 0.45 },
      { kind: 'circle', cx: -5.4, cz: 4.3, r: 0.4 },
      { kind: 'circle', cx: 6.1, cz: -1.8, r: 0.45 },
      { kind: 'circle', cx: -6.3, cz: -4.9, r: 0.4 },
      { kind: 'circle', cx: 5.8, cz: -5.8, r: 0.4 },
      { kind: 'circle', cx: -6.6, cz: 2.6, r: 0.4 },
      { kind: 'circle', cx: 0.9, cz: 5.3, r: 0.4 },
      { kind: 'circle', cx: 2.6, cz: 6.0, r: 0.4 },
    ]
  }, [])

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

  // proximity poll (a tick, not render): stepping onto a plot performs its
  // count. Re-arm gate: after a resolve the kid is still standing IN the ring —
  // a new round (or the explore after a bad) must not instantly re-fire it.
  // Plots stay inert until the kid has stepped clear of every ring once.
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
  const cbRef = useRef({ onPlot, paused })
  useEffect(() => {
    cbRef.current = { onPlot, paused }
  }, [onPlot, paused])
  useEffect(() => {
    const id = window.setInterval(() => {
      const { onPlot: go, paused: hold } = cbRef.current
      const v = vRef.current
      const g = avatarRef.current
      if (hold || !g || !v || v.phase !== 'explore') return
      const px = g.position.x
      const pz = g.position.z
      let slot = -1
      for (let i = 0; i < PLOTS.length; i++) {
        if (Math.hypot(px - PLOTS[i].x, pz - PLOTS[i].z) < PLOTS[i].r) slot = i
      }
      if (disarmed.current) {
        if (slot < 0) disarmed.current = false
        return
      }
      if (slot >= 0) go(v.round.siblings[v.perm[slot]].total)
    }, 60)
    return () => window.clearInterval(id)
  }, [avatarRef])

  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])

  return (
    <group>
      <GroveYard />

      {/* chalkboard easel — northwest, clear of every ring */}
      <GroveEaselChalk board1={board1} board2={board2} />

      {/* where you may answer — chalk rings make the verb discoverable */}
      {view.phase === 'explore' &&
        PLOTS.map((p, i) => (
          <GroundRing key={i} x={p.x} z={p.z} r={p.r} opacity={view.station === null ? 0.55 : 0.18} />
        ))}

      {/* the three candidate plots — each numeral sign is its own total */}
      {[0, 1, 2].map((slot) => {
        const cand = view.round.siblings[view.perm[slot]]
        const p = PLOTS[slot]
        return (
          <group key={slot} position={[p.x, 0, p.z]}>
            <GrovePlot key={view.token} shape={cand} mode={stationMode(view, cand.total)} />
            <GroveCard n={cand.total} position={SIGN_OFFSET[slot]} rotation={SIGN_ROT[slot]} />
          </group>
        )
      })}

      {/* every correctly read order earns a crate chalked with its total */}
      {harvest.map((n, i) => (
        <HarvestCrate key={i} total={n} level={i} />
      ))}

      <group ref={avatarRef} position={[SPAWN[0], 0, SPAWN[1]]}>
        <group>
          <b.Builder />
          <CreatureAccessories />
        </group>
      </group>
      <WorldCameraRig targetRef={posRef} offset={GROVE_CAM} />
    </group>
  )
}
