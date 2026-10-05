import { TSphere } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Arm, Blush, Eye, Ink, Leg, Smile, faceYaw, onFace } from '../parts'

const HC = [0, 0.625, 0.03] as const
const HR = [0.31, 0.225, 0.26] as const

/**
 * Frog — a chibi frog: a wide, round lime head with two big eye bulges on top
 * (glossy eyes peeking out of them), a wide happy smile, rosy cheeks, darker
 * spots on the back of the head, a chubby pale tummy and wide light-green feet.
 */
export function Frog() {
  const green = '#7fd46a'
  const greenDark = '#5cb85a'
  const light = '#b6ea95'
  const belly = '#f0fbd6'
  return (
    <group>
      <Leg x={-0.11} y={0.16} color={green} footColor={light} foot={[0.1, 0.045, 0.12]} phase={0} />
      <Leg x={0.11} y={0.16} color={green} footColor={light} foot={[0.1, 0.045, 0.12]} phase={Math.PI} />

      <TSphere position={[0, 0.3, 0]} scale={[0.225, 0.2, 0.205]} color={green} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.28, 0.1]} scale={[0.16, 0.145, 0.12]} color={belly} emissive={belly} emissiveIntensity={0.22} segments={16} castShadow={false} />

      <Arm x={-0.18} y={0.4} z={0.03} color={green} pawColor={light} length={0.085} phase={Math.PI} />
      <Arm x={0.18} y={0.4} z={0.03} color={green} pawColor={light} length={0.085} phase={0} />

      {/* wide round head */}
      <TSphere position={[...HC]} scale={[...HR]} color={green} segments={24}>
        <Ink />
      </TSphere>
      {/* spots on the back of the head */}
      {[
        [-0.1, 0.76, -0.12, 0.05],
        [0.12, 0.74, -0.15, 0.04],
        [0.0, 0.7, -0.22, 0.035],
      ].map(([x, y, z, r]) => (
        <TSphere key={x} position={[x, y, z]} scale={[r, r * 0.6, r]} color={greenDark} segments={10} castShadow={false} />
      ))}

      {/* eye bulges with big glossy eyes */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <TSphere position={[s * 0.12, 0.8, 0.1]} scale={[0.1, 0.097, 0.092]} color={green} segments={18}>
            <Ink />
          </TSphere>
          <Eye position={[s * 0.123, 0.805, 0.174]} size={0.064} yaw={s * 0.22} pitch={-0.12} />
          <Blush position={onFace(HC, HR, s * 0.205, -0.045, -0.004)} yaw={faceYaw(HC, HR, s * 0.205, -0.045)} size={0.06} />
          <TSphere position={onFace(HC, HR, s * 0.035, 0.0, -0.002)} scale={0.011} color={TOON.eye} segments={6} castShadow={false} />
        </group>
      ))}

      {/* wide smile */}
      <Smile position={onFace(HC, HR, 0, -0.06, 0.004)} width={0.085} pitch={-0.25} />
    </group>
  )
}
