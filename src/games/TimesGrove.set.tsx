import { useMemo } from 'react'
import { TOON } from '../toon/palette'
import { geo } from '../toon/geometry'
import { TBox, TCone, TCyl, TSphere } from '../toon/shapes'
import { Bush, FlowerPatch, Fence, Rock } from '../toon/props'
import { ScatterTrees, ToonInstances, type InstanceSpec, type TreeSpot } from '../toon/Scatter'
import { Decal } from '../world/areas/fraction-falls/kit'
import { blobDisc } from '../world/areas/fraction-falls/shapes'
import { TERRACOTTA, TERRACOTTA_TOP } from '../world/areas/multiplication-mesa/colors'
import { FIELD_HALF } from './TimesGrove.layout'

/**
 * The Times Grove set, in the grove's local frame: a green orchard meadow at
 * the foot of Multiplication Mesa — terracotta buttes on the skyline, an old
 * orchard ringing the meadow, the keeper's hut, a duck pond, hedges and
 * flowers, and a picket fence around the planting field. Static: built once,
 * instanced where it repeats.
 */

function Butte({ x, z, r, h, rot = 0 }: { x: number; z: number; r: number; h: number; rot?: number }) {
  const bands = TERRACOTTA.length
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {TERRACOTTA.map((c, i) => (
        <TCyl
          key={i}
          radiusTop={r * (1 - (i + 1) * 0.07)}
          radiusBottom={r * (1 - i * 0.07)}
          height={h / bands}
          position={[0, (h / bands) * (i + 0.5), 0]}
          color={c}
          segments={9}
          flat
          castShadow={false}
        />
      ))}
      <TCyl radiusTop={r * 0.66} radiusBottom={r * (1 - bands * 0.07)} height={0.14} position={[0, h + 0.07, 0]} color={TERRACOTTA_TOP} segments={9} flat castShadow={false} />
    </group>
  )
}

/** The keeper's little hut: cream walls, a teal roof and a round window. */
function Hut({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <TBox size={[1.7, 1.25, 1.5]} position={[0, 0.62, 0]} color={TOON.wallCream} outline />
      <TCone radius={1.42} height={1.0} segments={4} position={[0, 1.72, 0]} rotation={[0, Math.PI / 4, 0]} color={TOON.roofTeal} outline flat />
      <TBox size={[0.46, 0.78, 0.08]} radius={0.05} position={[0, 0.39, 0.76]} color={TOON.woodDark} castShadow={false} />
      <TCyl radiusTop={0.17} height={0.06} position={[0.55, 0.85, 0.76]} rotation={[Math.PI / 2, 0, 0]} color={TOON.windowGlow} castShadow={false} segments={12} />
      <TBox size={[0.3, 0.5, 0.3]} position={[0.5, 2.0, -0.3]} color={TOON.brick} />
    </group>
  )
}

export function GroveSet() {
  const trees = useMemo<TreeSpot[]>(() => {
    const out: TreeSpot[] = []
    // an old orchard ringing the meadow (kept off the camera side)
    for (let i = 0; i < 22; i++) {
      const a = Math.PI * (0.92 + (i / 21) * 1.16) + Math.sin(i * 7.1) * 0.05
      const rr = 8.4 + (i % 3) * 1.5 + Math.sin(i * 3.3) * 0.6
      out.push({ x: Math.cos(a) * rr, z: Math.sin(a) * rr, scale: 1.05 + (i % 4) * 0.14, kind: i % 5 === 0 ? 'blossom' : i % 4 === 1 ? 'pine' : 'round', seed: 70 + i })
    }
    // a few on the near flanks
    for (const [x, z, s] of [[-8.6, 3.4, 1.1], [8.8, 2.6, 1.2], [-9.4, 6.4, 1.3], [9.6, 6.8, 1.0]] as const) out.push({ x, z, scale: s, kind: 'round', seed: Math.round(x * 10 + z) })
    return out
  }, [])
  const posts = useMemo<InstanceSpec[]>(() => {
    const out: InstanceSpec[] = []
    const H = FIELD_HALF + 1.0
    const n = 10
    for (let i = 0; i <= n; i++) {
      const u = -H + (2 * H * i) / n
      out.push({ x: u, y: 0.27, z: -H, s: [0.1, 0.54, 0.1] }, { x: u, y: 0.27, z: H, s: [0.1, 0.54, 0.1] })
      if (i > 0 && i < n) out.push({ x: -H, y: 0.27, z: u, s: [0.1, 0.54, 0.1] }, { x: H, y: 0.27, z: u, s: [0.1, 0.54, 0.1] })
    }
    return out
  }, [])
  const H = FIELD_HALF + 1.0

  return (
    <group>
      {/* meadow to the horizon, a lighter lawn around the field, a dirt path in */}
      <Decal geometry={blobDisc(90, 0.05, 51, 64)} color={TOON.grass} position={[0, -0.01, 0]} />
      <Decal geometry={blobDisc(7.4, 0.12, 52, 48)} color={TOON.meadow} position={[0, 0.003, 0.2]} />
      <Decal geometry={blobDisc(0.9, 0.08, 53, 24)} color={TOON.path} position={[1.2, 0.006, FIELD_HALF + 2.0]} scale={[1, 1, 2.2]} />

      {/* the picket fence around the planting field (white rails) */}
      <ToonInstances geometry={geo.box(1, 1, 1, 0.2)} color={TOON.flowerWhite} items={posts} castShadow={false} />
      {[-H, H].map((z) => (
        <TBox key={`h${z}`} size={[2 * H, 0.06, 0.05]} position={[0, 0.38, z]} color={TOON.flowerWhite} castShadow={false} />
      ))}
      {[-H, H].map((x) => (
        <TBox key={`v${x}`} size={[0.05, 0.06, 2 * H]} position={[x, 0.38, 0]} color={TOON.flowerWhite} castShadow={false} />
      ))}

      {/* skyline: the mesa's terracotta buttes */}
      <Butte x={-3} z={-21} r={6} h={6.5} rot={0.3} />
      <Butte x={9} z={-19} r={4} h={4.4} rot={1.4} />
      <Butte x={-14} z={-15} r={3.6} h={3.6} rot={2.1} />
      <Butte x={17} z={-10} r={3.2} h={3.0} rot={0.8} />

      <ScatterTrees trees={trees} />

      {/* the keeper's hut, a duck pond, hedges and flowers */}
      <Hut x={5.6} z={-5.4} rot={-0.6} />
      <Decal geometry={blobDisc(1.7, 0.16, 54)} color={TOON.grassDark} position={[-6.2, 0.004, 4.4]} />
      <Decal geometry={blobDisc(1.4, 0.12, 55)} color={TOON.water} position={[-6.2, 0.012, 4.4]} />
      <TSphere scale={[0.16, 0.12, 0.2]} position={[-6.0, 0.08, 4.2]} color={TOON.flowerWhite} castShadow={false} segments={8} />
      <TSphere scale={0.08} position={[-6.0, 0.2, 4.36]} color={TOON.flowerWhite} castShadow={false} segments={8} />
      <TCone radius={0.03} height={0.07} position={[-6.0, 0.2, 4.45]} rotation={[Math.PI / 2, 0, 0]} color={TOON.gold} castShadow={false} />

      <Bush position={[-5.6, 0, -4.4]} scale={1.3} seed={3} />
      <Bush position={[-6.6, 0, -1.6]} scale={1.1} seed={9} />
      <Bush position={[6.4, 0, 1.2]} scale={1.2} seed={14} />
      <Bush position={[3.6, 0, -6.4]} scale={1.0} seed={21} />
      <Bush position={[-2.6, 0, -6.6]} scale={1.2} seed={27} color={TOON.leafDark} />
      <FlowerPatch position={[-4.6, 0, 3.4]} seed={4} count={8} radius={0.8} />
      <FlowerPatch position={[4.8, 0, 3.1]} seed={8} count={8} radius={0.8} />
      <FlowerPatch position={[2.2, 0, -5.4]} seed={12} count={6} radius={0.6} />
      <FlowerPatch position={[-6.8, 0, 0.8]} seed={16} count={6} radius={0.6} />
      <Rock position={[6.8, 0, -2.6]} scale={1.2} seed={5} outline />
      <Rock position={[-7.2, 0, -3.4]} scale={1.0} seed={6} />
      <Fence position={[6.0, 0, 4.6]} rotation={0.5} length={2.2} posts={4} />
      <Fence position={[-3.4, 0, -7.0]} rotation={-0.1} length={2.6} posts={4} />
    </group>
  )
}
