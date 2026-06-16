export function Chair() {
  const wood = '#b07a40'
  const legs: [number, number][] = [
    [-0.28, -0.28],
    [0.28, -0.28],
    [-0.28, 0.28],
    [0.28, 0.28],
  ]
  return (
    <group>
      {/* seat */}
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[0.7, 0.1, 0.7]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {/* backrest at the -z side */}
      <mesh castShadow position={[0, 0.74, -0.3]}>
        <boxGeometry args={[0.7, 0.58, 0.1]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {/* legs */}
      {legs.map(([x, z]) => (
        <mesh key={`leg-${x}-${z}`} castShadow position={[x, 0.22, z]}>
          <boxGeometry args={[0.09, 0.44, 0.09]} />
          <meshStandardMaterial color={wood} />
        </mesh>
      ))}
    </group>
  )
}
