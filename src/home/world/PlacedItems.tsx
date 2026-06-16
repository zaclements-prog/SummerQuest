import type { ThreeEvent } from '@react-three/fiber'
import { useProgress } from '../../store/progress'
import { useHomeUi } from '../useHomeUi'
import { HOME_ITEMS } from '../../lib/home/catalog'
import { furnitureBuilder } from '../models/registry'
import { tileToWorld, footprintTiles } from '../../lib/home/grid'

function PlacedOne({ uid, itemId, gx, gz, rot }: { uid: string; itemId: string; gx: number; gz: number; rot: number }) {
  const mode = useHomeUi((s) => s.mode)
  const placingItemId = useHomeUi((s) => s.placingItemId)
  const startPlacing = useHomeUi((s) => s.startPlacing)
  const removeItem = useProgress((s) => s.removeItem)
  const item = HOME_ITEMS.find((i) => i.id === itemId)
  if (!item) return null
  const tiles = footprintTiles(item.footprint, gx, gz, rot)
  const cx = tiles.reduce((s, t) => s + tileToWorld(t.gx, t.gz).x, 0) / tiles.length
  const cz = tiles.reduce((s, t) => s + tileToWorld(t.gx, t.gz).z, 0) / tiles.length
  const build = furnitureBuilder(item.modelId)

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (mode !== 'decorate' || placingItemId) return // only "pick up" when idle in decorate mode
    e.stopPropagation()
    removeItem(uid) // back to inventory
    startPlacing(itemId) // immediately re-place (move); cancelling leaves it in inventory (remove)
  }

  return (
    <group position={[cx, 0, cz]} rotation={[0, (-rot * Math.PI) / 180, 0]} onClick={onClick}>
      {build()}
    </group>
  )
}

export default function PlacedItems() {
  const placed = useProgress((s) => s.placedItems)
  return (
    <group>
      {placed.map((p) => (
        <PlacedOne key={p.uid} uid={p.uid} itemId={p.itemId} gx={p.gx} gz={p.gz} rot={p.rot} />
      ))}
    </group>
  )
}
