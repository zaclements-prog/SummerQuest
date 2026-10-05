import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Vector3 } from 'three'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { TOON } from '../../toon/palette'
import { geo } from '../../toon/geometry'
import { TBox, TCone, TCyl, TSphere, TTorus } from '../../toon/shapes'
import { Lamp, Signpost } from '../../toon/props'
import { ScatterBlobs, ToonInstances, type InstanceSpec } from '../../toon/Scatter'
import Knight from './tower-battlefront/Knight'
import { CANNONBALLS, CASTLE, CATAPULT, CORNERS, KEEP, LAMP, SIGN, TOWER_R } from './tower-battlefront/layout'
import { Decal } from './fraction-falls/kit'
import { blobDisc } from './fraction-falls/shapes'

const WALL = TOON.stone
const TOWER = TOON.wallCream
const ROOFS = [TOON.roofBlue, TOON.roofRed, TOON.roofRed, TOON.roofBlue]
const PENNANTS = [TOON.flowerYellow, TOON.mint, TOON.flowerYellow, TOON.mint]
const CANNONBALL = '#6b7385'

const X0 = CASTLE.x - CASTLE.w / 2
const X1 = CASTLE.x + CASTLE.w / 2
const Z0 = CASTLE.z - CASTLE.d / 2
const Z1 = CASTLE.z + CASTLE.d / 2
const WALL_T = 0.5
const TOWER_H = 3.2

/** A small triangular pennant on a pole top, flapping gently in the sea breeze. */
function Pennant({ color, position, phase = 0 }: { color: string; position: [number, number, number]; phase?: number }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.elapsedTime * 2.2 + phase) * 0.35
  })
  return (
    <group ref={ref} position={position}>
      <TCone radius={0.26} height={0.78} segments={3} position={[0.39, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 1, 0.14]} color={color} castShadow={false} />
    </group>
  )
}

/** A warm glowing arched window facing local +z. */
function GlowWindow({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <TBox size={[0.34, 0.52, 0.06]} radius={0.12} color={TOON.woodDark} castShadow={false} />
      <TBox size={[0.24, 0.42, 0.07]} radius={0.1} position={[0, 0, 0.012]} color={TOON.windowGlow} emissive={TOON.windowGlow} emissiveIntensity={0.55} castShadow={false} />
    </group>
  )
}

/** A round tower with a cone roof, a gold finial and a pennant on a pole. */
function Tower({ x, z, r, h, roof, roofH, pennant, phase = 0 }: { x: number; z: number; r: number; h: number; roof: string; roofH: number; pennant: string; phase?: number }) {
  // the window faces the camera (+x, +z)
  const wa = Math.PI / 4
  return (
    <group position={[x, 0, z]}>
      <TCyl radiusTop={r * 0.94} radiusBottom={r} height={h} position={[0, h / 2, 0]} color={TOWER} outline segments={14} receiveShadow />
      <TCyl radiusTop={r * 1.12} height={0.26} position={[0, h, 0]} color={TOON.stoneDark} segments={14} />
      <TCone radius={r * 1.32} height={roofH} position={[0, h + 0.13 + roofH / 2, 0]} color={roof} outline segments={12} />
      <TSphere position={[0, h + 0.13 + roofH + 0.04, 0]} scale={0.1} color={TOON.gold} castShadow={false} />
      <TCyl radiusTop={0.03} height={0.75} position={[0, h + roofH + 0.5, 0]} color={TOON.woodDark} castShadow={false} segments={5} />
      <Pennant color={pennant} position={[0, h + roofH + 0.72, 0]} phase={phase} />
      <GlowWindow position={[Math.sin(wa) * (r * 0.97), h * 0.62, Math.cos(wa) * (r * 0.97)]} rotation={wa} />
    </group>
  )
}

/** The gate on the east wall: a stone gatehouse with a closed, arched wooden door and two banners. */
function Gate() {
  const z = CASTLE.z
  const face = X1 + WALL_T / 2
  return (
    <group>
      <TBox size={[0.9, 2.35, 2.1]} radius={0.12} position={[X1 + 0.15, 1.175, z]} color={WALL} outline />
      {/* door: a rectangle + a disc on top makes the arch */}
      <TBox size={[0.12, 1.15, 1.1]} radius={0.04} position={[X1 + 0.6, 0.6, z]} color={TOON.wood} castShadow={false} />
      <TCyl radiusTop={0.55} height={0.12} position={[X1 + 0.6, 1.17, z]} rotation={[0, 0, Math.PI / 2]} color={TOON.wood} castShadow={false} segments={16} />
      <TTorus radius={0.62} tube={0.1} position={[X1 + 0.6, 1.17, z]} rotation={[0, Math.PI / 2, 0]} color={TOON.stoneDark} castShadow={false} segments={20} />
      {[-0.19, 0.19].map((dz) => (
        <TBox key={dz} size={[0.13, 1.55, 0.035]} radius={0.01} position={[X1 + 0.6, 0.8, z + dz]} color={TOON.woodDark} castShadow={false} />
      ))}
      {[0.35, 0.95].map((y) => (
        <TBox key={y} size={[0.14, 0.07, 1.12]} radius={0.02} position={[X1 + 0.61, y, z]} color={TOON.metal} castShadow={false} />
      ))}
      <TTorus radius={0.07} tube={0.018} position={[X1 + 0.68, 0.62, z + 0.3]} rotation={[0, Math.PI / 2, 0]} color={TOON.gold} castShadow={false} segments={12} />

      {/* hanging banners either side of the gatehouse */}
      {[-1, 1].map((s) => (
        <group key={s} position={[face + 0.04, 0, z + s * 1.55]}>
          <TBox size={[0.05, 0.8, 0.5]} radius={0.02} position={[0, 1.18, 0]} color={s < 0 ? TOON.roofBlue : TOON.roofRed} outline />
          <TCone radius={0.36} height={0.28} segments={4} position={[0, 0.66, 0]} rotation={[Math.PI, Math.PI / 4, 0]} scale={[0.1, 1, 0.98]} color={s < 0 ? TOON.roofBlue : TOON.roofRed} castShadow={false} />
          <TCyl radiusTop={0.12} height={0.03} position={[0.035, 1.2, 0]} rotation={[0, 0, Math.PI / 2]} color={TOON.gold} castShadow={false} segments={12} />
        </group>
      ))}
    </group>
  )
}

/** A wooden toy catapult (local +z = throw direction) with a cannonball in its cup. */
function Catapult() {
  return (
    <group position={[CATAPULT.x, 0, CATAPULT.z]} rotation={[0, CATAPULT.yaw, 0]}>
      {[-1, 1].map((s) => (
        <group key={s}>
          <TBox size={[0.15, 0.15, 1.35]} radius={0.04} position={[s * 0.36, 0.27, 0]} color={TOON.wood} />
          {[-0.45, 0.45].map((z) => (
            <TCyl key={z} radiusTop={0.24} height={0.1} position={[s * 0.47, 0.24, z]} rotation={[0, 0, Math.PI / 2]} color={TOON.woodDark} segments={12} />
          ))}
          <TBox size={[0.13, 0.78, 0.13]} radius={0.04} position={[s * 0.3, 0.62, 0.18]} rotation={[0.15, 0, 0]} color={TOON.wood} />
        </group>
      ))}
      {[-0.5, 0.5].map((z) => (
        <TBox key={z} size={[0.86, 0.12, 0.13]} radius={0.04} position={[0, 0.27, z]} color={TOON.woodLight} castShadow={false} />
      ))}
      <TBox size={[0.74, 0.12, 0.12]} radius={0.04} position={[0, 0.98, 0.24]} color={TOON.woodLight} />
      <TCyl radiusTop={0.07} height={0.62} position={[0, 0.98, 0.31]} rotation={[0, 0, Math.PI / 2]} color={TOON.coral} castShadow={false} segments={8} />
      {/* the throwing arm, cocked back with its cup low behind */}
      <group position={[0, 0.52, -0.05]} rotation={[-0.42, 0, 0]}>
        <TBox size={[0.11, 0.11, 1.35]} radius={0.04} position={[0, 0, 0]} color={TOON.woodDark} outline />
        <TCyl radiusTop={0.19} radiusBottom={0.13} height={0.13} position={[0, 0.07, -0.66]} color={TOON.woodDark} segments={10} />
        <TSphere position={[0, 0.2, -0.66]} scale={0.14} color={CANNONBALL} />
      </group>
    </group>
  )
}

/** Toy castle on the south coast with siege toys outside its gate. */
export default function TowerBattlefront({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('tower-battlefront')!
  const npc = npcPosition(a)!
  const { merlons, balls, bushes, cobbles, flowers } = useMemo(() => {
    const merlons: InstanceSpec[] = []
    const y = CASTLE.wallH + 0.15
    const skip = TOWER_R + 0.2
    const run = (ax: number, az: number, bx: number, bz: number) => {
      const len = Math.hypot(bx - ax, bz - az)
      const usable = len - skip * 2
      const n = Math.max(2, Math.floor(usable / 0.62) + 1)
      for (let i = 0; i < n; i++) {
        const t = (skip + (usable * i) / (n - 1)) / len
        merlons.push({ x: ax + (bx - ax) * t, y, z: az + (bz - az) * t })
      }
    }
    run(X0, Z0, X1, Z0)
    run(X0, Z1, X1, Z1)
    run(X0, Z0, X0, Z1)
    run(X1, Z0, X1, Z1)
    // the gatehouse's own crenellation
    for (const dz of [-0.75, 0, 0.75]) merlons.push({ x: X1 + 0.15, y: 2.35 + 0.15, z: CASTLE.z + dz })

    const balls: InstanceSpec[] = []
    const R = 0.14
    const step = R * 2.02
    for (const [n, h] of [
      [3, 0],
      [2, 1],
      [1, 2],
    ] as const) {
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
          balls.push({ x: CANNONBALLS.x + (i - (n - 1) / 2) * step, y: R + h * R * 1.45, z: CANNONBALLS.z + (j - (n - 1) / 2) * step, s: R })
    }

    const bushes: InstanceSpec[] = []
    const spots: [number, number, number][] = [
      [X0 - 0.2, Z0 - 0.7, 0.45],
      [X0 + 1.4, Z0 - 0.55, 0.4],
      [X1 - 1.6, Z0 - 0.55, 0.42],
      [X1 + 0.55, Z0 + 1.2, 0.38],
      [X1 + 0.55, Z1 - 1.0, 0.42],
      [X1 + 0.9, Z1 + 0.2, 0.36],
      [X0 + 1.2, Z1 + 0.55, 0.45],
      [X0 - 0.7, CASTLE.z, 0.5],
    ]
    for (const [x, z, s] of spots) {
      bushes.push({ x, y: s * 0.75, z, s: [s * 1.3, s, s * 1.1], rot: x, color: TOON.leaf })
      bushes.push({ x: x + 0.3, y: s * 0.6, z: z + 0.18, s: s * 0.75, rot: z, color: TOON.leafLight })
    }

    // cobbles from the guide's stage to the gate apron
    const cobbles: InstanceSpec[] = []
    const path: [number, number][] = [
      [-9.35, 19.25],
      [-8.95, 20.05],
      [-8.75, 20.9],
      [-8.8, 21.75],
    ]
    path.forEach(([x, z], i) => cobbles.push({ x, y: 0.03, z, s: [0.34, 0.06, 0.3], rot: i * 0.9, color: i % 2 ? TOON.stone : TOON.stoneDark }))
    // flower dots in the grass either side of the gate
    const flowers: InstanceSpec[] = []
    const colors = [TOON.flowerRed, TOON.flowerYellow, TOON.flowerPink, TOON.flowerWhite]
    for (const [fx, fz] of [
      [X1 + 0.9, CASTLE.z - 1.9],
      [X1 + 0.95, CASTLE.z + 1.95],
      [X0 - 0.4, Z0 - 0.6],
    ]) {
      for (let i = 0; i < 6; i++) {
        const a = i * 2.4
        const d = 0.18 + (i % 3) * 0.17
        flowers.push({ x: fx + Math.cos(a) * d, y: 0.12, z: fz + Math.sin(a) * d, s: 0.075, color: colors[(i + Math.round(fx)) % colors.length] })
      }
    }
    return { merlons, balls, bushes, cobbles, flowers }
  }, [])

  return (
    <group>
      {/* walls: plinth, body, crenellation */}
      <TBox size={[CASTLE.w + 0.25, 0.3, WALL_T + 0.2]} radius={0.08} position={[CASTLE.x, 0.15, Z0]} color={TOON.stoneDark} castShadow={false} />
      <TBox size={[CASTLE.w + 0.25, 0.3, WALL_T + 0.2]} radius={0.08} position={[CASTLE.x, 0.15, Z1]} color={TOON.stoneDark} castShadow={false} />
      <TBox size={[WALL_T + 0.2, 0.3, CASTLE.d + 0.25]} radius={0.08} position={[X0, 0.15, CASTLE.z]} color={TOON.stoneDark} castShadow={false} />
      <TBox size={[WALL_T + 0.2, 0.3, CASTLE.d + 0.25]} radius={0.08} position={[X1, 0.15, CASTLE.z]} color={TOON.stoneDark} castShadow={false} />
      <TBox size={[CASTLE.w, CASTLE.wallH, WALL_T]} radius={0.1} position={[CASTLE.x, CASTLE.wallH / 2, Z0]} color={WALL} outline receiveShadow />
      <TBox size={[CASTLE.w, CASTLE.wallH, WALL_T]} radius={0.1} position={[CASTLE.x, CASTLE.wallH / 2, Z1]} color={WALL} outline receiveShadow />
      <TBox size={[WALL_T, CASTLE.wallH, CASTLE.d]} radius={0.1} position={[X0, CASTLE.wallH / 2, CASTLE.z]} color={WALL} outline receiveShadow />
      <TBox size={[WALL_T, CASTLE.wallH, CASTLE.d]} radius={0.1} position={[X1, CASTLE.wallH / 2, CASTLE.z]} color={WALL} outline receiveShadow />
      <ToonInstances geometry={geo.box(0.4, 0.34, 0.4, 0.08)} color={WALL} items={merlons} />

      {/* towers and keep */}
      {CORNERS.map(([x, z], i) => (
        <Tower key={i} x={x} z={z} r={TOWER_R} h={TOWER_H} roof={ROOFS[i]} roofH={1.9} pennant={PENNANTS[i]} phase={i * 1.3} />
      ))}
      <Tower x={KEEP.x} z={KEEP.z} r={KEEP.r} h={4.7} roof={TOON.roofPlum} roofH={2.3} pennant={TOON.coral} phase={5.2} />
      <GlowWindow position={[KEEP.x + Math.sin(Math.PI / 4) * KEEP.r * 0.97, 1.6, KEEP.z + Math.cos(Math.PI / 4) * KEEP.r * 0.97]} rotation={Math.PI / 4} />

      <Gate />
      <Decal geometry={blobDisc(1.25, 0.12, 62)} color={TOON.stoneDark} position={[X1 + 1.25, 0.014, CASTLE.z]} scale={[1, 1, 1.25]} />
      <Decal geometry={blobDisc(1.0, 0.12, 62)} color={TOON.stone} position={[X1 + 1.25, 0.016, CASTLE.z]} scale={[1, 1, 1.25]} />
      <ToonInstances geometry={geo.cyl(1, 1, 1, 9)} color={TOON.white} items={cobbles} castShadow={false} receiveShadow />

      {/* siege toys */}
      <Catapult />
      <ToonInstances geometry={geo.sphere(10)} color={CANNONBALL} items={balls} />

      <ScatterBlobs items={bushes} />
      <ToonInstances geometry={geo.sphere(6)} color={TOON.white} items={flowers} castShadow={false} />

      <group position={[SIGN.x, 0, SIGN.z]} rotation={[0, 0.5, 0]}>
        <Signpost color={TOON.roofBlue} />
        <TCyl radiusTop={0.13} height={0.03} position={[0.2, 1.0, 0.05]} rotation={[Math.PI / 2, 0, 0]} color={TOON.roofRed} castShadow={false} segments={12} />
      </group>
      <Lamp position={[LAMP.x, 0, LAMP.z]} />

      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef} facing={0.75}>
        <Knight />
      </Npc>
    </group>
  )
}
