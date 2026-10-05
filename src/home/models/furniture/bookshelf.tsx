import { seededRng } from '../../../lib/random'
import { TBox, TCyl, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { Ol } from './_kit'

const BOOK_COLORS = [F.coral, F.sky, F.butter, F.lilac, F.mint, F.pink, F.blue, F.peach]
const SHELF_Y = [0.17, 0.65, 1.15] // top of each shelf board
const SHELF_H = 0.42 // clear height inside a compartment

interface Book {
  x: number
  y: number
  w: number
  h: number
  tilt: number
  color: string
}

// Chunky picture-book spines, packed left to right on each shelf (deterministic).
const BOOKS: Book[] = (() => {
  const r = seededRng('bookshelf')
  const out: Book[] = []
  SHELF_Y.forEach((y, s) => {
    let x = -0.76
    const end = s === 1 ? 0.12 : 0.36
    let i = 0
    while (x < end) {
      const w = 0.1 + r() * 0.06
      const h = SHELF_H * (0.66 + r() * 0.26)
      out.push({ x: x + w / 2, y, w, h, tilt: 0, color: BOOK_COLORS[(s * 3 + i++) % BOOK_COLORS.length] })
      x += w + 0.012
    }
    if (s === 1) {
      // one book leaning on the row
      const h = SHELF_H * 0.78
      out.push({ x: x + 0.1, y, w: 0.1, h, tilt: -0.42, color: BOOK_COLORS[(i + 2) % BOOK_COLORS.length] })
    }
  })
  return out
})()

/** Bookshelf (2×1): honey-wood case with a mint back, rows of chunky books and a few toys. */
export function Bookshelf() {
  return (
    <group>
      {/* carcass */}
      {[-0.86, 0.86].map((x) => (
        <TBox key={x} size={[0.12, 1.62, 0.44]} radius={0.045} position={[x, 0.85, 0]} color={F.wood}>
          <Ol />
        </TBox>
      ))}
      <TBox size={[1.88, 0.12, 0.5]} radius={0.05} position={[0, 1.7, 0]} color={F.woodLight}>
        <Ol />
      </TBox>
      <TBox size={[1.74, 0.16, 0.44]} radius={0.04} position={[0, 0.09, 0]} color={F.woodDark} />
      <TBox size={[1.64, 1.56, 0.04]} radius={0.015} position={[0, 0.88, -0.19]} color={F.mint} castShadow={false} />
      {SHELF_Y.slice(1).map((y) => (
        <TBox key={y} size={[1.62, 0.06, 0.4]} radius={0.02} position={[0, y - 0.03, 0]} color={F.woodLight} castShadow={false} />
      ))}

      {/* books */}
      {BOOKS.map((b, i) => (
        <TBox
          key={i}
          size={[b.w, b.h, 0.3]}
          radius={0.025}
          position={[b.x + (b.tilt ? Math.sin(-b.tilt) * b.h * 0.5 : 0), b.y + (b.h / 2) * Math.cos(b.tilt), 0.01]}
          rotation={[0, 0, b.tilt]}
          color={b.color}
          castShadow={false}
        />
      ))}

      {/* toys: a ball (bottom shelf), a little potted cactus (middle), a star jar (top) */}
      <TSphere position={[0.6, SHELF_Y[0] + 0.15, 0.02]} scale={0.15} color={F.red} segments={12} castShadow={false} />
      <TCyl radiusTop={0.1} radiusBottom={0.08} height={0.14} position={[0.6, SHELF_Y[1] + 0.07, 0.02]} color={F.peach} segments={10} castShadow={false} />
      <TSphere position={[0.6, SHELF_Y[1] + 0.23, 0.02]} scale={[0.08, 0.13, 0.08]} color={F.leaf} segments={10} castShadow={false} />
      <TCyl radiusTop={0.11} height={0.24} position={[0.6, SHELF_Y[2] + 0.12, 0.02]} color={F.sky} opacity={0.75} segments={12} castShadow={false} />
      <TSphere position={[0.6, SHELF_Y[2] + 0.1, 0.02]} scale={0.075} color={F.butter} emissive={F.butter} emissiveIntensity={0.4} segments={8} castShadow={false} />
    </group>
  )
}
