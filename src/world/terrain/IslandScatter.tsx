import { useMemo } from 'react'
import { TOON } from '../../toon/palette'
import { ScatterBlobs, ScatterTrees, ToonInstances } from '../../toon/Scatter'
import { geo } from '../../toon/geometry'
import { buildScatter } from './scatterLayout'

/** Island-wide instanced decor (trees, bushes, rocks, flowers, tufts) from `buildScatter`. */

export default function IslandScatter() {
  const s = useMemo(() => buildScatter(), [])
  return (
    <group>
      <ScatterTrees trees={s.trees} />
      <ScatterBlobs items={s.bushes} />
      <ScatterBlobs items={s.rocks} />
      <ToonInstances geometry={geo.sphere(6)} color={TOON.white} items={s.flowers} castShadow={false} />
      <ToonInstances geometry={geo.cone(1, 1, 4)} color={TOON.white} items={s.tufts} castShadow={false} />
    </group>
  )
}
