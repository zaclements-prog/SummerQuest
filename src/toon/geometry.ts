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
import { registerSharedGpuCache } from '../platform/gl/release'
import { isTouchFirst } from '../platform/gl/deviceClass'

// ── Geometry cache: identical shapes share one BufferGeometry ────────────────
// Faceted (flat-shaded) variants are derived once per source geometry: split into
// unshared triangles so each face gets its own normal (MeshToonMaterial has no
// flatShading switch of its own).
const facetCache = new WeakMap<BufferGeometry, BufferGeometry>()
const facetAll = new Set<BufferGeometry>()
export function faceted(g: BufferGeometry): BufferGeometry {
  let f = facetCache.get(g)
  if (!f) {
    f = g.index ? g.toNonIndexed() : g.clone()
    f.computeVertexNormals()
    facetCache.set(g, f)
    facetAll.add(f)
  }
  return f
}
const geoCache = new Map<string, BufferGeometry>()
// Released from the renderer whenever a canvas goes away (see platform/gl/release).
registerSharedGpuCache(() => [...geoCache.values(), ...facetAll])
function cached<T extends BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key) as T | undefined
  if (!g) {
    g = make()
    geoCache.set(key, g)
  }
  return g
}

/**
 * Bevel steps a rounded box gets when the caller doesn't say: phones and tablets get a
 * single bevel (108 triangles instead of 300 per box). Instanced scenery (fences,
 * shingles, crates: hundreds of copies) is most of the World's triangles, and the
 * second step is hard to see on a tablet screen. Read once: the device doesn't change.
 */
export const DEFAULT_BOX_SEGMENTS = isTouchFirst() ? 1 : 2

export const geo = {
  /** Rounded box; `segments` per rounded edge (2 = soft; 1 = a single bevel, ~⅓ the triangles). */
  box: (w: number, h: number, d: number, r: number, segments = DEFAULT_BOX_SEGMENTS) =>
    cached(`box|${w}|${h}|${d}|${r}|${segments}`, () => new RoundedBoxGeometry(w, h, d, segments, Math.min(r, Math.min(w, h, d) / 2 - 1e-3))),
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
