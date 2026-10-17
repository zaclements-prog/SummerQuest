/* eslint-disable react-refresh/only-export-components -- the station layout constants (POND/TOWER/GONG/BED) describe exactly what these components draw; co-located on purpose, not an HMR boundary */
import { useMemo, useRef } from 'react'
import { Color, Group, Mesh, MeshBasicMaterial } from 'three'
import { useFrame } from '@react-three/fiber'
import { geo } from '../toon/geometry'
import { TOON } from '../toon/palette'
import { TBlob, TBox, TCyl, TSphere } from '../toon/shapes'
import { Instances } from '../world/town/kit'
import { Decal } from '../world/areas/fraction-falls/kit'
import { blobDisc } from '../world/areas/fraction-falls/shapes'
import { chalkText } from '../world/town/chalk'
import { Tree, Bush, Rock } from '../toon/props'

/**
 * Visual pieces for Cloud Keeper (docs/superpowers/specs/2026-10-16-cloud-
 * keeper-design.md). Dumb and presentational: the flow lives in CloudKeeper.tsx.
 *
 * `mode` drives every station animation: 'off' = resting, 'run' = the process
 * performing (loops while the result is on screen), 'stall' = the process runs
 * but falls back on itself (the vapor rises then sinks — nothing gathers),
 * shown when the kid picked the wrong station.
 */

export type StationMode = 'off' | 'run' | 'stall'

/** Station plots (the sun-dial pond, the cloud tower, the rain gong + garden). */
export const POND: [number, number] = [-3.6, 0.6]
export const TOWER: [number, number] = [0, -3.6]
export const GONG: [number, number] = [3.6, 0.6]
/** The garden bed, just south of the gong (where the rain visibly lands). */
export const BED: [number, number] = [3.35, 2.1]

const SLATE = '#3c4657'
const BLOOM_COLORS = [TOON.flowerPink, TOON.flowerYellow, TOON.flowerRed, TOON.flowerPurple, TOON.flowerWhite, TOON.flowerBlue, TOON.coral, TOON.blossom, TOON.flowerYellow]

/** Deterministic scatter offset for puff/rain particle i under a spread. */
const scatter = (i: number, spread: number): [number, number] => [(((i * 0.618) % 1) - 0.5) * 2 * spread, (((i * 0.382 + 0.2) % 1) - 0.5) * 2 * spread]

/**
 * Soft vapor puffs looping out of `origin`: rise and thin in 'run', rise then
 * sink back in 'stall' (the process tries and gets nowhere), gone in 'off'.
 */
function Puffs({
  origin,
  mode,
  count = 5,
  spread = 0.7,
  rise = 2.0,
  size = 0.19,
  color = TOON.foam,
}: {
  origin: [number, number, number]
  mode: StationMode
  count?: number
  spread?: number
  rise?: number
  size?: number
  color?: string
}) {
  const g = useRef<Group>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    const m = g.current
    if (!m) return
    t.current += Math.min(dt, 0.05)
    for (let i = 0; i < m.children.length; i++) {
      const c = m.children[i] as Mesh
      const mat = c.material as MeshBasicMaterial
      const ph = (t.current / (mode === 'stall' ? 1.6 : 1.3) + i / count) % 1
      const fwd = mode === 'stall' ? Math.sin(ph * Math.PI) * 0.55 : ph
      c.position.y = fwd * rise
      const k = mode === 'stall' ? 1 - Math.abs(0.5 - ph) * 0.8 : 1 - ph * 0.85
      c.scale.setScalar(Math.max(0.08, k))
      mat.opacity = mode === 'off' ? 0 : 0.8 * k * k
    }
  })
  return (
    <group position={origin}>
      <group ref={g}>
        {Array.from({ length: count }, (_, i) => {
          const [dx, dz] = scatter(i, spread)
          return (
            <mesh key={i} position={[dx, 0, dz]}>
              <sphereGeometry args={[size, 8, 6]} />
              <meshBasicMaterial color={color} transparent depthWrite={false} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

/** The sun-dial pond: water level tracks the loop's pond, dial spins while heating. */
export function PondSun({ level, mode }: { level: number; mode: StationMode }) {
  const dial = useRef<Group>(null)
  const sun = useRef<Group>(null)
  useFrame(({ clock }, dt) => {
    const d = dial.current
    if (d) d.rotation.y += dt * (mode === 'run' ? 3.2 : mode === 'off' ? 0.25 : 0)
    const s = sun.current
    if (s) s.position.y = 2.12 + Math.sin(clock.elapsedTime * 1.1) * 0.07 + (mode === 'run' ? Math.sin(clock.elapsedTime * 6) * 0.04 : 0)
  })
  return (
    <group position={[POND[0], 0, POND[1]]}>
      <TCyl radiusTop={1.75} radiusBottom={1.5} height={0.36} position={[0, 0.18, 0]} color={TOON.stone} outline segments={14} />
      <TCyl radiusTop={1.55} height={0.09} position={[0, 0.24 + level * 0.12, 0]} color={TOON.water} castShadow={false} segments={14} />
      <TCyl radiusTop={1.55} height={0.02} position={[0, 0.37, 0]} color={TOON.foam} castShadow={false} segments={14} />
      <TBlob position={[0, 0.36, 0]} scale={[0.62, 0.3, 0.62]} color={TOON.cliff} outline />
      <TCyl radiusTop={0.07} height={1.0} position={[0, 1.0, 0]} color={TOON.woodDark} segments={8} />
      <group ref={dial} position={[0, 1.55, 0]}>
        <group rotation={[0.42, 0, 0]}>
          <TCyl radiusTop={0.44} height={0.07} color={TOON.rockLight} outline segments={12} />
          <TBox size={[0.05, 0.34, 0.05]} radius={0.02} position={[0, 0.17, 0]} rotation={[0, 0, 0.5]} color={TOON.woodDark} castShadow={false} />
        </group>
      </group>
      <group ref={sun} position={[0, 2.12, 0.5]}>
        <TSphere scale={0.26} color={TOON.flowerYellow} segments={10} />
      </group>
      <Puffs origin={[0, 0.6, 0]} mode={mode} count={5} spread={1.0} rise={1.5} color={TOON.foam} />
    </group>
  )
}

/** The cloud tower: a stone gantry holding the sky cloud; cloud grows/darkens with the loop. */
export function CloudTower({ level, mode }: { level: number; mode: StationMode }) {
  const cloud = useRef<Group>(null)
  const tint = useMemo(() => new Color('#ffffff').lerp(new Color(TOON.rock), level).getStyle(), [level])
  const grow = 0.72 + 0.55 * level
  useFrame(({ clock }) => {
    const m = cloud.current
    if (!m) return
    const pulse = mode === 'run' ? 1 + Math.sin(clock.elapsedTime * 6) * 0.06 : 1
    m.scale.setScalar(pulse)
    m.position.y = 3.58 + Math.sin(clock.elapsedTime * 0.9) * 0.07
  })
  const blobs: { p: [number, number, number]; s: [number, number, number] }[] = [
    { p: [0, 0, 0], s: [1.15, 0.7, 0.85] },
    { p: [-0.85, -0.12, 0.05], s: [0.7, 0.5, 0.6] },
    { p: [0.9, -0.1, -0.05], s: [0.8, 0.52, 0.65] },
    { p: [0.15, 0.34, 0], s: [0.65, 0.45, 0.55] },
  ]
  return (
    <group position={[TOWER[0], 0, TOWER[1]]}>
      <TCyl radiusTop={0.16} height={3.0} position={[-1.1, 1.5, 0]} color={TOON.rock} outline segments={8} />
      <TCyl radiusTop={0.16} height={3.0} position={[1.1, 1.5, 0]} color={TOON.rock} outline segments={8} />
      <TBox size={[2.8, 0.2, 0.34]} radius={0.05} position={[0, 3.05, 0]} color={TOON.wood} outline />
      <group ref={cloud} position={[0, 3.58, 0]}>
        {blobs.map((b, i) => (
          <TSphere key={i} position={b.p} scale={[b.s[0] * grow, b.s[1] * grow, b.s[2] * grow]} color={tint} segments={10} />
        ))}
      </group>
      <Puffs origin={[0, 0.3, 0]} mode={mode} count={6} spread={0.8} rise={2.9} color={TOON.foam} />
    </group>
  )
}

/** The rain gong and the garden it waters: ring it and the blooms drink. */
export function GongGarden({ garden, mode }: { garden: number; mode: StationMode }) {
  const gong = useRef<Group>(null)
  const rain = useRef<Group>(null)
  useFrame(({ clock }) => {
    const g = gong.current
    if (g) g.rotation.z = mode === 'run' ? Math.sin(clock.elapsedTime * 11) * 0.09 : 0
    const r = rain.current
    if (r) {
      for (let i = 0; i < r.children.length; i++) {
        const c = r.children[i] as Mesh
        const [dx, dz] = scatter(i, 1.0)
        const ph = ((clock.elapsedTime * 1.6 + i / r.children.length) % 1)
        c.position.set(dx, 3.4 - ph * 2.8, dz)
        c.scale.y = mode === 'run' ? 1 : 0.001
        ;(c.material as MeshBasicMaterial).opacity = mode === 'run' ? 0.85 : 0
      }
    }
  })
  const bedLocal: [number, number] = [BED[0] - GONG[0], BED[1] - GONG[1]]
  const blooms = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const grown = Math.min(1, Math.max(0, garden * 9 - i))
        return {
          x: ((i % 3) - 1) * 0.55,
          z: (Math.floor(i / 3) - 1) * 0.32,
          s: 0.05 + 0.15 * grown,
          color: grown > 0.45 ? BLOOM_COLORS[i] : TOON.leafDark,
        }
      }),
    [garden],
  )
  return (
    <group position={[GONG[0], 0, GONG[1]]}>
      <TCyl radiusTop={0.09} height={2.5} position={[-0.85, 1.25, -0.1]} color={TOON.woodDark} segments={8} />
      <TCyl radiusTop={0.09} height={2.5} position={[0.85, 1.25, -0.1]} color={TOON.woodDark} segments={8} />
      <TBox size={[2.1, 0.16, 0.26]} radius={0.05} position={[0, 2.55, -0.1]} color={TOON.wood} outline />
      <TCyl radiusTop={0.03} height={0.5} position={[0, 2.27, -0.06]} color={TOON.woodLight} segments={6} castShadow={false} />
      <group ref={gong} position={[0, 1.72, 0]}>
        <TCyl radiusTop={0.6} height={0.09} rotation={[Math.PI / 2, 0, 0]} color={TOON.gold} outline segments={14} />
        <TCyl radiusTop={0.16} height={0.12} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.06]} color={TOON.flowerYellow} castShadow={false} segments={10} />
      </group>
      <group position={[bedLocal[0], 0, bedLocal[1]]}>
        <TBox size={[1.9, 0.3, 1.15]} radius={0.05} position={[0, 0.15, 0]} color={TOON.dirt} outline />
        <TBox size={[1.8, 0.08, 1.05]} radius={0.03} position={[0, 0.31, 0]} color={TOON.dirtDark} castShadow={false} />
        {blooms.map((b, i) => (
          <TSphere key={i} position={[b.x, 0.4, b.z]} scale={[b.s, b.s * 1.1, b.s]} color={b.color} segments={8} castShadow={false} />
        ))}
      </group>
      <group ref={rain} position={[bedLocal[0], 0, bedLocal[1]]}>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i}>
            <boxGeometry args={[0.035, 0.55, 0.035]} />
            <meshBasicMaterial color={TOON.water} transparent depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** The big chalk numeral over a station (the board traces these digits). */
export function StationCard({ n, position, rotation }: { n: number; position: [number, number]; rotation: number }) {
  const label = String(n)
  const items = useMemo(() => chalkText(label, { y: 0, z: 0, w: 0.19, h: 0.34, t: 0.05, gap: 0.09, color: '#fff3c4' }), [label])
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <TCyl radiusTop={0.05} height={1.0} position={[0, 0.5, 0]} color={TOON.woodDark} segments={8} castShadow={false} />
      <group position={[0, 1.22, 0]}>
        <TBox size={[0.6, 0.64, 0.07]} radius={0.08} color={SLATE} castShadow={false} />
        <group position={[0, 0, 0.05]}>
          <Instances geometry={geo.box(1, 1, 1, 0.2)} color={'#fff3c4'} items={items} />
        </group>
      </group>
    </group>
  )
}

/** Meadow yard: the river that carries rain back to the pond, plus friendly clutter. */
export function CycleYard() {
  const river: [number, number][] = [[2.6, 2.9], [1.5, 3.1], [0.2, 3.0], [-1.2, 2.8], [-2.4, 2.3]]
  return (
    <group>
      <Decal geometry={blobDisc(9.6, 0.16, 7, 48)} color={TOON.grass} position={[0, 0, 0]} />
      <Decal geometry={blobDisc(8.3, 0.12, 8, 44)} color={TOON.meadow} position={[0, 0.004, 0]} />
      {river.map(([x, z], i) => (
        <Decal key={i} geometry={blobDisc(0.85, 0.14, 8, 24)} color={TOON.waterShallow} position={[x, 0.01, z]} />
      ))}
      <Rock position={[-6.1, 0, -3.1]} scale={1.1} seed={3} />
      <Rock position={[-5.4, 0, 4.3]} scale={0.9} seed={7} outline />
      <Rock position={[6.1, 0, -1.8]} scale={1.2} seed={11} outline />
      <Bush position={[2.4, 0, -5.9]} scale={1.2} seed={4} />
      <Bush position={[-2.9, 0, -5.7]} scale={1.0} seed={9} />
      <Bush position={[5.4, 0, 4.3]} scale={1.1} seed={14} />
      <Tree position={[-6.3, 0, -4.9]} scale={1.5} seed={5} />
      <Tree position={[5.8, 0, -5.8]} scale={1.35} seed={8} />
      <Tree position={[-6.6, 0, 2.6]} scale={1.25} seed={12} />
    </group>
  )
}
