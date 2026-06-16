export function Dresser() {
  const wood = '#8a5a36'
  const dark = '#5f3d22'
  const knob = '#2e1f12'
  return (
    <group>
      {/* wide cabinet — w(x) 1.8 × h 0.9 × d(z) 0.5 */}
      <mesh castShadow position={[0, 0.46, 0]}>
        <boxGeometry args={[1.8, 0.84, 0.5]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {/* three drawer lines on the +z face */}
      {[0.72, 0.46, 0.2].map((y) => (
        <mesh key={`drawer${y}`} position={[0, y, 0.26]}>
          <boxGeometry args={[1.6, 0.2, 0.02]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* two knobs per drawer */}
      {[0.72, 0.46, 0.2].map((y) =>
        [-0.4, 0.4].map((x) => (
          <mesh key={`knob-${y}-${x}`} castShadow position={[x, y, 0.28]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color={knob} />
          </mesh>
        )),
      )}
      {/* short legs */}
      {([
        [-0.78, -0.18],
        [0.78, -0.18],
        [-0.78, 0.18],
        [0.78, 0.18],
      ] as [number, number][]).map(([x, z]) => (
        <mesh key={`leg-${x}-${z}`} castShadow position={[x, 0.03, z]}>
          <boxGeometry args={[0.1, 0.06, 0.1]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
    </group>
  )
}
