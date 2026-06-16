import { useMemo, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { GRID_SIZE, TILE, worldToTile, tileToWorld, footprintTiles, canPlace, tileKey } from '../../lib/home/grid'
import { useProgress } from '../../store/progress'
import { useHomeUi } from '../useHomeUi'
import { HOME_ITEMS } from '../../lib/home/catalog'

const SIZE = GRID_SIZE * TILE

export default function TileGrid() {
  const [hover, setHover] = useState<{ gx: number; gz: number } | null>(null)
  const placed = useProgress((s) => s.placedItems)
  const placeItem = useProgress((s) => s.placeItem)
  const placingItemId = useHomeUi((s) => s.placingItemId)
  const rotation = useHomeUi((s) => s.rotation)
  const cancelPlacing = useHomeUi((s) => s.cancelPlacing)

  const placingItem = placingItemId ? HOME_ITEMS.find((i) => i.id === placingItemId) : null

  const occupied = useMemo(() => {
    const s = new Set<string>()
    for (const p of placed) {
      const item = HOME_ITEMS.find((i) => i.id === p.itemId)
      if (item) for (const t of footprintTiles(item.footprint, p.gx, p.gz, p.rot)) s.add(tileKey(t))
    }
    return s
  }, [placed])

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const t = worldToTile(e.point.x, e.point.z)
    if (t.gx < 0 || t.gz < 0 || t.gx >= GRID_SIZE || t.gz >= GRID_SIZE) { setHover(null); return }
    setHover(t)
  }

  const ok = !!placingItem && !!hover && canPlace(occupied, placingItem.footprint, hover.gx, hover.gz, rotation)

  const onClick = () => {
    if (!placingItem || !hover) return
    if (ok) { placeItem(placingItem.id, hover.gx, hover.gz, rotation); cancelPlacing() }
  }

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)} onClick={onClick}
        visible={false}
      >
        <planeGeometry args={[SIZE, SIZE]} />
      </mesh>
      {hover && !placingItem && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[tileToWorld(hover.gx, hover.gz).x, 0.02, tileToWorld(hover.gx, hover.gz).z]}>
          <planeGeometry args={[TILE * 0.96, TILE * 0.96]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.45} />
        </mesh>
      )}
      {placingItem && hover &&
        footprintTiles(placingItem.footprint, hover.gx, hover.gz, rotation)
          .filter((t) => t.gx >= 0 && t.gz >= 0 && t.gx < GRID_SIZE && t.gz < GRID_SIZE)
          .map((t) => (
          <mesh key={tileKey(t)} rotation={[-Math.PI / 2, 0, 0]} position={[tileToWorld(t.gx, t.gz).x, 0.03, tileToWorld(t.gx, t.gz).z]}>
            <planeGeometry args={[TILE * 0.92, TILE * 0.92]} />
            <meshBasicMaterial color={ok ? '#4ade80' : '#f87171'} transparent opacity={0.55} />
          </mesh>
        ))}
    </group>
  )
}
