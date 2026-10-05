import { TCone, TSphere } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Arm, Blush, Eye, Ink, Leg, Smile, Wag, faceYaw, onFace } from '../parts'

// Head ellipsoid (centre + radii): face features and the anchors are measured from it.
const HC = [0, 0.69, 0.02] as const
const HR = [0.27, 0.245, 0.25] as const

/**
 * Fox — a chibi plush fox: a big round orange head with a cream muzzle, tall
 * pointy ears with pink insides and dark tips, a cream tummy, dark socks and
 * paws, and a huge fluffy white-tipped tail that wags behind.
 */
export function Fox() {
  const orange = '#f7924a'
  const cream = '#fff4e2'
  const sock = '#6b4434'
  const pink = '#ffb3ad'
  return (
    <group>
      <Leg x={-0.1} y={0.17} color={sock} phase={0} />
      <Leg x={0.1} y={0.17} color={sock} phase={Math.PI} />

      {/* body + cream tummy */}
      <TSphere position={[0, 0.33, 0]} scale={[0.22, 0.21, 0.2]} color={orange} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.3, 0.1]} scale={[0.15, 0.15, 0.115]} color={cream} emissive={cream} emissiveIntensity={0.22} segments={16} castShadow={false} />

      <Arm x={-0.18} y={0.44} z={0.02} color={orange} pawColor={sock} phase={Math.PI} />
      <Arm x={0.18} y={0.44} z={0.02} color={orange} pawColor={sock} phase={0} />

      {/* big fluffy tail, swept up behind and wagging */}
      <Wag position={[0, 0.24, -0.16]} amp={0.35}>
        <group rotation={[0.8, 0, 0]}>
          <TSphere position={[0, 0.02, -0.17]} scale={[0.13, 0.13, 0.21]} color={orange} segments={16}>
            <Ink />
          </TSphere>
          <TSphere position={[0, 0.02, -0.36]} scale={0.095} color={cream} segments={14}>
            <Ink />
          </TSphere>
        </group>
      </Wag>

      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={orange} segments={24}>
        <Ink />
      </TSphere>
      {/* cream muzzle, button nose, little cat mouth */}
      <TSphere position={[0, 0.6, 0.13]} scale={[0.19, 0.105, 0.15]} color={cream} emissive={cream} emissiveIntensity={0.15} segments={18}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.655, 0.275]} scale={[0.04, 0.03, 0.03]} color={TOON.eye} segments={10} castShadow={false} />
      <Smile position={[0, 0.607, 0.276]} width={0.03} cat pitch={-0.3} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(HC, HR, s * 0.1, 0.015, -0.014)} size={0.062} yaw={faceYaw(HC, HR, s * 0.1, 0.015)} />
          <Blush position={onFace(HC, HR, s * 0.185, -0.035, -0.004)} yaw={faceYaw(HC, HR, s * 0.185, -0.035)} color="#ff7f97" />
        </group>
      ))}

      {/* tall pointy ears: orange outside, pink inside, dark tips */}
      {[-1, 1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.15, 0.88, 0.0]} rotation={[-0.08, 0, -s * 0.38]}>
          <TCone radius={0.115} height={0.27} segments={14} scale={[1, 1, 0.55]} position={[0, 0.07, 0]} color={orange}>
            <Ink crease />
          </TCone>
          <TCone radius={0.07} height={0.17} segments={12} scale={[1, 1, 0.4]} position={[0, 0.05, 0.035]} color={pink} castShadow={false} />
          <TCone radius={0.048} height={0.08} segments={12} scale={[1, 1, 0.6]} position={[0, 0.17, 0.002]} color={sock} castShadow={false} />
        </group>
      ))}
    </group>
  )
}
