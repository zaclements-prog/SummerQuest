export function Stool() {
  const wood = '#b07a40'
  // three legs around the seat (120° apart)
  const legs: [number, number][] = [
    [0, 0.34],
    [-0.3, -0.17],
    [0.3, -0.17],
  ]
  return (
    <group>
      {/* round seat */}
      <mesh castShadow position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.1, 20]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {/* legs */}
      {legs.map(([x, z]) => (
        <mesh key={`leg-${x}-${z}`} castShadow position={[x, 0.2, z]}>
          <cylinderGeometry args={[0.05, 0.05, 0.4, 10]} />
          <meshStandardMaterial color={wood} />
        </mesh>
      ))}
    </group>
  )
}
