/**
 * Data Delta — a fresh river-delta gateway crowned by a 3D BAR-GRAPH monument.
 *
 * Center: (24, -2) world xz.  NPC at (20, -1.7) world xz (offset [-4, 0.3]).
 * A central collider (r=2.5) sits at the area center, so the bar-chart monument
 * is authored on its raised stone base AT the local origin (0,0) — the avatar
 * walks around it. The NPC sits to the WEST (local x≈-4); that whole western
 * approach is kept flat and clear (only ground-hugging water strips, pebbles,
 * reeds and a low dock — nothing tall blocks the walk up to the gateway).
 *
 * Everything is authored in a local group anchored at the area center, so all
 * decor coordinates below are RELATIVE to (0,0).
 */

import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { Sparkles, Float } from '@react-three/drei'
import Npc from '../Npc'
import { areaById } from '../worldLayout'
import { Vox, Scatter } from '../voxel/Vox'
import { PALETTE } from '../voxel/palette'
import { Cattail, Signpost, Lantern, Rock, LilyPad } from '../voxel/props'
import { GroundPatch } from '../voxel/GroundPatch'
import { field, rng } from '../voxel/fields'

type Vec3 = [number, number, number]

// ── The bar chart: five upright columns of increasing height, each a distinct
// bright color, marching across the monument base. Tuned so the tallest bars
// sit toward the back (north, -z) and never crowd the gateway approach (west).
const BAR_COLORS = [
  PALETTE.flowerRed,
  '#f5a23d', // warm orange accent
  PALETTE.flowerYellow,
  PALETTE.foliageLight,
  PALETTE.water,
] as const

const BARS = [
  { x: -1.05, h: 1.0 },
  { x: -0.5, h: 1.7 },
  { x: 0.05, h: 2.4 },
  { x: 0.6, h: 3.1 },
  { x: 1.15, h: 3.8 },
] as const

const BAR_W = 0.46
const BAR_Z = -0.55 // bars sit slightly back, leaving the south face open

// Recessed water channels (delta strips). Thin dark-blue slabs just below y=0
// reading as carved water between sandy banks. Kept low (no collision concern).
const CHANNELS: { p: Vec3; s: Vec3 }[] = [
  { p: [-2.4, -0.04, 2.6], s: [3.4, 0.12, 0.7] }, // SW channel toward the dock
  { p: [-3.7, -0.04, 1.4], s: [0.7, 0.12, 2.6] }, // feeder running north–south
  { p: [2.8, -0.04, 2.4], s: [2.8, 0.12, 0.8] }, // SE channel
  { p: [3.9, -0.04, 0.6], s: [0.8, 0.12, 2.8] }, // east branch
  { p: [0.2, -0.04, 3.6], s: [4.6, 0.12, 0.7] }, // wide front delta mouth (south)
]

export default function DataDelta({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('data-delta')!
  const npc = a.npc!
  const npcX = a.worldPos[0] + npc.offset[0] // 20
  const npcZ = a.worldPos[1] + npc.offset[1] // -1.7

  const barsRef = useRef<Group>(null)

  // Sparse reed/grass dots along the channels (instanced).
  const reedDots = useMemo(
    () => field([0, 2.4], 4.4, 1.8, 30, 5137, { y: 0, minScale: 0.6, maxScale: 1.2 }),
    [],
  )

  // Reed clumps (cattails) hugging the channel edges, away from the walk path.
  const reeds = useMemo<{ p: Vec3; seed: number }[]>(() => {
    const r = rng(5188)
    const spots: Vec3[] = [
      [-3.9, 0, 2.4], [-3.4, 0, 0.4], [-2.6, 0, 3.1],
      [3.0, 0, 3.0], [3.9, 0, 1.6], [3.5, 0, -0.4],
      [0.0, 0, 4.0], [1.4, 0, 3.9], [-1.4, 0, 3.9],
    ]
    return spots.map((p) => ({ p, seed: Math.floor(r() * 9999) }))
  }, [])

  // Bob the bars ever so slightly + a glow shimmer to feel "data-y" and alive.
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (barsRef.current) {
      barsRef.current.children.forEach((c, i) => {
        c.position.y = (c.userData.baseY ?? 0) + Math.sin(t * 1.4 + i * 0.7) * 0.04
      })
    }
  })

  return (
    <group>
      <group position={[a.worldPos[0], 0, a.worldPos[1]]}>
        {/* ── MONUMENT BASE (the chart plinth, on the central collider) ──── */}
        {/* A two-tier sandy/stone dais. Lives within r=2.5 so the avatar walks
            around it; kept under ~0.5 tall on its rim so it reads as a plinth,
            not a wall. */}
        <Vox position={[0, 0.12, 0]} size={[4.6, 0.24, 3.6]} color={PALETTE.sand} radius={0.12} receiveShadow />
        <Vox position={[0, 0.3, -0.15]} size={[3.9, 0.3, 2.8]} color={PALETTE.sandWet} radius={0.12} receiveShadow />
        {/* axis "shelf" the bars stand on (a touch of stone for the chart base) */}
        <Vox position={[0, 0.48, BAR_Z]} size={[3.4, 0.16, 1.0]} color={PALETTE.rock} radius={0.08} />
        {/* engraved baseline/axis line in front of the bars */}
        <Vox
          position={[0, 0.57, BAR_Z + 0.52]}
          size={[3.3, 0.06, 0.08]}
          color={PALETTE.rockDark}
          radius={0.02}
          castShadow={false}
        />
        {/* upright y-axis tick post on the left of the chart */}
        <Vox position={[-1.55, 1.2, BAR_Z]} size={[0.1, 1.7, 0.1]} color={PALETTE.rockDark} radius={0.04} />
        {[0.7, 1.3, 1.9].map((y, i) => (
          <Vox
            key={`tick${i}`}
            position={[-1.42, 0.55 + y, BAR_Z]}
            size={[0.22, 0.05, 0.08]}
            color={PALETTE.rockDark}
            radius={0.02}
            castShadow={false}
          />
        ))}

        {/* ── THE BARS — colored columns of increasing height ─────────────── */}
        <group ref={barsRef}>
          {BARS.map((b, i) => {
            const baseY = 0.56 + b.h / 2
            return (
              <group key={i} position={[b.x, baseY, BAR_Z]} userData={{ baseY }}>
                <Vox
                  position={[0, 0, 0]}
                  size={[BAR_W, b.h, BAR_W]}
                  color={BAR_COLORS[i]}
                  radius={0.08}
                  roughness={0.55}
                />
                {/* bright cap so each bar's top "value" pops */}
                <Vox
                  position={[0, b.h / 2 + 0.04, 0]}
                  size={[BAR_W * 1.08, 0.12, BAR_W * 1.08]}
                  color={PALETTE.foam}
                  emissive={BAR_COLORS[i]}
                  emissiveIntensity={0.5}
                  radius={0.06}
                  roughness={0.4}
                  castShadow={false}
                />
                {/* subtle front-face highlight stripe (a little data sheen) */}
                <Vox
                  position={[0, 0, BAR_W / 2 + 0.01]}
                  size={[BAR_W * 0.3, b.h * 0.82, 0.03]}
                  color={PALETTE.foam}
                  transparent
                  opacity={0.28}
                  radius={0.01}
                  castShadow={false}
                  receiveShadow={false}
                />
              </group>
            )
          })}
        </group>

        {/* floating data-point sparkles drifting above the chart crest */}
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.6}>
          <Vox
            position={[1.15, 5.0, BAR_Z]}
            size={0.2}
            color={PALETTE.foam}
            emissive={PALETTE.water}
            emissiveIntensity={0.8}
            radius={0.09}
            castShadow={false}
          />
        </Float>
        <Sparkles
          count={20}
          scale={[3.2, 2.2, 1.6]}
          position={[0.1, 3.2, BAR_Z]}
          size={3}
          speed={0.4}
          opacity={0.7}
          color={PALETTE.water}
        />

        {/* ── WATER CHANNELS (recessed delta strips) ──────────────────────── */}
        {CHANNELS.map((c, i) => (
          <group key={`ch${i}`}>
            {/* sandy wet bank lip framing the cut */}
            <Vox
              position={[c.p[0], -0.01, c.p[2]]}
              size={[c.s[0] + 0.3, 0.08, c.s[2] + 0.3]}
              color={PALETTE.sandWet}
              radius={0.06}
              receiveShadow
            />
            {/* translucent water surface */}
            <Vox
              position={c.p}
              size={c.s}
              color={PALETTE.water}
              transparent
              opacity={0.78}
              roughness={0.18}
              metalness={0.15}
              radius={0.05}
              castShadow={false}
              receiveShadow={false}
            />
            {/* deeper channel core */}
            <Vox
              position={[c.p[0], c.p[1] - 0.03, c.p[2]]}
              size={[c.s[0] * 0.7, c.s[1] * 0.6, c.s[2] * 0.7]}
              color={PALETTE.waterDeep}
              transparent
              opacity={0.55}
              radius={0.04}
              castShadow={false}
              receiveShadow={false}
            />
          </group>
        ))}

        {/* lily pads drifting in the wider front channel */}
        <LilyPad position={[-0.8, 0.04, 3.6]} seed={61} />
        <LilyPad position={[1.0, 0.04, 3.5]} seed={62} />
        <LilyPad position={[3.6, 0.04, 1.2]} seed={63} />

        {/* ── DELTA SILT FLOOR — one cohesive soft-edged patch ───────────── */}
        {/* Replaces the scattered flat pebble tiles. A sandy silt blob spread
            across the banks, with a darker damp-silt zone toward the front
            channel mouth where the water meets the bank. */}
        <GroundPatch position={[0, 0, 1.6]} radius={2.4} color={PALETTE.sand} seed={5102} />
        <GroundPatch
          position={[0.2, 0, 3.0]}
          radius={1.7}
          color={PALETTE.sandWet}
          seed={5119}
          y={0.025}
        />

        {/* ── REED bed (upright instanced tufts) ──────────────────────────── */}
        <Scatter
          items={reedDots}
          color={PALETTE.foliage}
          jitterAmount={0.18}
          size={[0.07, 0.4, 0.07]}
          radius={0.02}
          roughness={0.9}
          castShadow={false}
        />

        {/* reed clumps along the banks */}
        {reeds.map((rd, i) => (
          <Cattail key={`reed${i}`} position={rd.p} seed={rd.seed} />
        ))}

        {/* a few wet bank rocks for texture (off the western walk path) */}
        <Rock position={[3.4, 0, 2.0]} seed={71} />
        <Rock position={[-3.4, 0, 3.0]} seed={72} />
        <Rock position={[2.2, 0, 3.4]} seed={73} />
      </group>

      {/* ── LITTLE DOCK + gateway dressing near the NPC (world space) ─────── */}
      {/* A low plank deck jutting toward the western channel, framing the
          gateway. Sits at y≈0.12 so it never blocks the flat walk. */}
      <group position={[npcX + 0.4, 0, npcZ + 1.7]}>
        {[-0.66, -0.22, 0.22, 0.66].map((x, i) => (
          <Vox
            key={i}
            position={[x, 0.12, 0]}
            size={[0.38, 0.12, 1.9]}
            color={i % 2 ? PALETTE.wood : PALETTE.woodDark}
            radius={0.04}
            roughness={0.8}
            receiveShadow
          />
        ))}
        <Vox position={[0, 0.12, -0.9]} size={[1.85, 0.13, 0.2]} color={PALETTE.woodDark} radius={0.04} />
        <Vox position={[0, 0.12, 0.9]} size={[1.85, 0.13, 0.2]} color={PALETTE.woodDark} radius={0.04} />
        {/* support posts reaching toward the water */}
        {([[-0.78, 0.8], [0.78, 0.8], [-0.78, -0.8], [0.78, -0.8]] as [number, number][]).map(
          (p, i) => (
            <Vox
              key={`post${i}`}
              position={[p[0], -0.05, p[1]]}
              size={[0.16, 0.45, 0.16]}
              color={PALETTE.barkDark}
              radius={0.04}
            />
          ),
        )}
      </group>

      {/* chart signpost — placed northeast of the NPC so it's read on approach,
          angled toward the monument. */}
      <ChartSign position={[npcX + 1.6, 0, npcZ - 1.4]} facing={Math.PI * 0.75} />

      {/* warm lanterns flanking the gateway */}
      <Lantern position={[npcX - 1.0, 0, npcZ + 0.4]} height={1.5} />
      <Lantern position={[npcX + 1.2, 0, npcZ + 0.5]} height={1.4} />

      {/* gentle mist/spray over the delta */}
      <Sparkles
        position={[24, 0.5, -0.4]}
        count={26}
        scale={[9, 2, 7]}
        size={4}
        speed={0.2}
        opacity={0.5}
        color={PALETTE.foam}
        noise={0.4}
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

/**
 * A signpost whose board carries a tiny rising-bar glyph, so it reads as a
 * "chart" marker. Built from the same beveled voxels as the toolkit Signpost.
 */
function ChartSign({ position = [0, 0, 0], facing = 0 }: { position?: Vec3; facing?: number }) {
  return (
    <group position={position} rotation={[0, facing, 0]}>
      {/* reuse the toolkit signpost shape for the post + board + base */}
      <Signpost position={[0, 0, 0]} facing={0} />
      {/* mini bar-chart glyph on the board face (board sits at x≈0.35, y≈0.85) */}
      {[
        { x: 0.16, h: 0.12, c: PALETTE.flowerRed },
        { x: 0.32, h: 0.2, c: PALETTE.flowerYellow },
        { x: 0.48, h: 0.28, c: PALETTE.water },
      ].map((b, i) => (
        <Vox
          key={i}
          position={[b.x, 0.78 + b.h / 2, 0.06]}
          size={[0.08, b.h, 0.04]}
          color={b.c}
          radius={0.02}
          castShadow={false}
        />
      ))}
    </group>
  )
}
