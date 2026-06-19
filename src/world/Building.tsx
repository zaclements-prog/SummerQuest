import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Color } from 'three'
import { useWorldUi } from './useWorldUi'
import { frontFacingWalls } from './collision'
import { Vox } from './voxel/Vox'
import { PALETTE } from './voxel/palette'

type Vec3 = [number, number, number]

/**
 * A lightly beveled voxel wall slab. Same fade contract as before: it goes
 * translucent (and stops writing depth) once `opacity` drops below ~0.5, so the
 * interior shows through cleanly.
 */
function Wall({ pos, args, wall, opacity }: {
  pos: Vec3
  args: Vec3
  wall: string
  opacity: number
}) {
  return (
    <Vox
      position={pos}
      size={args}
      color={wall}
      radius={0.06}
      roughness={0.9}
      transparent
      opacity={opacity}
    />
  )
}

/**
 * A warm-glowing window set into a wall plane. `axis` says which wall it sits on
 * ('x' → on the ±x walls, faces along x; 'z' → on the ±z walls, faces along z).
 * Rendered only on the never-fading back walls so the glow always reads.
 */
function Window({ pos, axis, frame }: { pos: Vec3; axis: 'x' | 'z'; frame: string }) {
  // Window opening dimensions; thin along the wall normal so it nestles into it.
  const w = 0.62
  const h = 0.7
  const t = 0.18
  const frameSize: Vec3 = axis === 'x' ? [t, h + 0.22, w + 0.22] : [w + 0.22, h + 0.22, t]
  const paneSize: Vec3 = axis === 'x' ? [t * 0.6, h, w] : [w, h, t * 0.6]
  return (
    <group position={pos}>
      {/* frame */}
      <Vox size={frameSize} color={frame} radius={0.05} roughness={0.8} castShadow={false} />
      {/* warm glowing pane */}
      <Vox
        size={paneSize}
        color={PALETTE.windowGlow}
        emissive={PALETTE.windowGlow}
        emissiveIntensity={1.1}
        roughness={0.3}
        radius={0.03}
        castShadow={false}
      />
    </group>
  )
}

/**
 * A 5x5 (by default) building centered at (cx,cz) with a doorway gap on its +z
 * wall. The two camera-facing walls (+x, +z) and the whole gabled roof fade out
 * when the avatar is inside, so you can see the interior. No scene swap — pure
 * opacity toggle. Used by both the House and the Writing Workshop.
 */
export default function Building({
  id, cx, cz, size = 5, doorWidth = 1.6, wall = '#cdbb98', roof = '#9a5a3c', children,
}: {
  id: string
  cx: number
  cz: number
  size?: number
  doorWidth?: number
  wall?: string
  roof?: string
  children?: ReactNode
}) {
  const inside = useWorldUi((s) => s.insideBuildingId) === id
  const front = frontFacingWalls() // ['px','pz']
  const H = 2.4
  const half = size / 2
  const door = doorWidth / 2
  const seg = half - door // segment width (1.7 for a 1.6 door)
  const segC = (half + door) / 2 // segment center (1.65 for a 1.6 door)

  // Opacity for a wall given which camera-facing faces it belongs to.
  const op = (faces: ('px' | 'pz')[]) => (inside && faces.some((f) => front.includes(f)) ? 0.14 : 1)
  // The whole roof shares one fade value (it sits on the +x/+z side of the camera).
  // Fades further than the walls so the top-down interior view stays clear.
  const roofOp = inside ? 0.06 : 1

  // A warm wood trim/frame for door + windows (kept consistent across callers).
  const trim = PALETTE.woodDark

  // Slightly darken the roof course for shingled banding, derived from the
  // passed-in roof color so callers keep full control of the hue.
  const roofDark = useMemo(() => {
    const base = new Color(roof)
    const hsl = { h: 0, s: 0, l: 0 }
    base.getHSL(hsl)
    base.setHSL(hsl.h, hsl.s, Math.max(0.04, hsl.l - 0.1))
    return `#${base.getHexString()}`
  }, [roof])

  // ── Stepped voxel gable roof ────────────────────────────────────────────────
  // Ridge runs along the x-axis; the long slopes face ±z (the +z slope is the
  // camera-facing front). Each rising layer shrinks in z to read as a pitch.
  // Triangular gable infill closes the ±x ends below the slopes.
  const roofLayers = useMemo(() => {
    const overhang = 0.4
    const baseW = size + overhang * 2 // x extent (constant — runs along ridge)
    const baseD = size + overhang * 2 // z extent at the eaves
    const steps = 4
    const layerH = 0.34
    const out: { pos: Vec3; size: Vec3 }[] = []
    for (let i = 0; i < steps; i++) {
      const t = i / steps
      const d = baseD * (1 - t * 0.82) // taper z toward the ridge
      const y = H + 0.12 + i * layerH + layerH / 2
      out.push({
        pos: [0, y, 0],
        size: [baseW, layerH + 0.02, d],
      })
    }
    return { out, baseW, baseD, steps, layerH }
  }, [size])

  const { out: layers, baseW, baseD, steps, layerH } = roofLayers
  const ridgeY = H + 0.12 + steps * layerH

  return (
    <group position={[cx, 0, cz]}>
      {/* ── Foundation lip (grounds the shell; never fades) ── */}
      <Vox
        position={[0, 0.12, 0]}
        size={[size + 0.5, 0.24, size + 0.5]}
        color={trim}
        radius={0.06}
        roughness={0.95}
        receiveShadow
      />

      {/* ── Walls ── */}
      {/* back walls (-x, -z) — never transparent */}
      <Wall pos={[-half, H / 2, 0]} args={[0.3, H, size]} wall={wall} opacity={op([])} />
      <Wall pos={[0, H / 2, -half]} args={[size, H, 0.3]} wall={wall} opacity={op([])} />
      {/* +x wall (camera-facing) */}
      <Wall pos={[half, H / 2, 0]} args={[0.3, H, size]} wall={wall} opacity={op(['px'])} />
      {/* +z wall (camera-facing), split around the doorway */}
      <Wall pos={[-segC, H / 2, half]} args={[seg, H, 0.3]} wall={wall} opacity={op(['pz'])} />
      <Wall pos={[segC, H / 2, half]} args={[seg, H, 0.3]} wall={wall} opacity={op(['pz'])} />
      {/* lintel above the doorway (bridges the gap; fades with the +z wall) */}
      <Wall pos={[0, H - 0.28, half]} args={[doorWidth + 0.1, 0.56, 0.3]} wall={wall} opacity={op(['pz'])} />

      {/* ── Windows (back walls only → glow always visible) ── */}
      <Window pos={[-half - 0.02, H * 0.56, size * 0.22]} axis="x" frame={trim} />
      <Window pos={[-half - 0.02, H * 0.56, -size * 0.22]} axis="x" frame={trim} />
      <Window pos={[size * 0.24, H * 0.56, -half - 0.02]} axis="z" frame={trim} />
      <Window pos={[-size * 0.24, H * 0.56, -half - 0.02]} axis="z" frame={trim} />

      {/* ── Framed doorway (on the +z wall; fades with the front) ── */}
      {/* jambs */}
      <Vox position={[-door - 0.07, H / 2 - 0.28, half]} size={[0.16, H - 0.56, 0.34]} color={trim} radius={0.04} roughness={0.85} transparent opacity={op(['pz'])} />
      <Vox position={[door + 0.07, H / 2 - 0.28, half]} size={[0.16, H - 0.56, 0.34]} color={trim} radius={0.04} roughness={0.85} transparent opacity={op(['pz'])} />
      {/* head trim */}
      <Vox position={[0, H - 0.56, half]} size={[doorWidth + 0.4, 0.16, 0.36]} color={trim} radius={0.04} roughness={0.85} transparent opacity={op(['pz'])} castShadow={false} />
      {/* warm threshold glow spilling from the doorway */}
      <Vox
        position={[0, 0.18, half - 0.02]}
        size={[doorWidth - 0.1, 0.3, 0.06]}
        color={PALETTE.windowGlow}
        emissive={PALETTE.windowGlow}
        emissiveIntensity={0.7}
        roughness={0.4}
        radius={0.03}
        castShadow={false}
        transparent
        opacity={op(['pz'])}
      />

      {/* ── Gabled voxel roof (every piece shares roofOp) ── */}
      {layers.map((l, i) => (
        <Vox
          key={`roof-${i}`}
          position={l.pos}
          size={l.size}
          color={i % 2 === 0 ? roof : roofDark}
          radius={0.08}
          roughness={0.85}
          transparent
          opacity={roofOp}
        />
      ))}
      {/* ridge cap along the peak */}
      <Vox
        position={[0, ridgeY + 0.02, 0]}
        size={[baseW + 0.05, 0.2, baseD * 0.2]}
        color={roofDark}
        radius={0.08}
        roughness={0.85}
        transparent
        opacity={roofOp}
      />

      {/* ── Chimney (corner of the back side; fades with the roof) ── */}
      <group position={[-half + 0.6, 0, -half + 0.6]}>
        <Vox
          position={[0, ridgeY + 0.05, 0]}
          size={[0.5, ridgeY + 0.4, 0.5]}
          color={PALETTE.rockDark}
          radius={0.06}
          roughness={0.95}
          transparent
          opacity={roofOp}
        />
        {/* brick cap */}
        <Vox
          position={[0, ridgeY * 2 + 0.45, 0]}
          size={[0.62, 0.18, 0.62]}
          color={PALETTE.rock}
          radius={0.05}
          roughness={0.95}
          transparent
          opacity={roofOp}
          castShadow={false}
        />
        {/* a warm ember glow at the flue */}
        <Vox
          position={[0, ridgeY * 2 + 0.5, 0]}
          size={[0.34, 0.12, 0.34]}
          color={PALETTE.lantern}
          emissive={PALETTE.lantern}
          emissiveIntensity={0.6}
          radius={0.04}
          roughness={0.5}
          castShadow={false}
          transparent
          opacity={roofOp}
        />
      </group>

      {children}
    </group>
  )
}
