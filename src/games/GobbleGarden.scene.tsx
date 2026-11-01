/* eslint-disable react-refresh/only-export-components -- the scene co-locates its geometry builders; not an HMR boundary */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearFilter,
  Matrix4,
  MeshBasicMaterial,
  MeshToonMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import type { Group, Mesh, PerspectiveCamera } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import StaticBatch from '../toon/StaticBatch'
import { Bush, FlowerPatch, Tree } from '../toon/props'
import { TOON } from '../toon/palette'
import { toonGradient } from '../toon/materials'
import { canEat, PARK, stepPark, type ParkEvent, type ParkRun } from '../lib/gobble'
import { GuideAnchor } from '../guide/GuideMarker'
import JuiceLayer from './_juice/JuiceLayer'
import { GameSky } from './_scene/GameSky'
import { ATLAS, CLOUD_BADGE, drawCloudBadge, drawSnackLabel, whenFontReady } from './GobbleGarden.labels'

/**
 * Gobble Garden's 3D park: a low-poly meadow inside a hedge, the snacks (one
 * InstancedMesh per snack kind, one more for all the labels from a shared
 * atlas, one for their blob shadows) and the cloud. ONE frame loop steps the
 * pure park (lib/gobble/park), animates from its state (pop-ins, wobbles, the
 * bites flying into the cloud) and follows the cloud with the camera. Nothing
 * re-renders per frame; the game hears the park's events through `onEvents`.
 *
 * Fire budget: ~12 draw calls for the play (3 snack kinds, labels, shadows,
 * the cloud's parts, the badge), the scenery batched, no shadow maps.
 */

export interface SceneHooks {
  onEvents: (evs: ParkEvent[]) => void
}

/** The scene's live inputs the game sets (picking needs the camera). */
export interface SceneIO {
  /** Screen point → park ground point (null off the ground). */
  pick: ((clientX: number, clientY: number) => { x: number; z: number } | null) | null
  /** dev/QA time scale */
  timeScale: number
  /** the arrow keys held */
  keys: { left: boolean; right: boolean; up: boolean; down: boolean }
}

export const makeSceneIO = (): SceneIO => ({ pick: null, timeScale: 1, keys: { left: false, right: false, up: false, down: false } })

// ── geometry ─────────────────────────────────────────────────────────────────

function colored(g: BufferGeometry, hex: string): BufferGeometry {
  const c = new Color(hex)
  const g2 = g.index ? g.toNonIndexed() : g
  const n = g2.getAttribute('position').count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  g2.setAttribute('color', new BufferAttribute(arr, 3))
  g2.deleteAttribute('uv')
  return g2
}

function at(g: BufferGeometry, x: number, y: number, z: number, sx = 1, sy = sx, sz = sx): BufferGeometry {
  g.scale(sx, sy, sz)
  g.translate(x, y, z)
  return g
}

/** The three snack kinds, each one merged low-poly mesh with vertex colours (radius about 0.75, sitting on y = 0). */
function snackGeometries(): BufferGeometry[] {
  // a cupcake: paper cup, frosting, a cherry
  const cupcake = mergeGeometries([
    colored(at(new CylinderGeometry(0.5, 0.38, 0.55, 9), 0, 0.28, 0), '#f3c58b'),
    colored(at(new IcosahedronGeometry(0.58, 1), 0, 0.7, 0, 1, 0.62, 1), '#f7a1c4'),
    colored(at(new IcosahedronGeometry(0.15, 0), 0, 1.12, 0), '#f2766b'),
  ])
  // an apple: round, a stem, a leaf
  const apple = mergeGeometries([
    colored(at(new IcosahedronGeometry(0.6, 1), 0, 0.6, 0, 1, 0.92, 1), '#f2766b'),
    colored(at(new CylinderGeometry(0.05, 0.06, 0.3, 5), 0, 1.22, 0), TOON.bark),
    colored(at(new IcosahedronGeometry(0.16, 0), 0.17, 1.24, 0, 1.3, 0.45, 0.8), TOON.leaf),
  ])
  // a donut: dough ring and pink icing
  const donut = mergeGeometries([
    colored(at(new TorusGeometry(0.46, 0.26, 7, 12).rotateX(Math.PI / 2), 0, 0.3, 0), '#e2b071'),
    colored(at(new TorusGeometry(0.46, 0.2, 6, 12).rotateX(Math.PI / 2), 0, 0.42, 0, 1, 0.8, 1), '#b79af0'),
  ])
  return [cupcake, apple, donut]
}

/** The cloud: a puff of balls, white, sitting around y = 0 (radius 1). */
function cloudGeometry(): BufferGeometry {
  const puffs: [number, number, number, number][] = [
    [0, 0, 0, 0.82],
    [0.62, -0.08, 0.1, 0.6],
    [-0.62, -0.06, 0.08, 0.62],
    [0.28, 0.42, -0.05, 0.56],
    [-0.3, 0.38, -0.1, 0.55],
    [0, -0.15, 0.45, 0.6],
  ]
  return mergeGeometries(puffs.map(([x, y, z, r]) => at(new IcosahedronGeometry(r, 1), x, y, z).toNonIndexed()).map((g) => (g.deleteAttribute('uv'), g)))
}

// ── the label material: one atlas cell per instance ─────────────────────────

function labelMaterial(map: CanvasTexture): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { map: { value: map }, grid: { value: [ATLAS.cols, ATLAS.rows] } },
    vertexShader: /* glsl */ `
      attribute float aCell;
      uniform vec2 grid;
      varying vec2 vUv;
      void main() {
        float col = mod(aCell, grid.x);
        float row = floor(aCell / grid.x);
        vUv = vec2((col + uv.x) / grid.x, 1.0 - (row + 1.0 - uv.y) / grid.y);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(map, vUv);
        if (c.a < 0.04) discard;
        gl_FragColor = c;
        #include <colorspace_fragment>
      }`,
  })
}

// ── scenery ──────────────────────────────────────────────────────────────────

/** The park: meadow, a sandy path round it, a hedge, trees and flowers outside. */
function ParkSet({ low }: { low: boolean }) {
  const h = PARK.half
  const hedge = useMemo(() => {
    const out: [number, number][] = []
    const step = low ? 3.2 : 2.4
    for (let p = -h; p <= h + 0.01; p += step) out.push([p, -h - 1.2], [p, h + 1.2], [-h - 1.2, p], [h + 1.2, p])
    return out
  }, [h, low])
  const trees = useMemo(() => {
    const out: { x: number; z: number; v: 'round' | 'blossom' | 'fruit'; s: number }[] = []
    const n = low ? 10 : 18
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3
      const d = h + 4.5 + (i % 3) * 1.6
      out.push({ x: Math.cos(a) * d * 1.05, z: Math.sin(a) * d, v: (['round', 'blossom', 'fruit'] as const)[i % 3], s: 1.3 + (i % 4) * 0.18 })
    }
    return out
  }, [h, low])
  const flowers = useMemo(() => {
    const out: [number, number][] = []
    const n = low ? 6 : 12
    for (let i = 0; i < n; i++) out.push([((i * 7.3) % (2 * h - 3)) - h + 1.5, ((i * 11.1) % (2 * h - 3)) - h + 1.5])
    return out
  }, [h, low])
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[160, 160]} />
        <meshToonMaterial color={TOON.grassDark} gradientMap={toonGradient()} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[2 * h + 3.6, 2 * h + 3.6]} />
        <meshToonMaterial color={TOON.path} gradientMap={toonGradient()} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[2 * h + 1, 2 * h + 1]} />
        <meshToonMaterial color={TOON.grass} gradientMap={toonGradient()} />
      </mesh>
      <StaticBatch>
        {hedge.map(([x, z], i) => (
          <Bush key={i} position={[x, 0, z]} scale={1.25} seed={i + 1} color={i % 2 ? TOON.leaf : TOON.leafDark} />
        ))}
        {trees.map((t, i) => (
          <Tree key={i} position={[t.x, 0, t.z]} scale={t.s} seed={i + 3} variant={t.v} />
        ))}
        {flowers.map(([x, z], i) => (
          <FlowerPatch key={i} position={[x, 0.02, z]} seed={i + 7} count={low ? 3 : 5} radius={0.7} />
        ))}
        {/* (no picnic blanket: a flat red slab on the grass read as a stray rectangle, and snacks sat on it) */}
      </StaticBatch>
    </>
  )
}

// ── the scene ────────────────────────────────────────────────────────────────

const _m = new Matrix4()
const _q = new Quaternion()
const _p = new Vector3()
const _s = new Vector3()
const _o = new Object3D()
const _v = new Vector3()
const _dir = new Vector3()
const _right = new Vector3()
const _ndc = new Vector3()
const _edge = new Vector3()
const ZERO = new Matrix4().makeScale(0, 0, 0)
const SPECIES = 3

/** Pop-in: ease-out-back over 0.35 s. */
function popIn(t: number) {
  if (t >= 0.35) return 1
  const k = Math.max(0, t / 0.35)
  const c = 1.9
  return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2
}

/**
 * Everything drawn for the snacks: one InstancedMesh per snack kind, their
 * blob shadows, the labels (one atlas cell per slot) and the cloud's number
 * badge. Built once per scene; `update` runs every frame from the park's state.
 */
class SnackField {
  readonly geos = snackGeometries()
  readonly mat = new MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient() })
  readonly bodies: InstancedMesh[]
  readonly shadows: InstancedMesh
  readonly labels: InstancedMesh
  readonly atlas: { ctx: CanvasRenderingContext2D | null; tex: CanvasTexture }
  readonly badge: { ctx: CanvasRenderingContext2D | null; tex: CanvasTexture; text: string }
  /** The serial each cell was last drawn at (−1: redraw). */
  private drawn: number[] = Array(PARK.slots).fill(-1)
  private drawnScaffold = false
  /** Each cell's tag width (a share of the cell: tags are only as wide as their value). */
  private tagW: number[] = Array(PARK.slots).fill(1)
  /** Per-slot visuals the park doesn't keep: a bite flying into the cloud. */
  private bites = Array.from({ length: PARK.slots }, () => ({ t: -1, x: 0, z: 0 }))

  constructor() {
    this.bodies = this.geos.map((g) => {
      const m = new InstancedMesh(g, this.mat, PARK.slots)
      m.instanceMatrix.setUsage(DynamicDrawUsage)
      m.frustumCulled = false
      for (let i = 0; i < PARK.slots; i++) m.setMatrixAt(i, ZERO)
      return m
    })
    this.shadows = new InstancedMesh(new CircleGeometry(1, 16).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: '#2f5a2a', transparent: true, opacity: 0.22, depthWrite: false }), PARK.slots)
    this.shadows.instanceMatrix.setUsage(DynamicDrawUsage)
    this.shadows.frustumCulled = false
    this.shadows.renderOrder = 1
    this.atlas = canvasTexture(ATLAS.cols * ATLAS.cw, ATLAS.rows * ATLAS.ch)
    const g = new PlaneGeometry(2.4, 1.2)
    const cells = new Float32Array(PARK.slots)
    for (let i = 0; i < PARK.slots; i++) cells[i] = i
    g.setAttribute('aCell', new InstancedBufferAttribute(cells, 1))
    this.labels = new InstancedMesh(g, labelMaterial(this.atlas.tex), PARK.slots)
    this.labels.instanceMatrix.setUsage(DynamicDrawUsage)
    this.labels.frustumCulled = false
    this.labels.renderOrder = 5
    this.badge = { ...canvasTexture(CLOUD_BADGE.w, CLOUD_BADGE.h), text: '' }
  }

  /** Redraw every label (the display font arrived). */
  redrawAll() {
    this.drawn.fill(-1)
    this.badge.text = ''
  }

  /** A bite flies from where the snack was into the cloud. */
  bite(slot: number, t: number, x: number, z: number) {
    const b = this.bites[slot]
    b.t = t
    b.x = x
    b.z = z
  }

  /** `tag`: the snack tags' size (smaller on a portrait screen, where the park is narrow and they crowd). */
  update(r: ParkRun, now: number, camera: PerspectiveCamera, reduced: boolean, scaffold: boolean, tag = 1) {
    const set = r.cfg.set
    const camQ = camera.quaternion
    _right.set(1, 0, 0).applyQuaternion(camQ)
    const { cloud } = r
    // ── labels: redraw the cells whose snack changed (or all, when the pictures turn on or off) ──
    const ctx = this.atlas.ctx
    if (ctx) {
      const all = this.drawnScaffold !== scaffold
      this.drawnScaffold = scaffold
      let dirty = false
      for (const s of r.snacks) {
        if (!all && this.drawn[s.slot] === s.serial) continue
        this.drawn[s.slot] = s.serial
        this.tagW[s.slot] = drawSnackLabel(ctx, (s.slot % ATLAS.cols) * ATLAS.cw, Math.floor(s.slot / ATLAS.cols) * ATLAS.ch, s.snack, set, scaffold) / ATLAS.cw
        dirty = true
      }
      if (dirty) this.atlas.tex.needsUpdate = true
    }
    if (this.badge.ctx && this.badge.text !== cloud.value.text) {
      this.badge.text = cloud.value.text
      drawCloudBadge(this.badge.ctx, cloud.value, set)
      this.badge.tex.needsUpdate = true
    }

    // ── snacks: pop in, wobble after a bonk, fly into the cloud when eaten ──
    for (const s of r.snacks) {
      const sp = s.slot % SPECIES
      const bite = this.bites[s.slot]
      let x = s.x
      let z = s.z
      let scale = 0
      if (s.alive) {
        scale = reduced ? 1 : popIn(r.t - s.bornAt)
        const w = r.t - s.wobbleAt
        if (w < 0.6 && !reduced) scale *= 1 + Math.sin(w * 30) * 0.12 * (1 - w / 0.6)
      } else if (bite.t >= 0 && now - bite.t < 0.28) {
        const k = (now - bite.t) / 0.28
        x = bite.x + (cloud.x - bite.x) * k
        z = bite.z + (cloud.z - bite.z) * k
        scale = 1 - k
      }
      const bob = s.alive && !reduced ? Math.sin(now * 2.2 + s.slot) * 0.05 : 0
      for (let i = 0; i < SPECIES; i++) {
        if (i !== sp || scale <= 0.001) this.bodies[i].setMatrixAt(s.slot, ZERO)
        else {
          _o.position.set(x, bob, z)
          _o.rotation.set(0, s.slot * 1.3 + (reduced ? 0 : now * 0.4), 0)
          _o.scale.setScalar(scale)
          _o.updateMatrix()
          this.bodies[i].setMatrixAt(s.slot, _o.matrix)
        }
      }
      if (scale <= 0.001) {
        this.labels.setMatrixAt(s.slot, ZERO)
        this.shadows.setMatrixAt(s.slot, ZERO)
        continue
      }
      _m.compose(_p.set(x, 0.03, z), _q.identity(), _s.set(0.82 * scale, 1, 0.82 * scale))
      this.shadows.setMatrixAt(s.slot, _m)
      // the label floats above the snack, facing the camera…
      const k = (s.alive ? scale : scale * 0.6) * tag
      _p.set(x, 1.3 + 0.6 * tag + bob, z + 0.2)
      // …slid back onto the screen when its snack is at the very edge (never more than half its width: it still sits over its snack)
      const half = 1.2 * this.tagW[s.slot] * k
      _ndc.copy(_p).project(camera)
      const hw = Math.abs(_edge.copy(_p).addScaledVector(_right, half).project(camera).x - _ndc.x)
      if (hw > 1e-4 && _ndc.z < 1) {
        const over = Math.max(0, _ndc.x + hw - 0.98) - Math.max(0, -0.98 - (_ndc.x - hw))
        if (over !== 0) _p.addScaledVector(_right, -(Math.max(-hw, Math.min(hw, over)) / hw) * half)
      }
      _m.compose(_p, camQ, _s.setScalar(k))
      this.labels.setMatrixAt(s.slot, _m)
    }
    for (const b of this.bodies) b.instanceMatrix.needsUpdate = true
    this.labels.instanceMatrix.needsUpdate = true
    this.shadows.instanceMatrix.needsUpdate = true
  }

  dispose() {
    for (const g of this.geos) g.dispose()
    this.atlas.tex.dispose()
    this.badge.tex.dispose()
  }
}

function canvasTexture(w: number, h: number): { ctx: CanvasRenderingContext2D | null; tex: CanvasTexture } {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.generateMipmaps = false
  tex.minFilter = LinearFilter
  tex.magFilter = LinearFilter
  return { ctx: canvas.getContext('2d'), tex }
}

/** Point the game's picking at this camera (the game owns `io`; the scene fills in the camera's part). */
function bindPick(io: SceneIO, pick: SceneIO['pick']) {
  io.pick = pick
}

export function GardenScene({
  runRef,
  hooksRef,
  io,
  paused,
  low,
  reduced,
  scaffold,
  hint,
}: {
  runRef: RefObject<ParkRun | null>
  hooksRef: RefObject<SceneHooks | null>
  io: SceneIO
  paused: boolean
  low: boolean
  reduced: boolean
  scaffold: boolean
  /** K–1's nudge: where the snack the guide's hand drags the cloud to is (an anchor on it). */
  hint: { x: number; z: number } | null
}) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const [field] = useState(() => new SnackField())
  useEffect(() => {
    whenFontReady(() => field.redrawAll())
  }, [field])

  // ── the cloud ──
  const cloudGeo = useMemo(() => cloudGeometry(), [])
  const cloudMat = useMemo(() => new MeshToonMaterial({ color: '#ffffff', gradientMap: toonGradient(), emissive: new Color('#e9f4ff'), emissiveIntensity: 0.25 }), [])
  const cloudRef = useRef<Group>(null)
  const bodyRef = useRef<Mesh>(null)
  const mouthRef = useRef<Mesh>(null)
  const badgeRef = useRef<Mesh>(null)
  const cloudShadowRef = useRef<Mesh>(null)

  const squash = useRef(-9)
  const shownR = useRef(PARK.cloudR0)
  const camPos = useRef(new Vector3(0, 14, 9))
  const frameEvents = useRef<ParkEvent[]>([])

  // picking: the ground point under a screen point
  useEffect(() => {
    bindPick(io, (cx, cy) => {
      const r = gl.domElement.getBoundingClientRect()
      _v.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1, 0.5).unproject(camera)
      _dir.copy(_v).sub(camera.position).normalize()
      if (_dir.y >= -1e-4) return null
      const k = -camera.position.y / _dir.y
      return { x: camera.position.x + _dir.x * k, z: camera.position.z + _dir.z * k }
    })
    return () => bindPick(io, null)
  }, [io, gl, camera])

  useEffect(
    () => () => {
      field.dispose()
      cloudGeo.dispose()
    },
    [field, cloudGeo],
  )

  useFrame((state, rawDt) => {
    const r = runRef.current
    if (!r) return
    // (a slow tablet still plays in real time: long frames step in pieces below)
    const dt = Math.min(rawDt, 0.1) * io.timeScale
    const now = state.clock.elapsedTime

    // ── step the park ──
    if (!paused) {
      const k = io.keys
      r.input.axis.x = (k.right ? 1 : 0) - (k.left ? 1 : 0)
      r.input.axis.z = (k.down ? 1 : 0) - (k.up ? 1 : 0)
      // (big time scales step in pieces, so a fast bot still collides)
      const steps = Math.max(1, Math.ceil(dt / 0.034))
      const evs = frameEvents.current
      evs.length = 0
      for (let i = 0; i < steps; i++) stepPark(r, dt / steps, evs)
      for (const e of evs) {
        if (e.kind === 'eat') {
          field.bite(e.slot, now, e.x, e.z)
          squash.current = now
        }
      }
      if (evs.length) hooksRef.current?.onEvents(evs.slice())
    }
    const { cloud } = r

    const aspect = size.width / Math.max(1, size.height)
    field.update(r, now, camera, reduced, scaffold, aspect < 1 ? 0.82 : 1)
    const camQ = camera.quaternion

    // ── the cloud ──
    shownR.current += (cloud.r - shownR.current) * Math.min(1, rawDt * 4)
    const R = shownR.current
    const g = cloudRef.current
    if (g) {
      g.position.set(cloud.x, 0, cloud.z)
      // leans the way it drifts
      const lean = reduced ? 0 : 0.06
      // (and shakes its head, dizzy, for a moment after a burp)
      const dizzy = !reduced && r.t < cloud.dazedUntil ? Math.sin(now * 28) * 0.22 : 0
      g.rotation.set(cloud.vz * lean * 0.5, dizzy, -cloud.vx * lean * 0.5)
    }
    const body = bodyRef.current
    if (body) {
      const st = now - squash.current
      const sq = !reduced && st < 0.5 ? Math.sin(st * 22) * 0.18 * (1 - st / 0.5) : 0
      body.scale.set(R * (1 + sq * 0.6), R * 0.82 * (1 - sq), R * (1 + sq * 0.6))
      body.position.y = 1.0 + R * 0.5 + (reduced ? 0 : Math.sin(now * 1.8) * 0.12)
    }
    const mouth = mouthRef.current
    if (mouth) {
      // the mouth opens wide when an edible snack is close (anticipation), and chomps after a bite
      let open = 0.25
      for (const s of r.snacks) {
        if (!s.alive || !canEat(s.snack, cloud.value)) continue
        const d = Math.hypot(s.x - cloud.x, s.z - cloud.z) - cloud.r
        if (d < 2.2) open = Math.max(open, 1 - d / 2.2)
      }
      const st = now - squash.current
      if (st < 0.3) open = 0.1
      mouth.scale.set(R * 0.3, R * (0.08 + 0.22 * open), 1)
      mouth.position.set(0, 1.0 + R * 0.38 + (reduced ? 0 : Math.sin(now * 1.8) * 0.12), R * 0.86)
    }
    const bm = badgeRef.current
    if (bm) {
      bm.position.set(0, 1.0 + R * 1.42 + 0.5, 0)
      bm.quaternion.copy(camQ)
      bm.scale.setScalar(0.85 + R * 0.25)
    }
    const cs = cloudShadowRef.current
    if (cs) cs.scale.setScalar(R * 1.05)

    // ── the camera follows (a little higher as the cloud grows; higher still in portrait) ──
    const fit = aspect < 1 ? Math.min(1.9, 1 / aspect) ** 0.85 : 1
    const H = (9.6 + R * 1.5) * fit
    const D = (6.4 + R * 0.9) * fit
    const lead = 0.25
    camPos.current.set(cloud.x + cloud.vx * lead, H, cloud.z + D + cloud.vz * lead)
    camera.position.lerp(camPos.current, Math.min(1, rawDt * 3.5))
    // look a little ahead of the cloud, so it sits below the middle (the HUD cards stay clear of it)
    camera.lookAt(camera.position.x, 0, camera.position.z - D - 1.8)
  })

  return (
    <>
      <GameSky castShadow={false} fogNear={30} fogFar={90} />
      <ParkSet low={low} />
      {field.bodies.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
      <primitive object={field.shadows} />
      <primitive object={field.labels} />
      <group ref={cloudRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} ref={cloudShadowRef} renderOrder={1}>
          <circleGeometry args={[1, 20]} />
          <meshBasicMaterial color="#2f5a2a" transparent opacity={0.25} depthWrite={false} />
        </mesh>
        <mesh ref={bodyRef} geometry={cloudGeo} material={cloudMat} />
        {/* the face: eyes and cheeks ride on the body's front */}
        <CloudFace runRef={runRef} shownR={shownR} reduced={reduced} />
        <mesh ref={mouthRef}>
          <circleGeometry args={[1, 18]} />
          <meshBasicMaterial color="#3a2c38" />
        </mesh>
        {/* the cloud's number: drawn last and over everything, so no snack's tag ever covers it */}
        <mesh ref={badgeRef} renderOrder={8}>
          <planeGeometry args={[2.4, 1.5]} />
          <meshBasicMaterial map={field.badge.tex} transparent depthWrite={false} depthTest={false} fog={false} toneMapped={false} />
        </mesh>
        <GuideAnchor id="gobble-cloud" position={[0, 1.5, 0]} size={120} local />
      </group>
      {hint && <GuideAnchor id="gobble-snack" position={[hint.x, 1, hint.z]} size={110} />}
      <JuiceLayer />
    </>
  )
}

/** Two eyes that blink, and pink cheeks. */
function CloudFace({ runRef, shownR, reduced }: { runRef: RefObject<ParkRun | null>; shownR: RefObject<number>; reduced: boolean }) {
  const group = useRef<Group>(null)
  const eyeL = useRef<Mesh>(null)
  const eyeR = useRef<Mesh>(null)
  const eyeGeo = useMemo(() => new SphereGeometry(1, 10, 8), [])
  useFrame(({ clock }) => {
    const g = group.current
    const r = runRef.current
    if (!g || !r) return
    const R = shownR.current
    const t = clock.elapsedTime
    g.position.set(0, 1.0 + R * 0.62 + (reduced ? 0 : Math.sin(t * 1.8) * 0.12), R * 0.78)
    g.scale.setScalar(R)
    // a blink every few seconds
    const blink = !reduced && t % 3.7 < 0.12 ? 0.15 : 1
    if (eyeL.current) eyeL.current.scale.set(0.09, 0.13 * blink, 0.06)
    if (eyeR.current) eyeR.current.scale.set(0.09, 0.13 * blink, 0.06)
  })
  return (
    <group ref={group}>
      <mesh ref={eyeL} geometry={eyeGeo} position={[-0.26, 0.04, 0.1]}>
        <meshBasicMaterial color="#2b2230" />
      </mesh>
      <mesh ref={eyeR} geometry={eyeGeo} position={[0.26, 0.04, 0.1]}>
        <meshBasicMaterial color="#2b2230" />
      </mesh>
      <mesh geometry={eyeGeo} position={[-0.46, -0.14, 0.02]} scale={[0.11, 0.07, 0.04]}>
        <meshBasicMaterial color="#ff9fb0" />
      </mesh>
      <mesh geometry={eyeGeo} position={[0.46, -0.14, 0.02]} scale={[0.11, 0.07, 0.04]}>
        <meshBasicMaterial color="#ff9fb0" />
      </mesh>
    </group>
  )
}
