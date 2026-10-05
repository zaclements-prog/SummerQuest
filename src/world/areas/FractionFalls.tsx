import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { Sparkles } from '@react-three/drei'
import Npc from '../Npc'
import { areaById } from '../worldLayout'
import { Vox } from '../voxel/Vox'
import { PALETTE } from '../voxel/palette'
import { Rock, LilyPad, Cattail, Log } from '../voxel/props'
import { rng } from '../voxel/fields'

type Vec3 = [number, number, number]

/**
 * Fraction Falls — a magical multi-tier voxel waterfall destination.
 *
 * Everything is authored in a local group anchored at the area center
 * (world 12,-8). The back cliff sits at local z=-3 (world z=-11), inside the
 * existing cliff/basin collider box (12,-11,w6,d3); the bank rock honors its
 * own collider at world (13,-5.5). The pool basin and the approach toward the
 * footbridge / NPC (NPC at world ~10,-5, i.e. local -2,+3) are left flat and
 * walkable — nothing tall is placed where the avatar walks up to the gateway.
 */

const ANCHOR: Vec3 = [12, 0, -8]

// Three falling water sheets, each stepping down a cliff tier. y/z are tuned so
// the water visibly steps from the cliff top into the pool below.
const TIERS = [
  { y: 3.2, z: -2.55, w: 1.5, h: 1.5, depth: 0.18, scrollSpeed: 1.7 },
  { y: 2.0, z: -2.05, w: 1.9, h: 1.4, depth: 0.18, scrollSpeed: 2.1 },
  { y: 0.85, z: -1.45, w: 2.4, h: 1.3, depth: 0.2, scrollSpeed: 2.6 },
] as const

export default function FractionFalls({ posRef }: { posRef: RefObject<Vector3> }) {
  const sheets = useRef<Group>(null)
  const pool = useRef<Group>(null)
  const a = areaById('fraction-falls')!
  const npc = a.npc!

  // Deterministic mossy-cliff block field (back wall, local z≈-3 → world -11).
  const cliffBlocks = useMemo(() => {
    const r = rng(7741)
    const out: { p: Vec3; s: Vec3; moss: boolean }[] = []
    // Stacked chunky stone blocks across the back, leaving a notch where the
    // waterfall pours through the center.
    for (let col = -3; col <= 3; col++) {
      const isChannel = col >= -1 && col <= 1
      const stacks = isChannel ? 2 : 3 + Math.floor(r() * 2)
      for (let lvl = 0; lvl < stacks; lvl++) {
        const w = 0.95 + r() * 0.4
        const h = 0.85 + r() * 0.4
        const x = col * 0.95 + (r() - 0.5) * 0.18
        const y = 0.45 + lvl * 0.95 + (r() - 0.5) * 0.12
        const z = -3.1 - (r() - 0.5) * 0.25 + (isChannel ? -0.15 : 0)
        out.push({ p: [x, y, z], s: [w, h, 0.95 + r() * 0.3], moss: lvl === stacks - 1 && !isChannel })
      }
    }
    return out
  }, [])

  // Wet mossy rocks ringing the pool edge (kept off the walkable approach).
  const edgeRocks = useMemo(() => {
    const r = rng(2208)
    const ring: { p: Vec3; seed: number }[] = []
    const spots: Vec3[] = [
      [-2.6, 0, -1.4], [-2.9, 0, 0.0], [-2.5, 0, 1.0],
      [2.6, 0, -1.4], [2.9, 0, 0.1], [2.4, 0, 1.1],
      [-1.3, 0, 1.9], [1.3, 0, 1.9], [0.2, 0, 2.0],
    ]
    for (const s of spots) ring.push({ p: s, seed: Math.floor(r() * 9999) })
    return ring
  }, [])

  // Lily pads + cattails floating on the pool (away from the foam splash zone).
  const lilies = useMemo<{ p: Vec3; seed: number }[]>(
    () => [
      { p: [-1.6, 0.06, 0.9], seed: 31 },
      { p: [1.5, 0.06, 1.2], seed: 52 },
      { p: [-0.9, 0.06, 1.7], seed: 78 },
      { p: [0.9, 0.06, 0.4], seed: 96 },
    ],
    [],
  )
  const cattails = useMemo<{ p: Vec3; seed: number }[]>(
    () => [
      { p: [-2.3, 0, 1.5], seed: 11 },
      { p: [2.2, 0, 1.4], seed: 23 },
      { p: [2.0, 0, -0.6], seed: 44 },
    ],
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // Gentle vertical scroll/bob on the falling sheets to read as flowing water.
    if (sheets.current) {
      sheets.current.children.forEach((c, i) => {
        const sp = TIERS[i]?.scrollSpeed ?? 2
        c.position.y = (c.userData.baseY ?? 0) + Math.sin(t * sp + i) * 0.06
      })
    }
    // Subtle ripple on the pool surface.
    if (pool.current) pool.current.position.y = 0.05 + Math.sin(t * 1.6) * 0.02
  })

  return (
    <group>
      <group position={ANCHOR}>
        {/* ── Rocky voxel CLIFF (back wall, mossy tops) ───────────────── */}
        {cliffBlocks.map((b, i) => (
          <group key={i}>
            <Vox
              position={b.p}
              size={b.s}
              color={i % 3 === 0 ? PALETTE.rockDark : PALETTE.rock}
              radius={0.18}
              roughness={0.95}
            />
            {b.moss && (
              <Vox
                position={[b.p[0], b.p[1] + b.s[1] / 2 + 0.04, b.p[2]]}
                size={[b.s[0] * 0.9, 0.16, b.s[2] * 0.9]}
                color={PALETTE.foliageDark}
                radius={0.1}
                castShadow={false}
              />
            )}
          </group>
        ))}
        {/* big flanking boulders framing the falls */}
        <Rock position={[-3.0, 0, -2.4]} seed={401} />
        <Rock position={[3.0, 0, -2.4]} seed={402} />

        {/* ── Multi-tier WATERFALL (translucent blue sheets) ──────────── */}
        <group ref={sheets}>
          {TIERS.map((tr, i) => (
            <group key={i} position={[0, tr.y, tr.z]} userData={{ baseY: tr.y }}>
              {/* main translucent sheet */}
              <Vox
                position={[0, 0, 0]}
                size={[tr.w, tr.h, tr.depth]}
                color={PALETTE.water}
                transparent
                opacity={0.7}
                roughness={0.25}
                metalness={0.1}
                castShadow={false}
                receiveShadow={false}
              />
              {/* deeper core for volume */}
              <Vox
                position={[0, 0, -0.06]}
                size={[tr.w * 0.62, tr.h, tr.depth * 0.6]}
                color={PALETTE.waterDeep}
                transparent
                opacity={0.55}
                roughness={0.2}
                castShadow={false}
                receiveShadow={false}
              />
              {/* bright crest where it spills over the lip */}
              <Vox
                position={[0, tr.h / 2 - 0.05, 0.06]}
                size={[tr.w * 0.95, 0.22, tr.depth + 0.06]}
                color={PALETTE.foam}
                transparent
                opacity={0.85}
                roughness={0.4}
                castShadow={false}
                receiveShadow={false}
              />
            </group>
          ))}
        </group>

        {/* ── FOAM where the falls hit the pool ───────────────────────── */}
        {([[-0.5, 0.18, -0.7], [0.5, 0.16, -0.6], [0, 0.22, -0.95], [-0.2, 0.14, -0.35]] as Vec3[]).map(
          (p, i) => (
            <Vox
              key={i}
              position={p}
              size={[0.6 - i * 0.06, 0.18, 0.5]}
              color={PALETTE.foam}
              transparent
              opacity={0.8}
              roughness={0.5}
              castShadow={false}
              receiveShadow={false}
            />
          ),
        )}
        <Sparkles
          count={26}
          scale={[2.6, 1.2, 1.8]}
          position={[0, 0.5, -0.7]}
          size={3}
          speed={0.5}
          color={PALETTE.foam}
        />

        {/* ── POOL surface (rippling, translucent) ────────────────────── */}
        <group ref={pool} position={[0, 0.05, 0.4]}>
          <Vox
            position={[0, 0, 0]}
            size={[5.6, 0.14, 4.2]}
            color={PALETTE.water}
            transparent
            opacity={0.78}
            roughness={0.15}
            metalness={0.15}
            castShadow={false}
            receiveShadow
          />
          {/* a slightly deeper center tint */}
          <Vox
            position={[0, -0.02, -0.2]}
            size={[3.8, 0.12, 2.6]}
            color={PALETTE.waterDeep}
            transparent
            opacity={0.5}
            roughness={0.15}
            castShadow={false}
            receiveShadow={false}
          />
        </group>

        {/* ── Pool dressing: lily pads, cattails ──────────────────────── */}
        {lilies.map((l, i) => (
          <LilyPad key={`lp${i}`} position={l.p} seed={l.seed} />
        ))}
        {cattails.map((c, i) => (
          <Cattail key={`ct${i}`} position={c.p} seed={c.seed} />
        ))}

        {/* ── Wet mossy rocks around the edge ─────────────────────────── */}
        {edgeRocks.map((er, i) => (
          <group key={`er${i}`}>
            <Rock position={er.p} seed={er.seed} />
            <Vox
              position={[er.p[0], er.p[1] + 0.34, er.p[2]]}
              size={[0.32, 0.1, 0.3]}
              color={PALETTE.foliageDark}
              radius={0.08}
              castShadow={false}
            />
          </group>
        ))}

        {/* ── Mist over the whole falls ───────────────────────────────── */}
        <Sparkles
          count={34}
          scale={[6, 3, 5]}
          position={[0, 1.6, -1]}
          size={6}
          speed={0.25}
          opacity={0.4}
          color={PALETTE.foam}
        />
      </group>

      {/* ── Wooden FOOTBRIDGE / dock where the NPC waits ──────────────── */}
      {/* Authored in world space near the NPC at (~10,-5); a low plank deck
          jutting over the pool's southwest lip, framing the gateway. Sits at
          y≈0.12 so it never blocks the flat walk; no new colliders. */}
      <group position={[10, 0, -5]}>
        {/* plank deck (a few boards) */}
        {[-0.66, -0.22, 0.22, 0.66].map((x, i) => (
          <Vox
            key={i}
            position={[x, 0.12, 0]}
            size={[0.38, 0.12, 2.0]}
            color={i % 2 ? PALETTE.wood : PALETTE.woodDark}
            radius={0.04}
            roughness={0.8}
            receiveShadow
          />
        ))}
        {/* cross-board trim at each end */}
        <Vox position={[0, 0.12, -0.95]} size={[1.9, 0.13, 0.2]} color={PALETTE.woodDark} radius={0.04} />
        <Vox position={[0, 0.12, 0.95]} size={[1.9, 0.13, 0.2]} color={PALETTE.woodDark} radius={0.04} />
        {/* short support posts reaching down toward the water */}
        {([[-0.8, -0.85], [0.8, -0.85], [-0.8, 0.85], [0.8, 0.85]] as [number, number][]).map(
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
        {/* a couple of railing posts on the pool-facing side (north, toward falls) */}
        {[-0.7, 0.7].map((x, i) => (
          <Vox
            key={`rail${i}`}
            position={[x, 0.42, -0.9]}
            size={[0.12, 0.55, 0.12]}
            color={PALETTE.wood}
            radius={0.04}
          />
        ))}
        <Vox position={[0, 0.62, -0.9]} size={[1.5, 0.1, 0.1]} color={PALETTE.woodDark} radius={0.03} />
      </group>

      {/* a mossy fallen log as a rustic step up to the dock */}
      <Log position={[10.0, 0, -3.9]} seed={88} length={1.7} />

      {/* bank rock (matches its collider at [13,-5.5]) */}
      <Boulder13 />

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

/** Chunky mossy bank rock sitting exactly on its collider at world (13,-5.5,r0.7). */
function Boulder13() {
  return (
    <group position={[13, 0, -5.5]}>
      <Vox position={[0, 0.32, 0]} size={[1.0, 0.7, 0.95]} color={PALETTE.rock} radius={0.24} roughness={0.95} />
      <Vox position={[0.34, 0.2, 0.26]} size={[0.5, 0.46, 0.5]} color={PALETTE.rockDark} radius={0.2} />
      <Vox position={[-0.28, 0.18, -0.24]} size={[0.42, 0.4, 0.42]} color={PALETTE.rockDark} radius={0.18} />
      {/* mossy wet top */}
      <Vox position={[0, 0.7, 0]} size={[0.8, 0.16, 0.72]} color={PALETTE.foliageDark} radius={0.12} castShadow={false} />
    </group>
  )
}
