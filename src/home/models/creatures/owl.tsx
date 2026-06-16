import { Wing } from '../parts'

export function Owl() {
  const body = '#9c7a52', white = '#f5efe2', orange = '#e8843c', dark = '#2a1f14'
  return (
    <group>
      {/* upright rounded body */}
      <mesh castShadow position={[0, 0.46, 0]}>
        <boxGeometry args={[0.5, 0.7, 0.42]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* belly */}
      <mesh position={[0, 0.42, 0.22]}>
        <boxGeometry args={[0.32, 0.46, 0.06]} />
        <meshStandardMaterial color={white} />
      </mesh>
      {/* front-facing eye discs */}
      {[-0.13, 0.13].map((x) => (
        <group key={`eye${x}`}>
          <mesh position={[x, 0.66, 0.21]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.04, 16]} />
            <meshStandardMaterial color={white} />
          </mesh>
          <mesh position={[x, 0.66, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />
            <meshStandardMaterial color={dark} />
          </mesh>
        </group>
      ))}
      {/* beak */}
      <mesh castShadow position={[0, 0.54, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.06, 0.14, 4]} />
        <meshStandardMaterial color={orange} />
      </mesh>
      {/* ear tufts */}
      {[-0.18, 0.18].map((x) => (
        <mesh key={`tuft${x}`} castShadow position={[x, 0.86, 0.05]}>
          <coneGeometry args={[0.08, 0.2, 4]} />
          <meshStandardMaterial color={body} />
        </mesh>
      ))}
      {/* wings (animated: flap continuously) */}
      <Wing x={-0.27} y={0.44} z={0} side={-1} color={body} w={0.5} thickness={0.06} d={0.34} />
      <Wing x={0.27} y={0.44} z={0} side={1} color={body} w={0.5} thickness={0.06} d={0.34} />
      {/* feet */}
      {[-0.12, 0.12].map((x) => (
        <mesh key={`foot${x}`} castShadow position={[x, 0.05, 0.16]}>
          <boxGeometry args={[0.12, 0.1, 0.16]} />
          <meshStandardMaterial color={orange} />
        </mesh>
      ))}
    </group>
  )
}
