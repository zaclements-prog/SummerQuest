/**
 * Science Summit — a clean white/teal voxel observatory lab on a hilltop.
 *
 * Center: (20, -18) world xz.  NPC at (17, -15.3) world xz (offset -3,+2.7),
 * i.e. local (-3, +2.7) — to the SOUTH-WEST of the dome.
 *
 * Central landmark (on the r=2.5 collider): a small domed OBSERVATORY — a white
 * cylindrical base + a teal-banded white dome with an open slit and a stubby
 * telescope poking out. The avatar walks AROUND it. Everything tall is kept off
 * the collider center is the dome) and off the SW approach corridor toward the
 * NPC, so the player reads a clear, curious lab on arrival.
 *
 * Decor (all local to center): oversized glass beakers/flasks (translucent
 * colored Vox), potted plants, rocks, a science signpost, a flag on a pole, and
 * a warm lantern + a low stage framing the gateway NPC. Drifting Sparkles read
 * as "experiment" fizz / stardust.
 */

import type { RefObject } from 'react'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { Sparkles, Float } from '@react-three/drei'
import Npc from '../Npc'
import { areaById } from '../worldLayout'
import { Vox, Scatter } from '../voxel/Vox'
import { PALETTE } from '../voxel/palette'
import { Rock, Signpost, Lantern, Bush } from '../voxel/props'
import { field } from '../voxel/fields'

type Vec3 = [number, number, number]

// Clean lab accent hexes (kept tiny + local; palette covers the rest).
const TEAL = '#4fc7c0'
const TEAL_DEEP = '#2f9e98'
const LAB_WHITE = '#f5f8fa'
const LAB_GREY = '#d6dee3'
const GLASS_GREEN = '#7fe0a6'
const GLASS_BLUE = '#7fc4ec'
const GLASS_PINK = '#e8a0d0'
const BRASS = '#caa75a'

// Faint pebble/gravel ring on the lab "plaza" floor (instanced, flat, walkable).
const GRAVEL = field([0, 0], 4.6, 4.6, 44, 9012, {
  y: 0.02,
  minScale: 0.5,
  maxScale: 1.1,
})

export default function ScienceSummit({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('science-summit')!
  const npc = a.npc!
  const npcX = a.worldPos[0] + npc.offset[0] // 17
  const npcZ = a.worldPos[1] + npc.offset[1] // -15.3

  const dome = useRef<Group>(null)
  const scope = useRef<Group>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // The observatory dome rotates very slowly (scanning the sky).
    if (dome.current) dome.current.rotation.y = t * 0.12
    // The telescope gently nods.
    if (scope.current) scope.current.rotation.x = -0.55 + Math.sin(t * 0.5) * 0.06
  })

  return (
    <group>
      <group position={[a.worldPos[0], 0, a.worldPos[1]]}>
        {/* ── PLAZA FLOOR — a clean tiled disc the lab sits on ──────────── */}
        {/* Low, flat, walkable: a pale tile pad + a teal ring border. */}
        <Vox
          position={[0, 0.04, 0]}
          size={[8.6, 0.12, 8.6]}
          color={LAB_WHITE}
          radius={0.18}
          roughness={0.7}
          receiveShadow
        />
        <Vox
          position={[0, 0.05, 0]}
          size={[7.2, 0.13, 7.2]}
          color={LAB_GREY}
          radius={0.16}
          roughness={0.7}
          receiveShadow
          castShadow={false}
        />
        {/* teal seam crosses to read as lab floor tiling */}
        <Vox position={[0, 0.07, 0]} size={[8.4, 0.04, 0.16]} color={TEAL} radius={0.02} castShadow={false} />
        <Vox position={[0, 0.07, 0]} size={[0.16, 0.04, 8.4]} color={TEAL} radius={0.02} castShadow={false} />
        {/* scattered gravel flecks */}
        <Scatter
          items={GRAVEL}
          color={PALETTE.pebble}
          jitterAmount={0.12}
          size={[0.16, 0.06, 0.16]}
          roughness={0.9}
          castShadow={false}
        />

        {/* ── CENTRAL OBSERVATORY (on the r=2.5 collider) ───────────────── */}
        {/* Stacked white drum base → teal trim → white dome (open slit) with a
            slow-turning cap and a telescope poking through. Footprint ~r1.7,
            comfortably inside the 2.5 collider so the avatar circles it. */}
        <group position={[0, 0, 0]}>
          {/* foundation step */}
          <Vox position={[0, 0.22, 0]} size={[3.4, 0.34, 3.4]} color={LAB_GREY} radius={0.16} receiveShadow />
          {/* main drum wall (white) */}
          <Vox position={[0, 1.15, 0]} size={[2.9, 1.6, 2.9]} color={LAB_WHITE} radius={0.5} receiveShadow />
          {/* teal band around the drum */}
          <Vox position={[0, 0.62, 0]} size={[3.0, 0.22, 3.0]} color={TEAL} radius={0.3} castShadow={false} />
          <Vox position={[0, 1.9, 0]} size={[3.02, 0.24, 3.02]} color={TEAL_DEEP} radius={0.32} castShadow={false} />
          {/* door (teal recess) facing SW toward the approach/NPC */}
          <Vox position={[-1.05, 0.78, 1.05]} rotation={[0, Math.PI * 0.25, 0]} size={[0.9, 1.1, 0.18]} color={TEAL_DEEP} radius={0.1} castShadow={false} />
          {/* two round porthole windows (glowing teal) */}
          <Vox position={[1.46, 1.15, 0.5]} size={[0.14, 0.5, 0.5]} color={TEAL} emissive={TEAL} emissiveIntensity={0.5} radius={0.2} castShadow={false} />
          <Vox position={[1.46, 1.15, -0.5]} size={[0.14, 0.5, 0.5]} color={TEAL} emissive={TEAL} emissiveIntensity={0.5} radius={0.2} castShadow={false} />

          {/* DOME — slow rotating cap with an open observation slit */}
          <group ref={dome} position={[0, 2.05, 0]}>
            <Vox position={[0, 0.45, 0]} size={[2.7, 1.0, 2.7]} color={LAB_WHITE} radius={0.9} receiveShadow />
            <Vox position={[0, 1.05, 0]} size={[1.7, 0.7, 1.7]} color={LAB_WHITE} radius={0.7} />
            {/* dark open slit (two jaws + a recessed gap) */}
            <Vox position={[0, 0.95, 0.78]} size={[0.5, 1.3, 0.5]} color={TEAL_DEEP} radius={0.18} castShadow={false} />
            <Vox position={[0.62, 0.95, 0.55]} size={[0.5, 1.2, 0.5]} color={LAB_GREY} radius={0.2} />
            <Vox position={[-0.62, 0.95, 0.55]} size={[0.5, 1.2, 0.5]} color={LAB_GREY} radius={0.2} />
            {/* finial */}
            <Vox position={[0, 1.5, 0]} size={[0.16, 0.4, 0.16]} color={BRASS} radius={0.05} castShadow={false} />
            <Vox position={[0, 1.78, 0]} size={0.18} color={PALETTE.lantern} emissive={PALETTE.lantern} emissiveIntensity={1.2} radius={0.08} castShadow={false} />

            {/* TELESCOPE poking out of the slit (nods via inner ref) */}
            <group position={[0, 0.95, 0.55]}>
              <group ref={scope} rotation={[-0.55, 0, 0]}>
                <Vox position={[0, 0, 0.55]} size={[0.34, 0.34, 1.4]} color={LAB_GREY} radius={0.14} castShadow={false} />
                <Vox position={[0, 0, 1.2]} size={[0.42, 0.42, 0.3]} color={BRASS} radius={0.14} castShadow={false} />
                <Vox position={[0, 0, -0.05]} size={[0.26, 0.26, 0.4]} color={TEAL_DEEP} radius={0.1} castShadow={false} />
              </group>
            </group>
          </group>
        </group>

        {/* ── OVERSIZED BEAKERS / FLASKS (translucent glass) ────────────── */}
        {/* Placed on the NE/E arc, off the SW approach. Each: a clear body with
            a colored "liquid" fill + a neck, plus a floating bubble or two. */}
        <GiantFlask position={[3.0, 0, -1.2]} liquid={GLASS_GREEN} bob />
        <GiantBeaker position={[2.6, 0, 1.6]} liquid={GLASS_BLUE} />
        <GiantFlask position={[1.1, 0, 3.0]} liquid={GLASS_PINK} bob />
        <GiantBeaker position={[-1.2, 0, 2.9]} liquid={GLASS_GREEN} />

        {/* fizz/stardust rising from the beaker cluster */}
        <Sparkles
          position={[2.4, 1.2, 0.8]}
          count={20}
          scale={[3.2, 2.2, 3.4]}
          size={3}
          speed={0.4}
          opacity={0.7}
          color={TEAL}
          noise={0.5}
        />

        {/* ── POTTED PLANTS (clean white pots, leafy tops) ──────────────── */}
        <PottedPlant position={[3.3, 0, 0.2]} />
        <PottedPlant position={[-2.9, 0, -1.6]} />
        <PottedPlant position={[0.4, 0, -3.2]} />

        {/* ── SAMPLE ROCKS (geology specimens) on the floor ─────────────── */}
        <Rock position={[-3.1, 0, 0.8]} seed={401} />
        <Rock position={[-2.6, 0, 2.0]} seed={402} />
        <Rock position={[3.4, 0, -2.4]} seed={403} />

        {/* ── FLAG on a tall pole (NE, well clear of walk + collider) ────── */}
        <group position={[3.6, 0, -3.4]}>
          <Vox position={[0, 1.5, 0]} size={[0.12, 3.0, 0.12]} color={LAB_GREY} radius={0.05} />
          <Vox position={[0, 0.12, 0]} size={[0.4, 0.18, 0.4]} color={PALETTE.rockDark} radius={0.06} />
          {/* teal pennant with a white "atom" dot */}
          <Float speed={3} rotationIntensity={0.15} floatIntensity={0.2}>
            <Vox position={[0.55, 2.7, 0]} size={[1.0, 0.62, 0.06]} color={TEAL} radius={0.04} castShadow={false} />
            <Vox position={[0.55, 2.7, 0.05]} size={0.18} color={LAB_WHITE} radius={0.08} castShadow={false} />
          </Float>
          <Vox position={[0, 3.05, 0]} size={0.16} color={BRASS} radius={0.07} castShadow={false} />
        </group>

        {/* ── GATEWAY FRAMING — stage + sign + lantern around the NPC ──── */}
        {/* NPC is local (-3, +2.7). Build a low clean stage under it, a science
            signpost a step ahead (toward center, read on approach), and a warm
            lantern beside it. All low so they never block the walk-up. */}
        <group position={[npc.offset[0], 0, npc.offset[1]]}>
          {/* low circular-ish stage base */}
          <Vox position={[0, 0.08, 0]} size={[2.0, 0.2, 2.0]} color={LAB_WHITE} radius={0.16} receiveShadow />
          <Vox position={[0, 0.14, 0]} size={[1.5, 0.18, 1.5]} color={TEAL} radius={0.14} castShadow={false} />
          <Vox position={[0, 0.2, 0]} size={[1.1, 0.16, 1.1]} color={LAB_GREY} radius={0.12} castShadow={false} />
        </group>

        {/* "Science Summit" signpost — between NPC and dome, faces the player */}
        <Signpost position={[npc.offset[0] + 0.9, 0, npc.offset[1] + 0.4]} facing={Math.PI * 1.15} />

        {/* warm lantern beside the gateway for cozy glow */}
        <Lantern position={[npc.offset[0] - 1.1, 0, npc.offset[1] + 0.2]} height={1.5} />

        {/* a couple of tidy specimen bushes flanking the entrance */}
        <Bush position={[npc.offset[0] + 1.6, 0, npc.offset[1] - 0.4]} seed={71} />
        <Bush position={[npc.offset[0] - 1.7, 0, npc.offset[1] - 0.8]} seed={72} />

        {/* ── AMBIENT STARDUST over the whole summit ────────────────────── */}
        <Sparkles
          position={[0, 2.4, 0]}
          count={34}
          scale={[9, 4, 9]}
          size={4}
          speed={0.18}
          opacity={0.5}
          color={PALETTE.foam}
          noise={0.4}
        />
      </group>

      {/* ── NPC — absolute world coords, unchanged contract ───────────── */}
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

/* ── Local props ──────────────────────────────────────────────────────────── */

/** Oversized Erlenmeyer flask: clear cone body + colored liquid + neck. */
function GiantFlask({
  position,
  liquid,
  bob = false,
}: {
  position: Vec3
  liquid: string
  bob?: boolean
}) {
  const inner = (
    <group>
      {/* wide base */}
      <Vox position={[0, 0.35, 0]} size={[1.0, 0.7, 1.0]} color={LAB_WHITE} transparent opacity={0.32} roughness={0.1} metalness={0.1} radius={0.3} castShadow={false} receiveShadow={false} />
      {/* liquid fill inside the base */}
      <Vox position={[0, 0.28, 0]} size={[0.78, 0.42, 0.78]} color={liquid} transparent opacity={0.78} roughness={0.2} radius={0.24} castShadow={false} receiveShadow={false} />
      {/* tapered shoulder */}
      <Vox position={[0, 0.85, 0]} size={[0.6, 0.5, 0.6]} color={LAB_WHITE} transparent opacity={0.3} roughness={0.1} radius={0.22} castShadow={false} receiveShadow={false} />
      {/* neck */}
      <Vox position={[0, 1.25, 0]} size={[0.3, 0.45, 0.3]} color={LAB_WHITE} transparent opacity={0.34} roughness={0.1} radius={0.1} castShadow={false} receiveShadow={false} />
      {/* lip ring */}
      <Vox position={[0, 1.48, 0]} size={[0.38, 0.1, 0.38]} color={LAB_GREY} radius={0.06} castShadow={false} />
    </group>
  )
  return (
    <group position={position}>
      {bob ? (
        <Float speed={2} rotationIntensity={0} floatIntensity={0.25}>
          {/* a bubble floating above the mouth */}
          <Vox position={[0, 1.75, 0]} size={0.18} color={liquid} transparent opacity={0.6} radius={0.08} castShadow={false} receiveShadow={false} />
        </Float>
      ) : null}
      {inner}
    </group>
  )
}

/** Oversized cylindrical beaker: clear straight body + liquid + spout lip. */
function GiantBeaker({
  position,
  liquid,
}: {
  position: Vec3
  liquid: string
}) {
  return (
    <group position={position}>
      {/* clear body */}
      <Vox position={[0, 0.65, 0]} size={[0.95, 1.3, 0.95]} color={LAB_WHITE} transparent opacity={0.3} roughness={0.1} metalness={0.1} radius={0.16} castShadow={false} receiveShadow={false} />
      {/* liquid */}
      <Vox position={[0, 0.5, 0]} size={[0.74, 0.8, 0.74]} color={liquid} transparent opacity={0.78} roughness={0.2} radius={0.12} castShadow={false} receiveShadow={false} />
      {/* measurement tick marks (teal) */}
      <Vox position={[0.49, 0.85, 0]} size={[0.04, 0.06, 0.3]} color={TEAL} radius={0.01} castShadow={false} />
      <Vox position={[0.49, 0.6, 0]} size={[0.04, 0.06, 0.3]} color={TEAL} radius={0.01} castShadow={false} />
      <Vox position={[0.49, 0.35, 0]} size={[0.04, 0.06, 0.3]} color={TEAL} radius={0.01} castShadow={false} />
      {/* rim + pour spout */}
      <Vox position={[0, 1.32, 0]} size={[1.0, 0.1, 1.0]} color={LAB_GREY} radius={0.06} castShadow={false} />
      <Vox position={[0.5, 1.34, 0]} size={[0.22, 0.08, 0.3]} color={LAB_GREY} radius={0.04} castShadow={false} />
      {/* fizz dot */}
      <Vox position={[0, 1.5, 0]} size={0.12} color={liquid} transparent opacity={0.55} radius={0.05} castShadow={false} receiveShadow={false} />
    </group>
  )
}

/** A clean white pot with a leafy specimen plant — tidy lab greenery. */
function PottedPlant({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      {/* pot */}
      <Vox position={[0, 0.22, 0]} size={[0.6, 0.44, 0.6]} color={LAB_WHITE} radius={0.1} receiveShadow />
      <Vox position={[0, 0.42, 0]} size={[0.66, 0.1, 0.66]} color={TEAL} radius={0.06} castShadow={false} />
      {/* soil */}
      <Vox position={[0, 0.46, 0]} size={[0.5, 0.06, 0.5]} color={PALETTE.dirtDark} radius={0.04} castShadow={false} />
      {/* leafy clump */}
      <Vox position={[0, 0.78, 0]} size={[0.62, 0.55, 0.62]} color={PALETTE.foliage} radius={0.26} />
      <Vox position={[0.22, 0.98, 0.08]} size={[0.34, 0.34, 0.34]} color={PALETTE.foliageLight} radius={0.16} />
      <Vox position={[-0.2, 0.9, -0.1]} size={[0.3, 0.3, 0.3]} color={PALETTE.foliageDark} radius={0.14} />
      {/* a tiny bloom */}
      <Vox position={[0.1, 1.2, 0.05]} size={0.14} color={PALETTE.flowerYellow} radius={0.06} castShadow={false} />
    </group>
  )
}
