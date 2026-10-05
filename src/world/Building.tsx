import type { ReactNode } from 'react'
import { Shape } from 'three'
import { useWorldUi } from './useWorldUi'
import { toonMaterial } from '../toon/materials'
import { frontFacingWalls } from './collision'
import { TOON } from '../toon/palette'
import { TBox, TCyl } from '../toon/shapes'

type Vec3 = [number, number, number]

/** Opacity of camera-facing walls / roof while the avatar is inside. */
const FADED_WALL = 0.14
const FADED_ROOF = 0.06

/** A warm glowing window (frame + pane) on a wall; `axis` = the wall's normal axis. */
function Window({ pos, axis, frame, opacity }: { pos: Vec3; axis: 'x' | 'z'; frame: string; opacity: number }) {
  const w = 0.7
  const h = 0.8
  const frameSize: Vec3 = axis === 'x' ? [0.12, h + 0.2, w + 0.2] : [w + 0.2, h + 0.2, 0.12]
  const paneSize: Vec3 = axis === 'x' ? [0.08, h, w] : [w, h, 0.08]
  const nudge: Vec3 = axis === 'x' ? [Math.sign(pos[0]) * 0.03, 0, 0] : [0, 0, Math.sign(pos[2]) * 0.03]
  return (
    <group position={pos}>
      <TBox size={frameSize} radius={0.04} color={frame} opacity={opacity} castShadow={false} />
      <TBox size={paneSize} radius={0.03} position={nudge} color={TOON.windowGlow} emissive={TOON.windowGlow} emissiveIntensity={0.55} opacity={opacity} castShadow={false} />
    </group>
  )
}

/**
 * A toon cottage shell centered at (cx,cz) with a doorway in its +z wall: soft
 * rounded walls on a stone foundation, glowing windows, a door frame, a smooth
 * pitched roof with overhanging eaves and a chimney. The two camera-facing walls
 * (+x, +z) and the whole roof fade out while the avatar is inside, so the
 * interior (`children`, in local coordinates) shows. Walls stay solid via the
 * colliders from `buildingWalls()` in worldLayout.ts.
 */
export default function Building({
  id,
  cx,
  cz,
  size = 5,
  doorWidth = 1.6,
  wall = TOON.wallCream,
  roof = TOON.roofRed,
  trim = TOON.woodDark,
  children,
}: {
  id: string
  cx: number
  cz: number
  size?: number
  doorWidth?: number
  wall?: string
  roof?: string
  trim?: string
  children?: ReactNode
}) {
  const inside = useWorldUi((s) => s.insideBuildingId) === id
  const front = frontFacingWalls() // ['px','pz']
  const H = 2.5
  const T = 0.3 // wall thickness
  const half = size / 2
  const door = doorWidth / 2
  const seg = half - door
  const segC = (half + door) / 2
  const op = (faces: ('px' | 'pz')[]) => (inside && faces.some((f) => front.includes(f)) ? FADED_WALL : 1)
  const roofOp = inside ? FADED_ROOF : 1
  const solid = !inside

  // Pitched roof: two slabs meeting at a ridge along x; eaves overhang all sides.
  const overhang = 0.45
  const pitch = 0.62 // radians
  const run = half + overhang
  const slabLen = run / Math.cos(pitch)
  const rise = Math.tan(pitch) * run
  const roofW = size + overhang * 2

  return (
    <group position={[cx, 0, cz]}>
      {/* foundation */}
      <TBox size={[size + 0.5, 0.25, size + 0.5]} radius={0.1} position={[0, 0.125, 0]} color={TOON.stoneDark} receiveShadow />

      {/* walls: back (−x, −z) never fade; +x and +z (camera-facing) do */}
      <TBox size={[T, H, size]} position={[-half, H / 2, 0]} color={wall} outline={solid} receiveShadow />
      <TBox size={[size, H, T]} position={[0, H / 2, -half]} color={wall} outline={solid} receiveShadow />
      <TBox size={[T, H, size]} position={[half, H / 2, 0]} color={wall} opacity={op(['px'])} outline={solid} receiveShadow />
      <TBox size={[seg, H, T]} position={[-segC, H / 2, half]} color={wall} opacity={op(['pz'])} outline={solid} receiveShadow />
      <TBox size={[seg, H, T]} position={[segC, H / 2, half]} color={wall} opacity={op(['pz'])} outline={solid} receiveShadow />
      <TBox size={[doorWidth + 0.05, 0.6, T]} position={[0, H - 0.3, half]} color={wall} opacity={op(['pz'])} />

      {/* corner trims */}
      {[[-half, -half], [half, -half], [-half, half], [half, half]].map(([x, z]) => (
        <TBox key={`${x},${z}`} size={[0.34, H, 0.34]} radius={0.08} position={[x, H / 2, z]} color={trim} opacity={x > 0 || z > 0 ? op(x > 0 ? ['px'] : ['pz']) : 1} />
      ))}

      {/* door frame */}
      <TBox size={[0.16, H - 0.6, 0.38]} radius={0.05} position={[-door - 0.08, (H - 0.6) / 2, half]} color={trim} opacity={op(['pz'])} />
      <TBox size={[0.16, H - 0.6, 0.38]} radius={0.05} position={[door + 0.08, (H - 0.6) / 2, half]} color={trim} opacity={op(['pz'])} />
      <TBox size={[doorWidth + 0.4, 0.16, 0.4]} radius={0.05} position={[0, H - 0.6, half]} color={trim} opacity={op(['pz'])} castShadow={false} />
      {/* doorstep */}
      <TBox size={[doorWidth + 0.3, 0.14, 0.6]} radius={0.05} position={[0, 0.07, half + 0.35]} color={TOON.stone} receiveShadow castShadow={false} />

      {/* windows: two per back wall (always lit), one per side on the front walls */}
      <Window pos={[-half - 0.12, H * 0.55, -size * 0.22]} axis="x" frame={trim} opacity={1} />
      <Window pos={[-half - 0.12, H * 0.55, size * 0.22]} axis="x" frame={trim} opacity={1} />
      <Window pos={[-size * 0.24, H * 0.55, -half - 0.12]} axis="z" frame={trim} opacity={1} />
      <Window pos={[size * 0.24, H * 0.55, -half - 0.12]} axis="z" frame={trim} opacity={1} />
      <Window pos={[half + 0.12, H * 0.55, 0]} axis="x" frame={trim} opacity={op(['px'])} />
      {size >= 6 && <Window pos={[-segC, H * 0.55, half + 0.12]} axis="z" frame={trim} opacity={op(['pz'])} />}
      {size >= 6 && <Window pos={[segC, H * 0.55, half + 0.12]} axis="z" frame={trim} opacity={op(['pz'])} />}

      {/* roof: two pitched slabs + ridge cap + gable ends */}
      <group position={[0, H + 0.05, 0]}>
        {[-1, 1].map((side) => (
          <TBox
            key={side}
            size={[roofW, 0.22, slabLen]}
            radius={0.08}
            position={[0, rise / 2, (side * run) / 2]}
            rotation={[side * pitch, 0, 0]}
            color={roof}
            opacity={roofOp}
            outline={solid}
          />
        ))}
        <TCyl radiusTop={0.16} height={roofW + 0.05} rotation={[0, 0, Math.PI / 2]} position={[0, rise + 0.05, 0]} color={roof} opacity={roofOp} outline={solid} segments={8} />
        {/* triangular gable ends (thin wedges) */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * (half - 0.05), 0, 0]}
            rotation={[0, (side * Math.PI) / 2, 0]}
            material={toonMaterial(wall, { opacity: side > 0 ? roofOp : 1, doubleSide: true })}
          >
            <shapeGeometry args={[gable(size - 0.1, rise - 0.1)]} />
          </mesh>
        ))}
        {/* chimney on the back slope */}
        <group position={[-half * 0.45, 0, -run * 0.45]}>
          <TBox size={[0.55, rise + 0.7, 0.55]} radius={0.06} position={[0, (rise + 0.7) / 2, 0]} color={TOON.brick} opacity={roofOp} outline={solid} />
          <TBox size={[0.7, 0.16, 0.7]} radius={0.05} position={[0, rise + 0.75, 0]} color={TOON.stoneDark} opacity={roofOp} />
        </group>
      </group>

      {children}
    </group>
  )
}

const gableCache = new Map<string, Shape>()
/** Triangle (base `w`, height `h`) for the gable end under the roof. */
function gable(w: number, h: number): Shape {
  const key = `${w}|${h}`
  let s = gableCache.get(key)
  if (!s) {
    s = new Shape()
    s.moveTo(-w / 2, 0)
    s.lineTo(w / 2, 0)
    s.lineTo(0, h)
    s.closePath()
    gableCache.set(key, s)
  }
  return s
}
