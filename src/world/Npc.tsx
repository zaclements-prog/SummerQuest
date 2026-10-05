import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { Group, Vector3 } from 'three'
import { Vox } from './voxel/Vox'
import { PALETTE } from './voxel/palette'
import { useWorldUi } from './useWorldUi'
import type { HubKind } from './worldLayout'

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

// ── Cactus prospector (Multiplication Mesa) — green cactus-buddy + hat ──────
//   A friendly saguaro cactus wearing a sandy prospector hat. Greens + sand.

function CactusProspector() {
  const CAC   = PALETTE.foliage        // cactus green
  const CAC_L = PALETTE.foliageLight   // lighter green highlight
  const HAT   = PALETTE.sand           // sandy hat
  const HAT_D = PALETTE.sandWet        // hat shadow band
  const SPINE = PALETTE.flowerWhite    // little spines
  const NOSE  = '#2a1a0e'

  return (
    <group>
      {/* sandy mound base */}
      <Vox position={[0, 0.27, 0]} size={[0.34, 0.16, 0.34]} color={HAT_D} radius={0.1} />
      {/* main trunk */}
      <Vox position={[0, 0.62, 0]} size={[0.34, 0.66, 0.32]} color={CAC} radius={0.14} />
      {/* trunk highlight ridge */}
      <Vox position={[0, 0.62, 0.15]} size={[0.08, 0.5, 0.04]} color={CAC_L} radius={0.03} castShadow={false} />
      {/* left arm (up) */}
      <Vox position={[-0.26, 0.56, 0]} size={[0.12, 0.12, 0.12]} color={CAC} radius={0.05} />
      <Vox position={[-0.26, 0.74, 0]} size={[0.12, 0.26, 0.12]} color={CAC} radius={0.05} />
      {/* right arm (up) */}
      <Vox position={[0.26, 0.66, 0]} size={[0.12, 0.12, 0.12]} color={CAC} radius={0.05} />
      <Vox position={[0.26, 0.84, 0]} size={[0.12, 0.26, 0.12]} color={CAC} radius={0.05} />
      {/* spines */}
      <Vox position={[-0.16, 0.7, 0.06]} size={0.04} color={SPINE} radius={0.02} castShadow={false} />
      <Vox position={[0.16, 0.5, 0.06]}  size={0.04} color={SPINE} radius={0.02} castShadow={false} />
      <Vox position={[-0.12, 0.42, 0.12]} size={0.04} color={SPINE} radius={0.02} castShadow={false} />
      {/* prospector hat brim + crown */}
      <Vox position={[0, 0.98, 0]} size={[0.5, 0.06, 0.46]} color={HAT}   radius={0.08} />
      <Vox position={[0, 1.1, 0]}  size={[0.3, 0.2, 0.28]}  color={HAT}   radius={0.08} />
      <Vox position={[0, 1.04, 0]} size={[0.32, 0.06, 0.3]} color={HAT_D} radius={0.04} castShadow={false} />
      {/* face — eyes + smile */}
      <Vox position={[-0.08, 0.74, 0.17]} size={0.06} color={NOSE} radius={0.03} castShadow={false} />
      <Vox position={[ 0.08, 0.74, 0.17]} size={0.06} color={NOSE} radius={0.03} castShadow={false} />
      <Vox position={[-0.04, 0.64, 0.17]} size={[0.05, 0.04, 0.04]} color={NOSE} radius={0.02} castShadow={false} />
      <Vox position={[ 0.04, 0.64, 0.17]} size={[0.05, 0.04, 0.04]} color={NOSE} radius={0.02} castShadow={false} />
    </group>
  )
}

// ── Desert camel (Division Dunes) — a friendly two-hump camel ───────────────
//   Tan body, brown humps + hooves, gentle face. Tan/brown.

function DesertCamel() {
  const BODY  = '#cBa56e'              // warm tan — small accent
  const HUMP  = '#a07a48'              // brown humps
  const LEG   = PALETTE.barkDark       // dark legs/hooves
  const SNOUT = '#e0c79a'              // pale muzzle
  const NOSE  = '#2a1a0e'

  return (
    <group>
      {/* legs */}
      <Vox position={[-0.13, 0.32, 0.1]}  size={[0.09, 0.3, 0.09]} color={LEG} radius={0.03} />
      <Vox position={[ 0.13, 0.32, 0.1]}  size={[0.09, 0.3, 0.09]} color={LEG} radius={0.03} />
      <Vox position={[-0.13, 0.32, -0.1]} size={[0.09, 0.3, 0.09]} color={LEG} radius={0.03} />
      <Vox position={[ 0.13, 0.32, -0.1]} size={[0.09, 0.3, 0.09]} color={LEG} radius={0.03} />
      {/* body */}
      <Vox position={[0, 0.56, 0]} size={[0.4, 0.26, 0.34]} color={BODY} radius={0.12} />
      {/* two humps */}
      <Vox position={[0, 0.74, -0.07]} size={[0.18, 0.16, 0.18]} color={HUMP} radius={0.08} />
      <Vox position={[0, 0.74, 0.1]} size={[0.16, 0.14, 0.16]} color={HUMP} radius={0.07} />
      {/* neck (rising forward) */}
      <Vox position={[0, 0.72, 0.22]} size={[0.16, 0.3, 0.16]} color={BODY} radius={0.07} />
      {/* head */}
      <Vox position={[0, 0.94, 0.28]} size={[0.2, 0.2, 0.26]} color={BODY} radius={0.08} />
      {/* muzzle */}
      <Vox position={[0, 0.88, 0.42]} size={[0.14, 0.12, 0.12]} color={SNOUT} radius={0.05} castShadow={false} />
      {/* ears */}
      <Vox position={[-0.08, 1.06, 0.26]} size={[0.05, 0.08, 0.05]} color={BODY} radius={0.02} />
      <Vox position={[ 0.08, 1.06, 0.26]} size={[0.05, 0.08, 0.05]} color={BODY} radius={0.02} />
      {/* eyes */}
      <Vox position={[-0.07, 0.98, 0.39]} size={0.05} color={NOSE} radius={0.02} castShadow={false} />
      <Vox position={[ 0.07, 0.98, 0.39]} size={0.05} color={NOSE} radius={0.02} castShadow={false} />
      {/* tail */}
      <Vox position={[0, 0.56, -0.2]} size={[0.05, 0.18, 0.05]} color={HUMP} radius={0.02} />
    </group>
  )
}

// ── Mountaineer (Place Value Plateau) — tiny climber + bobble hat ───────────
//   Cool blue parka, red bobble hat, scarf. Cool tones.

function Mountaineer() {
  const PARKA  = PALETTE.waterDeep     // deep blue parka
  const PARKA_L= PALETTE.water         // lighter trim
  const PANTS  = PALETTE.rockDark      // slate pants
  const SKIN   = '#f0d8b8'             // warm skin
  const HAT    = '#d6584a'             // red knit hat — small accent
  const BOBBLE = PALETTE.foam          // white bobble/pom
  const NOSE   = '#2a1a0e'

  return (
    <group>
      {/* boots */}
      <Vox position={[-0.1, 0.3, 0.02]} size={[0.12, 0.16, 0.14]} color={PALETTE.barkDark} radius={0.04} />
      <Vox position={[ 0.1, 0.3, 0.02]} size={[0.12, 0.16, 0.14]} color={PALETTE.barkDark} radius={0.04} />
      {/* legs */}
      <Vox position={[-0.1, 0.44, 0]} size={[0.12, 0.2, 0.12]} color={PANTS} radius={0.04} />
      <Vox position={[ 0.1, 0.44, 0]} size={[0.12, 0.2, 0.12]} color={PANTS} radius={0.04} />
      {/* parka body */}
      <Vox position={[0, 0.68, 0]} size={[0.38, 0.36, 0.3]} color={PARKA} radius={0.12} />
      {/* zipper/trim */}
      <Vox position={[0, 0.68, 0.15]} size={[0.06, 0.32, 0.04]} color={PARKA_L} radius={0.02} castShadow={false} />
      {/* arms */}
      <Vox position={[-0.25, 0.7, 0]} size={[0.12, 0.28, 0.12]} color={PARKA} radius={0.05} />
      <Vox position={[ 0.25, 0.7, 0]} size={[0.12, 0.28, 0.12]} color={PARKA} radius={0.05} />
      {/* scarf */}
      <Vox position={[0, 0.9, 0.02]} size={[0.3, 0.1, 0.26]} color={HAT} radius={0.06} castShadow={false} />
      {/* head */}
      <Vox position={[0, 1.06, 0.01]} size={[0.3, 0.28, 0.28]} color={SKIN} radius={0.11} />
      {/* eyes */}
      <Vox position={[-0.08, 1.08, 0.16]} size={0.05} color={NOSE} radius={0.02} castShadow={false} />
      <Vox position={[ 0.08, 1.08, 0.16]} size={0.05} color={NOSE} radius={0.02} castShadow={false} />
      {/* bobble hat band + crown */}
      <Vox position={[0, 1.2, 0]}  size={[0.34, 0.1, 0.32]} color={HAT}    radius={0.06} />
      <Vox position={[0, 1.3, 0]}  size={[0.28, 0.12, 0.26]} color={HAT}   radius={0.08} />
      {/* pom-pom */}
      <Vox position={[0, 1.4, 0]}  size={0.12} color={BOBBLE} radius={0.06} />
    </group>
  )
}

// ── Marsh surveyor frog (Measurement Marsh) — frog holding a ruler ──────────
//   Green/teal frog with big eyes, holding a measuring ruler. Greens/teal.

function MarshFrog() {
  const BODY  = PALETTE.foliageLight   // bright marsh green
  const BELLY = '#cfe8a0'              // pale green belly
  const EYE_W = PALETTE.foam           // eye white
  const NOSE  = '#1f3320'
  const RULER = PALETTE.flowerYellow   // yellow ruler
  const TICK  = PALETTE.barkDark       // ruler tick marks

  return (
    <group>
      {/* squat froggy body */}
      <Vox position={[0, 0.48, 0]} size={[0.46, 0.34, 0.36]} color={BODY} radius={0.16} />
      {/* belly */}
      <Vox position={[0, 0.42, 0.16]} size={[0.28, 0.22, 0.06]} color={BELLY} radius={0.1} castShadow={false} />
      {/* back legs (folded) */}
      <Vox position={[-0.24, 0.34, -0.04]} size={[0.12, 0.14, 0.2]} color={BODY} radius={0.06} />
      <Vox position={[ 0.24, 0.34, -0.04]} size={[0.12, 0.14, 0.2]} color={BODY} radius={0.06} />
      {/* front feet */}
      <Vox position={[-0.18, 0.3, 0.2]} size={[0.12, 0.08, 0.1]} color={BELLY} radius={0.04} />
      <Vox position={[ 0.18, 0.3, 0.2]} size={[0.12, 0.08, 0.1]} color={BELLY} radius={0.04} />
      {/* bulging eyes on top */}
      <Vox position={[-0.13, 0.72, 0.06]} size={0.16} color={BODY}  radius={0.08} />
      <Vox position={[ 0.13, 0.72, 0.06]} size={0.16} color={BODY}  radius={0.08} />
      <Vox position={[-0.13, 0.74, 0.12]} size={0.09} color={EYE_W} radius={0.04} castShadow={false} />
      <Vox position={[ 0.13, 0.74, 0.12]} size={0.09} color={EYE_W} radius={0.04} castShadow={false} />
      <Vox position={[-0.13, 0.74, 0.16]} size={0.05} color={NOSE}  radius={0.02} castShadow={false} />
      <Vox position={[ 0.13, 0.74, 0.16]} size={0.05} color={NOSE}  radius={0.02} castShadow={false} />
      {/* wide smile */}
      <Vox position={[0, 0.5, 0.2]} size={[0.24, 0.04, 0.04]} color={NOSE} radius={0.02} castShadow={false} />
      {/* ruler held up at side */}
      <Vox position={[0.34, 0.62, 0.1]} size={[0.06, 0.5, 0.06]} color={RULER} radius={0.02} />
      <Vox position={[0.34, 0.52, 0.14]} size={[0.06, 0.02, 0.02]} color={TICK} radius={0.01} castShadow={false} />
      <Vox position={[0.34, 0.62, 0.14]} size={[0.06, 0.02, 0.02]} color={TICK} radius={0.01} castShadow={false} />
      <Vox position={[0.34, 0.72, 0.14]} size={[0.06, 0.02, 0.02]} color={TICK} radius={0.01} castShadow={false} />
    </group>
  )
}

// ── Geometry sprite (Geometry Grove) — faceted crystal, faint emissive ──────
//   Floating faceted crystal being, purple/teal, gentle glow.

function GeometrySprite() {
  const CRY   = PALETTE.flowerPurple   // purple crystal
  const CRY_T = PALETTE.water           // teal facet
  const GLOW  = '#b89cff'               // emissive purple glow
  const GLOW_T= '#7fe6e0'               // emissive teal glow
  const EYE   = PALETTE.foam

  return (
    <group>
      {/* floating diamond core — rotated cubes read as facets */}
      <Vox position={[0, 0.62, 0]} size={[0.34, 0.34, 0.34]} rotation={[0, Math.PI / 4, 0.4]}
           color={CRY} emissive={GLOW} emissiveIntensity={0.45} roughness={0.25} radius={0.04} />
      {/* upper spire */}
      <Vox position={[0, 0.92, 0]} size={[0.16, 0.3, 0.16]} rotation={[0, Math.PI / 4, 0]}
           color={CRY_T} emissive={GLOW_T} emissiveIntensity={0.5} roughness={0.2} radius={0.03} />
      {/* lower point */}
      <Vox position={[0, 0.36, 0]} size={[0.16, 0.24, 0.16]} rotation={[0, Math.PI / 4, 0]}
           color={CRY_T} emissive={GLOW_T} emissiveIntensity={0.4} roughness={0.2} radius={0.03} />
      {/* orbiting shards */}
      <Vox position={[-0.34, 0.66, 0.06]} size={0.12} rotation={[0.5, 0.5, 0]}
           color={CRY_T} emissive={GLOW_T} emissiveIntensity={0.5} roughness={0.2} radius={0.02} castShadow={false} />
      <Vox position={[ 0.34, 0.56, -0.06]} size={0.1} rotation={[0.3, 0.8, 0.2]}
           color={CRY} emissive={GLOW} emissiveIntensity={0.5} roughness={0.2} radius={0.02} castShadow={false} />
      {/* face on core */}
      <Vox position={[-0.08, 0.64, 0.18]} size={0.05} color={EYE} emissive={EYE} emissiveIntensity={0.6} radius={0.02} castShadow={false} />
      <Vox position={[ 0.08, 0.64, 0.18]} size={0.05} color={EYE} emissive={EYE} emissiveIntensity={0.6} radius={0.02} castShadow={false} />
      {/* soft glow light */}
      <pointLight color={GLOW} intensity={0.8} distance={1.8} decay={2} position={[0, 0.62, 0]} />
    </group>
  )
}

// ── Data robot (Data Delta) — boxy cheerful bot + antenna ───────────────────
//   Blue/grey boxy robot with a screen face and a blinking antenna.

function DataRobot() {
  const SHELL = PALETTE.rock           // grey shell
  const PANEL = PALETTE.waterDeep      // blue panels
  const SCREEN= '#0d2233'              // dark screen
  const PIX   = PALETTE.water          // glowing pixel face
  const BOLT  = PALETTE.lantern        // antenna tip glow
  const TRIM  = PALETTE.rockDark

  return (
    <group>
      {/* feet */}
      <Vox position={[-0.12, 0.3, 0]} size={[0.14, 0.12, 0.16]} color={TRIM} radius={0.04} />
      <Vox position={[ 0.12, 0.3, 0]} size={[0.14, 0.12, 0.16]} color={TRIM} radius={0.04} />
      {/* body chassis */}
      <Vox position={[0, 0.58, 0]} size={[0.42, 0.42, 0.32]} color={SHELL} radius={0.08} />
      {/* chest panel */}
      <Vox position={[0, 0.56, 0.16]} size={[0.26, 0.24, 0.04]} color={PANEL} radius={0.04} castShadow={false} />
      <Vox position={[0, 0.56, 0.18]} size={[0.06, 0.06, 0.02]} color={BOLT} emissive={BOLT} emissiveIntensity={1} radius={0.02} castShadow={false} />
      {/* arms */}
      <Vox position={[-0.27, 0.6, 0]} size={[0.1, 0.3, 0.1]} color={PANEL} radius={0.04} />
      <Vox position={[ 0.27, 0.6, 0]} size={[0.1, 0.3, 0.1]} color={PANEL} radius={0.04} />
      {/* head */}
      <Vox position={[0, 0.92, 0]} size={[0.36, 0.3, 0.3]} color={SHELL} radius={0.07} />
      {/* screen face */}
      <Vox position={[0, 0.92, 0.16]} size={[0.28, 0.2, 0.03]} color={SCREEN} radius={0.04} castShadow={false} />
      {/* pixel eyes + smile (emissive) */}
      <Vox position={[-0.07, 0.95, 0.18]} size={0.06} color={PIX} emissive={PIX} emissiveIntensity={1.1} radius={0.02} castShadow={false} />
      <Vox position={[ 0.07, 0.95, 0.18]} size={0.06} color={PIX} emissive={PIX} emissiveIntensity={1.1} radius={0.02} castShadow={false} />
      <Vox position={[0, 0.88, 0.18]} size={[0.14, 0.04, 0.02]} color={PIX} emissive={PIX} emissiveIntensity={1.1} radius={0.02} castShadow={false} />
      {/* antenna */}
      <Vox position={[0, 1.12, 0]} size={[0.04, 0.16, 0.04]} color={TRIM} radius={0.02} />
      <Vox position={[0, 1.24, 0]} size={0.1} color={BOLT} emissive={BOLT} emissiveIntensity={1.3} radius={0.05} castShadow={false} />
      <pointLight color={BOLT} intensity={0.7} distance={1.4} decay={2} position={[0, 1.24, 0]} />
    </group>
  )
}

// ── Book-loving crab (Reading Reef) — coral crab hugging a book ─────────────
//   Coral-red crab with claws, ocean-blue book. Ocean blue/coral.

function ReefCrab() {
  const SHELL = PALETTE.flowerRed      // coral-red shell
  const SHELL_D= PALETTE.mushroomCap   // darker coral
  const LEG   = SHELL_D
  const EYE_W = PALETTE.foam
  const NOSE  = '#2a1212'
  const BOOK  = PALETTE.water           // ocean-blue book
  const BOOK_D= PALETTE.waterDeep
  const PAGE  = PALETTE.foam

  return (
    <group>
      {/* legs poking out the sides */}
      <Vox position={[-0.26, 0.34, 0.08]} size={[0.14, 0.06, 0.06]} color={LEG} radius={0.02} />
      <Vox position={[-0.26, 0.34, -0.08]} size={[0.14, 0.06, 0.06]} color={LEG} radius={0.02} />
      <Vox position={[ 0.26, 0.34, 0.08]} size={[0.14, 0.06, 0.06]} color={LEG} radius={0.02} />
      <Vox position={[ 0.26, 0.34, -0.08]} size={[0.14, 0.06, 0.06]} color={LEG} radius={0.02} />
      {/* wide shell body */}
      <Vox position={[0, 0.5, 0]} size={[0.5, 0.3, 0.36]} color={SHELL} radius={0.16} />
      {/* shell highlight */}
      <Vox position={[0, 0.58, 0.04]} size={[0.34, 0.12, 0.06]} color={SHELL_D} radius={0.06} castShadow={false} />
      {/* claws */}
      <Vox position={[-0.3, 0.46, 0.18]} size={[0.14, 0.16, 0.12]} color={SHELL_D} radius={0.06} />
      <Vox position={[ 0.3, 0.46, 0.18]} size={[0.14, 0.16, 0.12]} color={SHELL_D} radius={0.06} />
      {/* eye stalks */}
      <Vox position={[-0.1, 0.68, 0.1]} size={[0.05, 0.12, 0.05]} color={SHELL} radius={0.02} />
      <Vox position={[ 0.1, 0.68, 0.1]} size={[0.05, 0.12, 0.05]} color={SHELL} radius={0.02} />
      <Vox position={[-0.1, 0.76, 0.1]} size={0.08} color={EYE_W} radius={0.04} castShadow={false} />
      <Vox position={[ 0.1, 0.76, 0.1]} size={0.08} color={EYE_W} radius={0.04} castShadow={false} />
      <Vox position={[-0.1, 0.77, 0.14]} size={0.04} color={NOSE} radius={0.02} castShadow={false} />
      <Vox position={[ 0.1, 0.77, 0.14]} size={0.04} color={NOSE} radius={0.02} castShadow={false} />
      {/* book hugged in front */}
      <Vox position={[0, 0.46, 0.22]} size={[0.26, 0.2, 0.06]} color={BOOK}  radius={0.03} />
      <Vox position={[0, 0.46, 0.255]} size={[0.22, 0.16, 0.02]} color={PAGE} radius={0.02} castShadow={false} />
      <Vox position={[0, 0.46, 0.26]} size={[0.02, 0.16, 0.01]} color={BOOK_D} radius={0.01} castShadow={false} />
    </group>
  )
}

// ── Little scientist (Science Summit) — lab coat + goggles ──────────────────
//   White lab coat, teal goggles, hands behind back. White/teal.

function LittleScientist() {
  const COAT  = PALETTE.flowerWhite    // white lab coat
  const COAT_S= PALETTE.cottageWall    // soft shadow
  const SHIRT = PALETTE.water           // teal undershirt
  const PANTS = PALETTE.rockDark
  const SKIN  = '#f0d8b8'
  const HAIR  = PALETTE.barkDark
  const GOG   = PALETTE.water            // teal goggles
  const GOG_G = '#bdeefb'                // goggle lens
  const NOSE  = '#2a1a0e'

  return (
    <group>
      {/* shoes */}
      <Vox position={[-0.1, 0.3, 0.02]} size={[0.12, 0.1, 0.14]} color={PANTS} radius={0.03} />
      <Vox position={[ 0.1, 0.3, 0.02]} size={[0.12, 0.1, 0.14]} color={PANTS} radius={0.03} />
      {/* legs */}
      <Vox position={[-0.1, 0.42, 0]} size={[0.12, 0.18, 0.12]} color={PANTS} radius={0.04} />
      <Vox position={[ 0.1, 0.42, 0]} size={[0.12, 0.18, 0.12]} color={PANTS} radius={0.04} />
      {/* teal collar peek */}
      <Vox position={[0, 0.86, 0.04]} size={[0.18, 0.08, 0.2]} color={SHIRT} radius={0.05} castShadow={false} />
      {/* lab coat body */}
      <Vox position={[0, 0.66, 0]} size={[0.4, 0.42, 0.3]} color={COAT} radius={0.1} />
      {/* coat lapel shadow line */}
      <Vox position={[0, 0.64, 0.15]} size={[0.04, 0.36, 0.04]} color={COAT_S} radius={0.02} castShadow={false} />
      {/* teal undershirt v */}
      <Vox position={[0, 0.74, 0.16]} size={[0.1, 0.16, 0.02]} color={SHIRT} radius={0.02} castShadow={false} />
      {/* pocket */}
      <Vox position={[0.1, 0.54, 0.16]} size={[0.1, 0.08, 0.02]} color={COAT_S} radius={0.02} castShadow={false} />
      {/* arms */}
      <Vox position={[-0.26, 0.68, 0]} size={[0.11, 0.3, 0.12]} color={COAT} radius={0.05} />
      <Vox position={[ 0.26, 0.68, 0]} size={[0.11, 0.3, 0.12]} color={COAT} radius={0.05} />
      {/* head */}
      <Vox position={[0, 1.02, 0.01]} size={[0.3, 0.3, 0.28]} color={SKIN} radius={0.11} />
      {/* hair */}
      <Vox position={[0, 1.18, 0]} size={[0.32, 0.12, 0.3]} color={HAIR} radius={0.06} />
      {/* goggles strap + lenses */}
      <Vox position={[0, 1.06, 0.04]} size={[0.34, 0.08, 0.3]} color={GOG} radius={0.04} castShadow={false} />
      <Vox position={[-0.08, 1.06, 0.16]} size={[0.1, 0.09, 0.04]} color={GOG_G} radius={0.04} castShadow={false} transparent opacity={0.85} />
      <Vox position={[ 0.08, 1.06, 0.16]} size={[0.1, 0.09, 0.04]} color={GOG_G} radius={0.04} castShadow={false} transparent opacity={0.85} />
      {/* smile */}
      <Vox position={[0, 0.94, 0.16]} size={[0.1, 0.03, 0.02]} color={NOSE} radius={0.01} castShadow={false} />
    </group>
  )
}

// ── Tiny knight (Tower Battlefront) — helmet + shield ───────────────────────
//   Grey steel armor with purple plume + shield crest. Grey/purple.

function TinyKnight() {
  const STEEL = PALETTE.rock           // steel grey
  const STEEL_D= PALETTE.rockDark      // dark steel
  const PLUME = PALETTE.flowerPurple   // purple plume/crest
  const PLUME_D= '#6e4fb0'             // darker purple
  const VISOR = '#1a1c22'              // dark visor slit
  const TRIM  = PALETTE.lantern        // gold trim accent

  return (
    <group>
      {/* boots */}
      <Vox position={[-0.1, 0.3, 0.02]} size={[0.13, 0.12, 0.15]} color={STEEL_D} radius={0.04} />
      <Vox position={[ 0.1, 0.3, 0.02]} size={[0.13, 0.12, 0.15]} color={STEEL_D} radius={0.04} />
      {/* legs */}
      <Vox position={[-0.1, 0.44, 0]} size={[0.12, 0.18, 0.12]} color={STEEL} radius={0.04} />
      <Vox position={[ 0.1, 0.44, 0]} size={[0.12, 0.18, 0.12]} color={STEEL} radius={0.04} />
      {/* breastplate */}
      <Vox position={[0, 0.68, 0]} size={[0.4, 0.4, 0.3]} color={STEEL} radius={0.1} />
      {/* belt trim */}
      <Vox position={[0, 0.5, 0.15]} size={[0.4, 0.06, 0.04]} color={TRIM} radius={0.02} castShadow={false} />
      {/* purple sash crest */}
      <Vox position={[0, 0.7, 0.16]} size={[0.08, 0.3, 0.03]} color={PLUME} radius={0.02} castShadow={false} />
      {/* shoulder pauldrons */}
      <Vox position={[-0.25, 0.84, 0]} size={[0.14, 0.12, 0.16]} color={STEEL_D} radius={0.06} />
      <Vox position={[ 0.25, 0.84, 0]} size={[0.14, 0.12, 0.16]} color={STEEL_D} radius={0.06} />
      {/* right arm */}
      <Vox position={[0.27, 0.66, 0]} size={[0.1, 0.28, 0.1]} color={STEEL} radius={0.04} />
      {/* left arm + shield */}
      <Vox position={[-0.27, 0.66, 0]} size={[0.1, 0.28, 0.1]} color={STEEL} radius={0.04} />
      <Vox position={[-0.34, 0.62, 0.1]} size={[0.06, 0.34, 0.26]} color={STEEL_D} radius={0.06} />
      <Vox position={[-0.31, 0.62, 0.1]} size={[0.04, 0.26, 0.16]} color={PLUME} radius={0.04} castShadow={false} />
      <Vox position={[-0.3, 0.62, 0.1]} size={0.07} color={TRIM} radius={0.03} castShadow={false} />
      {/* helmet */}
      <Vox position={[0, 0.98, 0.01]} size={[0.3, 0.3, 0.3]} color={STEEL} radius={0.09} />
      {/* visor slit */}
      <Vox position={[0, 0.98, 0.16]} size={[0.22, 0.05, 0.03]} color={VISOR} radius={0.02} castShadow={false} />
      {/* helmet gold band */}
      <Vox position={[0, 1.08, 0.02]} size={[0.32, 0.04, 0.32]} color={TRIM} radius={0.02} castShadow={false} />
      {/* plume crest */}
      <Vox position={[0, 1.2, -0.02]} size={[0.1, 0.18, 0.14]} color={PLUME} radius={0.05} />
      <Vox position={[0, 1.3, -0.06]} size={[0.08, 0.12, 0.12]} color={PLUME_D} radius={0.04} />
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

// ── Teacher owl (Schoolhouse) — a round owl in a mortarboard with a pointer ──
//   Warm browns + cream face disc, big friendly eyes, a tiny chalk pointer.

function TeacherOwl() {
  const FEATHER   = PALETTE.bark          // warm brown body
  const FEATHER_L = PALETTE.wood          // lighter wing tips
  const FACE      = PALETTE.cottageWall   // cream face disc
  const EYE       = '#2a1a0e'
  const BEAK      = PALETTE.flowerYellow
  const CAP       = '#2d3550'             // slate mortarboard
  const TASSEL    = PALETTE.flowerRed

  return (
    <group>
      {/* feet */}
      <Vox position={[-0.08, 0.04, 0.06]} size={[0.1, 0.06, 0.12]} color={BEAK} radius={0.03} castShadow={false} />
      <Vox position={[ 0.08, 0.04, 0.06]} size={[0.1, 0.06, 0.12]} color={BEAK} radius={0.03} castShadow={false} />
      {/* round body */}
      <Vox position={[0, 0.36, 0]} size={[0.46, 0.56, 0.4]} color={FEATHER} radius={0.18} />
      {/* belly */}
      <Vox position={[0, 0.32, 0.17]} size={[0.3, 0.38, 0.08]} color={FACE} radius={0.1} castShadow={false} />
      {/* wings */}
      <Vox position={[-0.26, 0.38, 0]} size={[0.08, 0.36, 0.3]} color={FEATHER_L} radius={0.04} />
      <Vox position={[ 0.26, 0.38, 0]} size={[0.08, 0.36, 0.3]} color={FEATHER_L} radius={0.04} />
      {/* head */}
      <Vox position={[0, 0.8, 0]} size={[0.44, 0.36, 0.38]} color={FEATHER} radius={0.14} />
      {/* face disc + big eyes */}
      <Vox position={[0, 0.8, 0.18]} size={[0.36, 0.26, 0.06]} color={FACE} radius={0.1} castShadow={false} />
      <Vox position={[-0.09, 0.83, 0.22]} size={0.09} color={EYE} radius={0.04} castShadow={false} />
      <Vox position={[ 0.09, 0.83, 0.22]} size={0.09} color={EYE} radius={0.04} castShadow={false} />
      <Vox position={[0, 0.74, 0.23]} size={[0.06, 0.06, 0.06]} color={BEAK} radius={0.02} castShadow={false} />
      {/* ear tufts */}
      <Vox position={[-0.15, 1.0, 0]} size={[0.08, 0.1, 0.08]} color={FEATHER} radius={0.03} />
      <Vox position={[ 0.15, 1.0, 0]} size={[0.08, 0.1, 0.08]} color={FEATHER} radius={0.03} />
      {/* mortarboard */}
      <Vox position={[0, 1.02, 0]} size={[0.24, 0.1, 0.22]} color={CAP} radius={0.03} />
      <Vox position={[0, 1.09, 0]} size={[0.46, 0.04, 0.46]} color={CAP} radius={0.02} />
      <Vox position={[0.2, 1.0, 0.2]} size={[0.03, 0.16, 0.03]} color={TASSEL} radius={0.01} castShadow={false} />
      {/* chalk pointer in the right wing */}
      <Vox position={[0.36, 0.5, 0.12]} size={[0.03, 0.42, 0.03]} color={PALETTE.flowerWhite} radius={0.01} rotation={[0.5, 0, -0.4]} castShadow={false} />
    </group>
  )
}

// ── Librarian bookworm (Library) — a green worm in glasses with a book stack ──

function LibrarianWorm() {
  const BODY  = PALETTE.foliageLight
  const BODY_D = PALETTE.foliage
  const GLASS = '#c4dff5'
  const RIM   = PALETTE.barkDark
  const EYE   = '#2a1a0e'
  const BOOKS = [PALETTE.flowerRed, PALETTE.water, PALETTE.flowerYellow]

  return (
    <group>
      {/* segmented body curling up out of a book stack */}
      {BOOKS.map((c, i) => (
        <Vox key={c} position={[0, 0.06 + i * 0.12, 0]} size={[0.5 - i * 0.05, 0.1, 0.36 - i * 0.03]} color={c} radius={0.03} />
      ))}
      <Vox position={[0, 0.48, 0]} size={[0.3, 0.2, 0.28]} color={BODY_D} radius={0.1} />
      <Vox position={[0, 0.66, 0.02]} size={[0.28, 0.2, 0.26]} color={BODY} radius={0.1} />
      {/* head */}
      <Vox position={[0, 0.9, 0.04]} size={[0.36, 0.32, 0.32]} color={BODY} radius={0.14} />
      {/* round glasses */}
      <Vox position={[-0.09, 0.93, 0.21]} size={[0.13, 0.13, 0.03]} color={RIM} radius={0.05} castShadow={false} />
      <Vox position={[ 0.09, 0.93, 0.21]} size={[0.13, 0.13, 0.03]} color={RIM} radius={0.05} castShadow={false} />
      <Vox position={[-0.09, 0.93, 0.23]} size={[0.09, 0.09, 0.02]} color={GLASS} radius={0.03} transparent opacity={0.65} castShadow={false} />
      <Vox position={[ 0.09, 0.93, 0.23]} size={[0.09, 0.09, 0.02]} color={GLASS} radius={0.03} transparent opacity={0.65} castShadow={false} />
      <Vox position={[-0.09, 0.93, 0.24]} size={0.04} color={EYE} radius={0.02} castShadow={false} />
      <Vox position={[ 0.09, 0.93, 0.24]} size={0.04} color={EYE} radius={0.02} castShadow={false} />
      {/* smile */}
      <Vox position={[0, 0.82, 0.2]} size={[0.1, 0.03, 0.03]} color={EYE} radius={0.01} castShadow={false} />
      {/* open book held up */}
      <Vox position={[0.24, 0.72, 0.16]} size={[0.2, 0.14, 0.03]} color={PALETTE.flowerWhite} radius={0.02} rotation={[0, -0.4, 0]} castShadow={false} />
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
    case 'multiplication-mesa':
      return <CactusProspector />
    case 'division-dunes':
      return <DesertCamel />
    case 'place-value-plateau':
      return <Mountaineer />
    case 'measurement-marsh':
      return <MarshFrog />
    case 'geometry-grove':
      return <GeometrySprite />
    case 'data-delta':
      return <DataRobot />
    case 'reading-reef':
      return <ReefCrab />
    case 'science-summit':
      return <LittleScientist />
    case 'tower-battlefront':
      return <TinyKnight />
    case 'schoolhouse':
      return <TeacherOwl />
    case 'library':
      return <LibrarianWorm />
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
  if (areaId === 'multiplication-mesa') {
    // dusty pollen motes — warm sand
    return <Sparkles count={10} scale={1.6} size={2} speed={0.3} color={PALETTE.sand} opacity={0.5} />
  }
  if (areaId === 'division-dunes') {
    // shimmering sand grains — pale tan
    return <Sparkles count={12} scale={1.8} size={2} speed={0.35} color="#e7cf9a" opacity={0.5} />
  }
  if (areaId === 'place-value-plateau') {
    // crisp snow flurries — icy white
    return <Sparkles count={14} scale={1.8} size={2.5} speed={0.4} color={PALETTE.foam} opacity={0.6} />
  }
  if (areaId === 'measurement-marsh') {
    // marsh midges — soft teal
    return <Sparkles count={14} scale={1.8} size={2} speed={0.5} color={PALETTE.water} opacity={0.5} />
  }
  if (areaId === 'geometry-grove') {
    // crystal glints — purple
    return <Sparkles count={14} scale={1.6} size={3} speed={0.5} color="#b89cff" opacity={0.7} />
  }
  if (areaId === 'data-delta') {
    // data bits — electric blue
    return <Sparkles count={12} scale={1.7} size={2.5} speed={0.6} color={PALETTE.water} opacity={0.6} />
  }
  if (areaId === 'reading-reef') {
    // bubbles — pale foam
    return <Sparkles count={16} scale={2.0} size={2.5} speed={0.45} color={PALETTE.foam} opacity={0.55} />
  }
  if (areaId === 'science-summit') {
    // bright specks — teal
    return <Sparkles count={12} scale={1.6} size={2.5} speed={0.5} color="#7fe6e0" opacity={0.6} />
  }
  if (areaId === 'schoolhouse') {
    // chalk dust — soft white
    return <Sparkles count={10} scale={1.5} size={2} speed={0.3} color={PALETTE.flowerWhite} opacity={0.55} />
  }
  if (areaId === 'library') {
    // page-glow motes — warm lantern
    return <Sparkles count={10} scale={1.5} size={2.5} speed={0.3} color={PALETTE.lantern} opacity={0.6} />
  }
  if (areaId === 'tower-battlefront') {
    // arcane embers — purple
    return <Sparkles count={10} scale={1.6} size={2.5} speed={0.4} color={PALETTE.flowerPurple} opacity={0.6} />
  }
  return null
}

// ── Main component ────────────────────────────────────────────────────────────

/** A charming voxel character that opens `zoneId` when the avatar walks within range. */
export default function Npc({
  areaId,
  zoneId,
  hub,
  label,
  position,
  posRef,
}: {
  areaId: string
  zoneId?: string
  hub?: HubKind
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
    if (near && cur?.areaId !== areaId)   setActiveNpc({ areaId, zoneId, hub, label })
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
