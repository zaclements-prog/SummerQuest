import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { walkState } from './walkState'

const CADENCE = 9 // leg swing speed

/**
 * A leg that pivots at the hip and swings forward/back while the creature walks.
 * Authored to sit exactly where a plain leg box used to: a box of height `h`
 * resting with its bottom on y=0 at (x,z). `phase` offsets the gait — give
 * diagonally-opposite legs the same phase for a natural trot. Also works as a
 * wiggling octopus tentacle.
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
      <mesh castShadow position={[0, -h / 2, 0]}>
        <boxGeometry args={[w, h, dz]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {foot && (
        <mesh castShadow position={[0, -h + foot.h / 2, foot.z ?? 0]}>
          <boxGeometry args={[foot.w, foot.h, foot.d]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}
    </group>
  )
}

/**
 * A wing that flaps gently and continuously (winged creatures look alive even at
 * rest). Pivots at the shoulder `(x,y,z)`; the wing panel extends outward along
 * `side` (+1 = right, -1 = left).
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
      <mesh castShadow position={[(side * w) / 2, 0, 0]}>
        <boxGeometry args={[w, thickness, d]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}
