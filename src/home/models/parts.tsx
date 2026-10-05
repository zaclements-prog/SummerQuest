/* eslint-disable react-refresh/only-export-components -- shared model helpers (components + tiny math utils), not an HMR boundary */
import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { TorusGeometry } from 'three'
import type { ColorRepresentation, Group } from 'three'
import { TBox, TCapsule, TSphere } from '../../toon/shapes'
import type { Vec3 } from '../../toon/shapes'
import { toonMaterial } from '../../toon/materials'
import { TOON } from '../../toon/palette'
import { walkState } from './walkState'

export type { Vec3 }

/**
 * The building blocks every creature and accessory is made of: a soft-toon
 * chibi toy kit layered on `src/toon`. Everything here is allocation-free per
 * frame (animated parts only write numbers into an existing group's rotation).
 */

const CADENCE = 9 // walk-cycle speed: matches the avatar's step bob (sin(t * 9))

// ── Line work ────────────────────────────────────────────────────────────────

/** Outline weight for creatures and accessories, in CSS pixels. */
export const INK_PX = 2

/**
 * A thin, warm-dark ink line around the parent mesh (drei inverted hull). Put it
 * as the child of a toon shape: `<TSphere …><Ink /></TSphere>`.
 *
 * The thickness is given in screen pixels (drei's default, non-`screenspace`
 * mode offsets the hull in clip space), so the line stays crisp and even from
 * the far iso World camera to the close-up studio — and on a scaled or squashed
 * ellipsoid. `crease` re-smooths normals first; use it on shapes with hard rims
 * (cylinders, cones) so the hull doesn't split at the cap edge.
 */
export function Ink({ px = INK_PX, crease = false }: { px?: number; crease?: boolean }) {
  const dpr = useThree((s) => s.viewport.dpr)
  return <Outlines thickness={px * dpr} color={TOON.outline} angle={crease ? Math.PI : 0} />
}

// ── Surface helpers (pure math, used while authoring) ────────────────────────

/**
 * z of the FRONT surface of an ellipsoid (radii rx, ry, rz) at offset (dx, dy)
 * from its centre. Lets features (eyes, cheeks, noses) sit exactly on a head.
 */
export function frontZ(rx: number, ry: number, rz: number, dx: number, dy: number): number {
  const k = 1 - (dx / rx) ** 2 - (dy / ry) ** 2
  return rz * Math.sqrt(Math.max(0, k))
}

/** Yaw that turns a feature at (dx, z) on a round face toward the surface normal. */
export function yawOn(dx: number, z: number): number {
  return Math.atan2(dx, Math.max(1e-3, z))
}

type V3 = readonly [number, number, number]

/**
 * A point on the front surface of a head ellipsoid (centre `c`, radii `r`) at
 * offset (dx, dy) from its centre, pushed out along z by `lift`.
 */
export function onFace(c: V3, r: V3, dx: number, dy: number, lift = 0): Vec3 {
  return [c[0] + dx, c[1] + dy, c[2] + frontZ(r[0], r[1], r[2], dx, dy) + lift]
}

/** Yaw for a feature at offset dx on the front of a head ellipsoid (c, r). */
export function faceYaw(_c: V3, r: V3, dx: number, dy: number): number {
  return yawOn(dx * (r[2] / r[0]) ** 2, frontZ(r[0], r[1], r[2], dx, dy))
}

// ── Body parts ───────────────────────────────────────────────────────────────

/**
 * A soft rounded box (toon). Kept for compatibility with older callers; new
 * creature code prefers spheres/capsules.
 */
export function Part({
  position,
  args,
  color,
  radius,
  emissive,
  emissiveIntensity,
  castShadow = true,
  rotation,
  outline,
}: {
  position?: Vec3
  args: [number, number, number]
  color: ColorRepresentation
  radius?: number
  emissive?: ColorRepresentation
  emissiveIntensity?: number
  castShadow?: boolean
  rotation?: Vec3
  outline?: boolean
}) {
  return (
    <TBox
      size={args}
      radius={radius ?? Math.min(...args) * 0.32}
      position={position}
      rotation={rotation}
      color={color}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      castShadow={castShadow}
    >
      {outline && <Ink />}
    </TBox>
  )
}

/**
 * A big glossy chibi eye: a dark rounded eyeball (slightly tall, flattened onto
 * the face) with a large and a tiny white catch-light. `size` is the eye's
 * height radius. Point it with `yaw`/`pitch` so it hugs a round head. `iris`
 * adds a lighter lower crescent (amber owl eyes, etc.).
 */
export function Eye({
  position,
  size = 0.06,
  yaw = 0,
  pitch = 0,
  color = TOON.eye,
  iris,
  wide = 0.8,
}: {
  position: Vec3
  size?: number
  yaw?: number
  pitch?: number
  color?: ColorRepresentation
  iris?: ColorRepresentation
  /** width / height of the eye */
  wide?: number
}) {
  const s = size
  return (
    <group position={position} rotation={[pitch, yaw, 0, 'YXZ']}>
      <TSphere scale={[s * wide, s, s * 0.5]} color={color} segments={16} castShadow={false} />
      {iris && (
        <TSphere
          position={[0, -s * 0.36, s * 0.16]}
          scale={[s * wide * 0.72, s * 0.5, s * 0.36]}
          color={iris}
          segments={12}
          castShadow={false}
        />
      )}
      {/* catch-lights */}
      <TSphere
        position={[s * wide * 0.32, s * 0.4, s * 0.4]}
        scale={[s * 0.3, s * 0.3, s * 0.14]}
        color={TOON.white}
        emissive={TOON.white}
        emissiveIntensity={1}
        segments={8}
        castShadow={false}
      />
      <TSphere
        position={[-s * wide * 0.3, -s * 0.38, s * 0.4]}
        scale={[s * 0.13, s * 0.13, s * 0.08]}
        color={TOON.white}
        emissive={TOON.white}
        emissiveIntensity={1}
        segments={6}
        castShadow={false}
      />
    </group>
  )
}

/** A soft pink blush oval lying on the cheek (turn it with `yaw`). */
export function Blush({
  position,
  yaw = 0,
  size = 0.05,
  color = TOON.blush,
}: {
  position: Vec3
  yaw?: number
  size?: number
  color?: ColorRepresentation
}) {
  return (
    <TSphere
      position={position}
      rotation={[0, yaw, 0]}
      scale={[size, size * 0.6, size * 0.3]}
      color={color}
      emissive={color}
      emissiveIntensity={0.25}
      segments={10}
      castShadow={false}
    />
  )
}

// Half-rings for little smiles, one per line-weight ratio, shared by every creature.
const smileCache = new Map<number, TorusGeometry>()
function smileGeometry(tube: number): TorusGeometry {
  const k = Math.round(tube * 50) / 50
  let g = smileCache.get(k)
  if (!g) {
    g = new TorusGeometry(1, k, 6, 14, Math.PI)
    smileCache.set(k, g)
  }
  return g
}

/**
 * A tiny curved smile (half ring, opening upward). `width` is the half-width
 * and `thickness` the line weight (world units). `cat` draws the "ω" cat mouth
 * (two small arcs side by side).
 */
export function Smile({
  position,
  width = 0.035,
  thickness = 0.009,
  yaw = 0,
  pitch = 0,
  cat = false,
  color = TOON.eye,
}: {
  position: Vec3
  width?: number
  thickness?: number
  yaw?: number
  pitch?: number
  cat?: boolean
  color?: ColorRepresentation
}) {
  const mat = toonMaterial(color)
  if (cat) {
    const w = width / 2
    const g = smileGeometry(thickness / w)
    return (
      <group position={position} rotation={[pitch, yaw, 0]}>
        <mesh geometry={g} material={mat} position={[-w, 0, 0]} rotation={[0, 0, Math.PI]} scale={[w, w, w * 0.8]} />
        <mesh geometry={g} material={mat} position={[w, 0, 0]} rotation={[0, 0, Math.PI]} scale={[w, w, w * 0.8]} />
      </group>
    )
  }
  return (
    <mesh
      geometry={smileGeometry(thickness / width)}
      material={mat}
      position={position}
      rotation={[pitch, yaw, Math.PI]}
      scale={[width, width * 0.8, width * 0.6]}
    />
  )
}

/**
 * A stubby leg that pivots at the hip `(x, y, z)` and swings while the creature
 * walks (reads the shared `walkState`). The leg hangs straight down to the floor
 * (y = 0) and ends in a rounded foot that pokes forward. Give the two legs
 * opposite phases (0 and π).
 */
export function Leg({
  x,
  y,
  z = 0,
  color,
  footColor,
  radius = 0.065,
  foot = [0.08, 0.055, 0.1],
  phase = 0,
  swing = 0.6,
  outline = true,
}: {
  x: number
  /** hip height (top of the leg) */
  y: number
  z?: number
  color: ColorRepresentation
  footColor?: ColorRepresentation
  radius?: number
  /** foot ellipsoid radii; its sole rests on the floor */
  foot?: Vec3
  phase?: number
  swing?: number
  outline?: boolean
}) {
  const hip = useRef<Group>(null)
  useFrame(() => {
    const g = hip.current
    if (!g) return
    g.rotation.x = walkState.moving ? Math.sin(walkState.t * CADENCE + phase) * swing : 0
  })
  const len = Math.max(0.001, y - foot[1] - radius * 0.5)
  return (
    <group ref={hip} position={[x, y, z]}>
      <TCapsule radius={radius} length={len} position={[0, -len / 2, 0]} color={color} segments={10}>
        {outline && <Ink />}
      </TCapsule>
      <TSphere
        position={[0, -y + foot[1], foot[2] * 0.3]}
        scale={foot}
        color={footColor ?? color}
        segments={14}
      >
        {outline && <Ink />}
      </TSphere>
    </group>
  )
}

/**
 * A little arm hanging from the shoulder `(x, y, z)`, splayed out to its side
 * and swinging opposite the same-side leg while walking. Ends in a round paw.
 */
export function Arm({
  x,
  y,
  z = 0,
  color,
  pawColor,
  radius = 0.05,
  length = 0.1,
  splay = 0.45,
  pitch = 0,
  phase = 0,
  swing = 0.5,
  outline = true,
}: {
  x: number
  y: number
  z?: number
  color: ColorRepresentation
  pawColor?: ColorRepresentation
  radius?: number
  length?: number
  splay?: number
  /** tilt the arm forward (+) at rest */
  pitch?: number
  phase?: number
  swing?: number
  outline?: boolean
}) {
  const side = x >= 0 ? 1 : -1
  const sh = useRef<Group>(null)
  useFrame(() => {
    const g = sh.current
    if (!g) return
    g.rotation.x = -pitch + (walkState.moving ? Math.sin(walkState.t * CADENCE + phase) * swing : 0)
  })
  return (
    <group position={[x, y, z]} rotation={[0, 0, side * splay]}>
      <group ref={sh} rotation={[-pitch, 0, 0]}>
        <TCapsule radius={radius} length={length} position={[0, -length / 2, 0]} color={color} segments={10}>
          {outline && <Ink />}
        </TCapsule>
        {pawColor && (
          <TSphere position={[0, -length - radius * 0.2, 0]} scale={radius * 1.12} color={pawColor} segments={12} />
        )}
      </group>
    </group>
  )
}

/**
 * A wing that flaps gently and continuously (winged creatures look alive even at
 * rest) and faster while walking. Pivots at the shoulder `(x, y, z)`; `rest`
 * is the resting [pitch, sweep-back yaw, raise roll]. Children are the wing shape, authored for the
 * RIGHT side (+x) — the left wing is mirrored automatically.
 */
export function Wing({
  x,
  y,
  z,
  side,
  rest = [0, 0.5, 0.35],
  flap = 0.35,
  children,
}: {
  x: number
  y: number
  z: number
  side: 1 | -1
  rest?: Vec3
  flap?: number
  children: ReactNode
}) {
  const root = useRef<Group>(null)
  useFrame(() => {
    const g = root.current
    if (!g) return
    const speed = walkState.moving ? 14 : 5
    const f = Math.sin(walkState.t * speed) * flap
    g.rotation.z = rest[2] + f
  })
  // The left wing is the right one mirrored (scale −1 on x), so the same roll
  // flaps both wings symmetrically.
  return (
    <group position={[x, y, z]} scale={[side, 1, 1]}>
      <group rotation={[rest[0], rest[1], 0]}>
        <group ref={root} rotation={[0, 0, rest[2]]}>
          {children}
        </group>
      </group>
    </group>
  )
}

/**
 * A tail root that wags side to side (around y) all the time, a little faster
 * while walking. Children are the tail, authored pointing back (−z) from the
 * root at `position`.
 */
export function Wag({
  position,
  rotation,
  amp = 0.3,
  speed = 3,
  children,
}: {
  position: Vec3
  rotation?: Vec3
  amp?: number
  speed?: number
  children: ReactNode
}) {
  const g = useRef<Group>(null)
  useFrame(() => {
    const r = g.current
    if (!r) return
    r.rotation.y = Math.sin(walkState.t * (walkState.moving ? speed * 2.4 : speed)) * amp
  })
  return (
    <group position={position} rotation={rotation}>
      <group ref={g}>{children}</group>
    </group>
  )
}

/**
 * A curling octopus tentacle: a chain of shrinking beads hanging from `(x, y, z)`
 * and splayed out along `yaw`. Each bead joint bends a little, rippling with a
 * phase so the arms wiggle softly at rest and paddle while walking.
 */
export function Tentacle({
  x,
  y,
  z,
  yaw,
  color,
  tipColor,
  phase = 0,
  radius = 0.078,
  outline = true,
}: {
  x: number
  y: number
  z: number
  yaw: number
  color: ColorRepresentation
  tipColor?: ColorRepresentation
  phase?: number
  radius?: number
  outline?: boolean
}) {
  const j0 = useRef<Group>(null)
  const j1 = useRef<Group>(null)
  const j2 = useRef<Group>(null)
  useFrame(() => {
    const m = walkState.moving
    const t = walkState.t * (m ? 9 : 2.6) + phase
    const a = m ? 0.32 : 0.14
    if (j0.current) j0.current.rotation.x = 0.55 + Math.sin(t) * a
    if (j1.current) j1.current.rotation.x = 0.5 + Math.sin(t - 0.9) * a
    if (j2.current) j2.current.rotation.x = 0.6 + Math.sin(t - 1.8) * a * 1.2
  })
  const r = radius
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      <group ref={j0}>
        <TSphere position={[0, -r * 0.6, 0]} scale={[r, r * 1.15, r]} color={color} segments={12}>
          {outline && <Ink />}
        </TSphere>
        <group ref={j1} position={[0, -r * 1.3, 0]}>
          <TSphere position={[0, -r * 0.55, 0]} scale={[r * 0.82, r, r * 0.82]} color={color} segments={12}>
            {outline && <Ink />}
          </TSphere>
          <group ref={j2} position={[0, -r * 1.1, 0]}>
            <TSphere position={[0, -r * 0.45, 0]} scale={r * 0.62} color={tipColor ?? color} segments={10}>
              {outline && <Ink />}
            </TSphere>
          </group>
        </group>
      </group>
    </group>
  )
}
