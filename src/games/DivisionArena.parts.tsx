import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Color, Euler, Group, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three'
import type { BufferGeometry } from 'three'
import { TOON } from '../toon/palette'
import { geo } from '../toon/geometry'
import { toonMaterial } from '../toon/materials'
import { TBox, TCapsule, TCone, TCyl, TSphere, TTorus } from '../toon/shapes'
import { Instances, type Inst } from '../world/town/kit'
import { chalkText } from '../world/town/chalk'
import { ChibiFace, Decal } from '../world/areas/fraction-falls/kit'
import { blobDisc } from '../world/areas/fraction-falls/shapes'
import Camel from '../world/areas/division-dunes/Camel'
import { MAX_HERD, penStalls } from '../lib/arena/divisionCore'
import { juice } from './_juice/juice'
import { useSquash } from './_juice/useSquash'
import { SpeechBubble } from './_juice/JuiceHud'
import { sfx } from '../lib/sound'
import { PEN, crystalColor, golemChalkSize, wpos, type GolemSim } from './DivisionArena.layout'

/**
 * Visual pieces for Crystal Golems (DivisionArena.tsx). All dumb: they take
 * plain props (or the shared golem sim) and animate themselves in useFrame;
 * every RULE lives in the arena's flow. Everything here sits in the LOCAL
 * arena frame (see DivisionArena.layout.ts) except the held crystal, which
 * rides the avatar in world space.
 */

const SAND = '#e2b672'
const SAND_DARK = '#c99a5a'
const SAND_LIGHT = '#f2d39b'
const PLAQUE = '#4b3b28'
const CHALK = '#fff2b8'

// ── the golem ────────────────────────────────────────────────────────────────

/**
 * A chunky sand golem studded with crystals, its dividend chalked on a chest
 * plaque. It reads the shared sim every frame: position on the lane, walk
 * cycle (legs + arms swing, body bobs, dust at each footfall) and the current
 * animation (enter / wobble when a crystal bounces / stomp at the pen /
 * shatter / crack for the giant).
 */
export function Golem({ simRef, dividend, giant }: { simRef: RefObject<GolemSim>; dividend: number; giant: boolean }) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const lastStep = useRef(0)
  const chalk = useMemo(() => {
    const label = String(dividend)
    return chalkText(label, { y: 0, z: 0, ...golemChalkSize(label.length), h: 0.5, t: 0.075, color: CHALK })
  }, [dividend])

  useFrame(({ clock }, rawDt) => {
    const s = simRef.current
    const g = root.current
    if (!s || !g) return
    g.visible = s.anim !== 'gone'
    if (!g.visible) return
    const t = s.animT
    let y = 0
    let rz = 0
    let rx = 0
    let sx = 1
    let sy = 1
    switch (s.anim) {
      case 'enter': {
        // shoulders out of the cave with a little hop
        const k = Math.min(1, t / 0.5)
        y = Math.sin(k * Math.PI) * 0.35
        break
      }
      case 'wobble':
        rz = Math.sin(t * 24) * 0.14 * Math.max(0, 1 - t / 0.7)
        sy = 1 - 0.12 * Math.max(0, 1 - t / 0.3)
        sx = 1 + 0.08 * Math.max(0, 1 - t / 0.3)
        break
      case 'stomp': {
        // rear back, then SLAM (the flow shakes the camera on the slam)
        if (t < 0.4) {
          rx = -0.25 * (t / 0.4)
          y = 0.5 * (t / 0.4)
        } else {
          const k = Math.min(1, (t - 0.4) / 0.12)
          rx = -0.25 * (1 - k) + 0.1 * k
          y = 0.5 * (1 - k)
          sy = k >= 1 ? 1 - 0.18 * Math.max(0, 1 - (t - 0.52) / 0.3) : 1
          sx = 2 - sy
        }
        break
      }
      case 'shatter': {
        // swell for a beat, then pop out of existence (bursts are the flow's)
        const k = t / 0.12
        const sw = k < 1 ? 1 + 0.18 * k : 0
        sx = sy = sw
        if (k >= 1) g.visible = false
        break
      }
      case 'crack':
        rz = Math.sin(t * 40) * 0.05 * Math.max(0, 1 - t / 0.9)
        break
      case 'wait':
        // stunned: a little tremble while its camels are out
        rz = Math.sin(t * 30) * 0.02
        break
      default:
        break
    }
    s.scale += (s.targetScale - s.scale) * Math.min(1, Math.min(rawDt, 0.05) * 5)
    const k = s.scale
    g.position.set(s.x, y, s.z)
    g.rotation.set(rx, 0, rz)
    g.scale.set(k * sx, k * sy, k * sx)

    const swing = s.moving ? Math.sin(s.walk) * 0.55 : 0
    if (legL.current) legL.current.rotation.x = swing
    if (legR.current) legR.current.rotation.x = -swing
    if (armL.current) armL.current.rotation.x = s.anim === 'stomp' ? -2.2 * Math.min(1, t / 0.35) : -swing * 0.8
    if (armR.current) armR.current.rotation.x = s.anim === 'stomp' ? -2.2 * Math.min(1, t / 0.35) : swing * 0.8
    if (body.current) body.current.position.y = s.moving ? Math.abs(Math.sin(s.walk)) * 0.09 : Math.sin(clock.elapsedTime * 1.7) * 0.025

    // a puff of dust at every footfall (and a rumble for the giant)
    const step = Math.floor(s.walk / Math.PI)
    if (s.moving && step !== lastStep.current) {
      lastStep.current = step
      juice.dust(wpos(s.x + (step % 2 ? 0.38 : -0.38) * k, 0.06, s.z + 0.15 * k))
      if (giant) {
        juice.shake(0.1)
        sfx.thud()
      }
    }
  })

  return (
    <group ref={root}>
      {/* stubby legs (pivot at the hip) */}
      {([
        [legL, -0.36],
        [legR, 0.36],
      ] as const).map(([ref, x]) => (
        <group key={x} ref={ref} position={[x, 0.66, 0]}>
          <TCapsule radius={0.21} length={0.3} position={[0, -0.28, 0]} color={SAND_DARK} flat segments={8} />
          <TSphere scale={[0.27, 0.15, 0.33]} position={[0, -0.58, 0.07]} color={SAND_DARK} segments={10} />
        </group>
      ))}
      <group ref={body}>
        {/* torso boulder + lumps */}
        <TSphere scale={[0.95, 0.84, 0.8]} position={[0, 1.38, 0]} color={giant ? '#d8a660' : SAND} outline segments={16} />
        <TSphere scale={[0.42, 0.3, 0.36]} position={[-0.62, 1.86, -0.12]} color={SAND_DARK} segments={10} />
        <TSphere scale={[0.3, 0.22, 0.28]} position={[0.66, 0.98, 0.2]} color={SAND_DARK} segments={8} />
        <TSphere scale={[0.24, 0.18, 0.22]} position={[0.2, 1.95, -0.45]} color={SAND_LIGHT} segments={8} />
        {/* crystal clusters on the shoulders */}
        {[-1, 1].map((sd) => (
          <group key={sd} position={[sd * 0.72, 1.98, -0.05]} rotation={[0, 0, -sd * 0.45]}>
            <TCone radius={0.13} height={0.46} segments={6} position={[0, 0.2, 0]} color={sd < 0 ? '#c3a8f5' : '#8fd0ff'} outline flat />
            <TCone radius={0.09} height={0.3} segments={6} position={[sd * 0.16, 0.1, 0.08]} rotation={[0, 0, -sd * 0.4]} color={'#8ee6c0'} flat />
          </group>
        ))}
        {giant &&
          [-0.4, 0, 0.4].map((x, i) => (
            <TCone key={x} radius={0.16} height={0.6} segments={6} position={[x, 1.95, -0.6]} rotation={[-0.6, 0, x * 0.6]} color={['#f7a1c4', '#ffd36b', '#9fb6ff'][i]} flat />
          ))}
        {/* head with a grumpy-cute face and a crystal crown */}
        <group position={[0, 2.28, 0.05]}>
          <TSphere scale={[0.52, 0.45, 0.47]} color={giant ? '#d8a660' : SAND} outline segments={14} />
          <ChibiFace eyeY={0.04} eyeX={0.19} eyeZ={0.41} eyeR={0.07} blushY={-0.12} blushX={0.3} blushZ={0.33} blushR={0.07} />
          {[-1, 1].map((sd) => (
            <TBox key={sd} size={[0.2, 0.05, 0.04]} radius={0.02} position={[sd * 0.19, 0.17, 0.43]} rotation={[0, 0, sd * 0.32]} color={TOON.outline} castShadow={false} />
          ))}
          <TCone radius={0.1} height={0.34} segments={6} position={[0, 0.5, -0.05]} color={'#c3a8f5'} outline flat />
          <TCone radius={0.08} height={0.24} segments={6} position={[-0.17, 0.42, -0.02]} rotation={[0, 0, 0.4]} color={'#8fd0ff'} flat />
          <TCone radius={0.08} height={0.24} segments={6} position={[0.17, 0.42, -0.02]} rotation={[0, 0, -0.4]} color={'#8ee6c0'} flat />
        </group>
        {/* chest plaque: the dividend, chalked big */}
        <TBox size={[1.1, 0.76, 0.09]} radius={0.08} position={[0, 1.32, 0.8]} color={PLAQUE} castShadow={false} outline />
        <group position={[0, 1.32, 0.86]}>
          <Instances geometry={geo.box(1, 1, 1, 0.2)} color={CHALK} items={chalk} />
        </group>
      </group>
      {/* arms (pivot at the shoulder) */}
      {([
        [armL, -1],
        [armR, 1],
      ] as const).map(([ref, sd]) => (
        <group key={sd} ref={ref} position={[sd * 0.98, 1.62, 0.05]}>
          <TCapsule radius={0.18} length={0.42} position={[sd * 0.08, -0.36, 0]} rotation={[0, 0, sd * 0.22]} color={SAND_DARK} flat segments={8} />
          <TSphere scale={0.24} position={[sd * 0.16, -0.74, 0.04]} color={SAND} segments={10} />
        </group>
      ))}
    </group>
  )
}

// ── crystals ─────────────────────────────────────────────────────────────────

/** A chunky double-terminated gem (bob it from the parent). */
function Gem({ color, size = 1 }: { color: string; size?: number }) {
  return (
    <group scale={size}>
      <TCone radius={0.25} height={0.62} segments={6} color={color} outline flat emissive={color} emissiveIntensity={0.18} />
      <TCone radius={0.25} height={0.34} segments={6} position={[0, -0.48, 0]} rotation={[Math.PI, 0, 0]} color={color} outline flat emissive={color} emissiveIntensity={0.18} />
    </group>
  )
}

/**
 * A rock pedestal with its divisor crystal hovering over it and a slate number
 * card leaning on the front (white chalk on dark slate reads at play
 * distance). `taken` hides the crystal (carried / in flight) but keeps the card.
 */
export function Pedestal({ n, taken, hint }: { n: number; taken: boolean; hint: boolean }) {
  const gem = useRef<Group>(null)
  const label = String(n)
  const cardW = label.length > 1 ? 0.92 : 0.72
  const card = useMemo(() => chalkText(label, { y: 0, z: 0, w: 0.24, h: 0.38, t: 0.06, gap: 0.08, color: '#fff3c4' }), [label])
  const color = crystalColor(n)
  useFrame(({ clock }) => {
    const g = gem.current
    if (!g) return
    g.position.y = 1.12 + Math.sin(clock.elapsedTime * 1.8 + n) * 0.07
    g.rotation.y = clock.elapsedTime * 0.8 + n
  })
  return (
    <group>
      <TCyl radiusTop={0.46} radiusBottom={0.6} height={0.5} position={[0, 0.25, 0]} color={TOON.rockLight} outline segments={8} />
      <TCyl radiusTop={0.4} radiusBottom={0.4} height={0.05} position={[0, 0.53, 0]} color={color} castShadow={false} segments={8} />
      <group position={[0, 0.48, 0.62]} rotation={[-0.5, 0, 0]}>
        <TBox size={[cardW, 0.56, 0.07]} radius={0.08} color={'#3c4657'} castShadow={false} outline />
        <group position={[0, 0, 0.05]}>
          <Instances geometry={geo.box(1, 1, 1, 0.2)} color={'#fff3c4'} items={card} />
        </group>
      </group>
      {!taken && (
        <group ref={gem} position={[0, 1.12, 0]}>
          <Gem color={color} />
        </group>
      )}
      {hint && !taken && <HintArrow y={2.15} />}
    </group>
  )
}

/** A bobbing arrow that points down at what to do next (first round only). */
export function HintArrow({ y = 2, color = TOON.gold }: { y?: number; color?: string }) {
  const g = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (g.current) g.current.position.y = y + Math.abs(Math.sin(clock.elapsedTime * 3.2)) * 0.28
  })
  return (
    <group ref={g} position={[0, y, 0]}>
      <TCone radius={0.2} height={0.36} segments={4} rotation={[Math.PI, 0, 0]} color={color} outline castShadow={false} />
      <TBox size={[0.13, 0.26, 0.13]} position={[0, 0.27, 0]} radius={0.03} color={color} castShadow={false} />
    </group>
  )
}

/** The crystal carried over the creature's head (world space, follows the avatar). */
export function HeldCrystal({ n, avatarRef }: { n: number; avatarRef: RefObject<Group | null> }) {
  const g = useRef<Group>(null)
  const chalk = useMemo(() => chalkText(String(n), { y: 0, z: 0, w: 0.13, h: 0.2, t: 0.035, gap: 0.04, color: '#ffffff' }), [n])
  const [squashRef, kick] = useSquash()
  useEffect(() => {
    kick(1.2)
  }, [n, kick])
  useFrame(({ clock, camera }) => {
    const a = avatarRef.current
    const m = g.current
    if (!a || !m) return
    m.position.set(a.position.x, a.position.y + 2.05 + Math.sin(clock.elapsedTime * 4) * 0.06, a.position.z)
    m.quaternion.copy(camera.quaternion)
  })
  return (
    <group ref={g}>
      <group ref={squashRef}>
        <Gem color={crystalColor(n)} size={0.72} />
        <group position={[0, 0.02, 0.2]}>
          <Instances geometry={geo.box(1, 1, 1, 0.2)} color={TOON.white} items={chalk} />
        </group>
      </group>
    </group>
  )
}

const _a = new Vector3()
const _b = new Vector3()

/**
 * A thrown crystal: an arc from the kid to wherever the golem is NOW (it keeps
 * marching), spinning; reports landing once. `back` flies it home instead
 * (a bounce): from the golem to its pedestal.
 */
export function FlyingCrystal({
  n,
  from,
  simRef,
  to,
  duration = 0.42,
  onLanded,
}: {
  n: number
  from: [number, number]
  simRef: RefObject<GolemSim>
  /** fixed destination (local x, z) instead of the golem */
  to?: [number, number]
  duration?: number
  onLanded: () => void
}) {
  const g = useRef<Group>(null)
  const t = useRef(0)
  const done = useRef(false)
  useFrame((_, dt) => {
    const m = g.current
    const s = simRef.current
    if (!m || !s) return
    t.current += Math.min(dt, 0.05) / duration
    const k = Math.min(t.current, 1)
    _a.set(from[0], to ? 1.6 : 1.7, from[1])
    if (to) _b.set(to[0], 1.1, to[1])
    else _b.set(s.x, 1.45 * s.scale, s.z + 0.55 * s.scale)
    m.position.lerpVectors(_a, _b, k)
    m.position.y += Math.sin(k * Math.PI) * (to ? 1.0 : 1.5)
    m.rotation.y += 0.45
    m.rotation.z += 0.2
    if (k >= 1 && !done.current) {
      done.current = true
      onLanded()
    }
  })
  return (
    <group ref={g} position={[from[0], 1.7, from[1]]}>
      <Gem color={crystalColor(n)} size={0.7} />
    </group>
  )
}

// ── the herd: instanced mini camels ──────────────────────────────────────────

export interface HerdJob {
  /** bump to start a new job */
  id: number
  /** where the camels burst out (local x, z) */
  from: [number, number]
  spots: { spot: [number, number]; inPen: boolean }[]
  /** seconds after everyone has arrived before they run back into the golem (wrong split); null = they stay */
  returnAfter: number | null
}

interface Part {
  geometry: BufferGeometry
  color: string
  /** one entry per instance of this part on a single camel */
  mats: Matrix4[]
  tint?: boolean
}

const COAT = '#e8b878'
const COAT_DARK = '#c99357'
const _m = new Matrix4()
const _cm = new Matrix4()
const _q = new Quaternion()
const _e = new Euler()
const _p = new Vector3()
const _s = new Vector3()
const _zero = new Matrix4().makeScale(0, 0, 0)
const _col = new Color()
const BLANKETS = [TOON.roofTeal, TOON.coral, TOON.flowerPurple, TOON.sky]

function partMatrix(pos: [number, number, number], scale: [number, number, number], rot: [number, number, number] = [0, 0, 0]) {
  return new Matrix4().compose(new Vector3(...pos), new Quaternion().setFromEuler(new Euler(...rot)), new Vector3(...scale))
}

/** A chibi camel built from a handful of shared shapes (faces +z, ~0.95 tall). */
const CAMEL_PARTS: Part[] = [
  // legs
  { geometry: geo.capsule(1, 1, 6), color: COAT, mats: [-1, 1].flatMap((x) => [-1, 1].map((z) => partMatrix([x * 0.12, 0.17, z * 0.16], [0.06, 0.12, 0.06]))) },
  // body, hump, head
  { geometry: geo.sphere(10), color: COAT, mats: [partMatrix([0, 0.42, 0], [0.22, 0.18, 0.3]), partMatrix([0, 0.58, -0.05], [0.16, 0.16, 0.17]), partMatrix([0, 0.8, 0.3], [0.16, 0.15, 0.16])] },
  // neck
  { geometry: geo.capsule(1, 1, 6), color: COAT, mats: [partMatrix([0, 0.6, 0.22], [0.075, 0.1, 0.075], [0.55, 0, 0])] },
  // muzzle
  { geometry: geo.sphere(8), color: '#f6dcae', mats: [partMatrix([0, 0.75, 0.43], [0.1, 0.075, 0.08])] },
  // eyes
  { geometry: geo.sphere(6), color: TOON.eye, mats: [-1, 1].map((x) => partMatrix([x * 0.075, 0.84, 0.43], [0.026, 0.032, 0.02])) },
  // fez
  { geometry: geo.cyl(0.8, 1, 1, 8), color: '#e2544a', mats: [partMatrix([0, 0.97, 0.28], [0.07, 0.1, 0.07], [-0.15, 0, 0.12])] },
  // saddle blanket (tinted per camel)
  { geometry: geo.box(1, 1, 1, 0.2), color: '#ffffff', mats: [partMatrix([0, 0.6, -0.04], [0.34, 0.05, 0.26])], tint: true },
  // tail tuft
  { geometry: geo.sphere(6), color: COAT_DARK, mats: [partMatrix([0, 0.4, -0.32], [0.05, 0.07, 0.05])] },
]

/**
 * Up to MAX_HERD mini camels in one draw call per part. A job pops them out of
 * the golem one at a time (a hop), runs each to its spot (a pen stall, or
 * outside the fence when there are too many), reports every arrival (the flow
 * counts them out loud), and — for a wrong split — runs them back into the
 * golem after a beat. Matrices are written into preallocated buffers; no
 * per-frame allocation.
 */
export function CamelHerd({
  job,
  scale = 1.1,
  onArrive,
  onSettled,
  onReturned,
}: {
  job: HerdJob | null
  scale?: number
  onArrive: (index: number, spot: [number, number], inPen: boolean) => void
  onSettled: () => void
  onReturned: () => void
}) {
  const meshes = useRef<(InstancedMesh | null)[]>([])
  // stable colour buffer (an inline array would rebuild the attribute — and reset it — every render)
  const [tint] = useState(() => new Float32Array(MAX_HERD * 3).fill(1))
  const cb = useRef({ onArrive, onSettled, onReturned })
  useEffect(() => {
    cb.current = { onArrive, onSettled, onReturned }
  }, [onArrive, onSettled, onReturned])

  const sim = useRef({
    id: -1,
    n: 0,
    t: 0,
    x: new Float32Array(MAX_HERD),
    z: new Float32Array(MAX_HERD),
    yaw: new Float32Array(MAX_HERD),
    state: new Uint8Array(MAX_HERD), // 0 wait, 1 hop, 2 run, 3 arrived, 4 return, 5 gone
    st: new Float32Array(MAX_HERD),
    arrived: 0,
    settledAt: -1,
    returned: 0,
    active: false,
  })

  // a new job: reset the sim (effect, not render)
  useEffect(() => {
    const s = sim.current
    if (!job) {
      s.active = false
      s.n = 0
      for (const m of meshes.current) {
        if (!m) continue
        for (let i = 0; i < m.count; i++) m.setMatrixAt(i, _zero)
        m.instanceMatrix.needsUpdate = true
      }
      return
    }
    if (job.id === s.id) return
    s.id = job.id
    s.n = Math.min(MAX_HERD, job.spots.length)
    s.t = 0
    s.arrived = 0
    s.returned = 0
    s.settledAt = -1
    s.active = true
    for (let i = 0; i < s.n; i++) {
      s.x[i] = job.from[0]
      s.z[i] = job.from[1]
      s.yaw[i] = 0
      s.state[i] = 0
      s.st[i] = 0
    }
    // blanket colours per camel
    const tinted = CAMEL_PARTS.findIndex((p) => p.tint)
    const m = meshes.current[tinted]
    if (m) {
      for (let i = 0; i < MAX_HERD; i++) m.setColorAt(i, _col.set(BLANKETS[i % BLANKETS.length]))
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
  }, [job])

  useFrame(({ clock }, rawDt) => {
    const s = sim.current
    if (!s.active || !job) return
    const dt = juice.frozen() ? 0 : Math.min(rawDt, 0.05)
    s.t += dt
    const POP_GAP = 0.3
    const HOP = 0.34
    const SPEED = 4.4
    let running = false
    for (let i = 0; i < s.n; i++) {
      const target = job.spots[i].spot
      switch (s.state[i]) {
        case 0:
          if (s.t >= 0.12 + i * POP_GAP) {
            s.state[i] = 1
            s.st[i] = 0
            sfx.pop()
            juice.burst({ pos: wpos(job.from[0], 1.1, job.from[1]), color: [SAND, SAND_LIGHT, '#c3a8f5'], count: 6, speed: 2, up: 2.5, size: 0.08, life: 0.5 })
          }
          running = true
          break
        case 1: {
          s.st[i] += dt
          // hop out sideways in a little fan
          const a = (i / Math.max(1, s.n - 1) - 0.5) * 2.2
          const k = Math.min(1, s.st[i] / HOP)
          s.x[i] = job.from[0] + Math.sin(a) * 0.9 * k
          s.z[i] = job.from[1] + 0.6 * k
          s.yaw[i] = Math.atan2(target[0] - s.x[i], target[1] - s.z[i])
          if (k >= 1) s.state[i] = 2
          running = true
          break
        }
        case 2: {
          const dx = target[0] - s.x[i]
          const dz = target[1] - s.z[i]
          const d = Math.hypot(dx, dz)
          if (d < 0.05) {
            s.x[i] = target[0]
            s.z[i] = target[1]
            s.state[i] = 3
            s.st[i] = 0
            s.arrived++
            cb.current.onArrive(s.arrived, target, job.spots[i].inPen)
          } else {
            const v = Math.min(d, SPEED * dt)
            s.x[i] += (dx / d) * v
            s.z[i] += (dz / d) * v
            s.yaw[i] = Math.atan2(dx, dz)
          }
          running = true
          break
        }
        case 3:
          s.st[i] += dt
          // turn to face the camera once arrived
          s.yaw[i] += (0 - s.yaw[i]) * Math.min(1, dt * 6)
          break
        case 4: {
          const dx = job.from[0] - s.x[i]
          const dz = job.from[1] - s.z[i]
          const d = Math.hypot(dx, dz)
          if (d < 0.1) {
            s.state[i] = 5
            s.returned++
            if (s.returned === s.n) cb.current.onReturned()
          } else {
            const v = Math.min(d, SPEED * 1.2 * dt)
            s.x[i] += (dx / d) * v
            s.z[i] += (dz / d) * v
            s.yaw[i] = Math.atan2(dx, dz)
            running = true
          }
          break
        }
        default:
          break
      }
    }
    if (s.arrived === s.n && s.settledAt < 0) {
      s.settledAt = s.t
      cb.current.onSettled()
    }
    if (job.returnAfter != null && s.settledAt >= 0 && s.t - s.settledAt > job.returnAfter) {
      for (let i = 0; i < s.n; i++) if (s.state[i] === 3) s.state[i] = 4
    }

    // write instance matrices
    const time = clock.elapsedTime
    for (let pi = 0; pi < CAMEL_PARTS.length; pi++) {
      const mesh = meshes.current[pi]
      if (!mesh) continue
      const part = CAMEL_PARTS[pi]
      const per = part.mats.length
      for (let i = 0; i < MAX_HERD; i++) {
        const st = i < s.n ? s.state[i] : 5
        if (st === 0 || st === 5) {
          for (let j = 0; j < per; j++) mesh.setMatrixAt(i * per + j, _zero)
          continue
        }
        let y: number
        if (st === 1) {
          const k = Math.min(1, s.st[i] / HOP)
          y = Math.sin(k * Math.PI) * 0.9 + (1 - k) * 0.6
        } else if (st === 2 || st === 4) y = Math.abs(Math.sin(time * 13 + i)) * 0.1
        else {
          // settled: a happy hop together when the pen is right, a gentle bob otherwise
          const party = job.returnAfter == null && s.settledAt >= 0 && s.t - s.settledAt < 1.6
          y = party ? Math.abs(Math.sin((s.t - s.settledAt) * 9 + i * 0.5)) * 0.28 : Math.abs(Math.sin(time * 3 + i * 0.7)) * 0.03
        }
        const sc = st === 1 ? scale * (0.4 + 0.6 * Math.min(1, s.st[i] / HOP)) : scale
        _p.set(s.x[i], y, s.z[i])
        _q.setFromEuler(_e.set(0, s.yaw[i], 0))
        _s.setScalar(sc)
        _cm.compose(_p, _q, _s)
        for (let j = 0; j < per; j++) mesh.setMatrixAt(i * per + j, _m.multiplyMatrices(_cm, part.mats[j]))
      }
      mesh.instanceMatrix.needsUpdate = true
    }
    if (!running && s.returned === s.n && job.returnAfter != null) s.active = false
  })

  return (
    <group>
      {CAMEL_PARTS.map((p, i) => (
        <instancedMesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el
          }}
          args={[p.geometry, toonMaterial(p.color), MAX_HERD * p.mats.length]}
          castShadow
          frustumCulled={false}
        >
          {p.tint && <instancedBufferAttribute attach="instanceColor" args={[tint, 3]} />}
        </instancedMesh>
      ))}
    </group>
  )
}

// ── the pen ──────────────────────────────────────────────────────────────────

const FENCE_POSTS = 18

/**
 * The camel pen: a round fence, a straw floor and one hay stall per camel the
 * golem should split into (rows of five, like a ten-frame) — the quotient is
 * a number of empty places before it is a number of camels. A slate sign
 * chalks it too.
 */
export function Pen({ quotient, glow }: { quotient: number; glow: boolean }) {
  const posts = useMemo<Inst[]>(
    () =>
      Array.from({ length: FENCE_POSTS }, (_, i) => {
        const a = (i / FENCE_POSTS) * Math.PI * 2
        return { x: Math.cos(a) * PEN.r, y: 0.32, z: Math.sin(a) * PEN.r, s: [0.12, 0.64, 0.12] as [number, number, number] }
      }),
    [],
  )
  const stalls = useMemo<Inst[]>(
    () => penStalls(quotient, 0, 0).map(([x, z]) => ({ x, y: 0.035, z, s: [0.48, 0.07, 0.5] as [number, number, number] })),
    [quotient],
  )
  const sign = useMemo(() => chalkText(String(quotient), { y: 0, z: 0, w: 0.28, h: 0.44, t: 0.07, gap: 0.09, color: '#fff3c4' }), [quotient])
  return (
    <group position={[PEN.x, 0, PEN.z]}>
      <Decal geometry={blobDisc(PEN.r + 0.25, 0.06, 31, 40)} color={'#f0d68e'} position={[0, 0.012, 0]} />
      <Decal geometry={blobDisc(PEN.r - 0.15, 0.1, 32, 36)} color={'#f6e2a8'} position={[0, 0.016, 0]} />
      <Instances geometry={geo.box(1, 1, 1, 0.3)} color={TOON.woodLight} items={posts} castShadow />
      <TTorus radius={PEN.r} tube={0.045} segments={48} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.5, 0]} color={TOON.wood} castShadow={false} />
      <TTorus radius={PEN.r} tube={0.04} segments={48} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.26, 0]} color={TOON.wood} castShadow={false} />
      {/* keyed: the kit's Instances only lays out on an `items` change, so a
          material swap must remount it */}
      <Instances key={glow ? 'glow' : 'plain'} geometry={geo.box(1, 1, 1, 0.2)} color={glow ? '#ffe58a' : '#e9c46a'} mat={glow ? { emissive: '#ffd36b', emissiveIntensity: 0.35 } : undefined} items={stalls} receiveShadow />
      {/* the sign: how many camels this pen wants */}
      <group position={[-PEN.r - 0.15, 0, -0.55]} rotation={[0, 0.5, 0]}>
        <TCyl radiusTop={0.06} height={1.5} position={[0, 0.75, 0]} color={TOON.woodDark} castShadow={false} />
        <group position={[0, 1.55, 0.05]}>
          <TBox size={[0.95, 0.72, 0.08]} radius={0.06} color={'#3f6b5a'} outline />
          <group position={[0, 0, 0.06]}>
            <Instances geometry={geo.box(1, 1, 1, 0.2)} color={'#fff3c4'} items={sign} />
          </group>
        </group>
      </group>
    </group>
  )
}

// ── the host: the Dunes' camel trader, reacting ─────────────────────────────

export type HostMood = 'idle' | 'cheer' | 'worry' | 'startle' | 'wave'

/**
 * The camel trader (the World's Division Dunes guide), big, beside the pen.
 * `mood` + `token` retrigger a reaction: cheer = happy hops and a spin, worry
 * = a nervous sway, startle = jump back (a golem stomped), wave = bouncing
 * hello. A speech bubble carries one or two words.
 */
export function HostCamel({ position, mood, token, say }: { position: [number, number]; mood: HostMood; token: number; say: string | null }) {
  const g = useRef<Group>(null)
  const t0 = useRef<number | null>(null)
  const last = useRef(-1)
  useFrame(({ clock }) => {
    const m = g.current
    if (!m) return
    const now = clock.elapsedTime
    if (last.current !== token) {
      last.current = token
      t0.current = now
    }
    const t = now - (t0.current ?? now)
    let y = 0
    let rz = 0
    let ry = 0.55
    let rx = 0
    if (mood === 'cheer' && t < 1.6) {
      y = Math.abs(Math.sin(t * 9)) * 0.35 * (1 - t / 1.6)
      ry = 0.55 + (t < 0.6 ? t / 0.6 : 1) * Math.PI * 2
    } else if (mood === 'worry' && t < 1.4) {
      rz = Math.sin(t * 14) * 0.08
    } else if (mood === 'startle' && t < 1.0) {
      y = Math.sin(Math.min(1, t / 0.4) * Math.PI) * 0.5
      rx = -0.2 * Math.max(0, 1 - t)
    } else if (mood === 'wave' && t < 2.2) {
      y = Math.abs(Math.sin(t * 6)) * 0.18
      rz = Math.sin(t * 6) * 0.06
    } else {
      y = Math.sin(now * 2) * 0.02
    }
    m.position.set(position[0], y, position[1])
    m.rotation.set(rx, ry, rz)
  })
  return (
    <group ref={g} position={[position[0], 0, position[1]]} scale={2.1}>
      <Camel headTurn={-0.35} />
      {say && (
        <Html position={[0, 1.55, 0]} center zIndexRange={[15, 5]} style={{ pointerEvents: 'none' }}>
          <SpeechBubble key={`${token}:${say}`} text={say} />
        </Html>
      )}
    </group>
  )
}

/** The giant's health: two crystal hearts riding above its head (DOM, always crisp). */
export function BossBar({ simRef, hp }: { simRef: RefObject<GolemSim>; hp: number }) {
  const g = useRef<Group>(null)
  useFrame(() => {
    const s = simRef.current
    if (g.current && s) g.current.position.set(s.x, 3.45 * s.scale, s.z)
  })
  return (
    <group ref={g}>
      <Html center zIndexRange={[14, 4]} style={{ pointerEvents: 'none' }}>
        <div className="flex items-center gap-1 rounded-full px-2 py-1" style={{ background: 'rgba(58,44,56,.8)', border: '2px solid rgba(255,255,255,.85)' }} aria-label={`Giant health ${hp} of 2`}>
          {[0, 1].map((i) => (
            <span key={i} className="block h-3 w-10 rounded-full transition-all duration-300" style={{ background: i < hp ? '#f2766b' : 'rgba(255,255,255,.2)' }} />
          ))}
        </div>
      </Html>
    </group>
  )
}
