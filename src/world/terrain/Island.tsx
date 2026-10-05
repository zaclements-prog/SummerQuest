import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, ExtrudeGeometry, Shape } from 'three'
import type { Mesh } from 'three'
import { TOON } from '../../toon/palette'
import { toonMaterial } from '../../toon/materials'
import { coastRadius, OCEAN_Y } from '../worldLayout'

const SEGMENTS = 160

/** The coastline polygon scaled by `k`, as a Shape in the XY plane (y = −z). */
function coastShape(k = 1): Shape {
  const s = new Shape()
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = (i / SEGMENTS) * Math.PI * 2
    const r = coastRadius(t) * k
    const x = Math.cos(t) * r
    const z = Math.sin(t) * r
    if (i === 0) s.moveTo(x, -z)
    else s.lineTo(x, -z)
  }
  return s
}

/**
 * One horizontal layer of the island: the coast shape (scaled) extruded `depth`
 * downward from `top`. Rotated so the shape lies in XZ and the extrusion runs −y.
 */
function layer(k: number, depth: number, bevel: number): ExtrudeGeometry {
  const g = new ExtrudeGeometry(coastShape(k), {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 1.4,
    bevelSegments: 3,
    curveSegments: 1,
  })
  g.rotateX(-Math.PI / 2) // extrusion now goes +y; shape lies in XZ with z = −y_shape
  g.translate(0, -depth - bevel, 0) // top cap at y = 0
  return g
}

/** A flat ring strip just outside the coast (foam / shallows). */
function coastRing(inner: number, outer: number): BufferGeometry {
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = (i / SEGMENTS) * Math.PI * 2
    const r = coastRadius(t)
    const c = Math.cos(t)
    const s = Math.sin(t)
    pos.push(c * (r + inner), 0, s * (r + inner), c * (r + outer), 0, s * (r + outer))
    if (i < SEGMENTS) {
      const a = i * 2
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/**
 * The floating-in-the-sea island: a rounded grass top (soft beveled rim), a sandy
 * cliff band and two stepped rock bands under it, standing in a pastel ocean with
 * a gently breathing foam line.
 */
export default function Island() {
  const geos = useMemo(
    () => ({
      grass: layer(1, 0.45, 0.35),
      cliff: (() => {
        const g = layer(0.985, 2.2, 0)
        g.translate(0, -0.8, 0)
        return g
      })(),
      rock: (() => {
        const g = layer(0.95, 1.8, 0)
        g.translate(0, -3.0, 0)
        return g
      })(),
      base: (() => {
        const g = layer(0.88, 1.6, 0.3)
        g.translate(0, -4.6, 0)
        return g
      })(),
      shallows: coastRing(-0.5, 4.5),
      foam: coastRing(0.1, 0.9),
    }),
    [],
  )
  const foam = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (foam.current) {
      const k = 1 + Math.sin(clock.elapsedTime * 0.8) * 0.004
      foam.current.scale.set(k, 1, k)
    }
  })

  return (
    <group>
      {/* grass top (the walkable plane is y = 0) */}
      <mesh geometry={geos.grass} material={toonMaterial(TOON.grass)} receiveShadow />
      {/* sandy cliff band, then stepped rock under it */}
      <mesh geometry={geos.cliff} material={[toonMaterial(TOON.cliffDark), toonMaterial(TOON.cliff)]} />
      <mesh geometry={geos.rock} material={[toonMaterial(TOON.rockDark), toonMaterial(TOON.rock)]} />
      <mesh geometry={geos.base} material={[toonMaterial(TOON.rockDark), toonMaterial(TOON.rockDark)]} />

      {/* ocean, shallows ring and foam line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, OCEAN_Y, 0]} material={toonMaterial(TOON.waterDeep)} receiveShadow>
        <circleGeometry args={[260, 48]} />
      </mesh>
      <mesh geometry={geos.shallows} position={[0, OCEAN_Y + 0.02, 0]} material={toonMaterial(TOON.water, { doubleSide: true })} />
      <mesh ref={foam} geometry={geos.foam} position={[0, OCEAN_Y + 0.04, 0]} material={toonMaterial(TOON.foam, { doubleSide: true })} />
    </group>
  )
}
