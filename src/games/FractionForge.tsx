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
import { TBox, TCyl } from '../toon/shapes'
import { Decal } from '../world/areas/fraction-falls/kit'
import { blobDisc } from '../world/areas/fraction-falls/shapes'
import { chalkText } from '../world/town/chalk'
import { useWanderWalk } from '../world/useWanderWalk'
import WorldCameraRig from '../world/WorldCameraRig'
import { creatureBuilder } from '../home/models/registry'
import CreatureAccessories from '../home/world/CreatureAccessories'
import { collidesAt } from '../world/collision'
import {
  ROUNDS,
  fillState,
  forgeFactConfig,
  forgeStars,
  parseFracEqRound,
  type FracRound,
} from '../lib/forge/fractionCore'
import { makeFractionEquivalenceProvider } from '../lib/providers/fractionEquivalence'
import { DEFAULT_GRADE, GRADE_TIERS } from '../lib/gradeTiers'
import { BAR, CANDY, ForgeYard, Gauge, HeldTray, MeasureFlight, RecipeStrip, TrayRack, cellW } from './FractionForge.parts'
import { ChalkEasel } from './_shared/ChalkEasel'
import { GroundRing } from './_shared/GroundRing'
import { fitChalk } from './_shared/chalkBoard'

/**
 * Fraction Forge — the intrinsic-integration fraction-equivalence game
 * (CCSS 3.NF.A.3 / 4.NF.A.1). The chalkboard shows `2/3 = ?/6`. The recipe
 * bar (top) is the base fraction cut into its own chunks; the measuring gauge
 * (below) is the same length cut into `targetDenom` empty cells. Three market
 * racks hold trays of 1/d slabs: walk onto a rack to grab its row, carry it
 * over your head to the measuring table, and the bench measures it into the
 * gauge. The row that fills the gauge EXACTLY to the recipe's shade is right;
 * short/over rows stop visibly at (or cross) the target curtain. The answer is
 * never printed before measuring — the math IS the walk. Spec:
 * docs/superpowers/specs/2026-10-16-fraction-forge-design.md
 *
 * Architecture (the arena's): all game flow lives HERE as React state (`view`);
 * the scene is presentational and only detects proximity, reporting through
 * callbacks. Refs are touched in effects/callbacks only (react-hooks lint),
 * never in render.
 */

const FORGE_BOUND = 7.2
const SPAWN: [number, number] = [4.9, 5.4]
/** 4 racks — makeFractionEquivalenceProvider always offers 4 options. */
const RACKS: [number, number][] = [[-4.0, 2.6], [-1.33, 2.2], [1.33, 2.2], [4.0, 2.6]]
const TABLE: [number, number] = [0, -1.9]
const GRAB_R = 1.05
const MEASURE_R = 3.0
/** Yaw of the market street (racks + measuring station) toward the camera. */
const DISPLAY_YAW = 0.55
/** Gauge slab plane, world height (bench top 1.08 + gauge local 0.32). */
const GAUGE_Y = 1.4
const FORGE_CAM: [number, number, number] = [10.5, 8.6, 10.5]

export type ForgePhase = 'loading' | 'explore' | 'measure' | 'good' | 'bad' | 'won'

export interface ForgeView {
  round: FracRound
  options: number[]
  phase: ForgePhase
  held: number | null
  /** launch point of the carried row (phase 'measure') */
  from: Vector3 | null
  /** how many slabs stand in the gauge while a result resolves */
  fill: number
  /** bumped every measure so animation subtrees remount cleanly */
  token: number
}

/** Where a measured row of `n` slabs lands in the gauge (left-anchored row, world space). */
function gaugeLand(n: number, denom: number): [number, number, number] {
  const lx = -BAR.span / 2 + (n * cellW(denom)) / 2
  const cos = Math.cos(DISPLAY_YAW)
  const sin = Math.sin(DISPLAY_YAW)
  const lz = 0.5
  return [TABLE[0] + lx * cos + lz * sin, GAUGE_Y, TABLE[1] - lx * sin + lz * cos]
}

export default function FractionForge({ params, onComplete, meta, paused = false }: GameProps) {
  const totalRounds = (params?.rounds as number | undefined) ?? (params?.questionCount as number | undefined) ?? ROUNDS
  const grade = useProgress((s) => s.player?.grade)
  // The forge draws its OWN bounded facts: the gauge must show `targetDenom`
  // cells a child can count at play distance (G4 widens equivalence to /16).
  // Never harder than the grade, never wider than the model.
  const facts = useMemo(
    () => makeFractionEquivalenceProvider(forgeFactConfig(GRADE_TIERS[grade ?? DEFAULT_GRADE].fracEquivMaxDenom)),
    [grade],
  )
  const posRef = useRef(new Vector3(...SPAWN, 0))
  const avatarRef = useRef<Group>(null)
  const [view, setView] = useState<ForgeView | null>(null)
  const [hud, setHud] = useState<{ text: string; dot: number; flash: 'good' | 'bad' | null } | null>(null)

  const viewRef = useRef<ForgeView | null>(null)
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
      const round = parseFracEqRound(problem)
      problemRef.current = problem
      triedRef.current = false
      tallyIndex.current = index
      setView({
        round,
        options: problem.options.map(Number),
        phase: 'explore',
        held: null,
        from: null,
        fill: 0,
        token: Date.now(),
      })
      say(`Which tray? ${round.baseNum}/${round.baseDenom} = ?/${round.targetDenom}`)
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
      setView((v) => (v ? { ...v, phase: 'won', fill: 0 } : v))
      say(t.firstTry === totalRounds ? 'Forge fired — every one first try! 🏆' : `Forge fired! ${t.firstTry} of ${totalRounds} first try.`)
      onComplete({ stars: forgeStars(t.firstTry, totalRounds), score: t.firstTry * 20, correct: t.firstTry, total: totalRounds })
      return
    }
    nextProblem(facts).then((p) => applyRound(p, index))
  }, [applyRound, onComplete, facts, totalRounds, say])

  const grab = useCallback(
    (n: number) => {
      sfx.click()
      setView((v) => (v && v.phase === 'explore' && v.held === null ? { ...v, held: n } : v))
      say('Carry it to the measuring table!')
    },
    [say],
  )

  const startMeasure = useCallback((from: Vector3) => {
    setView((v) => (v && v.phase === 'explore' && v.held !== null ? { ...v, phase: 'measure', from } : v))
  }, [])

  const land = useCallback(
    (picked: number) => {
      const v = viewRef.current
      const problem = problemRef.current
      if (!v || !problem || v.phase !== 'measure' || v.held !== picked) return
      clearTimers()
      const { baseNum, baseDenom, targetDenom, targetNum } = v.round
      const right = picked === targetNum
      const first = !triedRef.current
      triedRef.current = true
      recordAnswer(right, problem)
      const sk = problem.skill
      if (meta && sk) recordAttempt({ zoneId: meta.zoneId, topic: facts.topic, skillId: sk.id, skillLabel: sk.label, correct: right })

      if (right) {
        tally.current.cleared += 1
        tally.current.firstTry += first ? 1 : 0
        sfx.correct()
        say(first ? `Yes! ${baseNum}/${baseDenom} = ${targetNum}/${targetDenom}!` : `Right! ${baseNum}/${baseDenom} = ${targetNum}/${targetDenom}`, 'good')
        setView({ ...v, phase: 'good', held: null, from: null, fill: picked, token: v.token + 1 })
        timersRef.current.push(window.setTimeout(loadNext, 2100))
      } else {
        sfx.wrong()
        const f = fillState(picked, targetNum)
        say(f === 'short' ? `Too few — ${picked}/${targetDenom} leaves a gap. Try again!` : `Too many — ${picked}/${targetDenom} overflows the mark. Try again!`, 'bad')
        setView({ ...v, phase: 'bad', held: null, from: null, fill: picked, token: v.token + 1 })
        timersRef.current.push(
          window.setTimeout(() => setView((w) => (w && w.phase === 'bad' ? { ...w, phase: 'explore', fill: 0 } : w)), 2900),
        )
      }
    },
    [clearTimers, loadNext, meta, facts.topic, recordAnswer, recordAttempt, say],
  )

  // dev/QA hook: honest live machine state; `walk` teleports the avatar and the
  // REAL grab/measure detection reacts to it — nothing in QA results is faked.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    Object.assign(window, {
      __sqForge: {
        state: () => {
          const v = viewRef.current
          return {
            phase: v?.phase ?? 'loading',
            index: tallyIndex.current,
            ...tally.current,
            round: v?.round ?? null,
            options: v?.options ?? null,
            held: v?.held ?? null,
            fill: v?.fill ?? 0,
          }
        },
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
  }, [])

  return (
    <div className="flex-1 relative select-none">
      <Canvas
        shadows
        flat
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: import.meta.env.DEV }}
        camera={{ position: [SPAWN[0] + FORGE_CAM[0], FORGE_CAM[1], SPAWN[1] + FORGE_CAM[2]], fov: 46, near: 0.3, far: 220 }}
        style={{ position: 'absolute', inset: 0 }}
        onCreated={({ scene }) => {
          if (import.meta.env.DEV) Object.assign(window, { __sqScene: scene })
        }}
      >
        <color attach="background" args={['#d9effa']} />
        <fog attach="fog" args={['#d9effa', 42, 120]} />
        <ambientLight intensity={0.45} />
        <directionalLight
          position={[9, 15, 6]}
          intensity={1.15}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
        />
        {view && (
          <ForgeScene
            view={view}
            avatarRef={avatarRef}
            activeCreature={activeCreature}
            paused={paused}
            posRef={posRef}
            onGrab={grab}
            onStartMeasure={startMeasure}
            onLand={land}
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
          className={`absolute bottom-16 left-1/2 -translate-x-1/2 max-w-[92%] kid-text text-lg sm:text-2xl text-center px-5 py-2 rounded-full shadow-lg text-white hud-pop ${
            hud.flash === 'bad' ? 'bg-rose-600/85' : hud.flash === 'good' ? 'bg-emerald-600/85' : 'bg-sky-900/70'
          }`}
        >
          {hud.text}
        </div>
      )}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 kid-text text-white/90 text-[11px] sm:text-xs bg-sky-900/50 px-3 py-1 rounded-full pointer-events-none whitespace-nowrap">
        WASD walk · step onto a tray to grab it · carry it to the table to measure
      </div>
      <style>{`.hud-pop{animation:hudpop .3s ease-out}@keyframes hudpop{from{transform:translate(-50%,10px);opacity:0}to{transform:translate(-50%,0);opacity:1}}`}</style>
    </div>
  )
}

// ── scene: presentational + proximity detection only ─────────────────────────

function ForgeScene({
  view,
  avatarRef,
  activeCreature,
  paused,
  posRef,
  onGrab,
  onStartMeasure,
  onLand,
}: {
  view: ForgeView
  avatarRef: RefObject<Group | null>
  activeCreature: string | null
  paused: boolean
  posRef: RefObject<Vector3>
  onGrab: (n: number) => void
  onStartMeasure: (from: Vector3) => void
  onLand: (picked: number) => void
}) {
  const colliders = useMemo<Collider[]>(
    () => [
      ...RACKS.map(([cx, cz]): Collider => ({ kind: 'circle', cx, cz, r: 0.6 })),
      { kind: 'circle', cx: TABLE[0], cz: TABLE[1], r: 1.5 },
      { kind: 'circle', cx: -4.7, cz: -3.4, r: 1.15 },
      { kind: 'box', cx: 3.5, cz: -5.0, w: 5.4, d: 3.2 },
    ],
    [],
  )

  useWanderWalk({
    group: avatarRef,
    bound: FORGE_BOUND,
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

  // proximity poll (a tick, not render): grab / start-measure only.
  const vRef = useRef(view)
  useEffect(() => {
    vRef.current = view
  }, [view])
  const cbRef = useRef({ onGrab, onStartMeasure, paused })
  useEffect(() => {
    cbRef.current = { onGrab, onStartMeasure, paused }
  }, [onGrab, onStartMeasure, paused])
  useEffect(() => {
    const id = window.setInterval(() => {
      const { onGrab: grab, onStartMeasure: start, paused: hold } = cbRef.current
      const v = vRef.current
      const g = avatarRef.current
      if (hold || !g || !v || v.phase !== 'explore') return
      const px = g.position.x
      const pz = g.position.z
      if (v.held === null) {
        for (let i = 0; i < RACKS.length; i++) {
          const [cx, cz] = RACKS[i]
          if (Math.hypot(px - cx, pz - cz) < GRAB_R) {
            grab(v.options[i])
            return
          }
        }
      } else if (Math.hypot(px - TABLE[0], pz - TABLE[1]) < MEASURE_R) {
        start(new Vector3(px, 1.15, pz))
      }
    }, 60)
    return () => window.clearInterval(id)
  }, [avatarRef])

  const { round, options, phase, held } = view
  const resolving = phase === 'good' || phase === 'bad'
  // the board fills in the row you're carrying: 2/3 = 2/6; `?` is the unknown
  const board = phase === 'explore' && held !== null ? `${round.baseNum}/${round.baseDenom} = ${held}/${round.targetDenom}` : `${round.baseNum}/${round.baseDenom} = ?/${round.targetDenom}`
  const chalk = useMemo(() => {
    const { w, gap } = fitChalk(board)
    return chalkText(board, { y: 0, z: 0.06, w, h: 0.32, t: 0.048, gap, color: TOON.white })
  }, [board])
  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])

  return (
    <group>
      <Decal geometry={blobDisc(9.6, 0.16, 7, 48)} color={TOON.sand} position={[0, 0, 0]} />
      <Decal geometry={blobDisc(8.3, 0.12, 8, 44)} color={'#f9e6bb'} position={[0, 0.004, 0]} />
      <Decal geometry={blobDisc(2.6, 0.1, 9, 32)} color={TOON.waterShallow} position={[3.5, 0.008, -4.7]} />

      {/* chalkboard easel — west side, clear of the gantry's post line, turned
          toward the yard/camera (at the arena's spot it sat behind the left
          gantry post, which cut the equation's last glyph) */}
      <ChalkEasel items={chalk} position={[-5.6, 0, -0.4]} rotation={[0, 0.9, 0]} />

      {/* candy vat + the falls */}
      <ForgeYard />

      {/* where you may grab / measure — chalk rings on the sand make the verb discoverable */}
      {phase === 'explore' &&
        options.map((_, i) => <GroundRing key={`rr${i}`} x={RACKS[i][0]} z={RACKS[i][1]} r={GRAB_R} opacity={held === null ? 0.55 : 0.18} />)}
      {phase === 'explore' && held !== null && <GroundRing x={TABLE[0]} z={TABLE[1]} r={MEASURE_R} opacity={0.55} />}

      {/* the measuring station: bench + gantry, recipe strip above, gauge below.
          Racks and station share ONE cell grid, so the fill is a real comparison. */}
      <group position={[TABLE[0], 0, TABLE[1]]} rotation={[0, DISPLAY_YAW, 0]}>
        {/* bench */}
        <TCyl radiusTop={0.09} height={0.98} position={[-1.45, 0.49, 0.38]} color={TOON.woodDark} segments={8} />
        <TCyl radiusTop={0.09} height={0.98} position={[1.45, 0.49, 0.38]} color={TOON.woodDark} segments={8} />
        <TCyl radiusTop={0.09} height={0.98} position={[-1.45, 0.49, -0.38]} color={TOON.woodDark} segments={8} />
        <TCyl radiusTop={0.09} height={0.98} position={[1.45, 0.49, -0.38]} color={TOON.woodDark} segments={8} />
        <TBox size={[3.6, 0.16, 1.1]} radius={0.06} position={[0, 1.0, 0]} color={TOON.woodLight} outline />
        {/* gantry posts + beam */}
        <TCyl radiusTop={0.08} height={2.6} position={[-1.95, 1.3, -0.2]} color={TOON.woodDark} segments={8} />
        <TCyl radiusTop={0.08} height={2.6} position={[1.95, 1.3, -0.2]} color={TOON.woodDark} segments={8} />
        <TBox size={[4.1, 0.16, 0.26]} radius={0.05} position={[0, 2.66, -0.2]} color={TOON.wood} outline />
        <group position={[0, 1.08, 0]}>
          <RecipeStrip num={round.baseNum} denom={round.baseDenom} y={1.26} z={0.4} />
          <Gauge
            denom={round.targetDenom}
            fill={resolving ? view.fill : 0}
            fillFx={phase === 'good' ? 'pop' : phase === 'bad' ? 'shake' : null}
            fillColor={phase === 'good' ? '#ffd188' : CANDY}
            curtainAt={resolving ? round.targetNum : null}
            y={0.32}
            z={0.4}
          />
        </group>
      </group>

      {/* market racks (a grabbed row leaves its rack, but the count card stays) */}
      {options.map((n, i) => (
        <TrayRack key={`${round.factId}:${i}`} n={n} denom={round.targetDenom} held={held === n} position={RACKS[i]} rotation={DISPLAY_YAW} />
      ))}

      {/* measured row in flight (lands → parent grades it) */}
      {phase === 'measure' && view.from && held !== null && (
        <MeasureFlight from={view.from} to={gaugeLand(held, round.targetDenom)} n={held} denom={round.targetDenom} onLanded={() => onLand(held)} />
      )}

      {/* carried row + the kid's creature */}
      {held !== null && phase !== 'measure' && <HeldTray n={held} denom={round.targetDenom} avatarRef={avatarRef} />}
      <group ref={avatarRef} position={[SPAWN[0], 0, SPAWN[1]]}>
        <group>
          <b.Builder />
          <CreatureAccessories />
        </group>
      </group>
      <WorldCameraRig targetRef={posRef} offset={FORGE_CAM} />
    </group>
  )
}
