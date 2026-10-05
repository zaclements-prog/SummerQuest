import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Cached custom shapes shared by the three Story areas (Word Problem Woods,
 * Writing Workshop, Reading Reef). Built once on first use, never per render.
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

/**
 * A chunky 3D question mark (hook + stem + dot) in the XY plane, facing +z,
 * centered on the origin, about 1.2 tall. One geometry, so it can be instanced.
 */
export function questionMarkGeometry(): BufferGeometry {
  return cached('question', () => {
    const R = 0.28
    const T = 0.1
    const L = 0.2
    // Arc from the bottom (−90°) round the right, over the top, to the left end.
    const hook = new TorusGeometry(R, T, 8, 18, Math.PI * 1.5)
    hook.rotateZ(-Math.PI / 2)
    const capLeft = new SphereGeometry(T, 8, 6)
    capLeft.translate(-R, 0, 0)
    const joint = new SphereGeometry(T, 8, 6)
    joint.translate(0, -R, 0)
    const stem = new CylinderGeometry(T, T, L, 8)
    stem.translate(0, -R - L / 2, 0)
    const dot = new SphereGeometry(T * 1.3, 10, 8)
    dot.translate(0, -R - L - 0.24, 0)
    const g = mergeGeometries([hook, capLeft, joint, stem, dot], false)!
    g.center()
    return g
  })
}

/** A little "u" smile: the bottom half of a ring of radius 1 in the XY plane (scale it to ~0.05). */
export function smileGeometry(): BufferGeometry {
  return cached('smile', () => {
    const g = new TorusGeometry(1, 0.16, 6, 14, Math.PI)
    g.rotateZ(Math.PI)
    return g
  })
}

/** A folded paper dart: nose along +z, wings spread in x, a keel underneath. Use a double-sided material. */
export function paperPlaneGeometry(): BufferGeometry {
  return cached('plane', () => {
    const nose = [0, 0, 0.5]
    const lt = [-0.36, 0.07, -0.42]
    const rt = [0.36, 0.07, -0.42]
    const cb = [0, 0, -0.42]
    const kb = [0, -0.15, -0.42]
    const tris = [nose, cb, lt, nose, rt, cb, nose, kb, cb]
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(tris.flat()), 3))
    g.computeVertexNormals()
    return g
  })
}

/** A puffy five-armed starfish lying flat on XZ (top face up), about 1 across. */
export function starfishGeometry(): BufferGeometry {
  return cached('starfish', () => {
    const s = new Shape()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2
      const r = i % 2 === 0 ? 0.48 : 0.2
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      if (i === 0) s.moveTo(x, y)
      else s.lineTo(x, y)
    }
    s.closePath()
    const g = new ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 1 })
    g.rotateX(-Math.PI / 2)
    return g
  })
}

/**
 * A flat polygon from (x,z) points lying at height y, facing +y. For ground
 * decals (sand, puddles, rugs). Not cached: build it once in a useMemo.
 */
export function flatPolygon(points: [number, number][], y: number): BufferGeometry {
  const s = new Shape()
  // Shape space is XY; after rotateX(−π/2) a shape point (x, y) lands at world (x, 0, −y).
  points.forEach(([x, z], i) => (i === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z)))
  s.closePath()
  const g = new ShapeGeometry(s, 4)
  g.rotateX(-Math.PI / 2)
  g.translate(0, y, 0)
  return g
}

/**
 * A wobbly closed outline around (cx,cz): `n` points on an ellipse (rx, rz)
 * pushed in and out by `wobble`. Deterministic from `seed`.
 */
export function blobOutline(cx: number, cz: number, rx: number, rz: number, n: number, wobble: number, seed: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const w = 1 + wobble * (Math.sin(a * 3 + seed) * 0.6 + Math.sin(a * 5 + seed * 2.3) * 0.4)
    pts.push([cx + Math.cos(a) * rx * w, cz + Math.sin(a) * rz * w])
  }
  return pts
}

/**
 * A flat ribbon of `width` following (x,z) points at height y, facing +y (one
 * quad per segment, mitred at the joints). For painted lines on the ground.
 */
export function flatStrip(points: [number, number][], width: number, y: number): BufferGeometry {
  const pos: number[] = []
  const nrm: number[] = []
  const idx: number[] = []
  const n = points.length
  for (let i = 0; i < n; i++) {
    const [px, pz] = points[Math.max(0, i - 1)]
    const [nx, nz] = points[Math.min(n - 1, i + 1)]
    let tx = nx - px
    let tz = nz - pz
    const l = Math.hypot(tx, tz) || 1
    tx /= l
    tz /= l
    const [x, z] = points[i]
    const h = width / 2
    pos.push(x - tz * h, y, z + tx * h, x + tz * h, y, z - tx * h)
    nrm.push(0, 1, 0, 0, 1, 0)
    if (i < n - 1) {
      const a = i * 2
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('normal', new BufferAttribute(new Float32Array(nrm), 3))
  g.setIndex(idx)
  return g
}
