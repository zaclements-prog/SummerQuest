import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color, InstancedMesh, MeshBasicMaterial, MeshToonMaterial, Object3D, Sphere, Sprite, SpriteMaterial, Vector3 } from 'three'
import type { Group, Mesh } from 'three'
import { rule, type PuddleValue, type RuleId } from '../../lib/puddle'
import { TOON } from '../../toon/palette'
import { toonGradient, toonMaterial } from '../../toon/materials'
import { geo } from '../../toon/geometry'
import { TBlob, TBox, TCone, TCyl, TSphere, TTorus } from '../../toon/shapes'
import { Bush, FlowerPatch, Fence, Rock, Tree, Mushroom, Signpost } from '../../toon/props'
import { headingAt, pointAt } from './config'
import { puddingLabel, ruleBadge } from './labels'
import type { FieldLayout, PatrolState, Vec2 } from './types'

/**
 * Puddle Patrol's 3D pieces: the island field (path, pond, mud pit, scenery),
 * the sprinkler slots and towers, the Mud Pudding flock (instanced: one draw
 * call per body part, whatever the wave size) and the water sprays.
 */

const TAU = Math.PI * 2

// ── the field ───────────────────────────────────────────────────────────────

/** A flat ribbon along the path (`width` wide, `y` above the grass). */
function ribbon(path: Vec2[], width: number, y: number): BufferGeometry {
  const pos = new Float32Array(path.length * 2 * 3)
  const idx: number[] = []
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)]
    const b = path[Math.min(path.length - 1, i + 1)]
    let nx = -(b.z - a.z)
    let nz = b.x - a.x
    const l = Math.hypot(nx, nz) || 1
    nx /= l
    nz /= l
    const p = path[i]
    pos.set([p.x + (nx * width) / 2, y, p.z + (nz * width) / 2, p.x - (nx * width) / 2, y, p.z - (nz * width) / 2], i * 6)
    if (i < path.length - 1) {
      const k = i * 2
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Scenery spots, clear of the path and the slots. */
const TREES: { x: number; z: number; v: 'round' | 'pine' | 'blossom' | 'palm'; s: number }[] = [
  { x: -9.8, z: -1.2, v: 'pine', s: 1.2 },
  { x: -10.2, z: 2.6, v: 'round', s: 1.1 },
  { x: 9.6, z: -5.2, v: 'palm', s: 1.15 },
  { x: 10.4, z: 2.6, v: 'blossom', s: 1.1 },
  { x: 6.2, z: -8.4, v: 'round', s: 1.0 },
  { x: -1.0, z: -8.6, v: 'pine', s: 1.1 },
  { x: 4.6, z: 6.6, v: 'palm', s: 1.0 },
  { x: -8.4, z: -8.2, v: 'round', s: 0.95 },
]
const BUSHES: [number, number][] = [
  [-6.6, -0.8],
  [7.6, -4.4],
  [3.8, 4.0],
  [-0.4, -1.6],
  [8.8, 5.2],
  [-8.6, 6.2],
  [0.6, 6.8],
]
const ROCKS: [number, number, number][] = [
  [-6.2, 5.6, 1.1],
  [6.4, 3.3, 0.9],
  [-1.8, -7.6, 1.0],
  [9.2, -2.6, 0.8],
]

export function Field({ layout }: { layout: FieldLayout }) {
  const pathGeo = useMemo(() => ribbon(layout.path, 1.55, 0.06), [layout])
  const edgeGeo = useMemo(() => ribbon(layout.path, 1.95, 0.035), [layout])
  useEffect(
    () => () => {
      pathGeo.dispose()
      edgeGeo.dispose()
    },
    [pathGeo, edgeGeo],
  )
  return (
    <group>
      {/* the island: sand rim, grass top */}
      <TCyl radiusTop={14.2} radiusBottom={14.8} height={1.2} segments={40} position={[0.6, -0.62, 0.3]} color={TOON.sand} castShadow={false} receiveShadow />
      <TCyl radiusTop={12.9} radiusBottom={13.4} height={0.6} segments={40} position={[0.6, -0.28, 0.2]} color={TOON.grass} castShadow={false} receiveShadow />
      <mesh geometry={edgeGeo} material={toonMaterial(TOON.pathEdge)} receiveShadow />
      <mesh geometry={pathGeo} material={toonMaterial(TOON.path)} receiveShadow />
      {/* the mud pit the Puddings climb out of */}
      <group position={[layout.pit.x, 0, layout.pit.z]}>
        <TCyl radiusTop={1.5} radiusBottom={1.7} height={0.2} segments={20} position={[0, 0.04, 0]} color={TOON.dirtDark} castShadow={false} receiveShadow />
        <TCyl radiusTop={1.15} radiusBottom={1.2} height={0.2} segments={20} position={[0, 0.1, 0]} color={'#6b4426'} castShadow={false} />
        {[0, 1, 2].map((i) => (
          <TSphere key={i} position={[Math.cos(i * 2.1) * 0.55, 0.2, Math.sin(i * 2.1) * 0.5]} scale={0.18 + i * 0.04} color={'#7d5432'} castShadow={false} />
        ))}
        <Signpost position={[1.5, 0, -0.9]} rotation={-0.4} />
      </group>
      {/* scenery */}
      {TREES.map((t, i) => (
        <Tree key={i} position={[t.x, 0, t.z]} variant={t.v} scale={t.s} seed={i + 3} />
      ))}
      {BUSHES.map(([x, z], i) => (
        <Bush key={i} position={[x, 0, z]} seed={i + 1} scale={1.1} color={i % 2 ? TOON.leaf : TOON.leafDark} />
      ))}
      {ROCKS.map(([x, z, s], i) => (
        <Rock key={i} position={[x, 0, z]} scale={s * 1.4} seed={i + 7} />
      ))}
      <FlowerPatch position={[-7.8, 0, 0.6]} seed={2} count={7} radius={0.9} />
      <FlowerPatch position={[8.8, 0, 0.6]} seed={5} count={6} radius={0.8} />
      <FlowerPatch position={[2.6, 0, 6.2]} seed={8} count={6} radius={0.8} />
      <Mushroom position={[-8.8, 0, -3.8]} scale={1.3} />
      <Mushroom position={[5.6, 0, 5.4]} scale={1.1} />
      <Fence position={[-1.8, 0, 8.4]} rotation={0.1} length={3} posts={4} />
    </group>
  )
}

/**
 * The island pond the Puddings head for. Its water clouds a little with each
 * Pudding that splashes in (`cleanRef`: 1 = sparkling, 0 = all mud), so the
 * stars' measure is something to look at, not a number to read.
 */
export function Pond({ at, cleanRef }: { at: Vec2; cleanRef: RefObject<number> }) {
  const water = useMemo(() => new MeshToonMaterial({ color: TOON.water, gradientMap: toonGradient() }), [])
  useEffect(() => () => water.dispose(), [water])
  const clear = useMemo(() => new Color(TOON.water), [])
  const mud = useMemo(() => new Color('#9a7a52'), [])
  useFrame(() => {
    const c = Math.max(0, Math.min(1, cleanRef.current ?? 1))
    water.color.copy(clear).lerp(mud, (1 - c) * 0.8)
  })
  return (
    <group position={[at.x, 0, at.z]}>
      <TCyl radiusTop={2.9} radiusBottom={3.0} height={0.18} segments={28} position={[0, 0.02, 0]} color={TOON.sandWet} castShadow={false} receiveShadow />
      <mesh position={[0, 0.1, 0]} material={water}>
        <cylinderGeometry args={[2.45, 2.45, 0.1, 28]} />
      </mesh>
      <TTorus radius={2.5} tube={0.12} segments={28} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.14, 0]} color={TOON.foam} castShadow={false} />
      {/* lily pads and reeds */}
      {[
        [0.9, -0.6],
        [-1.1, 0.7],
        [0.5, 1.3],
      ].map(([x, z], i) => (
        <TCyl key={i} radiusTop={0.38} radiusBottom={0.38} height={0.04} segments={10} position={[x, 0.17, z]} color={TOON.leafLight} castShadow={false} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <TCyl key={i} radiusTop={0.04} radiusBottom={0.06} height={0.9 + (i % 2) * 0.3} segments={5} position={[2.5 + (i % 2) * 0.25, 0.45, -0.8 + i * 0.35]} color={TOON.leafDark} />
      ))}
    </group>
  )
}

// ── slots ───────────────────────────────────────────────────────────────────

const hitMat = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })

/**
 * A spot a sprinkler can stand on: a round stone pad, a big invisible tap
 * disc, and a ring that lights up when it's the chosen spot (or glows softly
 * while a card waits for a spot).
 */
export function SlotPad({ pos, selected, inviting, onTap, reduced }: { pos: Vec2; selected: boolean; inviting: boolean; onTap: () => void; reduced: boolean }) {
  const ring = useRef<Mesh>(null)
  const ringMat = useMemo(() => new MeshBasicMaterial({ color: TOON.gold, transparent: true, opacity: 0, depthWrite: false }), [])
  useEffect(() => () => ringMat.dispose(), [ringMat])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const on = selected ? 1 : inviting ? (reduced ? 0.6 : 0.45 + 0.35 * Math.sin(t * 4)) : 0
    const m = ring.current
    if (!m) return
    // (through the mesh: the frame loop owns the material's live values)
    const mat = m.material as MeshBasicMaterial
    mat.opacity = on * 0.9
    mat.color.set(selected ? TOON.gold : '#fff6cf')
    m.scale.setScalar(selected && !reduced ? 1 + 0.05 * Math.sin(t * 6) : 1)
  })
  const tap = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onTap()
  }
  return (
    <group position={[pos.x, 0, pos.z]}>
      <TCyl radiusTop={1.0} radiusBottom={1.1} height={0.22} segments={18} position={[0, 0.08, 0]} color={TOON.stone} receiveShadow />
      <TCyl radiusTop={0.78} radiusBottom={0.8} height={0.06} segments={18} position={[0, 0.21, 0]} color={TOON.stoneDark} castShadow={false} />
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.27, 0]} material={ringMat} renderOrder={3}>
        <ringGeometry args={[1.05, 1.42, 36]} />
      </mesh>
      <mesh position={[0, 0.6, 0]} material={hitMat} onPointerDown={tap}>
        <cylinderGeometry args={[1.5, 1.5, 1.4, 12]} />
      </mesh>
    </group>
  )
}

// ── towers ──────────────────────────────────────────────────────────────────

const WHITE = '#fffaf0'

/** The tower body for a rule family (each silhouette stays readable at a glance). */
function Body({ id }: { id: RuleId }) {
  const r = rule(id)
  const c = r.color
  switch (r.shape) {
    case 'pump':
      return (
        <group>
          <TCyl radiusTop={0.42} radiusBottom={0.55} height={1.3} position={[0, 0.85, 0]} color={c} outline />
          <TCyl radiusTop={0.56} radiusBottom={0.56} height={0.14} position={[0, 0.4, 0]} color={WHITE} castShadow={false} />
          <TSphere position={[0, 1.55, 0]} scale={[0.48, 0.36, 0.48]} color={c} outline />
          <TCyl radiusTop={0.1} radiusBottom={0.13} height={0.5} position={[0, 1.95, 0]} color={TOON.metal} />
          <TBox size={[0.18, 0.5, 0.18]} position={[0.62, 1.0, 0]} rotation={[0, 0, 0.5]} color={WHITE} />
        </group>
      )
    case 'tulip':
      return (
        <group>
          <TCyl radiusTop={0.1} radiusBottom={0.14} height={1.1} position={[0, 0.8, 0]} color={TOON.leafDark} />
          <TBlob position={[0.32, 0.72, 0]} scale={[0.32, 0.1, 0.18]} rotation={[0, 0, -0.5]} color={TOON.leaf} />
          {[0, 1, 2, 3, 4].map((i) => (
            <TCone key={i} radius={0.3} height={0.9} segments={6} position={[Math.cos((i / 5) * TAU) * 0.26, 1.65, Math.sin((i / 5) * TAU) * 0.26]} rotation={[Math.sin((i / 5) * TAU) * 0.35, 0, -Math.cos((i / 5) * TAU) * 0.35]} color={c} outline={i === 0} />
          ))}
          <TSphere position={[0, 1.5, 0]} scale={0.32} color={c} />
          <TCyl radiusTop={0.08} radiusBottom={0.1} height={0.4} position={[0, 2.0, 0]} color={TOON.flowerYellow} />
        </group>
      )
    case 'mushroom':
      return (
        <group>
          <TCyl radiusTop={0.32} radiusBottom={0.42} height={1.0} position={[0, 0.75, 0]} color={WHITE} outline />
          <TSphere position={[0, 1.42, 0]} scale={[0.85, 0.48, 0.85]} color={c} outline />
          {[0, 1, 2, 3].map((i) => (
            <TSphere key={i} position={[Math.cos(i * 1.6 + 0.4) * 0.55, 1.62, Math.sin(i * 1.6 + 0.4) * 0.55]} scale={0.12} color={WHITE} castShadow={false} />
          ))}
          <TCyl radiusTop={0.09} radiusBottom={0.12} height={0.38} position={[0, 1.98, 0]} color={TOON.metal} />
        </group>
      )
    case 'lighthouse':
      return (
        <group>
          <TCyl radiusTop={0.36} radiusBottom={0.56} height={1.6} position={[0, 1.0, 0]} color={WHITE} outline />
          {[0.55, 1.15].map((y) => (
            <TCyl key={y} radiusTop={0.5 - y * 0.13} radiusBottom={0.53 - y * 0.13} height={0.28} position={[0, y, 0]} color={c} castShadow={false} />
          ))}
          <TCyl radiusTop={0.44} radiusBottom={0.44} height={0.3} position={[0, 1.92, 0]} color={c} outline />
          <TCone radius={0.42} height={0.38} segments={10} position={[0, 2.25, 0]} color={c} />
        </group>
      )
    case 'shell':
      return (
        <group>
          <TCyl radiusTop={0.5} radiusBottom={0.62} height={0.5} position={[0, 0.45, 0]} color={TOON.sand} />
          {[-2, -1, 0, 1, 2].map((i) => (
            <TBox key={i} size={[0.34, 1.45, 0.24]} radius={0.12} position={[i * 0.26, 1.35 - Math.abs(i) * 0.1, -0.05]} rotation={[0, 0, -i * 0.3]} color={i % 2 ? WHITE : c} outline={i === 0} />
          ))}
          <TSphere position={[0, 1.95, 0]} scale={0.2} color={TOON.flowerPink} />
        </group>
      )
    case 'barrel':
      return (
        <group>
          <TCyl radiusTop={0.5} radiusBottom={0.5} height={1.2} position={[0, 0.85, 0]} color={c} outline />
          {[0.45, 1.25].map((y) => (
            <TCyl key={y} radiusTop={0.53} radiusBottom={0.53} height={0.1} position={[0, y, 0]} color={TOON.woodDark} castShadow={false} />
          ))}
          <TCyl radiusTop={0.12} radiusBottom={0.15} height={0.7} position={[0, 1.75, 0]} color={TOON.metal} />
          <TSphere position={[0, 2.1, 0]} scale={0.17} color={TOON.metal} />
        </group>
      )
  }
}

/** The height a tower's spray leaves from. */
export const NOZZLE_Y = 2.15

/**
 * A sprinkler on its slot: the rule's body, the badge above it (a billboard,
 * always facing the camera), a pop when it goes up or changes rule, and a
 * little kick each time it sprays (`kickRef[slot]`).
 */
export function Tower3D({ pos, ruleId, kickRef, slot, reduced, onTap }: { pos: Vec2; ruleId: RuleId; kickRef: RefObject<Float32Array>; slot: number; reduced: boolean; onTap: () => void }) {
  const g = useRef<Group>(null)
  const born = useRef(-1)
  const badge = useMemo(() => new SpriteMaterial({ map: ruleBadge(ruleId), transparent: true, depthWrite: false }), [ruleId])
  useEffect(() => () => badge.dispose(), [badge])
  useEffect(() => {
    born.current = -1
  }, [ruleId])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (born.current < 0) born.current = t
    const age = t - born.current
    const k = kickRef.current
    if (k) k[slot] = Math.max(0, k[slot] - dt * 4)
    const kick = k ? k[slot] : 0
    const grp = g.current
    if (!grp) return
    // pop in: overshoot and settle (reduced motion: just appear)
    const pop = reduced ? 1 : age > 0.45 ? 1 : 1 + Math.sin((age / 0.45) * Math.PI) * 0.25 - (1 - age / 0.45) * 0.25
    grp.scale.set(pop * (1 + kick * 0.08), pop * (1 - kick * 0.12), pop * (1 + kick * 0.08))
  })
  const tap = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onTap()
  }
  return (
    <group position={[pos.x, 0.22, pos.z]}>
      <group ref={g}>
        <Body id={ruleId} />
      </group>
      <sprite position={[0, 3.05, 0]} scale={[1.75, 1.31, 1]} material={badge} renderOrder={5} onPointerDown={tap} />
      <mesh position={[0, 1.2, 0]} material={hitMat} onPointerDown={tap}>
        <cylinderGeometry args={[0.9, 0.9, 2.4, 10]} />
      </mesh>
    </group>
  )
}

// ── the Mud Puddings ────────────────────────────────────────────────────────

/** Most Puddings drawn at once (a wave plus the ones still hopping away clean). */
export const FLOCK_MAX = 24

/** A Pudding that has just been washed (hops off clean) or splashed into the pond. */
export interface Leaving {
  id: number
  x: number
  z: number
  t: number
  kind: 'wash' | 'leak'
  value: PuddleValue
}

const MUDS = ['#8a5a36', '#7a4e2e', '#9a6640', '#80522f']
const CLEAN = new Color('#ffe2cf')
const _o = new Object3D()
const _c = new Color()
const _p: Vec2 = { x: 0, z: 0 }
const HIDE = new Object3D()
HIDE.scale.setScalar(0)
HIDE.updateMatrix()

/**
 * Every Pudding in three instanced meshes (bodies, eye whites, pupils) plus a
 * pool of label billboards. The frame loop writes their matrices straight
 * from the simulation (no React state per frame). A tap on a body or its
 * label calls `onTap` with that Pudding's id.
 */
export function Flock({ state, leavingRef, reduced, onTap, scale = 1 }: { state: PatrolState; leavingRef: RefObject<Leaving[]>; reduced: boolean; onTap: (id: number) => void; scale?: number }) {
  const bodies = useRef<InstancedMesh>(null)
  const whites = useRef<InstancedMesh>(null)
  const pupils = useRef<InstancedMesh>(null)
  const labels = useRef<(Sprite | null)[]>([])
  const ids = useRef<number[]>(new Array(FLOCK_MAX).fill(-1))
  const labelMats = useMemo(() => Array.from({ length: FLOCK_MAX }, () => new SpriteMaterial({ transparent: true, depthWrite: false })), [])
  useEffect(() => () => labelMats.forEach((m) => m.dispose()), [labelMats])
  const bodyMat = useMemo(() => new MeshToonMaterial({ color: '#ffffff', gradientMap: toonGradient() }), [])
  useEffect(() => () => bodyMat.dispose(), [bodyMat])

  useEffect(() => {
    for (const m of [bodies.current, whites.current, pupils.current]) {
      if (!m) continue
      for (let i = 0; i < m.count; i++) m.setMatrixAt(i, HIDE.matrix)
      m.instanceMatrix.needsUpdate = true
      // (they walk all over the field: never culled, and taps test them all)
      m.frustumCulled = false
      m.boundingSphere = new Sphere(new Vector3(0, 0, 0), 30)
    }
  }, [])

  useFrame(({ clock }) => {
    const s = state
    const b = bodies.current
    const w = whites.current
    const pu = pupils.current
    if (!b || !w || !pu) return
    const t = clock.elapsedTime
    let n = 0
    const put = (id: number, x: number, z: number, heading: number, phase: number, value: PuddleValue, mode: 'walk' | 'wash' | 'leak', k: number) => {
      if (n >= FLOCK_MAX) return
      const wob = reduced ? 0 : Math.sin(t * 7 + phase)
      let sy = 1 + wob * 0.08
      let sx = 1 - wob * 0.05
      let y = 0.64 + (reduced ? 0 : Math.abs(Math.sin(t * 7 + phase)) * 0.12)
      let size = 0.78 * scale
      _c.set(MUDS[id % MUDS.length])
      if (mode === 'wash') {
        // washed: it turns clean and hops away, smaller and smaller
        _c.lerp(CLEAN, Math.min(1, k * 3))
        y += Math.sin(Math.min(1, k) * Math.PI) * 1.4
        size *= Math.max(0, 1 - k * k)
        sx = 1
        sy = 1
      } else if (mode === 'leak') {
        // splashed into the pond: down it goes
        y -= k * 0.9
        size *= Math.max(0, 1 - k)
      }
      _o.position.set(x, y * scale, z)
      _o.rotation.set(0, heading, 0)
      _o.scale.set(size * sx, size * 0.82 * sy, size * sx)
      _o.updateMatrix()
      b.setMatrixAt(n, _o.matrix)
      b.setColorAt(n, _c)
      // eyes look toward the camera, a little along the way it walks
      const fx = Math.sin(heading) * 0.45
      const fz = 0.75 + Math.cos(heading) * 0.25
      const fl = Math.hypot(fx, fz) || 1
      const ex = fx / fl
      const ez = fz / fl
      for (const side of [-1, 1]) {
        const sxp = -ez * side * 0.22 * size
        const szp = ex * side * 0.22 * size
        _o.position.set(x + ex * 0.5 * size + sxp, (y + 0.12) * scale, z + ez * 0.5 * size + szp)
        _o.rotation.set(0, 0, 0)
        _o.scale.setScalar(0.17 * size)
        _o.updateMatrix()
        w.setMatrixAt(n * 2 + (side > 0 ? 1 : 0), _o.matrix)
        _o.position.set(x + ex * 0.62 * size + sxp, (y + 0.12) * scale, z + ez * 0.62 * size + szp)
        _o.scale.setScalar(0.09 * size)
        _o.updateMatrix()
        pu.setMatrixAt(n * 2 + (side > 0 ? 1 : 0), _o.matrix)
      }
      const sp = labels.current[n]
      if (sp) {
        const mat = sp.material as SpriteMaterial
        const map = puddingLabel(value)
        if (mat.map !== map) {
          mat.map = map
          mat.needsUpdate = true
        }
        sp.visible = mode === 'walk' || k < 0.35
        sp.position.set(x, (y + 1.0) * scale + size * 0.55, z)
        const ls = 1.75 * scale
        sp.scale.set(ls, ls, 1)
      }
      ids.current[n] = mode === 'walk' ? id : -1
      n++
    }
    for (const p of s.puddings) {
      pointAt(s.layout, p.s, _p)
      put(p.id, _p.x, _p.z, headingAt(s.layout, p.s), p.id * 1.7, p.value, 'walk', 0)
    }
    const leaving = leavingRef.current ?? []
    for (const l of leaving) put(l.id, l.x, l.z, 0, l.id * 1.7, l.value, l.kind, l.t / (l.kind === 'wash' ? 0.9 : 0.6))
    for (let i = n; i < FLOCK_MAX; i++) {
      b.setMatrixAt(i, HIDE.matrix)
      w.setMatrixAt(i * 2, HIDE.matrix)
      w.setMatrixAt(i * 2 + 1, HIDE.matrix)
      pu.setMatrixAt(i * 2, HIDE.matrix)
      pu.setMatrixAt(i * 2 + 1, HIDE.matrix)
      const sp = labels.current[i]
      if (sp) sp.visible = false
      ids.current[i] = -1
    }
    b.instanceMatrix.needsUpdate = true
    if (b.instanceColor) b.instanceColor.needsUpdate = true
    w.instanceMatrix.needsUpdate = true
    pu.instanceMatrix.needsUpdate = true
  })

  const tapBody = (e: ThreeEvent<PointerEvent>) => {
    const i = e.instanceId
    if (i === undefined) return
    const id = ids.current[i]
    if (id < 0) return
    e.stopPropagation()
    onTap(id)
  }
  const tapLabel = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    const id = ids.current[i]
    if (id < 0) return
    e.stopPropagation()
    onTap(id)
  }

  return (
    <group>
      <instancedMesh ref={bodies} args={[geo.sphere(14), bodyMat, FLOCK_MAX]} castShadow onPointerDown={tapBody} />
      <instancedMesh ref={whites} args={[geo.sphere(8), toonMaterial('#ffffff'), FLOCK_MAX * 2]} />
      <instancedMesh ref={pupils} args={[geo.sphere(8), toonMaterial(TOON.eye), FLOCK_MAX * 2]} />
      {labelMats.map((m, i) => (
        <sprite
          key={i}
          ref={(el) => {
            labels.current[i] = el
          }}
          material={m}
          visible={false}
          renderOrder={6}
          onPointerDown={tapLabel(i)}
        />
      ))}
    </group>
  )
}

// ── sprays ──────────────────────────────────────────────────────────────────

const SPRAY_MAX = 48

/**
 * The water in the air: each shot is a fat drop (and two little ones behind
 * it) arcing from the tower's nozzle to its Pudding. One instanced mesh.
 */
export function Sprays({ state }: { state: PatrolState }) {
  const mesh = useRef<InstancedMesh>(null)
  const mat = useMemo(() => toonMaterial('#bfeaff', { emissive: '#7fd0ff', emissiveIntensity: 0.35 }), [])
  useEffect(() => {
    const m = mesh.current
    if (!m) return
    for (let i = 0; i < SPRAY_MAX; i++) m.setMatrixAt(i, HIDE.matrix)
    m.instanceMatrix.needsUpdate = true
    m.frustumCulled = false
  }, [])
  useFrame(() => {
    const s = state
    const m = mesh.current
    if (!m) return
    let n = 0
    for (const sh of s.shots) {
      const p = s.puddings.find((q) => q.id === sh.target)
      if (!p) continue
      const slot = s.layout.slots[sh.slot].pos
      pointAt(s.layout, p.s, _p)
      for (let k = 0; k < 3 && n < SPRAY_MAX; k++) {
        const f = Math.max(0, Math.min(1, sh.t / s.tuning.flight - k * 0.12))
        const x = slot.x + (_p.x - slot.x) * f
        const z = slot.z + (_p.z - slot.z) * f
        const y = NOZZLE_Y + 0.2 + (0.6 - NOZZLE_Y) * f + Math.sin(f * Math.PI) * 1.4
        _o.position.set(x, y, z)
        _o.rotation.set(0, 0, 0)
        _o.scale.setScalar(k === 0 ? 0.2 : 0.12)
        _o.updateMatrix()
        m.setMatrixAt(n++, _o.matrix)
      }
    }
    for (let i = n; i < SPRAY_MAX; i++) m.setMatrixAt(i, HIDE.matrix)
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[geo.sphere(8), mat, SPRAY_MAX]} />
}
