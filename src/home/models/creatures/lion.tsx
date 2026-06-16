import { Leg } from '../parts'

export function Lion() {
  const tan = '#d6a44c', mane = '#9c5a2c', dark = '#3a2a20'
  return (
    <group>
      {/* body */}
      <mesh castShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[0.5, 0.42, 0.72]} />
        <meshStandardMaterial color={tan} />
      </mesh>
      {/* mane ring (~8 cones around the head) */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        const x = Math.cos(a) * 0.3
        const y = 0.64 + Math.sin(a) * 0.3
        return (
          <mesh key={`mane${i}`} castShadow position={[x, y, 0.34]} rotation={[0, 0, -a + Math.PI / 2]}>
            <coneGeometry args={[0.1, 0.22, 4]} />
            <meshStandardMaterial color={mane} />
          </mesh>
        )
      })}
      {/* head */}
      <mesh castShadow position={[0, 0.64, 0.44]}>
        <boxGeometry args={[0.4, 0.38, 0.34]} />
        <meshStandardMaterial color={tan} />
      </mesh>
      {/* muzzle */}
      <mesh castShadow position={[0, 0.57, 0.63]}>
        <boxGeometry args={[0.22, 0.18, 0.14]} />
        <meshStandardMaterial color={tan} />
      </mesh>
      {/* nose */}
      <mesh position={[0, 0.59, 0.71]}>
        <boxGeometry args={[0.08, 0.06, 0.05]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* eyes */}
      {[-0.11, 0.11].map((x) => (
        <mesh key={`eye${x}`} position={[x, 0.71, 0.6]}>
          <boxGeometry args={[0.06, 0.08, 0.04]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* small ears */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={`ear${x}`} castShadow position={[x, 0.85, 0.42]}>
          <boxGeometry args={[0.1, 0.1, 0.06]} />
          <meshStandardMaterial color={tan} />
        </mesh>
      ))}
      {/* legs (animated: diagonal pairs swing together) */}
      <Leg x={-0.16} z={0.26} color={tan} w={0.13} phase={0} />
      <Leg x={0.16} z={0.26} color={tan} w={0.13} phase={Math.PI} />
      <Leg x={-0.16} z={-0.26} color={tan} w={0.13} phase={Math.PI} />
      <Leg x={0.16} z={-0.26} color={tan} w={0.13} phase={0} />
      {/* tail with tuft */}
      <mesh castShadow position={[0, 0.46, -0.5]} rotation={[0.6, 0, 0]}>
        <boxGeometry args={[0.08, 0.08, 0.4]} />
        <meshStandardMaterial color={tan} />
      </mesh>
      <mesh position={[0, 0.58, -0.62]}>
        <boxGeometry args={[0.12, 0.14, 0.12]} />
        <meshStandardMaterial color={dark} />
      </mesh>
    </group>
  )
}
