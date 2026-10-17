/* eslint-disable react-refresh/only-export-components -- the station layout constants (POOL/HILL/PEAK/RIVER) describe exactly what these parts draw; co-located on purpose, not an HMR boundary */
import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Color, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Object3D, Vector3 } from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { TOON } from '../toon/palette'
import { TBlob, TBox, TCone, TCyl, TSphere, TTorus } from '../toon/shapes'
import { Bush, FlowerPatch, Rock } from '../toon/props'
import { ScatterTrees, type TreeSpot } from '../toon/Scatter'
import { Decal } from '../world/areas/fraction-falls/kit'
import { blobDisc } from '../world/areas/fraction-falls/shapes'
import { Peak } from '../world/areas/science-summit/SummitProps'
import type { DropForm, Process, Twist } from '../lib/cycle/cycleCore'
import { useSquash } from './_juice/useSquash'

/**
 * Visual pieces for Cloud Keeper's fun pass (docs/superpowers/specs/
 * 2026-10-17-mini-games-fun-pass.md). Dumb and presentational: the flow lives
 * in CloudKeeper.tsx.
 *
 * Three stations, one per process: the SUN POOL (evaporation), the COLD CLOUD
 * (condensation; it hovers over the hill, and drifts on the wind twist — its
 * shadow ring is the station) and the RAIN PEAK (precipitation). The river
 * carries rain from the peak back to the pool. Drip, the droplet, changes
 * shape with each process: water → vapor → cloud → water.
 *
 * `mode` drives every station: 'off' = resting, 'run' = performing, 'stall' =
 * trying and getting nowhere (a wrong station).
 */

export type StationMode = 'off' | 'run' | 'stall'

// ── layout (world units; the camera looks from +z) ───────────────────────────

export const POOL = { x: -3.3, z: 0.35, r: 1.2, ring: 1.85 }
export const HILL = { x: 0.1, z: -3.1, r: 1.0 }
export const CLOUD_Y = 2.55
export const CLOUD_RING = 1.35
export const PEAK = { x: 3.55, z: -0.55, r: 1.25, h: 2.7 }
/** The peak's station: its front foot. */
export const PEAK_RING = { x: 3.25, z: 0.55, r: 1.45 }
export const SPAWN: [number, number] = [0.3, 1.6]
export const PEBBLE_AT: [number, number, number] = [-2.75, 0, -2.55]
export const SUN_AT: [number, number, number] = [POOL.x - 0.35, 3.15, POOL.z - 1.25]
/** The river, from the peak's foot round the front of the yard into the pool. */
export const RIVER: [number, number, number][] = [
  [PEAK.x - 0.5, 0.06, PEAK.z + 1.15],
  [2.3, 0.06, 1.95],
  [0.9, 0.06, 2.35],
  [-0.6, 0.06, 2.3],
  [-1.9, 0.06, 1.75],
  [POOL.x + 0.45, 0.06, POOL.z + 0.45],
]
/** Where the storm's three friend droplets wait to be rescued. */
export const FRIEND_SPOTS: [number, number][] = [
  [-1.0, 0.9],
  [1.45, 0.55],
  [0.25, -1.05],
]
/** The rainbow arc, rising over the yard from the pool to the peak (its centre is below ground). */
export const RAINBOW = { x: 0.1, y: -1.4, z: -1.9, r: 4.6 }

/** A point on the rainbow's arc: `k` 0 = the pool's end, 1 = the peak's end. */
export function rainbowPoint(k: number): [number, number, number] {
  const a = Math.PI * (0.82 - 0.64 * k)
  return [RAINBOW.x + Math.cos(a) * RAINBOW.r, RAINBOW.y + Math.sin(a) * RAINBOW.r, RAINBOW.z]
}

/**
 * Where the cold cloud hovers at time `t`: still over the hill, or drifting
 * across the back of the yard on the wind twist (a slow figure-eight).
 */
export function cloudSpot(t: number, twist: Twist): [number, number] {
  if (twist !== 'wind') return [HILL.x, HILL.z]
  return [HILL.x + Math.sin(t * 0.42) * 2.0, HILL.z + 0.5 + Math.sin(t * 0.84) * 0.6]
}

const WATER_C = '#5ec8f2'
const VAPOR_C = '#f4f1ff'
const CLOUD_C = '#ffffff'
const SLATE = '#3c4657'

/** Deterministic scatter offset for particle i under a spread. */
const scatter = (i: number, spread: number): [number, number] => [(((i * 0.618) % 1) - 0.5) * 2 * spread, (((i * 0.382 + 0.2) % 1) - 0.5) * 2 * spread]

// ── shared bits ─────────────────────────────────────────────────────────────

/** A soft chalk ring on the ground marking a station; `glow` pulses it. */
export function StationRing({ r, color = '#fff6cf', glow = false, opacity = 0.6 }: { r: number; color?: string; glow?: boolean; opacity?: number }) {
  const m = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const mesh = m.current
    if (!mesh) return
    const mat = mesh.material as MeshBasicMaterial
    mat.opacity = glow ? opacity * (0.6 + 0.4 * Math.sin(clock.elapsedTime * 5)) : opacity
  })
  return (
    <mesh ref={m} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <ringGeometry args={[r - 0.1, r, 48]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

/** The station's name tag (icon + process word: the vocabulary, kept short). */
export function StationTag({ icon, label, y, active }: { icon: string; label: string; y: number; active: boolean }) {
  return (
    <Html position={[0, y, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div
        className="kid-text"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 17,
          lineHeight: 1,
          padding: '4px 9px 4px 6px',
          borderRadius: 999,
          background: active ? '#fffaf0' : 'rgba(255,250,240,.75)',
          boxShadow: active ? '0 3px 0 0 #3a2c38' : 'none',
          border: '3px solid #3a2c38',
          color: '#3a2c38',
          whiteSpace: 'nowrap',
          transform: active ? 'scale(1)' : 'scale(.88)',
          transition: 'transform .3s, background .3s',
        }}
      >
        <span style={{ fontSize: 22 }}>{icon}</span>
        {label}
      </div>
    </Html>
  )
}

/** A bouncing guide arrow (warm-up hints). */
export function GuideArrow({ x, z, y = 2.4 }: { x: number; z: number; y?: number }) {
  const g = useRef<Group>(null)
  useFrame(({ clock }) => {
    const m = g.current
    if (!m) return
    m.position.y = y + Math.abs(Math.sin(clock.elapsedTime * 4)) * 0.35
    m.rotation.y = clock.elapsedTime * 1.5
  })
  return (
    <group ref={g} position={[x, y, z]}>
      <TCone radius={0.24} height={0.4} rotation={[Math.PI, 0, 0]} color={TOON.gold} emissive={TOON.gold} emissiveIntensity={0.45} outline castShadow={false} />
      <TCyl radiusTop={0.08} height={0.3} position={[0, 0.32, 0]} color={TOON.gold} emissive={TOON.gold} emissiveIntensity={0.45} castShadow={false} />
    </group>
  )
}

/**
 * Soft vapor puffs looping out of `origin`: rise and thin in 'run', rise then
 * sink back in 'stall' (the process tries and gets nowhere), gone in 'off'.
 */
function Puffs({ origin, mode, count = 6, spread = 0.8, rise = 2.0, size = 0.2, color = TOON.foam }: { origin: [number, number, number]; mode: StationMode; count?: number; spread?: number; rise?: number; size?: number; color?: string }) {
  const g = useRef<Group>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    const m = g.current
    if (!m) return
    t.current += Math.min(dt, 0.05)
    for (let i = 0; i < m.children.length; i++) {
      const c = m.children[i] as Mesh
      const mat = c.material as MeshBasicMaterial
      const ph = (t.current / (mode === 'stall' ? 1.4 : 1.1) + i / count) % 1
      const fwd = mode === 'stall' ? Math.sin(ph * Math.PI) * 0.5 : ph
      c.position.y = fwd * rise
      const k = mode === 'stall' ? 1 - Math.abs(0.5 - ph) * 0.8 : 1 - ph * 0.85
      c.scale.setScalar(Math.max(0.08, k))
      mat.opacity = mode === 'off' ? 0 : 0.85 * k * k
    }
  })
  return (
    <group position={origin}>
      <group ref={g}>
        {Array.from({ length: count }, (_, i) => {
          const [dx, dz] = scatter(i, spread)
          return (
            <mesh key={i} position={[dx, 0, dz]}>
              <sphereGeometry args={[size, 8, 6]} />
              <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

/** A face: two eyes with catch-lights, blush and a smile (or a worried mouth). */
function Face({ z, y = 0, s = 1, worried = false }: { z: number; y?: number; s?: number; worried?: boolean }) {
  return (
    <group position={[0, y, z]} scale={s}>
      {[-1, 1].map((k) => (
        <group key={k}>
          <TSphere position={[k * 0.085, 0.03, 0]} scale={[0.04, 0.05, 0.03]} color={TOON.eye} castShadow={false} segments={8} />
          <TSphere position={[k * 0.085 + 0.014, 0.05, 0.022]} scale={0.014} color={TOON.white} emissive={TOON.white} emissiveIntensity={1} castShadow={false} segments={6} />
          <TSphere position={[k * 0.14, -0.04, -0.01]} scale={[0.035, 0.02, 0.015]} color={TOON.blush} castShadow={false} segments={6} />
        </group>
      ))}
      <TTorus radius={0.035} tube={0.01} rotation={[0, 0, worried ? 0 : Math.PI]} position={[0, worried ? -0.07 : -0.045, 0]} color={TOON.eye} castShadow={false} segments={10} />
    </group>
  )
}

// ── Drip, the droplet ───────────────────────────────────────────────────────

const _want = new Vector3()

/** Drip's body in one of the three forms. */
export function DripBody({ form, worried = false, tint }: { form: DropForm; worried?: boolean; tint?: string }) {
  const swirl = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (swirl.current) swirl.current.rotation.y = clock.elapsedTime * 2.2
  })
  if (form === 'water') {
    const c = tint ?? WATER_C
    return (
      <group>
        <TSphere scale={[0.27, 0.27, 0.25]} color={c} outline segments={14} />
        <TCone radius={0.2} height={0.32} position={[0, 0.3, 0]} color={c} segments={12} castShadow={false} />
        <TSphere position={[-0.11, 0.12, 0.17]} scale={[0.05, 0.08, 0.03]} color={TOON.white} emissive={TOON.white} emissiveIntensity={0.6} castShadow={false} segments={8} />
        <Face z={0.24} y={-0.02} worried={worried} />
      </group>
    )
  }
  if (form === 'vapor') {
    const c = tint ?? VAPOR_C
    return (
      <group>
        <group ref={swirl}>
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2
            return <TSphere key={i} position={[Math.cos(a) * 0.17, Math.sin(i * 1.7) * 0.08 + 0.05, Math.sin(a) * 0.17]} scale={0.15} color={c} opacity={0.6} castShadow={false} segments={10} />
          })}
        </group>
        <TSphere scale={0.2} color={c} opacity={0.82} castShadow={false} segments={12} />
        <TSphere position={[0, 0.28, 0]} scale={0.08} color={c} opacity={0.55} castShadow={false} segments={8} />
        <Face z={0.2} worried={worried} s={0.9} />
      </group>
    )
  }
  const c = tint ?? CLOUD_C
  return (
    <group>
      <TSphere scale={[0.24, 0.2, 0.2]} color={c} outline segments={12} />
      <TSphere position={[-0.22, -0.05, 0]} scale={[0.17, 0.14, 0.15]} color={c} castShadow={false} segments={10} />
      <TSphere position={[0.22, -0.04, 0]} scale={[0.18, 0.15, 0.15]} color={c} castShadow={false} segments={10} />
      <TSphere position={[0.06, 0.15, -0.02]} scale={[0.15, 0.13, 0.13]} color={c} castShadow={false} segments={10} />
      <Face z={0.2} y={-0.01} worried={worried} />
    </group>
  )
}

export type DripMotion =
  | { kind: 'head' }
  | { kind: 'fly'; to: [number, number, number]; dur: number; arc: number; token: number }
  | { kind: 'path'; pts: [number, number, number][]; dur: number; token: number }
  | { kind: 'hold'; at: [number, number, number] }

/**
 * Drip (or a storm friend): rides over the kid's head, flies to a station,
 * rides the river home, or waits somewhere. Squashes on every form change,
 * shakes its head on a wrong station.
 */
export function Drip({
  form,
  motion,
  avatarRef,
  shake,
  worried = false,
  tint,
  scale = 1,
}: {
  form: DropForm
  motion: DripMotion
  avatarRef: RefObject<Group | null>
  /** bump to shake "no" */
  shake: number
  worried?: boolean
  tint?: string
  scale?: number
}) {
  const g = useRef<Group>(null)
  const body = useRef<Group>(null)
  const [sq, kick] = useSquash()
  const st = useRef({ from: new Vector3(), t: 0, shakeT: 99, init: false, path: [] as Vector3[], lens: [] as number[] })
  const prevForm = useRef(form)
  const motionKey = motion.kind === 'fly' || motion.kind === 'path' ? `${motion.kind}:${motion.token}` : motion.kind === 'hold' ? `hold:${motion.at.join(',')}` : 'head'
  useEffect(() => {
    const s = st.current
    if (g.current) s.from.copy(g.current.position)
    s.t = 0
    if (motion.kind === 'path') {
      s.path = motion.pts.map((p) => new Vector3(...p))
      s.lens = []
      let total = 0
      for (let i = 1; i < s.path.length; i++) {
        total += s.path[i].distanceTo(s.path[i - 1])
        s.lens.push(total)
      }
    }
    // the motion object is rebuilt each render; its key says when it really changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motionKey])
  useEffect(() => {
    if (prevForm.current !== form) {
      prevForm.current = form
      kick(0.9)
    }
  }, [form, kick])
  useEffect(() => {
    if (shake > 0) st.current.shakeT = 0
  }, [shake])
  useFrame(({ clock }, rawDt) => {
    const m = g.current
    if (!m) return
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    s.t += dt
    const a = avatarRef.current
    const bob = Math.sin(clock.elapsedTime * 3) * 0.06
    if (motion.kind === 'head') {
      if (!a) return
      const want = _want.set(a.position.x - 0.15, a.position.y + 1.75 + bob, a.position.z + 0.05)
      if (!s.init) {
        m.position.copy(want)
        s.init = true
      } else m.position.lerp(want, Math.min(1, dt * 10))
    } else if (motion.kind === 'fly') {
      const k = Math.min(1, s.t / motion.dur)
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      m.position.set(s.from.x + (motion.to[0] - s.from.x) * e, s.from.y + (motion.to[1] - s.from.y) * e + Math.sin(k * Math.PI) * motion.arc, s.from.z + (motion.to[2] - s.from.z) * e)
    } else if (motion.kind === 'path') {
      const total = s.lens[s.lens.length - 1] ?? 0
      const d = Math.min(1, s.t / motion.dur) * total
      let i = 0
      while (i < s.lens.length - 1 && s.lens[i] < d) i++
      const prev = i === 0 ? 0 : s.lens[i - 1]
      const seg = Math.max(1e-6, s.lens[i] - prev)
      if (s.path.length > 1) m.position.lerpVectors(s.path[i], s.path[i + 1], Math.min(1, (d - prev) / seg))
      m.position.y += Math.abs(Math.sin(s.t * 9)) * 0.08
    } else {
      m.position.set(motion.at[0], motion.at[1] + bob, motion.at[2])
      s.init = false
    }
    s.shakeT += dt
    const b = body.current
    if (b) b.rotation.y = s.shakeT < 0.7 ? Math.sin(s.shakeT * 26) * 0.5 * (1 - s.shakeT / 0.7) : Math.sin(clock.elapsedTime * 1.3) * 0.15
  })
  return (
    <group ref={g} scale={scale}>
      <group ref={sq}>
        <group ref={body}>
          <DripBody form={form} worried={worried} tint={tint} />
        </group>
      </group>
    </group>
  )
}

// ── stations ────────────────────────────────────────────────────────────────

/** The sun pool: the pool's level tracks the loop; the sun's face beams while it heats. */
export function SunPool({ level, mode, tag }: { level: number; mode: StationMode; tag: { active: boolean; glow: boolean } }) {
  const sun = useRef<Group>(null)
  const rays = useRef<Group>(null)
  const [sq, kick] = useSquash()
  const prev = useRef(mode)
  useEffect(() => {
    if (prev.current !== mode && mode !== 'off') kick(mode === 'run' ? 0.7 : 0.5)
    prev.current = mode
  }, [mode, kick])
  useFrame(({ clock }, dt) => {
    const s = sun.current
    if (s) {
      const pulse = mode === 'run' ? 1 + Math.sin(clock.elapsedTime * 12) * 0.08 : 1
      s.scale.setScalar(pulse)
      s.position.y = SUN_AT[1] + Math.sin(clock.elapsedTime * 1.1) * 0.08
    }
    if (rays.current) rays.current.rotation.z += dt * (mode === 'run' ? 3.5 : 0.4)
  })
  return (
    <group>
      <group position={[POOL.x, 0, POOL.z]}>
        <group ref={sq}>
          <TCyl radiusTop={POOL.r + 0.2} radiusBottom={POOL.r} height={0.32} position={[0, 0.16, 0]} color={TOON.stone} outline segments={16} />
          <TCyl radiusTop={POOL.r - 0.05} height={0.06} position={[0, 0.18 + level * 0.12, 0]} color={TOON.water} castShadow={false} segments={16} />
          <TCyl radiusTop={POOL.r * 0.45} height={0.065} position={[0.25, 0.185 + level * 0.12, 0.2]} color={TOON.waterShallow} castShadow={false} segments={12} />
          {[[-0.55, 0.45], [0.6, -0.4]].map(([x, z], i) => (
            <TCyl key={i} radiusTop={0.2} height={0.03} position={[x, 0.24 + level * 0.12, z]} color={i ? TOON.leaf : TOON.leafDark} castShadow={false} segments={10} />
          ))}
          <TSphere position={[-0.55, 0.3 + level * 0.12, 0.45]} scale={[0.07, 0.05, 0.07]} color={TOON.flowerPink} castShadow={false} segments={8} />
        </group>
        <Puffs origin={[0, 0.4, 0]} mode={mode} count={7} spread={0.75} rise={2.2} color={'#fff7e6'} />
        <StationRing r={POOL.ring} color={'#ffd75e'} glow={tag.glow} opacity={tag.active ? 0.75 : 0.35} />
        <StationTag icon="☀️" label="Evaporation" y={0.55} active={tag.active} />
      </group>
      {/* the sun, with a face */}
      <group ref={sun} position={SUN_AT}>
        <TSphere scale={0.55} color={TOON.flowerYellow} emissive={TOON.flowerYellow} emissiveIntensity={0.5} outline segments={16} />
        <group ref={rays}>
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2
            return <TCone key={i} radius={0.11} height={0.32} position={[Math.cos(a) * 0.78, Math.sin(a) * 0.78, -0.05]} rotation={[0, 0, a - Math.PI / 2]} color={TOON.gold} emissive={TOON.gold} emissiveIntensity={0.4} castShadow={false} segments={4} />
          })}
        </group>
        <group position={[0, 0, 0.42]} scale={2.2}>
          <Face z={0.07} worried={false} />
        </group>
      </group>
    </group>
  )
}

/**
 * The cold cloud (condensation): it hovers over the hill, or drifts on the
 * wind. Its SHADOW is the station: stand in it and vapor gathers into
 * droplets. `spotRef` receives its live ground position every frame (the
 * game's proximity check reads it).
 */
export function ColdCloud({
  level,
  mode,
  twist,
  spotRef,
  tag,
  storm,
}: {
  level: number
  mode: StationMode
  twist: Twist
  spotRef: RefObject<[number, number]>
  tag: { active: boolean; glow: boolean }
  storm: boolean
}) {
  const g = useRef<Group>(null)
  const cloud = useRef<Group>(null)
  const flakes = useRef<Group>(null)
  const [sq, kick] = useSquash()
  const prev = useRef(mode)
  const t0 = useRef<number | null>(null)
  useEffect(() => {
    if (prev.current !== mode && mode !== 'off') kick(mode === 'run' ? 0.9 : 0.5)
    prev.current = mode
  }, [mode, kick])
  useFrame(({ clock }) => {
    const m = g.current
    if (!m) return
    if (t0.current === null) t0.current = clock.elapsedTime
    const [x, z] = cloudSpot(clock.elapsedTime - t0.current, twist)
    m.position.set(x, 0, z)
    spotRef.current = [x, z]
    const c = cloud.current
    if (c) c.position.y = CLOUD_Y + Math.sin(clock.elapsedTime * 0.9) * 0.08
    const f = flakes.current
    if (f) {
      for (let i = 0; i < f.children.length; i++) {
        const k = (clock.elapsedTime * 0.5 + i / f.children.length) % 1
        const a = (i / f.children.length) * Math.PI * 2 + clock.elapsedTime * 0.6
        f.children[i].position.set(Math.cos(a) * 1.0, CLOUD_Y - 0.45 - k * 0.5, Math.sin(a) * 0.5)
        f.children[i].scale.setScalar(mode === 'run' ? 1.6 : 1)
      }
    }
  })
  const grow = 0.85 + 0.45 * level
  const tint = useMemo(() => new Color(storm ? '#9aa3b5' : '#ffffff').lerp(new Color('#c3cad8'), storm ? 0 : level * 0.6).getStyle(), [level, storm])
  const blobs: { p: [number, number, number]; s: [number, number, number] }[] = [
    { p: [0, 0, 0], s: [0.95, 0.6, 0.7] },
    { p: [-0.7, -0.1, 0.05], s: [0.6, 0.45, 0.5] },
    { p: [0.75, -0.08, -0.05], s: [0.65, 0.46, 0.55] },
    { p: [0.12, 0.3, 0], s: [0.55, 0.42, 0.48] },
  ]
  return (
    <group ref={g} position={[HILL.x, 0, HILL.z]}>
      {/* the shadow: the station spot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[CLOUD_RING - 0.1, 32]} />
        <meshBasicMaterial color={'#5b7aa8'} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <StationRing r={CLOUD_RING} color={'#bfe3ff'} glow={tag.glow} opacity={tag.active ? 0.8 : 0.35} />
      <group ref={cloud} position={[0, CLOUD_Y, 0]}>
        <group ref={sq} scale={grow}>
          {blobs.map((b, i) => (
            <TSphere key={i} position={b.p} scale={b.s} color={tint} outline={i === 0} segments={12} />
          ))}
          <group position={[0, 0.02, 0.62]} scale={1.7}>
            <Face z={0} worried={storm} />
          </group>
        </group>
      </group>
      {/* cold sparkle flakes under the cloud */}
      <group ref={flakes}>
        {Array.from({ length: 6 }, (_, i) => (
          <TBox key={i} size={[0.07, 0.07, 0.07]} radius={0.01} color={'#d6f0ff'} emissive={'#d6f0ff'} emissiveIntensity={0.6} castShadow={false} />
        ))}
      </group>
      <Puffs origin={[0, 0.3, 0]} mode={mode} count={6} spread={0.6} rise={CLOUD_Y - 0.6} color={'#f4f1ff'} />
      <StationTag icon="❄️" label="Condensation" y={0.45} active={tag.active} />
    </group>
  )
}

/** A field of falling streaks (rain) or flakes (snow) in a box around `center`. */
export function Precip({ center, w, d, top, count, snow = false, on }: { center: [number, number]; w: number; d: number; top: number; count: number; snow?: boolean; on: boolean }) {
  const mesh = useRef<InstancedMesh>(null)
  const tmp = useMemo(() => ({ o: new Object3D(), zero: new Matrix4().makeScale(0, 0, 0) }), [])
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({ x: (((i * 0.618) % 1) - 0.5) * w, z: (((i * 0.382 + 0.27) % 1) - 0.5) * d, ph: (i * 0.137) % 1 })), [count, w, d])
  useFrame(({ clock }) => {
    const m = mesh.current
    if (!m) return
    const speed = snow ? 0.35 : 1.6
    for (let i = 0; i < seeds.length; i++) {
      if (!on) {
        m.setMatrixAt(i, tmp.zero)
        continue
      }
      const s = seeds[i]
      const k = (clock.elapsedTime * speed + s.ph) % 1
      tmp.o.position.set(center[0] + s.x + (snow ? Math.sin(clock.elapsedTime * 2 + i) * 0.12 : 0), top - k * top, center[1] + s.z)
      tmp.o.rotation.set(0, snow ? clock.elapsedTime + i : 0, 0)
      tmp.o.scale.set(1, 1, 1)
      tmp.o.updateMatrix()
      m.setMatrixAt(i, tmp.o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      {snow ? <boxGeometry args={[0.08, 0.08, 0.08]} /> : <boxGeometry args={[0.03, 0.42, 0.03]} />}
      <meshBasicMaterial color={snow ? '#ffffff' : '#7fc6ee'} transparent opacity={0.85} depthWrite={false} />
    </instancedMesh>
  )
}

/** The rain peak (precipitation): rain (or snow on the cold twist) falls on it from Drip's cloud. */
export function RainPeak({ mode, snowy, tag }: { mode: StationMode; snowy: boolean; tag: { active: boolean; glow: boolean } }) {
  const [sq, kick] = useSquash()
  const prev = useRef(mode)
  useEffect(() => {
    if (prev.current !== mode && mode !== 'off') kick(mode === 'run' ? 0.5 : 0.6)
    prev.current = mode
  }, [mode, kick])
  return (
    <group>
      <group position={[PEAK.x, 0, PEAK.z]}>
        <group ref={sq}>
          <Peak position={[0, PEAK.h / 2, 0]} radius={PEAK.r} height={PEAK.h} rot={0.3} color={'#b8bbd4'} snow={snowy ? 0.62 : 0.3} jagged={0.4} />
        </group>
        {/* the stream down its face into the river */}
        <TBox size={[0.24, 0.05, 1.2]} radius={0.02} position={[-0.35, 0.05, 1.05]} rotation={[0, 0.45, 0]} color={TOON.water} castShadow={false} />
      </group>
      <Precip center={[PEAK.x, PEAK.z + 0.2]} w={1.9} d={1.4} top={PEAK.h + 0.9} count={34} snow={snowy} on={mode !== 'off'} />
      <group position={[PEAK_RING.x, 0, PEAK_RING.z]}>
        <StationRing r={PEAK_RING.r} color={'#9fd3ff'} glow={tag.glow} opacity={tag.active ? 0.75 : 0.35} />
      </group>
      <group position={[PEAK.x, 0, PEAK.z]}>
        <StationTag icon="🌧️" label="Precipitation" y={PEAK.h * 0.45} active={tag.active} />
      </group>
    </group>
  )
}

/** The rainbow: six bands; `shown` (0..1) grows it band by band. */
export function Rainbow({ shown }: { shown: number }) {
  const g = useRef<Group>(null)
  const cur = useRef(0)
  const colors = ['#ff5a5a', '#ff9d3d', '#ffd84d', '#5ccf6b', '#4aa6ff', '#a978f0']
  useFrame((_, dt) => {
    cur.current += (shown - cur.current) * Math.min(1, dt * 2)
    const m = g.current
    if (!m) return
    for (let i = 0; i < m.children.length; i++) {
      const c = m.children[i] as Mesh
      const k = Math.min(1, Math.max(0, cur.current * colors.length - i))
      c.scale.setScalar(0.85 + 0.15 * k)
      ;(c.material as MeshBasicMaterial).opacity = 0.85 * k
      c.visible = k > 0.01
    }
  })
  return (
    <group ref={g} position={[RAINBOW.x, RAINBOW.y, RAINBOW.z]}>
      {colors.map((c, i) => (
        <mesh key={c} position={[0, 0, -i * 0.01]}>
          <torusGeometry args={[RAINBOW.r - i * 0.24, 0.13, 6, 56, Math.PI]} />
          <meshBasicMaterial color={c} transparent opacity={0} depthWrite={false} fog={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Professor Pebble's umbrella (storm only). */
export function Umbrella() {
  return (
    <group position={[0.1, 1.15, 0]} rotation={[0, 0, -0.18]}>
      <TCyl radiusTop={0.025} height={1.1} position={[0, 0, 0]} color={TOON.woodDark} segments={6} castShadow={false} />
      <TCone radius={0.75} height={0.36} position={[0, 0.62, 0]} color={TOON.flowerRed} outline segments={8} />
      <TSphere position={[0, 0.82, 0]} scale={0.05} color={TOON.gold} castShadow={false} segments={6} />
    </group>
  )
}

/** The meadow below Science Summit: snowy peaks behind, the river, flowers and trees. */
export function SummitYard() {
  const trees = useMemo<TreeSpot[]>(() => {
    const out: TreeSpot[] = []
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2 + (i % 3) * 0.08
      const r = 11.5 + (i % 4) * 2.2 + ((i * 7) % 5) * 0.6
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r - 1.5
      if (z > 4 && Math.abs(x) < 11) continue
      out.push({ x, z, scale: 1.1 + ((i * 13) % 7) * 0.12, kind: i % 3 === 0 ? 'round' : 'pine', seed: 70 + i })
    }
    out.push({ x: -6.6, z: -1.2, scale: 1.3, kind: 'pine', seed: 1 }, { x: 6.9, z: -2.4, scale: 1.35, kind: 'pine', seed: 2 }, { x: -7.2, z: 2.8, scale: 1.2, kind: 'round', seed: 3 }, { x: 7.4, z: 2.6, scale: 1.2, kind: 'pine', seed: 4 })
    return out
  }, [])
  return (
    <group>
      <Decal geometry={blobDisc(7.6, 0.12, 31, 48)} color={TOON.meadow} position={[0, 0.006, -0.4]} scale={[1.15, 1, 0.85]} />
      <Decal geometry={blobDisc(1.6, 0.2, 32, 24)} color={TOON.grassLight} position={[-6, 0.008, 4]} />
      {/* the river: peak → round the front → the pool */}
      {RIVER.map(([x, , z], i) => (
        <Decal key={i} geometry={blobDisc(i === 0 || i === RIVER.length - 1 ? 0.75 : 0.95, 0.14, 40 + i, 24)} color={TOON.water} position={[x, 0.012, z]} scale={[1.2, 1, 0.75]} />
      ))}
      {RIVER.slice(0, -1).map(([x, , z], i) => {
        const [nx, , nz] = RIVER[i + 1]
        return <Decal key={`m${i}`} geometry={blobDisc(0.7, 0.1, 50 + i, 20)} color={TOON.water} position={[(x + nx) / 2, 0.011, (z + nz) / 2]} scale={[1.4, 1, 0.8]} />
      })}
      {/* the hill under the cold cloud */}
      <TBlob position={[HILL.x, -0.15, HILL.z]} scale={[HILL.r * 1.5, 0.55, HILL.r * 1.2]} color={TOON.grassLight} />
      {/* the summit range behind */}
      <Peak position={[-5.5, 4.2, -13]} radius={5.2} height={8.4} rot={0.2} color={'#b8bbd4'} snow={0.34} jagged={0.42} />
      <Peak position={[2.5, 5.2, -16]} radius={6.4} height={10.4} rot={0.6} color={'#a7abc8'} snow={0.32} jagged={0.38} />
      <Peak position={[10.5, 3.6, -12]} radius={4.6} height={7.2} rot={1.1} color={'#b3b6cf'} snow={0.3} jagged={0.36} />
      <FlowerPatch position={[-1.8, 0, 3.6]} seed={3} count={8} radius={0.8} />
      <FlowerPatch position={[2.6, 0, 3.4]} seed={5} count={7} radius={0.7} />
      <FlowerPatch position={[-5.2, 0, -2.4]} seed={8} count={6} radius={0.6} />
      <FlowerPatch position={[5.6, 0, 1.8]} seed={9} count={6} radius={0.6} />
      <Rock position={[-5.8, 0, 1.0]} scale={1.2} seed={3} outline />
      <Rock position={[5.6, 0, -1.4]} scale={1.1} seed={7} outline />
      <Rock position={[1.9, 0, -4.9]} scale={1.0} seed={11} />
      <Bush position={[-3.5, 0, -4.6]} scale={1.2} seed={4} />
      <Bush position={[4.6, 0, -3.9]} scale={1.0} seed={9} />
      <Bush position={[-6.2, 0, -0.2]} scale={1.1} seed={14} />
      <ScatterTrees trees={trees} />
      {/* Pebble's little weather station */}
      <group position={[PEBBLE_AT[0] - 0.8, 0, PEBBLE_AT[2] - 0.3]}>
        <TCyl radiusTop={0.05} height={2.0} position={[0, 1.0, 0]} color={TOON.woodDark} segments={6} />
        <TBox size={[0.5, 0.36, 0.36]} radius={0.05} position={[0, 0.9, 0]} color={TOON.wallCream} outline castShadow={false} />
        <TSphere position={[0, 2.05, 0]} scale={0.07} color={TOON.gold} castShadow={false} segments={8} />
        <TCone radius={0.1} height={0.3} position={[0.24, 2.0, 0]} rotation={[0, 0, -Math.PI / 2]} color={TOON.flowerRed} segments={4} castShadow={false} />
      </group>
    </group>
  )
}

/** A little "help!" bubble over a stranded storm friend. */
export function HelpBubble() {
  return (
    <Html position={[0, 0.62, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div style={{ fontSize: 20, lineHeight: 1, padding: '2px 6px', borderRadius: 999, background: '#fffaf0', border: '2px solid #3a2c38', animation: 'ckbob 0.8s ease-in-out infinite alternate' }}>🆘</div>
    </Html>
  )
}

export const PROCESS_STATION: Record<Process, string> = { evaporation: 'pool', condensation: 'cloud', precipitation: 'peak' }
export { SLATE }
