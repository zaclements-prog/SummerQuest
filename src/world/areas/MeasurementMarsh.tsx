/**
 * Measurement Marsh — a damp teal wetland gateway built around a giant ruler.
 *
 * Center: (-24, -2) world xz.  NPC at (-20, -1.7) world xz (offset [4, 0.3]).
 * A central collider (r2.5) sits at the area center, so the MAIN LANDMARK — a
 * tall striped MEASURING POST / ruler — stands at local (0,0) and the avatar
 * walks around it. The gateway NPC waits to the EAST (+x), reached over a low
 * wooden plank "ruler-bridge"; that approach corridor (local x≈2..4) is kept
 * flat and clear of tall blockers.
 *
 * Everything is authored in a local group anchored at the area center, so all
 * decor coordinates are RELATIVE to (0,0). Shallow water is rendered as thin
 * translucent discs sitting just above the flat y=0 ground (no real recess —
 * the ground is flat — but a darker damp base + foam rim reads as a puddle).
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
import { Cattail, LilyPad, Rock, Lantern, Signpost } from '../voxel/props'
import { field, rng } from '../voxel/fields'

type Vec3 = [number, number, number]

// ── Marsh accents (raw hex, kept few + cohesive with the teal/green palette) ──
const TEAL = '#3fb0a3'        // bright marsh water / teal accent
const TEAL_DEEP = '#2a7d77'   // shadowed marsh water
const MARSH_GREEN = '#6f9e54' // damp reedy green
const RULER_DARK = '#caa24a'  // warm "wood ruler" band (alternates with foam)
const FROG_GREEN = '#7bbf4a'  // frog body
const FROG_BELLY = '#e8efbf'  // frog belly

// Marsh-grass scatter across the wet ground (denser, instanced in one draw).
// Centered slightly west/north so the east approach to the NPC stays open.
const MARSH_GRASS = field([-1.5, -1], 4.2, 4.0, 64, 4021, {
  y: 0,
  minScale: 0.6,
  maxScale: 1.2,
})

// A damp darker-green underlayer (mossy ground dabs) for that wetland feel.
const DAMP_DABS = field([0, -0.5], 5.0, 4.4, 40, 4047, {
  y: 0,
  minScale: 0.7,
  maxScale: 1.4,
})

/** A chunky voxel frog — squat body, eyes, little legs. Cheerful marsh local. */
function Frog({ position = [0, 0, 0], seed = 1, facing = 0 }: { position?: Vec3; seed?: number; facing?: number }) {
  const r = useMemo(() => rng(seed), [seed])
  const s = 0.8 + r() * 0.35
  return (
    <Float speed={2.2} rotationIntensity={0} floatIntensity={0.25} floatingRange={[0, 0.06]}>
      <group position={position} rotation={[0, facing, 0]} scale={[s, s, s]}>
        {/* body */}
        <Vox position={[0, 0.16, 0]} size={[0.5, 0.3, 0.42]} color={FROG_GREEN} radius={0.16} />
        {/* belly */}
        <Vox position={[0, 0.07, 0.12]} size={[0.36, 0.14, 0.2]} color={FROG_BELLY} radius={0.08} castShadow={false} />
        {/* back legs */}
        <Vox position={[0.22, 0.08, -0.12]} size={[0.16, 0.12, 0.26]} color={PALETTE.foliageDark} radius={0.06} />
        <Vox position={[-0.22, 0.08, -0.12]} size={[0.16, 0.12, 0.26]} color={PALETTE.foliageDark} radius={0.06} />
        {/* front feet */}
        <Vox position={[0.17, 0.04, 0.2]} size={[0.12, 0.08, 0.14]} color={PALETTE.foliageDark} radius={0.04} castShadow={false} />
        <Vox position={[-0.17, 0.04, 0.2]} size={[0.12, 0.08, 0.14]} color={PALETTE.foliageDark} radius={0.04} castShadow={false} />
        {/* eyes */}
        <Vox position={[0.12, 0.34, 0.08]} size={0.14} color={FROG_GREEN} radius={0.07} />
        <Vox position={[-0.12, 0.34, 0.08]} size={0.14} color={FROG_GREEN} radius={0.07} />
        <Vox position={[0.13, 0.38, 0.12]} size={0.07} color="#1c2417" radius={0.03} castShadow={false} />
        <Vox position={[-0.11, 0.38, 0.12]} size={0.07} color="#1c2417" radius={0.03} castShadow={false} />
      </group>
    </Float>
  )
}

/** A flat shallow-water puddle: damp base disc + brighter teal sheet + foam rim. */
function WaterPatch({ position = [0, 0, 0], r = 1.2, seed = 1 }: { position?: Vec3; r?: number; seed?: number }) {
  const yaw = useMemo(() => rng(seed)() * Math.PI, [seed])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* damp dark base (wet mud rim) */}
      <Vox position={[0, 0.015, 0]} size={[r * 2.18, 0.05, r * 2.0]} color={TEAL_DEEP} radius={r * 0.9} transparent opacity={0.85} roughness={0.5} castShadow={false} receiveShadow />
      {/* bright teal water sheet */}
      <Vox position={[0, 0.05, 0]} size={[r * 2.0, 0.06, r * 1.8]} color={TEAL} radius={r * 0.82} transparent opacity={0.72} roughness={0.18} metalness={0.12} castShadow={false} receiveShadow={false} />
      {/* foam highlight glint */}
      <Vox position={[-r * 0.3, 0.08, r * 0.2]} size={[r * 0.7, 0.04, r * 0.4]} color={PALETTE.foam} radius={r * 0.2} transparent opacity={0.5} castShadow={false} receiveShadow={false} />
    </group>
  )
}

export default function MeasurementMarsh({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('measurement-marsh')!
  const npc = a.npc!
  const post = useRef<Group>(null)

  // ── Giant striped RULER POST — alternating bands like a tall measuring stick.
  // Built once, deterministically. Stands at local (0,0) on the central collider.
  const bands = useMemo(() => {
    const out: { y: number; h: number; dark: boolean; tick: number }[] = []
    const bandH = 0.34
    const count = 11
    for (let i = 0; i < count; i++) {
      out.push({ y: 0.2 + i * bandH + bandH / 2, h: bandH, dark: i % 2 === 0, tick: i })
    }
    return out
  }, [])

  // Wobbly reflection in the central pool: gentle bob on the post-base water.
  const pool = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (pool.current) pool.current.position.y = 0.05 + Math.sin(t * 1.4) * 0.015
    if (post.current) post.current.rotation.y = Math.sin(t * 0.3) * 0.015
  })

  return (
    <group>
      <group position={[a.worldPos[0], 0, a.worldPos[1]]}>
        {/* ── Central shallow pool the ruler stands in (under collider) ───── */}
        <group ref={pool} position={[0, 0.05, 0]}>
          <Vox position={[0, 0, 0]} size={[5.0, 0.06, 4.6]} color={TEAL} radius={2.0} transparent opacity={0.7} roughness={0.16} metalness={0.14} castShadow={false} receiveShadow={false} />
          <Vox position={[0, -0.02, -0.1]} size={[3.4, 0.06, 3.0]} color={TEAL_DEEP} radius={1.4} transparent opacity={0.55} roughness={0.16} castShadow={false} receiveShadow={false} />
        </group>
        {/* damp mud rim around the central pool */}
        <Vox position={[0, 0.02, 0]} size={[5.6, 0.06, 5.2]} color={PALETTE.dirtDark} radius={2.4} transparent opacity={0.7} roughness={0.6} castShadow={false} receiveShadow />

        {/* ── GIANT STRIPED MEASURING POST / RULER (the landmark) ─────────── */}
        <group ref={post}>
          {/* a small stone footing so the post reads as planted in the marsh */}
          <Vox position={[0, 0.12, 0]} size={[0.86, 0.24, 0.86]} color={PALETTE.rockDark} radius={0.1} />
          {/* the striped ruler shaft */}
          {bands.map((b, i) => (
            <group key={i}>
              <Vox
                position={[0, b.y, 0]}
                size={[0.62, b.h, 0.62]}
                color={b.dark ? RULER_DARK : PALETTE.foam}
                radius={0.07}
                roughness={0.7}
              />
              {/* black tick mark on the +x face at each band boundary */}
              <Vox
                position={[0.32, b.y + b.h / 2, 0]}
                size={[0.05, 0.05, i % 2 === 0 ? 0.4 : 0.24]}
                color="#2a2620"
                radius={0.02}
                castShadow={false}
              />
            </group>
          ))}
          {/* warm cap on top, like the end of a ruler */}
          <Vox position={[0, 0.2 + bands.length * 0.34 + 0.16, 0]} size={[0.74, 0.3, 0.74]} color={PALETTE.wood} radius={0.1} />
          <Vox position={[0, 0.2 + bands.length * 0.34 + 0.42, 0]} size={[0.4, 0.22, 0.4]} color={PALETTE.woodDark} radius={0.1} castShadow={false} />
          {/* a tiny pennant flag to crown it and draw the eye */}
          <Float speed={3} rotationIntensity={0.2} floatIntensity={0.3}>
            <Vox
              position={[0.34, 0.2 + bands.length * 0.34 + 0.42, 0]}
              size={[0.5, 0.3, 0.04]}
              color={PALETTE.flowerRed}
              radius={0.03}
              castShadow={false}
            />
          </Float>
        </group>

        {/* ── Satellite shallow water patches (recessed-look discs) ───────── */}
        <WaterPatch position={[-3.2, 0, 1.6]} r={1.3} seed={71} />
        <WaterPatch position={[-2.4, 0, -3.0]} r={1.1} seed={72} />
        <WaterPatch position={[1.8, 0, -3.0]} r={1.0} seed={73} />
        <WaterPatch position={[-4.4, 0, -1.0]} r={0.9} seed={74} />

        {/* ── Lily pads floating on the central pool + patches ────────────── */}
        <LilyPad position={[-1.5, 0.07, 1.1]} seed={31} />
        <LilyPad position={[1.4, 0.07, 1.3]} seed={52} />
        <LilyPad position={[-0.9, 0.07, -1.5]} seed={78} />
        <LilyPad position={[-3.2, 0.07, 1.6]} seed={96} />
        <LilyPad position={[1.7, 0.07, -3.0]} seed={113} />

        {/* ── Reeds / cattails ringing the water (off the east approach) ──── */}
        <Cattail position={[-2.6, 0, 1.9]} seed={11} />
        <Cattail position={[-3.0, 0, -1.8]} seed={23} />
        <Cattail position={[-1.7, 0, -2.6]} seed={44} />
        <Cattail position={[-4.0, 0, 0.4]} seed={57} />
        <Cattail position={[0.2, 0, -3.1]} seed={66} />
        <Cattail position={[-2.2, 0, 3.0]} seed={88} />
        <Cattail position={[2.6, 0, -2.3]} seed={91} />

        {/* a few tall reed clusters (extra marsh verticality, thin so it reads light) */}
        {([[-3.6, -2.6], [-4.2, 1.4], [-1.0, 3.2], [2.2, 2.6]] as [number, number][]).map((p, i) => (
          <group key={`reed${i}`} position={[p[0], 0, p[1]]}>
            {[0, 1, 2].map((j) => (
              <Vox
                key={j}
                position={[(j - 1) * 0.12, 0.45 + j * 0.05, 0]}
                size={[0.05, 0.9 + j * 0.12, 0.05]}
                color={j % 2 ? MARSH_GREEN : PALETTE.foliageDark}
                radius={0.02}
                rotation={[0, 0, (j - 1) * 0.12]}
                castShadow={false}
              />
            ))}
          </group>
        ))}

        {/* ── Wooden plank "ruler-bridge" leading EAST to the NPC ─────────── */}
        {/* Low deck (y≈0.1) over the marsh, from the central pool out toward the
            gateway at local (4,1.7). Planks alternate wood tones; tiny notch
            ticks along the near edge echo the ruler theme. Never tall enough to
            block the walk. */}
        <group position={[2.6, 0, 1.0]} rotation={[0, -0.18, 0]}>
          {[-1.0, -0.5, 0.0, 0.5, 1.0].map((x, i) => (
            <Vox
              key={i}
              position={[x, 0.1, 0]}
              size={[0.42, 0.1, 1.7]}
              color={i % 2 ? PALETTE.wood : PALETTE.woodDark}
              radius={0.03}
              roughness={0.8}
              receiveShadow
            />
          ))}
          {/* end trims */}
          <Vox position={[0, 0.1, -0.82]} size={[2.5, 0.12, 0.18]} color={PALETTE.barkDark} radius={0.04} />
          <Vox position={[0, 0.1, 0.82]} size={[2.5, 0.12, 0.18]} color={PALETTE.barkDark} radius={0.04} />
          {/* ruler ticks along the near (south) edge */}
          {[-1.1, -0.7, -0.3, 0.1, 0.5, 0.9, 1.1].map((x, i) => (
            <Vox key={`tk${i}`} position={[x, 0.16, 0.78]} size={[0.04, 0.04, i % 2 ? 0.18 : 0.1]} color="#2a2620" radius={0.015} castShadow={false} />
          ))}
          {/* short support posts dipping toward the water */}
          {([[-1.0, -0.7], [1.0, -0.7], [-1.0, 0.7], [1.0, 0.7]] as [number, number][]).map((p, i) => (
            <Vox key={`sp${i}`} position={[p[0], -0.02, p[1]]} size={[0.14, 0.4, 0.14]} color={PALETTE.barkDark} radius={0.04} />
          ))}
        </group>

        {/* ── Frogs (Vox locals) — one on a lily pad, one on the bank ─────── */}
        <Frog position={[1.4, 0.12, 1.3]} seed={201} facing={-0.6} />
        <Frog position={[-3.0, 0, 2.4]} seed={202} facing={1.2} />

        {/* ── Wet mossy rocks dotting the marsh edge (off the approach) ───── */}
        <Rock position={[-4.2, 0, 2.4]} seed={401} />
        <Rock position={[-3.4, 0, -3.2]} seed={402} />
        <Rock position={[2.8, 0, -3.4]} seed={403} />
        <Rock position={[-4.6, 0, -0.2]} seed={404} />

        {/* ── Ground cover: damp moss dabs + marsh grass (instanced) ─────── */}
        <Scatter
          items={DAMP_DABS}
          color={MARSH_GREEN}
          jitterAmount={0.12}
          size={[0.5, 0.05, 0.5]}
          radius={0.12}
          roughness={0.85}
          castShadow={false}
        />
        <Scatter
          items={MARSH_GRASS}
          color={PALETTE.grassDark}
          jitterAmount={0.14}
          size={[0.07, 0.32, 0.07]}
          roughness={0.9}
          castShadow={false}
        />

        {/* ── Signpost framing the entrance to the marsh (east, facing approach) */}
        <Signpost position={[3.4, 0, 2.6]} facing={-Math.PI * 0.55} />
      </group>

      {/* ────────────────────────────────────────────────────────────────────
          FOCAL DRESSING around the NPC (authored in WORLD space).
          NPC sits at world (-20, -1.7). A small plank stage + warm lanterns
          frame the gateway; nothing tall blocks the walk-up.
      ──────────────────────────────────────────────────────────────────── */}
      <group position={[a.worldPos[0] + npc.offset[0], 0, a.worldPos[1] + npc.offset[1]]}>
        {/* low circular plank stage under the NPC */}
        <Vox position={[0, 0.08, 0]} size={[1.9, 0.16, 1.9]} color={PALETTE.wood} radius={0.6} roughness={0.8} receiveShadow />
        <Vox position={[0, 0.04, 0]} size={[2.2, 0.1, 2.2]} color={PALETTE.woodDark} radius={0.7} roughness={0.8} castShadow={false} receiveShadow />
      </group>

      {/* warm lanterns flanking the gateway */}
      <Lantern position={[a.worldPos[0] + npc.offset[0] - 1.2, 0, a.worldPos[1] + npc.offset[1] + 0.6]} height={1.5} />
      <Lantern position={[a.worldPos[0] + npc.offset[0] + 1.2, 0, a.worldPos[1] + npc.offset[1] + 0.4]} height={1.4} />

      {/* ── Atmosphere: drifting marsh midges + soft dragonfly sparkle ───── */}
      <Sparkles
        position={[a.worldPos[0], 0.5, a.worldPos[1]]}
        count={30}
        scale={[10, 2.2, 9]}
        size={2.2}
        speed={0.16}
        opacity={0.55}
        color={TEAL}
        noise={0.5}
      />
      <Sparkles
        position={[a.worldPos[0], 0.35, a.worldPos[1]]}
        count={16}
        scale={[6, 1.4, 5.5]}
        size={3}
        speed={0.22}
        opacity={0.7}
        color="#bfe9a0"
        noise={0.6}
      />

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
