import { BufferGeometry, CylinderGeometry, ExtrudeGeometry, RingGeometry, Shape, ShapeGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { seededRng } from '../../../lib/random'
import { geo } from '../../../toon/geometry'

/**
 * Cached custom geometries for the Math West + South areas (Fraction Falls,
 * Division Dunes, Multiplication Mesa, Tower Battlefront): organic ground decals,
 * closed pie slices, candy-striped cones and an instanceable fern.
 */

const cache = new Map<string, BufferGeometry>()
function cached(key: string, make: () => BufferGeometry): BufferGeometry {
  let g = cache.get(key)
  if (!g) {
    g = make()
    cache.set(key, g)
  }
  return g
}

/** An organic flat blob lying in XZ (facing +y), centred on the origin. */
export function blobDisc(radius: number, wobble = 0.12, seed = 1, segments = 40): BufferGeometry {
  return cached(`disc|${radius}|${wobble}|${seed}|${segments}`, () => {
    const r = seededRng(`blob-disc:${seed}`)
    const p1 = r() * 6.28
    const p2 = r() * 6.28
    const p3 = r() * 6.28
    const s = new Shape()
    for (let i = 0; i < segments; i++) {
      const t = (i / segments) * Math.PI * 2
      const k = 1 + wobble * (0.55 * Math.sin(2 * t + p1) + 0.3 * Math.sin(3 * t + p2) + 0.15 * Math.sin(5 * t + p3))
      const x = Math.cos(t) * radius * k
      const y = Math.sin(t) * radius * k
      if (i === 0) s.moveTo(x, y)
      else s.lineTo(x, y)
    }
    s.closePath()
    const g = new ShapeGeometry(s)
    g.rotateX(-Math.PI / 2)
    return g
  })
}

/**
 * A closed pie slice (a wedge of a short cylinder) lying flat, its tip at the
 * origin, extruded upward by `height`. Angles are measured in the XZ plane from +x
 * toward −z. Softly bevelled so stepping stones and badges look rounded.
 */
export function pieSlice(radius: number, height: number, start: number, length: number, bevel = 0.02): BufferGeometry {
  return cached(`pie|${radius}|${height}|${start.toFixed(4)}|${length.toFixed(4)}|${bevel}`, () => {
    const s = new Shape()
    s.moveTo(0, 0)
    s.absarc(0, 0, radius, start, start + length, false)
    s.lineTo(0, 0)
    const g = new ExtrudeGeometry(s, {
      depth: Math.max(0.001, height - bevel * 2),
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: Math.max(3, Math.ceil((length / (Math.PI * 2)) * 28)),
    })
    g.rotateX(-Math.PI / 2)
    g.translate(0, bevel, 0)
    return g
  })
}

/**
 * A cone (or frustum) split into `stripes` vertical wedges; returns the even and
 * odd wedges as two merged geometries so a candy-striped roof is two meshes.
 */
export function stripedCone(radiusTop: number, radiusBottom: number, height: number, stripes: number, segPerStripe = 2): [BufferGeometry, BufferGeometry] {
  const make = (odd: number) =>
    cached(`stripes|${radiusTop}|${radiusBottom}|${height}|${stripes}|${segPerStripe}|${odd}`, () => {
      const parts: BufferGeometry[] = []
      const len = (Math.PI * 2) / stripes
      for (let i = odd; i < stripes; i += 2) {
        parts.push(new CylinderGeometry(radiusTop, radiusBottom, height, segPerStripe, 1, true, i * len, len).toNonIndexed())
      }
      const g = mergeGeometries(parts, false) ?? new BufferGeometry()
      parts.forEach((p) => p.dispose())
      return g
    })
  return [make(0), make(1)]
}

/**
 * Flat curved strokes lying in XZ (facing +y), merged into one geometry: each is
 * an arc of a ring [x, z, radius, width, start angle, sweep]. Sand ripples, etc.
 */
export function arcStrokes(key: string, arcs: [number, number, number, number, number, number][]): BufferGeometry {
  return cached(`arcs|${key}`, () => {
    const parts = arcs.map(([x, z, r, w, start, sweep]) => {
      const g = new RingGeometry(r - w / 2, r + w / 2, 14, 1, start, sweep)
      g.rotateX(-Math.PI / 2)
      g.translate(x, 0, z)
      return g.toNonIndexed()
    })
    const g = mergeGeometries(parts, false) ?? new BufferGeometry()
    parts.forEach((p) => p.dispose())
    return g
  })
}

/** One fern: a rosette of arching fronds, merged so many ferns instance as one draw call. */
export function fernGeometry(): BufferGeometry {
  return cached('fern', () => {
    const parts: BufferGeometry[] = []
    const n = 7
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 2) * 0.2
      const tilt = 0.95 + (i % 3) * 0.12
      const f = geo.blob(0).clone() // icosahedra are already non-indexed
      f.scale(0.09, 0.42, 0.035)
      f.translate(0, 0.42, 0)
      f.rotateX(tilt)
      f.rotateY(a)
      parts.push(f)
    }
    const g = mergeGeometries(parts, false) ?? new BufferGeometry()
    g.computeVertexNormals()
    parts.forEach((p) => p.dispose())
    return g
  })
}

