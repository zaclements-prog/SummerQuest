/* eslint-disable react-refresh/only-export-components -- the plot layout constants (PLOTS/SIGN_*) describe exactly what these components draw; co-located on purpose, not an HMR boundary */
import { useMemo, useRef } from 'react'
import { Group } from 'three'
import { useFrame } from '@react-three/fiber'
import { geo } from '../toon/geometry'
import { TOON } from '../toon/palette'
import { TBox, TCyl, TSphere } from '../toon/shapes'
import { Instances } from '../world/town/kit'
import { Decal } from '../world/areas/fraction-falls/kit'
import { blobDisc } from '../world/areas/fraction-falls/shapes'
import { chalkText } from '../world/town/chalk'
import { Bush, Rock, Tree } from '../toon/props'
import type { GroveShape } from '../lib/grove/groveCore'
import { fitChalk } from './_shared/chalkBoard'

/**
 * Visual pieces for Times Grove (docs/superpowers/specs/2026-10-16-times-grove-
 * design.md). Dumb and presentational: the flow lives in TimesGrove.tsx.
 *
 * `mode` drives every plot animation: 'off' = resting rows sway, 'run' = the
 * rows pop one by one while the count-in-groups chant lands (the plot the kid
 * chose being read aloud), 'stall' = the rows pop then SINK back — that order
 * was never planted here — shown when the kid picked the wrong plot.
 */

export type StationMode = 'off' | 'run' | 'stall'

/** The three grove plots, one per option total — stepping onto one IS answering. */
export const PLOTS: { x: number; z: number; r: number }[] = [
  { x: -3.7, z: 0.4, r: 2.35 },
  { x: 0, z: -3.7, r: 2.35 },
  { x: 3.7, z: 0.4, r: 2.35 },
]

/** Chalk numeral sign, offset from each plot (outside its ring). */
export const SIGN_OFFSET: [number, number][] = [
  [-2.0, 2.3],
  [-1.7, -1.9],
  [2.25, 2.1],
]
export const SIGN_ROT: number[] = [0.85, 0.7, 0.6]

/** Where the keeper stacks a crate for every correctly read planting order. */
export const CRATE_BASE: [number, number] = [-4.2, -4.2]

const S = 0.62 // tree pitch inside a plot
const CROWNS = [TOON.leaf, TOON.leafDark, TOON.leafLight, TOON.pine]
const SLATE = '#3c4657'

/** One grove plot: a dirt bed of `shape.rows × shape.cols` little trees. */
export function GrovePlot({ shape, mode }: { shape: GroveShape; mode: StationMode }) {
  const rowRefs = useRef<(Group | null)[]>([])
  const startAt = useRef<number | null>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (mode === 'off') {
      startAt.current = null
      for (const g of rowRefs.current) if (g) g.scale.setScalar(1 + Math.sin(t * 1.4) * 0.025)
      return
    }
    if (startAt.current === null) startAt.current = t
    const e = t - startAt.current
    for (let i = 0; i < rowRefs.current.length; i++) {
      const g = rowRefs.current[i]
      if (!g) continue
      const local = e - i * 0.3
      if (mode === 'run') {
        // each row pops as the chant counts it, then the plot settles and sways
        const k = Math.min(1, Math.max(0, local / 0.3))
        const pop = 0.2 + 0.8 * (1 - (1 - k) * (1 - k))
        g.scale.setScalar(k === 1 ? pop + Math.sin(t * 3 + i) * 0.03 : pop)
      } else {
        // stall: pop up, then sink — this order was never planted here
        const up = Math.min(1, Math.max(0, local / 0.3))
        const sink = Math.min(1, Math.max(0, (local - 0.55) / 0.7))
        g.scale.setScalar(1 - sink * 0.65 + (sink < 1 ? (1 - sink) * 0.65 * up : 0))
      }
    }
  })
  const bedW = (shape.cols - 1) * S + 1.0
  const bedD = (shape.rows - 1) * S + 1.0
  return (
    <group>
      <TBox size={[bedW, 0.3, bedD]} radius={0.04} position={[0, 0.15, 0]} color={TOON.dirt} outline />
      <TBox size={[bedW - 0.12, 0.06, bedD - 0.12]} radius={0.02} position={[0, 0.33, 0]} color={TOON.dirtDark} castShadow={false} />
      {Array.from({ length: shape.rows }, (_, r) => (
        <group
          key={r}
          ref={(el) => {
            rowRefs.current[r] = el
          }}
          position={[0, 0, (r - (shape.rows - 1) / 2) * S]}
        >
          {Array.from({ length: shape.cols }, (_, c) => {
            const crown = CROWNS[(r * shape.cols + c) % CROWNS.length]
            return (
              <group key={c} position={[(c - (shape.cols - 1) / 2) * S, 0, 0]}>
                <TCyl radiusTop={0.08} height={0.5} position={[0, 0.25, 0]} color={TOON.barkDark} segments={6} castShadow={false} />
                <TSphere position={[0, 0.74, 0]} scale={[0.3, 0.34, 0.3]} color={crown} segments={8} castShadow={false} />
              </group>
            )
          })}
        </group>
      ))}
    </group>
  )
}

/** The big chalk numeral on a post beside a plot — the plot's own total. */
export function GroveCard({ n, position, rotation }: { n: number; position: [number, number]; rotation: number }) {
  const label = String(n)
  const fit = useMemo(() => fitChalk(label, 1.1), [label])
  const items = useMemo(
    () => chalkText(label, { y: 0, z: 0, w: fit.w, h: 0.42, t: 0.05, gap: fit.gap, color: '#fff3c4' }),
    [label, fit],
  )
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <TCyl radiusTop={0.05} height={1.1} position={[0, 0.55, 0]} color={TOON.woodDark} segments={8} castShadow={false} />
      <group position={[0, 1.34, 0]}>
        <TBox size={[0.92, 0.68, 0.07]} radius={0.08} color={SLATE} castShadow={false} />
        <group position={[0, 0, 0.05]}>
          <Instances geometry={geo.box(1, 1, 1, 0.2)} color={'#fff3c4'} items={items} />
        </group>
      </group>
    </group>
  )
}

/** One harvested planting order: a wood crate whose front chalks the total. */
export function HarvestCrate({ total, level }: { total: number; level: number }) {
  const label = String(total)
  const fit = useMemo(() => fitChalk(label, 1.0), [label])
  const items = useMemo(
    () => chalkText(label, { y: 0, z: 0, w: fit.w, h: 0.2, t: 0.032, gap: fit.gap, color: '#f4ead2' }),
    [label, fit],
  )
  return (
    <group
      position={[CRATE_BASE[0], 0.27 + level * 0.52, CRATE_BASE[1]]}
      scale={1 - level * 0.085}
      rotation={[0, (level % 2 ? -1 : 1) * 0.1, 0]}
    >
      <TBox size={[0.9, 0.5, 0.9]} radius={0.04} color={TOON.wood} outline />
      <TBox size={[0.94, 0.09, 0.94]} radius={0.02} position={[0, 0.27, 0]} color={TOON.woodDark} castShadow={false} />
      <group position={[0, 0, 0.47]}>
        <Instances geometry={geo.box(1, 1, 1, 0.2)} color={'#f4ead2'} items={items} />
      </group>
    </group>
  )
}

/** Orchard yard: meadow floor, hedgerow clutter, and a young back orchard. */
export function GroveYard() {
  const hedge: [number, number][] = [[-0.9, -6.4], [-3.0, -6.2], [1.4, -6.3], [2.9, -5.9], [-5.0, -5.6]]
  return (
    <group>
      <Decal geometry={blobDisc(9.6, 0.16, 7, 48)} color={TOON.grass} position={[0, 0, 0]} />
      <Decal geometry={blobDisc(8.3, 0.12, 8, 44)} color={TOON.meadow} position={[0, 0.004, 0]} />
      {hedge.map(([x, z], i) => (
        <Bush key={i} position={[x, 0, z]} scale={1.3} seed={2 + i * 3} />
      ))}
      <Rock position={[-6.1, 0, -3.1]} scale={1.1} seed={3} outline />
      <Rock position={[-5.4, 0, 4.3]} scale={0.9} seed={7} />
      <Rock position={[6.1, 0, -1.8]} scale={1.2} seed={11} outline />
      <Tree position={[-6.3, 0, -4.9]} scale={1.5} seed={5} />
      <Tree position={[5.8, 0, -5.8]} scale={1.35} seed={8} />
      <Tree position={[-6.6, 0, 2.6]} scale={1.25} seed={12} />
      <Tree position={[0.9, 0, 5.3]} scale={1.2} seed={17} />
      <Tree position={[2.6, 0, 6.0]} scale={1.0} seed={21} />
    </group>
  )
}
