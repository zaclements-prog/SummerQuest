import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Material, Mesh } from 'three'
import type { HomeItem } from '../../lib/home/catalog'
import { furnitureBuilder } from '../models/registry'
import { footprintTiles, tileToWorld } from '../../lib/home/grid'

const GHOST_OPACITY = 0.6

// Toon materials are cached and shared by every placed copy of a color, so the
// ghost must never touch them: each source material gets one translucent clone,
// reused by every preview.
const ghosts = new WeakMap<Material, Material>()
const isGhost = new WeakSet<Material>()
function ghostOf(src: Material): Material {
  let g = ghosts.get(src)
  if (!g) {
    g = src.clone()
    g.transparent = true
    g.opacity = src.opacity * GHOST_OPACITY
    g.depthWrite = false
    ghosts.set(src, g)
    isGhost.add(g)
  }
  return g
}

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
      if (!m.isMesh) return
      const mat = m.material
      if (!mat || Array.isArray(mat) || isGhost.has(mat)) return
      if ((mat as Material & { isShaderMaterial?: boolean }).isShaderMaterial) {
        m.visible = false // outline hulls: a ghost reads cleaner without line work
        m.castShadow = false
        return
      }
      m.material = ghostOf(mat)
      m.castShadow = false
    })
  })

  return (
    <group ref={ref} position={[cx, 0.1, cz]} rotation={[0, (-rot * Math.PI) / 180, 0]}>
      {build()}
    </group>
  )
}
