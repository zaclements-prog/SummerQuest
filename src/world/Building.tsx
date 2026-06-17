import type { ReactNode } from 'react'
import { useWorldUi } from './useWorldUi'
import { frontFacingWalls } from './collision'

function Wall({ pos, args, color, opacity }: {
  pos: [number, number, number]
  args: [number, number, number]
  color: string
  opacity: number
}) {
  return (
    <mesh castShadow position={pos}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={opacity > 0.5} />
    </mesh>
  )
}

/**
 * A 5x5 building centered at (cx,cz) with a doorway gap on its +z wall. The two
 * camera-facing walls (+x, +z) and the roof fade out when the avatar is inside,
 * so you can see the interior. No scene swap — pure opacity toggle.
 */
export default function Building({
  id, cx, cz, size = 5, doorWidth = 1.6, wall = '#cdbb98', roof = '#9a5a3c', children,
}: {
  id: string
  cx: number
  cz: number
  size?: number
  doorWidth?: number
  wall?: string
  roof?: string
  children?: ReactNode
}) {
  const inside = useWorldUi((s) => s.insideBuildingId) === id
  const front = frontFacingWalls() // ['px','pz']
  const H = 2.4
  const half = size / 2
  const door = doorWidth / 2
  const seg = half - door // segment width (1.7 for a 1.6 door)
  const segC = (half + door) / 2 // segment center (1.65 for a 1.6 door)

  const op = (faces: ('px' | 'pz')[]) => (inside && faces.some((f) => front.includes(f)) ? 0.14 : 1)

  return (
    <group position={[cx, 0, cz]}>
      {/* back walls (-x, -z) — never transparent */}
      <Wall pos={[-half, H / 2, 0]} args={[0.3, H, size]} color={wall} opacity={op([])} />
      <Wall pos={[0, H / 2, -half]} args={[size, H, 0.3]} color={wall} opacity={op([])} />
      {/* +x wall (camera-facing) */}
      <Wall pos={[half, H / 2, 0]} args={[0.3, H, size]} color={wall} opacity={op(['px'])} />
      {/* +z wall (camera-facing), split around the doorway */}
      <Wall pos={[-segC, H / 2, half]} args={[seg, H, 0.3]} color={wall} opacity={op(['pz'])} />
      <Wall pos={[segC, H / 2, half]} args={[seg, H, 0.3]} color={wall} opacity={op(['pz'])} />
      {/* roof */}
      <mesh castShadow position={[0, H + 0.15, 0]}>
        <boxGeometry args={[size + 0.3, 0.3, size + 0.3]} />
        <meshStandardMaterial color={roof} transparent opacity={inside ? 0.14 : 1} depthWrite={!inside} />
      </mesh>
      {children}
    </group>
  )
}
