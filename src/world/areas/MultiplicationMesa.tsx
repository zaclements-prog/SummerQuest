import { useMemo } from 'react'
import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { TOON } from '../../toon/palette'
import { faceted, geo } from '../../toon/geometry'
import { TBlob, TBox, TCyl, TSphere } from '../../toon/shapes'
import { GrassTuft, Lamp, Signpost } from '../../toon/props'
import { ToonInstances, type InstanceSpec } from '../../toon/Scatter'
import Roadrunner from './multiplication-mesa/Roadrunner'
import { ROW_COLORS, TERRACOTTA, TERRACOTTA_TOP } from './multiplication-mesa/colors'
import { ARRAY_YAW, BUTTE, DIRT, LAMP, MESA, PLANTER, RED_ROCKS, SIGN, STEP_GRID } from './multiplication-mesa/layout'
import { Decal } from './fraction-falls/kit'
import { blobDisc } from './fraction-falls/shapes'

const CACTUS = '#6cbf7a'
const RED_ROCK = '#d98a62'
const RED_ROCK_DARK = '#c47250'
const TILE_COLORS = ['#fbd3e3', '#e6dafb', '#d3eaff']
const X_COLOR = TOON.coral

/** Mesa bands, bottom → top: [bottom radius, top radius, height, twist]. */
const BANDS: [number, number, number, number][] = [
  [MESA.r, MESA.r * 0.95, 1.1, 0],
  [MESA.r * 0.93, MESA.r * 0.88, 1.0, 0.35],
  [MESA.r * 0.86, MESA.r * 0.81, 0.95, 0.7],
  [MESA.r * 0.8, MESA.r * 0.76, 0.85, 0.15],
]
/** Each band's centre height. */
const BAND_Y = BANDS.map((_, i) => BANDS.slice(0, i).reduce((h, b) => h + b[2], 0) + BANDS[i][2] / 2)
const MESA_TOP = BANDS.reduce((h, b) => h + b[2], 0)

/** A big "×" badge: a stone disc with a crossed pair of bars, facing local +z. */
function TimesBadge({ position, rotation, size = 1 }: { position: [number, number, number]; rotation: [number, number, number]; size?: number }) {
  return (
    <group position={position} rotation={rotation} scale={size}>
      <TCyl radiusTop={0.5} height={0.14} rotation={[Math.PI / 2, 0, 0]} color={TOON.stone} outline segments={18} />
      <TBox size={[0.66, 0.16, 0.08]} radius={0.04} position={[0, 0, 0.08]} rotation={[0, 0, Math.PI / 4]} color={X_COLOR} castShadow={false} />
      <TBox size={[0.66, 0.16, 0.08]} radius={0.04} position={[0, 0, 0.08]} rotation={[0, 0, -Math.PI / 4]} color={X_COLOR} castShadow={false} />
    </group>
  )
}

/** The layered terracotta mesa with a glowing 3 × 4 crystal array on top. */
function Mesa() {
  const faceYaw = 0.95 // the badge faces the town / camera side
  const badgeR = MESA.r * 0.9 + 0.04
  return (
    <group position={[MESA.x, 0, MESA.z]}>
      {BANDS.map(([rb, rt, h, twist], i) => (
        <TCyl key={i} radiusTop={rt} radiusBottom={rb} height={h} position={[0, BAND_Y[i], 0]} rotation={[0, twist, 0]} scale={[1, 1, 0.94]} color={TERRACOTTA[i]} outline flat segments={9} receiveShadow />
      ))}
      <TCyl radiusTop={MESA.r * 0.72} radiusBottom={MESA.r * 0.76} height={0.16} position={[0, MESA_TOP + 0.08, 0]} rotation={[0, 0.5, 0]} scale={[1, 1, 0.94]} color={TERRACOTTA_TOP} flat segments={9} receiveShadow />
      <TimesBadge position={[Math.sin(faceYaw) * badgeR, 1.62, Math.cos(faceYaw) * badgeR]} rotation={[0, faceYaw, 0]} size={1.15} />

      {/* the crystal array: 3 rows × 4 columns, one colour per row */}
      <group position={[0, MESA_TOP + 0.16, 0]} rotation={[0, ARRAY_YAW, 0]}>
        {ROW_COLORS.map((c, r) =>
          [0, 1, 2, 3].map((col) => (
            <group key={`${r}-${col}`} position={[(col - 1.5) * 0.62, 0, (r - 1) * 0.62]}>
              <TBlob detail={0} scale={[0.15, 0.36, 0.15]} position={[0, 0.3, 0]} rotation={[0, col * 0.6 + r, 0]} color={c} emissive={c} emissiveIntensity={0.45} outline />
              <TCyl radiusTop={0.14} radiusBottom={0.17} height={0.08} position={[0, 0.04, 0]} color={TOON.stoneDark} castShadow={false} segments={8} />
            </group>
          )),
        )}
      </group>
    </group>
  )
}

/** The small two-band butte, with a barrel cactus on top. */
function Butte() {
  return (
    <group position={[BUTTE.x, 0, BUTTE.z]}>
      <TCyl radiusTop={BUTTE.r * 0.92} radiusBottom={BUTTE.r} height={1.0} position={[0, 0.5, 0]} rotation={[0, 0.3, 0]} color={TERRACOTTA[1]} outline flat segments={8} receiveShadow />
      <TCyl radiusTop={BUTTE.r * 0.78} radiusBottom={BUTTE.r * 0.86} height={0.8} position={[0, 1.4, 0]} rotation={[0, 0.9, 0]} color={TERRACOTTA[2]} outline flat segments={8} receiveShadow />
      <TCyl radiusTop={BUTTE.r * 0.7} radiusBottom={BUTTE.r * 0.74} height={0.12} position={[0, 1.86, 0]} rotation={[0, 0.2, 0]} color={TERRACOTTA_TOP} flat segments={8} />
      <TSphere position={[0.2, 2.15, -0.1]} scale={[0.26, 0.24, 0.26]} color={CACTUS} flat segments={10} />
      <TSphere position={[0.2, 2.42, -0.1]} scale={[0.07, 0.05, 0.07]} color={TOON.flowerPink} castShadow={false} segments={8} />
    </group>
  )
}

/** The 3 × 4 stepping-stone grid and the 2 × 4 cactus planter (instanced). */
function Arrays() {
  const { tiles, cacti, flowers } = useMemo(() => {
    const c = Math.cos(ARRAY_YAW)
    const s = Math.sin(ARRAY_YAW)
    const toWorld = (ox: number, oz: number, lx: number, lz: number): [number, number] => [ox + lx * c + lz * s, oz - lx * s + lz * c]
    const tiles: InstanceSpec[] = []
    const step = STEP_GRID.size + STEP_GRID.gap
    for (let r = 0; r < STEP_GRID.rows; r++) {
      for (let col = 0; col < STEP_GRID.cols; col++) {
        const [x, z] = toWorld(STEP_GRID.x, STEP_GRID.z, (col - (STEP_GRID.cols - 1) / 2) * step, (r - (STEP_GRID.rows - 1) / 2) * step)
        tiles.push({ x, y: 0.035, z, rot: ARRAY_YAW, color: TILE_COLORS[r % TILE_COLORS.length] })
      }
    }
    const cacti: InstanceSpec[] = []
    const flowers: InstanceSpec[] = []
    const px = PLANTER.w / PLANTER.cols
    const pz = PLANTER.d / PLANTER.rows
    for (let r = 0; r < PLANTER.rows; r++) {
      for (let col = 0; col < PLANTER.cols; col++) {
        const [x, z] = toWorld(PLANTER.x, PLANTER.z, (col - (PLANTER.cols - 1) / 2) * px, (r - (PLANTER.rows - 1) / 2) * pz)
        cacti.push({ x, y: 0.56, z, s: [0.2, 0.22, 0.2], rot: col + r })
        flowers.push({ x, y: 0.8, z, s: [0.07, 0.05, 0.07], color: r === 0 ? TOON.flowerPink : TOON.flowerYellow })
      }
    }
    return { tiles, cacti, flowers }
  }, [])
  return (
    <group>
      <ToonInstances geometry={geo.box(STEP_GRID.size, 0.07, STEP_GRID.size, 0.03)} color={TOON.white} items={tiles} castShadow={false} receiveShadow />
      <group position={[PLANTER.x, 0, PLANTER.z]} rotation={[0, ARRAY_YAW, 0]}>
        <TBox size={[PLANTER.w + 0.2, 0.42, PLANTER.d + 0.2]} radius={0.08} position={[0, 0.21, 0]} color={'#cf7b55'} outline />
        <TBox size={[PLANTER.w, 0.06, PLANTER.d]} radius={0.02} position={[0, 0.41, 0]} color={TOON.dirtDark} castShadow={false} />
      </group>
      <ToonInstances geometry={faceted(geo.sphere(8))} color={CACTUS} items={cacti} />
      <ToonInstances geometry={geo.sphere(6)} color={TOON.white} items={flowers} castShadow={false} />
    </group>
  )
}

/** Multiplication Mesa: a layered terracotta mesa crowned with a glowing crystal array, and arrays all around. */
export default function MultiplicationMesa({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('multiplication-mesa')!
  const npc = npcPosition(a)!
  return (
    <group>
      <Decal geometry={blobDisc(DIRT.r + 0.4, 0.13, 51)} color={'#e8b48a'} position={[DIRT.x, 0.0092, DIRT.z]} />
      <Decal geometry={blobDisc(DIRT.r, 0.13, 51)} color={'#f1c9a0'} position={[DIRT.x, 0.0102, DIRT.z]} />

      <Mesa />
      <Butte />
      <Arrays />

      {RED_ROCKS.map((k, i) => (
        <TBlob key={i} position={[k.x, k.s * 0.45, k.z]} scale={[k.s * 1.2, k.s * 0.8, k.s]} rotation={[0, i * 1.1, 0]} color={i % 2 ? RED_ROCK_DARK : RED_ROCK} detail={0} outline={k.s > 0.45} />
      ))}
      {([
        [-22.4, 9.4],
        [-26.2, 11.4],
        [-21.6, 17.8],
        [-19.2, 12.9],
      ] as const).map(([x, z], i) => (
        <GrassTuft key={i} position={[x, 0, z]} rotation={i} color={'#c9b46a'} />
      ))}

      <group position={[SIGN.x, 0, SIGN.z]} rotation={[0, 0.8, 0]}>
        <Signpost color={TOON.roofOrange} />
        <TBox size={[0.3, 0.07, 0.03]} radius={0.015} position={[0.2, 1.0, 0.05]} rotation={[0, 0, Math.PI / 4]} color={TOON.wallCream} castShadow={false} />
        <TBox size={[0.3, 0.07, 0.03]} radius={0.015} position={[0.2, 1.0, 0.05]} rotation={[0, 0, -Math.PI / 4]} color={TOON.wallCream} castShadow={false} />
      </group>
      <Lamp position={[LAMP.x, 0, LAMP.z]} />

      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef} facing={1.0}>
        <Roadrunner />
      </Npc>
    </group>
  )
}
