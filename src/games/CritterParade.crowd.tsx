/* eslint-disable react-refresh/only-export-components -- the crowd module co-locates its flock driver with the meshes it drives; not an HMR boundary */
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { CircleGeometry, InstancedMesh, MeshBasicMaterial } from 'three'
import type { Group, Material, MeshToonMaterial } from 'three'
import { creatureBuilder } from '../home/models/registry'
import { WalkStateContext, newWalkState } from '../home/models/walkState'
import { bakeModel, glowToonMaterial, type BakedModel } from '../toon/bake'
import { registerSharedGpuCache } from '../platform/gl/release'
import { slotOffset, formationDepth } from '../lib/parade'
import { CAGE_MAX, TRACK_HALF } from './CritterParade.layout'

/**
 * The parade's crowds, drawn cheaply (plan rule 10, the Fire budget):
 *
 * - every species' BABY model is baked once into a single vertex-coloured
 *   geometry (`toon/bake.ts`), at first sight, one species per frame;
 * - each species is ONE InstancedMesh; the waddle, bob, pop-in and tug lean
 *   are per-instance matrices written in a single loop (no skinning, no React
 *   state per frame, no allocations);
 * - followers stand in a sunflower spiral behind the leader (≤ 150 shown;
 *   the true count is on the badge), the ghost parade reuses the bakes with a
 *   see-through material, and the Grumble Gang is two more baked meshes
 *   (grumpy and cheered-up).
 * - outlines (Pretty only) are one instanced hull per species sharing the
 *   body's instance matrices; Fast draws none.
 */

// ── baking ──────────────────────────────────────────────────────────────────

/** Baked models by key, and whether they were baked with outlines on (Pretty). */
const bakeCache = new Map<string, { baked: BakedModel; outlined: boolean }>()
registerSharedGpuCache(() => {
  const out = []
  for (const { baked } of bakeCache.values()) {
    out.push(baked.body)
    if (baked.hull) out.push(baked.hull)
  }
  return out
})

const STILL = newWalkState()

/**
 * A cached bake (or null). `withHull` asks for one baked while outlines were on
 * (a model with no inked parts simply has no hull either way).
 */
export function cachedBake(key: string, withHull: boolean): BakedModel | null {
  const b = bakeCache.get(key)
  if (!b) return null
  return withHull && !b.outlined ? null : b.baked
}

/**
 * Mounts `children` hidden, lets one frame of their own animation settle the
 * rest pose (curled tentacles, folded wings), bakes them and reports back.
 */
function BakeOne({ id, outlined, onBaked, children }: { id: string; outlined: boolean; onBaked: (id: string, b: BakedModel) => void; children: ReactNode }) {
  const ref = useRef<Group>(null)
  const frames = useRef(0)
  const done = useRef(false)
  useFrame(() => {
    if (done.current || !ref.current) return
    if (++frames.current < 2) return
    done.current = true
    const baked = bakeModel(ref.current, { maxSegments: 8 })
    bakeCache.set(id, { baked, outlined })
    onBaked(id, baked)
  })
  return (
    <group ref={ref} visible={false}>
      <WalkStateContext.Provider value={STILL}>{children}</WalkStateContext.Provider>
    </group>
  )
}

export interface BakeJob {
  key: string
  node: ReactNode
}

/** The baby model of a species, for baking. */
export function babyJob(species: string): BakeJob {
  const Builder = creatureBuilder(species)
  return { key: `baby:${species}`, node: <Builder stage="baby" /> }
}

/**
 * Bakes the jobs one per frame (first ones first) and returns what's baked so
 * far. Cached across visits; a bake made on Fast (no outline hulls) is re-made
 * when Pretty needs hulls.
 */
export function useBakes(jobs: BakeJob[], withHull: boolean): { bakes: Map<string, BakedModel>; queue: ReactNode } {
  // the bakes live in the module cache; a finished bake just re-renders
  const [, bump] = useState(0)
  const bakes = new Map<string, BakedModel>()
  for (const j of jobs) {
    const c = cachedBake(j.key, withHull)
    if (c) bakes.set(j.key, c)
  }
  const next = jobs.find((j) => !bakes.has(j.key))
  const queue = next ? (
    <BakeOne key={`${next.key}|${withHull}`} id={next.key} outlined={withHull} onBaked={() => bump((n) => n + 1)}>
      {next.node}
    </BakeOne>
  ) : null
  return { bakes, queue }
}

// ── matrices ────────────────────────────────────────────────────────────────

/**
 * Write a TRS matrix (Euler order YXZ: yaw, then pitch, then roll) straight
 * into an instance-matrix array: no Object3D, no allocation.
 */
export function writeTRS(te: Float32Array, o: number, x: number, y: number, z: number, pitch: number, yaw: number, roll: number, sx: number, sy: number, sz: number) {
  const ca = Math.cos(pitch)
  const sa = Math.sin(pitch)
  const cb = Math.cos(yaw)
  const sb = Math.sin(yaw)
  const cc = Math.cos(roll)
  const sc = Math.sin(roll)
  te[o] = (cc * cb + sc * sb * sa) * sx
  te[o + 1] = sc * ca * sx
  te[o + 2] = (-cc * sb + sc * cb * sa) * sx
  te[o + 3] = 0
  te[o + 4] = (-sc * cb + cc * sb * sa) * sy
  te[o + 5] = cc * ca * sy
  te[o + 6] = (sc * sb + cc * cb * sa) * sy
  te[o + 7] = 0
  te[o + 8] = sb * ca * sz
  te[o + 9] = -sa * sz
  te[o + 10] = cb * ca * sz
  te[o + 11] = 0
  te[o + 12] = x
  te[o + 13] = y
  te[o + 14] = z
  te[o + 15] = 1
}

/** Zero a slot (draws nothing). */
function hideSlot(te: Float32Array, o: number) {
  for (let k = 0; k < 16; k++) te[o + k] = 0
}

const easeOutBack = (k: number) => {
  const c = 1.9
  const t = k - 1
  return 1 + (c + 1) * t * t * t + c * t * t
}

// ── the flock (one crowd's per-member state) ────────────────────────────────

export type FlockMode = 'march' | 'idle' | 'tug' | 'cheer' | 'sit'

/** What the scene tells the followers each frame. */
export interface FollowerInput {
  leaderX: number
  leaderZ: number
  speed: number
  mode: FlockMode
  /** 0–1: narrow the column to squeeze through a gate. */
  squeeze: number
  /** Where a squeezed column funnels (the leader's lane). */
  laneX: number
  /** Tug-of-war: everyone leans back (0–1) and the line shifts along z. */
  lean: number
  shift: number
  t: number
}

const ST_NONE = 0
const ST_ACTIVE = 1
const ST_LEAVING = 2
const ST_CAGED = 3
const ST_JOINING = 4

/** Mutable state of up to `cap` crowd members (slots fixed: member i is formation slot i). */
export class Flock {
  readonly cap: number
  readonly species: number
  x: Float32Array
  z: Float32Array
  age: Float32Array
  st: Uint8Array
  ph: Float32Array
  vx: Float32Array
  /** side a leaving member walks off to */
  side: Float32Array
  /** slots in use, [0, alive) */
  alive = 0
  /** members that should be standing in the parade */
  shown = 0
  /** cage spot for caged members */
  cageX = 0
  cageZ = 0
  /** set while the gang cheers and runs over to join */
  joinX = 0
  joinZ = 0
  meshes: (InstancedMesh | null)[] = []
  hulls: (InstancedMesh | null)[] = []
  shadow: InstancedMesh | null = null

  constructor(cap: number, species: number) {
    this.cap = cap
    this.species = species
    this.x = new Float32Array(cap)
    this.z = new Float32Array(cap)
    this.age = new Float32Array(cap)
    this.st = new Uint8Array(cap)
    this.ph = new Float32Array(cap)
    this.vx = new Float32Array(cap)
    this.side = new Float32Array(cap)
    for (let i = 0; i < cap; i++) this.ph[i] = (i * 2.399) % (Math.PI * 2)
  }

  /** Show `n` members, new ones popping in around (sx, sz); extra ones wander off. */
  setShown(n: number, sx: number, sz: number) {
    n = Math.max(0, Math.min(n, this.cap))
    for (let i = this.shown; i < n; i++) {
      if (this.st[i] === ST_CAGED) {
        this.st[i] = ST_ACTIVE
        continue
      }
      this.st[i] = ST_ACTIVE
      this.age[i] = -Math.min(0.9, (i - this.shown) * 0.035) // staggered pop
      this.x[i] = sx + (((i * 37) % 11) / 11 - 0.5) * 2.2
      this.z[i] = sz + (((i * 53) % 7) / 7) * 1.4
    }
    for (let i = n; i < this.shown; i++) {
      if (this.st[i] === ST_ACTIVE) {
        this.st[i] = ST_LEAVING
        this.side[i] = this.x[i] >= 0 ? 1 : -1
      }
    }
    this.shown = n
    this.alive = Math.max(this.alive, n)
  }

  /** Put `n` members (after the shown ones) in a cage at (cx, cz). */
  cage(n: number, cx: number, cz: number) {
    this.cageX = cx
    this.cageZ = cz
    const end = Math.min(this.cap, this.shown + Math.min(n, CAGE_MAX))
    for (let i = this.shown; i < end; i++) {
      this.st[i] = ST_CAGED
      this.age[i] = 1
      const a = (i - this.shown) * 2.4
      const r = 0.25 + 0.17 * Math.sqrt(i - this.shown)
      this.x[i] = cx + Math.cos(a) * r
      this.z[i] = cz + Math.sin(a) * r * 0.8
    }
    this.alive = Math.max(this.alive, end)
  }

  /** Nobody shown (and nothing drawn after the next update). */
  clear() {
    this.st.fill(0)
    this.shown = 0
    this.alive = 0
    this.flush()
  }

  /** Take over another flock's members where they stand (the Gang cheering up: grumpy → happy). */
  copyFrom(o: Flock) {
    this.clear()
    const n = Math.min(this.cap, o.alive)
    for (let i = 0; i < n; i++) {
      this.st[i] = o.st[i] === ST_NONE ? ST_NONE : ST_ACTIVE
      this.x[i] = o.x[i]
      this.z[i] = o.z[i]
      this.age[i] = 0.7
    }
    this.alive = n
    this.shown = Math.min(n, o.shown)
  }

  /** The meshes drawing species `s` (set by FlockMeshes). */
  attach(s: number, body: InstancedMesh | null, hull: InstancedMesh | null) {
    this.meshes[s] = body
    this.hulls[s] = hull
  }

  /** Let go of species `s`'s meshes if they are still these. */
  detach(s: number, body: InstancedMesh) {
    if (this.meshes[s] !== body) return
    this.meshes[s] = null
    this.hulls[s] = null
  }

  attachShadow(m: InstancedMesh | null) {
    this.shadow = m
  }

  /** Clear everyone at once (a new level). */
  reset(n: number, x: number, z: number) {
    this.st.fill(0)
    this.shown = 0
    this.alive = 0
    this.setShown(n, x, z)
    for (let i = 0; i < n; i++) this.age[i] = 1
  }

  /** Members [0, n) cheer up and run to (x, z) to join the other crowd. */
  joinTo(x: number, z: number) {
    this.joinX = x
    this.joinZ = z
    for (let i = 0; i < this.alive; i++) if (this.st[i] === ST_ACTIVE) this.st[i] = ST_JOINING
  }

  /** Recount `alive` past trailing empty slots. */
  private trim() {
    while (this.alive > 0 && this.st[this.alive - 1] === ST_NONE) this.alive--
  }

  /** Slot i's instance-matrix array (null until its species is baked) and offset — no allocation. */
  private arr(i: number): Float32Array | null {
    const m = this.meshes[i % this.species]
    return m ? (m.instanceMatrix.array as Float32Array) : null
  }
  private off(i: number): number {
    return ((i / this.species) | 0) * 16
  }

  /** Push counts and upload flags for every species mesh (and hulls / shadows). */
  flush() {
    for (let s = 0; s < this.species; s++) {
      const m = this.meshes[s]
      if (!m) continue
      const count = this.alive > s ? Math.ceil((this.alive - s) / this.species) : 0
      m.count = count
      m.instanceMatrix.needsUpdate = true
      const h = this.hulls[s]
      if (h) {
        h.count = count
        h.instanceMatrix.needsUpdate = true
      }
    }
    if (this.shadow) {
      this.shadow.count = this.alive
      this.shadow.instanceMatrix.needsUpdate = true
    }
  }

  /** One frame of the followers. `scale` is the body scale; `face` the resting yaw (π = facing −z). */
  updateFollowers(dt: number, f: FollowerInput, scale: number) {
    const n = this.shown
    const depth = formationDepth(Math.max(1, n))
    const cz = f.leaderZ + 0.95 + depth + f.shift
    const squeezeX = 1 - 0.55 * f.squeeze
    const moving = f.mode === 'march' && f.speed > 0.3
    const w = moving ? 8.5 + f.speed * 0.35 : f.mode === 'cheer' ? 7 : 2.2
    for (let i = 0; i < this.alive; i++) {
      const st = this.st[i]
      const te = this.arr(i)
      const o = this.off(i)
      if (st === ST_NONE) {
        if (te) hideSlot(te, o)
        this.writeShadow(i, 0, 0, 0)
        continue
      }
      let tx: number
      let tz: number
      let rate: number
      if (st === ST_CAGED) {
        tx = this.x[i]
        tz = this.z[i]
        rate = 0
      } else if (st === ST_LEAVING) {
        tx = this.side[i] * (TRACK_HALF + 2.5)
        tz = this.z[i] + 0.4
        rate = 1.8
      } else {
        slotOffset(i, _off)
        const back = (_off.z + depth) / (2 * depth + 0.01) // 0 front … 1 back
        const centerX = f.leaderX + (f.laneX - f.leaderX) * f.squeeze * 0.6
        tx = centerX + _off.x * squeezeX
        tz = cz + _off.z
        rate = 7 / (1 + back * 2.2)
      }
      // ease toward the target (members further back trail behind: the snake)
      const k = Math.min(1, dt * rate)
      const dx = (tx - this.x[i]) * k
      this.x[i] += dx
      this.z[i] += (tz - this.z[i]) * Math.min(1, dt * (st === ST_ACTIVE ? 9 : 2))
      if (this.x[i] > TRACK_HALF + 3) this.x[i] = TRACK_HALF + 3
      if (this.x[i] < -TRACK_HALF - 3) this.x[i] = -TRACK_HALF - 3
      this.vx[i] += (dx / Math.max(dt, 1e-3) - this.vx[i]) * Math.min(1, dt * 6)
      // pop in / shrink out
      if (st === ST_LEAVING) {
        this.age[i] -= dt * 1.4
        if (this.age[i] <= 0) {
          this.st[i] = ST_NONE
          this.age[i] = 0
        }
      } else this.age[i] = Math.min(1, this.age[i] + dt * 2.8)
      const a = this.age[i]
      const pop = a <= 0 ? 0 : st === ST_LEAVING ? a : easeOutBack(a)
      const p = f.t * w + this.ph[i]
      let y = 0
      let roll = 0
      let pitch = 0
      let yaw = Math.PI
      if (st === ST_CAGED) {
        y = Math.abs(Math.sin(f.t * 5 + this.ph[i])) * 0.12
        yaw = 0.3 * Math.sin(this.ph[i])
      } else if (f.mode === 'cheer') {
        y = Math.abs(Math.sin(p)) * 0.32
        yaw = Math.PI + Math.sin(f.t * 3 + this.ph[i]) * 0.6
      } else if (f.mode === 'tug') {
        pitch = -0.45 * f.lean
        roll = Math.sin(f.t * 11 + this.ph[i]) * 0.07
        y = Math.abs(Math.sin(f.t * 11 + this.ph[i])) * 0.03
      } else if (f.mode === 'sit') {
        pitch = 0.25
      } else {
        const swing = moving ? 1 : 0.35
        roll = Math.sin(p) * 0.15 * swing
        y = Math.abs(Math.sin(p)) * 0.075 * swing
        yaw = Math.PI - Math.atan2(this.vx[i] * 0.12, Math.max(1, f.speed)) + Math.sin(p * 0.5) * 0.07 * swing
      }
      if (st === ST_LEAVING) yaw = Math.PI - this.side[i] * 1.3
      const s = scale * pop
      const sq = 1 + Math.sin(p * 2) * 0.04 * (moving ? 1 : 0.3)
      if (te) writeTRS(te, o, this.x[i], y * scale, this.z[i], pitch, yaw, roll, s / Math.sqrt(sq), s * sq, s / Math.sqrt(sq))
      this.writeShadow(i, this.x[i], this.z[i], s)
    }
    this.trim()
    this.flush()
  }

  /** The Grumble Gang: a sunflower facing +z around (cx, cz). */
  updateGang(dt: number, t: number, cx: number, cz: number, mode: FlockMode, lean: number, scale: number) {
    // a blob behind the Gang's leader (toward −z), the mirror of our parade
    const depth = formationDepth(Math.max(1, this.shown))
    for (let i = 0; i < this.alive; i++) {
      const st = this.st[i]
      const te = this.arr(i)
      const o = this.off(i)
      if (st === ST_NONE) {
        if (te) hideSlot(te, o)
        this.writeShadow(i, 0, 0, 0)
        continue
      }
      slotOffset(i, _off)
      let tx = cx + _off.x * 1.2
      let tz = cz - 0.9 - depth + _off.z
      let rate = 5
      if (st === ST_JOINING) {
        tx = this.joinX + _off.x * 0.6
        tz = this.joinZ + _off.z * 0.5
        rate = 1.6 + (i % 5) * 0.25
      }
      this.x[i] += (tx - this.x[i]) * Math.min(1, dt * rate)
      this.z[i] += (tz - this.z[i]) * Math.min(1, dt * rate)
      if (st === ST_JOINING && Math.abs(tz - this.z[i]) < 0.8) this.age[i] -= dt * 2.5
      else this.age[i] = Math.min(1, this.age[i] + dt * 2.5)
      if (st === ST_JOINING && this.age[i] <= 0) this.st[i] = ST_NONE
      const a = Math.max(0, this.age[i])
      const pop = st === ST_JOINING ? a : easeOutBack(a)
      const p = t * (mode === 'cheer' || st === ST_JOINING ? 8 : 2.4) + this.ph[i]
      let y = Math.abs(Math.sin(p)) * (mode === 'cheer' || st === ST_JOINING ? 0.3 : 0.04)
      let pitch = 0
      let roll = Math.sin(p) * 0.06
      const yaw = 0
      if (mode === 'tug' && st !== ST_JOINING) {
        pitch = 0.45 * lean
        y = Math.abs(Math.sin(t * 11 + this.ph[i])) * 0.03
      }
      if (st === ST_JOINING) roll = Math.sin(p) * 0.2
      const s = scale * pop
      if (te) writeTRS(te, o, this.x[i], y, this.z[i], pitch, yaw, roll, s, s, s)
      this.writeShadow(i, this.x[i], this.z[i], s)
    }
    this.trim()
    this.flush()
  }

  /** The ghost parade: `n` see-through followers at (cx, cz), popping in one by one. */
  updateGhost(dt: number, t: number, cx: number, cz: number, n: number, scale: number, moving: boolean) {
    const depth = formationDepth(Math.max(1, n))
    for (let i = 0; i < this.cap; i++) {
      const te = this.arr(i)
      const o = this.off(i)
      if (!te) continue
      if (i >= n) {
        if (i < this.alive) hideSlot(te, o)
        continue
      }
      this.age[i] = Math.min(1, this.age[i] + dt * 3.2)
      slotOffset(i, _off)
      const a = this.age[i]
      const pop = a <= 0 ? 0 : easeOutBack(a)
      const p = t * (moving ? 9 : 2.2) + this.ph[i]
      writeTRS(te, o, cx + _off.x * 0.7, Math.abs(Math.sin(p)) * 0.07 * scale, cz + depth + _off.z, 0, Math.PI, Math.sin(p) * 0.14, scale * pop, scale * pop, scale * pop)
    }
    this.alive = n
    this.flush()
  }

  /** Start the ghost over (members pop in one by one from the front). */
  restartGhost() {
    for (let i = 0; i < this.cap; i++) this.age[i] = -i * 0.03
  }

  private writeShadow(i: number, x: number, z: number, s: number) {
    const m = this.shadow
    if (!m) return
    const te = m.instanceMatrix.array as Float32Array
    if (s <= 0) return hideSlot(te, i * 16)
    writeTRS(te, i * 16, x, 0.03, z, 0, 0, 0, s * 0.3, 1, s * 0.3)
  }
}

const _off = { x: 0, z: 0 }

// ── rendering ───────────────────────────────────────────────────────────────

const shadowGeo = (() => {
  const g = new CircleGeometry(1, 14)
  g.rotateX(-Math.PI / 2)
  return g
})()
const shadowMat = new MeshBasicMaterial({ color: '#2b3a2a', transparent: true, opacity: 0.2, depthWrite: false })
registerSharedGpuCache(() => [shadowGeo, shadowMat])

/**
 * One InstancedMesh per baked model (plus its outline hull on Pretty, and a
 * blob-shadow mesh), wired into `flock`. Nothing here re-renders per frame:
 * the scene's frame loop calls the flock's update.
 */
/** The crowds a scene keeps (held in a ref; FlockMeshes only reaches them in effects). */
export type FlockName = 'followers' | 'ghost' | 'gangGrumpy' | 'gangHappy'
export type FlockHost = Record<FlockName, Flock>

export function FlockMeshes({
  worldRef,
  which,
  cap,
  species,
  bakes,
  material,
  outlines,
  shadows = true,
  renderOrder = 0,
}: {
  worldRef: RefObject<FlockHost | null>
  which: FlockName
  cap: number
  species: number
  bakes: (BakedModel | null)[]
  material: Material
  outlines: boolean
  shadows?: boolean
  renderOrder?: number
}) {
  const per = Math.ceil(cap / species)
  return (
    <>
      {bakes.map((b, s) =>
        b ? (
          <SpeciesMesh key={`${s}|${b.body.uuid}|${outlines}`} worldRef={worldRef} which={which} index={s} baked={b} material={material} per={per} outlines={outlines} renderOrder={renderOrder} />
        ) : null,
      )}
      {shadows && <ShadowMesh worldRef={worldRef} which={which} cap={cap} />}
    </>
  )
}

/** One blob shadow per member, in a single draw call. */
function ShadowMesh({ worldRef, which, cap }: { worldRef: RefObject<FlockHost | null>; which: FlockName; cap: number }) {
  const mesh = useMemo(() => {
    const m = new InstancedMesh(shadowGeo, shadowMat, cap)
    m.count = 0
    m.frustumCulled = false
    m.renderOrder = 1
    return m
  }, [cap])
  useLayoutEffect(() => {
    const flock = worldRef.current?.[which]
    flock?.attachShadow(mesh)
    return () => flock?.attachShadow(null)
  }, [worldRef, which, mesh])
  return <primitive object={mesh} />
}

function SpeciesMesh({
  worldRef,
  which,
  index,
  baked,
  material,
  per,
  outlines,
  renderOrder,
}: {
  worldRef: RefObject<FlockHost | null>
  which: FlockName
  index: number
  baked: BakedModel
  material: Material
  per: number
  outlines: boolean
  renderOrder: number
}) {
  const body = useMemo(() => {
    const m = new InstancedMesh(baked.body, material, per)
    m.count = 0
    m.frustumCulled = false
    m.renderOrder = renderOrder
    return m
  }, [baked, material, per, renderOrder])
  const hull = useMemo(() => {
    if (!outlines || !baked.hull || !baked.hullMaterial) return null
    const h = new InstancedMesh(baked.hull, baked.hullMaterial, per)
    h.instanceMatrix = body.instanceMatrix
    h.count = 0
    h.frustumCulled = false
    h.userData.toonOutlineHull = true
    return h
  }, [baked, outlines, per, body])
  useLayoutEffect(() => {
    const flock = worldRef.current?.[which]
    flock?.attach(index, body, hull)
    return () => flock?.detach(index, body)
  }, [worldRef, which, index, body, hull])
  return (
    <>
      <primitive object={body} />
      {hull && <primitive object={hull} />}
    </>
  )
}

let ghostMat: MeshToonMaterial | null = null
/** The ghost parade's see-through look (one shared material; the scene fades its opacity). */
export function ghostMaterial(): MeshToonMaterial {
  ghostMat ??= glowToonMaterial({ tint: '#d8ecff', opacity: 0.45, emissive: '#9fd3ff', emissiveIntensity: 0.35 })
  return ghostMat
}
