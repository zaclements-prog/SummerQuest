/**
 * Geometry Grove — a tidy, clever GEOMETRY garden gateway.
 *
 * Center: (-20, -18) world xz.  NPC at (-17, -15.3) world xz (offset [3, 2.7]).
 * One central collider (r=2.5) holds the MAIN LANDMARK: a slowly-bobbing
 * floating CRYSTAL on a stepped plinth — the avatar walks the ring around it.
 *
 * Everything decorative is authored in a local group anchored at the area
 * center, so positions read as offsets from (0,0). The approach corridor toward
 * the NPC (local +x / +z, world ~ -17,-15.3) is kept clear of tall blockers:
 * topiary + sculptures sit on the far/side arcs, hedges frame but don't block.
 *
 * Look: island teal hedges + clean stone sculptures + a crystal accent
 * (icy teal, faint emissive). Geometric topiary spells the subject at a glance:
 * a CUBE tree, a CONE tree, a SPHERE tree. Shape sculptures: a TRIANGLE of
 * standing stones and a HEXAGON stone ring.
 */

import { useMemo } from 'react'
import type { RefObject } from 'react'
import { Vector3 } from 'three'
import { Float, Sparkles } from '@react-three/drei'
import Npc from '../Npc'
import { areaById } from '../worldLayout'
import { Vox, Scatter } from '../voxel/Vox'
import { PALETTE } from '../voxel/palette'
import { Bush, Lantern, Signpost } from '../voxel/props'
import { field } from '../voxel/fields'

type Vec3 = [number, number, number]

// ── Crystal accent colors (small raw-hex accents, cohesive with island teal) ──
const CRYSTAL = '#7fe3d8' // icy teal crystal body
const CRYSTAL_DEEP = '#3fb8c9' // deeper teal facet
const CRYSTAL_GLOW = '#bff6ef' // pale glow highlight
const HEDGE = PALETTE.foliage // tidy hedge green

// Neat tile floor for the grove (instanced flat plates, a manicured look).
const TILE_ITEMS = field([0, 0], 4.2, 4.2, 44, 9201, {
  y: 0.02,
  minScale: 0.9,
  maxScale: 1.0,
})

/**
 * Faceted floating crystal — a stack of beveled cubes rotated 45° so it reads
 * as a cut gem / diamond. Faint emissive so it glows softly in bloom.
 */
function Crystal() {
  return (
    <group>
      {/* lower point (inverted, narrow) */}
      <Vox
        position={[0, 0.32, 0]}
        size={[0.55, 0.6, 0.55]}
        color={CRYSTAL_DEEP}
        rotation={[0, Math.PI / 4, 0]}
        radius={0.04}
        roughness={0.18}
        metalness={0.25}
        emissive={CRYSTAL_DEEP}
        emissiveIntensity={0.35}
        transparent
        opacity={0.92}
        castShadow={false}
      />
      {/* wide girdle / main body */}
      <Vox
        position={[0, 0.92, 0]}
        size={[0.95, 0.8, 0.95]}
        color={CRYSTAL}
        rotation={[0, Math.PI / 4, 0]}
        radius={0.05}
        roughness={0.15}
        metalness={0.3}
        emissive={CRYSTAL}
        emissiveIntensity={0.45}
        transparent
        opacity={0.9}
        castShadow={false}
      />
      {/* crown taper */}
      <Vox
        position={[0, 1.5, 0]}
        size={[0.6, 0.5, 0.6]}
        color={CRYSTAL}
        rotation={[0, Math.PI / 4, 0]}
        radius={0.05}
        roughness={0.14}
        metalness={0.3}
        emissive={CRYSTAL_GLOW}
        emissiveIntensity={0.5}
        transparent
        opacity={0.92}
        castShadow={false}
      />
      {/* bright tip */}
      <Vox
        position={[0, 1.94, 0]}
        size={[0.28, 0.34, 0.28]}
        color={CRYSTAL_GLOW}
        rotation={[0, Math.PI / 4, 0]}
        radius={0.04}
        roughness={0.1}
        emissive={CRYSTAL_GLOW}
        emissiveIntensity={0.9}
        castShadow={false}
      />
      {/* inner halo light */}
      <pointLight position={[0, 1.1, 0]} color={CRYSTAL_GLOW} intensity={2.4} distance={5.5} decay={2} />
    </group>
  )
}

/** CUBE topiary — a crisp boxy hedge tree on a short trunk. */
function CubeTopiary({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Vox position={[0, 0.3, 0]} size={[0.22, 0.6, 0.22]} color={PALETTE.barkDark} radius={0.05} />
      <Vox position={[0, 1.15, 0]} size={[1.0, 1.0, 1.0]} color={HEDGE} radius={0.1} />
      {/* corner shading + a clipped-edge highlight to sell the cube */}
      <Vox position={[0.32, 1.5, 0.32]} size={[0.34, 0.34, 0.34]} color={PALETTE.foliageLight} radius={0.06} castShadow={false} />
      <Vox position={[-0.3, 0.86, -0.3]} size={[0.3, 0.3, 0.3]} color={PALETTE.foliageDark} radius={0.06} castShadow={false} />
    </group>
  )
}

/** CONE topiary — a tapering stack of squares = a tidy green cone. */
function ConeTopiary({ position }: { position: Vec3 }) {
  const layers = [
    { y: 0.7, s: 1.1 },
    { y: 1.25, s: 0.86 },
    { y: 1.72, s: 0.62 },
    { y: 2.1, s: 0.38 },
    { y: 2.38, s: 0.18 },
  ]
  return (
    <group position={position}>
      <Vox position={[0, 0.22, 0]} size={[0.2, 0.44, 0.2]} color={PALETTE.barkDark} radius={0.05} />
      {layers.map((l, i) => (
        <Vox
          key={i}
          position={[0, l.y, 0]}
          size={[l.s, 0.4, l.s]}
          color={i % 2 ? PALETTE.foliageDark : HEDGE}
          radius={0.1}
        />
      ))}
    </group>
  )
}

/** SPHERE topiary — concentric beveled cubes rounded hard to read as a ball. */
function SphereTopiary({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Vox position={[0, 0.28, 0]} size={[0.22, 0.56, 0.22]} color={PALETTE.barkDark} radius={0.05} />
      {/* heavy radius => the cube reads as a sphere */}
      <Vox position={[0, 1.2, 0]} size={[1.15, 1.15, 1.15]} color={HEDGE} radius={0.55} />
      <Vox position={[0.3, 1.5, 0.28]} size={[0.42, 0.42, 0.42]} color={PALETTE.foliageLight} radius={0.21} castShadow={false} />
      <Vox position={[-0.28, 0.95, -0.26]} size={[0.36, 0.36, 0.36]} color={PALETTE.foliageDark} radius={0.18} castShadow={false} />
    </group>
  )
}

/** A clean cut-stone standing post for the shape sculptures. */
function ShapeStone({ position, h = 0.7 }: { position: Vec3; h?: number }) {
  return (
    <group position={position}>
      <Vox position={[0, h / 2, 0]} size={[0.4, h, 0.4]} color={PALETTE.rock} radius={0.06} roughness={0.9} />
      <Vox position={[0, h + 0.06, 0]} size={[0.34, 0.12, 0.34]} color={CRYSTAL_DEEP} radius={0.05} emissive={CRYSTAL_DEEP} emissiveIntensity={0.25} castShadow={false} />
    </group>
  )
}

/**
 * A flat shape outline drawn on the ground from short stone segments — used for
 * the TRIANGLE and HEXAGON "blueprints" etched into the grove floor.
 */
function GroundPolygon({ center, radius, sides, rot = 0, color = PALETTE.rockDark }: {
  center: Vec3
  radius: number
  sides: number
  rot?: number
  color?: string
}) {
  const segs = useMemo(() => {
    const out: { p: Vec3; len: number; ry: number }[] = []
    for (let i = 0; i < sides; i++) {
      const a0 = rot + (i / sides) * Math.PI * 2
      const a1 = rot + ((i + 1) / sides) * Math.PI * 2
      const x0 = Math.cos(a0) * radius
      const z0 = Math.sin(a0) * radius
      const x1 = Math.cos(a1) * radius
      const z1 = Math.sin(a1) * radius
      const mx = (x0 + x1) / 2
      const mz = (z0 + z1) / 2
      const len = Math.hypot(x1 - x0, z1 - z0)
      const ry = Math.atan2(z1 - z0, x1 - x0)
      out.push({ p: [center[0] + mx, center[1], center[2] + mz], len, ry })
    }
    return out
  }, [center, radius, sides, rot])
  return (
    <group>
      {segs.map((s, i) => (
        <Vox
          key={i}
          position={[s.p[0], 0.06, s.p[2]]}
          size={[s.len, 0.1, 0.16]}
          rotation={[0, -s.ry, 0]}
          color={color}
          radius={0.04}
          roughness={0.9}
          castShadow={false}
        />
      ))}
    </group>
  )
}

export default function GeometryGrove({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('geometry-grove')!
  const npc = a.npc!
  const npcX = a.worldPos[0] + npc.offset[0] // -17
  const npcZ = a.worldPos[1] + npc.offset[1] // -15.3

  return (
    <group>
      <group position={[a.worldPos[0], 0, a.worldPos[1]]}>
        {/* ── Manicured tile floor (instanced, one draw call) ───────────── */}
        <Scatter
          items={TILE_ITEMS}
          color={PALETTE.grassDark}
          jitterAmount={0.05}
          size={[0.55, 0.04, 0.55]}
          radius={0.02}
          roughness={0.8}
          castShadow={false}
        />

        {/* ── CENTRAL LANDMARK: stepped plinth + floating crystal ───────── */}
        {/* Stepped stone plinth (sits within the r=2.5 collider; ~1u tall so
            it reads as the base the avatar circles, not a wall). */}
        <Vox position={[0, 0.1, 0]} size={[2.0, 0.2, 2.0]} color={PALETTE.rock} radius={0.08} roughness={0.9} receiveShadow />
        <Vox position={[0, 0.3, 0]} size={[1.5, 0.22, 1.5]} color={PALETTE.rockDark} radius={0.07} receiveShadow />
        <Vox position={[0, 0.5, 0]} size={[1.05, 0.2, 1.05]} color={PALETTE.rock} radius={0.06} receiveShadow />
        {/* glowing rune ring on the top step */}
        <Vox position={[0, 0.62, 0]} size={[0.9, 0.06, 0.9]} color={CRYSTAL_DEEP} radius={0.04} emissive={CRYSTAL_DEEP} emissiveIntensity={0.4} castShadow={false} />

        {/* the crystal — slow bob + slow spin, hovering above the plinth */}
        <Float speed={1.6} rotationIntensity={0.5} floatIntensity={0.7} floatingRange={[0, 0.22]}>
          <group position={[0, 1.15, 0]}>
            <Crystal />
          </group>
        </Float>

        {/* crystal sparkles — icy teal motes drifting around the gem */}
        <Sparkles count={22} scale={[2.2, 2.4, 2.2]} position={[0, 2.1, 0]} size={3.5} speed={0.35} opacity={0.7} color={CRYSTAL_GLOW} />

        {/* ── GEOMETRIC TOPIARY — cube, cone, sphere (back & side arcs) ─── */}
        {/* placed on the far/side arcs so they don't block the NPC approach
            (which opens toward local +x,+z). */}
        <CubeTopiary position={[-3.0, 0, -2.4]} />
        <ConeTopiary position={[0.2, 0, -3.4]} />
        <SphereTopiary position={[3.0, 0, -2.4]} />
        {/* a second matched pair on the west flank for balance */}
        <ConeTopiary position={[-3.6, 0, 0.4]} />
        <CubeTopiary position={[-2.7, 0, 2.6]} />

        {/* ── SHAPE SCULPTURES ──────────────────────────────────────────── */}
        {/* TRIANGLE of standing stones (west-back), with its outline etched. */}
        <group position={[-2.4, 0, -1.0]}>
          <ShapeStone position={[0, 0, -0.95]} h={0.8} />
          <ShapeStone position={[-0.82, 0, 0.48]} h={0.66} />
          <ShapeStone position={[0.82, 0, 0.48]} h={0.66} />
          <GroundPolygon center={[0, 0, 0]} radius={0.95} sides={3} rot={-Math.PI / 2} color={CRYSTAL_DEEP} />
        </group>

        {/* HEXAGON stone ring (east-back) — six tidy stones + etched outline. */}
        <group position={[2.6, 0, -0.6]}>
          {Array.from({ length: 6 }).map((_, i) => {
            const ang = (i / 6) * Math.PI * 2
            return (
              <ShapeStone
                key={i}
                position={[Math.cos(ang) * 1.0, 0, Math.sin(ang) * 1.0]}
                h={0.5 + (i % 2) * 0.14}
              />
            )
          })}
          <GroundPolygon center={[0, 0, 0]} radius={1.0} sides={6} color={PALETTE.rockDark} />
        </group>

        {/* ── NEAT HEDGE ROWS — frame the grove, leave the +x/+z corridor open */}
        {/* back hedge wall (north, behind the crystal) */}
        {[-1.6, -0.55, 0.55, 1.6].map((x, i) => (
          <Bush key={`hbN${i}`} position={[x, 0, -3.9]} seed={120 + i} />
        ))}
        {/* west hedge run */}
        {[-2.4, -1.3, -0.2].map((z, i) => (
          <Bush key={`hbW${i}`} position={[-4.0, 0, z]} seed={140 + i} />
        ))}
        {/* short east hedge (stops before the corridor) */}
        {[-3.4, -2.4].map((z, i) => (
          <Bush key={`hbE${i}`} position={[4.0, 0, z]} seed={160 + i} />
        ))}
        {/* low corner hedges flanking the entry, set wide so the path stays clear */}
        <Bush position={[-3.4, 0, 3.4]} seed={181} />
        <Bush position={[3.4, 0, 3.4]} seed={182} />
      </group>

      {/* ── GATEWAY DRESSING (world space, around the NPC) ──────────────── */}
      {/* Signpost a step out from the NPC, angled to be read on approach. */}
      <Signpost position={[npcX + 1.0, 0, npcZ + 1.0]} facing={-Math.PI * 0.7} />

      {/* Warm lanterns flanking the NPC for an inviting glow. */}
      <Lantern position={[npcX - 1.1, 0, npcZ + 0.3]} height={1.45} />
      <Lantern position={[npcX + 1.2, 0, npcZ + 0.1]} height={1.35} />

      {/* A small teal-trimmed stage under the NPC so the gateway reads framed. */}
      <group position={[npcX, 0, npcZ]}>
        <Vox position={[0, 0.05, 0]} size={[1.5, 0.1, 1.5]} color={PALETTE.rock} radius={0.06} receiveShadow />
        <Vox position={[0, 0.13, 0]} size={[1.15, 0.08, 1.15]} color={PALETTE.rockDark} radius={0.05} receiveShadow />
        {/* glowing teal trim rune under the NPC's feet */}
        <Vox position={[0, 0.19, 0]} size={[0.85, 0.04, 0.85]} color={CRYSTAL_DEEP} radius={0.03} emissive={CRYSTAL_DEEP} emissiveIntensity={0.35} castShadow={false} />
      </group>

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
