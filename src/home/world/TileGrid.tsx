import { useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { GRID_SIZE, TILE, worldToTile, tileToWorld } from '../../lib/home/grid'

const SIZE = GRID_SIZE * TILE

export default function TileGrid() {
  const [hover, setHover] = useState<{ gx: number; gz: number } | null>(null)
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const t = worldToTile(e.point.x, e.point.z)
    if (t.gx < 0 || t.gz < 0 || t.gx >= GRID_SIZE || t.gz >= GRID_SIZE) { setHover(null); return }
    setHover(t)
  }
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)} visible={false}>
        <planeGeometry args={[SIZE, SIZE]} />
      </mesh>
      {hover && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}
          position={[tileToWorld(hover.gx, hover.gz).x, 0.02, tileToWorld(hover.gx, hover.gz).z]}>
          <planeGeometry args={[TILE * 0.96, TILE * 0.96]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.45} />
        </mesh>
      )}
    </group>
  )
}
