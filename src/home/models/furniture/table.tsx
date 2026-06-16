export function Table() {
  const wood = '#a9743f'
  // four legs near the top's edge (radius ~0.8 top, inset a bit)
  const legs: [number, number][] = [
    [-0.6, -0.6],
    [0.6, -0.6],
    [-0.6, 0.6],
    [0.6, 0.6],
  ]
  return (
    <group>
      {/* round top */}
      <mesh castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.08, 24]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {/* legs */}
      {legs.map(([x, z]) => (
        <mesh key={`leg-${x}-${z}`} castShadow position={[x, 0.34, z]}>
          <boxGeometry args={[0.1, 0.68, 0.1]} />
          <meshStandardMaterial color={wood} />
        </mesh>
      ))}
    </group>
  )
}
