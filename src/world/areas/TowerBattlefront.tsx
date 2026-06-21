/**
 * Tower Battlefront — a playful-medieval voxel castle keep gateway.
 *
 * Center: world (10, -26) xz.  NPC at world (8.6, -22.3) — to the SOUTH
 * (positive z) of the keep, so the player approaches from the south and the
 * gate faces them.
 *
 * Everything is authored in a local group anchored at the area center, so all
 * landmark coordinates are RELATIVE to (0,0).  The central r=2.5 collider holds
 * the stone KEEP (the avatar walks around it).  The southern approach toward the
 * NPC (local z ≳ +2) is kept clear of tall blockers — only a low banner-lined
 * "victory walk", a couple of shields and warm torches frame the gateway.
 */

import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { Sparkles, Float } from '@react-three/drei'
import Npc from '../Npc'
import { areaById } from '../worldLayout'
import { Vox, Scatter } from '../voxel/Vox'
import { PALETTE } from '../voxel/palette'
import { Lantern, Rock, Boulder, Crate } from '../voxel/props'
import { field } from '../voxel/fields'

type Vec3 = [number, number, number]

// Monster / battlefront accent hues (small raw-hex accents; rest from PALETTE).
const STONE = PALETTE.rock
const STONE_DARK = PALETTE.rockDark
const PURPLE = '#7b4fc4' // banner / monster purple
const PURPLE_DARK = '#5b349e'
const PURPLE_LIGHT = '#9d72e0'
const GOLD = '#f2c64b' // finial / shield trim (== flowerYellow)
const IRON = '#4a4f59' // dark iron door / shield field

// Rubble/pebble scatter on the trampled battlefront ground (instanced, 1 draw).
const RUBBLE = field([0, 0], 6.5, 6.5, 46, 9241, {
  y: 0.05,
  minScale: 0.4,
  maxScale: 1.0,
})

/** A crenellated stone tower: stacked block shaft + battlement merlons + flag. */
function Tower({
  position,
  height,
  radius = 0.95,
  flag = true,
}: {
  position: Vec3
  height: number
  radius?: number
  flag?: boolean
  seed?: number
}) {
  const w = radius * 2
  // Number of stacked stone courses for subtle banding.
  const courses = Math.max(3, Math.round(height / 0.9))
  const courseH = height / courses
  return (
    <group position={position}>
      {/* stacked shaft (alternating stone tones reads as masonry courses) */}
      {Array.from({ length: courses }).map((_, i) => (
        <Vox
          key={i}
          position={[0, courseH * (i + 0.5), 0]}
          size={[w, courseH * 1.02, w]}
          color={i % 2 === 0 ? STONE : STONE_DARK}
          radius={0.12}
          roughness={0.95}
        />
      ))}
      {/* a couple of arrow-slit windows */}
      <Vox
        position={[0, height * 0.55, w / 2 - 0.02]}
        size={[0.16, 0.42, 0.12]}
        color={IRON}
        radius={0.03}
        castShadow={false}
      />
      {/* battlement ring: a base lip + four corner merlons */}
      <Vox
        position={[0, height + 0.12, 0]}
        size={[w + 0.22, 0.24, w + 0.22]}
        color={STONE}
        radius={0.08}
        roughness={0.95}
      />
      {([
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ] as [number, number][]).map(([sx, sz], i) => (
        <Vox
          key={i}
          position={[(sx * (w + 0.06)) / 2, height + 0.42, (sz * (w + 0.06)) / 2]}
          size={[0.34, 0.4, 0.34]}
          color={STONE_DARK}
          radius={0.06}
          roughness={0.95}
        />
      ))}
      {/* flag pole + wobbling purple pennant */}
      {flag && (
        <group position={[0, height + 0.5, 0]}>
          <Vox position={[0, 0.7, 0]} size={[0.1, 1.4, 0.1]} color={PALETTE.barkDark} radius={0.04} />
          {/* gold finial */}
          <Vox
            position={[0, 1.5, 0]}
            size={0.18}
            color={GOLD}
            emissive={GOLD}
            emissiveIntensity={0.4}
            radius={0.08}
            castShadow={false}
          />
          <Float speed={3} rotationIntensity={0} floatIntensity={0.5} floatingRange={[0, 0.08]}>
            <group position={[0.5, 1.0, 0]} rotation={[0, 0, -0.06]}>
              <Vox position={[0, 0, 0]} size={[0.8, 0.5, 0.05]} color={PURPLE} radius={0.03} castShadow={false} />
              <Vox
                position={[0, 0, 0.03]}
                size={[0.34, 0.34, 0.04]}
                color={PURPLE_LIGHT}
                radius={0.14}
                castShadow={false}
              />
            </group>
          </Float>
        </group>
      )}
    </group>
  )
}

/** A heraldic shield leaned against / mounted on a surface. */
function Shield({
  position,
  rotation = [0, 0, 0],
  seed = 1,
}: {
  position: Vec3
  rotation?: Vec3
  seed?: number
}) {
  const alt = seed % 2 === 0
  return (
    <group position={position} rotation={rotation}>
      {/* iron field */}
      <Vox position={[0, 0, 0]} size={[0.52, 0.66, 0.1]} color={IRON} radius={0.1} roughness={0.6} metalness={0.3} />
      {/* purple chevron / boss */}
      <Vox
        position={[0, 0.05, 0.06]}
        size={[0.34, 0.36, 0.05]}
        color={alt ? PURPLE : PURPLE_DARK}
        radius={0.08}
        castShadow={false}
      />
      {/* gold stud */}
      <Vox
        position={[0, 0.05, 0.1]}
        size={0.12}
        color={GOLD}
        emissive={GOLD}
        emissiveIntensity={0.3}
        radius={0.05}
        castShadow={false}
      />
      {/* pointed base */}
      <Vox position={[0, -0.42, 0]} size={[0.3, 0.22, 0.1]} color={IRON} radius={0.08} rotation={[0, 0, Math.PI * 0.25]} castShadow={false} />
    </group>
  )
}

/** A low purple banner on a short pole — lines the southern victory walk. */
function BannerPole({ position, seed = 1 }: { position: Vec3; seed?: number }) {
  const tone = seed % 2 === 0 ? PURPLE : PURPLE_DARK
  return (
    <group position={position}>
      <Vox position={[0, 0.85, 0]} size={[0.1, 1.7, 0.1]} color={PALETTE.barkDark} radius={0.04} />
      <Vox position={[0, 1.72, 0]} size={0.14} color={GOLD} emissive={GOLD} emissiveIntensity={0.3} radius={0.06} castShadow={false} />
      <Float speed={2.4} rotationIntensity={0} floatIntensity={0.4} floatingRange={[0, 0.06]}>
        <group position={[0, 1.0, 0]}>
          {/* long hanging banner */}
          <Vox position={[0, -0.15, 0]} size={[0.42, 0.9, 0.05]} color={tone} radius={0.03} castShadow={false} />
          {/* light emblem block */}
          <Vox position={[0, 0.05, 0.03]} size={[0.2, 0.2, 0.04]} color={PURPLE_LIGHT} radius={0.08} castShadow={false} />
          {/* swallow-tail notch (gap read via two skirt tabs) */}
          <Vox position={[-0.1, -0.66, 0]} size={[0.16, 0.2, 0.05]} color={tone} radius={0.03} castShadow={false} />
          <Vox position={[0.1, -0.66, 0]} size={[0.16, 0.2, 0.05]} color={tone} radius={0.03} castShadow={false} />
        </group>
      </Float>
    </group>
  )
}

export default function TowerBattlefront({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('tower-battlefront')!
  const npc = a.npc!
  // Local NPC position relative to the anchored group (offset is the local xz).
  const npcLX = npc.offset[0] // -1.4
  const npcLZ = npc.offset[1] // +3.7 (south)

  // Slow torch flicker on the gate torches.
  const torches = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!torches.current) return
    const t = clock.elapsedTime
    torches.current.children.forEach((c, i) => {
      const f = 0.85 + Math.sin(t * 9 + i * 2.1) * 0.1 + Math.sin(t * 23 + i) * 0.05
      c.scale.setScalar(f)
    })
  })

  return (
    <group>
      <group position={[a.worldPos[0], 0, a.worldPos[1]]}>
        {/* ── Trampled battlefront ground: rubble + pebble scatter ─────── */}
        <Scatter
          items={RUBBLE}
          color={PALETTE.pebble}
          jitterAmount={0.12}
          size={[0.3, 0.2, 0.3]}
          radius={0.06}
          roughness={0.95}
        />

        {/* ── CENTRAL KEEP (on the r=2.5 collider — avatar walks around) ─ */}
        {/* Raised stone plinth / motte so the keep reads as elevated. */}
        <Vox position={[0, 0.2, 0]} size={[5.2, 0.4, 5.2]} color={STONE_DARK} radius={0.14} roughness={0.95} receiveShadow />
        <Vox position={[0, 0.42, 0]} size={[4.4, 0.3, 4.4]} color={STONE} radius={0.12} roughness={0.95} receiveShadow />

        {/* Main keep body (square, stacked masonry). */}
        <Vox position={[0, 1.7, 0]} size={[3.0, 2.4, 3.0]} color={STONE} radius={0.14} roughness={0.95} />
        <Vox position={[0, 1.0, 0]} size={[3.2, 1.0, 3.2]} color={STONE_DARK} radius={0.14} roughness={0.95} />
        {/* upper band + roof block */}
        <Vox position={[0, 3.05, 0]} size={[3.3, 0.3, 3.3]} color={STONE_DARK} radius={0.1} roughness={0.95} />

        {/* keep-top crenellations (merlons along each edge of the roof) */}
        {Array.from({ length: 4 }).map((_, edge) => {
          const along = [-1.05, 0, 1.05]
          return along.map((p, j) => {
            const onX = edge < 2
            const sign = edge % 2 === 0 ? 1 : -1
            const x = onX ? p : sign * 1.55
            const z = onX ? sign * 1.55 : p
            return (
              <Vox
                key={`m${edge}-${j}`}
                position={[x, 3.45, z]}
                size={[0.42, 0.46, 0.42]}
                color={j % 2 === 0 ? STONE : STONE_DARK}
                radius={0.07}
                roughness={0.95}
              />
            )
          })
        })}

        {/* arrow-slit windows on the keep (glowing purple, monster-lair vibe) */}
        {([
          [-0.7, 2.0, 1.51],
          [0.7, 2.0, 1.51],
          [0, 2.4, 1.51],
        ] as Vec3[]).map((p, i) => (
          <Vox
            key={`w${i}`}
            position={p}
            size={[0.2, 0.5, 0.1]}
            color={PURPLE_LIGHT}
            emissive={PURPLE}
            emissiveIntensity={0.7}
            radius={0.03}
            castShadow={false}
          />
        ))}

        {/* ── GATE (faces south, toward the NPC / approach) ───────────── */}
        {/* archway frame */}
        <Vox position={[0, 1.0, 1.55]} size={[1.5, 2.0, 0.3]} color={STONE_DARK} radius={0.1} roughness={0.95} />
        {/* dark iron door, slightly recessed */}
        <Vox position={[0, 0.9, 1.66]} size={[1.0, 1.6, 0.12]} color={IRON} radius={0.06} roughness={0.5} metalness={0.3} />
        {/* door planks / bands */}
        <Vox position={[0, 1.45, 1.73]} size={[1.05, 0.12, 0.05]} color={STONE_DARK} radius={0.03} castShadow={false} />
        <Vox position={[0, 0.55, 1.73]} size={[1.05, 0.12, 0.05]} color={STONE_DARK} radius={0.03} castShadow={false} />
        {/* gold ring handle */}
        <Vox position={[0.18, 0.95, 1.74]} size={0.12} color={GOLD} emissive={GOLD} emissiveIntensity={0.4} radius={0.05} castShadow={false} />
        {/* a big purple banner draped above the gate */}
        <Float speed={2} rotationIntensity={0} floatIntensity={0.3} floatingRange={[0, 0.05]}>
          <group position={[0, 1.7, 1.74]}>
            <Vox position={[0, 0, 0]} size={[0.9, 1.2, 0.05]} color={PURPLE} radius={0.03} castShadow={false} />
            <Vox position={[0, 0.1, 0.03]} size={[0.4, 0.4, 0.04]} color={GOLD} emissive={GOLD} emissiveIntensity={0.25} radius={0.16} castShadow={false} />
          </group>
        </Float>

        {/* ── CORNER TOWERS framing the keep (kept off the south approach) ─ */}
        {/* Two tall back towers (north) + two shorter front towers flanking gate. */}
        <Tower position={[-1.95, 0.4, -1.95]} height={4.0} radius={0.85} seed={1} />
        <Tower position={[1.95, 0.4, -1.95]} height={4.4} radius={0.9} seed={2} />
        {/* front flanking towers — set wide so the central gate approach stays open */}
        <Tower position={[-2.3, 0.4, 1.7]} height={3.2} radius={0.78} seed={3} />
        <Tower position={[2.3, 0.4, 1.7]} height={3.2} radius={0.78} seed={4} />

        {/* connecting curtain-wall stubs between front towers and keep */}
        <Vox position={[-1.5, 0.95, 1.7]} size={[1.4, 1.1, 0.5]} color={STONE} radius={0.1} roughness={0.95} />
        <Vox position={[1.5, 0.95, 1.7]} size={[1.4, 1.1, 0.5]} color={STONE} radius={0.1} roughness={0.95} />
        {/* wall-top crenellations */}
        {[-1.95, -1.05, 1.05, 1.95].map((x, i) => (
          <Vox key={`wc${i}`} position={[x, 1.6, 1.7]} size={[0.3, 0.32, 0.34]} color={STONE_DARK} radius={0.06} roughness={0.95} />
        ))}

        {/* ── Mounted shields on the front curtain walls ──────────────── */}
        <Shield position={[-1.5, 1.05, 2.0]} seed={1} />
        <Shield position={[1.5, 1.05, 2.0]} seed={2} />

        {/* ── SIEGE / battlefront dressing (away from the gate corridor) ─ */}
        {/* boulders flung from a catapult, off to the sides */}
        <Boulder position={[-4.6, 0, -1.0]} seed={51} />
        <Rock position={[4.6, 0, -0.4]} seed={52} />
        <Rock position={[-4.2, 0, 1.8]} seed={53} />
        <Rock position={[4.4, 0, 2.2]} seed={54} />
        {/* supply crates near a tower base */}
        <Crate position={[3.2, 0, -2.6]} seed={61} />
        <Crate position={[3.7, 0, -2.2]} seed={62} />
        <Crate position={[2.9, 0.6, -2.4]} seed={63} />

        {/* spare shields leaned against the supply crates */}
        <Shield position={[3.3, 0.5, -1.9]} rotation={[0.3, -0.4, 0]} seed={4} />

        {/* ── BANNER-LINED victory walk leading to the gateway (south) ── */}
        {/* Poles flank the corridor without blocking it (set ±1.6 off center). */}
        <BannerPole position={[-1.6, 0, 3.0]} seed={1} />
        <BannerPole position={[1.6, 0, 3.0]} seed={2} />
        <BannerPole position={[-1.7, 0, 4.6]} seed={3} />
        <BannerPole position={[1.7, 0, 4.6]} seed={4} />

        {/* ── NPC stage: a low stone dais + warm torches frame the gateway ─ */}
        <group position={[npcLX, 0, npcLZ]}>
          {/* round-ish stone base the NPC stands on */}
          <Vox position={[0, 0.08, 0]} size={[1.7, 0.16, 1.7]} color={STONE_DARK} radius={0.12} roughness={0.95} receiveShadow />
          <Vox position={[0, 0.2, 0]} size={[1.3, 0.16, 1.3]} color={STONE} radius={0.1} roughness={0.95} receiveShadow />
          {/* purple rug accent on the dais */}
          <Vox position={[0, 0.29, 0]} size={[0.9, 0.05, 0.9]} color={PURPLE} radius={0.04} castShadow={false} />
        </group>

        {/* warm flickering wall torches either side of the gate (point-lit) */}
        <group ref={torches}>
          <group position={[-1.0, 1.6, 1.85]}>
            <Vox position={[0, 0, 0]} size={[0.34, 0.34, 0.34]} color={PALETTE.lantern} emissive={PALETTE.lantern} emissiveIntensity={1.6} radius={0.12} castShadow={false} />
            <pointLight color={PALETTE.lantern} intensity={2.4} distance={5} decay={2} />
          </group>
          <group position={[1.0, 1.6, 1.85]}>
            <Vox position={[0, 0, 0]} size={[0.34, 0.34, 0.34]} color={PALETTE.lantern} emissive={PALETTE.lantern} emissiveIntensity={1.6} radius={0.12} castShadow={false} />
            <pointLight color={PALETTE.lantern} intensity={2.4} distance={5} decay={2} />
          </group>
        </group>

        {/* lantern posts flanking the NPC dais for cozy warmth */}
        <Lantern position={[npcLX - 1.2, 0, npcLZ + 0.2]} height={1.5} />
        <Lantern position={[npcLX + 1.3, 0, npcLZ + 0.1]} height={1.4} />

        {/* ── Atmosphere: drifting purple monster-magic motes over the keep ─ */}
        <Sparkles
          position={[0, 3.0, 0]}
          count={26}
          scale={[6, 3.5, 6]}
          size={3.5}
          speed={0.3}
          opacity={0.6}
          color={PURPLE_LIGHT}
          noise={0.5}
        />
        {/* warm embers near the gate torches */}
        <Sparkles
          position={[0, 1.4, 1.9]}
          count={14}
          scale={[2.6, 1.6, 1.2]}
          size={2.5}
          speed={0.4}
          opacity={0.7}
          color={PALETTE.lantern}
          noise={0.7}
        />
      </group>

      <Npc
        areaId={a.id}
        zoneId={a.zoneId}
        label={a.label}
        position={[a.worldPos[0] + npc.offset[0], 0, a.worldPos[1] + npc.offset[1]]}
        posRef={posRef}
      />
    </group>
  )
}
