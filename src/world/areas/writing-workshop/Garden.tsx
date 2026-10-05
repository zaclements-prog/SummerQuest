import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { TOON } from '../../../toon/palette'
import { geo } from '../../../toon/geometry'
import { toonMaterial } from '../../../toon/materials'
import { TBlob, TBox, TCone, TCyl, TSphere, TTorus } from '../../../toon/shapes'
import { Parts } from '../word-problem-woods/storyKit'
import type { Part } from '../word-problem-woods/instancing'
import { flatStrip, paperPlaneGeometry } from '../word-problem-woods/storyGeometry'
import { LAWN_FLOWERS, MAILBOX, PENCIL, PLANTERS, SIGN } from './layout'

const INK = '#34407a'
const GRAPHITE = '#55546a'
const PENCIL_YELLOW = '#ffd24f'
const ERASER = '#f59ab9'

/** The pencil's loopy cursive line (a prolate cycloid) from `trail` behind its tip up to the tip. */
function trailPoints(): [number, number][] {
  const [dx, dz] = PENCIL.dir
  const px = dz * -1 // perpendicular (toward the camera side)
  const pz = dx
  const loops = 4
  const r = PENCIL.trail / (loops * 2 * Math.PI)
  const d = 0.24
  const pts: [number, number][] = []
  for (let t = 0; t <= loops * 2 * Math.PI + 1e-6; t += 0.13) {
    const u = r * t - d * Math.sin(t) - PENCIL.trail // along dir, ending at the tip
    const v = d - d * Math.cos(t) // 0 at both ends
    pts.push([PENCIL.x + dx * u - px * v, PENCIL.z + dz * u - pz * v])
  }
  pts.push([PENCIL.x, PENCIL.z])
  return pts
}

/** The giant pencil, tip on the lawn, leaning toward `dir` as if mid-word. */
function GiantPencil() {
  const yaw = Math.atan2(-PENCIL.dir[1], PENCIL.dir[0]) // local +x → dir
  const trail = useMemo(() => flatStrip(trailPoints(), 0.13, 0.02), [])
  return (
    <group>
      <mesh geometry={trail} material={toonMaterial(GRAPHITE)} receiveShadow />
      <group position={[PENCIL.x, 0, PENCIL.z]} rotation={[0, yaw, 0]}>
        <group rotation={[0, 0, -PENCIL.lean]}>
          <TCone radius={0.12} height={0.24} position={[0, 0.12, 0]} rotation={[Math.PI, 0, 0]} color={GRAPHITE} segments={6} />
          <TCone radius={0.43} height={0.86} position={[0, 0.43, 0]} rotation={[Math.PI, 0, 0]} color={TOON.woodLight} segments={6} flat />
          <TCyl radiusTop={0.43} height={2.9} position={[0, 0.86 + 1.45, 0]} color={PENCIL_YELLOW} outline segments={6} flat />
          <TCyl radiusTop={0.45} height={0.36} position={[0, 3.94, 0]} color={TOON.metal} segments={12} />
          <TTorus radius={0.45} tube={0.04} position={[0, 3.94, 0]} rotation={[Math.PI / 2, 0, 0]} color={TOON.rockLight} castShadow={false} segments={16} />
          <TCyl radiusTop={0.41} height={0.3} position={[0, 4.27, 0]} color={ERASER} outline segments={12} />
          <TSphere position={[0, 4.42, 0]} scale={[0.41, 0.14, 0.41]} color={ERASER} segments={12} />
        </group>
      </group>
    </group>
  )
}

// ── Planters with flowers ───────────────────────────────────────────────────
const PLANTER_BOXES: Part[] = PLANTERS.map((p) => ({ p: [p.x, 0.22, p.z], s: [p.w, 0.44, p.d] }))
const PLANTER_SOIL: Part[] = PLANTERS.map((p) => ({ p: [p.x, 0.43, p.z], s: [p.w - 0.16, 0.06, p.d - 0.16] }))
const FLOWER_COLORS = [TOON.flowerRed, TOON.flowerYellow, TOON.flowerPink, TOON.flowerBlue, TOON.flowerWhite, TOON.flowerPurple]
const FLOWER_SPOTS: [number, number][] = PLANTERS.flatMap((p, k) =>
  [-0.36, -0.12, 0.12, 0.36].flatMap((a, i) =>
    [-0.2, 0.2].map((b, j): [number, number] =>
      p.w > p.d ? [p.x + a * p.w, p.z + b * p.d * 0.9 + ((i + j + k) % 2) * 0.05] : [p.x + b * p.w * 0.9, p.z + a * p.d],
    ),
  ),
)
const LAWN_SPOTS: [number, number][] = LAWN_FLOWERS.flatMap(([x, z], k) =>
  [[0, 0], [0.28, 0.12], [-0.2, 0.22], [0.1, -0.26], [-0.3, -0.12]].map(([dx, dz], i): [number, number] => [x + dx * (1 + (k % 2) * 0.3), z + dz + (i % 2) * 0.04]),
)
const FLOWER_STEMS: Part[] = [
  ...FLOWER_SPOTS.map((p, i): Part => ({ p: [p[0], 0.58 + (i % 3) * 0.03, p[1]], s: [1, 0.28 + (i % 3) * 0.06, 1] })),
  ...LAWN_SPOTS.map((p, i): Part => ({ p: [p[0], 0.12, p[1]], s: [1, 0.24 + (i % 3) * 0.04, 1] })),
]
const FLOWER_HEADS: Part[] = [
  ...FLOWER_SPOTS.map(([x, z], i): Part => ({ p: [x, 0.74 + (i % 3) * 0.06, z], s: 0.085, c: FLOWER_COLORS[(i * 5) % FLOWER_COLORS.length] })),
  ...LAWN_SPOTS.map(([x, z], i): Part => ({ p: [x, 0.26 + (i % 3) * 0.04, z], s: 0.075, c: FLOWER_COLORS[(i * 7 + 1) % FLOWER_COLORS.length] })),
]
// ── Book stepping stones from the doorstep to where the pencil's line begins ─
const STONES: { x: number; z: number; yaw: number; c: string }[] = [
  { x: 16.85, z: 23.95, yaw: 0.3, c: TOON.flowerBlue },
  { x: 17.8, z: 23.6, yaw: -0.2, c: TOON.coral },
]
// Closed books lying flat: colored covers top and bottom, a white band of page edges between.
const STONE_COVERS: Part[] = STONES.flatMap((s) => [
  { p: [s.x, 0.02, s.z], r: [0, s.yaw, 0], s: [0.66, 0.035, 0.46], c: s.c },
  { p: [s.x, 0.1, s.z], r: [0, s.yaw, 0], s: [0.66, 0.035, 0.46], c: s.c },
])
const STONE_PAGES: Part[] = STONES.map((s) => ({ p: [s.x + 0.015, 0.06, s.z], r: [0, s.yaw, 0], s: [0.6, 0.06, 0.42] }))

/** A paper dart on a stick that turns slowly like a weathervane. */
function PlaneSpinner({ x, z, color, speed }: { x: number; z: number; color: string; speed: number }) {
  const plane = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (plane.current) plane.current.rotation.y = clock.elapsedTime * speed
  })
  return (
    <group position={[x, 0, z]}>
      <TCyl radiusTop={0.025} height={1.2} position={[0, 0.98, 0]} color={TOON.woodDark} castShadow={false} segments={5} />
      <group ref={plane} position={[0, 1.62, 0]}>
        <mesh geometry={paperPlaneGeometry()} material={toonMaterial(color, { doubleSide: true })} scale={0.95} castShadow />
      </group>
    </group>
  )
}

/** Paper airplanes looping round the garden, banking into the turn. */
function FlyingPlane({ cx, cz, radius, height, speed, phase, color }: { cx: number; cz: number; radius: number; height: number; speed: number; phase: number; color: string }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const t = clock.elapsedTime * speed + phase
    g.position.set(cx + Math.cos(t) * radius, height + Math.sin(t * 2) * 0.3, cz + Math.sin(t) * radius)
    g.rotation.set(Math.cos(t * 2) * 0.15, -t, -0.45)
  })
  return (
    <group ref={ref}>
      <mesh geometry={paperPlaneGeometry()} material={toonMaterial(color, { doubleSide: true })} scale={0.7} castShadow />
    </group>
  )
}

// Mailbox bits in its local frame: door, the letter peeking out, the raised flag.
const MAILBOX_BITS: Part[] = [
  { p: [0, 1.02, 0.29], s: [0.26, 0.2, 0.03], c: '#c95a48' },
  { p: [0.02, 1.13, 0.37], r: [0.5, 0.15, 0], s: [0.24, 0.03, 0.2], c: TOON.flowerWhite },
  { p: [0.2, 1.24, -0.05], s: [0.03, 0.34, 0.04], c: TOON.gold },
  { p: [0.2, 1.36, 0.03], s: [0.03, 0.12, 0.17], c: TOON.gold },
]

/** Red story mailbox with its flag up and a letter peeking out. */
function Mailbox() {
  return (
    <group position={[MAILBOX.x, 0, MAILBOX.z]} rotation={[0, 0.5, 0]}>
      <TBox size={[0.13, 0.9, 0.13]} radius={0.03} position={[0, 0.45, 0]} color={TOON.woodDark} />
      <TBox size={[0.36, 0.34, 0.58]} radius={0.15} position={[0, 1.04, 0]} color={TOON.roofRed} outline />
      {/* door, a letter peeking out, and the flag up: a story is waiting */}
      <Parts geometry={geo.box(1, 1, 1, 0.15)} items={MAILBOX_BITS} castShadow={false} />
    </group>
  )
}

// Ink sign bits in the sign's local frame: the arm, the bottle's neck and cork, its label.
const BOTTLE = { x: 0.46, y: 1.5 }
const SIGN_BITS: Part[] = [
  { p: [0.45, 2.15, 0], s: [1.0, 0.1, 0.1], c: TOON.woodDark },
  { p: [BOTTLE.x, BOTTLE.y + 0.29, 0], s: [0.3, 0.14, 0.1], c: INK },
  { p: [BOTTLE.x, BOTTLE.y + 0.42, 0], s: [0.22, 0.13, 0.12], c: TOON.woodLight },
  { p: [BOTTLE.x, BOTTLE.y - 0.06, 0.065], s: [0.46, 0.3, 0.02], c: TOON.flowerWhite },
]
const SIGN_CORDS: Part[] = [0.2, 0.72].map((x) => ({ p: [x, 1.92, 0], s: [0.012, 0.38, 0.012] }))

/** A hanging sign shaped like a big ink bottle with a quill tucked behind it. */
function InkSign() {
  // The arm runs along the screen's horizontal (+x, −z), so the board faces the camera.
  return (
    <group position={[SIGN.x, 0, SIGN.z]} rotation={[0, Math.PI / 4, 0]}>
      <TCyl radiusTop={0.07} radiusBottom={0.09} height={2.3} position={[0, 1.15, 0]} color={TOON.woodDark} />
      <TSphere position={[0, 2.36, 0]} scale={0.1} color={TOON.gold} castShadow={false} />
      <Parts geometry={geo.box(1, 1, 1, 0.12)} items={SIGN_BITS} castShadow={false} />
      <Parts geometry={geo.cyl(1, 1, 1, 4)} items={SIGN_CORDS} color={TOON.outline} castShadow={false} />
      <group position={[BOTTLE.x, BOTTLE.y, 0]}>
        {/* quill tucked behind the bottle */}
        <TBlob position={[0.3, 0.25, -0.07]} rotation={[0, 0, -0.55]} scale={[0.1, 0.4, 0.03]} color={TOON.flowerWhite} detail={1} flat={false} outline outlineThickness={1.8} />
        {/* bottle body with a fat ink drop on its label */}
        <TBox size={[0.74, 0.56, 0.12]} radius={0.05} position={[0, -0.05, 0]} color={INK} outline />
        <TSphere position={[0, -0.11, 0.08]} scale={[0.075, 0.075, 0.02]} color={INK} castShadow={false} segments={10} />
        <TCone radius={0.066} height={0.12} position={[0, -0.02, 0.08]} scale={[1, 1, 0.3]} color={INK} castShadow={false} segments={10} />
      </group>
    </group>
  )
}

/**
 * Outside the Writing Workshop: a giant pencil writing loops across the lawn,
 * planters of flowers with paper-airplane spinners, paper planes looping
 * overhead, book stepping stones, a story mailbox and an ink-bottle sign.
 */
export default function Garden() {
  return (
    <group>
      <GiantPencil />

      <Parts geometry={geo.box(1, 1, 1, 0.12)} items={PLANTER_BOXES} color={TOON.wood} outline />
      <Parts geometry={geo.box(1, 1, 1, 0.1)} items={PLANTER_SOIL} color={TOON.dirtDark} castShadow={false} />
      <Parts geometry={geo.cyl(0.018, 0.018, 1, 4)} items={FLOWER_STEMS} color={TOON.leafDark} castShadow={false} />
      <Parts geometry={geo.sphere(8)} items={FLOWER_HEADS} castShadow={false} />
      <PlaneSpinner x={PLANTERS[0].x} z={PLANTERS[0].z + 0.45} color={TOON.wallBlue} speed={0.7} />
      <PlaneSpinner x={PLANTERS[1].x} z={PLANTERS[1].z - 0.4} color={TOON.blossomLight} speed={-0.55} />

      <FlyingPlane cx={19.6} cz={21.2} radius={2.3} height={3.0} speed={0.55} phase={0} color={TOON.flowerWhite} />
      <FlyingPlane cx={19.6} cz={21.2} radius={2.9} height={3.6} speed={0.42} phase={2.2} color={TOON.sky} />

      <Parts geometry={geo.box(1, 1, 1, 0.15)} items={STONE_COVERS} receiveShadow castShadow={false} />
      <Parts geometry={geo.box(1, 1, 1, 0.12)} items={STONE_PAGES} color={TOON.flowerWhite} receiveShadow castShadow={false} />

      <Mailbox />
      <InkSign />
    </group>
  )
}
