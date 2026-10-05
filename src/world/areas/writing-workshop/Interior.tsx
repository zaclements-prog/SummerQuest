import { useMemo } from 'react'
import { CatmullRomCurve3, CircleGeometry, TubeGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { seededRng } from '../../../lib/random'
import { TOON } from '../../../toon/palette'
import { geo } from '../../../toon/geometry'
import { toonMaterial } from '../../../toon/materials'
import { TBlob, TBox, TCone, TCyl } from '../../../toon/shapes'
import { Parts } from '../word-problem-woods/storyKit'
import type { Part } from '../word-problem-woods/instancing'
import { ARMCHAIR, BASKET, CHEST, DESKS, PLANT, SHELF, STOOLS } from './layout'

// Everything here is in the building's local space (origin = its center, floor y = 0).

const DESK_H = 0.74
const PAPER = '#fffdf6'
const INK = '#34407a'

// ── Desks + stools ──────────────────────────────────────────────────────────
const DESK_TOPS: Part[] = DESKS.map((d) => ({ p: [d.x, DESK_H - 0.04, d.z], s: [d.w, 0.08, d.d] }))
const DESK_PANELS: Part[] = DESKS.flatMap((d) => [
  { p: [d.x - d.w / 2 + 0.07, (DESK_H - 0.08) / 2, d.z], s: [0.08, DESK_H - 0.08, d.d - 0.08] },
  { p: [d.x + d.w / 2 - 0.07, (DESK_H - 0.08) / 2, d.z], s: [0.08, DESK_H - 0.08, d.d - 0.08] },
  { p: [d.x, 0.42, d.z - d.d / 2 + 0.06], s: [d.w - 0.1, 0.5, 0.05] },
])
const STOOL_LEGS: Part[] = STOOLS.map((s) => ({ p: [s.x, 0.22, s.z], s: [1, 1, 1] }))

// ── Paper stacks on both desks ──────────────────────────────────────────────
const PAPERS: Part[] = [
  ...[0, 1, 2, 3].map((i): Part => ({ p: [-0.82, DESK_H + 0.015 + i * 0.03, -2.5], r: [0, (i % 2 ? 0.12 : -0.08) + i * 0.02, 0], s: [0.3, 0.025, 0.38] })),
  ...[0, 1, 2].map((i): Part => ({ p: [1.82, DESK_H + 0.015 + i * 0.03, -2.38], r: [0, 0.2 - i * 0.1, 0], s: [0.3, 0.025, 0.38] })),
  { p: [0.95, DESK_H + 0.015, -2.2], r: [0, -0.35, 0], s: [0.28, 0.02, 0.36] },
]

// ── Typewriter keys (two rows of round keys) ─────────────────────────────────
const TW = { x: -1.38, z: -2.38 }
const KEYS: Part[] = [0, 1].flatMap((row) =>
  [0, 1, 2, 3, 4].map((k): Part => ({
    p: [TW.x - 0.18 + k * 0.09 + row * 0.045, DESK_H + 0.17 + row * 0.03, TW.z + 0.16 - row * 0.07],
    s: [0.03, 0.018, 0.03],
  })),
)

// ── Corkboard notes between the desks ───────────────────────────────────────
const NOTES: Part[] = [
  { p: [-0.28, 1.72, -2.77], r: [0, 0, 0.1], s: [0.2, 0.22, 0.012], c: TOON.flowerYellow },
  { p: [0.02, 1.76, -2.77], r: [0, 0, -0.06], s: [0.18, 0.2, 0.012], c: TOON.flowerPink },
  { p: [0.29, 1.7, -2.77], r: [0, 0, 0.14], s: [0.2, 0.2, 0.012], c: TOON.mint },
  { p: [-0.22, 1.42, -2.77], r: [0, 0, -0.12], s: [0.22, 0.18, 0.012], c: TOON.sky },
  { p: [0.12, 1.44, -2.77], r: [0, 0, 0.05], s: [0.26, 0.2, 0.012], c: PAPER },
  { p: [0.33, 1.4, -2.77], r: [0, 0, -0.18], s: [0.14, 0.16, 0.012], c: TOON.lilac },
]

// ── Bookshelf: frame + rows of books ────────────────────────────────────────
const SH = SHELF
const SHELF_LEVELS = [0.06, 0.56, 1.06, 1.56]
const SHELF_FRAME: Part[] = [
  { p: [SH.x - SH.w / 2 + 0.03, SH.h / 2, SH.z], s: [0.06, SH.h, SH.d] },
  { p: [SH.x, SH.h / 2, SH.z - SH.d / 2 + 0.04], s: [SH.w, SH.h, 0.08] },
  { p: [SH.x, SH.h / 2, SH.z + SH.d / 2 - 0.04], s: [SH.w, SH.h, 0.08] },
  { p: [SH.x, SH.h - 0.04, SH.z], s: [SH.w + 0.06, 0.08, SH.d + 0.06] },
  ...SHELF_LEVELS.map((y): Part => ({ p: [SH.x, y, SH.z], s: [SH.w - 0.04, 0.06, SH.d - 0.1] })),
]
const BOOK_COLORS = [TOON.flowerRed, TOON.flowerBlue, TOON.flowerYellow, TOON.mint, TOON.flowerPurple, TOON.coral, TOON.roofTeal, TOON.flowerPink]
function buildBooks(): Part[] {
  const r = seededRng('workshop-books')
  const out: Part[] = []
  for (const y of SHELF_LEVELS) {
    let z = SH.z - SH.d / 2 + 0.12
    const end = SH.z + SH.d / 2 - 0.12
    while (z < end - 0.06) {
      const t = 0.08 + r() * 0.06
      const h = 0.28 + r() * 0.14
      const lean = r() < 0.12 && z + t + 0.1 < end ? 0.25 : 0
      out.push({ p: [SH.x + 0.03, y + 0.03 + h / 2, z + t / 2], r: [lean, 0, 0], s: [0.34, h, t], c: BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)] })
      z += t + 0.012 + (lean ? 0.08 : 0)
    }
  }
  return out
}
const BOOKS = buildBooks()

// ── Armchair (faces +x, into the room) ──────────────────────────────────────
const AC = ARMCHAIR
const CHAIR_COLOR = '#ef8f7a'
const ARMCHAIR_PARTS: Part[] = [
  { p: [AC.x, 0.14, AC.z], s: [AC.w, 0.26, AC.d] },
  { p: [AC.x + 0.05, 0.33, AC.z], s: [AC.w - 0.15, 0.2, AC.d - 0.22] },
  { p: [AC.x - AC.w / 2 + 0.12, 0.66, AC.z], s: [0.24, 0.8, AC.d] },
  { p: [AC.x + 0.02, 0.48, AC.z - AC.d / 2 + 0.1], s: [AC.w - 0.1, 0.36, 0.2] },
  { p: [AC.x + 0.02, 0.48, AC.z + AC.d / 2 - 0.1], s: [AC.w - 0.1, 0.36, 0.2] },
]

// ── Scroll chest, wastepaper basket, crumpled paper balls ───────────────────
const SCROLLS: Part[] = [
  { p: [CHEST.x - 0.1, 0.5, CHEST.z - 0.25], r: [Math.PI / 2, 0, 0.2], s: [0.07, 0.62, 0.07] },
  { p: [CHEST.x + 0.08, 0.53, CHEST.z + 0.05], r: [Math.PI / 2, 0, -0.15], s: [0.075, 0.66, 0.075] },
  { p: [CHEST.x - 0.05, 0.56, CHEST.z + 0.3], r: [Math.PI / 2 - 0.3, 0, 0.1], s: [0.065, 0.58, 0.065] },
  { p: [CHEST.x + 0.12, 0.6, CHEST.z - 0.1], r: [Math.PI / 2 + 0.25, 0, 0], s: [0.06, 0.55, 0.06] },
]
const SCROLL_BANDS: Part[] = SCROLLS.map((s) => ({ p: s.p, r: s.r, s: [0.08, 0.06, 0.08] }))
const PAPER_BALLS: Part[] = [
  { p: [BASKET.x, 0.42, BASKET.z], s: 0.09 },
  { p: [BASKET.x + 0.07, 0.4, BASKET.z - 0.06], s: 0.08 },
  { p: [BASKET.x - 0.3, 0.07, BASKET.z + 0.25], s: 0.075 },
  { p: [BASKET.x - 0.1, 0.07, BASKET.z + 0.55], s: 0.07 },
  { p: [BASKET.x - 0.55, 0.065, BASKET.z - 0.1], s: 0.065 },
]

// ── String lights along the two back walls ──────────────────────────────────
const LIGHT_Y = 2.28
const LIGHT_COLORS = [TOON.lantern, TOON.flowerPink, TOON.mint] as const
const BACK_WIRE = { from: new Vector3(-2.72, LIGHT_Y, -2.76), to: new Vector3(2.72, LIGHT_Y, -2.76) }
const SIDE_WIRE = { from: new Vector3(-2.76, LIGHT_Y, -2.72), to: new Vector3(-2.76, LIGHT_Y, 2.72) }
/** A point on a sagging wire (t ∈ 0..1). */
function sag(w: { from: Vector3; to: Vector3 }, t: number, depth = 0.26): [number, number, number] {
  const x = w.from.x + (w.to.x - w.from.x) * t
  const z = w.from.z + (w.to.z - w.from.z) * t
  return [x, LIGHT_Y - Math.sin(Math.PI * t) * depth, z]
}
function bulbs(): Part[][] {
  const groups: Part[][] = [[], [], []]
  let k = 0
  for (const w of [BACK_WIRE, SIDE_WIRE]) {
    for (let i = 1; i < 10; i++) {
      const [x, y, z] = sag(w, i / 10)
      groups[k++ % 3].push({ p: [x, y - 0.07, z], s: [0.055, 0.075, 0.055] })
    }
  }
  return groups
}
const BULBS = bulbs()

// ── Small furnishings batched by shape (one draw call each, tinted per item) ─
const NB = { x: 1.15, z: -2.3, yaw: -0.2 } // open notebook on desk 2
const nbOff = (lx: number): [number, number] => [NB.x + lx * Math.cos(NB.yaw), NB.z - lx * Math.sin(NB.yaw)]
const SMALL_BOXES: Part[] = [
  ...DESK_PANELS.map((p) => ({ ...p, c: TOON.woodDark })),
  ...PAPERS.map((p) => ({ ...p, c: PAPER })),
  ...NOTES,
  // typewriter keyboard plate + the page in it
  { p: [TW.x, DESK_H + 0.16, TW.z + 0.1], r: [0.35, 0, 0], s: [0.5, 0.06, 0.2], c: TOON.wallBlue },
  { p: [TW.x, DESK_H + 0.36, TW.z - 0.15], r: [-0.2, 0, 0], s: [0.36, 0.34, 0.015], c: PAPER },
  // open notebook
  { p: [NB.x, DESK_H + 0.02, NB.z], r: [0, NB.yaw, 0], s: [0.5, 0.025, 0.34], c: TOON.roofPlum },
  { p: [nbOff(-0.12)[0], DESK_H + 0.045, nbOff(-0.12)[1]], r: [0, NB.yaw, 0.06], s: [0.23, 0.03, 0.3], c: PAPER },
  { p: [nbOff(0.12)[0], DESK_H + 0.045, nbOff(0.12)[1]], r: [0, NB.yaw, -0.06], s: [0.23, 0.03, 0.3], c: PAPER },
  // corkboard frame + cork
  { p: [0, 1.56, -2.81], s: [1.1, 0.78, 0.06], c: TOON.woodDark },
  { p: [0, 1.56, -2.79], s: [0.98, 0.66, 0.05], c: '#e2b57a' },
]
const LAMP = { x: 0.86, z: -2.62 }
const INKPOT = { x: 1.66, z: -2.55 }
const SMALL_CYLS: Part[] = [
  ...STOOLS.map((st): Part => ({ p: [st.x, 0.46, st.z], s: [0.23, 0.08, 0.23], c: TOON.flowerYellow })),
  { p: [TW.x, DESK_H + 0.2, TW.z - 0.13], r: [0, 0, Math.PI / 2], s: [0.06, 0.62, 0.06], c: TOON.eye },
  { p: [TW.x + 0.34, DESK_H + 0.24, TW.z - 0.1], r: [0, 0, -1.2], s: [0.015, 0.16, 0.015], c: TOON.gold },
  { p: [INKPOT.x, DESK_H + 0.15, INKPOT.z], s: [0.055, 0.04, 0.055], c: TOON.gold },
  { p: [LAMP.x, DESK_H + 0.02, LAMP.z], s: [0.08, 0.04, 0.08], c: TOON.gold },
  { p: [LAMP.x, DESK_H + 0.2, LAMP.z], s: [0.015, 0.36, 0.015], c: TOON.gold },
  ...SCROLLS.map((p) => ({ ...p, c: TOON.flowerWhite })),
  ...SCROLL_BANDS.map((p) => ({ ...p, c: TOON.flowerRed })),
]
const PLANT_LEAVES: Part[] = [
  { p: [PLANT.x, 0.62, PLANT.z], s: [0.32, 0.36, 0.32], c: TOON.leaf },
  { p: [PLANT.x + 0.12, 0.92, PLANT.z + 0.08], s: 0.2, c: TOON.leafLight },
]

/**
 * The cosy writing room: two desks under the back windows (a teal typewriter on
 * one, an ink pot, quill, notebook and lamp on the other), paper stacks, a
 * corkboard of story notes, a tall bookshelf, a reading armchair, a round rug,
 * a chest of scrolls, a wastepaper basket (with a few missed throws) and warm
 * string lights. The aisle from the door stays open.
 */
export default function Interior() {
  const geos = useMemo(() => {
    const wire = (w: { from: Vector3; to: Vector3 }) =>
      new TubeGeometry(new CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => new Vector3(...sag(w, i / 8)))), 24, 0.012, 4, false)
    const rugOuter = new CircleGeometry(1.4, 24)
    rugOuter.rotateX(-Math.PI / 2)
    const rugInner = new CircleGeometry(1.0, 24)
    rugInner.rotateX(-Math.PI / 2)
    const rugCenter = new CircleGeometry(0.45, 20)
    rugCenter.rotateX(-Math.PI / 2)
    return { wires: mergeGeometries([wire(BACK_WIRE), wire(SIDE_WIRE)], false)!, rugOuter, rugInner, rugCenter }
  }, [])

  return (
    <group>
      {/* round rug */}
      <group position={[0.1, 0, 0.35]}>
        <mesh geometry={geos.rugOuter} position={[0, 0.012, 0]} material={toonMaterial(TOON.flowerPurple)} receiveShadow />
        <mesh geometry={geos.rugInner} position={[0, 0.016, 0]} material={toonMaterial(TOON.blossomLight)} receiveShadow />
        <mesh geometry={geos.rugCenter} position={[0, 0.02, 0]} material={toonMaterial(TOON.flowerYellow)} receiveShadow />
      </group>

      {/* desks, stools and all the small box / cylinder bits */}
      <Parts geometry={geo.box(1, 1, 1, 0.12)} items={DESK_TOPS} color={TOON.wood} outline />
      <Parts geometry={geo.cyl(0.05, 0.15, 0.42, 8)} items={STOOL_LEGS} color={TOON.woodDark} castShadow={false} />
      <Parts geometry={geo.box(1, 1, 1, 0.1)} items={SMALL_BOXES} castShadow={false} />
      <Parts geometry={geo.cyl(1, 1, 1, 10)} items={SMALL_CYLS} castShadow={false} />

      {/* typewriter + keys */}
      <TBox size={[0.58, 0.16, 0.42]} radius={0.06} position={[TW.x, DESK_H + 0.08, TW.z]} color={TOON.roofTeal} outline outlineThickness={1.8} />
      <Parts geometry={geo.sphere(6)} items={KEYS} color={TOON.flowerWhite} castShadow={false} />

      {/* ink pot with a quill standing in it, and the lamp's glowing shade */}
      <TCyl radiusTop={0.06} radiusBottom={0.095} height={0.13} position={[INKPOT.x, DESK_H + 0.065, INKPOT.z]} color={INK} outline outlineThickness={1.6} />
      <group position={[INKPOT.x + 0.02, DESK_H + 0.17, INKPOT.z]} rotation={[0.2, 0, -0.35]}>
        <TCyl radiusTop={0.008} radiusBottom={0.01} height={0.34} position={[0, 0.1, 0]} color={TOON.flowerWhite} castShadow={false} segments={5} />
        <TBlob position={[0.03, 0.26, 0]} scale={[0.05, 0.17, 0.02]} color={TOON.flowerWhite} detail={1} flat={false} castShadow={false} />
      </group>
      <TCone radius={0.15} height={0.16} position={[LAMP.x, DESK_H + 0.42, LAMP.z]} color={TOON.lantern} emissive={TOON.lantern} emissiveIntensity={0.85} castShadow={false} segments={10} />

      {/* bookshelf */}
      <Parts geometry={geo.box(1, 1, 1, 0.08)} items={SHELF_FRAME} color={TOON.woodDark} outline />
      <Parts geometry={geo.box(1, 1, 1, 0.12)} items={BOOKS} castShadow={false} />

      {/* reading armchair + cushion */}
      <Parts geometry={geo.box(1, 1, 1, 0.3)} items={ARMCHAIR_PARTS} color={CHAIR_COLOR} outline />
      <TBlob position={[AC.x - 0.18, 0.58, AC.z]} rotation={[0, 0, -0.35]} scale={[0.1, 0.22, 0.24]} color={TOON.flowerYellow} detail={1} flat={false} />

      {/* scroll chest (the scrolls are in SMALL_CYLS) */}
      <TBox size={[CHEST.w, 0.42, CHEST.d]} radius={0.06} position={[CHEST.x, 0.21, CHEST.z]} color={TOON.wood} outline />

      {/* wastepaper basket and the ones that missed */}
      <TCyl radiusTop={BASKET.r} radiusBottom={BASKET.r * 0.75} height={0.38} position={[BASKET.x, 0.19, BASKET.z]} color="#d9b27c" outline outlineThickness={1.8} segments={10} />
      <Parts geometry={geo.blob(0)} items={PAPER_BALLS} color={PAPER} flat castShadow={false} />

      {/* potted plant */}
      <TCyl radiusTop={0.24} radiusBottom={0.18} height={0.36} position={[PLANT.x, 0.18, PLANT.z]} color={TOON.brick} outline outlineThickness={1.8} segments={10} />
      <Parts geometry={geo.blob(1)} items={PLANT_LEAVES} flat />

      {/* string lights */}
      <mesh geometry={geos.wires} material={toonMaterial(TOON.outline)} />
      {BULBS.map((items, i) => (
        <Parts key={i} geometry={geo.sphere(8)} items={items} color={LIGHT_COLORS[i]} emissive={LIGHT_COLORS[i]} emissiveIntensity={0.9} castShadow={false} />
      ))}
    </group>
  )
}
