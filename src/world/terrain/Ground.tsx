import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, CircleGeometry, PlaneGeometry } from 'three'
import type { Group } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { TOON } from '../../toon/palette'
import { toonMaterial } from '../../toon/materials'
import { TBox, TCyl, TSphere, TTorus } from '../../toon/shapes'
import { Lamp, Bench, FlowerPatch } from '../../toon/props'
import { BRIDGES, FOUNTAIN, PATH_WIDTH, PLAZA, RIVER, WORLD_PATHS, coastRadius, OCEAN_Y } from '../worldLayout'

/**
 * A flat ribbon following a polyline at height y: one quad per segment plus a
 * round disc at every joint, so corners are soft. Lies in XZ, faces +y.
 */
function ribbon(points: [number, number][], width: number, y: number): BufferGeometry {
  const parts: BufferGeometry[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i]
    const [bx, bz] = points[i + 1]
    const len = Math.hypot(bx - ax, bz - az)
    const q = new PlaneGeometry(width, len)
    q.rotateX(-Math.PI / 2)
    q.rotateY(Math.atan2(bx - ax, bz - az))
    q.translate((ax + bx) / 2, y, (az + bz) / 2)
    parts.push(q)
  }
  for (const [x, z] of points) {
    const c = new CircleGeometry(width / 2, 16)
    c.rotateX(-Math.PI / 2)
    c.translate(x, y, z)
    parts.push(c)
  }
  const merged = mergeGeometries(parts.map((p) => p.toNonIndexed()), false)
  parts.forEach((p) => p.dispose())
  return merged ?? new BufferGeometry()
}

/** Soft lighter-green meadow patches so the grass isn't one flat color. */
const MEADOWS: { x: number; z: number; r: number; color: string }[] = [
  { x: -16, z: 16, r: 5, color: TOON.meadow },
  { x: 10, z: 12, r: 4, color: TOON.meadow },
  { x: 18, z: -20, r: 4, color: TOON.grassLight },
  { x: -20, z: -20, r: 5, color: TOON.grassLight },
  { x: -28, z: 6, r: 3.5, color: TOON.meadow },
  { x: 28, z: 14, r: 3.5, color: TOON.grassLight },
  { x: 8, z: 30, r: 3, color: TOON.meadow },
  { x: -5, z: -30, r: 3, color: TOON.grassLight },
]

function Fountain() {
  const spray = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (spray.current) spray.current.position.y = Math.sin(clock.elapsedTime * 3) * 0.05
  })
  return (
    <group position={[FOUNTAIN.cx, 0, FOUNTAIN.cz]}>
      <TCyl radiusTop={1.55} radiusBottom={1.7} height={0.5} position={[0, 0.25, 0]} color={TOON.stone} outline segments={16} receiveShadow />
      <TCyl radiusTop={1.3} height={0.06} position={[0, 0.48, 0]} color={TOON.water} castShadow={false} segments={16} />
      <TCyl radiusTop={0.28} radiusBottom={0.36} height={1.0} position={[0, 0.8, 0]} color={TOON.stone} outline segments={10} />
      <TCyl radiusTop={0.75} radiusBottom={0.55} height={0.18} position={[0, 1.3, 0]} color={TOON.stone} outline segments={14} />
      <TCyl radiusTop={0.62} height={0.04} position={[0, 1.4, 0]} color={TOON.water} castShadow={false} segments={14} />
      <group ref={spray}>
        <TSphere position={[0, 1.65, 0]} scale={[0.22, 0.32, 0.22]} color={TOON.waterShallow} castShadow={false} opacity={0.85} />
        <TSphere position={[0, 1.95, 0]} scale={0.12} color={TOON.foam} castShadow={false} />
      </group>
      <TTorus radius={1.2} tube={0.06} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.52, 0]} color={TOON.foam} castShadow={false} segments={28} />
    </group>
  )
}

function Bridge({ cx, cz, length, width }: { cx: number; cz: number; length: number; width: number }) {
  const planks = Math.round(length / 0.45)
  return (
    <group position={[cx, 0, cz]}>
      {Array.from({ length: planks }, (_, i) => (
        <TBox
          key={i}
          size={[width, 0.12, length / planks - 0.05]}
          radius={0.03}
          position={[0, 0.07, -length / 2 + (i + 0.5) * (length / planks)]}
          color={i % 2 ? TOON.wood : TOON.woodLight}
          receiveShadow
        />
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (width / 2 + 0.1), 0, 0]}>
          <TBox size={[0.12, 0.1, length]} radius={0.03} position={[0, 0.72, 0]} color={TOON.woodDark} outline />
          {[-0.5, -0.17, 0.17, 0.5].map((t) => (
            <TBox key={t} size={[0.14, 0.75, 0.14]} position={[0, 0.38, t * length]} color={TOON.woodDark} />
          ))}
        </group>
      ))}
    </group>
  )
}

/** River mouth pouring over the east cliff into the sea. */
function RiverFall() {
  const [x, z] = RIVER.points[RIVER.points.length - 1]
  const theta = Math.atan2(z, x)
  const edge = coastRadius(theta)
  const ex = Math.cos(theta) * edge
  const ez = Math.sin(theta) * edge
  return (
    <group position={[ex + 0.4, 0, ez]}>
      <TBox size={[0.4, -OCEAN_Y + 0.3, RIVER.width]} radius={0.1} position={[0, OCEAN_Y / 2, 0]} color={TOON.waterShallow} castShadow={false} opacity={0.9} />
      <TSphere position={[0.4, OCEAN_Y + 0.1, 0]} scale={[0.8, 0.3, 1.6]} color={TOON.foam} castShadow={false} />
    </group>
  )
}

/**
 * Everything painted on (or sitting just on) the grass: meadow patches, the
 * river with sandy banks and its bridges, the footpaths, and the town plaza with
 * its fountain, lamps and benches.
 */
export default function Ground() {
  const geos = useMemo(() => {
    const paths = mergeGeometries(WORLD_PATHS.map((p) => ribbon(p.points, PATH_WIDTH, 0.012)), false)
    const pathEdges = mergeGeometries(WORLD_PATHS.map((p) => ribbon(p.points, PATH_WIDTH + 0.35, 0.008)), false)
    const banks = ribbon(RIVER.points, RIVER.width + 1.8, 0.01)
    const water = ribbon(RIVER.points, RIVER.width, 0.03)
    const shimmer = ribbon(RIVER.points, RIVER.width * 0.35, 0.035)
    const meadows = mergeGeometries(
      MEADOWS.map((m) => {
        const c = new CircleGeometry(m.r, 20)
        c.rotateX(-Math.PI / 2)
        c.translate(m.x, 0.004, m.z)
        return c.toNonIndexed()
      }),
      false,
    )
    return { paths, pathEdges, banks, water, shimmer, meadows }
  }, [])

  return (
    <group>
      <mesh geometry={geos.meadows} material={toonMaterial(TOON.grassLight)} receiveShadow />
      <mesh geometry={geos.pathEdges} material={toonMaterial(TOON.pathEdge)} receiveShadow />
      <mesh geometry={geos.paths} material={toonMaterial(TOON.path)} receiveShadow />

      {/* river */}
      <mesh geometry={geos.banks} material={toonMaterial(TOON.sand)} receiveShadow />
      <mesh geometry={geos.water} material={toonMaterial(TOON.water)} receiveShadow />
      <mesh geometry={geos.shimmer} material={toonMaterial(TOON.waterShallow)} />
      {BRIDGES.map((b) => (
        <Bridge key={b.cx} {...b} />
      ))}
      <RiverFall />

      {/* town plaza */}
      <group position={[PLAZA.cx, 0, PLAZA.cz]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]} material={toonMaterial(TOON.stoneDark)} receiveShadow>
          <circleGeometry args={[PLAZA.r + 0.3, 40]} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} material={toonMaterial(TOON.stone)} receiveShadow>
          <circleGeometry args={[PLAZA.r, 40]} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, 0]} material={toonMaterial(TOON.pathEdge)} receiveShadow>
          <ringGeometry args={[PLAZA.r - 1.4, PLAZA.r - 1.0, 40]} />
        </mesh>
        <Lamp position={[-4.2, 0, -3.2]} />
        <Lamp position={[4.2, 0, -3.2]} />
        <Lamp position={[-4.6, 0, 3.4]} />
        <Lamp position={[4.6, 0, 3.4]} />
        <Bench position={[-3.6, 0, 1.4]} rotation={Math.PI / 2} />
        <Bench position={[3.6, 0, 1.4]} rotation={-Math.PI / 2} />
        <FlowerPatch position={[-2.4, 0, 4.6]} seed={11} count={7} radius={0.7} />
        <FlowerPatch position={[2.4, 0, 4.6]} seed={12} count={7} radius={0.7} />
      </group>
      <Fountain />
    </group>
  )
}
