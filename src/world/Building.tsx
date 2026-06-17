import type { ReactNode } from 'react'
import { useWorldUi } from './useWorldUi'
import { frontFacingWalls } from './collision'

/**
 * A 5x5 building centered at (cx,cz) with a doorway gap on its +z wall. The two
 * camera-facing walls (+x, +z) and the roof fade out when the avatar is inside,
 * so you can see the interior. No scene swap — pure opacity toggle.
 */
export default function Building({
  id, cx, cz, doorWidth = 1.6, wall = '#cdbb98', roof = '#9a5a3c', children,
}: {
  id: string
  cx: number
  cz: number
  doorWidth?: number
  wall?: string
  roof?: string
  children?: ReactNode
}) {
  const inside = useWorldUi((s) => s.insideBuildingId) === id
  const front = frontFacingWalls() // ['px','pz']
  const H = 2.4
  const half = 2.5
  const door = doorWidth / 2
  const seg = half - door // segment width (1.7 for a 1.6 door)
  const segC = (half + door) / 2 // segment center (1.65 for a 1.6 door)

  const op = (faces: ('px' | 'pz')[]) => (inside && faces.some((f) => front.includes(f)) ? 0.14 : 1)

  const Wall = ({ pos, args, faces }: { pos: [number, number, number]; args: [number, number, number]; faces: ('px' | 'pz')[] }) => (
    <mesh castShadow position={pos}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={wall} transparent opacity={op(faces)} depthWrite={op(faces) > 0.5} />
    </mesh>
  )

  return (
    <group position={[cx, 0, cz]}>
      {/* back walls (-x, -z) — never transparent */}
      <Wall pos={[-half, H / 2, 0]} args={[0.3, H, 5]} faces={[]} />
      <Wall pos={[0, H / 2, -half]} args={[5, H, 0.3]} faces={[]} />
      {/* +x wall (camera-facing) */}
      <Wall pos={[half, H / 2, 0]} args={[0.3, H, 5]} faces={['px']} />
      {/* +z wall (camera-facing), split around the doorway */}
      <Wall pos={[-segC, H / 2, half]} args={[seg, H, 0.3]} faces={['pz']} />
      <Wall pos={[segC, H / 2, half]} args={[seg, H, 0.3]} faces={['pz']} />
      {/* roof */}
      <mesh castShadow position={[0, H + 0.15, 0]}>
        <boxGeometry args={[5.3, 0.3, 5.3]} />
        <meshStandardMaterial color={roof} transparent opacity={inside ? 0.14 : 1} depthWrite={!inside} />
      </mesh>
      {children}
    </group>
  )
}
