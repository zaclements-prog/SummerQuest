import { useMemo, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { GRID_SIZE, TILE, worldToTile, tileToWorld, footprintTiles, canPlace, tileKey } from '../../lib/home/grid'
import { useProgress } from '../../store/progress'
import { useHomeUi } from '../useHomeUi'
import { useOccupiedTiles } from '../useOccupied'
import { HOME_ITEMS } from '../../lib/home/catalog'
import PlacementPreview from './PlacementPreview'
import { isDragClick } from '../pointer'
import { fgeo } from '../models/furniture/_geo'

const SIZE = GRID_SIZE * TILE
// Highlight tiles: soft rounded squares, floating just above the rug (top y≈0.038).
const HOVER_Y = 0.045
const FOOT_Y = 0.05
const COLORS = { hover: '#ffe08a', ok: '#7fe3a6', bad: '#ff8f86', selected: '#ffcf4d' }

/** The free spot nearest the middle of the room where `fp` fits (for the first ghost). */
function firstFreeSpot(occupied: Set<string>, fp: { w: number; d: number }, rot: number) {
  const c = (GRID_SIZE - 1) / 2
  let best: { gx: number; gz: number } | null = null
  let bestD = Infinity
  for (let gz = 0; gz < GRID_SIZE; gz++)
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      if (!canPlace(occupied, fp, gx, gz, rot)) continue
      const d = (gx - c) ** 2 + (gz - c) ** 2
      if (d < bestD) {
        bestD = d
        best = { gx, gz }
      }
    }
  return best
}

export default function TileGrid() {
  const [hover, setHover] = useState<{ gx: number; gz: number } | null>(null)
  const placeItem = useProgress((s) => s.placeItem)
  const moveItem = useProgress((s) => s.moveItem)
  const placingItemId = useHomeUi((s) => s.placingItemId)
  const movingUid = useHomeUi((s) => s.movingUid)
  const movingItemId = useHomeUi((s) => s.movingItemId)
  const rotation = useHomeUi((s) => s.rotation)
  const cancelPlacing = useHomeUi((s) => s.cancelPlacing)
  const selectedUid = useHomeUi((s) => s.selectedUid)
  const select = useHomeUi((s) => s.select)
  const placed = useProgress((s) => s.placedItems)

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

  // Until the pointer is over the floor (always, on a touch screen: there's no
  // hover), show the ghost on a free spot near the middle, so you can see what
  // you're placing and turn it before you tap where it goes.
  const startSpot = useMemo(
    () => (activeItem ? firstFreeSpot(occupied, activeItem.footprint, rotation) : null),
    [activeItem, occupied, rotation],
  )
  const spot = hover ?? startSpot

  const ok = !!activeItem && !!spot && canPlace(occupied, activeItem.footprint, spot.gx, spot.gz, rotation)

  // The selected item (decorate mode) gets a gold outline of tiles under it.
  const selectedTiles = useMemo(() => {
    const p = selectedUid ? placed.find((x) => x.uid === selectedUid) : null
    const it = p ? HOME_ITEMS.find((i) => i.id === p.itemId) : null
    return p && it ? footprintTiles(it.footprint, p.gx, p.gz, p.rot) : []
  }, [selectedUid, placed])

  // Place at the clicked point itself: a still touch tap sends no pointermove, so
  // `hover` may be stale or unset. A drag (camera orbit) that ends here is ignored.
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (isDragClick(e)) return
    // Tapping the floor lets go of a selected item.
    if (!activeItem) {
      if (selectedUid) select(null)
      return
    }
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
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[tileToWorld(hover.gx, hover.gz).x, HOVER_Y, tileToWorld(hover.gx, hover.gz).z]} geometry={fgeo.roundRect(TILE * 0.92, TILE * 0.92, 0.14)}>
          <meshBasicMaterial color={COLORS.hover} transparent opacity={0.6} depthWrite={false} />
        </mesh>
      )}
      {selectedTiles.map((t) => (
        <mesh key={`sel-${tileKey(t)}`} rotation={[-Math.PI / 2, 0, 0]} position={[tileToWorld(t.gx, t.gz).x, FOOT_Y, tileToWorld(t.gx, t.gz).z]} geometry={fgeo.roundRect(TILE * 0.9, TILE * 0.9, 0.14)}>
          <meshBasicMaterial color={COLORS.selected} transparent opacity={0.75} depthWrite={false} />
        </mesh>
      ))}
      {activeItem && spot &&
        footprintTiles(activeItem.footprint, spot.gx, spot.gz, rotation)
          .filter((t) => t.gx >= 0 && t.gz >= 0 && t.gx < GRID_SIZE && t.gz < GRID_SIZE)
          .map((t) => (
          <mesh key={tileKey(t)} rotation={[-Math.PI / 2, 0, 0]} position={[tileToWorld(t.gx, t.gz).x, FOOT_Y, tileToWorld(t.gx, t.gz).z]} geometry={fgeo.roundRect(TILE * 0.9, TILE * 0.9, 0.14)}>
            <meshBasicMaterial color={ok ? COLORS.ok : COLORS.bad} transparent opacity={0.62} depthWrite={false} />
          </mesh>
        ))}
      {activeItem && spot && (
        <PlacementPreview item={activeItem} gx={spot.gx} gz={spot.gz} rot={rotation} />
      )}
    </group>
  )
}
