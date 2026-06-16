import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Mesh, MeshStandardMaterial } from 'three'
import type { HomeItem } from '../../lib/home/catalog'
import { furnitureBuilder } from '../models/registry'
import { footprintTiles, tileToWorld } from '../../lib/home/grid'

/**
 * A translucent, gently-floating preview of the actual item being placed, shown at
 * the hovered tile + current rotation so the player sees exactly how it looks before
 * dropping it. The green/red footprint tiles underneath (in TileGrid) show validity.
 */
export default function PlacementPreview({
  item,
  gx,
  gz,
  rot,
}: {
  item: HomeItem
  gx: number
  gz: number
  rot: number
}) {
  const ref = useRef<Group>(null)
  const tiles = footprintTiles(item.footprint, gx, gz, rot)
  const cx = tiles.reduce((s, t) => s + tileToWorld(t.gx, t.gz).x, 0) / tiles.length
  const cz = tiles.reduce((s, t) => s + tileToWorld(t.gx, t.gz).z, 0) / tiles.length
  const build = furnitureBuilder(item.modelId)

  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    g.position.y = 0.1 + Math.sin(clock.elapsedTime * 4) * 0.05 // gentle hover = "preview"
    g.traverse((o) => {
      const m = o as Mesh
      if (m.isMesh) {
        const mat = m.material as MeshStandardMaterial
        if (mat && !Array.isArray(mat) && mat.opacity !== 0.6) {
          mat.transparent = true
          mat.opacity = 0.6
          mat.depthWrite = false
        }
      }
    })
  })

  return (
    <group ref={ref} position={[cx, 0.1, cz]} rotation={[0, (-rot * Math.PI) / 180, 0]}>
      {build()}
    </group>
  )
}
