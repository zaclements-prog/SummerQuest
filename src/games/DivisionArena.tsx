import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import type { RefObject } from 'react'
import type { GameProps } from '../screens/GameRunner'
import type { Problem } from '../lib/problem'
import { nextProblem } from '../lib/problem'
import type { Collider } from '../world/worldLayout'
import { useProgress } from '../store/progress'
import { sfx } from '../lib/sound'
import { TOON } from '../toon/palette'
import { geo } from '../toon/geometry'
import { TBox, TCyl } from '../toon/shapes'
import { Decal } from '../world/areas/fraction-falls/kit'
import { blobDisc } from '../world/areas/fraction-falls/shapes'
import { Instances } from '../world/town/kit'
import { chalkText } from '../world/town/chalk'
import { useWanderWalk } from '../world/useWanderWalk'
import WorldCameraRig from '../world/WorldCameraRig'
import { creatureBuilder } from '../home/models/registry'
import CreatureAccessories from '../home/world/CreatureAccessories'
import { collidesAt } from '../world/collision'
import {
  ROUNDS,
  arenaStars,
  isRightCrystal,
  makePedestalOptions,
  parseDivRound,
  shatters,
  splitPositions,
  type DivRound,
} from '../lib/arena/divisionCore'
import { Crystal, FlyingCrystal, Golem, HeldCrystal, MiniCamel } from './DivisionArena.parts'

/**
 * Crystal Golems — the intrinsic-integration division arena (vertical slice).
 * The chalkboard shows `24 ÷ O = 8` (CCSS 3.OA.A.4, missing factor). Three
 * pedestals hold divisor crystals: walk onto one to grab it, then walk near
 * the golem to throw. The RIGHT crystal shatters the golem into exactly the
 * pen's many mini-camels (the quotient, seen physically); another true factor
 * scatters the WRONG count (the pen visibly stays half-empty); a non-divisor
 * bounces off. The math IS the combat — spec:
 * docs/superpowers/specs/2026-10-12-division-arena-design.md
 *
 * Architecture: all game flow lives HERE as React state (`view`); the scene is
 * presentational and only detects proximity, reporting through callbacks. Refs
 * are touched in effects/callbacks only (react-hooks lint), never in render.
 */

const ARENA_BOUND = 7.2
const SPAWN: [number, number] = [4.9, 5.4]
const PEDESTALS: [number, number][] = [[-2.3, 3.0], [0, 2.4], [2.3, 3.0]]
const GOLEM: [number, number] = [0, -1.6]
const PEN: [number, number] = [0, -5.7]
const GRAB_R = 1.05
const THROW_R = 3.6
const CRYSTAL = [TOON.sky, TOON.lilac, TOON.mint]

export type Phase = 'loading' | 'explore' | 'throw' | 'shatter' | 'fail' | 'bounce' | 'won'

export interface View {
  round: DivRound
  options: number[]
  phase: Phase
  held: number | null
  /** launch point of the thrown crystal (phase 'throw') */
  from: Vector3 | null
  /** mini-camel marks while the golem is shattered */
  targets: [number, number][] | null
  /** true = marks are inside the pen (right split); false = scattered outside */
  minisOk: boolean
  /** bumped every throw so shard/animation subtrees remount cleanly */
  token: number
}

export default function DivisionArena({ provider, params, onComplete, meta, paused = false }: GameProps) {
  const totalRounds = (params?.rounds as number | undefined) ?? ROUNDS
  const posRef = useRef(new Vector3(...SPAWN, 0))
  const avatarRef = useRef<Group>(null)
  const [view, setView] = useState<View | null>(null)
  const [hud, setHud] = useState<{ text: string; dot: number; flash: 'good' | 'bad' | null } | null>(null)

  const viewRef = useRef<View | null>(null)
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
      const round = parseDivRound(problem)
      problemRef.current = problem
      triedRef.current = false
      tallyIndex.current = index
      setView({
        round,
        options: makePedestalOptions(round.dividend, round.divisor),
        phase: 'explore',
        held: null,
        from: null,
        targets: null,
        minisOk: true,
        token: Date.now(),
      })
      say(`Which crystal? ${round.dividend} ÷ ? = ${round.quotient}`)
    },
    [say],
  )

  // first round (ConceptPlay's pattern: setState only in the .then)
  useEffect(() => {
    let cancel = false
    nextProblem(provider).then((p) => {
      if (!cancel) applyRound(p, 0)
    })
    return () => {
      cancel = true
    }
  }, [provider, applyRound])

  const tally = useRef({ cleared: 0, firstTry: 0 })

  const loadNext = useCallback(() => {
    const t = tally.current
    const index = tallyIndex.current + 1
    if (index >= totalRounds) {
      if (finishedRef.current) return
      finishedRef.current = true
      setView((v) => (v ? { ...v, phase: 'won', targets: null } : v))
      onComplete({ stars: arenaStars(t.firstTry), score: t.firstTry * 20, correct: t.firstTry, total: totalRounds })
      return
    }
    nextProblem(provider).then((p) => applyRound(p, index))
  }, [applyRound, onComplete, provider, totalRounds])

  const grab = useCallback((n: number) => {
    sfx.click()
    setView((v) => (v && v.phase === 'explore' && v.held === null ? { ...v, held: n } : v))
  }, [])

  const startThrow = useCallback((from: Vector3) => {
    setView((v) => (v && v.phase === 'explore' && v.held !== null ? { ...v, phase: 'throw', from } : v))
  }, [])

  const land = useCallback(
    (picked: number) => {
      const v = viewRef.current
      const problem = problemRef.current
      if (!v || !problem || v.phase !== 'throw' || v.held !== picked) return
      clearTimers()
      const { dividend, divisor, quotient } = v.round
      const right = isRightCrystal(divisor, picked)
      const divides = shatters(dividend, picked)
      const first = !triedRef.current
      triedRef.current = true
      recordAnswer(right, problem)
      const sk = problem.skill
      if (meta && sk) recordAttempt({ zoneId: meta.zoneId, topic: provider.topic, skillId: sk.id, skillLabel: sk.label, correct: right })

      if (right) {
        tally.current.cleared += 1
        tally.current.firstTry += first ? 1 : 0
        sfx.correct()
        say(first ? `Yes! ${dividend} ÷ ${divisor} = ${quotient}!` : `Right! ${dividend} ÷ ${divisor} = ${quotient}`, 'good')
        setView({ ...v, phase: 'shatter', held: null, from: null, targets: splitPositions(quotient, PEN[0], PEN[1], 1.3), minisOk: true, token: v.token + 1 })
        timersRef.current.push(window.setTimeout(loadNext, 1900))
      } else if (divides) {
        sfx.wrong()
        say(`That splits it into ${dividend / picked} — the pen needs ${quotient}! Try again!`, 'bad')
        setView({
          ...v,
          phase: 'fail',
          held: null,
          from: null,
          targets: splitPositions(Math.min(Math.floor(dividend / picked), 10), GOLEM[0], GOLEM[1] - 1.6, 2.6),
          minisOk: false,
          token: v.token + 1,
        })
        timersRef.current.push(
          window.setTimeout(() => setView((w) => (w && w.phase === 'fail' ? { ...w, phase: 'explore', targets: null } : w)), 2600),
        )
      } else {
        sfx.wrong()
        say(`${dividend} can't split into ${picked}s — it bounced! Try again!`, 'bad')
        setView({ ...v, phase: 'bounce', held: null, from: null, token: v.token + 1 })
        timersRef.current.push(window.setTimeout(() => setView((w) => (w && w.phase === 'bounce' ? { ...w, phase: 'explore' } : w)), 1100))
      }
    },
    [clearTimers, loadNext, meta, provider.topic, recordAnswer, recordAttempt, say],
  )

  // dev/QA hook: honest live machine state; `walk` teleports the avatar and the
  // REAL grab/throw detection reacts to it — nothing in QA results is faked.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    Object.assign(window, {
      __sqArena: {
        state: () => {
          const v = viewRef.current
          return {
            phase: v?.phase ?? 'loading',
            index: tallyIndex.current,
            ...tally.current,
            round: v?.round ?? null,
            options: v?.options ?? null,
            held: v?.held ?? null,
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
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [SPAWN[0] + 7.5, 11.5, SPAWN[1] + 9], fov: 40, near: 0.3, far: 220 }}
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
          <ArenaScene
            view={view}
            avatarRef={avatarRef}
            activeCreature={activeCreature}
            paused={paused}
            posRef={posRef}
            onGrab={grab}
            onStartThrow={startThrow}
            onLand={land}
          />
        )}
      </Canvas>

      {/* round dots */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
        {Array.from({ length: totalRounds }, (_, i) => (
          <span key={i} className={`w-3 h-3 rounded-full border-2 border-white/70 ${i < (hud?.dot ?? -1) ? 'bg-yellow-300' : 'bg-white/25'}`} />
        ))}
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
        WASD walk · step onto a crystal to grab · walk close to the golem to throw
      </div>
      <style>{`.hud-pop{animation:hudpop .3s ease-out}@keyframes hudpop{from{transform:translate(-50%,10px);opacity:0}to{transform:translate(-50%,0);opacity:1}}`}</style>
    </div>
  )
}

// ── scene: presentational + proximity detection only ─────────────────────────

function ArenaScene({
  view,
  avatarRef,
  activeCreature,
  paused,
  posRef,
  onGrab,
  onStartThrow,
  onLand,
}: {
  view: View
  avatarRef: RefObject<Group | null>
  activeCreature: string | null
  paused: boolean
  posRef: RefObject<Vector3>
  onGrab: (n: number) => void
  onStartThrow: (from: Vector3) => void
  onLand: (picked: number) => void
}) {
  const colliders = useMemo<Collider[]>(
    () => [
      ...PEDESTALS.map(([cx, cz]): Collider => ({ kind: 'circle', cx, cz, r: 0.6 })),
      { kind: 'circle', cx: GOLEM[0], cz: GOLEM[1], r: 1.15 },
      { kind: 'circle', cx: PEN[0], cz: PEN[1], r: 2.3 },
    ],
    [],
  )

  useWanderWalk({
    group: avatarRef,
    bound: ARENA_BOUND,
    collide: (x, z) => collidesAt(colliders, x, z, 0),
    wander: false,
    paused: () => paused,
  })

  // proximity poll (a tick, not render): grab / start-throw only.
  const vRef = useRef(view)
  useEffect(() => {
    vRef.current = view
  }, [view])
  const cbRef = useRef({ onGrab, onStartThrow, paused })
  useEffect(() => {
    cbRef.current = { onGrab, onStartThrow, paused }
  }, [onGrab, onStartThrow, paused])
  useEffect(() => {
    const id = window.setInterval(() => {
      const { onGrab: grab, onStartThrow: start, paused: hold } = cbRef.current
      const v = vRef.current
      const g = avatarRef.current
      if (hold || !g || v.phase !== 'explore') return
      const px = g.position.x
      const pz = g.position.z
      if (v.held === null) {
        for (let i = 0; i < PEDESTALS.length; i++) {
          const [cx, cz] = PEDESTALS[i]
          if (Math.hypot(px - cx, pz - cz) < GRAB_R) {
            grab(v.options[i])
            return
          }
        }
      } else if (Math.hypot(px - GOLEM[0], pz - GOLEM[1]) < THROW_R) {
        start(new Vector3(px, 1.15, pz))
      }
    }, 60)
    return () => window.clearInterval(id)
  }, [avatarRef])

  const { round, options, phase, held } = view
  // the board fills in the crystal you're carrying: 24 ÷ [3] = 8
  const board = phase === 'explore' && held !== null ? `${round.dividend} ÷ ${held} = ${round.quotient}` : `${round.dividend} ÷ O = ${round.quotient}`
  const chalk = useMemo(() => chalkText(board, { y: 0, z: 0.06, w: 0.21, h: 0.32, t: 0.048, gap: 0.1, color: TOON.white }), [board])
  const penChalk = useMemo(
    () => chalkText(`pen: ${round.quotient}`, { y: 0, z: 0.05, w: 0.14, h: 0.2, t: 0.035, gap: 0.06, color: TOON.flowerYellow }),
    [round.quotient],
  )
  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])

  return (
    <group>
      <Decal geometry={blobDisc(9.6, 0.16, 7, 48)} color={TOON.sand} position={[0, 0, 0]} />
      <Decal geometry={blobDisc(8.3, 0.12, 8, 44)} color={'#f9e6bb'} position={[0, 0.004, 0]} />
      <Decal geometry={blobDisc(2.5, 0.1, 9, 32)} color={TOON.sandWet} position={[GOLEM[0], 0.008, GOLEM[1]]} />
      <Decal geometry={blobDisc(2.25, 0.1, 10, 28)} color={TOON.grassLight} position={[PEN[0], 0.006, PEN[1]]} />

      {/* chalkboard easel — west side, turned toward the arena/camera; chalk sticks
          face +z locally, so no yaw flip, and it's clear of the pen's grass */}
      <group position={[-4.6, 0, -3.2]} rotation={[0, 0.55, 0]}>
        <TCyl radiusTop={0.07} height={2.7} position={[-1.2, 1.35, 0.28]} rotation={[-0.16, 0, 0.09]} color={TOON.woodDark} />
        <TCyl radiusTop={0.07} height={2.7} position={[1.2, 1.35, 0.28]} rotation={[-0.16, 0, -0.09]} color={TOON.woodDark} />
        <TCyl radiusTop={0.07} height={2.5} position={[0, 1.25, -0.45]} rotation={[0.3, 0, 0]} color={TOON.woodDark} />
        <group position={[0, 2.3, 0]} rotation={[-0.1, 0, 0]}>
          <TBox size={[3.5, 1.55, 0.1]} radius={0.05} color={TOON.wood} outline />
          <TBox size={[3.24, 1.28, 0.06]} radius={0.02} position={[0, 0, 0.04]} color={'#3f6b5a'} castShadow={false} />
          <group position={[0, 0, 0.08]}>
            <Instances geometry={geo.box(1, 1, 1, 0.2)} color={TOON.white} items={chalk} />
          </group>
          <TBox size={[3.4, 0.09, 0.16]} radius={0.03} position={[0, -0.76, 0.08]} color={TOON.flowerYellow} castShadow={false} />
        </group>
      </group>

      {/* the pen: fence + its quotient sign (the spots the camels must fill) */}
      <group position={[PEN[0], 0, PEN[1]]}>
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2
          return <TCyl key={i} radiusTop={0.06} height={0.6} position={[Math.cos(a) * 2.15, 0.3, Math.sin(a) * 2.15]} color={TOON.woodLight} castShadow={false} segments={6} />
        })}
        <group position={[0, 1.05, -2.2]}>
          <TCyl radiusTop={0.05} height={1.1} position={[0, -0.55, 0]} color={TOON.woodDark} castShadow={false} />
          <TBox size={[1.5, 0.52, 0.06]} radius={0.03} color={'#3f6b5a'} outline />
          <group position={[0, 0, 0.05]}>
            <Instances geometry={geo.box(1, 1, 1, 0.2)} color={TOON.white} items={penChalk} />
          </group>
        </group>
      </group>

      {/* pedestals + crystals (carried/thrown crystal leaves its pedestal) */}
      {options.map((n, i) => {
        const [x, z] = PEDESTALS[i]
        const away = held === n || phase === 'throw'
        return (
          <group key={`${round.dividend}:${i}`} position={[x, 0, z]}>
            <TCyl radiusTop={0.48} radiusBottom={0.6} height={0.5} position={[0, 0.25, 0]} color={TOON.rockLight} outline segments={8} />
            <TCyl radiusTop={0.4} radiusBottom={0.4} height={0.05} position={[0, 0.53, 0]} color={TOON.rockDark} castShadow={false} segments={8} />
            {away ? null : <Crystal n={n} color={CRYSTAL[i]} />}
          </group>
        )
      })}

      {/* the golem — remounts per round/phase so its entry/exit animations replay */}
      {phase !== 'won' && phase !== 'loading' && (
        <group key={`g${round.dividend}:${phase === 'explore' || phase === 'throw' ? 'up' : phase}`} position={[GOLEM[0], 0, GOLEM[1]]}>
          <Golem
            dividend={round.dividend}
            mode={phase === 'shatter' ? 'shatter' : phase === 'fail' ? 'hide' : phase === 'bounce' ? 'wobble' : 'idle'}
          />
        </group>
      )}

      {/* crystal in flight (lands → parent grades it) and the shattered minis */}
      {phase === 'throw' && view.from && held !== null && <FlyingCrystal from={view.from} color={CRYSTAL[Math.max(0, options.indexOf(held))]} onLanded={() => onLand(held)} />}
      {(phase === 'shatter' || phase === 'fail') &&
        view.targets?.map(([tx, tz], i) => <MiniCamel key={`${view.token}:${i}`} tx={tx} tz={tz} ok={view.minisOk} i={i} />)}

      {/* carried crystal + the kid's creature */}
      {held !== null && phase !== 'throw' && <HeldCrystal n={held} color={CRYSTAL[Math.max(0, options.indexOf(held))]} avatarRef={avatarRef} />}
      <group ref={avatarRef} position={[SPAWN[0], 0, SPAWN[1]]}>
        <group>
          <b.Builder />
          <CreatureAccessories />
        </group>
      </group>
      <WorldCameraRig targetRef={posRef} />
    </group>
  )
}
