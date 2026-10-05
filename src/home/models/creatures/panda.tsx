import { TSphere } from '../../../toon/shapes'
import { Arm, Blush, Eye, Ink, Leg, Smile, faceYaw, onFace } from '../parts'

const HC = [0, 0.69, 0.02] as const
const HR = [0.285, 0.25, 0.25] as const

/**
 * Panda — a chibi panda: a round white head with soft black ears and droopy
 * teardrop eye patches (big glossy eyes on top), a little white muzzle with a
 * black nose, black arms and legs, and a white tummy and bobble tail.
 */
export function Panda() {
  const white = '#fcfbf6'
  const black = '#3b3440'
  const cream = '#fffdf6'
  return (
    <group>
      <Leg x={-0.1} y={0.17} color={black} phase={0} />
      <Leg x={0.1} y={0.17} color={black} phase={Math.PI} />

      <TSphere position={[0, 0.33, 0]} scale={[0.225, 0.215, 0.205]} color={white} segments={20}>
        <Ink />
      </TSphere>
      {/* black shoulder band */}
      <TSphere position={[0, 0.43, -0.01]} scale={[0.2, 0.08, 0.17]} color={black} segments={16} castShadow={false} />
      <TSphere position={[0, 0.22, -0.2]} scale={0.055} color={white} segments={12}>
        <Ink />
      </TSphere>

      <Arm x={-0.185} y={0.44} z={0.02} color={black} phase={Math.PI} />
      <Arm x={0.185} y={0.44} z={0.02} color={black} phase={0} />

      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={white} segments={24}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.195, 0.88, -0.01]} rotation={[0, 0, -s * 0.4]}>
          <TSphere scale={[0.09, 0.088, 0.065]} color={black} segments={14}>
            <Ink />
          </TSphere>
        </group>
      ))}
      {/* muzzle + nose + smile */}
      <TSphere position={[0, 0.615, 0.17]} scale={[0.11, 0.08, 0.1]} color={cream} emissive={cream} emissiveIntensity={0.15} segments={16}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.652, 0.262]} scale={[0.042, 0.03, 0.028]} color={black} segments={10} castShadow={false} />
      <Smile position={[0, 0.603, 0.268]} width={0.028} cat pitch={-0.35} color={black} />

      {[-1, 1].map((s) => {
        const dx = s * 0.11
        const dy = 0.02
        const p = onFace(HC, HR, dx + s * 0.012, dy - 0.012, -0.022)
        return (
          <group key={s}>
            {/* droopy teardrop patch behind the eye */}
            <TSphere
              position={p}
              rotation={[0, faceYaw(HC, HR, dx, dy), s * 0.55]}
              scale={[0.072, 0.095, 0.035]}
              color={black}
              segments={14}
              castShadow={false}
            />
            <Eye position={onFace(HC, HR, dx, dy, -0.008)} size={0.058} yaw={faceYaw(HC, HR, dx, dy)} color="#1e1822" />
            <Blush position={onFace(HC, HR, s * 0.19, -0.07, -0.004)} yaw={faceYaw(HC, HR, s * 0.19, -0.07)} color="#ffa0b4" />
          </group>
        )
      })}
    </group>
  )
}
