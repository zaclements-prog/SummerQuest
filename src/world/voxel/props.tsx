import { useMemo } from 'react'
import { Vox } from './Vox'
import { PALETTE } from './palette'
import { rng } from './fields'

type Vec3 = [number, number, number]

interface PropBase {
  position?: Vec3
  seed?: number
}

// ── Trees ───────────────────────────────────────────────────────────────────

export type TreeVariant = 'round' | 'pine' | 'fruit'

export function VoxTree({
  position = [0, 0, 0],
  seed = 1,
  variant = 'round',
}: PropBase & { variant?: TreeVariant }) {
  const r = useMemo(() => rng(seed), [seed])
  const lean = (r() - 0.5) * 0.08
  const yaw = r() * Math.PI

  if (variant === 'pine') {
    const trunkH = 0.7
    return (
      <group position={position} rotation={[0, yaw, 0]}>
        <Vox position={[0, trunkH / 2, 0]} size={[0.28, trunkH, 0.28]} color={PALETTE.barkDark} radius={0.05} />
        <Vox position={[0, trunkH + 0.45, 0]} size={[1.5, 0.7, 1.5]} color={PALETTE.pine} radius={0.12} />
        <Vox position={[0, trunkH + 1.0, 0]} size={[1.1, 0.65, 1.1]} color={PALETTE.pineDark} radius={0.12} />
        <Vox position={[0, trunkH + 1.5, 0]} size={[0.7, 0.6, 0.7]} color={PALETTE.pine} radius={0.1} />
        <Vox position={[0, trunkH + 1.95, 0]} size={[0.3, 0.4, 0.3]} color={PALETTE.pineDark} radius={0.08} />
      </group>
    )
  }

  if (variant === 'fruit') {
    const trunkH = 0.85
    const fruitColor = r() > 0.5 ? PALETTE.flowerRed : PALETTE.flowerYellow
    return (
      <group position={position} rotation={[lean, yaw, lean]}>
        <Vox position={[0, trunkH / 2, 0]} size={[0.3, trunkH, 0.3]} color={PALETTE.bark} radius={0.06} />
        <Vox position={[0, trunkH + 0.55, 0]} size={[1.5, 1.1, 1.5]} color={PALETTE.foliageLight} radius={0.4} />
        <Vox position={[0.45, trunkH + 1.0, 0.2]} size={[0.7, 0.6, 0.7]} color={PALETTE.foliage} radius={0.3} />
        <Vox position={[-0.4, trunkH + 0.9, -0.3]} size={[0.6, 0.6, 0.6]} color={PALETTE.foliage} radius={0.28} />
        {/* fruit dots */}
        <Vox position={[0.55, trunkH + 0.55, 0.45]} size={0.16} color={fruitColor} radius={0.07} castShadow={false} />
        <Vox position={[-0.5, trunkH + 0.45, 0.4]} size={0.16} color={fruitColor} radius={0.07} castShadow={false} />
        <Vox position={[0.2, trunkH + 0.3, -0.55]} size={0.16} color={fruitColor} radius={0.07} castShadow={false} />
      </group>
    )
  }

  // round (default leafy)
  const trunkH = 0.9 + r() * 0.3
  return (
    <group position={position} rotation={[lean, yaw, lean]}>
      <Vox position={[0, trunkH / 2, 0]} size={[0.32, trunkH, 0.32]} color={PALETTE.bark} radius={0.06} />
      <Vox position={[0, trunkH + 0.6, 0]} size={[1.7, 1.3, 1.7]} color={PALETTE.foliage} radius={0.5} />
      <Vox position={[0.55, trunkH + 1.05, 0.25]} size={[0.8, 0.8, 0.8]} color={PALETTE.foliageLight} radius={0.35} />
      <Vox position={[-0.5, trunkH + 0.95, -0.35]} size={[0.7, 0.7, 0.7]} color={PALETTE.foliageDark} radius={0.32} />
      <Vox position={[0.1, trunkH + 1.35, -0.1]} size={[0.6, 0.6, 0.6]} color={PALETTE.foliageLight} radius={0.28} />
    </group>
  )
}

// ── Shrubs / undergrowth ─────────────────────────────────────────────────────

export function Bush({ position = [0, 0, 0], seed = 1 }: PropBase) {
  const r = useMemo(() => rng(seed), [seed])
  const yaw = r() * Math.PI
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Vox position={[0, 0.3, 0]} size={[0.8, 0.6, 0.8]} color={PALETTE.foliage} radius={0.28} />
      <Vox position={[0.3, 0.5, 0.1]} size={[0.5, 0.5, 0.5]} color={PALETTE.foliageLight} radius={0.22} />
      <Vox position={[-0.25, 0.45, -0.15]} size={[0.45, 0.45, 0.45]} color={PALETTE.foliageDark} radius={0.2} />
    </group>
  )
}

export function Fern({ position = [0, 0, 0], seed = 1 }: PropBase) {
  const r = useMemo(() => rng(seed), [seed])
  const blades: { p: Vec3; rot: Vec3; h: number }[] = []
  const n = 5
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r()
    const h = 0.5 + r() * 0.3
    blades.push({
      p: [Math.cos(a) * 0.12, h / 2, Math.sin(a) * 0.12],
      rot: [Math.cos(a) * 0.5, a, Math.sin(a) * 0.5],
      h,
    })
  }
  return (
    <group position={position}>
      {blades.map((b, i) => (
        <Vox
          key={i}
          position={b.p}
          size={[0.08, b.h, 0.22]}
          color={i % 2 ? PALETTE.foliageLight : PALETTE.foliage}
          rotation={b.rot}
          radius={0.04}
          castShadow={false}
        />
      ))}
    </group>
  )
}

export function GrassTuft({ position = [0, 0, 0], seed = 1 }: PropBase) {
  const r = useMemo(() => rng(seed), [seed])
  const blades: { p: Vec3; h: number; c: string }[] = []
  const n = 4
  for (let i = 0; i < n; i++) {
    const h = 0.22 + r() * 0.18
    blades.push({
      p: [(r() - 0.5) * 0.25, h / 2, (r() - 0.5) * 0.25],
      h,
      c: r() > 0.5 ? PALETTE.grassLight : PALETTE.foliage,
    })
  }
  return (
    <group position={position}>
      {blades.map((b, i) => (
        <Vox key={i} position={b.p} size={[0.07, b.h, 0.07]} color={b.c} radius={0.02} castShadow={false} />
      ))}
    </group>
  )
}

const FLOWER_COLORS = [
  PALETTE.flowerRed,
  PALETTE.flowerYellow,
  PALETTE.flowerPink,
  PALETTE.flowerPurple,
  PALETTE.flowerWhite,
]

export function FlowerPatch({
  position = [0, 0, 0],
  seed = 1,
  count = 6,
}: PropBase & { count?: number }) {
  const r = useMemo(() => rng(seed), [seed])
  const flowers = useMemo(() => {
    const out: { p: Vec3; c: string; h: number }[] = []
    for (let i = 0; i < count; i++) {
      const h = 0.22 + r() * 0.14
      out.push({
        p: [(r() - 0.5) * 1.1, 0, (r() - 0.5) * 1.1],
        c: FLOWER_COLORS[Math.floor(r() * FLOWER_COLORS.length)],
        h,
      })
    }
    return out
  }, [count, r])
  return (
    <group position={position}>
      {flowers.map((f, i) => (
        <group key={i} position={f.p}>
          {/* stem */}
          <Vox position={[0, f.h / 2, 0]} size={[0.05, f.h, 0.05]} color={PALETTE.foliageDark} radius={0.02} castShadow={false} />
          {/* bloom */}
          <Vox position={[0, f.h + 0.06, 0]} size={0.16} color={f.c} radius={0.07} castShadow={false} />
        </group>
      ))}
    </group>
  )
}

export function Mushroom({ position = [0, 0, 0], seed = 1 }: PropBase) {
  const r = useMemo(() => rng(seed), [seed])
  const s = 0.7 + r() * 0.5
  return (
    <group position={position} scale={[s, s, s]}>
      <Vox position={[0, 0.18, 0]} size={[0.16, 0.36, 0.16]} color={PALETTE.mushroomStem} radius={0.06} />
      <Vox position={[0, 0.42, 0]} size={[0.42, 0.22, 0.42]} color={PALETTE.mushroomCap} radius={0.16} />
      {/* spots */}
      <Vox position={[0.12, 0.5, 0.05]} size={0.07} color={PALETTE.flowerWhite} radius={0.03} castShadow={false} />
      <Vox position={[-0.1, 0.48, -0.08]} size={0.06} color={PALETTE.flowerWhite} radius={0.03} castShadow={false} />
    </group>
  )
}

// ── Rocks / wood ─────────────────────────────────────────────────────────────

export function Rock({ position = [0, 0, 0], seed = 1 }: PropBase) {
  const r = useMemo(() => rng(seed), [seed])
  const yaw = r() * Math.PI
  const s = 0.7 + r() * 0.5
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={[s, s, s]}>
      <Vox position={[0, 0.22, 0]} size={[0.6, 0.44, 0.5]} color={PALETTE.rock} radius={0.16} />
      <Vox position={[0.22, 0.14, 0.18]} size={[0.3, 0.28, 0.3]} color={PALETTE.rockDark} radius={0.12} />
    </group>
  )
}

export function Boulder({ position = [0, 0, 0], seed = 1 }: PropBase) {
  const r = useMemo(() => rng(seed), [seed])
  const yaw = r() * Math.PI
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Vox position={[0, 0.6, 0]} size={[1.5, 1.2, 1.3]} color={PALETTE.rock} radius={0.4} />
      <Vox position={[0.7, 0.35, 0.3]} size={[0.7, 0.7, 0.7]} color={PALETTE.rockDark} radius={0.28} />
      <Vox position={[-0.6, 0.3, -0.4]} size={[0.55, 0.55, 0.55]} color={PALETTE.rockDark} radius={0.22} />
      {/* moss touch */}
      <Vox position={[0, 1.18, 0]} size={[1.0, 0.18, 0.85]} color={PALETTE.foliageDark} radius={0.18} castShadow={false} />
    </group>
  )
}

export function Log({
  position = [0, 0, 0],
  seed = 1,
  length = 1.6,
}: PropBase & { length?: number }) {
  const r = useMemo(() => rng(seed), [seed])
  const yaw = r() * Math.PI
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Vox position={[0, 0.22, 0]} size={[length, 0.4, 0.4]} color={PALETTE.bark} radius={0.18} rotation={[0, 0, 0]} />
      {/* exposed end rings */}
      <Vox position={[length / 2 - 0.02, 0.22, 0]} size={[0.06, 0.34, 0.34]} color={PALETTE.wood} radius={0.14} castShadow={false} />
      <Vox position={[-length / 2 + 0.02, 0.22, 0]} size={[0.06, 0.34, 0.34]} color={PALETTE.wood} radius={0.14} castShadow={false} />
    </group>
  )
}

// ── Built props ──────────────────────────────────────────────────────────────

export function Fence({
  position = [0, 0, 0],
  length = 2,
  posts = 3,
}: PropBase & { length?: number; posts?: number }) {
  const railY1 = 0.45
  const railY2 = 0.85
  const postXs = useMemo(() => {
    const out: number[] = []
    for (let i = 0; i < posts; i++) out.push(-length / 2 + (length * i) / (posts - 1))
    return out
  }, [length, posts])
  return (
    <group position={position}>
      {postXs.map((x, i) => (
        <Vox key={i} position={[x, 0.5, 0]} size={[0.16, 1.0, 0.16]} color={PALETTE.wood} radius={0.05} />
      ))}
      <Vox position={[0, railY1, 0]} size={[length, 0.12, 0.1]} color={PALETTE.woodDark} radius={0.04} />
      <Vox position={[0, railY2, 0]} size={[length, 0.12, 0.1]} color={PALETTE.woodDark} radius={0.04} />
    </group>
  )
}

export function Lantern({
  position = [0, 0, 0],
  glow = PALETTE.lantern,
  height = 1.4,
}: PropBase & { glow?: string; height?: number }) {
  return (
    <group position={position}>
      {/* post */}
      <Vox position={[0, height / 2, 0]} size={[0.12, height, 0.12]} color={PALETTE.barkDark} radius={0.04} />
      {/* base */}
      <Vox position={[0, 0.06, 0]} size={[0.3, 0.12, 0.3]} color={PALETTE.rockDark} radius={0.05} />
      {/* cap */}
      <Vox position={[0, height + 0.22, 0]} size={[0.34, 0.16, 0.34]} color={PALETTE.barkDark} radius={0.06} />
      {/* glowing lamp */}
      <Vox
        position={[0, height + 0.02, 0]}
        size={[0.26, 0.28, 0.26]}
        color={glow}
        emissive={glow}
        emissiveIntensity={1.4}
        roughness={0.4}
        radius={0.08}
        castShadow={false}
      />
      <pointLight position={[0, height + 0.02, 0]} color={glow} intensity={2.2} distance={4.5} decay={2} />
    </group>
  )
}

export function Signpost({
  position = [0, 0, 0],
  facing = 0,
}: PropBase & { facing?: number }) {
  return (
    <group position={position} rotation={[0, facing, 0]}>
      <Vox position={[0, 0.55, 0]} size={[0.14, 1.1, 0.14]} color={PALETTE.woodDark} radius={0.05} />
      <Vox position={[0.35, 0.85, 0]} size={[0.8, 0.34, 0.1]} color={PALETTE.wood} radius={0.05} />
      <Vox position={[0, 0.04, 0]} size={[0.34, 0.1, 0.34]} color={PALETTE.rockDark} radius={0.04} />
    </group>
  )
}

export function Crate({ position = [0, 0, 0], seed = 1 }: PropBase) {
  const r = useMemo(() => rng(seed), [seed])
  const yaw = r() * Math.PI
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Vox position={[0, 0.3, 0]} size={[0.6, 0.6, 0.6]} color={PALETTE.wood} radius={0.06} />
      {/* plank edges */}
      <Vox position={[0, 0.3, 0.31]} size={[0.62, 0.12, 0.04]} color={PALETTE.woodDark} radius={0.02} castShadow={false} />
      <Vox position={[0.31, 0.3, 0]} size={[0.04, 0.12, 0.62]} color={PALETTE.woodDark} radius={0.02} castShadow={false} />
    </group>
  )
}

// ── Water props ──────────────────────────────────────────────────────────────

export function LilyPad({ position = [0, 0, 0], seed = 1 }: PropBase) {
  const r = useMemo(() => rng(seed), [seed])
  const yaw = r() * Math.PI
  const s = 0.7 + r() * 0.5
  const hasFlower = r() > 0.6
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={[s, s, s]}>
      <Vox position={[0, 0.03, 0]} size={[0.55, 0.06, 0.55]} color={PALETTE.foliage} radius={0.22} castShadow={false} />
      {hasFlower && (
        <Vox position={[0, 0.12, 0]} size={0.14} color={PALETTE.flowerPink} radius={0.06} castShadow={false} />
      )}
    </group>
  )
}

export function Cattail({ position = [0, 0, 0], seed = 1 }: PropBase) {
  const r = useMemo(() => rng(seed), [seed])
  const stalks = 2 + Math.floor(r() * 2)
  const out: { x: number; z: number; h: number }[] = []
  for (let i = 0; i < stalks; i++) {
    out.push({ x: (r() - 0.5) * 0.3, z: (r() - 0.5) * 0.3, h: 0.9 + r() * 0.4 })
  }
  return (
    <group position={position}>
      {out.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]}>
          <Vox position={[0, s.h / 2, 0]} size={[0.06, s.h, 0.06]} color={PALETTE.foliageDark} radius={0.02} castShadow={false} />
          <Vox position={[0, s.h, 0]} size={[0.12, 0.32, 0.12]} color={PALETTE.barkDark} radius={0.05} castShadow={false} />
        </group>
      ))}
    </group>
  )
}

// ── Sky ──────────────────────────────────────────────────────────────────────

export function VoxCloud({
  position = [0, 0, 0],
  seed = 1,
  scale = 1,
}: PropBase & { scale?: number }) {
  const r = useMemo(() => rng(seed), [seed])
  const puffs = useMemo(() => {
    const out: { p: Vec3; s: Vec3 }[] = []
    const n = 4 + Math.floor(r() * 3)
    for (let i = 0; i < n; i++) {
      const w = 1.2 + r() * 1.4
      out.push({
        p: [(r() - 0.5) * 3.2, (r() - 0.5) * 0.5, (r() - 0.5) * 1.6],
        s: [w, 0.8 + r() * 0.5, w * 0.8],
      })
    }
    return out
  }, [r])
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {puffs.map((p, i) => (
        <Vox
          key={i}
          position={p.p}
          size={p.s}
          color={PALETTE.cloud}
          radius={0.5}
          roughness={1}
          castShadow={false}
          receiveShadow={false}
        />
      ))}
    </group>
  )
}

