export function Nightstand() {
  const wood = '#a9743f'
  const dark = '#7d5028'
  const knob = '#3a2a1a'
  return (
    <group>
      {/* cabinet body */}
      <mesh castShadow position={[0, 0.32, 0]}>
        <boxGeometry args={[0.8, 0.64, 0.7]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {/* drawer line on the +z face (a thin recessed panel) */}
      <mesh position={[0, 0.32, 0.36]}>
        <boxGeometry args={[0.64, 0.4, 0.02]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* tiny knob on the drawer */}
      <mesh castShadow position={[0, 0.32, 0.39]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color={knob} />
      </mesh>
      {/* four short legs */}
      {([
        [-0.33, -0.29],
        [0.33, -0.29],
        [-0.33, 0.29],
        [0.33, 0.29],
      ] as [number, number][]).map(([x, z]) => (
        <mesh key={`leg-${x}-${z}`} castShadow position={[x, 0.04, z]}>
          <boxGeometry args={[0.08, 0.08, 0.08]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
    </group>
  )
}
