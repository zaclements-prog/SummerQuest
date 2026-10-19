import { BufferAttribute, BufferGeometry, Box3, Color, Matrix3, Matrix4, Mesh, MeshToonMaterial, Object3D, Sphere, Vector3 } from 'three'
import type { Material, Texture } from 'three'
import { registerSharedGpuCache } from '../platform/gl/release'
import { isTouchFirst } from '../platform/gl/deviceClass'

/**
 * Automatic static batching for toon scenery.
 *
 * The World is built from thousands of small toon meshes (every window frame,
 * shingle and flower box is its own <TBox>), which made ~600 draw calls on
 * "Fast" and ~1500 on "Pretty" (shadow pass included) — far too many for a
 * phone or tablet. A `Batcher` watches one subtree, and every toon mesh in it
 * that holds still is baked into a few merged meshes (one per material look:
 * the per-mesh colour moves into vertex colours), plus one merged outline hull
 * per outline material. The originals stay in the scene graph — React still
 * owns them — but are taken off every camera's layers.
 *
 * Animated things batch too: the batcher notes which groups animate (their
 * own position / rotation / scale changes between scans) and merges the parts
 * riding rigidly on the same animated group — a bobbing NPC's head, ears and
 * eyes — into meshes added under that group, so they still move with it.
 *
 * It is safe to wrap scenery that also contains moving parts: a source that
 * shifts relative to its anchor, changes material or geometry, is hidden,
 * unmounted or gains/loses its outline is handed back to normal rendering
 * within a few frames (and re-batched once it holds still); a mesh that itself
 * animates is never batched. Interactive meshes (with pointer handlers, or
 * under a group that has them), transparent materials that write depth,
 * texture-mapped materials, instanced/skinned meshes and custom render hooks
 * are never batched.
 *
 * A batched leaf (no children but its own outline hull) is also *frozen*: three.js
 * stops re-composing its matrices every frame (`matrixAutoUpdate` /
 * `matrixWorldAutoUpdate` off), since it never draws. In the World that is ~1500
 * meshes, a big share of a slow tablet's frame. The round-robin re-check composes
 * its local matrix itself, so a move is still caught; handing it back unfreezes it.
 *
 * Once it no longer draws, a frozen leaf that React owns is also *detached*: taken
 * out of its parent's `children` (its `parent` link stays), so three.js doesn't even
 * visit it when it walks the scene each frame. React Three Fiber copes with a child
 * missing from that list (removing it is a no-op; re-ordering puts it back), and on
 * unmount it deletes the object's `__r3f`, which is how the re-check notices; an
 * unmounted source is let go without being put back. Plain three.js scenes (no
 * `__r3f`) are only frozen.
 */

// ── Pure merge ──────────────────────────────────────────────────────────────

export interface MergePart {
  geometry: BufferGeometry
  /** Transform baked into the vertices. */
  matrix: Matrix4
  /** Vertex colour for every vertex of this part (linear), when merging with colours. */
  color?: Color
}

const _nm = new Matrix3()

function attr3(g: BufferGeometry, name: string): BufferAttribute | null {
  const a = g.getAttribute(name) as BufferAttribute | undefined
  return a && a.itemSize === 3 ? a : null
}

/** A part can be merged if it has plain 3-component positions and normals and draws in full. */
export function mergeable(g: BufferGeometry): boolean {
  if (!attr3(g, 'position') || !attr3(g, 'normal')) return false
  // (geometry groups only matter with a material array, which batchKey rejects)
  if (g.morphAttributes.position?.length) return false
  const r = g.drawRange
  return r.start === 0 && r.count === Infinity
}

/** The plain float array behind an attribute, or null when it is interleaved / normalized / not float. */
function plainArray(a: BufferAttribute): Float32Array | null {
  const any = a as BufferAttribute & { isInterleavedBufferAttribute?: boolean }
  return !any.isInterleavedBufferAttribute && !a.normalized && a.array instanceof Float32Array ? a.array : null
}

/**
 * Bake `parts` into one indexed geometry (position, normal, and colour when
 * `withColor`). Mirrored transforms (negative determinant) get their triangle
 * winding flipped so front faces stay front faces.
 *
 * Normals go through the normal matrix (what lighting uses) — or, with
 * `hullNormals`, through the plain model matrix, which is what the outline
 * shader pushes the hull along, so a merged hull matches the separate ones.
 */
export function mergeParts(parts: readonly MergePart[], withColor: boolean, hullNormals = false): BufferGeometry {
  let verts = 0
  let idx = 0
  for (const p of parts) {
    const n = p.geometry.getAttribute('position').count
    verts += n
    idx += p.geometry.index ? p.geometry.index.count : n
  }
  const pos = new Float32Array(verts * 3)
  const nor = new Float32Array(verts * 3)
  const col = withColor ? new Float32Array(verts * 3) : null
  const index = verts > 65535 ? new Uint32Array(idx) : new Uint16Array(idx)
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  let vo = 0
  let io = 0
  for (const p of parts) {
    const g = p.geometry
    const P = g.getAttribute('position') as BufferAttribute
    const N = g.getAttribute('normal') as BufferAttribute
    const n = P.count
    const e = p.matrix.elements
    if (hullNormals) _nm.setFromMatrix4(p.matrix)
    else _nm.getNormalMatrix(p.matrix)
    const m = _nm.elements
    const pa = plainArray(P)
    const na = plainArray(N)
    for (let i = 0; i < n; i++) {
      let x: number, y: number, z: number, nx: number, ny: number, nz: number
      if (pa) {
        x = pa[i * 3]
        y = pa[i * 3 + 1]
        z = pa[i * 3 + 2]
      } else {
        x = P.getX(i)
        y = P.getY(i)
        z = P.getZ(i)
      }
      if (na) {
        nx = na[i * 3]
        ny = na[i * 3 + 1]
        nz = na[i * 3 + 2]
      } else {
        nx = N.getX(i)
        ny = N.getY(i)
        nz = N.getZ(i)
      }
      const k = (vo + i) * 3
      const wx = e[0] * x + e[4] * y + e[8] * z + e[12]
      const wy = e[1] * x + e[5] * y + e[9] * z + e[13]
      const wz = e[2] * x + e[6] * y + e[10] * z + e[14]
      pos[k] = wx
      pos[k + 1] = wy
      pos[k + 2] = wz
      if (wx < minX) minX = wx
      if (wy < minY) minY = wy
      if (wz < minZ) minZ = wz
      if (wx > maxX) maxX = wx
      if (wy > maxY) maxY = wy
      if (wz > maxZ) maxZ = wz
      const tx = m[0] * nx + m[3] * ny + m[6] * nz
      const ty = m[1] * nx + m[4] * ny + m[7] * nz
      const tz = m[2] * nx + m[5] * ny + m[8] * nz
      const len = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1
      nor[k] = tx / len
      nor[k + 1] = ty / len
      nor[k + 2] = tz / len
      if (col && p.color) {
        col[k] = p.color.r
        col[k + 1] = p.color.g
        col[k + 2] = p.color.b
      }
    }
    const flip = p.matrix.determinant() < 0
    const src = g.index
    const ia = src ? src.array : null
    const count = src ? src.count : n
    for (let i = 0; i < count; i += 3) {
      const a = ia ? ia[i] : i
      const b = ia ? ia[i + 1] : i + 1
      const c = ia ? ia[i + 2] : i + 2
      index[io + i] = vo + a
      index[io + i + 1] = vo + (flip ? c : b)
      index[io + i + 2] = vo + (flip ? b : c)
    }
    vo += n
    io += count
  }
  const out = new BufferGeometry()
  out.setAttribute('position', new BufferAttribute(pos, 3))
  out.setAttribute('normal', new BufferAttribute(nor, 3))
  if (col) out.setAttribute('color', new BufferAttribute(col, 3))
  out.setIndex(new BufferAttribute(index, 1))
  // bounds from the loop above (three's compute* would walk every vertex again, twice)
  if (verts > 0) {
    out.boundingBox = new Box3(new Vector3(minX, minY, minZ), new Vector3(maxX, maxY, maxZ))
    const c = out.boundingBox.getCenter(new Vector3())
    let r2 = 0
    for (let k = 0; k < pos.length; k += 3) {
      const dx = pos[k] - c.x
      const dy = pos[k + 1] - c.y
      const dz = pos[k + 2] - c.z
      const d = dx * dx + dy * dy + dz * dz
      if (d > r2) r2 = d
    }
    out.boundingSphere = new Sphere(c, Math.sqrt(r2))
  } else {
    out.computeBoundingBox()
    out.computeBoundingSphere()
  }
  return out
}

// ── Which meshes may be batched ─────────────────────────────────────────────

type R3FObject = Object3D & { __r3f?: { eventCount?: number } }

const baseBeforeRender = Object3D.prototype.onBeforeRender

/** The material-look key a toon mesh merges under, or null if it can't be batched. */
export function batchKey(mesh: Mesh): string | null {
  const m = mesh.material as Material | Material[]
  if (Array.isArray(m)) return null
  const t = m as MeshToonMaterial
  if (!t.isMeshToonMaterial || !t.visible) return null
  // Opaque looks, or see-through ones that don't write depth (faded building
  // shells: blending order inside one merged mesh can't show there).
  const see = t.transparent || t.opacity < 1
  if (see ? !t.transparent || t.depthWrite : !t.depthWrite) return null
  if (t.alphaTest > 0 || !t.depthTest) return null
  if (t.map || t.alphaMap || t.emissiveMap || t.normalMap || t.bumpMap || t.displacementMap || t.lightMap || t.aoMap) return null
  if (t.vertexColors || (t.clippingPlanes && t.clippingPlanes.length)) return null
  return [
    see ? `t${t.opacity.toFixed(3)}` : 'o',
    t.side,
    t.emissive.getHexString(),
    t.emissiveIntensity.toFixed(3),
    t.gradientMap?.uuid ?? '-',
    t.fog ? 'f' : '',
    t.wireframe ? 'w' : '',
    mesh.castShadow ? 'c' : '',
    mesh.receiveShadow ? 'r' : '',
  ].join('|')
}

/** A plain, static-looking mesh (no handlers, hooks, instancing, skinning or special order). */
function plainMesh(o: Object3D): o is Mesh {
  const m = o as Mesh & { isInstancedMesh?: boolean; isSkinnedMesh?: boolean; isBatchedMesh?: boolean }
  if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || m.isBatchedMesh) return false
  if (m.userData.toonOutlineHull || m.userData.batched || m.userData.noBatch) return false
  if (m.renderOrder !== 0 || !m.frustumCulled || m.onBeforeRender !== baseBeforeRender) return false
  if (m.morphTargetInfluences?.length) return false
  return true
}

/** The outline hull drawn as a child of `mesh` (see toon/outline.tsx), if any. */
export function hullOf(mesh: Object3D): Mesh | null {
  for (const c of mesh.children) {
    if ((c as Mesh).userData?.toonOutlineHull) return c as Mesh
    for (const cc of c.children) if ((cc as Mesh).userData?.toonOutlineHull) return cc as Mesh
  }
  return null
}

/** Visible all the way up to `root`, and still attached under it? */
function attachedAndVisible(o: Object3D, root: Object3D): boolean {
  let p: Object3D | null = o
  while (p) {
    if (!p.visible) return false
    if (p === root) return true
    p = p.parent
  }
  return false
}

/** Pointer handlers on the mesh or any ancestor below the scene (taps must keep hitting it). */
function interactive(o: Object3D): boolean {
  let p: Object3D | null = o
  while (p) {
    if ((p as R3FObject).__r3f?.eventCount) return true
    p = p.parent
  }
  return false
}

// ── Merged materials (one per look) ─────────────────────────────────────────

const mergedMaterials = new Map<string, MeshToonMaterial>()
registerSharedGpuCache(() => mergedMaterials.values())

function mergedMaterial(key: string, like: MeshToonMaterial): MeshToonMaterial {
  const k = `${key}|${like.gradientMap?.uuid ?? '-'}`
  let m = mergedMaterials.get(k)
  if (!m) {
    m = new MeshToonMaterial({
      color: 0xffffff,
      vertexColors: true,
      gradientMap: like.gradientMap as Texture | null,
      side: like.side,
      fog: like.fog,
      transparent: like.transparent,
      opacity: like.opacity,
      depthWrite: like.depthWrite,
    })
    m.emissive.copy(like.emissive)
    m.emissiveIntensity = like.emissiveIntensity
    mergedMaterials.set(k, m)
  }
  return m
}

// ── The batcher ─────────────────────────────────────────────────────────────

interface Source {
  mesh: Mesh
  key: string
  material: Material
  geometry: BufferGeometry
  hull: Mesh | null
  /** The nearest animated ancestor it rides on (null = still in the world). */
  anchor: Object3D | null
  /** The mesh and every node up to (not including) the anchor, with their local matrices when baked. */
  chain: Object3D[]
  locals: Float64Array[]
  /** merged groups it is part of (body, and outline hull if any) */
  body: string
  hullGroup: string | null
  /** the original layer masks, restored when handed back */
  mask: number
  hullMask: number
  /** its matrices are frozen while batched (a leaf: no children but its hull) */
  frozen: boolean
  /** React Three Fiber owns it (it had `__r3f` when batched) */
  r3f: boolean
  /** taken out of its parent's children while it doesn't draw (see the module note) */
  detached: boolean
}

interface MergeGroup {
  parent: Object3D
  /** body: the look's key; hull: the outline material */
  key: string
  hull: Material | null
  sources: Set<Source>
  mesh: Mesh | null
}

/** Batcher tuning. */
export const BATCH = {
  /** Time between scans for new (or newly still) meshes: quick at first, then relaxed (ms). */
  firstScansMs: 300,
  scanMs: 1000,
  /** …and at least this many rendered frames between scans, so motion can show. */
  scanFrames: 3,
  /**
   * Sources re-checked per frame (round robin), so a big area costs the same as a
   * small one. Fewer on phones and tablets (slow CPUs, ~15 areas each checking): a
   * 150-mesh area is still fully re-checked about every 10 frames.
   */
  checksPerFrame: isTouchFirst() ? 16 : 48,
  /** A mesh handed back this many times (its own parts keep shifting) is never batched again… */
  maxChanges: 6,
  /** …nor one that swapped its material this many times (fading walls swap twice per visit). */
  maxSwaps: 24,
  /**
   * Merging is spread over frames (ms of merge work per frame, at least one group):
   * on a slow tablet a whole area merged in one frame is a visible hitch. Until its
   * group is merged a mesh simply keeps drawing on its own.
   */
  flushBudgetMs: 6,
} as const

function dropArray(this: BufferAttribute) {
  ;(this as { array: unknown }).array = null
}
const noRaycast = () => {}

const sameMatrix = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  for (let i = 0; i < 16; i++) if (a[i] !== b[i]) return false
  return true
}

/** A leaf (no children but its hull) whose matrices three.js composes itself (not set by hand). */
function freezable(mesh: Mesh, hull: Mesh | null): boolean {
  const kids = mesh.children
  if (!(kids.length === 0 || (kids.length === 1 && kids[0] === hull))) return false
  return [mesh, hull].every((o) => !o || (o.matrixAutoUpdate && o.matrixWorldAutoUpdate))
}

/** Freeze (or unfreeze) a batched leaf's matrices, and its hull's. */
function setFrozen(s: Source, on: boolean) {
  for (const o of s.hull ? [s.mesh, s.hull] : [s.mesh]) {
    o.matrixAutoUpdate = !on
    o.matrixWorldAutoUpdate = !on
    o.userData.batchFrozen = on || undefined
    // thawed: three.js recomposes it before the next render
    if (!on) o.matrixWorldNeedsUpdate = true
  }
}

/**
 * `o`'s current world matrix, like `updateWorldMatrix(true, false)` but also through
 * frozen nodes (three.js skips those, so their matrixWorld can be out of date).
 */
function worldMatrix(o: Object3D): Matrix4 {
  const p = o.parent
  if (p) {
    if (p.userData.batchFrozen) worldMatrix(p)
    else p.updateWorldMatrix(true, false)
  }
  if (o.matrixAutoUpdate || o.userData.batchFrozen) o.updateMatrix()
  if (p) o.matrixWorld.multiplyMatrices(p.matrixWorld, o.matrix)
  else o.matrixWorld.copy(o.matrix)
  return o.matrixWorld
}

let batcherCount = 0

/**
 * Merges the toon meshes under `root` (see the module note). Still scenery goes
 * into meshes under `out`; a part of something animated (an NPC bobbing, a
 * windmill turning) is merged with the other parts riding on the same animated
 * group, and that merged mesh is added under the group so it moves with it.
 * Only the merged groups touched by a change are rebuilt.
 */
export class Batcher {
  private sources = new Map<Mesh, Source>()
  /** round-robin order for re-checks */
  private order: Source[] = []
  private cursor = 0
  private groups = new Map<string, MergeGroup>()
  private dirty = new Set<string>()
  /** dirty groups that lost a source: rebuilt this frame, or its old copy would linger as a ghost */
  private urgent = new Set<string>()
  /** local matrices of every node at the last scan (arrays reused between scans) */
  private locals = new Map<Object3D, Float64Array>()
  /** nodes seen animating (their own position / rotation / scale changed) */
  private animated = new WeakSet<Object3D>()
  /** candidates that held still (relative to their anchor) between the last two scans */
  private ready: { mesh: Mesh; anchor: Object3D | null; chain: Object3D[] }[] = []
  private changes = new WeakMap<Object3D, number>()
  private swaps = new WeakMap<Object3D, number>()
  private framesSinceScan = 0
  private lastScan: number
  private scans = 0
  private readonly root: Object3D
  private readonly out: Object3D
  /** batched source count (for dev checks) */
  get batchedCount(): number {
    return this.sources.size
  }
  constructor(root: Object3D, out: Object3D) {
    this.root = root
    this.out = out
    // stagger batchers so their scans don't all land on the same frame
    this.lastScan = -Infinity
    this.framesSinceScan = -(batcherCount++ % 8)
  }

  /** Call once per frame (before render) with the current time in ms. */
  tick(now: number): void {
    this.framesSinceScan++
    if (this.order.length) this.validate(BATCH.checksPerFrame)
    const wait = this.scans < 3 ? BATCH.firstScansMs : BATCH.scanMs
    if (this.framesSinceScan >= BATCH.scanFrames && now - this.lastScan >= wait) {
      this.framesSinceScan = 0
      this.lastScan = now
      this.scans++
      if (this.scan()) this.adopt()
    }
    if (this.dirty.size) this.flush()
  }

  /** Give every source back to normal rendering and drop the merged meshes. */
  dispose(): void {
    for (const s of this.sources.values()) this.restore(s, !s.r3f || !!(s.mesh as R3FObject).__r3f)
    this.sources.clear()
    this.order = []
    this.locals.clear()
    this.ready = []
    for (const g of this.groups.values()) this.dropMesh(g)
    this.groups.clear()
    this.dirty.clear()
    this.urgent.clear()
  }

  private settledOut(o: Object3D) {
    return (this.changes.get(o) ?? 0) >= BATCH.maxChanges || (this.swaps.get(o) ?? 0) >= BATCH.maxSwaps
  }

  /** Re-check up to `budget` batched sources (round robin); hand back any that changed. */
  private validate(budget: number) {
    const n = Math.min(budget, this.order.length)
    let removed = false
    for (let k = 0; k < n; k++) {
      if (this.cursor >= this.order.length) this.cursor = 0
      const s = this.order[this.cursor++]
      if (!this.sources.has(s.mesh)) continue
      const mesh = s.mesh
      // (a frozen leaf's matrix isn't composed by three.js: do it here)
      if (s.frozen) mesh.updateMatrix()
      // A shift between the mesh and its anchor (or a new geometry) hands it back and
      // counts toward "never batch". A material swap (a building fading as you walk
      // in), a visibility toggle, an outline coming or going (graphics switch) or an
      // unmount just hands it back for now: it is batched again once it holds still.
      let moved = mesh.geometry !== s.geometry
      for (let i = 0; !moved && i < s.chain.length; i++) moved = !sameMatrix(s.chain[i].matrix.elements, s.locals[i])
      const swapped = mesh.material !== s.material
      // (React deletes `__r3f` on unmount: a detached mesh can't tell by its parent link)
      const unmounted = s.r3f && !(mesh as R3FObject).__r3f
      if (unmounted) {
        this.release(s, false)
        removed = true
        continue
      }
      const attached = attachedAndVisible(mesh, this.root) && (!s.anchor || attachedAndVisible(s.anchor, this.root))
      const hull = hullOf(mesh)
      if (moved || swapped || !attached || hull !== s.hull || (hull && hull.material !== s.hull?.material)) {
        if (moved) this.changes.set(mesh, (this.changes.get(mesh) ?? 0) + 1)
        else if (swapped) this.swaps.set(mesh, (this.swaps.get(mesh) ?? 0) + 1)
        this.release(s)
        removed = true
      }
    }
    if (removed) {
      this.order = this.order.filter((s) => this.sources.has(s.mesh))
      if (this.cursor > this.order.length) this.cursor = 0
    }
  }

  /**
   * Note which nodes animate, and find candidates that held still relative to
   * their anchor since the last scan. True if any are ready to batch.
   */
  private scan(): boolean {
    const seen = new Map<Object3D, Float64Array>()
    this.root.updateMatrixWorld()
    this.root.traverse((o) => {
      if (o.userData.batched) return
      const e = o.matrix.elements
      let snap = this.locals.get(o)
      if (snap) {
        if (!sameMatrix(snap, e)) this.animated.add(o)
        snap.set(e)
      } else snap = Float64Array.from(e)
      seen.set(o, snap)
    })
    const known = this.locals
    this.locals = seen
    const ready: Batcher['ready'] = []
    this.root.traverse((o) => {
      if (!plainMesh(o) || this.sources.has(o) || !known.has(o) || this.settledOut(o)) return
      if (this.animated.has(o) || !attachedAndVisible(o, this.root) || interactive(o)) return
      if (!batchKey(o) || !mergeable(o.geometry)) return
      const hull = hullOf(o)
      if (hull && !mergeable(hull.geometry)) return
      // ride on the nearest animated ancestor (if any); every node in between must be still
      const chain: Object3D[] = [o]
      let anchor: Object3D | null = null
      for (let p = o.parent; p && p !== this.root; p = p.parent) {
        if (this.animated.has(p)) {
          anchor = p
          break
        }
        chain.push(p)
      }
      ready.push({ mesh: o, anchor, chain })
    })
    this.ready = ready
    return ready.length > 0
  }

  /** Take every ready candidate into the batch (hidden now, merged on flush). */
  private adopt() {
    for (const { mesh, anchor, chain } of this.ready) {
      if (this.sources.has(mesh)) continue
      const key = batchKey(mesh)
      if (!key || !chain.every((n) => !this.animated.has(n))) continue
      const hull = hullOf(mesh)
      const parent = anchor ?? this.out
      const body = `${parent.id}|${key}`
      const hullGroup = hull ? `${parent.id}|hull|${(hull.material as Material).uuid}` : null
      const s: Source = {
        mesh,
        key,
        material: mesh.material as Material,
        geometry: mesh.geometry,
        hull,
        anchor,
        chain,
        locals: chain.map((n) => Float64Array.from(n.matrix.elements)),
        body,
        hullGroup,
        mask: mesh.layers.mask,
        hullMask: hull ? hull.layers.mask : 0,
        frozen: freezable(mesh, hull),
        r3f: !!(mesh as R3FObject).__r3f,
        detached: false,
      }
      if (s.frozen) setFrozen(s, true)
      this.sources.set(mesh, s)
      this.order.push(s)
      this.join(body, parent, key, null, s)
      if (hull && hullGroup) this.join(hullGroup, parent, key, hull.material as Material, s)
      // (it keeps drawing on its own until its group is merged: see flush)
    }
    this.ready = []
  }

  private join(id: string, parent: Object3D, key: string, hull: Material | null, s: Source) {
    let g = this.groups.get(id)
    if (!g) this.groups.set(id, (g = { parent, key, hull, sources: new Set(), mesh: null }))
    g.sources.add(s)
    this.dirty.add(id)
  }

  /** Hand a source back to normal rendering (or just let go of an unmounted one); its merged groups are rebuilt on flush. */
  private release(s: Source, reattach = true) {
    this.restore(s, reattach)
    this.sources.delete(s.mesh)
    for (const id of [s.body, s.hullGroup]) {
      if (!id) continue
      this.groups.get(id)?.sources.delete(s)
      this.dirty.add(id)
      this.urgent.add(id)
    }
  }

  private restore(s: Source, reattach = true) {
    s.mesh.layers.mask = s.mask
    if (s.hull) s.hull.layers.mask = s.hullMask
    if (s.frozen) setFrozen(s, false)
    if (s.detached) {
      s.detached = false
      const p = s.mesh.parent
      // (an unmounted mesh stays out: putting it back would leave a ghost)
      if (reattach && p && !p.children.includes(s.mesh)) p.children.push(s.mesh)
    }
  }

  /** Take a frozen, React-owned source out of its parent's children once nothing of it draws. */
  private detach(s: Source) {
    if (s.detached || !s.frozen || !s.r3f || s.mesh.layers.mask !== 0 || (s.hull && s.hull.layers.mask !== 0)) return
    const kids = s.mesh.parent?.children
    const i = kids ? kids.indexOf(s.mesh) : -1
    if (i < 0) return
    kids!.splice(i, 1)
    s.detached = true
  }

  private dropMesh(g: MergeGroup) {
    if (!g.mesh) return
    g.mesh.parent?.remove(g.mesh)
    g.mesh.geometry.dispose()
    g.mesh = null
  }

  /** Rebuild the merged meshes of every group that changed. */
  /**
   * Rebuild dirty merged meshes: groups that lost a source first and all at once,
   * then the rest within `BATCH.flushBudgetMs` (the others wait for later frames).
   * Each group's sources stop drawing on their own the moment its merged mesh is
   * placed, so nothing ever blinks out or draws twice.
   */
  private flush() {
    const end = performance.now() + BATCH.flushBudgetMs
    const inverses = new Map<Object3D, Matrix4>()
    const queue = [...this.urgent, ...[...this.dirty].filter((id) => !this.urgent.has(id))]
    let merged = 0
    for (const id of queue) {
      if (!this.urgent.has(id) && merged > 0 && performance.now() > end) break
      this.dirty.delete(id)
      this.urgent.delete(id)
      const g = this.groups.get(id)
      if (!g) continue
      merged++
      this.dropMesh(g)
      if (g.sources.size === 0) {
        this.groups.delete(id)
        continue
      }
      let inv = inverses.get(g.parent)
      if (!inv) {
        g.parent.updateWorldMatrix(true, false)
        inv = new Matrix4().copy(g.parent.matrixWorld).invert()
        inverses.set(g.parent, inv)
      }
      const parts: MergePart[] = []
      let like: MeshToonMaterial | null = null
      let cast = false
      let receive = false
      for (const s of g.sources) {
        const o = g.hull ? s.hull! : s.mesh
        worldMatrix(o)
        const color = g.hull ? undefined : (s.material as MeshToonMaterial).color
        parts.push({ geometry: o.geometry, matrix: new Matrix4().multiplyMatrices(inv, o.matrixWorld), color })
        if (!like) {
          like = s.material as MeshToonMaterial
          cast = s.mesh.castShadow
          receive = s.mesh.receiveShadow
        }
      }
      const mesh = g.hull
        ? new Mesh(mergeParts(parts, false, true), g.hull)
        : new Mesh(mergeParts(parts, true), mergedMaterial(g.key, like!))
      if (!g.hull) {
        mesh.castShadow = cast
        mesh.receiveShadow = receive
      }
      g.mesh = this.place(g.parent, mesh)
      for (const s of g.sources) {
        if (g.hull) {
          if (s.hull) s.hull.layers.mask = 0
        } else s.mesh.layers.mask = 0
        this.detach(s)
      }
    }
  }

  /**
   * Add a merged mesh under `parent`, re-centred on its bounds: transparent
   * objects are sorted by their position, so a faded shell must sit where its
   * geometry is.
   */
  private place(parent: Object3D, mesh: Mesh): Mesh {
    const g = mesh.geometry
    const c = g.boundingSphere!.center.clone()
    // (by hand: BufferGeometry.translate would also re-walk normals and bounds)
    const pos = g.getAttribute('position').array as Float32Array
    for (let k = 0; k < pos.length; k += 3) {
      pos[k] -= c.x
      pos[k + 1] -= c.y
      pos[k + 2] -= c.z
    }
    g.boundingSphere!.center.set(0, 0, 0)
    g.boundingBox?.translate(c.clone().negate())
    // Merged vertex data is only needed by the GPU: drop the JS copy once it is
    // uploaded (a rebuild makes fresh arrays; a lost context remounts the canvas).
    for (const a of Object.values(g.attributes)) (a as BufferAttribute).onUpload(dropArray)
    g.index?.onUpload(dropArray)
    // never a tap target (interactive meshes aren't batched), so never raycast
    mesh.raycast = noRaycast
    mesh.position.copy(c)
    mesh.updateMatrix()
    mesh.matrixAutoUpdate = false
    mesh.userData.batched = true
    parent.add(mesh)
    return mesh
  }
}
