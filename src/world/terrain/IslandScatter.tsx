import { useMemo } from 'react'
import { TOON } from '../../toon/palette'
import { ScatterBlobs, ScatterTrees, ToonInstances } from '../../toon/Scatter'
import { geo } from '../../toon/geometry'
import { buildScatter, byTile, SCATTER_TILE } from './scatterLayout'

/** Island-wide instanced decor (trees, bushes, rocks, flowers, tufts) from `buildScatter`, per tile. */
export default function IslandScatter() {
  const tiles = useMemo(() => {
    const s = buildScatter()
    const t = {
      trees: byTile(s.trees, SCATTER_TILE),
      bushes: byTile(s.bushes, SCATTER_TILE),
      rocks: byTile(s.rocks, SCATTER_TILE),
      flowers: byTile(s.flowers, SCATTER_TILE),
      tufts: byTile(s.tufts, SCATTER_TILE),
    }
    const keys = new Set([t.trees, t.bushes, t.rocks, t.flowers, t.tufts].flatMap((m) => [...m.keys()]))
    return [...keys].sort().map((key) => ({
      key,
      trees: t.trees.get(key) ?? [],
      bushes: t.bushes.get(key) ?? [],
      rocks: t.rocks.get(key) ?? [],
      flowers: t.flowers.get(key) ?? [],
      tufts: t.tufts.get(key) ?? [],
    }))
  }, [])
  return (
    <group>
      {tiles.map((tile) => (
        <group key={tile.key}>
          <ScatterTrees trees={tile.trees} />
          <ScatterBlobs items={tile.bushes} />
          <ScatterBlobs items={tile.rocks} />
          <ToonInstances geometry={geo.sphere(6)} color={TOON.white} items={tile.flowers} castShadow={false} />
          <ToonInstances geometry={geo.cone(1, 1, 4)} color={TOON.white} items={tile.tufts} castShadow={false} />
        </group>
      ))}
    </group>
  )
}
