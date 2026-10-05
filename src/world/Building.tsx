import { useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Shape, Vector3 } from 'three'
import { toonMaterial } from '../toon/materials'
import { frontFacingWalls } from './collision'
import { TOON } from '../toon/palette'
import { TBox, TCyl } from '../toon/shapes'
import { faceted, geo } from '../toon/geometry'
import { Instances, type Inst } from './town/kit'
import { makeHideTest, playCameraTarget, roofGeometry, shade, useBuildingFade, useHidingBuildings } from './town/buildingStyle'

type Vec3 = [number, number, number]

const BOX_FLOWERS = [TOON.flowerRed, TOON.flowerYellow, TOON.flowerPink]
const _target = new Vector3()

/**
 * A warm glowing window, modelled facing +z and turned by `facing` (0 = +z,
 * π/2 = +x, π = −z, −π/2 = −x). `full` windows (on the walls the camera sees)
 * get a cross mullion, a sill and shutters; `box` adds a flower box under the sill.
 */
function Window({
  pos,
  facing,
  frame,
  shutter,
  full,
  box,
  opacity,
}: {
  pos: Vec3
  facing: number
  frame: string
  shutter?: string
  full: boolean
  box?: boolean
  opacity: number
}) {
  const w = 0.7
  const h = 0.8
  const solid = opacity >= 1
  return (
    <group position={pos} rotation={[0, facing, 0]}>
      <TBox size={[w + 0.2, h + 0.2, 0.12]} radius={0.04} color={frame} opacity={opacity} castShadow={false} />
      <TBox size={[w, h, 0.08]} radius={0.03} position={[0, 0, 0.03]} color={TOON.windowGlow} emissive={TOON.windowGlow} emissiveIntensity={0.55} opacity={opacity} castShadow={false} />
      {full && (
        <>
          <TBox size={[0.06, h, 0.05]} radius={0.02} position={[0, 0, 0.08]} color={frame} opacity={opacity} castShadow={false} />
          <TBox size={[w, 0.06, 0.05]} radius={0.02} position={[0, 0.04, 0.08]} color={frame} opacity={opacity} castShadow={false} />
          <TBox size={[w + 0.36, 0.09, 0.24]} radius={0.03} position={[0, -h / 2 - 0.12, 0.08]} color={frame} opacity={opacity} castShadow={false} />
        </>
      )}
      {full && shutter &&
        [-1, 1].map((s) => (
          <TBox key={s} size={[0.3, h + 0.08, 0.06]} radius={0.03} position={[s * (w / 2 + 0.27), 0, 0.03]} color={shutter} opacity={opacity} castShadow={false} />
        ))}
      {full && box && (
        <group position={[0, -h / 2 - 0.34, 0.2]}>
          <TBox size={[w + 0.34, 0.26, 0.3]} radius={0.05} color={TOON.woodLight} opacity={opacity} outline={solid} castShadow={false} />
        </group>
      )}
    </group>
  )
}

/**
 * A toon cottage shell centered at (cx,cz) with a doorway in its +z wall: soft
 * rounded walls with a two-tone base band on a stone plinth, glowing windows with
 * shutters, a door frame under a little gabled hood, a pitched roof with shingle
 * courses, overhanging eaves, round gable windows and a chimney. The two
 * camera-facing walls (+x, +z) and the whole roof fade out (and stop casting
 * shadows) while the avatar is inside, so the interior (`children`, in local
 * coordinates, standing on the ground-level floor) shows — and, with
 * `fadeWhenHiding`, also while the building stands between the play camera and
 * the avatar (e.g. walking the lane behind it). Walls stay solid via
 * the colliders from `buildingWalls()` in worldLayout.ts (walls at ±size/2,
 * 0.3 thick, a `doorWidth` doorway centered on the +z wall).
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
  floor = TOON.woodLight,
  band,
  shutters,
  windowBoxes = false,
  doorHood = true,
  frontWindows = true,
  fadeWhenHiding = false,
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
  /** Interior floor color. */
  floor?: string
  /** Color of the band along the foot of the walls (default: a deeper shade of `wall`). */
  band?: string
  /** Shutter color for the camera-facing windows (default: the roof color; `false` = none). */
  shutters?: string | false
  /** Flower boxes under the camera-facing windows. */
  windowBoxes?: boolean
  /** A little gabled hood over the door (turn off when the area builds its own porch). */
  doorHood?: boolean
  /** The two windows either side of the door (turn off when a porch or columns stand there). */
  frontWindows?: boolean
  /** Also fade while the building hides the avatar from the play camera. */
  fadeWhenHiding?: boolean
  children?: ReactNode
}) {
  const fade = useBuildingFade(id)
  const hides = useMemo(() => makeHideTest(cx, cz, size), [cx, cz, size])
  const hidingNow = useRef(false)
  useFrame(({ camera }) => {
    if (!fadeWhenHiding) return
    const p = playCameraTarget(camera, _target)
    const v = !!p && hides(p, camera.position)
    if (v !== hidingNow.current) {
      hidingNow.current = v
      useHidingBuildings.getState().setHiding(id, v)
    }
  })
  const front = frontFacingWalls() // ['px','pz']
  const { H, pitch, run, slabLen, rise, roofW } = roofGeometry(size)
  const T = 0.3 // wall thickness
  const half = size / 2
  const door = doorWidth / 2
  const seg = half - door
  const segC = (half + door) / 2
  const op = (faces: ('px' | 'pz')[]) => (faces.some((f) => front.includes(f)) ? fade.wall : fade.back)
  const roofOp = fade.roof
  const back = fade.back
  const solid = !fade.faded
  const bandColor = band ?? shade(wall, 0.9)
  const shutterColor = shutters === false ? undefined : (shutters ?? roof)
  const shingle = shade(roof, 0.84)
  const pz = op(['pz'])
  const px = op(['px'])

  // Wall slabs: back (−x, −z) never fade; +x and the two +z pieces (camera-facing) do.
  const walls: { key: string; pos: Vec3; len: number; alongX: boolean; o: number }[] = [
    { key: 'nx', pos: [-half, 0, 0], len: size, alongX: false, o: back },
    { key: 'nz', pos: [0, 0, -half], len: size, alongX: true, o: back },
    { key: 'px', pos: [half, 0, 0], len: size, alongX: false, o: px },
    { key: 'pzl', pos: [-segC, 0, half], len: seg, alongX: true, o: pz },
    { key: 'pzr', pos: [segC, 0, half], len: seg, alongX: true, o: pz },
  ]
  const wallSize = (alongX: boolean, len: number, h: number, t: number): Vec3 => (alongX ? [len, h, t] : [t, h, len])

  // Back-wall windows (plain); the shuttered camera-facing ones are listed below.
  const wy = H * 0.55
  const out = half + 0.12

  // Little gabled hood over the door.
  const hoodW = doorWidth + 0.6
  const hoodPitch = 0.42
  const hoodRise = Math.tan(hoodPitch) * (hoodW / 2)
  const hoodSlab = hoodW / 2 / Math.cos(hoodPitch) + 0.06

  const gableR = Math.min(0.42, rise * 0.14)

  // Shuttered windows on the camera-facing walls, and the plants in their flower boxes
  // (instanced across the building: one draw call for leaves, one for blooms).
  const fullWindows = useMemo(() => {
    const list: { key: string; pos: Vec3; facing: number; face: 'px' | 'pz' }[] = (size >= 8 ? [-size * 0.22, size * 0.22] : [0]).map((z) => ({
      key: `px${z}`, pos: [half + 0.12, H * 0.55, z], facing: Math.PI / 2, face: 'px',
    }))
    if (size >= 6 && frontWindows) {
      for (const x of [-segC, segC]) list.push({ key: `pz${x}`, pos: [x, H * 0.55, half + 0.12], facing: 0, face: 'pz' })
    }
    return list
  }, [size, half, H, segC, frontWindows])
  const boxPlants = useMemo(() => {
    const leaves: Inst[] = []
    const flowers: Inst[] = []
    for (const wd of fullWindows) {
      const c = Math.cos(wd.facing)
      const s = Math.sin(wd.facing)
      // window-local (x, y, z) → building-local, turned by `facing` about y
      const at = (x: number, y: number, z: number) => ({ x: wd.pos[0] + x * c + z * s, y: wd.pos[1] + y, z: wd.pos[2] - x * s + z * c })
      leaves.push({ ...at(0, -0.57, 0.2), s: [0.5, 0.11, 0.13], ry: wd.facing, color: TOON.leaf })
      BOX_FLOWERS.forEach((color, i) => flowers.push({ ...at(-0.28 + i * 0.28, -0.49 + (i % 2) * 0.04, 0.19 + (i % 2) * 0.04), s: 0.1, color }))
    }
    return { leaves, flowers }
  }, [fullWindows])

  return (
    <group position={[cx, 0, cz]}>
      {/* stone plinth under the walls (the interior floor stays at ground level,
          where the avatar and the House's furniture stand) */}
      <TBox size={[0.55, 0.28, size + 0.55]} radius={0.08} position={[-half, 0.14, 0]} color={TOON.stoneDark} receiveShadow castShadow={false} />
      <TBox size={[0.55, 0.28, size + 0.55]} radius={0.08} position={[half, 0.14, 0]} color={TOON.stoneDark} receiveShadow castShadow={false} />
      <TBox size={[size + 0.55, 0.28, 0.55]} radius={0.08} position={[0, 0.14, -half]} color={TOON.stoneDark} receiveShadow castShadow={false} />
      <TBox size={[seg + 0.28, 0.28, 0.55]} radius={0.08} position={[-segC - 0.14, 0.14, half]} color={TOON.stoneDark} receiveShadow castShadow={false} />
      <TBox size={[seg + 0.28, 0.28, 0.55]} radius={0.08} position={[segC + 0.14, 0.14, half]} color={TOON.stoneDark} receiveShadow castShadow={false} />
      {/* interior floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} material={toonMaterial(floor)} receiveShadow>
        <planeGeometry args={[size - 0.2, size - 0.2]} />
      </mesh>

      {/* walls, each with a deeper-toned band along its foot */}
      {walls.map((w) => (
        <group key={w.key} position={w.pos}>
          <TBox size={wallSize(w.alongX, w.len, H, T)} position={[0, H / 2, 0]} color={wall} opacity={w.o} outline={solid} receiveShadow castShadow={w.o >= 1} />
          <TBox size={wallSize(w.alongX, w.len, 0.5, T + 0.08)} radius={0.05} position={[0, 0.55, 0]} color={bandColor} opacity={w.o} castShadow={false} />
        </group>
      ))}
      <TBox size={[doorWidth + 0.05, 0.6, T]} position={[0, H - 0.3, half]} color={wall} opacity={pz} castShadow={solid} />

      {/* corner trims */}
      {[[-half, -half], [half, -half], [-half, half], [half, half]].map(([x, z]) => {
        const o = x > 0 ? px : z > 0 ? pz : back
        return <TBox key={`${x},${z}`} size={[0.34, H, 0.34]} radius={0.08} position={[x, H / 2, z]} color={trim} opacity={o} castShadow={o >= 1} />
      })}

      {/* door frame + hood */}
      <TBox size={[0.16, H - 0.6, 0.38]} radius={0.05} position={[-door - 0.08, (H - 0.6) / 2, half]} color={trim} opacity={pz} castShadow={false} />
      <TBox size={[0.16, H - 0.6, 0.38]} radius={0.05} position={[door + 0.08, (H - 0.6) / 2, half]} color={trim} opacity={pz} castShadow={false} />
      <TBox size={[doorWidth + 0.4, 0.16, 0.4]} radius={0.05} position={[0, H - 0.6, half]} color={trim} opacity={pz} castShadow={false} />
      {doorHood && (
        <group position={[0, H - 0.5, half + 0.42]}>
          {[-1, 1].map((s) => (
            <TBox
              key={s}
              size={[hoodSlab, 0.1, 0.8]}
              radius={0.03}
              position={[(s * hoodW) / 4, hoodRise / 2, 0]}
              rotation={[0, 0, -s * hoodPitch]}
              color={roof}
              opacity={pz}
              outline={solid}
              castShadow={solid}
            />
          ))}
        </group>
      )}
      {/* doorstep (low, so walking in stays at ground level) */}
      <TBox size={[doorWidth + 0.3, 0.06, 0.6]} radius={0.02} position={[0, 0.03, half + 0.35]} color={TOON.stone} receiveShadow castShadow={false} />

      {/* windows: plain ones on the back walls, shuttered ones on the camera-facing walls */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Window pos={[-out, wy, s * size * 0.22]} facing={-Math.PI / 2} frame={trim} full={false} opacity={back} />
          <Window pos={[s * size * 0.24, wy, -out]} facing={Math.PI} frame={trim} full={false} opacity={back} />
        </group>
      ))}
      {fullWindows.map((wd) => (
        <Window key={wd.key} pos={wd.pos} facing={wd.facing} frame={trim} shutter={shutterColor} box={windowBoxes} full opacity={wd.face === 'px' ? px : pz} />
      ))}
      {windowBoxes && solid && (
        <>
          <Instances geometry={faceted(geo.blob(1))} items={boxPlants.leaves} />
          <Instances geometry={geo.sphere(8)} items={boxPlants.flowers} />
        </>
      )}

      {/* roof: two pitched slabs with shingle courses, ridge cap, gable ends */}
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
            castShadow={solid}
          >
            {[0.28, 0.6].map((f) => (
              <TBox key={f} size={[roofW - 0.12, 0.05, 0.1]} radius={0.02} position={[0, 0.115, side * (slabLen / 2 - f * slabLen)]} color={shingle} opacity={roofOp} castShadow={false} />
            ))}
          </TBox>
        ))}
        <TCyl radiusTop={0.16} height={roofW + 0.05} rotation={[0, 0, Math.PI / 2]} position={[0, rise + 0.05, 0]} color={roof} opacity={roofOp} outline={solid} castShadow={solid} segments={8} />
        {/* triangular gable ends (thin wedges) with a round attic window */}
        {[-1, 1].map((side) => {
          const o = side > 0 ? roofOp : back
          return (
            <group key={side}>
              <mesh
                position={[side * (half - 0.05), 0, 0]}
                rotation={[0, (side * Math.PI) / 2, 0]}
                material={toonMaterial(wall, { opacity: o, doubleSide: true })}
              >
                <shapeGeometry args={[gable(size - 0.1, rise - 0.1)]} />
              </mesh>
              {side > 0 && (
                <group position={[half + 0.02, rise * 0.36, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <TCyl radiusTop={gableR + 0.08} height={0.1} color={trim} opacity={o} castShadow={false} segments={14} />
                  <TCyl radiusTop={gableR} height={0.13} color={TOON.windowGlow} emissive={TOON.windowGlow} emissiveIntensity={0.55} opacity={o} castShadow={false} segments={14} />
                </group>
              )}
            </group>
          )
        })}
        {/* chimney on the back slope */}
        <group position={[-half * 0.45, 0, -run * 0.45]}>
          <TBox size={[0.55, rise + 0.7, 0.55]} radius={0.06} position={[0, (rise + 0.7) / 2, 0]} color={TOON.brick} opacity={roofOp} outline={solid} castShadow={solid} />
          <TBox size={[0.7, 0.16, 0.7]} radius={0.05} position={[0, rise + 0.75, 0]} color={TOON.stoneDark} opacity={roofOp} castShadow={false} />
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
