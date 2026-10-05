import { TCapsule, TCone, TSphere } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Arm, Blush, Eye, Ink, Leg, Smile, Wag, Wing, faceYaw, onFace } from '../parts'

const HC = [0, 0.69, 0.03] as const
const HR = [0.27, 0.245, 0.25] as const

/**
 * Dragonet — a baby dragon: sky-aqua with a butter-cream tummy, a round snout,
 * stubby cream horns, little fin ears, pink back spikes, small flapping pink
 * wings and a wagging tail with a pink spade tip.
 */
export function Dragonet() {
  const aqua = '#6fc8ea'
  const aquaDark = '#4ea6cf'
  const belly = '#fff3c6'
  const horn = '#fff1d2'
  const pink = '#ff9fc6'
  return (
    <group>
      <Leg x={-0.1} y={0.17} color={aqua} phase={0} />
      <Leg x={0.1} y={0.17} color={aqua} phase={Math.PI} />

      <TSphere position={[0, 0.33, 0]} scale={[0.22, 0.21, 0.2]} color={aqua} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.3, 0.1]} scale={[0.15, 0.155, 0.115]} color={belly} emissive={belly} emissiveIntensity={0.22} segments={16} castShadow={false} />

      <Arm x={-0.18} y={0.44} z={0.02} color={aqua} phase={Math.PI} />
      <Arm x={0.18} y={0.44} z={0.02} color={aqua} phase={0} />

      {/* back spikes */}
      {[
        [0.5, -0.155, 0.045],
        [0.39, -0.2, 0.04],
        [0.28, -0.205, 0.034],
      ].map(([y, z, r]) => (
        <TCone key={y} position={[0, y, z]} rotation={[-1.1, 0, 0]} radius={r} height={r * 2} segments={8} scale={[0.6, 1, 1]} color={pink}>
          <Ink crease />
        </TCone>
      ))}

      {/* tail with a spade tip */}
      <Wag position={[0, 0.17, -0.16]} amp={0.35}>
        <group rotation={[1.95, 0, 0]}>
          <TCapsule radius={0.05} length={0.18} position={[0, -0.1, 0]} color={aqua} segments={10}>
            <Ink />
          </TCapsule>
          <TCone position={[0, -0.24, 0]} rotation={[Math.PI, 0, 0]} radius={0.065} height={0.1} segments={4} scale={[1, 1, 0.35]} color={pink}>
            <Ink crease />
          </TCone>
        </group>
      </Wag>

      {/* little flapping wings */}
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.1} y={0.47} z={-0.15} side={s} rest={[0, 0.55, 0.45]} flap={0.35}>
          <TCapsule radius={0.022} length={0.16} position={[0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]} color={aquaDark} segments={8}>
            <Ink />
          </TCapsule>
          <TSphere position={[0.11, -0.055, 0]} scale={[0.1, 0.07, 0.02]} color={pink} segments={14}>
            <Ink />
          </TSphere>
        </Wing>
      ))}

      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={aqua} segments={24}>
        <Ink />
      </TSphere>
      {/* stubby horns + fin ears */}
      {[-1, 1].map((s) => (
        <group key={`h${s}`}>
          <TCone position={[s * 0.1, 0.92, -0.04]} rotation={[-0.45, 0, -s * 0.25]} radius={0.042} height={0.13} segments={10} color={horn}>
            <Ink crease />
          </TCone>
          <TCone position={[s * 0.27, 0.76, -0.02]} rotation={[0, 0, -s * 1.05]} radius={0.06} height={0.14} segments={8} scale={[1, 1, 0.35]} color={aquaDark}>
            <Ink crease />
          </TCone>
        </group>
      ))}
      {/* round snout, nostrils, smile */}
      <TSphere position={[0, 0.615, 0.17]} scale={[0.14, 0.09, 0.11]} color={aqua} segments={16}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <TSphere key={`n${s}`} position={[s * 0.035, 0.645, 0.27]} scale={0.011} color={TOON.eye} segments={6} castShadow={false} />
      ))}
      <Smile position={[0, 0.6, 0.28]} width={0.035} pitch={-0.35} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(HC, HR, s * 0.105, 0.03, -0.014)} size={0.064} yaw={faceYaw(HC, HR, s * 0.105, 0.03)} />
          <Blush position={onFace(HC, HR, s * 0.19, -0.04, -0.004)} yaw={faceYaw(HC, HR, s * 0.19, -0.04)} />
        </group>
      ))}
    </group>
  )
}
