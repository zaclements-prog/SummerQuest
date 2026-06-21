/**
 * Division Dunes — a sunny rolling SAND-DUNE oasis gateway.
 *
 * Center: world (14, 12).  A central collider (r=2.5) sits at the center, so
 * the MAIN LANDMARK — a big stepped sand-dune mound crowned with palms — lives
 * there and the avatar walks around it. The gateway NPC sits at local (-3,-2.6)
 * → world (11, 9.4), approached from the south-west; that corridor is kept flat
 * and clear (only the low NPC stage, a signpost, and a warm lantern frame it).
 *
 * Everything inside the inner <group> is authored RELATIVE to the area center.
 * The oasis pool, a friendly voxel camel, palms, cacti and scattered pebbles
 * ring the dune so the place reads as "desert oasis" at a glance.
 */

import type { RefObject } from 'react'
import { Vector3 } from 'three'
import { Sparkles, Float } from '@react-three/drei'
import Npc from '../Npc'
import { areaById } from '../worldLayout'
import { Vox, Scatter } from '../voxel/Vox'
import { PALETTE } from '../voxel/palette'
import { Rock, LilyPad, Cattail, Signpost, Lantern } from '../voxel/props'
import { field, rng } from '../voxel/fields'

type Vec3 = [number, number, number]

// Sand accents that aren't in PALETTE — warm dune highlights / shadow tones.
const SAND_TOP = '#f0dea6' // sun-kissed crest
const SAND_LOW = '#d8c089' // shadowed flank
const PALM_TRUNK = '#a9824e'
const PALM_FROND = '#6fae52'
const PALM_FROND_DK = '#4f8c3f'
const CAMEL = '#caa46a'
const CAMEL_DK = '#a9854f'
const CACTUS = '#5fa05a'
const CACTUS_DK = '#4a8348'
const FLOWER = PALETTE.flowerYellow

// ── Dune-grass tufts dotted across the sand (instanced, one draw call) ───────
// Centered on the area; thin out toward the SW approach corridor.
const DUNE_GRASS = field([14, 12.5], 5.4, 4.6, 46, 9201, {
  y: 0,
  minScale: 0.5,
  maxScale: 1.0,
})

// Scattered pebbles across the dunes (instanced).
const PEBBLES = field([14, 12.5], 6.0, 5.0, 40, 9337, {
  y: 0.04,
  minScale: 0.5,
  maxScale: 1.3,
})

/** A little stepped voxel palm tree built from Vox blocks. */
function Palm({ position, seed = 1, lean = 0 }: { position: Vec3; seed?: number; lean?: number }) {
  const r = rng(seed)
  const yaw = r() * Math.PI
  const h = 2.2 + r() * 0.6
  const seg = 5
  const trunk: { p: Vec3; s: Vec3 }[] = []
  for (let i = 0; i < seg; i++) {
    const t = i / (seg - 1)
    trunk.push({
      p: [Math.sin(t * 1.4 + lean) * 0.45 * t, 0.3 + i * (h / seg), 0],
      s: [0.3 - t * 0.06, h / seg + 0.06, 0.3 - t * 0.06],
    })
  }
  const topX = Math.sin(1.4 + lean) * 0.45
  const topY = 0.3 + (seg - 1) * (h / seg)
  // Six radial fronds drooping outward.
  const fronds: { rot: Vec3; c: string }[] = []
  const nf = 6
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * Math.PI * 2
    fronds.push({ rot: [0.5, a, 0], c: i % 2 ? PALM_FROND : PALM_FROND_DK })
  }
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {trunk.map((b, i) => (
        <Vox key={i} position={b.p} size={b.s} color={PALM_TRUNK} radius={0.08} roughness={0.9} />
      ))}
      <group position={[topX, topY + 0.1, 0]}>
        {fronds.map((f, i) => (
          <Vox
            key={i}
            position={[Math.cos(f.rot[1]) * 0.55, -0.05, Math.sin(f.rot[1]) * 0.55]}
            size={[1.15, 0.12, 0.36]}
            color={f.c}
            rotation={f.rot}
            radius={0.06}
            castShadow={false}
          />
        ))}
        {/* a few coconuts */}
        <Vox position={[0.18, -0.1, 0.12]} size={0.18} color={PALETTE.barkDark} radius={0.08} castShadow={false} />
        <Vox position={[-0.16, -0.12, -0.1]} size={0.16} color={PALETTE.barkDark} radius={0.07} castShadow={false} />
      </group>
    </group>
  )
}

/** A friendly chunky voxel camel (two humps, stubby legs, sleepy smile). */
function Camel({ position, yaw = 0 }: { position: Vec3; yaw?: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* legs */}
      {([[-0.45, 0.42], [0.45, 0.42], [-0.45, -0.42], [0.45, -0.42]] as [number, number][]).map(
        (p, i) => (
          <Vox key={i} position={[p[0], 0.32, p[1]]} size={[0.22, 0.64, 0.22]} color={CAMEL_DK} radius={0.07} />
        ),
      )}
      {/* body */}
      <Vox position={[0, 0.95, 0]} size={[1.5, 0.7, 0.8]} color={CAMEL} radius={0.26} />
      {/* two humps */}
      <Vox position={[-0.32, 1.42, 0]} size={[0.55, 0.5, 0.62]} color={CAMEL} radius={0.24} castShadow={false} />
      <Vox position={[0.34, 1.42, 0]} size={[0.55, 0.5, 0.62]} color={CAMEL} radius={0.24} castShadow={false} />
      {/* neck */}
      <Vox position={[0.78, 1.25, 0]} size={[0.34, 0.85, 0.36]} color={CAMEL} radius={0.14} rotation={[0, 0, -0.35]} />
      {/* head */}
      <Vox position={[1.02, 1.72, 0]} size={[0.48, 0.42, 0.4]} color={CAMEL} radius={0.16} />
      {/* snout */}
      <Vox position={[1.32, 1.62, 0]} size={[0.28, 0.26, 0.32]} color={CAMEL_DK} radius={0.1} castShadow={false} />
      {/* ears */}
      <Vox position={[0.92, 2.0, 0.16]} size={[0.12, 0.16, 0.1]} color={CAMEL_DK} radius={0.04} castShadow={false} />
      <Vox position={[0.92, 2.0, -0.16]} size={[0.12, 0.16, 0.1]} color={CAMEL_DK} radius={0.04} castShadow={false} />
      {/* eyes */}
      <Vox position={[1.22, 1.78, 0.18]} size={0.08} color="#3a2c1c" radius={0.04} castShadow={false} />
      <Vox position={[1.22, 1.78, -0.18]} size={0.08} color="#3a2c1c" radius={0.04} castShadow={false} />
      {/* tail */}
      <Vox position={[-0.78, 0.95, 0]} size={[0.12, 0.5, 0.12]} color={CAMEL_DK} radius={0.05} rotation={[0, 0, 0.3]} castShadow={false} />
    </group>
  )
}

/** A stout segmented saguaro-style voxel cactus with a bloom on top. */
function Cactus({ position, seed = 1 }: { position: Vec3; seed?: number }) {
  const r = rng(seed)
  const yaw = r() * Math.PI
  const h = 1.2 + r() * 0.7
  const armUp = r() > 0.4
  const armSide = r() > 0.5 ? 1 : -1
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Vox position={[0, h / 2, 0]} size={[0.42, h, 0.42]} color={CACTUS} radius={0.18} />
      {/* a ridge tone down one side */}
      <Vox position={[0.16, h / 2, 0]} size={[0.12, h * 0.9, 0.3]} color={CACTUS_DK} radius={0.06} castShadow={false} />
      {armUp && (
        <group>
          {/* arm out then up */}
          <Vox position={[armSide * 0.34, h * 0.55, 0]} size={[0.5, 0.3, 0.3]} color={CACTUS} radius={0.12} />
          <Vox position={[armSide * 0.52, h * 0.78, 0]} size={[0.3, 0.55, 0.3]} color={CACTUS} radius={0.12} />
        </group>
      )}
      {/* bloom */}
      <Vox position={[0, h + 0.08, 0]} size={0.18} color={FLOWER} radius={0.08} castShadow={false} />
    </group>
  )
}

export default function DivisionDunes({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('division-dunes')!
  const npc = a.npc!
  const npcX = a.worldPos[0] + npc.offset[0] // 11
  const npcZ = a.worldPos[1] + npc.offset[1] // 9.4

  return (
    <group>
      <group position={[a.worldPos[0], 0, a.worldPos[1]]}>
        {/* ── CENTRAL DUNE MOUND (the landmark, on the r=2.5 collider) ──────
            A stack of broad, beveled sand slabs stepping up to a soft crest.
            Wide footprint so it reads as a rolling dune; kept inside the
            collider radius so the avatar circles it. */}
        <Vox position={[0, 0.35, 0]} size={[4.6, 0.7, 4.2]} color={SAND_LOW} radius={0.6} roughness={0.95} />
        <Vox position={[0.15, 0.95, -0.1]} size={[3.5, 0.7, 3.1]} color={PALETTE.sand} radius={0.55} roughness={0.95} />
        <Vox position={[-0.2, 1.5, 0.15]} size={[2.5, 0.7, 2.2]} color={SAND_TOP} radius={0.5} roughness={0.95} />
        <Vox position={[0.25, 1.95, -0.05]} size={[1.4, 0.6, 1.3]} color={SAND_TOP} radius={0.42} roughness={0.95} />
        {/* a smaller sister dune lump for an undulating silhouette */}
        <Vox position={[-1.9, 0.5, -1.6]} size={[2.0, 1.0, 1.8]} color={SAND_LOW} radius={0.5} roughness={0.95} />
        <Vox position={[-1.9, 1.0, -1.6]} size={[1.1, 0.6, 1.0]} color={PALETTE.sand} radius={0.4} roughness={0.95} />

        {/* Palms crowning the dune (clear of the SW NPC approach) */}
        <Palm position={[0.3, 2.2, -0.1]} seed={71} lean={0.2} />
        <Palm position={[-1.7, 1.4, -1.5]} seed={72} lean={-0.3} />

        {/* ── OASIS POOL (recessed water disc, NE of the dune) ─────────────
            A flat sunken pool of beveled water slabs with a wet-sand rim. */}
        <group position={[3.0, 0, 2.4]}>
          {/* wet-sand rim */}
          <Vox position={[0, 0.03, 0]} size={[3.0, 0.1, 2.6]} color={PALETTE.sandWet} radius={0.7} roughness={0.9} receiveShadow />
          {/* water surface */}
          <Vox
            position={[0, 0.07, 0]}
            size={[2.4, 0.1, 2.0]}
            color={PALETTE.water}
            radius={0.6}
            roughness={0.18}
            metalness={0.15}
            transparent
            opacity={0.82}
            castShadow={false}
            receiveShadow
          />
          {/* deeper tint */}
          <Vox
            position={[0, 0.05, 0]}
            size={[1.5, 0.1, 1.2]}
            color={PALETTE.waterDeep}
            radius={0.45}
            transparent
            opacity={0.55}
            castShadow={false}
            receiveShadow={false}
          />
          <LilyPad position={[-0.5, 0.12, 0.4]} seed={31} />
          <LilyPad position={[0.6, 0.12, -0.3]} seed={52} />
          <Cattail position={[-1.0, 0, -0.7]} seed={11} />
          <Cattail position={[1.05, 0, 0.7]} seed={23} />
          {/* sun-glint sparkle over the water */}
          <Sparkles count={14} scale={[2.2, 0.6, 1.8]} position={[0, 0.4, 0]} size={3} speed={0.4} color={PALETTE.foam} />
        </group>

        {/* a palm leaning over the oasis for that postcard read */}
        <Palm position={[1.9, 0, 3.2]} seed={73} lean={0.5} />

        {/* ── Friendly CAMEL resting on the south flank ───────────────────
            Faces east (toward the oasis), well clear of the NPC corridor. */}
        <Camel position={[2.2, 0, -2.0]} yaw={Math.PI * 0.15} />

        {/* ── CACTI dotted around the sand ────────────────────────────────── */}
        <Cactus position={[-3.4, 0, 1.6]} seed={101} />
        <Cactus position={[-3.0, 0, 3.0]} seed={102} />
        <Cactus position={[3.8, 0, -1.2]} seed={103} />
        <Cactus position={[-2.4, 0, -2.8]} seed={104} />

        {/* ── Desert rocks for texture (off the walk path) ─────────────────── */}
        <Rock position={[-3.6, 0, -0.4]} seed={201} />
        <Rock position={[4.0, 0, 1.4]} seed={202} />
        <Rock position={[-1.0, 0, 3.6]} seed={203} />

        {/* warm heat-haze shimmer rising off the dune */}
        <Sparkles count={20} scale={[7, 3, 6]} position={[0, 1.6, 0]} size={5} speed={0.15} opacity={0.3} color="#fff0c0" />
      </group>

      {/* ── Instanced dune-grass + pebbles (authored in WORLD space) ──────── */}
      <Scatter
        items={DUNE_GRASS}
        color={PALETTE.grassDark}
        jitterAmount={0.12}
        size={[0.06, 0.2, 0.06]}
        roughness={0.9}
        castShadow={false}
      />
      <Scatter
        items={PEBBLES}
        color={PALETTE.pebble}
        jitterAmount={0.14}
        size={0.16}
        radius={0.05}
        roughness={0.9}
        castShadow={false}
      />

      {/* ── GATEWAY framing: low sand stage + sign + warm lantern ──────────
          Authored in WORLD space around the NPC at (11, 9.4). The stage is a
          flat beveled sand disc so it never blocks the flat walk; the signpost
          sits a step back so it's read on approach; the lantern glows beside. */}
      <group position={[npcX, 0, npcZ]}>
        {/* low sand base/stage under the NPC */}
        <Vox position={[0, 0.06, 0]} size={[1.7, 0.12, 1.7]} color={PALETTE.sandWet} radius={0.4} roughness={0.9} receiveShadow />
        <Vox position={[0, 0.14, 0]} size={[1.2, 0.1, 1.2]} color={SAND_TOP} radius={0.32} roughness={0.9} receiveShadow castShadow={false} />
      </group>

      {/* "Division Dunes" signpost — set back NW of the NPC, angled to face the
          approaching player. */}
      <Signpost position={[npcX - 1.3, 0, npcZ - 1.0]} facing={Math.PI * 0.7} />

      {/* Warm lantern beside the NPC */}
      <Lantern position={[npcX + 1.2, 0, npcZ - 0.3]} height={1.4} />

      {/* A potted desert bloom (floating gently) on the other side of the NPC */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0.4} floatingRange={[0, 0.12]}>
        <group position={[npcX - 1.1, 0.0, npcZ + 0.4]}>
          <Vox position={[0, 0.2, 0]} size={[0.34, 0.4, 0.34]} color={PALETTE.roof} radius={0.08} />
          <Vox position={[0, 0.55, 0]} size={0.18} color={PALETTE.flowerPink} radius={0.08} castShadow={false} />
          <Vox position={[0.14, 0.48, 0.06]} size={0.13} color={PALETTE.flowerRed} radius={0.06} castShadow={false} />
        </group>
      </Float>

      {/* gentle warm fireflies / sand-sparkle near the gateway */}
      <Sparkles position={[npcX, 0.5, npcZ]} count={12} scale={[3, 1.6, 3]} size={3} speed={0.2} opacity={0.7} color={PALETTE.lantern} />

      <Npc
        areaId={a.id}
        zoneId={a.zoneId}
        label={a.label}
        position={[npcX, 0, npcZ]}
        posRef={posRef}
      />
    </group>
  )
}
