import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { BufferGeometry, Float32BufferAttribute, TorusGeometry, Vector3 } from 'three'
import type { Group } from 'three'
import { TOON } from '../../../toon/palette'
import { OUTLINE, toonMaterial } from '../../../toon/materials'
import { TBox, TCapsule, TCone, TCyl, TSphere, TTorus, type Vec3 } from '../../../toon/shapes'

const SIDES = 7
const capCache = new Map<string, BufferGeometry>()

/**
 * A snow cap that hugs a 7-sided cone (same apex, same faces, a hair proud of
 * them) with a zig-zag lower edge: the snow runs further down each ridge than
 * down the middle of each face, like icing. Built once per peak shape.
 */
function snowCap(radius: number, height: number, snow: number, jagged: number): BufferGeometry {
  const key = `${radius}|${height}|${snow}|${jagged}`
  let g = capCache.get(key)
  if (g) return g
  const apex = height / 2
  const lift = 1.03 // sit just outside the rock faces
  const rAt = (y: number) => (radius * (apex - y)) / height
  const pts: Vector3[] = []
  for (let k = 0; k < SIDES * 2; k++) {
    const theta = (k * Math.PI) / SIDES
    const ridge = k % 2 === 0
    const y = apex - height * snow * (ridge ? 1 + jagged : 1 - jagged * 0.6)
    const r = rAt(y) * (ridge ? 1 : Math.cos(Math.PI / SIDES)) * lift
    pts.push(new Vector3(Math.sin(theta) * r, y, Math.cos(theta) * r))
  }
  const top = new Vector3(0, apex + 0.02, 0)
  const pos: number[] = []
  const n = new Vector3()
  const e1 = new Vector3()
  const e2 = new Vector3()
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k]
    const b = pts[(k + 1) % pts.length]
    n.crossVectors(e1.subVectors(a, top), e2.subVectors(b, top))
    const outward = n.x * (a.x + b.x) + n.z * (a.z + b.z) > 0
    const [p, q] = outward ? [a, b] : [b, a]
    pos.push(top.x, top.y, top.z, p.x, p.y, p.z, q.x, q.y, q.z)
  }
  g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  capCache.set(key, g)
  return g
}

/**
 * A faceted mountain peak (7-sided cone) wearing a snow cap that shares its
 * apex, with snow running down the ridges.
 */
export function Peak({ position, radius, height, rot = 0, color = TOON.rockLight, snow = 0.36, jagged = 0.3 }: {
  position: Vec3
  radius: number
  height: number
  rot?: number
  color?: string
  snow?: number
  /** How much further the snow reaches down the ridges (fraction of the cap). */
  jagged?: number
}) {
  return (
    <group position={position} rotation={[0, rot, 0]}>
      <TCone radius={radius} height={height} segments={7} color={color} flat outline outlineThickness={3.2} receiveShadow />
      <mesh geometry={snowCap(radius, height, snow, jagged)} material={toonMaterial(TOON.snow)}>
        <Outlines thickness={2.8} color={OUTLINE.color} />
      </mesh>
    </group>
  )
}

/** The dark slit band over the dome (a quarter torus). */
const slitGeo = new TorusGeometry(1.0, 0.13, 6, 12, Math.PI * 0.62)

/**
 * A little observatory: cream drum, blue dome with an open slit, a brass
 * telescope poking out toward the sky, and a weather vane that turns in the
 * breeze. Local frame: the telescope points along +x.
 */
export function Observatory({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  const vane = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (vane.current) vane.current.rotation.y = Math.sin(clock.elapsedTime * 0.4) * 1.2 + 0.6
  })
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <TCyl radiusTop={1.0} radiusBottom={1.06} height={0.95} position={[0, 0.475, 0]} color={TOON.wallCream} outline segments={14} receiveShadow />
      <TCyl radiusTop={1.1} height={0.12} position={[0, 0.98, 0]} color={TOON.woodDark} segments={14} castShadow={false} />
      <TSphere position={[0, 1.0, 0]} scale={0.98} color={TOON.roofBlue} outline segments={16} />
      {/* slit: from the dome's top down toward the telescope side */}
      <mesh geometry={slitGeo} material={toonMaterial('#2b3552')} position={[0, 1.0, 0]} rotation={[0, 0, 0.35]} />
      {/* telescope */}
      <group position={[0, 1.0, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <TCyl radiusTop={0.17} radiusBottom={0.21} height={1.5} position={[0, 0.95, 0]} color={TOON.gold} outline segments={12} />
        <TCyl radiusTop={0.23} height={0.14} position={[0, 1.66, 0]} color={TOON.woodDark} segments={12} castShadow={false} />
        <TCyl radiusTop={0.16} height={0.04} position={[0, 1.74, 0]} color={TOON.sky} emissive={TOON.sky} emissiveIntensity={0.6} segments={12} castShadow={false} />
        <TCyl radiusTop={0.235} height={0.1} position={[0, 0.5, 0]} color={TOON.woodDark} segments={12} castShadow={false} />
      </group>
      {/* door, facing the camera side */}
      <group rotation={[0, 1.18, 0]}>
        <TBox size={[0.5, 0.72, 0.12]} radius={0.06} position={[0, 0.38, 1.0]} color={TOON.woodDark} castShadow={false} />
        <TSphere position={[0.14, 0.38, 1.07]} scale={0.035} color={TOON.gold} castShadow={false} segments={6} />
      </group>
      {/* weather vane on top */}
      <TCyl radiusTop={0.035} height={0.55} position={[0, 2.18, 0]} color={TOON.woodDark} castShadow={false} />
      <TSphere position={[0, 2.0, 0]} scale={0.07} color={TOON.gold} castShadow={false} segments={8} />
      <group ref={vane} position={[0, 2.38, 0]}>
        <TBox size={[0.7, 0.05, 0.05]} radius={0.02} color={TOON.woodDark} castShadow={false} />
        <TCone radius={0.09} height={0.18} position={[0.42, 0, 0]} rotation={[0, 0, -Math.PI / 2]} color={TOON.flowerRed} segments={4} castShadow={false} />
        <TBox size={[0.2, 0.2, 0.03]} radius={0.02} position={[-0.32, 0.03, 0]} rotation={[0, 0, 0.785]} color={TOON.flowerRed} castShadow={false} />
      </group>
      <TSphere position={[0, 2.62, 0]} scale={0.06} color={TOON.gold} emissive={TOON.gold} emissiveIntensity={0.6} castShadow={false} segments={8} />
    </group>
  )
}

/** Bubbles rising out of a flask mouth, looping (positions are mutated per frame). */
function Bubbles({ origin, count = 3, speed = 0.35, color }: { origin: Vec3; count?: number; speed?: number; color: string }) {
  const group = useRef<Group>(null)
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const t = clock.elapsedTime * speed
    for (let i = 0; i < g.children.length; i++) {
      const k = (t + i / count) % 1
      g.children[i].position.set(Math.sin((k + i) * 6) * 0.05, k * 0.55, Math.cos((k + i) * 5) * 0.03)
      g.children[i].scale.setScalar(0.025 + k * 0.035)
    }
  })
  return (
    <group ref={group} position={origin}>
      {Array.from({ length: count }, (_, i) => (
        <TSphere key={i} scale={0.03} color={color} emissive={color} emissiveIntensity={0.5} castShadow={false} segments={6} opacity={0.85} />
      ))}
    </group>
  )
}

/** A spinning atom: nucleus + three tilted orbits, each carrying an electron. */
function Atom({ position }: { position: Vec3 }) {
  const root = useRef<Group>(null)
  const orbits = useRef<(Group | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (root.current) {
      root.current.rotation.y = t * 0.35
      root.current.position.y = position[1] + Math.sin(t * 1.4) * 0.08
    }
    for (let i = 0; i < orbits.current.length; i++) {
      const o = orbits.current[i]
      if (o) o.rotation.z = t * (1.3 + i * 0.35)
    }
  })
  const tilts: Vec3[] = [
    [Math.PI / 2, 0, 0],
    [Math.PI / 2 + 1.05, 0.3, 0],
    [Math.PI / 2 - 1.05, -0.3, 0],
  ]
  return (
    <group ref={root} position={position}>
      <TSphere scale={0.15} color={TOON.coral} emissive={TOON.coral} emissiveIntensity={0.35} outline castShadow={false} segments={12} />
      {tilts.map((r, i) => (
        <group key={i} rotation={r}>
          <group ref={(g) => { orbits.current[i] = g }}>
            <TTorus radius={0.5} tube={0.03} color={TOON.flowerBlue} emissive={TOON.flowerBlue} emissiveIntensity={0.35} castShadow={false} segments={28} />
            <TSphere position={[0.5, 0, 0]} scale={0.07} color={TOON.flowerYellow} emissive={TOON.flowerYellow} emissiveIntensity={0.7} castShadow={false} segments={8} />
          </group>
        </group>
      ))}
    </group>
  )
}

/**
 * The lab bench: a wooden table with a round-bottom flask, a cone flask and a
 * rack of test tubes, all glowing and bubbling, with an atom spinning overhead.
 * Local frame: the bench runs along x, its front faces +z.
 */
export function LabBench({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <TBox size={[1.9, 0.13, 0.85]} radius={0.05} position={[0, 0.8, 0]} color={TOON.wood} outline receiveShadow />
      {[[-0.82, -0.32], [0.82, -0.32], [-0.82, 0.32], [0.82, 0.32]].map(([x, z]) => (
        <TBox key={`${x},${z}`} size={[0.13, 0.76, 0.13]} radius={0.04} position={[x, 0.38, z]} color={TOON.woodDark} />
      ))}
      <TBox size={[1.6, 0.08, 0.6]} radius={0.03} position={[0, 0.22, 0]} color={TOON.woodDark} castShadow={false} />

      {/* round-bottom flask (mint) */}
      <TSphere position={[-0.55, 1.06, 0.02]} scale={0.21} color={TOON.mint} emissive={TOON.mint} emissiveIntensity={0.55} outline segments={14} />
      <TCyl radiusTop={0.06} radiusBottom={0.07} height={0.24} position={[-0.55, 1.36, 0.02]} color="#e8f6ff" castShadow={false} segments={8} />
      <Bubbles origin={[-0.55, 1.48, 0.02]} color={TOON.mint} />

      {/* cone flask (pink) */}
      <TCone radius={0.21} height={0.34} position={[0.02, 1.03, 0.05]} color={TOON.flowerPink} emissive={TOON.flowerPink} emissiveIntensity={0.5} outline segments={12} />
      <TCyl radiusTop={0.06} radiusBottom={0.065} height={0.18} position={[0.02, 1.27, 0.05]} color="#e8f6ff" castShadow={false} segments={8} />
      <Bubbles origin={[0.02, 1.36, 0.05]} color={TOON.flowerPink} speed={0.45} />

      {/* test-tube rack */}
      <TBox size={[0.52, 0.12, 0.2]} radius={0.03} position={[0.6, 0.94, -0.05]} color={TOON.woodLight} castShadow={false} />
      {[TOON.flowerYellow, TOON.flowerBlue, TOON.lilac].map((c, i) => (
        <TCapsule key={c} radius={0.05} length={0.2} position={[0.44 + i * 0.16, 1.06, -0.05]} color={c} emissive={c} emissiveIntensity={0.5} castShadow={false} segments={8} />
      ))}

      <Atom position={[0.1, 2.25, -0.1]} />
    </group>
  )
}

/** A chunky toy rocket on its launch pad (local +z faces the camera). */
export function Rocket({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  const puffs = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (puffs.current) puffs.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.5) * 0.06)
  })
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <TCyl radiusTop={0.86} radiusBottom={0.96} height={0.24} position={[0, 0.12, 0]} color={TOON.metal} outline segments={12} receiveShadow />
      <TCyl radiusTop={0.6} height={0.04} position={[0, 0.25, 0]} color={TOON.flowerYellow} segments={12} castShadow={false} />
      <group position={[0, 0.25, 0]}>
        {/* fins */}
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 + Math.PI / 3
          return (
            <TBox key={i} size={[0.08, 0.6, 0.42]} radius={0.035} position={[Math.sin(a) * 0.5, 0.32, Math.cos(a) * 0.5]} rotation={[0, a, 0]} color={TOON.flowerRed} outline />
          )
        })}
        <TCapsule radius={0.42} length={1.0} position={[0, 0.93, 0]} color={TOON.white} outline segments={14} />
        <TCyl radiusTop={0.43} height={0.16} position={[0, 0.62, 0]} color={TOON.flowerRed} segments={14} castShadow={false} />
        <TCone radius={0.37} height={0.6} position={[0, 1.88, 0]} color={TOON.flowerRed} outline segments={14} />
        <TSphere position={[0, 2.2, 0]} scale={0.07} color={TOON.gold} castShadow={false} segments={8} />
        {/* porthole facing the camera */}
        <group position={[0, 1.18, 0]}>
          <TTorus radius={0.14} tube={0.045} position={[0, 0, 0.41]} color={TOON.gold} castShadow={false} segments={16} />
          <TCyl radiusTop={0.12} height={0.05} position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]} color={TOON.sky} emissive={TOON.sky} emissiveIntensity={0.6} castShadow={false} segments={12} />
        </group>
        {/* nozzle */}
        <TCyl radiusTop={0.2} radiusBottom={0.26} height={0.16} position={[0, 0.0, 0]} color={TOON.rockDark} castShadow={false} segments={10} />
      </group>
      {/* idle steam puffs around the pad */}
      <group ref={puffs}>
        <TSphere position={[0.75, 0.3, 0.35]} scale={[0.3, 0.22, 0.28]} color={TOON.white} castShadow={false} segments={10} />
        <TSphere position={[-0.7, 0.28, 0.45]} scale={[0.26, 0.2, 0.24]} color={TOON.white} castShadow={false} segments={10} />
        <TSphere position={[0.2, 0.26, 0.85]} scale={[0.22, 0.16, 0.2]} color={TOON.white} castShadow={false} segments={10} />
      </group>
    </group>
  )
}
