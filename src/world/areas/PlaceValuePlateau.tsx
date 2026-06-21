/**
 * Place Value Plateau — a tall STACKED-TIER mountain that literally reads as
 * place value: a wide base tier (ones), a narrower middle tier (tens), and a
 * small top tier (hundreds), each a chunky beveled stone slab. A snow cap and a
 * little flag crown the summit. Pines, boulders and rocks ring the base.
 *
 * Center: world (-8, -26).  The whole mountain is authored in a local group
 * anchored at center, so every tier stacks on the local origin (0,0) — sitting
 * squarely on the existing r=2.5 central collider, so the avatar walks AROUND
 * it. NPC waits to the south-east (offset [1.2, 3.8] → world ~(-6.8,-22.2));
 * the approach toward it (positive-z, toward the house) is kept clear of tall
 * blockers, with a warm lantern + signpost framing the gateway.
 */

import type { RefObject } from 'react'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { Sparkles } from '@react-three/drei'
import Npc from '../Npc'
import { areaById } from '../worldLayout'
import { Vox, Scatter } from '../voxel/Vox'
import { PALETTE } from '../voxel/palette'
import { VoxTree, Rock, Boulder, Lantern, Signpost } from '../voxel/props'
import { field, rng } from '../voxel/fields'

type Vec3 = [number, number, number]

// ── Place-value tiers (local space, stacked on origin) ───────────────────────
// Each tier is a slab of stone. Widest at the bottom (ones), narrowing as it
// climbs (tens, hundreds). Tops carry a thin "ledge" lip + scattered snow.
const TIERS = [
  { y: 0.0, w: 4.4, d: 4.0, h: 1.5, label: 'ones' },
  { y: 1.5, w: 3.0, d: 2.7, h: 1.4, label: 'tens' },
  { y: 2.9, w: 1.8, d: 1.7, h: 1.3, label: 'hundreds' },
] as const

// Snow scatter on the summit cap (instanced, deterministic).
const SNOW = field([0, -0.1], 0.7, 0.65, 22, 5512, {
  y: 0,
  minScale: 0.5,
  maxScale: 1.1,
})

// Loose scree / pebble scatter ringing the mountain foot.
const SCREE = field([0, 0.2], 3.4, 3.0, 40, 7711, {
  y: 0,
  minScale: 0.4,
  maxScale: 1.0,
})

export default function PlaceValuePlateau({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('place-value-plateau')!
  const npc = a.npc!
  const npcX = a.worldPos[0] + npc.offset[0] // -6.8
  const npcZ = a.worldPos[1] + npc.offset[1] // -22.2

  const flag = useRef<Group>(null)

  // Chunky stone blocks cladding each tier's face, for a rocky (not box-flat)
  // silhouette. Deterministic so the mountain is stable across renders.
  const cladding = useMemo(() => {
    const r = rng(9931)
    const out: { p: Vec3; s: Vec3; dark: boolean }[] = []
    for (const t of TIERS) {
      const cy = t.y + t.h / 2
      // a few boulders bulging from each side face
      const faces: Vec3[] = [
        [t.w / 2, cy, 0],
        [-t.w / 2, cy, 0],
        [0, cy, t.d / 2],
        [0, cy, -t.d / 2],
      ]
      for (const f of faces) {
        const n = 1 + Math.floor(r() * 2)
        for (let i = 0; i < n; i++) {
          const s = 0.5 + r() * 0.5
          out.push({
            p: [
              f[0] * (0.85 + r() * 0.15) + (f[0] === 0 ? (r() - 0.5) * t.w * 0.6 : 0),
              cy + (r() - 0.5) * t.h * 0.5,
              f[2] * (0.85 + r() * 0.15) + (f[2] === 0 ? (r() - 0.5) * t.d * 0.6 : 0),
            ],
            s: [s, s * (0.8 + r() * 0.4), s],
            dark: r() > 0.5,
          })
        }
      }
    }
    return out
  }, [])

  useFrame(({ clock }) => {
    // Gentle flutter of the summit flag.
    if (flag.current) {
      const t = clock.elapsedTime
      flag.current.rotation.y = Math.sin(t * 2.2) * 0.18
      flag.current.position.x = Math.sin(t * 3.1) * 0.02
    }
  })

  const summitY = TIERS[TIERS.length - 1].y + TIERS[TIERS.length - 1].h // 4.2

  return (
    <group>
      <group position={[a.worldPos[0], 0, a.worldPos[1]]}>
        {/* ── STACKED PLACE-VALUE TIERS (ones / tens / hundreds) ─────────── */}
        {TIERS.map((t, i) => {
          const cy = t.y + t.h / 2
          return (
            <group key={i}>
              {/* main stone slab */}
              <Vox
                position={[0, cy, 0]}
                size={[t.w, t.h, t.d]}
                color={i % 2 === 0 ? PALETTE.rock : PALETTE.rockDark}
                radius={0.3}
                roughness={0.96}
                receiveShadow
              />
              {/* darker stratum band near the slab's base, for layered rock */}
              <Vox
                position={[0, t.y + 0.18, 0]}
                size={[t.w * 1.02, 0.3, t.d * 1.02]}
                color={PALETTE.rockDark}
                radius={0.16}
                roughness={0.98}
                castShadow={false}
              />
              {/* snowy ledge lip on the step where the next tier sits back */}
              <Vox
                position={[0, t.y + t.h + 0.04, 0]}
                size={[t.w * 0.98, 0.16, t.d * 0.98]}
                color={PALETTE.foam}
                radius={0.1}
                roughness={1}
                castShadow={false}
              />
            </group>
          )
        })}

        {/* rocky cladding bulging from the tier faces */}
        {cladding.map((c, i) => (
          <Vox
            key={`clad${i}`}
            position={c.p}
            size={c.s}
            color={c.dark ? PALETTE.rockDark : PALETTE.rock}
            radius={0.16}
            roughness={0.97}
          />
        ))}

        {/* ── SNOW CAP on the summit ──────────────────────────────────────── */}
        <group position={[0, summitY, 0]}>
          {/* solid white cap block */}
          <Vox
            position={[0, 0.22, 0]}
            size={[1.5, 0.44, 1.4]}
            color={PALETTE.foam}
            radius={0.22}
            roughness={1}
            metalness={0.02}
          />
          {/* a couple of softer drifts for an organic snow silhouette */}
          <Vox
            position={[0.45, 0.34, 0.2]}
            size={[0.7, 0.34, 0.6]}
            color={PALETTE.cloud}
            radius={0.22}
            roughness={1}
            castShadow={false}
          />
          <Vox
            position={[-0.4, 0.3, -0.25]}
            size={[0.6, 0.3, 0.55]}
            color={PALETTE.cloud}
            radius={0.2}
            roughness={1}
            castShadow={false}
          />
          {/* sparkly twinkle of fresh snow */}
          <Scatter
            items={SNOW}
            color={PALETTE.foam}
            jitterAmount={0.04}
            size={[0.16, 0.12, 0.16]}
            radius={0.05}
            roughness={1}
            castShadow={false}
          />
        </group>

        {/* ── FLAG on top ─────────────────────────────────────────────────── */}
        <group position={[0, summitY + 0.4, 0]}>
          {/* pole */}
          <Vox position={[0, 0.7, 0]} size={[0.1, 1.4, 0.1]} color={PALETTE.barkDark} radius={0.04} />
          {/* fluttering pennant */}
          <group ref={flag} position={[0, 1.2, 0]}>
            <Vox
              position={[0.42, 0, 0]}
              size={[0.8, 0.46, 0.06]}
              color={PALETTE.flowerRed}
              radius={0.04}
              roughness={0.7}
              castShadow={false}
            />
            <Vox
              position={[0.42, 0, 0.04]}
              size={[0.5, 0.28, 0.04]}
              color={PALETTE.flowerYellow}
              radius={0.03}
              roughness={0.7}
              castShadow={false}
            />
          </group>
          {/* gold finial */}
          <Vox
            position={[0, 1.46, 0]}
            size={0.16}
            color={PALETTE.flowerYellow}
            emissive={PALETTE.lantern}
            emissiveIntensity={0.5}
            radius={0.07}
            castShadow={false}
          />
        </group>

        {/* twinkle of mountain-air sparkle around the peak */}
        <Sparkles
          position={[0, summitY + 0.6, 0]}
          count={20}
          scale={[3, 2.4, 3]}
          size={3}
          speed={0.2}
          opacity={0.6}
          color={PALETTE.foam}
        />

        {/* loose scree pebbles around the foot (instanced, one draw call) */}
        <Scatter
          items={SCREE}
          color={PALETTE.pebble}
          jitterAmount={0.12}
          size={[0.22, 0.16, 0.22]}
          radius={0.06}
          roughness={0.95}
        />

        {/* ── PINES + BOULDERS ringing the base ────────────────────────────
            Placed on the NORTH / EAST / WEST arcs (negative-z and the sides),
            leaving the south arc (positive-z, toward the NPC/house) open as the
            walkable approach. */}
        {/* North arc (behind the mountain, away from the gateway) */}
        <VoxTree position={[-2.6, 0, -3.0]} variant="pine" seed={211} />
        <VoxTree position={[0.0, 0, -3.4]} variant="pine" seed={212} />
        <VoxTree position={[2.6, 0, -3.0]} variant="pine" seed={213} />
        <VoxTree position={[-3.4, 0, -1.6]} variant="pine" seed={214} />
        <VoxTree position={[3.4, 0, -1.6]} variant="pine" seed={215} />
        {/* West + East flanks */}
        <VoxTree position={[-3.7, 0, 0.4]} variant="pine" seed={216} />
        <VoxTree position={[3.7, 0, 0.4]} variant="pine" seed={217} />
        {/* a couple set further back for depth */}
        <VoxTree position={[-1.4, 0, -3.8]} variant="pine" seed={218} />
        <VoxTree position={[1.4, 0, -3.8]} variant="pine" seed={219} />

        {/* Boulders nestled at the base corners */}
        <Boulder position={[-3.2, 0, -2.4]} seed={301} />
        <Boulder position={[3.2, 0, -2.4]} seed={302} />

        {/* Rocks scattered round the foot (kept off the south approach) */}
        <Rock position={[-3.6, 0, -0.6]} seed={311} />
        <Rock position={[3.6, 0, -0.6]} seed={312} />
        <Rock position={[-2.8, 0, -3.0]} seed={313} />
        <Rock position={[2.8, 0, -3.0]} seed={314} />
        <Rock position={[0.4, 0, -3.0]} seed={315} />

        {/* A few low rocks easing the south corners (not blocking the path) */}
        <Rock position={[-3.4, 0, 1.4]} seed={321} />
        <Rock position={[3.4, 0, 1.4]} seed={322} />
      </group>

      {/* ── GATEWAY framing (world space, near the NPC) ──────────────────────
          A small snowy stone base under the NPC reads as a trail-marker cairn
          stage; a signpost + warm lantern make the gateway inviting. All low,
          so nothing blocks the walk up. */}
      <group position={[npcX, 0, npcZ]}>
        {/* low stone stage / cairn base under the NPC */}
        <Vox position={[0, 0.1, 0]} size={[1.5, 0.2, 1.5]} color={PALETTE.rockDark} radius={0.08} receiveShadow />
        <Vox position={[0, 0.26, 0]} size={[1.15, 0.16, 1.15]} color={PALETTE.rock} radius={0.08} receiveShadow />
        {/* dusting of snow on the stage rim */}
        <Vox position={[0, 0.36, 0]} size={[1.0, 0.08, 1.0]} color={PALETTE.foam} radius={0.05} roughness={1} castShadow={false} />
      </group>

      {/* Signpost just NE of the NPC, angled toward the approaching player */}
      <Signpost position={[npcX + 1.0, 0, npcZ + 0.7]} facing={-Math.PI * 0.2} />

      {/* Warm lantern beside the gateway for cozy glow against the cool stone */}
      <Lantern position={[npcX - 1.0, 0, npcZ + 0.3]} height={1.4} />

      {/* Firefly-warm sparkle hugging the gateway */}
      <Sparkles
        position={[npcX, 0.5, npcZ]}
        count={12}
        scale={[3, 1.6, 3]}
        size={3}
        speed={0.22}
        opacity={0.8}
        color={PALETTE.lantern}
      />

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
