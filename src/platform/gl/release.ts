import type { BufferGeometry, Material, Object3D, Scene, Texture } from 'three'

/**
 * GPU resource release for a canvas that is going away.
 *
 * three.js keeps a renderer's bookkeeping alive through 'dispose' listeners it
 * adds to every geometry, material and texture it uploads. The toon kit caches
 * geometries and materials at module level (shared by every scene), so without
 * a release each World / Home / game visit would leave its whole renderer
 * reachable from those caches — memory that grows with every route change.
 * Dispatching `dispose()` makes every renderer drop its GPU copy and its
 * listener; the objects themselves stay usable and are simply uploaded again
 * by the next canvas that draws them.
 */

export interface Disposable {
  dispose: () => void
}

type WithGpu = Object3D & { geometry?: BufferGeometry; material?: Material | Material[] }

function isTexture(v: unknown): v is Texture {
  return !!v && typeof v === 'object' && (v as { isTexture?: boolean }).isTexture === true
}

function addMaterial(m: Material, out: Set<Disposable>) {
  out.add(m)
  for (const v of Object.values(m)) if (isTexture(v)) out.add(v)
  const uniforms = (m as Material & { uniforms?: Record<string, { value?: unknown } | undefined> }).uniforms
  if (uniforms) for (const u of Object.values(uniforms)) if (isTexture(u?.value)) out.add(u.value)
}

/** Every geometry, material and texture reachable from `root` (meshes, lines, points, sprites). */
export function collectGpuResources(root: Object3D, out: Set<Disposable> = new Set()): Set<Disposable> {
  root.traverse((o) => {
    const g = (o as WithGpu).geometry
    if (g && typeof g.dispose === 'function') out.add(g)
    const mat = (o as WithGpu).material
    if (Array.isArray(mat)) for (const m of mat) addMaterial(m, out)
    else if (mat) addMaterial(mat, out)
  })
  const scene = root as Scene
  if (isTexture(scene.background)) out.add(scene.background)
  if (isTexture(scene.environment)) out.add(scene.environment)
  return out
}

/** Module-level caches of shared GPU resources (the toon kit registers its own). */
const sharedCaches = new Set<() => Iterable<Disposable>>()

/** Register a cache whose resources are released whenever a canvas goes away. */
export function registerSharedGpuCache(list: () => Iterable<Disposable>): void {
  sharedCaches.add(list)
}

/**
 * A canvas is going away while others keep drawing (a small modal canvas over
 * the World): dispose only what its scene holds that none of the `keep` scenes
 * use. Disposing is global (every renderer drops its copy), so a shared material
 * the World still draws must not be touched — the World would recompile and
 * re-upload it mid-game. Shared caches are released later, with the last canvas.
 */
export function releaseUnshared(scene: Object3D, keep: readonly Object3D[]): number {
  const mine = collectGpuResources(scene)
  const kept = new Set<Disposable>()
  for (const k of keep) collectGpuResources(k, kept)
  let n = 0
  for (const r of mine) {
    if (kept.has(r)) continue
    n++
    try {
      r.dispose()
    } catch {
      // already released
    }
  }
  return n
}

/** Dispose (= release from every renderer) a scene's resources plus every shared cache. */
export function releaseGpuResources(scene: Object3D | null): number {
  const all = scene ? collectGpuResources(scene) : new Set<Disposable>()
  for (const list of sharedCaches) for (const r of list()) all.add(r)
  for (const r of all) {
    try {
      r.dispose()
    } catch {
      // a resource that can't dispose twice is already released
    }
  }
  return all.size
}
