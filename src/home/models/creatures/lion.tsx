import { TCapsule, TSphere } from '../../../toon/shapes'
import { Arm, Blush, Eye, Ink, Leg, Smile, Wag, faceYaw, onFace } from '../parts'

const HC = [0, 0.69, 0.04] as const
const HR = [0.25, 0.23, 0.23] as const

// Mane puffs ringing the face (angle from straight up, radius from the head centre, size).
const MANE: [number, number, number][] = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2
  const low = Math.max(0, -Math.cos(a)) // smaller puffs under the chin
  return [a, 0.245 - low * 0.03, 0.11 - low * 0.03]
})

/**
 * Lion — a chibi lion cub: a golden face framed by a big fluffy rust-orange
 * mane (a back puff plus a scalloped ring of tufts), little round ears poking
 * out on top, a cream muzzle, and a tail with a dark tuft.
 */
export function Lion() {
  const gold = '#ffc45e'
  const mane = '#df7638'
  const cream = '#fff1d2'
  const brown = '#8a4a2c'
  return (
    <group>
      <Leg x={-0.1} y={0.17} color={gold} footColor={cream} phase={0} />
      <Leg x={0.1} y={0.17} color={gold} footColor={cream} phase={Math.PI} />

      <TSphere position={[0, 0.33, 0]} scale={[0.22, 0.21, 0.2]} color={gold} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.3, 0.1]} scale={[0.15, 0.15, 0.115]} color={cream} emissive={cream} emissiveIntensity={0.22} segments={16} castShadow={false} />

      <Arm x={-0.18} y={0.44} z={0.02} color={gold} pawColor={cream} phase={Math.PI} />
      <Arm x={0.18} y={0.44} z={0.02} color={gold} pawColor={cream} phase={0} />

      {/* tail with a dark tuft */}
      <Wag position={[0, 0.2, -0.17]} amp={0.3}>
        <group rotation={[2.25, 0, 0]}>
          <TCapsule radius={0.038} length={0.22} position={[0, -0.13, 0]} color={gold} segments={10}>
            <Ink />
          </TCapsule>
          <TSphere position={[0, -0.27, 0]} scale={[0.07, 0.08, 0.07]} color={brown} segments={12}>
            <Ink />
          </TSphere>
        </group>
      </Wag>

      {/* mane: a big back puff and a ring of tufts around the face */}
      <TSphere position={[0, 0.7, -0.05]} scale={[0.31, 0.3, 0.24]} color={mane} segments={20}>
        <Ink />
      </TSphere>
      {MANE.map(([a, r, s]) => (
        <TSphere
          key={a}
          position={[Math.sin(a) * r, HC[1] + Math.cos(a) * r, -0.01]}
          scale={[s, s, s * 0.85]}
          color={mane}
          segments={14}
        >
          <Ink />
        </TSphere>
      ))}

      {/* round ears on top of the mane */}
      {[-1, 1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.17, 0.93, 0.02]} rotation={[0, 0, -s * 0.3]}>
          <TSphere scale={[0.07, 0.065, 0.045]} color={gold} segments={12}>
            <Ink />
          </TSphere>
          <TSphere position={[0, -0.004, 0.026]} scale={[0.04, 0.038, 0.022]} color={cream} segments={10} castShadow={false} />
        </group>
      ))}

      {/* face */}
      <TSphere position={[...HC]} scale={[...HR]} color={gold} segments={24}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <TSphere key={`m${s}`} position={[s * 0.055, 0.615, 0.205]} scale={[0.078, 0.065, 0.068]} color={cream} emissive={cream} emissiveIntensity={0.15} segments={14}>
          <Ink />
        </TSphere>
      ))}
      <TSphere position={[0, 0.655, 0.27]} scale={[0.04, 0.03, 0.028]} color={brown} segments={10} castShadow={false} />
      <Smile position={[0, 0.6, 0.27]} width={0.028} cat pitch={-0.2} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(HC, HR, s * 0.095, 0.03, -0.013)} size={0.058} yaw={faceYaw(HC, HR, s * 0.095, 0.03)} />
          <Blush position={onFace(HC, HR, s * 0.16, -0.045, -0.004)} yaw={faceYaw(HC, HR, s * 0.16, -0.045)} color="#ff8a96" />
        </group>
      ))}
    </group>
  )
}
