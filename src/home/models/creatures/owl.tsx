import { TCone, TSphere } from '../../../toon/shapes'
import { Blush, Eye, Ink, Leg, Wing, faceYaw, onFace } from '../parts'

const HC = [0, 0.7, 0.02] as const
const HR = [0.28, 0.245, 0.25] as const

/**
 * Owl — a round chibi owlet: one soft caramel egg of a body topped by a big
 * head with a cream heart-shaped face disc, huge amber-ringed glossy eyes, a
 * little orange beak and feathery ear tufts; a cream chest with feather
 * chevrons, flapping wings and orange feet.
 */
export function Owl() {
  const caramel = '#c99064'
  const wing = '#a8714c'
  const cream = '#fdf1dc'
  const chest = '#f6dfb9'
  const amber = '#ffc04d'
  const beak = '#ff9f3d'
  return (
    <group>
      <Leg x={-0.1} y={0.12} color={beak} radius={0.045} foot={[0.07, 0.04, 0.09]} phase={0} />
      <Leg x={0.1} y={0.12} color={beak} radius={0.045} foot={[0.07, 0.04, 0.09]} phase={Math.PI} />

      {/* egg body + cream chest with feather chevrons */}
      <TSphere position={[0, 0.38, 0]} scale={[0.255, 0.27, 0.235]} color={caramel} segments={22}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.33, 0.1]} scale={[0.17, 0.18, 0.15]} color={chest} emissive={chest} emissiveIntensity={0.22} segments={16} castShadow={false} />
      {[
        [-0.06, 0.38],
        [0.06, 0.38],
        [0, 0.3],
      ].map(([x, y]) => (
        <TCone
          key={`${x}${y}`}
          position={[x, y, onFace([0, 0.33, 0.1], [0.17, 0.18, 0.15], x, y - 0.33, -0.004)[2]]}
          rotation={[Math.PI - 0.35, 0, 0]}
          radius={0.03}
          height={0.03}
          segments={3}
          scale={[1, 1, 0.3]}
          color={wing}
          castShadow={false}
        />
      ))}
      {/* tail feathers */}
      <TCone position={[0, 0.16, -0.22]} rotation={[-2.3, 0, 0]} radius={0.07} height={0.12} segments={8} scale={[1, 1, 0.45]} color={wing}>
        <Ink crease />
      </TCone>

      {/* wings */}
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.235} y={0.47} z={-0.01} side={s} rest={[0, 0.25, 0.22]} flap={0.22}>
          <TSphere position={[0.02, -0.12, 0]} rotation={[0, 0, 0.12]} scale={[0.07, 0.16, 0.11]} color={wing} segments={14}>
            <Ink />
          </TSphere>
        </Wing>
      ))}

      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={caramel} segments={24}>
        <Ink />
      </TSphere>
      {/* ear tufts */}
      {[-1, 1].map((s) => (
        <TCone
          key={`tuft${s}`}
          position={[s * 0.17, 0.92, -0.02]}
          rotation={[-0.15, 0, -s * 0.55]}
          radius={0.065}
          height={0.16}
          segments={10}
          scale={[1, 1, 0.5]}
          color={wing}
        >
          <Ink crease />
        </TCone>
      ))}

      {[-1, 1].map((s) => {
        const dx = s * 0.1
        const dy = 0.01
        const yaw = faceYaw(HC, HR, dx, dy)
        return (
          <group key={s}>
            {/* heart-shaped face disc: one cream lobe per eye */}
            <TSphere position={onFace(HC, HR, s * 0.088, 0.0, -0.035)} rotation={[0, yaw, -s * 0.25]} scale={[0.115, 0.13, 0.05]} color={cream} emissive={cream} emissiveIntensity={0.15} segments={16} castShadow={false} />
            {/* amber ring + big eye */}
            <TSphere position={onFace(HC, HR, dx, dy, -0.012)} rotation={[0, yaw, 0]} scale={[0.074, 0.078, 0.03]} color={amber} segments={16} castShadow={false} />
            <Eye position={onFace(HC, HR, dx, dy, -0.004)} size={0.06} wide={0.9} yaw={yaw} />
            <Blush position={onFace(HC, HR, s * 0.195, -0.08, -0.004)} yaw={faceYaw(HC, HR, s * 0.195, -0.08)} size={0.045} />
          </group>
        )
      })}
      {/* beak */}
      <TCone position={onFace(HC, HR, 0, -0.065, 0.012)} rotation={[Math.PI - 0.35, 0, 0]} radius={0.032} height={0.06} segments={8} color={beak}>
        <Ink crease />
      </TCone>
    </group>
  )
}
