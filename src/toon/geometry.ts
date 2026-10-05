import {
  BufferGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

// ── Geometry cache: identical shapes share one BufferGeometry ────────────────
// Faceted (flat-shaded) variants are derived once per source geometry: split into
// unshared triangles so each face gets its own normal (MeshToonMaterial has no
// flatShading switch of its own).
const facetCache = new WeakMap<BufferGeometry, BufferGeometry>()
export function faceted(g: BufferGeometry): BufferGeometry {
  let f = facetCache.get(g)
  if (!f) {
    f = g.index ? g.toNonIndexed() : g.clone()
    f.computeVertexNormals()
    facetCache.set(g, f)
  }
  return f
}
const geoCache = new Map<string, BufferGeometry>()
function cached<T extends BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key) as T | undefined
  if (!g) {
    g = make()
    geoCache.set(key, g)
  }
  return g
}

export const geo = {
  box: (w: number, h: number, d: number, r: number) =>
    cached(`box|${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w, h, d) / 2 - 1e-3))),
  blob: (detail: number) => cached(`blob|${detail}`, () => new IcosahedronGeometry(1, detail)),
  sphere: (seg: number) => cached(`sphere|${seg}`, () => new SphereGeometry(1, seg, Math.max(4, Math.round(seg * 0.75)))),
  cyl: (rt: number, rb: number, h: number, seg: number) =>
    cached(`cyl|${rt}|${rb}|${h}|${seg}`, () => new CylinderGeometry(rt, rb, h, seg)),
  cone: (r: number, h: number, seg: number) => cached(`cone|${r}|${h}|${seg}`, () => new ConeGeometry(r, h, seg)),
  capsule: (r: number, len: number, seg: number) =>
    cached(`capsule|${r}|${len}|${seg}`, () => new CapsuleGeometry(r, len, 4, seg)),
  torus: (r: number, tube: number, seg: number) =>
    cached(`torus|${r}|${tube}|${seg}`, () => new TorusGeometry(r, tube, 8, seg)),
}
