import { useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { GRID_SIZE, TILE, worldToTile, tileToWorld, footprintTiles, canPlace, tileKey } from '../../lib/home/grid'
import { useProgress } from '../../store/progress'
import { useHomeUi } from '../useHomeUi'
import { useOccupiedTiles } from '../useOccupied'
import { HOME_ITEMS } from '../../lib/home/catalog'
import PlacementPreview from './PlacementPreview'
import { isDragClick } from '../pointer'

const SIZE = GRID_SIZE * TILE

export default function TileGrid() {
  const [hover, setHover] = useState<{ gx: number; gz: number } | null>(null)
  const placeItem = useProgress((s) => s.placeItem)
  const moveItem = useProgress((s) => s.moveItem)
  const placingItemId = useHomeUi((s) => s.placingItemId)
  const movingUid = useHomeUi((s) => s.movingUid)
  const movingItemId = useHomeUi((s) => s.movingItemId)
  const rotation = useHomeUi((s) => s.rotation)
  const cancelPlacing = useHomeUi((s) => s.cancelPlacing)

  // The item under the cursor is either a new item from the bag or one being repositioned.
  const activeItemId = placingItemId ?? movingItemId
  const activeItem = activeItemId ? HOME_ITEMS.find((i) => i.id === activeItemId) : null

  // A moving item shouldn't collide with its own old spot.
  const occupied = useOccupiedTiles(movingUid)

  const tileAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const t = worldToTile(e.point.x, e.point.z)
    return t.gx < 0 || t.gz < 0 || t.gx >= GRID_SIZE || t.gz >= GRID_SIZE ? null : t
  }

  const onMove = (e: ThreeEvent<PointerEvent>) => setHover(tileAt(e))

  const ok = !!activeItem && !!hover && canPlace(occupied, activeItem.footprint, hover.gx, hover.gz, rotation)

  // Place at the clicked point itself: a still touch tap sends no pointermove, so
  // `hover` may be stale or unset. A drag (camera orbit) that ends here is ignored.
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!activeItem || isDragClick(e)) return
    const t = tileAt(e)
    if (!t) return
    setHover(t) // show the tapped spot (red when it doesn't fit)
    if (!canPlace(occupied, activeItem.footprint, t.gx, t.gz, rotation)) return
    if (placingItemId) placeItem(activeItem.id, t.gx, t.gz, rotation)
    else if (movingUid) moveItem(movingUid, t.gx, t.gz, rotation)
    cancelPlacing()
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
      {hover && !activeItem && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[tileToWorld(hover.gx, hover.gz).x, 0.02, tileToWorld(hover.gx, hover.gz).z]}>
          <planeGeometry args={[TILE * 0.96, TILE * 0.96]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.45} />
        </mesh>
      )}
      {activeItem && hover &&
        footprintTiles(activeItem.footprint, hover.gx, hover.gz, rotation)
          .filter((t) => t.gx >= 0 && t.gz >= 0 && t.gx < GRID_SIZE && t.gz < GRID_SIZE)
          .map((t) => (
          <mesh key={tileKey(t)} rotation={[-Math.PI / 2, 0, 0]} position={[tileToWorld(t.gx, t.gz).x, 0.03, tileToWorld(t.gx, t.gz).z]}>
            <planeGeometry args={[TILE * 0.92, TILE * 0.92]} />
            <meshBasicMaterial color={ok ? '#4ade80' : '#f87171'} transparent opacity={0.55} />
          </mesh>
        ))}
      {activeItem && hover && (
        <PlacementPreview item={activeItem} gx={hover.gx} gz={hover.gz} rot={rotation} />
      )}
    </group>
  )
}
