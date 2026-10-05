import { TSphere } from '../../../toon/shapes'
import { Arm, Blush, Eye, Ink, Leg, Smile, faceYaw, onFace } from '../parts'

const HC = [0, 0.69, 0.02] as const
const HR = [0.28, 0.25, 0.25] as const

/**
 * Bear — a huggable chibi teddy: warm brown fur, round ears with tan insides,
 * a soft tan muzzle with a big dark button nose, a tan tummy and paw pads, and
 * a little bobble tail.
 */
export function Bear() {
  const brown = '#bd8559'
  const tan = '#f1d4ac'
  const pad = '#e9b98f'
  const nose = '#4a3030'
  return (
    <group>
      <Leg x={-0.1} y={0.17} color={brown} phase={0} />
      <Leg x={0.1} y={0.17} color={brown} phase={Math.PI} />

      <TSphere position={[0, 0.33, 0]} scale={[0.225, 0.215, 0.205]} color={brown} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.3, 0.1]} scale={[0.155, 0.155, 0.12]} color={tan} emissive={tan} emissiveIntensity={0.22} segments={16} castShadow={false} />
      {/* bobble tail */}
      <TSphere position={[0, 0.22, -0.2]} scale={0.06} color={brown} segments={12}>
        <Ink />
      </TSphere>

      <Arm x={-0.185} y={0.44} z={0.02} color={brown} pawColor={pad} phase={Math.PI} />
      <Arm x={0.185} y={0.44} z={0.02} color={brown} pawColor={pad} phase={0} />

      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={brown} segments={24}>
        <Ink />
      </TSphere>
      {/* round ears */}
      {[-1, 1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.19, 0.885, 0.0]} rotation={[0, 0, -s * 0.4]}>
          <TSphere scale={[0.09, 0.088, 0.06]} color={brown} segments={14}>
            <Ink />
          </TSphere>
          <TSphere position={[0, -0.005, 0.035]} scale={[0.055, 0.053, 0.03]} color={pad} segments={12} castShadow={false} />
        </group>
      ))}
      {/* muzzle + button nose + smile */}
      <TSphere position={[0, 0.61, 0.17]} scale={[0.125, 0.09, 0.105]} color={tan} emissive={tan} emissiveIntensity={0.15} segments={16}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.653, 0.262]} scale={[0.048, 0.034, 0.03]} color={nose} segments={10} castShadow={false} />
      <Smile position={[0, 0.6, 0.272]} width={0.03} cat pitch={-0.35} color={nose} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(HC, HR, s * 0.11, 0.03, -0.014)} size={0.06} yaw={faceYaw(HC, HR, s * 0.11, 0.03)} />
          <Blush position={onFace(HC, HR, s * 0.18, -0.045, -0.004)} yaw={faceYaw(HC, HR, s * 0.18, -0.045)} color="#ff8fa0" />
        </group>
      ))}
    </group>
  )
}
