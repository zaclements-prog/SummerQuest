import { GRID_SIZE, TILE } from '../../lib/home/grid'

const SIZE = GRID_SIZE * TILE
const H = SIZE / 2

export default function RoomShell() {
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#e8d8c0" />
      </mesh>
      {/* back-left wall (along -x) */}
      <mesh position={[-H, 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[SIZE, 4]} />
        <meshStandardMaterial color="#cfe3e8" />
      </mesh>
      {/* back wall (along -z) */}
      <mesh position={[0, 2, -H]} receiveShadow>
        <planeGeometry args={[SIZE, 4]} />
        <meshStandardMaterial color="#d8e8d0" />
      </mesh>
    </group>
  )
}
