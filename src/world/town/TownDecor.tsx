import { useMemo } from 'react'
import { seededRng } from '../../lib/random'
import { TOON } from '../../toon/palette'
import { faceted, geo } from '../../toon/geometry'
import { TBlob, TBox, TCyl, TSphere, TTorus } from '../../toon/shapes'
import { Bench, Tree } from '../../toon/props'
import { ScatterTrees, type TreeSpot } from '../../toon/Scatter'
import { collidesAt } from '../collision'
import { PATH_WIDTH, PLAZA, RIVER, WORLD_AREAS, WORLD_PATHS, distToPolyline, npcPosition } from '../worldLayout'
import { Instances, type Inst } from './kit'
import { NOTICE_BOARD, PICNIC, TOWN_BEDS, TOWN_BENCHES, TOWN_LAMPS, TOWN_TREES, townColliders } from './townData'

const FLOWERS = [TOON.flowerRed, TOON.flowerYellow, TOON.flowerPink, TOON.flowerWhite, TOON.flowerPurple, TOON.flowerBlue]

/** Town center and radius of the hand-dressed zone (matches the town keep-out). */
const TOWN = { cx: 0, cz: -3, r: 16.6 }

/**
 * Walk-through greenery for the town's lawns: grass tufts, little flower
 * clusters and pebbles, kept off the paths, plaza, river banks, buildings, NPC
 * stages and every solid town prop. Deterministic.
 */
function buildSprinkle() {
  const r = seededRng('town-sprinkle-v1')
  const solids = townColliders()
  const buildings = WORLD_AREAS.filter((a) => a.kind === 'building')
  const npcs = WORLD_AREAS.map(npcPosition).filter((p): p is [number, number] => !!p)
  const tufts: Inst[] = []
  const flowers: Inst[] = []
  const pebbles: Inst[] = []
  const bushes: Inst[] = []
  const STEP = 1.15
  for (let gx = -TOWN.r; gx <= TOWN.r; gx += STEP) {
    for (let gz = TOWN.cz - TOWN.r; gz <= TOWN.cz + TOWN.r; gz += STEP) {
      const x = gx + (r() - 0.5) * STEP * 0.9
      const z = gz + (r() - 0.5) * STEP * 0.9
      const roll = r()
      const tint = r()
      if (Math.hypot(x - TOWN.cx, z - TOWN.cz) > TOWN.r) continue
      if (Math.hypot(x - PLAZA.cx, z - PLAZA.cz) < PLAZA.r + 0.6) continue
      const pathGap = Math.min(...WORLD_PATHS.map((p) => distToPolyline(x, z, p.points))) - PATH_WIDTH / 2
      if (pathGap < 0.35) continue
      if (distToPolyline(x, z, RIVER.points) < RIVER.width / 2 + 1.25) continue
      if (buildings.some((a) => Math.abs(x - a.worldPos[0]) < a.size! / 2 + 0.55 && Math.abs(z - a.worldPos[1]) < a.size! / 2 + 0.55)) continue
      if (npcs.some(([nx, nz]) => Math.hypot(x - nx, z - nz) < 1.3)) continue
      if (collidesAt(solids, x, z, 0.45)) continue
      if (roll < 0.1 && pathGap > 1.2 && !collidesAt(solids, x, z, 1.1)) {
        const s = 0.3 + tint * 0.18
        bushes.push({ x, y: s * 0.75, z, s: [s * 1.3, s, s * 1.1], ry: tint * 6, color: tint < 0.5 ? TOON.leaf : TOON.leafDark })
        bushes.push({ x: x + 0.34, y: s * 0.6, z: z + 0.12, s: s * 0.78, ry: tint * 3, color: TOON.leafLight })
      } else if (roll < 0.5) {
        tufts.push({ x, y: 0.12, z, s: [0.07, 0.26, 0.07], ry: tint * 6, color: tint < 0.5 ? TOON.grassDark : TOON.leafDark })
        tufts.push({ x: x + 0.12, y: 0.09, z: z + 0.06, s: [0.06, 0.18, 0.06], ry: tint * 4, rz: -0.3, color: TOON.grassDark })
      } else if (roll < 0.72) {
        const c = FLOWERS[Math.floor(tint * FLOWERS.length)]
        for (let i = 0; i < 3; i++) flowers.push({ x: x + (r() - 0.5) * 0.6, y: 0.13, z: z + (r() - 0.5) * 0.6, s: 0.07, color: c })
      } else if (roll < 0.78) {
        const s = 0.1 + tint * 0.08
        pebbles.push({ x, y: s * 0.3, z, s: [s * 1.3, s * 0.7, s], ry: tint * 6, color: tint < 0.5 ? TOON.rock : TOON.rockLight })
      }
    }
  }
  return { tufts, flowers, pebbles, bushes }
}

/** Flowers for the round town beds (instanced across all beds). */
const bedFlowers = (() => {
  const out: Inst[] = []
  TOWN_BEDS.forEach((b) => {
    const r = seededRng(`town-bed:${b.seed}`)
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2
      const d = 0.28 + Math.sqrt(r()) * (b.r - 0.38)
      out.push({ x: b.p[0] + Math.cos(a) * d, y: 0.32 + r() * 0.1, z: b.p[1] + Math.sin(a) * d, s: 0.08, color: FLOWERS[Math.floor(r() * FLOWERS.length)] })
    }
  })
  return out
})()

/** Plain round trees and pines are instanced (like the island's own scatter); the rest are outlined hero trees. */
const plainTrees: TreeSpot[] = TOWN_TREES.filter((t) => t.variant === 'round' || t.variant === 'pine').map((t) => ({
  x: t.p[0],
  z: t.p[1],
  scale: t.s,
  kind: t.variant === 'pine' ? 'pine' : 'round',
  seed: t.seed,
}))
const heroTrees = TOWN_TREES.filter((t) => t.variant !== 'round' && t.variant !== 'pine')

/** Town lamps, instanced: posts, glowing lanterns and caps (same shapes as the kit's <Lamp>). */
const LAMP_H = 1.6
const lampPosts: Inst[] = TOWN_LAMPS.map(([x, z]) => ({ x, y: LAMP_H / 2, z }))
const lampLights: Inst[] = TOWN_LAMPS.map(([x, z]) => ({ x, y: LAMP_H + 0.12, z }))
const lampCaps: Inst[] = TOWN_LAMPS.map(([x, z]) => ({ x, y: LAMP_H + 0.36, z, ry: Math.PI / 4 }))
const LANTERN = { emissive: TOON.lantern, emissiveIntensity: 0.9 }

const NOTES = [
  { x: -0.36, y: 0.12, c: TOON.flowerWhite, r: 0.08 },
  { x: -0.05, y: 0.16, c: TOON.flowerYellow, r: -0.06 },
  { x: 0.33, y: 0.1, c: TOON.blossomLight, r: 0.1 },
  { x: -0.22, y: -0.18, c: TOON.sky, r: -0.05 },
  { x: 0.16, y: -0.17, c: TOON.mint, r: 0.06 },
]

/** A little roofed notice board with pastel notes pinned on it. */
function NoticeBoard({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.56, 0.56].map((x) => (
        <TBox key={x} size={[0.12, 1.75, 0.12]} radius={0.04} position={[x, 0.875, 0]} color={TOON.woodDark} />
      ))}
      <TBox size={[1.28, 0.86, 0.1]} radius={0.05} position={[0, 1.12, 0]} color={TOON.woodLight} outline />
      <TBox size={[1.1, 0.68, 0.02]} radius={0.01} position={[0, 1.12, 0.055]} color={TOON.wood} castShadow={false} />
      {NOTES.map((n) => (
        <TBox key={n.x} size={[0.24, 0.26, 0.02]} radius={0.01} position={[n.x, 1.12 + n.y, 0.075]} rotation={[0, 0, n.r]} color={n.c} castShadow={false} />
      ))}
      {[-1, 1].map((s) => (
        <TBox key={s} size={[0.82, 0.08, 0.42]} radius={0.03} position={[s * 0.37, 1.78, 0]} rotation={[0, 0, -s * 0.42]} color={TOON.roofRed} outline />
      ))}
    </group>
  )
}

const checks = (() => {
  const out: Inst[] = []
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) out.push({ x: -0.48 + i * 0.32, y: 0.032, z: -0.33 + j * 0.33 })
  return out
})()

/** A checked picnic blanket with a basket and two apples. */
function Picnic() {
  const [bx, bz] = PICNIC.basket
  return (
    <group>
      <group position={[PICNIC.p[0], 0, PICNIC.p[1]]} rotation={[0, PICNIC.rot, 0]}>
        <TBox size={[1.32, 0.03, 1.0]} radius={0.012} position={[0, 0.02, 0]} color={TOON.flowerRed} castShadow={false} receiveShadow />
        <Instances geometry={geo.box(0.32, 0.03, 0.33, 0.01)} color={TOON.flowerWhite} items={checks} receiveShadow />
        <TSphere position={[-0.3, 0.1, 0.2]} scale={0.075} color={TOON.flowerRed} />
        <TSphere position={[-0.12, 0.1, 0.28]} scale={0.07} color={TOON.leafLight} />
      </group>
      <group position={[bx, 0, bz]} rotation={[0, 0.5, 0]}>
        <TBox size={[0.4, 0.24, 0.3]} radius={0.05} position={[0, 0.14, 0]} color={TOON.woodLight} outline />
        <TBox size={[0.42, 0.05, 0.32]} radius={0.02} position={[0, 0.26, 0]} color={TOON.wood} castShadow={false} />
        <TTorus radius={0.15} tube={0.025} position={[0, 0.27, 0]} color={TOON.woodDark} castShadow={false} segments={14} />
      </group>
    </group>
  )
}

/** A round, stone-rimmed flower bed with a little shrub in the middle. */
function RoundBed({ p, r }: { p: [number, number]; r: number }) {
  return (
    <group position={[p[0], 0, p[1]]}>
      <TCyl radiusTop={r} radiusBottom={r + 0.05} height={0.22} position={[0, 0.11, 0]} color={TOON.dirtDark} receiveShadow castShadow={false} segments={16} />
      <TTorus radius={r} tube={0.1} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.2, 0]} color={TOON.stone} outline segments={20} />
      <TBlob position={[0, 0.42, 0]} scale={[0.26, 0.24, 0.26]} color={TOON.leafDark} outline />
    </group>
  )
}

/**
 * Town polish: trees, lamps along the north lanes, benches, round flower beds,
 * the notice board and the walk-through greenery on every lawn of the town.
 */
export default function TownDecor() {
  const s = useMemo(() => buildSprinkle(), [])
  return (
    <group>
      {heroTrees.map((t) => (
        <Tree key={t.seed} position={[t.p[0], 0, t.p[1]]} variant={t.variant} scale={t.s} seed={t.seed} rotation={t.seed} outline />
      ))}
      <ScatterTrees trees={plainTrees} />
      <Instances geometry={geo.cyl(0.06, 0.09, LAMP_H, 10)} color={TOON.woodDark} items={lampPosts} castShadow />
      <Instances geometry={geo.box(0.3, 0.32, 0.3, 0.066)} color={TOON.lantern} mat={LANTERN} items={lampLights} />
      <Instances geometry={geo.cone(0.24, 0.18, 4)} color={TOON.woodDark} items={lampCaps} castShadow />
      {TOWN_BENCHES.map((b) => (
        <Bench key={b.p[0]} position={[b.p[0], 0, b.p[1]]} rotation={b.rot} outline />
      ))}
      {TOWN_BEDS.map((b) => (
        <RoundBed key={b.seed} p={b.p} r={b.r} />
      ))}
      <Instances geometry={geo.sphere(8)} items={bedFlowers} />
      <NoticeBoard position={[NOTICE_BOARD[0], 0, NOTICE_BOARD[1]]} rotation={-0.35} />

      <Instances geometry={geo.cone(1, 1, 4)} items={s.tufts} />
      <Instances geometry={geo.sphere(6)} items={s.flowers} />
      <Instances geometry={faceted(geo.blob(0))} items={s.pebbles} receiveShadow />
      <Instances geometry={faceted(geo.blob(1))} items={s.bushes} castShadow />
      <Picnic />
    </group>
  )
}
