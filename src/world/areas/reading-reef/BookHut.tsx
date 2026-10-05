import { seededRng } from '../../../lib/random'
import { TOON } from '../../../toon/palette'
import { geo } from '../../../toon/geometry'
import { TBox, TCone } from '../../../toon/shapes'
import { Parts } from '../word-problem-woods/storyKit'
import type { Part } from '../word-problem-woods/instancing'
import { HUT } from './layout'

// Local space: the hut's open front faces +z (turned toward the camera by HUT.yaw).
const W = HUT.w
const D = HUT.d
const WALL = '#bfeedd'
const STRIPE_A = TOON.coral
const STRIPE_B = TOON.flowerWhite

const FRAME: Part[] = [
  { p: [0, 1.1, -D / 2 + 0.05], s: [W, 1.9, 0.1], c: WALL },
  { p: [-W / 2 + 0.05, 1.1, -0.02], s: [0.1, 1.9, D - 0.1], c: WALL },
  { p: [W / 2 - 0.05, 1.1, -0.02], s: [0.1, 1.9, D - 0.1], c: WALL },
  { p: [-W / 2 + 0.05, 1.1, D / 2 - 0.04], s: [0.16, 2.0, 0.16], c: TOON.flowerWhite },
  { p: [W / 2 - 0.05, 1.1, D / 2 - 0.04], s: [0.16, 2.0, 0.16], c: TOON.flowerWhite },
]

/** Striped roof, sloping down toward the front, with a scalloped valance. */
const STRIPES = 5
const ROOF: Part[] = Array.from({ length: STRIPES }, (_, i) => ({
  p: [-W / 2 - 0.1 + (i + 0.5) * ((W + 0.2) / STRIPES), 2.24, 0.05],
  r: [0.2, 0, 0],
  s: [(W + 0.2) / STRIPES + 0.01, 0.12, D + 0.5],
  c: i % 2 ? STRIPE_B : STRIPE_A,
}))
const VALANCE: Part[] = Array.from({ length: STRIPES }, (_, i) => ({
  p: [-W / 2 - 0.1 + (i + 0.5) * ((W + 0.2) / STRIPES), 2.06, D / 2 + 0.24],
  s: [(W + 0.2) / STRIPES / 2, 0.15, 0.05],
  c: i % 2 ? STRIPE_B : STRIPE_A,
}))

/** Three shelves of books (some stacked flat) against the back wall. */
const SHELF_Y = [0.62, 1.12, 1.62]
const SHELVES: Part[] = SHELF_Y.map((y) => ({ p: [0, y, -D / 2 + 0.3], s: [W - 0.24, 0.06, 0.42] }))
const BOOK_COLORS = [TOON.flowerRed, TOON.flowerBlue, TOON.flowerYellow, TOON.mint, TOON.flowerPurple, TOON.coral, TOON.roofTeal, TOON.flowerPink]
function buildBooks(): Part[] {
  const r = seededRng('reef-hut-books')
  const out: Part[] = []
  for (const y of SHELF_Y) {
    let x = -W / 2 + 0.22
    while (x < W / 2 - 0.3) {
      const c = BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)]
      if (r() < 0.15) {
        // a little flat stack
        for (let k = 0; k < 3; k++) out.push({ p: [x + 0.13, y + 0.06 + k * 0.07, -D / 2 + 0.3], r: [0, (r() - 0.5) * 0.3, 0], s: [0.26, 0.065, 0.3], c: BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)] })
        x += 0.32
      } else {
        const t = 0.07 + r() * 0.05
        const h = 0.28 + r() * 0.12
        out.push({ p: [x + t / 2, y + 0.03 + h / 2, -D / 2 + 0.3], r: [0, 0, r() < 0.1 ? 0.2 : 0], s: [t, h, 0.3], c })
        x += t + 0.015
      }
    }
  }
  return out
}
const BOOKS = buildBooks()

/**
 * The book-swap beach hut: a pastel hut with a coral-and-white striped roof,
 * shelves of books open to the beach, and a sign over the front showing a book
 * and two swap arrows (take one, leave one).
 */
export default function BookHut() {
  return (
    <group position={[HUT.x, 0, HUT.z]} rotation={[0, HUT.yaw, 0]}>
      <TBox size={[W + 0.14, 0.16, D + 0.14]} radius={0.05} position={[0, 0.08, 0]} color={TOON.woodDark} receiveShadow />
      <Parts geometry={geo.box(1, 1, 1, 0.08)} items={FRAME} outline />
      <Parts geometry={geo.box(1, 1, 1, 0.1)} items={ROOF} outline />
      <Parts geometry={geo.sphere(10)} items={VALANCE} castShadow={false} />
      <Parts geometry={geo.box(1, 1, 1, 0.12)} items={SHELVES} color={TOON.wood} castShadow={false} />
      <Parts geometry={geo.box(1, 1, 1, 0.15)} items={BOOKS} castShadow={false} />
      {/* sign: an open book ⇄ swap arrows */}
      <group position={[0, 2.72, D / 2 + 0.05]} rotation={[-0.12, 0, 0]}>
        <TBox size={[1.3, 0.5, 0.08]} radius={0.05} color={TOON.woodLight} outline />
        <TBox size={[0.26, 0.32, 0.03]} radius={0.01} position={[-0.42, 0, 0.05]} rotation={[0, 0.25, 0]} color={TOON.flowerWhite} castShadow={false} />
        <TBox size={[0.26, 0.32, 0.03]} radius={0.01} position={[-0.17, 0, 0.05]} rotation={[0, -0.25, 0]} color={TOON.flowerWhite} castShadow={false} />
        <TBox size={[0.3, 0.06, 0.03]} radius={0.015} position={[0.28, 0.08, 0.05]} color={TOON.coral} castShadow={false} />
        <TCone radius={0.08} height={0.14} position={[0.47, 0.08, 0.05]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 1, 0.4]} color={TOON.coral} castShadow={false} segments={4} />
        <TBox size={[0.3, 0.06, 0.03]} radius={0.015} position={[0.32, -0.09, 0.05]} color={TOON.roofTeal} castShadow={false} />
        <TCone radius={0.08} height={0.14} position={[0.13, -0.09, 0.05]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.4]} color={TOON.roofTeal} castShadow={false} segments={4} />
      </group>
    </group>
  )
}
