import { useProgress } from '../../store/progress'
import { HOME_ITEMS } from '../../lib/home/catalog'
import { furnitureBuilder } from '../models/registry'
import { tileToWorld, footprintTiles } from '../../lib/home/grid'

function PlacedOne({ itemId, gx, gz, rot }: { itemId: string; gx: number; gz: number; rot: number }) {
  const item = HOME_ITEMS.find((i) => i.id === itemId)
  if (!item) return null
  const tiles = footprintTiles(item.footprint, gx, gz, rot)
  const cx = tiles.reduce((s, t) => s + tileToWorld(t.gx, t.gz).x, 0) / tiles.length
  const cz = tiles.reduce((s, t) => s + tileToWorld(t.gx, t.gz).z, 0) / tiles.length
  const build = furnitureBuilder(item.modelId)
  return (
    <group position={[cx, 0, cz]} rotation={[0, (-rot * Math.PI) / 180, 0]}>
      {build()}
    </group>
  )
}

export default function PlacedItems() {
  const placed = useProgress((s) => s.placedItems)
  return <group>{placed.map((p) => <PlacedOne key={p.uid} itemId={p.itemId} gx={p.gx} gz={p.gz} rot={p.rot} />)}</group>
}
