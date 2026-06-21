import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { RoundedBox } from '@react-three/drei'
import { walkState } from './walkState'

const CADENCE = 9 // leg swing speed

type Vec3 = [number, number, number]

/** A safe corner radius for a rounded box of the given dims (always < half min side). */
export function safeRadius(w: number, h: number, d: number, frac = 0.32): number {
  return Math.max(0.012, Math.min(w, h, d) * frac)
}

/**
 * A soft, beveled body part — the building block for every creature. A rounded
 * box with a matte material, so creatures read as smooth, premium toy figures
 * instead of hard cubes. Use this everywhere a plain `<mesh><boxGeometry>` was.
 */
export function Part({
  position,
  args,
  color,
  radius,
  roughness = 0.62,
  metalness = 0,
  emissive,
  emissiveIntensity,
  castShadow = true,
  rotation,
}: {
  position?: Vec3
  args: [number, number, number]
  color: string
  radius?: number
  roughness?: number
  metalness?: number
  emissive?: string
  emissiveIntensity?: number
  castShadow?: boolean
  rotation?: Vec3
}) {
  return (
    <RoundedBox
      args={args}
      radius={radius ?? safeRadius(args[0], args[1], args[2])}
      smoothness={3}
      position={position}
      rotation={rotation}
      castShadow={castShadow}
    >
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </RoundedBox>
  )
}

/**
 * A lively eye: a glossy dark eyeball with a bright catch-light. Far more
 * characterful than a flat box. `size` is the eyeball radius; `color` lets you
 * do amber/green eyes. Place at the eye position on the head.
 */
export function Eye({
  position,
  size = 0.075,
  color = '#241d18',
}: {
  position: Vec3
  size?: number
  color?: string
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size, 14, 14]} />
        <meshStandardMaterial color={color} roughness={0.22} />
      </mesh>
      {/* catch-light */}
      <mesh position={[size * 0.32, size * 0.34, size * 0.62]}>
        <sphereGeometry args={[size * 0.34, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.45} roughness={0.2} />
      </mesh>
    </group>
  )
}

/**
 * A leg that pivots at the hip and swings forward/back while the creature walks.
 * Authored to sit exactly where a plain leg box used to: a box of height `h`
 * resting with its bottom on y=0 at (x,z). `phase` offsets the gait — give
 * diagonally-opposite legs the same phase for a natural trot. Also works as a
 * wiggling octopus tentacle. (Now beveled to match the rounded creature style.)
 */
export function Leg({
  x,
  z,
  color,
  w = 0.12,
  h = 0.24,
  depth,
  phase = 0,
  swing = 0.6,
  foot,
}: {
  x: number
  z: number
  color: string
  w?: number
  h?: number
  /** z-size of the leg box; defaults to `w` (square). */
  depth?: number
  phase?: number
  swing?: number
  /** Optional foot box at the leg's base that swings with the leg. */
  foot?: { w: number; h: number; d: number; z?: number }
}) {
  const hip = useRef<Group>(null)
  const dz = depth ?? w
  useFrame(() => {
    if (!hip.current) return
    hip.current.rotation.x = walkState.moving ? Math.sin(walkState.t * CADENCE + phase) * swing : 0
  })
  return (
    <group ref={hip} position={[x, h, z]}>
      <RoundedBox
        args={[w, h, dz]}
        radius={safeRadius(w, h, dz, 0.42)}
        smoothness={2}
        position={[0, -h / 2, 0]}
        castShadow
      >
        <meshStandardMaterial color={color} roughness={0.6} />
      </RoundedBox>
      {foot && (
        <RoundedBox
          args={[foot.w, foot.h, foot.d]}
          radius={safeRadius(foot.w, foot.h, foot.d, 0.42)}
          smoothness={2}
          position={[0, -h + foot.h / 2, foot.z ?? 0]}
          castShadow
        >
          <meshStandardMaterial color={color} roughness={0.6} />
        </RoundedBox>
      )}
    </group>
  )
}

/**
 * A wing that flaps gently and continuously (winged creatures look alive even at
 * rest). Pivots at the shoulder `(x,y,z)`; the wing panel extends outward along
 * `side` (+1 = right, -1 = left). (Now beveled.)
 */
export function Wing({
  x,
  y,
  z,
  side,
  color,
  w = 0.34,
  thickness = 0.04,
  d = 0.4,
  flap = 0.5,
}: {
  x: number
  y: number
  z: number
  side: 1 | -1
  color: string
  w?: number
  thickness?: number
  d?: number
  flap?: number
}) {
  const root = useRef<Group>(null)
  useFrame(() => {
    if (!root.current) return
    const f = Math.abs(Math.sin(walkState.t * 6)) * flap
    root.current.rotation.z = -side * (0.15 + f)
  })
  return (
    <group ref={root} position={[x, y, z]}>
      <RoundedBox
        args={[w, thickness, d]}
        radius={thickness * 0.4}
        smoothness={2}
        position={[(side * w) / 2, 0, 0]}
        castShadow
      >
        <meshStandardMaterial color={color} roughness={0.6} />
      </RoundedBox>
    </group>
  )
}
