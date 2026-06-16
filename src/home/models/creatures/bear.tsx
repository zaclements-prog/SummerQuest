import { Leg } from '../parts'

export function Bear() {
  const brown = '#8a5a36', tan = '#c9a06a', dark = '#2a1c12'
  return (
    <group>
      {/* chunky body */}
      <mesh castShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[0.62, 0.5, 0.7]} />
        <meshStandardMaterial color={brown} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 0.74, 0.4]}>
        <boxGeometry args={[0.5, 0.46, 0.42]} />
        <meshStandardMaterial color={brown} />
      </mesh>
      {/* round ears */}
      {[-0.18, 0.18].map((x) => (
        <mesh key={`ear${x}`} castShadow position={[x, 0.98, 0.4]}>
          <sphereGeometry args={[0.11, 12, 12]} />
          <meshStandardMaterial color={brown} />
        </mesh>
      ))}
      {/* muzzle */}
      <mesh castShadow position={[0, 0.68, 0.63]}>
        <boxGeometry args={[0.26, 0.2, 0.14]} />
        <meshStandardMaterial color={tan} />
      </mesh>
      {/* nose */}
      <mesh position={[0, 0.7, 0.71]}>
        <boxGeometry args={[0.1, 0.08, 0.05]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* eyes */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={`eye${x}`} position={[x, 0.82, 0.62]}>
          <boxGeometry args={[0.07, 0.08, 0.04]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* stubby legs (animated: diagonal pairs swing together) */}
      <Leg x={-0.2} z={0.24} color={brown} w={0.16} h={0.2} phase={0} />
      <Leg x={0.2} z={0.24} color={brown} w={0.16} h={0.2} phase={Math.PI} />
      <Leg x={-0.2} z={-0.24} color={brown} w={0.16} h={0.2} phase={Math.PI} />
      <Leg x={0.2} z={-0.24} color={brown} w={0.16} h={0.2} phase={0} />
    </group>
  )
}
