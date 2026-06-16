export function Wardrobe() {
  const wood = '#8a5a36'
  const dark = '#5f3d22'
  const knob = '#2e1f12'
  return (
    <group>
      {/* tall closet body — w(x) 1.6 × h 1.8 × d(z) 0.5 */}
      <mesh castShadow position={[0, 0.92, 0]}>
        <boxGeometry args={[1.6, 1.78, 0.5]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {/* vertical seam between the two doors */}
      <mesh position={[0, 0.92, 0.26]}>
        <boxGeometry args={[0.03, 1.6, 0.02]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* two door knobs flanking the seam */}
      {[-0.12, 0.12].map((x) => (
        <mesh key={`knob${x}`} castShadow position={[x, 0.92, 0.28]}>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshStandardMaterial color={knob} />
        </mesh>
      ))}
      {/* short legs */}
      {([
        [-0.68, -0.18],
        [0.68, -0.18],
        [-0.68, 0.18],
        [0.68, 0.18],
      ] as [number, number][]).map(([x, z]) => (
        <mesh key={`leg-${x}-${z}`} castShadow position={[x, 0.015, z]}>
          <boxGeometry args={[0.1, 0.06, 0.1]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
    </group>
  )
}
