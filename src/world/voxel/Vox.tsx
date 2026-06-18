import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { RoundedBox, Instances, Instance } from '@react-three/drei'
import type { ColorRepresentation } from 'three'
import { jitter } from './palette'

type Vec3 = [number, number, number]

export interface VoxProps {
  position?: Vec3
  /** Box dimensions (w, h, d). Scalar shorthand allowed. */
  size?: Vec3 | number
  color?: ColorRepresentation
  /** Material roughness; voxels read best fairly matte. */
  roughness?: number
  metalness?: number
  /** Emissive controls for glowy props (lanterns/windows). */
  emissive?: ColorRepresentation
  emissiveIntensity?: number
  /** Corner bevel radius. Kept small so cubes still read as cubes. */
  radius?: number
  smoothness?: number
  castShadow?: boolean
  receiveShadow?: boolean
  rotation?: Vec3
  transparent?: boolean
  opacity?: number
  children?: ReactNode
}

/**
 * The atom of the voxel world: a lightly beveled cube. Built on drei
 * <RoundedBox> so crevices catch AO/shadow softly. Standard material, matte by
 * default. Casts + receives shadow unless told otherwise.
 */
export function Vox({
  position = [0, 0, 0],
  size = 1,
  color = '#ffffff',
  roughness = 0.85,
  metalness = 0,
  emissive,
  emissiveIntensity = 1,
  radius = 0.08,
  smoothness = 2,
  castShadow = true,
  receiveShadow = true,
  rotation,
  transparent,
  opacity,
  children,
}: VoxProps) {
  const args = useMemo<[number, number, number]>(
    () => (Array.isArray(size) ? size : [size, size, size]),
    [size],
  )
  // Bevel radius must not exceed half the smallest dimension or geometry breaks.
  const r = useMemo(() => Math.min(radius, Math.min(...args) * 0.45), [radius, args])
  return (
    <RoundedBox
      args={args}
      radius={r}
      smoothness={smoothness}
      position={position}
      rotation={rotation}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        transparent={transparent}
        opacity={opacity}
      />
      {children}
    </RoundedBox>
  )
}

export interface ScatterItem {
  position: Vec3
  /** Uniform scale, or per-axis. Default 1. */
  scale?: number | Vec3
  rotationY?: number
  /** Per-instance seed for deterministic color jitter. Falls back to index. */
  seed?: number
}

export interface ScatterProps {
  items: ScatterItem[]
  /** Base color jittered per instance. */
  color: string
  /** Lightness/hue jitter amount per instance. 0 disables. */
  jitterAmount?: number
  /** Geometry size of one instance (a small cube by default). */
  size?: Vec3 | number
  radius?: number
  roughness?: number
  castShadow?: boolean
  receiveShadow?: boolean
}

/**
 * Many tiny beveled cubes in ONE draw call via instancing — the perf backbone
 * for grass tufts, pebbles, flower beds, etc. Each instance gets a deterministic
 * color jitter so a field never bands. Geometry is a single RoundedBox shared
 * across all instances.
 */
export function Scatter({
  items,
  color,
  jitterAmount = 0.08,
  size = 0.3,
  radius = 0.05,
  roughness = 0.85,
  castShadow = true,
  receiveShadow = true,
}: ScatterProps) {
  const args = useMemo<[number, number, number]>(
    () => (Array.isArray(size) ? size : [size, size, size]),
    [size],
  )
  const r = useMemo(() => Math.min(radius, Math.min(...args) * 0.45), [radius, args])
  const colors = useMemo(
    () =>
      items.map((it, i) =>
        jitterAmount > 0 ? jitter(color, jitterAmount, it.seed ?? i + 1) : color,
      ),
    [items, color, jitterAmount],
  )
  return (
    <Instances limit={items.length} castShadow={castShadow} receiveShadow={receiveShadow}>
      <RoundedBox args={args} radius={r} smoothness={1} />
      <meshStandardMaterial roughness={roughness} />
      {items.map((it, i) => {
        const s = it.scale ?? 1
        const scale: Vec3 = Array.isArray(s) ? s : [s, s, s]
        return (
          <Instance
            key={i}
            position={it.position}
            rotation={[0, it.rotationY ?? 0, 0]}
            scale={scale}
            color={colors[i]}
          />
        )
      })}
    </Instances>
  )
}
