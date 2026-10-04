import { useEffect, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useProgress } from '../../store/progress'
import { useHomeUi } from '../useHomeUi'
import { HOME_ITEMS } from '../../lib/home/catalog'
import { furnitureBuilder } from '../models/registry'
import { tileToWorld, footprintTiles } from '../../lib/home/grid'
import { isDragClick } from '../pointer'

function PlacedOne({ uid, itemId, gx, gz, rot }: { uid: string; itemId: string; gx: number; gz: number; rot: number }) {
  const mode = useHomeUi((s) => s.mode)
  const placingItemId = useHomeUi((s) => s.placingItemId)
  const movingUid = useHomeUi((s) => s.movingUid)
  const startMoving = useHomeUi((s) => s.startMoving)
  const [hovered, setHovered] = useState(false)

  // Items are pickable only when decorate mode is idle (not already placing/moving something).
  const idle = mode === 'decorate' && !placingItemId && !movingUid
  const highlighted = hovered && idle

  // The hand cursor follows the highlight, so it's also cleared when the item is
  // picked up, decorate mode ends or the item unmounts (no pointerout fires then).
  useEffect(() => {
    if (!highlighted) return
    document.body.style.cursor = 'pointer'
    return () => { document.body.style.cursor = '' }
  }, [highlighted])

  const item = HOME_ITEMS.find((i) => i.id === itemId)
  if (!item) return null
  if (uid === movingUid) return null // hidden while its translucent ghost is being positioned

  const tiles = footprintTiles(item.footprint, gx, gz, rot)
  const cx = tiles.reduce((s, t) => s + tileToWorld(t.gx, t.gz).x, 0) / tiles.length
  const cz = tiles.reduce((s, t) => s + tileToWorld(t.gx, t.gz).z, 0) / tiles.length
  const build = furnitureBuilder(item.modelId)

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!idle || isDragClick(e)) return
    e.stopPropagation()
    setHovered(false) // it unmounts without a pointerout; don't come back enlarged
    startMoving(uid, itemId, rot) // reposition in place, keeping its rotation; non-destructive
  }
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (!idle) return
    e.stopPropagation()
    setHovered(true)
  }
  const onOut = () => setHovered(false)

  return (
    <group
      position={[cx, 0, cz]}
      rotation={[0, (-rot * Math.PI) / 180, 0]}
      scale={highlighted ? 1.06 : 1}
      onClick={onClick}
      onPointerOver={onOver}
      onPointerOut={onOut}
    >
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
