import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Color, Euler, Group, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3 } from 'three'
import type { BufferGeometry } from 'three'
import { TOON } from '../toon/palette'
import { geo } from '../toon/geometry'
import { toonMaterial } from '../toon/materials'
import { TBox, TCyl, TSphere } from '../toon/shapes'
import { Instances, type Inst } from '../world/town/kit'
import { chalkText } from '../world/town/chalk'
import Roadrunner from '../world/areas/multiplication-mesa/Roadrunner'
import { FIELD, tileCenter, type Planted } from '../lib/grove/groveCore'
import { juice } from './_juice/juice'
import { SpeechBubble } from './_juice/JuiceHud'
import { CRATES, FIELD_HALF, HOST, wpos } from './TimesGrove.layout'
import { localX, localZ } from './_scene/isoFrame'

/**
 * Visual pieces for Times Grove (TimesGrove.tsx). Dumb and presentational:
 * they take plain props and animate themselves in useFrame; the rules live in
 * the flow. Everything sits in the grove's local frame (TimesGrove.layout).
 */

const N = FIELD.rows * FIELD.cols
/** Tile centres, precomputed (frame loops read these instead of allocating). */
const TX = new Float32Array(N)
const TZ = new Float32Array(N)
for (let r = 0; r < FIELD.rows; r++)
  for (let c = 0; c < FIELD.cols; c++) {
    const [x, z] = tileCenter(r, c)
    TX[r * FIELD.cols + c] = x
    TZ[r * FIELD.cols + c] = z
  }
const SOIL = '#c99a66'
const SOIL_TILLED = '#9a6b45'
const SOIL_SEED = '#b07a4c'
const CROWN = '#5cbf6a'
const CROWN_BLOOM = '#8edb7c'
const BLOSSOM = '#fcd3e2'

export type FieldMode = 'build' | 'wilt' | 'bloom' | 'harvest'

const _m = new Matrix4()
const _q = new Quaternion()
const _e = new Euler()
const _p = new Vector3()
const _s = new Vector3()
const _zero = new Matrix4().makeScale(0, 0, 0)
const _c = new Color()
const _c2 = new Color()

/** A unit geometry per tree part, placed by instance matrices. */
const PARTS: { geometry: BufferGeometry; y: number; s: [number, number, number] }[] = [
  { geometry: geo.cyl(0.7, 1, 1, 6), y: 0.22, s: [0.07, 0.44, 0.07] }, // trunk
  { geometry: geo.blob(1), y: 0.6, s: [0.27, 0.28, 0.27] }, // crown
]

/**
 * The planting field: a raised bed of 7 × 7 tiles; the planted rectangle's
 * tiles are tilled dark and grow a sapling each (one instanced draw per part).
 * Saplings spring up when the rectangle grows (and pop back down when it
 * shrinks); `bloomed` rows burst into blossom and fruit, row by row, for the
 * chant; 'wilt' droops a wrong shape; 'harvest' shrinks it all away; `spin`
 * turns the block a quarter turn and back (3 rows of 4 IS 4 rows of 3).
 */
export function PlantField({ shape, mode, bloomed, spin, fruit }: { shape: Planted | null; mode: FieldMode; bloomed: number; spin: boolean; fruit: string }) {
  const tiles = useRef<InstancedMesh>(null)
  const parts = useRef<(InstancedMesh | null)[]>([])
  const fruitMesh = useRef<InstancedMesh>(null)
  // stable colour buffers: an inline array would rebuild (and whiten) the attribute every render
  const [buf] = useState(() => ({ tiles: new Float32Array(N * 3).fill(1), crowns: new Float32Array(N * 3).fill(1), fruit: new Float32Array(N * 9).fill(1) }))
  const live = useRef({ shape, mode, bloomed, spin })
  useEffect(() => {
    live.current = { shape, mode, bloomed, spin }
  }, [shape, mode, bloomed, spin])

  const sim = useRef({
    s: new Float32Array(N),
    v: new Float32Array(N),
    bloom: new Float32Array(N),
    wilt: 0,
    spinT: 0,
    spinA: 0,
    dirty: true,
  })

  // tile colours: tilled inside the planted rectangle, plain soil outside
  useEffect(() => {
    const m = tiles.current
    if (!m) return
    for (let r = 0; r < FIELD.rows; r++)
      for (let c = 0; c < FIELD.cols; c++) {
        const i = r * FIELD.cols + c
        const inside = !!shape && r < shape.rows && c < shape.cols
        const checker = (r + c) % 2 === 0 ? 1 : 0.94
        _c.set(inside ? SOIL_TILLED : r === 0 && c === 0 ? SOIL_SEED : SOIL).multiplyScalar(checker)
        m.setColorAt(i, _c)
      }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    sim.current.dirty = true
  }, [shape])

  // tile layout (static)
  useEffect(() => {
    const m = tiles.current
    if (!m) return
    for (let r = 0; r < FIELD.rows; r++)
      for (let c = 0; c < FIELD.cols; c++) {
        const [x, z] = tileCenter(r, c)
        _p.set(x, 0.06, z)
        _s.set(FIELD.pitch - 0.07, 0.12, FIELD.pitch - 0.07)
        m.setMatrixAt(r * FIELD.cols + c, _m.compose(_p, _q.identity(), _s))
      }
    m.instanceMatrix.needsUpdate = true
  }, [])

  // fruit colour per order
  useEffect(() => {
    const m = fruitMesh.current
    if (!m) return
    for (let i = 0; i < N * 3; i++) m.setColorAt(i, _c.set(i % 3 === 2 ? BLOSSOM : fruit))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [fruit])

  useFrame(({ clock }, rawDt) => {
    const st = sim.current
    const { shape: sh, mode: md, bloomed: bl, spin: sp } = live.current
    const dt = juice.frozen() ? 0 : Math.min(rawDt, 0.05)
    const t = clock.elapsedTime
    // springs toward each tile's target
    let moving = false
    for (let r = 0; r < FIELD.rows; r++)
      for (let c = 0; c < FIELD.cols; c++) {
        const i = r * FIELD.cols + c
        const inside = !!sh && r < sh.rows && c < sh.cols && md !== 'harvest'
        const target = inside ? (md === 'bloom' && r < bl ? 1.3 : 1) : 0
        const x = st.s[i]
        st.v[i] += ((target - x) * 260 - st.v[i] * 15) * dt
        st.s[i] = Math.max(0, x + st.v[i] * dt)
        if (Math.abs(st.v[i]) > 1e-3 || Math.abs(target - st.s[i]) > 1e-3) moving = true
        const bt = md === 'bloom' && inside && r < bl ? 1 : md === 'bloom' && inside ? st.bloom[i] : 0
        if (st.bloom[i] !== bt) {
          st.bloom[i] += Math.sign(bt - st.bloom[i]) * Math.min(Math.abs(bt - st.bloom[i]), dt * 5)
          moving = true
        }
      }
    const wt = md === 'wilt' ? 1 : 0
    if (st.wilt !== wt) {
      st.wilt += Math.sign(wt - st.wilt) * Math.min(Math.abs(wt - st.wilt), dt * 4)
      moving = true
    }
    // the commutativity beat: a quarter turn and back
    if (sp || st.spinT > 0) {
      st.spinT = sp ? Math.min(1, st.spinT + dt / 0.5) : Math.max(0, st.spinT - dt / 0.5)
      st.spinA = (1 - Math.cos(st.spinT * Math.PI)) * 0.5 * (Math.PI / 2)
      moving = true
    }
    if (!moving && !st.dirty && md !== 'build' && md !== 'bloom') return
    st.dirty = false

    // block centre for the spin
    const rows = sh?.rows ?? 1
    const cols = sh?.cols ?? 1
    const bx = TX[0] + ((cols - 1) * FIELD.pitch) / 2
    const bz = TZ[0] + ((rows - 1) * FIELD.pitch) / 2
    const ca = Math.cos(st.spinA)
    const sa = Math.sin(st.spinA)
    const lift = Math.sin(st.spinT * Math.PI) * 0.25

    for (let pi = 0; pi < PARTS.length; pi++) {
      const mesh = parts.current[pi]
      if (!mesh) continue
      const part = PARTS[pi]
      for (let r = 0; r < FIELD.rows; r++)
        for (let c = 0; c < FIELD.cols; c++) {
          const i = r * FIELD.cols + c
          const k = st.s[i]
          if (k < 0.01) {
            mesh.setMatrixAt(i, _zero)
            continue
          }
          let x = TX[i]
          let z = TZ[i]
          if (st.spinA > 0) {
            const dx = x - bx
            const dz = z - bz
            x = bx + dx * ca - dz * sa
            z = bz + dx * sa + dz * ca
          }
          const sway = md === 'build' ? Math.sin(t * 2.2 + i * 0.7) * 0.04 : 0
          const droop = st.wilt * 0.45
          const grow = 0.75 + st.bloom[i] * 0.35
          _p.set(x, 0.12 + lift + part.y * k * grow, z)
          _q.setFromEuler(_e.set(droop + sway * 0.5, i * 1.3, droop * 0.4 + sway))
          _s.set(part.s[0] * k * grow, part.s[1] * k * grow * (1 - st.wilt * 0.25), part.s[2] * k * grow)
          mesh.setMatrixAt(i, _m.compose(_p, _q, _s))
        }
      mesh.instanceMatrix.needsUpdate = true
      if (pi === 1) {
        // crowns: fresh green, wilting toward a dry olive
        for (let i = 0; i < N; i++) mesh.setColorAt(i, _c.set(CROWN).lerp(_c2.set(CROWN_BLOOM), st.bloom[i]).lerp(_c2.set('#b5a46a'), st.wilt * 0.8))
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      }
    }
    // fruit: three per tree (two fruit + a blossom), grown by the bloom
    const fm = fruitMesh.current
    if (fm) {
      for (let r = 0; r < FIELD.rows; r++)
        for (let c = 0; c < FIELD.cols; c++) {
          const i = r * FIELD.cols + c
          const b = st.bloom[i] * Math.min(1, st.s[i])
          for (let j = 0; j < 3; j++) {
            if (b < 0.02) {
              fm.setMatrixAt(i * 3 + j, _zero)
              continue
            }
            let x = TX[i]
            let z = TZ[i]
            if (st.spinA > 0) {
              const dx = x - bx
              const dz = z - bz
              x = bx + dx * ca - dz * sa
              z = bz + dx * sa + dz * ca
            }
            // two fruit hanging on the camera side of the crown, a blossom on top
            const a = j === 2 ? 0 : (j === 0 ? -0.9 : 0.9) + Math.PI / 2 + (i % 3) * 0.2
            const k = st.s[i] * (0.75 + st.bloom[i] * 0.35)
            // fruit sit just outside the crown (radius 0.27k around 0.6k) so they read as fruit
            const out = j === 2 ? 0 : 0.3
            _p.set(x + Math.cos(a) * out * k, 0.12 + lift + (j === 2 ? 0.92 : 0.46 + j * 0.08) * k, z + Math.sin(a) * out * k)
            _s.setScalar((j === 2 ? 0.1 : 0.11) * b * k)
            fm.setMatrixAt(i * 3 + j, _m.compose(_p, _q.identity(), _s))
          }
        }
      fm.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      {/* the raised bed and its rim */}
      <TBox size={[FIELD_HALF * 2 + 0.3, 0.16, FIELD_HALF * 2 + 0.3]} radius={0.06} position={[0, 0.0, 0]} color={'#a8774a'} receiveShadow />
      <instancedMesh ref={tiles} args={[geo.box(1, 1, 1, 0.12), toonMaterial('#ffffff'), N]} receiveShadow>
        <instancedBufferAttribute attach="instanceColor" args={[buf.tiles, 3]} />
      </instancedMesh>
      {PARTS.map((p, i) => (
        <instancedMesh
          key={i}
          ref={(el) => {
            parts.current[i] = el
          }}
          args={[p.geometry, toonMaterial(i === 0 ? TOON.bark : '#ffffff'), N]}
          castShadow
          frustumCulled={false}
        >
          {i === 1 && <instancedBufferAttribute attach="instanceColor" args={[buf.crowns, 3]} />}
        </instancedMesh>
      ))}
      <instancedMesh ref={fruitMesh} args={[geo.sphere(8), toonMaterial('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.08 }), N * 3]} frustumCulled={false}>
        <instancedBufferAttribute attach="instanceColor" args={[buf.fruit, 3]} />
      </instancedMesh>
    </group>
  )
}

/**
 * Chalk row/column numbers on little stakes along the top and left edges of
 * the field — the warm-up scaffold (it fades away after). The current
 * rectangle's edge numbers glow gold so "3 rows, 4 in each" can be read off.
 */
export function FieldLabels({ shape }: { shape: Planted | null }) {
  const stakes = useMemo<Inst[]>(() => {
    const out: Inst[] = []
    for (let c = 0; c < FIELD.cols; c++) {
      const [x] = tileCenter(0, c)
      out.push({ x, y: 0.26, z: -FIELD_HALF - 0.45, s: [0.6, 0.46, 0.08] })
    }
    for (let r = 0; r < FIELD.rows; r++) {
      const [, z] = tileCenter(r, 0)
      out.push({ x: -FIELD_HALF - 0.5, y: 0.26, z, s: [0.6, 0.46, 0.08] })
    }
    return out
  }, [])
  return (
    <group>
      <Instances geometry={geo.box(1, 1, 1, 0.25)} color={'#3c4657'} items={stakes} />
      {Array.from({ length: FIELD.cols }, (_, c) => (
        <EdgeNumber key={`c${c}`} n={c + 1} x={tileCenter(0, c)[0]} z={-FIELD_HALF - 0.4} hot={!!shape && shape.cols === c + 1} />
      ))}
      {Array.from({ length: FIELD.rows }, (_, r) => (
        <EdgeNumber key={`r${r}`} n={r + 1} x={-FIELD_HALF - 0.5} z={tileCenter(r, 0)[1] + 0.05} hot={!!shape && shape.rows === r + 1} />
      ))}
    </group>
  )
}

function EdgeNumber({ n, x, z, hot }: { n: number; x: number; z: number; hot: boolean }) {
  const items = useMemo(() => chalkText(String(n), { y: 0, z: 0, w: 0.17, h: 0.3, t: 0.05, gap: 0.05, color: '#ffffff' }), [n])
  return (
    <group position={[x, 0.27, z]}>
      <group position={[0, 0, 0.05]}>
        <Instances key={hot ? 'hot' : 'cold'} geometry={geo.box(1, 1, 1, 0.2)} color={hot ? '#ffd75e' : '#fff3c4'} mat={hot ? { emissive: '#ffd75e', emissiveIntensity: 0.5 } : undefined} items={items} />
      </group>
    </group>
  )
}

/** The seed bag beside the corner tile: where every planting starts. */
export function SeedBag({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <TSphere scale={[0.32, 0.36, 0.3]} position={[0, 0.34, 0]} color={'#e2c48a'} outline segments={12} />
      <TCyl radiusTop={0.12} radiusBottom={0.18} height={0.18} position={[0, 0.72, 0]} color={'#d2b07a'} segments={10} />
      <TCyl radiusTop={0.19} height={0.05} position={[0, 0.66, 0]} color={TOON.flowerRed} castShadow={false} segments={10} />
      {[-0.12, 0.05, 0.16].map((dx, i) => (
        <TSphere key={i} scale={0.05} position={[dx, 0.82 + (i % 2) * 0.03, 0.04]} color={'#8a5a34'} castShadow={false} segments={6} />
      ))}
      <TBox size={[0.3, 0.3, 0.02]} radius={0.04} position={[0, 0.36, 0.3]} rotation={[0.1, 0, 0]} color={TOON.leafLight} castShadow={false} />
    </group>
  )
}

/** One crate per order planted right, stacked by the field, chalked with the total. */
export function CrateStack({ totals, fruits }: { totals: number[]; fruits: string[] }) {
  return (
    <group position={[CRATES.x, 0, CRATES.z]}>
      {totals.map((n, i) => (
        <Crate key={i} total={n} fruit={fruits[i] ?? TOON.flowerRed} level={i} />
      ))}
    </group>
  )
}

function Crate({ total, fruit, level }: { total: number; fruit: string; level: number }) {
  const col = level % 3
  const row = Math.floor(level / 3)
  const items = useMemo(() => chalkText(String(total), { y: 0, z: 0, w: 0.15, h: 0.24, t: 0.04, gap: 0.06, color: '#f4ead2' }), [total])
  const g = useRef<Group>(null)
  const t0 = useRef<number | null>(null)
  useFrame(({ clock }) => {
    const m = g.current
    if (!m) return
    if (t0.current === null) t0.current = clock.elapsedTime
    const k = Math.min(1, (clock.elapsedTime - t0.current) / 0.45)
    const drop = (1 - k) * 2.2
    m.position.y = row * 0.62 + 0.28 + drop * drop * 0.4
  })
  return (
    <group ref={g} position={[(col - 1) * 0.98 + row * 0.2, 0.28, row * -0.1]} rotation={[0, (level % 2 ? -1 : 1) * 0.08, 0]}>
      <TBox size={[0.9, 0.56, 0.8]} radius={0.05} color={TOON.wood} outline />
      <TBox size={[0.94, 0.1, 0.84]} radius={0.02} position={[0, 0.0, 0]} color={TOON.woodDark} castShadow={false} />
      {[-0.22, 0, 0.22].map((dx, i) => (
        <TSphere key={i} scale={0.15} position={[dx, 0.33, (i % 2) * 0.12 - 0.05]} color={fruit} castShadow={false} segments={10} />
      ))}
      <group position={[0, 0.02, 0.42]}>
        <Instances geometry={geo.box(1, 1, 1, 0.2)} color={'#f4ead2'} items={items} />
      </group>
    </group>
  )
}

export type KeeperMood = 'idle' | 'cheer' | 'worry' | 'zip' | 'wave'

/**
 * The keeper: the Mesa's Roadrunner, big, on a stump left of the field. Moods
 * retrigger with `token`: cheer = hop-spin, worry = head-shake wobble, wave =
 * bouncing hello, zip = a "beep beep" lap around the whole field with a dust
 * trail (the bloom celebration). A speech bubble carries the order.
 */
export function Keeper({ mood, token, say }: { mood: KeeperMood; token: number; say: string | null }) {
  const g = useRef<Group>(null)
  const t0 = useRef<number | null>(null)
  const last = useRef(-1)
  const lastDust = useRef(0)
  useFrame(({ clock }) => {
    const m = g.current
    if (!m) return
    const now = clock.elapsedTime
    if (last.current !== token) {
      last.current = token
      t0.current = now
    }
    const t = now - (t0.current ?? now)
    let x = HOST.x
    let z = HOST.z
    let y = 0.32
    let ry = 0.9
    let rz = 0
    if (mood === 'zip' && t < 2.2) {
      // a lap around the field: out along a rounded square at speed
      // there and back along the far side of the field (never in front of it)
      const R = FIELD_HALF + 1.45
      const u = t / 2.2
      const a = Math.PI + Math.PI * Math.sin(u * Math.PI)
      const da = Math.cos(u * Math.PI) // direction of travel along the arc
      const k = Math.min(1, t / 0.25) * Math.min(1, (2.2 - t) / 0.25)
      x = HOST.x + (Math.cos(a) * R - HOST.x) * k
      z = HOST.z + (Math.sin(a) * R * 1.05 - HOST.z) * k
      y = 0.32 * (1 - k) + Math.abs(Math.sin(t * 22)) * 0.12
      ry = Math.atan2(-Math.sin(a) * da, Math.cos(a) * da)
      if (now - lastDust.current > 0.08) {
        lastDust.current = now
        juice.dust(wpos(x, 0.05, z))
      }
    } else if (mood === 'cheer' && t < 1.4) {
      y = 0.32 + Math.abs(Math.sin(t * 9)) * 0.4 * (1 - t / 1.4)
      ry = 0.9 + Math.min(1, t / 0.5) * Math.PI * 2
    } else if (mood === 'worry' && t < 1.3) {
      rz = Math.sin(t * 16) * 0.1
    } else if (mood === 'wave' && t < 2.2) {
      y = 0.32 + Math.abs(Math.sin(t * 6)) * 0.2
    } else {
      y = 0.32 + Math.sin(now * 2.2) * 0.02
    }
    m.position.set(x, y, z)
    m.rotation.set(0, ry, rz)
  })
  return (
    <group>
      {/* the stump the keeper stands on */}
      <TCyl radiusTop={0.42} radiusBottom={0.5} height={0.32} position={[HOST.x, 0.16, HOST.z]} color={TOON.bark} outline segments={12} />
      <TCyl radiusTop={0.36} height={0.02} position={[HOST.x, 0.33, HOST.z]} color={TOON.woodLight} castShadow={false} segments={12} />
      <group ref={g} position={[HOST.x, 0.32, HOST.z]}>
        <group scale={1.6}>
          <Roadrunner />
        </group>
      </group>
      {/* the bubble stays by the stump (and leans toward the field, so it never
          slides off the left edge of the screen) */}
      {say && (
        <Html position={[HOST.x + 1.15, 2.75, HOST.z]} center zIndexRange={[15, 5]} style={{ pointerEvents: 'none' }}>
          <SpeechBubble key={`${token}:${say}`} text={say} />
        </Html>
      )}
    </group>
  )
}

/**
 * The "taking root" ring under a kid standing still on the field: a flat disc
 * that fills as the dwell runs (read from a ref every frame, no re-render).
 */
export function RootRing({ avatarRef, progress }: { avatarRef: RefObject<Group | null>; progress: RefObject<number> }) {
  const ring = useRef<Mesh>(null)
  const fill = useRef<Mesh>(null)
  useFrame(() => {
    const a = avatarRef.current
    const k = progress.current ?? 0
    const r = ring.current
    const f = fill.current
    if (!a || !r || !f) return
    const lx = localX(a.position.x, a.position.z)
    const lz = localZ(a.position.x, a.position.z)
    const show = k > 0.04
    r.visible = show
    f.visible = show
    r.position.set(lx, 0.16, lz)
    f.position.set(lx, 0.165, lz)
    f.scale.setScalar(Math.max(0.01, Math.min(1, k)) * 0.5)
  })
  return (
    <group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.46, 0.54, 40]} />
        <meshBasicMaterial color={'#fff6cf'} transparent opacity={0.85} />
      </mesh>
      <mesh ref={fill} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color={'#ffd75e'} transparent opacity={0.6} />
      </mesh>
    </group>
  )
}
