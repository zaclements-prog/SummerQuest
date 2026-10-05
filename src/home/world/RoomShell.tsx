import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three'
import type { Group } from 'three'
import { GRID_SIZE, TILE } from '../../lib/home/grid'
import { seededRng } from '../../lib/random'
import { geo } from '../../toon/geometry'
import { toonMaterial } from '../../toon/materials'
import { TOON } from '../../toon/palette'
import { ToonInstances, type InstanceSpec } from '../../toon/Scatter'
import { TBox, TCapsule, TCyl, TSphere, type Vec3 } from '../../toon/shapes'
import { fgeo } from '../models/furniture/_geo'
import { Ol, TGeo } from '../models/furniture/_kit'

// ── Room metrics ─────────────────────────────────────────────────────────────
// 10×10 tiles, floor top at y = 0, centered on the origin. The two back walls'
// inner faces sit exactly on x = −H and z = −H, so every tile stays usable and
// TileGrid's raycast plane (its own invisible mesh) is unaffected.
const SIZE = GRID_SIZE * TILE
const H = SIZE / 2
const WALL_H = 3.0
const T = 0.3 // wall thickness (outward from the inner face)
const BASE = 0.42 // diorama plinth under the floor
const WAIN_H = 1.0 // wainscot / chair-rail height

const C = {
  wall: '#fde3d3',
  wain: '#cdeadf',
  groove: '#b2d9c9',
  trim: '#fffaf2',
  plinth: '#c99263',
  gap: '#9c6740',
  planks: ['#e9b87e', '#dfaa6f', '#efc590'],
  starA: '#ffffff',
  starB: '#ffe7a6',
  curtain: '#f7a8c4',
  curtainLight: '#fbc4d6',
  sky: '#a8dcff',
}

// ── Floor planks: staggered boards in four lengths, instanced per length ─────
const PITCH = 0.5 // board width incl. gap
const GAP = 0.024
const BOARD = 2.5
const LENGTHS = [0.625, 1.25, 1.875, 2.5]
const PLANKS: Record<number, InstanceSpec[]> = (() => {
  const r = seededRng('home-floor')
  const out: Record<number, InstanceSpec[]> = { 0.625: [], 1.25: [], 1.875: [], 2.5: [] }
  let prev = -1
  for (let row = 0; row < SIZE / PITCH; row++) {
    let k = Math.floor(r() * 4)
    if (k === prev) k = (k + 1 + Math.floor(r() * 3)) % 4
    prev = k
    const o = k * 0.625
    const pieces = o > 0 ? [o, BOARD, BOARD, BOARD, BOARD - o] : [BOARD, BOARD, BOARD, BOARD]
    const z = -H + PITCH / 2 + row * PITCH
    let x = -H
    for (const len of pieces) {
      out[len].push({ x: x + len / 2, y: -0.04, z, color: C.planks[Math.floor(r() * C.planks.length)] })
      x += len
    }
  }
  return out
})()

function Floor() {
  return (
    <group>
      {LENGTHS.map((len) => (
        <ToonInstances key={len} geometry={geo.box(len - GAP, 0.08, PITCH - GAP, 0.022)} color={TOON.white} items={PLANKS[len]} castShadow={false} receiveShadow />
      ))}
      {/* dark underlay shows through the gaps between boards */}
      <TBox size={[SIZE, 0.06, SIZE]} radius={0.01} position={[0, -0.05, 0]} color={C.gap} castShadow={false} />
      {/* the room sits on a chunky plinth, like a dollhouse */}
      <TBox size={[SIZE + T, BASE, SIZE + T]} radius={0.06} position={[-T / 2, -0.08 - BASE / 2, -T / 2]} color={C.plinth} castShadow={false}>
        <Ol />
      </TBox>
    </group>
  )
}

// ── Wall decoration helpers ──────────────────────────────────────────────────
// Everything is authored for the back wall (inner face on z = −H, facing +z) in
// "wall coordinates" u (along the wall, = x) and y. The left wall reuses the
// same pieces rotated a quarter turn, so u runs along −z there.

/** Star wallpaper on the upper wall, skipping the rectangles in `skip` ([u0, u1, y0, y1]). */
function starsFor(salt: string, skip: [number, number, number, number][], yaw: number, toWorld: (u: number, y: number) => Vec3): InstanceSpec[] {
  const r = seededRng(`stars:${salt}`)
  const out: InstanceSpec[] = []
  for (let row = 0; row < 3; row++) {
    const y = WAIN_H + 0.42 + row * 0.56
    for (let col = 0; col < 13; col++) {
      const u = -H + 0.42 + col * 0.76 + (row % 2) * 0.38 + (r() - 0.5) * 0.12
      if (u > H - 0.25) continue
      if (skip.some(([u0, u1, y0, y1]) => u > u0 && u < u1 && y > y0 && y < y1)) continue
      const [x, , z] = toWorld(u, y)
      out.push({ x, y: y + (r() - 0.5) * 0.1, z, s: 0.8 + r() * 0.45, rot: yaw, color: (row + col) % 2 ? C.starA : C.starB })
    }
  }
  return out
}

const grooves = (yaw: number, toWorld: (u: number) => [number, number]): InstanceSpec[] =>
  Array.from({ length: 29 }, (_, i) => {
    const [x, z] = toWorld(-H + (i + 1) * (SIZE / 30))
    return { x, y: 0.18 + (WAIN_H - 0.22) / 2, z, rot: yaw }
  })

/** Baseboard, wainscot with beadboard grooves, chair rail — along the back wall, from u0 to H. */
function WallTrim({ u0 }: { u0: number }) {
  const len = H - u0
  const mid = (u0 + H) / 2
  return (
    <group>
      <TBox size={[len, WAIN_H, 0.03]} radius={0.01} position={[mid, WAIN_H / 2, -H + 0.015]} color={C.wain} castShadow={false} receiveShadow />
      <TBox size={[len, 0.18, 0.06]} radius={0.02} position={[mid, 0.09, -H + 0.03]} color={C.trim} castShadow={false} receiveShadow />
      <TBox size={[len, 0.08, 0.07]} radius={0.025} position={[mid, WAIN_H, -H + 0.035]} color={C.trim} castShadow={false} receiveShadow />
    </group>
  )
}

// ── Window with curtains (back wall) ─────────────────────────────────────────
const WIN_U = 1.0
const WIN_Y = 1.92 // center
const WIN_W = 1.7
const WIN_HT = 1.25
const PLEATS = [-0.13, 0, 0.13]
const SCALLOPS = Array.from({ length: 7 }, (_, i) => -1.05 + i * 0.35)

function Window() {
  const z0 = -H
  const bottom = WIN_Y - WIN_HT / 2 + 0.1
  return (
    <group position={[WIN_U, 0, 0]}>
      {/* sky glow and a sunny view */}
      <TBox size={[WIN_W - 0.18, WIN_HT - 0.18, 0.02]} radius={0.006} position={[0, WIN_Y, z0 + 0.012]} color={C.sky} emissive={C.sky} emissiveIntensity={0.6} castShadow={false} />
      <TGeo geometry={fgeo.disc(0.15)} position={[0.45, WIN_Y + 0.28, z0 + 0.024]} color={TOON.gold} emissive={TOON.gold} emissiveIntensity={0.7} castShadow={false} />
      {[
        [-0.45, 0.24, 0.12],
        [-0.3, 0.27, 0.15],
        [-0.15, 0.24, 0.11],
      ].map(([u, dy, r]) => (
        <TGeo key={u} geometry={fgeo.disc(r)} position={[u, WIN_Y + dy, z0 + 0.026]} color={TOON.white} emissive={TOON.white} emissiveIntensity={0.55} castShadow={false} />
      ))}
      <TGeo geometry={fgeo.halfDisc(0.5)} position={[-0.3, bottom, z0 + 0.03]} color={TOON.grassLight} emissive={TOON.grassLight} emissiveIntensity={0.45} castShadow={false} />
      <TGeo geometry={fgeo.halfDisc(0.38)} position={[0.4, bottom, z0 + 0.034]} color={TOON.grass} emissive={TOON.grass} emissiveIntensity={0.45} castShadow={false} />
      {/* frame, mullions, sill */}
      <TBox size={[WIN_W, 0.11, 0.07]} radius={0.025} position={[0, WIN_Y + WIN_HT / 2 - 0.055, z0 + 0.035]} color={C.trim}>
        <Ol />
      </TBox>
      <TBox size={[WIN_W, 0.11, 0.07]} radius={0.025} position={[0, WIN_Y - WIN_HT / 2 + 0.055, z0 + 0.035]} color={C.trim}>
        <Ol />
      </TBox>
      {[-1, 1].map((s) => (
        <TBox key={s} size={[0.11, WIN_HT, 0.07]} radius={0.025} position={[s * (WIN_W / 2 - 0.055), WIN_Y, z0 + 0.035]} color={C.trim}>
          <Ol />
        </TBox>
      ))}
      <TBox size={[0.06, WIN_HT - 0.1, 0.05]} radius={0.015} position={[0, WIN_Y, z0 + 0.04]} color={C.trim} castShadow={false} />
      <TBox size={[WIN_W - 0.1, 0.06, 0.05]} radius={0.015} position={[0, WIN_Y + 0.05, z0 + 0.04]} color={C.trim} castShadow={false} />
      <TBox size={[WIN_W + 0.2, 0.07, 0.09]} radius={0.025} position={[0, WIN_Y - WIN_HT / 2 - 0.02, z0 + 0.045]} color={C.trim} castShadow={false} />

      {/* pleated curtains with tie-backs */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (WIN_W / 2 + 0.06), 0, z0 + 0.05]}>
          {PLEATS.map((du, i) => (
            <TCapsule key={du} radius={0.075} length={1.22} position={[du, 1.98, 0]} scale={[1, 1, 0.55]} color={i === 1 ? C.curtainLight : C.curtain} segments={10} castShadow={false} />
          ))}
          <TBox size={[0.44, 0.07, 0.1]} radius={0.03} position={[0, 1.66, 0.01]} color={TOON.flowerYellow} castShadow={false} />
        </group>
      ))}
      {/* scalloped valance */}
      <TBox size={[2.3, 0.2, 0.08]} radius={0.035} position={[0, 2.7, z0 + 0.06]} color={C.curtain}>
        <Ol />
      </TBox>
      {SCALLOPS.map((u) => (
        <TSphere key={u} position={[u, 2.6, z0 + 0.06]} scale={[0.17, 0.09, 0.04]} color={C.curtain} segments={10} castShadow={false} />
      ))}
      {[-1, 1].map((s) => (
        <TSphere key={s} position={[s * 1.2, 2.7, z0 + 0.07]} scale={0.07} color={TOON.wood} segments={10} castShadow={false} />
      ))}
    </group>
  )
}

// ── Wall clock (back wall) ───────────────────────────────────────────────────
const CLOCK_U = -2.6
const CLOCK_Y = 2.1
function Clock() {
  const z0 = -H
  return (
    <group position={[CLOCK_U, CLOCK_Y, z0]}>
      <TCyl radiusTop={0.34} height={0.08} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.04]} color={TOON.coral} segments={24}>
        <Ol />
      </TCyl>
      <TCyl radiusTop={0.28} height={0.02} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.085]} color={C.trim} segments={24} castShadow={false} />
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2
        return <TSphere key={i} position={[Math.sin(a) * 0.21, Math.cos(a) * 0.21, 0.098]} scale={0.028} color={TOON.roofBlue} segments={6} castShadow={false} />
      })}
      <TBox size={[0.04, 0.17, 0.015]} radius={0.007} position={[0, 0.07, 0.1]} color={TOON.outline} castShadow={false} />
      <TBox size={[0.13, 0.04, 0.015]} radius={0.007} position={[0.055, 0, 0.105]} color={TOON.outline} castShadow={false} />
      <TSphere position={[0, 0, 0.11]} scale={0.03} color={TOON.gold} segments={8} castShadow={false} />
    </group>
  )
}

// ── Left wall: bunting garland + a rainbow picture ───────────────────────────
const FLAG_COLORS = [TOON.coral, TOON.flowerYellow, TOON.mint, TOON.sky, TOON.flowerPink, TOON.lilac]
const SWAGS: [number, number][] = [
  [-4.6, -0.1],
  [-0.1, 4.6],
]
const BUNT_TOP = 2.86
const SAG = 0.3
const buntY = (u: number, [a, b]: [number, number]) => {
  const t = (2 * u - a - b) / (b - a)
  return BUNT_TOP - SAG * (1 - t * t)
}
const buntSlope = (u: number, [a, b]: [number, number]) => (SAG * 2 * ((2 * u - a - b) / (b - a)) * 2) / (b - a)
const FLAGS = SWAGS.flatMap((sw, k) =>
  Array.from({ length: 6 }, (_, i) => {
    const u = sw[0] + ((i + 0.5) / 6) * (sw[1] - sw[0])
    return { u, y: buntY(u, sw), tilt: Math.atan(buntSlope(u, sw)), color: FLAG_COLORS[(i + k * 3) % FLAG_COLORS.length] }
  }),
)
// The string, as one tube (wall coordinates: x = u along the wall).
const BUNT_STRING = (() => {
  const pts: Vector3[] = []
  SWAGS.forEach((sw, k) => {
    for (let i = k === 0 ? 0 : 1; i <= 12; i++) {
      const u = sw[0] + (i / 12) * (sw[1] - sw[0])
      pts.push(new Vector3(u, buntY(u, sw), 0))
    }
  })
  return new TubeGeometry(new CatmullRomCurve3(pts), 64, 0.014, 4, false)
})()

const PIC_U = -2.2 // along the left wall (wall coords; world z = +2.2)
const PIC_Y = 1.72
const RAINBOW = [
  [0.34, TOON.coral],
  [0.27, TOON.flowerYellow],
  [0.2, TOON.sky],
] as const

/** Decorations for the left wall, authored in back-wall coordinates. */
function LeftWallDecor() {
  const z0 = -H
  return (
    <group>
      <mesh geometry={BUNT_STRING} material={toonMaterial(C.trim)} position={[0, 0, z0 + 0.04]} />
      {FLAGS.map((f) => (
        <TGeo key={f.u} geometry={fgeo.pennant(0.27, 0.3)} position={[f.u, f.y, z0 + 0.045]} rotation={[0, 0, f.tilt]} color={f.color} castShadow={false} />
      ))}
      {/* framed rainbow picture */}
      <group position={[PIC_U, PIC_Y, z0]}>
        <TBox size={[1.2, 0.9, 0.07]} radius={0.04} position={[0, 0, 0.035]} color={TOON.flowerYellow}>
          <Ol />
        </TBox>
        <TBox size={[1.02, 0.72, 0.02]} radius={0.01} position={[0, 0, 0.07]} color={C.trim} castShadow={false} />
        {RAINBOW.map(([r, c]) => (
          <TGeo key={r} geometry={fgeo.arc(r, 0.036, Math.PI, 20)} position={[0, -0.2, 0.085]} scale={[1, 1, 0.4]} color={c} castShadow={false} />
        ))}
        {[-1, 1].map((s) => (
          <TSphere key={s} position={[s * 0.27, -0.21, 0.09]} scale={[0.11, 0.07, 0.03]} color={TOON.white} segments={10} castShadow={false} />
        ))}
        <TGeo geometry={fgeo.disc(0.07)} position={[0.36, 0.2, 0.081]} color={TOON.gold} castShadow={false} />
      </group>
    </group>
  )
}

// ── Two small framed pictures: a sailboat (back wall) and a 1-2-3 counting poster (left wall)
const BOAT_U = 3.7
const BOAT_Y = 1.8
function SailboatPicture() {
  const z0 = -H
  return (
    <group position={[BOAT_U, BOAT_Y, z0]}>
      <TBox size={[0.8, 0.68, 0.06]} radius={0.035} position={[0, 0, 0.03]} color={TOON.mint}>
        <Ol />
      </TBox>
      <TBox size={[0.64, 0.52, 0.02]} radius={0.01} position={[0, 0, 0.06]} color={'#eaf6ff'} castShadow={false} />
      <TBox size={[0.64, 0.13, 0.02]} radius={0.01} position={[0, -0.195, 0.068]} color={TOON.sky} castShadow={false} />
      <TBox size={[0.3, 0.07, 0.02]} radius={0.025} position={[-0.02, -0.11, 0.078]} color={TOON.coral} castShadow={false} />
      <TGeo geometry={fgeo.pennant(0.2, 0.26)} position={[-0.06, -0.07, 0.08]} rotation={[0, 0, Math.PI]} color={TOON.white} castShadow={false} />
      <TGeo geometry={fgeo.pennant(0.12, 0.18)} position={[0.06, -0.07, 0.08]} rotation={[0, 0, Math.PI]} color={TOON.flowerYellow} castShadow={false} />
      <TGeo geometry={fgeo.disc(0.06)} position={[0.2, 0.15, 0.072]} color={TOON.gold} castShadow={false} />
    </group>
  )
}

const COUNT_U = 2.7 // left wall (world z = −2.7)
const COUNT_Y = 1.62
const COUNT_DOTS: [number, number, string][] = [
  [-0.27, 0, TOON.coral],
  [0, 0.07, TOON.sky],
  [0, -0.07, TOON.sky],
  [0.27, 0.1, TOON.mint],
  [0.27, 0, TOON.mint],
  [0.27, -0.1, TOON.mint],
]
function CountingPoster() {
  const z0 = -H
  return (
    <group position={[COUNT_U, COUNT_Y, z0]}>
      <TBox size={[0.96, 0.56, 0.06]} radius={0.035} position={[0, 0, 0.03]} color={TOON.lilac}>
        <Ol />
      </TBox>
      <TBox size={[0.84, 0.44, 0.02]} radius={0.01} position={[0, 0, 0.06]} color={C.trim} castShadow={false} />
      {COUNT_DOTS.map(([u, y, c]) => (
        <TGeo key={`${u},${y}`} geometry={fgeo.disc(0.045, 14)} position={[u, y, 0.072]} color={c} castShadow={false} />
      ))}
    </group>
  )
}

// Star wallpaper instances, kept clear of the window, clock and pictures.
const BACK_STARS = starsFor('back', [[WIN_U - 1.35, WIN_U + 1.35, 1.0, 3.0], [CLOCK_U - 0.5, CLOCK_U + 0.5, 1.5, 2.7], [BOAT_U - 0.55, BOAT_U + 0.55, 1.3, 2.3]], 0, (u, y) => [u, y, -H + 0.004])
const LEFT_STARS = starsFor('left', [[PIC_U - 0.75, PIC_U + 0.75, 1.2, 2.3], [COUNT_U - 0.65, COUNT_U + 0.65, 1.2, 2.05], [-H, H, 2.3, 3.0]], Math.PI / 2, (u, y) => [-H + 0.004, y, -u])
const BACK_GROOVES = grooves(0, (u) => [u, -H + 0.032])
const LEFT_GROOVES = grooves(0, (u) => [-H + 0.032, u])

/**
 * The Home room: a toon kid's bedroom diorama. Honey wood planks on a chunky
 * plinth, two painted walls (mint beadboard, star wallpaper, white trim) with a
 * curtained window, a clock, bunting and a rainbow picture. A back wall hides
 * itself while the camera is behind it, so the room never blocks the view.
 */
export default function RoomShell() {
  const left = useRef<Group>(null)
  const back = useRef<Group>(null)
  useFrame(({ camera }) => {
    if (left.current) left.current.visible = camera.position.x > -H + 0.2
    if (back.current) back.current.visible = camera.position.z > -H + 0.2
  })

  return (
    <group>
      <Floor />

      {/* back wall (−z): from the left wall's inner face to the open +x edge */}
      <group ref={back}>
        <TBox size={[SIZE, WALL_H + 0.5, T]} radius={0.05} position={[0, (WALL_H - 0.5) / 2, -H - T / 2]} color={C.wall} castShadow={false} receiveShadow>
          <Ol />
        </TBox>
        <TBox size={[SIZE, 0.14, T + 0.12]} radius={0.05} position={[0.06, WALL_H + 0.02, -H - T / 2]} color={C.trim} castShadow={false}>
          <Ol />
        </TBox>
        <WallTrim u0={-H + 0.07} />
        <ToonInstances geometry={geo.box(0.03, WAIN_H - 0.3, 0.012, 0.005)} color={C.groove} items={BACK_GROOVES} castShadow={false} />
        <ToonInstances geometry={fgeo.star(0.09)} color={TOON.white} items={BACK_STARS} castShadow={false} />
        <Window />
        <Clock />
        <SailboatPicture />
      </group>

      {/* left wall (−x): covers the back corner; decor authored in wall coords, turned a quarter */}
      <group ref={left}>
        <TBox size={[T, WALL_H + 0.5, SIZE + T]} radius={0.05} position={[-H - T / 2, (WALL_H - 0.5) / 2, -T / 2]} color={C.wall} castShadow={false} receiveShadow>
          <Ol />
        </TBox>
        <TBox size={[T + 0.12, 0.14, SIZE + T + 0.12]} radius={0.05} position={[-H - T / 2, WALL_H + 0.02, -T / 2]} color={C.trim} castShadow={false}>
          <Ol />
        </TBox>
        <group rotation={[0, Math.PI / 2, 0]}>
          <WallTrim u0={-H} />
          <LeftWallDecor />
          <CountingPoster />
        </group>
        <ToonInstances geometry={geo.box(0.012, WAIN_H - 0.3, 0.03, 0.005)} color={C.groove} items={LEFT_GROOVES} castShadow={false} />
        <ToonInstances geometry={fgeo.star(0.09)} color={TOON.white} items={LEFT_STARS} castShadow={false} />
      </group>
    </group>
  )
}
