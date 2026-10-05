import { TSphere } from '../../../toon/shapes'
import { Blush, Eye, Ink, Smile, Tentacle, faceYaw, onFace } from '../parts'

// The mantle is the octopus' head and body in one.
const HC = [0, 0.55, 0] as const
const HR = [0.31, 0.35, 0.29] as const

const ARMS = Array.from({ length: 8 }, (_, i) => (i + 0.5) * (Math.PI / 4))

/**
 * Octopus — a chibi octopus: a big round lilac mantle with pale spots, big
 * glossy eyes low on the front, rosy cheeks and a tiny smile, standing on eight
 * curling tentacles that wiggle softly at rest and paddle while it walks.
 */
export function Octopus() {
  const lilac = '#b98cf0'
  const pale = '#e2cffd'
  const tip = '#d4b8fa'
  return (
    <group>
      {/* eight tentacles splayed around the base, curling outward */}
      {ARMS.map((a, i) => (
        <Tentacle
          key={a}
          x={Math.sin(a) * 0.17}
          y={0.235}
          z={Math.cos(a) * 0.15}
          yaw={a + Math.PI}
          color={lilac}
          tipColor={tip}
          phase={i * 0.8}
        />
      ))}

      {/* mantle */}
      <TSphere position={[...HC]} scale={[...HR]} color={lilac} segments={24}>
        <Ink />
      </TSphere>
      {/* pale spots over the top of the mantle */}
      {[
        [0.11, 0.03, 0.05],
        [-0.13, -0.05, 0.06],
        [0.23, -0.06, 0.045],
        [0.04, -0.15, 0.04],
        [-0.22, -0.17, 0.045],
      ].map(([x, z, r]) => {
        // lie each spot flat on the upper mantle surface above (x, z)
        const y = HC[1] + HR[1] * Math.sqrt(Math.max(0, 1 - (x / HR[0]) ** 2 - (z / HR[2]) ** 2)) - 0.004
        const nx = x / HR[0] ** 2
        const ny = (y - HC[1]) / HR[1] ** 2
        const nz = z / HR[2] ** 2
        return (
          <group key={x} position={[x, y, z]} rotation={[-Math.atan2(ny, Math.hypot(nx, nz)), Math.atan2(nx, nz), 0, 'YXZ']}>
            <TSphere rotation={[Math.PI / 2, 0, 0]} scale={[r, 0.012, r]} color={pale} segments={12} castShadow={false} />
          </group>
        )
      })}

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(HC, HR, s * 0.12, -0.06, -0.016)} size={0.072} yaw={faceYaw(HC, HR, s * 0.12, -0.06)} pitch={0.08} />
          <Blush position={onFace(HC, HR, s * 0.205, -0.14, -0.006)} yaw={faceYaw(HC, HR, s * 0.205, -0.14)} size={0.055} />
        </group>
      ))}
      <Smile position={onFace(HC, HR, 0, -0.15, 0.002)} width={0.035} pitch={-0.45} />
    </group>
  )
}
