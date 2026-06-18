import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { Group, Vector3 } from 'three'
import { Vox } from './voxel/Vox'
import { PALETTE } from './voxel/palette'
import { useWorldUi } from './useWorldUi'

const INTERACT_R = 2.4

// ── Shared sub-pieces ──────────────────────────────────────────────────────

/** A small stone plinth the NPC stands on */
function NpcBase() {
  return (
    <group>
      <Vox position={[0, 0.06, 0]} size={[0.8, 0.12, 0.8]} color={PALETTE.rock} radius={0.06} receiveShadow />
      <Vox position={[0, 0.16, 0]} size={[0.6, 0.1, 0.6]} color={PALETTE.rockDark} radius={0.05} receiveShadow />
    </group>
  )
}

/** Floating "!" exclamation marker — glowing emissive voxels */
function ExclamationMarker({ markerRef }: { markerRef: RefObject<Group | null> }) {
  return (
    <group ref={markerRef} position={[0, 1.9, 0]}>
      {/* staff */}
      <Vox
        position={[0, 0.18, 0]}
        size={[0.1, 0.36, 0.1]}
        color={PALETTE.lantern}
        emissive={PALETTE.lantern}
        emissiveIntensity={1.2}
        roughness={0.3}
        radius={0.04}
        castShadow={false}
      />
      {/* dot */}
      <Vox
        position={[0, -0.08, 0]}
        size={0.12}
        color={PALETTE.lantern}
        emissive={PALETTE.lantern}
        emissiveIntensity={1.4}
        roughness={0.3}
        radius={0.05}
        castShadow={false}
      />
      {/* soft point light so it halos in bloom */}
      <pointLight color={PALETTE.lantern} intensity={1.6} distance={2.5} decay={2} />
    </group>
  )
}

// ── Woodland friend (Word Problem Woods) — a little fox ─────────────────────
//   Warm rust-orange body, white belly, pointy ears, a bushy tail hint.

function WoodlandFox() {
  const BODY   = '#c4612a'   // rust-orange — not in palette, small accent ok
  const BELLY  = '#f2dfc4'   // cream belly accent
  const SNOUT  = '#e8a87c'   // pale snout
  const TAIL   = '#b84f22'   // darker tail base
  const EAR    = BODY
  const NOSE   = '#2a1a0e'

  return (
    <group>
      {/* legs */}
      <Vox position={[-0.1, 0.29, 0.06]}  size={[0.11, 0.24, 0.11]} color={BODY}  radius={0.04} />
      <Vox position={[ 0.1, 0.29, 0.06]}  size={[0.11, 0.24, 0.11]} color={BODY}  radius={0.04} />
      <Vox position={[-0.1, 0.29, -0.06]} size={[0.11, 0.24, 0.11]} color={BODY}  radius={0.04} />
      <Vox position={[ 0.1, 0.29, -0.06]} size={[0.11, 0.24, 0.11]} color={BODY}  radius={0.04} />
      {/* body */}
      <Vox position={[0, 0.52, 0]} size={[0.38, 0.36, 0.3]} color={BODY}  radius={0.1} />
      {/* belly patch */}
      <Vox position={[0, 0.5, 0.12]} size={[0.22, 0.28, 0.06]} color={BELLY} radius={0.06} castShadow={false} />
      {/* tail (poked out behind) */}
      <Vox position={[0, 0.55, -0.28]} size={[0.22, 0.22, 0.18]} color={TAIL}  radius={0.09} />
      <Vox position={[0, 0.6,  -0.4]}  size={[0.18, 0.18, 0.08]} color={BELLY} radius={0.07} castShadow={false} />
      {/* neck */}
      <Vox position={[0, 0.76, 0.02]} size={[0.22, 0.16, 0.2]} color={BODY} radius={0.07} />
      {/* head */}
      <Vox position={[0, 0.97, 0.02]} size={[0.34, 0.3, 0.3]} color={BODY}  radius={0.1} />
      {/* snout */}
      <Vox position={[0, 0.9, 0.2]}   size={[0.18, 0.14, 0.12]} color={SNOUT} radius={0.05} castShadow={false} />
      {/* nose dot */}
      <Vox position={[0, 0.93, 0.27]} size={0.06} color={NOSE} radius={0.03} castShadow={false} />
      {/* ears */}
      <Vox position={[-0.12, 1.16, -0.01]} size={[0.1, 0.16, 0.08]} color={EAR}  radius={0.04} />
      <Vox position={[ 0.12, 1.16, -0.01]} size={[0.1, 0.16, 0.08]} color={EAR}  radius={0.04} />
      {/* inner ear */}
      <Vox position={[-0.12, 1.17, 0.02]} size={[0.06, 0.1, 0.04]} color={BELLY} radius={0.02} castShadow={false} />
      <Vox position={[ 0.12, 1.17, 0.02]} size={[0.06, 0.1, 0.04]} color={BELLY} radius={0.02} castShadow={false} />
      {/* eyes */}
      <Vox position={[-0.1, 1.0, 0.17]}  size={0.07} color={NOSE} radius={0.03} castShadow={false} />
      <Vox position={[ 0.1, 1.0, 0.17]}  size={0.07} color={NOSE} radius={0.03} castShadow={false} />
      {/* green scarf — woodland themed */}
      <Vox position={[0, 0.72, 0.06]} size={[0.28, 0.1, 0.26]} color={PALETTE.foliage} radius={0.06} castShadow={false} />
    </group>
  )
}

// ── Water sprite (Fraction Falls) — a rounded teal droplet-ish figure ───────
//   Cool teal/blue, rounded, with droplet-shaped crown and watery arms.

function WaterSprite() {
  const BODY_T  = PALETTE.water          // bright teal
  const BODY_D  = PALETTE.waterDeep      // deep blue
  const FOAM_C  = PALETTE.foam           // near-white highlights
  const GLOW    = '#a0e4ff'              // icy glow accent

  return (
    <group>
      {/* floating-hover legs replaced with a puddle base */}
      <Vox position={[0, 0.28, 0]}      size={[0.32, 0.08, 0.32]} color={BODY_D} radius={0.12} opacity={0.88} transparent />
      {/* rounded body — slightly wider at mid, tapers to rounded crown */}
      <Vox position={[0, 0.5, 0]}       size={[0.38, 0.38, 0.34]} color={BODY_T}  radius={0.15} />
      {/* belly highlight */}
      <Vox position={[0, 0.46, 0.14]}   size={[0.22, 0.26, 0.06]} color={FOAM_C} radius={0.08} castShadow={false} />
      {/* arms — stubby fins */}
      <Vox position={[-0.27, 0.55, 0]}  size={[0.14, 0.1, 0.1]}  color={BODY_D}  radius={0.05} />
      <Vox position={[ 0.27, 0.55, 0]}  size={[0.14, 0.1, 0.1]}  color={BODY_D}  radius={0.05} />
      {/* neck */}
      <Vox position={[0, 0.74, 0.01]}   size={[0.22, 0.14, 0.2]}  color={BODY_T}  radius={0.08} />
      {/* head — wide, roundish */}
      <Vox position={[0, 0.95, 0.01]}   size={[0.38, 0.34, 0.32]} color={BODY_T}  radius={0.14} />
      {/* droplet crown on head */}
      <Vox position={[ 0.06, 1.2, 0]}   size={[0.1, 0.22, 0.1]}   color={BODY_D}  radius={0.05} />
      <Vox position={[-0.06, 1.25, 0]}  size={[0.08, 0.16, 0.08]}  color={BODY_T}  radius={0.04} />
      {/* face — big bright eyes */}
      <Vox position={[-0.11, 0.97, 0.17]} size={0.08} color={FOAM_C} radius={0.04} castShadow={false} />
      <Vox position={[ 0.11, 0.97, 0.17]} size={0.08} color={FOAM_C} radius={0.04} castShadow={false} />
      {/* pupil dots */}
      <Vox position={[-0.11, 0.97, 0.22]} size={0.04} color={BODY_D} radius={0.02} castShadow={false} />
      <Vox position={[ 0.11, 0.97, 0.22]} size={0.04} color={BODY_D} radius={0.02} castShadow={false} />
      {/* smile */}
      <Vox position={[-0.05, 0.88, 0.19]} size={[0.06, 0.04, 0.04]} color={BODY_D} radius={0.02} castShadow={false} />
      <Vox position={[ 0.05, 0.88, 0.19]} size={[0.06, 0.04, 0.04]} color={BODY_D} radius={0.02} castShadow={false} />
      {/* glowing aura ring — subtle emissive teal */}
      <Vox
        position={[0, 0.5, 0]}
        size={[0.52, 0.52, 0.08]}
        color={GLOW}
        emissive={GLOW}
        emissiveIntensity={0.6}
        roughness={0.2}
        radius={0.22}
        castShadow={false}
        transparent
        opacity={0.35}
      />
    </group>
  )
}

// ── Bookish scholar (Writing Workshop) — inky, cream, book in hand ─────────
//   Cream robe with ink-purple accents, round glasses, a tiny open book.

function BookishScholar() {
  const ROBE   = PALETTE.cottageWall       // cream
  const ROBE_D = PALETTE.cottageWallWarm   // warm tan shadow
  const INK    = PALETTE.flowerPurple      // ink-purple
  const SKIN   = '#f0d8b8'                 // warm cream skin
  const GLASS  = '#c4dff5'                 // light blue glass tint
  const BOOK_C = '#e8d4a0'                 // parchment
  const BOOK_S = PALETTE.barkDark          // dark book cover

  return (
    <group>
      {/* robe base / feet */}
      <Vox position={[0, 0.22, 0]}       size={[0.36, 0.44, 0.3]}  color={ROBE_D}  radius={0.1} />
      {/* robe hem accent */}
      <Vox position={[0, 0.04, 0]}       size={[0.38, 0.08, 0.32]} color={INK}     radius={0.06} castShadow={false} />
      {/* main body robe */}
      <Vox position={[0, 0.52, 0]}       size={[0.4, 0.42, 0.32]}  color={ROBE}    radius={0.12} />
      {/* ink stripe down front */}
      <Vox position={[0, 0.52, 0.15]}    size={[0.08, 0.38, 0.04]} color={INK}     radius={0.03} castShadow={false} />
      {/* left arm holding book */}
      <Vox position={[-0.28, 0.58, 0.06]} size={[0.14, 0.1, 0.12]} color={ROBE}    radius={0.05} />
      {/* book (tiny, open) */}
      <Vox position={[-0.32, 0.62, 0.12]} size={[0.18, 0.04, 0.14]} color={BOOK_C} radius={0.03} castShadow={false} />
      <Vox position={[-0.32, 0.64, 0.12]} size={[0.18, 0.02, 0.06]} color={BOOK_S} radius={0.02} castShadow={false} />
      {/* right arm, ink-quill gesture */}
      <Vox position={[0.28, 0.58, 0.06]}  size={[0.14, 0.1, 0.12]} color={ROBE}    radius={0.05} />
      {/* quill tip */}
      <Vox position={[0.38, 0.66, 0.1]}   size={[0.04, 0.18, 0.04]} color={PALETTE.flowerWhite} radius={0.02} castShadow={false} />
      <Vox position={[0.38, 0.58, 0.1]}   size={[0.04, 0.06, 0.04]} color={INK}    radius={0.02} castShadow={false} />
      {/* neck */}
      <Vox position={[0, 0.78, 0.02]}    size={[0.2, 0.14, 0.18]}  color={SKIN}    radius={0.07} />
      {/* head */}
      <Vox position={[0, 0.98, 0.01]}    size={[0.34, 0.32, 0.3]}  color={SKIN}    radius={0.12} />
      {/* hat brim */}
      <Vox position={[0, 1.17, 0]}       size={[0.42, 0.06, 0.38]} color={INK}     radius={0.08} />
      {/* hat crown */}
      <Vox position={[0, 1.38, 0]}       size={[0.26, 0.44, 0.24]} color={INK}     radius={0.08} />
      {/* glasses frames */}
      <Vox position={[-0.1, 1.0, 0.17]}  size={[0.14, 0.1, 0.04]}  color={INK}     radius={0.04} castShadow={false} />
      <Vox position={[ 0.1, 1.0, 0.17]}  size={[0.14, 0.1, 0.04]}  color={INK}     radius={0.04} castShadow={false} />
      {/* lens tint */}
      <Vox position={[-0.1, 1.0, 0.19]}  size={[0.1, 0.08, 0.02]}  color={GLASS}   radius={0.03} castShadow={false} transparent opacity={0.6} />
      <Vox position={[ 0.1, 1.0, 0.19]}  size={[0.1, 0.08, 0.02]}  color={GLASS}   radius={0.03} castShadow={false} transparent opacity={0.6} />
      {/* bridge */}
      <Vox position={[0, 1.0, 0.18]}     size={[0.06, 0.04, 0.03]} color={INK}     radius={0.02} castShadow={false} />
      {/* ink-stained finger highlight */}
      <Vox position={[-0.25, 0.66, 0.16]} size={0.05} color={INK}   radius={0.02} castShadow={false} />
    </group>
  )
}

// ── Default NPC (friendly sphere-cap character) ──────────────────────────────

function DefaultNpc() {
  return (
    <group>
      <Vox position={[0, 0.28, 0]} size={[0.3, 0.38, 0.28]} color={PALETTE.cottageWallWarm} radius={0.1} />
      <Vox position={[0, 0.56, 0]} size={[0.34, 0.3, 0.3]}  color={PALETTE.cottageWall}     radius={0.12} />
      <Vox position={[0, 0.78, 0]} size={[0.3, 0.28, 0.28]} color={PALETTE.sand}             radius={0.1} />
      <Vox position={[0, 0.97, 0]} size={[0.32, 0.3, 0.3]}  color={PALETTE.sand}             radius={0.12} />
      <Vox position={[0, 1.14, 0]} size={[0.28, 0.12, 0.26]} color={PALETTE.foliage}          radius={0.06} />
    </group>
  )
}

// ── Character picker ─────────────────────────────────────────────────────────

function NpcCharacter({ areaId }: { areaId: string }) {
  switch (areaId) {
    case 'word-problem-woods':
      return <WoodlandFox />
    case 'fraction-falls':
      return <WaterSprite />
    case 'writing-workshop':
      return <BookishScholar />
    default:
      return <DefaultNpc />
  }
}

// ── Sparkle decoration per theme ─────────────────────────────────────────────

function NpcSparkles({ areaId }: { areaId: string }) {
  if (areaId === 'word-problem-woods') {
    // fireflies — warm amber
    return <Sparkles count={12} scale={1.8} size={3} speed={0.4} color="#ffe080" opacity={0.7} />
  }
  if (areaId === 'fraction-falls') {
    // mist/water droplets — icy blue
    return <Sparkles count={16} scale={2.0} size={2.5} speed={0.6} color={PALETTE.foam} opacity={0.6} />
  }
  if (areaId === 'writing-workshop') {
    // ink sparkles — soft purple
    return <Sparkles count={8} scale={1.4} size={2} speed={0.3} color={PALETTE.flowerPurple} opacity={0.5} />
  }
  return null
}

// ── Main component ────────────────────────────────────────────────────────────

/** A charming voxel character that opens `zoneId` when the avatar walks within range. */
export default function Npc({
  areaId,
  zoneId,
  label,
  position,
  posRef,
}: {
  areaId: string
  zoneId: string
  label: string
  position: [number, number, number]
  posRef: RefObject<Vector3>
}) {
  const body   = useRef<Group>(null)
  const marker = useRef<Group>(null)
  const setActiveNpc = useWorldUi((s) => s.setActiveNpc)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // gentle idle bob — preserved exactly as before
    if (body.current)   body.current.position.y   = Math.abs(Math.sin(t * 2)) * 0.12
    // floating marker bob — preserved exactly as before
    if (marker.current) marker.current.position.y = 1.9 + Math.sin(t * 3) * 0.12

    const p = posRef.current
    if (!p) return
    const dx = p.x - position[0]
    const dz = p.z - position[2]
    const near = dx * dx + dz * dz < INTERACT_R * INTERACT_R
    const cur = useWorldUi.getState().activeNpc
    if (near && cur?.areaId !== areaId)   setActiveNpc({ areaId, zoneId, label })
    else if (!near && cur?.areaId === areaId) setActiveNpc(null)
  })

  return (
    <group position={position}>
      {/* body group: bobs up/down, contains base + character */}
      <group ref={body}>
        <NpcBase />
        <NpcCharacter areaId={areaId} />
        <NpcSparkles areaId={areaId} />
      </group>

      {/* floating "!" interaction marker */}
      <ExclamationMarker markerRef={marker} />
    </group>
  )
}
