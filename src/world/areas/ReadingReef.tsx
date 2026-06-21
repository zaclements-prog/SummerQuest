/**
 * Reading Reef — a sunny seaside reef gateway.
 *
 * Center: (0, 18) world xz.  NPC at (0, 14) world xz (npc.offset [0,-4]),
 * so the player approaches from the SOUTH (negative-z, house-facing) side.
 *
 * Central landmark: a striped red/white voxel LIGHTHOUSE sitting on the r=2.5
 * center collider, so the avatar walks around it. Around it: a recessed tide
 * pool (translucent water + a starfish & shells), branchy coral clusters, a
 * cozy reading bench (Log + a book Vox) with a warm lantern, beach sand, and a
 * fish or two on a Float. The south approach toward the NPC is kept flat and
 * clear; the NPC gets a small sandy stage, a signpost, and a lantern.
 *
 * Everything in the inner <group> is authored RELATIVE to the area center
 * (local 0,0). The NPC is rendered at absolute world coords at the top level.
 */

import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { Sparkles, Float } from '@react-three/drei'
import Npc from '../Npc'
import { areaById } from '../worldLayout'
import { Vox } from '../voxel/Vox'
import { PALETTE } from '../voxel/palette'
import { Log, Lantern, Signpost, Rock } from '../voxel/props'
import { GroundPatch } from '../voxel/GroundPatch'
import { rng } from '../voxel/fields'

type Vec3 = [number, number, number]

// Seaside accent hexes (small raw accents, in the spirit of the toolkit).
const CORAL_PINK = '#f58ca8'
const CORAL_ORANGE = '#f0935a'
const CORAL_PURPLE = '#c78fe0'
const SHELL = '#f7e4d0'
const STARFISH = '#f2a33d'
const LAMP = '#fff2b0'

/** Branchy coral cluster — a few colored stalks fanning up from a rocky base. */
function Coral({
  position = [0, 0, 0],
  seed = 1,
  color = CORAL_PINK,
}: {
  position?: Vec3
  seed?: number
  color?: string
}) {
  const r = useMemo(() => rng(seed), [seed])
  const branches = useMemo(() => {
    const out: { p: Vec3; s: Vec3; rot: Vec3; tip: Vec3 }[] = []
    const n = 3 + Math.floor(r() * 3)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.8
      const lean = 0.18 + r() * 0.22
      const h = 0.5 + r() * 0.6
      const rad = 0.18 + r() * 0.12
      out.push({
        p: [Math.cos(a) * rad, h / 2 + 0.12, Math.sin(a) * rad],
        s: [0.14, h, 0.14],
        rot: [Math.cos(a) * lean, a, Math.sin(a) * lean],
        tip: [Math.cos(a) * rad * 1.5, h + 0.1, Math.sin(a) * rad * 1.5],
      })
    }
    return out
  }, [r])
  const yaw = useMemo(() => r() * Math.PI, [r])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* rocky base */}
      <Vox position={[0, 0.12, 0]} size={[0.5, 0.24, 0.5]} color={PALETTE.rock} radius={0.1} />
      {branches.map((b, i) => (
        <group key={i}>
          <Vox position={b.p} size={b.s} rotation={b.rot} color={color} radius={0.06} castShadow={false} />
          {/* knobby tip */}
          <Vox position={b.tip} size={0.18} color={color} radius={0.08} castShadow={false} />
        </group>
      ))}
    </group>
  )
}

/** A chunky voxel fish on its side, meant to ride a <Float>. */
function Fish({
  position = [0, 0, 0],
  color = PALETTE.water,
  seed = 1,
}: {
  position?: Vec3
  color?: string
  seed?: number
}) {
  const r = useMemo(() => rng(seed), [seed])
  const yaw = useMemo(() => r() * Math.PI * 2, [r])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* body */}
      <Vox position={[0, 0, 0]} size={[0.5, 0.34, 0.22]} color={color} radius={0.12} castShadow={false} />
      {/* tail fin */}
      <Vox position={[-0.34, 0, 0]} size={[0.22, 0.3, 0.06]} color={color} radius={0.06} castShadow={false} />
      {/* top fin */}
      <Vox position={[0.02, 0.22, 0]} size={[0.18, 0.16, 0.06]} color={color} radius={0.05} castShadow={false} />
      {/* eye */}
      <Vox position={[0.18, 0.05, 0.12]} size={0.06} color={'#2a2a2a'} radius={0.03} castShadow={false} />
      <Vox position={[0.2, 0.05, 0.12]} size={0.03} color={PALETTE.foam} radius={0.015} castShadow={false} />
    </group>
  )
}

/** A 5-armed voxel starfish lying flat (in the tide pool / on wet sand). */
function Starfish({ position = [0, 0, 0], seed = 1 }: { position?: Vec3; seed?: number }) {
  const r = useMemo(() => rng(seed), [seed])
  const yaw = useMemo(() => r() * Math.PI * 2, [r])
  const arms = useMemo(() => {
    const out: { p: Vec3; rot: number }[] = []
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      out.push({ p: [Math.cos(a) * 0.22, 0.04, Math.sin(a) * 0.22], rot: a })
    }
    return out
  }, [])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Vox position={[0, 0.04, 0]} size={[0.26, 0.08, 0.26]} color={STARFISH} radius={0.05} castShadow={false} />
      {arms.map((arm, i) => (
        <Vox
          key={i}
          position={arm.p}
          size={[0.3, 0.08, 0.16]}
          rotation={[0, arm.rot, 0]}
          color={STARFISH}
          radius={0.06}
          castShadow={false}
        />
      ))}
    </group>
  )
}

export default function ReadingReef({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('reading-reef')!
  const npc = a.npc!
  const npcX = a.worldPos[0] + npc.offset[0] // 0
  const npcZ = a.worldPos[1] + npc.offset[1] // 14

  const lampLight = useRef<{ intensity: number }>(null)
  const pool = useRef<Group>(null)

  // Local-space coral spots ringing the lighthouse, kept off the south approach
  // (local z < -1.5 is the corridor toward the NPC, so corals sit z >= -1).
  const corals = useMemo(
    () =>
      [
        { p: [-2.7, 0, -0.6] as Vec3, c: CORAL_PINK, seed: 511 },
        { p: [-3.1, 0, 0.9] as Vec3, c: CORAL_ORANGE, seed: 512 },
        { p: [-2.3, 0, 2.1] as Vec3, c: CORAL_PURPLE, seed: 513 },
        { p: [2.9, 0, -0.4] as Vec3, c: CORAL_ORANGE, seed: 514 },
        { p: [3.3, 0, 1.1] as Vec3, c: CORAL_PINK, seed: 515 },
        { p: [0.4, 0, 3.0] as Vec3, c: CORAL_PURPLE, seed: 516 },
        { p: [-0.9, 0, 3.1] as Vec3, c: CORAL_PINK, seed: 517 },
      ],
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // Gentle pulse on the lighthouse beacon.
    if (lampLight.current) lampLight.current.intensity = 2.4 + Math.sin(t * 2.2) * 0.9
    // Soft ripple on the tide pool surface.
    if (pool.current) pool.current.position.y = 0.04 + Math.sin(t * 1.5) * 0.02
  })

  return (
    <group>
      <group position={[a.worldPos[0], 0, a.worldPos[1]]}>
        {/* ── BEACH SAND floor — one cohesive soft-edged patch ──────────── */}
        <GroundPatch position={[0, 0, 0]} radius={6} color={PALETTE.sand} seed={91} />
        {/* darker wet-sand patch hugging the tide pool */}
        <GroundPatch position={[2.6, 0, 1.7]} radius={2.6} color={PALETTE.sandWet} seed={92} y={0.025} />

        {/* ── CENTRAL LIGHTHOUSE (on the r=2.5 collider, local 0,0) ─────── */}
        {/* Rocky islet base so the tower rises out of the beach. */}
        <Vox position={[0, 0.18, 0]} size={[2.4, 0.36, 2.4]} color={PALETTE.sandWet} radius={0.2} receiveShadow />
        <Vox position={[0, 0.42, 0]} size={[1.9, 0.3, 1.9]} color={PALETTE.rock} radius={0.18} />

        {/* Tapered tower with red/white bands. */}
        {([
          { y: 0.95, s: 1.5, c: PALETTE.foam },
          { y: 1.65, s: 1.4, c: PALETTE.flowerRed },
          { y: 2.35, s: 1.3, c: PALETTE.foam },
          { y: 3.05, s: 1.2, c: PALETTE.flowerRed },
          { y: 3.7, s: 1.1, c: PALETTE.foam },
        ] as const).map((band, i) => (
          <Vox
            key={i}
            position={[0, band.y, 0]}
            size={[band.s, 0.72, band.s]}
            color={band.c}
            radius={0.16}
          />
        ))}

        {/* Gallery deck ring under the lamp room. */}
        <Vox position={[0, 4.18, 0]} size={[1.45, 0.18, 1.45]} color={PALETTE.woodDark} radius={0.08} />

        {/* Lamp room: glass cage + emissive lamp (faint, pulsing). */}
        <Vox
          position={[0, 4.6, 0]}
          size={[0.85, 0.7, 0.85]}
          color={LAMP}
          emissive={LAMP}
          emissiveIntensity={1.8}
          roughness={0.3}
          radius={0.1}
          castShadow={false}
        />
        <pointLight ref={lampLight} position={[0, 4.6, 0]} color={LAMP} intensity={2.4} distance={9} decay={2} />
        {/* Corner posts of the lamp cage. */}
        {([[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]] as [number, number][]).map(
          (p, i) => (
            <Vox
              key={`post${i}`}
              position={[p[0], 4.6, p[1]]}
              size={[0.1, 0.7, 0.1]}
              color={PALETTE.barkDark}
              radius={0.03}
              castShadow={false}
            />
          ),
        )}
        {/* Conical roof cap. */}
        <Vox position={[0, 5.12, 0]} size={[1.0, 0.26, 1.0]} color={PALETTE.roof} radius={0.12} />
        <Vox position={[0, 5.42, 0]} size={[0.6, 0.3, 0.6]} color={PALETTE.roofDark} radius={0.14} />
        <Vox position={[0, 5.72, 0]} size={[0.18, 0.32, 0.18]} color={PALETTE.barkDark} radius={0.06} castShadow={false} />

        {/* ── TIDE POOL (recessed translucent water, NE of lighthouse) ─── */}
        {/* Wet rim ring of pebbly stone. */}
        <Vox position={[2.6, 0.06, 1.7]} size={[2.5, 0.12, 2.2]} color={PALETTE.pebble} radius={0.2} receiveShadow />
        <group ref={pool} position={[2.6, 0.04, 1.7]}>
          <Vox
            position={[0, 0, 0]}
            size={[2.0, 0.1, 1.7]}
            color={PALETTE.water}
            transparent
            opacity={0.78}
            roughness={0.15}
            metalness={0.15}
            castShadow={false}
            receiveShadow
          />
          <Vox
            position={[0, -0.02, 0]}
            size={[1.3, 0.08, 1.1]}
            color={PALETTE.waterDeep}
            transparent
            opacity={0.55}
            roughness={0.15}
            castShadow={false}
            receiveShadow={false}
          />
        </group>
        {/* Tide-pool dwellers: a starfish + a couple of shells. */}
        <Starfish position={[2.4, 0.06, 1.5]} seed={601} />
        {/* Shells (little clam-shaped half cubes). */}
        <Vox position={[3.2, 0.1, 2.1]} size={[0.3, 0.18, 0.26]} color={SHELL} radius={0.12} castShadow={false} />
        <Vox position={[3.05, 0.1, 1.1]} size={[0.26, 0.16, 0.22]} color={PALETTE.flowerPink} radius={0.1} castShadow={false} />
        {/* A snorkeling fish drifting just over the pool. */}
        <Float speed={2} rotationIntensity={0.4} floatIntensity={0.5} floatingRange={[0, 0.18]}>
          <Fish position={[2.6, 0.4, 1.7]} color={PALETTE.waterDeep} seed={701} />
        </Float>

        {/* ── CORAL CLUSTERS ringing the islet ─────────────────────────── */}
        {corals.map((c, i) => (
          <Coral key={`coral${i}`} position={c.p} color={c.c} seed={c.seed} />
        ))}

        {/* A couple of beach rocks for texture (off the south approach). */}
        <Rock position={[-3.2, 0, 2.4]} seed={811} />
        <Rock position={[3.6, 0, 0.2]} seed={812} />

        {/* ── COZY READING BENCH (Log seat + open book), SW corner ─────── */}
        <group position={[-3.0, 0, 1.4]} rotation={[0, Math.PI * 0.18, 0]}>
          <Log position={[0, 0, 0]} seed={88} length={1.8} />
          {/* low back-rest plank */}
          <Vox position={[0, 0.62, -0.22]} size={[1.6, 0.16, 0.12]} color={PALETTE.woodDark} radius={0.04} />
          {/* an open book resting on the log */}
          <group position={[0, 0.46, 0.05]} rotation={[-0.35, 0, 0]}>
            <Vox position={[-0.17, 0, 0]} size={[0.34, 0.06, 0.46]} color={PALETTE.flowerWhite} radius={0.02} castShadow={false} />
            <Vox position={[0.17, 0, 0]} size={[0.34, 0.06, 0.46]} color={PALETTE.flowerWhite} radius={0.02} castShadow={false} />
            {/* spine */}
            <Vox position={[0, -0.02, 0]} size={[0.06, 0.08, 0.46]} color={PALETTE.flowerRed} radius={0.02} castShadow={false} />
          </group>
        </group>

        {/* A drifting fish out over the open water side. */}
        <Float speed={1.6} rotationIntensity={0.5} floatIntensity={0.6} floatingRange={[0, 0.22]}>
          <Fish position={[-2.6, 0.7, -0.2]} color={CORAL_ORANGE} seed={733} />
        </Float>

        {/* Breezy sea-sparkle / spray over the reef. */}
        <Sparkles
          position={[0, 1.0, 0.8]}
          count={26}
          scale={[8, 2.6, 8]}
          size={3}
          speed={0.3}
          opacity={0.55}
          color={PALETTE.foam}
          noise={0.5}
        />
        {/* A glint over the tide pool. */}
        <Sparkles
          position={[2.6, 0.5, 1.7]}
          count={12}
          scale={[2.2, 1.0, 2.0]}
          size={2.5}
          speed={0.4}
          opacity={0.7}
          color={PALETTE.foam}
        />
      </group>

      {/* ── GATEWAY framing (authored in WORLD space near the NPC) ──────── */}
      {/* Small sandy stage under the NPC so it reads as a welcome spot. */}
      <group position={[npcX, 0, npcZ]}>
        <Vox position={[0, 0.06, 0]} size={[2.0, 0.12, 2.0]} color={PALETTE.sand} radius={0.16} receiveShadow />
        <Vox position={[0, 0.14, 0]} size={[1.5, 0.1, 1.5]} color={PALETTE.sandWet} radius={0.12} castShadow={false} receiveShadow />
      </group>

      {/* Driftwood signpost just NE of the NPC, angled toward the approach. */}
      <Signpost position={[npcX + 1.2, 0, npcZ + 0.3]} facing={-Math.PI * 0.2} />

      {/* Warm lantern beside the NPC. */}
      <Lantern position={[npcX - 1.2, 0, npcZ + 0.2]} height={1.5} glow={PALETTE.lantern} />

      {/* Cheerful fireflies/spray near the gateway. */}
      <Sparkles
        position={[npcX, 0.5, npcZ]}
        count={14}
        scale={[3.4, 1.6, 3.0]}
        size={3}
        speed={0.25}
        opacity={0.8}
        color={LAMP}
        noise={0.6}
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
