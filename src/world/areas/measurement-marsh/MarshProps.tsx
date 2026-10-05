import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CircleGeometry, CylinderGeometry } from 'three'
import type { Group } from 'three'
import { seededRng } from '../../../lib/random'
import { TOON } from '../../../toon/palette'
import { toonMaterial } from '../../../toon/materials'
import { geo } from '../../../toon/geometry'
import { ToonInstances, type InstanceSpec } from '../../../toon/Scatter'
import { TBox, TCone, TCyl, TSphere, type Vec3 } from '../../../toon/shapes'
import { MARSH } from '../colliders/measurement-marsh'

const INK = '#3a2c38'
const RULER_A = '#fff1c4'
const RULER_B = '#ffd75e'
const { pond, pier } = MARSH

/** A lily pad: a disc with a wedge notch (built once, instanced). */
const padGeo = new CylinderGeometry(1, 1, 0.04, 16, 1, false, 0.4, Math.PI * 2 - 0.8)
/** Flat unit disc, scaled into the pond's ellipses. */
const discGeo = new CircleGeometry(1, 40)
/** A plain unit box for ticks (scaled per instance). */
const tickGeo = geo.box(1, 1, 1, 0.08)

// ── the ruler pier ──────────────────────────────────────────────────────────
const PLANK_W = 0.3
const PLANKS = Math.round((pier.x1 - pier.x0) / PLANK_W)
const DECK_Y = 0.095
const DECK_TOP = DECK_Y + 0.05

const PIER_PLANKS: InstanceSpec[] = Array.from({ length: PLANKS }, (_, i) => ({
  x: pier.x0 + (i + 0.5) * PLANK_W,
  y: DECK_Y,
  z: pond.cz,
  color: i % 2 ? RULER_B : RULER_A,
}))

const POSTS: InstanceSpec[] = [23.6, 25.0, 26.4, pier.x1 - 0.1].flatMap((x) =>
  [-1, 1].map((s) => ({ x, y: 0.15, z: pond.cz + s * (pier.halfW + 0.04), color: TOON.woodDark })),
)

/** Ruler graduations: short ticks every plank, long ones every 4, plus dot "numbers". */
const TICKS: InstanceSpec[] = (() => {
  const out: InstanceSpec[] = []
  const edge = pond.cz + pier.halfW - 0.04
  for (let i = 0; i <= PLANKS; i++) {
    const long = i % 4 === 0
    const len = long ? 0.46 : 0.22
    out.push({ x: pier.x0 + i * PLANK_W, y: DECK_TOP + 0.01, z: edge - len / 2, s: [0.045, 0.025, len], color: INK })
  }
  // the gauge post's height marks (facing the camera)
  const [gx, gz] = MARSH.gauge
  for (let k = 1; k <= 9; k++) {
    const long = k % 2 === 0
    out.push({ x: gx + 0.11, y: k * 0.3, z: gz + 0.11, s: [long ? 0.16 : 0.09, 0.03, 0.03], rot: -Math.PI / 4, color: INK })
  }
  return out
})()
const PIPS: InstanceSpec[] = [1, 2, 3, 4].flatMap((n) => {
  const x = pier.x0 + n * 4 * PLANK_W
  return Array.from({ length: n }, (_, k) => ({
    x: x - 0.04 - k * 0.11,
    y: DECK_TOP + 0.01,
    z: pond.cz - 0.12,
    s: [0.045, 0.02, 0.045] as [number, number, number],
    color: INK,
  }))
})

/** The walkable ruler pier: striped planks, graduations, dot numbers, bollards. */
export function RulerPier() {
  const len = pier.x1 - pier.x0
  const mid = (pier.x0 + pier.x1) / 2
  return (
    <group>
      <ToonInstances geometry={geo.box(PLANK_W - 0.02, 0.1, pier.halfW * 2, 0.03)} color={TOON.white} items={PIER_PLANKS} receiveShadow />
      {[-1, 1].map((s) => (
        <TBox key={s} size={[len + 0.1, 0.12, 0.1]} radius={0.03} position={[mid, 0.075, pond.cz + s * (pier.halfW + 0.02)]} color={TOON.woodDark} outline castShadow={false} />
      ))}
      <ToonInstances geometry={geo.cyl(0.09, 0.1, 0.42, 8)} color={TOON.white} items={POSTS} />
      <ToonInstances geometry={tickGeo} color={TOON.white} items={TICKS} castShadow={false} />
      <ToonInstances geometry={geo.sphere(6)} color={TOON.white} items={PIPS} castShadow={false} />
    </group>
  )
}

/** A tall water-level gauge: red and white bands with height marks, a flag on top. */
export function GaugePost() {
  const [gx, gz] = MARSH.gauge
  const flag = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 2) * 0.3 - 0.4
  })
  return (
    <group position={[gx, 0, gz]}>
      <TCyl radiusTop={0.13} radiusBottom={0.15} height={3.0} position={[0, 1.5, 0]} color={TOON.white} outline segments={10} />
      {[0, 1, 2, 3, 4].map((k) => (
        <TCyl key={k} radiusTop={0.145} height={0.3} position={[0, 0.45 + k * 0.6, 0]} color={TOON.flowerRed} segments={10} castShadow={false} />
      ))}
      <TSphere position={[0, 3.08, 0]} scale={0.15} color={TOON.gold} outline segments={10} />
      <group ref={flag} position={[0, 2.9, 0]}>
        <TBox size={[0.5, 0.3, 0.04]} radius={0.04} position={[0.3, 0, 0]} color={TOON.flowerYellow} outline castShadow={false} />
      </group>
      <TCyl radiusTop={0.32} radiusBottom={0.36} height={0.05} position={[0, 0.03, 0]} color={TOON.foam} castShadow={false} segments={14} />
    </group>
  )
}

/** A balance scale that rocks gently: three weights against one big apple. */
export function Balance() {
  const [bx, bz] = MARSH.balance
  const beam = useRef<Group>(null)
  const panL = useRef<Group>(null)
  const panR = useRef<Group>(null)
  useFrame(({ clock }) => {
    const a = Math.sin(clock.elapsedTime * 1.1) * 0.12
    if (beam.current) beam.current.rotation.z = a
    if (panL.current) panL.current.rotation.z = -a
    if (panR.current) panR.current.rotation.z = -a
  })
  const pan = (side: number, ref: typeof panL) => (
    <group ref={ref} position={[side * 0.78, 0, 0]}>
      <TCyl radiusTop={0.035} height={0.5} position={[0, -0.25, 0]} color={TOON.woodDark} castShadow={false} />
      <TCyl radiusTop={0.36} radiusBottom={0.26} height={0.09} position={[0, -0.52, 0]} color={TOON.gold} outline segments={14} />
      {side < 0 ? (
        <group position={[0, -0.47, 0]}>
          <TCyl radiusTop={0.2} radiusBottom={0.22} height={0.13} position={[0, 0.065, 0]} color={TOON.metal} outline segments={10} />
          <TCyl radiusTop={0.15} radiusBottom={0.17} height={0.12} position={[0, 0.19, 0]} color={TOON.metal} outline segments={10} />
          <TCyl radiusTop={0.1} radiusBottom={0.12} height={0.11} position={[0, 0.305, 0]} color={TOON.metal} outline segments={10} />
          <TSphere position={[0, 0.39, 0]} scale={0.05} color={TOON.metal} castShadow={false} segments={8} />
        </group>
      ) : (
        <group position={[0, -0.2, 0]}>
          <TSphere scale={[0.28, 0.25, 0.28]} color={TOON.flowerRed} outline segments={14} />
          <TCyl radiusTop={0.025} height={0.12} position={[0, 0.28, 0]} color={TOON.bark} castShadow={false} />
          <TSphere position={[0.09, 0.3, 0]} scale={[0.1, 0.035, 0.06]} rotation={[0, 0, 0.5]} color={TOON.leaf} castShadow={false} segments={8} />
        </group>
      )}
    </group>
  )
  return (
    <group position={[bx, 0, bz]} rotation={[0, Math.PI / 4, 0]}>
      <TCyl radiusTop={0.4} radiusBottom={0.5} height={0.18} position={[0, 0.09, 0]} color={TOON.woodDark} outline segments={12} />
      <TCyl radiusTop={0.07} radiusBottom={0.09} height={1.35} position={[0, 0.85, 0]} color={TOON.wood} outline segments={8} />
      <group ref={beam} position={[0, 1.5, 0]}>
        <TBox size={[1.7, 0.11, 0.13]} radius={0.04} color={TOON.gold} outline />
        <TSphere scale={0.11} color={TOON.gold} castShadow={false} segments={10} />
        {pan(-1, panL)}
        {pan(1, panR)}
      </group>
      <TCone radius={0.07} height={0.18} position={[0, 1.7, 0]} color={TOON.flowerRed} castShadow={false} segments={6} />
    </group>
  )
}

// ── pond life ───────────────────────────────────────────────────────────────
const PADS: InstanceSpec[] = [
  [25.2, -6.1, 0.42], [26.5, -6.55, 0.36], [27.9, -6.0, 0.44], [29.0, -5.0, 0.34], [28.7, -3.2, 0.4],
  [25.0, -3.25, 0.38], [26.6, -2.85, 0.3], [24.3, -5.75, 0.3], [29.4, -4.1, 0.26],
].map(([x, z, s], i) => ({ x, y: 0.045, z, s: [s, 1, s] as [number, number, number], rot: i * 1.7, color: i % 3 ? TOON.leaf : TOON.leafLight }))
const LOTUS: Vec3[] = [[26.5, 0.07, -6.55], [28.7, 0.07, -3.2], [25.0, 0.07, -3.25]]

/** Reeds and cattails round the shore (deterministic, instanced). */
const SHORE = (() => {
  const r = seededRng('marsh-reeds')
  const blades: InstanceSpec[] = []
  const stalks: InstanceSpec[] = []
  const heads: InstanceSpec[] = []
  // angles around the ellipse (deg; 90 = toward the camera / south); none on the pier side
  const spots = [215, 232, 248, 262, 276, 290, 304, 318, 334, 350, 6, 22, 38, 64, 112, 138]
  for (const deg of spots) {
    const a = (deg * Math.PI) / 180 + (r() - 0.5) * 0.08
    const out = 0.15 + r() * 0.25
    const x = pond.cx + Math.cos(a) * (pond.rx + out)
    const z = pond.cz + Math.sin(a) * (pond.rz + out)
    const front = deg > 45 && deg < 160
    for (let k = 0; k < (front ? 2 : 3); k++) {
      const h = (front ? 0.45 : 0.6) + r() * 0.4
      blades.push({ x: x + (r() - 0.5) * 0.35, y: h / 2, z: z + (r() - 0.5) * 0.3, s: [0.075, h, 0.075], rot: r() * 6, color: r() < 0.5 ? TOON.leafDark : TOON.grassDark })
    }
    if (!front || r() < 0.4) {
      const h = 0.9 + r() * 0.45
      const sx = x + (r() - 0.5) * 0.2
      const sz = z + (r() - 0.5) * 0.2
      stalks.push({ x: sx, y: h / 2, z: sz, s: [1, h, 1], color: TOON.leafDark })
      heads.push({ x: sx, y: h + 0.02, z: sz, color: TOON.barkDark })
    }
  }
  return { blades, stalks, heads }
})()

/** A little frog on a lily pad. */
function Frog({ position }: { position: Vec3 }) {
  return (
    <group position={position} rotation={[0, 0.6, 0]}>
      <TSphere position={[0, 0.12, 0]} scale={[0.17, 0.12, 0.15]} color="#7ccf6a" outline />
      <TSphere position={[0, 0.09, 0.06]} scale={[0.12, 0.07, 0.1]} color="#d9f2b8" castShadow={false} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.08, 0.23, 0.05]}>
          <TSphere scale={0.06} color="#7ccf6a" castShadow={false} segments={8} />
          <TSphere position={[0, 0.01, 0.045]} scale={0.03} color={TOON.eye} castShadow={false} segments={6} />
        </group>
      ))}
    </group>
  )
}

/** The pond itself: shore, water, deeper middle, lily pads, lotus, reeds and a frog. */
export function Pond() {
  return (
    <group>
      <PondDisc rx={pond.rx + 0.45} rz={pond.rz + 0.45} y={0.014} color={TOON.sandWet} />
      <PondDisc rx={pond.rx + 0.15} rz={pond.rz + 0.15} y={0.018} color={TOON.waterShallow} />
      <PondDisc rx={pond.rx} rz={pond.rz} y={0.022} color={TOON.water} />
      <PondDisc rx={pond.rx * 0.6} rz={pond.rz * 0.55} y={0.026} color={TOON.waterDeep} dx={0.4} />

      <ToonInstances geometry={padGeo} color={TOON.white} items={PADS} castShadow={false} />
      {LOTUS.map((p, i) => (
        <group key={i} position={p}>
          <TCone radius={0.16} height={0.16} position={[0, 0.06, 0]} color={TOON.flowerPink} segments={6} flat castShadow={false} />
          <TSphere position={[0, 0.12, 0]} scale={0.05} color={TOON.flowerYellow} castShadow={false} segments={6} />
        </group>
      ))}
      <Frog position={[27.9, 0.06, -6.0]} />

      <ToonInstances geometry={geo.cone(1, 1, 4)} color={TOON.white} items={SHORE.blades} castShadow={false} />
      <ToonInstances geometry={geo.cyl(0.05, 0.05, 1, 6)} color={TOON.white} items={SHORE.stalks} castShadow={false} />
      <ToonInstances geometry={geo.capsule(0.09, 0.22, 6)} color={TOON.white} items={SHORE.heads} />
    </group>
  )
}

function PondDisc({ rx, rz, y, color, dx = 0 }: { rx: number; rz: number; y: number; color: string; dx?: number }) {
  return (
    <mesh geometry={discGeo} material={toonMaterial(color)} rotation={[-Math.PI / 2, 0, 0]} position={[pond.cx + dx, y, pond.cz]} scale={[rx, rz, 1]} receiveShadow />
  )
}
