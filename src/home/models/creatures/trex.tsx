import { TCone, TSphere } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Arm, Blush, Eye, Ink, Leg, Wag, faceYaw, frontZ, onFace } from '../parts'

const HC = [0, 0.71, 0.02] as const
const HR = [0.265, 0.24, 0.25] as const
// the long snout (upper jaw)
const SC = [0, 0.645, 0.18] as const
const SR = [0.2, 0.1, 0.19] as const

/**
 * T-Rex — a chibi dino: a big green head with a long rounded snout and an
 * open, toothy grin (pale jaw, pink tongue, little white teeth), brow ridges
 * and darker spots on the crown, tiny arms held up in front, chunky legs, a
 * pale-yellow tummy, orange plates down the neck and back, and a thick tail
 * that rests on the floor and sways.
 */
export function Trex() {
  const green = '#68c27a'
  const spot = '#4fa765'
  const belly = '#f8f1b4'
  const plate = '#ffad5a'
  return (
    <group>
      <Leg x={-0.11} y={0.17} color={green} radius={0.075} foot={[0.09, 0.055, 0.12]} phase={0} />
      <Leg x={0.11} y={0.17} color={green} radius={0.075} foot={[0.09, 0.055, 0.12]} phase={Math.PI} />

      <TSphere position={[0, 0.33, -0.02]} scale={[0.22, 0.22, 0.21]} color={green} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.3, 0.085]} scale={[0.15, 0.16, 0.115]} color={belly} emissive={belly} emissiveIntensity={0.22} segments={16} castShadow={false} />

      {/* tiny arms held up in front */}
      <Arm x={-0.14} y={0.43} z={0.12} color={green} radius={0.035} length={0.05} splay={0.25} pitch={0.9} swing={0.3} phase={Math.PI} />
      <Arm x={0.14} y={0.43} z={0.12} color={green} radius={0.035} length={0.05} splay={0.25} pitch={0.9} swing={0.3} phase={0} />

      {/* back plates */}
      {[
        [0.86, -0.18, 0.055],
        [0.53, -0.2, 0.055],
        [0.39, -0.225, 0.05],
      ].map(([y, z, r]) => (
        <TCone key={y} position={[0, y, z]} rotation={[-1.0, 0, 0]} radius={r} height={r * 1.9} segments={8} scale={[0.55, 1, 1]} color={plate}>
          <Ink crease />
        </TCone>
      ))}

      {/* thick tail resting on the floor, swaying */}
      <Wag position={[0, 0.24, -0.17]} amp={0.22} speed={2.4}>
        <group rotation={[-0.3, 0, 0]}>
          <TSphere position={[0, -0.03, -0.1]} scale={[0.13, 0.11, 0.17]} color={green} segments={16}>
            <Ink />
          </TSphere>
          <TSphere position={[0, -0.06, -0.27]} scale={[0.075, 0.065, 0.11]} color={green} segments={14}>
            <Ink />
          </TSphere>
          <TCone position={[0, 0.08, -0.15]} rotation={[-1.2, 0, 0]} radius={0.045} height={0.085} segments={8} scale={[0.55, 1, 1]} color={plate}>
            <Ink crease />
          </TCone>
        </group>
      </Wag>

      {/* big head, crown spots */}
      <TSphere position={[...HC]} scale={[...HR]} color={green} segments={24}>
        <Ink />
      </TSphere>
      {[
        [-0.09, 0.9, -0.06, 0.04],
        [0.1, 0.91, -0.03, 0.033],
        [0.0, 0.94, 0.06, 0.028],
      ].map(([x, y, z, r]) => (
        <TSphere key={x} position={[x, y, z]} scale={[r, r * 0.55, r]} color={spot} segments={10} castShadow={false} />
      ))}

      {/* open toothy grin: the long upper snout, a dropped pale jaw, a dark mouth
          between them with a pink tongue, and little white teeth */}
      <TSphere position={[...SC]} scale={[...SR]} color={green} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.575, 0.2]} scale={[0.15, 0.05, 0.14]} color="#7a3148" segments={14} castShadow={false} />
      <group position={[0, 0.535, 0.16]} rotation={[0.16, 0, 0]}>
        <TSphere scale={[0.165, 0.058, 0.165]} color={belly} emissive={belly} emissiveIntensity={0.15} segments={16}>
          <Ink />
        </TSphere>
        <TSphere position={[0, 0.042, 0.1]} scale={[0.065, 0.022, 0.045]} color="#ff8ca0" segments={10} castShadow={false} />
      </group>
      {[-0.1, -0.04, 0.04, 0.1].map((x) => (
        <TCone
          key={x}
          position={[x, SC[1] - SR[1] * 0.62, SC[2] + frontZ(SR[0], SR[2], SR[2], x, 0) * 0.86]}
          rotation={[Math.PI, 0, 0]}
          radius={0.016}
          height={0.034}
          segments={6}
          color={TOON.white}
          castShadow={false}
        />
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <TSphere position={[s * 0.045, 0.705, 0.335]} scale={0.013} color={TOON.eye} segments={6} castShadow={false} />
          {/* little brow ridge over each eye */}
          <TSphere position={onFace(HC, HR, s * 0.12, 0.14, -0.012)} rotation={[0, faceYaw(HC, HR, s * 0.12, 0.14), s * -0.25]} scale={[0.055, 0.022, 0.03]} color={spot} segments={10} castShadow={false} />
          <Eye position={onFace(HC, HR, s * 0.11, 0.08, -0.014)} size={0.06} yaw={faceYaw(HC, HR, s * 0.11, 0.08)} pitch={-0.15} />
          <Blush position={[s * 0.165, 0.67, 0.27]} yaw={s * 0.65} />
        </group>
      ))}
    </group>
  )
}
