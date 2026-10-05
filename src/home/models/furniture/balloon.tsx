import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Euler, Quaternion, Vector3 } from 'three'
import type { Group } from 'three'
import { TCone, TCyl, TSphere } from '../../../toon/shapes'
import type { Vec3 } from '../../../toon/shapes'
import { F } from './_palette'
import { Ol } from './_kit'

const ANCHOR_Y = 0.13 // top of the weight; the bunch sways about this point
const BALLOONS: { p: Vec3; c: string }[] = [
  { p: [-0.15, 1.42, -0.05], c: F.pink },
  { p: [0.16, 1.3, 0.04], c: F.sky },
  { p: [0.0, 1.66, 0.1], c: F.butter },
]
const BALLOON_R: Vec3 = [0.2, 0.24, 0.2]

// Each string runs from the weight to its balloon's knot (computed once).
const STRINGS = BALLOONS.map(({ p }) => {
  const a = new Vector3(0, 0, 0)
  const b = new Vector3(p[0], p[1] - ANCHOR_Y - BALLOON_R[1] - 0.05, p[2])
  const dir = b.clone().sub(a)
  const len = dir.length()
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize())
  const e = new Euler().setFromQuaternion(q)
  const mid = a.add(b).multiplyScalar(0.5)
  return { len, pos: [mid.x, mid.y, mid.z] as Vec3, rot: [e.x, e.y, e.z] as Vec3 }
})

/** Balloon (1×1): a bunch of three shiny balloons tied to a little weight, gently swaying. */
export function Balloon() {
  const sway = useRef<Group>(null)
  useFrame(({ clock }) => {
    const g = sway.current
    if (!g) return
    const t = clock.elapsedTime
    const ph = g.id * 0.77 // each placed copy drifts out of step
    g.rotation.z = Math.sin(t * 0.9 + ph) * 0.05
    g.rotation.x = Math.sin(t * 0.7 + ph * 1.3) * 0.04
  })
  return (
    <group>
      {/* weight with a bow */}
      <TCyl radiusTop={0.08} radiusBottom={0.11} height={0.12} position={[0, 0.06, 0]} color={F.lilac} segments={12}>
        <Ol />
      </TCyl>
      <TSphere position={[0, 0.13, 0]} scale={0.04} color={F.pink} segments={8} castShadow={false} />

      <group ref={sway} position={[0, ANCHOR_Y, 0]}>
        {STRINGS.map((s, i) => (
          <TCyl key={i} radiusTop={0.012} height={s.len} position={s.pos} rotation={s.rot} color={F.white} segments={5} castShadow={false} />
        ))}
        {BALLOONS.map(({ p, c }) => {
          const y = p[1] - ANCHOR_Y
          return (
            <group key={c}>
              <TSphere position={[p[0], y, p[2]]} scale={BALLOON_R} color={c} segments={16}>
                <Ol />
              </TSphere>
              <TCone radius={0.04} height={0.06} position={[p[0], y - BALLOON_R[1] - 0.015, p[2]]} color={c} segments={8} castShadow={false} />
              <TSphere position={[p[0] - 0.07, y + 0.09, p[2] + 0.13]} scale={[0.035, 0.05, 0.03]} color={F.white} emissive={F.white} emissiveIntensity={0.3} segments={8} castShadow={false} />
            </group>
          )
        })}
      </group>
    </group>
  )
}
