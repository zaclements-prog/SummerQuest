/* eslint-disable react-refresh/only-export-components -- the scene co-locates its simulation types and helpers; not an HMR boundary */
import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { DirectionalLight, Group, Object3D, PerspectiveCamera } from 'three'
import StaticBatch from '../toon/StaticBatch'
import { glowToonMaterial } from '../toon/bake'
import { creatureBuilder } from '../home/models/registry'
import CreatureAccessories from '../home/world/CreatureAccessories'
import { walkState } from '../home/models/walkState'
import { formationDepth, type FinaleOutcome } from '../lib/parade'
import type { GatePair, Side } from '../lib/gates'
import JuiceLayer from './_juice/JuiceLayer'
import { juice } from './_juice/juice'
import { Flock, FlockMeshes, babyJob, ghostMaterial, useBakes, type BakeJob, type FlockName, type FollowerInput } from './CritterParade.crowd'
import { Cage3D, FinaleProps, GangSign, GatePair3D, GrumpModel, Rope } from './CritterParade.parts'
import { ParadeSky, Sea, TrackSegment, type ThemeKey } from './CritterParade.set'
import {
  ASK_BEFORE,
  BABY_SCALE,
  CAGE_MAX,
  CAM,
  CROWD_MAX,
  GANG_MAX,
  GHOST_MAX,
  GRUMP_SCALE,
  LANE_X,
  SEGMENTS,
  SEGMENT_LEN,
  STEER_MAX,
  crowdCaps,
  speciesOrder,
} from './CritterParade.layout'

/**
 * Critter Parade's 3D scene: ONE frame loop moves the parade, steers the
 * leader, calls the game back at each event crossing (gate, cage, rope), runs
 * the tug-of-war timeline, drives the crowds' instance matrices, frames the
 * camera and leapfrogs the road segments. It reads and writes the mutable
 * `World` (never React state), so nothing re-renders per frame.
 */

export type Phase = 'intro' | 'march' | 'finale' | 'levelEnd' | 'results'

/** Mutable per-frame simulation. */
export interface Sim {
  dist: number
  speed: number
  leaderX: number
  targetX: number
  keys: { left: boolean; right: boolean }
  t: number
  phase: Phase
  /** K–1: waiting at a gate pair for a tap */
  waiting: boolean
  chosen: Side | null
  slow: boolean
  scaffold: boolean
  /** dev/QA time scale */
  timeScale: number
  baseSpeed: number
  /** the tug-of-war: seconds since the parade stopped at the rope */
  finaleT: number
  finale: FinaleOutcome | null
  finaleStep: number
  /** the ghost parade beside us */
  ghost: { n: number; x: number; t: number; life: number } | null
  crowdMode: 'cheer' | 'sit' | null
  gangMode: 'idle' | 'tug' | 'cheer' | 'join'
  shift: number
  lean: number
  /** track distance of the upcoming event, and of the rope */
  nextAt: number | null
  nextKind: 'gate' | 'cage' | null
  finaleAt: number
  fullCalled: boolean
  /** dev/QA: a fixed camera (position then look-at), for inspecting the scene */
  camOverride: number[] | null
}

/** Everything the frame loop mutates: the simulation and the four crowds. */
export interface World {
  sim: Sim
  /** bodies shown at most (by graphics setting, see `crowdCaps`) */
  caps: { crowd: number; ghost: number; gang: number }
  followers: Flock
  ghost: Flock
  gangGrumpy: Flock
  gangHappy: Flock
}

export function makeWorld(): World {
  return {
    sim: {
      dist: 0,
      speed: 0,
      leaderX: 0,
      targetX: 0,
      keys: { left: false, right: false },
      t: 0,
      phase: 'intro',
      waiting: false,
      chosen: null,
      slow: false,
      scaffold: false,
      timeScale: 1,
      baseSpeed: 5,
      finaleT: 0,
      finale: null,
      finaleStep: 0,
      ghost: null,
      crowdMode: null,
      gangMode: 'idle',
      shift: 0,
      lean: 0,
      nextAt: null,
      nextKind: null,
      finaleAt: 0,
      fullCalled: false,
      camOverride: null,
    },
    caps: crowdCaps(false),
    followers: new Flock(CROWD_MAX + CAGE_MAX, 12),
    // the ghost parade is one see-through species (the player's own baby): one draw call
    ghost: new Flock(GHOST_MAX, 1),
    gangGrumpy: new Flock(GANG_MAX, 1),
    gangHappy: new Flock(GANG_MAX, 1),
  }
}

/** What the game does when the parade crosses something. */
export interface Hooks {
  onGate: (side: Side) => void
  onCage: () => void
  onAsk: () => void
  onFinaleStart: () => void
  onFinaleResult: () => void
}

export interface ShownGate {
  pair: GatePair | null
  at: number
  colors: [string, string]
  picked: Side | null
}

/** The leader's limbs swing while it walks (the creature parts read the player's walk state). */
function driveWalk(moving: boolean, dt: number) {
  walkState.moving = moving
  walkState.t += dt
}

/** How far the rope ends up toward the winner (+ = toward us). Honest: a bigger margin pulls further. */
function finaleDrift(s: Sim): number {
  const out = s.finale
  if (!out || out.margin === 0) return 0
  const k = Math.min(1, Math.abs(out.margin) / Math.max(4, out.gang * 0.5))
  return Math.sign(out.margin) * (0.9 + 1.8 * k)
}

export function ParadeScene({
  worldRef,
  hooksRef,
  paused,
  low,
  theme,
  finaleAt,
  listen,
  scaffold,
  gates,
  cage,
  gangShown,
  gangCheer,
  gang,
  activeCreature,
  onTap,
}: {
  worldRef: RefObject<World | null>
  hooksRef: RefObject<Hooks | null>
  paused: boolean
  low: boolean
  theme: ThemeKey
  finaleAt: number
  listen: boolean
  scaffold: boolean
  gates: ShownGate[]
  cage: { at: number; amount: number; open: boolean } | null
  gangShown: boolean
  gangCheer: boolean
  gang: number
  activeCreature: string | null
  onTap?: (side: Side) => void
}) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const avatarRef = useRef<Group>(null)
  const sunRef = useRef<DirectionalLight>(null)
  const sunTargetRef = useRef<Object3D>(null)
  const skyRef = useRef<Group>(null)
  const seaRef = useRef<Group>(null)
  const segsRef = useRef<(Group | null)[]>([])
  const segIndexRef = useRef<number[]>(Array.from({ length: SEGMENTS }, (_, i) => i - 1))
  const ropeRef = useRef<Group>(null)
  const ribbonRef = useRef<Group>(null)
  const gangLeaderRef = useRef<Group>(null)
  const pausedRef = useRef(paused)
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  // baked crowds: the player's own species first, one species per frame
  const species = useMemo(() => speciesOrder(activeCreature), [activeCreature])
  const jobs = useMemo<BakeJob[]>(
    () => [...species.map(babyJob), { key: 'grump:grumpy', node: <GrumpModel happy={false} /> }, { key: 'grump:happy', node: <GrumpModel happy /> }],
    [species],
  )
  const { bakes, queue } = useBakes(jobs, !low)
  const speciesBakes = species.map((id) => bakes.get(`baby:${id}`) ?? null)
  const grumpy = bakes.get('grump:grumpy') ?? null
  const happy = bakes.get('grump:happy') ?? null
  const bodyMat = glowToonMaterial()
  const leaderModel = (gangCheer ? happy : grumpy)?.body ?? null

  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])
  const inputRef = useRef<FollowerInput>({ leaderX: 0, leaderZ: 0, speed: 0, mode: 'march', squeeze: 0, laneX: 0, lean: 0, shift: 0, t: 0 })
  const lookRef = useRef({ x: 0, y: 0.4, z: -9, init: false })

  useFrame((_, raw) => {
    const w = worldRef.current
    const h = hooksRef.current
    if (!w || !h) return
    const s = w.sim
    const frozen = pausedRef.current || juice.frozen()
    const dt = frozen ? 0 : Math.min(raw, 0.05) * s.timeScale
    s.t += dt

    // ── speed: march; K–1 waits at gates; the parade stops at the rope
    let want = 0
    if (s.phase === 'march') {
      want = s.baseSpeed * (s.scaffold ? 0.75 : 1) * (s.slow ? 0.5 : 1)
      if (listen && s.nextKind === 'gate' && s.nextAt !== null && !s.chosen) {
        const stopAt = s.nextAt - ASK_BEFORE
        if (s.dist >= stopAt - 0.02) {
          want = 0
          s.dist = Math.max(s.dist, stopAt)
          if (!s.waiting && s.speed < 0.6) {
            s.waiting = true
            h.onAsk()
          }
        } else if (s.dist > stopAt - 4) want *= Math.max(0.25, (stopAt - s.dist) / 4)
      }
      const ropeStop = s.finaleAt - 3.2
      if (s.nextAt === null && s.dist > ropeStop - 6) want *= Math.max(0, (ropeStop - s.dist) / 6)
      if (s.nextAt === null && s.dist >= ropeStop - 0.05) {
        s.dist = ropeStop
        s.speed = 0
        want = 0
        s.finaleT = 0
        s.finaleStep = 0
        h.onFinaleStart()
      }
    }
    s.speed += (want - s.speed) * Math.min(1, dt * 3)
    if (s.phase !== 'march') s.speed *= Math.max(0, 1 - dt * 4)
    if (s.phase === 'march') s.dist += s.speed * dt

    // ── steering
    if (s.keys.left) s.targetX = Math.max(-STEER_MAX, s.targetX - 7.5 * dt)
    if (s.keys.right) s.targetX = Math.min(STEER_MAX, s.targetX + 7.5 * dt)
    if (s.phase === 'finale' || s.phase === 'levelEnd') s.targetX = 0
    s.leaderX += (s.targetX - s.leaderX) * Math.min(1, dt * 7)

    // ── events
    if (s.phase === 'march' && s.nextAt !== null && s.dist >= s.nextAt) {
      if (s.nextKind === 'gate') h.onGate(s.leaderX < 0 ? 'left' : 'right')
      else h.onCage()
    }

    // ── the tug-of-war: line up, pull (it wobbles, then honestly drifts to the bigger team), result
    let mode: FollowerInput['mode'] = s.phase === 'march' && s.speed > 0.3 ? 'march' : 'idle'
    const fin = s.phase === 'finale' || s.phase === 'levelEnd'
    if (fin) {
      s.finaleT += dt
      const T = s.finaleT
      const pullStart = 1.6
      const pullEnd = 5.4
      if (T > pullStart && T < pullEnd + 0.4) {
        mode = 'tug'
        s.lean = Math.min(1, (T - pullStart) * 3)
        const k = Math.min(1, (T - pullStart) / (pullEnd - pullStart))
        s.shift = Math.sin((T - pullStart) * 7) * 0.35 * (1 - k) + finaleDrift(s) * k * k
        if (s.gangMode === 'idle') s.gangMode = 'tug'
      } else if (T >= pullEnd + 0.4 && s.gangMode === 'tug') s.gangMode = 'idle'
      if (T >= pullEnd && s.finaleStep === 0) {
        s.finaleStep = 1
        h.onFinaleResult()
      }
    }
    if (s.crowdMode === 'cheer') mode = 'cheer'
    else if (s.crowdMode === 'sit') mode = 'sit'

    // ── followers
    const leaderZ = -s.dist + (fin ? s.shift : 0)
    const inp = inputRef.current
    inp.leaderX = s.leaderX
    inp.leaderZ = leaderZ
    inp.speed = s.speed
    inp.mode = mode
    inp.t = s.t
    inp.lean = mode === 'tug' ? s.lean : 0
    inp.shift = 0
    inp.squeeze = s.nextKind === 'gate' && s.nextAt !== null ? Math.max(0, 1 - Math.abs(s.dist - s.nextAt) / 7) : 0
    inp.laneX = s.leaderX < 0 ? -LANE_X : LANE_X
    w.followers.updateFollowers(dt, inp, BABY_SCALE)

    // ── the ghost parade on the other lane
    const g = s.ghost
    if (g) {
      g.t += dt
      const fade = g.t < 0.3 ? g.t / 0.3 : g.t > g.life - 0.6 ? Math.max(0, (g.life - g.t) / 0.6) : 1
      ghostMaterial().opacity = 0.45 * fade
      w.ghost.updateGhost(dt, s.t, g.x, leaderZ + 0.95, g.n, BABY_SCALE, s.speed > 0.3)
      if (g.t >= g.life) {
        s.ghost = null
        w.ghost.updateGhost(dt, s.t, g.x, leaderZ, 0, BABY_SCALE, false)
      }
    }

    // ── the Grumble Gang across the rope
    const ropeZ = -s.finaleAt
    const gangZ = ropeZ - 3.6 + s.shift
    const gMode = s.gangMode === 'tug' ? 'tug' : s.gangMode === 'cheer' || s.gangMode === 'join' ? 'cheer' : 'idle'
    if (w.gangGrumpy.alive) w.gangGrumpy.updateGang(dt, s.t, 0, gangZ, gMode, s.lean, GRUMP_SCALE)
    if (w.gangHappy.alive) w.gangHappy.updateGang(dt, s.t, 0, gangZ, gMode, s.lean, GRUMP_SCALE)
    const rope = ropeRef.current
    if (rope) rope.position.set(0, 0, ropeZ + s.shift)
    const lead = gangLeaderRef.current
    if (lead) {
      lead.position.set(0, gMode === 'cheer' ? Math.abs(Math.sin(s.t * 7)) * 0.4 : 0, gangZ + 0.4)
      lead.rotation.set(gMode === 'tug' ? 0.4 * s.lean : 0, 0, 0)
    }

    // ── the leader (the child's grown-up creature)
    const a = avatarRef.current
    if (a) {
      const moving = s.speed > 0.3
      const hop = (moving ? Math.abs(Math.sin(s.t * 9)) * 0.06 : 0) + (mode === 'cheer' ? Math.abs(Math.sin(s.t * 6)) * 0.35 : 0)
      a.position.set(s.leaderX, hop, leaderZ)
      a.rotation.set(mode === 'tug' ? -0.35 * s.lean : 0, Math.PI - (s.targetX - s.leaderX) * 0.25, 0)
      driveWalk(moving || mode === 'tug', dt)
    }

    // ── camera: behind and above the parade (pulled back on a portrait screen and
    // for a long crowd); the finale swings round to the side to show both teams
    const aspect = size.width / Math.max(1, size.height)
    const pull = aspect < 1.25 ? Math.min(CAM.portraitPull, 1.3 / aspect) : 1
    const crowd = formationDepth(Math.max(1, w.followers.shown))
    let tx: number
    let ty: number
    let tz: number
    let lx: number
    let ly: number
    let lz: number
    if (fin) {
      // from the side, level with the rope: our team on the left, the Gang on the right.
      // A portrait screen is too narrow for that, so there the camera swings round
      // behind our team: us in front, the rope, and the Gang across it.
      const near = Math.min(crowd, 4)
      const tall = Math.min(1, Math.max(0, (1.25 - aspect) / 0.5))
      lx = 0
      ly = 0.7
      lz = ropeZ + s.shift + 0.4 - tall * 1.5
      const sx = (9.5 + near * 0.7) * pull
      const sy = (7.6 + near * 0.6) * pull
      const sz = (2.8 + near * 0.6) * pull
      tx = sx + (5 + near * 0.5 - sx) * tall
      ty = sy + (10 + near * 0.8 - sy) * tall
      tz = lz + sz + (10 + near * 1.4 - sz) * tall
    } else {
      tx = s.leaderX * 0.4
      ty = (CAM.offset[1] + crowd * 0.9) * pull
      tz = -s.dist + (CAM.offset[2] + crowd * 3) * pull
      lx = s.leaderX * 0.3
      ly = CAM.look[1]
      lz = -s.dist - CAM.look[2] - crowd * 0.4
    }
    if (s.camOverride) [tx, ty, tz, lx, ly, lz] = s.camOverride
    const look = lookRef.current
    const k = look.init ? Math.min(1, (raw || 0.016) * (fin ? 2 : 4)) : 1
    const kz = look.init ? Math.min(1, (raw || 0.016) * (fin ? 2 : 6)) : 1
    const p = camera.position
    camera.position.set(p.x + (tx - p.x) * k, p.y + (ty - p.y) * k, p.z + (tz - p.z) * kz)
    look.x += (lx - look.x) * k
    look.y += (ly - look.y) * k
    look.z += (lz - look.z) * kz
    look.init = true
    camera.lookAt(look.x, look.y, look.z)

    // ── the world rides along: segments leapfrog ahead, sky / sea / sun follow
    const camZ = camera.position.z
    const idx = segIndexRef.current
    for (let i = 0; i < SEGMENTS; i++) {
      const grp = segsRef.current[i]
      if (!grp) continue
      // a segment wholly behind the camera jumps to the front of the line
      while (-(idx[i] + 1) * SEGMENT_LEN > camZ + 2) idx[i] += SEGMENTS
      grp.position.set(0, 0, -idx[i] * SEGMENT_LEN)
    }
    skyRef.current?.position.set(0, 0, camZ)
    seaRef.current?.position.set(0, 0, camZ)
    const sun = sunRef.current
    const target = sunTargetRef.current
    if (sun && target) {
      sun.position.set(7, 15, -s.dist + 7)
      target.position.set(0, 0, -s.dist - 5)
      if (sun.target !== target) sun.target = target
    }
  })

  return (
    <group>
      <ParadeSky low={low} sunRef={sunRef} sunTarget={sunTargetRef} cloudsRef={skyRef} />
      <Sea seaRef={seaRef} />
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            segsRef.current[i] = el
          }}
          position={[0, 0, -(i - 1) * SEGMENT_LEN]}
        >
          <TrackSegment design={i} theme={theme} />
        </group>
      ))}
      {gates.map((gt) => (
        <GatePair3D key={`${gt.at}`} pair={gt.pair} z={-gt.at} colors={gt.colors} listen={listen} helper={scaffold} picked={gt.picked} onTap={onTap} />
      ))}
      {cage && <Cage3D key={cage.at} z={-cage.at} amount={cage.amount} open={cage.open} listen={listen} />}
      <group visible={gangShown}>
        <FinaleProps z={-finaleAt} />
        <Rope ropeRef={ropeRef} ribbonRef={ribbonRef} length={6.6} />
        <group ref={gangLeaderRef}>
          {leaderModel && <mesh geometry={leaderModel} material={bodyMat} scale={2.3} castShadow={!low} />}
          <GangSign count={gang} happy={gangCheer} />
        </group>
      </group>
      {/* the leader */}
      <group ref={avatarRef} rotation={[0, Math.PI, 0]}>
        <StaticBatch>
          <b.Builder />
          <CreatureAccessories />
        </StaticBatch>
      </group>
      {/* the crowds */}
      <FlockMeshes worldRef={worldRef} which={'followers' satisfies FlockName} cap={CROWD_MAX + CAGE_MAX} species={12} bakes={speciesBakes} material={bodyMat} outlines={!low} />
      <FlockMeshes worldRef={worldRef} which="ghost" cap={GHOST_MAX} species={1} bakes={speciesBakes.slice(0, 1)} material={ghostMaterial()} outlines={false} shadows={false} renderOrder={5} />
      <FlockMeshes worldRef={worldRef} which="gangGrumpy" cap={GANG_MAX} species={1} bakes={[grumpy]} material={bodyMat} outlines={!low} />
      <FlockMeshes worldRef={worldRef} which="gangHappy" cap={GANG_MAX} species={1} bakes={[happy]} material={bodyMat} outlines={!low} />
      {queue}
      <JuiceLayer />
    </group>
  )
}
