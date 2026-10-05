import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Vector3 } from 'three'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { TOON } from '../../toon/palette'
import { TBlob, TBox, TCone, TCyl, TSphere } from '../../toon/shapes'
import { Bush, Lamp, Log, Signpost, Stump, Tree } from '../../toon/props'
import { ToonInstances, type InstanceSpec } from '../../toon/Scatter'
import { geo } from '../../toon/geometry'
import { seededRng } from '../../lib/random'
import Beaver from './fraction-falls/Beaver'
import { Decal, PieDisc } from './fraction-falls/kit'
import { blobDisc, fernGeometry } from './fraction-falls/shapes'
import { FALLS, LAMP, LOGS, POOL, POOL_LOCAL, SIGN, STUMP, WET_ROCKS, fallsToWorld } from './fraction-falls/layout'

const FALL_WATER = '#b5ecfa'
const WET_ROCK = '#a7b2c4'
const WET_ROCK_DARK = '#919db3'
const PIE_A = TOON.flowerYellow
const PIE_B = TOON.coral

/**
 * One falling stream: a soft water column with a bright band sliding down it and
 * a foam puff where it lands. `width` is the visible fraction of the whole.
 */
function Stream({ x, z, top, bottom, width, speed = 1.6, phase = 0 }: { x: number; z: number; top: number; bottom: number; width: number; speed?: number; phase?: number }) {
  const band = useRef<Group>(null)
  const foam = useRef<Group>(null)
  const h = top - bottom
  const travel = Math.max(0.01, h - 0.24)
  useFrame(({ clock }) => {
    if (band.current) band.current.position.y = top - 0.12 - ((clock.elapsedTime * speed + phase) % 1) * travel
    if (foam.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 5 + phase * 7) * 0.12
      foam.current.scale.set(s, 1, s)
    }
  })
  const depth = 0.16
  return (
    <group>
      <TBox size={[width, h, depth]} radius={Math.min(width, depth) * 0.45} position={[x, bottom + h / 2, z]} color={FALL_WATER} castShadow={false} />
      <group ref={band} position={[x, top, z + depth / 2]}>
        <TBox size={[width * 0.5, 0.18, 0.05]} radius={0.02} color={'#effdff'} castShadow={false} />
      </group>
      <group ref={foam} position={[x, bottom + 0.04, z + 0.08]}>
        <TBlob scale={[width * 0.5 + 0.12, 0.09, 0.2]} color={TOON.foam} castShadow={false} />
      </group>
    </group>
  )
}

/** A round stone basin with a water top (local falls frame). */
function Basin({ x, y, z, r }: { x: number; y: number; z: number; r: number }) {
  return (
    <group position={[x, y, z]}>
      <TCyl radiusTop={r} radiusBottom={r * 0.85} height={0.36} color={TOON.stone} outline segments={14} receiveShadow />
      <TCyl radiusTop={r * 0.82} height={0.05} position={[0, 0.17, 0]} color={TOON.water} castShadow={false} segments={14} />
    </group>
  )
}

/** A fraction badge set into the rock: a stone disc with the pie cut into `parts`. */
function Badge({ parts, position }: { parts: number; position: [number, number, number] }) {
  return (
    <group position={position}>
      <TCyl radiusTop={0.44} height={0.12} rotation={[Math.PI / 2, 0, 0]} color={TOON.stone} outline segments={18} />
      <PieDisc parts={parts} radius={0.34} height={0.07} gap={0.035} colors={parts === 1 ? [PIE_A] : [PIE_A, PIE_B]} position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  )
}

/**
 * The tiered falls in their local frame: one whole stream → a basin that spills
 * into two half streams → two basins that each spill into two quarter streams →
 * the plunge pool. Badges on the rock spell out 1 → ½ → ¼.
 */
function Falls() {
  return (
    <group position={[FALLS.x, 0, FALLS.z]} rotation={[0, FALLS.yaw, 0]}>
      {/* the cliff: a big rounded rock mass with shoulders and grassy tops */}
      <TBlob position={[0, 2.3, -1.6]} scale={[3.0, 2.95, 1.75]} color={'#c6c5cb'} outline />
      <TBlob position={[-2.45, 1.55, -0.95]} scale={[1.75, 2.0, 1.55]} color={TOON.rockLight} outline />
      <TBlob position={[2.45, 1.35, -0.95]} scale={[1.7, 1.8, 1.55]} color={'#b3b6c1'} outline />
      <TBlob position={[0, 4.95, -1.65]} scale={[2.35, 0.5, 1.35]} color={TOON.grass} />
      <TBlob position={[-2.55, 3.35, -1.05]} scale={[1.35, 0.42, 1.15]} color={TOON.grassLight} />
      <TBlob position={[2.5, 2.98, -1.05]} scale={[1.35, 0.42, 1.15]} color={TOON.grass} />
      <Tree variant="pine" position={[-1.1, 5.0, -2.1]} scale={0.95} seed={31} />
      <Bush position={[1.3, 5.05, -1.7]} scale={0.9} seed={32} />

      {/* framing boulders at the foot of the cliff (wet, so a little blue) */}
      <TBlob position={[-2.75, 0.5, 1.0]} scale={[1.1, 0.95, 1.0]} color={WET_ROCK} outline />
      <TBlob position={[2.75, 0.45, 1.0]} scale={[1.05, 0.85, 1.0]} color={WET_ROCK_DARK} outline />
      <TBlob position={[-2.8, 1.33, 0.9]} scale={[0.72, 0.2, 0.62]} color={TOON.grassLight} castShadow={false} />
      <TBlob position={[2.8, 1.2, 0.9]} scale={[0.66, 0.2, 0.56]} color={TOON.grass} castShadow={false} />

      {/* spout ledge at the top */}
      <TBox size={[1.35, 0.3, 1.0]} radius={0.12} position={[0, 4.72, -0.25]} color={TOON.stone} outline />
      <TBox size={[1.05, 0.06, 0.7]} radius={0.025} position={[0, 4.88, -0.2]} color={TOON.water} castShadow={false} />

      {/* tier 1: the whole stream into the top basin */}
      <Stream x={0} z={0.32} top={4.78} bottom={3.15} width={1.0} phase={0} />
      <TBlob position={[0, 2.25, 0.65]} scale={[1.05, 0.95, 0.85]} color={WET_ROCK} />
      <Basin x={0} y={3.0} z={0.75} r={1.0} />

      {/* tier 2: two half streams into two basins */}
      <Stream x={-0.58} z={1.72} top={3.08} bottom={1.58} width={0.5} phase={0.3} />
      <Stream x={0.58} z={1.72} top={3.08} bottom={1.58} width={0.5} phase={0.65} />
      <TBlob position={[0, 0.62, 2.1]} scale={[2.05, 0.85, 0.82]} color={WET_ROCK} />
      <Basin x={-0.98} y={1.42} z={2.25} r={0.7} />
      <Basin x={0.98} y={1.42} z={2.25} r={0.7} />

      {/* tier 3: four quarter streams into the pool */}
      {[-1.3, -0.66, 0.66, 1.3].map((x, i) => (
        <Stream key={x} x={x} z={2.98} top={1.5} bottom={0.04} width={0.25} phase={0.15 + i * 0.27} speed={1.9} />
      ))}

      {/* the 1 → ½ → ¼ badges on the rock beside each tier */}
      <Badge parts={1} position={[-1.35, 4.05, 0.12]} />
      <Badge parts={2} position={[-2.0, 2.45, 0.62]} />
      <Badge parts={4} position={[-2.55, 0.85, 1.98]} />

      {/* plunge pool */}
      <Decal geometry={blobDisc(POOL_LOCAL.r + 0.75, 0.08, 3)} color={TOON.sandWet} position={[POOL_LOCAL.x, 0.016, POOL_LOCAL.z]} />
      <Decal geometry={blobDisc(POOL_LOCAL.r, 0.07, 4)} color={TOON.water} position={[POOL_LOCAL.x, 0.025, POOL_LOCAL.z]} />
      <Decal geometry={blobDisc(1.5, 0.12, 5)} color={TOON.waterDeep} position={[0, 0.027, 2.75]} scale={[1.3, 1, 0.75]} />
      <Decal geometry={blobDisc(1, 0.28, 6)} color={TOON.waterShallow} position={[0, 0.028, 3.15]} scale={[1.75, 1, 0.8]} />
    </group>
  )
}

/** Pebbles ringing the pool, ferns and lily pads — instanced where they repeat. */
function PoolDressing() {
  const { pebbles, ferns } = useMemo(() => {
    const r = seededRng('fraction-falls:pebbles')
    const pebbles: InstanceSpec[] = []
    // the near half of the rim (the far half runs into the cliff, the east end into the river)
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * 0.05 + (i / 15) * Math.PI * 1.05
      const rr = POOL.r + 0.12 + r() * 0.25
      // angle measured around the pool from the river side, sweeping toward the camera and west
      const x = POOL.x + Math.cos(a) * rr
      const z = POOL.z + Math.sin(a) * rr
      if (Math.hypot(x - -21, z - -15) < 1.9) continue // leave the river mouth open
      const s = 0.14 + r() * 0.14
      pebbles.push({ x, y: s * 0.35, z, s: [s * 1.3, s * 0.7, s], rot: r() * 6, color: r() < 0.5 ? WET_ROCK : TOON.rockLight })
    }
    const fernSpots: [number, number, number][] = [
      [-27.3, -12.9, 1.0],
      [-26.6, -11.8, 0.85],
      [-25.2, -11.2, 0.9],
      [-23.4, -11.5, 0.75],
      [-19.7, -12.6, 0.9],
      [-28.2, -15.3, 1.1],
      [-22.6, -18.6, 1.1],
      [-21.2, -18.4, 0.85],
    ]
    const ferns: InstanceSpec[] = fernSpots.map(([x, z, s], i) => ({
      x,
      z,
      s,
      rot: i * 1.7,
      color: i % 3 === 0 ? TOON.leaf : i % 3 === 1 ? TOON.leafDark : TOON.pine,
    }))
    // ferns tucked on the cliff ledges (local → world)
    for (const [lx, y, lz, s] of [
      [-1.9, 3.5, 0.1, 0.8],
      [1.75, 3.0, 0.35, 0.75],
      [2.2, 1.45, 1.3, 0.7],
    ] as const) {
      const [x, z] = fallsToWorld(lx, lz)
      ferns.push({ x, y, z, s, rot: lx, color: TOON.leafDark })
    }
    return { pebbles, ferns }
  }, [])

  return (
    <group>
      <ToonInstances geometry={geo.blob(0)} color={TOON.white} items={pebbles} castShadow={false} />
      <ToonInstances geometry={fernGeometry()} color={TOON.white} items={ferns} />
      {/* wet rocks on the bank */}
      {WET_ROCKS.map((k, i) => (
        <TBlob key={i} position={[k.x, k.s * 0.45, k.z]} scale={[k.s * 1.15, k.s * 0.8, k.s]} rotation={[0, i * 1.3, 0]} color={i % 2 ? WET_ROCK_DARK : WET_ROCK} detail={0} outline={k.s > 0.5} />
      ))}
      {/* lily pads with one pink flower */}
      {([
        [-22.55, -13.75, 0.32],
        [-24.75, -13.35, 0.26],
        [-22.25, -15.95, 0.24],
      ] as const).map(([x, z, s], i) => (
        <TCyl key={i} radiusTop={s} height={0.03} position={[x, 0.045, z]} color={i === 1 ? TOON.leaf : TOON.leafDark} castShadow={false} segments={10} />
      ))}
      <TSphere position={[-22.5, 0.11, -13.8]} scale={[0.1, 0.07, 0.1]} color={TOON.flowerPink} castShadow={false} segments={8} />
      <TSphere position={[-22.5, 0.15, -13.8]} scale={0.04} color={TOON.flowerYellow} castShadow={false} segments={6} />
    </group>
  )
}

/** Stepping stones from the beaver to the pool: a whole, then halves, thirds, quarters. */
function PieSteps({ npc }: { npc: [number, number] }) {
  const dx = POOL.x - npc[0]
  const dz = POOL.z - npc[1]
  const len = Math.hypot(dx, dz)
  const ux = dx / len
  const uz = dz / len
  return (
    <group>
      {[1, 2, 3, 4].map((parts, i) => {
        const d = 1.3 + i * 0.98
        const wob = (i % 2 ? 1 : -1) * 0.18
        const x = npc[0] + ux * d - uz * wob
        const z = npc[1] + uz * d + ux * wob
        return (
          <PieDisc
            key={parts}
            parts={parts}
            radius={0.42}
            height={0.08}
            gap={0.07}
            colors={['#f4e8cc', '#dcc69f']}
            position={[x, 0.005, z]}
            turn={0.4 + i}
            receiveShadow
          />
        )
      })}
    </group>
  )
}

/** Fraction Falls: a tiered waterfall that halves and quarters, feeding the river's source pool. */
export default function FractionFalls({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('fraction-falls')!
  const npc = npcPosition(a)!
  return (
    <group>
      <Falls />
      <PoolDressing />
      <PieSteps npc={npc} />

      {/* the beaver's woodpile */}
      <group position={[STUMP.x, 0, STUMP.z]}>
        <Stump scale={1.1} />
        <TCone radius={0.18} height={0.28} position={[0, 0.47, 0]} color={TOON.woodLight} segments={7} />
      </group>
      <group position={[LOGS.x, 0, LOGS.z]} rotation={[0, LOGS.rot, 0]}>
        <Log position={[0, 0, -0.2]} length={LOGS.length} />
        <Log position={[0.12, 0, 0.21]} length={LOGS.length * 0.85} />
      </group>

      <group position={[SIGN.x, 0, SIGN.z]} rotation={[0, 0.7, 0]}>
        <Signpost color={TOON.sky} />
        <PieDisc parts={4} radius={0.13} height={0.03} gap={0.015} colors={[PIE_A, PIE_A, PIE_A, TOON.wallCream]} position={[0.2, 1.0, 0.04]} rotation={[Math.PI / 2, 0, 0]} />
      </group>
      <Lamp position={[LAMP.x, 0, LAMP.z]} />

      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef} facing={0.55}>
        <Beaver />
      </Npc>
    </group>
  )
}
