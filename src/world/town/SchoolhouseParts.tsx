import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { TOON } from '../../toon/palette'
import { geo } from '../../toon/geometry'
import { TBlob, TBox, TCone, TCyl, TSphere } from '../../toon/shapes'
import { Instances, type Inst } from './kit'
import { chalkText } from './chalk'
import { roofGeometry } from './buildingStyle'
import { SCHOOL_CUBBY, SCHOOL_DESKS, SCHOOL_TEACHER_DESK } from './townData'

const CHALKBOARD = '#3f6b5a'
const KID_COLORS = [TOON.coral, TOON.sky, TOON.mint, TOON.flowerYellow, TOON.lilac, TOON.flowerPink]
const unitBox = geo.box(1, 1, 1, 0.2)

// ── Bell tower ──────────────────────────────────────────────────────────────

/** A white cupola astride the roof ridge with a swinging golden bell (building-local). */
export function BellTower({ size, roof, trim, opacity }: { size: number; roof: string; trim: string; opacity: number }) {
  const bell = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (bell.current) bell.current.rotation.z = Math.sin(clock.elapsedTime * 1.6) * 0.18
  })
  const { ridgeY } = roofGeometry(size)
  const solid = opacity >= 1
  return (
    <group position={[0.4, ridgeY, 0]}>
      <TBox size={[1.0, 1.0, 1.0]} radius={0.08} position={[0, 0, 0]} color={trim} opacity={opacity} outline={solid} castShadow={solid} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <TBox key={`${x},${z}`} size={[0.14, 0.62, 0.14]} radius={0.04} position={[x * 0.4, 0.8, z * 0.4]} color={trim} opacity={opacity} castShadow={solid} />
      ))}
      <group ref={bell} position={[0, 1.06, 0]}>
        <TCyl radiusTop={0.09} radiusBottom={0.24} height={0.32} position={[0, -0.2, 0]} color={TOON.gold} opacity={opacity} emissive={TOON.gold} emissiveIntensity={0.15} castShadow={false} segments={12} />
        <TSphere position={[0, -0.37, 0]} scale={0.06} color={TOON.woodDark} opacity={opacity} castShadow={false} segments={8} />
      </group>
      <TBox size={[1.16, 0.14, 1.16]} radius={0.05} position={[0, 1.15, 0]} color={trim} opacity={opacity} outline={solid} castShadow={solid} />
      <TCone radius={0.9} height={0.85} segments={4} rotation={[0, Math.PI / 4, 0]} position={[0, 1.64, 0]} color={roof} opacity={opacity} outline={solid} castShadow={solid} flat />
      <TCyl radiusTop={0.025} height={0.35} position={[0, 2.18, 0]} color={TOON.woodDark} opacity={opacity} castShadow={false} segments={5} />
      <TSphere position={[0, 2.12, 0]} scale={0.1} color={TOON.gold} opacity={opacity} castShadow={false} />
    </group>
  )
}

// ── Chalkboard sign (A-frame) ───────────────────────────────────────────────

const signChalk = [
  ...chalkText('AbC', { y: 0.78, z: 0.06, w: 0.12, h: 0.18, t: 0.03, gap: 0.08, color: TOON.white }),
  ...chalkText('1+2=3', { y: 0.47, z: 0.06, w: 0.085, h: 0.15, t: 0.028, gap: 0.06, color: TOON.flowerYellow }),
]

export function ChalkboardSign({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group position={[0, 0, 0.2]} rotation={[-0.2, 0, 0]}>
        <TBox size={[0.96, 1.08, 0.07]} radius={0.04} position={[0, 0.56, 0]} color={TOON.wood} outline />
        <TBox size={[0.8, 0.7, 0.03]} radius={0.015} position={[0, 0.62, 0.035]} color={CHALKBOARD} castShadow={false} />
        <Instances geometry={unitBox} items={signChalk} />
      </group>
      <group position={[0, 0, -0.2]} rotation={[0.2, 0, 0]}>
        <TBox size={[0.96, 1.08, 0.07]} radius={0.04} position={[0, 0.56, 0]} color={TOON.wood} outline />
      </group>
      <TCyl radiusTop={0.05} height={1.0} position={[0, 1.08, 0]} rotation={[0, 0, Math.PI / 2]} color={TOON.woodDark} castShadow={false} segments={6} />
    </group>
  )
}

// ── Flagpole ────────────────────────────────────────────────────────────────

export function Flagpole({ position }: { position: [number, number, number] }) {
  const flag = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 1.8) * 0.16 - 0.1
  })
  return (
    <group position={position}>
      <TCyl radiusTop={0.2} radiusBottom={0.27} height={0.2} position={[0, 0.1, 0]} color={TOON.stoneDark} segments={10} />
      <TCyl radiusTop={0.055} radiusBottom={0.07} height={3.3} position={[0, 1.75, 0]} color={TOON.flowerWhite} outline segments={8} />
      <TSphere position={[0, 3.45, 0]} scale={0.11} color={TOON.gold} outline />
      <group ref={flag} position={[0, 3.05, 0]}>
        <TBox size={[0.82, 0.52, 0.04]} radius={0.02} position={[0.45, 0, 0]} color={TOON.coral} outline castShadow={false} />
        <TCyl radiusTop={0.14} height={0.06} position={[0.45, 0, 0]} rotation={[Math.PI / 2, 0, 0]} color={TOON.flowerYellow} castShadow={false} segments={12} />
      </group>
    </group>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────

function SwingSeat({ x, color, phase }: { x: number; color: string; phase: number }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.x = Math.sin(clock.elapsedTime * 1.5 + phase) * 0.22
  })
  return (
    <group ref={ref} position={[x, 1.7, 0]}>
      {[-0.17, 0.17].map((dx) => (
        <TCyl key={dx} radiusTop={0.022} height={1.15} position={[dx, -0.6, 0]} color={TOON.metal} castShadow={false} segments={4} />
      ))}
      <TBox size={[0.46, 0.08, 0.26]} radius={0.03} position={[0, -1.2, 0]} color={color} outline />
    </group>
  )
}

/** Swing set + slide: the school yard across the Division Dunes path. */
export function Playground({ swings, slide }: { swings: [number, number]; slide: [number, number] }) {
  return (
    <group>
      <group position={[swings[0], 0, swings[1]]}>
        {[-1.05, 1.05].map((x) =>
          [-1, 1].map((s) => (
            <TCyl key={`${x}${s}`} radiusTop={0.07} height={1.8} position={[x, 0.85, s * 0.3]} rotation={[-s * 0.34, 0, 0]} color={TOON.roofRed} outline segments={6} />
          )),
        )}
        <TCyl radiusTop={0.08} height={2.3} position={[0, 1.7, 0]} rotation={[0, 0, Math.PI / 2]} color={TOON.roofRed} outline segments={8} />
        <SwingSeat x={-0.48} color={TOON.flowerYellow} phase={0} />
        <SwingSeat x={0.48} color={TOON.sky} phase={1.9} />
      </group>
      <group position={[slide[0], 0, slide[1]]}>
        {/* a little tower: four posts, a deck with side rails and a peaked roof; ladder on the +x side */}
        {[0.66, 1.26].map((x) =>
          [-0.3, 0.3].map((z) => (
            <TCyl key={`${x}${z}`} radiusTop={0.07} height={2.2} position={[x, 1.1, z]} color={TOON.roofBlue} outline={x > 1} segments={6} />
          )),
        )}
        {[0.32, 0.62, 0.92].map((y) => (
          <TBox key={y} size={[0.08, 0.08, 0.6]} radius={0.03} position={[1.26, y, 0]} color={TOON.roofBlue} castShadow={false} />
        ))}
        <TBox size={[0.74, 0.12, 0.74]} radius={0.04} position={[0.96, 1.15, 0]} color={TOON.woodLight} outline />
        {[-0.3, 0.3].map((z) => (
          <TBox key={z} size={[0.6, 0.08, 0.06]} radius={0.03} position={[0.96, 1.5, z]} color={TOON.roofBlue} castShadow={false} />
        ))}
        <TCone radius={0.66} height={0.55} segments={4} rotation={[0, Math.PI / 4, 0]} position={[0.96, 2.45, 0]} color={TOON.coral} outline flat />
        <TSphere position={[0.96, 2.78, 0]} scale={0.08} color={TOON.gold} castShadow={false} />
        {/* the chute */}
        <group position={[-0.25, 0.64, 0]} rotation={[0, 0, 0.53]}>
          <TBox size={[2.05, 0.08, 0.56]} radius={0.03} color={TOON.flowerYellow} outline />
          {[-0.29, 0.29].map((z) => (
            <TBox key={z} size={[2.05, 0.16, 0.06]} radius={0.025} position={[0, 0.07, z]} color={TOON.autumn} castShadow={false} />
          ))}
        </group>
        <TBox size={[0.34, 0.08, 0.56]} radius={0.03} position={[-1.2, 0.12, 0]} color={TOON.flowerYellow} castShadow={false} />
      </group>
    </group>
  )
}

// ── Interior ────────────────────────────────────────────────────────────────

const boardChalk = [
  ...chalkText('2+3=5', { x: -0.35, y: 0.2, w: 0.13, h: 0.24, t: 0.035, gap: 0.09, color: TOON.white }),
  ...chalkText('AbC', { x: 0.65, y: -0.2, w: 0.12, h: 0.2, t: 0.032, gap: 0.08, color: TOON.flowerPink }),
]

const desks = (() => {
  const tops: Inst[] = []
  const legs: Inst[] = []
  const seats: Inst[] = []
  const backs: Inst[] = []
  const bases: Inst[] = []
  const books: Inst[] = []
  SCHOOL_DESKS.forEach(([x, z], i) => {
    const c = KID_COLORS[i % KID_COLORS.length]
    tops.push({ x, y: 0.53, z })
    legs.push({ x: x - 0.33, y: 0.25, z }, { x: x + 0.33, y: 0.25, z })
    seats.push({ x, y: 0.33, z: z + 0.45, color: c })
    backs.push({ x, y: 0.56, z: z + 0.62, color: c })
    bases.push({ x, y: 0.15, z: z + 0.45, color: c })
    books.push({ x: x + (i % 2 ? 0.12 : -0.12), y: 0.58, z: z - 0.02, ry: (i % 3) * 0.3 - 0.3, color: KID_COLORS[(i + 3) % KID_COLORS.length] })
  })
  return { tops, legs, seats, backs, bases, books }
})()

const bunting = Array.from({ length: 9 }, (_, i): Inst => ({
  x: -2.4 + i * 0.6,
  y: 2.24 - Math.sin((i / 8) * Math.PI) * 0.1,
  z: -2.77,
  s: [0.13, 0.24, 0.03],
  rx: Math.PI,
  color: KID_COLORS[i % KID_COLORS.length],
}))

const cubbyBins = Array.from({ length: 6 }, (_, i): Inst => ({
  x: SCHOOL_CUBBY[0] + 0.2,
  y: i < 3 ? 0.3 : 0.72,
  z: SCHOOL_CUBBY[1] + ((i % 3) - 1) * 0.54,
  s: [0.1, 0.3, 0.44],
  color: KID_COLORS[(i * 2) % KID_COLORS.length],
}))

/** Classroom: chalkboard + bunting, teacher's desk, two rows of little desks, cubbies, a clock. */
export function SchoolInterior() {
  const [tx, tz] = SCHOOL_TEACHER_DESK
  return (
    <group>
      {/* runner rug down the aisle */}
      <TBox size={[0.95, 0.02, 3.9]} radius={0.01} position={[0, 0.015, 0.75]} color={TOON.coral} castShadow={false} receiveShadow />
      <TBox size={[0.7, 0.024, 3.65]} radius={0.01} position={[0, 0.017, 0.75]} color={TOON.flowerYellow} castShadow={false} receiveShadow />

      {/* chalkboard */}
      <group position={[0.3, 1.5, -2.8]}>
        <TBox size={[2.55, 1.22, 0.08]} radius={0.04} color={TOON.woodDark} castShadow={false} />
        <TBox size={[2.33, 1.02, 0.04]} radius={0.015} position={[0, 0, 0.04]} color={CHALKBOARD} castShadow={false} />
        <Instances geometry={unitBox} items={boardChalk.map((c) => ({ ...c, z: 0.08 }))} />
        <TBox size={[2.33, 0.05, 0.14]} radius={0.02} position={[0, -0.55, 0.08]} color={TOON.wood} castShadow={false} />
      </group>
      <TCyl radiusTop={0.012} height={5.1} position={[0, 2.3, -2.78]} rotation={[0, 0, Math.PI / 2]} color={TOON.woodDark} castShadow={false} segments={4} />
      <Instances geometry={geo.cone(1, 1, 3)} items={bunting} />

      {/* teacher's desk with an apple, a globe and books */}
      <group position={[tx, 0, tz]}>
        <TBox size={[1.12, 0.62, 0.52]} radius={0.05} position={[0, 0.31, 0]} color={TOON.wood} />
        <TBox size={[1.3, 0.08, 0.66]} radius={0.03} position={[0, 0.66, 0]} color={TOON.woodDark} />
        <TSphere position={[0.42, 0.77, 0.12]} scale={0.08} color={TOON.flowerRed} />
        <TCyl radiusTop={0.04} radiusBottom={0.09} height={0.12} position={[-0.38, 0.76, -0.05]} color={TOON.woodDark} castShadow={false} segments={8} />
        <TSphere position={[-0.38, 0.98, -0.05]} scale={0.17} color={TOON.water} />
        <TBlob position={[-0.3, 1.02, 0.05]} scale={[0.09, 0.08, 0.07]} color={TOON.leaf} castShadow={false} />
        <TBox size={[0.32, 0.07, 0.24]} radius={0.02} position={[0.05, 0.74, -0.08]} color={TOON.roofBlue} castShadow={false} />
      </group>

      {/* students' desks and chairs */}
      <Instances geometry={geo.box(0.8, 0.06, 0.52, 0.025)} color={TOON.woodLight} items={desks.tops} castShadow />
      <Instances geometry={geo.box(0.06, 0.5, 0.44, 0.02)} color={TOON.woodDark} items={desks.legs} />
      <Instances geometry={geo.box(0.42, 0.06, 0.36, 0.025)} items={desks.seats} castShadow />
      <Instances geometry={geo.box(0.42, 0.32, 0.06, 0.025)} items={desks.backs} castShadow />
      <Instances geometry={geo.box(0.3, 0.3, 0.28, 0.05)} items={desks.bases} />
      <Instances geometry={geo.box(0.22, 0.04, 0.16, 0.015)} items={desks.books} />

      {/* cubbies + clock on the west wall */}
      <TBox size={[0.42, 1.05, 1.72]} radius={0.04} position={[SCHOOL_CUBBY[0], 0.525, SCHOOL_CUBBY[1]]} color={TOON.woodLight} />
      <Instances geometry={unitBox} items={cubbyBins} />
      <group position={[-2.82, 1.95, SCHOOL_CUBBY[1]]} rotation={[0, 0, Math.PI / 2]}>
        <TCyl radiusTop={0.28} height={0.06} color={TOON.woodDark} castShadow={false} segments={16} />
        <TCyl radiusTop={0.23} height={0.08} color={TOON.white} castShadow={false} segments={16} />
      </group>
      <TBox size={[0.03, 0.16, 0.035]} radius={0.01} position={[-2.76, 2.01, SCHOOL_CUBBY[1]]} color={TOON.eye} castShadow={false} />
      <TBox size={[0.03, 0.035, 0.12]} radius={0.01} position={[-2.76, 1.95, SCHOOL_CUBBY[1] + 0.05]} color={TOON.eye} castShadow={false} />

      {/* potted plant in the corner */}
      <group position={[2.4, 0, -2.4]}>
        <TCyl radiusTop={0.22} radiusBottom={0.17} height={0.34} position={[0, 0.17, 0]} color={TOON.brick} segments={10} />
        <TBlob position={[0, 0.55, 0]} scale={0.3} color={TOON.leaf} />
      </group>
    </group>
  )
}
