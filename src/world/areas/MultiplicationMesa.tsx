/**
 * Multiplication Mesa — a sun-baked desert butte gateway.
 *
 * Center: (-14, 12) world xz.  NPC at (-11, 9.4) world xz (offset [3,-2.6],
 * on the island-facing / approach side).  A central collider (r=2.5) sits at
 * the center — the layered red-rock MESA butte lives there so the avatar walks
 * around it to reach the gateway.  The approach quadrant toward the NPC
 * (x ≳ -13, z ≲ 10.5) is kept low and open: only flat sand, dry tufts and a
 * welcoming signpost + lantern frame the NPC.  Everything tall (the butte,
 * the big cacti, boulders) is pushed to the far side and flanks.
 *
 * All decor is authored in a local group anchored at the area center; the
 * gateway NPC is rendered at the top level in absolute world coords.
 */

import { useMemo } from 'react'
import type { RefObject } from 'react'
import { Vector3 } from 'three'
import { Sparkles, Float } from '@react-three/drei'
import Npc from '../Npc'
import { areaById } from '../worldLayout'
import { Vox, Scatter } from '../voxel/Vox'
import { PALETTE } from '../voxel/palette'
import { Rock, Boulder, Signpost, Lantern } from '../voxel/props'
import { field, rng } from '../voxel/fields'

type Vec3 = [number, number, number]

// ── Desert clay / sandstone accent tones (small raw-hex accents) ─────────────
const MESA = {
  base: '#b9603b', // warm sandstone
  mid: '#c9764a', // sunlit clay
  light: '#dd9560', // bleached cap rock
  dark: '#8f4429', // shadowed strata
  cactus: '#5f8f4a', // sage cactus body
  cactusDark: '#4a7339', // shaded cactus
  bloom: '#e8556b', // cactus flower
  sand: PALETTE.sand,
  sandWarm: '#d8bb7e',
}

/**
 * A layered red-rock butte: stacked, slightly-inset sandstone slabs that
 * taper toward a bleached cap, with banded strata colors. Built once,
 * deterministically. Centered on the area collider so the player circles it.
 */
function MesaButte({ seed = 9001 }: { seed?: number }) {
  const tiers = useMemo(() => {
    const r = rng(seed)
    // width, depth, height, vertical color band
    const layers: { w: number; d: number; h: number; c: string; jx: number; jz: number }[] = []
    const bands = [MESA.dark, MESA.base, MESA.mid, MESA.base, MESA.mid, MESA.light]
    let w = 4.2
    let d = 3.9
    for (let i = 0; i < 6; i++) {
      const h = 0.62 + r() * 0.22
      layers.push({
        w,
        d,
        h,
        c: bands[i],
        jx: (r() - 0.5) * 0.25,
        jz: (r() - 0.5) * 0.25,
      })
      // taper inward each tier (eroded butte silhouette)
      w *= 0.82 - r() * 0.04
      d *= 0.82 - r() * 0.04
    }
    return layers
  }, [seed])

  // running y as we stack
  let y = 0
  return (
    <group>
      {tiers.map((t, i) => {
        const cy = y + t.h / 2
        y += t.h
        return (
          <group key={i}>
            <Vox
              position={[t.jx, cy, t.jz]}
              size={[t.w, t.h, t.d]}
              color={t.c}
              radius={0.16}
              roughness={0.96}
            />
            {/* a thin shadow lip under each step for that stratified read */}
            {i < 5 && (
              <Vox
                position={[t.jx, y + 0.02, t.jz]}
                size={[t.w * 0.96, 0.08, t.d * 0.96]}
                color={MESA.dark}
                radius={0.04}
                roughness={1}
                castShadow={false}
              />
            )}
          </group>
        )
      })}
      {/* a little eroded spur off one shoulder for asymmetry */}
      <Vox position={[1.9, 0.45, 0.9]} size={[0.9, 0.9, 0.8]} color={MESA.base} radius={0.16} roughness={0.96} />
      <Vox position={[2.05, 1.0, 0.95]} size={[0.6, 0.55, 0.55]} color={MESA.mid} radius={0.14} roughness={0.96} />
      {/* warm cap glow catch */}
      <Vox
        position={[0, y + 0.04, 0]}
        size={[tiers[5].w * 0.7, 0.12, tiers[5].d * 0.7]}
        color={MESA.light}
        radius={0.05}
        roughness={0.9}
        castShadow={false}
      />
    </group>
  )
}

/**
 * A saguaro-style voxel cactus: a tall ribbed trunk with one or two upturned
 * arms, capped with a little red bloom. Deterministic per seed.
 */
function Cactus({
  position = [0, 0, 0],
  seed = 1,
  scale = 1,
}: {
  position?: Vec3
  seed?: number
  scale?: number
}) {
  const r = useMemo(() => rng(seed), [seed])
  const trunkH = 1.5 + r() * 0.7
  const arms = useMemo(() => {
    const out: { side: number; atY: number; up: number }[] = []
    const n = 1 + (r() > 0.45 ? 1 : 0)
    for (let i = 0; i < n; i++) {
      out.push({
        side: i === 0 ? 1 : -1,
        atY: trunkH * (0.42 + r() * 0.18),
        up: 0.5 + r() * 0.45,
      })
    }
    return out
  }, [r, trunkH])
  const yaw = r() * Math.PI
  const bloom = r() > 0.4
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={[scale, scale, scale]}>
      {/* trunk */}
      <Vox position={[0, trunkH / 2, 0]} size={[0.42, trunkH, 0.42]} color={MESA.cactus} radius={0.18} roughness={0.85} />
      {/* shaded inner band for ribbing */}
      <Vox
        position={[0, trunkH / 2, 0.16]}
        size={[0.16, trunkH * 0.92, 0.12]}
        color={MESA.cactusDark}
        radius={0.05}
        roughness={0.9}
        castShadow={false}
      />
      {/* rounded top */}
      <Vox position={[0, trunkH + 0.04, 0]} size={[0.4, 0.3, 0.4]} color={MESA.cactus} radius={0.18} roughness={0.85} />
      {bloom && (
        <Vox
          position={[0, trunkH + 0.24, 0]}
          size={0.2}
          color={MESA.bloom}
          radius={0.09}
          roughness={0.6}
          castShadow={false}
        />
      )}
      {/* arms: out then up */}
      {arms.map((a, i) => {
        const x = a.side * 0.42
        return (
          <group key={i}>
            {/* horizontal elbow */}
            <Vox
              position={[a.side * 0.36, a.atY, 0]}
              size={[0.5, 0.34, 0.34]}
              color={MESA.cactus}
              radius={0.15}
              roughness={0.85}
            />
            {/* vertical arm */}
            <Vox
              position={[x, a.atY + a.up / 2 + 0.1, 0]}
              size={[0.34, a.up + 0.3, 0.34]}
              color={MESA.cactus}
              radius={0.15}
              roughness={0.85}
            />
            <Vox
              position={[x, a.atY + a.up + 0.28, 0]}
              size={[0.32, 0.24, 0.32]}
              color={MESA.cactus}
              radius={0.14}
              roughness={0.85}
            />
            {bloom && i === 0 && (
              <Vox
                position={[x, a.atY + a.up + 0.44, 0]}
                size={0.16}
                color={MESA.bloom}
                radius={0.07}
                roughness={0.6}
                castShadow={false}
              />
            )}
          </group>
        )
      })}
    </group>
  )
}

export default function MultiplicationMesa({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('multiplication-mesa')!
  const npc = a.npc!
  const npcX = a.worldPos[0] + npc.offset[0] // -11
  const npcZ = a.worldPos[1] + npc.offset[1] // 9.4

  // ── Warm sandy ground patches (instanced, flat — read as sun-baked dirt) ──
  // Broad warm sand wash under the whole area.
  const SAND = useMemo(
    () => field([-14, 12.2], 6, 5, 70, 4401, { y: 0.03, minScale: 0.8, maxScale: 1.9 }),
    [],
  )
  // A second, lighter sand layer for tonal life.
  const SAND_LIGHT = useMemo(
    () => field([-14, 12.5], 5.4, 4.4, 40, 4471, { y: 0.04, minScale: 0.6, maxScale: 1.4 }),
    [],
  )
  // Sparse dry tufts dotted across the flats (kept short — non-blocking).
  const TUFTS = useMemo(
    () => field([-14, 12.2], 5.6, 4.6, 34, 4533, { y: 0, minScale: 0.6, maxScale: 1.2 }),
    [],
  )
  // Scattered small pebbles/grit.
  const GRIT = useMemo(
    () => field([-14, 12], 5.8, 4.8, 30, 4599, { y: 0.02, minScale: 0.5, maxScale: 1.0 }),
    [],
  )

  return (
    <group>
      <group position={[a.worldPos[0], 0, a.worldPos[1]]}>
        {/* ── GROUND: warm sand wash (flat, instanced) ─────────────────────── */}
        <Scatter
          items={SAND}
          color={MESA.sand}
          jitterAmount={0.06}
          size={[1.3, 0.06, 1.3]}
          radius={0.05}
          roughness={1}
          castShadow={false}
        />
        <Scatter
          items={SAND_LIGHT}
          color={MESA.sandWarm}
          jitterAmount={0.07}
          size={[1.0, 0.07, 1.0]}
          radius={0.05}
          roughness={1}
          castShadow={false}
        />
        {/* dry grass tufts (muted khaki-green) */}
        <Scatter
          items={TUFTS}
          color="#b6a24e"
          jitterAmount={0.16}
          size={[0.07, 0.26, 0.07]}
          roughness={0.95}
          castShadow={false}
        />
        {/* grit / small stones */}
        <Scatter
          items={GRIT}
          color={PALETTE.pebble}
          jitterAmount={0.12}
          size={0.12}
          roughness={0.95}
          castShadow={false}
        />

        {/* ── CENTRAL LANDMARK: the layered red-rock mesa butte ───────────── */}
        {/* Sits on the r=2.5 collider; avatar circles it. */}
        <MesaButte seed={9001} />

        {/* ── CACTI ring — pushed to the flanks / far side, clear of approach.
             Approach to the NPC is the +x / -z quadrant (toward -11, 9.4), so
             the tall cacti hug the west, north and far-east edges. ────────── */}
        <Cactus position={[-4.4, 0, 0.6]} seed={210} scale={1.1} />
        <Cactus position={[-3.6, 0, 3.2]} seed={211} scale={0.95} />
        <Cactus position={[-1.2, 0, 4.4]} seed={212} scale={1.05} />
        <Cactus position={[1.6, 0, 4.2]} seed={213} scale={0.9} />
        <Cactus position={[4.0, 0, 2.6]} seed={214} scale={1.0} />
        <Cactus position={[4.6, 0, -0.4]} seed={215} scale={0.85} />
        {/* a couple of small barrel-ish baby cacti (short — fine near edges) */}
        <Cactus position={[-2.8, 0, -2.6]} seed={216} scale={0.6} />
        <Cactus position={[3.0, 0, -3.0]} seed={217} scale={0.55} />

        {/* ── BOULDERS + rocks framing the back, away from the walkway ────── */}
        <Boulder position={[-4.0, 0, -2.2]} seed={301} />
        <Boulder position={[3.7, 0, 3.7]} seed={302} />
        <Rock position={[-3.2, 0, 4.0]} seed={311} />
        <Rock position={[2.4, 0, 4.6]} seed={312} />
        <Rock position={[4.8, 0, 1.2]} seed={313} />
        <Rock position={[-4.8, 0, 2.4]} seed={314} />

        {/* ── A little arrangement of stones forming a multiplication "×" ──── */}
        {/* Low, flat, decorative — laid into the sand on the open approach side
             so it's read on the way in but never blocks the walk (y≈0.07). */}
        <group position={[-1.6, 0, -3.2]}>
          {[-0.7, -0.35, 0, 0.35, 0.7].map((t, i) => (
            <Vox
              key={`xa${i}`}
              position={[t, 0.07, t]}
              size={[0.34, 0.14, 0.34]}
              color={i % 2 ? MESA.dark : MESA.base}
              radius={0.06}
              roughness={0.95}
              receiveShadow
            />
          ))}
          {[-0.7, -0.35, 0.35, 0.7].map((t, i) => (
            <Vox
              key={`xb${i}`}
              position={[t, 0.07, -t]}
              size={[0.34, 0.14, 0.34]}
              color={i % 2 ? MESA.dark : MESA.base}
              radius={0.06}
              roughness={0.95}
              receiveShadow
            />
          ))}
        </group>
      </group>

      {/* ──────────────────────────────────────────────────────────────────
          GATEWAY FRAMING — authored in world space around the NPC.
          A small sandstone stage under the NPC, a sun-bleached signpost, and
          a warm lantern. Kept low so the approach stays open.
      ────────────────────────────────────────────────────────────────────── */}

      {/* Sandstone stage / plinth under the NPC (two stacked slabs) */}
      <group position={[npcX, 0, npcZ]}>
        <Vox position={[0, 0.07, 0]} size={[1.9, 0.14, 1.9]} color={MESA.base} radius={0.08} roughness={0.95} receiveShadow />
        <Vox position={[0, 0.2, 0]} size={[1.45, 0.16, 1.45]} color={MESA.mid} radius={0.08} roughness={0.92} receiveShadow />
        {/* warm rim accent */}
        <Vox
          position={[0, 0.3, 0]}
          size={[1.1, 0.06, 1.1]}
          color={MESA.light}
          radius={0.04}
          roughness={0.9}
          castShadow={false}
        />
      </group>

      {/* Sun-bleached signpost, a step toward the island so it's read on entry */}
      <Signpost position={[npcX + 1.5, 0, npcZ - 1.0]} facing={-Math.PI * 0.2} />

      {/* Warm lantern beside the NPC — desert dusk glow */}
      <Lantern position={[npcX - 1.3, 0, npcZ - 0.2]} height={1.5} glow="#ffca6e" />

      {/* A friendly floating "×3" hint shimmer above the stage (subtle accent) */}
      <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.5}>
        <Sparkles
          position={[npcX, 1.7, npcZ]}
          count={10}
          scale={[1.6, 0.9, 1.6]}
          size={3}
          speed={0.3}
          opacity={0.8}
          color="#ffe2a6"
        />
      </Float>

      {/* Heat-shimmer dust drifting low over the flats (warm, sparse, slow) */}
      <Sparkles
        position={[-14, 0.5, 12]}
        count={22}
        scale={[10, 1.4, 8]}
        size={2}
        speed={0.12}
        opacity={0.4}
        color="#f0d9a0"
        noise={0.5}
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
