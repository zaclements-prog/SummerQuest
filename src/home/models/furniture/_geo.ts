import { BufferGeometry, CircleGeometry, Shape, ShapeGeometry, SphereGeometry, TorusGeometry } from 'three'

// Extra cached shapes the toon kit doesn't provide (arcs, wedges, flat cut-outs).
// One BufferGeometry per distinct set of arguments, shared by every placed copy.
const cache = new Map<string, BufferGeometry>()
function cached<T extends BufferGeometry>(key: string, make: () => T): T {
  let g = cache.get(key) as T | undefined
  if (!g) {
    g = make()
    cache.set(key, g)
  }
  return g
}

export const fgeo = {
  /** Part of a torus in the XY plane, starting at +x and sweeping `arc` radians counter-clockwise. */
  arc: (radius: number, tube: number, arc: number, segments = 16) =>
    cached(`arc|${radius}|${tube}|${arc}|${segments}`, () => new TorusGeometry(radius, tube, 6, segments, arc)),
  /** One vertical slice of a unit sphere (beach-ball panel). */
  wedge: (phiStart: number, phiLength: number) =>
    cached(`wedge|${phiStart}|${phiLength}`, () => new SphereGeometry(1, 4, 12, phiStart, phiLength)),
  /** Upper half of a unit sphere (dome, flat side down on y = 0). */
  dome: (segments = 14) =>
    cached(`dome|${segments}`, () => new SphereGeometry(1, segments, Math.max(4, Math.round(segments / 2)), 0, Math.PI * 2, 0, Math.PI / 2)),
  /** Flat disc facing +z. */
  disc: (radius: number, segments = 20) => cached(`disc|${radius}|${segments}`, () => new CircleGeometry(radius, segments)),
  /** Flat half-disc facing +z (flat edge on y = 0, dome up). */
  halfDisc: (radius: number, segments = 16) =>
    cached(`half|${radius}|${segments}`, () => new CircleGeometry(radius, segments, 0, Math.PI)),
  /** Flat rounded rectangle facing +z, centered. */
  roundRect: (w: number, h: number, r: number) =>
    cached(`rrect|${w}|${h}|${r}`, () => {
      const s = new Shape()
      const x = -w / 2
      const y = -h / 2
      s.moveTo(x + r, y)
      s.lineTo(x + w - r, y)
      s.quadraticCurveTo(x + w, y, x + w, y + r)
      s.lineTo(x + w, y + h - r)
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      s.lineTo(x + r, y + h)
      s.quadraticCurveTo(x, y + h, x, y + h - r)
      s.lineTo(x, y + r)
      s.quadraticCurveTo(x, y, x + r, y)
      return new ShapeGeometry(s, 4)
    }),
  /** Flat triangle pennant facing +z, top edge on y = 0, point down. */
  pennant: (w: number, h: number) =>
    cached(`pennant|${w}|${h}`, () => {
      const s = new Shape()
      s.moveTo(-w / 2, 0)
      s.lineTo(w / 2, 0)
      s.lineTo(0, -h)
      s.closePath()
      return new ShapeGeometry(s)
    }),
  /** Flat five-point star facing +z. */
  star: (outer: number, inner = outer * 0.48) =>
    cached(`star|${outer}|${inner}`, () => {
      const s = new Shape()
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner
        const a = Math.PI / 2 + (i * Math.PI) / 5
        if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        else s.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      s.closePath()
      return new ShapeGeometry(s)
    }),
}
