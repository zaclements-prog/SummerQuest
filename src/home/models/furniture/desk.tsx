export function Desk() {
  const wood = '#a9743f'
  const dark = '#7d5028'
  const knob = '#3a2a1a'
  return (
    <group>
      {/* flat tabletop — w(x) 1.8 × d(z) 0.8 */}
      <mesh castShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[1.8, 0.1, 0.8]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {/* two legs on the open (left) end */}
      {([
        [-0.82, -0.32],
        [-0.82, 0.32],
      ] as [number, number][]).map(([x, z]) => (
        <mesh key={`leg-${x}-${z}`} castShadow position={[x, 0.34, z]}>
          <boxGeometry args={[0.09, 0.66, 0.09]} />
          <meshStandardMaterial color={wood} />
        </mesh>
      ))}
      {/* side drawer cabinet under the right end */}
      <mesh castShadow position={[0.62, 0.34, 0]}>
        <boxGeometry args={[0.5, 0.62, 0.72]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {/* two drawer lines on the cabinet front */}
      {[0.46, 0.22].map((y) => (
        <mesh key={`drawer${y}`} position={[0.62, y, 0.37]}>
          <boxGeometry args={[0.4, 0.14, 0.02]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* knobs */}
      {[0.46, 0.22].map((y) => (
        <mesh key={`knob${y}`} castShadow position={[0.62, y, 0.4]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color={knob} />
        </mesh>
      ))}
    </group>
  )
}
