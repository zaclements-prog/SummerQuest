import { Shape } from 'three'
import { seededRng } from '../../lib/random'
import { TOON } from '../../toon/palette'
import { toonMaterial } from '../../toon/materials'
import { geo } from '../../toon/geometry'
import { TBlob, TBox, TCyl, TSphere } from '../../toon/shapes'
import { Bench } from '../../toon/props'
import { Instances, type Inst } from './kit'
import { LIBRARY_C, LIBRARY_NOOK, LIBRARY_SHELVES, LIBRARY_YARD } from './townData'

const COLUMN = TOON.flowerWhite
const BOOK_COLORS = [
  TOON.roofRed, TOON.roofBlue, TOON.roofTeal, TOON.flowerYellow, TOON.roofPlum,
  TOON.coral, TOON.mint, TOON.lilac, TOON.roofOrange, TOON.leafDark, TOON.flowerPink, TOON.sky,
]

const pediment = (() => {
  const s = new Shape()
  s.moveTo(-1.68, 0)
  s.lineTo(1.68, 0)
  s.lineTo(0, 0.74)
  s.closePath()
  return s
})()

/** An open book emblem (cover + two pages, or one page block when `simple`), facing +z. */
function BookEmblem({ position, scale = 1, cover, opacity = 1, simple }: { position: [number, number, number]; scale?: number; cover: string; opacity?: number; simple?: boolean }) {
  if (simple) {
    return (
      <group position={position} scale={scale}>
        <TBox size={[0.64, 0.36, 0.04]} radius={0.03} color={cover} opacity={opacity} castShadow={false} />
        <TBox size={[0.54, 0.29, 0.05]} radius={0.03} position={[0, 0.01, 0.03]} color={TOON.flowerWhite} opacity={opacity} castShadow={false} />
      </group>
    )
  }
  return (
    <group position={position} scale={scale}>
      <TBox size={[0.64, 0.36, 0.04]} radius={0.03} color={cover} opacity={opacity} castShadow={false} />
      {[-1, 1].map((s) => (
        <TBox key={s} size={[0.29, 0.3, 0.04]} radius={0.02} position={[s * 0.15, 0.01, 0.035]} rotation={[0, s * 0.28, 0]} color={TOON.flowerWhite} opacity={opacity} castShadow={false} />
      ))}
      <TBox size={[0.025, 0.3, 0.05]} radius={0.008} position={[0, 0.01, 0.05]} color={TOON.gold} opacity={opacity} castShadow={false} />
    </group>
  )
}

/**
 * The Library's grand little front (building-local, front wall at z = +3):
 * two white columns, an entablature and a pediment with an open-book emblem,
 * flanked by hanging blue banners. Fades with the front wall.
 */
export function Portico({ roof, opacity }: { roof: string; opacity: number }) {
  const solid = opacity >= 1
  const cols = LIBRARY_YARD.columns.map(([x, z]) => [x - LIBRARY_C[0], z - LIBRARY_C[1]] as const)
  return (
    <group>
      {/* paved landing under the portico */}
      <TBox size={[3.8, 0.04, 1.25]} radius={0.015} position={[0, 0.02, 3.62]} color={TOON.stone} receiveShadow castShadow={false} />
      {cols.map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          <TBox size={[0.52, 0.16, 0.52]} radius={0.05} position={[0, 0.08, 0]} color={TOON.stoneDark} opacity={opacity} castShadow={solid} />
          <TCyl radiusTop={0.17} radiusBottom={0.2} height={1.92} position={[0, 1.12, 0]} color={COLUMN} opacity={opacity} outline={solid} castShadow={solid} segments={12} />
          <TBox size={[0.5, 0.14, 0.5]} radius={0.04} position={[0, 2.13, 0]} color={COLUMN} opacity={opacity} castShadow={false} />
        </group>
      ))}
      <TBox size={[3.6, 0.28, 0.95]} radius={0.05} position={[0, 2.34, 3.52]} color={COLUMN} opacity={opacity} outline={solid} castShadow={solid} />
      <mesh position={[0, 2.47, 3.98]} material={toonMaterial(COLUMN, { opacity, doubleSide: true })}>
        <shapeGeometry args={[pediment]} />
      </mesh>
      {[-1, 1].map((s) => (
        <TBox key={s} size={[1.92, 0.12, 1.1]} radius={0.04} position={[s * 0.84, 2.87, 3.5]} rotation={[0, 0, -s * 0.415]} color={roof} opacity={opacity} outline={solid} castShadow={solid} />
      ))}
      <BookEmblem position={[0, 2.71, 4.0]} scale={0.82} cover={TOON.roofRed} opacity={opacity} />

      {/* banners either side of the portico */}
      {[-2.28, 2.28].map((x) => (
        <group key={x} position={[x, 0, 3.22]}>
          <TCyl radiusTop={0.035} height={0.66} position={[0, 2.14, 0]} rotation={[0, 0, Math.PI / 2]} color={TOON.gold} opacity={opacity} castShadow={false} segments={6} />
          <TBox size={[0.5, 1.02, 0.04]} radius={0.02} position={[0, 1.62, 0]} color={TOON.roofBlue} opacity={opacity} outline={solid} castShadow={false} />
          <TBox size={[0.5, 0.06, 0.05]} radius={0.02} position={[0, 1.12, 0]} color={TOON.gold} opacity={opacity} castShadow={false} />
          <BookEmblem position={[0, 1.72, 0.03]} scale={0.55} cover={TOON.flowerYellow} opacity={opacity} simple />
        </group>
      ))}
    </group>
  )
}

/** A bench against the Library's east wall with a stack of books, and a potted plant. */
export function ReadingBench() {
  const [bx, bz] = LIBRARY_YARD.bench
  const [px, pz] = LIBRARY_YARD.benchPlant
  return (
    <group>
      <Bench position={[bx, 0, bz]} rotation={Math.PI / 2} outline />
      <group position={[bx + 0.02, 0.44, bz - 0.35]}>
        <TBox size={[0.26, 0.07, 0.34]} radius={0.02} position={[0, 0.035, 0]} color={TOON.roofTeal} castShadow={false} />
        <TBox size={[0.24, 0.07, 0.3]} radius={0.02} position={[0, 0.105, 0]} rotation={[0, 0.3, 0]} color={TOON.flowerYellow} castShadow={false} />
        <TBox size={[0.22, 0.06, 0.28]} radius={0.02} position={[0, 0.17, 0]} rotation={[0, -0.2, 0]} color={TOON.roofRed} castShadow={false} />
      </group>
      <group position={[px, 0, pz]}>
        <TCyl radiusTop={0.22} radiusBottom={0.17} height={0.36} position={[0, 0.18, 0]} color={TOON.brick} outline segments={10} />
        <TBlob position={[0, 0.58, 0]} scale={[0.28, 0.32, 0.28]} color={TOON.leaf} outline />
        <TBlob position={[0.08, 0.86, 0.04]} scale={0.16} color={TOON.leafLight} />
      </group>
    </group>
  )
}

// ── Interior ────────────────────────────────────────────────────────────────

const SHELF_H = 2.05
const SHELF_D = 0.5
const LEVELS = [0.1, 0.6, 1.1, 1.6]

/** Bookcases (instanced parts + ~150 books), built once in library-local space. */
const shelves = (() => {
  const backs: Inst[] = []
  const sides: Inst[] = []
  const crowns: Inst[] = []
  const boards: Inst[] = []
  const books: Inst[] = []
  const r = seededRng('library-books')
  for (const u of LIBRARY_SHELVES) {
    const [ux, uz] = u.c
    // unit-local (x along the shelf, z out of the wall) → library-local
    const put = (x: number, y: number, z: number, s: [number, number, number], color?: string, rz = 0): Inst =>
      u.alongX ? { x: ux + x, y, z: uz + z, s, rz, color } : { x: ux + z, y, z: uz - x, s, ry: Math.PI / 2, rz, color }
    backs.push(put(0, SHELF_H / 2, -SHELF_D / 2 + 0.04, [u.w, SHELF_H, 0.08]))
    sides.push(put(-u.w / 2 + 0.04, SHELF_H / 2, 0, [0.08, SHELF_H, SHELF_D]))
    sides.push(put(u.w / 2 - 0.04, SHELF_H / 2, 0, [0.08, SHELF_H, SHELF_D]))
    crowns.push(put(0, SHELF_H + 0.04, 0.02, [u.w + 0.1, 0.1, SHELF_D + 0.08]))
    for (const y of LEVELS) {
      boards.push(put(0, y, 0.02, [u.w - 0.1, 0.06, SHELF_D - 0.04]))
      let x = -u.w / 2 + 0.12
      while (x < u.w / 2 - 0.14) {
        const bw = 0.06 + r() * 0.06
        const bh = 0.26 + r() * 0.14
        if (r() < 0.07) {
          x += 0.12 // a little gap
          continue
        }
        const lean = r() < 0.06 ? 0.25 : 0
        books.push(put(x + bw / 2, y + 0.03 + bh / 2, 0.04, [bw, bh, 0.3], BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)], lean))
        x += bw + 0.012 + (lean ? 0.05 : 0)
      }
    }
  }
  return { backs, sides, crowns, boards, books }
})()

const shelfBox = geo.box(1, 1, 1, 0.03)

/** Reading room: bookcases on the back walls, a round rug with floor cushions, an armchair, a lamp table. */
export function LibraryInterior() {
  const [rx, rz] = LIBRARY_NOOK.rug
  const [tx, tz] = LIBRARY_NOOK.table
  const [ax, az] = LIBRARY_NOOK.armchair
  return (
    <group>
      <Instances geometry={shelfBox} color={TOON.woodDark} items={shelves.backs} />
      <Instances geometry={shelfBox} color={TOON.woodDark} items={shelves.sides} castShadow />
      <Instances geometry={shelfBox} color={TOON.bark} items={shelves.crowns} castShadow />
      <Instances geometry={shelfBox} color={TOON.woodLight} items={shelves.boards} />
      <Instances geometry={shelfBox} items={shelves.books} />

      {/* round rug + floor cushions */}
      <group position={[rx, 0, rz]}>
        <TCyl radiusTop={1.2} height={0.024} position={[0, 0.012, 0]} color={TOON.lilac} castShadow={false} receiveShadow segments={24} />
        <TCyl radiusTop={0.88} height={0.028} position={[0, 0.014, 0]} color={TOON.blossomLight} castShadow={false} receiveShadow segments={24} />
        <TCyl radiusTop={0.42} height={0.032} position={[0, 0.016, 0]} color={TOON.flowerYellow} castShadow={false} receiveShadow segments={20} />
        <TSphere position={[-0.95, 0.1, -0.55]} scale={[0.32, 0.12, 0.32]} color={TOON.flowerPink} />
        <TSphere position={[0.2, 0.1, -1.0]} scale={[0.3, 0.12, 0.3]} color={TOON.flowerYellow} />
        <TSphere position={[-1.0, 0.1, 0.45]} scale={[0.3, 0.12, 0.3]} color={TOON.mint} />
        <TBox size={[0.3, 0.06, 0.22]} radius={0.02} position={[-0.25, 0.05, -0.15]} rotation={[0, 0.5, 0]} color={TOON.roofRed} castShadow={false} />
      </group>

      {/* armchair */}
      <group position={[ax, 0, az]} rotation={[0, -0.55, 0]}>
        <TBox size={[0.72, 0.2, 0.66]} radius={0.05} position={[0, 0.1, 0]} color={TOON.woodDark} />
        <TBox size={[0.76, 0.22, 0.7]} radius={0.08} position={[0, 0.31, 0]} color={TOON.coral} outline />
        <TBox size={[0.76, 0.62, 0.2]} radius={0.09} position={[0, 0.62, -0.27]} color={TOON.coral} outline />
        {[-1, 1].map((s) => (
          <TBox key={s} size={[0.17, 0.34, 0.68]} radius={0.07} position={[s * 0.36, 0.5, 0.01]} color={TOON.coral} />
        ))}
        <TBox size={[0.5, 0.1, 0.48]} radius={0.04} position={[0, 0.46, 0.04]} color={TOON.blossomLight} castShadow={false} />
      </group>

      {/* side table with a glowing lamp and books */}
      <group position={[tx, 0, tz]}>
        <TCyl radiusTop={0.2} height={0.04} position={[0, 0.02, 0]} color={TOON.woodDark} castShadow={false} segments={12} />
        <TCyl radiusTop={0.05} height={0.56} position={[0, 0.3, 0]} color={TOON.woodDark} segments={8} />
        <TCyl radiusTop={0.32} height={0.06} position={[0, 0.6, 0]} color={TOON.wood} segments={14} />
        <TCyl radiusTop={0.03} height={0.3} position={[0.08, 0.78, -0.06]} color={TOON.woodDark} castShadow={false} segments={6} />
        <TCyl radiusTop={0.1} radiusBottom={0.19} height={0.2} position={[0.08, 0.98, -0.06]} color={TOON.lantern} emissive={TOON.lantern} emissiveIntensity={0.8} castShadow={false} segments={10} />
        <TBox size={[0.24, 0.06, 0.18]} radius={0.02} position={[-0.12, 0.66, 0.1]} rotation={[0, 0.4, 0]} color={TOON.roofTeal} castShadow={false} />
      </group>

      {/* tall plant by the door */}
      <group position={[-2.4, 0, 2.5]}>
        <TCyl radiusTop={0.2} radiusBottom={0.15} height={0.34} position={[0, 0.17, 0]} color={TOON.roofTeal} segments={10} />
        <TBlob position={[0, 0.6, 0]} scale={[0.28, 0.34, 0.28]} color={TOON.leafDark} />
        <TBlob position={[0.05, 0.92, 0.02]} scale={0.18} color={TOON.leaf} />
      </group>
    </group>
  )
}
