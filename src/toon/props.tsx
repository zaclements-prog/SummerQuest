import { useMemo } from 'react'
import { seededRng } from '../lib/random'
import { TOON } from './palette'
import { TBlob, TBox, TCone, TCyl, TSphere, type Vec3 } from './shapes'

/**
 * Reusable toon props. Every prop is deterministic from `seed` (same seed → same
 * shape), sits on y = 0 at `position`, and is roughly 1 world unit = 1 tile.
 * Outlines are off by default (they cost a draw call each); pass `outline` for
 * hero props near an NPC.
 */
export interface PropProps {
  position?: Vec3
  rotation?: number
  scale?: number
  seed?: number
  outline?: boolean
}

const rngFor = (seed: number, salt: string) => seededRng(`${salt}:${seed}`)

// ── Trees ───────────────────────────────────────────────────────────────────

export type TreeVariant = 'round' | 'pine' | 'blossom' | 'fruit' | 'palm' | 'autumn'

export function Tree({ position = [0, 0, 0], rotation = 0, scale = 1, seed = 1, outline, variant = 'round' }: PropProps & { variant?: TreeVariant }) {
  // RNG created inside the memo so the shape is a pure function of `seed`.
  const shape = useMemo(() => {
    const r = rngFor(seed, 'tree')
    const h = 0.9 + r() * 0.5
    const lean = (r() - 0.5) * 0.12
    const blobs = Array.from({ length: 3 }, (_, i) => ({
      x: (r() - 0.5) * 0.5,
      y: h + 0.35 + i * 0.18 + r() * 0.15,
      z: (r() - 0.5) * 0.5,
      s: 0.55 + r() * 0.3 - i * 0.06,
    }))
    const fruit = Array.from({ length: 5 }, () => ({ a: r() * Math.PI * 2, y: h + 0.3 + r() * 0.6 }))
    return { h, lean, blobs, fruit }
  }, [seed])

  if (variant === 'pine') {
    return (
      <group position={position} rotation={[0, rotation, 0]} scale={scale}>
        <TCyl radiusTop={0.1} radiusBottom={0.16} height={0.7} position={[0, 0.35, 0]} color={TOON.bark} />
        <TCone radius={0.85} height={1.1} position={[0, 1.05, 0]} color={TOON.pineDark} outline={outline} flat />
        <TCone radius={0.68} height={0.95} position={[0, 1.55, 0]} color={TOON.pine} outline={outline} flat />
        <TCone radius={0.46} height={0.8} position={[0, 2.0, 0]} color={TOON.pine} outline={outline} flat />
      </group>
    )
  }
  if (variant === 'palm') {
    return (
      <group position={position} rotation={[0, rotation, 0]} scale={scale}>
        {[0, 1, 2, 3].map((i) => (
          <TCyl key={i} radiusTop={0.1} radiusBottom={0.13} height={0.55} position={[i * 0.08, 0.28 + i * 0.52, 0]} rotation={[0, 0, -0.12]} color={i % 2 ? TOON.bark : TOON.woodDark} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2
          return (
            <TBlob key={i} position={[0.3 + Math.cos(a) * 0.55, 2.2, Math.sin(a) * 0.55]} scale={[0.6, 0.12, 0.25]} rotation={[0, -a, -0.35]} color={i % 2 ? TOON.leaf : TOON.leafDark} outline={outline} />
          )
        })}
        <TSphere position={[0.36, 2.08, 0.08]} scale={0.1} color={TOON.woodDark} castShadow={false} />
      </group>
    )
  }
  const canopy =
    variant === 'blossom'
      ? [TOON.blossom, TOON.blossomLight, TOON.flowerPink]
      : variant === 'autumn'
        ? [TOON.autumn, TOON.flowerYellow, TOON.coral]
        : [TOON.leaf, TOON.leafLight, TOON.leafDark]
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <TCyl radiusTop={0.11} radiusBottom={0.18} height={shape.h} position={[0, shape.h / 2, 0]} rotation={[shape.lean, 0, shape.lean]} color={TOON.bark} />
      {shape.blobs.map((b, i) => (
        <TBlob key={i} position={[b.x, b.y, b.z]} scale={b.s} color={canopy[i % canopy.length]} outline={outline} />
      ))}
      {variant === 'fruit' &&
        shape.fruit.map((f, i) => (
          <TSphere key={i} position={[Math.cos(f.a) * 0.62, f.y, Math.sin(f.a) * 0.62]} scale={0.09} color={TOON.flowerRed} castShadow={false} />
        ))}
    </group>
  )
}

// ── Ground cover ────────────────────────────────────────────────────────────

export function Bush({ position = [0, 0, 0], rotation = 0, scale = 1, seed = 1, outline, color = TOON.leaf }: PropProps & { color?: string }) {
  const blobs = useMemo(() => {
    const r = rngFor(seed, 'bush')
    return Array.from({ length: 3 }, (_, i) => ({ x: (i - 1) * 0.32 + (r() - 0.5) * 0.1, z: (r() - 0.5) * 0.25, s: 0.32 + r() * 0.14 }))
  }, [seed])
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {blobs.map((b, i) => (
        <TBlob key={i} position={[b.x, b.s * 0.8, b.z]} scale={b.s} color={i === 1 ? TOON.leafLight : color} outline={outline} />
      ))}
    </group>
  )
}

export function Rock({ position = [0, 0, 0], rotation = 0, scale = 1, seed = 1, outline, color = TOON.rock }: PropProps & { color?: string }) {
  const s = useMemo<Vec3>(() => {
    const r = rngFor(seed, 'rock')
    return [0.35 + r() * 0.2, 0.22 + r() * 0.12, 0.3 + r() * 0.18]
  }, [seed])
  return <TBlob position={[position[0], position[1] + s[1] * 0.6, position[2]]} rotation={[0, rotation, 0]} scale={[s[0] * scale, s[1] * scale, s[2] * scale]} color={color} detail={0} outline={outline} receiveShadow />
}

export function Boulder({ position = [0, 0, 0], rotation = 0, scale = 1, seed = 1, outline = true }: PropProps) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <Rock position={[0, 0, 0]} scale={2.4} seed={seed} outline={outline} color={TOON.rockDark} />
      <Rock position={[0.55, 0, 0.35]} scale={1.2} seed={seed + 1} outline={outline} color={TOON.rock} />
    </group>
  )
}

const FLOWER_COLORS = [TOON.flowerRed, TOON.flowerYellow, TOON.flowerPink, TOON.flowerPurple, TOON.flowerWhite, TOON.flowerBlue]

export function FlowerPatch({ position = [0, 0, 0], seed = 1, count = 6, radius = 0.6 }: PropProps & { count?: number; radius?: number }) {
  const flowers = useMemo(() => {
    const r = rngFor(seed, 'flowers')
    return Array.from({ length: count }, () => {
        const a = r() * Math.PI * 2
        const d = Math.sqrt(r()) * radius
        return { x: Math.cos(a) * d, z: Math.sin(a) * d, c: FLOWER_COLORS[Math.floor(r() * FLOWER_COLORS.length)], h: 0.16 + r() * 0.14 }
      })
  }, [seed, count, radius])
  return (
    <group position={position}>
      {flowers.map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]}>
          <TCyl radiusTop={0.015} height={f.h} position={[0, f.h / 2, 0]} color={TOON.leafDark} castShadow={false} segments={4} />
          <TSphere position={[0, f.h + 0.04, 0]} scale={0.07} color={f.c} castShadow={false} segments={8} />
        </group>
      ))}
    </group>
  )
}

export function GrassTuft({ position = [0, 0, 0], rotation = 0, scale = 1, color = TOON.grassDark }: PropProps & { color?: string }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <TCone radius={0.05} height={0.32} position={[0, 0.16, 0]} color={color} castShadow={false} segments={4} />
      <TCone radius={0.04} height={0.24} position={[0.08, 0.12, 0.03]} rotation={[0, 0, -0.3]} color={color} castShadow={false} segments={4} />
      <TCone radius={0.04} height={0.24} position={[-0.08, 0.12, -0.02]} rotation={[0, 0, 0.3]} color={color} castShadow={false} segments={4} />
    </group>
  )
}

export function Mushroom({ position = [0, 0, 0], rotation = 0, scale = 1, outline }: PropProps) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <TCyl radiusTop={0.06} radiusBottom={0.08} height={0.2} position={[0, 0.1, 0]} color={TOON.flowerWhite} />
      <TSphere position={[0, 0.22, 0]} scale={[0.18, 0.12, 0.18]} color={TOON.flowerRed} outline={outline} />
      <TSphere position={[0.07, 0.31, 0.05]} scale={0.025} color={TOON.white} castShadow={false} segments={6} />
      <TSphere position={[-0.06, 0.3, -0.04]} scale={0.022} color={TOON.white} castShadow={false} segments={6} />
    </group>
  )
}

// ── Built things ────────────────────────────────────────────────────────────

/** A run of fence along local +x, centered on `position`. */
export function Fence({ position = [0, 0, 0], rotation = 0, length = 2, posts = 3, color = TOON.woodLight }: PropProps & { length?: number; posts?: number; color?: string }) {
  const xs = Array.from({ length: posts }, (_, i) => -length / 2 + (length * i) / Math.max(1, posts - 1))
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {xs.map((x) => (
        <TBox key={x} size={[0.12, 0.6, 0.12]} position={[x, 0.3, 0]} color={color} />
      ))}
      <TBox size={[length, 0.08, 0.06]} position={[0, 0.42, 0]} color={color} castShadow={false} />
      <TBox size={[length, 0.08, 0.06]} position={[0, 0.22, 0]} color={color} castShadow={false} />
    </group>
  )
}

/** Street lamp with a warm glowing lantern (no real light unless `light`). */
export function Lamp({ position = [0, 0, 0], height = 1.6, light = false, outline }: PropProps & { height?: number; light?: boolean }) {
  return (
    <group position={position}>
      <TCyl radiusTop={0.06} radiusBottom={0.09} height={height} position={[0, height / 2, 0]} color={TOON.woodDark} />
      <TBox size={[0.3, 0.32, 0.3]} position={[0, height + 0.12, 0]} color={TOON.lantern} emissive={TOON.lantern} emissiveIntensity={0.9} outline={outline} castShadow={false} />
      <TCone radius={0.24} height={0.18} position={[0, height + 0.36, 0]} color={TOON.woodDark} segments={4} rotation={[0, Math.PI / 4, 0]} />
      {light && <pointLight position={[0, height + 0.1, 0]} color={TOON.lantern} intensity={2} distance={4} decay={2} />}
    </group>
  )
}

/** Signpost with a board; `color` tints the board. */
export function Signpost({ position = [0, 0, 0], rotation = 0, color = TOON.wood, outline = true }: PropProps & { color?: string }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <TCyl radiusTop={0.06} height={1.2} position={[0, 0.6, 0]} color={TOON.woodDark} />
      <TBox size={[0.9, 0.4, 0.08]} position={[0.2, 1.0, 0]} color={color} outline={outline} />
    </group>
  )
}

export function Bench({ position = [0, 0, 0], rotation = 0, outline }: PropProps) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <TBox size={[1.2, 0.08, 0.36]} position={[0, 0.4, 0]} color={TOON.wood} outline={outline} />
      <TBox size={[1.2, 0.3, 0.06]} position={[0, 0.62, -0.16]} color={TOON.wood} outline={outline} />
      <TBox size={[0.08, 0.4, 0.3]} position={[-0.5, 0.2, 0]} color={TOON.woodDark} />
      <TBox size={[0.08, 0.4, 0.3]} position={[0.5, 0.2, 0]} color={TOON.woodDark} />
    </group>
  )
}

export function Crate({ position = [0, 0, 0], rotation = 0, scale = 1, outline }: PropProps) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <TBox size={[0.6, 0.6, 0.6]} position={[0, 0.3, 0]} color={TOON.woodLight} outline={outline} />
      <TBox size={[0.62, 0.1, 0.62]} position={[0, 0.3, 0]} color={TOON.wood} castShadow={false} />
    </group>
  )
}

export function Barrel({ position = [0, 0, 0], rotation = 0, scale = 1, outline }: PropProps) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <TCyl radiusTop={0.26} radiusBottom={0.26} height={0.7} position={[0, 0.35, 0]} color={TOON.wood} outline={outline} />
      <TCyl radiusTop={0.28} height={0.06} position={[0, 0.18, 0]} color={TOON.metal} castShadow={false} />
      <TCyl radiusTop={0.28} height={0.06} position={[0, 0.52, 0]} color={TOON.metal} castShadow={false} />
    </group>
  )
}

export function Log({ position = [0, 0, 0], rotation = 0, length = 1.4, outline }: PropProps & { length?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <TCyl radiusTop={0.2} height={length} position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} color={TOON.bark} outline={outline} />
      <TCyl radiusTop={0.14} height={0.02} position={[length / 2 + 0.005, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} color={TOON.woodLight} castShadow={false} />
    </group>
  )
}

export function Stump({ position = [0, 0, 0], scale = 1 }: PropProps) {
  return (
    <group position={position} scale={scale}>
      <TCyl radiusTop={0.26} radiusBottom={0.32} height={0.3} position={[0, 0.15, 0]} color={TOON.bark} />
      <TCyl radiusTop={0.2} height={0.02} position={[0, 0.31, 0]} color={TOON.woodLight} castShadow={false} />
    </group>
  )
}

/** A soft puffy cloud (no shadow). */
export function Cloud({ position = [0, 0, 0], scale = 1, seed = 1 }: PropProps) {
  const puffs = useMemo(() => {
    const r = rngFor(seed, 'cloud')
    return Array.from({ length: 4 }, (_, i) => ({ x: (i - 1.5) * 0.8 + r() * 0.2, y: r() * 0.3, z: (r() - 0.5) * 0.5, s: 0.6 + r() * 0.5 }))
  }, [seed])
  return (
    <group position={position} scale={scale}>
      {puffs.map((p, i) => (
        <TBlob key={i} position={[p.x, p.y, p.z]} scale={[p.s, p.s * 0.75, p.s]} color={TOON.white} castShadow={false} detail={1} flat={false} />
      ))}
    </group>
  )
}
