import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import type { Group } from 'three'
import { Vector3 } from 'three'
import Building from '../Building'
import Npc from '../Npc'
import { areaById } from '../worldLayout'
import { Vox } from '../voxel/Vox'
import { PALETTE } from '../voxel/palette'
import {
  Bush,
  Fern,
  FlowerPatch,
  Lantern,
  Signpost,
  Crate,
  VoxTree,
} from '../voxel/props'

// One animated smoke puff — rises, expands, and fades over `period` seconds.
// `offset` staggers puffs so they don't all appear at once.
function SmokePuff({
  origin,
  offset,
  period,
  index,
}: {
  origin: [number, number, number]
  offset: number
  period: number
  index: number
}) {
  const ref = useRef<Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const phase = ((t + offset) % period) / period // 0..1
    ref.current.position.set(
      origin[0] + Math.sin(phase * Math.PI * 2 + index) * 0.08,
      origin[1] + phase * 1.2,
      origin[2] + Math.cos(phase * Math.PI * 2 + index) * 0.08,
    )
    const s = 0.18 + phase * 0.28
    ref.current.scale.set(s, s, s)
    ref.current.traverse((obj) => {
      const mesh = obj as import('three').Mesh
      if (mesh.isMesh && mesh.material) {
        const mat = mesh.material as import('three').MeshStandardMaterial
        if (mat.transparent) mat.opacity = Math.max(0, 0.55 - phase * 0.55)
      }
    })
  })

  return (
    <group ref={ref} position={origin}>
      <Vox
        position={[0, 0, 0]}
        size={1}
        color="#d8d0c8"
        roughness={1}
        castShadow={false}
        receiveShadow={false}
        transparent
        opacity={0.5}
        radius={0.45}
      />
    </group>
  )
}

// Three staggered smoke puffs rising from the chimney top.
function ChimneySmoke({ position }: { position: [number, number, number] }) {
  const PERIOD = 4.2
  return (
    <>
      <SmokePuff origin={position} offset={0}   period={PERIOD} index={0} />
      <SmokePuff origin={position} offset={1.4} period={PERIOD} index={1} />
      <SmokePuff origin={position} offset={2.8} period={PERIOD} index={2} />
    </>
  )
}

// A small vox chimney stack placed on top of the building roof.
// Building height H=2.4, roof slab at H+0.15+0.15 ≈ 2.7 top surface.
// Chimney sits at the building's back-left quadrant so it reads from front.
function Chimney({ cx, cz }: { cx: number; cz: number }) {
  // Place chimney at back-left of building (local -x, -z in building space = back wall)
  const chX = cx - 1.0
  const chZ = cz - 1.2
  const baseY = 2.7  // approximate top of the flat building roof slab
  const stackH = 1.0

  return (
    <group>
      {/* Chimney stack */}
      <Vox
        position={[chX, baseY + stackH / 2, chZ]}
        size={[0.45, stackH, 0.45]}
        color={PALETTE.cottageWallWarm}
        roughness={0.9}
        radius={0.06}
      />
      {/* Chimney cap */}
      <Vox
        position={[chX, baseY + stackH + 0.08, chZ]}
        size={[0.58, 0.16, 0.58]}
        color={PALETTE.rockDark}
        roughness={0.85}
        radius={0.06}
        castShadow={false}
      />
      {/* Chimney smoke rising from the cap top */}
      <ChimneySmoke position={[chX, baseY + stackH + 0.22, chZ]} />
    </group>
  )
}

// A small ink-pot prop: a dark cylindrical vox blob with a quill suggestion.
function InkPot({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* pot body */}
      <Vox position={[0, 0.14, 0]} size={[0.22, 0.28, 0.22]} color="#2a2422" radius={0.09} />
      {/* pot rim */}
      <Vox position={[0, 0.3, 0]} size={[0.28, 0.07, 0.28]} color={PALETTE.rockDark} radius={0.06} castShadow={false} />
      {/* quill shaft — tilted */}
      <Vox
        position={[0.05, 0.46, 0]}
        size={[0.04, 0.38, 0.04]}
        color={PALETTE.flowerWhite}
        radius={0.02}
        rotation={[0, 0, 0.35]}
        castShadow={false}
      />
      {/* quill tip */}
      <Vox
        position={[0.14, 0.28, 0]}
        size={[0.06, 0.14, 0.04]}
        color={PALETTE.flowerWhite}
        radius={0.02}
        rotation={[0, 0, 0.35]}
        castShadow={false}
      />
    </group>
  )
}

// A hanging shop sign mounted to the right of the door on a small bracket arm.
// Door is at world z=-11.5; sign hangs just to the right at x≈+1.8.
function HangingSign({ cx, cz }: { cx: number; cz: number }) {
  // The front face of the building is at local +z half = +2.5, world z = cz+2.5 = -11.5
  const signX = cx + 1.8
  const signZ = cz + 2.55   // just proud of the wall face
  const signY = 2.0           // hang at a comfortable read height

  return (
    <group>
      {/* bracket arm extending from the wall */}
      <Vox
        position={[signX - 0.22, signY + 0.16, signZ - 0.06]}
        size={[0.44, 0.1, 0.1]}
        color={PALETTE.woodDark}
        radius={0.04}
        castShadow={false}
      />
      {/* vertical bracket peg */}
      <Vox
        position={[signX, signY + 0.06, signZ - 0.06]}
        size={[0.08, 0.3, 0.08]}
        color={PALETTE.woodDark}
        radius={0.03}
        castShadow={false}
      />
      {/* sign board — main plank */}
      <Vox
        position={[signX, signY - 0.16, signZ]}
        size={[1.0, 0.38, 0.1]}
        color={PALETTE.wood}
        radius={0.06}
      />
      {/* sign board accent — top dark strip */}
      <Vox
        position={[signX, signY + 0.04, signZ + 0.02]}
        size={[1.04, 0.08, 0.06]}
        color={PALETTE.woodDark}
        radius={0.03}
        castShadow={false}
      />
      {/* sign board accent — bottom dark strip */}
      <Vox
        position={[signX, signY - 0.36, signZ + 0.02]}
        size={[1.04, 0.08, 0.06]}
        color={PALETTE.woodDark}
        radius={0.03}
        castShadow={false}
      />
      {/* decorative quill motif on sign — two small vox strokes */}
      <Vox
        position={[signX - 0.3, signY - 0.14, signZ + 0.07]}
        size={[0.05, 0.22, 0.04]}
        color={PALETTE.flowerWhite}
        radius={0.02}
        rotation={[0, 0, 0.3]}
        castShadow={false}
      />
      <Vox
        position={[signX + 0.05, signY - 0.16, signZ + 0.07]}
        size={[0.28, 0.05, 0.04]}
        color={PALETTE.flowerYellow}
        radius={0.02}
        castShadow={false}
      />
    </group>
  )
}

// Stone threshold — a subtle welcome mat of small vox paving stones just in
// front of the door. Flush at y=0 so walking is unobstructed.
function DoorThreshold({ cx, cz }: { cx: number; cz: number }) {
  // Door is at z=-11.5; threshold is just in front (toward higher z / avatar approach)
  const tz = cz + 2.5 + 0.25  // world z = -11.25, just outside the door
  return (
    <group>
      {/* 3 paving stones side by side */}
      <Vox position={[cx - 0.5, 0.03, tz]} size={[0.55, 0.06, 0.65]} color={PALETTE.pebble} radius={0.05} receiveShadow castShadow={false} />
      <Vox position={[cx,       0.03, tz]} size={[0.55, 0.06, 0.65]} color={PALETTE.sandWet} radius={0.05} receiveShadow castShadow={false} />
      <Vox position={[cx + 0.5, 0.03, tz]} size={[0.55, 0.06, 0.65]} color={PALETTE.pebble} radius={0.05} receiveShadow castShadow={false} />
      {/* second row slightly further out */}
      <Vox position={[cx - 0.5, 0.02, tz + 0.7]} size={[0.55, 0.04, 0.65]} color={PALETTE.sandWet} radius={0.05} receiveShadow castShadow={false} />
      <Vox position={[cx,       0.02, tz + 0.7]} size={[0.55, 0.04, 0.65]} color={PALETTE.pebble} radius={0.05} receiveShadow castShadow={false} />
      <Vox position={[cx + 0.5, 0.02, tz + 0.7]} size={[0.55, 0.04, 0.65]} color={PALETTE.sandWet} radius={0.05} receiveShadow castShadow={false} />
    </group>
  )
}

export default function WritingWorkshop({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('writing-workshop')!
  const cx = a.worldPos[0]   // 0
  const cz = a.worldPos[1]   // -14

  // Derived world positions
  // Building: cx=0, cz=-14, size=5 → half=2.5
  // Front (+z) wall: world z = cz+2.5 = -11.5  (the door wall)
  // Back  (-z) wall: world z = cz-2.5 = -16.5
  // Left  (-x) wall: world x = cx-2.5 = -2.5
  // Right (+x) wall: world x = cx+2.5 = +2.5
  // Door gap at front: x ∈ [-0.8, +0.8], so avoid blocking this
  const frontZ = cz + 2.5     // -11.5
  const backZ  = cz - 2.5     // -16.5

  return (
    <group>
      {/* ── Original Building shell + interior ─────────────────────────────── */}
      <Building id={a.id} cx={cx} cz={cz} wall="#d9c8a0" roof="#7a4b8a">
        {/* interior: a writing desk + quill (revealed when the front walls fade) */}
        <mesh castShadow position={[0, 0.5, -1.2]}>
          <boxGeometry args={[1.6, 0.2, 0.9]} />
          <meshStandardMaterial color="#8a5a2b" />
        </mesh>
        <mesh castShadow position={[0, 0.9, -1.2]} rotation={[0, 0, 0.4]}>
          <cylinderGeometry args={[0.02, 0.04, 0.7, 6]} />
          <meshStandardMaterial color="#efe6d2" />
        </mesh>
      </Building>

      {/* ── Original NPC ────────────────────────────────────────────────────── */}
      <Npc
        areaId={a.id}
        zoneId={a.zoneId}
        label={a.label}
        position={[cx, 0, a.door!.pos[1] + 1.2]}
        posRef={posRef}
      />

      {/* ══ EXTERIOR DRESSING ════════════════════════════════════════════════ */}

      {/* Chimney on the roof (back-left quadrant) */}
      <Chimney cx={cx} cz={cz} />

      {/* Hanging shop sign — right of door, proud of the front wall */}
      <HangingSign cx={cx} cz={cz} />

      {/* Door threshold / welcome path-end paving */}
      <DoorThreshold cx={cx} cz={cz} />

      {/* Lanterns flanking the door — outside x=±1.1, at the front wall z=-11.5 */}
      {/* Left lantern: x=-1.2, clear of x=-0.8 door edge + -x wall collider */}
      <Lantern position={[cx - 1.2, 0, frontZ + 0.15]} height={1.3} />
      {/* Right lantern: x=+1.2 */}
      <Lantern position={[cx + 1.2, 0, frontZ + 0.15]} height={1.3} />

      {/* Small garden on the LEFT side of the building (x=-2.5 to -3.8, z=-11.5 to -16.5) */}
      {/* FlowerPatch against the left wall — clear of the collider (cx=-2.5) */}
      <FlowerPatch position={[cx - 3.4, 0, cz + 1.2]} seed={11} count={7} />
      <FlowerPatch position={[cx - 3.2, 0, cz - 0.5]} seed={22} count={5} />
      {/* Ferns tucked against the left side */}
      <Fern position={[cx - 3.0, 0, cz + 0.3]} seed={31} />
      <Fern position={[cx - 3.3, 0, cz - 1.4]} seed={42} />
      {/* Small round bush at the garden corner */}
      <Bush position={[cx - 3.5, 0, cz + 1.8]} seed={51} />
      <Bush position={[cx - 3.4, 0, cz - 1.0]} seed={62} />

      {/* Garden on the RIGHT side — kept tighter, crates + sign area */}
      <FlowerPatch position={[cx + 3.3, 0, cz + 0.8]} seed={71} count={6} />
      <Fern position={[cx + 3.1, 0, cz - 0.2]} seed={81} />
      <Bush position={[cx + 3.5, 0, cz + 1.6]} seed={91} />

      {/* Crates stacked against the right side near the front corner */}
      {/* Clear of collider at x=+2.5; crate at x=+3.2, z=-12.3 */}
      <Crate position={[cx + 3.2, 0, cz + 1.4]} seed={101} />
      <Crate position={[cx + 3.4, 0.6, cz + 1.5]} seed={112} />

      {/* Ink-pot prop on a small ledge-crate by the front-right corner */}
      {/* x=+1.8, z=-11.3 — beside the sign, clear of door */}
      <Crate position={[cx + 1.85, 0, frontZ + 0.3]} seed={121} />
      <InkPot position={[cx + 1.85, 0.6, frontZ + 0.3]} />

      {/* Small signpost stake in the garden bed (not a gate sign — this is the garden marker) */}
      {/* x=-3.6, z=cz+1.0 (clear of colliders) */}
      <Signpost position={[cx - 3.6, 0, cz + 1.0]} facing={Math.PI * 0.1} />

      {/* A friendly fruit tree at the back corner for depth and framing */}
      <VoxTree position={[cx - 3.8, 0, backZ - 0.5]} variant="fruit" seed={201} />
      {/* Small round tree at the back-right for balance */}
      <VoxTree position={[cx + 3.6, 0, backZ - 0.8]} variant="round" seed={211} />

      {/* Floating cloud puff over the chimney using Float for lazy drift */}
      <Float speed={0.6} rotationIntensity={0} floatIntensity={0.4}>
        <Vox
          position={[cx - 0.8, 5.8, cz - 0.9]}
          size={[1.1, 0.5, 0.8]}
          color={PALETTE.cloud}
          roughness={1}
          castShadow={false}
          receiveShadow={false}
          transparent
          opacity={0.72}
          radius={0.4}
        />
        <Vox
          position={[cx - 1.4, 5.9, cz - 0.6]}
          size={[0.7, 0.4, 0.6]}
          color={PALETTE.cloud}
          roughness={1}
          castShadow={false}
          receiveShadow={false}
          transparent
          opacity={0.65}
          radius={0.35}
        />
      </Float>
    </group>
  )
}
