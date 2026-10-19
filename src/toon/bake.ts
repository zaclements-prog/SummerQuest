import { BufferAttribute, BufferGeometry, CapsuleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Matrix4, MeshToonMaterial, SphereGeometry, TorusGeometry, Vector3 } from 'three'
import type { ColorRepresentation, Material, Mesh, Object3D } from 'three'
import { hullOf, mergeParts, type MergePart } from './batch'
import { toonGradient } from './materials'
import { creased } from './outlineMaterial'
import { registerSharedGpuCache } from '../platform/gl/release'

/**
 * Bake a whole toon model into ONE vertex-coloured geometry, for crowds drawn
 * as an InstancedMesh (Critter Parade's followers: up to ~150 baby critters in
 * one draw call per species).
 *
 * Mount the model once (hidden), then call `bakeModel(root)`: every visible
 * mesh under `root` is merged in its current pose with the toon batcher's own
 * merge (`mergeParts`): its material colour moves into vertex colours and its
 * emissive glow into a per-vertex `bakedGlow` attribute (eye catch-lights,
 * blushing cheeks), which `glowToonMaterial` adds back in. Round shapes are
 * re-tessellated with fewer segments on the way (a 0.5-unit baby doesn't need
 * a 24-segment head), and double-sided parts get a back-facing copy. Meshes
 * that wear an outline hull (`<Ink/>`, Pretty graphics) also contribute to a
 * merged hull geometry for an instanced outline.
 */

export interface BakedModel {
  /** position, normal, color (linear) and bakedGlow (linear emissive) */
  body: BufferGeometry
  /** Merged outline hulls (null when the model had none, e.g. baked on Fast). */
  hull: BufferGeometry | null
  /** The hull's shared outline material (thickness/colour as the model had it). */
  hullMaterial: Material | null
  triangles: number
}

export interface BakeOptions {
  /** Most segments around a round part (default 8); small parts get fewer. */
  maxSegments?: number
  /** Parts smaller than this (largest axis, model units) get the minimum segments. */
  smallPart?: number
}

const reduced = new WeakMap<BufferGeometry, Map<number, BufferGeometry>>()

/** A round geometry re-made with at most `seg` segments around (others are returned as is). Cached. */
export function fewerSegments(g: BufferGeometry, seg: number): BufferGeometry {
  let byN = reduced.get(g)
  if (!byN) reduced.set(g, (byN = new Map()))
  const hit = byN.get(seg)
  if (hit) return hit
  let out = g
  if (g instanceof SphereGeometry && g.parameters.widthSegments > seg) {
    const p = g.parameters
    out = new SphereGeometry(p.radius, seg, Math.max(3, Math.round(seg * 0.7)), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength)
  } else if (g instanceof CapsuleGeometry && g.parameters.radialSegments > seg) {
    const p = g.parameters
    out = new CapsuleGeometry(p.radius, p.height, Math.min(p.capSegments, 2), seg, 1)
  } else if (g instanceof ConeGeometry) {
    // (a cone is a CylinderGeometry subclass with its own parameter names)
    const p = (g as unknown as { parameters: { radius: number; height: number; radialSegments: number; openEnded: boolean; thetaStart: number; thetaLength: number } }).parameters
    if (p.radialSegments > seg) out = new ConeGeometry(p.radius, p.height, seg, 1, p.openEnded, p.thetaStart, p.thetaLength)
  } else if (g instanceof CylinderGeometry && g.parameters.radialSegments > seg) {
    const p = g.parameters
    out = new CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, seg, 1, p.openEnded, p.thetaStart, p.thetaLength)
  } else if (g instanceof TorusGeometry && g.parameters.tubularSegments > seg + 2) {
    const p = g.parameters
    out = new TorusGeometry(p.radius, p.tube, Math.min(p.radialSegments, 5), seg + 2, p.arc)
  }
  byN.set(seg, out)
  return out
}

const flippedCache = new WeakMap<BufferGeometry, BufferGeometry>()

/** The same surface facing the other way (reversed winding, negated normals): the inside of a double-sided part. */
export function backFaces(g: BufferGeometry): BufferGeometry {
  let f = flippedCache.get(g)
  if (f) return f
  f = g.clone()
  if (!f.index) {
    const n = f.getAttribute('position').count
    const seq = new Uint32Array(n)
    for (let i = 0; i < n; i++) seq[i] = i
    f.setIndex(new BufferAttribute(seq, 1))
  }
  const n = f.getAttribute('normal') as BufferAttribute
  const na = new Float32Array(n.count * 3)
  for (let i = 0; i < n.count; i++) {
    na[i * 3] = -n.getX(i)
    na[i * 3 + 1] = -n.getY(i)
    na[i * 3 + 2] = -n.getZ(i)
  }
  f.setAttribute('normal', new BufferAttribute(na, 3))
  const src = f.index!.array
  const idx = new Uint32Array(src.length)
  for (let i = 0; i < src.length; i += 3) {
    idx[i] = src[i]
    idx[i + 1] = src[i + 2]
    idx[i + 2] = src[i + 1]
  }
  f.setIndex(new BufferAttribute(idx, 1))
  flippedCache.set(g, f)
  return f
}

/** Visible all the way up to (not including) `root`. */
function shown(o: Object3D, root: Object3D): boolean {
  for (let p: Object3D | null = o; p && p !== root; p = p.parent) if (!p.visible) return false
  return true
}

const _scale = new Vector3()
const _inv = new Matrix4()

type Colored = Material & { color?: Color; emissive?: Color; emissiveIntensity?: number; side?: number }

/** Merge the model under `root` (in its current pose) into one geometry; see the module note. */
export function bakeModel(root: Object3D, opts: BakeOptions = {}): BakedModel {
  const maxSeg = opts.maxSegments ?? 8
  const small = opts.smallPart ?? 0.035
  root.updateMatrixWorld(true)
  _inv.copy(root.matrixWorld).invert()
  const body: MergePart[] = []
  const glow: Color[] = []
  const hulls: MergePart[] = []
  let hullMaterial: Material | null = null
  root.traverse((o) => {
    const mesh = o as Mesh & { isInstancedMesh?: boolean }
    if (!mesh.isMesh || mesh.isInstancedMesh || mesh.userData.toonOutlineHull || !shown(mesh, root)) return
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as Colored
    if (!mat?.color || !mesh.geometry.getAttribute('normal')) return
    const matrix = new Matrix4().multiplyMatrices(_inv, mesh.matrixWorld)
    _scale.setFromMatrixScale(matrix)
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere()
    const size = Math.max(_scale.x, _scale.y, _scale.z) * (mesh.geometry.boundingSphere?.radius ?? 1)
    const seg = size < small ? 5 : size < small * 2.5 ? Math.min(6, maxSeg) : maxSeg
    const geometry = fewerSegments(mesh.geometry, seg)
    const color = mat.color.clone()
    const e = mat.emissive ? mat.emissive.clone().multiplyScalar(mat.emissiveIntensity ?? 1) : new Color(0, 0, 0)
    body.push({ geometry, matrix, color })
    glow.push(e)
    if (mat.side === DoubleSide) {
      body.push({ geometry: backFaces(geometry), matrix, color })
      glow.push(e)
    }
    const hull = hullOf(mesh)
    if (hull) {
      hulls.push({ geometry: creased(geometry), matrix })
      hullMaterial ??= hull.material as Material
    }
  })
  const merged = mergeParts(body, true)
  // the glow attribute, in the same vertex order mergeParts used
  const total = merged.getAttribute('position').count
  const g = new Float32Array(total * 3)
  let v = 0
  body.forEach((p, i) => {
    const n = p.geometry.getAttribute('position').count
    const c = glow[i]
    for (let k = 0; k < n; k++, v++) {
      g[v * 3] = c.r
      g[v * 3 + 1] = c.g
      g[v * 3 + 2] = c.b
    }
  })
  merged.setAttribute('bakedGlow', new BufferAttribute(g, 3))
  const hull = hulls.length ? mergeParts(hulls, false, true) : null
  return { body: merged, hull, hullMaterial, triangles: (merged.index?.count ?? total) / 3 }
}

const glowMaterials = new Map<string, MeshToonMaterial>()
registerSharedGpuCache(() => glowMaterials.values())

/**
 * The toon material for a baked model: vertex colours plus the per-vertex
 * `bakedGlow` added to the emissive light (cached per look). `tint` multiplies
 * the colours; `opacity` < 1 makes a see-through, non-depth-writing version
 * (Critter Parade's ghost parade).
 */
export function glowToonMaterial(opts: { tint?: ColorRepresentation; opacity?: number; emissive?: ColorRepresentation; emissiveIntensity?: number } = {}): MeshToonMaterial {
  const opacity = opts.opacity ?? 1
  const key = [new Color(opts.tint ?? '#ffffff').getHexString(), opacity.toFixed(2), opts.emissive ? new Color(opts.emissive).getHexString() : '', (opts.emissiveIntensity ?? 0).toFixed(2)].join('|')
  let m = glowMaterials.get(key)
  if (m) return m
  m = new MeshToonMaterial({
    color: opts.tint ?? '#ffffff',
    vertexColors: true,
    gradientMap: toonGradient(),
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  })
  if (opts.emissive) {
    m.emissive = new Color(opts.emissive)
    m.emissiveIntensity = opts.emissiveIntensity ?? 1
  }
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 bakedGlow;\nvarying vec3 vBakedGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBakedGlow = bakedGlow;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBakedGlow;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vBakedGlow;')
  }
  m.customProgramCacheKey = () => 'toon-baked-glow'
  glowMaterials.set(key, m)
  return m
}
