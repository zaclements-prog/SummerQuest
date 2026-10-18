/* eslint-disable react-refresh/only-export-components -- the egg model plus its tiny animation-state helper */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, CurvePath, LatheGeometry, LineCurve3, TubeGeometry, Vector2, Vector3 } from 'three'
import type { Group, Mesh } from 'three'
import { toonMaterial } from '../../toon/materials'
import { TSphere } from '../../toon/shapes'
import { TOON } from '../../toon/palette'
import { registerSharedGpuCache } from '../../platform/gl/release'
import { Ink } from './parts'

/**
 * A pet's egg: a soft toon egg tinted for its zone, with a few spots. It can
 * wobble, crack along a zig-zag and open (the top of the shell flies off) —
 * the hatch celebration drives that frame by frame through `anim`.
 *
 * Stands on y = 0, about 0.62 tall (a baby pet's size), faces +z.
 */

/** Height and widest radius of the egg. */
export const EGG_H = 0.62
const EGG_R = 0.235
/** Where the shell splits (share of the height). */
const SPLIT = 0.56
/** Height of the zig-zag teeth along the split. */
const TOOTH = 0.034
const SEGMENTS = 20 // around (even, so the zig-zag closes)
const PROFILE = 14 // points per part

// ── Shape ────────────────────────────────────────────────────────────────────

/** The profile at t ∈ [0, π] (bottom → top): [radius, height]. Wider below the middle, like an egg. */
function profile(t: number): [number, number] {
  const r = EGG_R * Math.sin(t) * (1 + 0.13 * Math.cos(t))
  const y = (EGG_H * (1 - Math.cos(t))) / 2
  return [Math.max(0, r), y]
}
/** Outward normal of the profile at t: [radial, up]. */
function profileNormal(t: number): [number, number] {
  const e = 1e-3
  const [r0, y0] = profile(Math.max(0, t - e))
  const [r1, y1] = profile(Math.min(Math.PI, t + e))
  const dr = r1 - r0
  const dy = y1 - y0
  const len = Math.hypot(dr, dy) || 1
  return [dy / len, -dr / len]
}
const T_SPLIT = Math.acos(1 - 2 * SPLIT)
/** Zig-zag offset of the split at segment i around. */
const tooth = (i: number) => (i % 2 === 0 ? TOOTH : -TOOTH)

function lathe(from: number, to: number, rimAt: 'top' | 'bottom'): LatheGeometry {
  const pts: Vector2[] = []
  for (let k = 0; k <= PROFILE; k++) {
    const [r, y] = profile(from + ((to - from) * k) / PROFILE)
    pts.push(new Vector2(r, y))
  }
  const g = new LatheGeometry(pts, SEGMENTS)
  // Zig-zag the rim: the bottom shell's top ring and the cap's bottom ring move together.
  const pos = g.getAttribute('position')
  const ring = rimAt === 'top' ? PROFILE : 0
  for (let i = 0; i <= SEGMENTS; i++) {
    const v = i * (PROFILE + 1) + ring
    pos.setY(v, pos.getY(v) + tooth(i))
  }
  pos.needsUpdate = true
  return g
}

let shapes: { bottom: LatheGeometry; top: LatheGeometry; whole: LatheGeometry } | null = null
function eggShapes() {
  if (!shapes) {
    shapes = {
      bottom: lathe(0, T_SPLIT, 'top'),
      top: lathe(T_SPLIT, Math.PI, 'bottom'),
      whole: (() => {
        const pts: Vector2[] = []
        for (let k = 0; k <= PROFILE * 2; k++) {
          const [r, y] = profile((Math.PI * k) / (PROFILE * 2))
          pts.push(new Vector2(r, y))
        }
        return new LatheGeometry(pts, SEGMENTS)
      })(),
    }
  }
  return shapes
}
// Released from the renderer with the last canvas (see platform/gl/release).
registerSharedGpuCache(() => (shapes ? [shapes.bottom, shapes.top, shapes.whole] : []))

/** One half of the crack: a thin zig-zag tube from the front (φ = 0) around to ±165°. */
function crackGeometry(dir: 1 | -1): TubeGeometry {
  const path = new CurvePath<Vector3>()
  const steps = SEGMENTS / 2 - 1
  let prev: Vector3 | null = null
  const [r, y] = profile(T_SPLIT)
  for (let k = 0; k <= steps; k++) {
    const i = k
    const phi = dir * ((2 * Math.PI * i) / SEGMENTS)
    const p = new Vector3(Math.sin(phi) * r * 1.035, y + tooth(i), Math.cos(phi) * r * 1.035)
    if (prev) path.add(new LineCurve3(prev, p))
    prev = p
  }
  return new TubeGeometry(path, steps * 4, 0.009, 5, false)
}

// Spots: [t (0 bottom … π top), φ around (0 = front), size]
const SPOTS: [number, number, number][] = [
  [0.95, 0.5, 0.05],
  [1.25, -0.9, 0.04],
  [0.7, 2.6, 0.045],
  [2.15, 0.2, 0.045],
  [2.0, -2.2, 0.05],
  [2.45, 1.9, 0.035],
]

function Spot({ t, phi, size, color }: { t: number; phi: number; size: number; color: string }) {
  const [r, y] = profile(t)
  const [nr, ny] = profileNormal(t)
  const lift = 0.004
  // turn to the spot's side of the egg, then tilt it flat onto the curve
  return (
    <group rotation={[0, phi, 0]}>
      <TSphere
        position={[0, y + ny * lift, r + nr * lift]}
        rotation={[-Math.asin(ny), 0, 0]}
        scale={[size, size * 0.85, size * 0.3]}
        color={color}
        segments={10}
        castShadow={false}
      />
    </group>
  )
}

// ── Animation state ──────────────────────────────────────────────────────────

/** What the hatch celebration drives each frame (all 0…1). */
export interface EggAnim {
  /** Rocking side to side. */
  wobble: number
  /** The zig-zag crack showing, from the front around. */
  crack: number
  /** The top of the shell flying off (and the shell shrinking away near the end). */
  open: number
}
export function newEggAnim(): EggAnim {
  return { wobble: 0, crack: 0, open: 0 }
}
/** Write this frame's hatch state (kept out of components: it's mutated every frame). */
export function setEggAnim(a: EggAnim, wobble: number, crack: number, open: number): void {
  a.wobble = wobble
  a.crack = crack
  a.open = open
}

// ── The model ────────────────────────────────────────────────────────────────

export function Egg({
  shell,
  spot,
  idle = false,
  anim,
}: {
  shell: string
  spot: string
  /** A gentle "something's inside" wobble every few seconds. */
  idle?: boolean
  /** Driven by a hatch: read every frame. */
  anim?: EggAnim
}) {
  const rock = useRef<Group>(null)
  const top = useRef<Group>(null)
  const bottom = useRef<Group>(null)
  const crackL = useRef<Mesh>(null)
  const crackR = useRef<Mesh>(null)
  const geo = eggShapes()
  const cracks = useMemo(() => (anim ? [crackGeometry(1), crackGeometry(-1)] : null), [anim])
  useEffect(() => () => cracks?.forEach((c) => c.dispose()), [cracks])
  const shellMat = toonMaterial(shell, { doubleSide: true })
  // eggs wobble out of step with each other
  let phase = 0
  for (let i = 0; i < shell.length; i++) phase += shell.charCodeAt(i) * (i + 1)
  phase %= 10

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const g = rock.current
    if (!g) return
    if (anim) {
      const w = anim.wobble
      g.rotation.z = Math.sin(t * 15) * 0.2 * w
      g.position.y = Math.abs(Math.sin(t * 15)) * 0.025 * w
      for (const c of [crackL.current, crackR.current]) {
        if (!c) continue
        const geom = c.geometry as BufferGeometry
        const count = geom.index ? geom.index.count : 0
        const per = 5 * 6 // radial segments × 6 indices per tubular step
        c.visible = anim.crack > 0.001 && anim.open < 0.05
        geom.setDrawRange(0, Math.ceil((count / per) * Math.min(1, anim.crack)) * per)
      }
      const o = anim.open
      if (top.current) {
        top.current.visible = o < 0.98
        top.current.position.set(o * 0.3, o * 0.75, o * -0.1)
        top.current.rotation.set(o * -0.4, 0, o * -1.6)
        top.current.scale.setScalar(o > 0.6 ? Math.max(0.001, 1 - (o - 0.6) / 0.4) : 1)
      }
      if (bottom.current) {
        const k = o > 0.55 ? Math.max(0.001, 1 - (o - 0.55) / 0.45) : 1
        bottom.current.scale.set(1 + (1 - k) * 0.3, k, 1 + (1 - k) * 0.3)
        bottom.current.visible = k > 0.002
      }
    } else if (idle) {
      // every ~3.2 s: a little rock-a-bye, as if the pet inside turned over
      const cyc = (t + phase) % 3.2
      const env = cyc < 0.9 ? Math.sin((cyc / 0.9) * Math.PI) : 0
      g.rotation.z = Math.sin(cyc * 18) * 0.1 * env
    }
  })

  return (
    <group ref={rock}>
      {anim ? (
        <>
          <group ref={bottom}>
            <mesh geometry={geo.bottom} material={shellMat} castShadow>
              <Ink />
            </mesh>
            {SPOTS.filter(([t]) => t < T_SPLIT - 0.12).map(([t, phi, s], i) => (
              <Spot key={i} t={t} phi={phi} size={s} color={spot} />
            ))}
          </group>
          {/* the cap pivots on the split's right edge as it flies off */}
          <group ref={top}>
            <mesh geometry={geo.top} material={shellMat} castShadow>
              <Ink />
            </mesh>
            {SPOTS.filter(([t]) => t > T_SPLIT + 0.12).map(([t, phi, s], i) => (
              <Spot key={i} t={t} phi={phi} size={s} color={spot} />
            ))}
          </group>
          {cracks && (
            <>
              <mesh ref={crackL} geometry={cracks[0]} material={toonMaterial(TOON.outline)} visible={false} />
              <mesh ref={crackR} geometry={cracks[1]} material={toonMaterial(TOON.outline)} visible={false} />
            </>
          )}
        </>
      ) : (
        <>
          <mesh geometry={geo.whole} material={shellMat} castShadow>
            <Ink />
          </mesh>
          {SPOTS.map(([t, phi, s], i) => (
            <Spot key={i} t={t} phi={phi} size={s} color={spot} />
          ))}
        </>
      )}
    </group>
  )
}
