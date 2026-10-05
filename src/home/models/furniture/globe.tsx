import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { TBlob, TCyl, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { fgeo } from './_geo'
import { Ol, TGeo } from './_kit'

const R = 0.28 // globe radius
const RING = 0.33 // meridian ring radius
const PIVOT_Y = 0.3 // bottom pole, on top of the stand
const TILT = 0.38

// Continents: [longitude, latitude, size x, size y].
const LANDS: [number, number, number, number][] = [
  [0.3, 0.45, 0.13, 0.12],
  [0.6, -0.35, 0.09, 0.13],
  [2.4, 0.3, 0.15, 0.1],
  [3.6, -0.2, 0.12, 0.11],
  [4.8, 0.55, 0.1, 0.08],
]

/** Globe (1×1): a slowly spinning ocean globe on a gold meridian ring and a wooden stand. */
export function Globe() {
  const spin = useRef<Group>(null)
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += Math.min(dt, 0.1) * 0.35
  })
  return (
    <group position={[0.1, 0, 0]}>
      <TCyl radiusTop={0.15} radiusBottom={0.21} height={0.09} position={[0, 0.045, 0]} color={F.woodDark} segments={14}>
        <Ol />
      </TCyl>
      <TCyl radiusTop={0.045} radiusBottom={0.06} height={0.22} position={[0, 0.19, 0]} color={F.wood} segments={8} />

      {/* tilted assembly, pivoting on the bottom pole */}
      <group position={[0, PIVOT_Y, 0]} rotation={[0, 0, TILT]}>
        <TGeo geometry={fgeo.arc(RING, 0.026, Math.PI, 18)} position={[0, RING, 0]} rotation={[0, -Math.PI / 2, Math.PI / 2]} color={F.gold} />
        <TSphere position={[0, RING * 2, 0]} scale={0.04} color={F.gold} segments={8} castShadow={false} />
        <group ref={spin} position={[0, RING, 0]}>
          <TSphere scale={R} color={F.water} segments={18}>
            <Ol />
          </TSphere>
          {LANDS.map(([lon, lat, sx, sy]) => (
            <group key={lon} rotation={[0, lon, 0]}>
              <group rotation={[-lat, 0, 0]}>
                <TBlob position={[0, 0, R - 0.01]} scale={[sx, sy, 0.035]} color={F.leaf} castShadow={false} />
              </group>
            </group>
          ))}
          <TSphere position={[0, R - 0.02, 0]} scale={[0.1, 0.03, 0.1]} color={F.white} segments={10} castShadow={false} />
        </group>
      </group>
    </group>
  )
}
