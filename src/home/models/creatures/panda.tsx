import { Leg } from '../parts'

export function Panda() {
  const white = '#f4f4f4', black = '#222222'
  return (
    <group>
      {/* body */}
      <mesh castShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[0.6, 0.5, 0.68]} />
        <meshStandardMaterial color={white} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 0.74, 0.4]}>
        <boxGeometry args={[0.5, 0.46, 0.42]} />
        <meshStandardMaterial color={white} />
      </mesh>
      {/* black round ears */}
      {[-0.19, 0.19].map((x) => (
        <mesh key={`ear${x}`} castShadow position={[x, 0.99, 0.4]}>
          <sphereGeometry args={[0.11, 12, 12]} />
          <meshStandardMaterial color={black} />
        </mesh>
      ))}
      {/* black eye patches */}
      {[-0.14, 0.14].map((x) => (
        <mesh key={`patch${x}`} position={[x, 0.8, 0.6]}>
          <boxGeometry args={[0.13, 0.16, 0.05]} />
          <meshStandardMaterial color={black} />
        </mesh>
      ))}
      {/* eyes */}
      {[-0.14, 0.14].map((x) => (
        <mesh key={`eye${x}`} position={[x, 0.81, 0.63]}>
          <boxGeometry args={[0.06, 0.07, 0.04]} />
          <meshStandardMaterial color={white} />
        </mesh>
      ))}
      {/* muzzle */}
      <mesh castShadow position={[0, 0.68, 0.63]}>
        <boxGeometry args={[0.2, 0.16, 0.12]} />
        <meshStandardMaterial color={white} />
      </mesh>
      {/* nose */}
      <mesh position={[0, 0.69, 0.7]}>
        <boxGeometry args={[0.09, 0.07, 0.05]} />
        <meshStandardMaterial color={black} />
      </mesh>
      {/* black arms */}
      {[-0.32, 0.32].map((x) => (
        <mesh key={`arm${x}`} castShadow position={[x, 0.4, 0.24]}>
          <boxGeometry args={[0.12, 0.34, 0.18]} />
          <meshStandardMaterial color={black} />
        </mesh>
      ))}
      {/* black legs (animated) */}
      <Leg x={-0.18} z={-0.22} color={black} w={0.16} h={0.2} depth={0.18} phase={0} />
      <Leg x={0.18} z={-0.22} color={black} w={0.16} h={0.2} depth={0.18} phase={Math.PI} />
    </group>
  )
}
